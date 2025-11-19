# Fixes for v1.9.1 - Tab Switching and Sensitivity Mismatch Detection

## Issues Fixed

### 1. Tab Switching After Sensitivity Change Shows Stale Data
**Problem**: After changing sensitivity and switching tabs, the visualization would show data from the previous sensitivity level, causing confusion and incorrect analysis results.

**Root Cause**: 
- Visualization data was prepared with one sensitivity level but the state had a different sensitivity
- Tab switching didn't check for sensitivity mismatches before initializing visualization
- No automatic re-analysis trigger when mismatch detected

**Fix**:
- Added sensitivity mismatch detection before tab initialization
- Automatically triggers re-analysis when mismatch is detected
- Stores sensitivity in visualization data for comparison
- Enhanced logging with `[TAB-SWITCH]` prefix for debugging

### 2. Visualization Data Not Regenerated on Sensitivity Change
**Problem**: When sensitivity changed, old visualization data persisted, causing incorrect visualizations.

**Root Cause**: 
- Visualization data was cached and not invalidated on sensitivity change
- No mechanism to detect when data needed regeneration

**Fix**:
- Added sensitivity storage in interconnected CFG data
- Added mismatch detection in `updateWebview()` method
- Clear old visualization data when sensitivity changes
- Regenerate data with correct sensitivity level

### 3. Insufficient Logging for Sensitivity Issues
**Problem**: Difficult to debug sensitivity-related issues due to lack of logging.

**Root Cause**: 
- Limited logging around sensitivity changes
- No verification logging for sensitivity correctness

**Fix**:
- Added comprehensive logging throughout sensitivity workflow:
  - `[TAB-SWITCH]` logs for tab switching detection
  - `[SENSITIVITY-VERIFY]` logs for backend sensitivity verification
  - `[INIT]` logs for initialization sensitivity info
  - `[SENSITIVITY]` logs for dropdown changes
- Added sensitivity verification in `prepareAllVisualizationData()`
- Logs sensitivity-specific data counts and expectations

## Code Changes

### CFGVisualizer.ts

1. **Tab Switching Sensitivity Check**:
   ```typescript
   // Check for sensitivity mismatch before initializing
   const currentSensitivity = stateData.taintSensitivity || 'precise';
   const dataSensitivity = interconnectedData.taintSensitivity || stateData.taintSensitivity || 'precise';
   
   if (currentSensitivity !== dataSensitivity) {
     // Trigger re-analysis with correct sensitivity
     vscode.postMessage({
       type: 'changeSensitivity',
       sensitivity: currentSensitivity,
       triggerReAnalysis: true
     });
   }
   ```

2. **Sensitivity Storage in Interconnected Data**:
   ```typescript
   return {
     nodes,
     edges,
     functions: Array.from(functionGroups.keys()),
     groups: Object.fromEntries(functionGroups),
     taintSensitivity: sensitivity  // Store for mismatch detection
   };
   ```

3. **Sensitivity Verification Logging**:
   ```typescript
   console.log(`[CFGVisualizer] [SENSITIVITY-VERIFY] Current sensitivity: ${sensitivity}`);
   console.log(`[CFGVisualizer] [SENSITIVITY-VERIFY] Interconnected sensitivity: ${interconnectedCFGData?.taintSensitivity}`);
   // Verify sensitivity-specific expectations
   ```

4. **Visualization Data Regeneration Check**:
   ```typescript
   const currentSensitivity = state.taintSensitivity || 'precise';
   const dataSensitivity = (state.visualizationData as any)?.taintSensitivity;
   const needsRegeneration = state.visualizationData && dataSensitivity && dataSensitivity !== currentSensitivity;
   
   if (needsRegeneration) {
     state.visualizationData = undefined;
     // Will regenerate on-demand with correct sensitivity
   }
   ```

### DataflowAnalyzer.ts

1. **Sensitivity Storage in State**:
   ```typescript
   this.currentState = {
     // ... other fields
     taintSensitivity: currentSensitivity  // Ensure sensitivity is stored
   };
   ```

2. **Visualization Data Preparation**:
   ```typescript
   const visualizationData = await CFGVisualizer.prepareAllVisualizationData(this.currentState);
   this.currentState.visualizationData = visualizationData;
   // Visualization data now includes sensitivity metadata
   ```

## Validation Steps

### Test 1: Tab Switching After Sensitivity Change
1. Open visualization with default sensitivity (e.g., PRECISE)
2. Switch to Interconnected CFG tab
3. Change sensitivity dropdown to MAXIMUM
4. Switch to another tab, then back to Interconnected CFG tab
5. **Expected**: 
   - Mismatch detected in logs
   - Re-analysis triggered automatically
   - Visualization shows data with MAXIMUM sensitivity
6. **Check logs**: Should see `[TAB-SWITCH]` messages with mismatch detection

### Test 2: Sensitivity Verification
1. Run analysis with different sensitivity levels
2. **Expected**: 
   - Logs show `[SENSITIVITY-VERIFY]` messages
   - Sensitivity-specific data counts logged
   - Warnings if expectations not met (e.g., control-dependent taint in MINIMAL mode)
3. **Check logs**: Should see verification messages for each sensitivity level

### Test 3: Visualization Data Regeneration
1. Change sensitivity
2. Trigger re-analysis
3. Switch tabs
4. **Expected**: 
   - Visualization data regenerated with new sensitivity
   - No stale data shown
   - Sensitivity matches state sensitivity
5. **Check logs**: Should see regeneration messages

## Log Messages to Look For

### Tab Switching Logs:
- `[TAB-SWITCH] Current sensitivity: ...`
- `[TAB-SWITCH] Data sensitivity: ...`
- `[TAB-SWITCH] WARNING: Sensitivity mismatch detected!`
- `[TAB-SWITCH] Triggering re-analysis with correct sensitivity...`

### Sensitivity Verification Logs:
- `[SENSITIVITY-VERIFY] ========== SENSITIVITY VERIFICATION ==========`
- `[SENSITIVITY-VERIFY] Current sensitivity: ...`
- `[SENSITIVITY-VERIFY] Interconnected nodes: ...`
- `[SENSITIVITY-VERIFY] Data-flow only nodes: ...`
- `[SENSITIVITY-VERIFY] Control-dependent only nodes: ...`
- `[SENSITIVITY-VERIFY] MINIMAL: Expected no control-dependent taint`

### Initialization Logs:
- `[INIT] State sensitivity: ...`
- `[INIT] Data sensitivity: ...`
- `[INIT] Sensitivity match: ...`

## Success Criteria

✅ Tab switching detects sensitivity mismatches
✅ Automatic re-analysis triggered on mismatch
✅ Visualization data includes sensitivity metadata
✅ Comprehensive logging for debugging
✅ Sensitivity verification logs show correct expectations
✅ No stale data shown after sensitivity changes

## Files Modified

1. `src/visualizer/CFGVisualizer.ts`
   - Added tab switching sensitivity check
   - Added sensitivity storage in interconnected data
   - Added comprehensive verification logging
   - Enhanced visualization data regeneration

2. `src/analyzer/DataflowAnalyzer.ts`
   - Ensured sensitivity stored in state
   - Enhanced visualization data preparation logging

3. `src/extension.ts`
   - Updated comments with v1.9.1 fixes

## Testing Checklist

- [ ] Tab switching detects sensitivity mismatch
- [ ] Automatic re-analysis triggered correctly
- [ ] Visualization data regenerated with correct sensitivity
- [ ] Logs show all verification steps
- [ ] No stale data after sensitivity changes
- [ ] Sensitivity verification works for all 5 levels
- [ ] Error handling works correctly

