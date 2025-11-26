# Validation: test_context_sensitive_taint.cpp

## Test File Purpose
Tests context-sensitive taint analysis (requires MAXIMUM sensitivity) - different contexts for same function.

## Expected Behavior

### Context-Sensitive Analysis
- Same function called from different contexts should be analyzed separately
- Context should affect taint propagation
- Requires MAXIMUM sensitivity level

## Expected Logs

```
[TaintAnalysis] Context-sensitive analysis: function_X called from context_A
[TaintAnalysis] Context-sensitive analysis: function_X called from context_B
```

## Expected UI Output

### CFG Tab
- Context-sensitive analysis should show different results for different contexts
- Taint propagation should be context-aware

## Validation Checklist

- [ ] Context-sensitive analysis works (MAXIMUM sensitivity)
- [ ] Different contexts produce different results
- [ ] Taint propagation is context-aware

## Notes
- Requires MAXIMUM sensitivity level
- May not show differences at lower sensitivity levels

