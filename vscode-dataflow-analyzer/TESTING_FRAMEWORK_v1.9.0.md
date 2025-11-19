# Testing Framework for v1.9.0 Features

## Overview

This document outlines the comprehensive testing framework for v1.9.0 features:
1. Recursive Control-Dependent Taint Propagation
2. 5 Configurable Taint Analysis Sensitivity Levels
3. Save State Functionality
4. Re-analyze Button
5. Enhanced Incremental Analysis

## Test Categories

### 1. Unit Tests

#### 1.1 TaintAnalyzer Tests

**Test: Control Dependency Graph Building**
- **Input**: Function CFG with if/else statements
- **Expected**: Correct identification of conditional blocks and control-dependent blocks
- **Sensitivity Levels**: Test all 5 levels
- **Validation**: Verify control dependency graph structure

**Test: Recursive Control-Dependent Taint Propagation**
- **Input**: Nested if statements with tainted conditions
- **Expected**: Taint propagates recursively through nested control structures
- **Sensitivity Levels**: BALANCED, PRECISE, MAXIMUM (should enable recursive)
- **Validation**: Verify taint reaches all control-dependent blocks

**Test: Path-Sensitive Analysis (PRECISE/MAXIMUM)**
- **Input**: Conditional with branches that don't all reach a block
- **Expected**: Only blocks reachable from some but not all branches are marked control-dependent
- **Sensitivity Levels**: PRECISE, MAXIMUM
- **Validation**: Verify path-sensitive detection reduces false positives

**Test: Field-Sensitive Analysis (PRECISE/MAXIMUM)**
- **Input**: Struct field access (e.g., `obj.field`)
- **Expected**: Taint tracked at field level, not struct level
- **Sensitivity Levels**: PRECISE, MAXIMUM
- **Validation**: Verify field-level taint tracking

**Test: Context-Sensitive Analysis (MAXIMUM)**
- **Input**: Function calls with different contexts
- **Expected**: k-limited context tracking distinguishes call sites
- **Sensitivity Levels**: MAXIMUM only
- **Validation**: Verify context-sensitive taint propagation

**Test: Flow-Sensitive Analysis (MAXIMUM)**
- **Input**: Statements in different orders
- **Expected**: Statement order affects taint propagation
- **Sensitivity Levels**: MAXIMUM only
- **Validation**: Verify flow-sensitive taint tracking

#### 1.2 StateManager Tests

**Test: State Serialization**
- **Input**: Complete AnalysisState object
- **Expected**: Proper JSON serialization (Maps → Arrays, Sets → Arrays)
- **Validation**: Verify all data structures serialize correctly

**Test: State Deserialization**
- **Input**: JSON state file
- **Expected**: Proper reconstruction of AnalysisState (Arrays → Maps, Arrays → Sets)
- **Validation**: Verify all data structures deserialize correctly

**Test: File Hash Computation**
- **Input**: C++ source file
- **Expected**: SHA-256 hash computed correctly
- **Validation**: Verify hash matches expected value

**Test: Incremental Analysis Detection**
- **Input**: File with same hash, file with different hash
- **Expected**: Unchanged file skipped, changed file re-analyzed
- **Validation**: Verify incremental analysis logic

**Test: Save States List Management**
- **Input**: Multiple save operations
- **Expected**: List maintained with metadata, max 50 entries
- **Validation**: Verify list structure and entry limits

#### 1.3 DataflowAnalyzer Tests

**Test: Sensitivity Configuration Update**
- **Input**: Change sensitivity level
- **Expected**: TaintAnalyzer recreated with new sensitivity
- **Validation**: Verify analyzer uses new sensitivity

**Test: Re-analysis Trigger**
- **Input**: Re-analyze command
- **Expected**: Full workspace re-analysis triggered
- **Validation**: Verify analysis completes with current settings

### 2. Integration Tests

#### 2.1 Sensitivity Level Integration

**Test: MINIMAL Level**
- **Setup**: Set sensitivity to MINIMAL
- **Input**: Code with control-dependent taint
- **Expected**: Only explicit data-flow taint detected
- **Validation**: No control-dependent taint in results

**Test: CONSERVATIVE Level**
- **Setup**: Set sensitivity to CONSERVATIVE
- **Input**: Code with nested if statements
- **Expected**: Basic control-dependent taint (direct branches only)
- **Validation**: No nested control-dependent taint

**Test: BALANCED Level**
- **Setup**: Set sensitivity to BALANCED
- **Input**: Code with nested control structures
- **Expected**: Full recursive control-dependent taint + inter-procedural
- **Validation**: All control-dependent taint detected

**Test: PRECISE Level**
- **Setup**: Set sensitivity to PRECISE
- **Input**: Code with path-sensitive scenarios
- **Expected**: Path-sensitive + field-sensitive analysis
- **Validation**: Reduced false positives compared to BALANCED

**Test: MAXIMUM Level**
- **Setup**: Set sensitivity to MAXIMUM
- **Input**: Complex code with multiple call sites
- **Expected**: Context-sensitive + flow-sensitive analysis
- **Validation**: Maximum precision achieved

#### 2.2 Save State Integration

**Test: Save State Workflow**
- **Steps**:
  1. Analyze workspace
  2. Click "Save State" button
  3. Verify state saved to `.vscode/dataflow-state.json`
  4. Verify entry added to `.vscode/save-states-list.json`
- **Validation**: Both files updated correctly

**Test: State Loading**
- **Steps**:
  1. Save state
  2. Restart extension
  3. Verify state loaded from disk
- **Validation**: State restored correctly, notification shown

**Test: Incremental Analysis Workflow**
- **Steps**:
  1. Analyze workspace (file A, file B)
  2. Modify file A only
  3. Save file A
  4. Verify only file A re-analyzed
- **Validation**: File B analysis preserved, file A re-analyzed

### 3. Manual Verification Tests

#### 3.1 Visualization Tests

**Test: Taint Color Coding**
- **Steps**:
  1. Analyze code with data-flow taint
  2. Analyze code with control-dependent taint
  3. Analyze code with mixed taint
- **Expected**:
  - Yellow blocks: Data-flow taint
  - Orange blocks (dashed border): Control-dependent taint
  - Purple blocks: Mixed taint
- **Validation**: Visual inspection of colors

**Test: Dynamic Block Sizing**
- **Steps**:
  1. View blocks with varying content
- **Expected**: Blocks resize based on content
- **Validation**: Visual inspection of block sizes

**Test: Edge Type Toggles**
- **Steps**:
  1. Toggle "Control Flow" OFF
  2. Toggle "Function Calls" OFF
  3. Toggle "Data Flow" OFF
- **Expected**: Only selected edge types hidden, nodes remain visible
- **Validation**: Visual inspection of edges

#### 3.2 Sensitivity Switching Tests

**Test: Sensitivity Dropdown**
- **Steps**:
  1. Change sensitivity dropdown
  2. Verify note updates: "Click 'Re-analyze' to apply"
  3. Click "Re-analyze" button
  4. Verify re-analysis triggered
- **Expected**: Re-analysis uses new sensitivity
- **Validation**: Check analysis results match sensitivity level

**Test: Re-analyze Button (All Tabs)**
- **Steps**:
  1. Switch to different tabs (CFG, Call Graph, etc.)
  2. Click "Re-analyze" button in header
  3. Verify re-analysis triggered
- **Expected**: Re-analysis works from all tabs
- **Validation**: Analysis completes successfully

### 4. Edge Case Tests

#### 4.1 Control-Dependent Taint Edge Cases

**Test: Empty Conditional**
- **Input**: `if (condition) { }`
- **Expected**: No control-dependent blocks
- **Validation**: No false positives

**Test: Nested Conditionals**
- **Input**: Nested if/else with 3+ levels
- **Expected**: Recursive propagation through all levels
- **Validation**: Taint reaches all nested blocks

**Test: Loop Control Dependencies**
- **Input**: `while (tainted_var) { ... }`
- **Expected**: Loop body marked control-dependent
- **Validation**: Correct control dependency detection

**Test: Switch Statements**
- **Input**: `switch (tainted_var) { case 1: ... case 2: ... }`
- **Expected**: All cases marked control-dependent
- **Validation**: Switch statement handling

#### 4.2 Sensitivity Level Edge Cases

**Test: Switching Between Levels**
- **Steps**:
  1. Analyze with MINIMAL
  2. Switch to MAXIMUM
  3. Re-analyze
  4. Switch back to MINIMAL
  5. Re-analyze
- **Expected**: Each level produces correct results
- **Validation**: Results match sensitivity level features

**Test: Invalid Sensitivity Value**
- **Input**: Invalid sensitivity string
- **Expected**: Defaults to PRECISE, error logged
- **Validation**: Graceful error handling

#### 4.3 State Management Edge Cases

**Test: Corrupted State File**
- **Steps**:
  1. Corrupt `.vscode/dataflow-state.json`
  2. Restart extension
- **Expected**: Graceful fallback to empty state
- **Validation**: No crashes, error logged

**Test: Missing State Directory**
- **Steps**:
  1. Delete `.vscode` directory
  2. Save state
- **Expected**: Directory created, state saved
- **Validation**: Files created successfully

**Test: Concurrent File Changes**
- **Steps**:
  1. Modify multiple files simultaneously
  2. Save all files
- **Expected**: All files re-analyzed correctly
- **Validation**: No race conditions, correct results

### 5. Performance Tests

#### 5.1 Analysis Performance

**Test: Large Codebase (MINIMAL)**
- **Input**: 100+ functions
- **Expected**: Fast analysis (< 5 seconds)
- **Validation**: Timing measurements

**Test: Large Codebase (MAXIMUM)**
- **Input**: 100+ functions
- **Expected**: Slower but accurate (< 30 seconds)
- **Validation**: Timing measurements, accuracy verification

**Test: Incremental Analysis Performance**
- **Steps**:
  1. Analyze large workspace
  2. Modify single file
  3. Measure re-analysis time
- **Expected**: Much faster than full analysis
- **Validation**: Performance improvement verified

#### 5.2 State Management Performance

**Test: Large State Serialization**
- **Input**: AnalysisState with 1000+ blocks
- **Expected**: Serialization completes in < 1 second
- **Validation**: Timing measurements

**Test: Large State Deserialization**
- **Input**: Large JSON state file (10+ MB)
- **Expected**: Deserialization completes in < 2 seconds
- **Validation**: Timing measurements

### 6. Academic Standards Validation

#### 6.1 Algorithm Correctness

**Test: Fixed-Point Convergence**
- **Input**: Various CFG structures
- **Expected**: All analyses converge within MAX_ITERATIONS
- **Validation**: No infinite loops, convergence verified

**Test: Control Dependency Correctness**
- **Input**: Standard test cases from academic papers
- **Expected**: Results match academic definitions
- **Validation**: Compare with published results

**Test: Path-Sensitive Correctness**
- **Input**: Path-sensitive test cases
- **Expected**: Only truly control-dependent blocks marked
- **Validation**: False positive rate reduction verified

#### 6.2 Reference Implementation Comparison

**Test: Comparison with Academic Papers**
- **Input**: Examples from Ferrante et al. (1987), Reps et al. (2003)
- **Expected**: Results match published algorithms
- **Validation**: Algorithm correctness verified

## Test Execution

### Automated Tests

Run unit tests:
```bash
npm test
```

### Manual Tests

1. **Sensitivity Level Testing**:
   - Test each sensitivity level with appropriate test cases
   - Verify features enabled/disabled correctly
   - Check analysis results match sensitivity level

2. **Visualization Testing**:
   - Verify color coding (yellow, orange, purple)
   - Test edge toggles
   - Verify dynamic block sizing
   - Test re-analyze button from all tabs

3. **State Management Testing**:
   - Test save state button
   - Verify save states list
   - Test incremental analysis
   - Test state loading

### Test Data

Test files are located in:
- `test_control_dependent_taint.cpp` - Control-dependent taint test cases
- Additional test files can be added as needed

## Success Criteria

### Functional Requirements
- ✅ All 5 sensitivity levels work correctly
- ✅ Recursive control-dependent taint propagation works
- ✅ Save state functionality works
- ✅ Re-analyze button works from all tabs
- ✅ Incremental analysis works correctly

### Performance Requirements
- ✅ MINIMAL level: < 5 seconds for 100 functions
- ✅ MAXIMUM level: < 30 seconds for 100 functions
- ✅ Incremental analysis: < 1 second for single file change

### Quality Requirements
- ✅ No crashes or errors
- ✅ Comprehensive logging (DEBUG, INFO, WARN, ERROR)
- ✅ Academic correctness verified
- ✅ All edge cases handled

## Test Results Tracking

Test results should be documented in:
- `TEST_RESULTS_v1.9.0.md` (to be created)
- Console logs for automated tests
- Manual test checklists

## Continuous Testing

- Run tests after each code change
- Verify all sensitivity levels after major changes
- Performance benchmarks should be tracked over time
- Edge case tests should be run before releases


