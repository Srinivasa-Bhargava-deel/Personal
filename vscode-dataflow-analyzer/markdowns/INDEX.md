# Markdown Documentation Index

This document provides an index of all markdown files organized in the `markdowns/` directory.

## Directory Structure

```
markdowns/
├── active/          # Current, actively maintained documentation
├── validation/      # Validation documentation and instructions
├── test_validation/ # Test validation files
├── archive/         # Historical/old documentation files
└── README.md        # This directory's README
```

## Active Documentation (`active/`)

Current documentation actively maintained:

- **CODE_STRUCTURE.md** - Code structure and architecture documentation
- **IMPLEMENTATION_GUIDE.md** - Implementation guide for developers
- **LOGIC.md** - Core logic and algorithms documentation

## Validation Documentation (`validation/`)

Validation-related documentation:

### Agent Instructions
- **AGENT_INSTRUCTIONS.md** - **File update protocol for AI agents** - Instructions for updating markdown files after completing tasks

### Core Validation Files
- **FINAL_VALIDATION_INSTRUCTIONS.md** - Complete merged validation instructions (START HERE)
- **VALIDATION_INSTRUCTIONS.md** - Step-by-step validation instructions
- **VALIDATION_PROCESS.md** - Comprehensive validation process guide
- **TEMP_VALIDATION.md** - Current validation checklist (merged with bug report)
- **START_VALIDATION.md** - Quick start guide for validation
- **LOGICAL_BUGS.md** - Detailed bug report (merged into TEMP_VALIDATION.md)

### Validation Results (Historical)
- **ERROR_ANALYSIS.md** - Error analysis from validation
- **VALIDATION_AND_FIXES.md** - Validation results and fixes
- **VALIDATION_RESULTS.md** - Validation results
- **VALIDATION_SUMMARY.md** - Validation summary
- **FINAL_VALIDATION_AND_FIXES.md** - Final validation and fixes
- **FINAL_VALIDATION_RESULTS.md** - Final validation results
- **VALIDATION_CHECKLIST.md** - Validation checklist
- **EXPECTED_OUTPUT_test_control_dependent_returns.md** - Expected output for test file
- **DRY_RUN_ANALYSIS.md** - Dry run analysis results

## Test Validation (`test_validation/`)

Expected results and validation documentation for each test file:

- **README.md** - Test validation overview
- **test_*.md** - Expected results for each test file (30 files)

See `test_validation/README.md` for complete list.

## Archive (`archive/`)

Historical and old documentation files:

### Version-Specific Documentation
- **FIXES_v1.9.0.md** - Fixes for version 1.9.0
- **FIXES_v1.9.1.md** - Fixes for version 1.9.1
- **TASK_14_ENHANCEMENTS_v1.8.2.md** - Enhancements for version 1.8.2
- **COMPLETION_SUMMARY_v1.8.2.md** - Completion summary for version 1.8.2
- **CODEBASE_REVIEW_v1.8.2.md** - Codebase review for version 1.8.2
- **TESTING_FRAMEWORK_v1.9.0.md** - Testing framework for version 1.9.0
- **WINDOWS_BUILD_INSTRUCTIONS_v1.9.1.md** - Windows build instructions for version 1.9.1

### Planning Documents
- **PLAN_RECURSIVE_CONTROL_TAINTING.md** - Plan for recursive control tainting
- **PLAN_TAINT_SENSITIVITY_LEVELS.md** - Plan for taint sensitivity levels
- **TASK31.md** - Task 31 documentation

### Other Historical Files
- **TESTING_FRAMEWORK_SUMMARY.md** - Testing framework summary
- **TESTING_AND_VALIDATION_SUMMARY.md** - Testing and validation summary
- **VISUALIZATION_DATA_SENSITIVITY_TESTING_FRAMEWORK.md** - Visualization testing framework
- **CLICK_ME.md** - Old click me file
- **critic.md** - Critic documentation
- **presentation_text.md** - Presentation text
- **FUTURE_PLANS.md** - Future plans (old)
- **FRAMEWORK.md** - Framework documentation (from md_files/)
- **PLAN_FOR0a.md** - Plan for 0a (from md_files/)
- **TO_DO.md** - Old to-do list (from md_files/)
- **FUTURE_PLANS.md** - Future plans (from md_files/)

## Files Not Moved

The following markdown files remain in their original locations:

- **README.md** - Root directory (standard location for project README)
- **CHANGELOG.md** - Root directory (standard location for changelog)
- **tests/README.md** - Tests directory (co-located with test files)
- **cpp-tools/cfg-exporter/README.md** - Tool-specific README (co-located with tool)

## Quick Reference

### Starting Validation
1. Read `validation/START_VALIDATION.md`
2. Follow `validation/VALIDATION_INSTRUCTIONS.md`
3. Check `validation/TEMP_VALIDATION.md` for checklist

### Finding Test Validation
- All test validation files: `test_validation/test_*.md`
- Overview: `test_validation/README.md`

### Finding Current Documentation
- Code structure: `active/CODE_STRUCTURE.md`
- Implementation: `active/IMPLEMENTATION_GUIDE.md`
- Logic: `active/LOGIC.md`

### Finding Historical Documentation
- All archived files: `archive/`
- Version-specific: Look for version numbers in filenames

## Last Updated

This index was last updated when markdown files were reorganized into the `markdowns/` directory structure.

