# Validation: test_function_summaries.cpp

## Test File Purpose
Tests pre-defined function summaries for common C library functions. Validates library function modeling, parameter effects, and return value tracking.

## Expected Behavior

### Function Summaries
- Library functions should have pre-defined summaries
- Parameter effects should be modeled correctly
- Return values should be tracked correctly
- External functions should be identified correctly
- Function summaries should enable accurate taint propagation

## Expected Logs

```
[CG] External function identified: printf (STDLIB)
[CG] Function summary: printf uses format string parameter
[CG] External function identified: scanf (STDLIB)
[CG] Function summary: scanf taints destination parameters
```

## Expected UI Output

### Call Graph Tab
- External functions should be marked
- Function summaries should be displayed

### Taint Analysis Tab
- Library function effects should be reflected in taint analysis
- Vulnerabilities from library functions should be detected

## Counterexamples Added

### Counterexample 1: Function Summary Through Function Pointer
- **Purpose**: Tests function summary through function pointer call
- **Expected**: Function summary should apply to function pointer calls
- **Edge Case**: Function pointer function summary

### Counterexample 2: Function Summary Through Indirect Call
- **Purpose**: Tests function summary through indirect function call
- **Expected**: Function summary should apply to indirect calls
- **Edge Case**: Indirect call function summary

### Counterexample 3: Function Summary Through Variadic Function
- **Purpose**: Tests function summary through variadic function wrapper
- **Expected**: Function summary should apply to variadic wrappers
- **Edge Case**: Variadic wrapper function summary

### Counterexample 4: Function Summary Through Struct Function Pointer
- **Purpose**: Tests function summary through struct function pointer
- **Expected**: Function summary should apply to struct function pointers
- **Edge Case**: Struct function pointer summary

### Counterexample 5: Function Summary Through Returned Function Pointer
- **Purpose**: Tests function summary through returned function pointer
- **Expected**: Function summary should apply to returned function pointers
- **Edge Case**: Returned function pointer summary

## Validation Checklist

- [ ] printf summary models format string usage
- [ ] scanf summary models destination tainting
- [ ] strcpy summary models source-to-destination propagation
- [ ] malloc summary models return value tracking
- [ ] free summary models memory deallocation
- [ ] memcpy summary models memory copying
- [ ] system summary models command execution
- [ ] Vulnerabilities are detected based on function summaries
- [ ] Function pointer calls use function summaries
- [ ] Indirect calls use function summaries
- [ ] Variadic wrappers use function summaries
- [ ] Struct function pointers use function summaries
- [ ] Returned function pointers use function summaries

