# Validation: test_taint_sensitivity_levels.cpp

## Test File Purpose
Tests all 5 taint analysis sensitivity levels. Each test case shows different behavior at different levels.

## Sensitivity Levels
1. **MINIMAL** - Only explicit data-flow (no control-dependent)
2. **CONSERVATIVE** - Basic control-dependent (no nested)
3. **BALANCED** - Full recursive control-dependent + inter-procedural
4. **PRECISE** - Path-sensitive + field-sensitive
5. **MAXIMUM** - Context-sensitive + flow-sensitive

## Expected Behavior by Level

### MINIMAL Level
- Only explicit data-flow taint (yellow blocks)
- No control-dependent taint (orange blocks)
- No synthetic taint (magenta blocks)
- Example: `leaked` variable in `test_minimal_level` should NOT be tainted

### CONSERVATIVE Level
- Explicit data-flow taint (yellow)
- Basic control-dependent taint (orange)
- No nested control-dependent
- Example: `leaked` variable should be tainted (orange)

### BALANCED Level
- All CONSERVATIVE features
- Full recursive control-dependent
- Inter-procedural taint analysis
- Example: Nested control-dependent blocks should be tainted

### PRECISE Level
- All BALANCED features
- Path-sensitive analysis
- Field-sensitive analysis
- Example: Different paths should be analyzed separately

### MAXIMUM Level
- All PRECISE features
- Context-sensitive analysis
- Flow-sensitive analysis
- Example: Maximum precision in taint tracking

## Expected Logs

### Sensitivity Configuration Logs
```
[TaintAnalysis] Sensitivity Configuration:
  Level: MAXIMUM
  Control-Dependent: Enabled
  Recursive Propagation: Enabled
  Path-Sensitive: Enabled
  Field-Sensitive: Enabled
  Context-Sensitive: Enabled
  Flow-Sensitive: Enabled
```

## Expected UI Output

### CFG Tab
- **MINIMAL**: Only yellow blocks (data-flow)
- **CONSERVATIVE+**: Yellow + orange blocks (data-flow + control-dependent)
- **BALANCED+**: Yellow + orange + purple blocks (mixed taint)
- **PRECISE+**: More precise coloring based on paths
- **MAXIMUM**: Most precise coloring

### Sensitivity Dropdown
- Should show current sensitivity level
- Should allow changing sensitivity
- Should trigger re-analysis when changed

## Validation Checklist

- [ ] MINIMAL level only shows data-flow taint (yellow)
- [ ] CONSERVATIVE level shows control-dependent taint (orange)
- [ ] BALANCED level shows inter-procedural taint
- [ ] PRECISE level shows path-sensitive analysis
- [ ] MAXIMUM level shows all features enabled
- [ ] Sensitivity dropdown works correctly
- [ ] Re-analysis triggers when sensitivity changes
- [ ] Visualization updates with new sensitivity

## Notes
- Test each sensitivity level separately
- Compare results between levels
- Verify that higher levels detect more taint
- Check that sensitivity changes trigger re-analysis

