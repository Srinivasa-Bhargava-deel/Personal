# Validation: test_interprocedural.cpp

## Test File Purpose
Tests inter-procedural taint analysis - taint propagation across function boundaries.

## Expected Behavior

### Inter-Procedural Taint
- Taint should propagate through function parameters
- Taint should propagate through return values
- Taint should propagate through global variables
- Call graph should be used to track inter-procedural flows

## Expected Logs

```
[IPA] Parameter taint detected: callee.param <- caller.tainted_var
[IPA] Return value taint: caller.result <- callee (tainted return)
[IPA] Inter-procedural taint propagation complete
```

## Expected UI Output

### Inter-Procedural Taint Tab
- Parameter taint flows should be shown
- Return value taint flows should be shown
- Cross-function paths should be displayed

### Interconnected CFG Tab
- Function call edges should show taint flow
- Data flow edges should connect functions

## Counterexamples Added

### Counterexample 1: Taint Propagation Through Global Struct Field
- **Purpose**: Tests inter-procedural taint through global struct field
- **Expected**: Taint should propagate through global struct field
- **Edge Case**: Global struct field taint

### Counterexample 2: Taint Propagation Through Union
- **Purpose**: Tests inter-procedural taint through union where different fields are accessed
- **Expected**: Taint should propagate through union fields
- **Edge Case**: Union field taint

### Counterexample 3: Taint Propagation Through Function Returning Pointer to Local Static
- **Purpose**: Tests inter-procedural taint through function returning pointer to local static
- **Expected**: Taint should propagate through returned pointer
- **Edge Case**: Static local pointer return

### Counterexample 4: Taint Propagation Through Callback Function
- **Purpose**: Tests inter-procedural taint through callback function passed as argument
- **Expected**: Taint should propagate through callback
- **Edge Case**: Callback function taint

### Counterexample 5: Taint Propagation Through Variadic Function
- **Purpose**: Tests inter-procedural taint through variadic function
- **Expected**: Taint should propagate through variadic arguments
- **Edge Case**: Variadic function taint

## Validation Checklist

- [ ] Parameter taint propagation works
- [ ] Return value taint propagation works
- [ ] Global variable taint propagation works
- [ ] Inter-procedural paths are tracked correctly
- [ ] Global struct field taint propagation works
- [ ] Union field taint propagation works
- [ ] Static local pointer return taint works
- [ ] Callback function taint propagation works
- [ ] Variadic function taint propagation works

## Notes
- Counterexamples test edge cases for inter-procedural analysis

