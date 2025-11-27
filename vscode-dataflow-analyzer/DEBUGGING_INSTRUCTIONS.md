# Debugging Instructions: Extension Not Starting

## Current Status
- Extension commands don't appear in command palette (Cmd+Shift+P)
- Logs are empty (`.vscode/logs.txt`)
- Extension may not be activating at all

## Step-by-Step Debugging Plan

### Phase 1: Verify Extension is Being Loaded

#### Step 1.1: Check Developer Console
1. Open VS Code Developer Tools: `Help > Toggle Developer Tools` (or `Cmd+Option+I` on Mac)
2. Go to **Console** tab
3. Look for these messages:
   - `=== EXTENSION ACTIVATION CALLED ===`
   - `Extension activation started!` (notification)
   - `=== COMMAND REGISTRATION COMPLETE ===`
   - `=== REGISTERED COMMANDS ===`

**What to look for:**
- ✅ **If you see "ACTIVATION CALLED"**: Extension is loading, proceed to Phase 2
- ❌ **If you see nothing**: Extension isn't being loaded, proceed to Phase 3
- ⚠️ **If you see errors**: Note the error message, proceed to Phase 4

#### Step 1.2: Check Extension Host Log
1. Open Command Palette: `Cmd+Shift+P`
2. Run: `Developer: Open Extension Host Log`
3. Look for:
   - Errors related to `vscode-dataflow-analyzer`
   - Module loading errors
   - Activation errors
   - Stack traces

**What to look for:**
- Any red error messages
- "Cannot find module" errors
- "Activation failed" messages

### Phase 2: Verify Activation Completes Successfully

#### Step 2.1: Check Command Registration
In Developer Console, look for:
```
=== REGISTERED COMMANDS ===
Found 8 commands: [...]
```

**Expected output:**
- Should show 8 commands: `showCFG`, `analyzeWorkspace`, `analyzeActiveFile`, `clearState`, `deleteStateAndReAnalyze`, `changeSensitivityAndAnalyze`, `saveState`, `reAnalyze`
- Should show "✅ All 8 commands registered successfully"

**If commands < 8:**
- Check which commands are missing
- Verify `package.json` has all commands in `contributes.commands`

#### Step 2.2: Check Analyzer/Visualizer Initialization
In Developer Console, look for:
```
Analyzer: initialized
Visualizer: initialized
```

**If either shows "NULL":**
- Variable shadowing issue (already fixed, but verify)
- Initialization error (check error messages)

### Phase 3: Extension Not Loading

#### Step 3.1: Verify Extension is Installed
1. Open Extensions view: `Cmd+Shift+X`
2. Search for "C++ Dataflow Analyzer"
3. Check:
   - ✅ Is it installed?
   - ✅ Is it enabled?
   - ⚠️ Any error badges?

**If not installed:**
- Install from local folder: `F5` (Debug > Start Debugging)
- Or install from VSIX if available

#### Step 3.2: Check Activation Events
The extension activates on:
- `onLanguage:cpp` - When a C++ file is opened
- `onLanguage:c` - When a C file is opened  
- `onStartupFinished` - When VS Code finishes starting
- `onCommand:*` - When any command is invoked

**Test activation:**
1. Open a `.cpp` file
2. Check Developer Console for activation message
3. If no message, activation events aren't triggering

#### Step 3.3: Verify package.json
Check `package.json`:
```json
{
  "main": "./out/extension.js",
  "activationEvents": [
    "onLanguage:cpp",
    "onLanguage:c",
    "onStartupFinished",
    ...
  ],
  "contributes": {
    "commands": [
      { "command": "dataflowAnalyzer.showCFG", ... },
      ...
    ]
  }
}
```

**Verify:**
- `main` points to correct file
- `activationEvents` includes expected events
- `contributes.commands` has all 8 commands

### Phase 4: Handle Errors

#### Step 4.1: Check Compilation Errors
```bash
npm run compile
```

**Look for:**
- TypeScript errors
- Missing imports
- Type errors

**If errors found:**
- Fix compilation errors
- Recompile: `npm run compile`
- Reload VS Code window

#### Step 4.2: Check Runtime Errors
In Developer Console, look for:
- Red error messages
- Stack traces
- "Activation failed" messages

**Common errors:**
- `Cannot find module 'vscode'` - Extension host issue
- `Cannot read property 'X' of undefined` - Null reference
- `TypeError` - Type mismatch

#### Step 4.3: Check Try-Catch Error Handler
If activation fails, check:
1. Developer Console for error message
2. Error notification should appear
3. Error should be logged to file (if logging initialized)

**Error handler location:** `src/extension.ts` line 886-915

### Phase 5: Verify Commands Appear

#### Step 5.1: Reload Window
1. `Cmd+Shift+P`
2. Run: `Developer: Reload Window`
3. Check Developer Console for activation messages
4. Check command palette for commands

#### Step 5.2: Check Command Palette
1. `Cmd+Shift+P`
2. Type: `Analyze Workspace`
3. Should see: `Dataflow Analyzer: Analyze Workspace`

**If not visible:**
- Commands not registered (check Phase 2)
- VS Code cache issue (try full restart)
- Extension not activated (check Phase 3)

## Quick Diagnostic Checklist

- [ ] Developer Console shows "ACTIVATION CALLED"
- [ ] Notification "Extension activation started!" appears
- [ ] Developer Console shows "COMMAND REGISTRATION COMPLETE"
- [ ] Developer Console shows "Found 8 commands"
- [ ] Analyzer shows "initialized" (not "NULL")
- [ ] Visualizer shows "initialized" (not "NULL")
- [ ] No errors in Developer Console
- [ ] No errors in Extension Host Log
- [ ] Commands appear in command palette (Cmd+Shift+P)
- [ ] `.vscode/logs.txt` has content (after activation)

## Expected Behavior After Fix

1. **On VS Code startup or opening C++ file:**
   - Notification: "Extension activation started!"
   - Developer Console: "=== EXTENSION ACTIVATION CALLED ==="
   - Developer Console: "=== COMMAND REGISTRATION COMPLETE ==="
   - Developer Console: "✅ All 8 commands registered successfully"
   - Notification: "✅ Extension activated! 8 commands registered."

2. **In Command Palette (Cmd+Shift+P):**
   - Type "Analyze" → See "Analyze Workspace" and "Analyze Active File"
   - Type "Show" → See "Show Control Flow Graph"
   - All 8 commands visible

3. **In logs.txt:**
   - Log session started message
   - Activation logs
   - Command registration logs

## Next Steps Based on Findings

### If activation is called but commands don't register:
- Check `context.subscriptions.push` is reached
- Verify command registration code executes
- Check for errors during command registration

### If activation isn't called:
- Check activation events in `package.json`
- Verify extension is installed/enabled
- Check Extension Host Log for errors
- Try opening a C++ file to trigger activation

### If commands register but don't appear:
- Reload VS Code window
- Check `package.json` `contributes.commands` section
- Verify all commands are listed
- Try full VS Code restart

### If errors occur:
- Note the exact error message
- Check stack trace in Developer Console
- Fix the error
- Recompile and reload

## Files to Check

1. **`src/extension.ts`** - Activation function, command registration
2. **`package.json`** - Activation events, command definitions
3. **`out/extension.js`** - Compiled output (verify it exists)
4. **`.vscode/logs.txt`** - Log file (should have content after activation)
5. **Developer Console** - Runtime errors, activation logs
6. **Extension Host Log** - Extension loading errors

## Commands to Run

```bash
# Compile extension
npm run compile

# Check for syntax errors
npm run lint

# Verify compiled output exists
ls -la out/extension.js

# Check if activation function exists in compiled code
grep "exports.activate" out/extension.js

# Count registered commands in compiled code
grep "registerCommand" out/extension.js | wc -l
# Should output: 8

# Count commands in package.json
grep "dataflowAnalyzer\." package.json | grep command | wc -l
# Should output: 8
```

## Reporting Findings

When reporting what you find, include:
1. ✅/❌ for each checklist item
2. Exact error messages (if any)
3. Developer Console output (relevant lines)
4. Extension Host Log errors (if any)
5. Results of diagnostic commands

This will help identify the exact root cause.

