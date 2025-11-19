/**
 * TaintAnalyzer.ts
 * 
 * Taint Analyzer - Forward Taint Propagation Analysis
 * 
 * PURPOSE:
 * Performs forward taint propagation analysis to track the flow of potentially malicious
 * or unsafe data through the program. Identifies taint sources, propagates taint through
 * assignments and function calls, detects taint sinks, and reports vulnerabilities when
 * tainted data reaches security sinks without sanitization.
 * 
 * SIGNIFICANCE IN OVERALL FLOW:
 * This analyzer runs as part of the intra-procedural analysis phase in DataflowAnalyzer.
 * It is critical for security vulnerability detection, identifying paths from taint sources
 * (user input, file I/O, network) to security sinks (SQL injection, command injection, etc.).
 * Its results are visualized in CFGVisualizer and used by SecurityAnalyzer for vulnerability
 * reporting. Inter-procedural taint propagation is handled by InterProceduralTaintAnalyzer.
 * 
 * DATA FLOW:
 * INPUTS:
 *   - FunctionCFG object (from DataflowAnalyzer.ts, originally from EnhancedCPPParser.ts)
 *   - ReachingDefinitionsInfo Map (from ReachingDefinitionsAnalyzer.ts) for tracking data flow
 *   - TaintSourceRegistry: Registry of taint source functions (scanf, gets, fgets, etc.)
 *   - TaintSinkRegistry: Registry of taint sink functions (printf, system, SQL queries, etc.)
 *   - SanitizationRegistry: Registry of sanitization functions (validation, encoding, etc.)
 * 
 * PROCESSING:
 *   1. Detects taint sources in statements (using TaintSourceRegistry)
 *   2. Propagates taint forward through assignments:
 *      - If RHS is tainted, mark LHS as tainted
 *      - Track propagation path from source to current point
 *   3. Detects taint sinks in statements (using TaintSinkRegistry)
 *   4. Checks if tainted variables reach sinks without sanitization
 *   5. Detects sanitization points (using SanitizationRegistry)
 *   6. Removes taint from sanitized variables
 *   7. Reports vulnerabilities when tainted data reaches sinks unsanitized
 * 
 * OUTPUTS:
 *   - TaintResult object containing:
 *     - taintMap: Map<blockId, TaintInfo[]> - Taint information per block
 *     - vulnerabilities: TaintVulnerability[] - Detected vulnerabilities with source-to-sink paths
 *   - Taint results -> DataflowAnalyzer.ts (aggregated into AnalysisState)
 *   - Taint results -> InterProceduralTaintAnalyzer.ts (for cross-function taint propagation)
 *   - Taint results -> CFGVisualizer.ts (for visualization)
 *   - Taint results -> SecurityAnalyzer.ts (for vulnerability reporting)
 * 
 * DEPENDENCIES:
 *   - types.ts: FunctionCFG, TaintInfo, TaintLabel, TaintVulnerability, ReachingDefinitionsInfo
 *   - TaintSourceRegistry.ts: Taint source detection
 *   - TaintSinkRegistry.ts: Taint sink detection
 *   - SanitizationRegistry.ts: Sanitization detection
 *   - FunctionCallExtractor.ts: Function call extraction from statements
 * 
 * TAINT SOURCE CATEGORIES:
 * - User input: scanf, gets, fgets, read, cin
 * - File I/O: fread, fgets, read
 * - Network: recv, recvfrom, read (socket)
 * - Environment: getenv
 * - Command line: argv
 * - Database: SQL query results
 * - Configuration: config file reads
 * 
 * TAINT SINK CATEGORIES:
 * - SQL injection: SQL query construction
 * - Command injection: system(), popen(), exec*()
 * - Format string: printf family with user-controlled format
 * - Path traversal: file operations
 * - Buffer overflow: strcpy, strcat, sprintf
 * - Code injection: eval, exec
 * - Integer overflow: arithmetic operations
 * 
 * SANITIZATION TYPES:
 * - Input validation: bounds checking, type checking
 * - Encoding: HTML encoding, URL encoding
 * - Escaping: SQL escaping, shell escaping
 * - Whitelisting: allowlist validation
 * - Type conversion: safe type conversions
 * - Length limits: buffer size limits
 * 
 * NEW FEATURES (v1.9.0):
 * - Recursive Control-Dependent Taint Propagation: Tracks implicit data flow through control dependencies
 * - 5 Configurable Sensitivity Levels: MINIMAL, CONSERVATIVE, BALANCED, PRECISE, MAXIMUM
 * - Path-Sensitive Analysis: Reduces false positives by only marking truly control-dependent blocks
 * - Field-Sensitive Analysis: Tracks taint at struct field level
 * - Context-Sensitive Analysis: k-limited context tracking for MAXIMUM level
 * - Flow-Sensitive Analysis: Statement order awareness for MAXIMUM level
 * 
 * References:
 * - "Control Dependence" - Ferrante et al. (1987)
 * - "Incremental Static Analysis" - Reps et al. (2003)
 * - "Engineering a Compiler" (Cooper & Torczon) - Incremental Analysis
 */

import { BasicBlock, FunctionCFG, TaintInfo, ReachingDefinitionsInfo, StatementType, TaintVulnerability, Statement, TaintLabel, TaintSensitivity } from '../types';
import { TaintSourceRegistry, defaultTaintSourceRegistry } from './TaintSourceRegistry';
import { TaintSinkRegistry, defaultTaintSinkRegistry } from './TaintSinkRegistry';
import { SanitizationRegistry, defaultSanitizationRegistry } from './SanitizationRegistry';
import { FunctionCallExtractor } from './FunctionCallExtractor';

export class TaintAnalyzer {
  private sourceRegistry: TaintSourceRegistry;
  private sinkRegistry: TaintSinkRegistry;
  private sanitizationRegistry: SanitizationRegistry;
  private currentFunctionCFG?: FunctionCFG; // Store current CFG for helper methods
  private sensitivity: TaintSensitivity; // Taint analysis sensitivity level
  
  /**
   * Initialize taint analyzer with source, sink, and sanitization registries
   */
  constructor(
    sourceRegistry?: TaintSourceRegistry,
    sinkRegistry?: TaintSinkRegistry,
    sanitizationRegistry?: SanitizationRegistry,
    sensitivity: TaintSensitivity = TaintSensitivity.PRECISE  // Default to PRECISE
  ) {
    this.sourceRegistry = sourceRegistry || defaultTaintSourceRegistry;
    this.sinkRegistry = sinkRegistry || defaultTaintSinkRegistry;
    this.sanitizationRegistry = sanitizationRegistry || defaultSanitizationRegistry;
    this.sensitivity = sensitivity;
    
    console.log(`[TaintAnalyzer] [INFO] ========== TAINT ANALYZER INITIALIZATION ==========`);
    console.log(`[TaintAnalyzer] [INFO] TaintAnalyzer constructor called`);
    console.log(`[TaintAnalyzer] [INFO] Sensitivity parameter: ${sensitivity}`);
    console.log(`[TaintAnalyzer] [INFO] Sensitivity type: ${typeof sensitivity}`);
    console.log(`[TaintAnalyzer] [INFO] Sensitivity enum values: MINIMAL=${TaintSensitivity.MINIMAL}, CONSERVATIVE=${TaintSensitivity.CONSERVATIVE}, BALANCED=${TaintSensitivity.BALANCED}, PRECISE=${TaintSensitivity.PRECISE}, MAXIMUM=${TaintSensitivity.MAXIMUM}`);
    console.log(`[TaintAnalyzer] [DEBUG] Setting this.sensitivity = ${sensitivity}`);
    console.log(`[TaintAnalyzer] [DEBUG] this.sensitivity after assignment: ${this.sensitivity}`);
    console.log(`[TaintAnalyzer] [DEBUG] Control-dependent enabled: ${this.shouldEnableControlDependent()}`);
    console.log(`[TaintAnalyzer] [DEBUG] Recursive propagation enabled: ${this.shouldEnableRecursivePropagation()}`);
    console.log(`[TaintAnalyzer] [DEBUG] Path-sensitive enabled: ${this.shouldEnablePathSensitive()}`);
    console.log(`[TaintAnalyzer] [DEBUG] Field-sensitive enabled: ${this.shouldEnableFieldSensitive()}`);
    console.log(`[TaintAnalyzer] [DEBUG] Context-sensitive enabled: ${this.shouldEnableContextSensitive()}`);
    console.log(`[TaintAnalyzer] [DEBUG] Flow-sensitive enabled: ${this.shouldEnableFlowSensitive()}`);
    console.log(`[TaintAnalyzer] [INFO] Taint analyzer initialized with registries (source, sink, sanitization)`);
    console.log(`[TaintAnalyzer] [INFO] ========== INITIALIZATION COMPLETE ==========`);
  }
  
  /**
   * Check if control-dependent taint propagation should be enabled
   */
  private shouldEnableControlDependent(): boolean {
    return this.sensitivity !== TaintSensitivity.MINIMAL;
  }

  /**
   * Check if recursive propagation should be enabled
   */
  private shouldEnableRecursivePropagation(): boolean {
    return this.sensitivity >= TaintSensitivity.BALANCED;
  }

  /**
   * Check if path-sensitive analysis should be enabled
   */
  private shouldEnablePathSensitive(): boolean {
    return this.sensitivity >= TaintSensitivity.PRECISE;
  }

  /**
   * Check if field-sensitive analysis should be enabled
   */
  private shouldEnableFieldSensitive(): boolean {
    return this.sensitivity >= TaintSensitivity.PRECISE;
  }

  /**
   * Check if context-sensitive analysis should be enabled
   */
  private shouldEnableContextSensitive(): boolean {
    return this.sensitivity === TaintSensitivity.MAXIMUM;
  }

  /**
   * Check if flow-sensitive analysis should be enabled
   */
  private shouldEnableFlowSensitive(): boolean {
    return this.sensitivity === TaintSensitivity.MAXIMUM;
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
    const analysisStartTime = Date.now();
    console.log(`[TaintAnalyzer] [INFO] Starting taint analysis for function: ${functionCFG.name}`);
    console.log(`[TaintAnalyzer] [DEBUG] Function has ${functionCFG.blocks.size} blocks, ${reachingDefinitions.size} reaching definition entries`);
    console.log(`[TaintAnalyzer] [DEBUG] Sensitivity level: ${this.sensitivity}, Control-dependent enabled: ${this.shouldEnableControlDependent()}, Recursive: ${this.shouldEnableRecursivePropagation()}`);
    
    // Store functionCFG for use in helper methods
    this.currentFunctionCFG = functionCFG;
    
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
                  // Format path entry with block label
                  const blockLabel = this.getBlockLabel(functionCFG, bid);
                  const pathEntry = blockLabel ? `${functionCFG.name}:${blockLabel}` : `${functionCFG.name}:B${bid}`;
                  
                  const taintInfo = sourceTaint 
                    ? this.propagateTaintWithLabels(sourceTaint, targetVar, bid, stmt.id || '')
                    : {
                        variable: targetVar,
                        source,
                        tainted: true,
                        propagationPath: [...path, pathEntry],
                        sourceCategory: category as any,
                        taintType: taintType as any,
                        sourceFunction,
                        sourceLocation: {
                          blockId: bid,
                          statementId: stmt.id || 'unknown'
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
    
    // NEW: Control-dependent taint propagation (implicit flow)
    if (this.shouldEnableControlDependent()) {
      const controlDeps = this.buildControlDependencyGraph(functionCFG);
      this.propagateControlDependentTaint(taintMap, controlDeps, functionCFG);
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
    
    const analysisTimeMs = Date.now() - analysisStartTime;
    const totalTaintedVars = Array.from(taintMap.values()).flat().length;
    console.log(`[TaintAnalyzer] [INFO] Analysis completed for ${functionCFG.name} in ${analysisTimeMs}ms`);
    console.log(`[TaintAnalyzer] [DEBUG] Found ${totalTaintedVars} tainted variables, ${vulnerabilities.length} vulnerabilities`);
    if (vulnerabilities.length > 0) {
      console.log(`[TaintAnalyzer] [WARN] Detected ${vulnerabilities.length} taint vulnerabilities in ${functionCFG.name}`);
    }
    
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
    // Format propagation path with function name and block label
    // Note: functionCFG is not available here, use currentFunctionCFG
    const cfg = this.currentFunctionCFG;
    const blockLabel = cfg ? this.getBlockLabel(cfg, blockId) : null;
    const pathEntry = blockLabel && cfg 
      ? `${cfg.name}:${blockLabel}` 
      : cfg 
        ? `${cfg.name}:B${blockId}` 
        : `B${blockId}`;
    
    const taintInfo: TaintInfo = {
      variable,
      source: `${sourceDef.category}: ${funcName}`,
      tainted: true,
      propagationPath: [pathEntry],
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
   * Get block label for display in propagation path.
   * 
   * @param functionCFG - Function CFG
   * @param blockId - Block ID
   * @returns Block label or null
   */
  private getBlockLabel(functionCFG: FunctionCFG, blockId: string): string | null {
    const block = functionCFG.blocks.get(blockId);
    if (!block) return null;
    
    if (block.label && block.label.trim().length > 0) {
      return block.label.trim();
    }
    if (block.isEntry) return 'Entry';
    if (block.isExit) return 'Exit';
    return null;
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
    // Format path entry with block label
    const functionCFG = this.currentFunctionCFG;
    const blockLabel = functionCFG ? this.getBlockLabel(functionCFG, blockId) : null;
    const pathEntry = blockLabel && functionCFG 
      ? `${functionCFG.name}:${blockLabel}` 
      : functionCFG 
        ? `${functionCFG.name}:B${blockId}` 
        : `B${blockId}`;
    
    return {
      variable: targetVar,
      source: sourceTaint.source,
      tainted: true,
      propagationPath: [...sourceTaint.propagationPath, pathEntry],
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
   * Build control dependency graph for a function CFG
   * Maps conditional block ID -> set of control-dependent block IDs
   */
  /**
   * Build control dependency graph for control-dependent taint propagation
   * 
   * Identifies conditional blocks and maps them to their control-dependent blocks.
   * Supports path-sensitive analysis for PRECISE/MAXIMUM sensitivity levels.
   * 
   * Algorithm:
   * 1. Identify conditional blocks (if, while, for, switch)
   * 2. For each conditional, find blocks that are control-dependent on it
   * 3. Use path-sensitive analysis if enabled (PRECISE/MAXIMUM)
   * 
   * Reference: "Control Dependence" - Ferrante et al. (1987)
   */
  private buildControlDependencyGraph(functionCFG: FunctionCFG): Map<string, Set<string>> {
    console.log(`[TaintAnalyzer] [DEBUG] Building control dependency graph for ${functionCFG.name}`);
    
    const controlDeps = new Map<string, Set<string>>();
    
    functionCFG.blocks.forEach((block, blockId) => {
      // Check if block is conditional (if/while/for/switch)
      if (this.isConditionalBlock(block)) {
        const conditionalVars = this.extractConditionalVariables(block);
        if (conditionalVars.length > 0) {
          const dependentBlocks = this.getControlDependentBlocks(functionCFG, blockId);
          if (dependentBlocks.size > 0) {
            controlDeps.set(blockId, dependentBlocks);
            console.log(`[TaintAnalyzer] [ControlDependentTaint] Conditional block ${blockId} has ${dependentBlocks.size} control-dependent blocks`);
          }
        }
      }
    });
    
    console.log(`[TaintAnalyzer] [ControlDependentTaint] Control dependency graph built: ${controlDeps.size} conditionals`);
    return controlDeps;
  }

  /**
   * Check if a block is a conditional statement
   */
  private isConditionalBlock(block: BasicBlock): boolean {
    return block.statements.some(stmt => {
      const stmtType = stmt.type;
      const stmtText = stmt.text || stmt.content || '';
      
      return stmtType === StatementType.CONDITIONAL ||
             stmtType === StatementType.LOOP ||
             stmtText.includes('if (') ||
             stmtText.includes('while (') ||
             stmtText.includes('for (') ||
             stmtText.includes('switch (');
    });
  }

  /**
   * Extract variables used in conditional statements
   */
  private extractConditionalVariables(block: BasicBlock): string[] {
    const vars: string[] = [];
    
    block.statements.forEach(stmt => {
      const stmtText = stmt.text || stmt.content || '';
      
      // Extract variables from conditionals
      if (stmt.variables?.used) {
        vars.push(...stmt.variables.used);
      }
      
      // Also extract from statement text (heuristic)
      const varMatches = stmtText.match(/([a-zA-Z_][a-zA-Z0-9_]*)/g);
      if (varMatches) {
        varMatches.forEach(match => {
          // Filter out keywords
          const keywords = ['if', 'while', 'for', 'switch', 'case', 'break', 'return', 'int', 'char', 'void', 'else'];
          if (!keywords.includes(match) && !vars.includes(match)) {
            vars.push(match);
          }
        });
      }
    });
    
    if (vars.length > 0) {
      console.log(`[TaintAnalyzer] [ControlDependentTaint] Extracted conditional variables: [${vars.join(', ')}]`);
    }
    return vars;
  }

  /**
   * Get blocks that are control-dependent on a conditional block
   * For path-sensitive analysis (PRECISE/MAXIMUM), only marks blocks reachable from SOME but not ALL branches
   */
  private getControlDependentBlocks(functionCFG: FunctionCFG, conditionalBlockId: string): Set<string> {
    const conditionalBlock = functionCFG.blocks.get(conditionalBlockId);
    if (!conditionalBlock) {
      return new Set();
    }
    
    // Path-sensitive analysis: only mark blocks reachable from SOME but not ALL branches
    if (this.shouldEnablePathSensitive()) {
      return this.getPathSensitiveControlDependentBlocks(functionCFG, conditionalBlockId);
    }
    
    // Non-path-sensitive: mark all blocks reachable from conditional branches
    const dependentBlocks = new Set<string>();
    
    // Find all blocks reachable from conditional branches
    const visited = new Set<string>();
    const queue: string[] = [...conditionalBlock.successors];
    
    while (queue.length > 0) {
      const blockId = queue.shift()!;
      if (visited.has(blockId)) continue;
      visited.add(blockId);
      
      const block = functionCFG.blocks.get(blockId);
      if (!block) continue;
      
      // Add to dependent blocks
      dependentBlocks.add(blockId);
      
      // Continue traversing successors
      block.successors.forEach(succId => {
        if (!visited.has(succId)) {
          queue.push(succId);
        }
      });
    }
    
    return dependentBlocks;
  }

  /**
   * Path-sensitive control dependency detection
   * Only marks blocks reachable from SOME but not ALL branches as control-dependent
   * This reduces false positives by excluding blocks that execute regardless of branch taken
   */
  private getPathSensitiveControlDependentBlocks(functionCFG: FunctionCFG, conditionalBlockId: string): Set<string> {
    const conditionalBlock = functionCFG.blocks.get(conditionalBlockId);
    if (!conditionalBlock) {
      return new Set();
    }
    
    console.log(`[TaintAnalyzer] [PathSensitive] Analyzing conditional block ${conditionalBlockId} for path-sensitive control dependencies`);
    
    const allReachable = new Set<string>();
    const branchReachable = new Map<number, Set<string>>();
    
    // Get all branches from conditional (successors represent different branches)
    const branches = conditionalBlock.successors;
    
    if (branches.length === 0) {
      return new Set();
    }
    
    // For each branch, find all reachable blocks
    branches.forEach((branchTarget, branchIndex) => {
      const reachable = new Set<string>();
      const visited = new Set<string>();
      const queue: string[] = [branchTarget];
      
      while (queue.length > 0) {
        const blockId = queue.shift()!;
        if (visited.has(blockId)) continue;
        visited.add(blockId);
        
        const block = functionCFG.blocks.get(blockId);
        if (!block) continue;
        
        reachable.add(blockId);
        allReachable.add(blockId);
        
        // Continue traversing successors
        block.successors.forEach(succId => {
          if (!visited.has(succId)) {
            queue.push(succId);
          }
        });
      }
      
      branchReachable.set(branchIndex, reachable);
      console.log(`[TaintAnalyzer] [PathSensitive] Branch ${branchIndex} (target: ${branchTarget}) reaches ${reachable.size} blocks`);
    });
    
    // Control-dependent = blocks reachable from SOME but not ALL branches
    const controlDependent = new Set<string>();
    
    allReachable.forEach(blockId => {
      // Count how many branches can reach this block
      let reachableFromBranches = 0;
      branchReachable.forEach((reachableSet) => {
        if (reachableSet.has(blockId)) {
          reachableFromBranches++;
        }
      });
      
      // If block is reachable from SOME but not ALL branches, it's control-dependent
      if (reachableFromBranches > 0 && reachableFromBranches < branches.length) {
        controlDependent.add(blockId);
        console.log(`[TaintAnalyzer] [PathSensitive] Block ${blockId} is control-dependent (reachable from ${reachableFromBranches}/${branches.length} branches)`);
      } else if (reachableFromBranches === branches.length) {
        console.log(`[TaintAnalyzer] [PathSensitive] Block ${blockId} is NOT control-dependent (reachable from ALL branches)`);
      }
    });
    
    console.log(`[TaintAnalyzer] [PathSensitive] Found ${controlDependent.size} path-sensitive control-dependent blocks (out of ${allReachable.size} total reachable)`);
    return controlDependent;
  }

  /**
   * Propagate control-dependent taint using fixed-point iteration
   * Supports context-sensitive and flow-sensitive analysis for MAXIMUM level
   */
  private propagateControlDependentTaint(
    taintMap: Map<string, TaintInfo[]>,
    controlDeps: Map<string, Set<string>>,
    functionCFG: FunctionCFG
  ): void {
    if (!this.shouldEnableControlDependent()) {
      console.log(`[TaintAnalyzer] [ControlDependentTaint] Skipping control-dependent propagation (MINIMAL sensitivity)`);
      return;
    }
    
    console.log(`[TaintAnalyzer] [ControlDependentTaint] Starting control-dependent taint propagation`);
    
    let changed = true;
    let iteration = 0;
    const MAX_ITERATIONS = 10;
    
    while (changed && iteration < MAX_ITERATIONS) {
      changed = false;
      iteration++;
      
      console.log(`[TaintAnalyzer] [ControlDependentTaint] Fixed-point iteration ${iteration}`);
      
      controlDeps.forEach((dependentBlocks, conditionalBlockId) => {
        const conditionalBlock = functionCFG.blocks.get(conditionalBlockId);
        if (!conditionalBlock) return;
        
        const conditionalVars = this.extractConditionalVariables(conditionalBlock);
        
        // Check if any conditional variable is tainted
        let hasTaintedCondition = false;
        for (const varName of conditionalVars) {
          const taintInfos = taintMap.get(varName) || [];
          if (taintInfos.some(t => t.tainted)) {
            hasTaintedCondition = true;
            console.log(`[TaintAnalyzer] [ControlDependentTaint] Conditional block ${conditionalBlockId} uses tainted variable: ${varName}`);
            break;
          }
        }
        
        if (hasTaintedCondition) {
          // Context-sensitive analysis: track contexts for MAXIMUM level
          const context = this.shouldEnableContextSensitive() 
            ? this.getCallContext(functionCFG, conditionalBlockId)
            : null;
          
          // Propagate taint to control-dependent blocks
          dependentBlocks.forEach(dependentBlockId => {
            if (this.propagateTaintToControlDependentBlock(
              dependentBlockId,
              taintMap,
              functionCFG,
              conditionalBlockId,
              new Set(),  // visited set
              context     // context for context-sensitive analysis
            )) {
              changed = true;
            }
          });
        }
      });
      
      if (changed) {
        console.log(`[TaintAnalyzer] [ControlDependentTaint] Iteration ${iteration}: new taint labels added`);
      } else {
        console.log(`[TaintAnalyzer] [ControlDependentTaint] Iteration ${iteration}: converged (no new taint)`);
      }
    }
    
    if (iteration >= MAX_ITERATIONS) {
      console.warn(`[TaintAnalyzer] [ControlDependentTaint] WARNING: Reached MAX_ITERATIONS (${MAX_ITERATIONS})`);
    }
  }

  /**
   * Propagate taint to a control-dependent block (recursive)
   * Supports field-sensitive, context-sensitive, and flow-sensitive analysis
   */
  private propagateTaintToControlDependentBlock(
    blockId: string,
    taintMap: Map<string, TaintInfo[]>,
    functionCFG: FunctionCFG,
    conditionalBlockId: string,
    visited: Set<string> = new Set(),
    context: string | null = null
  ): boolean {
    const block = functionCFG.blocks.get(blockId);
    if (!block) return false;
    
    // Cycle detection
    if (visited.has(blockId)) {
      return false;
    }
    visited.add(blockId);
    
    let changed = false;
    
    // Flow-sensitive analysis: process statements in order for MAXIMUM level
    const statements = this.shouldEnableFlowSensitive() 
      ? this.getOrderedStatements(block, functionCFG)
      : block.statements;
    
    // Mark all variables defined in this block as control-dependent tainted
    statements.forEach((stmt, stmtIndex) => {
      // Flow-sensitive: check if previous statements affect taint
      if (this.shouldEnableFlowSensitive()) {
        const previousTaint = this.getTaintFromPreviousStatements(stmt, statements.slice(0, stmtIndex), taintMap);
        if (previousTaint.length > 0) {
          console.log(`[TaintAnalyzer] [FlowSensitive] Statement ${stmtIndex} affected by ${previousTaint.length} previous tainted variables`);
        }
      }
      
      stmt.variables?.defined.forEach(varName => {
        // Field-sensitive analysis: track struct fields separately
        if (this.shouldEnableFieldSensitive() && this.isStructFieldAccess(varName)) {
          this.propagateFieldSensitiveTaint(varName, taintMap, functionCFG, conditionalBlockId, blockId, context);
          changed = true;
          return;
        }
        
        const taintInfos = taintMap.get(varName) || [];
        
        // Context-sensitive: check if variable already has taint in this context
        if (context && this.shouldEnableContextSensitive()) {
          const contextTaint = taintInfos.find(t => 
            t.tainted && (t as any).context === context
          );
          if (contextTaint && contextTaint.labels?.includes(TaintLabel.CONTROL_DEPENDENT)) {
            return; // Already tainted in this context
          }
        }
        
        // Check if already has CONTROL_DEPENDENT label
        const hasControlDependent = taintInfos.some(t => 
          t.labels?.includes(TaintLabel.CONTROL_DEPENDENT)
        );
        
        if (!hasControlDependent) {
          // Create or update taint info with CONTROL_DEPENDENT label
          let existingTaint = taintInfos.find(t => t.variable === varName && t.tainted);
          
          if (existingTaint) {
            // Merge labels
            if (!existingTaint.labels) {
              existingTaint.labels = [];
            }
            if (!existingTaint.labels.includes(TaintLabel.CONTROL_DEPENDENT)) {
              existingTaint.labels.push(TaintLabel.CONTROL_DEPENDENT);
              console.log(`[TaintAnalyzer] [ControlDependentTaint] Added CONTROL_DEPENDENT label to variable '${varName}' in block ${blockId}`);
              changed = true;
            }
          } else {
            // Create new taint info
            const blockLabel = this.getBlockLabel(functionCFG, blockId);
            const conditionalLabel = this.getBlockLabel(functionCFG, conditionalBlockId);
            const pathEntry = conditionalLabel && blockLabel
              ? `${functionCFG.name}:${conditionalLabel}`
              : `${functionCFG.name}:B${conditionalBlockId}`;
            const blockPathEntry = blockLabel
              ? `${functionCFG.name}:${blockLabel}`
              : `${functionCFG.name}:B${blockId}`;
            
            const newTaintInfo: TaintInfo = {
              variable: varName,
              source: `Control-dependent taint from block ${conditionalBlockId}${context ? ` (context: ${context})` : ''}`,
              tainted: true,
              propagationPath: [pathEntry, blockPathEntry],
              labels: [TaintLabel.CONTROL_DEPENDENT]
            };
            
            // Add context for context-sensitive analysis
            if (context && this.shouldEnableContextSensitive()) {
              (newTaintInfo as any).context = context;
              console.log(`[TaintAnalyzer] [ContextSensitive] Added context ${context} to taint for ${varName}`);
            }
            
            taintInfos.push(newTaintInfo);
            taintMap.set(varName, taintInfos);
            console.log(`[TaintAnalyzer] [ControlDependentTaint] Marked variable '${varName}' in block ${blockId} as control-dependent tainted`);
            changed = true;
          }
        }
      });
    });
    
    // Recursive propagation (if enabled)
    if (this.shouldEnableRecursivePropagation()) {
      // Find nested conditionals in this block
      const nestedConditionals = this.findNestedConditionals(block, functionCFG);
      
      nestedConditionals.forEach(nestedBlockId => {
        if (this.propagateTaintToControlDependentBlock(
          nestedBlockId,
          taintMap,
          functionCFG,
          conditionalBlockId,  // Keep original conditional
          visited,
          context  // Pass context for context-sensitive analysis
        )) {
          changed = true;
        }
      });
    }
    
    return changed;
  }

  /**
   * Check if a variable name represents a struct field access (e.g., "struct.field" or "ptr->field")
   */
  private isStructFieldAccess(varName: string): boolean {
    // Check for struct field access patterns: var.field or var->field
    return varName.includes('.') || varName.includes('->');
  }

  /**
   * Propagate field-sensitive taint for struct fields
   * Tracks taint at the field level (e.g., struct.foo vs struct.bar)
   */
  private propagateFieldSensitiveTaint(
    varName: string,
    taintMap: Map<string, TaintInfo[]>,
    functionCFG: FunctionCFG,
    conditionalBlockId: string,
    blockId: string,
    context: string | null = null
  ): void {
    console.log(`[TaintAnalyzer] [FieldSensitive] Propagating field-sensitive taint for ${varName}`);
    
    // Extract struct name and field name
    const fieldMatch = varName.match(/([a-zA-Z_][a-zA-Z0-9_]*)[\.->]([a-zA-Z_][a-zA-Z0-9_]*)/);
    if (!fieldMatch) {
      // Not a struct field access, treat as regular variable
      return;
    }
    
    const structName = fieldMatch[1];
    const fieldName = fieldMatch[2];
    
    // Check if the struct itself is tainted
    const structTaintInfos = taintMap.get(structName) || [];
    const structIsTainted = structTaintInfos.some(t => t.tainted);
    
    if (structIsTainted) {
      // Create field-specific taint entry
      const fieldTaintKey = `${structName}.${fieldName}`;
      const fieldTaintInfos = taintMap.get(fieldTaintKey) || [];
      
      const hasControlDependent = fieldTaintInfos.some(t => 
        t.labels?.includes(TaintLabel.CONTROL_DEPENDENT)
      );
      
      if (!hasControlDependent) {
        const blockLabel = this.getBlockLabel(functionCFG, blockId);
        const conditionalLabel = this.getBlockLabel(functionCFG, conditionalBlockId);
        const pathEntry = conditionalLabel && blockLabel
          ? `${functionCFG.name}:${conditionalLabel}`
          : `${functionCFG.name}:B${conditionalBlockId}`;
        const blockPathEntry = blockLabel
          ? `${functionCFG.name}:${blockLabel}`
          : `${functionCFG.name}:B${blockId}`;
        
        const newTaintInfo: TaintInfo = {
          variable: fieldTaintKey,
          source: `Control-dependent taint from block ${conditionalBlockId} (field-sensitive)${context ? ` (context: ${context})` : ''}`,
          tainted: true,
          propagationPath: [pathEntry, blockPathEntry],
          labels: [TaintLabel.CONTROL_DEPENDENT]
        };
        
        // Add context for context-sensitive analysis
        if (context && this.shouldEnableContextSensitive()) {
          (newTaintInfo as any).context = context;
        }
        
        fieldTaintInfos.push(newTaintInfo);
        taintMap.set(fieldTaintKey, fieldTaintInfos);
        console.log(`[TaintAnalyzer] [FieldSensitive] Marked field ${fieldTaintKey} as control-dependent tainted`);
      }
    }
  }

  /**
   * Get call-site context for context-sensitive analysis (k-limited, k=1)
   * Returns context string representing the immediate caller
   */
  private getCallContext(functionCFG: FunctionCFG, blockId: string): string {
    // k-limited context (k=1): track immediate caller only
    // For intra-procedural analysis, use function name as context
    // In inter-procedural analysis, this would track the call site
    const context = `${functionCFG.name}:${blockId}`;
    console.log(`[TaintAnalyzer] [ContextSensitive] Created context: ${context}`);
    return context;
  }

  /**
   * Get statements in execution order for flow-sensitive analysis
   * Ensures statements are processed in the order they would execute
   */
  private getOrderedStatements(block: BasicBlock, functionCFG: FunctionCFG): Statement[] {
    // Statements are already in order within a block
    // For flow-sensitive analysis, we ensure they're processed sequentially
    return block.statements;
  }

  /**
   * Get taint from previous statements for flow-sensitive analysis
   * Checks if variables used in current statement are tainted by previous statements
   */
  private getTaintFromPreviousStatements(
    currentStmt: Statement,
    previousStatements: Statement[],
    taintMap: Map<string, TaintInfo[]>
  ): string[] {
    const taintedVars: string[] = [];
    
    // Check variables used in current statement
    const usedVars = currentStmt.variables?.used || [];
    
    // Check if any used variable was tainted by previous statements
    usedVars.forEach(varName => {
      const taintInfos = taintMap.get(varName) || [];
      if (taintInfos.some(t => t.tainted)) {
        taintedVars.push(varName);
      }
    });
    
    return taintedVars;
  }

  /**
   * Find nested conditional blocks within a block
   */
  private findNestedConditionals(block: BasicBlock, functionCFG: FunctionCFG): string[] {
    const nested: string[] = [];
    
    // Check successors for conditional blocks
    block.successors.forEach(succId => {
      const succBlock = functionCFG.blocks.get(succId);
      if (succBlock && this.isConditionalBlock(succBlock)) {
        nested.push(succId);
      }
    });
    
    return nested;
  }

  /**
   * Get the source registry (for configuration)
   */
  getSourceRegistry(): TaintSourceRegistry {
    return this.sourceRegistry;
  }
}

