# Validation: test_call_graph.cpp

## Test File Purpose
Tests function call relationship tracking including direct calls, indirect calls, recursion, external calls, function pointers, and callbacks.

## Expected Behavior

### Call Graph Analysis
- All function calls should be captured in call graph
- Recursive functions should be identified
- External/library function calls should be tracked
- Function pointer calls should be resolved
- Callback functions should be tracked

### Test Cases
1. **Simple Direct Call**: `main -> test_simple_call -> helper_function`
2. **Multiple Calls**: Same function calls multiple other functions
3. **Call Chains**: `A -> B -> C`
4. **Direct Recursion**: Function calls itself
5. **Indirect Recursion**: `A -> B -> A`
6. **Function Pointers**: `op = add; result = op(a, b);`
7. **Callbacks**: Functions passed as arguments
8. **Variadic Functions**: `printf`, `sprintf`

## Expected Logs

### Call Graph Logs
```
[CG] Found function: helper_function
[CG] Found call: test_simple_call -> helper_function
[CG] Found recursive function: factorial
[CG] Found function pointer assignment: op = add
[CG] Resolved indirect call: op -> add
```

## Expected UI Output

### Call Graph Tab
- **Functions**: All functions in the file
- **Function Calls**: All call relationships
- **Recursive Functions**: Marked with special indicator
- **External Functions**: Marked as external

### Interconnected CFG Tab
- **Function Call Edges**: Blue edges showing function calls
- **Call Sites**: Should show where functions are called

## Validation Checklist

- [ ] All direct function calls are captured
- [ ] Recursive functions are identified correctly
- [ ] Function pointer calls are resolved to target functions
- [ ] Callback functions are tracked correctly
- [ ] External function calls are marked
- [ ] Call graph visualization shows all relationships
- [ ] Function call edges appear in interconnected CFG

## Counterexamples Added

### Counterexample 1: Call to Function Through void* Pointer Cast
- **Purpose**: Tests call graph generation for void* pointer casts
- **Expected**: Should detect function calls through void* casts
- **Edge Case**: void* pointer cast calls

### Counterexample 2: Calls Within Macro Definition
- **Purpose**: Tests call graph generation for macro-expanded calls
- **Expected**: Should detect calls within macros
- **Edge Case**: Macro call expansion

### Counterexample 3: Calls to Overloaded Functions (C++ specific)
- **Purpose**: Tests call graph generation for overloaded functions
- **Expected**: Should resolve correct overload based on arguments
- **Edge Case**: Function overloading

### Counterexample 4: Calls to Virtual Functions (C++ specific)
- **Purpose**: Tests call graph generation for virtual function calls
- **Expected**: Should track virtual function calls
- **Edge Case**: Virtual function calls

### Counterexample 5: Calls to Functions in Different Compilation Unit
- **Purpose**: Tests call graph generation for external linkage functions
- **Expected**: Should track external function calls
- **Edge Case**: External linkage calls

## Validation Checklist

- [ ] All direct function calls are captured
- [ ] Recursive functions are identified correctly
- [ ] Function pointer calls are resolved to target functions
- [ ] Callback functions are tracked correctly
- [ ] External function calls are marked
- [ ] Call graph visualization shows all relationships
- [ ] Function call edges appear in interconnected CFG
- [ ] void* pointer casts are handled
- [ ] Macro calls are detected
- [ ] Overloaded functions are resolved
- [ ] Virtual functions are tracked
- [ ] External linkage calls are tracked

## Notes
- Function pointer resolution requires tracking assignments
- Callback tracking requires parameter analysis
- External functions should be marked but not analyzed
- Counterexamples test edge cases for call graph generation

