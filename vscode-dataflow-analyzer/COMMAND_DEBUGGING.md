# Command Palette Debugging Guide

## Issue
Commands "Analyze Workspace" and "Analyze Active File" don't appear in Command Palette (Cmd+Shift+P).

## Root Cause Analysis

Commands are properly:
- ✅ Declared in `package.json` (`contributes.commands`)
- ✅ Registered in `extension.ts` (`vscode.commands.registerCommand`)
- ✅ Added to subscriptions (`context.subscriptions.push`)

**The issue is likely that the extension isn't activating**, which prevents commands from being available.

## Verification Steps

### Step 1: Check Extension Activation

1. **Open Developer Console**:
   - `Cmd+Shift+P` → `Developer: Toggle Developer Tools`
   - Go to "Console" tab

2. **Look for activation messages**:
   ```
   === EXTENSION ACTIVATION CALLED ===
   === COMMAND REGISTRATION COMPLETE ===
   === REGISTERED COMMANDS ===
   ✅ All 8 commands registered successfully
   ```

3. **If you DON'T see these messages**:
   - Extension isn't activating
   - Check Extension Host Log (see Step 2)

### Step 2: Check Extension Host Log

1. **Open Extension Host Log**:
   - `Cmd+Shift+P` → `Developer: Open Extension Host Log`

2. **Look for**:
   - Errors loading the extension
   - Module loading errors
   - Activation errors
   - "Cannot find module" errors

### Step 3: Check if Extension is Loaded

1. **Open Extensions View**:
   - `Cmd+Shift+X` (or View → Extensions)

2. **Search for**: "C++ Dataflow Analyzer"

3. **Check**:
   - ✅ Is it installed?
   - ✅ Is it enabled? (no "Disable" button)
   - ❌ Any error badges?
   - ❌ Any "Reload Required" messages?

### Step 4: Manual Command Test

1. **Open Command Palette**: `Cmd+Shift+P`

2. **Type**: `dataflowAnalyzer.analyzeWorkspace`

3. **If command appears**:
   - Commands ARE registered
   - Issue is with command palette filtering/search

4. **If command DOESN'T appear**:
   - Extension isn't activating
   - Commands aren't registered

### Step 5: Check Compiled Extension

1. **Verify compilation**:
   ```bash
   npm run compile
   ```

2. **Check output file exists**:
   ```bash
   ls -la out/extension.js
   ```

3. **Check package.json main**:
   - Should be: `"main": "./out/extension.js"`

### Step 6: Force Reload

1. **Reload Window**:
   - `Cmd+Shift+P` → `Developer: Reload Window`

2. **Or restart VS Code completely**

3. **Check logs again** after reload

## Common Issues and Fixes

### Issue 1: Extension Not Activating

**Symptoms**:
- No activation messages in console
- Empty logs.txt
- Commands don't appear

**Possible Causes**:
1. **Activation events not triggering**:
   - Check `package.json` → `activationEvents`
   - Should include: `onStartupFinished`, `onLanguage:cpp`, `onCommand:*`

2. **Compilation errors**:
   - Run `npm run compile`
   - Check for TypeScript errors

3. **Module loading errors**:
   - Check Extension Host Log
   - Look for "Cannot find module" errors

**Fix**:
- Ensure `onStartupFinished` is in activationEvents
- Fix any compilation errors
- Check all imports are correct

### Issue 2: Commands Registered But Not Visible

**Symptoms**:
- Activation messages appear
- Commands registered (console shows 8 commands)
- But commands don't appear in palette

**Possible Causes**:
1. **VS Code cache**:
   - Reload window
   - Restart VS Code

2. **Command palette filtering**:
   - Try typing full command ID: `dataflowAnalyzer.analyzeWorkspace`

**Fix**:
- Reload window
- Clear VS Code cache if needed

### Issue 3: Extension Activates But Commands Fail

**Symptoms**:
- Extension activates
- Commands appear in palette
- But clicking them shows "Command not found"

**Possible Causes**:
- Commands not properly subscribed
- Extension deactivated after registration

**Fix**:
- Check `context.subscriptions.push()` includes all commands
- Check extension isn't being deactivated

## Debugging Commands

### Check Registered Commands Programmatically

In Developer Console, run:
```javascript
vscode.commands.getCommands().then(commands => {
  const ourCommands = commands.filter(c => c.startsWith('dataflowAnalyzer.'));
  console.log('Registered commands:', ourCommands);
});
```

Expected output:
```
[
  "dataflowAnalyzer.showCFG",
  "dataflowAnalyzer.analyzeWorkspace",
  "dataflowAnalyzer.analyzeActiveFile",
  "dataflowAnalyzer.clearState",
  "dataflowAnalyzer.deleteStateAndReAnalyze",
  "dataflowAnalyzer.changeSensitivityAndAnalyze",
  "dataflowAnalyzer.saveState",
  "dataflowAnalyzer.reAnalyze"
]
```

### Execute Command Manually

In Developer Console:
```javascript
vscode.commands.executeCommand('dataflowAnalyzer.analyzeWorkspace');
```

If this works, commands are registered but palette isn't showing them.

## Next Steps

1. **Follow all verification steps above**
2. **Check Developer Console** for activation messages
3. **Check Extension Host Log** for errors
4. **Try manual command execution** (Step 4)
5. **Report findings**:
   - Do you see activation messages?
   - Do you see command registration messages?
   - What errors appear in Extension Host Log?
   - Can you execute commands manually?

## Expected Behavior After Fix

After reloading VS Code:

1. **Developer Console shows**:
   ```
   === EXTENSION ACTIVATION CALLED ===
   === COMMAND REGISTRATION COMPLETE ===
   === REGISTERED COMMANDS ===
   Found 8 commands: [...]
   ✅ All 8 commands registered successfully
   ```

2. **Notification appears**:
   ```
   ✅ Extension activated! 8 commands registered.
   ```

3. **Command Palette shows**:
   - "Analyze Workspace"
   - "Analyze Active File"
   - "Show Control Flow Graph"
   - etc.

4. **logs.txt contains**:
   ```
   === EXTENSION ACTIVATION CALLED ===
   [LoggingConfig] === Log session started at ...
   ```

