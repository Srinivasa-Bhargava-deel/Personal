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

## Validation Checklist

- [ ] Variables in branches with tainted conditions are marked as control-dependent
- [ ] Return statements in branches are marked as control-dependent
- [ ] Blocks following conditional blocks are detected as control-dependent
- [ ] Correct colors are applied (orange for control-dependent)

