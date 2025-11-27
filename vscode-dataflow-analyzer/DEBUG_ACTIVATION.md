# Debugging Extension Activation Issues

## Problem
Extension commands don't appear in command palette (Cmd+Shift+P) and logs are empty.

## Root Cause Investigation Steps

### Step 1: Check if Extension is Loaded
1. Open VS Code Developer Tools: `Help > Toggle Developer Tools`
2. Go to Console tab
3. Look for:
   - `"Dataflow Analyzer extension is activating..."`
   - Any error messages starting with `[Extension]`
   - Any red error messages

**If you see "activating..."**: Extension is loading, but something fails during activation
**If you see nothing**: Extension isn't being loaded at all

### Step 2: Check Extension Host Logs
1. Open Command Palette: `Cmd+Shift+P`
2. Run: `Developer: Open Extension Host Log`
3. Look for:
   - Errors related to `vscode-dataflow-analyzer`
   - Module loading errors
   - Activation errors

### Step 3: Check if Extension is Installed
1. Open Extensions view: `Cmd+Shift+X`
2. Search for "C++ Dataflow Analyzer"
3. Check if it's:
   - Installed
   - Enabled
   - Has any error badges

### Step 4: Check Activation Events
The extension should activate on:
- `onLanguage:cpp` - When a C++ file is opened
- `onLanguage:c` - When a C file is opened
- `onStartupFinished` - When VS Code finishes starting
- `onCommand:*` - When any command is invoked

**Test**: Open a `.cpp` file and check Developer Console for activation message.

### Step 5: Check Compiled Output
1. Verify compilation succeeded: `npm run compile`
2. Check if `out/extension.js` exists and is recent
3. Verify `exports.activate` exists in compiled file:
   ```bash
   grep "exports.activate" out/extension.js
   ```

### Step 6: Check for Syntax Errors
1. Check TypeScript compilation: `npm run compile`
2. Look for any errors or warnings
3. Check linter: `npm run lint`

### Step 7: Manual Activation Test
Add this to the VERY FIRST line of `activate()` function:
```typescript
export function activate(context: vscode.ExtensionContext) {
  console.log('=== ACTIVATION CALLED ===');
  vscode.window.showInformationMessage('Extension activating!');
  try {
    // ... rest of code
```

If you see the message, activation is being called.
If you don't see it, activation isn't being triggered.

### Step 8: Check Command Registration
After `context.subscriptions.push(...)`, add:
```typescript
console.log('Commands registered:', context.subscriptions.length);
vscode.commands.getCommands().then(commands => {
  const ourCommands = commands.filter(c => c.startsWith('dataflowAnalyzer.'));
  console.log('Our commands found:', ourCommands);
});
```

### Step 9: Check for Early Errors
The try-catch might be catching an error. Check:
1. Developer Console for error messages
2. Extension Host Log for errors
3. Check if error is thrown before commands are registered

### Step 10: Verify package.json
Check:
1. `main` field points to `./out/extension.js`
2. `activationEvents` includes expected events
3. `contributes.commands` has all 8 commands

## Common Issues

### Issue 1: Extension Not Activating
**Symptoms**: No logs, no commands
**Causes**:
- Activation events not triggering
- Extension not installed/enabled
- Syntax error preventing load
- Missing dependencies

**Fix**: Check Developer Console and Extension Host Log

### Issue 2: Activation Fails Silently
**Symptoms**: No logs, but extension appears installed
**Causes**:
- Error in activation function
- Missing module imports
- Runtime error during initialization

**Fix**: Check try-catch error handler, add early logging

### Issue 3: Commands Registered But Not Visible
**Symptoms**: Commands work but don't appear in palette
**Causes**:
- Commands not in `contributes.commands`
- Activation events not triggering
- VS Code cache issue

**Fix**: Reload window, check package.json

### Issue 4: Variable Shadowing
**Symptoms**: Commands registered but analyzer/visualizer are null
**Causes**:
- Local variables shadowing globals
- Variables not assigned to globals

**Fix**: Use global variables, not local `let` declarations

## Quick Diagnostic Commands

```bash
# Check if extension compiles
npm run compile

# Check for syntax errors
npm run lint

# Check compiled output
grep "exports.activate" out/extension.js

# Check command registration in compiled code
grep "registerCommand" out/extension.js | wc -l
# Should show 8 commands

# Check if commands are in package.json
grep "dataflowAnalyzer\." package.json | grep command | wc -l
# Should show 8 commands
```

## Next Steps After Diagnosis

1. **If activation isn't called**: Check activation events, reload window
2. **If activation fails**: Check error in Developer Console, fix the error
3. **If commands don't register**: Check if `context.subscriptions.push` is reached
4. **If commands register but don't appear**: Check package.json, reload window

