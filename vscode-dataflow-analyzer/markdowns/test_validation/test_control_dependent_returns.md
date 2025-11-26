# Validation: test_control_dependent_returns.cpp

## Test File Purpose
Tests control-dependent taint with return statements, including synthetic taint for return statements without variables.

## Test Code Structure
Contains 13 functions testing various control-dependent taint scenarios:
1. `test_early_return_control_dependent` - 3 control-dependent returns (no vars)
2. `test_return_with_tainted_var` - Control-dependent return with tainted variable
3. `test_mixed_taint` - Mixed taint (data-flow + control-dependent)
4. `test_nested_returns` - Nested conditionals with returns
5. `test_switch_returns` - Switch statement with returns
6. `test_loop_return` - Loop with conditional return
7. `test_pure_dataflow` - Pure data-flow (no control-dependent)
8. `get_user_input` - Helper function (taint source)
9. `test_interprocedural_control` - Inter-procedural with control-dependent
10. `test_complex_nested` - Complex nested with mixed
11. `test_normal_function` - Normal (no taint)
12. `test_multiple_return_types` - Multiple return types
13. `main` - Calls all test functions

## Expected Behavior

### Key Function: test_early_return_control_dependent
```cpp
int test_early_return_control_dependent() {
    int input;
    scanf("%d", &input);  // TAINT SOURCE
    
    if (input < 0) {
        return -1;  // CONTROL-DEPENDENT return (no variables)
    }
    
    if (input == 0) {
        return 0;   // CONTROL-DEPENDENT return (no variables)
    }
    
    return 1;       // CONTROL-DEPENDENT return (no variables)
}
```

**Expected**:
- Block with `scanf` should be yellow (data-flow taint)
- Blocks with `return -1`, `return 0`, `return 1` should be:
  - Magenta (synthetic taint) if sensitivity >= CONSERVATIVE
  - Orange (control-dependent) if detected via predecessor analysis
- Synthetic variables `__block_X__` should be created for return blocks

## Expected Logs

### Taint Analysis Logs
```
[TaintAnalysis] [SOURCE] 🔴 Taint source detected: input <- scanf (user_input)
[TaintAnalysis] [ControlDependentTaint] ✅ Created CONTROL_DEPENDENT taint for block X (return statement without variables)
[TaintAnalysis] [ControlDependentTaint] ✅ Added CONTROL_DEPENDENT label to used variable 'input' in block Y (return/expression)
```

### Visualization Logs
```
[VizColors] Block 2 detected as synthetic taint via variable __block_2__
[VizColors] Block 3 detected as control-dependent via predecessor 5
[InterCFGViz] Block 1 (test_early_return_control_dependent) detected as synthetic taint via variable __block_1__
```

## Expected UI Output

### Interconnected CFG Tab
- **Total Functions**: 13
- **Total Nodes**: ~69 blocks
- **Total Edges**: ~152 edges
- **Data-flow Taint**: ~12 blocks
- **Control-dependent Taint**: ~14 blocks
- **Mixed Taint**: ~3 blocks
- **Synthetic Taint**: Should be > 0 (return statements without variables)
- **Normal Blocks**: ~40 blocks

### Return Value Analysis Tab
- **test_early_return_control_dependent**: Should show 3 return statements
  - `return -1` - Marked as SYNTHETIC TAINT (if sensitivity >= CONSERVATIVE)
  - `return 0` - Marked as SYNTHETIC TAINT
  - `return 1` - Marked as SYNTHETIC TAINT
- Each should have purple/magenta background and "SYNTHETIC TAINT" badge

### CFG Tab (test_early_return_control_dependent)
- Block with `scanf`: Yellow (data-flow)
- Block with `return -1`: Magenta (synthetic) or Orange (control-dependent)
- Block with `return 0`: Magenta (synthetic) or Orange (control-dependent)
- Block with `return 1`: Magenta (synthetic) or Orange (control-dependent)

## Validation Checklist

### High Priority
- [ ] Block 2 (`return 0`) is correctly identified as tainted
- [ ] Synthetic taint variables (`__block_X__`) are created for return statements
- [ ] Return statements appear in Return Value Analysis tab with taint badges
- [ ] Only 5 colors appear (Yellow, Orange, Purple, Magenta, Light Blue)
- [ ] No "random" colors (dark green, etc.)

### Medium Priority
- [ ] Interconnected taint tab shows "Block: X" not "Variable: __block_X__"
- [ ] Synthetic taint count > 0 in legend
- [ ] All 13 functions appear in function dropdown
- [ ] State source indicator shows correctly

### Low Priority
- [ ] Output counts match expected ranges
- [ ] Logs show correct taint detection messages
- [ ] Sensitivity level affects detection (MAXIMUM should detect all)

## Notes
- This is the primary test file for control-dependent taint validation
- Synthetic taint detection requires sensitivity >= CONSERVATIVE
- Return statements without variables should create synthetic taint entries
- See `EXPECTED_OUTPUT_test_control_dependent_returns.md` for detailed expected counts

