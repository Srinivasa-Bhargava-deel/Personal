# Validation Instructions for TEMP_VALIDATION.md

This document provides step-by-step instructions for validating items listed in `TEMP_VALIDATION.md`.

## Prerequisites

1. **VS Code Extension**: Ensure the extension is installed and activated
2. **Test Files**: All test files should be in `tests/` directory
3. **Validation Files**: All validation files should be in `markdowns/test_validation/` directory
4. **Logs**: Logs will be written to `.vscode/logs.txt`

## General Validation Process

### Step 1: Prepare Environment
1. Open VS Code in the workspace directory
2. Clear logs: Delete `.vscode/logs.txt` or restart Extension Host (`Cmd+Shift+P` → "Developer: Reload Window")
3. Set sensitivity level: `Cmd+Shift+P` → "Preferences: Open Settings" → Search "taintSensitivity" → Set to desired level (MAXIMUM recommended for full validation)

### Step 2: Run Analysis
1. Open the test file you want to validate (e.g., `tests/test_control_dependent_returns.cpp`)
2. Run analysis:
   - **Single File**: `Cmd+Shift+P` → "Dataflow Analyzer: Analyze Active File"
   - **Workspace**: `Cmd+Shift+P` → "Dataflow Analyzer: Analyze Workspace"
3. Wait for analysis to complete (check notification)

### Step 3: Check Logs
1. Open `.vscode/logs.txt`
2. Search for relevant log messages (use `Cmd+F`)
3. Compare with expected logs in validation file (`markdowns/test_validation/test_*.md`)

### Step 4: Check UI Output
1. Open CFG Visualization: `Cmd+Shift+P` → "Dataflow Analyzer: Show CFG Visualization"
2. Check each tab:
   - **CFG Tab**: Block colors, taint types
   - **Call Graph Tab**: Function relationships
   - **Taint Analysis Tab**: Tainted variables, vulnerabilities
   - **Inter-Procedural Taint Tab**: Cross-function taint flows
   - **Parameters & Returns Tab**: Return value analysis, liveness, RD
   - **Interconnected CFG Tab**: Unified view with legend counts

### Step 5: Compare Results
1. Compare actual output with expected output in validation file
2. Check checklist items in validation file
3. Document any discrepancies

## Specific Validation Items from TEMP_VALIDATION.md

### 1. Output Count Validation

**Test File**: `tests/test_control_dependent_returns.cpp`

**Steps**:
1. Run "Analyze Active File" on `test_control_dependent_returns.cpp`
2. Open CFG Visualization → Switch to "Interconnected CFG" tab
3. Check legend counts:
   - Data-flow Taint: Should be ~12
   - Control-dependent Taint: Should be ~14
   - Mixed Taint: Should be ~3
   - Synthetic Taint: Should be > 0
   - Normal Blocks: Should be ~40
4. Compare with expected counts in `EXPECTED_OUTPUT_test_control_dependent_returns.md`
5. Document discrepancies

**Expected Output**:
```
Total Functions: 13
Total Nodes: 69
Total Edges: 152
Data-flow Taint: 12
Control-dependent Taint: 14
Mixed Taint: 3
Synthetic Taint: > 0
Normal Blocks: 40
```

### 2. Block 2 Taint Detection

**Test File**: `tests/test_control_dependent_returns.cpp`
**Function**: `test_early_return_control_dependent`
**Block**: Block 2 (contains `return 0;`)

**Steps**:
1. Run analysis on `test_control_dependent_returns.cpp`
2. Open CFG Visualization
3. Select function `test_early_return_control_dependent` from dropdown
4. Check Block 2:
   - Should be colored magenta (synthetic taint) or orange (control-dependent)
   - Should NOT be light blue (normal)
5. Check logs for: `[VizColors] Block 2 detected as synthetic taint` or `[VizColors] Block 2 detected as control-dependent`
6. Check Interconnected Taint tab:
   - Should show "Block: 2" (NOT "Variable: __block_2__")
   - Should have "SYNTHETIC" badge if synthetic taint detected

**Validation Checklist**:
- [ ] Block 2 is colored magenta or orange (NOT light blue)
- [ ] Logs show block 2 taint detection
- [ ] Interconnected taint tab shows "Block: 2" with correct label
- [ ] Synthetic variable `__block_2__` exists in taint analysis

### 3. Return Value Analysis - Return 1 Statements

**Test File**: `tests/test_control_dependent_returns.cpp`
**Function**: `test_early_return_control_dependent`

**Steps**:
1. Run analysis on `test_control_dependent_returns.cpp`
2. Open CFG Visualization
3. Switch to "Parameters & Returns" tab
4. Check Return Value Analysis section
5. Look for `test_early_return_control_dependent` function
6. Verify return statements:
   - `return -1` (block 4)
   - `return 0` (block 2)
   - `return 1` (block 1)
7. Each should have:
   - Purple/magenta background (if synthetic taint)
   - "SYNTHETIC TAINT" badge
   - Explanatory text: "This return statement is control-dependent (synthetic taint)"

**Validation Checklist**:
- [ ] All 3 return statements appear in Return Value Analysis tab
- [ ] Each has "SYNTHETIC TAINT" badge
- [ ] Each has colored background (purple/magenta)
- [ ] Explanatory text appears for synthetic taint

### 4. Coloring Consistency Validation

**Test File**: `tests/test_control_dependent_returns.cpp`

**Steps**:
1. Run analysis
2. Open CFG Visualization
3. Check CFG Tab:
   - Count blocks of each color
   - Verify only 5 colors appear:
     - Yellow (#ffd60a) - Data-flow
     - Orange (#ffa94d) - Control-dependent
     - Purple (#9d4edd) - Mixed
     - Magenta (#c77dff) - Synthetic
     - Light Blue (#e8f4f8) - Normal
4. Check Interconnected CFG Tab:
   - Verify legend counts match actual colored blocks
   - Verify no "random" colors appear
5. Check for dark green or other unexpected colors (should NOT appear)

**Validation Checklist**:
- [ ] Only 5 colors appear in visualization
- [ ] No unexpected colors (dark green, etc.)
- [ ] Legend counts match actual colored blocks
- [ ] Colors are consistent across tabs

### 5. Synthetic Taint Detection Logic

**Test File**: `tests/test_control_dependent_returns.cpp`

**Steps**:
1. Run analysis with MAXIMUM sensitivity
2. Check logs for synthetic taint creation:
   - Search for: `[TaintAnalysis] [ControlDependentTaint] ✅ Created CONTROL_DEPENDENT taint for block`
   - Search for: `__block_`
3. Check taint analysis results:
   - Synthetic variables should exist: `__block_1__`, `__block_2__`, `__block_4__`
4. Verify in visualization:
   - Blocks with synthetic taint should be magenta
   - Synthetic taint count should be > 0 in legend

**Validation Checklist**:
- [ ] Synthetic taint variables are created (`__block_X__`)
- [ ] Logs show synthetic taint creation messages
- [ ] Blocks are colored magenta (synthetic taint)
- [ ] Synthetic taint count > 0 in legend

### 6. Interconnected Taint Tab - Variable Labels

**Test File**: `tests/test_control_dependent_returns.cpp`

**Steps**:
1. Run analysis
2. Open CFG Visualization
3. Switch to "Inter-Procedural Taint" tab
4. Look for entries with synthetic blocks
5. Verify labels:
   - Should show "Block: 2" (NOT "Variable: __block_2__")
   - Should have "SYNTHETIC" badge

**Validation Checklist**:
- [ ] Labels show "Block: X" not "Variable: __block_X__"
- [ ] "SYNTHETIC" badge appears
- [ ] All synthetic blocks are correctly labeled

### 7. Re-analyze Button Visibility

**Steps**:
1. Open CFG Visualization
2. Check all tabs:
   - CFG Tab
   - Call Graph Tab
   - Taint Analysis Tab
   - Inter-Procedural Taint Tab
   - Parameters & Returns Tab
   - **Interconnected CFG Tab** (most important)
3. Verify re-analyze button is visible on ALL tabs
4. Test button functionality on Interconnected CFG tab

**Validation Checklist**:
- [ ] Re-analyze button visible on all tabs
- [ ] Button appears on initial load
- [ ] Button remains visible when switching tabs
- [ ] Button works on Interconnected CFG tab

### 8. State Source Indicator

**Steps**:
1. Run analysis (fresh analysis)
2. Open CFG Visualization
3. Check header for state source indicator:
   - Should show "Data Source: Current Analysis" (light blue)
4. Save state: Click "Save State" button
5. Reload window: `Cmd+Shift+P` → "Developer: Reload Window"
6. Open CFG Visualization again
7. Check state source indicator:
   - Should show "Data Source: Saved State" (yellow)
   - Should show timestamp

**Validation Checklist**:
- [ ] Indicator appears on all tabs
- [ ] "Saved State" shows yellow background
- [ ] "Current Analysis" shows light blue background
- [ ] Timestamp appears for saved state
- [ ] No emojis in indicator

### 9. Log Validation

**Steps**:
1. Clear logs: Delete `.vscode/logs.txt` or reload window
2. Run analysis
3. Open `.vscode/logs.txt`
4. Search for key log messages:
   - `[TaintAnalysis] [SOURCE]` - Taint sources
   - `[TaintAnalysis] [ControlDependentTaint]` - Control-dependent taint
   - `[VizColors]` - Block coloring decisions
   - `[CFGViz]` - Visualization updates
   - `[StateManager]` - State loading/saving
5. Compare with expected logs in validation files

**Validation Checklist**:
- [ ] Logs show taint analysis execution
- [ ] Logs show synthetic taint creation
- [ ] Logs show block coloring decisions
- [ ] Logs show state source (Saved State vs Current Analysis)

### 10. Expected vs Actual Output Comparison

**Test File**: `tests/test_control_dependent_returns.cpp`

**Steps**:
1. Run "Analyze Active File" on `test_control_dependent_returns.cpp`
2. Record actual output counts from Interconnected CFG tab legend
3. Compare with expected counts in `EXPECTED_OUTPUT_test_control_dependent_returns.md`
4. Document discrepancies:
   - Data-flow: Expected 7, Actual 12 (difference: +5)
   - Control-dependent: Expected 19, Actual 14 (difference: -5)
   - Mixed: Expected 8, Actual 3 (difference: -5)
5. Investigate reasons for discrepancies:
   - Different sensitivity settings?
   - Missing detections?
   - Incorrect logic?
   - Different test scope (single file vs workspace)?

**Validation Checklist**:
- [ ] Actual counts are recorded
- [ ] Compared with expected counts
- [ ] Discrepancies are documented
- [ ] Reasons for discrepancies are investigated

### 11. Sensitivity Level Impact Validation

**Steps**:
1. Set sensitivity to MINIMAL
2. Run analysis on `test_control_dependent_returns.cpp`
3. Record counts from Interconnected CFG tab
4. Change sensitivity to CONSERVATIVE
5. Run re-analysis (click re-analyze button or change sensitivity dropdown)
6. Record counts again
7. Repeat for BALANCED, PRECISE, MAXIMUM
8. Compare counts across sensitivity levels:
   - MINIMAL: Should have fewest tainted blocks (only data-flow)
   - MAXIMUM: Should have most tainted blocks (all features enabled)

**Validation Checklist**:
- [ ] MINIMAL shows only data-flow taint
- [ ] CONSERVATIVE shows control-dependent taint
- [ ] BALANCED shows inter-procedural taint
- [ ] PRECISE shows path-sensitive analysis
- [ ] MAXIMUM shows all features enabled
- [ ] Sensitivity changes trigger re-analysis
- [ ] Visualization updates with new sensitivity

### 12. Function Count Validation

**Test File**: `tests/test_control_dependent_returns.cpp`

**Steps**:
1. Run "Analyze Active File" on `test_control_dependent_returns.cpp`
2. Check function dropdown in CFG Visualization
3. Verify only 13 functions appear (from test file)
4. Run "Analyze Workspace"
5. Check function dropdown again
6. Verify if additional functions appear (from other files)
7. Compare function lists

**Validation Checklist**:
- [ ] "Analyze Active File" shows only test file functions (13 functions)
- [ ] "Analyze Workspace" shows all workspace functions
- [ ] Function filtering works correctly
- [ ] Function list matches expected functions

## Validation Template

For each validation item, use this template:

```markdown
### Validation Item: [Name]

**Status**: [ ] PASSED / [ ] FAILED / [ ] PARTIAL

**Test File**: `tests/[filename].cpp`

**Steps Taken**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Actual Results**:
- [Result 1]
- [Result 2]

**Expected Results**:
- [Expected 1]
- [Expected 2]

**Discrepancies**:
- [Discrepancy 1]
- [Discrepancy 2]

**Notes**:
[Any additional notes]
```

## Tips

1. **Clear State**: Use "Delete State and Re-Analyze" button for fresh analysis
2. **Check Logs**: Always check `.vscode/logs.txt` for detailed information
3. **Screenshot**: Take screenshots of UI output for comparison
4. **Document**: Document all findings in validation files
5. **Iterate**: Run validation multiple times to ensure consistency

## Common Issues

1. **Logs Empty**: Reload window to initialize logging
2. **Stale Data**: Clear state and re-analyze
3. **Wrong Sensitivity**: Check settings and re-analyze
4. **Missing Features**: Ensure sensitivity level is high enough (MAXIMUM recommended)

## Comprehensive Test Validation

### Validating All Test Files

After completing the specific validation items above, validate all test files:

1. **Review Test List**: Check `markdowns/test_validation/README.md` for complete list of test files
2. **For Each Test File**:
   - Open `tests/test_*.cpp` in VS Code
   - Run "Analyze Active File"
   - Check logs: `.vscode/logs.txt`
   - Check UI: CFG Visualization
   - Compare with: `markdowns/test_validation/test_*.md`
   - Document results in validation file

3. **Priority Order**:
   - **High Priority**: Core taint analysis tests
   - **Medium Priority**: Advanced features (path-sensitive, field-sensitive, flow-sensitive)
   - **Low Priority**: Edge cases and system features

4. **Update Validation Files**: After testing, update `markdowns/test_validation/test_*.md` files with actual results

5. **Update TEMP_VALIDATION.md**: Mark completed validations in the comprehensive test validation section

## Next Steps

After completing validation:
1. Update `TEMP_VALIDATION.md` with validation results
2. Document any bugs found
3. Create issues for bugs that need fixing
4. Update validation files with actual results
5. Complete comprehensive test validation for all 30 test files

---

## 🤖 Agent Instructions

**For AI Agents**: After completing any validation task:
- Update all relevant markdown files (see `AGENT_INSTRUCTIONS.md`)
- Update validation status, dates, and cross-references
- Keep documentation synchronized with codebase changes

