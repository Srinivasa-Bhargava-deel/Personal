# Validation: test_reaching_definitions.cpp

## Test File Purpose
Tests forward dataflow analysis for definition tracking. Validates GEN/KILL sets, definition propagation, path sensitivity.

## Expected Behavior

### Reaching Definitions Analysis
- Definitions should reach uses unless killed
- Multiple definitions can reach same use (from different paths)
- KILL sets should properly eliminate prior definitions

### Test Cases
1. **Simple RD**: Definition `x = 5` reaches use in printf
2. **Definition Kill**: First definition is killed by second definition
3. **Multiple Paths**: Definitions from different branches both reach merge point
4. **Loops**: Definitions should propagate through loops correctly

## Expected Logs

### Reaching Definitions Logs
```
[RD] Block X IN: {}
[RD] Block X GEN: {x: [blockX_stmt1]}
[RD] Block X KILL: {x: [all previous definitions]}
[RD] Block X OUT: {x: [blockX_stmt1]}
[RD] Block Y IN: {x: [blockX_stmt1]}
```

## Expected UI Output

### Parameters & Returns Tab
- **Reaching Definitions**: Should show IN/OUT sets for each block
- **Definitions**: Should show which definitions reach each use

### CFG Tab
- Blocks should show reaching definitions in tooltips
- Data flow edges should show definition propagation

## Validation Checklist

- [ ] Definitions reach uses correctly
- [ ] KILL sets eliminate prior definitions
- [ ] Multiple definitions from different paths both reach merge points
- [ ] Loop definitions propagate correctly
- [ ] RD analysis completes without errors
- [ ] UI displays RD information correctly

## Counterexamples Added

### Counterexample 1: Multiple Pointers to Same Variable (Aliasing)
- **Purpose**: Tests RD analysis with pointer aliasing
- **Expected**: Should track definitions through aliases
- **Edge Case**: Pointer aliasing

### Counterexample 2: Definition Through Function Call (Side Effect)
- **Purpose**: Tests RD analysis with function call side effects
- **Expected**: Should track definitions through function calls
- **Edge Case**: Function call side effects

### Counterexample 3: Struct Field Definitions
- **Purpose**: Tests RD analysis with struct field definitions
- **Expected**: Should track field-level definitions
- **Edge Case**: Struct field definitions

### Counterexample 4: Array Element Definitions with Variable Index
- **Purpose**: Tests RD analysis with array element definitions
- **Expected**: Should track element-level definitions
- **Edge Case**: Array element definitions

### Counterexample 5: Definition Through Indirect Assignment Chain
- **Purpose**: Tests RD analysis with indirect assignment chains
- **Expected**: Should track definitions through chains
- **Edge Case**: Indirect assignment chains

## Validation Checklist

- [ ] Definitions reach uses correctly
- [ ] KILL sets eliminate prior definitions
- [ ] Multiple definitions from different paths both reach merge points
- [ ] Loop definitions propagate correctly
- [ ] RD analysis completes without errors
- [ ] UI displays RD information correctly
- [ ] Pointer aliasing is handled
- [ ] Function call side effects are handled
- [ ] Struct field definitions are handled
- [ ] Array element definitions are handled
- [ ] Indirect assignment chains are handled

## Notes
- Reaching Definitions is a forward dataflow analysis
- Used by taint analysis to track variable definitions
- Should complete in finite iterations (fixed-point)
- Counterexamples test edge cases for reaching definitions analysis

