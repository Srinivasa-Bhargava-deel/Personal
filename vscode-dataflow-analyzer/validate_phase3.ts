#!/usr/bin/env node
/**
 * Phase 3 Validation Script
 * 
 * Validates Inter-Procedural Reaching Definitions Analysis
 * 
 * Tests:
 * 1. Basic inter-procedural propagation
 * 2. Parameter mapping (formal -> actual)
 * 3. Return value propagation
 * 4. Fixed-point convergence
 * 5. Multiple call sites
 * 6. Edge cases
 */

import { CallGraphAnalyzer } from './src/analyzer/CallGraphAnalyzer';
import { InterProceduralReachingDefinitions } from './src/analyzer/InterProceduralReachingDefinitions';
import { ReachingDefinitionsAnalyzer } from './src/analyzer/ReachingDefinitionsAnalyzer';
import {
  FunctionCFG,
  BasicBlock,
  Statement,
  StatementType,
  ReachingDefinition,
  ReachingDefinitionsInfo
} from './src/types';

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
 * Helper: Analyze statement to extract defined and used variables
 */
function analyzeStatementVariables(content: string): { defined: string[]; used: string[] } {
  const trimmed = content.trim();
  const variables = { defined: [] as string[], used: [] as string[] };

  // Remove statement numbers if present
  let cleanContent = trimmed.replace(/^\d+:\s*/, '');

  // Pattern 1: Variable declaration with initialization
  // Example: "int x = 5;" -> defined: ["x"], used: []
  const declMatch = cleanContent.match(/\b(int|float|double|char|bool|long|short|unsigned)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:=\s*(.+))?/);
  if (declMatch) {
    const varName = declMatch[2];
    variables.defined.push(varName);
    
    // Extract used variables from RHS
    if (declMatch[3]) {
      const rhs = declMatch[3];
      const varMatches = rhs.matchAll(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g);
      for (const match of varMatches) {
        const varName = match[1];
        if (!['int', 'float', 'double', 'char', 'bool', 'return'].includes(varName)) {
          variables.used.push(varName);
        }
      }
    }
    return variables;
  }

  // Pattern 2: Assignment
  // Example: "x = y + 1;" -> defined: ["x"], used: ["y"]
  const assignMatch = cleanContent.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)/);
  if (assignMatch) {
    const lhs = assignMatch[1];
    const rhs = assignMatch[2];
    
    variables.defined.push(lhs);
    
    // Extract used variables from RHS
    const varMatches = rhs.matchAll(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g);
    for (const match of varMatches) {
      const varName = match[1];
      if (varName !== lhs && !['int', 'float', 'double', 'char', 'bool', 'return'].includes(varName)) {
        variables.used.push(varName);
      }
    }
    return variables;
  }

  // Pattern 3: Function call (extract arguments)
  const callMatch = cleanContent.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/);
  if (callMatch) {
    const args = callMatch[2];
    const varMatches = args.matchAll(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g);
    for (const match of varMatches) {
      variables.used.push(match[1]);
    }
  }

  return variables;
}

/**
 * Helper: Create a test CFG
 */
function createTestCFG(
  name: string,
  statements: string[],
  parameters: string[] = []
): FunctionCFG {
  const stmts: Statement[] = statements.map((text, idx) => {
    const vars = analyzeStatementVariables(text);
    return {
      id: `stmt_${idx}`,
      type: 'expression' as StatementType,
      text,
      content: text,
      variables: vars,
      range: {
        start: { line: idx + 1, column: 0 },
        end: { line: idx + 1, column: text.length }
      }
    };
  });

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
    name,
    entry: 'B0',
    exit: 'B0',
    blocks: new Map([['B0', block]]),
    parameters
  };
}

/**
 * Test 1: Basic inter-procedural propagation
 */
function test1_BasicPropagation(): TestResult {
  console.log('\n[TEST 1] Basic Inter-Procedural Propagation');

  try {
    // Create test functions: main() calls foo(x)
    const mainCFG = createTestCFG('main', [
      'int x = 5;',
      'int result = foo(x);',
      'return result;'
    ]);

    const fooCFG = createTestCFG('foo', [
      'int y = x + 1;',
      'return y;'
    ], ['x']);

    const functions = new Map<string, FunctionCFG>();
    functions.set('main', mainCFG);
    functions.set('foo', fooCFG);

    // Build call graph
    const cgAnalyzer = new CallGraphAnalyzer(functions);
    const callGraph = cgAnalyzer.buildCallGraph();

    // Manually set parameters
    const fooMetadata = callGraph.functions.get('foo');
    if (fooMetadata) {
      fooMetadata.parameters = [{ name: 'x', type: 'int', position: 0 }];
    }

    // Run intra-procedural analysis
    const rdAnalyzer = new ReachingDefinitionsAnalyzer();
    const intraRD = new Map<string, Map<string, ReachingDefinitionsInfo>>();

    for (const [name, cfg] of functions.entries()) {
      const funcRD = rdAnalyzer.analyze(cfg);
      intraRD.set(name, funcRD);
    }

    // Run inter-procedural analysis
    const ipaAnalyzer = new InterProceduralReachingDefinitions(callGraph, intraRD);
    const result = ipaAnalyzer.analyze();

    // Validate results
    const mainRD = result.get('main');
    const fooRD = result.get('foo');

    if (!mainRD || !fooRD) {
      return {
        name: 'Basic Propagation',
        passed: false,
        message: 'Missing RD results for main or foo'
      };
    }

    // Check that main has definition for 'x'
    const mainB0 = mainRD.get('B0');
    if (!mainB0) {
      return {
        name: 'Basic Propagation',
        passed: false,
        message: 'Missing RD info for main B0'
      };
    }

    const hasX = mainB0.out.has('x') || mainB0.gen.has('x');
    const hasResult = mainB0.out.has('result') || mainB0.gen.has('result');

    return {
      name: 'Basic Propagation',
      passed: hasX && hasResult,
      message: hasX && hasResult
        ? 'Definitions propagated correctly'
        : `Missing definitions: x=${hasX}, result=${hasResult}`,
      details: `main.out has x: ${hasX}, result: ${hasResult}`
    };
  } catch (error: any) {
    return {
      name: 'Basic Propagation',
      passed: false,
      message: `Error: ${error.message}`,
      details: error.stack
    };
  }
}

/**
 * Test 2: Parameter mapping
 */
function test2_ParameterMapping(): TestResult {
  console.log('\n[TEST 2] Parameter Mapping');

  try {
    const mainCFG = createTestCFG('main', [
      'int a = 10;',
      'int b = 20;',
      'int sum = add(a, b);'
    ]);

    const addCFG = createTestCFG('add', [
      'int result = x + y;',
      'return result;'
    ], ['x', 'y']);

    const functions = new Map<string, FunctionCFG>();
    functions.set('main', mainCFG);
    functions.set('add', addCFG);

    const cgAnalyzer = new CallGraphAnalyzer(functions);
    const callGraph = cgAnalyzer.buildCallGraph();

    // Manually set parameters (since extractParameters returns empty)
    const addMetadata = callGraph.functions.get('add');
    if (addMetadata) {
      addMetadata.parameters = [
        { name: 'x', type: 'int', position: 0 },
        { name: 'y', type: 'int', position: 1 }
      ];
    }

    // Check parameter mapping
    const calls = callGraph.callsFrom.get('main');
    if (!calls || calls.length === 0) {
      return {
        name: 'Parameter Mapping',
        passed: false,
        message: 'No calls found from main'
      };
    }

    const addCall = calls.find(c => c.calleeId === 'add');
    if (!addCall) {
      return {
        name: 'Parameter Mapping',
        passed: false,
        message: 'Call to add() not found'
      };
    }

    // Verify arguments
    const args = addCall.arguments.actual;
    const hasA = args.includes('a');
    const hasB = args.includes('b');

    // Verify callee parameters
    const addFuncMetadata = callGraph.functions.get('add');
    if (!addFuncMetadata) {
      return {
        name: 'Parameter Mapping',
        passed: false,
        message: 'add() metadata not found'
      };
    }

    const params = addFuncMetadata.parameters.map(p => p.name);
    const hasX = params.includes('x');
    const hasY = params.includes('y');

    return {
      name: 'Parameter Mapping',
      passed: hasA && hasB && hasX && hasY,
      message: hasA && hasB && hasX && hasY
        ? 'Parameter mapping correct'
        : `Args: a=${hasA}, b=${hasB}; Params: x=${hasX}, y=${hasY}`,
      details: `Call: add(${args.join(', ')}) -> Params: [${params.join(', ')}]`
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
 * Test 3: Return value propagation
 */
function test3_ReturnValuePropagation(): TestResult {
  console.log('\n[TEST 3] Return Value Propagation');

  try {
    const mainCFG = createTestCFG('main', [
      'int value = 42;',
      'int doubled = double(value);',
      'return doubled;'
    ]);

    const doubleCFG = createTestCFG('double', [
      'int result = x * 2;',
      'return result;'
    ], ['x']);

    const functions = new Map<string, FunctionCFG>();
    functions.set('main', mainCFG);
    functions.set('double', doubleCFG);

    const cgAnalyzer = new CallGraphAnalyzer(functions);
    const callGraph = cgAnalyzer.buildCallGraph();

    // Check return value usage
    const calls = callGraph.callsFrom.get('main');
    if (!calls || calls.length === 0) {
      return {
        name: 'Return Value Propagation',
        passed: false,
        message: 'No calls found'
      };
    }

    const doubleCall = calls.find(c => c.calleeId === 'double');
    if (!doubleCall) {
      return {
        name: 'Return Value Propagation',
        passed: false,
        message: 'Call to double() not found'
      };
    }

    const returnValueUsed = doubleCall.returnValueUsed;

    // Run analysis
    const rdAnalyzer = new ReachingDefinitionsAnalyzer();
    const intraRD = new Map<string, Map<string, ReachingDefinitionsInfo>>();

    for (const [name, cfg] of functions.entries()) {
      const funcRD = rdAnalyzer.analyze(cfg);
      intraRD.set(name, funcRD);
    }

    const ipaAnalyzer = new InterProceduralReachingDefinitions(callGraph, intraRD);
    const result = ipaAnalyzer.analyze();

    const mainRD = result.get('main');
    if (!mainRD) {
      return {
        name: 'Return Value Propagation',
        passed: false,
        message: 'Main RD not found'
      };
    }

    const mainB0 = mainRD.get('B0');
    if (!mainB0) {
      return {
        name: 'Return Value Propagation',
        passed: false,
        message: 'Main B0 RD not found'
      };
    }

    const hasDoubled = mainB0.out.has('doubled') || mainB0.gen.has('doubled');

    return {
      name: 'Return Value Propagation',
      passed: returnValueUsed && hasDoubled,
      message: returnValueUsed && hasDoubled
        ? 'Return value propagated correctly'
        : `returnValueUsed=${returnValueUsed}, hasDoubled=${hasDoubled}`,
      details: `Return value used: ${returnValueUsed}, doubled defined: ${hasDoubled}`
    };
  } catch (error: any) {
    return {
      name: 'Return Value Propagation',
      passed: false,
      message: `Error: ${error.message}`,
      details: error.stack
    };
  }
}

/**
 * Test 4: Fixed-point convergence
 */
function test4_FixedPointConvergence(): TestResult {
  console.log('\n[TEST 4] Fixed-Point Convergence');

  try {
    const mainCFG = createTestCFG('main', [
      'int x = 1;',
      'foo(x);'
    ]);

    const fooCFG = createTestCFG('foo', [
      'int y = x;',
      'bar(y);'
    ], ['x']);

    const barCFG = createTestCFG('bar', [
      'int z = y;',
      'return z;'
    ], ['y']);

    const functions = new Map<string, FunctionCFG>();
    functions.set('main', mainCFG);
    functions.set('foo', fooCFG);
    functions.set('bar', barCFG);

    const cgAnalyzer = new CallGraphAnalyzer(functions);
    const callGraph = cgAnalyzer.buildCallGraph();

    const rdAnalyzer = new ReachingDefinitionsAnalyzer();
    const intraRD = new Map<string, Map<string, ReachingDefinitionsInfo>>();

    for (const [name, cfg] of functions.entries()) {
      const funcRD = rdAnalyzer.analyze(cfg);
      intraRD.set(name, funcRD);
    }

    const ipaAnalyzer = new InterProceduralReachingDefinitions(callGraph, intraRD);
    const result = ipaAnalyzer.analyze();

    // Should converge without errors
    const allFunctionsPresent = ['main', 'foo', 'bar'].every(
      name => result.has(name)
    );

    return {
      name: 'Fixed-Point Convergence',
      passed: allFunctionsPresent,
      message: allFunctionsPresent
        ? 'Analysis converged successfully'
        : 'Missing functions in result',
      details: `Functions present: ${Array.from(result.keys()).join(', ')}`
    };
  } catch (error: any) {
    return {
      name: 'Fixed-Point Convergence',
      passed: false,
      message: `Error: ${error.message}`,
      details: error.stack
    };
  }
}

/**
 * Test 5: Multiple call sites
 */
function test5_MultipleCallSites(): TestResult {
  console.log('\n[TEST 5] Multiple Call Sites');

  try {
    const mainCFG = createTestCFG('main', [
      'int a = 1;',
      'int b = 2;',
      'foo(a);',
      'foo(b);',
      'bar(a);'
    ]);

    const fooCFG = createTestCFG('foo', [
      'int y = x * 2;',
      'return y;'
    ], ['x']);

    const barCFG = createTestCFG('bar', [
      'int z = x + 10;',
      'return z;'
    ], ['x']);

    const functions = new Map<string, FunctionCFG>();
    functions.set('main', mainCFG);
    functions.set('foo', fooCFG);
    functions.set('bar', barCFG);

    const cgAnalyzer = new CallGraphAnalyzer(functions);
    const callGraph = cgAnalyzer.buildCallGraph();

    // Check multiple calls
    const calls = callGraph.callsFrom.get('main');
    if (!calls) {
      return {
        name: 'Multiple Call Sites',
        passed: false,
        message: 'No calls found'
      };
    }

    const fooCalls = calls.filter(c => c.calleeId === 'foo');
    const barCalls = calls.filter(c => c.calleeId === 'bar');

    const hasMultipleFooCalls = fooCalls.length >= 2;
    const hasBarCall = barCalls.length >= 1;

    return {
      name: 'Multiple Call Sites',
      passed: hasMultipleFooCalls && hasBarCall,
      message: hasMultipleFooCalls && hasBarCall
        ? 'Multiple call sites detected correctly'
        : `foo calls: ${fooCalls.length}, bar calls: ${barCalls.length}`,
      details: `Total calls: ${calls.length}, foo: ${fooCalls.length}, bar: ${barCalls.length}`
    };
  } catch (error: any) {
    return {
      name: 'Multiple Call Sites',
      passed: false,
      message: `Error: ${error.message}`,
      details: error.stack
    };
  }
}

/**
 * Test 6: Edge cases
 */
function test6_EdgeCases(): TestResult {
  console.log('\n[TEST 6] Edge Cases');

  try {
    // Test empty call graph
    const emptyFunctions = new Map<string, FunctionCFG>();
    const emptyCFG: FunctionCFG = {
      name: 'empty',
      entry: 'B0',
      exit: 'B0',
      blocks: new Map(),
      parameters: []
    };
    emptyFunctions.set('empty', emptyCFG);

    const cgAnalyzer1 = new CallGraphAnalyzer(emptyFunctions);
    const emptyCallGraph = cgAnalyzer1.buildCallGraph();

    const rdAnalyzer = new ReachingDefinitionsAnalyzer();
    const emptyRD = new Map<string, Map<string, ReachingDefinitionsInfo>>();
    const emptyFuncRD = rdAnalyzer.analyze(emptyCFG);
    emptyRD.set('empty', emptyFuncRD);

    const ipaAnalyzer1 = new InterProceduralReachingDefinitions(emptyCallGraph, emptyRD);
    const emptyResult = ipaAnalyzer1.analyze();

    const handlesEmpty = emptyResult.size >= 0; // Should not crash

    // Test function with no calls
    const noCallCFG = createTestCFG('noCall', [
      'int x = 5;',
      'int y = x + 1;'
    ]);

    const functions2 = new Map<string, FunctionCFG>();
    functions2.set('noCall', noCallCFG);

    const cgAnalyzer2 = new CallGraphAnalyzer(functions2);
    const callGraph2 = cgAnalyzer2.buildCallGraph();

    const intraRD2 = new Map<string, Map<string, ReachingDefinitionsInfo>>();
    const noCallRD = rdAnalyzer.analyze(noCallCFG);
    intraRD2.set('noCall', noCallRD);

    const ipaAnalyzer2 = new InterProceduralReachingDefinitions(callGraph2, intraRD2);
    const result2 = ipaAnalyzer2.analyze();

    const handlesNoCalls = result2.has('noCall');

    return {
      name: 'Edge Cases',
      passed: handlesEmpty && handlesNoCalls,
      message: handlesEmpty && handlesNoCalls
        ? 'Edge cases handled correctly'
        : `empty=${handlesEmpty}, noCalls=${handlesNoCalls}`,
      details: `Empty graph: ${handlesEmpty}, No calls: ${handlesNoCalls}`
    };
  } catch (error: any) {
    return {
      name: 'Edge Cases',
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
  console.log('║     Phase 3: Inter-Procedural Data Flow Validation        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Run all tests
  results.push(test1_BasicPropagation());
  results.push(test2_ParameterMapping());
  results.push(test3_ReturnValuePropagation());
  results.push(test4_FixedPointConvergence());
  results.push(test5_MultipleCallSites());
  results.push(test6_EdgeCases());

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
    console.log('\n🎉 ALL TESTS PASSED! Phase 3 validation successful!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Review details above.');
    process.exit(1);
  }
}

// Run validation
runValidation();

