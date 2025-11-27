# Test Validation: Parameter Analysis

**Test File**: `tests/test_parameter_analysis.cpp`

## Purpose

This test validates the ParameterAnalyzer's ability to correctly identify and analyze all types of parameter argument derivations:
- Direct parameters
- Arithmetic expressions
- Composite/member access
- Address-of operators
- Function call results
- Array access
- Pointer dereference

## Expected Behavior

### Test 1: Direct Parameter Reference
- **Expected**: Parameter mapped with type `DIRECT`
- **Base Variable**: `x`
- **Used Variables**: `['x']`
- **Transformations**: `[]`
- **Log**: `[ParameterAnalysis] Map param: x <- value (direct, base: value)`

### Test 2: Arithmetic Expression Parameter
- **Expected**: Parameter mapped with type `EXPRESSION`
- **Base Variable**: First variable found (`x` or `y`)
- **Used Variables**: All variables in expression (`['x', 'y']`)
- **Transformations**: `['arithmetic']`
- **Log**: `[ParameterAnalysis] Map param: result <- x + y (expression, base: x)`

### Test 3: Composite/Member Access Parameter
- **Expected**: Parameter mapped with type `COMPOSITE`
- **Base Variable**: Object name (`obj` or `ptr`)
- **Used Variables**: `['obj', 'field']` or `['ptr', 'field']`
- **Transformations**: `['field']`
- **Log**: `[ParameterAnalysis] Map param: value <- obj.field (composite, base: obj)`

### Test 4: Address-of Parameter
- **Expected**: Parameter mapped with type `ADDRESS`
- **Base Variable**: `x`
- **Used Variables**: `['x']`
- **Transformations**: `['&']`
- **Log**: `[ParameterAnalysis] Map param: ptr <- &x (address, base: x)`

### Test 5: Function Call Result Parameter
- **Expected**: Parameter mapped with type `CALL`
- **Base Variable**: Function name (`compute` or `get_value`)
- **Used Variables**: Variables from nested call arguments
- **Transformations**: `['call']`
- **Log**: `[ParameterAnalysis] Map param: value <- compute(x, y) (call, base: compute)`

### Test 6: Array Access Parameter
- **Expected**: Parameter mapped with type `ARRAY_ACCESS`
- **Base Variable**: Array name (`arr`)
- **Used Variables**: `['arr', 'i']` or `['arr', 'index']`
- **Transformations**: `['[i]']` or `['[index]']`
- **Log**: `[ParameterAnalysis] Map param: value <- arr[i] (array_access, base: arr)`

### Test 7: Pointer Dereference Parameter
- **Expected**: Parameter mapped with type `DEREFERENCE`
- **Base Variable**: Pointer variable (`ptr`)
- **Used Variables**: `['ptr']`
- **Transformations**: `['*']`
- **Log**: `[ParameterAnalysis] Map param: value <- *ptr (dereference, base: ptr)`

### Test 8: Mixed Parameter Types
- **Expected**: All parameter types correctly identified in single function call
- **Log**: Multiple parameter mapping logs with different types

### Test 9: Nested Composite Access
- **Expected**: Deep nested member access handled correctly
- **Base Variable**: Root object (`outer`)
- **Transformations**: Include all member accesses (`['inner', 'value']`)

### Test 10: Complex Expression with Multiple Variables
- **Expected**: All variables extracted from complex expression
- **Used Variables**: `['a', 'b', 'c', 'd']` for `a + b * c - d`

### Test 11: Taint Propagation Through Parameters
- **Expected**: Taint propagates through all parameter types
- **Vulnerabilities**: Should detect tainted data reaching `sprintf` sink
- **Attack Paths**: Source-to-sink paths through parameter mapping

### Test 12: Edge Cases
- **Expected**: Handles mismatched parameter counts gracefully
- **Too Few**: Maps available parameters, ignores missing ones
- **Too Many**: Maps available parameters, ignores extra ones

## Expected Logs

```
[ParameterAnalysis] mapParametersWithDerivation: callee=process_direct, params=1, args=1
[ParameterAnalysis] Formal params: x
[ParameterAnalysis] Actual args: value
[ParameterAnalysis] Map param: x <- value (direct, base: value)

[ParameterAnalysis] Map param: result <- x + y (expression, base: x)

[ParameterAnalysis] Map param: value <- obj.field (composite, base: obj)

[ParameterAnalysis] Map param: ptr <- &x (address, base: x)

[ParameterAnalysis] Map param: value <- compute(x, y) (call, base: compute)

[ParameterAnalysis] Map param: value <- arr[i] (array_access, base: arr)

[ParameterAnalysis] Map param: value <- *ptr (dereference, base: ptr)
```

## Expected UI Output

### Parameter Analysis Tab
- Should show parameter mappings for all function calls
- Should display derivation types correctly
- Should show base variables and transformations

### Inter-Procedural Analysis
- Parameter mappings should be visible in inter-procedural taint analysis
- Taint should propagate correctly through all parameter types

## Validation Checklist

- [ ] All derivation types are correctly identified
- [ ] Base variables are extracted correctly
- [ ] Used variables include all variables from expressions
- [ ] Transformations are tracked correctly
- [ ] Taint propagates through all parameter types
- [ ] Edge cases (mismatched counts) are handled gracefully
- [ ] Nested composite access is handled correctly
- [ ] Complex expressions extract all variables
- [ ] Logs show correct parameter mapping information

## Notes

- Parameter analysis is critical for inter-procedural taint propagation
- All derivation types must be correctly identified for accurate analysis
- Edge cases should not cause crashes or incorrect analysis
- Taint propagation through parameters is essential for vulnerability detection

