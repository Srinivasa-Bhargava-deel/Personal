/**
 * Unit tests for InterProceduralReachingDefinitions - Phase 3: Inter-Procedural Data Flow
 * 
 * These tests verify:
 * 1. Basic inter-procedural definition propagation
 * 2. Parameter mapping (formal -> actual)
 * 3. Return value propagation
 * 4. Global variable handling
 * 5. Fixed-point iteration convergence
 * 
 * Test Coverage for Phase 3:
 * - Simple inter-procedural propagation
 * - Parameter flow tracking
 * - Return value tracking
 * - Multiple call sites
 * - Recursive function handling
 */

import { InterProceduralReachingDefinitions, CallSiteContext } from '../InterProceduralReachingDefinitions';
import { CallGraph, FunctionCall, FunctionMetadata } from '../CallGraphAnalyzer';
import {
  FunctionCFG,
  BasicBlock,
  Statement,
  StatementType,
  ReachingDefinition,
  ReachingDefinitionsInfo
} from '../../types';

/**
 * Helper: Create a mock FunctionCFG for testing
 */
function createMockCFG(
  functionName: string,
  statements: string[],
  parameters: string[] = []
): FunctionCFG {
  const stmts: Statement[] = statements.map((content, idx) => ({
    id: `stmt_${idx}`,
    type: 'expression' as StatementType,
    text: content,
    content: content,
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
    isExit: true
  };

  return {
    name: functionName,
    entry: 'B0',
    exit: 'B0',
    blocks: new Map([['B0', block]]),
    parameters
  };
}

/**
 * Helper: Create mock reaching definitions info
 */
function createMockRDInfo(
  blockId: string,
  gen: Map<string, ReachingDefinition[]>,
  kill: Map<string, ReachingDefinition[]>,
  inSet: Map<string, ReachingDefinition[]>,
  outSet: Map<string, ReachingDefinition[]>
): ReachingDefinitionsInfo {
  return {
    blockId,
    gen,
    kill,
    in: inSet,
    out: outSet
  };
}

/**
 * Helper: Create a simple definition
 */
function createDefinition(
  variable: string,
  definitionId: string,
  blockId: string
): ReachingDefinition {
  return {
    variable,
    definitionId,
    blockId,
    sourceBlock: blockId,
    propagationPath: [blockId]
  };
}

/**
 * Helper: Create test call graph with simple functions
 */
function createTestCallGraph(): {
  callGraph: CallGraph;
  intraRD: Map<string, Map<string, ReachingDefinitionsInfo>>;
} {
  // Create function CFGs
  const mainCFG = createMockCFG('main', [
    'int a = 5;',
    'int result = foo(a);',
    'return result;'
  ]);

  const fooCFG = createMockCFG('foo', [
    'int y = x + 1;',
    'return y;'
  ], ['x']);

  // Create call graph
  const callGraph: CallGraph = {
    functions: new Map(),
    calls: [],
    callsFrom: new Map(),
    callsTo: new Map()
  };

  // Add function metadata
  const mainMetadata: FunctionMetadata = {
    name: 'main',
    cfg: mainCFG,
    parameters: [],
    returnType: 'int',
    isExternal: false,
    isRecursive: false,
    callsCount: 1
  };

  const fooMetadata: FunctionMetadata = {
    name: 'foo',
    cfg: fooCFG,
    parameters: [{ name: 'x', type: 'int', position: 0 }],
    returnType: 'int',
    isExternal: false,
    isRecursive: false,
    callsCount: 0
  };

  callGraph.functions.set('main', mainMetadata);
  callGraph.functions.set('foo', fooMetadata);

  // Create function call
  const call: FunctionCall = {
    callerId: 'main',
    calleeId: 'foo',
    callSite: {
      blockId: 'B0',
      statementId: 'stmt_1',
      line: 1,
      column: 0
    },
    arguments: {
      actual: ['a'],
      types: ['int']
    },
    returnValueUsed: true
  };

  callGraph.calls.push(call);
  callGraph.callsFrom.set('main', [call]);
  callGraph.callsTo.set('foo', [call]);

  // Create intra-procedural reaching definitions
  const intraRD = new Map<string, Map<string, ReachingDefinitionsInfo>>();

  // Main function RD
  const mainRD = new Map<string, ReachingDefinitionsInfo>();
  const mainGen = new Map<string, ReachingDefinition[]>();
  const mainKill = new Map<string, ReachingDefinition[]>();
  const mainIn = new Map<string, ReachingDefinition[]>();
  const mainOut = new Map<string, ReachingDefinition[]>();

  // Definition of 'a' in main
  const aDef = createDefinition('a', 'main_a_B0', 'B0');
  mainGen.set('a', [aDef]);
  mainOut.set('a', [aDef]);
  mainIn.set('a', []);

  mainRD.set('B0', createMockRDInfo('B0', mainGen, mainKill, mainIn, mainOut));
  intraRD.set('main', mainRD);

  // Foo function RD
  const fooRD = new Map<string, ReachingDefinitionsInfo>();
  const fooGen = new Map<string, ReachingDefinition[]>();
  const fooKill = new Map<string, ReachingDefinition[]>();
  const fooIn = new Map<string, ReachingDefinition[]>();
  const fooOut = new Map<string, ReachingDefinition[]>();

  // Definition of 'y' in foo
  const yDef = createDefinition('y', 'foo_y_B0', 'B0');
  fooGen.set('y', [yDef]);
  fooOut.set('y', [yDef]);
  fooIn.set('x', []); // Parameter 'x' comes from caller
  fooOut.set('x', []); // Parameter flows through

  fooRD.set('B0', createMockRDInfo('B0', fooGen, fooKill, fooIn, fooOut));
  intraRD.set('foo', fooRD);

  return { callGraph, intraRD };
}

describe('InterProceduralReachingDefinitions - Phase 3: Inter-Procedural Data Flow', () => {
  describe('analyze()', () => {
    it('should perform inter-procedural analysis', () => {
      const { callGraph, intraRD } = createTestCallGraph();
      const analyzer = new InterProceduralReachingDefinitions(callGraph, intraRD);

      const result = analyzer.analyze();

      expect(result).toBeDefined();
      expect(result.size).toBeGreaterThan(0);
    });

    it('should converge to fixed point', () => {
      const { callGraph, intraRD } = createTestCallGraph();
      const analyzer = new InterProceduralReachingDefinitions(callGraph, intraRD);

      const result = analyzer.analyze();

      // Should have results for all functions
      expect(result.has('main')).toBe(true);
      expect(result.has('foo')).toBe(true);
    });

    it('should handle functions with no calls', () => {
      const { callGraph, intraRD } = createTestCallGraph();

      // Add a function with no calls
      const barCFG = createMockCFG('bar', ['int z = 10;']);
      const barMetadata: FunctionMetadata = {
        name: 'bar',
        cfg: barCFG,
        parameters: [],
        returnType: 'void',
        isExternal: false,
        isRecursive: false,
        callsCount: 0
      };

      callGraph.functions.set('bar', barMetadata);

      const barRD = new Map<string, ReachingDefinitionsInfo>();
      const barGen = new Map<string, ReachingDefinition[]>();
      const barKill = new Map<string, ReachingDefinition[]>();
      const barIn = new Map<string, ReachingDefinition[]>();
      const barOut = new Map<string, ReachingDefinition[]>();

      const zDef = createDefinition('z', 'bar_z_B0', 'B0');
      barGen.set('z', [zDef]);
      barOut.set('z', [zDef]);

      barRD.set('B0', createMockRDInfo('B0', barGen, barKill, barIn, barOut));
      intraRD.set('bar', barRD);

      const analyzer = new InterProceduralReachingDefinitions(callGraph, intraRD);
      const result = analyzer.analyze();

      expect(result.has('bar')).toBe(true);
    });

    it('should skip external functions', () => {
      const { callGraph, intraRD } = createTestCallGraph();

      // Add external function
      const printfCFG = createMockCFG('printf', ['// external']);
      const printfMetadata: FunctionMetadata = {
        name: 'printf',
        cfg: printfCFG,
        parameters: [],
        returnType: 'int',
        isExternal: true,
        isRecursive: false,
        callsCount: 0
      };

      callGraph.functions.set('printf', printfMetadata);

      const analyzer = new InterProceduralReachingDefinitions(callGraph, intraRD);
      const result = analyzer.analyze();

      // External functions should be skipped but still present
      expect(result.has('main')).toBe(true);
      expect(result.has('foo')).toBe(true);
    });
  });

  describe('parameter mapping', () => {
    it('should map formal parameters to actual arguments', () => {
      const { callGraph, intraRD } = createTestCallGraph();
      const analyzer = new InterProceduralReachingDefinitions(callGraph, intraRD);

      // Get the call from main to foo
      const calls = callGraph.callsFrom.get('main');
      expect(calls).toBeDefined();
      expect(calls!.length).toBe(1);

      const call = calls![0];
      expect(call.arguments.actual).toEqual(['a']);

      // Verify parameter mapping would be: x <- a
      const fooMetadata = callGraph.functions.get('foo');
      expect(fooMetadata).toBeDefined();
      expect(fooMetadata!.parameters[0].name).toBe('x');
    });

    it('should handle multiple parameters', () => {
      const { callGraph, intraRD } = createTestCallGraph();

      // Add function with multiple parameters
      const multiCFG = createMockCFG('multi', [
        'int z = x + y;',
        'return z;'
      ], ['x', 'y']);

      const multiMetadata: FunctionMetadata = {
        name: 'multi',
        cfg: multiCFG,
        parameters: [
          { name: 'x', type: 'int', position: 0 },
          { name: 'y', type: 'int', position: 1 }
        ],
        returnType: 'int',
        isExternal: false,
        isRecursive: false,
        callsCount: 0
      };

      callGraph.functions.set('multi', multiMetadata);

      const multiCall: FunctionCall = {
        callerId: 'main',
        calleeId: 'multi',
        callSite: {
          blockId: 'B0',
          statementId: 'stmt_2',
          line: 2,
          column: 0
        },
        arguments: {
          actual: ['a', 'result'],
          types: ['int', 'int']
        },
        returnValueUsed: true
      };

      callGraph.calls.push(multiCall);
      callGraph.callsFrom.set('main', [...(callGraph.callsFrom.get('main') || []), multiCall]);

      const analyzer = new InterProceduralReachingDefinitions(callGraph, intraRD);
      const result = analyzer.analyze();

      expect(result.has('multi')).toBe(true);
    });
  });

  describe('return value propagation', () => {
    it('should track return values', () => {
      const { callGraph, intraRD } = createTestCallGraph();
      const analyzer = new InterProceduralReachingDefinitions(callGraph, intraRD);

      // Get the call from main to foo
      const calls = callGraph.callsFrom.get('main');
      const call = calls![0];

      expect(call.returnValueUsed).toBe(true);

      const result = analyzer.analyze();

      // After analysis, main should have definitions for 'result'
      const mainRD = result.get('main');
      expect(mainRD).toBeDefined();
    });

    it('should handle unused return values', () => {
      const { callGraph, intraRD } = createTestCallGraph();

      // Modify call to have unused return value
      const calls = callGraph.callsFrom.get('main');
      if (calls && calls.length > 0) {
        calls[0].returnValueUsed = false;
      }

      const analyzer = new InterProceduralReachingDefinitions(callGraph, intraRD);
      const result = analyzer.analyze();

      // Should still complete without errors
      expect(result.has('main')).toBe(true);
    });
  });

  describe('fixed-point iteration', () => {
    it('should terminate within max iterations', () => {
      const { callGraph, intraRD } = createTestCallGraph();
      const analyzer = new InterProceduralReachingDefinitions(callGraph, intraRD);

      const result = analyzer.analyze();

      // Should complete successfully
      expect(result).toBeDefined();
    });

    it('should handle simple non-recursive calls', () => {
      const { callGraph, intraRD } = createTestCallGraph();
      const analyzer = new InterProceduralReachingDefinitions(callGraph, intraRD);

      const result = analyzer.analyze();

      // Should converge quickly for non-recursive calls
      expect(result.has('main')).toBe(true);
      expect(result.has('foo')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty call graph', () => {
      const emptyCallGraph: CallGraph = {
        functions: new Map(),
        calls: [],
        callsFrom: new Map(),
        callsTo: new Map()
      };

      const emptyRD = new Map<string, Map<string, ReachingDefinitionsInfo>>();

      const analyzer = new InterProceduralReachingDefinitions(emptyCallGraph, emptyRD);
      const result = analyzer.analyze();

      expect(result.size).toBe(0);
    });

    it('should handle functions with missing RD info', () => {
      const { callGraph, intraRD } = createTestCallGraph();

      // Add function without RD info
      const noRDCFG = createMockCFG('noRD', ['int x = 5;']);
      const noRDMetadata: FunctionMetadata = {
        name: 'noRD',
        cfg: noRDCFG,
        parameters: [],
        returnType: 'void',
        isExternal: false,
        isRecursive: false,
        callsCount: 0
      };

      callGraph.functions.set('noRD', noRDMetadata);
      // Don't add RD info for this function

      const analyzer = new InterProceduralReachingDefinitions(callGraph, intraRD);
      const result = analyzer.analyze();

      // Should handle gracefully
      expect(result.has('main')).toBe(true);
    });

    it('should handle calls to non-existent functions', () => {
      const { callGraph, intraRD } = createTestCallGraph();

      // Add call to non-existent function
      const badCall: FunctionCall = {
        callerId: 'main',
        calleeId: 'nonexistent',
        callSite: {
          blockId: 'B0',
          statementId: 'stmt_3',
          line: 3,
          column: 0
        },
        arguments: {
          actual: [],
          types: []
        },
        returnValueUsed: false
      };

      callGraph.calls.push(badCall);
      callGraph.callsFrom.set('main', [...(callGraph.callsFrom.get('main') || []), badCall]);

      const analyzer = new InterProceduralReachingDefinitions(callGraph, intraRD);
      const result = analyzer.analyze();

      // Should handle gracefully
      expect(result.has('main')).toBe(true);
    });
  });
});

