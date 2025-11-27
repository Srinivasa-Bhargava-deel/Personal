# Validation: test_liveness.cpp

## Test File Purpose
Tests backward dataflow analysis for variable liveness. Validates live ranges, dead variables, USE/DEF sets.

## Expected Behavior

### Liveness Analysis
- Variables should be LIVE at points where they are used before redefinition
- Variables should be DEAD after last use
- Proper propagation through control flow

### Test Cases
1. **Simple Liveness**: `a`, `b` live until use in `c = a + b`, then `c` live until printf
2. **Dead Variable**: Variable should be dead after last use
3. **Control Flow**: Liveness should propagate correctly through branches
4. **Loops**: Variables used in loops should be live at loop entry

## Expected Logs

### Liveness Analysis Logs
```
[Liveness] Block X IN: {a, b}
[Liveness] Block X OUT: {c}
[Liveness] Block Y IN: {c}
[Liveness] Block Y OUT: {}
```

## Expected UI Output

### Parameters & Returns Tab
- **Liveness Analysis**: Should show IN/OUT sets for each block
- **Live Variables**: Should show which variables are live at each block

### CFG Tab
- Blocks should show liveness information in tooltips
- Live variables should be highlighted

## Validation Checklist

- [ ] Variables are marked as LIVE at use points
- [ ] Variables are marked as DEAD after last use
- [ ] Liveness propagates correctly through control flow
- [ ] Loop variables are handled correctly
- [ ] Liveness analysis completes without errors
- [ ] UI displays liveness information correctly

## Counterexamples Added

### Counterexample 1: Variable Used in Function Call Then Immediately Redefined
- **Purpose**: Tests liveness when variable is used in call then redefined
- **Expected**: Variable should be live at call site, dead after redefinition
- **Edge Case**: Function call then redefinition

### Counterexample 2: Variable Shadowing in Nested Scope
- **Purpose**: Tests liveness with variable shadowing
- **Expected**: Inner and outer variables should be tracked separately
- **Edge Case**: Variable shadowing

### Counterexample 3: Variable Used in Loop Condition But Never Defined in Loop
- **Purpose**: Tests liveness when variable used in condition but not defined in loop
- **Expected**: Variable should be live at loop entry
- **Edge Case**: Loop condition variable

### Counterexample 4: Variable Used in Multiple Return Statements
- **Purpose**: Tests liveness when variable used in multiple returns
- **Expected**: Variable should be live at all return points
- **Edge Case**: Multiple return statements

### Counterexample 5: Variable Used in Nested Function Call Chain
- **Purpose**: Tests liveness through nested function call chain
- **Expected**: Variable should be live through entire call chain
- **Edge Case**: Nested call chain

## Validation Checklist

- [ ] Variables are marked as LIVE at use points
- [ ] Variables are marked as DEAD after last use
- [ ] Liveness propagates correctly through control flow
- [ ] Loop variables are handled correctly
- [ ] Liveness analysis completes without errors
- [ ] UI displays liveness information correctly
- [ ] Function call then redefinition is handled
- [ ] Variable shadowing is handled
- [ ] Loop condition variables are handled
- [ ] Multiple return statements are handled
- [ ] Nested call chains are handled

## Notes
- Liveness is a backward dataflow analysis
- Used for dead code elimination and register allocation
- Should complete in finite iterations (fixed-point)
- Counterexamples test edge cases for liveness analysis

