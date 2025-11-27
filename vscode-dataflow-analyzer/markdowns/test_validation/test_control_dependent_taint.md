# Validation: test_control_dependent_taint.cpp

## Test File Purpose
Tests control-dependent taint scenarios including early returns, nested conditionals, loops, switch statements.

## Expected Behavior

### Control-Dependent Scenarios
- Early returns based on tainted conditions
- Nested conditionals with taint
- Loops with tainted loop variables
- Switch statements with tainted choice

## Expected Logs

```
[TaintAnalysis] [ControlDependentTaint] ✅ Added CONTROL_DEPENDENT label
[TaintAnalysis] [ControlDependentTaint] ✅ Created CONTROL_DEPENDENT taint for block X
```

## Expected UI Output

### CFG Tab
- Control-dependent blocks should be orange
- Mixed taint blocks should be purple
- Synthetic taint blocks should be magenta

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

- [ ] Early returns are marked as control-dependent
- [ ] Nested conditionals are handled correctly
- [ ] Loops with tainted variables are handled
- [ ] Switch statements are handled correctly
- [ ] Ternary operator control dependency works
- [ ] Loop termination control dependency works
- [ ] Function pointer control dependency works
- [ ] do-while control dependency works
- [ ] Array index control dependency works

## Notes
- Counterexamples test edge cases for control-dependent taint

