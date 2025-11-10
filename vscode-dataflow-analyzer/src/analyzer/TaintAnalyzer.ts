/**
 * Taint Analysis - tracks tainted data flow
 * 
 * Enhanced implementation with comprehensive source detection (Phase 1)
 * Supports user input, file I/O, network, environment, command line, database, and configuration sources
 */

import { BasicBlock, FunctionCFG, TaintInfo, ReachingDefinitionsInfo, StatementType, TaintVulnerability, Statement, TaintLabel } from '../types';
import { TaintSourceRegistry, defaultTaintSourceRegistry } from './TaintSourceRegistry';
import { TaintSinkRegistry, defaultTaintSinkRegistry } from './TaintSinkRegistry';
import { SanitizationRegistry, defaultSanitizationRegistry } from './SanitizationRegistry';
import { FunctionCallExtractor } from './FunctionCallExtractor';

export class TaintAnalyzer {
  private sourceRegistry: TaintSourceRegistry;
  private sinkRegistry: TaintSinkRegistry;
  private sanitizationRegistry: SanitizationRegistry;
  
  /**
   * Initialize taint analyzer with source, sink, and sanitization registries
   */
  constructor(
    sourceRegistry?: TaintSourceRegistry,
    sinkRegistry?: TaintSinkRegistry,
    sanitizationRegistry?: SanitizationRegistry
  ) {
    this.sourceRegistry = sourceRegistry || defaultTaintSourceRegistry;
    this.sinkRegistry = sinkRegistry || defaultTaintSinkRegistry;
    this.sanitizationRegistry = sanitizationRegistry || defaultSanitizationRegistry;
  }
  
  /**
   * Perform taint analysis with enhanced source detection and sink detection
   * 
   * Tracks the flow of potentially malicious data through the program:
   * 1. Identifies taint sources (user input, file I/O, network, etc.)
   * 2. Propagates taint through assignments and function calls
   * 3. Detects taint sinks (SQL injection, command injection, etc.)
   * 4. Checks for sanitization between source and sink
   * 5. Reports vulnerabilities when tainted data reaches sinks unsanitized
   * 
   * @param functionCFG - Function CFG to analyze
   * @param reachingDefinitions - Reaching definitions info for tracking data flow
   * @returns Object containing taint map and detected vulnerabilities
   */
  analyze(
    functionCFG: FunctionCFG,
    reachingDefinitions: Map<string, ReachingDefinitionsInfo>
  ): {
    taintMap: Map<string, TaintInfo[]>;
    vulnerabilities: TaintVulnerability[];
  } {
    const taintMap = new Map<string, TaintInfo[]>();
    const vulnerabilities: TaintVulnerability[] = [];
    
    // Initialize taint info for all variables
    const allVars = this.collectVariables(functionCFG);
    allVars.forEach(varName => {
      taintMap.set(varName, []);
    });
    
    // Forward propagation: find taint sources and propagate
    // LOW FIX (Issue #10): Use Set to track worklist items and avoid duplicates
    const worklistSet = new Set<string>();
    const worklist: Array<{ 
      blockId: string; 
      varName: string; 
      source: string; 
      path: string[];
      category?: string;
      taintType?: string;
      sourceFunction?: string;
    }> = [];
    
    functionCFG.blocks.forEach((block, blockId) => {
      block.statements.forEach(stmt => {
        // Check if this is a taint source using enhanced registry
        if (stmt.type === StatementType.FUNCTION_CALL && stmt.text) {
          const stmtText = stmt.text || stmt.content || '';
          const source = this.detectTaintSource(stmtText, blockId, stmt.id);
          
          if (source) {
            const { variable, taintInfo } = source;
            
            // Add taint info to map
            const existingTaints = taintMap.get(variable) || [];
            existingTaints.push(taintInfo);
            taintMap.set(variable, existingTaints);
            
            // Add to worklist for propagation
            const worklistKey = `${blockId}:${variable}:${taintInfo.source}`;
            if (!worklistSet.has(worklistKey)) {
              worklist.push({
                blockId,
                varName: variable,
                source: taintInfo.source,
                path: [...taintInfo.propagationPath],
                category: taintInfo.sourceCategory,
                taintType: taintInfo.taintType,
                sourceFunction: taintInfo.sourceFunction
              });
              worklistSet.add(worklistKey);
            }
          }
          
        }
        
        // Also check for command line arguments (argv)
        if (stmt.text && stmt.text.includes('argv')) {
          const argvMatch = stmt.text.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*argv/);
          if (argvMatch) {
            const varName = argvMatch[1];
            const taintInfo: TaintInfo = {
              variable: varName,
              source: 'Command line argument (argv)',
              tainted: true,
              propagationPath: [`${blockId}:${stmt.id}`],
              sourceCategory: 'command_line',
              taintType: 'string',
              sourceFunction: 'argv',
              sourceLocation: {
                blockId,
                statementId: stmt.id
              }
            };
            const existingTaints = taintMap.get(varName) || [];
            existingTaints.push(taintInfo);
            taintMap.set(varName, existingTaints);
            const worklistKey = `${blockId}:${varName}:${taintInfo.source}`;
            if (!worklistSet.has(worklistKey)) {
              worklist.push({
                blockId,
                varName,
                source: taintInfo.source,
                path: [...taintInfo.propagationPath],
                category: 'command_line',
                taintType: 'string',
                sourceFunction: 'argv'
              });
              worklistSet.add(worklistKey);
            }
          }
        }
      });
    });
    
    // Propagate taint through assignments and detect sanitization
    while (worklist.length > 0) {
      const item = worklist.shift()!;
      const { blockId, varName, source, path, category, taintType, sourceFunction } = item;
      // Remove from set when processing
      const itemKey = `${blockId}:${varName}:${source}`;
      worklistSet.delete(itemKey);
      
      // Find all uses of this variable
      functionCFG.blocks.forEach((block, bid) => {
        block.statements.forEach(stmt => {
          // Check for sanitization functions first
          if (stmt.type === StatementType.FUNCTION_CALL && stmt.text) {
            const stmtText = stmt.text || stmt.content || '';
            const sanitizedVar = this.detectSanitization(stmtText, varName, taintMap);
            
            if (sanitizedVar && sanitizedVar.removesTaint) {
              // Taint is removed - mark variable as sanitized
              const taintInfos = taintMap.get(sanitizedVar.variable) || [];
              taintInfos.forEach(taintInfo => {
                if (taintInfo.variable === sanitizedVar.variable && taintInfo.tainted) {
                  // Mark as sanitized by adding sanitization point
                  if (!taintInfo.sanitizationPoints) {
                    taintInfo.sanitizationPoints = [];
                  }
                  taintInfo.sanitizationPoints.push({
                    location: `${bid}:${stmt.id}`,
                    type: sanitizedVar.type
                  });
                  
                  // If sanitization completely removes taint, mark as untainted
                  if (sanitizedVar.removesTaint) {
                    taintInfo.tainted = false;
                    taintInfo.sanitized = true;
                  }
                }
              });
              // Don't propagate taint from sanitized variables
              return;
            }
          }
          
          if (stmt.variables?.used.includes(varName)) {
            // If used in assignment, propagate taint to defined variables
            if (stmt.variables.defined.length > 0) {
              stmt.variables.defined.forEach(targetVar => {
                const existingTaint = taintMap.get(targetVar)?.find(
                  t => t.source === source && t.variable === targetVar
                );
                
                if (!existingTaint) {
                  // Find source taint info to propagate labels
                  const sourceTaintInfos = taintMap.get(varName) || [];
                  const sourceTaint = sourceTaintInfos.find(t => t.source === source) || sourceTaintInfos[0];
                  
                  // Use enhanced propagation with labels (Phase 4)
                  const taintInfo = sourceTaint 
                    ? this.propagateTaintWithLabels(sourceTaint, targetVar, bid, stmt.id || '')
                    : {
                        variable: targetVar,
                        source,
                        tainted: true,
                        propagationPath: [...path, `${bid}:${stmt.id}`],
                        sourceCategory: category as any,
                        taintType: taintType as any,
                        sourceFunction,
                        sourceLocation: {
                          blockId: path[0]?.split(':')[0] || blockId,
                          statementId: path[0]?.split(':')[1]
                        },
                        labels: [this.mapCategoryToLabel(category)]
                      };
                  
                  taintMap.get(targetVar)?.push(taintInfo);
                  
                  // LOW FIX (Issue #10): Only add to worklist if not already processed
                  const newWorklistKey = `${bid}:${targetVar}:${source}`;
                  if (!worklistSet.has(newWorklistKey)) {
                    worklist.push({
                      blockId: bid,
                      varName: targetVar,
                      source,
                      path: taintInfo.propagationPath,
                      category,
                      taintType,
                      sourceFunction
                    });
                    worklistSet.add(newWorklistKey);
                  }
                }
              });
            }
          }
        });
      });
    }
    
    // After propagation is complete, check for sink vulnerabilities
    // We need to do this after propagation so taint has flowed to all variables
    functionCFG.blocks.forEach((block, blockId) => {
      block.statements.forEach(stmt => {
        if (stmt.type === StatementType.FUNCTION_CALL && stmt.text) {
          const stmtText = stmt.text || stmt.content || '';
          const sinkVulns = this.detectSinkVulnerabilities(
            stmtText,
            blockId,
            stmt.id || '',
            functionCFG.name,
            taintMap,
            functionCFG
          );
          vulnerabilities.push(...sinkVulns);
        }
      });
    });
    
    return { taintMap, vulnerabilities };
  }

  /**
   * Detect sink vulnerabilities - check if tainted data reaches dangerous sinks
   */
  private detectSinkVulnerabilities(
    stmtText: string,
    blockId: string,
    statementId: string,
    functionName: string,
    taintMap: Map<string, TaintInfo[]>,
    functionCFG: FunctionCFG
  ): TaintVulnerability[] {
    const vulnerabilities: TaintVulnerability[] = [];
    
    // Get statement from CFG to access variables
    let stmt: any = null;
    for (const block of functionCFG.blocks.values()) {
      const foundStmt = block.statements.find(s => s.id === statementId);
      if (foundStmt) {
        stmt = foundStmt;
        break;
      }
    }
    
    if (!stmt) {
      // Fallback: try to find by text match
      for (const block of functionCFG.blocks.values()) {
        const foundStmt = block.statements.find(s => (s.text || s.content) === stmtText);
        if (foundStmt) {
          stmt = foundStmt;
          break;
        }
      }
    }
    
    // Extract function call using CFG-aware extractor
    const tempStmt: Statement = { text: stmtText };
    const call = FunctionCallExtractor.getFirstFunctionCall(tempStmt);
    
    if (!call) return vulnerabilities;
    
    const funcName = call.name;
    
    // IMPORTANT: Skip sink detection if this function is also a taint source
    // Functions like scanf, gets can be both sources and sinks, but we should
    // only detect them as sinks when tainted data flows FROM elsewhere TO them,
    // not when they are the source of the taint themselves.
    // 
    // For scanf specifically: if variables are being written TO scanf (output args),
    // then scanf is the source, not a sink. We only care about scanf as a sink
    // if the format string itself is tainted (which is rare).
    if (this.sourceRegistry.isTaintSource(funcName)) {
      const sourceDef = this.sourceRegistry.getTaintSource(funcName);
      if (sourceDef) {
        // Check if this call is creating taint (i.e., it's a source call)
        // by checking if the target variable extraction would succeed
        const targetVar = this.sourceRegistry.extractTargetVariable(stmtText, sourceDef);
        if (targetVar) {
          // This is a source call - skip sink detection to avoid false positives
          // We only want to detect sinks where tainted data flows TO them, not FROM them
          return vulnerabilities;
        }
      }
    }
    
    // Check if it's a known taint sink
    if (!this.sinkRegistry.isTaintSink(funcName)) {
      return vulnerabilities;
    }

    const sinkDef = this.sinkRegistry.getTaintSink(funcName);
    if (!sinkDef) return vulnerabilities;

    // Extract arguments from the call expression
    const args = call.arguments;
    
    // Also check variables used in the statement (from CFG)
    const usedVars = stmt?.variables?.used || [];
    
    // First, check all used variables for taint (more reliable than argument parsing)
    for (const usedVar of usedVars) {
      const usedTaintInfos = taintMap.get(usedVar) || [];
      if (usedTaintInfos.length > 0 && usedTaintInfos.some(t => t.tainted)) {
        // Found tainted variable used in sink - check if this sink is dangerous for any argument
        for (const taintInfo of usedTaintInfos) {
          if (!taintInfo.tainted) continue;
          
          const vulnType = this.mapSinkCategoryToVulnType(sinkDef.category);
          const vulnerability: TaintVulnerability = {
            id: `${functionName}_${blockId}_${statementId}_${usedVar}_${vulnType}`,
            type: vulnType,
            severity: sinkDef.severity,
            source: {
              file: '',
              line: taintInfo.sourceLocation?.range?.start.line || 0,
              function: functionName,
              statement: '',
              variable: taintInfo.variable
            },
            sink: {
              file: '',
              line: 0,
              function: functionName,
              statement: stmtText,
              argumentIndex: -1 // Unknown, but variable is used
            },
            propagationPath: taintInfo.propagationPath.map(pathStr => {
              const [bid, sid] = pathStr.split(':');
              return {
                file: '',
                function: functionName,
                blockId: bid,
                statementId: sid || ''
              };
            }),
            sanitized: taintInfo.sanitized || false,
            sanitizationPoints: taintInfo.sanitizationPoints || [],
            cweId: sinkDef.cweId,
            description: sinkDef.description || `Tainted data from ${taintInfo.source} reaches ${sinkDef.functionName}`
          };
          vulnerabilities.push(vulnerability);
        }
      }
    }
    
    // Also check specific argument indices (for more precise detection)
    // Check each dangerous argument index
    for (const argIndex of sinkDef.argumentIndices) {
      if (argIndex >= args.length) continue;
      
      const arg = args[argIndex].trim();
      // Extract variable name from argument (remove operators, literals, etc.)
      const varMatch = arg.match(/([a-zA-Z_][a-zA-Z0-9_]*)/);
      if (!varMatch) continue;
      
      const varName = varMatch[1];
      
      // Skip if we already detected this variable via usedVars
      if (usedVars.includes(varName)) continue;
      
      // Check if this variable is tainted
      const taintInfos = taintMap.get(varName) || [];
      if (taintInfos.length === 0) continue;
      
      // For each taint source, create a vulnerability
      for (const taintInfo of taintInfos) {
        if (!taintInfo.tainted) continue;
        
        // Map sink category to vulnerability type
        const vulnType = this.mapSinkCategoryToVulnType(sinkDef.category);
        
        const vulnerability: TaintVulnerability = {
          id: `${functionName}_${blockId}_${statementId}_${varName}_${vulnType}`,
          type: vulnType,
          severity: sinkDef.severity,
          source: {
            file: '', // Will be filled by caller if available
            line: taintInfo.sourceLocation?.range?.start.line || 0,
            function: functionName,
            statement: '', // Will be filled from source location
            variable: taintInfo.variable
          },
          sink: {
            file: '', // Will be filled by caller if available
            line: 0, // Will be filled from statement range if available
            function: functionName,
            statement: stmtText,
            argumentIndex: argIndex
          },
          propagationPath: taintInfo.propagationPath.map(pathStr => {
            const [bid, sid] = pathStr.split(':');
            return {
              file: '',
              function: functionName,
              blockId: bid,
              statementId: sid || ''
            };
          }),
          sanitized: taintInfo.sanitized || false,
          sanitizationPoints: taintInfo.sanitizationPoints || [],
          cweId: sinkDef.cweId,
          description: sinkDef.description || `Tainted data from ${taintInfo.source} reaches ${sinkDef.functionName}`
        };
        
        vulnerabilities.push(vulnerability);
      }
    }
    
    return vulnerabilities;
  }

  /**
   * Map sink category to vulnerability type
   */
  private mapSinkCategoryToVulnType(
    category: string
  ): 'sql_injection' | 'command_injection' | 'format_string' | 'path_traversal' | 'buffer_overflow' | 'code_injection' | 'integer_overflow' {
    switch (category) {
      case 'sql': return 'sql_injection';
      case 'command': return 'command_injection';
      case 'format_string': return 'format_string';
      case 'path': return 'path_traversal';
      case 'buffer': return 'buffer_overflow';
      case 'code': return 'code_injection';
      case 'integer_overflow': return 'integer_overflow';
      default: return 'code_injection';
    }
  }

  /**
   * Detect sanitization function calls
   * Returns sanitization info if detected, null otherwise
   */
  private detectSanitization(
    stmtText: string,
    taintedVarName: string,
    taintMap: Map<string, TaintInfo[]>
  ): { variable: string; type: string; removesTaint: boolean } | null {
    // Extract function call using CFG-aware extractor
    const tempStmt: Statement = { text: stmtText };
    const call = FunctionCallExtractor.getFirstFunctionCall(tempStmt);
    
    if (!call) return null;
    
    const funcName = call.name;
    
    // Check if it's a known sanitization function
    if (!this.sanitizationRegistry.isSanitizationFunction(funcName)) {
      return null;
    }
    
    const sanitizer = this.sanitizationRegistry.getSanitizationFunction(funcName);
    if (!sanitizer) return null;
    
    // Check if the tainted variable is being sanitized
    const inputVar = this.sanitizationRegistry.extractInputVariable(stmtText, sanitizer);
    const outputVar = this.sanitizationRegistry.extractSanitizedVariable(stmtText, sanitizer);
    
    // Check if tainted variable matches input or output
    if (inputVar === taintedVarName || outputVar === taintedVarName) {
      return {
        variable: outputVar || inputVar || taintedVarName,
        type: sanitizer.type,
        removesTaint: sanitizer.removesTaint
      };
    }
    
    // Also check if any argument contains the tainted variable
    for (const arg of call.arguments) {
      if (arg.includes(taintedVarName)) {
        return {
          variable: outputVar || taintedVarName,
          type: sanitizer.type,
          removesTaint: sanitizer.removesTaint
        };
      }
    }
    
    return null;
  }

  /**
   * Detect taint source from function call statement
   * Uses CFG-aware function extraction instead of regex
   */
  private detectTaintSource(
    stmtText: string,
    blockId: string,
    statementId?: string
  ): { variable: string; taintInfo: TaintInfo } | null {
    // Extract function call using CFG-aware extractor
    const tempStmt: Statement = { text: stmtText };
    const call = FunctionCallExtractor.getFirstFunctionCall(tempStmt);
    
    if (!call) return null;
    
    const funcName = call.name;
    
    // Check if it's a known taint source
    if (!this.sourceRegistry.isTaintSource(funcName)) {
      return null;
    }

    const sourceDef = this.sourceRegistry.getTaintSource(funcName);
    if (!sourceDef) return null;

    // Extract target variable using the call expression
    const targetVar = this.sourceRegistry.extractTargetVariable(call.callExpression, sourceDef);
    
    // If we can't extract target variable, try using variables from statement
    let variable = targetVar;
    if (!variable) {
      // Fallback: use variables defined in statement
      // This is a heuristic - in practice, we'd parse the statement more carefully
      const definedVars = this.extractDefinedVariables(stmtText);
      if (definedVars.length > 0) {
        variable = definedVars[0];
      } else {
        // For functions that return values (like getenv), look for assignment
        const assignmentMatch = stmtText.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*/);
        if (assignmentMatch) {
          variable = assignmentMatch[1];
        }
      }
    }

    if (!variable) return null;

    // Create taint info with enhanced metadata and labels
    const taintInfo: TaintInfo = {
      variable,
      source: `${sourceDef.category}: ${funcName}`,
      tainted: true,
      propagationPath: [`${blockId}:${statementId || 'unknown'}`],
      sourceCategory: sourceDef.category,
      taintType: sourceDef.taintType,
      sourceFunction: funcName,
      sourceLocation: {
        blockId,
        statementId: statementId || 'unknown'
      },
      // Phase 4: Add taint label based on category
      labels: [this.mapCategoryToLabel(sourceDef.category)]
    };

    return { variable, taintInfo };
  }

  /**
   * Extract variables defined in a statement
   * Heuristic: look for variable assignments
   */
  private extractDefinedVariables(stmtText: string): string[] {
    const vars: string[] = [];
    
    // Pattern: type var = ... or var = ...
    const assignmentMatch = stmtText.match(/(?:[a-zA-Z_]+\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*=/);
    if (assignmentMatch) {
      vars.push(assignmentMatch[1]);
    }
    
    // Pattern: &var (address of variable, common in scanf)
    const addressMatch = stmtText.match(/&\s*([a-zA-Z_][a-zA-Z0-9_]*)/g);
    if (addressMatch) {
      addressMatch.forEach(m => {
        const varName = m.replace(/&/g, '').trim();
        if (varName && !vars.includes(varName)) {
          vars.push(varName);
        }
      });
    }
    
    return vars;
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
   * @deprecated Use addCustomSource on sourceRegistry instead
   */
  addTaintSource(source: string): void {
    // For backward compatibility, add as a simple custom source
    this.sourceRegistry.addCustomSource({
      functionName: source,
      category: 'user_input',
      argumentIndex: 0,
      taintType: 'string'
    });
  }

  /**
   * Map source category to taint label (Phase 4)
   */
  private mapCategoryToLabel(category?: string): TaintLabel {
    switch (category) {
      case 'user_input': return TaintLabel.USER_INPUT;
      case 'file_io': return TaintLabel.FILE_CONTENT;
      case 'network': return TaintLabel.NETWORK_DATA;
      case 'environment': return TaintLabel.ENVIRONMENT;
      case 'command_line': return TaintLabel.COMMAND_LINE;
      case 'database': return TaintLabel.DATABASE;
      case 'configuration': return TaintLabel.CONFIGURATION;
      default: return TaintLabel.DERIVED;
    }
  }

  /**
   * Enhanced propagation: propagate taint labels through assignments
   * Phase 4: Improved propagation with label tracking
   */
  private propagateTaintWithLabels(
    sourceTaint: TaintInfo,
    targetVar: string,
    blockId: string,
    statementId: string
  ): TaintInfo {
    return {
      variable: targetVar,
      source: sourceTaint.source,
      tainted: true,
      propagationPath: [...sourceTaint.propagationPath, `${blockId}:${statementId}`],
      sourceCategory: sourceTaint.sourceCategory,
      taintType: sourceTaint.taintType,
      sourceFunction: sourceTaint.sourceFunction,
      sourceLocation: sourceTaint.sourceLocation,
      sanitized: sourceTaint.sanitized,
      sanitizationPoints: sourceTaint.sanitizationPoints,
      // Phase 4: Propagate labels (derived taint keeps original labels)
      labels: sourceTaint.labels || [TaintLabel.DERIVED]
    };
  }

  /**
   * Get the source registry (for configuration)
   */
  getSourceRegistry(): TaintSourceRegistry {
    return this.sourceRegistry;
  }
}

