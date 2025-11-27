# Validation: test_taint_dataflow.cpp

## Test File Purpose
Tests explicit data-flow taint propagation (forward propagation through assignments and expressions).

## Expected Behavior

### Data-Flow Taint Propagation
- Taint should propagate through assignments: `y = x` (if x is tainted, y becomes tainted)
- Taint should propagate through expressions: `z = x + y` (if x or y is tainted, z becomes tainted)
- Taint should propagate through function calls: `result = process(tainted_var)`
- Taint should NOT propagate through sanitization: `sanitized = sanitize(tainted_var)` (sanitized should NOT be tainted)

## Expected Logs

```
[TaintAnalysis] [SOURCE] 🔴 Taint source detected: x <- scanf (user_input)
[TaintAnalysis] [PROPAGATION] ✅ Forward propagation: y <- x
[TaintAnalysis] [PROPAGATION] ✅ Forward propagation: z <- y
[TaintAnalysis] [SANITIZATION] ✅ Variable sanitized: sanitized <- sanitize(x)
```

## Expected UI Output

### CFG Tab
- Tainted blocks should be colored yellow (data-flow taint)
- Taint propagation path should be visible

### Taint Analysis Tab
- All tainted variables should be listed
- Propagation paths should be shown
- Sanitized variables should NOT appear as tainted

## Counterexamples Added

### Counterexample 1: Taint Through Function Pointer
- **Purpose**: Tests taint propagation through function pointer calls
- **Expected**: Taint should propagate through function pointers
- **Edge Case**: Function pointer taint

### Counterexample 2: Taint Through Union Type Aliasing
- **Purpose**: Tests taint propagation through union type aliasing
- **Expected**: Taint should propagate through union members
- **Edge Case**: Union type aliasing

### Counterexample 3: Taint Through Struct Field Propagation
- **Purpose**: Tests taint propagation through struct fields
- **Expected**: Taint should propagate through struct fields
- **Edge Case**: Struct field propagation

### Counterexample 4: Taint Through Array Index Aliasing
- **Purpose**: Tests taint propagation through array index aliasing
- **Expected**: Taint should propagate through array elements
- **Edge Case**: Array index aliasing

### Counterexample 5: Taint Through Indirect Function Call
- **Purpose**: Tests taint propagation through indirect function calls
- **Expected**: Taint should propagate through indirect calls
- **Edge Case**: Indirect function call taint

## Validation Checklist

- [ ] Taint propagates through assignments
- [ ] Taint propagates through expressions
- [ ] Taint propagates through function calls
- [ ] Sanitization stops taint propagation
- [ ] All tainted variables are detected
- [ ] Propagation paths are correct
- [ ] Function pointer taint propagation works
- [ ] Union type aliasing taint works
- [ ] Struct field taint propagation works
- [ ] Array index aliasing taint works
- [ ] Indirect function call taint works

## Notes
- Counterexamples test edge cases for data-flow taint analysis

