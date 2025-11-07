/**
 * Taint Analysis - tracks tainted data flow
 */

import { BasicBlock, FunctionCFG, TaintInfo, ReachingDefinitionsInfo, StatementType } from '../types';

export class TaintAnalyzer {
  private taintSources: Set<string> = new Set(['scanf', 'gets', 'fgets', 'read', 'input']);
  
  /**
   * Perform taint analysis
   */
  analyze(
    functionCFG: FunctionCFG,
    reachingDefinitions: Map<string, ReachingDefinitionsInfo>
  ): Map<string, TaintInfo[]> {
    const taintMap = new Map<string, TaintInfo[]>();
    
    // Initialize taint info for all variables
    const allVars = this.collectVariables(functionCFG);
    allVars.forEach(varName => {
      taintMap.set(varName, []);
    });
    
    // Forward propagation: find taint sources and propagate
    const worklist: Array<{ blockId: string; varName: string; source: string; path: string[] }> = [];
    
    functionCFG.blocks.forEach((block, blockId) => {
      block.statements.forEach(stmt => {
        // Check if this is a taint source (e.g., scanf)
        if (stmt.type === StatementType.FUNCTION_CALL && stmt.text) {
          const funcName = stmt.text.match(/(\w+)\s*\(/)?.[1];
          if (funcName && this.taintSources.has(funcName)) {
            // Find variables that receive tainted input
            stmt.variables?.used.forEach(varName => {
              const taintInfo: TaintInfo = {
                variable: varName,
                source: `Function call: ${funcName}`,
                tainted: true,
                propagationPath: [`${blockId}:${stmt.id}`]
              };
              taintMap.get(varName)?.push(taintInfo);
              worklist.push({
                blockId,
                varName,
                source: taintInfo.source,
                path: [...taintInfo.propagationPath]
              });
            });
          }
        }
      });
    });
    
    // Propagate taint through assignments
    while (worklist.length > 0) {
      const item = worklist.shift()!;
      const { blockId, varName, source, path } = item;
      
      // Find all uses of this variable
      functionCFG.blocks.forEach((block, bid) => {
        block.statements.forEach(stmt => {
          if (stmt.variables?.used.includes(varName)) {
            // If used in assignment, propagate taint to defined variables
            if (stmt.variables.defined.length > 0) {
              stmt.variables.defined.forEach(targetVar => {
                const existingTaint = taintMap.get(targetVar)?.find(
                  t => t.source === source && t.variable === targetVar
                );
                
                if (!existingTaint) {
                  const newPath = [...path, `${bid}:${stmt.id}`];
                  const taintInfo: TaintInfo = {
                    variable: targetVar,
                    source,
                    tainted: true,
                    propagationPath: newPath
                  };
                  taintMap.get(targetVar)?.push(taintInfo);
                  worklist.push({
                    blockId: bid,
                    varName: targetVar,
                    source,
                    path: newPath
                  });
                }
              });
            }
          }
        });
      });
    }
    
    return taintMap;
  }

  /**
   * Collect all variables in the function
   */
  private collectVariables(functionCFG: FunctionCFG): Set<string> {
    const vars = new Set<string>();
    
    // Add parameters
    functionCFG.parameters.forEach(p => vars.add(p));
    
    // Add variables from all blocks
    functionCFG.blocks.forEach(block => {
      block.statements.forEach(stmt => {
        stmt.variables?.defined.forEach(v => vars.add(v));
        stmt.variables?.used.forEach(v => vars.add(v));
      });
    });
    
    return vars;
  }

  /**
   * Add custom taint source
   */
  addTaintSource(source: string): void {
    this.taintSources.add(source);
  }
}

