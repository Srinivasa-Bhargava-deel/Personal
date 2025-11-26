# Validation Process Guide

This document provides a comprehensive guide for validating all test files and features.

## Overview

The validation process involves:
1. **Individual Feature Validation** - Validate specific features from `TEMP_VALIDATION.md`
2. **Comprehensive Test Validation** - Validate all 30 test files in `tests/` directory
3. **Documentation Updates** - Update validation files with actual results

## Step-by-Step Process

### Phase 1: Individual Feature Validation

Follow `markdowns/validation/VALIDATION_INSTRUCTIONS.md` to validate items 1-12 in `markdowns/validation/TEMP_VALIDATION.md`:
- Output count validation
- Block 2 taint detection
- Return value analysis
- Coloring consistency
- Synthetic taint detection
- Variable labels
- Re-analyze button visibility
- State source indicator
- Log validation
- Expected vs actual output comparison
- Sensitivity level impact
- Function count validation

**Time Estimate**: 2-3 hours

### Phase 2: Comprehensive Test Validation

Validate all 30 test files using their validation files:

#### Step 1: Prepare Environment
```bash
# Clear logs
rm .vscode/logs.txt

# Set sensitivity to MAXIMUM
# VS Code Settings → dataflowAnalyzer.taintSensitivity → "maximum"
```

#### Step 2: Validate Each Test File

For each test file in `tests/`:

1. **Open Test File**: `tests/test_*.cpp`
2. **Run Analysis**: `Cmd+Shift+P` → "Dataflow Analyzer: Analyze Active File"
3. **Check Logs**: Open `.vscode/logs.txt` and search for relevant messages
4. **Check UI**: Open CFG Visualization and verify:
   - CFG Tab: Block colors, taint types
   - Taint Analysis Tab: Tainted variables, vulnerabilities
   - Interconnected CFG Tab: Legend counts
   - Return Value Analysis Tab: Return statements with taint badges
5. **Compare Results**: Use `markdowns/test_validation/test_*.md` for expected results
6. **Document**: Update validation file with actual results

#### Step 3: Priority Order

**High Priority** (Critical Functionality - 4 tests):
1. `test_control_dependent_returns.cpp` - PRIMARY TEST
2. `test_taint_rd.cpp` - Basic taint propagation
3. `test_taint_sensitivity_levels.cpp` - All sensitivity levels
4. `test_synthetic_taint_comprehensive.cpp` - Comprehensive synthetic taint

**Medium Priority** (Advanced Features - 7 tests):
5. `test_sanitization.cpp` - Sanitization detection
6. `test_path_sensitive.cpp` - Path-sensitive analysis
7. `test_field_sensitive.cpp` - Field-sensitive analysis
8. `test_flow_sensitive.cpp` - Flow-sensitive analysis
9. `test_call_graph.cpp` - Function pointer resolution
10. `test_interprocedural.cpp` - Inter-procedural analysis
11. `test_arithmetic_taint.cpp` - Arithmetic propagation

**Low Priority** (System Features & Edge Cases - 16 tests):
12-30. Remaining test files

**Time Estimate**: 4-6 hours for all tests

### Phase 3: Documentation Updates

After validation:
1. Update `TEMP_VALIDATION.md` with validation results
2. Update `tests_validation/*.md` files with actual results
3. Document any bugs or discrepancies
4. Create summary report

## Validation Checklist Template

For each test file, use this checklist:

```markdown
### test_*.cpp

**Status**: [ ] PASSED / [ ] FAILED / [ ] PARTIAL

**Test Date**: [Date]

**Sensitivity Level**: [MINIMAL/CONSERVATIVE/BALANCED/PRECISE/MAXIMUM]

**Actual Results**:
- Functions: [count]
- Blocks: [count]
- Data-flow Taint: [count]
- Control-dependent Taint: [count]
- Mixed Taint: [count]
- Synthetic Taint: [count]
- Normal Blocks: [count]

**Expected Results** (from validation file):
- [Expected counts]

**Discrepancies**:
- [List any discrepancies]

**Issues Found**:
- [List any bugs or issues]

**Notes**:
[Any additional notes]
```

## Quick Reference

### Key Files
- `markdowns/validation/TEMP_VALIDATION.md` - List of validation items
- `markdowns/validation/VALIDATION_INSTRUCTIONS.md` - Detailed validation instructions
- `markdowns/test_validation/*.md` - Expected results for each test
- `.vscode/logs.txt` - Analysis logs

### Key Commands
- Analyze Active File: `Cmd+Shift+P` → "Dataflow Analyzer: Analyze Active File"
- Analyze Workspace: `Cmd+Shift+P` → "Dataflow Analyzer: Analyze Workspace"
- Show CFG: `Cmd+Shift+P` → "Dataflow Analyzer: Show CFG Visualization"
- Delete State: `Cmd+Shift+P` → "Dataflow Analyzer: Delete State and Re-Analyze"

### Key Settings
- Sensitivity Level: VS Code Settings → `dataflowAnalyzer.taintSensitivity`
- Available levels: `minimal`, `conservative`, `balanced`, `precise`, `maximum`

## Tips

1. **Start with High Priority**: Validate critical functionality first
2. **Use MAXIMUM Sensitivity**: For comprehensive validation, use MAXIMUM sensitivity
3. **Clear State**: Use "Delete State and Re-Analyze" for fresh analysis
4. **Check Logs**: Always check `.vscode/logs.txt` for detailed information
5. **Screenshot**: Take screenshots of UI output for comparison
6. **Document**: Document all findings immediately

## Common Issues

1. **Logs Empty**: Reload window to initialize logging
2. **Stale Data**: Clear state and re-analyze
3. **Wrong Sensitivity**: Check settings and re-analyze
4. **Missing Features**: Ensure sensitivity level is high enough

## Next Steps After Validation

1. Fix any bugs found during validation
2. Update validation files with actual results
3. Create summary report
4. Update `TEMP_VALIDATION.md` with completion status

---

## 🤖 Agent Instructions

**For AI Agents**: After completing validation:
- Update all relevant markdown files (see `AGENT_INSTRUCTIONS.md`)
- Update validation status in `TEMP_VALIDATION.md`
- Update test results in `markdowns/test_validation/*.md`
- Update `CHANGELOG.md` for significant changes
- Keep documentation synchronized with codebase

