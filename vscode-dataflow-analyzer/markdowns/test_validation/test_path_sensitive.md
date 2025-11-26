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

## Notes
- Requires PRECISE or MAXIMUM sensitivity level
- Should show fewer control-dependent blocks than non-path-sensitive analysis

