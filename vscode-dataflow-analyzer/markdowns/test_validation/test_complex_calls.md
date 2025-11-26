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

## Validation Checklist

- [ ] Nested calls are tracked correctly
- [ ] Callbacks are tracked correctly
- [ ] Function pointers are resolved
- [ ] Variadic functions are handled

