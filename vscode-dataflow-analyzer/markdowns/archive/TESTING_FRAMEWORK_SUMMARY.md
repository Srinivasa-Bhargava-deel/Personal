# Testing Framework Summary

## Created Files

### 1. `src/analyzer/__tests__/VisualizationDataSensitivity.test.ts`

**Purpose**: Comprehensive test suite for validating backend visualization data across all 5 taint sensitivity levels.

**Key Features**:
- Tests each sensitivity level (MINIMAL, CONSERVATIVE, BALANCED, PRECISE, MAXIMUM)
- Validates data structures, feature flags, and counts
- Cross-sensitivity comparison tests
- Detailed metrics logging

**Test Structure**:
- Per-sensitivity tests (9 tests per level)
- Cross-sensitivity comparison tests (4 tests)
- Total: ~49 tests

**What It Tests**:
1. Sensitivity level correctness in state and visualization data
2. Data structure existence and validity
3. Feature flag validation (control-dependent, nested, inter-procedural)
4. Count validation against expected ranges
5. Data consistency across visualization types
6. Node and edge metadata correctness
7. Cross-sensitivity progression validation

### 2. `VISUALIZATION_DATA_SENSITIVITY_TESTING_FRAMEWORK.md`

**Purpose**: Comprehensive documentation for the testing framework.

**Contents**:
- Overview and purpose
- Test file description
- Sensitivity level details
- Running instructions
- Test structure explanation
- Expected metrics for each sensitivity level
- Validation checklist
- Troubleshooting guide
- CI/CD integration examples

## Test Configuration

### Expected Ranges by Sensitivity Level

The framework validates counts against these expected ranges:

#### MINIMAL
- Control-dependent taint blocks: **0** (strict requirement)
- Data-flow edges: 8-15
- Mixed taint blocks: 0

#### CONSERVATIVE
- Control-dependent taint blocks: 10-18
- Data-flow edges: 15-25
- Mixed taint blocks: 1-3

#### BALANCED
- Control-dependent taint blocks: 12-20 (includes nested)
- Data-flow edges: 20-35 (includes inter-procedural)
- Mixed taint blocks: 1-3

#### PRECISE
- Control-dependent taint blocks: 10-18 (may be fewer due to path-sensitivity)
- Data-flow edges: 18-32
- Mixed taint blocks: 1-3

#### MAXIMUM
- Control-dependent taint blocks: 10-18
- Data-flow edges: 18-35 (may include more due to context/flow sensitivity)
- Mixed taint blocks: 1-3

## Key Validation Points

### Feature Flag Validation

The framework validates that:
- **MINIMAL**: NO control-dependent taint (strict check)
- **CONSERVATIVE**: Basic control-dependent taint, NO nested
- **BALANCED+**: Full control-dependent including nested
- **BALANCED+**: Inter-procedural taint (more data-flow edges)

### Count Validation

Validates that counts fall within expected ranges for:
- Total functions
- CFG nodes and edges
- Taint blocks (data-flow, control-dependent, mixed)
- Edge types (control flow, function calls, data flow)
- Tainted variables

### Cross-Sensitivity Validation

Ensures:
- Control-dependent taint increases from MINIMAL to others
- Data-flow edges increase from MINIMAL to BALANCED+
- Function counts are consistent across all sensitivities
- CFG structure is consistent (only taint analysis differs)

## Running the Tests

### Prerequisites

1. Ensure `test_control_dependent_taint.cpp` exists in project root
2. Build `cfg-exporter` binary
3. Install dependencies: `npm install`

### Run All Tests

```bash
npm test -- VisualizationDataSensitivity.test.ts
```

### Run Specific Sensitivity Level

```bash
npm test -- VisualizationDataSensitivity.test.ts -t "MINIMAL Sensitivity Level"
```

### Run with Coverage

```bash
npm test -- VisualizationDataSensitivity.test.ts --coverage
```

## Integration

### CI/CD Integration

Add to your CI/CD pipeline:

```yaml
- name: Run Visualization Data Sensitivity Tests
  run: npm test -- VisualizationDataSensitivity.test.ts --coverage
```

### Manual Validation

The tests log detailed metrics for each sensitivity level:

```
========== MINIMAL SENSITIVITY METRICS ==========
Sensitivity Level: minimal
Total Functions: 3
CFG Nodes: 20
CFG Edges: 25
...
==========================================
```

Use these logs to:
- Compare against expected values in `DRY_RUN_ANALYSIS.md`
- Identify discrepancies
- Validate implementation correctness

## Troubleshooting

### Common Issues

1. **Test File Not Found**
   - Ensure `test_control_dependent_taint.cpp` exists in project root
   - Check file path in test configuration

2. **CFG Exporter Not Found**
   - Build `cfg-exporter` binary first
   - Check `ClangASTParser` path resolution

3. **Count Validation Failures**
   - Actual counts may vary slightly due to CFG generation
   - Check if expected ranges need adjustment
   - Review logs for actual vs expected values

4. **Feature Flag Failures**
   - Check if sensitivity level is correctly set in `DataflowAnalyzer`
   - Verify `TaintAnalyzer` respects sensitivity configuration
   - Check logs for sensitivity mismatch warnings

## Next Steps

1. **Run Initial Tests**: Execute the test suite to establish baseline
2. **Review Results**: Compare actual metrics against expected values
3. **Adjust Ranges**: Fine-tune expected ranges based on actual results
4. **Fix Issues**: Address any failing tests or validation errors
5. **Add to CI/CD**: Integrate into continuous integration pipeline

## Related Documentation

- `DRY_RUN_ANALYSIS.md`: Expected values for each sensitivity level
- `PLAN_TAINT_SENSITIVITY_LEVELS.md`: Sensitivity level implementation plan
- `TESTING_FRAMEWORK_v1.9.0.md`: General testing framework documentation
- `VISUALIZATION_DATA_SENSITIVITY_TESTING_FRAMEWORK.md`: Detailed testing framework documentation

