# Validation Checklist - Logical Order

This document provides a comprehensive, logically organized validation checklist for all features of the Dataflow Analyzer.

## Validation Organization

Validations are organized in logical order following the analysis pipeline:
1. **Foundation** - Core dataflow analyses (CFG, Liveness, Reaching Definitions)
2. **Taint Analysis** - Basic to advanced taint features
3. **Inter-Procedural Analysis** - Cross-function analysis
4. **Security** - Vulnerability detection
5. **Visualization** - UI and visualization features
6. **System** - State management and incremental analysis

---

## Phase 1: Foundation - Core Dataflow Analyses

### 1.1 CFG Generation
**Test File**: `tests/test_cfg_basic.cpp`  
**Status**: PENDING VALIDATION

**Validation Required**:
- [ ] Entry and exit blocks are correctly identified
- [ ] Basic blocks are correctly identified
- [ ] Control flow edges are correct
- [ ] Predecessors and successors are correct
- [ ] Conditional blocks are identified
- [ ] Loop structures are identified
- [ ] Nested structures are handled correctly

**Priority**: HIGH (Foundation for all other analyses)

---

### 1.2 Liveness Analysis
**Test File**: `tests/test_liveness.cpp`  
**Status**: PENDING VALIDATION

**Validation Required**:
- [ ] Variables are marked as LIVE at use points
- [ ] Variables are marked as DEAD after last use
- [ ] Liveness propagates correctly through control flow
- [ ] Loop variables are handled correctly
- [ ] Analysis converges (reaches fixed point)
- [ ] Completes in finite iterations
- [ ] UI displays liveness information correctly

**Priority**: HIGH (Core backward dataflow analysis)

---

### 1.3 Reaching Definitions Analysis
**Test File**: `tests/test_reaching_definitions.cpp`  
**Status**: PENDING VALIDATION

**Validation Required**:
- [ ] Definitions reach uses correctly
- [ ] KILL sets eliminate prior definitions
- [ ] Multiple definitions from different paths both reach merge points
- [ ] Loop definitions propagate correctly
- [ ] Analysis converges (reaches fixed point)
- [ ] UI displays RD information correctly
- [ ] RD data is passed to taint analysis correctly

**Priority**: HIGH (Core forward dataflow analysis, required for taint)

---

## Phase 2: Taint Analysis - Basic to Advanced

### 2.1 Basic Taint Propagation
**Test File**: `tests/test_taint_rd.cpp`  
**Status**: PENDING VALIDATION

**Validation Required**:
- [ ] Taint sources are detected (scanf, gets, etc.)
- [ ] Taint propagates through assignments (`y = x`)
- [ ] Taint propagates through expressions (`z = x + y`)
- [ ] Taint propagates through function calls
- [ ] Taint sinks are detected (printf, strcpy, etc.)
- [ ] Vulnerabilities are detected (source-to-sink paths)
- [ ] RD information is used correctly for taint propagation

**Priority**: HIGH (Foundation of taint analysis)

---

### 2.2 Data-Flow Taint
**Test File**: `tests/test_taint_dataflow.cpp`  
**Status**: PENDING VALIDATION

**Validation Required**:
- [ ] All taint source types are detected:
  - [ ] User input (scanf, gets, fgets)
  - [ ] File I/O (fread, fscanf)
  - [ ] Network (recv, read)
  - [ ] Environment (getenv)
  - [ ] Command line (argv)
- [ ] Taint propagates through all assignment types
- [ ] Taint propagates through arithmetic operations
- [ ] Taint propagates through function calls
- [ ] Taint labels are correctly assigned (USER_INPUT, FILE_CONTENT, etc.)
- [ ] Blocks are colored yellow (data-flow taint)

**Priority**: HIGH (Core taint feature)

---

### 2.3 Control-Dependent Taint
**Test File**: `tests/test_taint_control_dependent.cpp`  
**Status**: PENDING VALIDATION

**Validation Required**:
- [ ] Variables defined in branches with tainted conditions are marked control-dependent
- [ ] Variables used in return statements in branches are marked control-dependent
- [ ] Blocks following conditional blocks with tainted conditions are detected
- [ ] Nested conditionals are handled correctly
- [ ] Blocks are colored orange (control-dependent taint)
- [ ] CONTROL_DEPENDENT label is correctly assigned

**Priority**: HIGH (Critical implicit flow detection)

---

### 2.4 Synthetic Taint (Return Statements)
**Test File**: `tests/test_control_dependent_returns.cpp`  
**Status**: PENDING VALIDATION

**Validation Required**:
- [ ] Return statements without variables (`return 1;`) create synthetic taint
- [ ] Return statements in control-dependent branches are detected
- [ ] Synthetic variables (`__block_{blockId}__`) are created correctly
- [ ] Blocks with synthetic taint are colored magenta
- [ ] Return Value Analysis tab shows synthetic taint badges
- [ ] Interconnected taint tab shows "Block: X" not "Variable: __block_X__"
- [ ] All return statements in `test_early_return_control_dependent` are detected:
  - [ ] `return -1;` (block 4)
  - [ ] `return 0;` (block 2)
  - [ ] `return 1;` (block 1)

**Priority**: CRITICAL (Primary test for synthetic taint)

**Specific Validation Items**:
- [ ] Block 2 taint detection - verify block 2 is correctly identified as tainted
- [ ] Return value analysis - verify all return statements appear with correct badges
- [ ] Coloring consistency - verify only 5 colors appear (Yellow, Orange, Purple, Magenta, Light Blue)
- [ ] Synthetic taint detection logic - verify synthetic variables are created
- [ ] Variable labels - verify correct labels in interconnected taint tab

---

### 2.5 Comprehensive Synthetic Taint
**Test File**: `tests/test_synthetic_taint_comprehensive.cpp`  
**Status**: PENDING VALIDATION

**Validation Required**:
- [ ] Multiple return statements have synthetic taint
- [ ] Return with expression is control-dependent (not synthetic)
- [ ] Switch returns have synthetic taint
- [ ] Nested returns have synthetic taint
- [ ] Loop returns are handled correctly
- [ ] Synthetic taint count > 0 in legend

**Priority**: HIGH (Comprehensive synthetic taint coverage)

---

### 2.6 Arithmetic Taint Propagation
**Test File**: `tests/test_arithmetic_taint.cpp`  
**Status**: PENDING VALIDATION

**Validation Required**:
- [ ] Arithmetic expressions (`n-1`, `n+1`, `n*2`) propagate taint
- [ ] Parameter taint propagation works (`n-1` -> `helper_function.x`)
- [ ] Recursive calls propagate taint (`fibonacci(n-1)`, `fibonacci(n-2)`)
- [ ] Multiple arithmetic operations propagate taint (`user_input + 5 - 2`)
- [ ] Inter-procedural taint analysis shows parameter flows
- [ ] Return value taint analysis shows recursive propagation

**Priority**: MEDIUM (Important for real-world code)

---

### 2.7 Sanitization Detection
**Test File**: `tests/test_sanitization.cpp`  
**Status**: PENDING VALIDATION

**Validation Required**:
- [ ] Input validation stops taint propagation
- [ ] Encoding sanitization stops taint propagation (HTML encoding)
- [ ] Escaping sanitization stops taint propagation (SQL escaping)
- [ ] Length limits stop taint propagation
- [ ] Type conversion stops taint propagation
- [ ] Whitelist filtering stops taint propagation
- [ ] Partial sanitization works correctly (some paths sanitized)
- [ ] No vulnerabilities detected for sanitized variables

**Priority**: HIGH (Critical for reducing false positives)

---

### 2.8 Taint Sensitivity Levels
**Test File**: `tests/test_taint_sensitivity_levels.cpp`  
**Status**: PENDING VALIDATION

**Validation Required**:
- [ ] MINIMAL level only shows data-flow taint (yellow)
- [ ] CONSERVATIVE level shows control-dependent taint (orange)
- [ ] BALANCED level shows inter-procedural taint
- [ ] PRECISE level shows path-sensitive analysis
- [ ] MAXIMUM level shows all features enabled:
  - [ ] Control-dependent taint
  - [ ] Recursive propagation
  - [ ] Path-sensitive analysis
  - [ ] Field-sensitive analysis
  - [ ] Context-sensitive analysis
  - [ ] Flow-sensitive analysis
- [ ] Sensitivity dropdown works correctly
- [ ] Re-analysis triggers when sensitivity changes
- [ ] Visualization updates with new sensitivity

**Priority**: CRITICAL (Core feature configuration)

---

## Phase 3: Advanced Taint Analysis

### 3.1 Path-Sensitive Analysis
**Test File**: `tests/test_path_sensitive.cpp`  
**Status**: PENDING VALIDATION

**Validation Required**:
- [ ] Path-sensitive analysis works (PRECISE/MAXIMUM sensitivity)
- [ ] Blocks after merge points are NOT control-dependent
- [ ] Blocks in branches ARE control-dependent
- [ ] False positives are reduced compared to non-path-sensitive
- [ ] Nested conditionals are handled correctly
- [ ] Loops are handled correctly
- [ ] Multiple merge points are handled correctly

**Priority**: MEDIUM (Requires PRECISE/MAXIMUM sensitivity)

---

### 3.2 Field-Sensitive Analysis
**Test File**: `tests/test_field_sensitive.cpp`  
**Status**: PENDING VALIDATION

**Validation Required**:
- [ ] Field-sensitive analysis works (PRECISE/MAXIMUM sensitivity)
- [ ] Individual struct fields are tracked separately
- [ ] Tainting one field doesn't taint other fields
- [ ] Field-level taint propagates correctly
- [ ] Nested struct fields are tracked correctly
- [ ] UI shows field-level variables (e.g., `user.name`, not just `user`)

**Priority**: MEDIUM (Requires PRECISE/MAXIMUM sensitivity)

---

### 3.3 Flow-Sensitive Analysis
**Test File**: `tests/test_flow_sensitive.cpp`  
**Status**: PENDING VALIDATION

**Validation Required**:
- [ ] Flow-sensitive analysis works (MAXIMUM sensitivity only)
- [ ] Statement order affects taint propagation
- [ ] Variables are tainted only after taint source assignment
- [ ] Re-assignments overwrite taint correctly
- [ ] Conditional re-assignments track paths correctly
- [ ] Loop iterations accumulate taint correctly

**Priority**: MEDIUM (Requires MAXIMUM sensitivity)

---

### 3.4 Context-Sensitive Analysis
**Test File**: `tests/test_context_sensitive_taint.cpp`  
**Status**: PENDING VALIDATION

**Validation Required**:
- [ ] Context-sensitive analysis works (MAXIMUM sensitivity)
- [ ] Same function called from different contexts produces different results
- [ ] Taint propagation is context-aware
- [ ] k-limited context tracking distinguishes call sites

**Priority**: LOW (Requires MAXIMUM sensitivity, advanced feature)

---

## Phase 4: Inter-Procedural Analysis

### 4.1 Call Graph Construction
**Test File**: `tests/test_call_graph.cpp`  
**Status**: PENDING VALIDATION

**Validation Required**:
- [ ] All direct function calls are captured
- [ ] Recursive functions are identified correctly:
  - [ ] Direct recursion
  - [ ] Indirect recursion
  - [ ] Tail recursion
- [ ] Function pointer calls are resolved to target functions
- [ ] Callback functions are tracked correctly
- [ ] External function calls are marked
- [ ] Call graph visualization shows all relationships
- [ ] Function call edges appear in interconnected CFG

**Priority**: HIGH (Foundation for IPA)

---

### 4.2 Complex Function Calls
**Test File**: `tests/test_complex_calls.cpp`  
**Status**: PENDING VALIDATION

**Validation Required**:
- [ ] Nested calls are tracked correctly
- [ ] Callbacks are tracked correctly
- [ ] Function pointers are resolved
- [ ] Variadic functions are handled
- [ ] Indirect calls are resolved

**Priority**: MEDIUM (Important for real-world code)

---

### 4.3 Inter-Procedural Taint Analysis
**Test File**: `tests/test_interprocedural.cpp`  
**Status**: PENDING VALIDATION

**Validation Required**:
- [ ] Parameter taint propagation works
- [ ] Return value taint propagation works
- [ ] Global variable taint propagation works
- [ ] Inter-procedural paths are tracked correctly
- [ ] Parameter mapping is correct (7 derivation types)
- [ ] Return value tracking is correct (6 return types)

**Priority**: HIGH (Critical for real-world analysis)

---

### 4.4 Inter-Procedural Taint Scenarios
**Test File**: `tests/test_interprocedural_taint.cpp`  
**Status**: PENDING VALIDATION

**Validation Required**:
- [ ] Parameter taint flows are detected
- [ ] Return value taint flows are detected
- [ ] Call chain taint flows are tracked
- [ ] Recursive taint propagation works
- [ ] Inter-procedural taint tab shows all flows

**Priority**: MEDIUM (Comprehensive IPA scenarios)

---

### 4.5 Global Variable Handling
**Test File**: `tests/test_global_variables.cpp`  
**Status**: PENDING VALIDATION

**Validation Required**:
- [ ] Global variables are tracked across function boundaries
- [ ] Taint propagates through global variables
- [ ] Global variable definitions reach uses in other functions
- [ ] Multiple global variables are tracked separately
- [ ] Global arrays are tracked element-wise
- [ ] Global variables in control flow create control-dependent taint

**Priority**: MEDIUM (Important IPA feature)

---

### 4.6 Function Summaries
**Test File**: `tests/test_function_summaries.cpp`  
**Status**: PENDING VALIDATION

**Validation Required**:
- [ ] printf summary models format string usage
- [ ] scanf summary models destination tainting
- [ ] strcpy summary models source-to-destination propagation
- [ ] malloc summary models return value tracking
- [ ] free summary models memory deallocation
- [ ] memcpy summary models memory copying
- [ ] system summary models command execution
- [ ] External functions are identified correctly
- [ ] Vulnerabilities are detected based on function summaries

**Priority**: MEDIUM (Important for accurate analysis)

---

## Phase 5: Security Vulnerability Detection

### 5.1 Security Vulnerabilities
**Test File**: `tests/test_security_vulnerabilities.cpp`  
**Status**: PENDING VALIDATION

**Validation Required**:
- [ ] SQL injection vulnerabilities are detected
- [ ] Buffer overflow vulnerabilities are detected
- [ ] Format string vulnerabilities are detected
- [ ] Command injection vulnerabilities are detected
- [ ] Path traversal vulnerabilities are detected
- [ ] Use-after-free vulnerabilities are detected
- [ ] Double free vulnerabilities are detected
- [ ] Uninitialized variable usage is detected
- [ ] Attack paths are shown correctly
- [ ] Source-to-sink paths are highlighted
- [ ] Vulnerability severity is displayed
- [ ] CWE information is displayed

**Priority**: CRITICAL (Core security feature)

---

### 5.2 Attack Path Visualization
**Test File**: `tests/test_attack_paths.cpp`  
**Status**: PENDING VALIDATION

**Validation Required**:
- [ ] Simple attack paths are identified
- [ ] Multi-step attack paths are identified
- [ ] SQL injection paths are identified
- [ ] Buffer overflow paths are identified
- [ ] Command injection paths are identified
- [ ] Paths with control flow are identified
- [ ] Inter-procedural paths are identified
- [ ] Paths are highlighted in visualization
- [ ] Source and sink blocks are visually distinct
- [ ] Path highlighting is interactive

**Priority**: HIGH (Critical visualization feature)

---

## Phase 6: Visualization Features

### 6.1 Basic CFG Visualization
**Test File**: `tests/test_cfg_basic.cpp` (also covers visualization)  
**Status**: PENDING VALIDATION

**Validation Required**:
- [ ] CFG structure is displayed correctly
- [ ] Entry and exit blocks are marked
- [ ] Control flow is visible
- [ ] Block information displays correctly
- [ ] Click blocks shows detailed information

**Priority**: HIGH (Core visualization)

---

### 6.2 Data Flow Edge Visualization
**Test File**: `tests/test_blue_edges.cpp`  
**Status**: PENDING VALIDATION

**Validation Required**:
- [ ] Data flow edges are shown correctly (orange)
- [ ] Edge toggle works
- [ ] Edge counts match expected values
- [ ] Edges connect definitions to uses correctly

**Priority**: MEDIUM (Visualization feature)

---

### 6.3 Visualization UI Features
**Test File**: `tests/test_visualization_features.cpp`  
**Status**: PENDING VALIDATION

**Validation Required**:
- [ ] Double-clicking blocks opens file at correct line
- [ ] Tab switching works correctly:
  - [ ] CFG Tab
  - [ ] Call Graph Tab
  - [ ] Taint Analysis Tab
  - [ ] Inter-Procedural Taint Tab
  - [ ] Parameters & Returns Tab
  - [ ] Interconnected CFG Tab
- [ ] Function dropdown shows all functions
- [ ] Function selection updates visualization
- [ ] Re-analyze button visible on ALL tabs
- [ ] Re-analyze button works on all tabs
- [ ] Block information displays correctly

**Priority**: HIGH (User experience)

---

### 6.4 Coloring Consistency
**Status**: PENDING VALIDATION

**Validation Required**:
- [ ] Only 5 colors appear in visualization:
  - [ ] Yellow (#ffd60a) - Data-flow taint only
  - [ ] Orange (#ffa94d) - Control-dependent taint only
  - [ ] Purple (#9d4edd) - Mixed taint
  - [ ] Magenta (#c77dff) - Synthetic taint only
  - [ ] Light Blue (#e8f4f8) - Normal blocks
- [ ] No "random" colors appear (dark green, etc.)
- [ ] Legend counts match actual colored blocks
- [ ] Interconnected CFG tab coloring matches single-function CFG tab
- [ ] Blocks with synthetic taint use magenta color

**Priority**: CRITICAL (Visual consistency)

---

## Phase 7: System Features

### 7.1 State Management
**Test File**: `tests/test_state_management.cpp`  
**Status**: PENDING VALIDATION

**Validation Required**:
- [ ] State is saved correctly to `.vscode/dataflow-state.json`
- [ ] State is loaded correctly on extension activation
- [ ] State source indicator shows "Saved State" when loaded from disk
- [ ] State source indicator shows "Current Analysis" for fresh analysis
- [ ] "Saved State" shows yellow background
- [ ] "Current Analysis" shows light blue background
- [ ] Timestamp appears for saved state
- [ ] No emojis appear in the indicator
- [ ] Clearing state removes saved state file
- [ ] State persists across extension restarts

**Priority**: HIGH (User experience)

---

### 7.2 Incremental Analysis
**Test File**: `tests/test_incremental_analysis.cpp`  
**Status**: PENDING VALIDATION

**Validation Required**:
- [ ] File changes trigger re-analysis automatically
- [ ] Only changed files are re-analyzed
- [ ] Analysis state updates incrementally
- [ ] File watchers detect changes correctly
- [ ] Visualization updates automatically

**Priority**: MEDIUM (Performance feature)

---

## Phase 8: Edge Cases and Convergence

### 8.1 Edge Cases
**Test File**: `tests/test_edge_cases.cpp`  
**Status**: PENDING VALIDATION

**Validation Required**:
- [ ] Empty functions are handled correctly
- [ ] Single-block functions are handled correctly
- [ ] Functions with no variables are handled correctly
- [ ] Complex control flow is analyzed correctly
- [ ] Unreachable code is handled
- [ ] Dead code is handled
- [ ] No crashes or errors occur

**Priority**: LOW (Edge case coverage)

---

### 8.2 Liveness Convergence
**Test File**: `tests/test_liveness_convergence.cpp`  
**Status**: PENDING VALIDATION

**Validation Required**:
- [ ] Analysis converges (reaches fixed point)
- [ ] Completes in finite iterations
- [ ] No infinite loops
- [ ] Maximum iteration limit is respected

**Priority**: LOW (Algorithm correctness)

---

## Phase 9: Output Validation

### 9.1 Output Count Validation
**Test File**: `tests/test_control_dependent_returns.cpp`  
**Status**: PENDING VALIDATION

**Validation Required**:
- [ ] Compare actual counts against expected counts
- [ ] Verify function count matches expected (13)
- [ ] Verify node count matches expected (69)
- [ ] Verify edge count matches expected (152)
- [ ] Verify data-flow taint count
- [ ] Verify control-dependent taint count
- [ ] Verify mixed taint count
- [ ] Verify synthetic taint count
- [ ] Verify normal blocks count
- [ ] Verify control flow edges count
- [ ] Verify function call edges count
- [ ] Verify data flow edges count
- [ ] Identify discrepancies and root causes

**Priority**: MEDIUM (Quantitative validation)

---

### 9.2 Log Validation
**Status**: PENDING VALIDATION

**Validation Required**:
- [ ] Review logs for taint analysis execution
- [ ] Check logs for synthetic taint creation messages
- [ ] Verify logs show correct sensitivity levels
- [ ] Check logs for block coloring decisions
- [ ] Validate logs show correct taint detection for all blocks
- [ ] Check logs for return value analysis taint marking
- [ ] Verify logs show state source (Saved State vs Current Analysis)
- [ ] Verify logs show major events (reanalyze clicked, cfg double clicked, sensitivity switched)

**Priority**: MEDIUM (Debugging aid)

---

### 9.3 Function Count Validation
**Test File**: `tests/test_control_dependent_returns.cpp`  
**Status**: PENDING VALIDATION

**Validation Required**:
- [ ] Verify only functions from test file appear when analyzing single file
- [ ] Verify workspace analysis includes all workspace functions
- [ ] Validate function list matches expected functions
- [ ] Check function filtering works correctly for "Analyze Active File" vs "Analyze Workspace"

**Priority**: LOW (Verification)

---

## Validation Summary

### By Priority

**CRITICAL** (Must validate first):
1. CFG Generation
2. Liveness Analysis
3. Reaching Definitions Analysis
4. Basic Taint Propagation
5. Control-Dependent Taint
6. Synthetic Taint (Return Statements)
7. Taint Sensitivity Levels
8. Security Vulnerabilities
9. Coloring Consistency

**HIGH** (Core features):
10. Data-Flow Taint
11. Comprehensive Synthetic Taint
12. Sanitization Detection
13. Call Graph Construction
14. Inter-Procedural Taint Analysis
15. Basic CFG Visualization
16. Visualization UI Features
17. State Management

**MEDIUM** (Important features):
18. Arithmetic Taint Propagation
19. Path-Sensitive Analysis
20. Field-Sensitive Analysis
21. Flow-Sensitive Analysis
22. Complex Function Calls
23. Inter-Procedural Taint Scenarios
24. Data Flow Edge Visualization
25. Incremental Analysis
26. Output Count Validation
27. Log Validation

**LOW** (Edge cases and verification):
28. Context-Sensitive Analysis
29. Edge Cases
30. Liveness Convergence
31. Function Count Validation

### Test Files Coverage

**Total Test Files**: 30
- ✅ All major features have test files
- ✅ All sensitivity levels have test files
- ✅ All visualization features have test files
- ✅ All system features have test files
- ✅ Global variable handling has test file
- ✅ Function summaries have test file
- ✅ Attack path visualization has test file

### Validation Process

1. **Start with CRITICAL priority items** - Validate foundation first
2. **Then HIGH priority items** - Validate core features
3. **Then MEDIUM priority items** - Validate advanced features
4. **Finally LOW priority items** - Validate edge cases

For each test file:
- Open `tests/test_*.cpp` in VS Code
- Run "Analyze Active File"
- Check logs in `.vscode/logs.txt`
- Check UI output in CFG Visualization
- Compare with expected results in `markdowns/test_validation/test_*.md`
- Document results

Use `markdowns/validation/VALIDATION_INSTRUCTIONS.md` for detailed step-by-step instructions.
