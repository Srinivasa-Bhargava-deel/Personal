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

## Counterexamples Added

### Counterexample 1: Nested Inter-Procedural Taint
- **Purpose**: Tests taint propagation through nested function calls
- **Expected**: Taint should propagate through all nested calls
- **Edge Case**: Nested inter-procedural taint

### Counterexample 2: Circular Inter-Procedural Taint
- **Purpose**: Tests taint propagation through circular function calls
- **Expected**: Taint should propagate through circular calls
- **Edge Case**: Circular inter-procedural taint

### Counterexample 3: Global Variable Inter-Procedural Taint
- **Purpose**: Tests taint propagation through global variables across functions
- **Expected**: Global variable taint should propagate inter-procedurally
- **Edge Case**: Global inter-procedural taint

### Counterexample 4: Function Pointer Inter-Procedural Taint
- **Purpose**: Tests taint propagation through function pointer calls
- **Expected**: Taint should propagate through function pointer calls
- **Edge Case**: Function pointer inter-procedural taint

### Counterexample 5: Variadic Function Inter-Procedural Taint
- **Purpose**: Tests taint propagation through variadic function calls
- **Expected**: Taint should propagate through variadic arguments
- **Edge Case**: Variadic inter-procedural taint

## Validation Checklist

- [ ] Parameter taint flows are detected
- [ ] Return value taint flows are detected
- [ ] Call chain taint flows are tracked
- [ ] Recursive taint propagation works
- [ ] Nested inter-procedural taint works
- [ ] Circular inter-procedural taint works
- [ ] Global inter-procedural taint works
- [ ] Function pointer inter-procedural taint works
- [ ] Variadic inter-procedural taint works

## Notes
- Counterexamples test edge cases for inter-procedural taint analysis

