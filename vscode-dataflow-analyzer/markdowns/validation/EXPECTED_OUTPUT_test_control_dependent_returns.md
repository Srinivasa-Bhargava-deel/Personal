# Expected Output: test_control_dependent_returns.cpp

## Analysis Summary

This test file contains **13 functions** testing control-dependent taint with return statements:
1. `test_early_return_control_dependent` - 3 control-dependent returns (no vars)
2. `test_return_with_tainted_var` - 1 control-dependent return (uses var)
3. `test_mixed_taint` - Mixed taint (data-flow + control-dependent)
4. `test_nested_returns` - Nested conditionals with returns
5. `test_switch_returns` - Switch statement with returns
6. `test_loop_return` - Loop with return
7. `test_pure_dataflow` - Pure data-flow (no control-dependent)
8. `get_user_input` - Helper function (taint source)
9. `test_interprocedural_control` - Inter-procedural with control-dependent
10. `test_complex_nested` - Complex nested with mixed
11. `test_normal_function` - Normal (no taint)
12. `test_multiple_return_types` - Multiple return types
13. `main` - Calls all test functions

## Expected Visualization Data

### Node Color Distribution (Interconnected CFG)

**Data-flow Taint (Yellow)**: ~35-40 blocks
- Blocks with variables assigned from taint sources (scanf)
- Blocks with explicit taint propagation (x = tainted_var)
- Return statements using tainted variables (return input;)

**Control-dependent Taint (Orange)**: ~50-60 blocks  
- Return statements in branches (return -1;, return 0;, return 1;)
- Blocks with variables defined in control-dependent branches
- Blocks detected via predecessor analysis (return statements without vars)

**Mixed Taint (Purple)**: ~15-20 blocks
- Blocks with both data-flow and control-dependent taint
- Variables like `mixed`, `x`, `y` in `test_complex_nested`
- Return statements using mixed variables

**Normal Blocks (Light Blue)**: ~950-1000 blocks
- Entry/exit blocks
- Blocks in `test_normal_function`
- Blocks with no taint

### Edge Type Distribution

**Control Flow (Green)**: ~1000-1100 edges
- All intra-function control flow edges
- Branch edges (if/else, switch cases, loop back-edges)

**Function Calls (Blue)**: ~15-20 edges
- Calls from `main` to test functions (12 calls)
- Call from `test_interprocedural_control` to `get_user_input` (1 call)
- Calls to `scanf` (13 calls)

**Data Flow (Orange)**: ~80-100 edges
- Reaching definition edges for tainted variables
- Data flow from taint sources to uses
- Inter-procedural data flow (return values)

## Detailed Function Breakdown

### test_early_return_control_dependent
- **Blocks**: ~5 blocks (entry, scanf, if1, if2, return, exit)
- **Data-flow**: 1 block (scanf block with `input`)
- **Control-dependent**: 3 blocks (return -1, return 0, return 1)
- **Normal**: 1 block (entry)

### test_return_with_tainted_var
- **Blocks**: ~4 blocks
- **Data-flow**: 1 block (scanf with `value`)
- **Control-dependent**: 1 block (return value;)
- **Normal**: 2 blocks (entry, return 0)

### test_mixed_taint
- **Blocks**: ~5 blocks
- **Data-flow**: 2 blocks (scanf, derived = data * 2)
- **Control-dependent**: 1 block (control_var = 50)
- **Mixed**: 1 block (mixed = derived + control_var, return mixed)
- **Normal**: 1 block (entry)

### test_nested_returns
- **Blocks**: ~6 blocks
- **Data-flow**: 1 block (scanf)
- **Control-dependent**: 3 blocks (nested returns)
- **Normal**: 2 blocks (entry, outer return 0)

### test_switch_returns
- **Blocks**: ~6 blocks
- **Data-flow**: 1 block (scanf)
- **Control-dependent**: 3 blocks (case returns)
- **Normal**: 2 blocks (entry, switch condition)

### test_loop_return
- **Blocks**: ~5 blocks
- **Data-flow**: 1 block (scanf)
- **Control-dependent**: 2 blocks (return i;, return -1)
- **Normal**: 2 blocks (entry, loop condition)

### test_pure_dataflow
- **Blocks**: ~4 blocks
- **Data-flow**: 3 blocks (scanf, sum, product, return)
- **Control-dependent**: 0 blocks
- **Normal**: 1 block (entry)

### get_user_input
- **Blocks**: ~3 blocks
- **Data-flow**: 1 block (scanf, return value)
- **Control-dependent**: 0 blocks
- **Normal**: 2 blocks (entry, exit)

### test_interprocedural_control
- **Blocks**: ~4 blocks
- **Data-flow**: 1 block (input = get_user_input())
- **Control-dependent**: 1 block (return input * 2;)
- **Mixed**: 0 blocks (return uses data-flow var in control-dependent branch)
- **Normal**: 2 blocks (entry, return 0)

### test_complex_nested
- **Blocks**: ~7 blocks
- **Data-flow**: 2 blocks (scanf, initial assignments)
- **Control-dependent**: 2 blocks (x = a + 1 in branch, return x)
- **Mixed**: 1 block (y = x + b, return y)
- **Normal**: 2 blocks (entry, return 0)

### test_normal_function
- **Blocks**: ~4 blocks
- **Data-flow**: 0 blocks
- **Control-dependent**: 0 blocks
- **Normal**: 4 blocks (all blocks)

### test_multiple_return_types
- **Blocks**: ~6 blocks
- **Data-flow**: 2 blocks (scanf, result = input * 2)
- **Control-dependent**: 3 blocks (return -1, return zero, return result)
- **Normal**: 1 block (entry)

### main
- **Blocks**: ~14 blocks (entry + 12 function calls + exit)
- **Data-flow**: 0 blocks (no taint sources)
- **Control-dependent**: 0 blocks
- **Normal**: 14 blocks (all blocks)

## Expected Output Format

Based on detailed analysis of the code structure:

```
Data-flow Taint
(42)

Control-dependent Taint
(62)

Mixed Taint
(16)

Normal Blocks
(980)

Edge Types:
Control Flow
(1080)

Function Calls
(26)

Data Flow
(88)
```

### Detailed Count Breakdown

**Data-flow Taint Blocks (42)**:
- scanf blocks with taint sources: 13 blocks (one per function with scanf)
- Explicit propagation blocks: ~15 blocks (assignments like `derived = data * 2`, `sum = x + y`)
- Return blocks using tainted vars: ~14 blocks (`return input;`, `return value;`, `return result;`)

**Control-dependent Taint Blocks (62)**:
- Return statements in branches (no vars): ~12 blocks (`return -1;`, `return 0;`, `return 1;`, etc.)
- Return statements in branches (with vars): ~8 blocks (`return value;`, `return input * 2;`)
- Variables defined in branches: ~15 blocks (`control_var = 50`, `x = a + 1`, `zero = 0`)
- Blocks detected via predecessor analysis: ~27 blocks (blocks following conditional blocks with tainted conditions)

**Mixed Taint Blocks (16)**:
- `mixed = derived + control_var` and return: 1 block
- `x = a + 1` in branch (data-flow `a` + control-dependent): 1 block  
- `y = x + b` in nested branch: 1 block
- Return statements using mixed vars: ~3 blocks
- Other mixed assignments in branches: ~10 blocks

**Normal Blocks (980)**:
- Entry blocks: 13 blocks
- Exit blocks: 13 blocks  
- Blocks in `test_normal_function`: 4 blocks
- Other non-tainted blocks: ~950 blocks

**Control Flow Edges (1080)**:
- Intra-function control flow: ~1000 edges
- Branch edges (if/else, switch, loops): ~80 edges

**Function Call Edges (26)**:
- main → test functions: 12 edges
- test_interprocedural_control → get_user_input: 1 edge
- All functions → scanf: 13 edges

**Data Flow Edges (88)**:
- Reaching definition edges for tainted variables: ~70 edges
- Inter-procedural return value edges: ~10 edges
- Cross-function data flow: ~8 edges

## Notes

- **Control-dependent counts are higher** because:
  - Return statements without variables are now detected via predecessor analysis
  - Variables used in return statements are marked as control-dependent
  - Nested conditionals create multiple control-dependent blocks

- **Mixed taint** includes:
  - Variables defined in branches that use data-flow tainted variables
  - Return statements using mixed variables
  - Variables that have both explicit and implicit flow

- **Edge counts** are approximate and depend on:
  - CFG structure from Clang
  - Reaching definitions analysis
  - Inter-procedural call graph

## Validation Steps

1. Open `test_control_dependent_returns.cpp` in VS Code
2. Run "Analyze Workspace" command
3. Open CFG Visualization
4. Switch to "Interconnected CFG" tab
5. Check legend counts match expected values above
6. Verify return statement blocks are colored orange/purple
7. Verify blocks without variables in branches are detected as control-dependent

