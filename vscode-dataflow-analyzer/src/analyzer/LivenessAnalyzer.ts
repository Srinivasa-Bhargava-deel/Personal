/**
 * Liveness Analysis - determines which variables are live at each point
 */

import { BasicBlock, CFG, FunctionCFG, LivenessInfo } from '../types';

export class LivenessAnalyzer {
  /**
   * Perform liveness analysis on a function CFG
   */
  analyze(functionCFG: FunctionCFG): Map<string, LivenessInfo> {
    const livenessMap = new Map<string, LivenessInfo>();
    
    // Initialize all blocks
    functionCFG.blocks.forEach((block, blockId) => {
      livenessMap.set(blockId, {
        blockId,
        in: new Set<string>(),
        out: new Set<string>()
      });
    });

    // Iterative dataflow analysis until fixed point
    let changed = true;
    while (changed) {
      changed = false;
      
      // Process blocks in reverse order (backward analysis)
      const blockIds = Array.from(functionCFG.blocks.keys()).reverse();
      
      for (const blockId of blockIds) {
        const block = functionCFG.blocks.get(blockId)!;
        const liveness = livenessMap.get(blockId)!;
        
        // OUT[B] = union of IN[successors]
        const newOut = new Set<string>();
        for (const succId of block.successors) {
          const succLiveness = livenessMap.get(succId);
          if (succLiveness) {
            succLiveness.in.forEach(v => newOut.add(v));
          }
        }
        
        // Check if OUT changed
        if (!this.setsEqual(liveness.out, newOut)) {
          changed = true;
          liveness.out = newOut;
        }
        
        // IN[B] = USE[B] union (OUT[B] - DEF[B])
        const use = this.getUseSet(block);
        const def = this.getDefSet(block);
        const newIn = new Set<string>(use);
        liveness.out.forEach(v => {
          if (!def.has(v)) {
            newIn.add(v);
          }
        });
        
        // Check if IN changed
        if (!this.setsEqual(liveness.in, newIn)) {
          changed = true;
          liveness.in = newIn;
        }
      }
    }
    
    return livenessMap;
  }

  /**
   * Get set of variables used in a block
   */
  private getUseSet(block: BasicBlock): Set<string> {
    const use = new Set<string>();
    block.statements.forEach(stmt => {
      if (stmt.variables?.used) {
        stmt.variables.used.forEach(v => use.add(v));
      }
    });
    return use;
  }

  /**
   * Get set of variables defined in a block
   */
  private getDefSet(block: BasicBlock): Set<string> {
    const def = new Set<string>();
    block.statements.forEach(stmt => {
      if (stmt.variables?.defined) {
        stmt.variables.defined.forEach(v => def.add(v));
      }
    });
    return def;
  }

  /**
   * Check if two sets are equal
   */
  private setsEqual(set1: Set<string>, set2: Set<string>): boolean {
    if (set1.size !== set2.size) return false;
    for (const item of set1) {
      if (!set2.has(item)) return false;
    }
    return true;
  }
}

