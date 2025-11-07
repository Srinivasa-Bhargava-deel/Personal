# Quick Start Guide - Build and Run

## ✅ Is it Ready?

**YES!** The extension is fully built and ready to use. All TypeScript has been compiled to JavaScript.

## 🚀 Quick Start (3 Steps)

### Step 1: Install Dependencies (if not done)
```bash
cd /Users/srinivasabhargavamanda/Desktop/Personal/vscode-dataflow-analyzer
npm install
```

### Step 2: Compile (if needed)
```bash
npm run compile
```

### Step 3: Run in VSCode
1. Open the project in VSCode:
   ```bash
   code .
   ```
   
2. Press **F5** (or go to Run → Start Debugging)

3. A new VSCode window will open (Extension Development Host)

4. In the new window:
   - Open a folder with C++ files
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS)
   - Type "Analyze Workspace" and select it
   - Wait for analysis to complete
   - Type "Show Control Flow Graph" to open the visualizer

## 📋 Detailed Instructions

### Prerequisites Check

```bash
# Check Node.js version (should be 20+)
node --version

# Check npm
npm --version

# Check if clang is available (optional but recommended)
clang --version
```

### Build Process

1. **Navigate to project:**
   ```bash
   cd /Users/srinivasabhargavamanda/Desktop/Personal/vscode-dataflow-analyzer
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```
   This installs:
   - TypeScript compiler
   - VSCode API types
   - ESLint and other dev tools

3. **Compile TypeScript:**
   ```bash
   npm run compile
   ```
   
   **Expected output:**
   ```
   > vscode-dataflow-analyzer@1.0.0 compile
   > tsc -p ./
   ```
   (No errors = success!)

4. **Verify build:**
   ```bash
   ls out/
   ```
   Should see: `extension.js`, `analyzer/`, `visualizer/`, `state/`, `types.js`

### Running the Extension

#### Method 1: Debug Mode (Recommended for First Time)

1. **Open in VSCode:**
   ```bash
   code .
   ```

2. **Start Debugging:**
   - Press **F5** OR
   - Click the "Run and Debug" icon in sidebar OR
   - Go to menu: Run → Start Debugging

3. **Select Configuration:**
   - If prompted, select "Extension" configuration
   - A new VSCode window opens (Extension Development Host)

4. **In Extension Development Host:**
   - File → Open Folder
   - Select a folder containing C++ files (.cpp, .c, .hpp, .h)
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
   - Type: `Analyze Workspace`
   - Press Enter
   - Wait for "Analysis complete!" message
   - Type: `Show Control Flow Graph`
   - Press Enter

5. **Explore:**
   - Click blocks in the CFG to see analysis details
   - Click "Vulnerabilities" tab to see security issues
   - Click "Attack Paths" tab to see exploit paths
   - Click any vulnerability to highlight its attack path

#### Method 2: Watch Mode (For Development)

1. **Terminal 1 - Watch mode:**
   ```bash
   npm run watch
   ```
   (Keeps compiling as you edit files)

2. **VSCode - Press F5:**
   - Same as Method 1, but changes auto-compile

#### Method 3: Package and Install (For Permanent Use)

1. **Install vsce:**
   ```bash
   npm install -g vsce
   ```

2. **Package extension:**
   ```bash
   npm run compile
   vsce package
   ```
   Creates: `vscode-dataflow-analyzer-1.0.0.vsix`

3. **Install in VSCode:**
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P`)
   - Type: `Install from VSIX...`
   - Select the `.vsix` file
   - Reload VSCode

## 🧪 Testing with Example Code

The project includes `example.cpp` for testing:

```bash
# In Extension Development Host:
# 1. Open folder containing example.cpp
# 2. Run "Analyze Workspace"
# 3. Open CFG visualizer
# 4. Select "main" function from dropdown
# 5. Check "Vulnerabilities" tab - should show buffer overflow!
# 6. Click vulnerability to see attack path highlighted
```

## ⚙️ Configuration

After running, configure in VSCode Settings:

1. Press `Ctrl+,` (or `Cmd+,`)
2. Search: "Dataflow Analyzer"
3. Adjust:
   - **Update Mode**: `save` (default) or `keystroke`
   - **Debounce Delay**: 500ms (for keystroke mode)
   - Enable/disable individual analyses

## 🐛 Troubleshooting

### Extension doesn't activate

**Check:**
- VSCode version ≥ 1.80.0
- Node.js version ≥ 20.0.0
- Ran `npm install` successfully
- Ran `npm run compile` successfully (no errors)
- Opened a folder (not just a file) in Extension Development Host

**Fix:**
```bash
# Clean rebuild
rm -rf out/ node_modules/
npm install
npm run compile
```

### No vulnerabilities detected

**Possible reasons:**
- Code doesn't have vulnerabilities (good!)
- Parser couldn't parse the code (check console for errors)
- Analysis didn't complete (check for error messages)

**Test with example.cpp:**
- Should detect buffer overflow in `main()` function
- Should show taint from `scanf` to `printf`

### CFG visualizer is empty

**Check:**
- Analysis completed successfully
- Function selected from dropdown
- Code has functions to analyze

**Fix:**
- Run "Analyze Workspace" again
- Check console for errors (Help → Toggle Developer Tools)

### Clang not found warning

**This is OK!** Extension will use primitive parser.

**To use clang (recommended):**
- macOS: `xcode-select --install`
- Linux: `sudo apt-get install clang`
- Windows: Download from llvm.org

## 📊 What to Expect

### First Run:
1. Extension activates when you open a C++ file
2. Console shows: "Dataflow Analyzer extension is now active"
3. May show: "Using clang command-line tool" or "Clang not found"

### After Analysis:
1. Notification: "Analysis complete! Found X functions."
2. CFG visualizer shows graph
3. Vulnerabilities tab shows security issues
4. Attack paths tab shows exploit paths

### Visual Indicators:
- **Cyan blocks**: Taint sources
- **Orange blocks**: Taint propagation
- **Red blocks**: Vulnerability sinks
- **Thick colored edges**: Attack paths

## ✅ Verification Checklist

Run through this to verify everything works:

- [ ] `npm install` completed without errors
- [ ] `npm run compile` completed without errors
- [ ] `out/` directory exists with compiled files
- [ ] Pressed F5 and Extension Development Host opened
- [ ] Opened a folder with C++ files
- [ ] Ran "Analyze Workspace" command
- [ ] Saw "Analysis complete!" notification
- [ ] Opened CFG visualizer
- [ ] Saw graph with blocks and edges
- [ ] Clicked a block and saw analysis details
- [ ] Opened "Vulnerabilities" tab
- [ ] Opened "Attack Paths" tab
- [ ] Clicked a vulnerability and saw path highlighted

## 🎯 Current Status

✅ **READY FOR USE!**

- All code compiled successfully
- All features implemented
- Extension manifest configured
- Debug configuration ready
- Example code included
- Documentation complete

**You can start using it right now!**

Just follow the Quick Start steps above.

