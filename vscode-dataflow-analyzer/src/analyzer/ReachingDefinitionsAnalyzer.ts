/**
 * Reaching Definitions Analysis
 */

import { BasicBlock, FunctionCFG, ReachingDefinition, ReachingDefinitionsInfo, Statement } from '../types';

export class ReachingDefinitionsAnalyzer {
  /**
   * Perform reaching definitions analysis
   */
  analyze(functionCFG: FunctionCFG): Map<string, ReachingDefinitionsInfo> {
    const rdMap = new Map<string, ReachingDefinitionsInfo>();
    
    // Collect all definitions first
    const allDefinitions = this.collectDefinitions(functionCFG);
    
    // Initialize all blocks
    functionCFG.blocks.forEach((block, blockId) => {
      const gen = this.computeGen(block, allDefinitions);
      const kill = this.computeKill(block, allDefinitions);
      
      rdMap.set(blockId, {
        blockId,
        gen,
        kill,
        in: new Map<string, ReachingDefinition[]>(),
        out: new Map<string, ReachingDefinition[]>()
      });
    });

    // Iterative dataflow analysis until fixed point
    let changed = true;
    while (changed) {
      changed = false;
      
      // Process blocks in forward order
      const blockIds = Array.from(functionCFG.blocks.keys());
      
      for (const blockId of blockIds) {
        const block = functionCFG.blocks.get(blockId)!;
        const rdInfo = rdMap.get(blockId)!;
        
        // IN[B] = union of OUT[predecessors]
        const newIn = new Map<string, ReachingDefinition[]>();
        for (const predId of block.predecessors) {
          const predRdInfo = rdMap.get(predId);
          if (predRdInfo) {
            predRdInfo.out.forEach((defs, varName) => {
              if (!newIn.has(varName)) {
                newIn.set(varName, []);
              }
              const existing = newIn.get(varName)!;
              defs.forEach(def => {
                if (!existing.find(d => d.definitionId === def.definitionId)) {
                  existing.push(def);
                }
              });
            });
          }
        }
        
        // OUT[B] = GEN[B] union (IN[B] - KILL[B])
        const newOut = new Map<string, ReachingDefinition[]>();
        
        // Add GEN
        rdInfo.gen.forEach((defs, varName) => {
          newOut.set(varName, [...defs]);
        });
        
        // Add IN - KILL
        newIn.forEach((defs, varName) => {
          const killDefs = rdInfo.kill.get(varName) || [];
          const killIds = new Set(killDefs.map(d => d.definitionId));
          
          const filtered = defs.filter(d => !killIds.has(d.definitionId));
          if (filtered.length > 0) {
            if (!newOut.has(varName)) {
              newOut.set(varName, []);
            }
            const existing = newOut.get(varName)!;
            filtered.forEach(def => {
              if (!existing.find(d => d.definitionId === def.definitionId)) {
                existing.push(def);
              }
            });
          }
        });
        
        // Check if changed
        if (!this.mapsEqual(rdInfo.in, newIn) || !this.mapsEqual(rdInfo.out, newOut)) {
          changed = true;
          rdInfo.in = newIn;
          rdInfo.out = newOut;
        }
      }
    }
    
    return rdMap;
  }

  /**
   * Collect all definitions in the function
   */
  private collectDefinitions(functionCFG: FunctionCFG): ReachingDefinition[] {
    const definitions: ReachingDefinition[] = [];
    
    functionCFG.blocks.forEach((block, blockId) => {
      block.statements.forEach(stmt => {
        if (stmt.variables?.defined) {
          stmt.variables.defined.forEach(varName => {
            definitions.push({
              variable: varName,
              definitionId: `${blockId}_${stmt.id}`,
              blockId,
              statementId: stmt.id,
              range: stmt.range
            });
          });
        }
      });
    });
    
    return definitions;
  }

  /**
   * Compute GEN set for a block (definitions generated)
   */
  private computeGen(block: BasicBlock, allDefinitions: ReachingDefinition[]): Map<string, ReachingDefinition[]> {
    const gen = new Map<string, ReachingDefinition[]>();
    
    block.statements.forEach(stmt => {
      if (stmt.variables?.defined) {
        stmt.variables.defined.forEach(varName => {
          const def = allDefinitions.find(d => 
            d.blockId === block.id && 
            d.statementId === stmt.id && 
            d.variable === varName
          );
          if (def) {
            if (!gen.has(varName)) {
              gen.set(varName, []);
            }
            gen.get(varName)!.push(def);
          }
        });
      }
    });
    
    return gen;
  }

  /**
   * Compute KILL set for a block (definitions killed)
   */
  private computeKill(block: BasicBlock, allDefinitions: ReachingDefinition[]): Map<string, ReachingDefinition[]> {
    const kill = new Map<string, ReachingDefinition[]>();
    
    // Find all variables defined in this block
    const definedVars = new Set<string>();
    block.statements.forEach(stmt => {
      if (stmt.variables?.defined) {
        stmt.variables.defined.forEach(v => definedVars.add(v));
      }
    });
    
    // Kill all other definitions of these variables
    definedVars.forEach(varName => {
      const killed = allDefinitions.filter(d => 
        d.variable === varName && 
        d.blockId !== block.id
      );
      if (killed.length > 0) {
        kill.set(varName, killed);
      }
    });
    
    return kill;
  }

  /**
   * Check if two maps are equal
   */
  private mapsEqual(map1: Map<string, ReachingDefinition[]>, map2: Map<string, ReachingDefinition[]>): boolean {
    if (map1.size !== map2.size) return false;
    
    for (const [key, value1] of map1.entries()) {
      const value2 = map2.get(key);
      if (!value2 || value1.length !== value2.length) return false;
      
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

