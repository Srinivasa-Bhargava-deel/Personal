/**
 * Verification Tests for Taint Analysis Phases 1 & 2
 * 
 * Tests:
 * - Phase 1: Enhanced Taint Source Detection
 * - Phase 2: Taint Sink Detection and Vulnerability Generation
 */

import { TaintSourceRegistry, defaultTaintSourceRegistry } from '../TaintSourceRegistry';
import { TaintSinkRegistry, defaultTaintSinkRegistry } from '../TaintSinkRegistry';
import { TaintAnalyzer } from '../TaintAnalyzer';
import { FunctionCFG, StatementType, BasicBlock } from '../../types';

/**
 * Create a mock FunctionCFG for testing
 */
function createMockFunctionCFG(name: string, statements: Array<{ text: string; type: StatementType; variables?: { defined: string[]; used: string[] } }>): FunctionCFG {
  const blocks = new Map<string, BasicBlock>();
  
  const entryBlock: BasicBlock = {
    id: 'entry',
    label: 'Entry',
    statements: [],
    predecessors: [],
    successors: ['B1']
  };
  
  const mainBlock: BasicBlock = {
    id: 'B1',
    label: 'B1',
    statements: statements.map((stmt, idx) => ({
      id: `stmt_${idx}`,
      type: stmt.type,
      text: stmt.text,
      variables: stmt.variables
    })),
    predecessors: ['entry'],
    successors: ['exit']
  };
  
  const exitBlock: BasicBlock = {
    id: 'exit',
    label: 'Exit',
    statements: [],
    predecessors: ['B1'],
    successors: []
  };
  
  blocks.set('entry', entryBlock);
  blocks.set('B1', mainBlock);
  blocks.set('exit', exitBlock);
  
  return {
    name,
    entry: 'entry',
    exit: 'exit',
    blocks,
    parameters: []
  };
}

/**
 * Test Phase 1: Enhanced Taint Source Detection
 */
function testPhase1_SourceDetection(): { passed: number; failed: number; errors: string[] } {
  console.log('\n=== Phase 1: Enhanced Taint Source Detection ===\n');
  
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];
  
  const registry = defaultTaintSourceRegistry;
  
  // Test 1: User input sources
  console.log('Test 1.1: User input sources (scanf, gets, fgets)...');
  // Note: Some functions can be in multiple categories (e.g., fgets can be user_input or file_io)
  // We check if they're detected as sources, not specific category
  const userInputTests = ['scanf', 'gets', 'fgets', 'getchar', 'getline'];
  userInputTests.forEach(funcName => {
    if (registry.isTaintSource(funcName)) {
      const source = registry.getTaintSource(funcName);
      if (source && (source.category === 'user_input' || source.category === 'file_io')) {
        console.log(`  ✓ ${funcName} detected as source (category: ${source.category})`);
        passed++;
      } else {
        console.log(`  ✗ ${funcName} category mismatch`);
        failed++;
        errors.push(`${funcName}: Expected category 'user_input' or 'file_io', got ${source?.category}`);
      }
    } else {
      console.log(`  ✗ ${funcName} not detected as source`);
      failed++;
      errors.push(`${funcName}: Not detected as taint source`);
    }
  });
  
  // Test read separately (can be user_input, file_io, or network)
  console.log('Test 1.1b: read function (multi-category)...');
  if (registry.isTaintSource('read')) {
    const source = registry.getTaintSource('read');
    if (source) {
      console.log(`  ✓ read detected as source (category: ${source.category})`);
      passed++;
    }
  } else {
    console.log(`  ✗ read not detected as source`);
    failed++;
    errors.push('read: Not detected as taint source');
  }
  
  // Test 2: File I/O sources
  console.log('\nTest 1.2: File I/O sources (fread, fscanf)...');
  const fileIOTests = ['fread', 'fscanf', 'pread', 'mmap'];
  fileIOTests.forEach(funcName => {
    if (registry.isTaintSource(funcName)) {
      const source = registry.getTaintSource(funcName);
      if (source && source.category === 'file_io') {
        console.log(`  ✓ ${funcName} detected as file_io source`);
        passed++;
      } else {
        console.log(`  ✗ ${funcName} category mismatch`);
        failed++;
        errors.push(`${funcName}: Expected category 'file_io', got ${source?.category}`);
      }
    } else {
      console.log(`  ✗ ${funcName} not detected as source`);
      failed++;
      errors.push(`${funcName}: Not detected as taint source`);
    }
  });
  
  // Test 3: Network sources
  console.log('\nTest 1.3: Network sources (recv, recvfrom, SSL_read)...');
  const networkTests = ['recv', 'recvfrom', 'SSL_read'];
  networkTests.forEach(funcName => {
    if (registry.isTaintSource(funcName)) {
      const source = registry.getTaintSource(funcName);
      if (source && source.category === 'network') {
        console.log(`  ✓ ${funcName} detected as network source`);
        passed++;
      } else {
        console.log(`  ✗ ${funcName} category mismatch`);
        failed++;
        errors.push(`${funcName}: Expected category 'network', got ${source?.category}`);
      }
    } else {
      console.log(`  ✗ ${funcName} not detected as source`);
      failed++;
      errors.push(`${funcName}: Not detected as taint source`);
    }
  });
  
  // Test 4: Environment sources
  console.log('\nTest 1.4: Environment sources (getenv)...');
  if (registry.isTaintSource('getenv')) {
    const source = registry.getTaintSource('getenv');
    if (source && source.category === 'environment') {
      console.log(`  ✓ getenv detected as environment source`);
      passed++;
    } else {
      console.log(`  ✗ getenv category mismatch`);
      failed++;
      errors.push(`getenv: Expected category 'environment', got ${source?.category}`);
    }
  } else {
    console.log(`  ✗ getenv not detected as source`);
    failed++;
    errors.push('getenv: Not detected as taint source');
  }
  
  // Test 5: Variable extraction from function calls
  console.log('\nTest 1.5: Variable extraction from function calls...');
  const testCases = [
    { call: 'scanf("%s", &buffer)', expected: 'buffer' },
    { call: 'gets(buffer)', expected: 'buffer' },
    { call: 'fgets(line, 100, stdin)', expected: 'line' },
    { call: 'read(fd, buf, size)', expected: 'buf' }
  ];
  
  testCases.forEach(({ call, expected }) => {
    const funcMatch = call.match(/(\w+)\s*\(/);
    if (funcMatch) {
      const funcName = funcMatch[1];
      const source = registry.getTaintSource(funcName);
      if (source) {
        const extracted = registry.extractTargetVariable(call, source);
        if (extracted === expected) {
          console.log(`  ✓ ${call} -> extracted "${extracted}"`);
          passed++;
        } else {
          console.log(`  ✗ ${call} -> expected "${expected}", got "${extracted}"`);
          failed++;
          errors.push(`${call}: Expected "${expected}", got "${extracted}"`);
        }
      }
    }
  });
  
  console.log(`\nPhase 1 Results: ${passed} passed, ${failed} failed`);
  return { passed, failed, errors };
}

/**
 * Test Phase 2: Taint Sink Detection
 */
function testPhase2_SinkDetection(): { passed: number; failed: number; errors: string[] } {
  console.log('\n=== Phase 2: Taint Sink Detection ===\n');
  
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];
  
  const registry = defaultTaintSinkRegistry;
  
  // Test 1: SQL injection sinks
  console.log('Test 2.1: SQL injection sinks...');
  // Note: sprintf can be in multiple categories (sql, format_string, buffer)
  // We check if it's detected as a sink and has sql in its categories
  const sqlTests = ['sqlite3_exec', 'mysql_query', 'PQexec'];
  sqlTests.forEach(funcName => {
    if (registry.isTaintSink(funcName)) {
      const sink = registry.getTaintSink(funcName);
      if (sink && sink.category === 'sql') {
        console.log(`  ✓ ${funcName} detected as SQL sink (severity: ${sink.severity})`);
        passed++;
      } else {
        console.log(`  ✗ ${funcName} category mismatch`);
        failed++;
        errors.push(`${funcName}: Expected category 'sql', got ${sink?.category}`);
      }
    } else {
      console.log(`  ✗ ${funcName} not detected as sink`);
      failed++;
      errors.push(`${funcName}: Not detected as taint sink`);
    }
  });
  
  // Test sprintf separately (multi-category)
  console.log('Test 2.1b: sprintf (multi-category sink)...');
  if (registry.isTaintSink('sprintf')) {
    const sink = registry.getTaintSink('sprintf');
    if (sink && (sink.category === 'sql' || sink.category === 'format_string' || sink.category === 'buffer')) {
      console.log(`  ✓ sprintf detected as sink (category: ${sink.category})`);
      passed++;
    } else {
      console.log(`  ✗ sprintf category unexpected`);
      failed++;
      errors.push(`sprintf: Unexpected category ${sink?.category}`);
    }
  } else {
    console.log(`  ✗ sprintf not detected as sink`);
    failed++;
    errors.push('sprintf: Not detected as taint sink');
  }
  
  // Test 2: Command injection sinks
  console.log('\nTest 2.2: Command injection sinks...');
  // Test system separately (can be command or code)
  console.log('Test 2.2a: system (multi-category sink)...');
  if (registry.isTaintSink('system')) {
    const sink = registry.getTaintSink('system');
    if (sink && (sink.category === 'command' || sink.category === 'code')) {
      console.log(`  ✓ system detected as sink (category: ${sink.category})`);
      passed++;
    } else {
      console.log(`  ✗ system category unexpected`);
      failed++;
      errors.push(`system: Unexpected category ${sink?.category}`);
    }
  } else {
    console.log(`  ✗ system not detected as sink`);
    failed++;
    errors.push('system: Not detected as taint sink');
  }
  
  const commandTests = ['popen', 'exec', 'execve'];
  commandTests.forEach(funcName => {
    if (registry.isTaintSink(funcName)) {
      const sink = registry.getTaintSink(funcName);
      if (sink && sink.category === 'command') {
        console.log(`  ✓ ${funcName} detected as command sink (severity: ${sink.severity})`);
        passed++;
      } else {
        console.log(`  ✗ ${funcName} category mismatch`);
        failed++;
        errors.push(`${funcName}: Expected category 'command', got ${sink?.category}`);
      }
    } else {
      console.log(`  ✗ ${funcName} not detected as sink`);
      failed++;
      errors.push(`${funcName}: Not detected as taint sink`);
    }
  });
  
  // Test 3: Format string sinks
  console.log('\nTest 2.3: Format string sinks...');
  // sprintf tested separately above
  const formatTests = ['printf', 'fprintf', 'snprintf'];
  formatTests.forEach(funcName => {
    if (registry.isTaintSink(funcName)) {
      const sink = registry.getTaintSink(funcName);
      if (sink && sink.category === 'format_string') {
        console.log(`  ✓ ${funcName} detected as format_string sink`);
        passed++;
      } else {
        console.log(`  ✗ ${funcName} category mismatch`);
        failed++;
        errors.push(`${funcName}: Expected category 'format_string', got ${sink?.category}`);
      }
    } else {
      console.log(`  ✗ ${funcName} not detected as sink`);
      failed++;
      errors.push(`${funcName}: Not detected as taint sink`);
    }
  });
  
  // Test 4: Buffer overflow sinks
  console.log('\nTest 2.4: Buffer overflow sinks...');
  const bufferTests = ['strcpy', 'strcat', 'gets'];
  bufferTests.forEach(funcName => {
    if (registry.isTaintSink(funcName)) {
      const sink = registry.getTaintSink(funcName);
      if (sink && sink.category === 'buffer') {
        console.log(`  ✓ ${funcName} detected as buffer sink`);
        passed++;
      } else {
        console.log(`  ✗ ${funcName} category mismatch`);
        failed++;
        errors.push(`${funcName}: Expected category 'buffer', got ${sink?.category}`);
      }
    } else {
      console.log(`  ✗ ${funcName} not detected as sink`);
      failed++;
      errors.push(`${funcName}: Not detected as taint sink`);
    }
  });
  
  // Test 5: Argument extraction
  console.log('\nTest 2.5: Argument extraction from function calls...');
  const testCases = [
    { call: 'system(user_input)', expectedArgs: ['user_input'] },
    { call: 'sprintf(buffer, format, arg)', expectedArgs: ['buffer', 'format', 'arg'] },
    { call: 'fprintf(file, format)', expectedArgs: ['file', 'format'] }
  ];
  
  testCases.forEach(({ call, expectedArgs }) => {
    const args = registry.extractArguments(call);
    if (args.length === expectedArgs.length) {
      const match = expectedArgs.every((expected, idx) => args[idx].includes(expected));
      if (match) {
        console.log(`  ✓ ${call} -> extracted ${args.length} arguments`);
        passed++;
      } else {
        console.log(`  ✗ ${call} -> argument mismatch`);
        failed++;
        errors.push(`${call}: Argument extraction failed`);
      }
    } else {
      console.log(`  ✗ ${call} -> expected ${expectedArgs.length} args, got ${args.length}`);
      failed++;
      errors.push(`${call}: Expected ${expectedArgs.length} arguments, got ${args.length}`);
    }
  });
  
  console.log(`\nPhase 2 Results: ${passed} passed, ${failed} failed`);
  return { passed, failed, errors };
}

/**
 * Test End-to-End: Source -> Propagation -> Sink
 */
function testEndToEnd_TaintFlow(): { passed: number; failed: number; errors: string[] } {
  console.log('\n=== End-to-End: Taint Flow Detection ===\n');
  
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];
  
  const analyzer = new TaintAnalyzer();
  
  // Test 1: scanf -> sprintf (SQL injection)
  console.log('Test E2E.1: scanf -> sprintf (SQL injection)...');
  const cfg1 = createMockFunctionCFG('test1', [
    { 
      text: 'scanf("%s", &user_input)', 
      type: StatementType.FUNCTION_CALL,
      variables: { defined: [], used: ['user_input'] }
    },
    {
      text: 'sprintf(sql_query, "SELECT * FROM users WHERE name = %s", user_input)',
      type: StatementType.FUNCTION_CALL,
      variables: { defined: ['sql_query'], used: ['user_input'] }
    }
  ]);
  
  const result1 = analyzer.analyze(cfg1, new Map());
  
  // Check if user_input is tainted
  const userInputTaint = result1.taintMap.get('user_input');
  if (userInputTaint && userInputTaint.length > 0 && userInputTaint[0].tainted) {
    console.log('  ✓ user_input marked as tainted');
    passed++;
  } else {
    console.log('  ✗ user_input not marked as tainted');
    failed++;
    errors.push('user_input should be tainted from scanf');
  }
  
  // Check if vulnerability detected
  if (result1.vulnerabilities.length > 0) {
    // sprintf can be categorized as sql, format_string, or buffer - accept any vulnerability
    const sqlVuln = result1.vulnerabilities.find(v => 
      v.type === 'sql_injection' || 
      v.type === 'format_string' || 
      v.type === 'buffer_overflow'
    );
    if (sqlVuln) {
      console.log(`  ✓ Vulnerability detected (type: ${sqlVuln.type})`);
      passed++;
    } else {
      console.log(`  ✗ Wrong vulnerability type detected: ${result1.vulnerabilities.map(v => v.type).join(', ')}`);
      failed++;
      errors.push(`Expected sql_injection/format_string/buffer_overflow, got ${result1.vulnerabilities.map(v => v.type).join(', ')}`);
    }
  } else {
    console.log('  ✗ No vulnerabilities detected');
    failed++;
    errors.push('Should detect vulnerability from tainted data reaching sprintf');
  }
  
  // Test 2: gets -> system (Command injection)
  console.log('\nTest E2E.2: gets -> system (Command injection)...');
  const cfg2 = createMockFunctionCFG('test2', [
    {
      text: 'gets(command)',
      type: StatementType.FUNCTION_CALL,
      variables: { defined: ['command'], used: [] }
    },
    {
      text: 'system(command)',
      type: StatementType.FUNCTION_CALL,
      variables: { defined: [], used: ['command'] }
    }
  ]);
  
  const result2 = analyzer.analyze(cfg2, new Map());
  
  if (result2.vulnerabilities.length > 0) {
    // system can be categorized as command or code - accept any vulnerability
    const cmdVuln = result2.vulnerabilities.find(v => 
      v.type === 'command_injection' || 
      v.type === 'code_injection'
    );
    if (cmdVuln) {
      console.log(`  ✓ Vulnerability detected (type: ${cmdVuln.type})`);
      passed++;
    } else {
      console.log(`  ✗ Wrong vulnerability type detected: ${result2.vulnerabilities.map(v => v.type).join(', ')}`);
      failed++;
      errors.push(`Expected command_injection/code_injection, got ${result2.vulnerabilities.map(v => v.type).join(', ')}`);
    }
  } else {
    console.log('  ✗ No vulnerabilities detected');
    failed++;
    errors.push('Should detect command injection vulnerability');
  }
  
  // Test 3: Taint propagation through assignment
  console.log('\nTest E2E.3: Taint propagation through assignment...');
  const cfg3 = createMockFunctionCFG('test3', [
    {
      text: 'scanf("%s", &input)',
      type: StatementType.FUNCTION_CALL,
      variables: { defined: [], used: ['input'] }
    },
    {
      text: 'processed = input',
      type: StatementType.ASSIGNMENT,
      variables: { defined: ['processed'], used: ['input'] }
    },
    {
      text: 'sprintf(buffer, processed)',
      type: StatementType.FUNCTION_CALL,
      variables: { defined: ['buffer'], used: ['processed'] }
    }
  ]);
  
  const result3 = analyzer.analyze(cfg3, new Map());
  
  // Check if taint propagated to processed
  const processedTaint = result3.taintMap.get('processed');
  if (processedTaint && processedTaint.length > 0 && processedTaint[0].tainted) {
    console.log('  ✓ Taint propagated to processed variable');
    passed++;
  } else {
    console.log('  ✗ Taint not propagated to processed variable');
    failed++;
    errors.push('Taint should propagate through assignment');
  }
  
  console.log(`\nEnd-to-End Results: ${passed} passed, ${failed} failed`);
  return { passed, failed, errors };
}

/**
 * Run all verification tests
 */
function runVerificationTests(): void {
  console.log('========================================');
  console.log('Taint Analysis Verification Tests');
  console.log('Phases 1 & 2');
  console.log('========================================\n');
  
  const phase1Results = testPhase1_SourceDetection();
  const phase2Results = testPhase2_SinkDetection();
  const e2eResults = testEndToEnd_TaintFlow();
  
  const totalPassed = phase1Results.passed + phase2Results.passed + e2eResults.passed;
  const totalFailed = phase1Results.failed + phase2Results.failed + e2eResults.failed;
  const allErrors = [...phase1Results.errors, ...phase2Results.errors, ...e2eResults.errors];
  
  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log(`Total Tests: ${totalPassed + totalFailed}`);
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`Success Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`);
  
  if (allErrors.length > 0) {
    console.log('\nErrors:');
    allErrors.forEach((error, idx) => {
      console.log(`  ${idx + 1}. ${error}`);
    });
  }
  
  console.log('\n========================================\n');
  
  if (totalFailed === 0) {
    console.log('✅ All tests passed! Phases 1 & 2 are working correctly.');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Please review the errors above.');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runVerificationTests();
}

export { runVerificationTests, testPhase1_SourceDetection, testPhase2_SinkDetection, testEndToEnd_TaintFlow };

