# Test Validation Files

This directory contains validation documentation for all test C++ files in the `tests/` directory.

**Location**: `markdowns/test_validation/` (moved from `tests_validation/`)

## Purpose

Each validation file (`test_*.md`) documents:
1. **Expected Behavior**: What the test should detect/analyze
2. **Expected Logs**: What log messages should appear during analysis
3. **Expected UI Output**: What should appear in the visualization

## Test Files

### Core Analysis Tests
- `test_taint_rd.md` - Basic taint propagation with Reaching Definitions
- `test_liveness.md` - Liveness analysis (backward dataflow)
- `test_reaching_definitions.md` - Reaching Definitions analysis (forward dataflow)

### Taint Analysis Tests
- `test_control_dependent_returns.md` - Control-dependent taint with return statements (PRIMARY TEST)
- `test_arithmetic_taint.md` - Taint propagation through arithmetic expressions
- `test_taint_sensitivity_levels.md` - All 5 sensitivity levels
- `test_taint_control_dependent.md` - Control-dependent taint scenarios
- `test_taint_dataflow.md` - Data-flow taint scenarios

### Inter-Procedural Analysis Tests
- `test_interprocedural.md` - Inter-procedural taint analysis
- `test_interprocedural_taint.md` - Inter-procedural taint scenarios
- `test_call_graph.md` - Function call graph analysis
- `test_complex_calls.md` - Complex call scenarios
- `test_global_variables.md` - Global variable handling
- `test_function_summaries.md` - Function summaries for library functions

### Security Tests
- `test_security_vulnerabilities.md` - Security vulnerability detection
- `test_attack_paths.md` - Attack path visualization

### Advanced Taint Analysis Tests
- `test_sanitization.md` - Sanitization detection and taint stopping
- `test_path_sensitive.md` - Path-sensitive analysis (PRECISE/MAXIMUM)
- `test_field_sensitive.md` - Field-sensitive analysis (PRECISE/MAXIMUM)
- `test_flow_sensitive.md` - Flow-sensitive analysis (MAXIMUM only)
- `test_synthetic_taint_comprehensive.md` - Comprehensive synthetic taint tests

### System Features Tests
- `test_state_management.md` - Save/load state functionality
- `test_incremental_analysis.md` - File watchers and incremental updates
- `test_visualization_features.md` - UI features (double-click, tabs, etc.)

### Edge Cases
- `test_edge_cases.md` - Edge cases and corner cases
- `test_cfg_basic.md` - Basic CFG structure tests
- `test_blue_edges.md` - Data flow edge visualization
- `test_context_sensitive_taint.md` - Context-sensitive taint analysis
- `test_control_dependent_taint.md` - Control-dependent taint scenarios
- `test_liveness_convergence.md` - Liveness analysis convergence

## How to Use

1. **Run Analysis**: Open a test file in VS Code and run "Analyze Active File" or "Analyze Workspace"
2. **Check Logs**: Review `.vscode/logs.txt` for expected log messages
3. **Check UI**: Open CFG Visualization and verify expected output
4. **Compare**: Compare actual results with expected results in validation file

## Validation Process

For each test file:
1. Read the validation `.md` file
2. Run the analysis
3. Check logs match expected logs
4. Check UI output matches expected output
5. Verify all checklist items

## Priority Tests

### High Priority (Critical Functionality)
- `test_control_dependent_returns.md` - Tests synthetic taint, return value analysis
- `test_taint_rd.md` - Tests basic taint propagation
- `test_taint_sensitivity_levels.md` - Tests all sensitivity levels
- `test_synthetic_taint_comprehensive.md` - Comprehensive synthetic taint tests

### Medium Priority (Advanced Features)
- `test_call_graph.md` - Tests function pointer resolution
- `test_interprocedural.md` - Tests inter-procedural analysis
- `test_arithmetic_taint.md` - Tests arithmetic propagation
- `test_sanitization.md` - Tests sanitization detection
- `test_path_sensitive.md` - Tests path-sensitive analysis (PRECISE/MAXIMUM)
- `test_field_sensitive.md` - Tests field-sensitive analysis (PRECISE/MAXIMUM)
- `test_flow_sensitive.md` - Tests flow-sensitive analysis (MAXIMUM)

### Low Priority (System Features & Edge Cases)
- `test_state_management.md` - State save/load
- `test_incremental_analysis.md` - Incremental updates
- `test_visualization_features.md` - UI features
- `test_edge_cases.md` - Edge cases
- `test_cfg_basic.md` - Basic CFG structure

## Notes

- Some validation files may be incomplete - they serve as templates
- Actual counts may vary based on CFG structure from Clang
- Sensitivity level affects detection results
- Logs are cleared on extension host restart

