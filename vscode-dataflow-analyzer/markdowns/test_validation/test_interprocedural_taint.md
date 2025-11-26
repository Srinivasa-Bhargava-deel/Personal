# Validation: test_interprocedural_taint.cpp

## Test File Purpose
Tests inter-procedural taint scenarios including parameter passing, return values, and complex call chains.

## Expected Behavior

### Inter-Procedural Scenarios
- Simple parameter passing: `process(tainted_input)`
- Return value propagation: `result = get_tainted_value()`
- Call chains: `A -> B -> C` with taint flow
- Recursive calls with taint

## Expected Logs

```
[IPA] Parameter taint: process.input <- main.tainted_input
[IPA] Return value taint: main.result <- process (tainted return)
[IPA] Call chain taint: A -> B -> C
```

## Expected UI Output

### Inter-Procedural Taint Tab
- All inter-procedural flows should be listed
- Source and target functions should be shown
- Propagation paths should be displayed

## Validation Checklist

- [ ] Parameter taint flows are detected
- [ ] Return value taint flows are detected
- [ ] Call chain taint flows are tracked
- [ ] Recursive taint propagation works

