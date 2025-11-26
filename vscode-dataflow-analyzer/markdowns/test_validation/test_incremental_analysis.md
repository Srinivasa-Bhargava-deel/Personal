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

## Notes
- Incremental analysis is tested through file modification
- Modify the test file and verify re-analysis triggers
- Check that only modified files are re-analyzed

