# Dataflow Analyzer Test Suite

This folder contains C++ test files designed to validate all features of the VSCode Dataflow Analyzer extension.

## Test File Organization

| File | Feature Tested | Key Tests |
|------|---------------|-----------|
| `test_cfg_basic.cpp` | CFG Generation | Basic blocks, conditionals, loops, nested structures |
| `test_liveness.cpp` | Liveness Analysis | Variable liveness, dead code, live ranges |
| `test_reaching_definitions.cpp` | Reaching Definitions | Definition propagation, kills, multiple paths |
| `test_taint_rd.cpp` | Basic Taint Propagation | Sources, sinks, propagation with RD |
| `test_taint_dataflow.cpp` | Data-flow Taint | Sources, sinks, propagation, sanitization |
| `test_taint_control_dependent.cpp` | Control-dependent Taint | Implicit flows, nested conditions |
| `test_control_dependent_returns.cpp` | Synthetic Taint | Return statements, control-dependent blocks |
| `test_taint_sensitivity_levels.cpp` | Sensitivity Levels | MINIMAL to MAXIMUM behavior |
| `test_sanitization.cpp` | Sanitization | Input validation, encoding, escaping, length limits |
| `test_path_sensitive.cpp` | Path-Sensitive Analysis | PRECISE/MAXIMUM path sensitivity |
| `test_field_sensitive.cpp` | Field-Sensitive Analysis | PRECISE/MAXIMUM field-level tracking |
| `test_flow_sensitive.cpp` | Flow-Sensitive Analysis | MAXIMUM statement order awareness |
| `test_synthetic_taint_comprehensive.cpp` | Synthetic Taint | Comprehensive synthetic taint scenarios |
| `test_interprocedural.cpp` | Inter-procedural Analysis | Parameter passing, return values |
| `test_interprocedural_taint.cpp` | Inter-procedural Taint | Cross-function taint propagation |
| `test_call_graph.cpp` | Call Graph | Function calls, recursion, external calls, function pointers |
| `test_complex_calls.cpp` | Complex Calls | Nested calls, callbacks, variadic functions |
| `test_global_variables.cpp` | Global Variables | Global variable tracking, cross-function globals |
| `test_function_summaries.cpp` | Function Summaries | Library function modeling, parameter effects |
| `test_security_vulnerabilities.cpp` | Security Analysis | Buffer overflow, injection, format strings |
| `test_attack_paths.cpp` | Attack Paths | Source-to-sink path visualization |
| `test_state_management.cpp` | State Management | Save/load state, state persistence |
| `test_incremental_analysis.cpp` | Incremental Analysis | File watchers, incremental updates |
| `test_visualization_features.cpp` | Visualization Features | Double-click, tabs, function selection |
| `test_edge_cases.cpp` | Edge Cases | Complex control flow, unusual patterns |
| `test_blue_edges.cpp` | Data Flow Edges | Reaching definitions visualization |
| `test_context_sensitive_taint.cpp` | Context-Sensitive | MAXIMUM context-sensitive analysis |
| `test_control_dependent_taint.cpp` | Control-Dependent | Control-dependent taint scenarios |
| `test_liveness_convergence.cpp` | Liveness Convergence | Fixed-point convergence |
| `test_arithmetic_taint.cpp` | Arithmetic Taint | Taint through arithmetic expressions |

## Color Coding Validation

When running the analyzer, verify blocks are colored correctly:
- **Yellow** (`#ffd60a`): Data-flow taint only (explicit propagation)
- **Orange** (`#ffa94d`): Control-dependent taint only (implicit flow)
- **Purple** (`#9d4edd`): Mixed taint (both data-flow and control-dependent)
- **Magenta** (`#c77dff`): Synthetic taint only (return statements without variables)
- **Light Blue** (`#e8f4f8`): Normal blocks (no taint)

## How to Use

1. Open any test file in VSCode with the extension active
2. Run the "Analyze Dataflow" command
3. Verify the visualization matches expected results documented in each file
4. Check tooltips for taint type information

## Expected Results

Each test file contains comments with:
- `// EXPECTED:` - What the analyzer should detect
- `// TAINT:` - Which variables should be tainted
- `// VULN:` - Expected vulnerabilities
- `// COLOR:` - Expected block coloring





