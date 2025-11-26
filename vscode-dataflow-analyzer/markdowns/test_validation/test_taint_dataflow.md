# Validation: test_taint_dataflow.cpp

## Test File Purpose
Tests explicit data-flow taint propagation (forward propagation through assignments and expressions).

## Expected Behavior

### Data-Flow Taint Propagation
- Taint should propagate through assignments: `y = x` (if x is tainted, y becomes tainted)
- Taint should propagate through expressions: `z = x + y` (if x or y is tainted, z becomes tainted)
- Taint should propagate through function calls: `result = process(tainted_var)`
- Taint should NOT propagate through sanitization: `sanitized = sanitize(tainted_var)` (sanitized should NOT be tainted)

## Expected Logs

```
[TaintAnalysis] [SOURCE] 🔴 Taint source detected: x <- scanf (user_input)
[TaintAnalysis] [PROPAGATION] ✅ Forward propagation: y <- x
[TaintAnalysis] [PROPAGATION] ✅ Forward propagation: z <- y
[TaintAnalysis] [SANITIZATION] ✅ Variable sanitized: sanitized <- sanitize(x)
```

## Expected UI Output

### CFG Tab
- Tainted blocks should be colored yellow (data-flow taint)
- Taint propagation path should be visible

### Taint Analysis Tab
- All tainted variables should be listed
- Propagation paths should be shown
- Sanitized variables should NOT appear as tainted

## Validation Checklist

- [ ] Taint propagates through assignments
- [ ] Taint propagates through expressions
- [ ] Taint propagates through function calls
- [ ] Sanitization stops taint propagation
- [ ] All tainted variables are detected
- [ ] Propagation paths are correct

