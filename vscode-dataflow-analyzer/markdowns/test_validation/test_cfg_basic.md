# Validation: test_cfg_basic.cpp

## Test File Purpose
Tests basic CFG structure including entry/exit blocks, basic blocks, control flow edges.

## Expected Behavior

### CFG Structure
- Entry block should be identified
- Exit block should be identified
- Basic blocks should be correctly identified
- Control flow edges should be correct
- Predecessors and successors should be correct

## Expected Logs

```
[Parser] CFG created: X blocks, Y edges
[Parser] Entry block: block_0
[Parser] Exit block: block_N
```

## Expected UI Output

### CFG Tab
- CFG structure should be correct
- Entry and exit blocks should be marked
- Control flow should be visible

## Counterexamples Added

### Counterexample 1: Function with Multiple Entry Points
- **Purpose**: Tests CFG generation for functions with goto to different labels
- **Expected**: Should handle multiple entry points correctly
- **Edge Case**: Multiple entry points via goto

### Counterexample 2: Complex Switch-Case with Fallthrough
- **Purpose**: Tests CFG generation for complex switch-case with fallthrough
- **Expected**: Should handle fallthrough correctly
- **Edge Case**: Switch-case fallthrough

### Counterexample 3: Loop with Break and Continue
- **Purpose**: Tests CFG generation for loops with break/continue in nested blocks
- **Expected**: Should handle break/continue correctly
- **Edge Case**: Nested break/continue

### Counterexample 4: Function with setjmp/longjmp
- **Purpose**: Tests CFG generation for non-local jumps
- **Expected**: Should handle setjmp/longjmp correctly
- **Edge Case**: Non-local jumps

### Counterexample 5: Function with Inline Assembly Blocks
- **Purpose**: Tests CFG generation for inline assembly
- **Expected**: Should handle inline assembly blocks
- **Edge Case**: Inline assembly

## Validation Checklist

- [ ] Entry block is identified correctly
- [ ] Exit block is identified correctly
- [ ] Basic blocks are correct
- [ ] Control flow edges are correct
- [ ] Predecessors/successors are correct
- [ ] Multiple entry points are handled
- [ ] Switch-case fallthrough is handled
- [ ] Nested break/continue is handled
- [ ] setjmp/longjmp is handled
- [ ] Inline assembly is handled

## Notes
- Counterexamples test edge cases for CFG generation

