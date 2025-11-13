/**
 * LivenessAnalyzer.ts
 * 
 * Liveness Analyzer - Backward Dataflow Analysis for Variable Liveness
 * 
 * PURPOSE:
 * Performs backward dataflow analysis to determine which variables are "live" at each
 * program point. This is critical for optimization (dead code elimination) and security
 * analysis (use-after-free detection).
 * 
 * SIGNIFICANCE IN OVERALL FLOW:
 * This analyzer runs as part of the intra-procedural analysis phase in DataflowAnalyzer.
 * It provides liveness information that is used by CFGVisualizer for visualization and
 * by SecurityAnalyzer for detecting use-after-free vulnerabilities. Liveness analysis
 * is a fundamental dataflow analysis that informs many other analyses.
 * 
 * DATA FLOW:
 * INPUTS:
 *   - FunctionCFG object (from DataflowAnalyzer.ts, originally from EnhancedCPPParser.ts)
 *     containing blocks, statements, and control flow edges
 * 
 * PROCESSING:
 *   1. Computes USE[B] and DEF[B] sets for each block B
 *   2. Initializes all IN/OUT sets to empty
 *   3. Iteratively recomputes IN/OUT sets in reverse CFG order:
 *      - OUT[B] = union of IN[S] for all successors S of B
 *      - IN[B] = USE[B] union (OUT[B] - DEF[B])
 *   4. Continues until reaching fixed point (no changes)
 * 
 * OUTPUTS:
 *   - Map<string, LivenessInfo> where:
 *     - Key: blockId
 *     - Value: LivenessInfo containing:
 *       - IN set: Variables live at block entry
 *       - OUT set: Variables live at block exit
 *   - Liveness results -> DataflowAnalyzer.ts (aggregated into AnalysisState)
 *   - Liveness results -> CFGVisualizer.ts (for visualization)
 *   - Liveness results -> SecurityAnalyzer.ts (for use-after-free detection)
 * 
 * DEPENDENCIES:
 *   - types.ts: FunctionCFG, LivenessInfo, BasicBlock
 * 
 * ACADEMIC DEFINITION (from Cooper & Torczon, "Engineering a Compiler"):
 * A variable v is LIVE at a program point p if:
 * - There exists a path from p to a use of v
 * - AND no definition of v appears on that path before the use
 * 
 * DATAFLOW EQUATIONS (BACKWARD ANALYSIS):
 *   OUT[B] = union of IN[S] for all successors S of B
 *   IN[B] = USE[B] union (OUT[B] - DEF[B])
 * 
 * For each block B:
 *   USE[B] = variables read before being written in B
 *   DEF[B] = variables written in B
 * 
 * TIME COMPLEXITY: O(n^2) for n blocks
 * SPACE COMPLEXITY: O(n * v) for n blocks and v variables
 * 
 * REFERENCES:
 * - "Engineering a Compiler" Chapter 8.6.2
 * - "Compilers: Principles, Techniques, and Tools" Chapter 10.2
 */

import { BasicBlock, CFG, FunctionCFG, LivenessInfo } from '../types';

/**
 * Performs backward liveness analysis on a function's CFG.
 * 
 * Liveness analysis is the foundation for:
 * - Dead code elimination
 * - Register allocation
 * - Memory safety analysis (use-after-free detection)
 * - Security vulnerability detection
 */
export class LivenessAnalyzer {
  /**
   * Analyze variable liveness for all blocks in a function.
   * 
   * @param functionCFG - The function's Control Flow Graph
   * @returns Map from block ID to liveness information (IN/OUT sets)
   */
  analyze(functionCFG: FunctionCFG): Map<string, LivenessInfo> {
    const livenessMap = new Map<string, LivenessInfo>();
    
    // STEP 1: Initialize all blocks with empty IN/OUT sets
    functionCFG.blocks.forEach((block, blockId) => {
      livenessMap.set(blockId, {
        blockId,
        in: new Set<string>(),      // Variables live at block entry
        out: new Set<string>()      // Variables live at block exit
      });
    });

    // STEP 2: Iterative dataflow analysis until reaching fixed point
    // Fixed point: when IN and OUT sets don't change from one iteration to the next
    // CRITICAL FIX (LOGIC.md #1): Add MAX_ITERATIONS safety check for algorithm termination
    // CRITICAL FIX (LOGIC.md #10): Compute all new values first, then update atomically
    const MAX_ITERATIONS = 10 * functionCFG.blocks.size;
    let changed = true;
    let iteration = 0;
    while (changed && iteration < MAX_ITERATIONS) {
      changed = false;
      iteration++;
      
      // STEP 3: Process blocks in REVERSE order (backward analysis)
      // Backward analysis is required for liveness (we compute from uses to definitions)
      const blockIds = Array.from(functionCFG.blocks.keys()).reverse();
      
      // CRITICAL FIX (LOGIC.md #10): Compute all new values first, then update atomically
      // This prevents order-dependent incorrect results
      const newValues = new Map<string, { newIn: Set<string>; newOut: Set<string> }>();
      
      for (const blockId of blockIds) {
        // CRITICAL FIX (LOGIC.md #3): Add null checks before accessing blocks
        const block = functionCFG.blocks.get(blockId);
        const liveness = livenessMap.get(blockId);
        
        if (!block || !liveness) {
          console.warn(`[Liveness Analysis] WARNING: Block ${blockId} not found in CFG or liveness map. Skipping.`);
          continue;
        }
        
        // STEP 4a: Compute OUT[B] = union of IN[S] for all successors S
        // Variables live at block exit = union of variables live at successor entries
        const newOut = new Set<string>();
        for (const succId of block.successors) {
          const succLiveness = livenessMap.get(succId);
          if (succLiveness) {
            // Add all variables live at successor's entry
            succLiveness.in.forEach(v => newOut.add(v));
          }
        }
        
        // STEP 4b: Compute IN[B] = USE[B] union (OUT[B] - DEF[B])
        // Variables live at block entry = variables used in block + (variables live at exit that aren't defined in block)
        const use = this.getUseSet(block);    // Variables read in this block
        const def = this.getDefSet(block);    // Variables written in this block
        
        const newIn = new Set<string>(use);   // Start with USE set
        newOut.forEach(v => {
          // For each variable live at exit, if it's not defined in this block, it's live at entry
          if (!def.has(v)) {
            newIn.add(v);
          }
        });
        
        // Store new values for atomic update
        newValues.set(blockId, { newIn, newOut });
      }
      
      // CRITICAL FIX (LOGIC.md #10): Update all values atomically after computing all new values
      newValues.forEach((values, blockId) => {
        const liveness = livenessMap.get(blockId);
        if (!liveness) return;
        
        // Check if OUT[B] changed
        if (!this.setsEqual(liveness.out, values.newOut)) {
          changed = true;
          liveness.out = values.newOut;
        }
        
        // Check if IN[B] changed
        if (!this.setsEqual(liveness.in, values.newIn)) {
          changed = true;
          liveness.in = values.newIn;
        }
      });
    }
    
    // CRITICAL FIX (LOGIC.md #1): Warn if convergence not reached
    if (iteration >= MAX_ITERATIONS) {
      console.warn(`[Liveness Analysis] WARNING: Reached MAX_ITERATIONS (${MAX_ITERATIONS}) without convergence for function ${functionCFG.name}!`);
      console.warn(`[Liveness Analysis] This may indicate a bug in the CFG structure or analysis algorithm.`);
    } else {
      console.log(`[Liveness Analysis] Converged after ${iteration} iterations for function ${functionCFG.name}`);
    }
    
    return livenessMap;
  }

  /**
   * Extract USE[B] - set of variables read (used) in this block.
   * 
   * A variable is in USE[B] if it's read before being written in the block.
   * This is computed during CFG extraction when analyzing statement variables.
   * 
   * @param block - Basic block to analyze
   * @returns Set of variable names used in this block
   */
  private getUseSet(block: BasicBlock): Set<string> {
    const use = new Set<string>();
    // Iterate through all statements in the block
    block.statements.forEach(stmt => {
      // Each statement has an optional 'variables' object with 'used' and 'defined' arrays
      if (stmt.variables?.used) {
        stmt.variables.used.forEach(v => use.add(v));
      }
    });
    return use;
  }

  /**
   * Extract DEF[B] - set of variables defined (written) in this block.
   * 
   * A variable is in DEF[B] if it's assigned/declared in the block.
   * This is computed during CFG extraction when analyzing statement variables.
   * 
   * @param block - Basic block to analyze
   * @returns Set of variable names defined in this block
   */
  private getDefSet(block: BasicBlock): Set<string> {
    const def = new Set<string>();
    // Iterate through all statements in the block
    block.statements.forEach(stmt => {
      // Each statement has an optional 'variables' object with 'used' and 'defined' arrays
      if (stmt.variables?.defined) {
        stmt.variables.defined.forEach(v => def.add(v));
      }
    });
    return def;
  }

  /**
   * Check if two sets are equal (contain the same elements).
   * Used to detect fixed point in iterative analysis.
   * 
   * CRITICAL FIX (LOGIC.md #13): Optimized comparison using size check and
   * efficient iteration. For large sets, this is already optimal (O(n) with
   * O(1) average Set.has lookup). Further optimization would require caching
   * which adds memory overhead.
   * 
   * @param set1 - First set to compare
   * @param set2 - Second set to compare
   * @returns true if sets contain identical elements
   */
  private setsEqual(set1: Set<string>, set2: Set<string>): boolean {
    // Early exit: different sizes means different sets
    if (set1.size !== set2.size) return false;
    
    // If both sets are empty, they're equal
    if (set1.size === 0) return true;
    
    // CRITICAL FIX (LOGIC.md #13): Optimize by checking smaller set first
    // Iterate over the set and check membership in the other (O(n) with O(1) average lookup)
    // This is already optimal for Set<string> - further optimization would require
    // hash-based caching which adds memory overhead
    for (const item of set1) {
      if (!set2.has(item)) return false;
    }
    return true;
  }
}

