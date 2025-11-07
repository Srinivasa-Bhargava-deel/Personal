# C++ Dataflow Analyzer & Security Vulnerability Detection

A comprehensive VSCode extension for real-time incremental static/dataflow analysis of C++ code with advanced security vulnerability detection and exploit post-mortem capabilities.

## 🎯 Overview

This extension provides powerful static analysis capabilities for C++ codebases, focusing on:
- **Control Flow Graph (CFG) Visualization** - Interactive real-time CFG building
- **Dataflow Analysis** - Liveness, reaching definitions, and taint analysis
- **Security Vulnerability Detection** - Automated detection of common vulnerabilities
- **Attack Path Visualization** - Source-to-sink path tracking for exploit analysis ⭐ NEW
- **Exploit Post-Mortem Support** - Tools for analyzing and understanding security vulnerabilities

Perfect for security researchers, developers, and code reviewers who need to understand dataflow and identify security vulnerabilities in C++ code.

## ✨ Key Features

### Core Analysis Features

1. **Liveness Analysis**
   - Determines which variables are live at each program point
   - Backward dataflow analysis with iterative fixed-point algorithm
   - Visualized in CFG with live-in and live-out sets

2. **Reaching Definitions Analysis**
   - Tracks where variable definitions reach
   - Forward dataflow analysis
   - Identifies all definitions that can reach a use

3. **Taint Analysis**
   - Tracks tainted data flow from sources (user input, network, etc.)
   - Forward propagation through assignments
   - Identifies security-sensitive data flows

4. **Security Vulnerability Detection**
   - Buffer overflow detection
   - Use-after-free detection
   - Double free detection
   - Format string vulnerabilities
   - Command injection
   - SQL injection
   - Path traversal
   - Unsafe function calls
   - Uninitialized variable usage
   - And more...

5. **Source-to-Sink Path Visualization** ⭐ NEW
   - Highlights complete attack paths from taint sources to security sinks
   - Color-coded paths based on vulnerability severity
   - Interactive path highlighting and navigation
   - Step-by-step path breakdown
   - Visual distinction between source, propagation, and sink blocks

### Visualization Features

- **Interactive CFG Graph**
  - Real-time updates as code changes
  - Click blocks to see detailed analysis information
  - Color-coded nodes (tainted blocks, attack paths)
  - Hierarchical layout with vis-network

- **Vulnerability Dashboard**
  - List all detected vulnerabilities
  - Filter by severity, type, exploitability
  - Click to highlight attack paths
  - CWE links and recommendations

- **Attack Paths Panel**
  - Detailed view of each attack path
  - Step-by-step breakdown
  - Source and sink identification
  - One-click path highlighting

- **Analysis Summary**
  - Overview of all analyses
  - Statistics and metrics
  - Quick insights

### Technical Features

- **libclang Integration**
  - Uses clang AST for accurate parsing
  - Automatic detection of clang installation
  - Falls back to primitive parser if clang unavailable

- **Incremental Analysis**
  - Updates only changed files
  - Configurable update mode (keystroke or file save)
  - Debounced updates for performance

- **State Persistence**
  - Saves analysis state per workspace
  - Stored in `.vscode/dataflow-state.json`
  - Persists across sessions

## 📋 Requirements

### System Requirements

- **VSCode**: Version 1.80.0 or higher
- **Node.js**: Version 20.0.0 or higher (for development)
- **TypeScript**: Version 5.0.0 or higher (for development)

### Optional (Recommended)

- **clang/clang++**: For accurate AST parsing
  - macOS: Usually comes with Xcode Command Line Tools (`xcode-select --install`)
  - Linux: Install via package manager (`apt-get install clang` or `yum install clang`)
  - Windows: Install LLVM/Clang from [llvm.org](https://llvm.org/)

The extension will automatically detect clang and use it if available. If not found, it falls back to a primitive parser.

## 🚀 Installation & Build Instructions

### Prerequisites

Before building, ensure you have:

1. **Node.js** (v20.0.0 or higher)
   ```bash
   node --version  # Should show v20.x.x or higher
   ```

2. **npm** (comes with Node.js)
   ```bash
   npm --version
   ```

3. **TypeScript** (will be installed as dev dependency)
   ```bash
   npm install -g typescript  # Optional, for global tsc command
   ```

4. **VSCode** (v1.80.0 or higher)
   - Download from [code.visualstudio.com](https://code.visualstudio.com/)

5. **clang** (Optional but recommended)
   - macOS: `xcode-select --install`
   - Linux: `sudo apt-get install clang` or `sudo yum install clang`
   - Windows: Download from [llvm.org](https://llvm.org/)

### Building from Source

#### Step 1: Clone or Navigate to Project

```bash
cd /path/to/vscode-dataflow-analyzer
```

#### Step 2: Install Dependencies

```bash
npm install
```

This will install all required dependencies including:
- TypeScript compiler
- VSCode extension API types
- ESLint and TypeScript ESLint plugins
- Other development dependencies

#### Step 3: Compile TypeScript

```bash
npm run compile
```

This compiles all TypeScript files in `src/` to JavaScript in `out/`.

**Expected output:**
- `out/` directory created with compiled `.js` files
- Source maps (`.js.map`) for debugging
- No compilation errors

#### Step 4: Verify Build

Check that compilation succeeded:

```bash
ls out/
# Should see: extension.js, analyzer/, visualizer/, state/, types.js
```

### Running the Extension

#### Method 1: Extension Development Host (Recommended for Development)

1. **Open Project in VSCode:**
   ```bash
   code .
   ```

2. **Open Debug View:**
   - Press `F5` OR
   - Click "Run and Debug" in sidebar OR
   - Go to Run → Start Debugging

3. **Select Configuration:**
   - Choose "Extension" from the debug configuration dropdown
   - This launches a new VSCode window (Extension Development Host)

4. **In the Extension Development Host:**
   - Open a folder containing C++ files
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS)
   - Type "Analyze Workspace" and run it
   - Type "Show Control Flow Graph" to open the visualizer

#### Method 2: Watch Mode (For Active Development)

For continuous compilation during development:

```bash
npm run watch
```

This watches for file changes and recompiles automatically. Then press `F5` in VSCode to launch the extension.

#### Method 3: Package and Install (For Distribution)

1. **Install vsce (VSCode Extension Manager):**
   ```bash
   npm install -g vsce
   ```

2. **Package the Extension:**
   ```bash
   npm run compile  # Ensure latest build
   vsce package
   ```

   This creates `vscode-dataflow-analyzer-1.0.0.vsix`

3. **Install the VSIX:**
   - In VSCode, press `Ctrl+Shift+P` (or `Cmd+Shift+P`)
   - Type "Install from VSIX..."
   - Select the `.vsix` file

### Development Workflow

1. **Make Changes:**
   - Edit TypeScript files in `src/`
   - Save files

2. **Compile:**
   ```bash
   npm run compile
   ```
   Or use watch mode: `npm run watch`

3. **Reload Extension:**
   - In Extension Development Host, press `Ctrl+R` (or `Cmd+R`)
   - Or stop and restart debug session (`F5`)

4. **Test:**
   - Open a C++ file
   - Run "Analyze Workspace"
   - Check results in CFG visualizer

### Troubleshooting Build Issues

#### Issue: TypeScript compilation errors

**Solution:**
```bash
# Clean and rebuild
rm -rf out/
npm run compile
```

#### Issue: Module not found errors

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### Issue: Extension doesn't activate

**Check:**
- VSCode version is 1.80.0+
- Node.js version is 20.0.0+
- All dependencies installed (`npm install`)
- TypeScript compiled successfully (`npm run compile`)

#### Issue: clang not found warnings

**Solution:**
- Install clang (see Prerequisites)
- Or ignore - extension will use primitive parser
- Check console output for parser being used

### Build Scripts Reference

- `npm run compile` - Compile TypeScript once
- `npm run watch` - Watch mode (continuous compilation)
- `npm run lint` - Run ESLint
- `npm test` - Run tests (if configured)
- `npm run vscode:prepublish` - Prepare for publishing (runs compile)

### Project Structure After Build

```
vscode-dataflow-analyzer/
├── src/                    # TypeScript source files
├── out/                    # Compiled JavaScript (generated)
│   ├── extension.js       # Main entry point
│   ├── analyzer/          # Analysis modules
│   ├── visualizer/        # Visualization modules
│   ├── state/             # State management
│   └── types.js           # Type definitions
├── node_modules/          # Dependencies (generated)
├── package.json           # Project manifest
├── tsconfig.json          # TypeScript config
└── README.md              # This file
```

### Quick Start Checklist

- [ ] Node.js 20+ installed
- [ ] npm installed
- [ ] VSCode 1.80+ installed
- [ ] Cloned/navigated to project directory
- [ ] Ran `npm install`
- [ ] Ran `npm run compile` (no errors)
- [ ] Opened project in VSCode
- [ ] Pressed `F5` to launch Extension Development Host
- [ ] Opened a C++ workspace in Extension Development Host
- [ ] Ran "Analyze Workspace" command
- [ ] Opened CFG visualizer

### Next Steps After Building

1. **Test with Example Code:**
   - Use the provided `example.cpp` file
   - Or create your own C++ test files

2. **Explore Features:**
   - Run analysis on your codebase
   - View CFG visualization
   - Check vulnerability detection
   - Explore attack paths

3. **Customize:**
   - Adjust settings in VSCode preferences
   - Modify analysis configurations
   - Extend vulnerability patterns

## 📖 Usage

### Basic Workflow

1. **Open a C++ Workspace**
   - Open a folder containing C++ files (.cpp, .cxx, .cc, .c, .hpp, .h)

2. **Run Analysis**
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS)
   - Type "Analyze Workspace" and select it
   - Wait for analysis to complete

3. **View CFG Visualization**
   - Press `Ctrl+Shift+P`
   - Type "Show Control Flow Graph" and select it
   - The CFG visualizer will open in a new panel

4. **Explore Vulnerabilities**
   - Click on the "Vulnerabilities" tab in the visualizer
   - Click any vulnerability to highlight its attack path
   - View detailed information including CWE links and recommendations

5. **Analyze Attack Paths**
   - Click on the "Attack Paths" tab
   - See step-by-step breakdown of each attack path
   - Click "Highlight in Graph" to visualize the path

### Configuration

Open VSCode settings (`Ctrl+,` or `Cmd+,`) and search for "Dataflow Analyzer":

- **Update Mode**: Choose when to trigger analysis
  - `keystroke`: Update on every keystroke (with debounce)
  - `save`: Update only when files are saved (default)

- **Debounce Delay**: Delay in milliseconds for keystroke mode (default: 500ms)

- **Enable Liveness**: Toggle liveness analysis (default: true)

- **Enable Reaching Definitions**: Toggle reaching definitions analysis (default: true)

- **Enable Taint Analysis**: Toggle taint analysis (default: true)

### Commands

- `dataflowAnalyzer.showCFG` - Show Control Flow Graph visualizer
- `dataflowAnalyzer.analyzeWorkspace` - Analyze entire workspace
- `dataflowAnalyzer.clearState` - Clear saved analysis state

## 🏗️ Architecture

### Project Structure

```
vscode-dataflow-analyzer/
├── src/
│   ├── analyzer/
│   │   ├── CPPParser.ts              # Primitive parser (fallback)
│   │   ├── EnhancedCPPParser.ts      # Main parser using clang AST
│   │   ├── ClangASTParser.ts         # Clang AST parsing wrapper
│   │   ├── DataflowAnalyzer.ts       # Main orchestrator
│   │   ├── LivenessAnalyzer.ts       # Liveness analysis
│   │   ├── ReachingDefinitionsAnalyzer.ts  # Reaching definitions
│   │   ├── TaintAnalyzer.ts          # Taint analysis
│   │   └── SecurityAnalyzer.ts       # Vulnerability detection
│   ├── visualizer/
│   │   └── CFGVisualizer.ts          # CFG webview visualizer
│   ├── state/
│   │   └── StateManager.ts           # State persistence
│   ├── types.ts                      # Type definitions
│   └── extension.ts                  # Extension entry point
├── out/                              # Compiled JavaScript
├── package.json                      # Extension manifest
├── tsconfig.json                     # TypeScript configuration
└── README.md                         # This file
```

### Key Components

1. **Parser Layer**
   - `ClangASTParser`: Wraps clang command-line tool for AST parsing
   - `EnhancedCPPParser`: Main parser that uses AST or falls back to primitive parsing
   - Extracts functions, variables, statements, and control flow

2. **Analysis Layer**
   - `LivenessAnalyzer`: Backward dataflow analysis for liveness
   - `ReachingDefinitionsAnalyzer`: Forward dataflow analysis for reaching definitions
   - `TaintAnalyzer`: Forward propagation of taint information
   - `SecurityAnalyzer`: Vulnerability pattern detection

3. **Visualization Layer**
   - `CFGVisualizer`: Webview-based interactive CFG visualization
   - Uses vis-network for graph rendering
   - Real-time updates and interactive features

4. **State Management**
   - `StateManager`: Handles persistence of analysis state
   - JSON-based storage in `.vscode/dataflow-state.json`
   - Per-workspace state management

## 🔍 Vulnerability Detection

### Supported Vulnerability Types

The extension detects the following vulnerability types:

1. **Buffer Overflow** (CWE-120)
   - Unsafe buffer operations (strcpy, strcat, sprintf, gets, etc.)
   - Missing bounds checking

2. **Use After Free** (CWE-416)
   - Pointer use after free() call
   - Memory corruption risks

3. **Double Free** (CWE-415)
   - Multiple free() calls on same pointer

4. **Format String Vulnerability** (CWE-134)
   - User-controlled format strings
   - printf family functions

5. **Command Injection** (CWE-78)
   - system(), popen(), exec*() with tainted input

6. **SQL Injection** (CWE-89)
   - Unsafe SQL query construction

7. **Path Traversal** (CWE-22)
   - Unsafe file operations

8. **Uninitialized Variable** (CWE-457)
   - Use of uninitialized variables

9. **Unsafe Function Calls**
   - Various unsafe C/C++ functions

### Attack Path Visualization

The source-to-sink path visualization shows:

- **Source Blocks**: Where tainted data enters (highlighted in cyan)
- **Propagation Blocks**: Intermediate blocks where taint flows (highlighted in orange)
- **Sink Blocks**: Where vulnerabilities occur (highlighted in red)
- **Path Edges**: Colored edges showing the attack path

Each path includes:
- Step-by-step breakdown
- Block labels and statements
- Vulnerability details
- CWE links
- Recommendations

## 🛠️ Development

### Prerequisites

- Node.js 20+
- npm or yarn
- TypeScript 5+
- VSCode 1.80+

### Setup Development Environment

```bash
# Clone repository
git clone <repository-url>
cd vscode-dataflow-analyzer

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch
```

### Running Tests

```bash
npm test
```

### Building

```bash
# Compile TypeScript
npm run compile

# Create VSIX package
npm install -g vsce
vsce package
```

### Debugging

1. Open the project in VSCode
2. Press `F5` to launch Extension Development Host
3. Set breakpoints in TypeScript files
4. Use VSCode debugger

## 📊 Analysis Algorithms

### Liveness Analysis

Uses backward dataflow analysis:

```
IN[B] = USE[B] ∪ (OUT[B] - DEF[B])
OUT[B] = ∪ IN[S] for all successors S of B
```

Iterates until fixed point is reached.

### Reaching Definitions

Uses forward dataflow analysis:

```
IN[B] = ∪ OUT[P] for all predecessors P of B
OUT[B] = GEN[B] ∪ (IN[B] - KILL[B])
```

### Taint Analysis

Forward propagation:
- Identifies taint sources (scanf, gets, read, etc.)
- Propagates taint through assignments
- Tracks propagation paths
- Identifies when taint reaches security sinks

## 🔐 Security Considerations

This tool is designed for:
- **Static Analysis**: Analyzing source code without execution
- **Security Research**: Understanding vulnerabilities and exploits
- **Code Review**: Identifying potential security issues
- **Education**: Learning about dataflow analysis and security

**Note**: This tool is not a replacement for:
- Dynamic analysis tools
- Fuzzing
- Penetration testing
- Security audits

## 🤝 Contributing

Contributions are welcome! Areas for improvement:

1. Additional vulnerability patterns
2. Inter-procedural analysis
3. Call graph construction
4. Symbolic execution integration
5. Performance optimizations
6. UI/UX improvements

## 📝 License

[Specify your license here]

## 🙏 Acknowledgments

- Uses [vis-network](https://visjs.github.io/vis-network/) for graph visualization
- Integrates with clang/LLVM for AST parsing
- Built on VSCode Extension API

## 📚 References

- [CWE - Common Weakness Enumeration](https://cwe.mitre.org/)
- [Clang Documentation](https://clang.llvm.org/docs/)
- [VSCode Extension API](https://code.visualstudio.com/api)
- [Dataflow Analysis](https://en.wikipedia.org/wiki/Data-flow_analysis)

## 🐛 Known Issues

- Inter-procedural analysis is limited (single function scope)
- Some complex C++ features may not be fully parsed
- Performance may degrade on very large codebases

## 🔮 Future Enhancements

See `IMPLEMENTATION_PLAN.md` for detailed roadmap including:
- Call graph analysis
- Inter-procedural taint analysis
- Exploitability scoring
- Patch suggestion engine
- Historical comparison
- Report generation
- And more...

---

**Built with ❤️ for security researchers and developers**
