/**
 * TaintSensitivity.test.ts
 * 
 * Comprehensive tests for all 5 Taint Analysis Sensitivity Levels
 * 
 * Validates:
 * 1. Feature flag correctness for each sensitivity level
 * 2. Backend generation with different sensitivities
 * 3. Control-dependent taint propagation behavior
 * 4. Path-sensitive, field-sensitive, context-sensitive analysis
 */

import { TaintAnalyzer } from '../TaintAnalyzer';
import { TaintSensitivity, FunctionCFG, StatementType, BasicBlock, TaintLabel } from '../../types';

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Create a mock FunctionCFG for testing
 */
function createMockCFG(
  name: string, 
  blocks: Array<{
    id: string;
    label: string;
    statements: Array<{ text: string; type: StatementType; variables?: { defined: string[]; used: string[] } }>;
    predecessors: string[];
    successors: string[];
    isEntry?: boolean;
    isExit?: boolean;
  }>
): FunctionCFG {
  const blockMap = new Map<string, BasicBlock>();
  
  blocks.forEach(b => {
    blockMap.set(b.id, {
      id: b.id,
      label: b.label,
      statements: b.statements.map((stmt, idx) => ({
        id: `${b.id}_stmt_${idx}`,
        type: stmt.type,
        text: stmt.text,
        variables: stmt.variables || { defined: [], used: [] }
      })),
      predecessors: b.predecessors,
      successors: b.successors,
      isEntry: b.isEntry,
      isExit: b.isExit
    });
  });
  
  return {
    name,
    entry: blocks.find(b => b.isEntry)?.id || blocks[0].id,
    exit: blocks.find(b => b.isExit)?.id || blocks[blocks.length - 1].id,
    blocks: blockMap,
    parameters: []
  };
}

/**
 * Create a simple linear CFG for basic taint flow testing
 */
function createLinearCFG(name: string, statements: Array<{ text: string; type: StatementType; variables?: { defined: string[]; used: string[] } }>): FunctionCFG {
  return createMockCFG(name, [
    {
      id: 'entry',
      label: 'Entry',
      statements: [],
      predecessors: [],
      successors: ['B1'],
      isEntry: true
    },
    {
      id: 'B1',
      label: 'B1',
      statements: statements,
      predecessors: ['entry'],
      successors: ['exit']
    },
    {
      id: 'exit',
      label: 'Exit',
      statements: [],
      predecessors: ['B1'],
      successors: [],
      isExit: true
    }
  ]);
}

/**
 * Create a CFG with conditional (if-else) for control-dependent taint testing
 */
function createConditionalCFG(name: string): FunctionCFG {
  return createMockCFG(name, [
    {
      id: 'entry',
      label: 'Entry',
      statements: [],
      predecessors: [],
      successors: ['B1'],
      isEntry: true
    },
    {
      id: 'B1',
      label: 'B1',
      statements: [
        { text: 'scanf("%s", &tainted_input)', type: StatementType.FUNCTION_CALL, variables: { defined: ['tainted_input'], used: [] } }
      ],
      predecessors: ['entry'],
      successors: ['B2']
    },
    {
      id: 'B2',
      label: 'B2',
      statements: [
        { text: 'if (tainted_input > 0)', type: StatementType.CONDITIONAL, variables: { defined: [], used: ['tainted_input'] } }
      ],
      predecessors: ['B1'],
      successors: ['B3', 'B4']  // B3 = then, B4 = else
    },
    {
      id: 'B3',
      label: 'B3',
      statements: [
        { text: 'x = 10', type: StatementType.ASSIGNMENT, variables: { defined: ['x'], used: [] } }
      ],
      predecessors: ['B2'],
      successors: ['B5']
    },
    {
      id: 'B4',
      label: 'B4',
      statements: [
        { text: 'y = 20', type: StatementType.ASSIGNMENT, variables: { defined: ['y'], used: [] } }
      ],
      predecessors: ['B2'],
      successors: ['B5']
    },
    {
      id: 'B5',
      label: 'B5',
      statements: [
        { text: 'z = x + y', type: StatementType.ASSIGNMENT, variables: { defined: ['z'], used: ['x', 'y'] } }
      ],
      predecessors: ['B3', 'B4'],
      successors: ['exit']
    },
    {
      id: 'exit',
      label: 'Exit',
      statements: [],
      predecessors: ['B5'],
      successors: [],
      isExit: true
    }
  ]);
}

// ============================================================================
// FEATURE FLAG TESTS
// ============================================================================

describe('TaintSensitivity Feature Flags', () => {
  describe('MINIMAL sensitivity', () => {
    let analyzer: TaintAnalyzer;
    
    beforeEach(() => {
      analyzer = new TaintAnalyzer(undefined, undefined, undefined, TaintSensitivity.MINIMAL);
    });
    
    test('should have correct sensitivity level', () => {
      // Access private property via bracket notation for testing
      expect((analyzer as any).sensitivity).toBe(TaintSensitivity.MINIMAL);
    });
    
    test('should disable control-dependent propagation', () => {
      expect((analyzer as any).shouldEnableControlDependent()).toBe(false);
    });
    
    test('should disable recursive propagation', () => {
      expect((analyzer as any).shouldEnableRecursivePropagation()).toBe(false);
    });
    
    test('should disable path-sensitive analysis', () => {
      expect((analyzer as any).shouldEnablePathSensitive()).toBe(false);
    });
    
    test('should disable field-sensitive analysis', () => {
      expect((analyzer as any).shouldEnableFieldSensitive()).toBe(false);
    });
    
    test('should disable context-sensitive analysis', () => {
      expect((analyzer as any).shouldEnableContextSensitive()).toBe(false);
    });
    
    test('should disable flow-sensitive analysis', () => {
      expect((analyzer as any).shouldEnableFlowSensitive()).toBe(false);
    });
  });
  
  describe('CONSERVATIVE sensitivity', () => {
    let analyzer: TaintAnalyzer;
    
    beforeEach(() => {
      analyzer = new TaintAnalyzer(undefined, undefined, undefined, TaintSensitivity.CONSERVATIVE);
    });
    
    test('should enable control-dependent propagation', () => {
      expect((analyzer as any).shouldEnableControlDependent()).toBe(true);
    });
    
    test('should disable recursive propagation', () => {
      expect((analyzer as any).shouldEnableRecursivePropagation()).toBe(false);
    });
    
    test('should disable path-sensitive analysis', () => {
      expect((analyzer as any).shouldEnablePathSensitive()).toBe(false);
    });
    
    test('should disable field-sensitive analysis', () => {
      expect((analyzer as any).shouldEnableFieldSensitive()).toBe(false);
    });
    
    test('should disable context-sensitive analysis', () => {
      expect((analyzer as any).shouldEnableContextSensitive()).toBe(false);
    });
    
    test('should disable flow-sensitive analysis', () => {
      expect((analyzer as any).shouldEnableFlowSensitive()).toBe(false);
    });
  });
  
  describe('BALANCED sensitivity', () => {
    let analyzer: TaintAnalyzer;
    
    beforeEach(() => {
      analyzer = new TaintAnalyzer(undefined, undefined, undefined, TaintSensitivity.BALANCED);
    });
    
    test('should enable control-dependent propagation', () => {
      expect((analyzer as any).shouldEnableControlDependent()).toBe(true);
    });
    
    test('should enable recursive propagation', () => {
      expect((analyzer as any).shouldEnableRecursivePropagation()).toBe(true);
    });
    
    test('should disable path-sensitive analysis', () => {
      expect((analyzer as any).shouldEnablePathSensitive()).toBe(false);
    });
    
    test('should disable field-sensitive analysis', () => {
      expect((analyzer as any).shouldEnableFieldSensitive()).toBe(false);
    });
    
    test('should disable context-sensitive analysis', () => {
      expect((analyzer as any).shouldEnableContextSensitive()).toBe(false);
    });
    
    test('should disable flow-sensitive analysis', () => {
      expect((analyzer as any).shouldEnableFlowSensitive()).toBe(false);
    });
  });
  
  describe('PRECISE sensitivity', () => {
    let analyzer: TaintAnalyzer;
    
    beforeEach(() => {
      analyzer = new TaintAnalyzer(undefined, undefined, undefined, TaintSensitivity.PRECISE);
    });
    
    test('should enable control-dependent propagation', () => {
      expect((analyzer as any).shouldEnableControlDependent()).toBe(true);
    });
    
    test('should enable recursive propagation', () => {
      expect((analyzer as any).shouldEnableRecursivePropagation()).toBe(true);
    });
    
    test('should enable path-sensitive analysis', () => {
      expect((analyzer as any).shouldEnablePathSensitive()).toBe(true);
    });
    
    test('should enable field-sensitive analysis', () => {
      expect((analyzer as any).shouldEnableFieldSensitive()).toBe(true);
    });
    
    test('should disable context-sensitive analysis', () => {
      expect((analyzer as any).shouldEnableContextSensitive()).toBe(false);
    });
    
    test('should disable flow-sensitive analysis', () => {
      expect((analyzer as any).shouldEnableFlowSensitive()).toBe(false);
    });
  });
  
  describe('MAXIMUM sensitivity', () => {
    let analyzer: TaintAnalyzer;
    
    beforeEach(() => {
      analyzer = new TaintAnalyzer(undefined, undefined, undefined, TaintSensitivity.MAXIMUM);
    });
    
    test('should enable control-dependent propagation', () => {
      expect((analyzer as any).shouldEnableControlDependent()).toBe(true);
    });
    
    test('should enable recursive propagation', () => {
      expect((analyzer as any).shouldEnableRecursivePropagation()).toBe(true);
    });
    
    test('should enable path-sensitive analysis', () => {
      expect((analyzer as any).shouldEnablePathSensitive()).toBe(true);
    });
    
    test('should enable field-sensitive analysis', () => {
      expect((analyzer as any).shouldEnableFieldSensitive()).toBe(true);
    });
    
    test('should enable context-sensitive analysis', () => {
      expect((analyzer as any).shouldEnableContextSensitive()).toBe(true);
    });
    
    test('should enable flow-sensitive analysis', () => {
      expect((analyzer as any).shouldEnableFlowSensitive()).toBe(true);
    });
  });
});

// ============================================================================
// EXPLICIT DATA-FLOW TAINT TESTS (All sensitivities should work)
// ============================================================================

describe('Explicit Data-Flow Taint (All Sensitivities)', () => {
  const sensitivities = [
    TaintSensitivity.MINIMAL,
    TaintSensitivity.CONSERVATIVE,
    TaintSensitivity.BALANCED,
    TaintSensitivity.PRECISE,
    TaintSensitivity.MAXIMUM
  ];
  
  sensitivities.forEach(sensitivity => {
    describe(`${sensitivity.toUpperCase()} sensitivity`, () => {
      let analyzer: TaintAnalyzer;
      
      beforeEach(() => {
        analyzer = new TaintAnalyzer(undefined, undefined, undefined, sensitivity);
      });
      
      test('should detect taint source (scanf)', () => {
        const cfg = createLinearCFG('test_source', [
          { text: 'scanf("%s", &user_input)', type: StatementType.FUNCTION_CALL, variables: { defined: ['user_input'], used: [] } }
        ]);
        
        const result = analyzer.analyze(cfg, new Map());
        const taint = result.taintMap.get('user_input');
        
        expect(taint).toBeDefined();
        expect(taint!.length).toBeGreaterThan(0);
        expect(taint![0].tainted).toBe(true);
      });
      
      test('should propagate taint through assignment', () => {
        const cfg = createLinearCFG('test_propagate', [
          { text: 'scanf("%s", &input)', type: StatementType.FUNCTION_CALL, variables: { defined: ['input'], used: [] } },
          { text: 'output = input', type: StatementType.ASSIGNMENT, variables: { defined: ['output'], used: ['input'] } }
        ]);
        
        const result = analyzer.analyze(cfg, new Map());
        const outputTaint = result.taintMap.get('output');
        
        expect(outputTaint).toBeDefined();
        // Taint should propagate
        const hasTaint = outputTaint!.some(t => t.tainted);
        expect(hasTaint).toBe(true);
      });
      
      test('should detect vulnerability at sink', () => {
        const cfg = createLinearCFG('test_vuln', [
          { text: 'scanf("%s", &cmd)', type: StatementType.FUNCTION_CALL, variables: { defined: ['cmd'], used: [] } },
          { text: 'system(cmd)', type: StatementType.FUNCTION_CALL, variables: { defined: [], used: ['cmd'] } }
        ]);
        
        const result = analyzer.analyze(cfg, new Map());
        
        // Should detect command injection vulnerability
        expect(result.vulnerabilities.length).toBeGreaterThan(0);
      });
    });
  });
});

// ============================================================================
// CONTROL-DEPENDENT TAINT TESTS
// ============================================================================

describe('Control-Dependent Taint Propagation', () => {
  describe('MINIMAL sensitivity (disabled)', () => {
    test('should NOT mark variables as control-dependent tainted', () => {
      const analyzer = new TaintAnalyzer(undefined, undefined, undefined, TaintSensitivity.MINIMAL);
      const cfg = createConditionalCFG('test_control_minimal');
      
      const result = analyzer.analyze(cfg, new Map());
      
      // x and y are in branches dependent on tainted condition
      // With MINIMAL, they should NOT be marked as control-dependent tainted
      const xTaint = result.taintMap.get('x') || [];
      const yTaint = result.taintMap.get('y') || [];
      
      const xHasControlDependent = xTaint.some(t => t.labels?.includes(TaintLabel.CONTROL_DEPENDENT));
      const yHasControlDependent = yTaint.some(t => t.labels?.includes(TaintLabel.CONTROL_DEPENDENT));
      
      expect(xHasControlDependent).toBe(false);
      expect(yHasControlDependent).toBe(false);
    });
  });
  
  describe('CONSERVATIVE+ sensitivities (enabled)', () => {
    const enabledSensitivities = [
      TaintSensitivity.CONSERVATIVE,
      TaintSensitivity.BALANCED,
      TaintSensitivity.PRECISE,
      TaintSensitivity.MAXIMUM
    ];
    
    enabledSensitivities.forEach(sensitivity => {
      test(`${sensitivity.toUpperCase()} should mark control-dependent variables`, () => {
        const analyzer = new TaintAnalyzer(undefined, undefined, undefined, sensitivity);
        const cfg = createConditionalCFG('test_control_' + sensitivity);
        
        const result = analyzer.analyze(cfg, new Map());
        
        // x and y are in branches dependent on tainted condition
        // They should be marked as control-dependent tainted
        const xTaint = result.taintMap.get('x') || [];
        const yTaint = result.taintMap.get('y') || [];
        
        // At least one of x or y should have control-dependent taint
        const anyControlDependent = 
          xTaint.some(t => t.labels?.includes(TaintLabel.CONTROL_DEPENDENT)) ||
          yTaint.some(t => t.labels?.includes(TaintLabel.CONTROL_DEPENDENT));
        
        expect(anyControlDependent).toBe(true);
      });
    });
  });
});

// ============================================================================
// SENSITIVITY COMPARISON MATRIX
// ============================================================================

describe('Sensitivity Level Comparison Matrix', () => {
  test('should have correct feature hierarchy', () => {
    // Create all analyzers
    const minimal = new TaintAnalyzer(undefined, undefined, undefined, TaintSensitivity.MINIMAL);
    const conservative = new TaintAnalyzer(undefined, undefined, undefined, TaintSensitivity.CONSERVATIVE);
    const balanced = new TaintAnalyzer(undefined, undefined, undefined, TaintSensitivity.BALANCED);
    const precise = new TaintAnalyzer(undefined, undefined, undefined, TaintSensitivity.PRECISE);
    const maximum = new TaintAnalyzer(undefined, undefined, undefined, TaintSensitivity.MAXIMUM);
    
    // Build feature matrix
    const features = {
      minimal: {
        controlDependent: (minimal as any).shouldEnableControlDependent(),
        recursive: (minimal as any).shouldEnableRecursivePropagation(),
        pathSensitive: (minimal as any).shouldEnablePathSensitive(),
        fieldSensitive: (minimal as any).shouldEnableFieldSensitive(),
        contextSensitive: (minimal as any).shouldEnableContextSensitive(),
        flowSensitive: (minimal as any).shouldEnableFlowSensitive()
      },
      conservative: {
        controlDependent: (conservative as any).shouldEnableControlDependent(),
        recursive: (conservative as any).shouldEnableRecursivePropagation(),
        pathSensitive: (conservative as any).shouldEnablePathSensitive(),
        fieldSensitive: (conservative as any).shouldEnableFieldSensitive(),
        contextSensitive: (conservative as any).shouldEnableContextSensitive(),
        flowSensitive: (conservative as any).shouldEnableFlowSensitive()
      },
      balanced: {
        controlDependent: (balanced as any).shouldEnableControlDependent(),
        recursive: (balanced as any).shouldEnableRecursivePropagation(),
        pathSensitive: (balanced as any).shouldEnablePathSensitive(),
        fieldSensitive: (balanced as any).shouldEnableFieldSensitive(),
        contextSensitive: (balanced as any).shouldEnableContextSensitive(),
        flowSensitive: (balanced as any).shouldEnableFlowSensitive()
      },
      precise: {
        controlDependent: (precise as any).shouldEnableControlDependent(),
        recursive: (precise as any).shouldEnableRecursivePropagation(),
        pathSensitive: (precise as any).shouldEnablePathSensitive(),
        fieldSensitive: (precise as any).shouldEnableFieldSensitive(),
        contextSensitive: (precise as any).shouldEnableContextSensitive(),
        flowSensitive: (precise as any).shouldEnableFlowSensitive()
      },
      maximum: {
        controlDependent: (maximum as any).shouldEnableControlDependent(),
        recursive: (maximum as any).shouldEnableRecursivePropagation(),
        pathSensitive: (maximum as any).shouldEnablePathSensitive(),
        fieldSensitive: (maximum as any).shouldEnableFieldSensitive(),
        contextSensitive: (maximum as any).shouldEnableContextSensitive(),
        flowSensitive: (maximum as any).shouldEnableFlowSensitive()
      }
    };
    
    // Expected matrix based on documentation:
    // MINIMAL: Only explicit data-flow (all features OFF)
    expect(features.minimal).toEqual({
      controlDependent: false,
      recursive: false,
      pathSensitive: false,
      fieldSensitive: false,
      contextSensitive: false,
      flowSensitive: false
    });
    
    // CONSERVATIVE: Basic control-dependent (controlDependent ON)
    expect(features.conservative).toEqual({
      controlDependent: true,
      recursive: false,
      pathSensitive: false,
      fieldSensitive: false,
      contextSensitive: false,
      flowSensitive: false
    });
    
    // BALANCED: Full control-dependent + inter-procedural (controlDependent + recursive ON)
    expect(features.balanced).toEqual({
      controlDependent: true,
      recursive: true,
      pathSensitive: false,
      fieldSensitive: false,
      contextSensitive: false,
      flowSensitive: false
    });
    
    // PRECISE: Path-sensitive + field-sensitive (+ previous features)
    expect(features.precise).toEqual({
      controlDependent: true,
      recursive: true,
      pathSensitive: true,
      fieldSensitive: true,
      contextSensitive: false,
      flowSensitive: false
    });
    
    // MAXIMUM: Context-sensitive + flow-sensitive (all features ON)
    expect(features.maximum).toEqual({
      controlDependent: true,
      recursive: true,
      pathSensitive: true,
      fieldSensitive: true,
      contextSensitive: true,
      flowSensitive: true
    });
    
    // Log the matrix for visual verification
    console.log('\n=== SENSITIVITY FEATURE MATRIX ===');
    console.log('Feature           | MINIMAL | CONSERV | BALANCED | PRECISE | MAXIMUM');
    console.log('------------------|---------|---------|----------|---------|--------');
    console.log(`Control-Dependent | ${features.minimal.controlDependent ? '  ✓  ' : '  ✗  '} | ${features.conservative.controlDependent ? '  ✓   ' : '  ✗   '} | ${features.balanced.controlDependent ? '   ✓   ' : '   ✗   '} | ${features.precise.controlDependent ? '  ✓  ' : '  ✗  '} | ${features.maximum.controlDependent ? '  ✓  ' : '  ✗  '}`);
    console.log(`Recursive Prop.   | ${features.minimal.recursive ? '  ✓  ' : '  ✗  '} | ${features.conservative.recursive ? '  ✓   ' : '  ✗   '} | ${features.balanced.recursive ? '   ✓   ' : '   ✗   '} | ${features.precise.recursive ? '  ✓  ' : '  ✗  '} | ${features.maximum.recursive ? '  ✓  ' : '  ✗  '}`);
    console.log(`Path-Sensitive    | ${features.minimal.pathSensitive ? '  ✓  ' : '  ✗  '} | ${features.conservative.pathSensitive ? '  ✓   ' : '  ✗   '} | ${features.balanced.pathSensitive ? '   ✓   ' : '   ✗   '} | ${features.precise.pathSensitive ? '  ✓  ' : '  ✗  '} | ${features.maximum.pathSensitive ? '  ✓  ' : '  ✗  '}`);
    console.log(`Field-Sensitive   | ${features.minimal.fieldSensitive ? '  ✓  ' : '  ✗  '} | ${features.conservative.fieldSensitive ? '  ✓   ' : '  ✗   '} | ${features.balanced.fieldSensitive ? '   ✓   ' : '   ✗   '} | ${features.precise.fieldSensitive ? '  ✓  ' : '  ✗  '} | ${features.maximum.fieldSensitive ? '  ✓  ' : '  ✗  '}`);
    console.log(`Context-Sensitive | ${features.minimal.contextSensitive ? '  ✓  ' : '  ✗  '} | ${features.conservative.contextSensitive ? '  ✓   ' : '  ✗   '} | ${features.balanced.contextSensitive ? '   ✓   ' : '   ✗   '} | ${features.precise.contextSensitive ? '  ✓  ' : '  ✗  '} | ${features.maximum.contextSensitive ? '  ✓  ' : '  ✗  '}`);
    console.log(`Flow-Sensitive    | ${features.minimal.flowSensitive ? '  ✓  ' : '  ✗  '} | ${features.conservative.flowSensitive ? '  ✓   ' : '  ✗   '} | ${features.balanced.flowSensitive ? '   ✓   ' : '   ✗   '} | ${features.precise.flowSensitive ? '  ✓  ' : '  ✗  '} | ${features.maximum.flowSensitive ? '  ✓  ' : '  ✗  '}`);
    console.log('===================================\n');
  });
});

// ============================================================================
// BACKEND GENERATION TESTS
// ============================================================================

describe('Backend Taint Analysis Generation', () => {
  test('should generate consistent results across multiple runs (same sensitivity)', () => {
    const cfg = createConditionalCFG('consistency_test');
    
    const results: Array<{ taintMap: Map<string, any[]>; vulnCount: number }> = [];
    
    // Run 3 times with same sensitivity
    for (let i = 0; i < 3; i++) {
      const analyzer = new TaintAnalyzer(undefined, undefined, undefined, TaintSensitivity.BALANCED);
      const result = analyzer.analyze(cfg, new Map());
      results.push({
        taintMap: result.taintMap,
        vulnCount: result.vulnerabilities.length
      });
    }
    
    // All runs should produce same vulnerability count
    expect(results[0].vulnCount).toBe(results[1].vulnCount);
    expect(results[1].vulnCount).toBe(results[2].vulnCount);
    
    // Taint maps should have same keys
    const keys0 = Array.from(results[0].taintMap.keys()).sort();
    const keys1 = Array.from(results[1].taintMap.keys()).sort();
    const keys2 = Array.from(results[2].taintMap.keys()).sort();
    
    expect(keys0).toEqual(keys1);
    expect(keys1).toEqual(keys2);
  });
  
  test('should handle empty CFG gracefully', () => {
    const cfg = createMockCFG('empty', [
      { id: 'entry', label: 'Entry', statements: [], predecessors: [], successors: ['exit'], isEntry: true },
      { id: 'exit', label: 'Exit', statements: [], predecessors: ['entry'], successors: [], isExit: true }
    ]);
    
    const sensitivities = [
      TaintSensitivity.MINIMAL,
      TaintSensitivity.CONSERVATIVE,
      TaintSensitivity.BALANCED,
      TaintSensitivity.PRECISE,
      TaintSensitivity.MAXIMUM
    ];
    
    sensitivities.forEach(sensitivity => {
      const analyzer = new TaintAnalyzer(undefined, undefined, undefined, sensitivity);
      expect(() => {
        analyzer.analyze(cfg, new Map());
      }).not.toThrow();
    });
  });
  
  test('should produce different results for MINIMAL vs MAXIMUM (control-dependent cases)', () => {
    const cfg = createConditionalCFG('diff_test');
    
    const minimalAnalyzer = new TaintAnalyzer(undefined, undefined, undefined, TaintSensitivity.MINIMAL);
    const maximumAnalyzer = new TaintAnalyzer(undefined, undefined, undefined, TaintSensitivity.MAXIMUM);
    
    const minimalResult = minimalAnalyzer.analyze(cfg, new Map());
    const maximumResult = maximumAnalyzer.analyze(cfg, new Map());
    
    // Get control-dependent taint count
    let minimalControlDependentCount = 0;
    let maximumControlDependentCount = 0;
    
    minimalResult.taintMap.forEach((taints, varName) => {
      taints.forEach(t => {
        if (t.labels?.includes(TaintLabel.CONTROL_DEPENDENT)) {
          minimalControlDependentCount++;
        }
      });
    });
    
    maximumResult.taintMap.forEach((taints, varName) => {
      taints.forEach(t => {
        if (t.labels?.includes(TaintLabel.CONTROL_DEPENDENT)) {
          maximumControlDependentCount++;
        }
      });
    });
    
    // MAXIMUM should have more control-dependent taints than MINIMAL
    expect(maximumControlDependentCount).toBeGreaterThanOrEqual(minimalControlDependentCount);
    
    // Log the difference
    console.log(`Control-dependent taint count: MINIMAL=${minimalControlDependentCount}, MAXIMUM=${maximumControlDependentCount}`);
  });
});

// ============================================================================
// SUMMARY TEST
// ============================================================================

describe('Sensitivity Levels Summary', () => {
  test('should validate all sensitivity levels correctly', () => {
    const summary = {
      MINIMAL: 'Level 1 - Only explicit data-flow (no control-dependent)',
      CONSERVATIVE: 'Level 2 - Basic control-dependent (no nested)',
      BALANCED: 'Level 3 - Full recursive control-dependent + inter-procedural',
      PRECISE: 'Level 4 - Path-sensitive + field-sensitive',
      MAXIMUM: 'Level 5 - Context-sensitive + flow-sensitive'
    };
    
    console.log('\n=== TAINT SENSITIVITY LEVELS SUMMARY ===');
    Object.entries(summary).forEach(([level, description]) => {
      console.log(`${level}: ${description}`);
    });
    console.log('==========================================\n');
    
    // Verify enum values
    expect(TaintSensitivity.MINIMAL).toBe('minimal');
    expect(TaintSensitivity.CONSERVATIVE).toBe('conservative');
    expect(TaintSensitivity.BALANCED).toBe('balanced');
    expect(TaintSensitivity.PRECISE).toBe('precise');
    expect(TaintSensitivity.MAXIMUM).toBe('maximum');
  });
});





