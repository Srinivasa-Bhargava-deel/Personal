# Validation: test_field_sensitive.cpp

## Test File Purpose
Tests field-sensitive taint analysis (PRECISE/MAXIMUM sensitivity). Validates that taint is tracked at struct field level, not struct level.

## Expected Behavior

### Field-Sensitive Analysis
- Individual struct fields should be tracked separately
- Tainting one field should NOT taint other fields
- Field-level taint should propagate correctly
- Nested struct fields should be tracked correctly

## Expected Logs

```
[TaintAnalysis] [FieldSensitive] Field 'user.name' is tainted
[TaintAnalysis] [FieldSensitive] Field 'user.age' is NOT tainted
[TaintAnalysis] [FieldSensitive] Field propagation: output.name <- input.name
```

## Expected UI Output

### CFG Tab
- **Tainted fields**: Should show field-level taint (e.g., `user.name`)
- **Non-tainted fields**: Should NOT show taint for other fields

### Taint Analysis Tab
- **Tainted Variables**: Should show field-level variables (e.g., `user.name`, not just `user`)

## Validation Checklist

- [ ] Field-sensitive analysis works (PRECISE/MAXIMUM sensitivity)
- [ ] Individual fields are tracked separately
- [ ] Tainting one field doesn't taint other fields
- [ ] Field-level taint propagates correctly
- [ ] Nested struct fields are tracked correctly

## Counterexamples Added

### Counterexample 1: Field Sensitivity Through Pointer
- **Purpose**: Tests field-sensitive taint through pointer to struct
- **Expected**: Only pointed-to field should be tainted
- **Edge Case**: Pointer to struct field

### Counterexample 2: Field Sensitivity Through Function Parameter
- **Purpose**: Tests field-sensitive taint through function parameter
- **Expected**: Only specific field should be tainted
- **Edge Case**: Struct parameter field sensitivity

### Counterexample 3: Field Sensitivity Through Array of Structs
- **Purpose**: Tests field-sensitive taint through array of structs
- **Expected**: Only specific field in specific struct should be tainted
- **Edge Case**: Struct array field sensitivity

### Counterexample 4: Field Sensitivity Through Union
- **Purpose**: Tests field-sensitive taint through union (aliasing)
- **Expected**: Union members alias same memory - taint should propagate
- **Edge Case**: Union field aliasing

### Counterexample 5: Field Sensitivity Through Nested Pointer
- **Purpose**: Tests field-sensitive taint through nested struct pointer
- **Expected**: Only nested field should be tainted
- **Edge Case**: Nested pointer field sensitivity

## Validation Checklist

- [ ] Field-sensitive analysis works (PRECISE/MAXIMUM sensitivity)
- [ ] Individual fields are tracked separately
- [ ] Tainting one field doesn't taint other fields
- [ ] Field-level taint propagates correctly
- [ ] Nested struct fields are tracked correctly
- [ ] Pointer-to-struct field sensitivity works
- [ ] Function parameter field sensitivity works
- [ ] Struct array field sensitivity works
- [ ] Union field aliasing is handled
- [ ] Nested pointer field sensitivity works

## Notes
- Requires PRECISE or MAXIMUM sensitivity level
- Should show more precise taint tracking than field-insensitive analysis
- Counterexamples test edge cases for field-sensitive analysis

