# Validation: test_path_sensitive.cpp

## Test File Purpose
Tests path-sensitive taint analysis (PRECISE/MAXIMUM sensitivity). Validates that only truly control-dependent blocks are marked, reducing false positives.

## Expected Behavior

### Path-Sensitive Analysis
- Blocks reachable from some but not all branches should be control-dependent
- Blocks reachable from all branches should NOT be control-dependent
- Path-sensitive analysis should reduce false positives compared to non-path-sensitive

## Expected Logs

```
[TaintAnalysis] [PathSensitive] Block X is control-dependent (reachable from branch A but not B)
[TaintAnalysis] [PathSensitive] Block Y is NOT control-dependent (reachable from all branches)
```

## Expected UI Output

### CFG Tab
- **Control-dependent blocks**: Should be orange (only blocks in branches)
- **Normal blocks**: Should be light blue (blocks after merge points)
- **Fewer false positives**: Compared to non-path-sensitive analysis

## Validation Checklist

- [ ] Path-sensitive analysis works (PRECISE/MAXIMUM sensitivity)
- [ ] Blocks after merge points are NOT control-dependent
- [ ] Blocks in branches ARE control-dependent
- [ ] False positives are reduced compared to non-path-sensitive
- [ ] Nested conditionals are handled correctly
- [ ] Loops are handled correctly

## Counterexamples Added

### Counterexample 1: Path Sensitivity Through Function Call
- **Purpose**: Tests path-sensitive analysis through function calls
- **Expected**: Should distinguish paths through function calls
- **Edge Case**: Function call path sensitivity

### Counterexample 2: Path Sensitivity Through Pointer
- **Purpose**: Tests path-sensitive analysis through pointer operations
- **Expected**: Should distinguish paths through pointer operations
- **Edge Case**: Pointer path sensitivity

### Counterexample 3: Path Sensitivity Through Global Variable
- **Purpose**: Tests path-sensitive analysis through global variables
- **Expected**: Should distinguish paths through global assignments
- **Edge Case**: Global variable path sensitivity

### Counterexample 4: Path Sensitivity Through Array Element
- **Purpose**: Tests path-sensitive analysis through array elements
- **Expected**: Should distinguish paths through array assignments
- **Edge Case**: Array element path sensitivity

### Counterexample 5: Path Sensitivity Through Struct Field
- **Purpose**: Tests path-sensitive analysis through struct fields
- **Expected**: Should distinguish paths through struct field assignments
- **Edge Case**: Struct field path sensitivity

## Validation Checklist

- [ ] Path-sensitive analysis works (PRECISE/MAXIMUM sensitivity)
- [ ] Blocks after merge points are NOT control-dependent
- [ ] Blocks in branches ARE control-dependent
- [ ] False positives are reduced compared to non-path-sensitive
- [ ] Nested conditionals are handled correctly
- [ ] Loops are handled correctly
- [ ] Function call path sensitivity works
- [ ] Pointer path sensitivity works
- [ ] Global variable path sensitivity works
- [ ] Array element path sensitivity works
- [ ] Struct field path sensitivity works

## Notes
- Requires PRECISE or MAXIMUM sensitivity level
- Should show fewer control-dependent blocks than non-path-sensitive analysis
- Counterexamples test edge cases for path-sensitive analysis

