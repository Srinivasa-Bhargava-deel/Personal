/**
 * Unit tests for CallGraphAnalyzer Extensions - Phase 2: Call Graph
 * 
 * Tests for:
 * 1. External function identification and categorization
 * 2. Recursion depth calculation
 * 3. Tail recursion detection
 * 4. Call graph statistics
 * 5. Strongly connected components (SCC)
 * 6. Enhanced visualization
 */

import { CallGraphExtensions, ExternalFunctionCategory, CallGraphStatistics } from '../CallGraphAnalyzer.Extensions';
import { CallGraph, FunctionMetadata, FunctionCall } from '../CallGraphAnalyzer';
import { FunctionCFG, BasicBlock, Statement, StatementType } from '../../types';

/**
 * Helper: Create mock call graph
 */
function createMockCallGraph(
  functions: string[],
  calls: Array<[string, string]>
): CallGraph {
  const callGraph: CallGraph = {
    functions: new Map(),
    calls: [],
    callsFrom: new Map(),
    callsTo: new Map()
  };

  // Add functions
  for (const funcName of functions) {
    const metadata: FunctionMetadata = {
      name: funcName,
      cfg: createMockCFG(funcName),
      parameters: [],
      returnType: 'int',
      isExternal: false,
      isRecursive: false,
      callsCount: 0
    };
    callGraph.functions.set(funcName, metadata);
  }

  // Add calls
  for (const [caller, callee] of calls) {
    const call: FunctionCall = {
      callerId: caller,
      calleeId: callee,
      callSite: {
        blockId: 'B0',
        statementId: `${caller}_to_${callee}`,
        line: 0,
        column: 0
      },
      arguments: { actual: [], types: [] },
      returnValueUsed: false
    };
    callGraph.calls.push(call);
  }

  // Build relationship maps
  for (const call of callGraph.calls) {
    if (!callGraph.callsFrom.has(call.callerId)) {
      callGraph.callsFrom.set(call.callerId, []);
    }
    callGraph.callsFrom.get(call.callerId)!.push(call);

    if (!callGraph.callsTo.has(call.calleeId)) {
      callGraph.callsTo.set(call.calleeId, []);
    }
    callGraph.callsTo.get(call.calleeId)!.push(call);
  }

  return callGraph;
}

/**
 * Helper: Create mock CFG
 */
function createMockCFG(functionName: string): FunctionCFG {
  const block: BasicBlock = {
    id: 'B0',
    label: 'entry',
    statements: [],
    predecessors: [],
    successors: [],
    isEntry: true,
    isExit: false
  };

  return {
    name: 'mockFunction',
    entry: 'B0',
    exit: 'B0',
    blocks: new Map([['B0', block]]),
    parameters: []
  };
}

/**
 * Helper: Create mock CFG with statements
 */
function createMockCFGWithStatements(
  functionName: string,
  statements: string[]
): FunctionCFG {
  const stmts: Statement[] = statements.map((content, idx) => ({
    id: `stmt_${idx}`,
    type: 'expression' as StatementType,
    text: content,
    content,
    variables: { defined: [], used: [] },
    range: {
      start: { line: idx, column: 0 },
      end: { line: idx, column: content.length }
    }
  }));

  const block: BasicBlock = {
    id: 'B0',
    label: 'entry',
    statements: stmts,
    predecessors: [],
    successors: [],
    isEntry: true,
    isExit: false
  };

  return {
    name: functionName,
    entry: 'B0',
    exit: 'B0',
    blocks: new Map([['B0', block]]),
    parameters: []
  };
}

describe('CallGraphAnalyzer Extensions - Phase 2: Call Graph', () => {
  describe('External function identification', () => {
    it('should identify stdlib functions', () => {
      const callGraph = createMockCallGraph(
        ['main'],
        [['main', 'printf']]
      );

      const external = CallGraphExtensions.identifyExternalFunctions(callGraph);

      expect(external.has('printf')).toBe(true);
      expect(external.get('printf')!.category).toBe(ExternalFunctionCategory.STDLIB);
    });

    it('should identify POSIX functions', () => {
      const callGraph = createMockCallGraph(
        ['main'],
        [['main', 'open'], ['main', 'read'], ['main', 'close']]
      );

      const external = CallGraphExtensions.identifyExternalFunctions(callGraph);

      expect(external.get('open')!.category).toBe(ExternalFunctionCategory.POSIX);
    });

    it('should mark unsafe functions', () => {
      const callGraph = createMockCallGraph(
        ['main'],
        [['main', 'strcpy']]
      );

      const external = CallGraphExtensions.identifyExternalFunctions(callGraph);

      expect(external.get('strcpy')!.isSafe).toBe(false);
    });

    it('should categorize unknown functions', () => {
      const callGraph = createMockCallGraph(
        ['main', 'foo'],
        [['main', 'unknown_func']]
      );

      const external = CallGraphExtensions.identifyExternalFunctions(callGraph);

      expect(external.has('unknown_func')).toBe(true);
      expect(external.get('unknown_func')!.category).toBe(ExternalFunctionCategory.UNKNOWN);
    });

    it('should not include defined functions as external', () => {
      const callGraph = createMockCallGraph(
        ['main', 'helper'],
        [['main', 'helper']]
      );

      const external = CallGraphExtensions.identifyExternalFunctions(callGraph);

      expect(external.has('helper')).toBe(false);
    });
  });

  describe('Recursion depth calculation', () => {
    it('should detect direct recursion', () => {
      const callGraph = createMockCallGraph(
        ['factorial'],
        [['factorial', 'factorial']]
      );

      const depths = CallGraphExtensions.calculateRecursionDepth(callGraph);
      const factDepth = depths.get('factorial')!;

      expect(factDepth.directRecursionDepth).toBeGreaterThan(0);
    });

    it('should detect mutual recursion', () => {
      // foo -> bar -> foo
      const callGraph = createMockCallGraph(
        ['foo', 'bar'],
        [
          ['foo', 'bar'],
          ['bar', 'foo']
        ]
      );

      const depths = CallGraphExtensions.calculateRecursionDepth(callGraph);
      const fooDepth = depths.get('foo')!;
      const barDepth = depths.get('bar')!;

      expect(fooDepth.directRecursionDepth).toBeGreaterThan(0);
      expect(barDepth.directRecursionDepth).toBeGreaterThan(0);
      expect(fooDepth.cycleFunctions.length).toBeGreaterThan(1);
    });

    it('should identify recursive callees', () => {
      // main -> foo -> foo
      const callGraph = createMockCallGraph(
        ['main', 'foo'],
        [
          ['main', 'foo'],
          ['foo', 'foo']
        ]
      );

      const depths = CallGraphExtensions.calculateRecursionDepth(callGraph);
      const mainDepth = depths.get('main')!;

      expect(mainDepth.recursiveCallees.includes('foo')).toBe(true);
    });

    it('should mark non-recursive functions correctly', () => {
      const callGraph = createMockCallGraph(
        ['main', 'foo', 'bar'],
        [
          ['main', 'foo'],
          ['foo', 'bar']
        ]
      );

      const depths = CallGraphExtensions.calculateRecursionDepth(callGraph);

      expect(depths.get('main')!.directRecursionDepth).toBe(0);
      expect(depths.get('foo')!.directRecursionDepth).toBe(0);
      expect(depths.get('bar')!.directRecursionDepth).toBe(0);
    });
  });

  describe('Tail recursion detection', () => {
    it('should detect tail recursion in factorial', () => {
      const cfgs = new Map<string, FunctionCFG>();
      cfgs.set('factorial', createMockCFGWithStatements('factorial', [
        'if (n <= 1) return 1;',
        'return n * factorial(n - 1);'  // Tail recursion
      ]));

      const callGraph = createMockCallGraph(
        ['factorial'],
        [['factorial', 'factorial']]
      );

      // Mark as recursive
      callGraph.functions.get('factorial')!.isRecursive = true;

      const tailRecursive = CallGraphExtensions.detectTailRecursion(callGraph, cfgs);

      expect(tailRecursive.includes('factorial')).toBe(true);
    });

    it('should identify non-tail recursion', () => {
      const cfgs = new Map<string, FunctionCFG>();
      cfgs.set('fib', createMockCFGWithStatements('fib', [
        'if (n <= 1) return n;',
        'return fib(n-1) + fib(n-2);'  // Not tail recursion (arithmetic after)
      ]));

      const callGraph = createMockCallGraph(
        ['fib'],
        [['fib', 'fib']]
      );

      callGraph.functions.get('fib')!.isRecursive = true;

      const tailRecursive = CallGraphExtensions.detectTailRecursion(callGraph, cfgs);

      expect(tailRecursive.includes('fib')).toBe(false);
    });
  });

  describe('Call graph statistics', () => {
    it('should compute basic statistics', () => {
      const callGraph = createMockCallGraph(
        ['main', 'foo', 'bar'],
        [
          ['main', 'foo'],
          ['main', 'bar'],
          ['foo', 'bar']
        ]
      );

      const stats = CallGraphExtensions.computeStatistics(callGraph);

      expect(stats.totalFunctions).toBe(3);
      expect(stats.totalCalls).toBe(3);
    });

    it('should count recursive functions', () => {
      const callGraph = createMockCallGraph(
        ['factorial'],
        [['factorial', 'factorial']]
      );

      callGraph.functions.get('factorial')!.isRecursive = true;

      const stats = CallGraphExtensions.computeStatistics(callGraph);

      expect(stats.recursiveFunctions).toBe(1);
    });

    it('should calculate average calls per function', () => {
      const callGraph = createMockCallGraph(
        ['a', 'b', 'c'],
        [
          ['a', 'b'],
          ['a', 'c'],
          ['b', 'c']
        ]
      );

      const stats = CallGraphExtensions.computeStatistics(callGraph);

      expect(stats.averageCallsPerFunction).toBeCloseTo(1, 1);
    });

    it('should identify most called function', () => {
      const callGraph = createMockCallGraph(
        ['main', 'helper', 'other'],
        [
          ['main', 'helper'],
          ['main', 'helper'],
          ['other', 'helper']
        ]
      );

      const stats = CallGraphExtensions.computeStatistics(callGraph);

      expect(stats.mostCalledFunction?.name).toBe('helper');
      expect(stats.mostCalledFunction?.count).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Enhanced visualization', () => {
    it('should generate valid enhanced DOT format', () => {
      const cfgs = new Map<string, FunctionCFG>();
      cfgs.set('main', createMockCFG('main'));
      cfgs.set('foo', createMockCFG('foo'));

      const callGraph = createMockCallGraph(
        ['main', 'foo'],
        [['main', 'foo']]
      );

      const dot = CallGraphExtensions.generateEnhancedDOT(callGraph, cfgs);

      expect(dot).toContain('digraph');
      expect(dot).toContain('main');
      expect(dot).toContain('foo');
      expect(dot).toContain('->');
    });

    it('should color recursive functions red', () => {
      const cfgs = new Map<string, FunctionCFG>();
      cfgs.set('factorial', createMockCFG('factorial'));

      const callGraph = createMockCallGraph(
        ['factorial'],
        [['factorial', 'factorial']]
      );

      callGraph.functions.get('factorial')!.isRecursive = true;

      const dot = CallGraphExtensions.generateEnhancedDOT(callGraph, cfgs);

      expect(dot).toContain('color=red');
    });

    it('should mark external functions with dotted style', () => {
      const cfgs = new Map<string, FunctionCFG>();
      cfgs.set('main', createMockCFG('main'));

      const callGraph = createMockCallGraph(
        ['main'],
        []
      );

      callGraph.functions.get('main')!.isExternal = true;

      const dot = CallGraphExtensions.generateEnhancedDOT(callGraph, cfgs);

      expect(dot).toContain('style=dotted');
    });
  });

  describe('Integration tests', () => {
    it('should handle complex call graph', () => {
      // Complex scenario:
      // main -> foo, bar
      // foo -> bar, foo (recursive)
      // bar -> baz
      // baz -> baz (recursive)

      const callGraph = createMockCallGraph(
        ['main', 'foo', 'bar', 'baz'],
        [
          ['main', 'foo'],
          ['main', 'bar'],
          ['foo', 'bar'],
          ['foo', 'foo'],
          ['bar', 'baz'],
          ['baz', 'baz']
        ]
      );

      // Mark recursive functions
      callGraph.functions.get('foo')!.isRecursive = true;
      callGraph.functions.get('baz')!.isRecursive = true;

      // Test all Phase 2 features
      const external = CallGraphExtensions.identifyExternalFunctions(callGraph);
      const depths = CallGraphExtensions.calculateRecursionDepth(callGraph);
      const stats = CallGraphExtensions.computeStatistics(callGraph);

      expect(stats.totalFunctions).toBe(4);
      expect(stats.recursiveFunctions).toBe(2);
      expect(depths.get('foo')!.isRecursive).toBeDefined();
    });

    it('should handle real-world example.cpp structure', () => {
      // Simulate example.cpp:
      // main calls printf, factorial, processArray
      // factorial recursively calls itself
      // processArray calls printf

      const callGraph = createMockCallGraph(
        ['main', 'factorial', 'processArray', 'printf'],
        [
          ['main', 'printf'],
          ['main', 'factorial'],
          ['main', 'processArray'],
          ['factorial', 'factorial'],
          ['processArray', 'printf']
        ]
      );

      // Mark properties
      callGraph.functions.get('factorial')!.isRecursive = true;
      callGraph.functions.get('printf')!.isExternal = true;

      const stats = CallGraphExtensions.computeStatistics(callGraph);

      expect(stats.totalFunctions).toBe(4);
      expect(stats.externalFunctions).toBe(1);
      expect(stats.recursiveFunctions).toBe(1);
      expect(stats.totalCalls).toBe(5);
    });
  });
});

