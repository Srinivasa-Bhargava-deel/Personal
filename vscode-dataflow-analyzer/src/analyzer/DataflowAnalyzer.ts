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
 * 
 * NEW FEATURES (v1.9.1):
 * - Enhanced sensitivity tracking in analysis state
 * - Improved visualization data preparation with sensitivity metadata
 * - Comprehensive logging for sensitivity verification
 * 
 * LOGGING STRATEGY:
 * This file uses LoggingConfig methods for all logging:
 * - LoggingConfig.log() - Normal operational messages (e.g., "Analyzing file...")
 * - LoggingConfig.detail() - Detailed debugging info (e.g., sensitivity checks, hash comparisons)
 * - LoggingConfig.verbose() - Very detailed info (e.g., variable lists, liveness sets)
 * - LoggingConfig.error() - Error messages
 * - LoggingConfig.warn() - Warning messages
 * - LoggingConfig.section() - Major event headers
 * - LoggingConfig.raw() - Raw messages without module prefix (for IPA logging)
 * 
 * All logs are automatically written to .vscode/logs.txt via console interception.
 * Module flag: LoggingConfig.DataflowAnalyzer controls logging for this component.
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
  TaintSensitivity,
  TaintInfo,
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
    this.taintAnalyzer = new TaintAnalyzer(
      undefined,  // sourceRegistry
      undefined,  // sinkRegistry
      undefined,  // sanitizationRegistry
      config.taintSensitivity || TaintSensitivity.PRECISE  // NEW: pass sensitivity
    );
    this.securityAnalyzer = new SecurityAnalyzer();
    this.stateManager = new StateManager(workspacePath);
    this.config = config;
    
    /**
     * STATE INITIALIZATION AND SENSITIVITY SYNCHRONIZATION
     * 
     * Loads saved state from disk if available, otherwise creates empty state.
     * CRITICAL: Ensures state's taintSensitivity always matches current config
     * to prevent sensitivity mismatches during analysis.
     */
    // Load existing state from disk, or create empty state if none exists
    const loadResult = this.stateManager.loadState();
    this.currentState = loadResult.state;
    if (!this.currentState) {
      this.currentState = this.createEmptyState(workspacePath);
      LoggingConfig.log('DataflowAnalyzer', 'Created new empty state (no saved state found)');
    } else {
      // State loaded successfully - log load time and verify sensitivity
      LoggingConfig.log('DataflowAnalyzer', `Loaded saved state in ${loadResult.loadTimeMs}ms`);
      // Store load time for notification
      (this.currentState as any).loadTimeMs = loadResult.loadTimeMs;
      
      // CRITICAL FIX: Update state's taintSensitivity to match current config
      // This ensures the state reflects the sensitivity that will be used for analysis
      const configSensitivity = this.config.taintSensitivity || TaintSensitivity.PRECISE;
      const stateSensitivity = this.currentState.taintSensitivity;
      if (stateSensitivity !== configSensitivity) {
        LoggingConfig.detail('DataflowAnalyzer', `Updating loaded state's taintSensitivity: ${stateSensitivity} -> ${configSensitivity}`);
        this.currentState.taintSensitivity = configSensitivity;
      } else {
        LoggingConfig.detail('DataflowAnalyzer', `State sensitivity matches config: ${stateSensitivity}`);
      }
    }
    
    // CRITICAL FIX: Always ensure state's taintSensitivity matches config before analysis
    // Final synchronization to guarantee consistency
    const finalSensitivity = this.config.taintSensitivity || TaintSensitivity.PRECISE;
    if (this.currentState.taintSensitivity !== finalSensitivity) {
      LoggingConfig.detail('DataflowAnalyzer', `Final sync: Updating state sensitivity ${this.currentState.taintSensitivity} -> ${finalSensitivity}`);
      this.currentState.taintSensitivity = finalSensitivity;
    }
    // Log final sensitivity configuration for verification
    LoggingConfig.log('DataflowAnalyzer', `Starting analysis with sensitivity: ${this.currentState.taintSensitivity}`);
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
    const analysisStartTime = Date.now();
    const workspacePath = this.currentState!.workspacePath;
    
    LoggingConfig.section('DataflowAnalyzer', '🎯 MAJOR EVENT: Starting Workspace Analysis');
    LoggingConfig.raw(`[DataflowAnalyzer] [WORKSPACE] ========== WORKSPACE ANALYSIS START ==========`);
    LoggingConfig.raw(`[DataflowAnalyzer] [WORKSPACE] Workspace path: ${workspacePath}`);
    LoggingConfig.raw(`[DataflowAnalyzer] [WORKSPACE] Current sensitivity: ${this.config.taintSensitivity || 'precise'}`);
    LoggingConfig.raw(`[DataflowAnalyzer] [WORKSPACE] Analysis config: liveness=${this.config.enableLiveness}, rd=${this.config.enableReachingDefinitions}, taint=${this.config.enableTaintAnalysis}, ipa=${this.config.enableInterProcedural}`);
    
    // Optimization: If there's an active C/C++ editor, analyze only that file
    // This avoids pulling in library headers which clutter the analysis
    try {
      const active = vscode.window.activeTextEditor;
      if (active && (active.document.languageId === 'cpp' || active.document.languageId === 'c')) {
        LoggingConfig.raw(`[DataflowAnalyzer] [WORKSPACE] Active C/C++ editor detected, analyzing single file: ${active.document.uri.fsPath}`);
        return await this.analyzeSpecificFiles([active.document.uri.fsPath]);
      }
    } catch (error) {
      LoggingConfig.raw(`[DataflowAnalyzer] [WORKSPACE] Single-file analysis failed, falling back to workspace analysis: ${error}`);
      // Fall through to workspace analysis if single-file analysis fails
    }
    
    // Initialize global CFG structure for all functions across all files
    const cfg: CFG = {
      entry: 'global_entry',      // Global entry point
      exit: 'global_exit',        // Global exit point
      blocks: new Map(),          // All basic blocks in workspace
      functions: new Map()        // All function CFGs: funcName -> FunctionCFG
    };
    LoggingConfig.raw(`[DataflowAnalyzer] [WORKSPACE] Initialized global CFG structure`);

    // Track analysis state for each file in workspace
    const fileStates = new Map<string, FileAnalysisState>();

    // STEP 1: Find all C++ files in workspace
    LoggingConfig.raw(`[DataflowAnalyzer] [WORKSPACE] STEP 1: Finding C++ files in workspace...`);
    const cppFiles = await this.findCppFiles(workspacePath);
    LoggingConfig.raw(`[DataflowAnalyzer] [WORKSPACE] Found ${cppFiles.length} C++ files: ${cppFiles.slice(0, 5).join(', ')}${cppFiles.length > 5 ? '...' : ''}`);
    
    // STEP 2: Parse each file and extract CFGs
    LoggingConfig.raw(`[DataflowAnalyzer] [WORKSPACE] STEP 2: Parsing files and extracting CFGs...`);
    let parsedFiles = 0;
    let failedFiles = 0;
    for (const filePath of cppFiles) {
      try {
        LoggingConfig.raw(`[DataflowAnalyzer] [WORKSPACE] Parsing file ${parsedFiles + 1}/${cppFiles.length}: ${filePath}`);
        const fileState = await this.analyzeFile(filePath, cfg);
        fileStates.set(filePath, fileState);
        parsedFiles++;
        LoggingConfig.raw(`[DataflowAnalyzer] [WORKSPACE] ✅ Parsed ${filePath}: ${fileState.functions.length} functions`);
      } catch (error) {
        // File analysis failed - log error and continue with other files
        failedFiles++;
        LoggingConfig.raw(`[DataflowAnalyzer] [WORKSPACE] ❌ ERROR analyzing ${filePath}: ${error}`);
        LoggingConfig.error('DataflowAnalyzer', `Error analyzing ${filePath}`, error);
      }
    }
    LoggingConfig.raw(`[DataflowAnalyzer] [WORKSPACE] Parsing complete: ${parsedFiles} succeeded, ${failedFiles} failed`);
    LoggingConfig.raw(`[DataflowAnalyzer] [WORKSPACE] Total functions extracted: ${cfg.functions.size}`);

    // STEP 3: Initialize analysis result maps
    // Each analysis computes results for each block in each function
    LoggingConfig.raw(`[DataflowAnalyzer] [WORKSPACE] STEP 3: Running intra-procedural analyses...`);
    const liveness = new Map();                    // Block liveness: IN/OUT sets
    const reachingDefinitions = new Map();         // Definition propagation: IN/OUT sets
    const taintAnalysis = new Map();               // Taint propagation results
    const vulnerabilities = new Map();             // Detected security vulnerabilities

    let funcIndex = 0;
    cfg.functions.forEach((funcCFG, funcName) => {
      funcIndex++;
      LoggingConfig.raw(`[DataflowAnalyzer] [WORKSPACE] Analyzing function ${funcIndex}/${cfg.functions.size}: ${funcName} (${funcCFG.blocks.size} blocks)`);
      
      /**
       * LIVENESS ANALYSIS
       * 
       * Performs backward dataflow analysis to determine which variables are "live"
       * at each program point. Results are stored per block and used for optimization
       * and visualization.
       */
      if (this.config.enableLiveness) {
        LoggingConfig.raw(`[DataflowAnalyzer] [LIVENESS] Running liveness analysis for ${funcName} with ${funcCFG.blocks.size} blocks`);
        const funcLiveness = this.livenessAnalyzer.analyze(funcCFG);
        LoggingConfig.raw(`[DataflowAnalyzer] [LIVENESS] ✅ Liveness analysis for ${funcName} produced ${funcLiveness.size} entries`);
        // Store liveness results keyed by function_blockId for lookup
        funcLiveness.forEach((info, blockId) => {
          const key = `${funcName}_${blockId}`;
          liveness.set(key, info);
          // Log detailed liveness sets for debugging (verbose level)
          LoggingConfig.verbose('DataflowAnalyzer', `Set liveness for key: ${key}, in: ${Array.from(info.in).join(', ')}, out: ${Array.from(info.out).join(', ')}`);
        });
      }

      /**
       * REACHING DEFINITIONS ANALYSIS
       * 
       * Performs forward dataflow analysis to track where variable definitions reach
       * through the program. Results include propagation paths and are critical for
       * taint analysis and definition-use chain visualization.
       */
      if (this.config.enableReachingDefinitions) {
        LoggingConfig.raw(`[DataflowAnalyzer] [RD] Running reaching definitions analysis for ${funcName} with ${funcCFG.blocks.size} blocks`);
        const funcRD = this.reachingDefinitionsAnalyzer.analyze(funcCFG);
        LoggingConfig.raw(`[DataflowAnalyzer] [RD] ✅ Reaching definitions analysis for ${funcName} produced ${funcRD.size} entries`);
        // Store reaching definitions results keyed by function_blockId
        funcRD.forEach((info, blockId) => {
          const key = `${funcName}_${blockId}`;
          reachingDefinitions.set(key, info);
          
          // Log detailed IN/OUT sets with propagation paths (verbose level for debugging)
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
          
          // Verbose logging of reaching definitions sets (includes propagation paths)
          LoggingConfig.verbose('DataflowAnalyzer', `Set RD for key: ${key}`);
          LoggingConfig.verbose('DataflowAnalyzer', `  - IN: ${inVars || '(empty)'}`);
          LoggingConfig.verbose('DataflowAnalyzer', `  - OUT: ${outVars || '(empty)'}`);
        });
      }

      if (this.config.enableTaintAnalysis) {
        LoggingConfig.raw(`[DataflowAnalyzer] [TAINT] Running taint analysis for ${funcName} with sensitivity: ${this.config.taintSensitivity || 'precise'}`);
        // CRITICAL FIX (Issue #3): Use correct key format matching the storage format
        const entryBlockId = funcCFG.entry || 'entry';
        // Collect ALL reaching definitions for function, not just entry block
        const funcRD = new Map<string, ReachingDefinitionsInfo>();
        funcCFG.blocks.forEach((block, blockId) => {
          const rdKey = `${funcName}_${blockId}`;
          const rdInfo = reachingDefinitions.get(rdKey);
          if (rdInfo) {
            funcRD.set(blockId, rdInfo);
          }
        });
        LoggingConfig.raw(`[DataflowAnalyzer] [TAINT] Collected RD info for ${funcRD.size} blocks in ${funcName}`);
        
        const taintResult = this.taintAnalyzer.analyze(funcCFG, funcRD);
        const totalTaints = Array.from(taintResult.taintMap.values()).flat();
        const controlDependentTaints = totalTaints.filter((t: TaintInfo) => t.labels?.includes(TaintLabel.CONTROL_DEPENDENT));
        const dataFlowTaints = totalTaints.filter((t: TaintInfo) => !t.labels?.includes(TaintLabel.CONTROL_DEPENDENT));
        LoggingConfig.raw(`[DataflowAnalyzer] [TAINT] ✅ Taint analysis for ${funcName}: ${totalTaints.length} total taints (${dataFlowTaints.length} data-flow, ${controlDependentTaints.length} control-dependent)`);
        taintAnalysis.set(funcName, totalTaints);
        
        // Add taint vulnerabilities to vulnerabilities map
        if (taintResult.vulnerabilities.length > 0) {
          const existingVulns = vulnerabilities.get(funcName) || [];
          vulnerabilities.set(funcName, [...existingVulns, ...taintResult.vulnerabilities]);
          LoggingConfig.raw(`[DataflowAnalyzer] [TAINT] ⚠️ Found ${taintResult.vulnerabilities.length} taint vulnerabilities in ${funcName}`);
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
          LoggingConfig.raw(`[DataflowAnalyzer] [SECURITY] ⚠️ Found ${funcVulns.length} security vulnerabilities in ${funcName}`);
        }
      }
    });
    LoggingConfig.raw(`[DataflowAnalyzer] [WORKSPACE] ✅ Intra-procedural analyses complete: ${cfg.functions.size} functions analyzed`);

    // STEP 4: Run Inter-Procedural Analysis (IPA) - Phases 1-4
    let callGraph: any = undefined;
    let interProceduralRD: Map<string, Map<string, any>> | undefined = undefined;
    const parameterAnalysis = new Map<string, any[]>();
    const returnValueAnalysis = new Map<string, any[]>();

    if (this.config.enableInterProcedural !== false && cfg.functions.size > 0) {
      try {
        LoggingConfig.raw('[IPA] Starting inter-procedural analysis...');
        
        // Phase 1 & 2: Build call graph
        const cgAnalyzer = new CallGraphAnalyzer(cfg.functions);
        callGraph = cgAnalyzer.buildCallGraph();
        LoggingConfig.raw(`[IPA] Call graph built: ${callGraph.functions.size} functions, ${callGraph.calls.length} calls`);

        // PHASE 1.3: Detailed call graph logging for blue edge debugging
        LoggingConfig.raw('[IPA] ========== PHASE 1.3: Detailed Call Graph Analysis ==========');
        LoggingConfig.raw('[IPA] Call graph object keys:', Object.keys(callGraph));
        LoggingConfig.raw('[IPA] callsFrom map exists:', !!callGraph.callsFrom);
        LoggingConfig.raw('[IPA] callsFrom map type:', callGraph.callsFrom ? typeof callGraph.callsFrom : 'N/A');
        LoggingConfig.raw('[IPA] callsFrom map size:', callGraph.callsFrom ? (callGraph.callsFrom instanceof Map ? callGraph.callsFrom.size : Object.keys(callGraph.callsFrom).length) : 'N/A');
        LoggingConfig.raw('[IPA] callsFrom map keys:', callGraph.callsFrom ? (callGraph.callsFrom instanceof Map ? Array.from(callGraph.callsFrom.keys()) : Object.keys(callGraph.callsFrom)) : 'N/A');
        LoggingConfig.raw('[IPA] callsTo map exists:', !!callGraph.callsTo);
        LoggingConfig.raw('[IPA] callsTo map size:', callGraph.callsTo ? (callGraph.callsTo instanceof Map ? callGraph.callsTo.size : Object.keys(callGraph.callsTo).length) : 'N/A');
        LoggingConfig.raw('[IPA] functions map exists:', !!callGraph.functions);
        LoggingConfig.raw('[IPA] functions map size:', callGraph.functions ? (callGraph.functions instanceof Map ? callGraph.functions.size : Object.keys(callGraph.functions).length) : 'N/A');
        LoggingConfig.raw('[IPA] calls array exists:', !!callGraph.calls);
        LoggingConfig.raw('[IPA] calls array length:', callGraph.calls ? callGraph.calls.length : 'N/A');

        if (callGraph.callsFrom) {
          LoggingConfig.raw('[IPA] callsFrom entries:');
          const callsFromIter = callGraph.callsFrom instanceof Map ? callGraph.callsFrom : Object.entries(callGraph.callsFrom);
          if (callGraph.callsFrom instanceof Map) {
            callGraph.callsFrom.forEach((calls: any[], caller: string) => {
              LoggingConfig.raw(`[IPA]   ${caller} calls: ${calls.length} functions`);
              calls.forEach((call: any, idx: number) => {
                LoggingConfig.raw(`[IPA]     Call ${idx}: ${caller} -> ${call.calleeId} at block ${call.callSite?.blockId || 'unknown'}`);
              });
            });
          } else {
            Object.entries(callGraph.callsFrom).forEach(([caller, calls]: [string, any]) => {
              LoggingConfig.raw(`[IPA]   ${caller} calls: ${Array.isArray(calls) ? calls.length : 'N/A'} functions`);
              if (Array.isArray(calls)) {
                calls.forEach((call: any, idx: number) => {
                  LoggingConfig.raw(`[IPA]     Call ${idx}: ${caller} -> ${call.calleeId} at block ${call.callSite?.blockId || 'unknown'}`);
                });
              }
            });
          }
        }

        LoggingConfig.raw('[IPA] Sample call objects:');
        if (callGraph.calls && Array.isArray(callGraph.calls) && callGraph.calls.length > 0) {
          callGraph.calls.slice(0, 3).forEach((call: any, idx: number) => {
            LoggingConfig.raw(`[IPA] Call ${idx}:`, JSON.stringify(call, null, 2));
          });
        }
        LoggingConfig.raw('[IPA] ========== END PHASE 1.3 ==========');

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
          LoggingConfig.raw(`[IPA] Inter-procedural reaching definitions complete`);
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
        // Inter-procedural analysis failed - log error but continue with analysis
        LoggingConfig.error('DataflowAnalyzer', 'Error during inter-procedural analysis', error);
        // Continue without IPA if it fails
      }
    }

    /**
     * STATE ASSEMBLY
     * 
     * Assembles the final AnalysisState object containing all analysis results.
     * CRITICAL: Ensures taintSensitivity is set from config to match analysis settings.
     */
    // Update state
    // CRITICAL FIX: Ensure taintSensitivity is set from config
    const currentSensitivity = this.config.taintSensitivity || TaintSensitivity.PRECISE;
    LoggingConfig.raw(`[DataflowAnalyzer] [WORKSPACE] Creating new state with sensitivity: ${currentSensitivity}`);
    // Create new analysis state with current sensitivity configuration
    LoggingConfig.detail('DataflowAnalyzer', `Creating new state (analyzeWorkspace) with sensitivity: ${currentSensitivity}`);
    
    LoggingConfig.raw(`[DataflowAnalyzer] [WORKSPACE] Assembling analysis state...`);
    LoggingConfig.raw(`[DataflowAnalyzer] [WORKSPACE] Functions: ${cfg.functions.size}, Files: ${fileStates.size}`);
    LoggingConfig.raw(`[DataflowAnalyzer] [WORKSPACE] Liveness entries: ${liveness.size}, RD entries: ${reachingDefinitions.size}`);
    LoggingConfig.raw(`[DataflowAnalyzer] [WORKSPACE] Taint entries: ${taintAnalysis.size}, Vulnerabilities: ${Array.from(vulnerabilities.values()).flat().length}`);
    LoggingConfig.raw(`[DataflowAnalyzer] [WORKSPACE] Call graph: ${callGraph ? `${callGraph.functions.size} functions, ${callGraph.calls.length} calls` : 'none'}`);
    
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
      returnValueAnalysis: returnValueAnalysis.size > 0 ? returnValueAnalysis : undefined,
      // CRITICAL FIX: Set taintSensitivity from config
      taintSensitivity: currentSensitivity
    };

    /**
     * VISUALIZATION DATA PREPARATION
     * 
     * Prepares all visualization data structures needed by CFGVisualizer.
     * This includes graph data, taint visualization, call graph data, etc.
     * The data is cached in state.visualizationData for efficient rendering.
     */
    // Prepare all visualization data in backend (before saving state)
    LoggingConfig.raw(`[DataflowAnalyzer] [WORKSPACE] Preparing visualization data...`);
    LoggingConfig.log('DataflowAnalyzer', 'Preparing all visualization data in backend...');
    try {
      const visualizationData = await CFGVisualizer.prepareAllVisualizationData(this.currentState);
      this.currentState.visualizationData = visualizationData;
      LoggingConfig.raw(`[DataflowAnalyzer] [WORKSPACE] ✅ Visualization data prepared successfully`);
      LoggingConfig.log('DataflowAnalyzer', 'Visualization data prepared successfully');
    } catch (error) {
      // Visualization data preparation failed - log error but don't fail entire analysis
      LoggingConfig.raw(`[DataflowAnalyzer] [WORKSPACE] ❌ ERROR preparing visualization data: ${error}`);
      LoggingConfig.error('DataflowAnalyzer', 'Error preparing visualization data', error);
      // Continue without visualization data if preparation fails
    }

    // Save state
    LoggingConfig.raw(`[DataflowAnalyzer] [WORKSPACE] Saving state to disk...`);
    this.stateManager.saveState(this.currentState);
    
    const analysisTimeMs = Date.now() - analysisStartTime;
    LoggingConfig.section('DataflowAnalyzer', '========== WORKSPACE ANALYSIS COMPLETE ==========');
    LoggingConfig.raw(`[DataflowAnalyzer] [WORKSPACE] ✅ Analysis completed in ${analysisTimeMs}ms`);
    LoggingConfig.raw(`[DataflowAnalyzer] [WORKSPACE] Final state: ${cfg.functions.size} functions, ${Array.from(vulnerabilities.values()).flat().length} vulnerabilities`);
    LoggingConfig.raw(`[DataflowAnalyzer] [WORKSPACE] Sensitivity: ${currentSensitivity}`);
    // Analysis complete - log total time and summary statistics
    LoggingConfig.section('DataflowAnalyzer', '========== WORKSPACE ANALYSIS COMPLETE ==========');
    LoggingConfig.log('DataflowAnalyzer', `Analysis completed in ${analysisTimeMs}ms`);
    LoggingConfig.table('DataflowAnalyzer', 'Analysis Summary', {
      'Functions': this.currentState.cfg.functions.size,
      'Files': this.currentState.fileStates.size,
      'Liveness Entries': this.currentState.liveness.size,
      'RD Entries': this.currentState.reachingDefinitions.size,
      'Taint Entries': this.currentState.taintAnalysis.size,
      'Vulnerabilities': this.currentState.vulnerabilities.size,
      'Sensitivity': this.currentState.taintSensitivity || 'precise'
    });
    (this.currentState as any).analysisTimeMs = analysisTimeMs;

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

    /**
     * FILE FILTERING AND ANALYSIS
     * 
     * Filters files to only process C++ source files (excludes headers).
     * Each file is analyzed and its state is stored for aggregation.
     */
    for (const filePath of filePaths) {
      // Only allow source files
      const ext = path.extname(filePath).toLowerCase();
      const sourceExtensions = ['.cpp', '.cxx', '.cc', '.c'];
      if (!sourceExtensions.includes(ext)) {
        LoggingConfig.detail('DataflowAnalyzer', `Skipping non-source file: ${filePath}`);
        continue;
      }
      try {
        const fileState = await this.analyzeFile(filePath, cfg);
        fileStates.set(filePath, fileState);
      } catch (error) {
        // File analysis failed - log error and continue with other files
        LoggingConfig.error('DataflowAnalyzer', `Error analyzing ${filePath}`, error);
      }
    }

    // Perform analyses
    const liveness = new Map();
    const reachingDefinitions = new Map();
    const taintAnalysis = new Map();
    const vulnerabilities = new Map();

    /**
     * INTRA-PROCEDURAL ANALYSIS (analyzeSpecificFiles)
     * 
     * Runs dataflow analyses on each function CFG:
     * - Liveness analysis (backward dataflow)
     * - Reaching definitions (forward dataflow)
     * - Taint analysis (taint propagation)
     * Results are stored keyed by function_blockId for lookup.
     */
    cfg.functions.forEach((funcCFG, funcName) => {
      if (this.config.enableLiveness) {
        LoggingConfig.detail('DataflowAnalyzer', `Running liveness analysis for ${funcName} with ${funcCFG.blocks.size} blocks`);
        const funcLiveness = this.livenessAnalyzer.analyze(funcCFG);
        LoggingConfig.detail('DataflowAnalyzer', `Liveness analysis for ${funcName} produced ${funcLiveness.size} entries`);
        funcLiveness.forEach((info, blockId) => {
          const key = `${funcName}_${blockId}`;
          liveness.set(key, info);
          // Verbose logging of liveness sets (for debugging)
          LoggingConfig.verbose('DataflowAnalyzer', `Set liveness for key: ${key}, in: ${Array.from(info.in).join(', ')}, out: ${Array.from(info.out).join(', ')}`);
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
        LoggingConfig.raw('[IPA] Starting inter-procedural analysis...');
        
        // Phase 1 & 2: Build call graph
        const cgAnalyzer = new CallGraphAnalyzer(cfg.functions);
        callGraph = cgAnalyzer.buildCallGraph();
        LoggingConfig.raw(`[IPA] Call graph built: ${callGraph.functions.size} functions, ${callGraph.calls.length} calls`);

        // PHASE 1.3: Detailed call graph logging for blue edge debugging
        LoggingConfig.raw('[IPA] ========== PHASE 1.3: Detailed Call Graph Analysis ==========');
        LoggingConfig.raw('[IPA] Call graph object keys:', Object.keys(callGraph));
        LoggingConfig.raw('[IPA] callsFrom map exists:', !!callGraph.callsFrom);
        LoggingConfig.raw('[IPA] callsFrom map type:', callGraph.callsFrom ? typeof callGraph.callsFrom : 'N/A');
        LoggingConfig.raw('[IPA] callsFrom map size:', callGraph.callsFrom ? (callGraph.callsFrom instanceof Map ? callGraph.callsFrom.size : Object.keys(callGraph.callsFrom).length) : 'N/A');
        LoggingConfig.raw('[IPA] callsFrom map keys:', callGraph.callsFrom ? (callGraph.callsFrom instanceof Map ? Array.from(callGraph.callsFrom.keys()) : Object.keys(callGraph.callsFrom)) : 'N/A');
        LoggingConfig.raw('[IPA] callsTo map exists:', !!callGraph.callsTo);
        LoggingConfig.raw('[IPA] callsTo map size:', callGraph.callsTo ? (callGraph.callsTo instanceof Map ? callGraph.callsTo.size : Object.keys(callGraph.callsTo).length) : 'N/A');
        LoggingConfig.raw('[IPA] functions map exists:', !!callGraph.functions);
        LoggingConfig.raw('[IPA] functions map size:', callGraph.functions ? (callGraph.functions instanceof Map ? callGraph.functions.size : Object.keys(callGraph.functions).length) : 'N/A');
        LoggingConfig.raw('[IPA] calls array exists:', !!callGraph.calls);
        LoggingConfig.raw('[IPA] calls array length:', callGraph.calls ? callGraph.calls.length : 'N/A');

        if (callGraph.callsFrom) {
          LoggingConfig.raw('[IPA] callsFrom entries:');
          const callsFromIter = callGraph.callsFrom instanceof Map ? callGraph.callsFrom : Object.entries(callGraph.callsFrom);
          if (callGraph.callsFrom instanceof Map) {
            callGraph.callsFrom.forEach((calls: any[], caller: string) => {
              LoggingConfig.raw(`[IPA]   ${caller} calls: ${calls.length} functions`);
              calls.forEach((call: any, idx: number) => {
                LoggingConfig.raw(`[IPA]     Call ${idx}: ${caller} -> ${call.calleeId} at block ${call.callSite?.blockId || 'unknown'}`);
              });
            });
          } else {
            Object.entries(callGraph.callsFrom).forEach(([caller, calls]: [string, any]) => {
              LoggingConfig.raw(`[IPA]   ${caller} calls: ${Array.isArray(calls) ? calls.length : 'N/A'} functions`);
              if (Array.isArray(calls)) {
                calls.forEach((call: any, idx: number) => {
                  LoggingConfig.raw(`[IPA]     Call ${idx}: ${caller} -> ${call.calleeId} at block ${call.callSite?.blockId || 'unknown'}`);
                });
              }
            });
          }
        }

        LoggingConfig.raw('[IPA] Sample call objects:');
        if (callGraph.calls && Array.isArray(callGraph.calls) && callGraph.calls.length > 0) {
          callGraph.calls.slice(0, 3).forEach((call: any, idx: number) => {
            LoggingConfig.raw(`[IPA] Call ${idx}:`, JSON.stringify(call, null, 2));
          });
        }
        LoggingConfig.raw('[IPA] ========== END PHASE 1.3 ==========');

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
          LoggingConfig.raw(`[IPA] Inter-procedural reaching definitions complete`);
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
      returnValueAnalysis: returnValueAnalysis.size > 0 ? returnValueAnalysis : undefined,
      // CRITICAL FIX: Set taintSensitivity from config (was missing!)
      taintSensitivity: this.config.taintSensitivity || TaintSensitivity.PRECISE
    };

    /**
     * VISUALIZATION DATA PREPARATION (analyzeSpecificFiles)
     * 
     * Prepares visualization data for the analyzed files.
     * Same process as analyzeWorkspace but for specific files only.
     */
    // Prepare all visualization data in backend (before saving state)
    LoggingConfig.log('DataflowAnalyzer', 'Preparing all visualization data in backend (analyzeSpecificFiles)...');
    LoggingConfig.detail('DataflowAnalyzer', `Creating new state (analyzeSpecificFiles) with sensitivity: ${this.currentState.taintSensitivity}`);
    try {
      const visualizationData = await CFGVisualizer.prepareAllVisualizationData(this.currentState);
      this.currentState.visualizationData = visualizationData;
      LoggingConfig.log('DataflowAnalyzer', 'Visualization data prepared successfully');
    } catch (error) {
      // Visualization data preparation failed - log error but don't fail entire analysis
      LoggingConfig.error('DataflowAnalyzer', 'Error preparing visualization data', error);
      // Continue without visualization data if preparation fails
    }

    this.stateManager.saveState(this.currentState);
    return this.currentState;
  }

  /**
   * Analyze a single file
   */
  private async analyzeFile(filePath: string, cfg: CFG): Promise<FileAnalysisState> {
    // ============================================================
    // COMPREHENSIVE LOGGING: File Analysis Start
    // ============================================================
    LoggingConfig.section('DataflowAnalyzer', `ANALYZING FILE: ${path.basename(filePath)}`);
    LoggingConfig.log('DataflowAnalyzer', `Full Path: ${filePath}`);
    LoggingConfig.log('DataflowAnalyzer', `Taint Sensitivity: ${this.config.taintSensitivity || 'precise'}`);
    
    const analysisStartTime = Date.now();
    const hash = this.stateManager.computeFileHash(filePath);
    const stats = fs.statSync(filePath);
    
    LoggingConfig.detail('DataflowAnalyzer', `File Hash: ${hash.substring(0, 16)}...`);
    LoggingConfig.detail('DataflowAnalyzer', `File Size: ${stats.size} bytes`);

    /**
     * FILE PARSING
     * 
     * Parses the C++ file to extract CFG structures for all functions.
     * The parser uses Clang's official CFG generation to create accurate control flow graphs.
     */
    LoggingConfig.log('DataflowAnalyzer', `Analyzing file: ${filePath}`);
    const normalizedSourcePath = path.resolve(filePath);
    const sourceFileBase = path.basename(filePath);
    const sourceFileDir = path.dirname(filePath);
    
    const { functions, globalVars } = await this.parser.parseFile(filePath);
    LoggingConfig.log('DataflowAnalyzer', `Parser returned ${functions.length} functions from ${filePath}`);

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

      /**
       * FUNCTION LOCATION VERIFICATION
       * 
       * Verifies that functions are actually from the source file being analyzed.
       * This prevents including library/system functions and functions from included headers.
       * Uses Clang's location information to determine function origin.
       */
      // Special handling for CFG-based functions (parsed directly from source file)
      if (funcInfo.cfg && (!funcInfo.astNode || !funcInfo.astNode.location)) {
        isFromThisFile = true;
        LoggingConfig.detail('DataflowAnalyzer', `ACCEPTING CFG-based function ${funcInfo.name} (no location verification needed)`);
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
          LoggingConfig.detail('DataflowAnalyzer', `SKIPPING function ${funcInfo.name} - from included file ${funcLocAny.includedFrom.file}`);
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
          LoggingConfig.detail('DataflowAnalyzer', `SKIPPING function ${funcInfo.name} - from header file ${funcFile}`);
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
          LoggingConfig.detail('DataflowAnalyzer', `SKIPPING function ${funcInfo.name} - from system/library ${funcFile}`);
          skippedCount++;
          continue;
        }
      }
      
      if (!isFromThisFile) {
        LoggingConfig.detail('DataflowAnalyzer', `SKIPPING function ${funcInfo.name} - not from source file ${filePath}`);
        skippedCount++;
        continue;
      }
      
      /**
       * FUNCTION CFG ADDITION
       * 
       * Function is verified to be from this file - add its CFG to the global CFG structure.
       * Variable information is populated for statements to enable dataflow analysis.
       */
      // Function is verified to be from this file - add it
      // Use the CFG that was already built by the parser (from Clang CFG generation)
      if (funcInfo.cfg) {
        // Populate variable information for statements in the CFG
        this.populateStatementVariables(funcInfo.cfg);
        cfg.functions.set(funcInfo.name, funcInfo.cfg);
        functionNames.push(funcInfo.name);
        addedCount++;
        LoggingConfig.log('DataflowAnalyzer', `✓ Added function to CFG: ${funcInfo.name} (from ${filePath}, ${funcInfo.cfg.blocks.size} blocks)`);
      } else {
        // Function has no CFG - cannot analyze it
        LoggingConfig.warn('DataflowAnalyzer', `Function ${funcInfo.name} has no CFG - skipping`);
        skippedCount++;
        continue;
      }
    }

    // Log file analysis summary
    LoggingConfig.log('DataflowAnalyzer', `File ${filePath}: ${addedCount} functions added, ${skippedCount} skipped, total in CFG: ${cfg.functions.size}`);

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
    /**
     * MUTEX-BASED CONCURRENT UPDATE PROTECTION
     * 
     * Serializes file updates to prevent race conditions when multiple files
     * are saved/changed concurrently. Each update waits for the previous one
     * to complete before starting.
     */
    this.updateMutex = this.updateMutex.then(async () => {
      try {
        LoggingConfig.detail('DataflowAnalyzer', `updateFile mutex acquired for: ${filePath}`);
        await this.updateFileInternal(filePath);
        LoggingConfig.detail('DataflowAnalyzer', `updateFile mutex released for: ${filePath}`);
      } catch (error) {
        // Update failed - log error and re-throw to caller
        LoggingConfig.error('DataflowAnalyzer', `Error in updateFile for ${filePath}`, error);
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

    /**
     * INCREMENTAL ANALYSIS: Hash-Based Change Detection
     * 
     * Uses content-based hashing (SHA-256) to detect if file actually changed.
     * Academic standard: Follows "incremental compilation" principle from compiler theory.
     * Reference: "Engineering a Compiler" (Cooper & Torczon) - Incremental Analysis
     * 
     * If hash matches, file hasn't changed - skip re-analysis for performance.
     * If hash differs, file changed - re-analyze to update results.
     */
    // INCREMENTAL ANALYSIS: Check if file actually changed using hash comparison
    // Academic standard: Use content-based hashing (SHA-256) for change detection
    // This follows the principle of "incremental compilation" from compiler theory
    // Reference: "Engineering a Compiler" (Cooper & Torczon) - Incremental Analysis
    if (existingState && existingState.hash === newHash) {
      // File unchanged - skip re-analysis for performance
      LoggingConfig.log('DataflowAnalyzer', `[Incremental] File ${filePath} unchanged (hash: ${newHash.substring(0, 8)}...), skipping re-analysis`);
      return;
    }
    
    // File changed - log incremental analysis decision
    if (existingState) {
      LoggingConfig.log('DataflowAnalyzer', `[Incremental] File ${filePath} changed (old hash: ${existingState.hash.substring(0, 8)}..., new hash: ${newHash.substring(0, 8)}...), re-analyzing`);
    } else {
      LoggingConfig.log('DataflowAnalyzer', `[Incremental] New file ${filePath} detected (hash: ${newHash.substring(0, 8)}...), analyzing`);
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

    /**
     * RE-RUN ANALYSES FOR UPDATED FUNCTIONS
     * 
     * After file update, re-run all dataflow analyses for affected functions.
     * This ensures analysis results reflect the latest code changes.
     */
    this.currentState.cfg.functions.forEach((funcCFG: FunctionCFG, funcName: string) => {
      if (this.config.enableLiveness) {
        LoggingConfig.detail('DataflowAnalyzer', `Running liveness analysis for ${funcName} with ${funcCFG.blocks.size} blocks`);
        const funcLiveness = this.livenessAnalyzer.analyze(funcCFG);
        LoggingConfig.detail('DataflowAnalyzer', `Liveness analysis for ${funcName} produced ${funcLiveness.size} entries`);
        funcLiveness.forEach((info, blockId) => {
          const key = `${funcName}_${blockId}`;
          liveness.set(key, info);
          // Verbose logging of liveness sets (for debugging)
          LoggingConfig.verbose('DataflowAnalyzer', `Set liveness for key: ${key}, in: ${Array.from(info.in).join(', ')}, out: ${Array.from(info.out).join(', ')}`);
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
        
        /**
         * TAINT ANALYSIS WITH SENSITIVITY VERIFICATION
         * 
         * Performs taint analysis and verifies that sensitivity settings are correctly applied.
         * Logs comprehensive taint statistics to verify sensitivity is working as expected.
         */
        // CRITICAL FIX: Log sensitivity being used for taint analysis
        const currentSensitivity = this.config.taintSensitivity || TaintSensitivity.PRECISE;
        const analyzerSensitivity = (this.taintAnalyzer as any).sensitivity || 'unknown';
        LoggingConfig.detail('DataflowAnalyzer', `[SENSITIVITY-CHECK] Analyzing ${funcName} with config sensitivity: ${currentSensitivity}`);
        LoggingConfig.detail('DataflowAnalyzer', `[SENSITIVITY-CHECK] TaintAnalyzer sensitivity: ${analyzerSensitivity}`);
        LoggingConfig.detail('DataflowAnalyzer', `[SENSITIVITY-CHECK] Sensitivity match: ${currentSensitivity === analyzerSensitivity}`);
        
        if (currentSensitivity !== analyzerSensitivity) {
          LoggingConfig.warn('DataflowAnalyzer', `[SENSITIVITY-CHECK] WARNING: Sensitivity mismatch! Config: ${currentSensitivity}, Analyzer: ${analyzerSensitivity}`);
        }
        
        const taintResult = this.taintAnalyzer.analyze(funcCFG, funcRD);
        
        // CRITICAL FIX: Log taint results to verify sensitivity is working
        const totalTaints = Array.from(taintResult.taintMap.values()).flat();
        const controlDependentTaints = totalTaints.filter((t: TaintInfo) => t.labels?.includes(TaintLabel.CONTROL_DEPENDENT));
        const dataFlowTaints = totalTaints.filter((t: TaintInfo) => t.labels && t.labels.some(l => l !== TaintLabel.CONTROL_DEPENDENT));
        
        // CRITICAL FIX: Calculate comprehensive counts
        const uniqueTaintedVars = new Set(totalTaints.map((t: TaintInfo) => t.variable));
        const mixedTaints = totalTaints.filter((t: TaintInfo) => 
          t.labels?.includes(TaintLabel.CONTROL_DEPENDENT) && 
          t.labels?.some(l => l !== TaintLabel.CONTROL_DEPENDENT)
        );
        const pureDataFlowTaints = totalTaints.filter((t: TaintInfo) => 
          t.labels && 
          !t.labels.includes(TaintLabel.CONTROL_DEPENDENT) &&
          t.labels.length > 0
        );
        const pureControlDependentTaints = totalTaints.filter((t: TaintInfo) => 
          t.labels?.includes(TaintLabel.CONTROL_DEPENDENT) && 
          t.labels?.length === 1
        );
        
        // Log comprehensive taint statistics (detail level for sensitivity verification)
        LoggingConfig.detail('DataflowAnalyzer', `[SENSITIVITY-CHECK] ${funcName} taint results:`);
        LoggingConfig.detail('DataflowAnalyzer', `[SENSITIVITY-CHECK]   Total taint entries: ${totalTaints.length}`);
        LoggingConfig.detail('DataflowAnalyzer', `[SENSITIVITY-CHECK]   Unique tainted variables: ${uniqueTaintedVars.size}`);
        LoggingConfig.detail('DataflowAnalyzer', `[SENSITIVITY-CHECK]   Pure data-flow taints: ${pureDataFlowTaints.length}`);
        LoggingConfig.detail('DataflowAnalyzer', `[SENSITIVITY-CHECK]   Pure control-dependent taints: ${pureControlDependentTaints.length}`);
        LoggingConfig.detail('DataflowAnalyzer', `[SENSITIVITY-CHECK]   Mixed taints (both types): ${mixedTaints.length}`);
        LoggingConfig.detail('DataflowAnalyzer', `[SENSITIVITY-CHECK]   Total data-flow taints (including mixed): ${dataFlowTaints.length}`);
        LoggingConfig.detail('DataflowAnalyzer', `[SENSITIVITY-CHECK]   Total control-dependent taints (including mixed): ${controlDependentTaints.length}`);
        
        // Log CFG structure counts
        const funcCFGNodeCount = funcCFG.blocks.size;
        const funcCFGEdgeCount = Array.from(funcCFG.blocks.values()).reduce((sum, block) => 
          sum + (block.successors?.length || 0), 0
        );
        LoggingConfig.detail('DataflowAnalyzer', `[SENSITIVITY-CHECK] ${funcName} CFG structure:`);
        LoggingConfig.detail('DataflowAnalyzer', `[SENSITIVITY-CHECK]   CFG Blocks (nodes): ${funcCFGNodeCount}`);
        LoggingConfig.detail('DataflowAnalyzer', `[SENSITIVITY-CHECK]   CFG Edges: ${funcCFGEdgeCount}`);
        
        // Verify sensitivity-specific expectations
        if (currentSensitivity === TaintSensitivity.MINIMAL) {
          if (controlDependentTaints.length > 0) {
            LoggingConfig.warn('DataflowAnalyzer', `[SENSITIVITY-CHECK] WARNING: Found ${controlDependentTaints.length} control-dependent taints in MINIMAL mode!`);
          }
        }
        
        taintAnalysis.set(funcName, totalTaints);
        
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

    // System directories to avoid (case-insensitive check)
    const systemDirs = [
      '/usr', '/System', '/Applications', '/Library', '/opt',
      '/bin', '/sbin', '/var', '/private', '/dev', '/etc',
      '/tmp', '/Volumes', '/Network', '/cores'
    ];

    function isSystemDirectory(dirPath: string): boolean {
      const normalizedPath = path.resolve(dirPath);
      return systemDirs.some(sysDir => normalizedPath.startsWith(sysDir));
    }

    /**
     * DIRECTORY WALKING FUNCTION
     * 
     * Recursively walks directory tree to find C++ source files.
     * Skips system directories, hidden directories, and build directories.
     * Only processes files with source extensions (.cpp, .cxx, .cc, .c).
     */
    async function walkDir(dir: string): Promise<void> {
      // Skip system directories entirely
      if (isSystemDirectory(dir)) {
        LoggingConfig.detail('DataflowAnalyzer', `Skipping system directory: ${dir}`);
        return;
      }

      try {
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

          // Skip system directories
          if (isSystemDirectory(fullPath)) {
            continue;
          }

          try {
            if (entry.isDirectory()) {
              await walkDir(fullPath);
            } else if (entry.isFile()) {
              const ext = path.extname(entry.name);
              // Only include source files, explicitly exclude headers
              if (sourceExtensions.includes(ext) && !headerExtensions.includes(ext)) {
                // Double-check: make sure it's not in a system directory
                if (!isSystemDirectory(fullPath)) {
                  files.push(fullPath);
                }
              }
            }
          } catch (entryError: any) {
            // Skip individual entries that cause errors (permission denied, etc.)
            if (entryError.code === 'EACCES' || entryError.code === 'EPERM') {
              LoggingConfig.detail('DataflowAnalyzer', `Permission denied accessing ${fullPath}, skipping...`);
            } else {
              LoggingConfig.warn('DataflowAnalyzer', `Error processing ${fullPath}`, entryError);
            }
          }
        }
      } catch (dirError: any) {
        // Handle permission denied and other directory access errors gracefully
        if (dirError.code === 'EACCES' || dirError.code === 'EPERM') {
          LoggingConfig.detail('DataflowAnalyzer', `Permission denied accessing directory ${dir}, skipping...`);
        } else if (dirError.code === 'ENOENT') {
          LoggingConfig.detail('DataflowAnalyzer', `Directory not found: ${dir}, skipping...`);
        } else {
          LoggingConfig.warn('DataflowAnalyzer', `Error reading directory ${dir}`, dirError);
        }
        // Continue processing other directories
        return;
      }
    }

    /**
     * WORKSPACE PATH VALIDATION
     * 
     * Validates workspace path before starting directory walk.
     * Ensures path exists and is not a system directory for security.
     */
    // Validate workspace path before walking
    if (!workspacePath || !fs.existsSync(workspacePath)) {
      LoggingConfig.error('DataflowAnalyzer', `Invalid workspace path: ${workspacePath}`);
      return files;
    }

    // Check if workspace path is a system directory
    if (isSystemDirectory(workspacePath)) {
      LoggingConfig.error('DataflowAnalyzer', `Workspace path is a system directory: ${workspacePath}. This is not allowed.`);
      return files;
    }

    await walkDir(workspacePath);
    // Log file discovery summary
    LoggingConfig.log('DataflowAnalyzer', `Found ${files.length} source files to analyze: ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}`);
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
      returnValueAnalysis: undefined,
      // Taint analysis sensitivity level (v1.9+)
      taintSensitivity: this.config.taintSensitivity || TaintSensitivity.PRECISE
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

    // Log statement cleaning process (verbose level for debugging)
    LoggingConfig.verbose('DataflowAnalyzer', `Analyzing statement: "${trimmed}" -> cleaned: "${cleanContent}"`);

    /**
     * STATEMENT VARIABLE ANALYSIS
     * 
     * Analyzes cleaned statement to extract:
     * - Variables DEFINED (LHS of assignment or in declaration)
     * - Variables USED (RHS or in expressions)
     * 
     * Academic Definition:
     * - DEF[S]: Set of variables assigned values by statement S
     * - USE[S]: Set of variables whose values are read by statement S
     */
    // STEP 4: Check for DECLARATION statement first
    // Critical fix (v1.1): Declarations must be checked BEFORE assignments
    // because "int x = 5" contains '=' but should be handled as a declaration
    // Example match: "int result = n * factorial(n - 1);"
    // Groups: 1=type, 2=varname, 3=initializer
    const declMatch = cleanContent.match(/\b(int|float|double|char|bool|long|short|unsigned)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:=\s*(.+))?/);
    if (declMatch) {
      // Variable is DEFINED by this declaration
      variables.defined.push(declMatch[2]); // Group 2 = variable name
      LoggingConfig.verbose('DataflowAnalyzer', `Declared variable: ${declMatch[2]}`);

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
          LoggingConfig.verbose('DataflowAnalyzer', `Defined variable: ${lhsVar[1]}`);
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
        LoggingConfig.verbose('DataflowAnalyzer', `Used variable: ${varMatch[1]}`);
      }
    }

    /**
     * VARIABLE LIST CLEANUP
     * 
     * Removes duplicates and filters out C++ keywords.
     * Ensures clean variable lists for dataflow analysis.
     */
    // Remove duplicates and filter out keywords
    const keywords = new Set(['int', 'float', 'double', 'char', 'void', 'return', 'if', 'else', 'for', 'while', 'scanf', 'printf']);
    variables.defined = [...new Set(variables.defined)].filter(v => !keywords.has(v) && v.length > 0);
    variables.used = [...new Set(variables.used)].filter(v => !keywords.has(v) && !variables.defined.includes(v) && v.length > 0);

    // Log final variable analysis results (verbose level)
    LoggingConfig.verbose('DataflowAnalyzer', `Final analysis - defined: [${variables.defined.join(', ')}], used: [${variables.used.join(', ')}]`);
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
  /**
   * Update configuration
   * 
   * Updates analyzer configuration and recreates TaintAnalyzer if sensitivity changed.
   * This ensures the analyzer uses the new sensitivity level for subsequent analyses.
   */
  /**
   * Update configuration
   * 
   * Updates analyzer configuration and recreates TaintAnalyzer if sensitivity changed.
   * This ensures the analyzer uses the new sensitivity level for subsequent analyses.
   * 
   * CRITICAL: Also updates currentState.taintSensitivity to maintain consistency.
   */
  updateConfig(config: AnalysisConfig): void {
    const oldSensitivity = this.config.taintSensitivity;
    LoggingConfig.section('DataflowAnalyzer', '========== CONFIG UPDATE ==========');
    LoggingConfig.log('DataflowAnalyzer', 'updateConfig() called');
    LoggingConfig.detail('DataflowAnalyzer', `Old sensitivity: ${oldSensitivity}`);
    LoggingConfig.detail('DataflowAnalyzer', `New sensitivity: ${config.taintSensitivity}`);
    LoggingConfig.detail('DataflowAnalyzer', `Sensitivity change: ${oldSensitivity} -> ${config.taintSensitivity}`);
    
    this.config = config;
    LoggingConfig.log('DataflowAnalyzer', 'Configuration object updated');
    
    /**
     * STATE SENSITIVITY SYNCHRONIZATION
     * 
     * Updates currentState's taintSensitivity to match new config.
     * This ensures state reflects the sensitivity that will be used for analysis.
     */
    // CRITICAL FIX: Update current state's taintSensitivity to match config
    if (this.currentState) {
      const oldStateSensitivity = this.currentState.taintSensitivity;
      this.currentState.taintSensitivity = config.taintSensitivity || TaintSensitivity.PRECISE;
      LoggingConfig.detail('DataflowAnalyzer', `Updated currentState.taintSensitivity: ${oldStateSensitivity} -> ${this.currentState.taintSensitivity}`);
    } else {
      LoggingConfig.detail('DataflowAnalyzer', 'No currentState exists yet, will be set on next analysis');
    }
    
    /**
     * TAINT ANALYZER RECREATION
     * 
     * If sensitivity changed, recreates TaintAnalyzer with new sensitivity.
     * This ensures taint analysis uses the correct sensitivity level.
     */
    // Check current TaintAnalyzer sensitivity
    const currentTaintSensitivity = this.taintAnalyzer['sensitivity'];
    LoggingConfig.detail('DataflowAnalyzer', `Current TaintAnalyzer sensitivity: ${currentTaintSensitivity}`);
    LoggingConfig.detail('DataflowAnalyzer', `Sensitivity match check: ${config.taintSensitivity} === ${currentTaintSensitivity} = ${config.taintSensitivity === currentTaintSensitivity}`);
    
    // Recreate TaintAnalyzer with new sensitivity if it changed
    if (config.taintSensitivity !== currentTaintSensitivity) {
      LoggingConfig.log('DataflowAnalyzer', 'Sensitivity changed - recreating TaintAnalyzer');
      LoggingConfig.detail('DataflowAnalyzer', `Old TaintAnalyzer sensitivity: ${currentTaintSensitivity}`);
      LoggingConfig.detail('DataflowAnalyzer', `New TaintAnalyzer sensitivity: ${config.taintSensitivity}`);
      
      this.taintAnalyzer = new TaintAnalyzer(
        undefined,  // sourceRegistry
        undefined,  // sinkRegistry
        undefined,  // sanitizationRegistry
        config.taintSensitivity || TaintSensitivity.PRECISE
      );
      
      // Verify the new TaintAnalyzer has the correct sensitivity
      const newTaintSensitivity = this.taintAnalyzer['sensitivity'];
      LoggingConfig.detail('DataflowAnalyzer', 'New TaintAnalyzer created');
      LoggingConfig.detail('DataflowAnalyzer', `New TaintAnalyzer sensitivity: ${newTaintSensitivity}`);
      LoggingConfig.detail('DataflowAnalyzer', `TaintAnalyzer recreation successful: ${newTaintSensitivity === config.taintSensitivity}`);
      
      if (newTaintSensitivity !== config.taintSensitivity) {
        LoggingConfig.error('DataflowAnalyzer', `TaintAnalyzer sensitivity mismatch! Expected ${config.taintSensitivity}, got ${newTaintSensitivity}`);
      }
    } else {
      LoggingConfig.detail('DataflowAnalyzer', 'Sensitivity unchanged - TaintAnalyzer not recreated');
    }
    
    LoggingConfig.section('DataflowAnalyzer', '========== CONFIG UPDATE COMPLETE ==========');
  }

  getConfig(): AnalysisConfig {
    return this.config;
  }
}

