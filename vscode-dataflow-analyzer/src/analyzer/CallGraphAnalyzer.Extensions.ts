/**
 * CallGraphAnalyzer Extensions - Phase 2: Call Graph Generation
 * 
 * This module extends the Phase 1 CallGraphAnalyzer with advanced analysis:
 * 1. Enhanced external function identification
 * 2. Tail recursion detection and optimization hints
 * 3. Call graph analysis (SCC detection, dominance)
 * 4. Advanced recursion depth analysis
 * 5. Visualization and statistics
 * 
 * Phase 2 Enhancements:
 * - Library function summaries
 * - Recursion depth calculation
 * - Strongly connected components (recursive cycles)
 * - Call graph statistics and metrics
 * - Advanced visualization features
 */

import { CallGraph, FunctionCall, FunctionMetadata } from './CallGraphAnalyzer';
import { FunctionCFG, Statement } from '../types';

/**
 * Categories of external/library functions.
 */
export enum ExternalFunctionCategory {
  STDLIB = 'stdlib',           // Standard C library
  CSTDLIB = 'cstdlib',         // C++ standard library
  POSIX = 'posix',             // POSIX functions
  SYSTEM = 'system',           // System calls
  UNKNOWN = 'unknown'          // Unknown external
}

/**
 * Information about an external function.
 */
export interface ExternalFunctionInfo {
  name: string;
  category: ExternalFunctionCategory;
  description: string;
  isSafe: boolean;             // Security assessment
  parameters: number;
  returnType: string;
}

/**
 * Recursion depth information.
 */
export interface RecursionDepthInfo {
  functionId: string;
  directRecursionDepth: number;
  indirectRecursionDepth: number;
  recursiveCallees: string[];
  cycleFunctions: string[];
  isRecursive?: boolean;  // Convenience flag for quick recursion check
}

/**
 * Statistics about the call graph.
 */
export interface CallGraphStatistics {
  totalFunctions: number;
  totalCalls: number;
  externalFunctions: number;
  recursiveFunctions: number;
  averageCallsPerFunction: number;
  maxCallsPerFunction: number;
  mostCalledFunction: { name: string; count: number } | null;
  deepestCallChain: number;
  averageRecursionDepth: number;
}

/**
 * Call graph analysis extension for Phase 2.
 * 
 * Provides advanced analysis capabilities beyond Phase 1 foundation.
 */
export class CallGraphExtensions {
  /**
   * External function library summaries.
   * 
   * Predefined information about common library functions.
   * Used to identify and categorize external calls.
   */
  private static readonly EXTERNAL_FUNCTIONS: Map<string, ExternalFunctionInfo> = new Map([
    // C Standard Library
    [
      'printf',
      {
        name: 'printf',
        category: ExternalFunctionCategory.STDLIB,
        description: 'Print formatted output',
        isSafe: true,
        parameters: -1,  // Variadic
        returnType: 'int'
      }
    ],
    [
      'scanf',
      {
        name: 'scanf',
        category: ExternalFunctionCategory.STDLIB,
        description: 'Read formatted input',
        isSafe: false,  // Can be unsafe (buffer overflow)
        parameters: -1,  // Variadic
        returnType: 'int'
      }
    ],
    [
      'malloc',
      {
        name: 'malloc',
        category: ExternalFunctionCategory.STDLIB,
        description: 'Allocate memory',
        isSafe: false,  // Need to check for NULL
        parameters: 1,
        returnType: 'void*'
      }
    ],
    [
      'free',
      {
        name: 'free',
        category: ExternalFunctionCategory.STDLIB,
        description: 'Deallocate memory',
        isSafe: false,  // Use-after-free if not careful
        parameters: 1,
        returnType: 'void'
      }
    ],
    [
      'strcpy',
      {
        name: 'strcpy',
        category: ExternalFunctionCategory.STDLIB,
        description: 'Copy string',
        isSafe: false,  // Buffer overflow risk
        parameters: 2,
        returnType: 'char*'
      }
    ],
    [
      'memcpy',
      {
        name: 'memcpy',
        category: ExternalFunctionCategory.STDLIB,
        description: 'Copy memory',
        isSafe: false,  // Buffer overflow if size wrong
        parameters: 3,
        returnType: 'void*'
      }
    ],

    // POSIX Functions
    [
      'open',
      {
        name: 'open',
        category: ExternalFunctionCategory.POSIX,
        description: 'Open file',
        isSafe: false,
        parameters: -1,
        returnType: 'int'
      }
    ],
    [
      'read',
      {
        name: 'read',
        category: ExternalFunctionCategory.POSIX,
        description: 'Read from file',
        isSafe: false,
        parameters: 3,
        returnType: 'ssize_t'
      }
    ],
    [
      'write',
      {
        name: 'write',
        category: ExternalFunctionCategory.POSIX,
        description: 'Write to file',
        isSafe: false,
        parameters: 3,
        returnType: 'ssize_t'
      }
    ],
    [
      'close',
      {
        name: 'close',
        category: ExternalFunctionCategory.POSIX,
        description: 'Close file',
        isSafe: true,
        parameters: 1,
        returnType: 'int'
      }
    ],

    // System Calls
    [
      'system',
      {
        name: 'system',
        category: ExternalFunctionCategory.SYSTEM,
        description: 'Execute shell command',
        isSafe: false,  // Command injection risk
        parameters: 1,
        returnType: 'int'
      }
    ],
    [
      'exit',
      {
        name: 'exit',
        category: ExternalFunctionCategory.SYSTEM,
        description: 'Exit program',
        isSafe: true,
        parameters: 1,
        returnType: 'void'
      }
    ]
  ]);

  /**
   * Identify and categorize external functions in call graph.
   * 
   * Classifies all non-program functions as external and assigns category.
   * 
   * @param callGraph - Call graph to analyze
   * @returns Map of external function names to their info
   */
  public static identifyExternalFunctions(
    callGraph: CallGraph
  ): Map<string, ExternalFunctionInfo> {
    const externalFunctions = new Map<string, ExternalFunctionInfo>();

    // STEP 1: Find all calls to functions not defined in program
    for (const call of callGraph.calls) {
      // If callee not in our functions, it's external
      if (!callGraph.functions.has(call.calleeId)) {
        // STEP 2: Check if we have information about this function
        if (this.EXTERNAL_FUNCTIONS.has(call.calleeId)) {
          externalFunctions.set(
            call.calleeId,
            this.EXTERNAL_FUNCTIONS.get(call.calleeId)!
          );
        } else {
          // STEP 3: Create generic external function info
          externalFunctions.set(call.calleeId, {
            name: call.calleeId,
            category: this.categorizeUnknown(call.calleeId),
            description: 'Unknown external function',
            isSafe: false,  // Conservative: assume unsafe
            parameters: -1,  // Unknown
            returnType: 'auto'
          });
        }

        // STEP 4: Mark in metadata
        const metadata = callGraph.functions.get(call.calleeId);
        if (metadata) {
          metadata.isExternal = true;
        }
      }
    }

    return externalFunctions;
  }

  /**
   * Categorize unknown external function based on naming patterns.
   * 
   * @param funcName - Function name to categorize
   * @returns Likely category
   */
  private static categorizeUnknown(funcName: string): ExternalFunctionCategory {
    // Standard library patterns
    if (funcName.startsWith('std::')) {
      return ExternalFunctionCategory.CSTDLIB;
    }

    // POSIX patterns
    if (
      /^(pthread|sem|fork|exec|socket|bind|listen)/.test(funcName) ||
      /_(read|write|open|close)$/.test(funcName)
    ) {
      return ExternalFunctionCategory.POSIX;
    }

    // System patterns
    if (/^(system|exec|fork|spawn)/.test(funcName)) {
      return ExternalFunctionCategory.SYSTEM;
    }

    return ExternalFunctionCategory.UNKNOWN;
  }

  /**
   * Calculate recursion depth for all functions.
   * 
   * Depth = longest chain in recursive cycle.
   * Example: foo->bar->baz->foo has depth 3.
   * 
   * @param callGraph - Call graph to analyze
   * @returns Map of function IDs to recursion depth info
   */
  public static calculateRecursionDepth(
    callGraph: CallGraph
  ): Map<string, RecursionDepthInfo> {
    const depthMap = new Map<string, RecursionDepthInfo>();

    // STEP 1: Initialize all functions
    for (const funcId of callGraph.functions.keys()) {
      depthMap.set(funcId, {
        functionId: funcId,
        directRecursionDepth: 0,
        indirectRecursionDepth: 0,
        recursiveCallees: [],
        cycleFunctions: [],
        isRecursive: false  // Default to non-recursive
      });
    }

    // STEP 2: Mark functions in recursive cycles
    const sccs = this.findStronglyConnectedComponents(callGraph);

    for (const scc of sccs) {
      // SCC with > 1 function or self-loop = recursive
      if (scc.length > 1 || this.hasSelfLoop(callGraph, scc[0])) {
        for (const funcId of scc) {
          const info = depthMap.get(funcId)!;
          info.directRecursionDepth = scc.length;
          info.cycleFunctions = scc;
          info.isRecursive = true;  // Mark as recursive
        }
      }
    }

    // STEP 3: Calculate indirect recursion depth
    for (const [funcId, info] of depthMap.entries()) {
      if (info.directRecursionDepth === 0) {
        // Not directly recursive - check for indirect
        const depth = this.findIndirectRecursionDepth(
          funcId,
          callGraph,
          new Set(),
          0
        );
        info.indirectRecursionDepth = depth;
      }

      // STEP 4: Find which callees are recursive
      const callees = callGraph.callsFrom.get(funcId) || [];
      for (const call of callees) {
        if (depthMap.get(call.calleeId)?.directRecursionDepth! > 0) {
          info.recursiveCallees.push(call.calleeId);
        }
      }
    }

    return depthMap;
  }

  /**
   * Find strongly connected components using Tarjan's algorithm.
   * 
   * SCCs represent mutually recursive functions.
   * 
   * @param callGraph - Call graph
   * @returns Array of SCCs (each SCC is array of function IDs)
   */
  private static findStronglyConnectedComponents(
    callGraph: CallGraph
  ): string[][] {
    const sccs: string[][] = [];
    const visited = new Set<string>();
    const stack: string[] = [];
    const lowLink = new Map<string, number>();
    const index = new Map<string, number>();
    let currentIndex = 0;

    const strongConnect = (v: string) => {
      index.set(v, currentIndex);
      lowLink.set(v, currentIndex);
      currentIndex++;
      stack.push(v);
      visited.add(v);

      // Get successors
      const calls = callGraph.callsFrom.get(v) || [];
      for (const call of calls) {
        const w = call.calleeId;

        if (!index.has(w)) {
          strongConnect(w);
          lowLink.set(v, Math.min(lowLink.get(v)!, lowLink.get(w)!));
        } else if (visited.has(w)) {
          lowLink.set(v, Math.min(lowLink.get(v)!, index.get(w)!));
        }
      }

      // Found SCC root
      if (lowLink.get(v) === index.get(v)) {
        const scc: string[] = [];
        let w: string;
        do {
          w = stack.pop()!;
          visited.delete(w);
          scc.push(w);
        } while (w !== v);

        sccs.push(scc);
      }
    };

    for (const v of callGraph.functions.keys()) {
      if (!index.has(v)) {
        strongConnect(v);
      }
    }

    return sccs;
  }

  /**
   * Check if function calls itself directly.
   */
  private static hasSelfLoop(callGraph: CallGraph, funcId: string): boolean {
    const calls = callGraph.callsFrom.get(funcId) || [];
    return calls.some(c => c.calleeId === funcId);
  }

  /**
   * Calculate indirect recursion depth for a function.
   */
  private static findIndirectRecursionDepth(
    funcId: string,
    callGraph: CallGraph,
    visited: Set<string>,
    depth: number
  ): number {
    if (visited.has(funcId)) {
      return depth;  // Cycle found
    }

    if (depth > 100) {
      return 100;  // Depth limit to prevent infinite loops
    }

    visited.add(funcId);

    const calls = callGraph.callsFrom.get(funcId) || [];
    let maxDepth = 0;

    for (const call of calls) {
      const d = this.findIndirectRecursionDepth(
        call.calleeId,
        callGraph,
        new Set(visited),
        depth + 1
      );
      maxDepth = Math.max(maxDepth, d);
    }

    return maxDepth;
  }

  /**
   * Detect tail recursion opportunities.
   * 
   * Tail recursion is when recursive call is the last operation.
   * Can be optimized by compiler.
   * 
   * @param callGraph - Call graph
   * @param functionCFGs - Map of function CFGs
   * @returns Array of functions with tail recursion
   */
  public static detectTailRecursion(
    callGraph: CallGraph,
    functionCFGs: Map<string, FunctionCFG>
  ): string[] {
    const tailRecursiveFunctions: string[] = [];

    // STEP 1: Check each recursive function
    for (const [funcId, metadata] of callGraph.functions.entries()) {
      if (!metadata.isRecursive) {
        continue;
      }

      const cfg = functionCFGs.get(funcId);
      if (!cfg) {
        continue;
      }

      // STEP 2: Find exit blocks (no successors)
      const exitBlocks = Array.from(cfg.blocks.values()).filter(
        b => b.successors.length === 0
      );

      for (const exitBlock of exitBlocks) {
        if (exitBlock.statements.length === 0) {
          continue;
        }

        // STEP 3: Check last statement
        const lastStmt = exitBlock.statements[exitBlock.statements.length - 1];
        const tailPattern = new RegExp(`return\\s+${funcId}\\s*\\(`);
        const stmtText = lastStmt.content || lastStmt.text;

        if (tailPattern.test(stmtText)) {
          tailRecursiveFunctions.push(funcId);
          console.log(`[CG] Tail recursion detected: ${funcId}`);
          break;  // Found one exit with tail recursion
        }
      }
    }

    return tailRecursiveFunctions;
  }

  /**
   * Compute comprehensive statistics about call graph.
   * 
   * @param callGraph - Call graph
   * @returns Detailed statistics
   */
  public static computeStatistics(callGraph: CallGraph): CallGraphStatistics {
    // Count statistics
    const totalFunctions = callGraph.functions.size;
    const totalCalls = callGraph.calls.length;
    const externalCount = Array.from(callGraph.functions.values()).filter(
      m => m.isExternal
    ).length;
    const recursiveCount = Array.from(callGraph.functions.values()).filter(
      m => m.isRecursive
    ).length;

    // Per-function call counts
    const callCounts = Array.from(callGraph.functions.keys()).map(funcId => {
      const calls = callGraph.callsFrom.get(funcId) || [];
      return { funcId, count: calls.length };
    });

    const maxCallsPerFunction = Math.max(...callCounts.map(c => c.count), 0);
    const avgCallsPerFunction =
      totalFunctions > 0 ? totalCalls / totalFunctions : 0;

    // Most called function
    const callCounts2 = Array.from(callGraph.functions.keys()).map(funcId => {
      const calls = callGraph.callsTo.get(funcId) || [];
      return { funcId, count: calls.length };
    });

    const sorted = callCounts2.sort((a, b) => b.count - a.count);
    const mostCalledFunction =
      sorted.length > 0
        ? { name: sorted[0].funcId, count: sorted[0].count }
        : null;

    // Call depth (longest call chain)
    const deepestCallChain = this.computeCallDepth(callGraph);

    // Average recursion depth
    const recursionDepths = this.calculateRecursionDepth(callGraph);
    const avgRecursionDepth =
      recursiveCount > 0
        ? Array.from(recursionDepths.values())
            .filter(r => r.directRecursionDepth > 0)
            .reduce((sum, r) => sum + r.directRecursionDepth, 0) /
          recursiveCount
        : 0;

    return {
      totalFunctions,
      totalCalls,
      externalFunctions: externalCount,
      recursiveFunctions: recursiveCount,
      averageCallsPerFunction: avgCallsPerFunction,
      maxCallsPerFunction,
      mostCalledFunction,
      deepestCallChain,
      averageRecursionDepth: avgRecursionDepth
    };
  }

  /**
   * Compute deepest call chain length.
   */
  private static computeCallDepth(callGraph: CallGraph): number {
    let maxDepth = 0;
    const depthCache = new Map<string, number>();

    const computeDepth = (funcId: string, visited: Set<string>): number => {
      if (depthCache.has(funcId)) {
        return depthCache.get(funcId)!;
      }

      if (visited.has(funcId)) {
        return 0;  // Cycle detected
      }

      visited.add(funcId);

      const calls = callGraph.callsFrom.get(funcId) || [];
      let depth = 0;

      for (const call of calls) {
        depth = Math.max(depth, 1 + computeDepth(call.calleeId, new Set(visited)));
      }

      depthCache.set(funcId, depth);
      return depth;
    };

    for (const funcId of callGraph.functions.keys()) {
      const depth = computeDepth(funcId, new Set());
      maxDepth = Math.max(maxDepth, depth);
    }

    return maxDepth;
  }

  /**
   * Generate enhanced DOT format with phase 2 features.
   * 
   * Includes:
   * - Coloring for recursion types
   * - Size based on call count
   * - Labels with statistics
   */
  public static generateEnhancedDOT(
    callGraph: CallGraph,
    functionCFGs: Map<string, FunctionCFG>
  ): string {
    let dot = 'digraph CallGraphAnalysis {\n';
    dot += '  rankdir=LR;\n';
    dot += '  node [shape=box];\n';
    dot += '  graph [bgcolor=white];\n\n';

    // Detect tail recursion for visualization
    const tailRecursive = this.detectTailRecursion(callGraph, functionCFGs);
    const recursionDepth = this.calculateRecursionDepth(callGraph);

    // Add nodes with enhanced styling
    for (const [funcId, metadata] of callGraph.functions.entries()) {
      let attrs = '';

      if (metadata.isExternal) {
        attrs += '[style=dotted, color=gray]';
      } else if (metadata.isRecursive) {
        if (tailRecursive.includes(funcId)) {
          attrs += '[color=orange, style=filled, fillcolor=lightyellow]';
        } else {
          attrs += '[color=red, style=filled, fillcolor=lightpink]';
        }
      } else {
        // Color by call count
        const calls = callGraph.callsFrom.get(funcId) || [];
        if (calls.length > 5) {
          attrs += '[color=blue, style=filled, fillcolor=lightblue]';
        }
      }

      const callCount = callGraph.callsFrom.get(funcId)?.length || 0;
      dot += `  "${funcId}" ${attrs} [label="${funcId}\\n(${callCount} calls)"];\n`;
    }

    dot += '\n';

    // Add edges with labels
    const edgeLabels = new Map<string, number>();
    for (const call of callGraph.calls) {
      const key = `${call.callerId}->${call.calleeId}`;
      edgeLabels.set(key, (edgeLabels.get(key) || 0) + 1);
    }

    for (const [edge, count] of edgeLabels.entries()) {
      const label = count > 1 ? `[label="${count}x"]` : '';
      dot += `  ${edge} ${label};\n`;
    }

    dot += '\n}\n';
    return dot;
  }
}

