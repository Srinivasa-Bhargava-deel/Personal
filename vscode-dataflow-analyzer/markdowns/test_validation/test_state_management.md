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

## Notes
- State management is primarily tested through UI interactions
- Check `.vscode/dataflow-state.json` file for state persistence

