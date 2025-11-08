/**
 * CallGraphAnalyzer - Builds call graphs for inter-procedural analysis
 * 
 * This module implements Phase 1 of the IPA framework:
 * - Build call graph infrastructure
 * - Extract function calls from CFG
 * - Create caller/callee relationships
 * 
 * A call graph represents function call relationships in a program.
 * It answers: "Which functions call which other functions?"
 * 
 * Example call graph:
 * main() -> [printf, foo]
 * foo() -> [bar, foo]        (recursive!)
 * bar() -> []
 * printf() -> []             (external library)
 * 
 * Academic Foundation:
 * - "Interprocedural Constant Propagation" (Callahan et al., 1986)
 * - Chapter 9: Inter-Procedural Analysis, "Engineering a Compiler"
 */

import { FunctionCFG, BasicBlock, Statement } from '../types';
import { FunctionCallExtractor } from './FunctionCallExtractor';

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
    console.log('[CG] Starting call graph generation');
    console.log(`[CG] Processing ${this.allFunctions.size} functions`);

    // STEP 1: Index all functions with metadata
    this.indexFunctions();

    // STEP 2: Extract function calls from each function
    this.extractFunctionCalls();

    // STEP 3: Build relationship maps for fast lookup
    this.buildRelationshipMaps();

    // STEP 4: Analyze recursion patterns
    this.analyzeRecursion();

    // STEP 5: Log summary
    console.log(`[CG] Call graph complete:`);
    console.log(`     Functions: ${this.callGraph.functions.size}`);
    console.log(`     Calls: ${this.callGraph.calls.length}`);
    console.log(`     Callers: ${this.callGraph.callsFrom.size}`);
    console.log(`     Callees: ${this.callGraph.callsTo.size}`);

    return this.callGraph;
  }

  /**
   * Index all functions and extract metadata.
   * 
   * Creates FunctionMetadata for each function in the program.
   * This metadata will be used throughout inter-procedural analysis.
   */
  private indexFunctions(): void {
    console.log('[CG] Indexing functions...');

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
      console.log(`[CG]   Indexed function: ${funcName} with ${parameters.length} params`);
    }
  }

  /**
   * Extract function parameters from CFG.
   * 
   * In the CFG, parameters typically appear in the entry block.
   * We extract them from parameter declaration statements.
   * 
   * @param cfg - Function CFG
   * @returns Array of parameter metadata
   */
  private extractParameters(cfg: FunctionCFG): FunctionMetadata['parameters'] {
    const parameters: FunctionMetadata['parameters'] = [];

    // Look through all blocks for parameter-like patterns
    // (In real implementation, might need to parse function signature)
    // For now, return empty as this is handled by parser

    return parameters;
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
    console.log('[CG] Extracting function calls...');

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

    console.log(`[CG] Found ${callCount} function calls total`);
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
      const calleeId = extractedCall.name;
      
      // Skip if it's a keyword (not a function)
      if (this.keywords.has(calleeId)) {
        continue;
      }
      
      // Extract arguments for this call
      const args = extractedCall.arguments;
      
      // Check if return value is used
      const returnUsed = this.isReturnValueUsed(extractedCall.callExpression, calleeId);
      
      // Create FunctionCall record
      const call: FunctionCall = {
        callerId: callerName,
        calleeId,
        callSite: {
          blockId,
          statementId: stmt.id || `${blockId}_call_${calleeId}`,
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
    
    return calls;
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
    // Pattern 1: Assignment
    if (new RegExp(`\\w+\\s*=\\s*${funcName}\\(`).test(stmt)) {
      return true;
    }

    // Pattern 2: Used in conditional
    if (new RegExp(`if\\s*\\(.*${funcName}\\(`).test(stmt)) {
      return true;
    }

    // Pattern 3: Returned from function
    if (new RegExp(`return\\s+${funcName}\\(`).test(stmt)) {
      return true;
    }

    // Pattern 4: Used in arithmetic expression
    if (new RegExp(`\\+\\s*${funcName}\\(|\\*\\s*${funcName}\\(`).test(stmt)) {
      return true;
    }

    // Not used
    return false;
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
    console.log('[CG] Building relationship maps...');

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

    console.log(`[CG] Relationship maps built:`);
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
    console.log('[CG] Analyzing recursion patterns...');

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
          console.log(`[CG] Direct recursion detected: ${call.callerId}()`);
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
          console.log(`[CG] Tail recursion opportunity: ${funcName}()`);
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

