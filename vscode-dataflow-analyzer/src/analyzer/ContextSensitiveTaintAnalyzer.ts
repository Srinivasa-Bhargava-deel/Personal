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
import { ParameterAnalyzer, ArgumentDerivationType } from './ParameterAnalyzer';
import { ReturnValueAnalyzer, ReturnValueInfo } from './ReturnValueAnalyzer';
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
  async analyze(): Promise<Map<string, Map<string, TaintInfo[]>>> {
    LoggingConfig.log('ContextSensitiveTaint', '[ContextSensitiveTaint] Starting context-sensitive taint analysis...');
    LoggingConfig.log('ContextSensitiveTaint', `[ContextSensitiveTaint] Context size (k): ${this.contextSize}`);
    
    // First, run inter-procedural analysis to get base taint information
    const baseTaint = this.interProceduralAnalyzer.analyze();
    
    // Then, enhance with context sensitivity
    const contextSensitiveTaint = await this.enhanceWithContext(baseTaint);
    
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
  private async enhanceWithContext(
    baseTaint: Map<string, Map<string, TaintInfo[]>>
  ): Promise<Map<string, Map<string, TaintInfo[]>>> {
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
        
        // Build context for this call site - track full call stack
        // CRITICAL FIX: Track call stack through recursive calls for proper k-limited context
        const existingCallSiteState = this.callSiteStates.get(callSiteId);
        let callStack = existingCallSiteState?.callStack || [callerName];
        
        // Extend call stack with callee (for recursive calls, this creates deeper context)
        // The k-limit in buildContext() will truncate if needed
        callStack = [...callStack, calleeName];
        
        const context = this.buildContext(callStack);
        const contextId = this.contextId(context);
        
        // Get taint state at this call site
        const callSiteState = this.getCallSiteTaintState(call, callerName, context);
        
        // Update call site state with new call stack
        callSiteState.callStack = callStack;
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
            
            // CRITICAL FIX: Propagate return value taint back to caller
            // Get callee's return value taint from context-sensitive analysis
            const calleeTaint = contextSensitiveTaint.get(calleeName);
            if (calleeTaint) {
              // Find return statements in callee
              const calleeCFG = this.cfgFunctions.get(calleeName);
              if (calleeCFG) {
                const returnValueAnalyzer = new ReturnValueAnalyzer();
                const returnInfos = returnValueAnalyzer.analyzeReturns(calleeCFG);
                
                // For each return statement, check if return value is tainted
                returnInfos.forEach((returnInfo: ReturnValueInfo) => {
                  const returnBlockTaint = calleeTaint.get(returnInfo.blockId) || [];
                  const entryBlockTaint = calleeCFG.entry !== returnInfo.blockId
                    ? (calleeTaint.get(calleeCFG.entry) || [])
                    : [];
                  const combinedReturnTaint = [...entryBlockTaint, ...returnBlockTaint];
                  
                  // Check if variables used in return are tainted
                  const taintedVarsInReturn = returnInfo.usedVariables.filter((varName: string) =>
                    combinedReturnTaint.some(taint => taint.variable === varName)
                  );
                  
                  if (taintedVarsInReturn.length > 0) {
                    // Propagate return value taint back to caller
                    if (!contextSensitiveTaint.has(callerName)) {
                      contextSensitiveTaint.set(callerName, new Map());
                    }
                    const callerTaint = contextSensitiveTaint.get(callerName)!;
                    const callerBlockId = call.callSite.blockId;
                    
                    if (!callerTaint.has(callerBlockId)) {
                      callerTaint.set(callerBlockId, []);
                    }
                    
                    const callerBlockTaint = callerTaint.get(callerBlockId)!;
                    const returnSourceCategory = combinedReturnTaint.find(t =>
                      taintedVarsInReturn.includes(t.variable)
                    )?.sourceCategory || 'user_input';
                    
                    const returnValueTaint: TaintInfo = {
                      variable: `return_${calleeName}`,
                      source: `return_value:${calleeName}`,
                      tainted: true,
                      sourceCategory: returnSourceCategory,
                      taintType: combinedReturnTaint.find(t =>
                        taintedVarsInReturn.includes(t.variable)
                      )?.taintType || 'string',
                      sourceFunction: calleeName,
                      propagationPath: [...context, calleeName],
                      sourceLocation: {
                        blockId: callerBlockId,
                        statementId: call.callSite.statementId
                      },
                      labels: []
                    };
                    
                    const exists = callerBlockTaint.some(t =>
                      t.variable === returnValueTaint.variable &&
                      t.source === returnValueTaint.source
                    );
                    
                    if (!exists) {
                      callerBlockTaint.push(returnValueTaint);
                      worklist.add(callSiteId); // Re-process if new taint added
                    }
                  }
                });
              }
            }
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
    
    // Get taint at call site block using public method
    const callerTaint = this.interProceduralAnalyzer.getTaintForFunction(callerName);
    const callSiteBlockTaint = callerTaint?.get(call.callSite.blockId) || [];
    
    // CRITICAL FIX: Also check entry block for parameter taint (like in InterProceduralTaintAnalyzer)
    const entryBlockTaint = callerCFG.entry !== call.callSite.blockId
      ? (callerTaint?.get(callerCFG.entry) || [])
      : [];
    const combinedCallSiteTaint = [...entryBlockTaint, ...callSiteBlockTaint];
    
    // Map argument taint by index using ParameterAnalyzer for proper derivation analysis
    const argumentTaint = new Map<number, TaintInfo[]>();
    const paramAnalyzer = new ParameterAnalyzer();
    
    call.arguments.actual.forEach((arg: string, index: number) => {
      // Extract variables from argument expression (e.g., "input", "n - 1" -> ["n"])
      const derivation = paramAnalyzer.analyzeArgumentDerivation(arg);
      const varsToCheck = new Set<string>([derivation.base, ...derivation.usedVariables]);
      
      // Check if any variable in the argument is tainted
      const argTaint = combinedCallSiteTaint.filter((t: TaintInfo) => 
        varsToCheck.has(t.variable) || arg.includes(t.variable)
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

