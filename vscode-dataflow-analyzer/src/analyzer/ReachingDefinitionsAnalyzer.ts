/**
 * Reaching Definitions Analysis
 * 
 * Academic theory (from Cooper & Torczon, Aho-Sethi-Ullman):
 * 
 * REACHING DEFINITIONS: A definition d reaches a program point p if there 
 * exists a path from d to p such that d is not "killed" (overwritten) along 
 * the path.
 * 
 * For each block B:
 *   GEN[B] = definitions generated (assigned) in B
 *   KILL[B] = all definitions of variables that are redefined in B 
 *              (from ALL other blocks)
 *   
 * Dataflow equations:
 *   IN[B] = union of OUT[P] for all predecessors P of B
 *   OUT[B] = GEN[B] union (IN[B] - KILL[B])
 * 
 * This is a forward analysis that terminates when reaching a fixed point.
 */

import { BasicBlock, FunctionCFG, ReachingDefinition, ReachingDefinitionsInfo, Statement } from '../types';

export class ReachingDefinitionsAnalyzer {
  /**
   * Perform reaching definitions analysis on a function CFG
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
                // Survived definitions continue their propagation path
                const survivedDef: ReachingDefinition = {
                  ...def,
                  killed: false
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
   */
  private computeGen(block: BasicBlock, allDefinitions: ReachingDefinition[], functionCFG: FunctionCFG): Map<string, ReachingDefinition[]> {
    const gen = new Map<string, ReachingDefinition[]>();
    
    // CRITICAL FIX: If this is the entry block, include parameter definitions
    if (String(block.id) === functionCFG.entry) {
      const paramDefs = allDefinitions.filter(d => d.isParameter === true);
      paramDefs.forEach(def => {
        if (!gen.has(def.variable)) {
          gen.set(def.variable, []);
        }
        gen.get(def.variable)!.push(def);
      });
    }
    
    // Track last definition of each variable in this block
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
    
    // Convert last definitions to GEN map
    lastDefByVar.forEach((def, varName) => {
      if (!gen.has(varName)) {
        gen.set(varName, []);
      }
      gen.get(varName)!.push(def);
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

