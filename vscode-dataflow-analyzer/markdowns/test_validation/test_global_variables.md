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

## Counterexamples Added

### Counterexample 1: Global Pointer Variable
- **Purpose**: Tests taint propagation through global pointer
- **Expected**: Taint should propagate through global pointer
- **Edge Case**: Global pointer taint

### Counterexample 2: Global Variable Through Function Pointer
- **Purpose**: Tests global variable modified through function pointer
- **Expected**: Global variable should be tainted through function pointer call
- **Edge Case**: Global variable through function pointer

### Counterexample 3: Global Variable Array Index Aliasing
- **Purpose**: Tests global array accessed with tainted index
- **Expected**: Array element should be tainted
- **Edge Case**: Global array index aliasing

### Counterexample 4: Global Variable Through Struct
- **Purpose**: Tests global variable accessed through struct
- **Expected**: Struct field should be tainted
- **Edge Case**: Global variable through struct

### Counterexample 5: Global Variable Thread Safety (Race Condition Pattern)
- **Purpose**: Tests global variable accessed in multiple functions
- **Expected**: Global variable should be tainted across all accessors
- **Edge Case**: Global variable multi-accessor

## Validation Checklist

- [ ] Global variables are tracked across function boundaries
- [ ] Taint propagates through global variables
- [ ] Global variable definitions reach uses in other functions
- [ ] Multiple global variables are tracked separately
- [ ] Global arrays are tracked element-wise
- [ ] Global variables in control flow create control-dependent taint
- [ ] Global pointer taint propagation works
- [ ] Global variable through function pointer works
- [ ] Global array index aliasing works
- [ ] Global variable through struct works
- [ ] Global variable multi-accessor works

