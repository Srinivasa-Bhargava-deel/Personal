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

## Validation Checklist

- [ ] Entry block is identified correctly
- [ ] Exit block is identified correctly
- [ ] Basic blocks are correct
- [ ] Control flow edges are correct
- [ ] Predecessors/successors are correct

