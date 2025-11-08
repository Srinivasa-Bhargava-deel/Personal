/**
 * LivenessAnalyzer - Backward dataflow analysis to determine variable liveness.
 * 
 * LIVENESS ANALYSIS determines which variables are "live" at each program point.
 * 
 * Academic Definition (from Cooper & Torczon, "Engineering a Compiler"):
 * 
 * A variable v is LIVE at a program point p if:
 * - There exists a path from p to a use of v
 * - AND no definition of v appears on that path before the use
 * 
 * This is critical for optimization (e.g., dead code elimination) and 
 * security analysis (e.g., detecting use-after-free).
 * 
 * For each block B:
 *   USE[B] = variables read before being written in B
 *   DEF[B] = variables written in B
 * 
 * Dataflow equations (BACKWARD analysis):
 *   OUT[B] = union of IN[S] for all successors S of B
 *   IN[B] = USE[B] union (OUT[B] - DEF[B])
 * 
 * Algorithm:
 * 1. Initialize all IN/OUT sets to empty
 * 2. Iteratively recompute IN/OUT in reverse CFG order
 * 3. Continue until reaching fixed point (no changes)
 * 
 * Time Complexity: O(n^2) for n blocks
 * Space Complexity: O(n * v) for n blocks and v variables
 * 
 * References:
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
    let changed = true;
    let iteration = 0;
    while (changed) {
      changed = false;
      iteration++;
      
      // STEP 3: Process blocks in REVERSE order (backward analysis)
      // Backward analysis is required for liveness (we compute from uses to definitions)
      const blockIds = Array.from(functionCFG.blocks.keys()).reverse();
      
      for (const blockId of blockIds) {
        const block = functionCFG.blocks.get(blockId)!;
        const liveness = livenessMap.get(blockId)!;
        
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
        
        // Check if OUT[B] changed
        if (!this.setsEqual(liveness.out, newOut)) {
          changed = true;
          liveness.out = newOut;
        }
        
        // STEP 4b: Compute IN[B] = USE[B] union (OUT[B] - DEF[B])
        // Variables live at block entry = variables used in block + (variables live at exit that aren't defined in block)
        const use = this.getUseSet(block);    // Variables read in this block
        const def = this.getDefSet(block);    // Variables written in this block
        
        const newIn = new Set<string>(use);   // Start with USE set
        liveness.out.forEach(v => {
          // For each variable live at exit, if it's not defined in this block, it's live at entry
          if (!def.has(v)) {
            newIn.add(v);
          }
        });
        
        // Check if IN[B] changed
        if (!this.setsEqual(liveness.in, newIn)) {
          changed = true;
          liveness.in = newIn;
        }
      }
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
   * @param set1 - First set to compare
   * @param set2 - Second set to compare
   * @returns true if sets contain identical elements
   */
  private setsEqual(set1: Set<string>, set2: Set<string>): boolean {
    if (set1.size !== set2.size) return false;
    for (const item of set1) {
      if (!set2.has(item)) return false;
    }
    return true;
  }
}

