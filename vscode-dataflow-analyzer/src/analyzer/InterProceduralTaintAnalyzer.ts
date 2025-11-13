/**
 * InterProceduralTaintAnalyzer.ts
 * 
 * Inter-Procedural Taint Analyzer - Cross-Function Taint Propagation
 * 
 * PURPOSE:
 * Extends intra-procedural taint analysis to track taint flow across function boundaries.
 * Handles parameter taint mapping, return value taint propagation, and library function
 * taint summaries. This enables detection of vulnerabilities that span multiple functions.
 * 
 * SIGNIFICANCE IN OVERALL FLOW:
 * This analyzer runs in the inter-procedural analysis phase in DataflowAnalyzer, after
 * the call graph is built. It extends the taint analysis results from TaintAnalyzer by
 * propagating taint across function calls. Its results are critical for detecting
 * inter-procedural vulnerabilities and are visualized in CFGVisualizer's Inter-Procedural
 * Taint tab.
 * 
 * DATA FLOW:
 * INPUTS:
 *   - CallGraph object (from CallGraphAnalyzer.ts) containing function call relationships
 *   - Map<string, FunctionCFG> (from DataflowAnalyzer.ts) containing all function CFGs
 *   - Map<string, Map<string, TaintInfo[]>> (from TaintAnalyzer.ts) containing intra-procedural
 *     taint results organized by function and block
 * 
 * PROCESSING:
 *   1. Processes function calls in worklist order:
 *      - Checks if actual arguments are tainted (using ParameterAnalyzer)
 *      - Maps taint from actual arguments to formal parameters
 *      - Propagates taint within callee function
 *   2. Processes return value taint:
 *      - Checks if variables used in return statement are tainted
 *      - Propagates return value taint back to caller
 *      - Tracks return value assignments (e.g., result = function())
 *   3. Processes library functions:
 *      - Uses TaintSummary models for library functions (strcpy, memcpy, etc.)
 *      - Applies taint summaries to propagate taint through library calls
 *   4. Iterates until fixed point (no new taint added)
 * 
 * OUTPUTS:
 *   - Map<string, Map<string, TaintInfo[]>> where:
 *     - Outer key: function name
 *     - Inner key: block ID
 *     - Value: Array of TaintInfo objects (including parameter taint, return value taint)
 *   - Inter-procedural taint results -> DataflowAnalyzer.ts (merged into AnalysisState)
 *   - Inter-procedural taint results -> ContextSensitiveTaintAnalyzer.ts (for context-sensitive enhancement)
 *   - Inter-procedural taint results -> CFGVisualizer.ts (for Inter-Procedural Taint tab visualization)
 * 
 * DEPENDENCIES:
 *   - types.ts: FunctionCFG, TaintInfo, TaintLabel
 *   - CallGraphAnalyzer.ts: CallGraph, FunctionCall
 *   - ParameterAnalyzer.ts: Parameter mapping and argument derivation analysis
 *   - ReturnValueAnalyzer.ts: Return value extraction and tracking
 *   - LoggingConfig.ts: Centralized logging
 * 
 * EXTENDS INTRA-PROCEDURAL TAINT ANALYSIS TO HANDLE:
 * 1. Parameter taint mapping: When calling f(tainted_arg), mark formal parameter as tainted
 * 2. Return value taint: If callee returns tainted data, mark return value as tainted
 * 3. Global variable taint: Propagate global taint across function boundaries
 * 4. Taint summaries: Pre-defined models for library functions (e.g., strcpy)
 * 
 * EXAMPLE:
 *   void process(char* input) {  // input is tainted (parameter taint)
 *     char buffer[100];
 *     strcpy(buffer, input);     // buffer becomes tainted
 *     return buffer;             // return value is tainted
 *   }
 *   void main() {
 *     char* user_input = getchar();  // user_input is tainted (intra-procedural)
 *     char* result = process(user_input);  // result is tainted (inter-procedural)
 *   }
 * 
 * ACADEMIC FOUNDATION:
 * - "Interprocedural Dataflow Analysis" (Reps, Horwitz, Sagiv, 1995)
 * - "Flow-Sensitive Pointer Analysis" (Reps, Horwitz, Sagiv, 1995)
 * - Chapter 9: Inter-Procedural Analysis, "Engineering a Compiler"
 */

import { FunctionCFG, TaintInfo, TaintLabel } from '../types';
import { CallGraphAnalyzer, FunctionCall, CallGraph } from './CallGraphAnalyzer';
import { ParameterAnalyzer, ParameterMapping, ArgumentDerivationType } from './ParameterAnalyzer';
import { ReturnValueAnalyzer, ReturnValueInfo } from './ReturnValueAnalyzer';
import { LoggingConfig } from '../utils/LoggingConfig';

/**
 * Taint summary for a library function.
 * Describes how taint flows through the function.
 */
export interface TaintSummary {
  /** Function name */
  functionName: string;
  
  /** Parameter indices that are taint sources (0-indexed) */
  taintSources: number[];
  
  /** Parameter indices that become tainted if sources are tainted */
  taintSinks: number[];
  
  /** Whether return value is tainted if any source is tainted */
  returnValueTainted: boolean;
  
  /** Description of taint behavior */
  description: string;
}

/**
 * Pre-defined taint summaries for common C library functions.
 */
const DEFAULT_TAINT_SUMMARIES: Map<string, TaintSummary> = new Map([
  // String functions
  ['strcpy', {
    functionName: 'strcpy',
    taintSources: [1],  // src parameter
    taintSinks: [0],    // dest parameter
    returnValueTainted: false,
    description: 'strcpy(dest, src): dest is tainted if src is tainted'
  }],
  ['strncpy', {
    functionName: 'strncpy',
    taintSources: [1],
    taintSinks: [0],
    returnValueTainted: false,
    description: 'strncpy(dest, src, n): dest is tainted if src is tainted'
  }],
  ['strcat', {
    functionName: 'strcat',
    taintSources: [1],
    taintSinks: [0],
    returnValueTainted: false,
    description: 'strcat(dest, src): dest is tainted if src is tainted'
  }],
  ['sprintf', {
    functionName: 'sprintf',
    taintSources: [1],  // format string and subsequent args
    taintSinks: [0],
    returnValueTainted: false,
    description: 'sprintf(dest, format, ...): dest is tainted if format or args are tainted'
  }],
  ['snprintf', {
    functionName: 'snprintf',
    taintSources: [2],  // format string
    taintSinks: [0],
    returnValueTainted: false,
    description: 'snprintf(dest, size, format, ...): dest is tainted if format is tainted'
  }],
  
  // Memory functions
  ['memcpy', {
    functionName: 'memcpy',
    taintSources: [1],
    taintSinks: [0],
    returnValueTainted: false,
    description: 'memcpy(dest, src, n): dest is tainted if src is tainted'
  }],
  ['memmove', {
    functionName: 'memmove',
    taintSources: [1],
    taintSinks: [0],
    returnValueTainted: false,
    description: 'memmove(dest, src, n): dest is tainted if src is tainted'
  }],
  
  // Return value functions
  ['strdup', {
    functionName: 'strdup',
    taintSources: [0],
    taintSinks: [],
    returnValueTainted: true,
    description: 'strdup(src): return value is tainted if src is tainted'
  }],
  ['strndup', {
    functionName: 'strndup',
    taintSources: [0],
    taintSinks: [],
    returnValueTainted: true,
    description: 'strndup(src, n): return value is tainted if src is tainted'
  }]
]);

/**
 * Inter-procedural taint analyzer.
 * 
 * Analyzes taint flow across function boundaries by:
 * 1. Identifying function calls with tainted arguments
 * 2. Mapping tainted actual arguments to formal parameters
 * 3. Propagating taint within callee functions
 * 4. Tracking taint in return values
 * 5. Handling global variable taint
 */
export class InterProceduralTaintAnalyzer {
  private callGraph: CallGraph;
  private cfgFunctions: Map<string, FunctionCFG>;
  private intraProceduralTaint: Map<string, Map<string, TaintInfo[]>>;  // funcName -> blockId -> taint info
  private parameterAnalyzer: ParameterAnalyzer;
  private returnValueAnalyzer: ReturnValueAnalyzer;
  private taintSummaries: Map<string, TaintSummary>;
  
  /**
   * Global variable taint tracking.
   * Maps global variable names to their taint information.
   */
  private globalTaint: Map<string, TaintInfo[]>;
  
  /**
   * Inter-procedural taint map.
   * Maps function names to their inter-procedural taint information.
   */
  private interProceduralTaint: Map<string, Map<string, TaintInfo[]>>;  // funcName -> blockId -> taint info
  
  constructor(
    callGraph: CallGraph,
    cfgFunctions: Map<string, FunctionCFG>,
    intraProceduralTaint: Map<string, Map<string, TaintInfo[]>>,
    taintSummaries?: Map<string, TaintSummary>
  ) {
    this.callGraph = callGraph;
    this.cfgFunctions = cfgFunctions;
    this.intraProceduralTaint = intraProceduralTaint;
    this.parameterAnalyzer = new ParameterAnalyzer();
    this.returnValueAnalyzer = new ReturnValueAnalyzer();
    this.taintSummaries = taintSummaries || DEFAULT_TAINT_SUMMARIES;
    this.globalTaint = new Map();
    this.interProceduralTaint = new Map();
    
    // Initialize inter-procedural taint map with intra-procedural taint
    intraProceduralTaint.forEach((blockTaint, funcName) => {
      this.interProceduralTaint.set(funcName, new Map(blockTaint));
    });
  }
  
  /**
   * Get inter-procedural taint for a specific function.
   * 
   * Public method for accessing taint information by function name.
   * Used by context-sensitive analysis.
   * 
   * @param functionName - Function name
   * @returns Map from block ID to taint info array, or undefined if function not found
   */
  getTaintForFunction(functionName: string): Map<string, TaintInfo[]> | undefined {
    return this.interProceduralTaint.get(functionName);
  }
  
  /**
   * Perform inter-procedural taint analysis.
   * 
   * Uses a worklist algorithm to propagate taint across function boundaries:
   * 1. Start with intra-procedural taint information
   * 2. For each function call, check if arguments are tainted
   * 3. Map tainted arguments to formal parameters
   * 4. Propagate taint within callee function
   * 5. Track return value taint back to caller
   * 6. Handle global variable taint
   * 
   * @returns Updated taint map with inter-procedural taint information
   */
  analyze(): Map<string, Map<string, TaintInfo[]>> {
    LoggingConfig.log('InterProceduralTaint', '[InterProceduralTaint] Starting inter-procedural taint analysis...');
    
    // Worklist: functions that need to be re-analyzed due to new taint information
    const worklist = new Set<string>();
    
    // Initialize worklist with all functions that have intra-procedural taint
    this.intraProceduralTaint.forEach((_, funcName) => {
      worklist.add(funcName);
    });
    
    let iteration = 0;
    const MAX_ITERATIONS = 10;  // Safety limit
    
    while (worklist.size > 0 && iteration < MAX_ITERATIONS) {
      iteration++;
      LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] Iteration ${iteration}, worklist size: ${worklist.size}`);
      
      const currentWorklist = Array.from(worklist);
      worklist.clear();
      
      LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] Processing worklist: ${currentWorklist.join(', ')}`);
      
      // Process each function in the worklist
      for (const callerName of currentWorklist) {
        const callerCFG = this.cfgFunctions.get(callerName);
        if (!callerCFG) {
          LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] Skipping ${callerName}: no CFG`);
          continue;
        }
        
        // Get calls from this function
        const callsFrom = this.callGraph.callsFrom instanceof Map
          ? this.callGraph.callsFrom.get(callerName) || []
          : (this.callGraph.callsFrom as any)[callerName] || [];
        
        LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] ${callerName} calls ${callsFrom.length} functions`);
        
        for (const call of callsFrom) {
          const calleeName = call.calleeId;
          
          LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] Processing call: ${callerName} -> ${calleeName}`);
          
          // Skip external functions (handled by taint summaries)
          if (!this.cfgFunctions.has(calleeName)) {
            LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] ${calleeName} is external/library function, processing with summaries`);
            this.processLibraryFunction(call, callerName);
            continue;
          }
          
          // Process inter-procedural taint for this call
          const updated = this.processFunctionCall(call, callerName, calleeName);
          
          LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] Call ${callerName} -> ${calleeName} processed, updated=${updated}`);
          
          if (updated) {
            // Add callee to worklist if it was updated
            worklist.add(calleeName);
            
            // Add all callers of callee to worklist (taint may flow back)
            const callersOfCallee = this.callGraph.callsTo instanceof Map
              ? this.callGraph.callsTo.get(calleeName) || []
              : (this.callGraph.callsTo as any)[calleeName] || [];
            
            callersOfCallee.forEach((caller: string) => {
              worklist.add(caller);
            });
          }
        }
      }
    }
    
    if (iteration >= MAX_ITERATIONS) {
      LoggingConfig.warn('InterProceduralTaint', 'WARNING: Reached MAX_ITERATIONS limit');
    }
    
    LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] Inter-procedural taint analysis complete after ${iteration} iterations`);
    
    return this.interProceduralTaint;
  }
  
  /**
   * Process a function call to propagate taint across function boundaries.
   * 
   * @param call - Function call information
   * @param callerName - Name of calling function
   * @param calleeName - Name of called function
   * @returns true if taint information was updated
   */
  private processFunctionCall(
    call: FunctionCall,
    callerName: string,
    calleeName: string
  ): boolean {
    const callerCFG = this.cfgFunctions.get(callerName);
    const calleeCFG = this.cfgFunctions.get(calleeName);
    
    if (!callerCFG || !calleeCFG) {
      LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] processFunctionCall: Missing CFG for ${callerName} -> ${calleeName}`);
      return false;
    }
    
    // Get taint information for the caller at the call site block
    const callerBlockId = call.callSite.blockId;
    const callerTaint = this.interProceduralTaint.get(callerName);
    if (!callerTaint) {
      LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] processFunctionCall: No caller taint for ${callerName} -> ${calleeName}`);
      return false;
    }
    
    // Get taint from call site block
    const callerBlockTaint = callerTaint.get(callerBlockId) || [];
    
    // Also check entry block taint - parameters are tainted at entry block
    // This is needed for arithmetic expressions like "n - 1" where n is tainted in entry block
    const entryBlockTaint = callerCFG.entry !== callerBlockId 
      ? (callerTaint.get(callerCFG.entry) || [])
      : [];
    
    // Combine taint from both blocks (entry block takes priority for parameter taint)
    const combinedCallerTaint = [...entryBlockTaint, ...callerBlockTaint];
    
    if (combinedCallerTaint.length === 0) {
      LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] processFunctionCall: No taint at block ${callerBlockId} or entry block ${callerCFG.entry} for ${callerName} -> ${calleeName}`);
      // Don't return false - we might still need to process return value taint
    } else {
      LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] processFunctionCall: ${callerName} -> ${calleeName} at block ${callerBlockId}, callerBlockTaint count: ${callerBlockTaint.length}, entryBlockTaint count: ${entryBlockTaint.length}, combined: ${combinedCallerTaint.length}`);
      LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] Caller block taint variables: ${callerBlockTaint.map(t => t.variable).join(', ')}`);
      if (entryBlockTaint.length > 0) {
        LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] Entry block taint variables: ${entryBlockTaint.map(t => t.variable).join(', ')}`);
      }
    }
    
    // Get parameter mappings
    const calleeMetadata = this.callGraph.functions.get(calleeName);
    if (!calleeMetadata) {
      LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] processFunctionCall: No metadata for ${calleeName}`);
      return false;
    }
    
    const paramMappings = this.parameterAnalyzer.mapParametersWithDerivation(call, calleeMetadata);
    
    LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] Parameter mappings for ${callerName} -> ${calleeName}: ${paramMappings.length}`);
    paramMappings.forEach((m, idx) => {
      LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint]   Mapping ${idx}: actualArg="${m.actualArg}" -> formalParam="${m.formalParam}"`);
    });
    
    let updated = false;
    
    // Step 1: Map tainted actual arguments to formal parameters
    for (const mapping of paramMappings) {
      const actualArg = mapping.actualArg;
      const formalParam = mapping.formalParam;
      const derivation = mapping.derivation;
      
      // Check if actual argument is tainted in caller
      // Use the base variable from derivation analysis (e.g., "n" from "n - 1")
      // Also check all variables used in the expression
      const variablesToCheck = new Set<string>();
      
      // Add base variable (e.g., "n" from "n - 1")
      if (derivation.base) {
        variablesToCheck.add(derivation.base);
      }
      
      // Add all variables used in the expression
      if (derivation.usedVariables && derivation.usedVariables.length > 0) {
        derivation.usedVariables.forEach(v => variablesToCheck.add(v));
      }
      
      // Fallback: try to extract variable from actualArg if derivation doesn't have it
      if (variablesToCheck.size === 0) {
        const simpleVarMatch = actualArg.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*$/);
        if (simpleVarMatch) {
          variablesToCheck.add(simpleVarMatch[1]);
        }
      }
      
      // Check if any of these variables are tainted
          const isTainted = Array.from(variablesToCheck).some(varName =>
            combinedCallerTaint.some(taint => taint.variable === varName)
          );
      
      LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] Checking taint for actualArg="${actualArg}" -> formalParam="${formalParam}": isTainted=${isTainted}, base="${derivation.base}", varsToCheck=[${Array.from(variablesToCheck).join(', ')}]`);
      
      if (isTainted) {
        // Find the taint info for the variable that's actually tainted
        const sourceTaint = combinedCallerTaint.find(t => 
          variablesToCheck.has(t.variable)
        ) || combinedCallerTaint[0];
        
        // Mark formal parameter as tainted in callee's entry block
        const paramTaintTemplate: TaintInfo = {
          ...sourceTaint,
          variable: formalParam,
          source: `parameter:${formalParam}`,
          tainted: true,
          sourceCategory: sourceTaint.sourceCategory || 'user_input', // Inherit from caller
          taintType: sourceTaint.taintType || 'string',
          sourceFunction: callerName,
          propagationPath: [...(sourceTaint.propagationPath || []), calleeName],
          labels: sourceTaint.labels || [TaintLabel.DERIVED],
          sourceLocation: {
            blockId: calleeCFG.entry
          }
        };
        
        const wasAdded = this.addTaintToBlock(
          calleeName,
          calleeCFG.entry,
          formalParam,
          `parameter:${formalParam}`,
          paramTaintTemplate
        );
        updated = wasAdded || updated;
        LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] Added parameter taint: ${calleeName}.${formalParam} from ${callerName}.${actualArg}, wasAdded=${wasAdded}`);
      }
    }
    
    // Step 2: Process return value taint
    const returnValueInfo = this.returnValueAnalyzer.analyzeReturns(calleeCFG);
    const calleeTaint = this.interProceduralTaint.get(calleeName);
    
    LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] Processing return value taint: ${calleeName} has ${returnValueInfo.length} return statements, calleeTaint exists: ${!!calleeTaint}`);
    
    if (calleeTaint && returnValueInfo.length > 0) {
      for (const returnInfo of returnValueInfo) {
        const returnBlockTaint = calleeTaint.get(returnInfo.blockId) || [];
        // CRITICAL FIX: Also check entry block for parameter taint (e.g., x in helper_function)
        const entryBlockTaint = calleeCFG.entry !== returnInfo.blockId
          ? (calleeTaint.get(calleeCFG.entry) || [])
          : [];
        const combinedReturnTaint = [...entryBlockTaint, ...returnBlockTaint];
        
        LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] Return block ${returnInfo.blockId} taint count: ${returnBlockTaint.length}, entry block taint: ${entryBlockTaint.length}, combined: ${combinedReturnTaint.length}, usedVariables: ${returnInfo.usedVariables.join(', ')}`);
        
        if (combinedReturnTaint.length > 0) {
          // Debug: Log what variables are actually in the taint
          const taintVars = combinedReturnTaint.map(t => `${t.variable}(${t.source})`).join(', ');
          LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] Combined return taint variables: ${taintVars}`);
          
          // Check if return value uses tainted variables (check both return block and entry block)
          const taintedVarsInReturn = returnInfo.usedVariables.filter(varName =>
            combinedReturnTaint.some(taint => taint.variable === varName)
          );
          
          LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] Tainted vars in return: ${taintedVarsInReturn.join(', ')}`);
          
          if (taintedVarsInReturn.length > 0) {
            // Return value is tainted - propagate back to caller
            // Find where return value is assigned in caller
            // Get source category from tainted variables in return (use combined taint)
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
              propagationPath: [calleeName, callerName],
              labels: [TaintLabel.DERIVED],
              sourceLocation: {
                blockId: callerBlockId,
                statementId: call.callSite.statementId
              }
            };
            
            // Add taint to caller's block after the call
            // For now, we'll add it to the call site block
            updated = this.addTaintToBlock(
              callerName,
              callerBlockId,
              `return_${calleeName}`,
              returnValueTaint.source,
              returnValueTaint
            ) || updated;
            
            // Also track which variable receives the return value
            // Extract variable name from assignment statement (e.g., "char* user_data = get_user_input();")
            const assignedVariable = this.extractReturnValueVariable(call, callerCFG);
            if (assignedVariable) {
              LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] Found return value assignment: ${assignedVariable} = ${calleeName}()`);
              
              // Create taint for the assigned variable
              const assignedVarTaint: TaintInfo = {
                ...returnValueTaint,
                variable: assignedVariable,
                source: `return_value:${calleeName}->${assignedVariable}`,
                propagationPath: [...returnValueTaint.propagationPath, `${callerName}:${assignedVariable}`]
              };
              
              // Add taint for the assigned variable
              updated = this.addTaintToBlock(
                callerName,
                callerBlockId,
                assignedVariable,
                assignedVarTaint.source,
                assignedVarTaint
              ) || updated;
              
              LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] Added taint for assigned variable: ${callerName}.${assignedVariable} from return value of ${calleeName}`);
            }
          }
        }
      }
    }
    
    return updated;
  }
  
  /**
   * Extract the variable name that receives a return value from a function call.
   * 
   * Example: "char* user_data = get_user_input();" -> "user_data"
   * Example: "int result = process_number(n);" -> "result"
   * 
   * @param call - Function call information
   * @param callerCFG - CFG of the calling function
   * @returns Variable name that receives the return value, or null if not found
   */
  private extractReturnValueVariable(
    call: FunctionCall,
    callerCFG: FunctionCFG
  ): string | null {
    // Find the statement containing the call
    const block = callerCFG.blocks.get(call.callSite.blockId);
    if (!block) {
      LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] extractReturnValueVariable: Block ${call.callSite.blockId} not found`);
      return null;
    }
    
    // Only process if return value is used
    if (!call.returnValueUsed) {
      LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] extractReturnValueVariable: Return value not used for ${call.calleeId}()`);
      return null;
    }
    
    // Try to find statement by statementId first
    let statement = block.statements.find(s => s.id === call.callSite.statementId);
    
    // If not found, search for statements containing the function call
    // PRIORITIZE statements with assignment operator (=) over plain function calls
    if (!statement) {
      LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] extractReturnValueVariable: Statement ${call.callSite.statementId} not found, searching by text`);
      
      // First, try to find assignment statements (contain both function call AND =)
      const assignmentStatements = block.statements.filter(s => {
        const stmtText = s.text || s.content || '';
        return stmtText.includes(`${call.calleeId}(`) && stmtText.includes('=');
      });
      
      if (assignmentStatements.length > 0) {
        // Prefer statements where = appears before the function call (assignment pattern)
        statement = assignmentStatements.find(s => {
          const stmtText = s.text || s.content || '';
          const funcIndex = stmtText.indexOf(`${call.calleeId}(`);
          const equalsIndex = stmtText.indexOf('=');
          return equalsIndex >= 0 && equalsIndex < funcIndex;
        }) || assignmentStatements[0];
        
        LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] extractReturnValueVariable: Found ${assignmentStatements.length} assignment statement(s), using first match`);
      } else {
        // Fallback: find any statement with function call
        statement = block.statements.find(s => {
          const stmtText = s.text || s.content || '';
          return stmtText.includes(`${call.calleeId}(`);
        });
      }
    }
    
    if (!statement) {
      LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] extractReturnValueVariable: No statement found for ${call.calleeId}() in block ${call.callSite.blockId}`);
      return null;
    }
    
    const stmtText = statement.text || statement.content || '';
    LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] extractReturnValueVariable: Found statement: "${stmtText}"`);
    
    // Escape function name for regex
    const funcNameEscaped = call.calleeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Pattern 1: Assignment with pointer declaration: "char* user_data = get_user_input();"
    // Match: type* var = func() or type *var = func()
    let match = stmtText.match(new RegExp(`(?:const\\s+)?(?:char|int|float|double|void|auto|struct\\s+\\w+|\\w+)\\s*\\*\\s*(\\w+)\\s*=\\s*[^=]*${funcNameEscaped}\\s*\\(`));
    if (match) {
      LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] extractReturnValueVariable: Pattern 1 matched: ${match[1]}`);
      return match[1];
    }
    
    // Pattern 2: Assignment with declaration: "int user_input = get_user_number();"
    // Match: type var = func()
    match = stmtText.match(new RegExp(`(?:const\\s+)?(?:char|int|float|double|void|auto|struct\\s+\\w+|\\w+)\\s+(\\w+)\\s*=\\s*[^=]*${funcNameEscaped}\\s*\\(`));
    if (match) {
      LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] extractReturnValueVariable: Pattern 2 matched: ${match[1]}`);
      return match[1];
    }
    
    // Pattern 3: Simple assignment: "user_data = get_user_input();"
    // Match: var = func()
    match = stmtText.match(new RegExp(`(\\w+)\\s*=\\s*[^=]*${funcNameEscaped}\\s*\\(`));
    if (match) {
      LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] extractReturnValueVariable: Pattern 3 matched: ${match[1]}`);
      return match[1];
    }
    
    LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] extractReturnValueVariable: No pattern matched for "${stmtText}" with function ${call.calleeId}`);
    return null;
  }
  
  /**
   * Process library function calls using taint summaries.
   * 
   * @param call - Function call information
   * @param callerName - Name of calling function
   */
  private processLibraryFunction(call: FunctionCall, callerName: string): void {
    const calleeName = call.calleeId;
    const summary = this.taintSummaries.get(calleeName);
    
    if (!summary) return;
    
    const callerCFG = this.cfgFunctions.get(callerName);
    if (!callerCFG) return;
    
    const callerBlockId = call.callSite.blockId;
    const callerTaint = this.interProceduralTaint.get(callerName);
    if (!callerTaint) return;
    
    const callerBlockTaint = callerTaint.get(callerBlockId) || [];
    // CRITICAL FIX: Also check entry block for parameter taint (like process_input.input)
    const entryBlockTaint = callerCFG.entry !== callerBlockId
      ? (callerTaint.get(callerCFG.entry) || [])
      : [];
    const combinedCallerTaint = [...entryBlockTaint, ...callerBlockTaint];
    
    LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] processLibraryFunction: ${callerName} -> ${calleeName}, callerBlockTaint: ${callerBlockTaint.length}, entryBlockTaint: ${entryBlockTaint.length}, combined: ${combinedCallerTaint.length}`);
    
    if (combinedCallerTaint.length === 0) {
      LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] No taint found in ${callerName} (block ${callerBlockId} or entry ${callerCFG.entry})`);
      return;
    }
    
    // Check if taint sources (arguments) are tainted using ParameterAnalyzer to extract variables
    const taintedSources = summary.taintSources.filter(sourceIndex => {
      if (sourceIndex >= call.arguments.actual.length) return false;
      const arg = call.arguments.actual[sourceIndex];
      
      // Extract variables from argument expression (e.g., "input", "n - 1" -> ["n"])
      const paramAnalyzer = new ParameterAnalyzer();
      const derivation = paramAnalyzer.analyzeArgumentDerivation(arg);
      const varsToCheck = new Set<string>([derivation.base, ...derivation.usedVariables]);
      
      // Check if any variable in the argument is tainted
      const isTainted = Array.from(varsToCheck).some(varName =>
        combinedCallerTaint.some(taint => taint.variable === varName)
      ) || combinedCallerTaint.some(taint => arg.includes(taint.variable));
      
      if (isTainted) {
        LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] Found tainted source arg[${sourceIndex}]: ${arg} (vars: ${Array.from(varsToCheck).join(', ')})`);
      }
      
      return isTainted;
    });
    
    LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] Tainted sources for ${calleeName}: ${taintedSources.length} out of ${summary.taintSources.length}`);
    
    if (taintedSources.length === 0) {
      LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] No tainted sources found for ${calleeName}, skipping`);
      return;
    }
    
    // Mark taint sinks as tainted
    for (const sinkIndex of summary.taintSinks) {
      if (sinkIndex >= call.arguments.actual.length) continue;
      let sinkArg = call.arguments.actual[sinkIndex];
      
      // Extract variable name from sink argument (e.g., "local_buffer" from "local_buffer" or expressions)
      const paramAnalyzer = new ParameterAnalyzer();
      const sinkDerivation = paramAnalyzer.analyzeArgumentDerivation(sinkArg);
      // Use base variable name if it's a simple variable, otherwise use the expression
      if (sinkDerivation.type === ArgumentDerivationType.DIRECT && sinkDerivation.base) {
        sinkArg = sinkDerivation.base;
        LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] Extracted sink variable: ${sinkArg} from expression: ${call.arguments.actual[sinkIndex]}`);
      }
      
      // Get source category from tainted source arguments (using combined taint)
      const sourceTaint = combinedCallerTaint.find(t => 
        taintedSources.some(idx => {
          const arg = call.arguments.actual[idx];
          const argDerivation = paramAnalyzer.analyzeArgumentDerivation(arg);
          const varsToCheck = new Set<string>([argDerivation.base, ...argDerivation.usedVariables]);
          return varsToCheck.has(t.variable) || arg.includes(t.variable);
        })
      );
          
          const sinkTaint: TaintInfo = {
        variable: sinkArg,
        source: `library_function:${calleeName}`,
        tainted: true,
        sourceCategory: sourceTaint?.sourceCategory || 'user_input',
        taintType: sourceTaint?.taintType || 'string',
        sourceFunction: callerName,
        propagationPath: [callerName],
        labels: [TaintLabel.DERIVED],
        sourceLocation: {
          blockId: callerBlockId,
          statementId: call.callSite.statementId
        }
      };
      
      this.addTaintToBlock(callerName, callerBlockId, sinkArg, sinkTaint.source, sinkTaint);
    }
    
    // Handle return value taint
    if (summary.returnValueTainted) {
      // Get source category from tainted source arguments (using combined taint)
      const sourceTaint = combinedCallerTaint.find(t => 
        summary.taintSources.some(idx => 
          idx < call.arguments.actual.length && 
          (call.arguments.actual[idx] === t.variable || 
           call.arguments.actual[idx]?.includes(t.variable))
        )
      );
      
      const returnTaint: TaintInfo = {
        variable: `return_${calleeName}`,
        source: `library_function:${calleeName}`,
        tainted: true,
        sourceCategory: sourceTaint?.sourceCategory || 'user_input',
        taintType: sourceTaint?.taintType || 'string',
        sourceFunction: callerName,
        propagationPath: [callerName],
        labels: [TaintLabel.DERIVED],
        sourceLocation: {
          blockId: callerBlockId,
          statementId: call.callSite.statementId
        }
      };
      
      this.addTaintToBlock(
        callerName,
        callerBlockId,
        `return_${calleeName}`,
        returnTaint.source,
        returnTaint
      );
    }
  }
  
  /**
   * Add taint information to a specific block.
   * 
   * @param funcName - Function name
   * @param blockId - Block ID
   * @param variable - Variable name
   * @param source - Taint source
   * @param taintTemplate - Template taint info to use
   * @returns true if taint was added (new taint)
   */
  private addTaintToBlock(
    funcName: string,
    blockId: string,
    variable: string,
    source: string,
    taintTemplate?: TaintInfo
  ): boolean {
    if (!this.interProceduralTaint.has(funcName)) {
      this.interProceduralTaint.set(funcName, new Map());
    }
    
    const funcTaint = this.interProceduralTaint.get(funcName)!;
    
    if (!funcTaint.has(blockId)) {
      funcTaint.set(blockId, []);
    }
    
    const blockTaint = funcTaint.get(blockId)!;
    
    // Check if this taint already exists
    const exists = blockTaint.some(taint => 
      taint.variable === variable && taint.source === source
    );
    
    if (exists) return false;
    
    // Create new taint info
      const newTaint: TaintInfo = taintTemplate ? {
      ...taintTemplate,
      variable,
      source,
      tainted: true,
      propagationPath: taintTemplate.propagationPath || [funcName],
      sourceLocation: {
        blockId
      }
    } : {
      variable,
      source,
      tainted: true,
      sourceCategory: undefined, // Will be inferred from context
      taintType: 'string',
      sourceFunction: funcName,
      propagationPath: [funcName],
      labels: [TaintLabel.DERIVED],
      sourceLocation: {
        blockId
      }
    };
    
    blockTaint.push(newTaint);
    LoggingConfig.log('InterProceduralTaint', `[InterProceduralTaint] Added taint: ${funcName}:${blockId} -> ${variable} from ${source}`);
    
    return true;
  }
  
  /**
   * Get global variable taint information.
   */
  getGlobalTaint(): Map<string, TaintInfo[]> {
    return this.globalTaint;
  }
}

