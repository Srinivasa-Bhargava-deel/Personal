# Validation: test_context_sensitive_taint.cpp

## Test File Purpose
Tests context-sensitive taint analysis (requires MAXIMUM sensitivity) - different contexts for same function.

## Expected Behavior

### Context-Sensitive Analysis
- Same function called from different contexts should be analyzed separately
- Context should affect taint propagation
- Requires MAXIMUM sensitivity level

## Expected Logs

```
[TaintAnalysis] Context-sensitive analysis: function_X called from context_A
[TaintAnalysis] Context-sensitive analysis: function_X called from context_B
```

## Expected UI Output

### CFG Tab
- Context-sensitive analysis should show different results for different contexts
- Taint propagation should be context-aware

## Validation Checklist

- [ ] Context-sensitive analysis works (MAXIMUM sensitivity)
- [ ] Different contexts produce different results
- [ ] Taint propagation is context-aware

## Counterexamples Added

### Counterexample 1: Context-Sensitive Taint Through Function Pointer
- **Purpose**: Tests context-sensitive analysis through function pointer calls
- **Expected**: Should distinguish contexts through function pointers
- **Edge Case**: Function pointer context sensitivity

### Counterexample 2: Context-Sensitive Taint Through Global Variable
- **Purpose**: Tests context-sensitive analysis through global variables
- **Expected**: Should distinguish contexts through globals
- **Edge Case**: Global variable context sensitivity

### Counterexample 3: Context-Sensitive Taint Through Struct
- **Purpose**: Tests context-sensitive analysis through struct fields
- **Expected**: Should distinguish contexts through struct fields
- **Edge Case**: Struct field context sensitivity

### Counterexample 4: Context-Sensitive Taint Through Array
- **Purpose**: Tests context-sensitive analysis through array elements
- **Expected**: Should distinguish contexts through array elements
- **Edge Case**: Array element context sensitivity

### Counterexample 5: Context-Sensitive Taint Through Nested Calls
- **Purpose**: Tests context-sensitive analysis through nested function calls
- **Expected**: Should distinguish contexts through nested calls
- **Edge Case**: Nested call context sensitivity

## Validation Checklist

- [ ] Context-sensitive analysis works (MAXIMUM sensitivity)
- [ ] Different contexts produce different results
- [ ] Taint propagation is context-aware
- [ ] Function pointer contexts are distinguished
- [ ] Global variable contexts are distinguished
- [ ] Struct field contexts are distinguished
- [ ] Array element contexts are distinguished
- [ ] Nested call contexts are distinguished

## Notes
- Requires MAXIMUM sensitivity level
- May not show differences at lower sensitivity levels
- Counterexamples test edge cases for context sensitivity

