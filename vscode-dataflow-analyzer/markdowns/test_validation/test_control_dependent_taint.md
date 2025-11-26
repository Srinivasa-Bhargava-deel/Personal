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

## Validation Checklist

- [ ] Early returns are marked as control-dependent
- [ ] Nested conditionals are handled correctly
- [ ] Loops with tainted variables are handled
- [ ] Switch statements are handled correctly

