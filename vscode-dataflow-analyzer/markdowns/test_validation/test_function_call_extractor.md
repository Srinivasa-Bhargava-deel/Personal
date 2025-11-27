# Test Validation: Function Call Extractor Edge Cases

**Test File**: `tests/test_function_call_extractor.cpp`

## Purpose

This test validates the FunctionCallExtractor's ability to handle edge cases and complex scenarios:
- Nested function calls
- Function calls in expressions
- Many arguments
- Nested expressions in arguments
- String literals
- Pointer arguments
- Array arguments
- Calls in conditionals
- Calls in return statements
- Whitespace variations
- Taint propagation through calls
- Empty arguments
- Single arguments

## Expected Behavior

### Test 1: Nested Function Calls
- **Expected**: All nested calls extracted
- **Example**: `bar(baz(x))` should extract: `bar`, `baz`
- **Log**: Function calls should be logged with correct nesting

### Test 2: Function Calls in Expressions
- **Expected**: Calls within expressions extracted
- **Example**: `add(x, y) + multiply(x, y)` should extract: `add`, `multiply`
- **Log**: Both calls should be identified

### Test 3: Function Calls with Many Arguments
- **Expected**: Functions with 6+ arguments handled correctly
- **Log**: All arguments should be parsed correctly

### Test 4: Function Calls with Nested Expressions
- **Expected**: Complex nested expressions handled
- **Example**: `process_nested_expr(add(x, y) * multiply(x, y))` should extract: `add`, `multiply`, `process_nested_expr`

### Test 5: Function Calls with String Literals
- **Expected**: String literals don't break extraction
- **Example**: `process_string("Value", x)` should extract: `process_string`

### Test 6: Function Calls with Pointers
- **Expected**: Pointer arguments handled correctly
- **Example**: `process_pointer(&x)` should extract: `process_pointer`

### Test 7: Function Calls with Arrays
- **Expected**: Array arguments handled correctly
- **Example**: `process_array(arr, 5)` should extract: `process_array`

### Test 8: Function Calls in Conditionals
- **Expected**: Calls in if/while/for conditions extracted
- **Example**: `if (check_value(x))` should extract: `check_value`

### Test 9: Function Calls in Return Statements
- **Expected**: Calls in return statements extracted
- **Example**: `return add(x, get_value())` should extract: `add`, `get_value`

### Test 10: Function Calls with Whitespace Variations
- **Expected**: Various whitespace patterns handled
- **Example**: `func( x , y )` should extract: `func`

### Test 11: Function Calls with Taint Propagation
- **Expected**: Taint propagates through all call types
- **Vulnerabilities**: Should detect tainted data reaching sinks through calls

### Test 12: Edge Cases - Empty Arguments
- **Expected**: Functions with no arguments handled
- **Example**: `no_args()` should extract: `no_args`

### Test 13: Edge Cases - Single Argument
- **Expected**: Single argument calls handled correctly
- **Example**: `single_arg(x)` should extract: `single_arg`

## Expected Logs

Function call extraction logs should show:
- All function calls extracted from statements
- Nested calls identified correctly
- Argument extraction working correctly

## Expected UI Output

### Call Graph Visualization
- All function calls should appear in call graph
- Nested calls should show correct relationships
- Call graph edges should be accurate

### Taint Analysis
- Taint should propagate through all function call types
- Nested calls should preserve taint flow
- Attack paths should include all call sites

## Validation Checklist

- [ ] All nested calls are extracted correctly
- [ ] Calls in expressions are identified
- [ ] Many-argument functions are handled
- [ ] Nested expressions in arguments work
- [ ] String literals don't break extraction
- [ ] Pointer arguments are handled
- [ ] Array arguments are handled
- [ ] Calls in conditionals are extracted
- [ ] Calls in returns are extracted
- [ ] Whitespace variations are handled
- [ ] Taint propagates through all call types
- [ ] Empty arguments are handled
- [ ] Single arguments are handled
- [ ] No crashes on edge cases

## Notes

- FunctionCallExtractor is critical for call graph construction
- Edge cases must not cause crashes or incorrect extraction
- Nested calls must all be identified for accurate analysis
- Taint propagation depends on correct call extraction

