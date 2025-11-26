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

## Validation Checklist

- [ ] printf summary models format string usage
- [ ] scanf summary models destination tainting
- [ ] strcpy summary models source-to-destination propagation
- [ ] malloc summary models return value tracking
- [ ] free summary models memory deallocation
- [ ] memcpy summary models memory copying
- [ ] system summary models command execution
- [ ] Vulnerabilities are detected based on function summaries

