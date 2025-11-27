# Validation: test_taint_control_dependent.cpp

## Test File Purpose
Tests control-dependent (implicit flow) taint propagation through conditional branches.

## Expected Behavior

### Control-Dependent Taint
- Variables defined in branches with tainted conditions should be tainted
- Variables used in return statements in branches should be tainted
- Blocks following conditional blocks with tainted conditions should be marked as control-dependent

## Expected Logs

```
[TaintAnalysis] [ControlDependentTaint] ✅ Added CONTROL_DEPENDENT label to variable 'leaked' in block X
[TaintAnalysis] [ControlDependentTaint] ✅ Created CONTROL_DEPENDENT taint for block Y (return statement without variables)
```

## Expected UI Output

### CFG Tab
- Control-dependent blocks should be colored orange
- Mixed taint blocks should be colored purple
- Synthetic taint blocks should be colored magenta

### Taint Analysis Tab
- Control-dependent variables should be marked
- Return statements should show control-dependent taint

## Counterexamples Added

### Counterexample 1: Control Dependency Through Ternary Operator
- **Purpose**: Tests control-dependent taint through ternary operator
- **Expected**: Result should be control-dependent tainted
- **Edge Case**: Ternary operator control dependency

### Counterexample 2: Control Dependency with Loop Termination
- **Purpose**: Tests control dependency where tainted condition affects loop termination
- **Expected**: Variable defined after loop should be control-dependent
- **Edge Case**: Loop termination control dependency

### Counterexample 3: Control Dependency with Function Pointer
- **Purpose**: Tests control dependency where tainted value determines function pointer call
- **Expected**: Function pointer call should be control-dependent
- **Edge Case**: Function pointer control dependency

### Counterexample 4: Control Dependency in do-while Loop
- **Purpose**: Tests control dependency in do-while loop with tainted condition
- **Expected**: Loop body should be control-dependent
- **Edge Case**: do-while control dependency

### Counterexample 5: Control Dependency with Array Index
- **Purpose**: Tests control dependency where tainted value is used in array index
- **Expected**: Array access should be control-dependent
- **Edge Case**: Array index control dependency

## Validation Checklist

- [ ] Variables in branches with tainted conditions are marked as control-dependent
- [ ] Return statements in branches are marked as control-dependent
- [ ] Blocks following conditional blocks are detected as control-dependent
- [ ] Correct colors are applied (orange for control-dependent)
- [ ] Ternary operator control dependency works
- [ ] Loop termination control dependency works
- [ ] Function pointer control dependency works
- [ ] do-while control dependency works
- [ ] Array index control dependency works

## Notes
- Counterexamples test edge cases for control-dependent taint analysis

