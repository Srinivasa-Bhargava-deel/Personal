# Validation: test_interprocedural.cpp

## Test File Purpose
Tests inter-procedural taint analysis - taint propagation across function boundaries.

## Expected Behavior

### Inter-Procedural Taint
- Taint should propagate through function parameters
- Taint should propagate through return values
- Taint should propagate through global variables
- Call graph should be used to track inter-procedural flows

## Expected Logs

```
[IPA] Parameter taint detected: callee.param <- caller.tainted_var
[IPA] Return value taint: caller.result <- callee (tainted return)
[IPA] Inter-procedural taint propagation complete
```

## Expected UI Output

### Inter-Procedural Taint Tab
- Parameter taint flows should be shown
- Return value taint flows should be shown
- Cross-function paths should be displayed

### Interconnected CFG Tab
- Function call edges should show taint flow
- Data flow edges should connect functions

## Validation Checklist

- [ ] Parameter taint propagation works
- [ ] Return value taint propagation works
- [ ] Global variable taint propagation works
- [ ] Inter-procedural paths are tracked correctly

