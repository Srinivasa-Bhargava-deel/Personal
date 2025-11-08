# How to Run the Extension in VSCode

## ✅ Prerequisites (Already Done)
- ✅ `npm install` - Dependencies installed
- ✅ `npm run compile` - TypeScript compiled

## 🚀 Step-by-Step: Running the Extension

### Step 1: Open Project in VSCode

```bash
cd /Users/srinivasabhargavamanda/Desktop/Personal/vscode-dataflow-analyzer
code .
```

This opens the project folder in VSCode.

### Step 2: Start Debugging

You have **3 ways** to start:

**Option A: Keyboard Shortcut (Easiest)**
- Press **`F5`** key

**Option B: Menu**
- Go to menu: **Run → Start Debugging**

**Option C: Sidebar**
- Click the "Run and Debug" icon in the left sidebar (play button with bug)
- Click the green play button at the top

### Step 3: Select Configuration (if prompted)

If VSCode asks you to select a configuration:
- Choose **"Extension"** from the dropdown
- This is already configured in `.vscode/launch.json`

### Step 4: Extension Development Host Opens

A **NEW VSCode window** will open automatically. This is called the "Extension Development Host" - it's a special VSCode instance running your extension.

**Look for:**
- Title bar says: `[Extension Development Host]`
- Bottom status bar may show: `Extension Development Host`

### Step 5: Open a C++ Workspace

In the Extension Development Host window:

1. **File → Open Folder** (or `Ctrl+K Ctrl+O` / `Cmd+K Cmd+O`)
2. Select a folder containing C++ files (.cpp, .c, .hpp, .h)
   - You can use the `example.cpp` file in the project
   - Or any folder with C++ code

### Step 6: Run Analysis

1. Press **`Ctrl+Shift+P`** (Windows/Linux) or **`Cmd+Shift+P`** (macOS)
   - This opens the Command Palette

2. Type: **`Analyze Workspace`**

3. Select: **"Dataflow Analyzer: Analyze Workspace"**

4. Wait for analysis to complete
   - You'll see a progress notification
   - When done: "Analysis complete! Found X functions."

### Step 7: Open CFG Visualizer

1. Press **`Ctrl+Shift+P`** (or **`Cmd+Shift+P`**) again

2. Type: **`Show Control Flow Graph`**

3. Select: **"Dataflow Analyzer: Show Control Flow Graph"**

4. The CFG visualizer opens in a new panel!

### Step 8: Explore Features

**In the CFG Visualizer:**

1. **Select Function**: Use dropdown to choose a function
2. **Click Blocks**: Click any block to see analysis details
3. **View Tabs**:
   - **Block Details**: Analysis info for selected block
   - **Analysis Summary**: Overview of all analyses
   - **Vulnerabilities**: List of security issues ⭐
   - **Attack Paths**: Source-to-sink paths ⭐

4. **Highlight Attack Paths**:
   - Click "Vulnerabilities" tab
   - Click any vulnerability
   - Click "Show Attack Path" button
   - Path highlights in the graph!

## 🎯 Visual Guide

```
┌─────────────────────────────────────────┐
│  VSCode (Main Window)                   │
│  - Your extension code                  │
│  - Press F5 here                        │
└─────────────────────────────────────────┘
              │
              │ Launches
              ▼
┌─────────────────────────────────────────┐
│  Extension Development Host (New Window)│
│  - Your extension is ACTIVE here        │
│  - Open C++ workspace here              │
│  - Run commands here                    │
└─────────────────────────────────────────┘
```

## 🔍 Verify It's Working

**Check Console Output:**

1. In the **main VSCode window** (where you pressed F5):
   - Go to: **Help → Toggle Developer Tools**
   - Look for: `"Dataflow Analyzer extension is now active"`
   - May see: `"Using clang command-line tool"` or `"Clang not found"`

2. In **Extension Development Host**:
   - After running "Analyze Workspace"
   - Should see notification: "Analysis complete!"

## 🐛 Common Issues

### Issue: "Extension" configuration not found

**Fix:**
- Make sure `.vscode/launch.json` exists
- If missing, VSCode will create it automatically when you press F5
- Select "Extension" from the configuration dropdown

### Issue: Extension Development Host doesn't open

**Fix:**
- Check for errors in the Debug Console (bottom panel)
- Make sure `out/extension.js` exists
- Try: `npm run compile` again

### Issue: Commands not appearing

**Fix:**
- Make sure you're in the Extension Development Host window (not main window)
- Reload window: `Ctrl+R` (or `Cmd+R`)
- Check that extension activated (see console)

### Issue: "No workspace folder open"

**Fix:**
- In Extension Development Host, open a **folder** (not just a file)
- File → Open Folder
- Select a directory containing C++ files

## 📝 Quick Reference

| Action | Shortcut/Command |
|--------|------------------|
| Start Extension | `F5` |
| Command Palette | `Ctrl+Shift+P` / `Cmd+Shift+P` |
| Analyze Workspace | Command: `Analyze Workspace` |
| Show CFG | Command: `Show Control Flow Graph` |
| Reload Extension | `Ctrl+R` / `Cmd+R` (in Extension Host) |
| Stop Debugging | `Shift+F5` |

## ✅ Success Checklist

After following steps above, you should see:

- [ ] Extension Development Host window opened
- [ ] Opened a folder with C++ files
- [ ] Ran "Analyze Workspace" command
- [ ] Saw "Analysis complete!" notification
- [ ] Opened CFG visualizer
- [ ] Saw graph with blocks and edges
- [ ] Can click blocks and see details
- [ ] Can see vulnerabilities in "Vulnerabilities" tab
- [ ] Can highlight attack paths

## 🎉 You're Ready!

Once you see the CFG visualizer with a graph, the extension is running successfully!

**Next Steps:**
- Try analyzing different C++ files
- Explore vulnerability detection
- Check attack paths for security issues
- Customize settings in VSCode preferences



