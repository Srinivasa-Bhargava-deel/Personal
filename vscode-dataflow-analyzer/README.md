# C++ Dataflow Analyzer & Security Vulnerability Detection

A comprehensive VSCode extension for real-time incremental static/dataflow analysis of C++ code with advanced security vulnerability detection and exploit post-mortem capabilities.

## 🎯 Overview

This extension provides powerful static analysis capabilities for C++ codebases, focusing on:
- **Control Flow Graph (CFG) Visualization** - Interactive real-time CFG building using official Clang/LLVM libraries
- **Dataflow Analysis** - Liveness, reaching definitions, and taint analysis with full propagation tracking
- **Security Vulnerability Detection** - Automated detection of common vulnerabilities
- **Attack Path Visualization** - Source-to-sink path tracking for exploit analysis
- **Exploit Post-Mortem Support** - Tools for analyzing and understanding security vulnerabilities

Perfect for security researchers, developers, and code reviewers who need to understand dataflow and identify security vulnerabilities in C++ code.

## ✨ Key Features

### Core Analysis Features

1. **Liveness Analysis**
   - Determines which variables are live at each program point
   - Backward dataflow analysis with iterative fixed-point algorithm
   - Visualized in CFG with live-in and live-out sets
   - Academic-correct implementation per Cooper & Torczon

2. **Reaching Definitions Analysis** ⭐ NEW (v1.1)
   - Tracks where variable definitions reach through the program
   - Forward dataflow analysis with full propagation history
   - Shows definition-to-use chains with complete path tracking
   - Identifies all definitions that can reach each use point
   - Displays propagation paths showing CFG traversal

3. **Taint Analysis**
   - Tracks tainted data flow from sources (user input, network, etc.)
   - Forward propagation through assignments
   - Identifies security-sensitive data flows
   - Integration with reaching definitions for path tracking

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

5. **Source-to-Sink Path Visualization**
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
  - Topologically sorted blocks for academic correctness

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

- **Official Clang/LLVM Integration**
  - Uses `clang::CFG::buildCFG()` for accurate CFG generation
  - `cfg-exporter` C++ tool for theoretically sound CFGs
  - Direct libclang/LLVM integration
  - Ensures academic correctness

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

### Required (for CFG generation)

- **clang/clang++**: Version 21.1.5 or higher (from Homebrew recommended)
  - macOS: Install via `brew install llvm` or use Xcode Command Line Tools
  - Linux: Install via package manager (`apt-get install clang` or `yum install clang`)
  - Windows: Install from [llvm.org](https://llvm.org/)

- **CMake**: Version 3.16 or higher (required for building cfg-exporter)
  - macOS: `brew install cmake`
  - Linux: `sudo apt-get install cmake` or `sudo yum install cmake`
  - Windows: Download from [cmake.org](https://cmake.org/)

## 🚀 Installation & Build Instructions

**See [BUILD_AND_RUN_LAUNCH.md](BUILD_AND_RUN_LAUNCH.md) for platform-specific detailed instructions (macOS/Windows/Linux).**

### Quick Build Summary

1. **Install System Dependencies**
   ```bash
   # macOS
   brew install llvm cmake node
   
   # Linux (Ubuntu/Debian)
   sudo apt-get install clang clang++ cmake build-essential nodejs
   
   # Windows: Install from https://llvm.org, https://cmake.org, https://nodejs.org
   ```

2. **Build CFG Exporter**
   ```bash
   cd cpp-tools/cfg-exporter
   mkdir -p build && cd build
   cmake ..
   cmake --build .
   ```

3. **Build TypeScript Extension**
```bash
cd /path/to/vscode-dataflow-analyzer
npm install
   npm run compile
   ```

4. **Run Extension**
   - Open project in VSCode: `code .`
   - Press `F5` to launch Extension Development Host
   - Open a C++ workspace
   - Run "Analyze Workspace" command

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
- `dataflowAnalyzer.analyzeWorkspace` - Analyze entire workspace (excludes libraries/headers by default)
- `dataflowAnalyzer.analyzeActiveFile` - Analyze only the active C/C++ source file
- `dataflowAnalyzer.clearState` - Clear saved analysis state

## 🏗️ Architecture

### Project Structure

```
vscode-dataflow-analyzer/
├── src/
│   ├── analyzer/
│   │   ├── CPPParser.ts              # Primitive parser (fallback)
│   │   ├── EnhancedCPPParser.ts      # Main parser using CFG exporter
│   │   ├── ClangASTParser.ts         # CFG exporter wrapper (uses libclang)
│   │   ├── DataflowAnalyzer.ts       # Main orchestrator
│   │   ├── LivenessAnalyzer.ts       # Liveness analysis (backward DFA)
│   │   ├── ReachingDefinitionsAnalyzer.ts  # Reaching definitions (forward DFA)
│   │   ├── TaintAnalyzer.ts          # Taint analysis (forward propagation)
│   │   └── SecurityAnalyzer.ts       # Vulnerability detection & attack path
│   ├── visualizer/
│   │   └── CFGVisualizer.ts          # CFG webview visualizer (vis-network)
│   ├── state/
│   │   └── StateManager.ts           # State persistence (.vscode/dataflow-state.json)
│   ├── types.ts                      # Type definitions (CFG, Analysis, etc.)
│   └── extension.ts                  # Extension entry point
├── cpp-tools/
│   └── cfg-exporter/                 # C++ CFG exporter tool
│       ├── cfg-exporter.cpp          # Main CFG exporter using libclang
│       ├── CMakeLists.txt            # CMake build configuration
│       ├── build/
│       │   └── cfg-exporter          # Compiled binary (after build)
│       └── README.md                 # CFG exporter documentation
├── out/                              # Compiled JavaScript (generated)
├── package.json                      # Extension manifest
├── tsconfig.json                     # TypeScript configuration
└── README.md                         # This file
```

### Key Components

0. **CFG Exporter (C++ Tool)**
   - Location: `cpp-tools/cfg-exporter/cfg-exporter.cpp`
   - Uses official `clang::CFG::buildCFG()` from libclang
   - Uses `clang::RecursiveASTVisitor` for AST traversal
   - Generates CFG as JSON with blocks, statements, successors/predecessors
   - Compiled with CMake using official LLVM/Clang libraries
   - Ensures theoretically sound, academically correct CFGs

1. **Parser Layer**
   - `ClangASTParser.ts`: Wraps `cfg-exporter` binary (uses official libclang)
   - Parses JSON output from `cfg-exporter`
   - Converts CFG data to internal ASTNode format
   - `EnhancedCPPParser.ts`: Main parser that uses CFG exporter output
   - Extracts functions, basic blocks, statements, and control flow

2. **Analysis Layer**
   - **LivenessAnalyzer.ts**: Backward dataflow analysis
     - Equation: `IN[B] = USE[B] ∪ (OUT[B] - DEF[B])`
     - Fixed-point iteration until convergence
     - Based on Dragon Book & Cooper & Torczon algorithms
   
   - **ReachingDefinitionsAnalyzer.ts**: Forward dataflow analysis
     - Equation: `IN[B] = ∪ OUT[P] for all predecessors P`
     - Equation: `OUT[B] = GEN[B] ∪ (IN[B] - KILL[B])`
     - Tracks definition propagation through CFG
     - Maintains complete path history for each definition
     - Academic-correct implementation
   
   - **TaintAnalyzer.ts**: Forward propagation of taint information
   - **SecurityAnalyzer.ts**: Vulnerability pattern detection and attack path construction

3. **Visualization Layer**
   - `CFGVisualizer.ts`: Webview-based interactive CFG visualization
   - Uses vis-network for graph rendering
   - Displays blocks in topological order (academic CFG standard)
   - Shows liveness, reaching definitions, and taint information on blocks
   - Real-time updates and interactive features
   - Color-coded blocks for vulnerability severity

4. **State Management**
   - `StateManager.ts`: Handles persistence of analysis state
   - JSON-based storage in `.vscode/dataflow-state.json`
   - Per-workspace state management
   - Preserves analysis data across sessions

## 📊 Technical Details

### Dataflow Analysis Algorithms

#### Liveness Analysis (Backward)

Academic formulation based on Dragon Book (Aho, Sethi, Ullman):

```
IN[B] = USE[B] ∪ (OUT[B] - DEF[B])
OUT[B] = ∪ IN[S] for all successors S of B

Iterate until fixed point (no changes in any IN/OUT set)
```

**Implementation:**
- Traverses CFG blocks in reverse postorder
- Iteratively computes IN/OUT sets
- Converges when no changes occur

#### Reaching Definitions (Forward)

Academic formulation based on Cooper & Torczon:

```
IN[B] = ∪ OUT[P] for all predecessors P of B
OUT[B] = GEN[B] ∪ (IN[B] - KILL[B])

GEN[B] = definitions generated in block B
KILL[B] = definitions killed (overwritten) in block B

Iterate until fixed point
```

**Implementation (v1.1):**
- Collects all definitions in function upfront
- Computes GEN and KILL sets for each block
- Iteratively propagates definitions
- Tracks propagation path for each definition: `sourceBlock -> ... -> currentBlock`
- Enhanced to store full history for debugging and visualization

#### Taint Analysis (Forward)

Forward propagation with source/sink identification:

```
Sources: scanf, gets, read, network input, etc.
Sinks: printf, puts, write, sprintf, system, etc.

For each statement:
  - If assignment: propagate taint from RHS to LHS
  - If sink: flag vulnerability if tainted variable used
  - Track path from source to sink
```

### CFG Generation Pipeline

1. **Source File** → `cfg-exporter` (C++ tool)
2. `cfg-exporter` uses `clang::CFG::buildCFG()`
3. Generates JSON with CFG structure (blocks, edges, statements)
4. `ClangASTParser.ts` parses JSON
5. `EnhancedCPPParser.ts` extracts function information
6. `DataflowAnalyzer.ts` orchestrates analyses
7. Results stored and visualized

### Academic Correctness

- Uses official `clang::CFG::buildCFG()` from libclang/LLVM
- CFG follows academic standard: Entry → Basic Blocks → Exit
- Each block has statements, predecessors, successors
- Dataflow equations match standard compiler textbooks
- Topological sorting for visualization follows academic standards
- Propagation paths track complete flow through CFG

## 🔍 Vulnerability Detection

### Supported Vulnerability Types

1. **Buffer Overflow** (CWE-120)
   - Unsafe buffer operations (strcpy, strcat, sprintf, gets)
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

### Attack Path Analysis

Each vulnerability includes:
- **Source Blocks**: Where tainted data enters (cyan)
- **Propagation Blocks**: Intermediate blocks (orange)
- **Sink Blocks**: Where vulnerabilities occur (red)
- **Complete Path**: Step-by-step CFG traversal
- **CWE Information**: Link to MITRE CWE database
- **Recommendations**: How to fix the vulnerability

## 🛠️ Development

### Prerequisites

- Node.js 20+
- npm or yarn
- TypeScript 5+
- VSCode 1.80+
- CMake 3.16+
- Clang/LLVM 21.1.5+

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

# Build CFG exporter
cd cpp-tools/cfg-exporter
mkdir -p build && cd build
cmake ..
cmake --build .
```

### Build Scripts Reference

- `npm run compile` - Compile TypeScript once
- `npm run watch` - Watch mode (continuous compilation)
- `npm run lint` - Run ESLint
- `npm test` - Run tests (if configured)
- `npm run vscode:prepublish` - Prepare for publishing

### Debugging

1. Open the project in VSCode
2. Press `F5` to launch Extension Development Host
3. Set breakpoints in TypeScript files
4. Use VSCode debugger

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
- Integrates with clang/LLVM for AST parsing and CFG generation
- Built on VSCode Extension API
- Algorithms from Dragon Book (Aho, Sethi, Ullman) and Engineering a Compiler (Cooper & Torczon)

## 📚 References

- [CWE - Common Weakness Enumeration](https://cwe.mitre.org/)
- [Clang Documentation](https://clang.llvm.org/docs/)
- [VSCode Extension API](https://code.visualstudio.com/api)
- [Dataflow Analysis](https://en.wikipedia.org/wiki/Data-flow_analysis)
- [Dragon Book](https://www.pearsonhighered.com/program/Aho-Compilers-Principles-Techniques-and-Tools-2nd-Edition/PGM310509.html)
- [Engineering a Compiler](https://www.elsevier.com/books/engineering-a-compiler/cooper/978-0-12-811905-1)

## 🐛 Known Issues

- Inter-procedural analysis is limited (single function scope)
- Some complex C++ features may not be fully parsed
- Performance may degrade on very large codebases

## 🔮 Future Enhancements

- Call graph analysis
- Inter-procedural taint analysis
- Exploitability scoring
- Patch suggestion engine
- Historical comparison
- Report generation

---

**Built with ❤️ for security researchers and developers**

**Version**: 1.1.0  
**Last Updated**: November 2025
