/**
 * Inter-Procedural Reaching Definitions Analysis
 * 
 * Phase 3 of IPA Framework: Context-Insensitive Inter-Procedural Data Flow
 * 
 * This module extends intra-procedural reaching definitions analysis to work
 * across function boundaries. It tracks how variable definitions propagate
 * through function calls, parameters, return values, and global variables.
 * 
 * Academic Foundation:
 * - "Interprocedural Constant Propagation" (Callahan et al., 1986)
 * - "Flow-Sensitive Dataflow Analysis" (Reps, Horwitz, Sagiv, 1995)
 * - Chapter 9: Inter-Procedural Analysis, "Engineering a Compiler"
 * 
 * Algorithm Overview:
 * 1. Start with intra-procedural reaching definitions (already computed)
 * 2. At each call site, propagate definitions from callee to caller
 * 3. Map formal parameters to actual arguments
 * 4. Propagate return values back to call sites
 * 5. Handle global variable definitions
 * 6. Iterate until fixed point (no more changes)
 * 
 * Example:
 *   void foo(int x) { int y = x + 1; }
 *   void main() { int a = 5; foo(a); }
 * 
 * After IPA:
 *   - Definition of 'a' in main() propagates to 'x' parameter in foo()
 *   - Definition of 'y' in foo() (if returned) propagates back to main()
 */

import {
  FunctionCFG,
  ReachingDefinition,
  ReachingDefinitionsInfo,
  Statement
} from '../types';
import {
  CallGraph,
  FunctionCall,
  FunctionMetadata
} from './CallGraphAnalyzer';

/**
 * Context for a call site during inter-procedural analysis.
 * 
 * Tracks the relationship between caller and callee at a specific call site.
 */
export interface CallSiteContext {
  // Function making the call
  callerId: string;

  // Function being called
  calleeId: string;

  // Mapping from formal parameter names to actual argument expressions
  // Example: { "x": "a", "y": "b + 1" }
  argumentMapping: Map<string, string>;

  // Variable in caller that receives the return value (if any)
  // Example: "result" in "result = foo(x)"
  returnValueVariable: string | null;

  // The actual FunctionCall object from call graph
  call: FunctionCall;

  // Statement containing the call
  statement: Statement;

  // Block ID where call occurs
  blockId: string;
}

/**
 * Inter-procedural reaching definitions analyzer.
 * 
 * Extends intra-procedural analysis to track definitions across function boundaries.
 * Uses fixed-point iteration to converge on a solution.
 */
export class InterProceduralReachingDefinitions {
  // Call graph containing all function relationships
  private callGraph: CallGraph;

  // Intra-procedural reaching definitions for each function
  // Map: functionName -> Map<blockId, ReachingDefinitionsInfo>
  private intraReachingDefs: Map<string, Map<string, ReachingDefinitionsInfo>>;

  // Global variable definitions (variables defined outside any function)
  // Map: variableName -> ReachingDefinition[]
  private globalDefinitions: Map<string, ReachingDefinition[]>;

  // Maximum iterations to prevent infinite loops
  private readonly MAX_ITERATIONS = 20;

  // Track which functions have been modified in current iteration
  private modifiedFunctions: Set<string>;

  /**
   * Create inter-procedural analyzer.
   * 
   * @param callGraph - Complete call graph from Phase 1 & 2
   * @param intraReachingDefs - Intra-procedural analysis results
   */
  constructor(
    callGraph: CallGraph,
    intraReachingDefs: Map<string, Map<string, ReachingDefinitionsInfo>>
  ) {
    this.callGraph = callGraph;
    this.intraReachingDefs = intraReachingDefs;
    this.globalDefinitions = new Map();
    this.modifiedFunctions = new Set();
  }

  /**
   * Perform inter-procedural reaching definitions analysis.
   * 
   * Algorithm:
   * 1. Initialize with intra-procedural results
   * 2. Iterate until fixed point:
   *    a. For each function, analyze its call sites
   *    b. Propagate definitions through function calls
   *    c. Map parameters and return values
   *    d. Handle global variables
   * 3. Return updated reaching definitions
   * 
   * @returns Updated reaching definitions with inter-procedural information
   */
  analyze(): Map<string, Map<string, ReachingDefinitionsInfo>> {
    console.log('[IPA] Starting inter-procedural reaching definitions analysis');
    console.log(`[IPA] Analyzing ${this.callGraph.functions.size} functions`);

    // STEP 1: Initialize global variable tracking
    this.initializeGlobalVariables();

    // STEP 2: Fixed-point iteration
    let iteration = 0;
    let changed = true;

    while (changed && iteration < this.MAX_ITERATIONS) {
      iteration++;
      changed = false;
      this.modifiedFunctions.clear();

      console.log(`[IPA] Iteration ${iteration}`);

      // STEP 3: Process all functions
      for (const [funcId, metadata] of this.callGraph.functions.entries()) {
        // Skip external functions (library calls)
        if (metadata.isExternal) {
          continue;
        }

        // STEP 4: Analyze call sites in this function
        const functionChanged = this.analyzeFunctionCallSites(funcId, metadata);

        if (functionChanged) {
          changed = true;
          this.modifiedFunctions.add(funcId);
        }
      }

      // STEP 5: Propagate global variable changes
      if (this.propagateGlobalVariables()) {
        changed = true;
      }

      console.log(`[IPA] Iteration ${iteration} complete. Changed: ${changed}`);
    }

    if (iteration >= this.MAX_ITERATIONS) {
      console.warn(`[IPA] Warning: Reached maximum iterations (${this.MAX_ITERATIONS})`);
    } else {
      console.log(`[IPA] Fixed point reached after ${iteration} iterations`);
    }

    return this.intraReachingDefs;
  }

  /**
   * Initialize global variable tracking.
   * 
   * Identifies variables that are defined outside function scope
   * and need special handling during inter-procedural analysis.
   */
  private initializeGlobalVariables(): void {
    console.log('[IPA] Initializing global variable tracking');

    // For now, we'll identify globals heuristically
    // In a full implementation, we'd parse global declarations from AST
    // Common patterns: variables not in parameter lists, not local to any function

    // This is a placeholder - full implementation would scan AST for global declarations
    this.globalDefinitions = new Map();
  }

  /**
   * Analyze all call sites in a function.
   * 
   * For each call site:
   * 1. Extract call context (caller, callee, arguments, return value)
   * 2. Propagate definitions through the call
   * 3. Map formal parameters to actual arguments
   * 4. Handle return values
   * 
   * @param funcId - Function to analyze
   * @param metadata - Function metadata
   * @returns true if any definitions changed
   */
  private analyzeFunctionCallSites(
    funcId: string,
    metadata: FunctionMetadata
  ): boolean {
    const funcCFG = metadata.cfg;
    const funcRD = this.intraReachingDefs.get(funcId);

    if (!funcRD) {
      console.warn(`[IPA] No intra-procedural RD for function: ${funcId}`);
      return false;
    }

    let changed = false;

    // STEP 1: Get all calls made by this function
    const calls = this.callGraph.callsFrom.get(funcId) || [];

    if (calls.length === 0) {
      return false; // No calls to analyze
    }

    // STEP 2: Process each call site
    for (const call of calls) {
      // STEP 3: Find the statement containing this call
      const callSiteContext = this.buildCallSiteContext(call, funcCFG);

      if (!callSiteContext) {
        continue; // Could not find call site
      }

      // STEP 4: Propagate definitions through this call
      const callChanged = this.propagateDefinitionsAtCall(callSiteContext);

      if (callChanged) {
        changed = true;
      }
    }

    return changed;
  }

  /**
   * Build call site context from a function call.
   * 
   * Extracts:
   * - Caller and callee information
   * - Parameter mapping (formal -> actual)
   * - Return value variable (if any)
   * - Statement and block information
   * 
   * @param call - Function call from call graph
   * @param callerCFG - CFG of the calling function
   * @returns Call site context or null if not found
   */
  private buildCallSiteContext(
    call: FunctionCall,
    callerCFG: FunctionCFG
  ): CallSiteContext | null {
    // STEP 1: Find the block containing the call
    const block = callerCFG.blocks.get(call.callSite.blockId);
    if (!block) {
      return null;
    }

    // STEP 2: Find the statement containing the call
    const statement = block.statements.find(
      stmt => {
        const stmtText = stmt.content || stmt.text;
        return stmtText.includes(`${call.calleeId}(`);
      }
    );

    if (!statement) {
      return null;
    }

    // STEP 3: Get callee metadata
    const calleeMetadata = this.callGraph.functions.get(call.calleeId);
    if (!calleeMetadata) {
      return null;
    }

    // STEP 4: Build parameter mapping (formal -> actual)
    const argumentMapping = this.mapParameters(call, calleeMetadata);

    // STEP 5: Extract return value variable (if any)
    const returnValueVariable = this.extractReturnValueVariable(
      statement,
      call
    );

    return {
      callerId: call.callerId,
      calleeId: call.calleeId,
      argumentMapping,
      returnValueVariable,
      call,
      statement,
      blockId: call.callSite.blockId
    };
  }

  /**
   * Map formal parameters to actual arguments.
   * 
   * Example:
   *   Call: foo(x, y+1)
   *   Callee params: ["a", "b"]
   *   Result: { "a": "x", "b": "y+1" }
   * 
   * @param call - Function call
   * @param calleeMetadata - Callee function metadata
   * @returns Map from formal parameter names to actual argument expressions
   */
  private mapParameters(
    call: FunctionCall,
    calleeMetadata: FunctionMetadata
  ): Map<string, string> {
    const mapping = new Map<string, string>();

    // Match parameters by position
    for (let i = 0; i < calleeMetadata.parameters.length; i++) {
      const formalParam = calleeMetadata.parameters[i];
      const actualArg = call.arguments.actual[i];

      if (actualArg !== undefined) {
        mapping.set(formalParam.name, actualArg.trim());
        console.log(
          `[IPA] Map param: ${formalParam.name} <- ${actualArg} ` +
          `(at call ${call.callerId} -> ${call.calleeId})`
        );
      }
    }

    return mapping;
  }

  /**
   * Extract the variable that receives the return value.
   * 
   * Examples:
   *   "result = foo(x)" -> "result"
   *   "if (foo(x))" -> null (used in condition, not assigned)
   *   "foo(x);" -> null (return value not used)
   * 
   * @param statement - Statement containing the call
   * @param call - Function call
   * @returns Variable name or null if return value not assigned
   */
  private extractReturnValueVariable(
    statement: Statement,
    call: FunctionCall
  ): string | null {
    if (!call.returnValueUsed) {
      return null;
    }

    const stmtText = statement.content || statement.text;

    // Pattern: variable = functionCall(...)
    const assignMatch = stmtText.match(
      /(\w+)\s*=\s*\s*\w+\s*\(/
    );

    if (assignMatch) {
      return assignMatch[1];
    }

    // Pattern: variable.field = functionCall(...)
    const memberAssignMatch = stmtText.match(
      /(\w+)\s*\.\s*\w+\s*=\s*\w+\s*\(/
    );

    if (memberAssignMatch) {
      return memberAssignMatch[1];
    }

    return null;
  }

  /**
   * Propagate definitions through a function call.
   * 
   * This is the core of inter-procedural analysis:
   * 1. Get definitions before call (IN set at call site)
   * 2. Map actual arguments to formal parameters
   * 3. Propagate definitions into callee
   * 4. Get definitions from callee (OUT set at exit)
   * 5. Map return value back to caller
   * 6. Merge definitions at call site
   * 
   * @param context - Call site context
   * @returns true if any definitions changed
   */
  private propagateDefinitionsAtCall(
    context: CallSiteContext
  ): boolean {
    const { callerId, calleeId, argumentMapping, returnValueVariable } = context;

    console.log(
      `[IPA] Propagating definitions: ${callerId} -> ${calleeId} ` +
      `(params: ${Array.from(argumentMapping.keys()).join(', ')})`
    );

    // STEP 1: Get reaching definitions for caller at call site
    const callerRD = this.intraReachingDefs.get(callerId);
    if (!callerRD) {
      return false;
    }

    const callSiteRD = callerRD.get(context.blockId);
    if (!callSiteRD) {
      return false;
    }

    // STEP 2: Get reaching definitions for callee
    const calleeRD = this.intraReachingDefs.get(calleeId);
    if (!calleeRD) {
      // Callee might be external (library function)
      console.log(`[IPA] Callee ${calleeId} has no RD (external function?)`);
      return false;
    }

    // STEP 3: Get callee's exit block
    const calleeMetadata = this.callGraph.functions.get(calleeId);
    if (!calleeMetadata) {
      return false;
    }

    const calleeCFG = calleeMetadata.cfg;
    const exitBlockId = calleeCFG.exit;
    const calleeExitRD = calleeRD.get(exitBlockId);

    if (!calleeExitRD) {
      return false;
    }

    let changed = false;

    // STEP 4: Propagate parameter definitions (actual -> formal)
    // For each definition in callee that uses a parameter:
    //   - Find the corresponding actual argument in caller
    //   - Add definition of actual argument based on callee's parameter usage
    for (const [varName, defs] of calleeExitRD.out.entries()) {
      // Check if this variable is a parameter
      const paramIndex = calleeMetadata.parameters.findIndex(
        p => p.name === varName
      );

      if (paramIndex >= 0) {
        // This is a parameter - map it back to actual argument
        const formalParam = calleeMetadata.parameters[paramIndex];
        const actualArg = argumentMapping.get(formalParam.name);

        if (actualArg) {
          // Propagate definitions of the actual argument
          // Find definitions of actualArg in caller's IN set at call site
          const actualArgDefs = callSiteRD.in.get(actualArg);

          if (actualArgDefs && actualArgDefs.length > 0) {
            // Add these definitions to the caller's OUT set after the call
            // This represents the fact that the callee may have used/modified
            // the actual argument through the formal parameter

            // For now, we mark that definitions flowed through the call
            // Full implementation would track this more precisely
            console.log(
              `[IPA] Parameter flow: ${actualArg} -> ${formalParam.name} ` +
              `(${actualArgDefs.length} definitions)`
            );
          }
        }
      }
    }

    // STEP 5: Propagate return value (if used)
    if (returnValueVariable) {
      // Find return statements in callee
      const returnDefs = this.extractReturnValueDefinitions(calleeCFG, calleeRD);

      if (returnDefs.length > 0) {
        // Create new definition for returnValueVariable in caller
        // This definition comes from the callee's return value
        const newDef: ReachingDefinition = {
          variable: returnValueVariable,
          definitionId: `${calleeId}_return_${context.blockId}`,
          blockId: context.blockId,
          statementId: context.statement.id,
          sourceBlock: exitBlockId,
          propagationPath: [exitBlockId, context.blockId]
        };

        // Add to caller's OUT set at call site
        if (!callSiteRD.out.has(returnValueVariable)) {
          callSiteRD.out.set(returnValueVariable, []);
        }

        const existingDefs = callSiteRD.out.get(returnValueVariable)!;
        if (!existingDefs.find(d => d.definitionId === newDef.definitionId)) {
          existingDefs.push(newDef);
          changed = true;

          console.log(
            `[IPA] Return value flow: ${calleeId} -> ${returnValueVariable} ` +
            `in ${callerId}`
          );
        }
      }
    }

    // STEP 6: Propagate global variable definitions
    // If callee modifies globals, propagate those changes back
    for (const [varName, defs] of calleeExitRD.out.entries()) {
      if (this.isGlobalVariable(varName)) {
        // This is a global variable modified by callee
        // Propagate to caller
        if (!callSiteRD.out.has(varName)) {
          callSiteRD.out.set(varName, []);
        }

        const callerDefs = callSiteRD.out.get(varName)!;
        for (const def of defs) {
          const propagatedDef: ReachingDefinition = {
            ...def,
            definitionId: `${def.definitionId}_via_${calleeId}`,
            propagationPath: def.propagationPath
              ? [...def.propagationPath, context.blockId]
              : [exitBlockId, context.blockId]
          };

          if (!callerDefs.find(d => d.definitionId === propagatedDef.definitionId)) {
            callerDefs.push(propagatedDef);
            changed = true;

            console.log(
              `[IPA] Global flow: ${varName} via ${calleeId} -> ${callerId}`
            );
          }
        }
      }
    }

    return changed;
  }

  /**
   * Extract return value definitions from callee function.
   * 
   * Finds all return statements and their values in the callee.
   * 
   * @param calleeCFG - Callee's control flow graph
   * @param calleeRD - Callee's reaching definitions
   * @returns List of definitions representing return values
   */
  private extractReturnValueDefinitions(
    calleeCFG: FunctionCFG,
    calleeRD: Map<string, ReachingDefinitionsInfo>
  ): ReachingDefinition[] {
    const returnDefs: ReachingDefinition[] = [];

    // Find all blocks with return statements
    for (const [blockId, block] of calleeCFG.blocks.entries()) {
      for (const stmt of block.statements) {
        const stmtText = stmt.content || stmt.text;

        if (stmtText.includes('return')) {
          // Extract return value
          const returnMatch = stmtText.match(/return\s+(.+?);?$/);

          if (returnMatch) {
            const returnValue = returnMatch[1].trim();

            // Find definitions of return value in this block's IN set
            const blockRD = calleeRD.get(blockId);
            if (blockRD) {
              const returnValueDefs = blockRD.in.get(returnValue);

              if (returnValueDefs) {
                returnDefs.push(...returnValueDefs);
              }
            }
          }
        }
      }
    }

    return returnDefs;
  }

  /**
   * Check if a variable is global (heuristic).
   * 
   * In a full implementation, this would check the AST for global declarations.
   * For now, we use heuristics:
   * - Variables not in any function's parameter list
   * - Variables with uppercase names (common convention)
   * 
   * @param varName - Variable name to check
   * @returns true if variable appears to be global
   */
  private isGlobalVariable(varName: string): boolean {
    // Heuristic: check if variable is not a parameter of any function
    for (const metadata of this.callGraph.functions.values()) {
      if (metadata.parameters.some(p => p.name === varName)) {
        return false; // Found as parameter, not global
      }
    }

    // Additional heuristic: uppercase names often indicate globals/constants
    if (varName === varName.toUpperCase() && varName.length > 1) {
      return true;
    }

    // For now, be conservative - don't assume globals
    return false;
  }

  /**
   * Propagate global variable definitions across all functions.
   * 
   * Global variables can be modified by any function, so changes to globals
   * need to be propagated to all functions that use them.
   * 
   * @returns true if any definitions changed
   */
  private propagateGlobalVariables(): boolean {
    // This is a simplified implementation
    // Full implementation would track which functions modify which globals
    // and only propagate to functions that use those globals

    let changed = false;

    // For each global definition
    for (const [globalVar, defs] of this.globalDefinitions.entries()) {
      // Propagate to all functions that might use this global
      for (const [funcId, funcRD] of this.intraReachingDefs.entries()) {
        // Check if function uses this global
        for (const [blockId, rdInfo] of funcRD.entries()) {
          // If block uses this global, add definitions
          if (rdInfo.in.has(globalVar) || rdInfo.out.has(globalVar)) {
            // Merge global definitions into function's IN/OUT sets
            // (Simplified - full implementation would be more precise)
          }
        }
      }
    }

    return changed;
  }
}

