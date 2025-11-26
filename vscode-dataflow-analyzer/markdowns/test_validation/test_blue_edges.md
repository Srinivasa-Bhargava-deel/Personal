# Validation: test_blue_edges.cpp

## Test File Purpose
Tests data flow edge visualization (orange/blue edges) in interconnected CFG showing reaching definitions.

## Expected Behavior

### Data Flow Edges
- Data flow edges should be shown in interconnected CFG
- Edges should connect definitions to uses
- Edge colors should be correct (orange for data flow)
- Edge toggling should work

## Expected Logs

```
[InterCFGViz] Data flow edge: block_X -> block_Y (variable: x)
[InterCFGViz] Total data flow edges: N
```

## Expected UI Output

### Interconnected CFG Tab
- Data flow edges should be visible (orange)
- Edge toggle should work
- Edge counts should be correct

## Validation Checklist

- [ ] Data flow edges are shown correctly
- [ ] Edge colors are correct (orange)
- [ ] Edge toggle works
- [ ] Edge counts match expected values

