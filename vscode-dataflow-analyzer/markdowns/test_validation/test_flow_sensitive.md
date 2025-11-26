# Validation: test_flow_sensitive.cpp

## Test File Purpose
Tests flow-sensitive taint analysis (MAXIMUM sensitivity only). Validates that statement order affects taint propagation.

## Expected Behavior

### Flow-Sensitive Analysis
- Taint should propagate based on statement order
- Variables should be tainted only after taint source assignment
- Re-assignment order matters (later assignments override earlier ones)
- Conditional re-assignment should track which path was taken

## Expected Logs

```
[TaintAnalysis] [FlowSensitive] Variable 'x' is tainted after assignment from 'input'
[TaintAnalysis] [FlowSensitive] Variable 'y' is NOT tainted (assigned before 'x' is tainted)
[TaintAnalysis] [FlowSensitive] Variable 'result' taint overwritten by non-tainted assignment
```

## Expected UI Output

### CFG Tab
- **Taint propagation**: Should reflect statement order
- **Re-assignments**: Should show taint being overwritten

## Validation Checklist

- [ ] Flow-sensitive analysis works (MAXIMUM sensitivity only)
- [ ] Statement order affects taint propagation
- [ ] Variables are tainted only after taint source assignment
- [ ] Re-assignments overwrite taint correctly
- [ ] Conditional re-assignments track paths correctly
- [ ] Loop iterations accumulate taint correctly

## Notes
- Requires MAXIMUM sensitivity level
- Most precise form of taint analysis
- Should show most accurate taint tracking

