/**
 * Unit tests for Phase 4: Parameter & Return Value Analysis
 * 
 * Tests:
 * 1. ParameterAnalyzer - argument derivation analysis
 * 2. ReturnValueAnalyzer - return value extraction
 * 3. FunctionSummaries - library function summaries
 */

import { ParameterAnalyzer, ArgumentDerivationType } from '../ParameterAnalyzer';
import { ReturnValueAnalyzer, ReturnValueType } from '../ReturnValueAnalyzer';
import { FunctionSummaries, getFunctionSummary } from '../FunctionSummaries';
import { FunctionCall, FunctionMetadata } from '../CallGraphAnalyzer';
import { FunctionCFG, Statement, StatementType } from '../../types';

describe('ParameterAnalyzer - Phase 4', () => {
  const analyzer = new ParameterAnalyzer();

  describe('analyzeArgumentDerivation()', () => {
    it('should identify direct references', () => {
      const result = analyzer.analyzeArgumentDerivation('x');
      
      expect(result.type).toBe(ArgumentDerivationType.DIRECT);
      expect(result.base).toBe('x');
      expect(result.transformations).toEqual([]);
      expect(result.usedVariables).toEqual(['x']);
    });

    it('should identify address-of operations', () => {
      const result = analyzer.analyzeArgumentDerivation('&x');
      
      expect(result.type).toBe(ArgumentDerivationType.ADDRESS);
      expect(result.base).toBe('x');
      expect(result.transformations).toEqual(['&']);
    });

    it('should identify dereference operations', () => {
      const result = analyzer.analyzeArgumentDerivation('*ptr');
      
      expect(result.type).toBe(ArgumentDerivationType.DEREFERENCE);
      expect(result.base).toBe('ptr');
      expect(result.transformations).toEqual(['*']);
    });

    it('should identify function calls', () => {
      const result = analyzer.analyzeArgumentDerivation('foo(x)');
      
      expect(result.type).toBe(ArgumentDerivationType.CALL);
      expect(result.base).toBe('foo');
      expect(result.usedVariables).toContain('x');
    });

    it('should identify array access', () => {
      const result = analyzer.analyzeArgumentDerivation('arr[i]');
      
      expect(result.type).toBe(ArgumentDerivationType.ARRAY_ACCESS);
      expect(result.base).toBe('arr');
      expect(result.usedVariables).toContain('arr');
      expect(result.usedVariables).toContain('i');
    });

    it('should identify member access', () => {
      const result = analyzer.analyzeArgumentDerivation('obj.field');
      
      expect(result.type).toBe(ArgumentDerivationType.COMPOSITE);
      expect(result.base).toBe('obj');
      expect(result.transformations).toEqual(['field']);
    });

    it('should identify pointer member access', () => {
      const result = analyzer.analyzeArgumentDerivation('ptr->field');
      
      expect(result.type).toBe(ArgumentDerivationType.COMPOSITE);
      expect(result.base).toBe('ptr');
    });

    it('should identify arithmetic expressions', () => {
      const result = analyzer.analyzeArgumentDerivation('x + 1');
      
      expect(result.type).toBe(ArgumentDerivationType.EXPRESSION);
      expect(result.base).toBe('x');
      expect(result.usedVariables).toContain('x');
    });

    it('should identify complex expressions', () => {
      const result = analyzer.analyzeArgumentDerivation('x * y + z');
      
      expect(result.type).toBe(ArgumentDerivationType.EXPRESSION);
      expect(result.usedVariables.length).toBeGreaterThan(0);
    });
  });

  describe('mapParametersWithDerivation()', () => {
    it('should map parameters with derivation analysis', () => {
      const call: FunctionCall = {
        callerId: 'main',
        calleeId: 'foo',
        callSite: {
          blockId: 'B0',
          statementId: 'stmt_0',
          line: 1,
          column: 0
        },
        arguments: {
          actual: ['x', 'y + 1', '&z'],
          types: ['int', 'int', 'int*']
        },
        returnValueUsed: true
      };

      const calleeMetadata: FunctionMetadata = {
        name: 'foo',
        cfg: {} as FunctionCFG,
        parameters: [
          { name: 'a', type: 'int', position: 0 },
          { name: 'b', type: 'int', position: 1 },
          { name: 'c', type: 'int*', position: 2 }
        ],
        returnType: 'int',
        isExternal: false,
        isRecursive: false,
        callsCount: 0
      };

      const mappings = analyzer.mapParametersWithDerivation(call, calleeMetadata);

      expect(mappings.length).toBe(3);
      expect(mappings[0].derivation.type).toBe(ArgumentDerivationType.DIRECT);
      expect(mappings[1].derivation.type).toBe(ArgumentDerivationType.EXPRESSION);
      expect(mappings[2].derivation.type).toBe(ArgumentDerivationType.ADDRESS);
    });
  });

  describe('helper methods', () => {
    it('should identify pointer arguments', () => {
      const derivation = analyzer.analyzeArgumentDerivation('&x');
      expect(analyzer.isPointerArgument(derivation)).toBe(true);
    });

    it('should identify composite arguments', () => {
      const derivation = analyzer.analyzeArgumentDerivation('obj.field');
      expect(analyzer.isCompositeArgument(derivation)).toBe(true);
    });

    it('should identify call arguments', () => {
      const derivation = analyzer.analyzeArgumentDerivation('foo(x)');
      expect(analyzer.isCallArgument(derivation)).toBe(true);
    });
  });
});

describe('ReturnValueAnalyzer - Phase 4', () => {
  const analyzer = new ReturnValueAnalyzer();

  function createMockCFG(statements: string[]): FunctionCFG {
    const stmts: Statement[] = statements.map((text, idx) => ({
      id: `stmt_${idx}`,
      type: 'expression' as StatementType,
      text,
      content: text,
      variables: { defined: [], used: [] },
      range: {
        start: { line: idx + 1, column: 0 },
        end: { line: idx + 1, column: text.length }
      }
    }));

    return {
      name: 'test',
      entry: 'B0',
      exit: 'B0',
      blocks: new Map([['B0', {
        id: 'B0',
        label: 'entry',
        statements: stmts,
        predecessors: [],
        successors: [],
        isEntry: true,
        isExit: true
      }]]),
      parameters: []
    };
  }

  describe('analyzeReturns()', () => {
    it('should extract variable returns', () => {
      const cfg = createMockCFG(['int x = 5;', 'return x;']);
      const returns = analyzer.analyzeReturns(cfg);

      expect(returns.length).toBe(1);
      expect(returns[0].type).toBe(ReturnValueType.VARIABLE);
      expect(returns[0].value).toBe('x');
      expect(returns[0].usedVariables).toContain('x');
    });

    it('should extract expression returns', () => {
      const cfg = createMockCFG(['int x = 5;', 'return x + 1;']);
      const returns = analyzer.analyzeReturns(cfg);

      expect(returns.length).toBe(1);
      expect(returns[0].type).toBe(ReturnValueType.EXPRESSION);
      expect(returns[0].usedVariables).toContain('x');
    });

    it('should extract call returns', () => {
      const cfg = createMockCFG(['return foo(x);']);
      const returns = analyzer.analyzeReturns(cfg);

      expect(returns.length).toBe(1);
      expect(returns[0].type).toBe(ReturnValueType.CALL);
      expect(returns[0].value).toContain('foo');
    });

    it('should extract constant returns', () => {
      const cfg = createMockCFG(['return 42;']);
      const returns = analyzer.analyzeReturns(cfg);

      expect(returns.length).toBe(1);
      expect(returns[0].type).toBe(ReturnValueType.CONSTANT);
      expect(returns[0].value).toBe('42');
    });

    it('should extract conditional returns', () => {
      const cfg = createMockCFG(['return (x > 0) ? x : 0;']);
      const returns = analyzer.analyzeReturns(cfg);

      expect(returns.length).toBe(1);
      expect(returns[0].type).toBe(ReturnValueType.CONDITIONAL);
      expect(returns[0].usedVariables).toContain('x');
    });

    it('should extract void returns', () => {
      const cfg = createMockCFG(['return;']);
      const returns = analyzer.analyzeReturns(cfg);

      expect(returns.length).toBe(1);
      expect(returns[0].type).toBe(ReturnValueType.VOID);
      expect(returns[0].value).toBe('');
    });

    it('should handle multiple returns', () => {
      const cfg = createMockCFG([
        'if (x > 0) return x;',
        'return 0;'
      ]);
      const returns = analyzer.analyzeReturns(cfg);

      expect(returns.length).toBe(2);
      expect(analyzer.hasMultipleReturnPaths(returns)).toBe(true);
    });
  });

  describe('inferReturnType()', () => {
    it('should infer int from integer literal', () => {
      const cfg = createMockCFG(['return 42;']);
      const returns = analyzer.analyzeReturns(cfg);
      expect(returns[0].inferredType).toBe('int');
    });

    it('should infer double from float literal', () => {
      const cfg = createMockCFG(['return 3.14;']);
      const returns = analyzer.analyzeReturns(cfg);
      expect(returns[0].inferredType).toBe('double');
    });

    it('should infer bool from boolean literal', () => {
      const cfg = createMockCFG(['return true;']);
      const returns = analyzer.analyzeReturns(cfg);
      expect(returns[0].inferredType).toBe('bool');
    });
  });

  describe('propagateReturnValue()', () => {
    it('should extract affecting variables', () => {
      const cfg = createMockCFG(['int x = 5;', 'int y = 10;', 'return x + y;']);
      const returns = analyzer.analyzeReturns(cfg);
      
      const affecting = analyzer.propagateReturnValue(returns, 'B0', 'result');
      expect(affecting.length).toBeGreaterThan(0);
    });
  });
});

describe('FunctionSummaries - Phase 4', () => {
  describe('getFunctionSummary()', () => {
    it('should return summary for strcpy', () => {
      const summary = getFunctionSummary('strcpy');
      
      expect(summary).not.toBeNull();
      expect(summary!.name).toBe('strcpy');
      expect(summary!.parameters.length).toBe(2);
      expect(summary!.parameters[0].mode).toBe('out');
      expect(summary!.parameters[1].mode).toBe('in');
      expect(summary!.returnValue.isTainted).toBe(true);
    });

    it('should return summary for malloc', () => {
      const summary = getFunctionSummary('malloc');
      
      expect(summary).not.toBeNull();
      expect(summary!.name).toBe('malloc');
      expect(summary!.parameters.length).toBe(1);
      expect(summary!.returnValue.type).toBe('void*');
    });

    it('should return null for unknown function', () => {
      const summary = getFunctionSummary('unknown_function');
      expect(summary).toBeNull();
    });
  });

  describe('LIBRARY_SUMMARIES', () => {
    it('should have summaries for common functions', () => {
      const summaries = new FunctionSummaries();
      
      expect(summaries.hasSummary('strcpy')).toBe(true);
      expect(summaries.hasSummary('malloc')).toBe(true);
      expect(summaries.hasSummary('free')).toBe(true);
      expect(summaries.hasSummary('printf')).toBe(true);
    });

    it('should allow adding custom summaries', () => {
      const summaries = new FunctionSummaries();
      
      summaries.addSummary({
        name: 'custom_func',
        parameters: [],
        returnValue: {
          type: 'int',
          isTainted: false,
          depends: []
        },
        globalEffects: []
      });
      
      expect(summaries.hasSummary('custom_func')).toBe(true);
    });

    it('should get summaries by category', () => {
      const summaries = new FunctionSummaries();
      const stringFuncs = summaries.getSummariesByCategory('string');
      
      expect(stringFuncs.length).toBeGreaterThan(0);
      expect(stringFuncs.some(s => s.name === 'strcpy')).toBe(true);
    });
  });
});

