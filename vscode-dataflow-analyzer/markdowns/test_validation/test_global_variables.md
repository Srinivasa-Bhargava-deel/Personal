# Validation: test_global_variables.cpp

## Test File Purpose
Tests inter-procedural analysis of global variables. Validates global variable definitions, uses, and taint propagation through globals.

## Expected Behavior

### Global Variable Analysis
- Global variables should be tracked across function boundaries
- Taint should propagate through global variables
- Global variable definitions should reach uses in other functions
- Multiple global variables should be tracked separately
- Global arrays should be tracked element-wise

## Expected Logs

```
[IPA] Global variable definition: global_input <- scanf
[IPA] Global variable use: process_global uses global_input
[IPA] Global variable taint propagation: result <- global_input
```

## Expected UI Output

### Inter-Procedural Taint Tab
- Global variable taint flows should be shown
- Cross-function global variable flows should be displayed

### CFG Tab
- Global variable definitions should be marked
- Global variable uses should be marked

## Validation Checklist

- [ ] Global variables are tracked across function boundaries
- [ ] Taint propagates through global variables
- [ ] Global variable definitions reach uses in other functions
- [ ] Multiple global variables are tracked separately
- [ ] Global arrays are tracked element-wise
- [ ] Global variables in control flow create control-dependent taint

