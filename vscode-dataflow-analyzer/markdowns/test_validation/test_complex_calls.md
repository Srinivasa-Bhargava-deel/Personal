# Validation: test_complex_calls.cpp

## Test File Purpose
Tests complex function call scenarios including nested calls, callbacks, function pointers, variadic functions.

## Expected Behavior

### Complex Call Scenarios
- Nested function calls
- Callback functions
- Function pointer calls
- Variadic function calls
- Indirect calls

## Expected Logs

```
[CG] Found nested call: A -> B -> C
[CG] Found callback: callback_func
[CG] Resolved function pointer: ptr -> target_func
```

## Expected UI Output

### Call Graph Tab
- Complex call relationships should be shown
- Call chains should be visible
- Function pointers should be resolved

## Counterexamples Added

### Counterexample 1: Function Call Through Macro
- **Purpose**: Tests blue edge generation for macro-expanded calls
- **Expected**: Blue edge should be generated for macro-expanded call
- **Edge Case**: Macro function call

### Counterexample 2: Function Call Through Variadic Arguments
- **Purpose**: Tests blue edge generation for variadic function calls
- **Expected**: Blue edge should be generated for variadic call
- **Edge Case**: Variadic function call

### Counterexample 3: Function Call Through Inline Function
- **Purpose**: Tests blue edge generation for inline function calls
- **Expected**: Blue edge should be generated for inline call
- **Edge Case**: Inline function call

### Counterexample 4: Function Call Through Function Returning Function Pointer
- **Purpose**: Tests blue edge generation for complex function pointer chains
- **Expected**: Blue edges should be generated for all possible targets
- **Edge Case**: Function pointer chain

### Counterexample 5: Function Call Through Nested Function Pointer
- **Purpose**: Tests blue edge generation for nested function pointer calls
- **Expected**: Blue edges should be generated for nested calls
- **Edge Case**: Nested function pointer

## Validation Checklist

- [ ] Nested calls are tracked correctly
- [ ] Callbacks are tracked correctly
- [ ] Function pointers are resolved
- [ ] Variadic functions are handled
- [ ] Macro-expanded calls are tracked
- [ ] Variadic function calls are tracked
- [ ] Inline function calls are tracked
- [ ] Function pointer chains are tracked
- [ ] Nested function pointers are tracked

