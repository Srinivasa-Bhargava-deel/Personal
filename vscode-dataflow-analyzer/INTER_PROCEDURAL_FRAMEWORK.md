# Inter-Procedural Analysis Implementation Framework

**Version**: 1.0  
**Date**: November 2025  
**Target Release**: v1.2  
**Status**: Planning & Design

---

## 📚 **Table of Contents**

1. [Overview](#overview)
2. [Phase 1: Foundation](#phase-1-foundation)
3. [Phase 2: Call Graph Generation](#phase-2-call-graph-generation)
4. [Phase 3: Inter-Procedural Data Flow](#phase-3-inter-procedural-data-flow)
5. [Phase 4: Parameter & Return Value Analysis](#phase-4-parameter--return-value-analysis)
6. [Phase 5: Context Sensitivity](#phase-5-context-sensitivity)
7. [Phase 6: Integration & Testing](#phase-6-integration--testing)
8. [Phase 7: Optimization](#phase-7-optimization)
9. [Academic References](#academic-references)

---

## 🎯 **Overview**

### What is Inter-Procedural Analysis?

Inter-procedural analysis (IPA) extends single-function dataflow analysis to analyze programs across function boundaries. Instead of analyzing each function in isolation, IPA tracks how data flows through function calls, parameters, return values, and global variables.

### Key Differences from Intra-Procedural Analysis

| Aspect | Intra-Procedural | Inter-Procedural |
|--------|------------------|------------------|
| **Scope** | Single function | Entire program |
| **Function Calls** | Treated as black boxes | Analyzed in detail |
| **Parameters** | Not tracked across calls | Mapped to arguments |
| **Return Values** | Ignored | Propagated to caller |
| **Globals** | May be imprecise | Precisely tracked |
| **Complexity** | O(n) | O(n³) to O(n⁴) |
| **Precision** | ~70-80% | ~90-95% |
| **Context Sensitivity** | N/A | Critical for accuracy |

### Benefits for Security Analysis

1. **Taint Analysis**: Track taint from external input through entire program
2. **Use-After-Free Detection**: Find references to freed objects across calls
3. **Buffer Overflow**: Track buffer sizes through function boundaries
4. **SQL Injection**: Follow user input through database calls
5. **Null Dereference**: Track null values across function calls

---

## **PHASE 1: FOUNDATION**

### Step 1.1: Build Call Graph Infrastructure

**Objective**: Create data structures to represent program call relationships

#### 1.1.1 Define Call Graph Types

Create new file: `src/analyzer/CallGraphAnalyzer.ts`

```typescript
/**
 * Represents a function call in the program.
 */
export interface FunctionCall {
  callerId: string;              // Function making the call
  calleeId: string;              // Function being called
  callSite: {
    blockId: string;             // CFG block where call occurs
    statementId: string;         // Statement ID of call
    line: number;
    column: number;
  };
  arguments: {
    actual: string[];            // Actual argument expressions
    types: string[];             // Argument types
  };
  returnValueUsed: boolean;      // Whether return value is used
}

/**
 * Represents the call graph.
 */
export interface CallGraph {
  functions: Map<string, FunctionMetadata>;
  calls: FunctionCall[];
  callsFrom: Map<string, FunctionCall[]>;  // Caller -> calls it makes
  callsTo: Map<string, FunctionCall[]>;    // Callee -> calls to it
}

/**
 * Metadata about a function for analysis.
 */
export interface FunctionMetadata {
  name: string;
  cfg: FunctionCFG;
  parameters: {
    name: string;
    type: string;
    position: number;
  }[];
  returnType: string;
  isExternal: boolean;           // Library function?
  isRecursive: boolean;          // Recursive call?
  callsCount: number;            // How many times called
}

/**
 * Call site context for analysis.
 */
export interface CallSiteContext {
  callerId: string;
  calleeId: string;
  argumentMapping: Map<string, string>;  // param -> argument
  returnValueVariable: string | null;
}
```

#### 1.1.2 Create Call Graph Analyzer Class

```typescript
export class CallGraphAnalyzer {
  private callGraph: CallGraph;
  private allFunctions: Map<string, FunctionCFG>;

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
   * Build complete call graph for all functions.
   * 
   * Steps:
   * 1. Index all functions and their metadata
   * 2. Extract function calls from CFG statements
   * 3. Build caller/callee relationships
   * 4. Detect recursion
   * 5. Identify external library calls
   * 
   * @returns Complete call graph
   */
  buildCallGraph(): CallGraph {
    // STEP 1: Index all functions
    this.indexFunctions();

    // STEP 2: Extract calls from each function
    this.extractFunctionCalls();

    // STEP 3: Build relationship maps
    this.buildRelationshipMaps();

    // STEP 4: Analyze recursion
    this.analyzeRecursion();

    return this.callGraph;
  }

  private indexFunctions(): void {
    // Implementation in next section
  }

  private extractFunctionCalls(): void {
    // Implementation in next section
  }

  private buildRelationshipMaps(): void {
    // Implementation in next section
  }

  private analyzeRecursion(): void {
    // Implementation in next section
  }
}
```

### Step 1.2: Extract Function Calls from CFG

**Objective**: Identify all function call statements in the program

#### 1.2.1 Call Detection Strategy

```typescript
/**
 * Detect function calls in a statement.
 * 
 * Patterns to match:
 * 1. Direct calls: functionName(args)
 * 2. Method calls: object.method(args)
 * 3. Pointer calls: (*funcPtr)(args)
 * 4. Recursive calls: same function name
 * 5. Library calls: std::, system calls
 */
private extractFunctionCalls(): void {
  for (const [funcName, funcCFG] of this.allFunctions.entries()) {
    // Iterate through all blocks in function
    for (const [blockId, block] of funcCFG.blocks.entries()) {
      // Iterate through all statements in block
      for (const stmt of block.statements) {
        // STEP 1: Check if statement contains function call
        const callPattern = /([a-zA-Z_]\w*)\s*\(/g;
        const matches = stmt.content.matchAll(callPattern);

        for (const match of matches) {
          const calleeId = match[1];

          // STEP 2: Validate it's a real function call (not keyword)
          if (this.isKeyword(calleeId)) continue;

          // STEP 3: Determine if call to known function or external
          const isKnown = this.allFunctions.has(calleeId);
          const isRecursive = calleeId === funcName;

          // STEP 4: Extract arguments
          const args = this.extractArguments(stmt.content, calleeId);

          // STEP 5: Create FunctionCall record
          const call: FunctionCall = {
            callerId: funcName,
            calleeId,
            callSite: {
              blockId,
              statementId: stmt.id || `${blockId}_${calleeId}`,
              line: stmt.range?.start.line ?? 0,
              column: stmt.range?.start.column ?? 0
            },
            arguments: {
              actual: args,
              types: this.inferArgumentTypes(args)
            },
            returnValueUsed: this.isReturnValueUsed(stmt.content, calleeId)
          };

          this.callGraph.calls.push(call);
          console.log(`[CG] Found call: ${funcName} -> ${calleeId} at ${blockId}`);
        }
      }
    }
  }
}

/**
 * Check if identifier is a C++ keyword (not a function).
 */
private isKeyword(id: string): boolean {
  const keywords = [
    'if', 'else', 'while', 'for', 'do', 'switch', 'case', 'default',
    'return', 'break', 'continue', 'goto', 'sizeof', 'typedef',
    'struct', 'class', 'enum', 'union', 'const', 'volatile',
    'static', 'extern', 'auto', 'register', 'inline', 'virtual',
    'private', 'public', 'protected', 'new', 'delete', 'throw'
  ];
  return keywords.includes(id);
}

/**
 * Extract function arguments from call statement.
 * 
 * Example: foo(x, y+1, bar(z))
 * Returns: ['x', 'y+1', 'bar(z)']
 */
private extractArguments(stmt: string, funcName: string): string[] {
  const pattern = new RegExp(`${funcName}\\s*\\(([^)]*)\\)`);
  const match = stmt.match(pattern);
  if (!match) return [];

  const argsStr = match[1];
  if (!argsStr.trim()) return [];

  // Split by comma, but be careful with nested parens
  const args: string[] = [];
  let current = '';
  let parenDepth = 0;

  for (const char of argsStr) {
    if (char === '(') parenDepth++;
    else if (char === ')') parenDepth--;
    else if (char === ',' && parenDepth === 0) {
      args.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }

  if (current.trim()) args.push(current.trim());
  return args;
}

/**
 * Infer types of arguments based on variable analysis.
 */
private inferArgumentTypes(args: string[]): string[] {
  return args.map(arg => {
    // Simplified type inference
    if (arg.match(/^\d+$/)) return 'int';
    if (arg.match(/^\d+\.\d+$/)) return 'double';
    if (arg.match(/^".*"$/)) return 'const char*';
    if (arg.includes('[')) return 'array';
    return 'auto';  // Let compiler deduce
  });
}

/**
 * Determine if return value is actually used.
 * 
 * Examples:
 * x = foo(y);      // Used
 * if (foo(y)) ...  // Used
 * foo(y);          // Not used
 */
private isReturnValueUsed(stmt: string, funcName: string): boolean {
  const pattern = new RegExp(
    `\\w+\\s*=\\s*${funcName}\\(|` +  // Assignment
    `if\\s*\\(.*${funcName}\\(|` +    // Conditional
    `return\\s+${funcName}\\(`        // Return
  );
  return pattern.test(stmt);
}
```

### Step 1.3: Build Relationship Maps

```typescript
/**
 * Build caller/callee relationship maps for fast lookup.
 */
private buildRelationshipMaps(): void {
  // STEP 1: Clear existing maps
  this.callGraph.callsFrom.clear();
  this.callGraph.callsTo.clear();

  // STEP 2: Populate callsFrom map (who calls whom)
  for (const call of this.callGraph.calls) {
    if (!this.callGraph.callsFrom.has(call.callerId)) {
      this.callGraph.callsFrom.set(call.callerId, []);
    }
    this.callGraph.callsFrom.get(call.callerId)!.push(call);
  }

  // STEP 3: Populate callsTo map (who is called by whom)
  for (const call of this.callGraph.calls) {
    if (!this.callGraph.callsTo.has(call.calleeId)) {
      this.callGraph.callsTo.set(call.calleeId, []);
    }
    this.callGraph.callsTo.get(call.calleeId)!.push(call);
  }

  console.log(`[CG] Call graph built:`);
  console.log(`     Functions: ${this.callGraph.functions.size}`);
  console.log(`     Calls: ${this.callGraph.calls.length}`);
  console.log(`     Callers: ${this.callGraph.callsFrom.size}`);
  console.log(`     Callees: ${this.callGraph.callsTo.size}`);
}
```

---

## **PHASE 2: CALL GRAPH GENERATION**

### Step 2.1: Recursion Detection

**Objective**: Identify recursive and mutually recursive functions

```typescript
/**
 * Analyze recursion patterns in call graph.
 * 
 * Types:
 * 1. Direct recursion: foo() calls foo()
 * 2. Mutual recursion: foo() -> bar() -> foo()
 * 3. Tail recursion: recursive call is last operation
 * 4. Deep recursion: many nested recursive calls
 */
private analyzeRecursion(): void {
  // STEP 1: Detect direct recursion
  for (const call of this.callGraph.calls) {
    if (call.callerId === call.calleeId) {
      const metadata = this.callGraph.functions.get(call.callerId);
      if (metadata) {
        metadata.isRecursive = true;
        console.log(`[CG] Direct recursion: ${call.callerId}`);
      }
    }
  }

  // STEP 2: Detect mutual recursion using DFS
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  for (const funcId of this.callGraph.functions.keys()) {
    if (!visited.has(funcId)) {
      this.detectMutualRecursion(funcId, visited, recursionStack);
    }
  }

  // STEP 3: Mark tail recursion
  this.detectTailRecursion();
}

/**
 * Detect mutual recursion using depth-first search.
 */
private detectMutualRecursion(
  funcId: string,
  visited: Set<string>,
  stack: Set<string>
): boolean {
  visited.add(funcId);
  stack.add(funcId);

  // Get all functions this one calls
  const calls = this.callGraph.callsFrom.get(funcId) || [];

  for (const call of calls) {
    if (!visited.has(call.calleeId)) {
      if (this.detectMutualRecursion(call.calleeId, visited, stack)) {
        return true;
      }
    } else if (stack.has(call.calleeId)) {
      // Found cycle
      console.log(`[CG] Mutual recursion cycle detected: ${call.calleeId} <- ${funcId}`);
      return true;
    }
  }

  stack.delete(funcId);
  return false;
}

/**
 * Detect tail recursion (recursive call is last operation).
 */
private detectTailRecursion(): void {
  for (const [funcName, funcCFG] of this.allFunctions.entries()) {
    // Find exit block
    const exitBlock = Array.from(funcCFG.blocks.values()).find(
      b => b.successors.length === 0
    );

    if (!exitBlock) continue;

    // Check last statement in exit block
    if (exitBlock.statements.length === 0) continue;

    const lastStmt = exitBlock.statements[exitBlock.statements.length - 1];

    // Check if it's a recursive return call
    const recursiveCallPattern = new RegExp(
      `return\\s+${funcName}\\s*\\(`
    );

    if (recursiveCallPattern.test(lastStmt.content)) {
      console.log(`[CG] Tail recursion detected: ${funcName}`);
      // Mark for optimization opportunity
    }
  }
}
```

### Step 2.2: External Function Identification

**Objective**: Identify library calls and external functions

```typescript
/**
 * Identify external/library function calls.
 * 
 * Categories:
 * 1. Standard library: std::, libc functions
 * 2. System calls: open, read, write, etc.
 * 3. POSIX functions: pthread, semaphore, etc.
 * 4. Third-party libraries: any unresolved calls
 */
private identifyExternalFunctions(): void {
  const externalPatterns = {
    stdlib: /^std::\w+|^(printf|scanf|malloc|free|memcpy|strcpy)$/,
    posix: /^(pthread_|sem_|fork|exec|open|read|write|close)$/,
    system: /^(system|exit|abort|signal)$/
  };

  for (const call of this.callGraph.calls) {
    // If callee not found in our program, it's external
    if (!this.allFunctions.has(call.calleeId)) {
      for (const [category, pattern] of Object.entries(externalPatterns)) {
        if (pattern.test(call.calleeId)) {
          console.log(
            `[CG] External ${category} call: ${call.calleeId} from ${call.callerId}`
          );
          break;
        }
      }

      const metadata = this.callGraph.functions.get(call.calleeId);
      if (metadata) {
        metadata.isExternal = true;
      }
    }
  }
}
```

### Step 2.3: Call Graph Visualization

**Objective**: Provide tools to visualize the call graph

```typescript
/**
 * Generate DOT format for call graph visualization.
 * Can be visualized with Graphviz.
 */
public generateDOT(): string {
  let dot = 'digraph CallGraph {\n';
  dot += '  rankdir=LR;\n';
  dot += '  node [shape=box];\n\n';

  // Add function nodes
  for (const [funcId, metadata] of this.callGraph.functions.entries()) {
    const style = metadata.isExternal ? '[style=dotted]' : '';
    const color = metadata.isRecursive ? '[color=red]' : '';
    dot += `  "${funcId}" ${style} ${color};\n`;
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
 * Generate JSON representation of call graph.
 */
public toJSON(): object {
  return {
    functions: Array.from(this.callGraph.functions.entries()).map(
      ([id, meta]) => ({
        id,
        name: meta.name,
        isExternal: meta.isExternal,
        isRecursive: meta.isRecursive,
        callCount: meta.callsCount,
        paramCount: meta.parameters.length
      })
    ),
    calls: this.callGraph.calls.map(call => ({
      from: call.callerId,
      to: call.calleeId,
      args: call.arguments.actual,
      line: call.callSite.line
    }))
  };
}
```

---

## **PHASE 3: INTER-PROCEDURAL DATA FLOW**

### Step 3.1: Context-Insensitive Analysis

**Objective**: Implement basic inter-procedural dataflow without context sensitivity

```typescript
/**
 * Context-insensitive inter-procedural reaching definitions.
 * 
 * Algorithm:
 * 1. Analyze each function independently
 * 2. At call sites, merge definitions from callee
 * 3. At function returns, merge definitions back to caller
 * 4. Propagate through global variables
 * 5. Iterate until fixed point
 */
export class InterProceduralReachingDefinitions {
  private callGraph: CallGraph;
  private intraReachingDefs: Map<string, Map<string, ReachingDefinitionsInfo>>;
  private globalDefinitions: Map<string, ReachingDefinition[]>;

  constructor(
    callGraph: CallGraph,
    intraReachingDefs: Map<string, Map<string, ReachingDefinitionsInfo>>
  ) {
    this.callGraph = callGraph;
    this.intraReachingDefs = intraReachingDefs;
    this.globalDefinitions = new Map();
  }

  /**
   * Perform inter-procedural reaching definitions analysis.
   */
  analyze(): Map<string, Map<string, ReachingDefinitionsInfo>> {
    console.log('[IPA] Starting inter-procedural reaching definitions analysis');

    // STEP 1: Compute intra-procedural reaching definitions first
    // (This is already done, passed in constructor)

    // STEP 2: Iterate until fixed point
    let iteration = 0;
    let changed = true;

    while (changed && iteration < 10) {
      iteration++;
      changed = false;
      console.log(`[IPA] Iteration ${iteration}`);

      // Process all functions
      for (const [funcId, metadata] of this.callGraph.functions.entries()) {
        if (metadata.isExternal) continue;

        const funcCFG = metadata.cfg;

        // STEP 3: For each function, analyze its calls
        for (const block of funcCFG.blocks.values()) {
          for (const stmt of block.statements) {
            // Check if statement is a function call
            const callInfo = this.extractCallInfo(stmt, funcId);
            if (callInfo) {
              // STEP 4: Propagate definitions through call
              if (this.propagateDefinitionsAtCall(callInfo)) {
                changed = true;
              }
            }
          }
        }
      }
    }

    console.log(`[IPA] Fixed point reached after ${iteration} iterations`);
    return this.intraReachingDefs;
  }

  /**
   * Propagate definitions at a call site.
   * 
   * Steps:
   * 1. Get definitions before call (IN set)
   * 2. Analyze called function
   * 3. Get definitions from callee
   * 4. Map formal parameters to actual arguments
   * 5. Merge definitions at call site
   * 6. Continue with definitions after call
   */
  private propagateDefinitionsAtCall(
    callInfo: CallSiteContext
  ): boolean {
    // Get reaching definitions at call site
    const callerDefs = this.intraReachingDefs.get(callInfo.callerId);
    const calleeDefs = this.intraReachingDefs.get(callInfo.calleeId);

    if (!callerDefs || !calleeDefs) return false;

    let changed = false;

    // For each definition in callee
    for (const [blockId, info] of calleeDefs.entries()) {
      // Check if this definition could affect the caller
      for (const [varName, defs] of info.out.entries()) {
        // STEP 1: Check if variable is parameter
        const paramIndex = this.findParameterIndex(callInfo.calleeId, varName);

        if (paramIndex >= 0) {
          // STEP 2: Map parameter to actual argument
          const actualArg = callInfo.argumentMapping.get(varName);

          if (actualArg) {
            // STEP 3: Add definition of actual argument
            for (const def of defs) {
              // Propagate definition to caller
              // (Implementation continues...)
            }
          }
        } else if (this.isGlobal(varName)) {
          // STEP 4: Handle global variable definitions
          changed = true;
        }
      }
    }

    return changed;
  }

  private extractCallInfo(
    stmt: Statement,
    funcId: string
  ): CallSiteContext | null {
    // Find matching call in call graph
    const calls = this.callGraph.callsFrom.get(funcId) || [];

    for (const call of calls) {
      if (stmt.content.includes(`${call.calleeId}(`)) {
        return {
          callerId: funcId,
          calleeId: call.calleeId,
          argumentMapping: new Map(),
          returnValueVariable: null
        };
      }
    }

    return null;
  }

  private findParameterIndex(funcId: string, varName: string): number {
    const metadata = this.callGraph.functions.get(funcId);
    if (!metadata) return -1;

    return metadata.parameters.findIndex(p => p.name === varName);
  }

  private isGlobal(varName: string): boolean {
    // Check if variable is global
    return !varName.startsWith('_');
  }
}
```

---

## **PHASE 4: PARAMETER & RETURN VALUE ANALYSIS**

### Step 4.1: Parameter Mapping

**Objective**: Map formal parameters to actual arguments at call sites

```typescript
/**
 * Sophisticated parameter mapping strategy.
 * 
 * Types of mappings:
 * 1. Direct: formal param directly receives actual arg
 * 2. Derived: param receives result of expression
 * 3. Composite: param receives structure member
 * 4. Pointer: param receives address of variable
 */
export class ParameterAnalyzer {
  /**
   * Map formal parameters to actual arguments.
   */
  mapParameters(
    call: FunctionCall,
    callee: FunctionMetadata
  ): Map<string, string> {
    const mapping = new Map<string, string>();

    // STEP 1: Match by position
    for (let i = 0; i < callee.parameters.length && i < call.arguments.actual.length; i++) {
      const formalParam = callee.parameters[i].name;
      const actualArg = call.arguments.actual[i];

      mapping.set(formalParam, actualArg);

      console.log(`[PA] Map param: ${formalParam} <- ${actualArg}`);
    }

    return mapping;
  }

  /**
   * Track how argument values are derived.
   * 
   * Examples:
   * foo(x)           -> direct reference
   * foo(x + 1)       -> derived expression
   * foo(obj.field)   -> composite access
   * foo(&x)          -> address-of
   * foo(func(y))     -> function result
   */
  analyzeArgumentDerivation(arg: string): {
    type: 'direct' | 'expression' | 'composite' | 'address' | 'call';
    base: string;
    transformations: string[];
  } {
    // STEP 1: Check for address-of
    if (arg.startsWith('&')) {
      return {
        type: 'address',
        base: arg.substring(1),
        transformations: ['&']
      };
    }

    // STEP 2: Check for function call
    if (arg.includes('(') && arg.includes(')')) {
      const funcMatch = arg.match(/(\w+)\s*\(/);
      return {
        type: 'call',
        base: funcMatch ? funcMatch[1] : arg,
        transformations: ['call']
      };
    }

    // STEP 3: Check for member access
    if (arg.includes('.') || arg.includes('->')) {
      const parts = arg.split(/[.-]/);
      return {
        type: 'composite',
        base: parts[0],
        transformations: parts.slice(1)
      };
    }

    // STEP 4: Check for expression
    if (arg.match(/[\+\-\*\/\%]/)) {
      const baseMatch = arg.match(/(\w+)/);
      return {
        type: 'expression',
        base: baseMatch ? baseMatch[1] : arg,
        transformations: ['arithmetic']
      };
    }

    // Direct reference
    return {
      type: 'direct',
      base: arg,
      transformations: []
    };
  }
}
```

### Step 4.2: Return Value Analysis

```typescript
/**
 * Analyze how return values flow back to callers.
 * 
 * Types:
 * 1. Variable return: return x;
 * 2. Expression return: return x + 1;
 * 3. Call return: return foo();
 * 4. No return: implicit return (void)
 */
export class ReturnValueAnalyzer {
  /**
   * Extract all return statements from function.
   */
  analyzeReturns(funcCFG: FunctionCFG): {
    value: string;
    blockId: string;
    type: string;
  }[] {
    const returns: any[] = [];

    // STEP 1: Find all blocks that have return statements
    for (const [blockId, block] of funcCFG.blocks.entries()) {
      for (const stmt of block.statements) {
        if (stmt.content.includes('return')) {
          // STEP 2: Extract return value
          const match = stmt.content.match(/return\s+(.+);?$/);

          if (match) {
            const returnValue = match[1].trim();

            returns.push({
              value: returnValue,
              blockId,
              type: this.inferReturnType(returnValue)
            });

            console.log(`[RA] Return: ${returnValue} from block ${blockId}`);
          } else {
            // Void return or just 'return;'
            returns.push({
              value: '',
              blockId,
              type: 'void'
            });
          }
        }
      }
    }

    return returns;
  }

  private inferReturnType(returnValue: string): string {
    if (!returnValue) return 'void';
    if (returnValue.match(/^\d+$/)) return 'int';
    if (returnValue.match(/^\d+\.\d+$/)) return 'double';
    if (returnValue.match(/^".*"$/)) return 'const char*';
    if (returnValue.match(/^(true|false)$/)) return 'bool';
    if (returnValue.includes('nullptr')) return 'nullptr';
    return 'auto';
  }

  /**
   * Propagate return values to call sites.
   */
  propagateReturnValue(
    call: FunctionCall,
    returnValues: any[],
    callSiteStmt: Statement
  ): void {
    // STEP 1: Find where return value is assigned
    if (!call.returnValueUsed) {
      console.log(`[RA] Return value not used: ${call.calleeId}`);
      return;
    }

    // STEP 2: Determine variable receiving return value
    const assignMatch = callSiteStmt.content.match(/(\w+)\s*=\s*\w+\(/);
    if (!assignMatch) {
      return;
    }

    const receivingVar = assignMatch[1];

    // STEP 3: For each return path, create definition
    for (const ret of returnValues) {
      console.log(
        `[RA] Propagate: ${receivingVar} <- ${ret.value} ` +
        `(from block ${ret.blockId})`
      );

      // Create reaching definition for return value
      // (Implementation continues...)
    }
  }
}
```

---

## **PHASE 5: CONTEXT SENSITIVITY**

### Step 5.1: Call-Site Context

**Objective**: Track which call site produced a value (k-limited context)

```typescript
/**
 * Call-site context for context-sensitive analysis.
 * 
 * Example (k=2):
 * main -> foo -> bar: context = [main, foo]
 * 
 * This allows distinguishing:
 * bar called from foo (called from main)
 * vs
 * bar called from foo (called from other)
 */
export class ContextSensitiveAnalyzer {
  private contextSize: number = 2;  // k-limited context

  /**
   * Build context for a function instance.
   */
  buildContext(callStack: string[]): string[] {
    // STEP 1: Limit context to k elements
    if (callStack.length > this.contextSize) {
      return callStack.slice(-this.contextSize);
    }
    return [...callStack];
  }

  /**
   * Create unique context ID.
   */
  contextId(context: string[]): string {
    return context.join(' -> ');
  }

  /**
   * Check if contexts are compatible.
   */
  contextsCompatible(ctx1: string[], ctx2: string[]): boolean {
    // Contexts compatible if their recent k elements match
    const k = Math.min(this.contextSize, ctx1.length, ctx2.length);
    return ctx1.slice(-k).join() === ctx2.slice(-k).join();
  }
}

/**
 * Flow-sensitive context tracking.
 * 
 * Associates each value with the context in which it was created.
 */
export interface ValueContext {
  value: string;
  context: string[];  // Call stack
  definition: ReachingDefinition;
  timestamp: number;  // When value was created
}
```

### Step 5.2: Summaries for Library Functions

```typescript
/**
 * Function summaries for external/library functions.
 * 
 * Since we can't analyze library source, we provide:
 * 1. Parameter effects: which params are read/written
 * 2. Return values: what the function returns
 * 3. Side effects: global modifications
 * 4. Taint propagation: which params taint return value
 */
export interface FunctionSummary {
  name: string;
  parameters: {
    index: number;
    name: string;
    mode: 'in' | 'out' | 'inout';  // Read/write/both
    taintPropagation: boolean;  // Does param taint return?
  }[];
  returnValue: {
    type: string;
    isTainted: boolean;
    depends: number[];  // Which params it depends on
  };
  globalEffects: {
    variable: string;
    modified: boolean;
    tainted: boolean;
  }[];
}

/**
 * Library function summaries.
 */
const LIBRARY_SUMMARIES: Map<string, FunctionSummary> = new Map([
  [
    'strcpy',
    {
      name: 'strcpy',
      parameters: [
        { index: 0, name: 'dest', mode: 'out', taintPropagation: false },
        { index: 1, name: 'src', mode: 'in', taintPropagation: true }
      ],
      returnValue: { type: 'char*', isTainted: true, depends: [1] },
      globalEffects: []
    }
  ],
  [
    'malloc',
    {
      name: 'malloc',
      parameters: [
        { index: 0, name: 'size', mode: 'in', taintPropagation: false }
      ],
      returnValue: { type: 'void*', isTainted: false, depends: [] },
      globalEffects: []
    }
  ]
  // Add more library functions...
]);

/**
 * Get summary for library function.
 */
export function getFunctionSummary(funcName: string): FunctionSummary | null {
  return LIBRARY_SUMMARIES.get(funcName) || null;
}
```

---

## **PHASE 6: INTEGRATION & TESTING**

### Step 6.1: Integration with DataflowAnalyzer

```typescript
/**
 * Update DataflowAnalyzer.ts to use inter-procedural analysis.
 */

export class DataflowAnalyzer {
  // ... existing code ...

  private callGraphAnalyzer: CallGraphAnalyzer;
  private interProceduralRD: InterProceduralReachingDefinitions;
  private interProceduralLiveness: InterProceduralLiveness;

  constructor(workspacePath: string, config: AnalysisConfig) {
    // ... existing initialization ...
  }

  /**
   * Enhanced analyzeWorkspace with inter-procedural analysis.
   */
  async analyzeWorkspace(): Promise<AnalysisState> {
    // STEP 1: Perform intra-procedural analysis (as before)
    const intraState = await this.analyzeWorkspaceIntraProcedural();

    // STEP 2: Build call graph
    console.log('[Analysis] Building call graph...');
    this.callGraphAnalyzer = new CallGraphAnalyzer(
      intraState.cfg.functions
    );
    const callGraph = this.callGraphAnalyzer.buildCallGraph();

    // STEP 3: Perform inter-procedural analysis
    console.log('[Analysis] Performing inter-procedural analysis...');
    this.interProceduralRD = new InterProceduralReachingDefinitions(
      callGraph,
      intraState.reachingDefinitions
    );
    const interReachingDefs = this.interProceduralRD.analyze();

    // STEP 4: Update state with inter-procedural results
    intraState.reachingDefinitions = interReachingDefs;
    intraState.callGraph = callGraph;

    // STEP 5: Perform taint analysis with inter-procedural information
    console.log('[Analysis] Performing inter-procedural taint analysis...');
    const taint = this.performInterProceduralTaintAnalysis(
      callGraph,
      intraState
    );
    intraState.taintAnalysis = taint;

    // STEP 6: Detect vulnerabilities using inter-procedural data
    const vulnerabilities = this.detectVulnerabilities(intraState);

    // Save and return state
    this.currentState = intraState;
    this.stateManager.saveState(intraState);

    return intraState;
  }

  private performInterProceduralTaintAnalysis(
    callGraph: CallGraph,
    state: AnalysisState
  ): Map<string, any> {
    console.log('[Analysis] Analyzing taint propagation across function boundaries');

    // Trace external inputs through call graph
    // and identify which functions receive tainted data

    return new Map();
  }
}
```

### Step 6.2: Testing Framework

```typescript
/**
 * Unit tests for inter-procedural analysis.
 */

describe('Inter-Procedural Analysis', () => {
  describe('Call Graph Generation', () => {
    it('should detect simple function calls', () => {
      // Test code
    });

    it('should detect recursive calls', () => {
      // Test code
    });

    it('should detect mutual recursion', () => {
      // Test code
    });

    it('should identify external library calls', () => {
      // Test code
    });
  });

  describe('Inter-Procedural Reaching Definitions', () => {
    it('should propagate definitions through function calls', () => {
      // Test code
    });

    it('should handle return values', () => {
      // Test code
    });

    it('should respect context sensitivity', () => {
      // Test code
    });
  });

  describe('Context-Sensitive Analysis', () => {
    it('should distinguish different call sites', () => {
      // Test code
    });

    it('should maintain k-limited context', () => {
      // Test code
    });
  });

  describe('Integration with Dataflow Analysis', () => {
    it('should enhance taint analysis precision', () => {
      // Test code
    });

    it('should detect inter-procedural vulnerabilities', () => {
      // Test code
    });
  });
});
```

---

## **PHASE 7: OPTIMIZATION**

### Step 7.1: Performance Optimization

```typescript
/**
 * Optimization techniques for inter-procedural analysis.
 */

/**
 * Incremental analysis: only re-analyze changed functions.
 */
export class IncrementalIPA {
  private previousCallGraph: CallGraph | null = null;
  private changedFunctions: Set<string> = new Set();

  updateAnalysis(
    newFunctions: Map<string, FunctionCFG>,
    previousFunctions: Map<string, FunctionCFG>
  ): CallGraph {
    // STEP 1: Identify changed functions
    this.identifyChanges(newFunctions, previousFunctions);

    // STEP 2: Invalidate analysis for affected functions
    const affectedFunctions = this.computeAffectedFunctions();

    // STEP 3: Re-analyze only affected functions
    const newCallGraph = this.analyzeIncrementally(
      newFunctions,
      affectedFunctions
    );

    this.previousCallGraph = newCallGraph;
    return newCallGraph;
  }

  private identifyChanges(
    newFunctions: Map<string, FunctionCFG>,
    oldFunctions: Map<string, FunctionCFG>
  ): void {
    // Detect which functions changed
    // (Compare CFG hashes or structure)
  }

  private computeAffectedFunctions(): Set<string> {
    if (!this.previousCallGraph) {
      return new Set(); // First analysis, all functions affected
    }

    // Find transitive closure of functions affected by changes
    const affected = new Set<string>();

    for (const funcId of this.changedFunctions) {
      // Add callers of this function
      const calls = this.previousCallGraph.callsTo.get(funcId) || [];
      calls.forEach(call => affected.add(call.callerId));

      // Add functions called by this function
      const outgoing = this.previousCallGraph.callsFrom.get(funcId) || [];
      outgoing.forEach(call => affected.add(call.calleeId));
    }

    return affected;
  }

  private analyzeIncrementally(
    functions: Map<string, FunctionCFG>,
    affected: Set<string>
  ): CallGraph {
    // Perform analysis only on affected functions
    // Reuse results for non-affected functions
    return new CallGraph();
  }
}

/**
 * Caching for expensive computations.
 */
export class IPA_Cache {
  private reachingDefCache = new Map<string, Map<string, ReachingDefinitionsInfo>>();
  private liveVarsCache = new Map<string, Map<string, LivenessInfo>>();
  private callGraphCache: CallGraph | null = null;

  cacheReachingDefs(funcId: string, defs: Map<string, ReachingDefinitionsInfo>): void {
    this.reachingDefCache.set(funcId, defs);
  }

  getReachingDefs(funcId: string): Map<string, ReachingDefinitionsInfo> | null {
    return this.reachingDefCache.get(funcId) || null;
  }

  invalidateFunction(funcId: string): void {
    this.reachingDefCache.delete(funcId);
    this.liveVarsCache.delete(funcId);
    this.callGraphCache = null;
  }
}
```

### Step 7.2: Precision vs. Performance Trade-offs

```typescript
/**
 * Configuration for IPA precision/performance trade-offs.
 */
export interface IPAConfig {
  // Context sensitivity level (0 = context-insensitive, k = k-limited)
  contextSensitivityLevel: number;

  // Recursion handling
  unrollRecursion: boolean;
  recursionDepthLimit: number;

  // Incremental analysis
  enableIncremental: boolean;
  changeThreshold: number;

  // Caching
  enableCaching: boolean;
  cacheSize: number;

  // Library function summaries
  useSummaries: boolean;

  // Timeout for analysis
  timeoutMs: number;

  // Verbosity
  verbosity: 'silent' | 'minimal' | 'normal' | 'verbose';
}

// Preset configurations
export const IPA_PRESETS = {
  FAST: {
    contextSensitivityLevel: 0,
    unrollRecursion: false,
    enableIncremental: true,
    useSummaries: true,
    timeoutMs: 5000
  } as IPAConfig,

  BALANCED: {
    contextSensitivityLevel: 2,
    unrollRecursion: true,
    recursionDepthLimit: 5,
    enableIncremental: true,
    useSummaries: true,
    timeoutMs: 30000
  } as IPAConfig,

  PRECISE: {
    contextSensitivityLevel: 5,
    unrollRecursion: true,
    recursionDepthLimit: 10,
    enableIncremental: true,
    useSummaries: true,
    timeoutMs: 120000
  } as IPAConfig
};
```

---

## **ACADEMIC REFERENCES**

### Core Papers

1. **"Interprocedural Constant Propagation"**
   - Callahan, Carle, Hall, Kennedy (1986)
   - Foundational work on IPA techniques

2. **"Context-Sensitive Pointer Analysis: Better, Faster, and More Precise"**
   - Hardekopf & Lin (2011)
   - Context sensitivity strategies

3. **"CycleDAG: Cyclic Computation in Program Analysis"**
   - Lattner, Adve (2005)
   - Handling recursion in IPA

4. **"Flow-Sensitive Dataflow Analysis"**
   - Reps, Horwitz, Sagiv (1995)
   - Precise dataflow computation

### Textbooks

- "Engineering a Compiler" - Chapter 9: Inter-Procedural Analysis
- "Static Program Analysis" - Cousot & Cousot (2002)
- "Data Flow Analysis: Theory and Practice" - Khedker, Sanyal, Sathe (2009)

### Algorithms

1. **Worklist Algorithm**: For computing dataflow properties
2. **Strongly Connected Components (SCC)**: For recursion analysis
3. **Depth-First Search (DFS)**: For reachability analysis
4. **Topological Sorting**: For function ordering

---

## **IMPLEMENTATION ROADMAP**

### Week 1: Foundation (Phase 1)
- [ ] Define call graph types and interfaces
- [ ] Implement call extraction from CFG
- [ ] Build relationship maps

### Week 2: Call Graph (Phase 2)
- [ ] Implement recursion detection
- [ ] Identify external functions
- [ ] Add visualization support

### Week 3: Inter-Procedural Data Flow (Phase 3)
- [ ] Implement context-insensitive analysis
- [ ] Add definition propagation through calls
- [ ] Handle return values

### Week 4: Parameters & Returns (Phase 4)
- [ ] Parameter mapping strategies
- [ ] Return value analysis
- [ ] Library function summaries

### Week 5: Context Sensitivity (Phase 5)
- [ ] Implement k-limited context
- [ ] Call-site context tracking
- [ ] Flow-sensitive extensions

### Week 6: Integration & Testing (Phase 6)
- [ ] Integrate with DataflowAnalyzer
- [ ] Write comprehensive tests
- [ ] End-to-end verification

### Week 7: Optimization (Phase 7)
- [ ] Incremental analysis
- [ ] Caching strategies
- [ ] Performance tuning

---

## **DELIVERABLES**

### Code Files to Create/Modify

1. **New Files**
   - `src/analyzer/CallGraphAnalyzer.ts` - Call graph generation
   - `src/analyzer/InterProceduralAnalyzer.ts` - Main IPA orchestrator
   - `src/analyzer/ParameterAnalyzer.ts` - Parameter mapping
   - `src/analyzer/ReturnValueAnalyzer.ts` - Return value tracking
   - `src/analyzer/ContextSensitiveAnalyzer.ts` - Context tracking
   - `src/analyzer/FunctionSummaries.ts` - Library function models

2. **Modified Files**
   - `src/analyzer/DataflowAnalyzer.ts` - Integrate IPA
   - `src/types.ts` - Add IPA-related types

3. **Documentation**
   - `IPA_GUIDE.md` - User guide
   - `IPA_ALGORITHM.md` - Technical details
   - `IPA_EXAMPLES.md` - Usage examples

---

## **SUCCESS CRITERIA**

### Functionality
- ✅ Call graph correctly identifies all function calls
- ✅ Recursion detection accurate (direct and mutual)
- ✅ Definitions propagate correctly through function calls
- ✅ Return values tracked to call sites
- ✅ Context sensitivity improves precision
- ✅ Library functions handled correctly

### Performance
- ✅ Analysis completes in < 5 seconds for typical programs
- ✅ Memory usage scales linearly with program size
- ✅ Incremental updates < 1 second for small changes

### Quality
- ✅ Unit test coverage > 80%
- ✅ Zero false negatives on test suite
- ✅ False positive rate < 5%
- ✅ Comprehensive documentation

### Integration
- ✅ Seamlessly integrated with existing dataflow analysis
- ✅ Enhances taint analysis precision
- ✅ Enables new vulnerability detections
- ✅ Backward compatible with v1.1.1

---

**Version**: 1.0  
**Next Step**: Begin Phase 1 implementation  
**Estimated Duration**: 6-8 weeks for full implementation  


