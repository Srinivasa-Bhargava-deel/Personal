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

## Notes
- Requires PRECISE or MAXIMUM sensitivity level
- Should show more precise taint tracking than field-insensitive analysis

