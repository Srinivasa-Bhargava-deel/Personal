/**
 * DataflowAnalyzer.ts
 * 
 * Main Analyzer Orchestrator for the Dataflow Analysis Pipeline
 * 
 * PURPOSE:
 * This class coordinates all dataflow analysis components and orchestrates the complete
 * analysis workflow from C++ source files to analysis results. It is the central hub
 * that manages the entire analysis pipeline.
 * 
 * SIGNIFICANCE IN OVERALL FLOW:
 * This is the core orchestrator of the analysis system. It coordinates parsing, all
 * intra-procedural analyses (liveness, reaching definitions, taint), inter-procedural
 * analyses (call graphs, IPA), and state management. All analysis workflows flow
 * through this component.
 * 
 * DATA FLOW:
 * INPUTS:
 *   - C++ source files (from file system via extension.ts)
 *   - Analysis configuration (from extension.ts)
 *   - Workspace path (from extension.ts)
 * 
 * PROCESSING:
 *   1. Receives file paths -> calls EnhancedCPPParser.parseFile()
 *   2. Gets CFG structures -> passes to individual analyzers:
 *      - LivenessAnalyzer.analyze() -> liveness results
 *      - ReachingDefinitionsAnalyzer.analyze() -> reaching definitions results
 *      - TaintAnalyzer.analyze() -> taint analysis results
 *      - SecurityAnalyzer.analyzeVulnerabilities() -> vulnerability results
 *   3. Builds call graph -> CallGraphAnalyzer.buildCallGraph()
 *   4. Runs inter-procedural analyses:
 *      - InterProceduralReachingDefinitions.analyze()
 *      - InterProceduralTaintAnalyzer.analyze()
 *      - ContextSensitiveTaintAnalyzer.analyze()
 *   5. Prepares visualization data -> CFGVisualizer.prepareAllVisualizationData()
 *   6. Saves state -> StateManager.saveState()
 * 
 * OUTPUTS:
 *   - AnalysisState object containing:
 *     - CFG structures -> CFGVisualizer.ts (for visualization)
 *     - Liveness results -> CFGVisualizer.ts
 *     - Reaching definitions results -> CFGVisualizer.ts
 *     - Taint analysis results -> CFGVisualizer.ts
 *     - Vulnerability results -> CFGVisualizer.ts
 *     - Call graph -> CFGVisualizer.ts
 *     - Inter-procedural analysis results -> CFGVisualizer.ts
 *     - Visualization data -> CFGVisualizer.ts
 *   - Saved state -> StateManager.ts (persisted to .vscode/dataflow-state.json)
 * 
 * DEPENDENCIES:
 *   - EnhancedCPPParser.ts: Parses C++ files to CFG
 *   - LivenessAnalyzer.ts: Backward dataflow analysis
 *   - ReachingDefinitionsAnalyzer.ts: Forward dataflow analysis
 *   - TaintAnalyzer.ts: Taint propagation analysis
 *   - SecurityAnalyzer.ts: Vulnerability detection
 *   - CallGraphAnalyzer.ts: Call graph construction
 *   - InterProceduralReachingDefinitions.ts: IPA reaching definitions
 *   - InterProceduralTaintAnalyzer.ts: IPA taint propagation
 *   - ContextSensitiveTaintAnalyzer.ts: Context-sensitive taint analysis
 *   - ParameterAnalyzer.ts: Parameter mapping
 *   - ReturnValueAnalyzer.ts: Return value tracking
 *   - StateManager.ts: State persistence
 *   - CFGVisualizer.ts: Visualization data preparation
 * 
 * ALGORITHM:
 * The analyzer follows the academic dataflow analysis theory from
 * "Engineering a Compiler" (Cooper & Torczon) and the "Dragon Book" (Aho, Sethi, Ullman).
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { EnhancedCPPParser } from './EnhancedCPPParser';
import { LivenessAnalyzer } from './LivenessAnalyzer';
import { ReachingDefinitionsAnalyzer } from './ReachingDefinitionsAnalyzer';
import { TaintAnalyzer } from './TaintAnalyzer';
import { SecurityAnalyzer } from './SecurityAnalyzer';
import { CallGraphAnalyzer } from './CallGraphAnalyzer';
import { InterProceduralReachingDefinitions } from './InterProceduralReachingDefinitions';
import { InterProceduralTaintAnalyzer } from './InterProceduralTaintAnalyzer';
import { ParameterAnalyzer } from './ParameterAnalyzer';
import { ReturnValueAnalyzer } from './ReturnValueAnalyzer';
import { FunctionCallExtractor } from './FunctionCallExtractor';
import { StateManager } from '../state/StateManager';
import { LoggingConfig } from '../utils/LoggingConfig';
import { CFGVisualizer } from '../visualizer/CFGVisualizer';
import {
  CFG,
  FunctionCFG,
  AnalysisState,
  FileAnalysisState,
  AnalysisConfig,
  ReachingDefinitionsInfo,
  TaintLabel,
  StatementType
} from '../types';

/**
 * DataflowAnalyzer orchestrates all static analysis components.
 * 
 * Responsibilities:
 * 1. Parse C++ source files into Control Flow Graphs (CFGs)
 * 2. Execute dataflow analyses on CFGs
 * 3. Aggregate analysis results
 * 4. Manage and persist analysis state
 * 5. Report security vulnerabilities
 */
export class DataflowAnalyzer {
  // Parser for converting C++ source into CFG structure
  private parser: EnhancedCPPParser;
  
  // Liveness analysis: determines which variables are "live" at each program point
  private livenessAnalyzer: LivenessAnalyzer;
  
  // Reaching definitions analysis: tracks where variable definitions propagate
  private reachingDefinitionsAnalyzer: ReachingDefinitionsAnalyzer;
  
  // Taint analysis: tracks flow of potentially malicious/unsafe data
  private taintAnalyzer: TaintAnalyzer;
  
  // Security analysis: detects vulnerable code patterns
  private securityAnalyzer: SecurityAnalyzer;
  
  // State persistence layer: saves/loads analysis results
  private stateManager: StateManager;
  
  // User-provided configuration for analysis behavior
  private config: AnalysisConfig;
  
  // Current analysis results cached in memory
  private currentState: AnalysisState | null = null;

  // CRITICAL FIX (LOGIC.md #4): Mutex to prevent race conditions in concurrent file updates
  // Serializes updateFile calls to prevent state corruption
  private updateMutex: Promise<void> = Promise.resolve();

  /**
   * Initialize the analyzer with workspace context and configuration.
   * 
   * @param workspacePath - Absolute path to the workspace root
   * @param config - Analysis configuration options (enable/disable specific analyses)
   */
  constructor(workspacePath: string, config: AnalysisConfig) {
    // Initialize all analysis components
    this.parser = new EnhancedCPPParser();
    this.livenessAnalyzer = new LivenessAnalyzer();
    this.reachingDefinitionsAnalyzer = new ReachingDefinitionsAnalyzer();
    this.taintAnalyzer = new TaintAnalyzer();
    this.securityAnalyzer = new SecurityAnalyzer();
    this.stateManager = new StateManager(workspacePath);
    this.config = config;
    
    // Load existing state from disk, or create empty state if none exists
    this.currentState = this.stateManager.loadState();
    if (!this.currentState) {
      this.currentState = this.createEmptyState(workspacePath);
    }
  }

  /**
   * Analyze entire workspace for dataflow vulnerabilities.
   * 
   * This method orchestrates the full analysis pipeline:
   * 1. Find all C++ source files in the workspace
   * 2. Parse each file and extract Control Flow Graphs (CFGs)
   * 3. Run dataflow analyses (liveness, reaching definitions, taint)
   * 4. Detect security vulnerabilities
   * 5. Aggregate results and persist state
   * 
   * @returns Promise<AnalysisState> - Complete analysis results for the workspace
   */
  async analyzeWorkspace(): Promise<AnalysisState> {
    const workspacePath = this.currentState!.workspacePath;
    
    // Optimization: If there's an active C/C++ editor, analyze only that file
    // This avoids pulling in library headers which clutter the analysis
    try {
      const active = vscode.window.activeTextEditor;
      if (active && (active.document.languageId === 'cpp' || active.document.languageId === 'c')) {
        return await this.analyzeSpecificFiles([active.document.uri.fsPath]);
      }
    } catch {
      // Fall through to workspace analysis if single-file analysis fails
    }
    
    // Initialize global CFG structure for all functions across all files
    const cfg: CFG = {
      entry: 'global_entry',      // Global entry point
      exit: 'global_exit',        // Global exit point
      blocks: new Map(),          // All basic blocks in workspace
      functions: new Map()        // All function CFGs: funcName -> FunctionCFG
    };

    // Track analysis state for each file in workspace
    const fileStates = new Map<string, FileAnalysisState>();

    // STEP 1: Find all C++ files in workspace
    const cppFiles = await this.findCppFiles(workspacePath);
    
    // STEP 2: Parse each file and extract CFGs
    for (const filePath of cppFiles) {
      try {
        const fileState = await this.analyzeFile(filePath, cfg);
        fileStates.set(filePath, fileState);
      } catch (error) {
        console.error(`Error analyzing ${filePath}:`, error);
      }
    }

    // STEP 3: Initialize analysis result maps
    // Each analysis computes results for each block in each function
    const liveness = new Map();                    // Block liveness: IN/OUT sets
    const reachingDefinitions = new Map();         // Definition propagation: IN/OUT sets
    const taintAnalysis = new Map();               // Taint propagation results
    const vulnerabilities = new Map();             // Detected security vulnerabilities

    cfg.functions.forEach((funcCFG, funcName) => {
      if (this.config.enableLiveness) {
        console.log(`Running liveness analysis for ${funcName} with ${funcCFG.blocks.size} blocks`);
        const funcLiveness = this.livenessAnalyzer.analyze(funcCFG);
        console.log(`Liveness analysis for ${funcName} produced ${funcLiveness.size} entries`);
        funcLiveness.forEach((info, blockId) => {
          const key = `${funcName}_${blockId}`;
          liveness.set(key, info);
          console.log(`Set liveness for key: ${key}, in: ${Array.from(info.in).join(', ')}, out: ${Array.from(info.out).join(', ')}`);
        });
      }

      if (this.config.enableReachingDefinitions) {
        console.log(`Running reaching definitions analysis for ${funcName} with ${funcCFG.blocks.size} blocks`);
        const funcRD = this.reachingDefinitionsAnalyzer.analyze(funcCFG);
        console.log(`Reaching definitions analysis for ${funcName} produced ${funcRD.size} entries`);
        funcRD.forEach((info, blockId) => {
          const key = `${funcName}_${blockId}`;
          reachingDefinitions.set(key, info);
          
          // Log the IN/OUT sets for each block WITH FULL HISTORY/PROPAGATION PATHS
          const inVars = Array.from(info.in.entries())
            .map(([v, defs]) => {
              const defDetails = defs.map(d => {
                const path = d.propagationPath ? d.propagationPath.join('→') : 'unknown';
                const killed = d.killed ? '❌' : '✓';
                return `${d.definitionId}[${path}]${killed}`;
              }).join(',');
              return `${v}:[${defDetails}]`;
            })
            .join('; ');
          const outVars = Array.from(info.out.entries())
            .map(([v, defs]) => {
              const defDetails = defs.map(d => {
                const path = d.propagationPath ? d.propagationPath.join('→') : 'unknown';
                const killed = d.killed ? '❌' : '✓';
                return `${d.definitionId}[${path}]${killed}`;
              }).join(',');
              return `${v}:[${defDetails}]`;
            })
            .join('; ');
          
          console.log(`Set RD for key: ${key}`);
          console.log(`  - IN: ${inVars || '(empty)'}`);
          console.log(`  - OUT: ${outVars || '(empty)'}`);
        });
      }

      if (this.config.enableTaintAnalysis) {
        // CRITICAL FIX (Issue #3): Use correct key format matching the storage format
        const entryBlockId = funcCFG.entry || 'entry';
        const funcRD = reachingDefinitions.get(`${funcName}_${entryBlockId}`) || 
                      new Map<string, ReachingDefinitionsInfo>();
        const taintResult = this.taintAnalyzer.analyze(funcCFG, funcRD);
        taintAnalysis.set(funcName, Array.from(taintResult.taintMap.values()).flat());
        
        // Add taint vulnerabilities to vulnerabilities map
        if (taintResult.vulnerabilities.length > 0) {
          const existingVulns = vulnerabilities.get(funcName) || [];
          vulnerabilities.set(funcName, [...existingVulns, ...taintResult.vulnerabilities]);
        }
        
        // Run security analysis
        const funcVulns = this.securityAnalyzer.analyzeVulnerabilities(
          funcCFG,
          taintResult.taintMap,
          Array.from(fileStates.keys())[0] || ''
        );
        if (funcVulns.length > 0) {
          const existingVulns = vulnerabilities.get(funcName) || [];
          vulnerabilities.set(funcName, [...existingVulns, ...funcVulns]);
        }
      }
    });

    // STEP 4: Run Inter-Procedural Analysis (IPA) - Phases 1-4
    let callGraph: any = undefined;
    let interProceduralRD: Map<string, Map<string, any>> | undefined = undefined;
    const parameterAnalysis = new Map<string, any[]>();
    const returnValueAnalysis = new Map<string, any[]>();

    if (this.config.enableInterProcedural !== false && cfg.functions.size > 0) {
      try {
        console.log('[IPA] Starting inter-procedural analysis...');
        
        // Phase 1 & 2: Build call graph
        const cgAnalyzer = new CallGraphAnalyzer(cfg.functions);
        callGraph = cgAnalyzer.buildCallGraph();
        console.log(`[IPA] Call graph built: ${callGraph.functions.size} functions, ${callGraph.calls.length} calls`);

        // PHASE 1.3: Detailed call graph logging for blue edge debugging
        console.log('[IPA] ========== PHASE 1.3: Detailed Call Graph Analysis ==========');
        console.log('[IPA] Call graph object keys:', Object.keys(callGraph));
        console.log('[IPA] callsFrom map exists:', !!callGraph.callsFrom);
        console.log('[IPA] callsFrom map type:', callGraph.callsFrom ? typeof callGraph.callsFrom : 'N/A');
        console.log('[IPA] callsFrom map size:', callGraph.callsFrom ? (callGraph.callsFrom instanceof Map ? callGraph.callsFrom.size : Object.keys(callGraph.callsFrom).length) : 'N/A');
        console.log('[IPA] callsFrom map keys:', callGraph.callsFrom ? (callGraph.callsFrom instanceof Map ? Array.from(callGraph.callsFrom.keys()) : Object.keys(callGraph.callsFrom)) : 'N/A');
        console.log('[IPA] callsTo map exists:', !!callGraph.callsTo);
        console.log('[IPA] callsTo map size:', callGraph.callsTo ? (callGraph.callsTo instanceof Map ? callGraph.callsTo.size : Object.keys(callGraph.callsTo).length) : 'N/A');
        console.log('[IPA] functions map exists:', !!callGraph.functions);
        console.log('[IPA] functions map size:', callGraph.functions ? (callGraph.functions instanceof Map ? callGraph.functions.size : Object.keys(callGraph.functions).length) : 'N/A');
        console.log('[IPA] calls array exists:', !!callGraph.calls);
        console.log('[IPA] calls array length:', callGraph.calls ? callGraph.calls.length : 'N/A');

        if (callGraph.callsFrom) {
          console.log('[IPA] callsFrom entries:');
          const callsFromIter = callGraph.callsFrom instanceof Map ? callGraph.callsFrom : Object.entries(callGraph.callsFrom);
          if (callGraph.callsFrom instanceof Map) {
            callGraph.callsFrom.forEach((calls: any[], caller: string) => {
              console.log(`[IPA]   ${caller} calls: ${calls.length} functions`);
              calls.forEach((call: any, idx: number) => {
                console.log(`[IPA]     Call ${idx}: ${caller} -> ${call.calleeId} at block ${call.callSite?.blockId || 'unknown'}`);
              });
            });
          } else {
            Object.entries(callGraph.callsFrom).forEach(([caller, calls]: [string, any]) => {
              console.log(`[IPA]   ${caller} calls: ${Array.isArray(calls) ? calls.length : 'N/A'} functions`);
              if (Array.isArray(calls)) {
                calls.forEach((call: any, idx: number) => {
                  console.log(`[IPA]     Call ${idx}: ${caller} -> ${call.calleeId} at block ${call.callSite?.blockId || 'unknown'}`);
                });
              }
            });
          }
        }

        console.log('[IPA] Sample call objects:');
        if (callGraph.calls && Array.isArray(callGraph.calls) && callGraph.calls.length > 0) {
          callGraph.calls.slice(0, 3).forEach((call: any, idx: number) => {
            console.log(`[IPA] Call ${idx}:`, JSON.stringify(call, null, 2));
          });
        }
        console.log('[IPA] ========== END PHASE 1.3 ==========');

        // Phase 3: Inter-procedural reaching definitions
        if (this.config.enableReachingDefinitions && reachingDefinitions.size > 0) {
          // Organize intra-procedural RD by function
          const intraRD = new Map<string, Map<string, any>>();
          reachingDefinitions.forEach((rdInfo, key) => {
            const [funcName, blockId] = key.split('_');
            if (!intraRD.has(funcName)) {
              intraRD.set(funcName, new Map());
            }
            intraRD.get(funcName)!.set(blockId, rdInfo);
          });

          const ipaAnalyzer = new InterProceduralReachingDefinitions(callGraph, intraRD);
          interProceduralRD = ipaAnalyzer.analyze();
          console.log(`[IPA] Inter-procedural reaching definitions complete`);
        }

        // Phase 4: Parameter and return value analysis
        const paramAnalyzer = new ParameterAnalyzer();
        const returnAnalyzer = new ReturnValueAnalyzer();

        cfg.functions.forEach((funcCFG, funcName) => {
          // Analyze return values
          const returns = returnAnalyzer.analyzeReturns(funcCFG);
          if (returns.length > 0) {
            returnValueAnalysis.set(funcName, returns);
          }

          // Analyze parameters at call sites
          const calls = callGraph.callsFrom.get(funcName) || [];
          const paramMappings: any[] = [];
          
          calls.forEach((call: any) => {
            const calleeMetadata = callGraph.functions.get(call.calleeId);
            if (calleeMetadata) {
              const mappings = paramAnalyzer.mapParametersWithDerivation(call, calleeMetadata);
              paramMappings.push(...mappings);
            }
          });

          if (paramMappings.length > 0) {
            parameterAnalysis.set(funcName, paramMappings);
          }
        });

        LoggingConfig.log('ParameterAnalysis', `[IPA] Parameter analysis: ${parameterAnalysis.size} functions`);
        LoggingConfig.log('ReturnValueAnalysis', `[IPA] Return value analysis: ${returnValueAnalysis.size} functions`);
        
        // Phase 5: Inter-Procedural Taint Propagation (Task 13)
        // Run even if taintAnalysis.size is 0, as inter-procedural analysis might create taint
        LoggingConfig.log('InterProceduralTaint', '[IPA] Checking conditions for inter-procedural taint analysis...');
        LoggingConfig.log('InterProceduralTaint', `[IPA] enableTaintAnalysis: ${this.config.enableTaintAnalysis}`);
        LoggingConfig.log('InterProceduralTaint', `[IPA] callGraph exists: ${!!callGraph}`);
        LoggingConfig.log('InterProceduralTaint', `[IPA] taintAnalysis.size: ${taintAnalysis.size}`);
        
        if (this.config.enableTaintAnalysis && callGraph) {
          try {
            LoggingConfig.log('InterProceduralTaint', '[IPA] Starting inter-procedural taint analysis...');
            LoggingConfig.log('InterProceduralTaint', `[IPA] Taint analysis size: ${taintAnalysis.size}`);
            
            // Organize intra-procedural taint by function and block
            const intraProceduralTaint = new Map<string, Map<string, any[]>>();
            
            // Initialize with empty maps for all functions (even if no taint yet)
            cfg.functions.forEach((funcCFG, funcName) => {
              intraProceduralTaint.set(funcName, new Map());
            });
            
            // Add existing taint data
            taintAnalysis.forEach((taintInfos, funcName) => {
              const funcTaint = intraProceduralTaint.get(funcName) || new Map<string, any[]>();
              
              // Group taint info by block ID
              taintInfos.forEach((taintInfo: any) => {
                const blockId = taintInfo.sourceLocation?.blockId || 'unknown';
                if (!funcTaint.has(blockId)) {
                  funcTaint.set(blockId, []);
                }
                funcTaint.get(blockId)!.push(taintInfo);
              });
              
              intraProceduralTaint.set(funcName, funcTaint);
            });
            
            LoggingConfig.log('InterProceduralTaint', `[IPA] Organized intra-procedural taint for ${intraProceduralTaint.size} functions`);
            
            // Run inter-procedural taint analysis
            const ipTaintAnalyzer = new InterProceduralTaintAnalyzer(
              callGraph,
              cfg.functions,
              intraProceduralTaint
            );
            
            const interProceduralTaintResult = ipTaintAnalyzer.analyze();
            
            // Merge inter-procedural taint results back into taintAnalysis
            const functionsWithNewTaint = new Set<string>();
            interProceduralTaintResult.forEach((blockTaint, funcName) => {
              const allTaint = Array.from(blockTaint.values()).flat();
              if (allTaint.length > 0) {
                // Merge with existing taint (avoid duplicates)
                const existingTaint = taintAnalysis.get(funcName) || [];
                const existingSources = new Set(existingTaint.map((t: any) => `${t.variable}:${t.source}`));
                
                const newTaint = allTaint.filter((t: any) => 
                  !existingSources.has(`${t.variable}:${t.source}`)
                );
                
                if (newTaint.length > 0) {
                  taintAnalysis.set(funcName, [...existingTaint, ...newTaint]);
                  functionsWithNewTaint.add(funcName);
                  LoggingConfig.log('InterProceduralTaint', `[IPA] Added ${newTaint.length} inter-procedural taint entries for ${funcName}`);
                }
              }
            });
            
            // CRITICAL FIX: Re-run taint propagation for functions that received new parameter taint
            // This ensures taint propagates from parameters (e.g., n) to derived variables (e.g., result1 = n - 1)
            if (functionsWithNewTaint.size > 0) {
              LoggingConfig.log('InterProceduralTaint', `[IPA] Re-running taint propagation for ${functionsWithNewTaint.size} functions with new parameter taint`);
              
              functionsWithNewTaint.forEach((funcName) => {
                const funcCFG = cfg.functions.get(funcName);
                if (!funcCFG) return;
                
                const currentTaint = taintAnalysis.get(funcName) || [];
                const parameterTaint = currentTaint.filter((t: any) => t.source?.startsWith('parameter:'));
                const returnValueTaint = currentTaint.filter((t: any) => 
                  t.source?.startsWith('return_value:') || t.variable?.startsWith('return_')
                );
                
                if (parameterTaint.length > 0) {
                  LoggingConfig.log('InterProceduralTaint', `[IPA] Re-propagating taint from ${parameterTaint.length} parameter(s) in ${funcName}`);
                  
                  // For each parameter taint, propagate to variables that use it
                  parameterTaint.forEach((paramTaint: any) => {
                    const paramVar = paramTaint.variable;
                    
                    // Find all statements that use this parameter
                    funcCFG.blocks.forEach((block, blockId) => {
                      block.statements.forEach(stmt => {
                        if (stmt.variables?.used.includes(paramVar)) {
                          // If used in assignment, propagate taint to defined variables
                          if (stmt.variables.defined.length > 0) {
                            stmt.variables.defined.forEach(targetVar => {
                              const existingTaint = currentTaint.find(
                                (t: any) => t.source === paramTaint.source && t.variable === targetVar
                              );
                              
                              if (!existingTaint) {
                                const derivedTaint = {
                                  ...paramTaint,
                                  variable: targetVar,
                                  propagationPath: [...(paramTaint.propagationPath || []), `${funcName}:B${blockId}`],
                                  sourceLocation: {
                                    blockId,
                                    statementId: stmt.id || 'unknown'
                                  },
                                  labels: [TaintLabel.DERIVED]
                                };
                                
                                currentTaint.push(derivedTaint);
                                LoggingConfig.log('InterProceduralTaint', `[IPA] Propagated taint from ${paramVar} to ${targetVar} in ${funcName}`);
                              }
                            });
                          }
                        }
                      });
                    });
                  });
                  
                  // Also propagate taint from return values to variables that receive them
                  // This handles cases like: result4 = helper_function(n - 1) or int result4 = helper_function(n - 1)
                  // Note: returnValueTaint is already defined above
                  if (returnValueTaint.length > 0) {
                    LoggingConfig.log('InterProceduralTaint', `[IPA] Re-propagating taint from ${returnValueTaint.length} return value(s) in ${funcName}`);
                    
                    returnValueTaint.forEach((returnTaint: any) => {
                      const returnVar = returnTaint.variable; // e.g., "return_helper_function"
                      const calleeName = returnVar.replace('return_', ''); // e.g., "helper_function"
                      
                      // Find statements that use this return value (function calls that assign to variables)
                      funcCFG.blocks.forEach((block, blockId) => {
                        block.statements.forEach(stmt => {
                          const stmtText = stmt.text || stmt.content || '';
                          // Check if this statement calls the function whose return value is tainted
                          if (stmtText.includes(`${calleeName}(`)) {
                            // Check if statement defines variables (could be DECLARATION or ASSIGNMENT)
                            if (stmt.variables && stmt.variables.defined && stmt.variables.defined.length > 0) {
                              // Propagate taint to all defined variables in this statement
                              stmt.variables.defined.forEach(targetVar => {
                                const existingTaint = currentTaint.find(
                                  (t: any) => t.source === returnTaint.source && t.variable === targetVar
                                );
                                
                                if (!existingTaint) {
                                  const derivedTaint = {
                                    ...returnTaint,
                                    variable: targetVar,
                                    propagationPath: [...(returnTaint.propagationPath || []), `${funcName}:B${blockId}`],
                                    sourceLocation: {
                                      blockId,
                                      statementId: stmt.id || 'unknown'
                                    },
                                    labels: [TaintLabel.DERIVED]
                                  };
                                  
                                  currentTaint.push(derivedTaint);
                                  LoggingConfig.log('InterProceduralTaint', `[IPA] Propagated taint from ${returnVar} to ${targetVar} in ${funcName}`);
                                }
                              });
                            }
                          }
                        });
                      });
                    });
                  }
                  
                  // CRITICAL FIX: Also propagate taint from variables assigned from return values to other variables
                  // This handles cases like: result = user_input + 5 - 2 (where user_input was assigned from return value)
                  // Find all variables that were assigned from return values (e.g., user_input from return_get_user_number)
                  const assignedFromReturnVars = currentTaint.filter((t: any) => 
                    t.source?.includes('->') && t.source?.startsWith('return_value:')
                  ).map((t: any) => t.variable); // e.g., ["user_input", "processed", "fib"]
                  
                  if (assignedFromReturnVars.length > 0) {
                    LoggingConfig.log('InterProceduralTaint', `[IPA] Re-propagating taint from ${assignedFromReturnVars.length} variable(s) assigned from return values in ${funcName}`);
                    
                    assignedFromReturnVars.forEach((sourceVar: string) => {
                      const sourceTaint = currentTaint.find((t: any) => 
                        t.variable === sourceVar && t.source?.startsWith('return_value:')
                      );
                      
                      if (sourceTaint) {
                        // Find all statements that use this variable
                        funcCFG.blocks.forEach((block, blockId) => {
                          block.statements.forEach(stmt => {
                            if (stmt.variables && stmt.variables.used && stmt.variables.used.includes(sourceVar)) {
                              // If used in assignment, propagate taint to defined variables
                              if (stmt.variables.defined && stmt.variables.defined.length > 0) {
                                stmt.variables.defined.forEach(targetVar => {
                                  // CRITICAL FIX: Check if targetVar already has a source (don't overwrite)
                                  // e.g., processed already has return_value:process_number->processed, don't overwrite with return_value:get_user_number->user_input
                                  const existingTaint = currentTaint.find(
                                    (t: any) => t.variable === targetVar
                                  );
                                  
                                  if (!existingTaint) {
                                    // Only create new taint if targetVar doesn't already have one
                                    const derivedTaint = {
                                      ...sourceTaint,
                                      variable: targetVar,
                                      propagationPath: [...(sourceTaint.propagationPath || []), `${funcName}:B${blockId}`],
                                      sourceLocation: {
                                        blockId,
                                        statementId: stmt.id || 'unknown'
                                      },
                                      labels: [TaintLabel.DERIVED]
                                    };
                                    
                                    currentTaint.push(derivedTaint);
                                    LoggingConfig.log('InterProceduralTaint', `[IPA] Propagated taint from ${sourceVar} to ${targetVar} in ${funcName}`);
                                  } else {
                                    LoggingConfig.log('InterProceduralTaint', `[IPA] Skipping propagation to ${targetVar} - already has source: ${existingTaint.source}`);
                                  }
                                });
                              }
                            }
                          });
                        });
                      }
                    });
                  }
                  
                  // Update taintAnalysis with propagated taint (from parameters)
                  taintAnalysis.set(funcName, currentTaint);
                  LoggingConfig.log('InterProceduralTaint', `[IPA] Updated ${funcName} with ${currentTaint.length} total taint entries (from parameters)`);
                }
                
                // CRITICAL FIX: Also run re-propagation for functions that ONLY received return value taint (no parameters)
                // This ensures functions like `main` that receive return values can propagate to derived variables
                if (parameterTaint.length === 0 && returnValueTaint.length > 0) {
                  const currentTaint = taintAnalysis.get(funcName) || [];
                  LoggingConfig.log('InterProceduralTaint', `[IPA] Re-propagating taint from ${returnValueTaint.length} return value(s) in ${funcName} (no parameters)`);
                  
                  returnValueTaint.forEach((returnTaint: any) => {
                    const returnVar = returnTaint.variable; // e.g., "return_helper_function" or "user_input"
                    const calleeName = returnVar.replace('return_', ''); // e.g., "helper_function" or "user_input" (if not return_)
                    
                    // Find statements that use this return value (function calls that assign to variables)
                    funcCFG.blocks.forEach((block, blockId) => {
                      block.statements.forEach(stmt => {
                        const stmtText = stmt.text || stmt.content || '';
                        // Check if this statement calls the function whose return value is tainted
                        if (stmtText.includes(`${calleeName}(`)) {
                          // Check if statement defines variables (could be DECLARATION or ASSIGNMENT)
                          if (stmt.variables && stmt.variables.defined && stmt.variables.defined.length > 0) {
                            // Propagate taint to all defined variables in this statement
                            stmt.variables.defined.forEach(targetVar => {
                              const existingTaint = currentTaint.find(
                                (t: any) => t.source === returnTaint.source && t.variable === targetVar
                              );
                              
                              if (!existingTaint) {
                                const derivedTaint = {
                                  ...returnTaint,
                                  variable: targetVar,
                                  propagationPath: [...(returnTaint.propagationPath || []), `${funcName}:B${blockId}`],
                                  sourceLocation: {
                                    blockId,
                                    statementId: stmt.id || 'unknown'
                                  },
                                  labels: [TaintLabel.DERIVED]
                                };
                                
                                currentTaint.push(derivedTaint);
                                LoggingConfig.log('InterProceduralTaint', `[IPA] Propagated taint from ${returnVar} to ${targetVar} in ${funcName}`);
                              }
                            });
                          }
                        }
                      });
                    });
                  });
                  
                  // Also propagate from variables assigned from return values
                  const assignedFromReturnVars = currentTaint.filter((t: any) => 
                    t.source?.includes('->') && t.source?.startsWith('return_value:')
                  ).map((t: any) => t.variable); // e.g., ["user_input", "processed", "fib"]
                  
                  if (assignedFromReturnVars.length > 0) {
                    LoggingConfig.log('InterProceduralTaint', `[IPA] Re-propagating taint from ${assignedFromReturnVars.length} variable(s) assigned from return values in ${funcName}`);
                    
                    assignedFromReturnVars.forEach((sourceVar: string) => {
                      const sourceTaint = currentTaint.find((t: any) => 
                        t.variable === sourceVar && t.source?.startsWith('return_value:')
                      );
                      
                      if (sourceTaint) {
                        // Find all statements that use this variable
                        funcCFG.blocks.forEach((block, blockId) => {
                          block.statements.forEach(stmt => {
                            if (stmt.variables && stmt.variables.used && stmt.variables.used.includes(sourceVar)) {
                              // If used in assignment, propagate taint to defined variables
                              if (stmt.variables.defined && stmt.variables.defined.length > 0) {
                                stmt.variables.defined.forEach(targetVar => {
                                  // CRITICAL FIX: Check if targetVar already has a source (don't overwrite)
                                  // e.g., processed already has return_value:process_number->processed, don't overwrite with return_value:get_user_number->user_input
                                  const existingTaint = currentTaint.find(
                                    (t: any) => t.variable === targetVar
                                  );
                                  
                                  if (!existingTaint) {
                                    // Only create new taint if targetVar doesn't already have one
                                    const derivedTaint = {
                                      ...sourceTaint,
                                      variable: targetVar,
                                      propagationPath: [...(sourceTaint.propagationPath || []), `${funcName}:B${blockId}`],
                                      sourceLocation: {
                                        blockId,
                                        statementId: stmt.id || 'unknown'
                                      },
                                      labels: [TaintLabel.DERIVED]
                                    };
                                    
                                    currentTaint.push(derivedTaint);
                                    LoggingConfig.log('InterProceduralTaint', `[IPA] Propagated taint from ${sourceVar} to ${targetVar} in ${funcName}`);
                                  } else {
                                    LoggingConfig.log('InterProceduralTaint', `[IPA] Skipping propagation to ${targetVar} - already has source: ${existingTaint.source}`);
                                  }
                                });
                              }
                            }
                          });
                        });
                      }
                    });
                  }
                  
                  // Update taintAnalysis with propagated taint (from return values only)
                  taintAnalysis.set(funcName, currentTaint);
                  LoggingConfig.log('InterProceduralTaint', `[IPA] Updated ${funcName} with ${currentTaint.length} total taint entries (from return values)`);
                }
              });
            }
            
            LoggingConfig.log('InterProceduralTaint', '[IPA] Inter-procedural taint analysis complete');
            LoggingConfig.log('InterProceduralTaint', `[IPA] Final taint analysis size after inter-procedural: ${taintAnalysis.size}`);
            
            // Phase 6: Context-Sensitive Taint Analysis (Task 14)
            if (this.config.enableTaintAnalysis && callGraph) {
              try {
                LoggingConfig.log('ContextSensitiveTaint', '[IPA] Starting context-sensitive taint analysis...');
                
                // Organize intra-procedural taint by function and block for context-sensitive analysis
                const intraProceduralTaintForContext = new Map<string, Map<string, any[]>>();
                
                // Initialize with empty maps for all functions
                cfg.functions.forEach((funcCFG, funcName) => {
                  intraProceduralTaintForContext.set(funcName, new Map());
                });
                
                // Add existing taint data
                taintAnalysis.forEach((taintInfos, funcName) => {
                  const funcTaint = intraProceduralTaintForContext.get(funcName) || new Map<string, any[]>();
                  
                  taintInfos.forEach((taintInfo: any) => {
                    const blockId = taintInfo.sourceLocation?.blockId || 'unknown';
                    if (!funcTaint.has(blockId)) {
                      funcTaint.set(blockId, []);
                    }
                    funcTaint.get(blockId)!.push(taintInfo);
                  });
                  
                  intraProceduralTaintForContext.set(funcName, funcTaint);
                });
                
                // Run context-sensitive taint analysis
                const { ContextSensitiveTaintAnalyzer } = await import('./ContextSensitiveTaintAnalyzer');
                const contextSensitiveAnalyzer = new ContextSensitiveTaintAnalyzer(
                  callGraph,
                  cfg.functions,
                  intraProceduralTaintForContext,
                  2 // k=2 context size
                );
                
                const contextSensitiveTaintResult = await contextSensitiveAnalyzer.analyze();
                
                // Merge context-sensitive taint results back into taintAnalysis
                contextSensitiveTaintResult.forEach((blockTaint, funcName) => {
                  const allTaint = Array.from(blockTaint.values()).flat();
                  if (allTaint.length > 0) {
                    const existingTaint = taintAnalysis.get(funcName) || [];
                    const existingSources = new Set(existingTaint.map((t: any) => 
                      `${t.variable}:${t.source}:${t.sourceFunction || ''}`
                    ));
                    
                    const newTaint = allTaint.filter((t: any) => 
                      !existingSources.has(`${t.variable}:${t.source}:${t.sourceFunction || ''}`)
                    );
                    
                    if (newTaint.length > 0) {
                      taintAnalysis.set(funcName, [...existingTaint, ...newTaint]);
                      LoggingConfig.log('ContextSensitiveTaint', `[IPA] Added ${newTaint.length} context-sensitive taint entries for ${funcName}`);
                    }
                  }
                });
                
                LoggingConfig.log('ContextSensitiveTaint', '[IPA] Context-sensitive taint analysis complete');
                LoggingConfig.log('ContextSensitiveTaint', `[IPA] Final taint analysis size after context-sensitive: ${taintAnalysis.size}`);
              } catch (error) {
                LoggingConfig.error('ContextSensitiveTaint', 'Error during context-sensitive taint analysis:', error);
                LoggingConfig.error('ContextSensitiveTaint', 'Error stack:', error instanceof Error ? error.stack : 'No stack trace');
                // Continue without context-sensitive taint if it fails
              }
            }
          } catch (error) {
            LoggingConfig.error('InterProceduralTaint', 'Error during inter-procedural taint analysis:', error);
            LoggingConfig.error('InterProceduralTaint', 'Error stack:', error instanceof Error ? error.stack : 'No stack trace');
            // Continue without inter-procedural taint if it fails
          }
        } else {
          LoggingConfig.log('InterProceduralTaint', '[IPA] Inter-procedural taint analysis skipped:', {
            enableTaintAnalysis: this.config.enableTaintAnalysis,
            hasCallGraph: !!callGraph,
            taintAnalysisSize: taintAnalysis.size,
            reason: !this.config.enableTaintAnalysis ? 'enableTaintAnalysis is false' : !callGraph ? 'callGraph is missing' : 'unknown'
          });
        }
      } catch (error) {
        console.error('[IPA] Error during inter-procedural analysis:', error);
        // Continue without IPA if it fails
      }
    }

    // Update state
    this.currentState = {
      workspacePath,
      timestamp: Date.now(),
      cfg,
      liveness,
      reachingDefinitions,
      taintAnalysis,
      vulnerabilities,
      fileStates,
      // IPA features
      callGraph,
      interProceduralRD,
      parameterAnalysis: parameterAnalysis.size > 0 ? parameterAnalysis : undefined,
      returnValueAnalysis: returnValueAnalysis.size > 0 ? returnValueAnalysis : undefined
    };

    // Prepare all visualization data in backend (before saving state)
    console.log('[DataflowAnalyzer] Preparing all visualization data in backend...');
    try {
      const visualizationData = await CFGVisualizer.prepareAllVisualizationData(this.currentState);
      this.currentState.visualizationData = visualizationData;
      console.log('[DataflowAnalyzer] Visualization data prepared successfully');
    } catch (error) {
      console.error('[DataflowAnalyzer] Error preparing visualization data:', error);
      // Continue without visualization data if preparation fails
    }

    // Save state
    this.stateManager.saveState(this.currentState);

    return this.currentState;
  }

  /**
   * Analyze specific files instead of entire workspace
   * 
   * Useful for analyzing a subset of files or a single file. Follows the same
   * analysis pipeline as analyzeWorkspace() but only processes the specified files.
   * 
   * @param filePaths - Array of absolute file paths to analyze
   * @returns Promise<AnalysisState> - Analysis results for the specified files
   */
  async analyzeSpecificFiles(filePaths: string[]): Promise<AnalysisState> {
    const workspacePath = this.currentState!.workspacePath;
    const cfg: CFG = {
      entry: 'global_entry',
      exit: 'global_exit',
      blocks: new Map(),
      functions: new Map()
    };

    const fileStates = new Map<string, FileAnalysisState>();

    for (const filePath of filePaths) {
      // Only allow source files
      const ext = path.extname(filePath).toLowerCase();
      const sourceExtensions = ['.cpp', '.cxx', '.cc', '.c'];
      if (!sourceExtensions.includes(ext)) {
        console.log(`Skipping non-source file: ${filePath}`);
        continue;
      }
      try {
        const fileState = await this.analyzeFile(filePath, cfg);
        fileStates.set(filePath, fileState);
      } catch (error) {
        console.error(`Error analyzing ${filePath}:`, error);
      }
    }

    // Perform analyses
    const liveness = new Map();
    const reachingDefinitions = new Map();
    const taintAnalysis = new Map();
    const vulnerabilities = new Map();

    cfg.functions.forEach((funcCFG, funcName) => {
      if (this.config.enableLiveness) {
        console.log(`Running liveness analysis for ${funcName} with ${funcCFG.blocks.size} blocks`);
        const funcLiveness = this.livenessAnalyzer.analyze(funcCFG);
        console.log(`Liveness analysis for ${funcName} produced ${funcLiveness.size} entries`);
        funcLiveness.forEach((info, blockId) => {
          const key = `${funcName}_${blockId}`;
          liveness.set(key, info);
          console.log(`Set liveness for key: ${key}, in: ${Array.from(info.in).join(', ')}, out: ${Array.from(info.out).join(', ')}`);
        });
      }

      if (this.config.enableReachingDefinitions) {
        const funcRD = this.reachingDefinitionsAnalyzer.analyze(funcCFG);
        funcRD.forEach((info, blockId) => {
          reachingDefinitions.set(`${funcName}_${blockId}`, info);
        });
      }

      if (this.config.enableTaintAnalysis) {
        // CRITICAL FIX (LOGIC.md #2): Collect ALL reaching definitions for function, not just entry block
        // Taint analysis needs RD info for ALL blocks to track data flow correctly
        const funcRD = new Map<string, ReachingDefinitionsInfo>();
        funcCFG.blocks.forEach((block, blockId) => {
          const rdKey = `${funcName}_${blockId}`;
          const rdInfo = reachingDefinitions.get(rdKey);
          if (rdInfo) {
            funcRD.set(blockId, rdInfo);
          }
        });
        
        LoggingConfig.log('TaintAnalysis', `[DataflowAnalyzer] Taint analysis for ${funcName}: collected RD info for ${funcRD.size} blocks`);
        const taintResult = this.taintAnalyzer.analyze(funcCFG, funcRD);
        taintAnalysis.set(funcName, Array.from(taintResult.taintMap.values()).flat());
        
        // Add taint vulnerabilities to vulnerabilities map
        if (taintResult.vulnerabilities.length > 0) {
          const existingVulns = vulnerabilities.get(funcName) || [];
          vulnerabilities.set(funcName, [...existingVulns, ...taintResult.vulnerabilities]);
        }
      }
    });

    // STEP 4: Run Inter-Procedural Analysis (IPA) - Phases 1-4
    let callGraph: any = undefined;
    let interProceduralRD: Map<string, Map<string, any>> | undefined = undefined;
    const parameterAnalysis = new Map<string, any[]>();
    const returnValueAnalysis = new Map<string, any[]>();

    if (this.config.enableInterProcedural !== false && cfg.functions.size > 0) {
      try {
        console.log('[IPA] Starting inter-procedural analysis...');
        
        // Phase 1 & 2: Build call graph
        const cgAnalyzer = new CallGraphAnalyzer(cfg.functions);
        callGraph = cgAnalyzer.buildCallGraph();
        console.log(`[IPA] Call graph built: ${callGraph.functions.size} functions, ${callGraph.calls.length} calls`);

        // PHASE 1.3: Detailed call graph logging for blue edge debugging
        console.log('[IPA] ========== PHASE 1.3: Detailed Call Graph Analysis ==========');
        console.log('[IPA] Call graph object keys:', Object.keys(callGraph));
        console.log('[IPA] callsFrom map exists:', !!callGraph.callsFrom);
        console.log('[IPA] callsFrom map type:', callGraph.callsFrom ? typeof callGraph.callsFrom : 'N/A');
        console.log('[IPA] callsFrom map size:', callGraph.callsFrom ? (callGraph.callsFrom instanceof Map ? callGraph.callsFrom.size : Object.keys(callGraph.callsFrom).length) : 'N/A');
        console.log('[IPA] callsFrom map keys:', callGraph.callsFrom ? (callGraph.callsFrom instanceof Map ? Array.from(callGraph.callsFrom.keys()) : Object.keys(callGraph.callsFrom)) : 'N/A');
        console.log('[IPA] callsTo map exists:', !!callGraph.callsTo);
        console.log('[IPA] callsTo map size:', callGraph.callsTo ? (callGraph.callsTo instanceof Map ? callGraph.callsTo.size : Object.keys(callGraph.callsTo).length) : 'N/A');
        console.log('[IPA] functions map exists:', !!callGraph.functions);
        console.log('[IPA] functions map size:', callGraph.functions ? (callGraph.functions instanceof Map ? callGraph.functions.size : Object.keys(callGraph.functions).length) : 'N/A');
        console.log('[IPA] calls array exists:', !!callGraph.calls);
        console.log('[IPA] calls array length:', callGraph.calls ? callGraph.calls.length : 'N/A');

        if (callGraph.callsFrom) {
          console.log('[IPA] callsFrom entries:');
          const callsFromIter = callGraph.callsFrom instanceof Map ? callGraph.callsFrom : Object.entries(callGraph.callsFrom);
          if (callGraph.callsFrom instanceof Map) {
            callGraph.callsFrom.forEach((calls: any[], caller: string) => {
              console.log(`[IPA]   ${caller} calls: ${calls.length} functions`);
              calls.forEach((call: any, idx: number) => {
                console.log(`[IPA]     Call ${idx}: ${caller} -> ${call.calleeId} at block ${call.callSite?.blockId || 'unknown'}`);
              });
            });
          } else {
            Object.entries(callGraph.callsFrom).forEach(([caller, calls]: [string, any]) => {
              console.log(`[IPA]   ${caller} calls: ${Array.isArray(calls) ? calls.length : 'N/A'} functions`);
              if (Array.isArray(calls)) {
                calls.forEach((call: any, idx: number) => {
                  console.log(`[IPA]     Call ${idx}: ${caller} -> ${call.calleeId} at block ${call.callSite?.blockId || 'unknown'}`);
                });
              }
            });
          }
        }

        console.log('[IPA] Sample call objects:');
        if (callGraph.calls && Array.isArray(callGraph.calls) && callGraph.calls.length > 0) {
          callGraph.calls.slice(0, 3).forEach((call: any, idx: number) => {
            console.log(`[IPA] Call ${idx}:`, JSON.stringify(call, null, 2));
          });
        }
        console.log('[IPA] ========== END PHASE 1.3 ==========');

        // Phase 3: Inter-procedural reaching definitions
        if (this.config.enableReachingDefinitions && reachingDefinitions.size > 0) {
          // Organize intra-procedural RD by function
          const intraRD = new Map<string, Map<string, any>>();
          reachingDefinitions.forEach((rdInfo, key) => {
            const [funcName, blockId] = key.split('_');
            if (!intraRD.has(funcName)) {
              intraRD.set(funcName, new Map());
            }
            intraRD.get(funcName)!.set(blockId, rdInfo);
          });

          const ipaAnalyzer = new InterProceduralReachingDefinitions(callGraph, intraRD);
          interProceduralRD = ipaAnalyzer.analyze();
          console.log(`[IPA] Inter-procedural reaching definitions complete`);
        }

        // Phase 4: Parameter and return value analysis
        const paramAnalyzer = new ParameterAnalyzer();
        const returnAnalyzer = new ReturnValueAnalyzer();

        cfg.functions.forEach((funcCFG, funcName) => {
          // Analyze return values
          const returns = returnAnalyzer.analyzeReturns(funcCFG);
          if (returns.length > 0) {
            returnValueAnalysis.set(funcName, returns);
          }

          // Analyze parameters at call sites
          const calls = callGraph.callsFrom.get(funcName) || [];
          const paramMappings: any[] = [];
          
          calls.forEach((call: any) => {
            const calleeMetadata = callGraph.functions.get(call.calleeId);
            if (calleeMetadata) {
              const mappings = paramAnalyzer.mapParametersWithDerivation(call, calleeMetadata);
              paramMappings.push(...mappings);
            }
          });

          if (paramMappings.length > 0) {
            parameterAnalysis.set(funcName, paramMappings);
          }
        });

        LoggingConfig.log('ParameterAnalysis', `[IPA] Parameter analysis: ${parameterAnalysis.size} functions`);
        LoggingConfig.log('ReturnValueAnalysis', `[IPA] Return value analysis: ${returnValueAnalysis.size} functions`);
        
        // Phase 5: Inter-Procedural Taint Propagation (Task 13)
        // Run even if taintAnalysis.size is 0, as inter-procedural analysis might create taint
        LoggingConfig.log('InterProceduralTaint', '[IPA] Checking conditions for inter-procedural taint analysis...');
        LoggingConfig.log('InterProceduralTaint', `[IPA] enableTaintAnalysis: ${this.config.enableTaintAnalysis}`);
        LoggingConfig.log('InterProceduralTaint', `[IPA] callGraph exists: ${!!callGraph}`);
        LoggingConfig.log('InterProceduralTaint', `[IPA] taintAnalysis.size: ${taintAnalysis.size}`);
        
        if (this.config.enableTaintAnalysis && callGraph) {
          try {
            LoggingConfig.log('InterProceduralTaint', '[IPA] Starting inter-procedural taint analysis...');
            LoggingConfig.log('InterProceduralTaint', `[IPA] Taint analysis size: ${taintAnalysis.size}`);
            
            // Organize intra-procedural taint by function and block
            const intraProceduralTaint = new Map<string, Map<string, any[]>>();
            
            // Initialize with empty maps for all functions (even if no taint yet)
            cfg.functions.forEach((funcCFG, funcName) => {
              intraProceduralTaint.set(funcName, new Map());
            });
            
            // Add existing taint data
            taintAnalysis.forEach((taintInfos, funcName) => {
              const funcTaint = intraProceduralTaint.get(funcName) || new Map<string, any[]>();
              
              // Group taint info by block ID
              taintInfos.forEach((taintInfo: any) => {
                const blockId = taintInfo.sourceLocation?.blockId || 'unknown';
                if (!funcTaint.has(blockId)) {
                  funcTaint.set(blockId, []);
                }
                funcTaint.get(blockId)!.push(taintInfo);
              });
              
              intraProceduralTaint.set(funcName, funcTaint);
            });
            
            LoggingConfig.log('InterProceduralTaint', `[IPA] Organized intra-procedural taint for ${intraProceduralTaint.size} functions`);
            
            // Run inter-procedural taint analysis
            const ipTaintAnalyzer = new InterProceduralTaintAnalyzer(
              callGraph,
              cfg.functions,
              intraProceduralTaint
            );
            
            const interProceduralTaintResult = ipTaintAnalyzer.analyze();
            
            // Merge inter-procedural taint results back into taintAnalysis
            const functionsWithNewTaint = new Set<string>();
            interProceduralTaintResult.forEach((blockTaint, funcName) => {
              const allTaint = Array.from(blockTaint.values()).flat();
              if (allTaint.length > 0) {
                // Merge with existing taint (avoid duplicates)
                const existingTaint = taintAnalysis.get(funcName) || [];
                const existingSources = new Set(existingTaint.map((t: any) => `${t.variable}:${t.source}`));
                
                const newTaint = allTaint.filter((t: any) => 
                  !existingSources.has(`${t.variable}:${t.source}`)
                );
                
                if (newTaint.length > 0) {
                  taintAnalysis.set(funcName, [...existingTaint, ...newTaint]);
                  functionsWithNewTaint.add(funcName);
                  LoggingConfig.log('InterProceduralTaint', `[IPA] Added ${newTaint.length} inter-procedural taint entries for ${funcName}`);
                }
              }
            });
            
            // CRITICAL FIX: Re-run taint propagation for functions that received new parameter taint
            // This ensures taint propagates from parameters (e.g., n) to derived variables (e.g., result1 = n - 1)
            if (functionsWithNewTaint.size > 0) {
              LoggingConfig.log('InterProceduralTaint', `[IPA] Re-running taint propagation for ${functionsWithNewTaint.size} functions with new parameter taint`);
              
              functionsWithNewTaint.forEach((funcName) => {
                const funcCFG = cfg.functions.get(funcName);
                if (!funcCFG) return;
                
                const currentTaint = taintAnalysis.get(funcName) || [];
                const parameterTaint = currentTaint.filter((t: any) => t.source?.startsWith('parameter:'));
                const returnValueTaint = currentTaint.filter((t: any) => 
                  t.source?.startsWith('return_value:') || t.variable?.startsWith('return_')
                );
                
                if (parameterTaint.length > 0) {
                  LoggingConfig.log('InterProceduralTaint', `[IPA] Re-propagating taint from ${parameterTaint.length} parameter(s) in ${funcName}`);
                  
                  // For each parameter taint, propagate to variables that use it
                  parameterTaint.forEach((paramTaint: any) => {
                    const paramVar = paramTaint.variable;
                    
                    // Find all statements that use this parameter
                    funcCFG.blocks.forEach((block, blockId) => {
                      block.statements.forEach(stmt => {
                        if (stmt.variables?.used.includes(paramVar)) {
                          // If used in assignment, propagate taint to defined variables
                          if (stmt.variables.defined.length > 0) {
                            stmt.variables.defined.forEach(targetVar => {
                              const existingTaint = currentTaint.find(
                                (t: any) => t.source === paramTaint.source && t.variable === targetVar
                              );
                              
                              if (!existingTaint) {
                                const derivedTaint = {
                                  ...paramTaint,
                                  variable: targetVar,
                                  propagationPath: [...(paramTaint.propagationPath || []), `${funcName}:B${blockId}`],
                                  sourceLocation: {
                                    blockId,
                                    statementId: stmt.id || 'unknown'
                                  },
                                  labels: [TaintLabel.DERIVED]
                                };
                                
                                currentTaint.push(derivedTaint);
                                LoggingConfig.log('InterProceduralTaint', `[IPA] Propagated taint from ${paramVar} to ${targetVar} in ${funcName}`);
                              }
                            });
                          }
                        }
                      });
                    });
                  });
                  
                  // Also propagate taint from return values to variables that receive them
                  // This handles cases like: result4 = helper_function(n - 1) or int result4 = helper_function(n - 1)
                  // Note: returnValueTaint is already defined above
                  if (returnValueTaint.length > 0) {
                    LoggingConfig.log('InterProceduralTaint', `[IPA] Re-propagating taint from ${returnValueTaint.length} return value(s) in ${funcName}`);
                    
                    returnValueTaint.forEach((returnTaint: any) => {
                      const returnVar = returnTaint.variable; // e.g., "return_helper_function"
                      const calleeName = returnVar.replace('return_', ''); // e.g., "helper_function"
                      
                      // Find statements that use this return value (function calls that assign to variables)
                      funcCFG.blocks.forEach((block, blockId) => {
                        block.statements.forEach(stmt => {
                          const stmtText = stmt.text || stmt.content || '';
                          // Check if this statement calls the function whose return value is tainted
                          if (stmtText.includes(`${calleeName}(`)) {
                            // Check if statement defines variables (could be DECLARATION or ASSIGNMENT)
                            if (stmt.variables && stmt.variables.defined && stmt.variables.defined.length > 0) {
                              // Propagate taint to all defined variables in this statement
                              stmt.variables.defined.forEach(targetVar => {
                                const existingTaint = currentTaint.find(
                                  (t: any) => t.source === returnTaint.source && t.variable === targetVar
                                );
                                
                                if (!existingTaint) {
                                  const derivedTaint = {
                                    ...returnTaint,
                                    variable: targetVar,
                                    propagationPath: [...(returnTaint.propagationPath || []), `${funcName}:B${blockId}`],
                                    sourceLocation: {
                                      blockId,
                                      statementId: stmt.id || 'unknown'
                                    },
                                    labels: [TaintLabel.DERIVED]
                                  };
                                  
                                  currentTaint.push(derivedTaint);
                                  LoggingConfig.log('InterProceduralTaint', `[IPA] Propagated taint from ${returnVar} to ${targetVar} in ${funcName}`);
                                }
                              });
                            }
                          }
                        });
                      });
                    });
                  }
                  
                  // CRITICAL FIX: Also propagate taint from variables assigned from return values to other variables
                  // This handles cases like: result = user_input + 5 - 2 (where user_input was assigned from return value)
                  // Find all variables that were assigned from return values (e.g., user_input from return_get_user_number)
                  const assignedFromReturnVars = currentTaint.filter((t: any) => 
                    t.source?.includes('->') && t.source?.startsWith('return_value:')
                  ).map((t: any) => t.variable); // e.g., ["user_input", "processed", "fib"]
                  
                  if (assignedFromReturnVars.length > 0) {
                    LoggingConfig.log('InterProceduralTaint', `[IPA] Re-propagating taint from ${assignedFromReturnVars.length} variable(s) assigned from return values in ${funcName}`);
                    
                    assignedFromReturnVars.forEach((sourceVar: string) => {
                      const sourceTaint = currentTaint.find((t: any) => 
                        t.variable === sourceVar && t.source?.startsWith('return_value:')
                      );
                      
                      if (sourceTaint) {
                        // Find all statements that use this variable
                        funcCFG.blocks.forEach((block, blockId) => {
                          block.statements.forEach(stmt => {
                            if (stmt.variables && stmt.variables.used && stmt.variables.used.includes(sourceVar)) {
                              // If used in assignment, propagate taint to defined variables
                              if (stmt.variables.defined && stmt.variables.defined.length > 0) {
                                stmt.variables.defined.forEach(targetVar => {
                                  // CRITICAL FIX: Check if targetVar already has a source (don't overwrite)
                                  // e.g., processed already has return_value:process_number->processed, don't overwrite with return_value:get_user_number->user_input
                                  const existingTaint = currentTaint.find(
                                    (t: any) => t.variable === targetVar
                                  );
                                  
                                  if (!existingTaint) {
                                    // Only create new taint if targetVar doesn't already have one
                                    const derivedTaint = {
                                      ...sourceTaint,
                                      variable: targetVar,
                                      propagationPath: [...(sourceTaint.propagationPath || []), `${funcName}:B${blockId}`],
                                      sourceLocation: {
                                        blockId,
                                        statementId: stmt.id || 'unknown'
                                      },
                                      labels: [TaintLabel.DERIVED]
                                    };
                                    
                                    currentTaint.push(derivedTaint);
                                    LoggingConfig.log('InterProceduralTaint', `[IPA] Propagated taint from ${sourceVar} to ${targetVar} in ${funcName}`);
                                  } else {
                                    LoggingConfig.log('InterProceduralTaint', `[IPA] Skipping propagation to ${targetVar} - already has source: ${existingTaint.source}`);
                                  }
                                });
                              }
                            }
                          });
                        });
                      }
                    });
                  }
                  
                  // Update taintAnalysis with propagated taint (from parameters)
                  taintAnalysis.set(funcName, currentTaint);
                  LoggingConfig.log('InterProceduralTaint', `[IPA] Updated ${funcName} with ${currentTaint.length} total taint entries (from parameters)`);
                }
                
                // CRITICAL FIX: Also run re-propagation for functions that ONLY received return value taint (no parameters)
                // This ensures functions like `main` that receive return values can propagate to derived variables
                if (parameterTaint.length === 0 && returnValueTaint.length > 0) {
                  const currentTaint = taintAnalysis.get(funcName) || [];
                  LoggingConfig.log('InterProceduralTaint', `[IPA] Re-propagating taint from ${returnValueTaint.length} return value(s) in ${funcName} (no parameters)`);
                  
                  returnValueTaint.forEach((returnTaint: any) => {
                    const returnVar = returnTaint.variable; // e.g., "return_helper_function" or "user_input"
                    const calleeName = returnVar.replace('return_', ''); // e.g., "helper_function" or "user_input" (if not return_)
                    
                    // Find statements that use this return value (function calls that assign to variables)
                    funcCFG.blocks.forEach((block, blockId) => {
                      block.statements.forEach(stmt => {
                        const stmtText = stmt.text || stmt.content || '';
                        // Check if this statement calls the function whose return value is tainted
                        if (stmtText.includes(`${calleeName}(`)) {
                          // Check if statement defines variables (could be DECLARATION or ASSIGNMENT)
                          if (stmt.variables && stmt.variables.defined && stmt.variables.defined.length > 0) {
                            // Propagate taint to all defined variables in this statement
                            stmt.variables.defined.forEach(targetVar => {
                              const existingTaint = currentTaint.find(
                                (t: any) => t.source === returnTaint.source && t.variable === targetVar
                              );
                              
                              if (!existingTaint) {
                                const derivedTaint = {
                                  ...returnTaint,
                                  variable: targetVar,
                                  propagationPath: [...(returnTaint.propagationPath || []), `${funcName}:B${blockId}`],
                                  sourceLocation: {
                                    blockId,
                                    statementId: stmt.id || 'unknown'
                                  },
                                  labels: [TaintLabel.DERIVED]
                                };
                                
                                currentTaint.push(derivedTaint);
                                LoggingConfig.log('InterProceduralTaint', `[IPA] Propagated taint from ${returnVar} to ${targetVar} in ${funcName}`);
                              }
                            });
                          }
                        }
                      });
                    });
                  });
                  
                  // Also propagate from variables assigned from return values
                  const assignedFromReturnVars = currentTaint.filter((t: any) => 
                    t.source?.includes('->') && t.source?.startsWith('return_value:')
                  ).map((t: any) => t.variable); // e.g., ["user_input", "processed", "fib"]
                  
                  if (assignedFromReturnVars.length > 0) {
                    LoggingConfig.log('InterProceduralTaint', `[IPA] Re-propagating taint from ${assignedFromReturnVars.length} variable(s) assigned from return values in ${funcName}`);
                    
                    assignedFromReturnVars.forEach((sourceVar: string) => {
                      const sourceTaint = currentTaint.find((t: any) => 
                        t.variable === sourceVar && t.source?.startsWith('return_value:')
                      );
                      
                      if (sourceTaint) {
                        // Find all statements that use this variable
                        funcCFG.blocks.forEach((block, blockId) => {
                          block.statements.forEach(stmt => {
                            if (stmt.variables && stmt.variables.used && stmt.variables.used.includes(sourceVar)) {
                              // If used in assignment, propagate taint to defined variables
                              if (stmt.variables.defined && stmt.variables.defined.length > 0) {
                                stmt.variables.defined.forEach(targetVar => {
                                  // CRITICAL FIX: Check if targetVar already has a source (don't overwrite)
                                  // e.g., processed already has return_value:process_number->processed, don't overwrite with return_value:get_user_number->user_input
                                  const existingTaint = currentTaint.find(
                                    (t: any) => t.variable === targetVar
                                  );
                                  
                                  if (!existingTaint) {
                                    // Only create new taint if targetVar doesn't already have one
                                    const derivedTaint = {
                                      ...sourceTaint,
                                      variable: targetVar,
                                      propagationPath: [...(sourceTaint.propagationPath || []), `${funcName}:B${blockId}`],
                                      sourceLocation: {
                                        blockId,
                                        statementId: stmt.id || 'unknown'
                                      },
                                      labels: [TaintLabel.DERIVED]
                                    };
                                    
                                    currentTaint.push(derivedTaint);
                                    LoggingConfig.log('InterProceduralTaint', `[IPA] Propagated taint from ${sourceVar} to ${targetVar} in ${funcName}`);
                                  } else {
                                    LoggingConfig.log('InterProceduralTaint', `[IPA] Skipping propagation to ${targetVar} - already has source: ${existingTaint.source}`);
                                  }
                                });
                              }
                            }
                          });
                        });
                      }
                    });
                  }
                  
                  // Update taintAnalysis with propagated taint (from return values only)
                  taintAnalysis.set(funcName, currentTaint);
                  LoggingConfig.log('InterProceduralTaint', `[IPA] Updated ${funcName} with ${currentTaint.length} total taint entries (from return values)`);
                }
              });
            }
            
            LoggingConfig.log('InterProceduralTaint', '[IPA] Inter-procedural taint analysis complete');
            LoggingConfig.log('InterProceduralTaint', `[IPA] Final taint analysis size after inter-procedural: ${taintAnalysis.size}`);
            
            // Phase 6: Context-Sensitive Taint Analysis (Task 14)
            if (this.config.enableTaintAnalysis && callGraph) {
              try {
                LoggingConfig.log('ContextSensitiveTaint', '[IPA] Starting context-sensitive taint analysis...');
                
                // Organize intra-procedural taint by function and block for context-sensitive analysis
                const intraProceduralTaintForContext = new Map<string, Map<string, any[]>>();
                
                // Initialize with empty maps for all functions
                cfg.functions.forEach((funcCFG, funcName) => {
                  intraProceduralTaintForContext.set(funcName, new Map());
                });
                
                // Add existing taint data
                taintAnalysis.forEach((taintInfos, funcName) => {
                  const funcTaint = intraProceduralTaintForContext.get(funcName) || new Map<string, any[]>();
                  
                  taintInfos.forEach((taintInfo: any) => {
                    const blockId = taintInfo.sourceLocation?.blockId || 'unknown';
                    if (!funcTaint.has(blockId)) {
                      funcTaint.set(blockId, []);
                    }
                    funcTaint.get(blockId)!.push(taintInfo);
                  });
                  
                  intraProceduralTaintForContext.set(funcName, funcTaint);
                });
                
                // Run context-sensitive taint analysis
                const { ContextSensitiveTaintAnalyzer } = await import('./ContextSensitiveTaintAnalyzer');
                const contextSensitiveAnalyzer = new ContextSensitiveTaintAnalyzer(
                  callGraph,
                  cfg.functions,
                  intraProceduralTaintForContext,
                  2 // k=2 context size
                );
                
                const contextSensitiveTaintResult = await contextSensitiveAnalyzer.analyze();
                
                // Merge context-sensitive taint results back into taintAnalysis
                contextSensitiveTaintResult.forEach((blockTaint, funcName) => {
                  const allTaint = Array.from(blockTaint.values()).flat();
                  if (allTaint.length > 0) {
                    const existingTaint = taintAnalysis.get(funcName) || [];
                    const existingSources = new Set(existingTaint.map((t: any) => 
                      `${t.variable}:${t.source}:${t.sourceFunction || ''}`
                    ));
                    
                    const newTaint = allTaint.filter((t: any) => 
                      !existingSources.has(`${t.variable}:${t.source}:${t.sourceFunction || ''}`)
                    );
                    
                    if (newTaint.length > 0) {
                      taintAnalysis.set(funcName, [...existingTaint, ...newTaint]);
                      LoggingConfig.log('ContextSensitiveTaint', `[IPA] Added ${newTaint.length} context-sensitive taint entries for ${funcName}`);
                    }
                  }
                });
                
                LoggingConfig.log('ContextSensitiveTaint', '[IPA] Context-sensitive taint analysis complete');
                LoggingConfig.log('ContextSensitiveTaint', `[IPA] Final taint analysis size after context-sensitive: ${taintAnalysis.size}`);
      } catch (error) {
                LoggingConfig.error('ContextSensitiveTaint', 'Error during context-sensitive taint analysis:', error);
                LoggingConfig.error('ContextSensitiveTaint', 'Error stack:', error instanceof Error ? error.stack : 'No stack trace');
                // Continue without context-sensitive taint if it fails
              }
            }
          } catch (error) {
            LoggingConfig.error('InterProceduralTaint', 'Error during inter-procedural taint analysis:', error);
            LoggingConfig.error('InterProceduralTaint', 'Error stack:', error instanceof Error ? error.stack : 'No stack trace');
            // Continue without inter-procedural taint if it fails
          }
        } else {
          LoggingConfig.log('InterProceduralTaint', '[IPA] Inter-procedural taint analysis skipped:', {
            enableTaintAnalysis: this.config.enableTaintAnalysis,
            hasCallGraph: !!callGraph,
            taintAnalysisSize: taintAnalysis.size,
            reason: !this.config.enableTaintAnalysis ? 'enableTaintAnalysis is false' : !callGraph ? 'callGraph is missing' : 'unknown'
          });
        }
      } catch (error) {
        LoggingConfig.error('DataflowAnalyzer', 'Error during inter-procedural analysis:', error);
        // Continue without IPA if it fails
      }
    }

    this.currentState = {
      workspacePath,
      timestamp: Date.now(),
      cfg,
      liveness,
      reachingDefinitions,
      taintAnalysis,
      vulnerabilities,
      fileStates,
      // IPA features
      callGraph,
      interProceduralRD,
      parameterAnalysis: parameterAnalysis.size > 0 ? parameterAnalysis : undefined,
      returnValueAnalysis: returnValueAnalysis.size > 0 ? returnValueAnalysis : undefined
    };

    // Prepare all visualization data in backend (before saving state)
    console.log('[DataflowAnalyzer] Preparing all visualization data in backend (analyzeSpecificFiles)...');
    try {
      const visualizationData = await CFGVisualizer.prepareAllVisualizationData(this.currentState);
      this.currentState.visualizationData = visualizationData;
      console.log('[DataflowAnalyzer] Visualization data prepared successfully');
    } catch (error) {
      console.error('[DataflowAnalyzer] Error preparing visualization data:', error);
      // Continue without visualization data if preparation fails
    }

    this.stateManager.saveState(this.currentState);
    return this.currentState;
  }

  /**
   * Analyze a single file
   */
  private async analyzeFile(filePath: string, cfg: CFG): Promise<FileAnalysisState> {
    const hash = this.stateManager.computeFileHash(filePath);
    const stats = fs.statSync(filePath);

    console.log(`Analyzing file: ${filePath}`);
    const normalizedSourcePath = path.resolve(filePath);
    const sourceFileBase = path.basename(filePath);
    const sourceFileDir = path.dirname(filePath);
    
    const { functions, globalVars } = await this.parser.parseFile(filePath);
    console.log(`Parser returned ${functions.length} functions from ${filePath}`);

    const functionNames: string[] = [];
    let addedCount = 0;
    let skippedCount = 0;

    for (const funcInfo of functions) {
      // CRITICAL: Verify function is actually from this source file
      // IMPORTANT: Clang location.file behavior:
      // - Builtin types: NO location or NO line
      // - Source file nodes: location has line but NO file
      // - Included file nodes: location has file set
      // - CFG functions: NO location info but parsed directly from source file
      let isFromThisFile = false;

      // Special handling for CFG-based functions (parsed directly from source file)
      if (funcInfo.cfg && (!funcInfo.astNode || !funcInfo.astNode.location)) {
        isFromThisFile = true;
        console.log(`ACCEPTING CFG-based function ${funcInfo.name} (no location verification needed)`);
      } else if (funcInfo.astNode && funcInfo.astNode.location) {
        const funcLoc = funcInfo.astNode.location;
        const funcLocAny = funcLoc as any;
        const funcFile = funcLoc.file;
        
        // Must have a line number to be a real code location
        if (!funcLoc.line) {
          // No line = builtin/synthetic - REJECT
          isFromThisFile = false;
        } else if (funcLocAny.includedFrom && funcLocAny.includedFrom.file) {
          // Has includedFrom = from included header - REJECT
          console.log(`SKIPPING function ${funcInfo.name} - from included file ${funcLocAny.includedFrom.file}`);
          skippedCount++;
          continue;
        } else if (!funcFile) {
          // Has line but NO file and NO includedFrom = from source file - ACCEPT
          isFromThisFile = true;
        } else {
          // Has file - check if it matches
          try {
            const normalizedFuncPath = path.resolve(funcFile);
            if (normalizedFuncPath === normalizedSourcePath) {
              isFromThisFile = true;
            } else {
              // Check by filename and directory
              const funcFileBase = path.basename(funcFile);
              if (funcFileBase === sourceFileBase) {
                const funcFileDir = path.dirname(funcFile);
                if (path.resolve(funcFileDir) === path.resolve(sourceFileDir)) {
                  isFromThisFile = true;
                }
              }
            }
          } catch (e) {
            // Path resolution failed
            isFromThisFile = false;
          }
        }
      }
      // If we cannot verify, skip the function (no astNode or location)
      // This prevents pulling in library/system functions without precise location info
      // No fallback based on startLine to avoid false positives
      
      
      // Reject header files
      if (funcInfo.astNode && funcInfo.astNode.location && funcInfo.astNode.location.file) {
        const funcFile = funcInfo.astNode.location.file;
        const headerExts = ['.h', '.hpp', '.hxx', '.hh', '.H'];
        const fileExt = path.extname(funcFile).toLowerCase();
        if (headerExts.includes(fileExt)) {
          console.log(`SKIPPING function ${funcInfo.name} - from header file ${funcFile}`);
          skippedCount++;
          continue;
        }
        
        // Reject system/library paths
        if (funcFile.includes('/usr/') || 
            funcFile.includes('/System/') ||
            funcFile.includes('/Applications/') ||
            funcFile.includes('/Library/') ||
            funcFile.includes('/opt/') ||
            funcFile.includes('/include/')) {
          console.log(`SKIPPING function ${funcInfo.name} - from system/library ${funcFile}`);
          skippedCount++;
          continue;
        }
      }
      
      if (!isFromThisFile) {
        console.log(`SKIPPING function ${funcInfo.name} - not from source file ${filePath}`);
        skippedCount++;
        continue;
      }
      
      // Function is verified to be from this file - add it
      // Use the CFG that was already built by the parser (from Clang CFG generation)
      if (funcInfo.cfg) {
        // Populate variable information for statements in the CFG
        this.populateStatementVariables(funcInfo.cfg);
        cfg.functions.set(funcInfo.name, funcInfo.cfg);
        functionNames.push(funcInfo.name);
        addedCount++;
        console.log(`✓ Added function to CFG: ${funcInfo.name} (from ${filePath}, ${funcInfo.cfg.blocks.size} blocks)`);
      } else {
        console.warn(`Function ${funcInfo.name} has no CFG - skipping`);
        skippedCount++;
        continue;
      }
    }

    console.log(`File ${filePath}: ${addedCount} functions added, ${skippedCount} skipped, total in CFG: ${cfg.functions.size}`);

    return {
      path: filePath,
      lastModified: stats.mtimeMs,
      hash,
      functions: functionNames
    };
  }

  /**
   * Update analysis for a single file (incremental analysis)
   * 
   * Re-analyzes a specific file and updates the current state. Used by file watchers
   * to keep analysis up-to-date as files are modified. Maintains state for other
   * files that haven't changed.
   * 
   * CRITICAL FIX (LOGIC.md #4): Protected by mutex to prevent race conditions.
   * If multiple files are saved/changed concurrently, updates are serialized
   * to prevent state corruption.
   * 
   * @param filePath - Absolute path to the file to update
   */
  async updateFile(filePath: string): Promise<void> {
    // CRITICAL FIX (LOGIC.md #4): Acquire mutex to serialize concurrent updates
    // Chain the current operation after the previous one completes
    this.updateMutex = this.updateMutex.then(async () => {
      try {
        console.log(`[DataflowAnalyzer] updateFile mutex acquired for: ${filePath}`);
        await this.updateFileInternal(filePath);
        console.log(`[DataflowAnalyzer] updateFile mutex released for: ${filePath}`);
      } catch (error) {
        console.error(`[DataflowAnalyzer] Error in updateFile for ${filePath}:`, error);
        throw error;
      }
    });
    
    // Wait for this operation to complete
    await this.updateMutex;
  }

  /**
   * Internal implementation of updateFile (protected by mutex)
   * 
   * @param filePath - Absolute path to the file to update
   */
  private async updateFileInternal(filePath: string): Promise<void> {
    if (!this.currentState) {
      await this.analyzeWorkspace();
      return;
    }

    const newHash = this.stateManager.computeFileHash(filePath);
    const existingState = this.currentState.fileStates.get(filePath);

    // Check if file actually changed
    if (existingState && existingState.hash === newHash) {
      return;
    }

    // Remove old function CFGs from this file
    if (existingState) {
      existingState.functions.forEach((funcName: string) => {
        this.currentState!.cfg.functions.delete(funcName);
      });
    }

    // Re-analyze file
    const fileState = await this.analyzeFile(filePath, this.currentState.cfg);
    this.currentState.fileStates.set(filePath, fileState);

    // Re-run analyses for affected functions
    const liveness = new Map();
    const reachingDefinitions = new Map();
    const taintAnalysis = new Map();
    const vulnerabilities = new Map<string, any[]>();

    this.currentState.cfg.functions.forEach((funcCFG: FunctionCFG, funcName: string) => {
      if (this.config.enableLiveness) {
        console.log(`Running liveness analysis for ${funcName} with ${funcCFG.blocks.size} blocks`);
        const funcLiveness = this.livenessAnalyzer.analyze(funcCFG);
        console.log(`Liveness analysis for ${funcName} produced ${funcLiveness.size} entries`);
        funcLiveness.forEach((info, blockId) => {
          const key = `${funcName}_${blockId}`;
          liveness.set(key, info);
          console.log(`Set liveness for key: ${key}, in: ${Array.from(info.in).join(', ')}, out: ${Array.from(info.out).join(', ')}`);
        });
      }

      if (this.config.enableReachingDefinitions) {
        const funcRD = this.reachingDefinitionsAnalyzer.analyze(funcCFG);
        funcRD.forEach((info, blockId) => {
          reachingDefinitions.set(`${funcName}_${blockId}`, info);
        });
      }

      if (this.config.enableTaintAnalysis) {
        // CRITICAL FIX (LOGIC.md #2): Collect ALL reaching definitions for function, not just entry block
        // Taint analysis needs RD info for ALL blocks to track data flow correctly
        const funcRD = new Map<string, ReachingDefinitionsInfo>();
        funcCFG.blocks.forEach((block, blockId) => {
          const rdKey = `${funcName}_${blockId}`;
          const rdInfo = reachingDefinitions.get(rdKey);
          if (rdInfo) {
            funcRD.set(blockId, rdInfo);
          }
        });
        
        LoggingConfig.log('TaintAnalysis', `[DataflowAnalyzer] Taint analysis for ${funcName}: collected RD info for ${funcRD.size} blocks`);
        const taintResult = this.taintAnalyzer.analyze(funcCFG, funcRD);
        taintAnalysis.set(funcName, Array.from(taintResult.taintMap.values()).flat());
        
        // Add taint vulnerabilities to vulnerabilities map
        if (taintResult.vulnerabilities.length > 0) {
          const existingVulns = vulnerabilities.get(funcName) || [];
          vulnerabilities.set(funcName, [...existingVulns, ...taintResult.vulnerabilities]);
        }
      }
    });

    this.currentState.liveness = liveness;
    this.currentState.reachingDefinitions = reachingDefinitions;
    this.currentState.taintAnalysis = taintAnalysis;
    this.currentState.vulnerabilities = vulnerabilities;
    this.currentState.timestamp = Date.now();

    this.stateManager.saveState(this.currentState);
  }

  /**
   * Find all C++ source files in workspace (exclude headers and libraries)
   */
  private async findCppFiles(workspacePath: string): Promise<string[]> {
    const files: string[] = [];
    // Only analyze source files, NOT header files
    const sourceExtensions = ['.cpp', '.cxx', '.cc', '.c'];
    // Explicitly exclude header files
    const headerExtensions = ['.h', '.hpp', '.hxx', '.hh'];

    async function walkDir(dir: string): Promise<void> {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        // Skip hidden directories and common build/output directories
        if (entry.name.startsWith('.') || 
            entry.name === 'node_modules' || 
            entry.name === 'build' ||
            entry.name === 'out' ||
            entry.name === 'include' ||
            entry.name === 'lib' ||
            entry.name === 'libs') {
          continue;
        }

        if (entry.isDirectory()) {
          await walkDir(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          // Only include source files, explicitly exclude headers
          if (sourceExtensions.includes(ext) && !headerExtensions.includes(ext)) {
            // Double-check: make sure it's not in a system directory
            if (!fullPath.includes('/usr/') && 
                !fullPath.includes('/System/') &&
                !fullPath.includes('/Applications/') &&
                !fullPath.includes('/Library/') &&
                !fullPath.includes('/opt/')) {
              files.push(fullPath);
            }
          }
        }
      }
    }

    await walkDir(workspacePath);
    console.log(`Found ${files.length} source files to analyze:`, files);
    return files;
  }

  /**
   * Create empty state
   */
  private createEmptyState(workspacePath: string): AnalysisState {
    return {
      workspacePath,
      timestamp: Date.now(),
      cfg: {
        entry: 'global_entry',
        exit: 'global_exit',
        blocks: new Map(),
        functions: new Map()
      },
      liveness: new Map(),
      reachingDefinitions: new Map(),
      taintAnalysis: new Map(),
      vulnerabilities: new Map(),
      fileStates: new Map(),
      // IPA features (optional, will be populated during analysis)
      callGraph: undefined,
      interProceduralRD: undefined,
      parameterAnalysis: undefined,
      returnValueAnalysis: undefined
    };
  }

  /**
   * Get current analysis state
   * 
   * Returns the most recent analysis results. Returns null if no analysis
   * has been performed yet.
   * 
   * @returns Current analysis state or null if not available
   */
  getState(): AnalysisState | null {
    return this.currentState;
  }

  /**
   * Populate variable information for statements in a CFG
   */
  private populateStatementVariables(funcCFG: FunctionCFG): void {
    funcCFG.blocks.forEach((block: any, blockId: string) => {
      block.statements.forEach((stmt: any, stmtIndex: number) => {
        if (!stmt.variables) {
          // Use the same variable analysis logic as CPPParser
          const variables = this.analyzeStatementVariables(stmt.text);
          stmt.variables = variables;
        }
      });
    });
  }

  /**
   * Analyze a single statement to extract defined and used variables.
   * 
   * This method is critical for reaching definitions analysis.
   * It identifies:
   * - Variables DEFINED by this statement (appear on LHS of assignment or in declaration)
   * - Variables USED by this statement (appear on RHS or in expressions)
   * 
   * Academic Definition:
   * - DEF[S]: Set of variables assigned values by statement S
   * - USE[S]: Set of variables whose values are read by statement S
   * 
   * For reaching definitions analysis:
   * - GEN[B] = union of DEF[S] for all statements S in block B
   * - KILL[B] = all definitions of variables that appear in GEN[B]
   * 
   * @param content - Raw statement from CFG output
   * @returns Object with 'defined' and 'used' variable arrays
   */
  private analyzeStatementVariables(content: string): { defined: string[]; used: string[] } {
    const trimmed = content.trim();
    const variables = { defined: [] as string[], used: [] as string[] };

    // Extract the actual statement content from clang CFG format
    // CFG statements have format: "1: statement" or just "statement"
    let cleanContent = trimmed;

    // STEP 1: Remove statement numbers
    // Example: "1: int x = 5;" becomes "int x = 5;"
    cleanContent = cleanContent.replace(/^\d+:\s*/, '');

    // STEP 2: Remove clang-specific CFG artifacts
    // Clang wraps expressions with implicit casts and type conversions
    // We need to extract the actual operation while ignoring type machinery
    if (cleanContent.includes('[B') && cleanContent.includes(']')) {
      // Handle complex expressions like "[B1.6]([B1.7])"
      const bracketMatch = cleanContent.match(/\[B\d+\.\d+\]\s*\(([^)]*)\)/);
      if (bracketMatch) {
        const inner = bracketMatch[1];
        // Check if inner is just type casting (not real operation)
        if (inner.includes('ImplicitCastExpr') || inner.includes('LValueToRValue') || 
            inner.includes('FunctionToPointerDecay') || inner.includes('ArrayToPointerDecay')) {
          // Discard - this is just a cast, no real operation
          cleanContent = '';
        } else {
          // Keep the inner content - it's a real operation
          cleanContent = inner;
        }
      } else {
        // Remove bracket references like [B1.6] but keep the rest
        cleanContent = cleanContent.replace(/\[B\d+\.\d+\]/g, '').trim();
      }
    }

    // STEP 3: Remove string literals and remaining clang artifacts
    cleanContent = cleanContent.replace(/^"([^"]*)"$/, '$1');
    cleanContent = cleanContent.replace(/\(ImplicitCastExpr[^)]*\)/g, '');
    cleanContent = cleanContent.replace(/\(LValueToRValue[^)]*\)/g, '');
    cleanContent = cleanContent.replace(/\(FunctionToPointerDecay[^)]*\)/g, '');
    cleanContent = cleanContent.replace(/\(ArrayToPointerDecay[^)]*\)/g, '');
    
    // STEP 3.5: Handle recovery-expr patterns using FunctionCallExtractor
    // This handles: <recovery-expr>(func, arg1, arg2) -> func(arg1, arg2)
    // CRITICAL FIX: Preserve declaration part (e.g., "int result4 = ") before recovery-expr
    if (cleanContent.includes('<recovery-expr>')) {
      // Check if there's a declaration before the recovery-expr (e.g., "int result4 = <recovery-expr>(...)")
      const declBeforeRecovery = cleanContent.match(/^(.+?)\s*=\s*<recovery-expr>/);
      if (declBeforeRecovery) {
        // Extract the declaration part (e.g., "int result4")
        const declPart = declBeforeRecovery[1].trim();
        // Extract the recovery-expr part
        const tempStmt = { text: cleanContent };
        const calls = FunctionCallExtractor.extractFunctionCalls(tempStmt);
        if (calls.length > 0) {
          // Reconstruct: declaration + function call
          const call = calls[0];
          cleanContent = `${declPart} = ${call.name}(${call.arguments.join(', ')})`;
        } else {
          // Fallback: simple recovery-expr removal but preserve declaration
          cleanContent = cleanContent.replace(/<recovery-expr>\s*\(([^,]+),\s*(.+)\)/g, (match, func, args) => {
            return `${declPart} = ${func}(${args})`;
          });
        }
      } else {
        // No declaration, just replace recovery-expr
        const tempStmt = { text: cleanContent };
        const calls = FunctionCallExtractor.extractFunctionCalls(tempStmt);
        if (calls.length > 0) {
          const call = calls[0];
          cleanContent = `${call.name}(${call.arguments.join(', ')})`;
        } else {
          cleanContent = cleanContent.replace(/<recovery-expr>\s*\(([^,]+),\s*(.+)\)/g, '$1($2)');
        }
      }
    }

    cleanContent = cleanContent.trim();

    console.log(`Analyzing statement: "${trimmed}" -> cleaned: "${cleanContent}"`);

    // STEP 4: Check for DECLARATION statement first
    // Critical fix (v1.1): Declarations must be checked BEFORE assignments
    // because "int x = 5" contains '=' but should be handled as a declaration
    // Example match: "int result = n * factorial(n - 1);"
    // Groups: 1=type, 2=varname, 3=initializer
    const declMatch = cleanContent.match(/\b(int|float|double|char|bool|long|short|unsigned)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:=\s*(.+))?/);
    if (declMatch) {
      // Variable is DEFINED by this declaration
      variables.defined.push(declMatch[2]); // Group 2 = variable name
      console.log(`Declared variable: ${declMatch[2]}`);

      // If there's an initializer expression, extract variables USED in it
      if (declMatch[3]) { // Group 3 = initializer expression
        this.extractVariablesFromExpression(declMatch[3], variables.used);
      }
    }
    // STEP 5: Check for plain ASSIGNMENT statement
    // Only reached if NOT a declaration statement
    else if (cleanContent.includes('=') && !cleanContent.includes('==') && !cleanContent.includes('!=')) {
      // Split on '=' to get LHS (defined) and RHS (used)
      const parts = cleanContent.split('=');
      if (parts.length >= 2) {
        const lhs = parts[0].trim();
        const rhs = parts.slice(1).join('=').trim(); // Handle multiple '='

        // LHS should be a single variable (academic: only simple assignments)
        const lhsVar = lhs.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*$/);
        if (lhsVar) {
          variables.defined.push(lhsVar[1]);
          console.log(`Defined variable: ${lhsVar[1]}`);
        }

        // RHS: extract variables (academic approach)
        this.extractVariablesFromExpression(rhs, variables.used);
      }
    }
    // Function call: func(arg1, arg2, ...)
    // Use FunctionCallExtractor for reliable extraction (handles recovery-expr, nested calls, etc.)
    else if (cleanContent.includes('(') && cleanContent.includes(')')) {
      const tempStmt = { text: cleanContent };
      const calls = FunctionCallExtractor.extractFunctionCalls(tempStmt);
      
      if (calls.length > 0) {
        // Extract variables from all function call arguments
        for (const call of calls) {
          call.arguments.forEach(arg => {
            this.extractVariablesFromExpression(arg, variables.used);
          });
        }
      } else {
        // Fallback to regex-based extraction
        const callMatch = cleanContent.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/);
        if (callMatch) {
          const args = callMatch[2];
          this.extractVariablesFromExpression(args, variables.used);
        }
      }
    }
    // Return statement: return expression
    else if (cleanContent.startsWith('return')) {
      const returnMatch = cleanContent.match(/return\s+(.+)/);
      if (returnMatch) {
        this.extractVariablesFromExpression(returnMatch[1], variables.used);
      }
    }
    // Variable reference (standalone variable)
    else {
      const varMatch = cleanContent.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*$/);
      if (varMatch) {
        variables.used.push(varMatch[1]);
        console.log(`Used variable: ${varMatch[1]}`);
      }
    }

    // Remove duplicates and filter out keywords
    const keywords = new Set(['int', 'float', 'double', 'char', 'void', 'return', 'if', 'else', 'for', 'while', 'scanf', 'printf']);
    variables.defined = [...new Set(variables.defined)].filter(v => !keywords.has(v) && v.length > 0);
    variables.used = [...new Set(variables.used)].filter(v => !keywords.has(v) && !variables.defined.includes(v) && v.length > 0);

    console.log(`Final analysis - defined: [${variables.defined.join(', ')}], used: [${variables.used.join(', ')}]`);
    return variables;
  }

  /**
   * Extract variables from an expression (academic approach)
   */
  private extractVariablesFromExpression(expression: string, usedVars: string[]): void {
    if (!expression) return;

    // Split on operators and punctuation, keeping variable names
    const tokens = expression.split(/[\s+\-*/=<>!&|(),;]+/).filter(token => token.length > 0);

    for (const token of tokens) {
      // Valid variable name: starts with letter/underscore, contains letters/digits/underscores
      if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(token)) {
        // Skip numeric literals
        if (!/^\d+$/.test(token)) {
          usedVars.push(token);
        }
      }
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: AnalysisConfig): void {
    this.config = config;
  }
}

