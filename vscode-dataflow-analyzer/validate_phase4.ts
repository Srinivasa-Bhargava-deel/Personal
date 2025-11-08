#!/usr/bin/env node
/**
 * Phase 4 Validation Script
 * 
 * Validates Parameter & Return Value Analysis components:
 * 1. ParameterAnalyzer - argument derivation analysis
 * 2. ReturnValueAnalyzer - return value extraction
 * 3. FunctionSummaries - library function summaries
 */

import { ParameterAnalyzer, ArgumentDerivationType } from './src/analyzer/ParameterAnalyzer';
import { ReturnValueAnalyzer, ReturnValueType } from './src/analyzer/ReturnValueAnalyzer';
import { FunctionSummaries, getFunctionSummary } from './src/analyzer/FunctionSummaries';
import { FunctionCall, FunctionMetadata } from './src/analyzer/CallGraphAnalyzer';
import { FunctionCFG, Statement, StatementType } from './src/types';

/**
 * Test results tracker
 */
interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: string;
}

const results: TestResult[] = [];

/**
 * Helper: Create a mock CFG for testing
 */
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

/**
 * Test 1: ParameterAnalyzer - Direct References
 */
function test1_ParameterDirect(): TestResult {
  console.log('\n[TEST 1] ParameterAnalyzer - Direct References');

  try {
    const analyzer = new ParameterAnalyzer();
    const result = analyzer.analyzeArgumentDerivation('x');

    const passed = result.type === ArgumentDerivationType.DIRECT &&
                   result.base === 'x' &&
                   result.usedVariables.includes('x');

    return {
      name: 'Parameter Direct References',
      passed,
      message: passed
        ? 'Direct references correctly identified'
        : `Expected DIRECT, got ${result.type}`,
      details: `Type: ${result.type}, Base: ${result.base}, Vars: ${result.usedVariables.join(', ')}`
    };
  } catch (error: any) {
    return {
      name: 'Parameter Direct References',
      passed: false,
      message: `Error: ${error.message}`,
      details: error.stack
    };
  }
}

/**
 * Test 2: ParameterAnalyzer - Address-of Operations
 */
function test2_ParameterAddress(): TestResult {
  console.log('\n[TEST 2] ParameterAnalyzer - Address-of Operations');

  try {
    const analyzer = new ParameterAnalyzer();
    const result = analyzer.analyzeArgumentDerivation('&x');

    const passed = result.type === ArgumentDerivationType.ADDRESS &&
                   result.base === 'x' &&
                   result.transformations.includes('&') &&
                   analyzer.isPointerArgument(result);

    return {
      name: 'Parameter Address-of',
      passed,
      message: passed
        ? 'Address-of operations correctly identified'
        : `Expected ADDRESS, got ${result.type}`,
      details: `Type: ${result.type}, Base: ${result.base}, Transformations: ${result.transformations.join(', ')}`
    };
  } catch (error: any) {
    return {
      name: 'Parameter Address-of',
      passed: false,
      message: `Error: ${error.message}`,
      details: error.stack
    };
  }
}

/**
 * Test 3: ParameterAnalyzer - Expressions
 */
function test3_ParameterExpression(): TestResult {
  console.log('\n[TEST 3] ParameterAnalyzer - Expressions');

  try {
    const analyzer = new ParameterAnalyzer();
    const result = analyzer.analyzeArgumentDerivation('x + 1');

    const passed = result.type === ArgumentDerivationType.EXPRESSION &&
                   result.base === 'x' &&
                   result.usedVariables.includes('x');

    return {
      name: 'Parameter Expressions',
      passed,
      message: passed
        ? 'Expressions correctly identified'
        : `Expected EXPRESSION, got ${result.type}`,
      details: `Type: ${result.type}, Base: ${result.base}, Expression: ${result.expression}`
    };
  } catch (error: any) {
    return {
      name: 'Parameter Expressions',
      passed: false,
      message: `Error: ${error.message}`,
      details: error.stack
    };
  }
}

/**
 * Test 4: ParameterAnalyzer - Composite Access
 */
function test4_ParameterComposite(): TestResult {
  console.log('\n[TEST 4] ParameterAnalyzer - Composite Access');

  try {
    const analyzer = new ParameterAnalyzer();
    const result1 = analyzer.analyzeArgumentDerivation('obj.field');
    const result2 = analyzer.analyzeArgumentDerivation('ptr->member');

    const passed = result1.type === ArgumentDerivationType.COMPOSITE &&
                   result2.type === ArgumentDerivationType.COMPOSITE &&
                   analyzer.isCompositeArgument(result1) &&
                   analyzer.isCompositeArgument(result2);

    return {
      name: 'Parameter Composite Access',
      passed,
      message: passed
        ? 'Composite access correctly identified'
        : `obj.field: ${result1.type}, ptr->member: ${result2.type}`,
      details: `Dot access: ${result1.type}, Arrow access: ${result2.type}`
    };
  } catch (error: any) {
    return {
      name: 'Parameter Composite Access',
      passed: false,
      message: `Error: ${error.message}`,
      details: error.stack
    };
  }
}

/**
 * Test 5: ParameterAnalyzer - Function Calls
 */
function test5_ParameterCall(): TestResult {
  console.log('\n[TEST 5] ParameterAnalyzer - Function Calls');

  try {
    const analyzer = new ParameterAnalyzer();
    const result = analyzer.analyzeArgumentDerivation('foo(x)');

    const passed = result.type === ArgumentDerivationType.CALL &&
                   result.base === 'foo' &&
                   result.usedVariables.includes('x') &&
                   analyzer.isCallArgument(result);

    return {
      name: 'Parameter Function Calls',
      passed,
      message: passed
        ? 'Function calls correctly identified'
        : `Expected CALL, got ${result.type}`,
      details: `Type: ${result.type}, Base: ${result.base}, Used vars: ${result.usedVariables.join(', ')}`
    };
  } catch (error: any) {
    return {
      name: 'Parameter Function Calls',
      passed: false,
      message: `Error: ${error.message}`,
      details: error.stack
    };
  }
}

/**
 * Test 6: ParameterAnalyzer - Array Access
 */
function test6_ParameterArray(): TestResult {
  console.log('\n[TEST 6] ParameterAnalyzer - Array Access');

  try {
    const analyzer = new ParameterAnalyzer();
    const result = analyzer.analyzeArgumentDerivation('arr[i]');

    const passed = result.type === ArgumentDerivationType.ARRAY_ACCESS &&
                   result.base === 'arr' &&
                   result.usedVariables.includes('arr') &&
                   result.usedVariables.includes('i');

    return {
      name: 'Parameter Array Access',
      passed,
      message: passed
        ? 'Array access correctly identified'
        : `Expected ARRAY_ACCESS, got ${result.type}`,
      details: `Type: ${result.type}, Base: ${result.base}, Index vars: ${result.usedVariables.join(', ')}`
    };
  } catch (error: any) {
    return {
      name: 'Parameter Array Access',
      passed: false,
      message: `Error: ${error.message}`,
      details: error.stack
    };
  }
}

/**
 * Test 7: ParameterAnalyzer - Parameter Mapping
 */
function test7_ParameterMapping(): TestResult {
  console.log('\n[TEST 7] ParameterAnalyzer - Parameter Mapping');

  try {
    const analyzer = new ParameterAnalyzer();
    
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

    const passed = mappings.length === 3 &&
                   mappings[0].derivation.type === ArgumentDerivationType.DIRECT &&
                   mappings[1].derivation.type === ArgumentDerivationType.EXPRESSION &&
                   mappings[2].derivation.type === ArgumentDerivationType.ADDRESS;

    return {
      name: 'Parameter Mapping',
      passed,
      message: passed
        ? 'Parameter mapping with derivation working correctly'
        : `Mappings: ${mappings.length}, Types: ${mappings.map(m => m.derivation.type).join(', ')}`,
      details: `Mapped ${mappings.length} parameters with derivations`
    };
  } catch (error: any) {
    return {
      name: 'Parameter Mapping',
      passed: false,
      message: `Error: ${error.message}`,
      details: error.stack
    };
  }
}

/**
 * Test 8: ReturnValueAnalyzer - Variable Returns
 */
function test8_ReturnVariable(): TestResult {
  console.log('\n[TEST 8] ReturnValueAnalyzer - Variable Returns');

  try {
    const analyzer = new ReturnValueAnalyzer();
    const cfg = createMockCFG(['int x = 5;', 'return x;']);
    const returns = analyzer.analyzeReturns(cfg);

    const passed = returns.length === 1 &&
                   returns[0].type === ReturnValueType.VARIABLE &&
                   returns[0].value === 'x' &&
                   returns[0].usedVariables.includes('x');

    return {
      name: 'Return Variable',
      passed,
      message: passed
        ? 'Variable returns correctly extracted'
        : `Expected VARIABLE, got ${returns[0]?.type}`,
      details: `Type: ${returns[0]?.type}, Value: ${returns[0]?.value}`
    };
  } catch (error: any) {
    return {
      name: 'Return Variable',
      passed: false,
      message: `Error: ${error.message}`,
      details: error.stack
    };
  }
}

/**
 * Test 9: ReturnValueAnalyzer - Expression Returns
 */
function test9_ReturnExpression(): TestResult {
  console.log('\n[TEST 9] ReturnValueAnalyzer - Expression Returns');

  try {
    const analyzer = new ReturnValueAnalyzer();
    const cfg = createMockCFG(['int x = 5;', 'return x + 1;']);
    const returns = analyzer.analyzeReturns(cfg);

    const passed = returns.length === 1 &&
                   returns[0].type === ReturnValueType.EXPRESSION &&
                   returns[0].usedVariables.includes('x');

    return {
      name: 'Return Expression',
      passed,
      message: passed
        ? 'Expression returns correctly extracted'
        : `Expected EXPRESSION, got ${returns[0]?.type}`,
      details: `Type: ${returns[0]?.type}, Expression: ${returns[0]?.value}`
    };
  } catch (error: any) {
    return {
      name: 'Return Expression',
      passed: false,
      message: `Error: ${error.message}`,
      details: error.stack
    };
  }
}

/**
 * Test 10: ReturnValueAnalyzer - Call Returns
 */
function test10_ReturnCall(): TestResult {
  console.log('\n[TEST 10] ReturnValueAnalyzer - Call Returns');

  try {
    const analyzer = new ReturnValueAnalyzer();
    const cfg = createMockCFG(['return foo(x);']);
    const returns = analyzer.analyzeReturns(cfg);

    const passed = returns.length === 1 &&
                   returns[0].type === ReturnValueType.CALL &&
                   returns[0].value.includes('foo');

    return {
      name: 'Return Call',
      passed,
      message: passed
        ? 'Call returns correctly extracted'
        : `Expected CALL, got ${returns[0]?.type}`,
      details: `Type: ${returns[0]?.type}, Value: ${returns[0]?.value}`
    };
  } catch (error: any) {
    return {
      name: 'Return Call',
      passed: false,
      message: `Error: ${error.message}`,
      details: error.stack
    };
  }
}

/**
 * Test 11: ReturnValueAnalyzer - Constant Returns
 */
function test11_ReturnConstant(): TestResult {
  console.log('\n[TEST 11] ReturnValueAnalyzer - Constant Returns');

  try {
    const analyzer = new ReturnValueAnalyzer();
    const cfg = createMockCFG(['return 42;']);
    const returns = analyzer.analyzeReturns(cfg);

    const passed = returns.length === 1 &&
                   returns[0].type === ReturnValueType.CONSTANT &&
                   returns[0].value === '42' &&
                   returns[0].inferredType === 'int';

    return {
      name: 'Return Constant',
      passed,
      message: passed
        ? 'Constant returns correctly extracted'
        : `Expected CONSTANT, got ${returns[0]?.type}`,
      details: `Type: ${returns[0]?.type}, Value: ${returns[0]?.value}, Inferred type: ${returns[0]?.inferredType}`
    };
  } catch (error: any) {
    return {
      name: 'Return Constant',
      passed: false,
      message: `Error: ${error.message}`,
      details: error.stack
    };
  }
}

/**
 * Test 12: ReturnValueAnalyzer - Multiple Returns
 */
function test12_ReturnMultiple(): TestResult {
  console.log('\n[TEST 12] ReturnValueAnalyzer - Multiple Returns');

  try {
    const analyzer = new ReturnValueAnalyzer();
    const cfg = createMockCFG([
      'if (x > 0) return x;',
      'return 0;'
    ]);
    const returns = analyzer.analyzeReturns(cfg);

    const passed = returns.length === 2 &&
                   analyzer.hasMultipleReturnPaths(returns);

    return {
      name: 'Return Multiple Paths',
      passed,
      message: passed
        ? 'Multiple return paths correctly detected'
        : `Found ${returns.length} returns, expected 2`,
      details: `Found ${returns.length} return statements`
    };
  } catch (error: any) {
    return {
      name: 'Return Multiple Paths',
      passed: false,
      message: `Error: ${error.message}`,
      details: error.stack
    };
  }
}

/**
 * Test 13: FunctionSummaries - strcpy
 */
function test13_SummaryStrcpy(): TestResult {
  console.log('\n[TEST 13] FunctionSummaries - strcpy');

  try {
    const summary = getFunctionSummary('strcpy');

    const passed = summary !== null &&
                   summary!.name === 'strcpy' &&
                   summary!.parameters.length === 2 &&
                   summary!.parameters[0].mode === 'out' &&
                   summary!.parameters[1].mode === 'in' &&
                   summary!.returnValue.isTainted === true;

    return {
      name: 'Summary strcpy',
      passed,
      message: passed
        ? 'strcpy summary correctly retrieved'
        : `Summary: ${summary ? 'found' : 'not found'}`,
      details: summary
        ? `Params: ${summary.parameters.length}, Return tainted: ${summary.returnValue.isTainted}`
        : 'Summary not found'
    };
  } catch (error: any) {
    return {
      name: 'Summary strcpy',
      passed: false,
      message: `Error: ${error.message}`,
      details: error.stack
    };
  }
}

/**
 * Test 14: FunctionSummaries - malloc
 */
function test14_SummaryMalloc(): TestResult {
  console.log('\n[TEST 14] FunctionSummaries - malloc');

  try {
    const summary = getFunctionSummary('malloc');

    const passed = summary !== null &&
                   summary!.name === 'malloc' &&
                   summary!.parameters.length === 1 &&
                   summary!.returnValue.type === 'void*';

    return {
      name: 'Summary malloc',
      passed,
      message: passed
        ? 'malloc summary correctly retrieved'
        : `Summary: ${summary ? 'found' : 'not found'}`,
      details: summary
        ? `Return type: ${summary.returnValue.type}`
        : 'Summary not found'
    };
  } catch (error: any) {
    return {
      name: 'Summary malloc',
      passed: false,
      message: `Error: ${error.message}`,
      details: error.stack
    };
  }
}

/**
 * Test 15: FunctionSummaries - Custom Summaries
 */
function test15_SummaryCustom(): TestResult {
  console.log('\n[TEST 15] FunctionSummaries - Custom Summaries');

  try {
    const summaries = new FunctionSummaries();
    
    summaries.addSummary({
      name: 'custom_func',
      parameters: [
        {
          index: 0,
          name: 'x',
          mode: 'in' as any,
          taintPropagation: false
        }
      ],
      returnValue: {
        type: 'int',
        isTainted: false,
        depends: []
      },
      globalEffects: []
    });

    const passed = summaries.hasSummary('custom_func') &&
                   summaries.getSummary('custom_func') !== null;

    return {
      name: 'Summary Custom',
      passed,
      message: passed
        ? 'Custom summaries working correctly'
        : 'Failed to add/retrieve custom summary',
      details: `Custom function added: ${passed}`
    };
  } catch (error: any) {
    return {
      name: 'Summary Custom',
      passed: false,
      message: `Error: ${error.message}`,
      details: error.stack
    };
  }
}

/**
 * Main validation function
 */
function runValidation(): void {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Phase 4: Parameter & Return Value Validation          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Run all tests
  results.push(test1_ParameterDirect());
  results.push(test2_ParameterAddress());
  results.push(test3_ParameterExpression());
  results.push(test4_ParameterComposite());
  results.push(test5_ParameterCall());
  results.push(test6_ParameterArray());
  results.push(test7_ParameterMapping());
  results.push(test8_ReturnVariable());
  results.push(test9_ReturnExpression());
  results.push(test10_ReturnCall());
  results.push(test11_ReturnConstant());
  results.push(test12_ReturnMultiple());
  results.push(test13_SummaryStrcpy());
  results.push(test14_SummaryMalloc());
  results.push(test15_SummaryCustom());

  // Print results
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    VALIDATION RESULTS                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  let passed = 0;
  let failed = 0;

  results.forEach((result, idx) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${idx + 1}. ${result.name}: ${status}`);
    console.log(`   ${result.message}`);
    if (result.details) {
      console.log(`   Details: ${result.details}`);
    }
    console.log();

    if (result.passed) {
      passed++;
    } else {
      failed++;
    }
  });

  // Summary
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                        SUMMARY                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Phase 4 validation successful!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Review details above.');
    process.exit(1);
  }
}

// Run validation
runValidation();

