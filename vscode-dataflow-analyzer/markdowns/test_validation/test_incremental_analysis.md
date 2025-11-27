# Validation: test_incremental_analysis.cpp

## Test File Purpose
Tests file watchers and incremental analysis updates. Validates that file changes trigger re-analysis and only changed files are re-analyzed.

## Expected Behavior

### Incremental Analysis
- File changes should trigger re-analysis automatically
- Only changed files should be re-analyzed
- Analysis state should update incrementally
- File watchers should detect changes

## Expected Logs

```
[Extension] File changed: test_incremental_analysis.cpp
[Extension] Triggering incremental analysis for changed file
[DataflowAnalyzer] Incremental analysis: Re-analyzing 1 file(s)
```

## Expected UI Output

### Visualization
- Should update automatically when file is modified
- Should show updated analysis results
- Should maintain state for unchanged files

## Validation Checklist

- [ ] File changes trigger re-analysis
- [ ] Only changed files are re-analyzed
- [ ] Analysis state updates incrementally
- [ ] File watchers detect changes correctly
- [ ] Visualization updates automatically

## Counterexamples Added

### Counterexample 1: Incremental Analysis with New Function
- **Purpose**: Tests incremental analysis when new function is added
- **Expected**: New function should be analyzed when file changes
- **Edge Case**: New function addition

### Counterexample 2: Incremental Analysis with Modified Function
- **Purpose**: Tests incremental analysis when function is modified
- **Expected**: Modified function should be re-analyzed
- **Edge Case**: Function modification

### Counterexample 3: Incremental Analysis with Removed Function
- **Purpose**: Tests incremental analysis when function is removed
- **Expected**: Removed function should be removed from analysis state
- **Edge Case**: Function removal

### Counterexample 4: Incremental Analysis with Changed Taint Source
- **Purpose**: Tests incremental analysis when taint source changes
- **Expected**: Changed taint source should trigger re-analysis
- **Edge Case**: Taint source change

### Counterexample 5: Incremental Analysis with New Global Variable
- **Purpose**: Tests incremental analysis when new global is added
- **Expected**: New global should be analyzed
- **Edge Case**: New global variable

## Validation Checklist

- [ ] File changes trigger re-analysis
- [ ] Only changed files are re-analyzed
- [ ] Analysis state updates incrementally
- [ ] File watchers detect changes correctly
- [ ] Visualization updates automatically
- [ ] New functions are analyzed correctly
- [ ] Modified functions are re-analyzed correctly
- [ ] Removed functions are removed from state
- [ ] Changed taint sources trigger re-analysis
- [ ] New globals are analyzed correctly

## Notes
- Incremental analysis is tested through file modification
- Modify the test file and verify re-analysis triggers
- Check that only modified files are re-analyzed
- Counterexamples test edge cases for incremental analysis

