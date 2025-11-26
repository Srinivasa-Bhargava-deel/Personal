# Visualization Data Sensitivity Testing Framework

## Overview

This framework tests backend visualization data preparation for all 5 taint sensitivity levels. It validates that visualization data is correctly generated, structured, and contains sensitivity-specific features.

## Purpose

The testing framework ensures:
1. **Correct Data Structures**: All required visualization data structures are created
2. **Sensitivity-Specific Features**: Each sensitivity level correctly enables/disables features
3. **Count Validation**: Node, edge, and taint counts match expected ranges
4. **Data Consistency**: Visualization data is consistent across different data types
5. **Cross-Sensitivity Comparison**: Validates progression from MINIMAL to MAXIMUM

## Test File

**Test File**: `test_control_dependent_taint.cpp`

This file contains:
- 3 functions: `main()`, `get_user_input()`, `process_data()`
- 6 test cases with various control structures:
  1. Simple if-else
  2. Nested if-statements
  3. While loop
  4. For loop
  5. Switch statement
  6. Mixed data-flow + control-dependent taint
- 6 taint sources (`get_user_input()` calls)
- 8 taint sinks (`printf()` calls)

## Sensitivity Levels Tested

### 1. MINIMAL
- ✅ Data-flow taint only
- ❌ NO control-dependent taint
- ❌ NO inter-procedural taint
- **Expected**: 0 control-dependent taint blocks

### 2. CONSERVATIVE
- ✅ Data-flow taint
- ✅ Basic control-dependent taint (direct branches only)
- ❌ NO nested control-dependent taint
- ❌ NO inter-procedural taint
- **Expected**: 10-18 control-dependent taint blocks

### 3. BALANCED
- ✅ Data-flow taint
- ✅ Full control-dependent taint (including nested)
- ✅ Inter-procedural taint
- **Expected**: 12-20 control-dependent taint blocks, 20-35 data-flow edges

### 4. PRECISE
- ✅ All BALANCED features
- ✅ Path-sensitive analysis
- ✅ Field-sensitive analysis
- **Expected**: Similar to BALANCED, may have fewer false positives

### 5. MAXIMUM
- ✅ All PRECISE features
- ✅ Context-sensitive analysis
- ✅ Flow-sensitive analysis
- **Expected**: Maximum precision with context and flow awareness

## Running the Tests

### Prerequisites

1. Ensure `test_control_dependent_taint.cpp` exists in the project root
2. Ensure `cfg-exporter` binary is built and available
3. Install test dependencies (Jest)

### Run All Tests

```bash
npm test -- VisualizationDataSensitivity.test.ts
```

### Run Specific Sensitivity Level

```bash
npm test -- VisualizationDataSensitivity.test.ts -t "MINIMAL Sensitivity Level"
```

### Run Cross-Sensitivity Comparisons

```bash
npm test -- VisualizationDataSensitivity.test.ts -t "Cross-Sensitivity Comparisons"
```

## Test Structure

### Per-Sensitivity Tests

Each sensitivity level is tested with:

1. **Sensitivity Level Validation**
   - Verifies correct sensitivity level in state
   - Verifies correct sensitivity level in visualization data

2. **Data Structure Validation**
   - Checks all required visualization data structures exist
   - Validates interconnected CFG data structure
   - Validates node and edge arrays

3. **Feature Flag Validation**
   - Validates control-dependent taint feature
   - Validates nested control-dependent taint
   - Validates inter-procedural taint
   - Validates mixed taint

4. **Count Validation**
   - Validates counts against expected ranges
   - Checks function counts
   - Checks CFG node/edge counts
   - Checks taint block counts
   - Checks edge type counts

5. **Data Consistency Validation**
   - Validates consistency across visualization types
   - Checks node metadata
   - Checks edge metadata

6. **Metrics Logging**
   - Logs detailed metrics for manual validation

### Cross-Sensitivity Tests

1. **Control-Dependent Taint Progression**
   - MINIMAL should have 0 control-dependent blocks
   - CONSERVATIVE+ should have increasing counts

2. **Data-Flow Edge Progression**
   - MINIMAL should have fewest edges
   - BALANCED+ should have more edges (inter-procedural)

3. **Function Count Consistency**
   - All sensitivities should have same function count

4. **CFG Structure Consistency**
   - CFG structure should be same across sensitivities
   - Only taint analysis should differ

## Expected Metrics

### MINIMAL
```
Total Functions: 3
CFG Nodes: 15-25
CFG Edges: 20-30
Data-flow Taint Blocks: 8-12
Control-dependent Taint Blocks: 0
Mixed Taint Blocks: 0
Data-flow Edges (Orange): 8-15
Control Flow Edges (Green): 20-30
Function Call Edges (Blue): 6
```

### CONSERVATIVE
```
Total Functions: 3
CFG Nodes: 15-25
CFG Edges: 20-30
Data-flow Taint Blocks: 8-12
Control-dependent Taint Blocks: 10-18
Mixed Taint Blocks: 1-3
Data-flow Edges (Orange): 15-25
Control Flow Edges (Green): 20-30
Function Call Edges (Blue): 6
```

### BALANCED
```
Total Functions: 3
CFG Nodes: 15-25
CFG Edges: 20-30
Data-flow Taint Blocks: 8-12
Control-dependent Taint Blocks: 12-20
Mixed Taint Blocks: 1-3
Data-flow Edges (Orange): 20-35
Control Flow Edges (Green): 20-30
Function Call Edges (Blue): 6
```

### PRECISE
```
Total Functions: 3
CFG Nodes: 15-25
CFG Edges: 20-30
Data-flow Taint Blocks: 8-12
Control-dependent Taint Blocks: 10-18
Mixed Taint Blocks: 1-3
Data-flow Edges (Orange): 18-32
Control Flow Edges (Green): 20-30
Function Call Edges (Blue): 6
```

### MAXIMUM
```
Total Functions: 3
CFG Nodes: 15-25
CFG Edges: 20-30
Data-flow Taint Blocks: 8-12
Control-dependent Taint Blocks: 10-18
Mixed Taint Blocks: 1-3
Data-flow Edges (Orange): 18-35
Control Flow Edges (Green): 20-30
Function Call Edges (Blue): 6
```

## Validation Checklist

For each sensitivity level, verify:

- [ ] Correct sensitivity level in state
- [ ] Correct sensitivity level in visualization data
- [ ] All required data structures exist
- [ ] Feature flags match expected behavior
- [ ] Counts are within expected ranges
- [ ] Node metadata is correct
- [ ] Edge metadata is correct
- [ ] Data consistency across visualization types

## Key Validation Points

### MINIMAL vs Others
- **MINIMAL** must have **0 control-dependent taint blocks**
- **CONSERVATIVE+** must have **>0 control-dependent taint blocks**

### CONSERVATIVE vs BALANCED
- **CONSERVATIVE** should NOT have nested control-dependent taint
- **BALANCED+** should have nested control-dependent taint (more blocks)

### BALANCED vs PRECISE
- **PRECISE** may have slightly fewer tainted blocks (path-sensitivity reduces false positives)
- Both should have inter-procedural taint (more data-flow edges than MINIMAL)

### PRECISE vs MAXIMUM
- **MAXIMUM** should have context-sensitive and flow-sensitive features enabled
- May have more precise taint tracking

## Troubleshooting

### Test Failures

1. **Feature Flag Failures**
   - Check if sensitivity level is correctly set in `DataflowAnalyzer`
   - Verify `TaintAnalyzer` respects sensitivity configuration
   - Check logs for sensitivity mismatch warnings

2. **Count Validation Failures**
   - Actual counts may vary slightly due to CFG generation
   - Check if expected ranges need adjustment
   - Verify test file structure matches expectations

3. **Data Structure Failures**
   - Ensure `CFGVisualizer.prepareAllVisualizationData()` is called correctly
   - Check if visualization data preparation completes successfully
   - Verify state contains all required data

### Common Issues

1. **Missing Test File**
   - Ensure `test_control_dependent_taint.cpp` exists in project root
   - Check file path in test configuration

2. **CFG Exporter Not Found**
   - Build `cfg-exporter` binary first
   - Check `ClangASTParser` path resolution

3. **Timeout Errors**
   - Analysis may take time for MAXIMUM sensitivity
   - Increase Jest timeout if needed

## Integration with CI/CD

Add to your CI/CD pipeline:

```yaml
# Example GitHub Actions
- name: Run Visualization Data Sensitivity Tests
  run: npm test -- VisualizationDataSensitivity.test.ts --coverage
```

## Future Enhancements

1. **Performance Benchmarking**
   - Measure analysis time for each sensitivity level
   - Track memory usage

2. **Visualization Rendering Tests**
   - Test actual visualization rendering
   - Validate node colors and edge types

3. **Regression Testing**
   - Store baseline metrics
   - Compare against baselines

4. **Multi-File Testing**
   - Test with multiple C++ files
   - Test with larger codebases

## Related Documentation

- `DRY_RUN_ANALYSIS.md`: Expected values for each sensitivity level
- `PLAN_TAINT_SENSITIVITY_LEVELS.md`: Sensitivity level implementation plan
- `TESTING_FRAMEWORK_v1.9.0.md`: General testing framework documentation

