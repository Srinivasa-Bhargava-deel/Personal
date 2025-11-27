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

## Counterexamples Added

### Counterexample 1: Flow Sensitivity Through Function Call
- **Purpose**: Tests flow-sensitive taint through function call
- **Expected**: Taint should propagate based on call order
- **Edge Case**: Function call flow sensitivity

### Counterexample 2: Flow Sensitivity Through Loop Re-assignment
- **Purpose**: Tests flow-sensitive taint through loop re-assignment
- **Expected**: Variable should be tainted only after loop assignment
- **Edge Case**: Loop re-assignment flow sensitivity

### Counterexample 3: Flow Sensitivity Through Multiple Assignments
- **Purpose**: Tests flow-sensitive taint through multiple assignments
- **Expected**: Variable should be tainted only after tainted assignment
- **Edge Case**: Multiple assignment flow sensitivity

### Counterexample 4: Flow Sensitivity Through Pointer Assignment
- **Purpose**: Tests flow-sensitive taint through pointer assignment
- **Expected**: Pointer should be tainted only after tainted assignment
- **Edge Case**: Pointer assignment flow sensitivity

### Counterexample 5: Flow Sensitivity Through Global Variable
- **Purpose**: Tests flow-sensitive taint through global variable
- **Expected**: Global should be tainted only after tainted assignment
- **Edge Case**: Global variable flow sensitivity

## Validation Checklist

- [ ] Flow-sensitive analysis works (MAXIMUM sensitivity only)
- [ ] Statement order affects taint propagation
- [ ] Variables are tainted only after taint source assignment
- [ ] Re-assignments overwrite taint correctly
- [ ] Conditional re-assignments track paths correctly
- [ ] Loop iterations accumulate taint correctly
- [ ] Function call flow sensitivity works
- [ ] Loop re-assignment flow sensitivity works
- [ ] Multiple assignment flow sensitivity works
- [ ] Pointer assignment flow sensitivity works
- [ ] Global variable flow sensitivity works

## Notes
- Requires MAXIMUM sensitivity level
- Most precise form of taint analysis
- Should show most accurate taint tracking
- Counterexamples test edge cases for flow-sensitive analysis

