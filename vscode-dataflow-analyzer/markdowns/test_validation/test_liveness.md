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

## Notes
- Liveness is a backward dataflow analysis
- Used for dead code elimination and register allocation
- Should complete in finite iterations (fixed-point)

