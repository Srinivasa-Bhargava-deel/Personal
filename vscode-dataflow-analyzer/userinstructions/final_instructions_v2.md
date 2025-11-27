# Final Instructions v2 - For User

**Version**: 2.0  
**Last Updated**: 2024-11-27  
**Purpose**: Pending instructions only (excludes completed/redundant items)

---

## 🔧 Debugging - Report Findings (PENDING)

### Check Developer Console
1. `Cmd+Shift+P` → `Developer: Toggle Developer Tools` → Console tab
2. Look for: `=== EXTENSION ACTIVATION CALLED ===`, `=== COMMAND REGISTRATION COMPLETE ===`, `Found 8 commands`, `✅ All 8 commands registered successfully`

### Check Extension Host Log
1. `Cmd+Shift+P` → `Developer: Open Extension Host Log`
2. Look for: Errors loading extension, module loading errors, activation errors, "Cannot find module" errors

### Verify Extension Installation
1. `Cmd+Shift+X` → Search "C++ Dataflow Analyzer"
2. Check: Installed, Enabled, No error badges, No "Reload Required" messages

### Manual Command Test
1. `Cmd+Shift+P` → Type: `dataflowAnalyzer.analyzeWorkspace`
2. If appears: Commands ARE registered; If doesn't appear: Extension isn't activating

### Report Debugging Findings
Include: ✅/❌ for each checklist item, exact error messages, Developer Console output (relevant lines), Extension Host Log errors, results of diagnostic commands

---

## ✅ Validation - Critical Bug Fixes (Phase 0) - PENDING

**MUST DO FIRST** - Fix these 4 bugs before validation:

### Fix BUG-001 through BUG-004
**For each bug**:
1. Open file at specified line numbers:
   - BUG-001: `CFGVisualizer.ts` lines 674, 678, 683
   - BUG-002: `CFGVisualizer.ts` lines 1026, 1128
   - BUG-003: `ReachingDefinitionsAnalyzer.ts` lines 142-143, 161, 221, 413
   - BUG-004: `TaintAnalyzer.ts` line 1272
2. Review bug description in `markdowns/validation/TEMP_VALIDATION.md` Phase 10
3. Apply suggested fix
4. Test the fix
5. Mark as fixed in `TEMP_VALIDATION.md`

---

## ✅ Validation - Environment Setup

### Prepare Environment
1. Clear logs: `rm .vscode/logs.txt` OR reload VS Code window: `Cmd+Shift+P` → "Developer: Reload Window"

### Configure Settings
1. Open VS Code Settings
2. Set `dataflowAnalyzer.taintSensitivity` to `maximum` (recommended)
3. Options: `minimal`, `conservative`, `balanced`, `precise`, `maximum`

---

## ✅ Validation - Test File Process (PENDING)

### Validate a Test File (General Process)
1. Open `tests/test_*.cpp` in VS Code
2. Set sensitivity to MAXIMUM: Settings → `dataflowAnalyzer.taintSensitivity` → `maximum`
3. Run: `Cmd+Shift+P` → "Dataflow Analyzer: Analyze Active File"
4. Check logs: `.vscode/logs.txt`
5. Check UI: Open CFG Visualization
6. Compare: Use `markdowns/test_validation/test_*.md` for expected results
7. Document: Update validation file with actual results

### Test File Priority Order
**High Priority (4 tests)** - Do first: `test_control_dependent_returns.cpp` (PRIMARY), `test_taint_rd.cpp`, `test_taint_sensitivity_levels.cpp`, `test_synthetic_taint_comprehensive.cpp`  
**Then**: Medium Priority (10 tests) → Low Priority (16 tests)

### Validation Priority Order
1. Phase 0: Critical Bug Fixes (MUST DO FIRST)
2. Phase 1: Foundation - Core Dataflow Analyses
3. Phase 2: Taint Analysis Features
4. Phase 3: Inter-Procedural Analysis
5. Phase 4: Security Analysis
6. Phase 5: Visualization Features
7. Phase 6: State Management
8. Phase 7: Performance and Edge Cases
9. Phase 8: Integration Testing
10. Phase 9: Documentation Validation
11. Phase 10: Code Quality Validation

---

## ✅ Validation - Specific Test Validations (PENDING)

### CFG Generation (Phase 1.1) - `tests/test_cfg_basic.cpp`
1. Open file, set sensitivity MAXIMUM, run analysis
2. Open CFG Visualization
3. Verify: Entry/exit blocks, basic blocks, control flow edges, predecessors/successors, conditional blocks, loops, nested structures
4. Check logs: `.vscode/logs.txt` for CFG parsing messages

### Liveness Analysis (Phase 1.2) - `tests/test_liveness.cpp`
1. Run analysis
2. Check Parameters & Returns tab → Liveness section
3. Verify: Variables LIVE at use points, DEAD after last use, liveness propagates correctly, loop variables handled, analysis converges
4. Check logs: Search for `[Liveness]`

### Reaching Definitions (Phase 1.3) - `tests/test_reaching_definitions.cpp`
1. Run analysis
2. Check Parameters & Returns tab → Reaching Definitions section
3. Verify: Definitions reach uses, KILL sets eliminate prior definitions, multiple definitions reach merge points, loop definitions propagate, analysis converges
4. Check logs: Search for `[RD]` or `[ReachingDefinitions]`

### Basic Taint Propagation (Phase 2.1) - `tests/test_taint_rd.cpp`
1. Run analysis
2. Check Taint Analysis tab
3. Verify: Taint sources detected (scanf, gets, etc.), taint propagates through assignments/expressions/function calls, taint sinks detected (printf, strcpy, etc.), vulnerabilities detected (source-to-sink paths)
4. Check logs: Search for `[TaintAnalysis] [SOURCE]` and `[TaintAnalysis] [PROPAGATION]`

### Synthetic Taint - PRIMARY TEST (Phase 2.4) - `tests/test_control_dependent_returns.cpp`
1. Run "Analyze Active File"
2. Open CFG Visualization → Interconnected CFG tab
3. Check legend counts: Data-flow Taint (~12), Control-dependent Taint (~14), Mixed Taint (~3), Synthetic Taint (> 0), Normal Blocks (~40)
4. Select function `test_early_return_control_dependent`
5. Verify Block 2: Magenta (synthetic) or Orange (control-dependent), NOT Light Blue (normal)
6. Check Parameters & Returns tab → Return Value Analysis: All 3 returns (`return -1`, `return 0`, `return 1`) with "SYNTHETIC TAINT" badges and colored backgrounds (purple/magenta)
7. Check Inter-Procedural Taint tab: Shows "Block: 2" (NOT "Variable: __block_2__") with "SYNTHETIC" badge
8. Check logs: Search for `[TaintAnalysis] [ControlDependentTaint] ✅ Created CONTROL_DEPENDENT taint for block`, `__block_`, `[VizColors] Block 2 detected as synthetic taint`

### Taint Sensitivity Levels (Phase 2.8) - `tests/test_taint_sensitivity_levels.cpp`
1. Set sensitivity to MINIMAL, run analysis, record counts from Interconnected CFG tab
2. Change to CONSERVATIVE → Click re-analyze, record counts
3. Repeat for BALANCED, PRECISE, MAXIMUM
4. Verify: MINIMAL (only data-flow), CONSERVATIVE (control-dependent), BALANCED (inter-procedural), PRECISE (path-sensitive), MAXIMUM (all features)
5. Check logs: Search for `[SENSITIVITY]` and `[MAJOR EVENT] Sensitivity Change`

### Basic CFG Visualization (Phase 6.1) - `tests/test_cfg_basic.cpp`
1. Run analysis, open CFG Visualization
2. Verify: CFG structure displayed correctly, entry/exit blocks marked, control flow visible, block information displays correctly, click blocks shows detailed information

### Coloring Consistency (Phase 6.4) - `test_control_dependent_returns.cpp`
1. Run analysis, open CFG Visualization
2. Check CFG Tab: Count blocks of each color
3. Verify only 5 colors: Yellow (#ffd60a) - Data-flow, Orange (#ffa94d) - Control-dependent, Purple (#9d4edd) - Mixed, Magenta (#c77dff) - Synthetic, Light Blue (#e8f4f8) - Normal
4. Check Interconnected CFG Tab: Verify legend counts match actual colored blocks, no unexpected colors (dark green, etc.), colors consistent across tabs
5. Check logs: Search for `[VizColors]`

---

## 📊 Log Analysis Instructions (PENDING - When Pasting Logs)

### When Pasting Logs for Validation
**Automated 4-step process**:
1. Validate with validation MD files - Compare actual vs expected results
2. Note down other bugs/fixes to be made - Identify all issues from logs
3. Fix all of them robustly - Fix bugs in priority order (Critical → High → Moderate → Low)
4. Follow AGENT_INSTRUCTIONS - Update all relevant markdown files

### Identify Test File from Logs
1. Extract test file name from logs (search for `[FILE] Parsing file` or test file path)
2. Identify corresponding validation file: `markdowns/test_validation/test_*.md`
3. Identify phase in `TEMP_VALIDATION.md` where this test belongs

### Parse Actual Results from Logs
1. Function counts: `[SUMMARY] Total Functions:`
2. Node counts: `[SUMMARY] Total Nodes:`
3. Edge counts: `[SUMMARY] Total Edges:`
4. Taint counts: `[SENSITIVITY-CHECK]` or legend counts
5. Block colors: `[VizColors]`
6. Taint detection: `[TaintAnalysis]`

### Compare Actual vs Expected Results
**Checklist**: Function/Node/Edge counts match, Data-flow/Control-dependent/Mixed/Synthetic taint counts match, Block colors correct (only 5 colors), Taint sources/sinks detected correctly, Vulnerabilities detected correctly, Log messages show expected patterns

### Identify Bugs from Logs
1. Search for error patterns: `[ERROR]`, `[WARN]`, exception traces, failed assertions
2. Search for unexpected behavior: wrong counts, missing detections, false positives
3. Cross-reference with `markdowns/validation/LOGICAL_BUGS.md`
4. Document findings: Create list of bugs, categorize by severity (Critical, High, Moderate, Low), note root causes if identifiable from logs, reference specific log lines

### Fix Bugs in Priority Order
**Order**: Critical bugs first (crashes) → High priority (core functionality) → Moderate (specific features) → Low (minor issues)

---

## 📝 Documentation Updates (PENDING - After Testing/Fixing)

### Update Validation Files After Testing
1. Update `markdowns/test_validation/test_*.md` with actual results
2. Mark validation items as VALIDATED in `TEMP_VALIDATION.md`
3. Document any discrepancies
4. Note any bugs found
5. Update bug status in `LOGICAL_BUGS.md`

### Update Documentation After Bug Fixes
1. Update `TEMP_VALIDATION.md` - Mark bugs as FIXED
2. Update `LOGICAL_BUGS.md` - Update bug status
3. Update `CHANGELOG.md` - Add bug fix entry
4. Update `working_overview` - Update if architecture changed

---

## 📝 Reporting Instructions (PENDING)

### Report Validation Results
**Include**: Test file name, sensitivity level used, actual results (counts, colors, etc.), expected results (from validation file), discrepancies found, bugs found, status: PASSED/FAILED/PARTIAL

---

## 🔧 Useful Commands

### Clear Logs
```bash
rm .vscode/logs.txt
```

### Search Logs
```bash
grep "Total Functions:" .vscode/logs.txt
grep "Data-flow Taint\|Control-dependent Taint\|Mixed Taint\|Synthetic Taint" .vscode/logs.txt
grep "\[ERROR\]\|\[WARN\]" .vscode/logs.txt
grep "\[VizColors\]" .vscode/logs.txt
grep "\[TaintAnalysis\] \[SOURCE\]" .vscode/logs.txt
```

---

## ⌨️ VS Code Commands

### Developer Tools
- `Cmd+Shift+P` → `Developer: Toggle Developer Tools` - Console
- `Cmd+Shift+P` → `Developer: Open Extension Host Log` - Extension logs
- `Cmd+Shift+P` → `Developer: Reload Window` - Reload extension

### Extension Commands
- `Cmd+Shift+P` → "Dataflow Analyzer: Analyze Active File"
- `Cmd+Shift+P` → "Dataflow Analyzer: Analyze Workspace"
- `Cmd+Shift+P` → "Dataflow Analyzer: Show CFG Visualization"
- `Cmd+Shift+P` → "Dataflow Analyzer: Delete State and Re-Analyze"

### Extensions View
- `Cmd+Shift+X` - Extensions view

---

**Last Updated**: 2024-11-27  
**For**: Pending user instructions only (completed/redundant items removed)
