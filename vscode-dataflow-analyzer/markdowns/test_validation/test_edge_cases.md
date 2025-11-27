# Validation: test_edge_cases.cpp

## Test File Purpose
Tests edge cases and corner cases in analysis including empty functions, single-block functions, complex control flow, etc.

## Expected Behavior

### Edge Cases
- Empty functions
- Single-block functions
- Functions with no variables
- Complex nested control flow
- Unreachable code
- Dead code

## Expected Logs

```
[Parser] Warning: Empty function detected
[Parser] Warning: Unreachable code detected
[Analysis] Function has no variables - skipping taint analysis
```

## Expected UI Output

### CFG Tab
- Edge cases should be handled gracefully
- No crashes or errors
- Appropriate warnings if needed

## Counterexamples Added

### Counterexample 1: Union Type Taint Propagation
- **Purpose**: Tests taint propagation through union types
- **Expected**: Taint should propagate through union members (int_val, float_val, char_val)
- **Edge Case**: Union type aliasing

### Counterexample 2: Volatile Pointer Arithmetic
- **Purpose**: Tests taint propagation through volatile pointer arithmetic
- **Expected**: Taint should propagate through volatile pointer operations
- **Edge Case**: Volatile pointer arithmetic

### Counterexample 3: Function Pointer Arithmetic
- **Purpose**: Tests arithmetic operations through function pointers
- **Expected**: Taint should propagate through function pointer calls with arithmetic
- **Edge Case**: Function pointer arithmetic

### Counterexample 4: Macro Arithmetic Expansion
- **Purpose**: Tests taint propagation through macro arithmetic
- **Expected**: Taint should propagate through macro-expanded arithmetic
- **Edge Case**: Macro arithmetic expansion

### Counterexample 5: Register Variable Taint
- **Purpose**: Tests taint propagation through register variables
- **Expected**: Taint should propagate through register-qualified variables
- **Edge Case**: Register variable taint

## Validation Checklist

- [ ] Empty functions are handled correctly
- [ ] Single-block functions are handled correctly
- [ ] Functions with no variables are handled correctly
- [ ] Complex control flow is analyzed correctly
- [ ] No crashes or errors occur
- [ ] Union type taint propagation works correctly
- [ ] Volatile pointer arithmetic is handled
- [ ] Function pointer arithmetic propagates taint
- [ ] Macro arithmetic expansion propagates taint
- [ ] Register variable taint propagation works

