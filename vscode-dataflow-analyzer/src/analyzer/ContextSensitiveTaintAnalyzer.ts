/**
 * Context-Sensitive Taint Analyzer - Task 14
 * 
 * Improves precision by tracking taint with call-site context.
 * 
 * This module extends inter-procedural taint analysis with:
 * 1. Call-site context: Track taint separately for each call site
 * 2. Path sensitivity: Track taint along specific execution paths
 * 3. Context merging: Merge taint states from multiple call sites
 * 4. K-limited context: Use k=1 or k=2 for scalability
 * 
 * Academic Foundation:
 * - "Interprocedural Dataflow Analysis via Graph Reachability" (Reps, Horwitz, Sagiv, 1995)
 * - "Context-Sensitive Interprocedural Analysis" (Sharir & Pnueli, 1981)
 * - Chapter 9: Inter-Procedural Analysis, "Engineering a Compiler"
 * 
 * Example:
 *   void process(char* input) {
 *     // Process input
 *   }
 *   void main() {
 *     char* user_input = getchar();  // Tainted
 *     char* constant = "safe";       // Not tainted
 *     process(user_input);  // Context 1: tainted argument
 *     process(constant);    // Context 2: safe argument
 *   }
 */

import { FunctionCFG, TaintInfo } from '../types';
import { CallGraph, FunctionCall } from './CallGraphAnalyzer';
import { InterProceduralTaintAnalyzer } from './InterProceduralTaintAnalyzer';
import { LoggingConfig } from '../utils/LoggingConfig';

/**
 * Taint state at a specific call site.
 */
export interface CallSiteTaintState {
  /** Unique identifier for this call site */
  callSiteId: string;
  
  /** Caller function name */
  callerName: string;
  
  /** Callee function name */
  calleeName: string;
  
  /** Taint information for each argument (by index) */
  arguments: Map<number, TaintInfo[]>;
  
  /** Taint information for return value */
  returnValueTaint: TaintInfo[];
  
  /** Global variable taint at this call site */
  globalTaint: Map<string, TaintInfo[]>;
  
  /** Call stack context (for k-limited context) */
  callStack: string[];
}

/**
 * Context-sensitive taint analyzer.
 * 
 * Tracks taint with call-site context to improve precision and reduce false positives.
 */
export class ContextSensitiveTaintAnalyzer {
  private callGraph: CallGraph;
  private cfgFunctions: Map<string, FunctionCFG>;
  private contextSize: number;  // k-limited context (k=1 or k=2)
  private callSiteStates: Map<string, CallSiteTaintState>;
  private interProceduralAnalyzer: InterProceduralTaintAnalyzer;
  
  constructor(
    callGraph: CallGraph,
    cfgFunctions: Map<string, FunctionCFG>,
    intraProceduralTaint: Map<string, Map<string, TaintInfo[]>>,
    contextSize: number = 2
  ) {
    this.callGraph = callGraph;
    this.cfgFunctions = cfgFunctions;
    this.contextSize = contextSize;
    this.callSiteStates = new Map();
    
    // Initialize inter-procedural analyzer (will be enhanced with context sensitivity)
    this.interProceduralAnalyzer = new InterProceduralTaintAnalyzer(
      callGraph,
      cfgFunctions,
      intraProceduralTaint
    );
  }
  
  /**
   * Build context identifier from call stack.
   * 
   * Uses k-limited context: only keep the last k functions in the call stack.
   * 
   * @param callStack - Current call stack
   * @returns Context identifier string
   */
  buildContext(callStack: string[]): string[] {
    if (callStack.length > this.contextSize) {
      return callStack.slice(-this.contextSize);
    }
    return [...callStack];
  }
  
  /**
   * Generate context ID from context array.
   * 
   * @param context - Context array (call stack)
   * @returns Context ID string
   */
  contextId(context: string[]): string {
    return context.join(' -> ');
  }
  
  /**
   * Perform context-sensitive taint analysis.
   * 
   * Uses a worklist algorithm to propagate taint with call-site context:
   * 1. For each call site, build context from call stack
   * 2. Track taint separately for each context
   * 3. Merge contexts when necessary
   * 4. Handle recursion with context limits
   * 
   * @returns Updated taint map with context-sensitive information
   */
  analyze(): Map<string, Map<string, TaintInfo[]>> {
    LoggingConfig.log('ContextSensitiveTaint', '[ContextSensitiveTaint] Starting context-sensitive taint analysis...');
    LoggingConfig.log('ContextSensitiveTaint', `[ContextSensitiveTaint] Context size (k): ${this.contextSize}`);
    
    // First, run inter-procedural analysis to get base taint information
    const baseTaint = this.interProceduralAnalyzer.analyze();
    
    // Then, enhance with context sensitivity
    const contextSensitiveTaint = this.enhanceWithContext(baseTaint);
    
    LoggingConfig.log('ContextSensitiveTaint', '[ContextSensitiveTaint] Context-sensitive taint analysis complete');
    
    return contextSensitiveTaint;
  }
  
  /**
   * Enhance base taint analysis with context sensitivity.
   * 
   * Uses a worklist algorithm to propagate taint with call-site context:
   * 1. For each call site, build context from call stack
   * 2. Track taint separately for each context
   * 3. Propagate taint through callee with context
   * 4. Merge contexts when necessary
   * 
   * @param baseTaint - Base inter-procedural taint map
   * @returns Context-sensitive taint map
   */
  private enhanceWithContext(
    baseTaint: Map<string, Map<string, TaintInfo[]>>
  ): Map<string, Map<string, TaintInfo[]>> {
    const contextSensitiveTaint = new Map<string, Map<string, TaintInfo[]>>();
    
    // Initialize with base taint
    baseTaint.forEach((blockTaint, funcName) => {
      contextSensitiveTaint.set(funcName, new Map(blockTaint));
    });
    
    // Track taint by context: funcName -> contextId -> blockId -> TaintInfo[]
    const taintByContext = new Map<string, Map<string, Map<string, TaintInfo[]>>>();
    
    // Process each call site with context using worklist algorithm
    const callsFrom = this.callGraph.callsFrom instanceof Map
      ? this.callGraph.callsFrom
      : new Map(Object.entries(this.callGraph.callsFrom));
    
    const worklist = new Set<string>(); // Set of callSiteIds to process
    
    // Initialize worklist with all call sites
    callsFrom.forEach((calls: any, callerName: string) => {
      if (!Array.isArray(calls)) return;
      calls.forEach((call: FunctionCall) => {
        const callSiteId = `${callerName}_${call.callSite.blockId}_${call.callSite.statementId}`;
        worklist.add(callSiteId);
      });
    });
    
    let iteration = 0;
    const MAX_ITERATIONS = 10;
    
    while (worklist.size > 0 && iteration < MAX_ITERATIONS) {
      iteration++;
      const currentWorklist = Array.from(worklist);
      worklist.clear();
      
      for (const callSiteId of currentWorklist) {
        // Find the call for this callSiteId
        let foundCall: FunctionCall | null = null;
        let foundCaller: string = '';
        
        callsFrom.forEach((calls: any, callerName: string) => {
          if (!Array.isArray(calls)) return;
          calls.forEach((call: FunctionCall) => {
            const id = `${callerName}_${call.callSite.blockId}_${call.callSite.statementId}`;
            if (id === callSiteId) {
              foundCall = call;
              foundCaller = callerName;
            }
          });
        });
        
        if (!foundCall || !foundCaller) continue;
        
        const call: FunctionCall = foundCall;
        const callerName: string = foundCaller;
        const calleeName: string = call.calleeId;
        
        // Build context for this call site
        const context = this.buildContext([callerName]);
        const contextId = this.contextId(context);
        
        // Get taint state at this call site
        const callSiteState = this.getCallSiteTaintState(call, callerName, context);
        
        // Store call site state
        this.callSiteStates.set(callSiteId, callSiteState);
        
        // Propagate taint to callee with context
        if (callSiteState.arguments.size > 0) {
          const calleeCFG = this.cfgFunctions.get(calleeName);
          if (calleeCFG) {
            // Initialize context map for callee if needed
            if (!taintByContext.has(calleeName)) {
              taintByContext.set(calleeName, new Map());
            }
            const calleeContextMap = taintByContext.get(calleeName)!;
            
            if (!calleeContextMap.has(contextId)) {
              calleeContextMap.set(contextId, new Map());
            }
            const calleeTaintMap = calleeContextMap.get(contextId)!;
            
            // Map tainted arguments to formal parameters
            const calleeMetadata = this.callGraph.functions.get(calleeName);
            if (calleeMetadata && calleeMetadata.parameters) {
              callSiteState.arguments.forEach((taintInfos, argIndex) => {
                if (argIndex < calleeMetadata.parameters.length) {
                  const formalParam = calleeMetadata.parameters[argIndex].name;
                  const entryBlockId = calleeCFG.entry;
                  
                  if (!calleeTaintMap.has(entryBlockId)) {
                    calleeTaintMap.set(entryBlockId, []);
                  }
                  
                  // Add taint for formal parameter with context
                  taintInfos.forEach(taintInfo => {
                    const contextTaint: TaintInfo = {
                      ...taintInfo,
                      variable: formalParam,
                      source: `parameter:${formalParam}`,
                      propagationPath: [...taintInfo.propagationPath, `${calleeName}:Entry`],
                      sourceFunction: callerName
                    };
                    
                    const existing = calleeTaintMap.get(entryBlockId)!;
                    // Check for duplicates
                    const exists = existing.some(t => 
                      t.variable === contextTaint.variable && 
                      t.source === contextTaint.source &&
                      t.sourceFunction === contextTaint.sourceFunction
                    );
                    
                    if (!exists) {
                      existing.push(contextTaint);
                      worklist.add(callSiteId); // Re-process if new taint added
                    }
                  });
                }
              });
            }
            
            // Merge context-specific taint into main taint map
            calleeTaintMap.forEach((taintInfos, blockId) => {
              if (!contextSensitiveTaint.has(calleeName)) {
                contextSensitiveTaint.set(calleeName, new Map());
              }
              const funcTaint = contextSensitiveTaint.get(calleeName)!;
              
              if (!funcTaint.has(blockId)) {
                funcTaint.set(blockId, []);
              }
              
              const blockTaint = funcTaint.get(blockId)!;
              taintInfos.forEach(taint => {
                const exists = blockTaint.some(t => 
                  t.variable === taint.variable && 
                  t.source === taint.source &&
                  t.sourceFunction === taint.sourceFunction
                );
                if (!exists) {
                  blockTaint.push(taint);
                }
              });
            });
          }
        }
        
        LoggingConfig.log('ContextSensitiveTaint', `[ContextSensitiveTaint] Call site ${callSiteId} (context: ${contextId}):`, {
          argumentTaintCount: callSiteState.arguments.size,
          returnValueTaintCount: callSiteState.returnValueTaint.length,
          globalTaintCount: callSiteState.globalTaint.size
        });
      }
    }
    
    if (iteration >= MAX_ITERATIONS) {
      LoggingConfig.warn('ContextSensitiveTaint', 'WARNING: Reached MAX_ITERATIONS limit');
    }
    
    LoggingConfig.log('ContextSensitiveTaint', `[ContextSensitiveTaint] Context-sensitive enhancement complete after ${iteration} iterations`);
    
    return contextSensitiveTaint;
  }
  
  /**
   * Get taint state at a specific call site.
   * 
   * @param call - Function call information
   * @param callerName - Name of calling function
   * @param context - Call stack context
   * @returns Call site taint state
   */
  private getCallSiteTaintState(
    call: FunctionCall,
    callerName: string,
    context: string[]
  ): CallSiteTaintState {
    const callerCFG = this.cfgFunctions.get(callerName);
    if (!callerCFG) {
      return {
        callSiteId: `${callerName}_${call.callSite.blockId}_${call.callSite.statementId}`,
        callerName,
        calleeName: call.calleeId,
        arguments: new Map(),
        returnValueTaint: [],
        globalTaint: new Map(),
        callStack: context
      };
    }
    
    // Get taint at call site block
    const callerTaint = this.interProceduralAnalyzer['interProceduralTaint'].get(callerName);
    const callSiteBlockTaint = callerTaint?.get(call.callSite.blockId) || [];
    
    // Map argument taint by index
    const argumentTaint = new Map<number, TaintInfo[]>();
    call.arguments.actual.forEach((arg: string, index: number) => {
      // Check if this argument is tainted
      const argTaint = callSiteBlockTaint.filter((t: TaintInfo) => 
        t.variable === arg || arg.includes(t.variable)
      );
      if (argTaint.length > 0) {
        argumentTaint.set(index, argTaint);
      }
    });
    
    // Get return value taint (if any)
    const returnValueTaint: TaintInfo[] = callSiteBlockTaint.filter((t: TaintInfo) =>
      t.variable.startsWith(`return_${call.calleeId}`)
    );
    
    // Get global variable taint
    const globalTaint = new Map<string, TaintInfo[]>();
    // TODO: Track global variable taint
    
    return {
      callSiteId: `${callerName}_${call.callSite.blockId}_${call.callSite.statementId}`,
      callerName,
      calleeName: call.calleeId,
      arguments: argumentTaint,
      returnValueTaint,
      globalTaint,
      callStack: context
    };
  }
  
  /**
   * Merge taint states from multiple call sites.
   * 
   * Used when the same function is called from multiple contexts.
   * 
   * @param states - Array of call site taint states
   * @returns Merged taint state
   */
  mergeCallSiteStates(states: CallSiteTaintState[]): CallSiteTaintState {
    if (states.length === 0) {
      throw new Error('Cannot merge empty state array');
    }
    
    const merged: CallSiteTaintState = {
      callSiteId: states[0].callSiteId,
      callerName: states[0].callerName,
      calleeName: states[0].calleeName,
      arguments: new Map(),
      returnValueTaint: [],
      globalTaint: new Map(),
      callStack: states[0].callStack
    };
    
    // Merge argument taint
    states.forEach(state => {
      state.arguments.forEach((taintInfos, index) => {
        const existing = merged.arguments.get(index) || [];
        merged.arguments.set(index, [...existing, ...taintInfos]);
      });
      
      // Merge return value taint
      merged.returnValueTaint.push(...state.returnValueTaint);
      
      // Merge global taint
      state.globalTaint.forEach((taintInfos, varName) => {
        const existing = merged.globalTaint.get(varName) || [];
        merged.globalTaint.set(varName, [...existing, ...taintInfos]);
      });
    });
    
    return merged;
  }
  
  /**
   * Get call site states for a specific function.
   * 
   * @param functionName - Function name
   * @returns Array of call site states
   */
  getCallSiteStates(functionName: string): CallSiteTaintState[] {
    return Array.from(this.callSiteStates.values()).filter(
      state => state.calleeName === functionName
    );
  }
}

