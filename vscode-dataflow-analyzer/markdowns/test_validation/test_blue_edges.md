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

## Counterexamples Added

### Counterexample 1: Function Call Through Pointer
- **Purpose**: Tests blue edge generation for function pointer calls
- **Expected**: Blue edge should be generated for function pointer call
- **Edge Case**: Function pointer call

### Counterexample 2: Function Call Through Array
- **Purpose**: Tests blue edge generation for function pointer arrays
- **Expected**: Blue edges should be generated for all possible targets
- **Edge Case**: Function pointer array

### Counterexample 3: Function Call Through Struct Member
- **Purpose**: Tests blue edge generation for struct function pointers
- **Expected**: Blue edge should be generated for struct member call
- **Edge Case**: Struct function pointer

### Counterexample 4: Conditional Function Call
- **Purpose**: Tests blue edge generation for conditional function calls
- **Expected**: Blue edges should be generated for both possible targets
- **Edge Case**: Conditional function call

### Counterexample 5: Function Call Through Return Value
- **Purpose**: Tests blue edge generation for function pointer returns
- **Expected**: Blue edge should be generated for returned function pointer call
- **Edge Case**: Function pointer return

## Validation Checklist

- [ ] Data flow edges are shown correctly
- [ ] Edge colors are correct (orange)
- [ ] Edge toggle works
- [ ] Edge counts match expected values
- [ ] Function pointer calls generate blue edges
- [ ] Function pointer arrays generate blue edges
- [ ] Struct function pointers generate blue edges
- [ ] Conditional function calls generate blue edges
- [ ] Returned function pointers generate blue edges

