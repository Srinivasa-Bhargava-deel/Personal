/**
 * ReachingDefinitionsAnalyzer.ts
 * 
 * Reaching Definitions Analyzer - Forward Dataflow Analysis
 * 
 * PURPOSE:
 * Performs forward dataflow analysis to track where variable definitions reach through
 * the program. This identifies all definitions that can reach each use point, enabling
 * definition-use chain analysis and supporting taint analysis.
 * 
 * SIGNIFICANCE IN OVERALL FLOW:
 * This analyzer runs as part of the intra-procedural analysis phase in DataflowAnalyzer.
 * Its results are critical for TaintAnalyzer (which uses reaching definitions to track
 * taint propagation) and for CFGVisualizer (which visualizes definition-use chains).
 * Reaching definitions analysis provides the foundation for many other analyses.
 * 
 * DATA FLOW:
 * INPUTS:
 *   - FunctionCFG object (from DataflowAnalyzer.ts, originally from EnhancedCPPParser.ts)
 *     containing blocks, statements, and control flow edges
 * 
 * PROCESSING:
 *   1. Collects ALL definitions in the function (including function parameters at entry block)
 *   2. Computes GEN[B] and KILL[B] sets for each block B:
 *      - GEN[B] = definitions generated (assigned) in B
 *      - KILL[B] = all definitions of variables that are redefined in B (from ALL blocks)
 *   3. Initializes IN/OUT sets
 *   4. Iteratively computes IN/OUT sets in forward CFG order:
 *      - IN[B] = union of OUT[P] for all predecessors P of B
 *      - OUT[B] = GEN[B] union (IN[B] - KILL[B])
 *   5. Tracks propagation paths for each definition
 *   6. Continues until reaching fixed point (no changes)
 * 
 * OUTPUTS:
 *   - Map<string, ReachingDefinitionsInfo> where:
 *     - Key: blockId
 *     - Value: ReachingDefinitionsInfo containing:
 *       - GEN map: Definitions generated in this block
 *       - KILL map: Definitions killed in this block
 *       - IN map: Definitions reaching block entry
 *       - OUT map: Definitions reaching block exit
 *       - Each definition includes propagation path history
 *   - Reaching definitions results -> DataflowAnalyzer.ts (aggregated into AnalysisState)
 *   - Reaching definitions results -> TaintAnalyzer.ts (for taint propagation tracking)
 *   - Reaching definitions results -> CFGVisualizer.ts (for visualization)
 *   - Reaching definitions results -> InterProceduralReachingDefinitions.ts (for IPA)
 * 
 * DEPENDENCIES:
 *   - types.ts: FunctionCFG, ReachingDefinitionsInfo, ReachingDefinition, BasicBlock, Statement
 * 
 * ACADEMIC THEORY (from Cooper & Torczon, Aho-Sethi-Ullman):
 * REACHING DEFINITIONS: A definition d reaches a program point p if there exists a path
 * from d to p such that d is not "killed" (overwritten) along the path.
 * 
 * DATAFLOW EQUATIONS (FORWARD ANALYSIS):
 *   IN[B] = union of OUT[P] for all predecessors P of B
 *   OUT[B] = GEN[B] union (IN[B] - KILL[B])
 * 
 * This is a forward analysis that terminates when reaching a fixed point.
 * 
 * FEATURES:
 * - Tracks complete propagation paths for each definition
 * - Includes function parameters as definitions at entry block (academic standard)
 * - MAX_ITERATIONS safety check to prevent infinite loops
 * - Cycle detection in propagation paths
 */

import { BasicBlock, FunctionCFG, ReachingDefinition, ReachingDefinitionsInfo, Statement } from '../types';

export class ReachingDefinitionsAnalyzer {
  /**
   * Perform reaching definitions analysis on a function CFG
   * 
   * Implements the standard reaching definitions algorithm:
   * 1. Collect all definitions in the function
   * 2. Compute GEN and KILL sets for each block
   * 3. Iteratively compute IN/OUT sets until fixed point
   * 4. Track propagation paths for each definition
   * 
   * @param functionCFG - Function CFG to analyze
   * @returns Map from block ID to ReachingDefinitionsInfo
   */
  analyze(functionCFG: FunctionCFG): Map<string, ReachingDefinitionsInfo> {
    console.log(`[RD Analysis] Starting reaching definitions analysis for function`);
    const rdMap = new Map<string, ReachingDefinitionsInfo>();
    
    // Step 1: Collect ALL definitions in the function
    const allDefinitions = this.collectDefinitions(functionCFG);
    console.log(`[RD Analysis] Collected ${allDefinitions.length} total definitions in function`);
    allDefinitions.forEach(def => {
      console.log(`  - Definition: ${def.variable} in block ${def.blockId} (${def.definitionId})`);
    });
    
    // Step 2: Initialize RD info for each block with GEN and KILL sets
    functionCFG.blocks.forEach((block, blockId) => {
      const gen = this.computeGen(block, allDefinitions, functionCFG);
      const kill = this.computeKill(block, allDefinitions);
      
      rdMap.set(blockId, {
        blockId,
        gen,
        kill,
        in: new Map<string, ReachingDefinition[]>(),
        out: new Map<string, ReachingDefinition[]>()
      });
      
      console.log(`[RD Analysis] Block ${blockId}:`);
      console.log(`  - GEN: ${Array.from(gen.keys()).join(', ')}`);
      console.log(`  - KILL: ${Array.from(kill.keys()).join(', ')}`);
    });

    // Step 3: Iterative dataflow analysis until reaching fixed point
    // MODERATE FIX (Issue #6): Add MAX_ITERATIONS safety check
    const MAX_ITERATIONS = 10 * functionCFG.blocks.size;
    let iteration = 0;
    let changed = true;
    while (changed && iteration < MAX_ITERATIONS) {
      iteration++;
      changed = false;
      console.log(`[RD Analysis] Iteration ${iteration}`);
      
      // Process blocks in forward order (follows CFG edges)
      const blockIds = Array.from(functionCFG.blocks.keys());
      
      for (const blockId of blockIds) {
        const block = functionCFG.blocks.get(blockId)!;
        const rdInfo = rdMap.get(blockId)!;
        
        // Compute IN[B] = union of OUT[P] for all predecessors P
        const newIn = new Map<string, ReachingDefinition[]>();
        
        for (const predId of block.predecessors) {
          const predRdInfo = rdMap.get(String(predId));
          if (!predRdInfo) {
            console.log(`[RD Analysis] Warning: predecessor ${predId} has no RD info`);
            continue;
          }
          
          // Union operation: add all definitions from predecessors' OUT
          // IMPORTANT: Track propagation path through CFG
            predRdInfo.out.forEach((defs, varName) => {
              if (!newIn.has(varName)) {
                newIn.set(varName, []);
              }
              const existing = newIn.get(varName)!;
              defs.forEach(def => {
              // Avoid duplicates by checking definitionId
                if (!existing.find(d => d.definitionId === def.definitionId)) {
                // Clone the definition and extend its propagation path
                // MODERATE FIX (Issue #5): Detect cycles to prevent unbounded path growth
                const currentPath = def.propagationPath || [def.sourceBlock || String(predId)];
                const isCycle = currentPath.includes(String(blockId));
                
                let newPath: string[];
                if (isCycle) {
                  // Compact cycle representation: mark cycle with [*]
                  const cycleStart = currentPath.indexOf(String(blockId));
                  const beforeCycle = currentPath.slice(0, cycleStart);
                  const cycle = currentPath.slice(cycleStart);
                  newPath = [...beforeCycle, `[${cycle.join('->')}]*`, String(blockId)];
                } else {
                  // Normal path extension
                  newPath = [...currentPath, String(blockId)];
                }
                
                const defWithHistory: ReachingDefinition = {
                  ...def,
                  // Extend the propagation path: add current block to the path
                  propagationPath: newPath
                };
                existing.push(defWithHistory);
                }
              });
            });
        }
        
        // Compute OUT[B] = GEN[B] union (IN[B] - KILL[B])
        // This means:
        // 1. All definitions generated in this block (GEN[B])
        // 2. Plus all definitions from IN[B] that are NOT killed in this block
        const newOut = new Map<string, ReachingDefinition[]>();
        
        // Add all GEN definitions (these are the "newest" definitions)
        rdInfo.gen.forEach((defs, varName) => {
          newOut.set(varName, defs.map(def => ({
            ...def,
            // GEN definitions start fresh with just this block
            propagationPath: [String(blockId)]
          })));
        });
        
        // Add IN - KILL: for each variable in IN, add those not in KILL
        newIn.forEach((defs, varName) => {
          const killDefs = rdInfo.kill.get(varName) || [];
          const killIds = new Set(killDefs.map(d => d.definitionId));
          
          // Filter: keep only definitions not killed, and mark the killed ones
          const survived = defs.filter(d => !killIds.has(d.definitionId));
          const killed = defs.filter(d => killIds.has(d.definitionId));
          
          if (survived.length > 0) {
            if (!newOut.has(varName)) {
              newOut.set(varName, []);
            }
            const existing = newOut.get(varName)!;
            survived.forEach(def => {
              if (!existing.find(d => d.definitionId === def.definitionId)) {
                // CRITICAL FIX (LOGIC.md #6): Append current block to propagation path
                // Survived definitions continue their propagation path by adding this block
                const survivedDef: ReachingDefinition = {
                  ...def,
                  killed: false,
                  // Append current block to existing propagation path
                  propagationPath: def.propagationPath 
                    ? [...def.propagationPath, String(blockId)]
                    : [String(blockId)]
                };
                existing.push(survivedDef);
              }
            });
          }
          
          // Log killed definitions for audit trail
          if (killed.length > 0) {
            killed.forEach(def => {
              const killRecord: ReachingDefinition = {
                ...def,
                killed: true  // Mark this definition as killed in this block
              };
              console.log(`[RD Analysis] Definition ${def.definitionId} (${varName}) killed in block ${blockId}`);
            });
          }
        });
        
        // Check if IN or OUT changed
        const inChanged = !this.mapsEqual(rdInfo.in, newIn);
        const outChanged = !this.mapsEqual(rdInfo.out, newOut);
        
        if (inChanged || outChanged) {
          changed = true;
          console.log(`[RD Analysis] Block ${blockId} changed - updating IN/OUT`);
          rdInfo.in = newIn;
          rdInfo.out = newOut;
          
          // Log the new values WITH PROPAGATION PATHS
          console.log(`  - IN[${blockId}]: ${Array.from(newIn.keys()).join(', ')}`);
          newIn.forEach((defs, varName) => {
            defs.forEach(d => {
              const path = d.propagationPath ? d.propagationPath.join(' -> ') : 'unknown';
              const statusLabel = d.killed ? '(KILLED)' : '';
              console.log(`    - ${varName}: ${d.definitionId} from ${d.sourceBlock || 'unknown'} via path: ${path} ${statusLabel}`);
            });
          });
          console.log(`  - OUT[${blockId}]: ${Array.from(newOut.keys()).join(', ')}`);
          newOut.forEach((defs, varName) => {
            defs.forEach(d => {
              const path = d.propagationPath ? d.propagationPath.join(' -> ') : 'unknown';
              const statusLabel = d.killed ? '(KILLED)' : '';
              console.log(`    - ${varName}: ${d.definitionId} from ${d.sourceBlock || 'unknown'} via path: ${path} ${statusLabel}`);
            });
          });
        }
      }
    }
    
    if (iteration >= MAX_ITERATIONS) {
      console.warn(`[RD Analysis] WARNING: Reached MAX_ITERATIONS (${MAX_ITERATIONS}) without convergence!`);
    } else {
      console.log(`[RD Analysis] Converged after ${iteration} iterations`);
    }
    return rdMap;
  }

  /**
   * Collect all definitions in the function across all blocks
   * A definition is where a variable receives a value
   * 
   * CRITICAL FIX (Issue #1): Function parameters must be treated as definitions
   * at the function entry point per academic standards (Cooper & Torczon).
   */
  private collectDefinitions(functionCFG: FunctionCFG): ReachingDefinition[] {
    const definitions: ReachingDefinition[] = [];
    let defCounter = 0;
    
    // CRITICAL FIX: Add function parameters as definitions at entry block
    // This is required by academic standards - parameters are "defined" by the caller
    const entryBlockId = functionCFG.entry;
    if (entryBlockId && functionCFG.parameters && functionCFG.parameters.length > 0) {
      functionCFG.parameters.forEach(paramName => {
        const definitionId = `d${defCounter++}`;
        const paramDef: ReachingDefinition = {
          variable: paramName,
          definitionId: definitionId,
          blockId: entryBlockId,
          statementId: `${entryBlockId}_param_${paramName}`,
          range: undefined,
          sourceBlock: entryBlockId,
          propagationPath: [entryBlockId],
          isParameter: true  // Mark as parameter definition
        };
        definitions.push(paramDef);
        console.log(`[RD Analysis] Found parameter definition: ${paramName} -> ${definitionId} at entry block ${entryBlockId}`);
      });
    }
    
    // Collect definitions from statements in all blocks
    functionCFG.blocks.forEach((block, blockId) => {
      block.statements.forEach((stmt, stmtIdx) => {
        // Get defined variables from the statement
        if (stmt.variables?.defined && stmt.variables.defined.length > 0) {
          stmt.variables.defined.forEach(varName => {
            const definitionId = `d${defCounter++}`;
            const def: ReachingDefinition = {
              variable: varName,
              definitionId: definitionId,
              blockId: String(blockId),
              statementId: stmt.id || `${blockId}_${stmtIdx}`,
              range: stmt.range,
              // Set source block (where definition originated)
              sourceBlock: String(blockId),
              // Start with just the source in the propagation path
              propagationPath: [String(blockId)]
            };
            definitions.push(def);
            console.log(`[RD Analysis] Found definition: ${varName} -> ${definitionId} in block ${blockId}`);
          });
        }
      });
    });
    
    return definitions;
  }

  /**
   * Compute GEN[B]: definitions generated (generated) in block B
   * These are the last assignments to each variable in the block
   * 
   * For academic correctness: if a variable is assigned multiple times in a block,
   * only the LAST assignment is in GEN (previous ones are killed within the block)
   * 
   * CRITICAL FIX (Issue #1): Entry block must include parameter definitions
   * CRITICAL FIX (LOGIC.md #8): Parameters only in GEN if not redefined in entry block
   */
  private computeGen(block: BasicBlock, allDefinitions: ReachingDefinition[], functionCFG: FunctionCFG): Map<string, ReachingDefinition[]> {
    const gen = new Map<string, ReachingDefinition[]>();
    
    // Track last definition of each variable in this block (from statements)
    const lastDefByVar = new Map<string, ReachingDefinition>();
    
    block.statements.forEach((stmt, stmtIdx) => {
      if (stmt.variables?.defined && stmt.variables.defined.length > 0) {
        stmt.variables.defined.forEach(varName => {
          // Find the definition that matches this statement
          const def = allDefinitions.find(d => 
            d.blockId === String(block.id) && 
            d.variable === varName &&
            d.statementId === (stmt.id || `${block.id}_${stmtIdx}`)
          );
          
          if (def) {
            // Keep only the last definition of each variable
            lastDefByVar.set(varName, def);
          }
        });
      }
    });
    
    // CRITICAL FIX (LOGIC.md #8): If this is the entry block, include parameter definitions
    // BUT only if they're not redefined in the entry block
    if (String(block.id) === functionCFG.entry) {
      const paramDefs = allDefinitions.filter(d => d.isParameter === true);
      paramDefs.forEach(def => {
        // Only add parameter to GEN if it's not redefined in this block
        // If it's redefined, the redefinition will be in GEN (from lastDefByVar)
        if (!lastDefByVar.has(def.variable)) {
          if (!gen.has(def.variable)) {
            gen.set(def.variable, []);
          }
          gen.get(def.variable)!.push(def);
          console.log(`[RD Analysis] Parameter ${def.variable} added to GEN (not redefined in entry block)`);
        } else {
          console.log(`[RD Analysis] Parameter ${def.variable} NOT added to GEN (redefined in entry block)`);
        }
      });
    }
    
    // Convert last definitions to GEN map (these override parameters if they exist)
    lastDefByVar.forEach((def, varName) => {
      if (!gen.has(varName)) {
        gen.set(varName, []);
      }
      // Replace any existing definitions (including parameters) with the last definition
      gen.set(varName, [def]);
    });
    
    return gen;
  }

  /**
   * Compute KILL[B]: definitions that are killed in block B
   * A definition d of variable v is killed if there's a new definition of v in B
   * 
   * In other words: KILL[B] = all definitions of variables that are assigned in B
   *                            (but NOT the definitions in B itself - those are in GEN)
   */
  private computeKill(block: BasicBlock, allDefinitions: ReachingDefinition[]): Map<string, ReachingDefinition[]> {
    const kill = new Map<string, ReachingDefinition[]>();
    
    // Find all variables defined in this block
    const definedVarsInBlock = new Set<string>();
    block.statements.forEach(stmt => {
      if (stmt.variables?.defined) {
        stmt.variables.defined.forEach(v => {
          definedVarsInBlock.add(v);
        });
      }
    });
    
    // For each defined variable, kill all its definitions from OTHER blocks
    definedVarsInBlock.forEach(varName => {
      const killed = allDefinitions.filter(d => 
        d.variable === varName && 
        d.blockId !== String(block.id)  // From other blocks
      );
      
      if (killed.length > 0) {
        kill.set(varName, killed);
      }
    });
    
    return kill;
  }

  /**
   * Check if two definition maps are equal
   */
  private mapsEqual(
    map1: Map<string, ReachingDefinition[]>, 
    map2: Map<string, ReachingDefinition[]>
  ): boolean {
    if (map1.size !== map2.size) return false;
    
    for (const [key, value1] of map1.entries()) {
      const value2 = map2.get(key);
      if (!value2 || value1.length !== value2.length) return false;
      
      // Compare by definitionId
      const ids1 = new Set(value1.map(d => d.definitionId));
      const ids2 = new Set(value2.map(d => d.definitionId));
      
      if (ids1.size !== ids2.size) return false;
      for (const id of ids1) {
        if (!ids2.has(id)) return false;
      }
    }
    
    return true;
  }
}

