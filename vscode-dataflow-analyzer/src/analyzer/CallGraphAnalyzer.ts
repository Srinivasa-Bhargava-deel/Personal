/**
 * CallGraphAnalyzer.ts
 * 
 * Call Graph Analyzer - Function Call Relationship Construction
 * 
 * PURPOSE:
 * Builds call graphs for inter-procedural analysis by extracting function calls from CFG
 * statements and creating caller/callee relationship maps. This is Phase 1 of the IPA
 * framework and is a prerequisite for all inter-procedural analyses.
 * 
 * SIGNIFICANCE IN OVERALL FLOW:
 * This analyzer runs in the inter-procedural analysis phase in DataflowAnalyzer. It provides
 * the call graph infrastructure that all inter-procedural analyses depend on, including
 * InterProceduralReachingDefinitions, InterProceduralTaintAnalyzer, and ContextSensitiveTaintAnalyzer.
 * Without a call graph, no inter-procedural analysis can proceed.
 * 
 * DATA FLOW:
 * INPUTS:
 *   - Map<string, FunctionCFG> (from DataflowAnalyzer.ts) containing all function CFGs
 *     in the workspace
 * 
 * PROCESSING:
 *   1. Indexes all functions with metadata (name, parameters, return type)
 *   2. Extracts function calls from CFG statements using FunctionCallExtractor
 *   3. Builds caller->callee relationship map (callsFrom)
 *   4. Builds callee->caller relationship map (callsTo)
 *   5. Analyzes recursion patterns (direct, mutual, tail recursion)
 *   6. Identifies external/library functions
 * 
 * OUTPUTS:
 *   - CallGraph object containing:
 *     - functions: Map of function metadata
 *     - calls: Array of FunctionCall objects
 *     - callsFrom: Map<callerName, FunctionCall[]> - Which functions each function calls
 *     - callsTo: Map<calleeName, FunctionCall[]> - Which functions call each function
 *     - recursion: Recursion analysis results
 *   - Call graph -> DataflowAnalyzer.ts (stored in AnalysisState)
 *   - Call graph -> InterProceduralReachingDefinitions.ts (for IPA RD)
 *   - Call graph -> InterProceduralTaintAnalyzer.ts (for IPA taint)
 *   - Call graph -> ContextSensitiveTaintAnalyzer.ts (for context-sensitive taint)
 *   - Call graph -> CFGVisualizer.ts (for call graph visualization)
 * 
 * DEPENDENCIES:
 *   - types.ts: FunctionCFG, BasicBlock, Statement
 *   - FunctionCallExtractor.ts: Extracts function calls from statements
 * 
 * CALL GRAPH REPRESENTATION:
 * A call graph represents function call relationships in a program.
 * It answers: "Which functions call which other functions?"
 * 
 * Example call graph:
 * main() -> [printf, foo]
 * foo() -> [bar, foo]        (recursive!)
 * bar() -> []
 * printf() -> []             (external library)
 * 
 * ACADEMIC FOUNDATION:
 * - "Interprocedural Constant Propagation" (Callahan et al., 1986)
 * - Chapter 9: Inter-Procedural Analysis, "Engineering a Compiler"
 */

import { FunctionCFG, BasicBlock, Statement } from '../types';
import { FunctionCallExtractor } from './FunctionCallExtractor';
import { LoggingConfig } from '../utils/LoggingConfig';

/**
 * Represents a single function call in the program.
 * 
 * Example: In "result = foo(x, y)", this represents the call to foo().
 */
export interface FunctionCall {
  // Function making the call (caller)
  callerId: string;

  // Function being called (callee)
  calleeId: string;

  // Where in the CFG the call occurs
  callSite: {
    blockId: string;         // CFG block ID
    statementId: string;     // Statement ID containing call
    line: number;            // Source line number
    column: number;          // Source column number
  };

  // Arguments to the function call
  arguments: {
    actual: string[];        // Actual arguments passed
    types: string[];         // Inferred types of arguments
  };

  // Whether the return value is used
  returnValueUsed: boolean;

  // Is this an indirect call (through function pointer)?
  isIndirect?: boolean;

  // Original variable name if indirect (e.g., "op" when op = add; op(5,3))
  indirectVariable?: string;
}

/**
 * Represents the complete call graph for a program.
 * 
 * Contains all functions and their call relationships.
 */
export interface CallGraph {
  // All functions in the program, indexed by name
  functions: Map<string, FunctionMetadata>;

  // All function calls in the program
  calls: FunctionCall[];

  // Index: caller -> list of calls it makes
  // Used to answer: "What does function X call?"
  callsFrom: Map<string, FunctionCall[]>;

  // Index: callee -> list of calls to it
  // Used to answer: "Who calls function X?"
  callsTo: Map<string, FunctionCall[]>;
}

/**
 * Metadata about a function for analysis.
 * 
 * Stores information about a function needed for inter-procedural analysis:
 * - Its CFG (control flow graph)
 * - Its parameters
 * - Whether it's external (library function)
 * - Whether it's recursive
 */
export interface FunctionMetadata {
  // Function name (e.g., "factorial")
  name: string;

  // Control flow graph for this function
  cfg: FunctionCFG;

  // Function parameters
  parameters: {
    name: string;         // Parameter name
    type: string;         // Parameter type
    position: number;     // Position in parameter list
  }[];

  // Return type of the function
  returnType: string;

  // Is this an external/library function?
  // If true, we don't have source code to analyze
  isExternal: boolean;

  // Is this function recursive?
  isRecursive: boolean;

  // How many times is this function called?
  callsCount: number;
}

/**
 * Analyzes function calls and builds call graphs.
 * 
 * Main responsibilities:
 * 1. Extract all function calls from CFG statements
 * 2. Build caller/callee relationship maps
 * 3. Detect recursion patterns
 * 4. Identify external functions
 * 5. Provide visualization (DOT format)
 * 
 * Time Complexity: O(n*m) where n = functions, m = statements per function
 * Space Complexity: O(n + c) where n = functions, c = calls
 */
export class CallGraphAnalyzer {
  // Internal state
  private callGraph: CallGraph;
  private allFunctions: Map<string, FunctionCFG>;
  private keywords: Set<string> = new Set([
    'if', 'else', 'while', 'for', 'do', 'switch', 'case', 'default',
    'return', 'break', 'continue', 'goto', 'sizeof', 'typedef',
    'struct', 'class', 'enum', 'union', 'const', 'volatile',
    'static', 'extern', 'auto', 'register', 'inline', 'virtual',
    'private', 'public', 'protected', 'new', 'delete', 'throw'
  ]);

  // Function pointer tracking: variable name -> Set of possible function targets
  private functionPointers: Map<string, Set<string>> = new Map();

  // Callback parameter mapping: callerFunc::paramName -> Set of functions passed to it
  private callbackArguments: Map<string, Set<string>> = new Map();

  /**
   * Initialize the analyzer with all functions in the program.
   * 
   * @param functions - Map of all functions (name -> CFG)
   */
  constructor(functions: Map<string, FunctionCFG>) {
    this.allFunctions = functions;
    this.callGraph = {
      functions: new Map(),
      calls: [],
      callsFrom: new Map(),
      callsTo: new Map()
    };
  }

  /**
   * Build the complete call graph.
   * 
   * Algorithm (5 steps):
   * 1. Index all functions and extract metadata
   * 2. Extract function calls from each function's CFG
   * 3. Build caller->callee relationship map
   * 4. Build callee->caller relationship map
   * 5. Analyze recursion patterns
   * 
   * @returns Complete call graph for the program
   */
  public buildCallGraph(): CallGraph {
    LoggingConfig.raw('[CG] Starting call graph generation');
    LoggingConfig.raw(`[CG] Processing ${this.allFunctions.size} functions`);

    // STEP 1: Index all functions with metadata
    this.indexFunctions();

    // STEP 2: Collect function pointer assignments (before extracting calls)
    // This enables resolution of indirect calls like: op = add; op(5, 3);
    this.collectFunctionPointerAssignments();

    // STEP 3: Extract function calls from each function
    this.extractFunctionCalls();

    // STEP 4: Build relationship maps for fast lookup
    this.buildRelationshipMaps();

    // STEP 5: Analyze recursion patterns
    this.analyzeRecursion();

    // STEP 6: Log summary
    LoggingConfig.raw(`[CG] Call graph complete:`);
    console.log(`     Functions: ${this.callGraph.functions.size}`);
    console.log(`     Calls: ${this.callGraph.calls.length}`);
    console.log(`     Callers: ${this.callGraph.callsFrom.size}`);
    console.log(`     Callees: ${this.callGraph.callsTo.size}`);
    console.log(`     Function pointers tracked: ${this.functionPointers.size}`);

    return this.callGraph;
  }

  /**
   * Index all functions and extract metadata.
   * 
   * Creates FunctionMetadata for each function in the program.
   * This metadata will be used throughout inter-procedural analysis.
   */
  private indexFunctions(): void {
    LoggingConfig.raw('[CG] Indexing functions...');

    for (const [funcName, funcCFG] of this.allFunctions.entries()) {
      // Extract parameters from the first block (entry block)
      const parameters = this.extractParameters(funcCFG);

      // Create metadata for this function
      const metadata: FunctionMetadata = {
        name: funcName,
        cfg: funcCFG,
        parameters,
        returnType: this.inferReturnType(funcCFG),
        isExternal: false,  // Initially assume all are defined
        isRecursive: false, // Will be updated during recursion analysis
        callsCount: 0       // Will be updated when building relationship maps
      };

      this.callGraph.functions.set(funcName, metadata);
      LoggingConfig.raw(`[CG]   Indexed function: ${funcName} with ${parameters.length} params`);
    }
  }

  /**
   * Extract function parameters from CFG.
   * 
   * Parameters are already extracted by the parser and stored in cfg.parameters.
   * We just need to convert them to FunctionMetadata['parameters'] format.
   * 
   * @param cfg - Function CFG
   * @returns Array of parameter metadata
   */
  private extractParameters(cfg: FunctionCFG): FunctionMetadata['parameters'] {
    // Parameters are already extracted by EnhancedCPPParser and stored in cfg.parameters
    // Convert from string[] to ParameterMetadata[]
    return cfg.parameters.map(paramName => ({
      name: paramName,
      type: 'auto', // Type inference can be enhanced later
      position: cfg.parameters.indexOf(paramName)
    }));
  }

  /**
   * Infer function return type from its CFG.
   * 
   * Looks at return statements to determine type.
   * 
   * @param cfg - Function CFG
   * @returns Inferred return type
   */
  private inferReturnType(cfg: FunctionCFG): string {
    // Check for return statements in CFG
    for (const block of cfg.blocks.values()) {
      for (const stmt of block.statements) {
        const stmtText = stmt.content || stmt.text;
        if (stmtText.includes('return')) {
          // Simple heuristic: look at return statement
          if (stmtText.match(/return\s+\d+/)) return 'int';
          if (stmtText.match(/return\s+nullptr/)) return 'void*';
          if (stmtText.match(/return\s+true|false/)) return 'bool';
        }
      }
    }

    return 'auto';  // Default: let compiler deduce
  }

  /**
   * Collect function pointer assignments from all functions.
   * 
   * Identifies patterns like:
   * - op = add;       (variable assignment to function)
   * - Operation op = add;  (declaration with function assignment)
   * - func_ptr = &add;     (address-of function)
   * 
   * Also tracks callback arguments passed to function calls.
   */
  private collectFunctionPointerAssignments(): void {
    LoggingConfig.raw('[CG] Collecting function pointer assignments...');
    
    // Get all known function names for validation
    const knownFunctions = new Set(this.allFunctions.keys());
    
    for (const [funcName, funcCFG] of this.allFunctions.entries()) {
      // Debug: Log all statements for test_function_pointer to see actual text
      if (funcName === 'test_function_pointer') {
        LoggingConfig.raw(`[CG] [DEBUG] Analyzing function: ${funcName}`);
        for (const [blockId, block] of funcCFG.blocks.entries()) {
          for (const stmt of block.statements) {
            const debugText = stmt.content || stmt.text || '';
            LoggingConfig.raw(`[CG] [DEBUG]   Block ${blockId} stmt: "${debugText.substring(0, 100)}"`);
          }
        }
      }
      
      for (const [blockId, block] of funcCFG.blocks.entries()) {
        for (const stmt of block.statements) {
          const stmtText = stmt.content || stmt.text || '';
          
          // Pattern 1: Direct assignment: op = add or op = add; (semicolon optional - Clang AST may omit it)
          const assignmentMatch = stmtText.match(
            /^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*&?([a-zA-Z_][a-zA-Z0-9_]*)\s*;?\s*$/
          );
          if (assignmentMatch) {
            const varName = assignmentMatch[1];
            const targetFunc = assignmentMatch[2];
            
            // Only track if target is a known function
            if (knownFunctions.has(targetFunc)) {
              if (!this.functionPointers.has(varName)) {
                this.functionPointers.set(varName, new Set());
              }
              this.functionPointers.get(varName)!.add(targetFunc);
              LoggingConfig.raw(`[CG]   Function pointer: ${varName} -> ${targetFunc} (in ${funcName})`);
            }
          }
          
          // Pattern 2: Declaration with assignment: Type ptr = func; or Type ptr = func (may have newline)
          // Handles: "Processor proc = double_value;" and "Processor proc = double_value;\n"
          const declMatch = stmtText.match(
            /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*&?([a-zA-Z_][a-zA-Z0-9_]*)\s*;?\s*$/m
          );
          if (declMatch) {
            const varName = declMatch[2];
            const targetFunc = declMatch[3];
            
            if (knownFunctions.has(targetFunc)) {
              if (!this.functionPointers.has(varName)) {
                this.functionPointers.set(varName, new Set());
              }
              this.functionPointers.get(varName)!.add(targetFunc);
              LoggingConfig.raw(`[CG]   Function pointer (decl): ${varName} -> ${targetFunc} (in ${funcName})`);
            }
          }
          
          // Pattern 3: Track callback arguments in function calls
          // e.g., apply_operation(5, double_value) - "double_value" is passed as callback
          const extractedCalls = FunctionCallExtractor.extractFunctionCalls(stmt);
          for (const call of extractedCalls) {
            // Check each argument
            for (let i = 0; i < call.arguments.length; i++) {
              const arg = call.arguments[i].trim();
              // If the argument is a known function name, track it
              if (knownFunctions.has(arg)) {
                const callbackKey = `${call.name}::param_${i}`;
                if (!this.callbackArguments.has(callbackKey)) {
                  this.callbackArguments.set(callbackKey, new Set());
                }
                this.callbackArguments.get(callbackKey)!.add(arg);
                LoggingConfig.raw(`[CG]   Callback argument: ${call.name}(param_${i}) -> ${arg} (in ${funcName})`);
              }
            }
          }
        }
      }
    }
    
    LoggingConfig.raw(`[CG] Found ${this.functionPointers.size} function pointer variables`);
    LoggingConfig.raw(`[CG] Found ${this.callbackArguments.size} callback argument sites`);
  }

  /**
   * Extract all function calls from the program.
   * 
   * Iterates through all statements in all functions and identifies
   * function call patterns.
   * 
   * Patterns matched:
   * 1. Direct calls: functionName(args)
   * 2. Method calls: object.method(args)
   * 3. Assignment: x = foo(args)
   * 4. Conditionals: if (foo(args))
   * 5. Returns: return foo(args)
   */
  private extractFunctionCalls(): void {
    LoggingConfig.raw('[CG] Extracting function calls...');

    let callCount = 0;

    // STEP 1: Iterate through all functions
    for (const [callerName, callerCFG] of this.allFunctions.entries()) {
      // STEP 2: Iterate through all blocks in the function
      for (const [blockId, block] of callerCFG.blocks.entries()) {
        // STEP 3: Iterate through all statements in the block
        for (const stmt of block.statements) {
          // STEP 4: Find all function calls in this statement
          const calls = this.findCallsInStatement(
            stmt,
            callerName,
            blockId
          );

          // STEP 5: Record each call
          for (const call of calls) {
            this.callGraph.calls.push(call);
            callCount++;

            console.log(
              `[CG]   Call: ${call.callerId} -> ${call.calleeId} ` +
              `(${call.arguments.actual.length} args) at block ${blockId}`
            );
          }
        }
      }
    }

    LoggingConfig.raw(`[CG] Found ${callCount} function calls total`);
  }

  /**
   * Find all function calls within a single statement.
   * 
   * Uses CFG-aware extraction instead of regex patterns.
   * 
   * @param stmt - Statement to analyze
   * @param callerName - Function containing this statement
   * @param blockId - Block containing this statement
   * @returns Array of function calls found in this statement
   */
  private findCallsInStatement(
    stmt: Statement,
    callerName: string,
    blockId: string
  ): FunctionCall[] {
    const calls: FunctionCall[] = [];
    
    // Use CFG-aware function call extractor
    const extractedCalls = FunctionCallExtractor.extractFunctionCalls(stmt);
    
    for (const extractedCall of extractedCalls) {
      const extractedName = extractedCall.name;
      
      // Skip if it's a keyword (not a function)
      if (this.keywords.has(extractedName)) {
        continue;
      }
      
      // Extract arguments for this call
      const args = extractedCall.arguments;
      
      // Check if return value is used - use full statement text, not just call expression
      const stmtText = stmt.text || stmt.content || '';
      const returnUsed = this.isReturnValueUsed(stmtText, extractedName);
      
      // Resolve function pointer calls to actual targets
      const resolvedTargets = this.resolveFunctionPointerCall(extractedName, callerName, args);
      
      if (resolvedTargets.length > 0) {
        // This is a function pointer call - create calls to all possible targets
        for (const target of resolvedTargets) {
      const call: FunctionCall = {
        callerId: callerName,
            calleeId: target,
        callSite: {
          blockId,
              statementId: stmt.id || `${blockId}_call_${extractedName}`,
              line: stmt.range?.start.line ?? 0,
              column: stmt.range?.start.column ?? 0
            },
            arguments: {
              actual: args,
              types: this.inferArgumentTypes(args)
            },
            returnValueUsed: returnUsed,
            isIndirect: true,
            indirectVariable: extractedName
          };
          calls.push(call);
          LoggingConfig.raw(`[CG]     Resolved indirect call: ${extractedName} -> ${target}`);
        }
      } else {
        // Direct function call
        const call: FunctionCall = {
          callerId: callerName,
          calleeId: extractedName,
          callSite: {
            blockId,
            statementId: stmt.id || `${blockId}_call_${extractedName}`,
          line: stmt.range?.start.line ?? 0,
          column: stmt.range?.start.column ?? 0
        },
        arguments: {
          actual: args,
          types: this.inferArgumentTypes(args)
        },
        returnValueUsed: returnUsed
      };
      calls.push(call);
      }
    }
    
    return calls;
  }

  /**
   * Resolve a function pointer call to its possible function targets.
   * 
   * Handles:
   * 1. Function pointer variables: op = add; op(5,3) -> resolves to add
   * 2. Callback parameters: callback(x) where callback is a parameter
   * 
   * @param calleeId - The name being called (variable or function name)
   * @param callerName - The function making the call
   * @param args - Arguments to the call
   * @returns Array of resolved function names, or empty if not a function pointer
   */
  private resolveFunctionPointerCall(
    calleeId: string,
    callerName: string,
    args: string[]
  ): string[] {
    // Check 1: Is this a function pointer variable?
    if (this.functionPointers.has(calleeId)) {
      const targets = this.functionPointers.get(calleeId)!;
      LoggingConfig.raw(`[CG]   Resolving function pointer '${calleeId}': [${Array.from(targets).join(', ')}]`);
      return Array.from(targets);
    }
    
    // Check 2: Is this a callback parameter?
    // First, check if the caller has this parameter
    const callerMetadata = this.callGraph.functions.get(callerName);
    if (callerMetadata) {
      const paramIndex = callerMetadata.parameters.findIndex(p => p.name === calleeId);
      if (paramIndex >= 0) {
        // This is a parameter being called as a function (callback)
        // Look up what functions were passed to this parameter at call sites
        const possibleTargets = this.resolveCallbackParameter(callerName, paramIndex);
        if (possibleTargets.length > 0) {
          LoggingConfig.raw(`[CG]   Resolving callback parameter '${calleeId}' (param ${paramIndex}): [${possibleTargets.join(', ')}]`);
          return possibleTargets;
        }
      }
    }
    
    // Not a function pointer or callback - return empty (direct call)
    return [];
  }

  /**
   * Resolve a callback parameter to its possible function targets.
   * 
   * Looks at all call sites that call the function with this parameter
   * and collects the functions that were passed as that argument.
   * 
   * @param funcName - Function that has the callback parameter
   * @param paramIndex - Index of the callback parameter
   * @returns Array of function names that could be passed as this callback
   */
  private resolveCallbackParameter(funcName: string, paramIndex: number): string[] {
    const callbackKey = `${funcName}::param_${paramIndex}`;
    if (this.callbackArguments.has(callbackKey)) {
      return Array.from(this.callbackArguments.get(callbackKey)!);
    }
    return [];
  }

  /**
   * Extract function arguments from a call.
   * 
   * Example: "foo(x, y+1, bar(z))" -> ["x", "y+1", "bar(z)"]
   * 
   * Handles nested calls and respects parenthesis nesting.
   * 
   * @param stmt - Statement containing the call
   * @param funcName - Name of the function being called
   * @returns Array of argument expressions
   */
  private extractArguments(stmt: string, funcName: string): string[] {
    // STEP 1: Find the argument list for this function
    const pattern = new RegExp(`${funcName}\\s*\\(([^)]*)\\)`);
    const match = stmt.match(pattern);

    if (!match) {
      return [];
    }

    const argsStr = match[1];

    // STEP 2: Handle empty argument list
    if (!argsStr.trim()) {
      return [];
    }

    // STEP 3: Split by commas, respecting nested parentheses
    const args: string[] = [];
    let current = '';
    let parenDepth = 0;

    for (const char of argsStr) {
      if (char === '(') {
        parenDepth++;
      } else if (char === ')') {
        parenDepth--;
      } else if (char === ',' && parenDepth === 0) {
        // Comma at top level - separator
        args.push(current.trim());
        current = '';
        continue;
      }

      current += char;
    }

    // Don't forget the last argument
    if (current.trim()) {
      args.push(current.trim());
    }

    return args;
  }

  /**
   * Determine if the return value of a function call is used.
   * 
   * Examples of USED return values:
   * - x = foo(y);           // Assigned to variable
   * - if (foo(y)) { ... }   // Used in condition
   * - return foo(y);        // Returned from function
   * 
   * Examples of UNUSED return values:
   * - foo(y);               // Result discarded
   * 
   * @param stmt - Statement containing the call
   * @param funcName - Name of function being called
   * @returns true if return value is used
   */
  private isReturnValueUsed(stmt: string, funcName: string): boolean {
    // Pattern 1: Assignment (including compound assignments)
    // Matches: x = func(...), x += func(...), x = func(...) + y, etc.
    if (new RegExp(`\\w+\\s*[=+\\-*/]?=\\s*.*${funcName}\\s*\\(`).test(stmt)) {
      return true;
    }

    // Pattern 2: Used in conditional (if, while, for, switch)
    if (new RegExp(`(if|while|for|switch)\\s*\\(.*${funcName}\\s*\\(`).test(stmt)) {
      return true;
    }

    // Pattern 3: Returned from function
    if (new RegExp(`return\\s+.*${funcName}\\s*\\(`).test(stmt)) {
      return true;
    }

    // Pattern 4: Used in arithmetic/logical expression (+, -, *, /, &&, ||, ==, !=, etc.)
    if (new RegExp(`[+\\-*/&|!=<>]\\s*${funcName}\\s*\\(|${funcName}\\s*\\(\\s*[+\\-*/&|!=<>]`).test(stmt)) {
      return true;
    }

    // Pattern 5: Used as function argument
    // Matches: otherFunc(func(...), ...)
    if (new RegExp(`\\w+\\s*\\([^)]*${funcName}\\s*\\(`).test(stmt)) {
      return true;
    }

    // Pattern 6: Used in array/index access
    // Matches: arr[func(...)], *func(...), func(...)[index]
    if (new RegExp(`\\[\\s*${funcName}\\s*\\(|\\*\\s*${funcName}\\s*\\(|${funcName}\\s*\\([^)]*\\)\\s*\\[`).test(stmt)) {
      return true;
    }

    // Pattern 7: Used with member access
    // Matches: obj.field = func(...), func(...).field
    if (new RegExp(`\\.\\s*\\w+\\s*=\\s*${funcName}\\s*\\(|${funcName}\\s*\\([^)]*\\)\\s*\\.`).test(stmt)) {
      return true;
    }

    // Pattern 8: Standalone call (return value discarded) - this is the default case
    // If statement is just "func(...);" with no assignment or usage, return value is unused
    const standalonePattern = new RegExp(`^\\s*${funcName}\\s*\\([^)]*\\)\\s*;\\s*$`);
    if (standalonePattern.test(stmt.trim())) {
      return false;
    }

    // If we can't determine, assume it might be used (conservative approach)
    // This handles complex expressions we might have missed
    return true;
  }

  /**
   * Infer types of function arguments.
   * 
   * Simple heuristic-based type inference:
   * - Numeric literals: int, double
   * - String literals: const char*
   * - Array access: array
   * - Default: auto
   * 
   * In a real implementation, would use more sophisticated type inference.
   * 
   * @param args - Argument expressions
   * @returns Inferred types
   */
  private inferArgumentTypes(args: string[]): string[] {
    return args.map(arg => {
      // Numeric integer
      if (/^\d+$/.test(arg)) {
        return 'int';
      }

      // Floating point
      if (/^\d+\.\d+$/.test(arg)) {
        return 'double';
      }

      // String literal
      if (/^".*"$/.test(arg)) {
        return 'const char*';
      }

      // Array access
      if (arg.includes('[')) {
        return 'array';
      }

      // Pointer dereference
      if (arg.startsWith('*')) {
        return 'pointer';
      }

      // Unknown - let compiler deduce
      return 'auto';
    });
  }

  /**
   * Build relationship maps for fast lookups.
   * 
   * Creates two indexes:
   * 1. callsFrom: caller -> calls it makes
   * 2. callsTo: callee -> calls to it
   * 
   * Also updates callsCount for each function.
   */
  private buildRelationshipMaps(): void {
    LoggingConfig.raw('[CG] Building relationship maps...');

    // STEP 1: Clear existing maps
    this.callGraph.callsFrom.clear();
    this.callGraph.callsTo.clear();

    // STEP 2: Build callsFrom map (who calls whom)
    for (const call of this.callGraph.calls) {
      if (!this.callGraph.callsFrom.has(call.callerId)) {
        this.callGraph.callsFrom.set(call.callerId, []);
      }
      this.callGraph.callsFrom.get(call.callerId)!.push(call);
    }

    // STEP 3: Build callsTo map (who is called by whom)
    for (const call of this.callGraph.calls) {
      if (!this.callGraph.callsTo.has(call.calleeId)) {
        this.callGraph.callsTo.set(call.calleeId, []);
      }
      this.callGraph.callsTo.get(call.calleeId)!.push(call);
    }

    // STEP 4: Update callsCount for each function
    for (const [calleeId, calls] of this.callGraph.callsTo.entries()) {
      const metadata = this.callGraph.functions.get(calleeId);
      if (metadata) {
        metadata.callsCount = calls.length;
      }
    }

    LoggingConfig.raw(`[CG] Relationship maps built:`);
    console.log(`     Functions calling others: ${this.callGraph.callsFrom.size}`);
    console.log(`     Functions being called: ${this.callGraph.callsTo.size}`);
  }

  /**
   * Analyze recursion patterns in the call graph.
   * 
   * Detects:
   * 1. Direct recursion: foo() calls foo()
   * 2. Mutual recursion: foo() -> bar() -> foo()
   * 3. Tail recursion: recursive call is last operation
   */
  private analyzeRecursion(): void {
    LoggingConfig.raw('[CG] Analyzing recursion patterns...');

    // STEP 1: Detect direct recursion
    this.detectDirectRecursion();

    // STEP 2: Detect mutual recursion using DFS
    this.detectMutualRecursion();

    // STEP 3: Detect tail recursion
    this.detectTailRecursion();
  }

  /**
   * Detect direct recursion (function calls itself).
   */
  private detectDirectRecursion(): void {
    for (const call of this.callGraph.calls) {
      if (call.callerId === call.calleeId) {
        const metadata = this.callGraph.functions.get(call.callerId);
        if (metadata) {
          metadata.isRecursive = true;
          LoggingConfig.raw(`[CG] Direct recursion detected: ${call.callerId}()`);
        }
      }
    }
  }

  /**
   * Detect mutual recursion (cycles in call graph).
   * 
   * Uses depth-first search to find cycles.
   * 
   * Example:
   * foo() -> bar() -> baz() -> foo()  // Cycle detected
   */
  private detectMutualRecursion(): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const funcId of this.callGraph.functions.keys()) {
      if (!visited.has(funcId)) {
        this.dfsForCycles(funcId, visited, recursionStack);
      }
    }
  }

  /**
   * DFS helper to detect cycles in call graph.
   */
  private dfsForCycles(
    funcId: string,
    visited: Set<string>,
    stack: Set<string>
  ): boolean {
    visited.add(funcId);
    stack.add(funcId);

    // Get all functions this one calls
    const outgoingCalls = this.callGraph.callsFrom.get(funcId) || [];

    for (const call of outgoingCalls) {
      if (!visited.has(call.calleeId)) {
        if (this.dfsForCycles(call.calleeId, visited, stack)) {
          return true;
        }
      } else if (stack.has(call.calleeId)) {
        // Found a cycle
        console.log(
          `[CG] Mutual recursion detected: ` +
          `${funcId}() <- ${call.calleeId}()`
        );
        return true;
      }
    }

    stack.delete(funcId);
    return false;
  }

  /**
   * Detect tail recursion (recursive call is last operation).
   * 
   * Example:
   * ```cpp
   * int factorial(int n) {
   *   if (n <= 1) return 1;
   *   return n * factorial(n-1);  // Tail recursion
   * }
   * ```
   * 
   * Tail recursion can be optimized by compiler.
   */
  private detectTailRecursion(): void {
    for (const [funcName, metadata] of this.callGraph.functions.entries()) {
      // Find exit blocks (no successors)
      const exitBlocks = Array.from(metadata.cfg.blocks.values()).filter(
        b => b.successors.length === 0
      );

      for (const exitBlock of exitBlocks) {
        if (exitBlock.statements.length === 0) continue;

        // Check if last statement is a recursive return
        const lastStmt = exitBlock.statements[exitBlock.statements.length - 1];
        const tailRecursionPattern = new RegExp(
          `return\\s+${funcName}\\s*\\(`
        );
        const stmtText = lastStmt.content || lastStmt.text;

        if (tailRecursionPattern.test(stmtText)) {
          LoggingConfig.raw(`[CG] Tail recursion opportunity: ${funcName}()`);
        }
      }
    }
  }

  /**
   * Generate DOT format representation of call graph.
   * 
   * Can be visualized with Graphviz:
   * ```bash
   * dot -Tpng callgraph.dot -o callgraph.png
   * ```
   * 
   * @returns DOT format string
   */
  public generateDOT(): string {
    let dot = 'digraph CallGraph {\n';
    dot += '  rankdir=LR;\n';
    dot += '  node [shape=box];\n\n';

    // Add function nodes with styling
    for (const [funcId, metadata] of this.callGraph.functions.entries()) {
      let attrs = '';

      // External functions: dotted style
      if (metadata.isExternal) {
        attrs += '[style=dotted]';
      }

      // Recursive functions: red color
      if (metadata.isRecursive) {
        attrs += '[color=red]';
      }

      dot += `  "${funcId}" ${attrs};\n`;
    }

    dot += '\n';

    // Add call edges
    for (const call of this.callGraph.calls) {
      const label = call.arguments.actual.length > 0
        ? `[label="${call.arguments.actual.length} args"]`
        : '';

      dot += `  "${call.callerId}" -> "${call.calleeId}" ${label};\n`;
    }

    dot += '}\n';
    return dot;
  }

  /**
   * Export call graph as JSON.
   * 
   * Useful for serialization and debugging.
   * 
   * @returns JSON representation
   */
  public toJSON(): object {
    return {
      functions: Array.from(this.callGraph.functions.entries()).map(
        ([id, meta]) => ({
          id,
          name: meta.name,
          parameters: meta.parameters.length,
          isExternal: meta.isExternal,
          isRecursive: meta.isRecursive,
          callCount: meta.callsCount
        })
      ),
      calls: this.callGraph.calls.map(call => ({
        from: call.callerId,
        to: call.calleeId,
        args: call.arguments.actual,
        line: call.callSite.line
      })),
      summary: {
        totalFunctions: this.callGraph.functions.size,
        totalCalls: this.callGraph.calls.length,
        externalFunctions: Array.from(this.callGraph.functions.values())
          .filter(m => m.isExternal).length,
        recursiveFunctions: Array.from(this.callGraph.functions.values())
          .filter(m => m.isRecursive).length
      }
    };
  }

  /**
   * Get all functions that call a given function.
   * 
   * @param funcId - Function to analyze
   * @returns Array of calling functions
   */
  public getCallers(funcId: string): string[] {
    const calls = this.callGraph.callsTo.get(funcId) || [];
    return [...new Set(calls.map(c => c.callerId))];
  }

  /**
   * Get all functions called by a given function.
   * 
   * @param funcId - Function to analyze
   * @returns Array of called functions
   */
  public getCallees(funcId: string): string[] {
    const calls = this.callGraph.callsFrom.get(funcId) || [];
    return [...new Set(calls.map(c => c.calleeId))];
  }
}

