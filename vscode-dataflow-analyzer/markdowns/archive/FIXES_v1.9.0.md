# Fixes for v1.9.0 - Re-analyze Button and Sensitivity Switching

## Issues Fixed

### 1. Re-analyze Button Not Working
**Problem**: Button clicks were not triggering re-analysis
**Root Cause**: `acquireVsCodeApi()` was being called inside event listeners, which can cause issues. VS Code API should be acquired once at the top level.
**Fix**: 
- Moved `acquireVsCodeApi()` call to top-level script initialization
- All event listeners now use the same `vscode` variable
- Added comprehensive logging with `[RE-ANALYZE]` prefix
- Added try-catch error handling around message sending

### 2. Sensitivity Switching Not Working
**Problem**: Changing sensitivity dropdown didn't trigger re-analysis
**Root Cause**: Same issue as above - `acquireVsCodeApi()` called inside event listener
**Fix**:
- Fixed `acquireVsCodeApi()` usage (same as above)
- Added comprehensive logging with `[SENSITIVITY]` prefix
- Added try-catch error handling
- Made sure dropdown change updates settings, then user clicks "Re-analyze" to apply

### 3. Message Flow Issues
**Problem**: Messages from webview might not reach extension
**Root Cause**: Insufficient logging made debugging difficult
**Fix**:
- Added comprehensive logging at every step:
  - Webview: Logs when button clicked, message sent
  - Extension: Logs when message received, command executed
  - Commands: Logs when called, what they do, completion status
- Added error handling with proper error propagation

## Code Changes

### CFGVisualizer.ts
1. **Top-level VS Code API acquisition**:
   ```typescript
   // At top of script initialization
   const vscode = acquireVsCodeApi();
   logDebug('VS Code API acquired');
   ```

2. **Re-analyze button handler**:
   - Uses top-level `vscode` variable
   - Checks for sensitivity dropdown (if in Interconnected CFG tab)
   - Sends appropriate message (`changeSensitivity` or `reAnalyze`)
   - Comprehensive logging with `[RE-ANALYZE]` prefix

3. **Sensitivity dropdown handler**:
   - Uses top-level `vscode` variable
   - Updates UI and sends `changeSensitivity` message
   - Comprehensive logging with `[SENSITIVITY]` prefix

4. **Message handler (extension side)**:
   - Logs all received messages
   - Handles `changeSensitivity`, `reAnalyze`, `saveState` messages
   - Proper error handling and response messages

### extension.ts
1. **changeSensitivityAndAnalyze command**:
   - Added comprehensive logging
   - Logs current and new sensitivity
   - Proper error handling with re-throw

2. **reAnalyze command**:
   - Added comprehensive logging
   - Logs current sensitivity
   - Proper error handling with re-throw

## Validation Steps

### Test 1: Re-analyze Button (Any Tab)
1. Open visualization
2. Click "🔄 Re-analyze" button in header
3. **Expected**: 
   - Button shows "Analyzing..."
   - Status shows "Re-analysis in progress..."
   - Analysis runs
   - Button resets to "Re-analyze"
   - Status shows "Re-analysis completed"
4. **Check logs**: Should see `[RE-ANALYZE]` messages

### Test 2: Sensitivity Dropdown Change
1. Open visualization
2. Go to "Interconnected CFG" tab
3. Change sensitivity dropdown (e.g., from PRECISE to MAXIMUM)
4. **Expected**:
   - Note updates: "Current: MAXIMUM - Click 'Re-analyze' to apply"
   - Features list updates
   - Notification: "Taint sensitivity set to MAXIMUM. Click 'Re-analyze' to apply."
5. **Check logs**: Should see `[SENSITIVITY]` messages

### Test 3: Sensitivity Change + Re-analyze
1. Change sensitivity dropdown (e.g., to MAXIMUM)
2. Click "🔄 Re-analyze" button
3. **Expected**:
   - Analysis runs with new sensitivity
   - Logs show sensitivity change
   - Analysis results reflect new sensitivity level
4. **Check logs**: Should see both `[SENSITIVITY]` and `[RE-ANALYZE]` messages, plus `[Extension]` messages

### Test 4: Re-analyze from Other Tabs
1. Switch to "CFG" tab (not Interconnected CFG)
2. Click "🔄 Re-analyze" button
3. **Expected**:
   - Analysis runs with current analyzer config sensitivity
   - No errors
4. **Check logs**: Should see `[RE-ANALYZE]` message with "no dropdown available"

## Log Messages to Look For

### Webview Logs (in debug panel):
- `[RE-ANALYZE] Button clicked`
- `[RE-ANALYZE] Sending changeSensitivity message with sensitivity: ...`
- `[RE-ANALYZE] Message sent successfully`
- `[SENSITIVITY] Dropdown changed to: ...`
- `[SENSITIVITY] Sending changeSensitivity message (no re-analysis)`

### Extension Logs (in console):
- `[CFGVisualizer] [INFO] Received message from webview: ...`
- `[CFGVisualizer] [INFO] changeSensitivity message received`
- `[CFGVisualizer] [DEBUG] Executing changeSensitivityAndAnalyze command...`
- `[Extension] [INFO] changeSensitivityAndAnalyze command called with sensitivity: ...`
- `[Extension] [DEBUG] Current sensitivity: ..., new sensitivity: ...`
- `[Extension] [INFO] Re-analysis completed for sensitivity: ...`

## Success Criteria

✅ Re-analyze button works from all tabs
✅ Sensitivity dropdown updates UI correctly
✅ Clicking "Re-analyze" after changing sensitivity triggers re-analysis with new sensitivity
✅ All messages are logged with appropriate prefixes
✅ Errors are caught and displayed to user
✅ Button states update correctly (disabled during analysis, reset after)

## Files Modified

1. `src/visualizer/CFGVisualizer.ts`
   - Fixed `acquireVsCodeApi()` usage
   - Added comprehensive logging
   - Improved error handling

2. `src/extension.ts`
   - Added comprehensive logging to commands
   - Improved error handling

## Testing Checklist

- [ ] Re-analyze button works from CFG tab
- [ ] Re-analyze button works from Call Graph tab
- [ ] Re-analyze button works from Interconnected CFG tab
- [ ] Sensitivity dropdown changes UI correctly
- [ ] Sensitivity dropdown sends message correctly
- [ ] Re-analyze after sensitivity change uses new sensitivity
- [ ] Logs show all steps clearly
- [ ] Errors are caught and displayed
- [ ] Button states update correctly


