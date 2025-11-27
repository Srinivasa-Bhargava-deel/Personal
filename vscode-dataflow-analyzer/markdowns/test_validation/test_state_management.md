# Validation: test_state_management.cpp

## Test File Purpose
Tests save/load state functionality and state persistence. Validates state saving, loading, clearing, and state source tracking.

## Expected Behavior

### State Management
- State should be saved correctly to `.vscode/dataflow-state.json`
- State should be loaded correctly on extension activation
- State source indicator should show "Saved State" when loaded from disk
- State source indicator should show "Current Analysis" for fresh analysis
- Clearing state should remove saved state file

## Expected Logs

```
[StateManager] [SAVE] ✅ State saved successfully
[StateManager] [LOAD] ✅ State loaded successfully
[StateManager] [CLEAR] Clearing analysis state
[CFGViz] State source: Saved State / Current Analysis
```

## Expected UI Output

### State Source Indicator
- **Saved State**: Yellow background, shows timestamp
- **Current Analysis**: Light blue background, no timestamp

## Validation Checklist

- [ ] State is saved correctly
- [ ] State is loaded correctly
- [ ] State source indicator shows "Saved State" for loaded state
- [ ] State source indicator shows "Current Analysis" for fresh analysis
- [ ] Clearing state removes saved state file
- [ ] State persists across extension restarts

## Counterexamples Added

### Counterexample 1: State Management with Multiple Functions
- **Purpose**: Tests state persistence across multiple functions
- **Expected**: State should include all functions
- **Edge Case**: Multiple function state

### Counterexample 2: State Management with Global Variables
- **Purpose**: Tests state persistence with global variable analysis
- **Expected**: State should include global variable taint
- **Edge Case**: Global variable state

### Counterexample 3: State Management with Call Graph
- **Purpose**: Tests state persistence with call graph information
- **Expected**: State should include call graph
- **Edge Case**: Call graph state

### Counterexample 4: State Management with Taint Analysis
- **Purpose**: Tests state persistence with taint analysis results
- **Expected**: State should include taint information
- **Edge Case**: Taint analysis state

### Counterexample 5: State Management with Vulnerability Information
- **Purpose**: Tests state persistence with vulnerability information
- **Expected**: State should include vulnerability data
- **Edge Case**: Vulnerability state

## Validation Checklist

- [ ] State is saved correctly
- [ ] State is loaded correctly
- [ ] State source indicator shows "Saved State" for loaded state
- [ ] State source indicator shows "Current Analysis" for fresh analysis
- [ ] Clearing state removes saved state file
- [ ] State persists across extension restarts
- [ ] Multiple functions are included in state
- [ ] Global variables are included in state
- [ ] Call graph is included in state
- [ ] Taint analysis is included in state
- [ ] Vulnerability information is included in state

## Notes
- State management is primarily tested through UI interactions
- Check `.vscode/dataflow-state.json` file for state persistence
- Counterexamples test edge cases for state management

