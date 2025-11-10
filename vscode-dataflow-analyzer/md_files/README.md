# C++ Dataflow Analyzer & Security Vulnerability Detection

A comprehensive VSCode extension for real-time incremental static/dataflow analysis of C++ code with advanced security vulnerability detection and exploit post-mortem capabilities.

## 🎯 Overview

This extension provides powerful static analysis capabilities for C++ codebases, focusing on:
- **Control Flow Graph (CFG) Visualization** - Interactive real-time CFG building using official Clang/LLVM libraries
- **Dataflow Analysis** - Liveness, reaching definitions, and taint analysis with full propagation tracking
- **Inter-Procedural Analysis (IPA)** - Analysis across function boundaries with call graphs, parameter mapping, and return value tracking
- **Security Vulnerability Detection** - Automated detection of common vulnerabilities with source-to-sink path tracking
- **Attack Path Visualization** - Complete path visualization from taint sources to security sinks
- **Interconnected CFG Visualization** - Unified view of all functions with control flow, call, and data flow edges

Perfect for security researchers, developers, and code reviewers who need to understand dataflow and identify security vulnerabilities in C++ code.

## ✨ Key Features

### Core Analysis Features

1. **Liveness Analysis**
   - Determines which variables are live at each program point
   - Backward dataflow analysis with iterative fixed-point algorithm
   - Visualized in CFG with live-in and live-out sets
   - Academic-correct implementation per Cooper & Torczon

2. **Reaching Definitions Analysis**
   - Tracks where variable definitions reach through the program
   - Forward dataflow analysis with full propagation history
   - Shows definition-to-use chains with complete path tracking
   - Identifies all definitions that can reach each use point
   - Displays propagation paths showing CFG traversal
   - Function parameters initialized as definitions at entry block

3. **Taint Analysis** (v1.3+)
   - Enhanced taint source detection (user input, file I/O, network, environment, command line, database, configuration)
   - Taint sink detection (SQL injection, command injection, format string, path traversal, buffer overflow, code injection, integer overflow)
   - Sanitization detection (input validation, encoding, escaping, whitelisting, type conversion, length limits)
   - Enhanced propagation with taint labels (USER_INPUT, FILE_CONTENT, NETWORK_DATA, etc.)
   - Vulnerability detection with source-to-sink path tracking
   - Note: Inter-procedural taint propagation is planned for future releases (v1.7+)

4. **Inter-Procedural Analysis (IPA)** (v1.2+)
   - **Call Graph Construction**: Builds complete call graphs showing function call relationships
   - **Recursion Detection**: Identifies direct, mutual, and tail recursion
   - **External Function Identification**: Categorizes library and system calls
   - **Context-Insensitive Analysis**: Tracks variable definitions across function boundaries
   - **Parameter Mapping**: Maps actual arguments to formal parameters with 7 derivation types (direct, expression, composite, address, call, dereference, array access)
   - **Return Value Analysis**: Tracks return values back to call sites with 6 return types (variable, expression, call, constant, conditional, void)
   - **Function Summaries**: Pre-defined models for common C library functions
   - **Global Variable Handling**: Analyzes global variable definitions and uses

5. **Security Vulnerability Detection**
   - Buffer overflow detection (CWE-120)
   - Use-after-free detection (CWE-416)
   - Double free detection (CWE-415)
   - Format string vulnerabilities (CWE-134)
   - Command injection (CWE-78)
   - SQL injection (CWE-89)
   - Path traversal (CWE-22)
   - Unsafe function calls
   - Uninitialized variable usage (CWE-457)
   - Taint-based vulnerability detection with source-to-sink paths

6. **Source-to-Sink Path Visualization**
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

- **Interconnected CFG Visualization** (v1.5+)
  - Unified graph combining all function CFGs
  - Three edge types: Control Flow (green), Function Calls (blue), Data Flow (orange)
  - Red-highlighted function nodes for high visibility
  - Interactive visualization with click-to-inspect functionality
  - Physics-based layout for natural function grouping

- **Call Graph Visualization**
  - Interactive call graph with vis-network
  - Node styling for recursive/external functions
  - Call statistics and metrics display
  - DOT format export support

- **Taint Analysis Visualization**
  - Dedicated Taint Analysis tab
  - Taint summary with statistics
  - Tainted variables list with source information
  - Vulnerability list with interactive path highlighting
  - Source categories breakdown

- **Vulnerability Dashboard**
  - List all detected vulnerabilities
  - Display severity and CWE information
  - Click to highlight attack paths
  - CWE links displayed (when available)
  - Note: Filtering by severity/type planned for future releases

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

### Detailed Platform-Specific Instructions

#### macOS Setup

1. **Install Homebrew** (if not already installed)
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Install Required Tools**
   ```bash
   brew install node cmake llvm
   ```

3. **Configure LLVM Path** (for Homebrew LLVM)
   Add to `~/.zshrc` or `~/.bash_profile`:
   ```bash
   export PATH="/opt/homebrew/opt/llvm/bin:$PATH"
   export LDFLAGS="-L/opt/homebrew/opt/llvm/lib"
   export CPPFLAGS="-I/opt/homebrew/opt/llvm/include"
   ```
   Then: `source ~/.zshrc`

4. **Build CFG Exporter**
   ```bash
   cd cpp-tools/cfg-exporter
   mkdir -p build && cd build
   cmake .. -DLLVM_DIR=/opt/homebrew/opt/llvm/lib/cmake/llvm
   cmake --build .
   ```

#### Linux Setup

1. **Install Required Tools**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install -y nodejs npm cmake clang clang++ llvm llvm-dev build-essential git
   
   # RedHat/CentOS/Fedora
   sudo yum install -y nodejs npm cmake clang clang-tools-extra llvm llvm-devel gcc gcc-c++ make git
   ```

2. **Build CFG Exporter**
   ```bash
   cd cpp-tools/cfg-exporter
   mkdir -p build && cd build
   cmake ..
   cmake --build .
   ```

#### Windows Setup

1. **Install Node.js**: Download from [nodejs.org](https://nodejs.org/) (LTS version, 20.x or higher)

2. **Install CMake**: Download from [cmake.org](https://cmake.org/download/) - Choose "Windows x64 Installer", select "Add CMake to system PATH"

3. **Install LLVM/Clang**: Download from [llvm.org](https://github.com/llvm/llvm-project/releases) - Choose "LLVM-21.1.5-win64.exe", select "Add LLVM to the system PATH"

4. **Install Visual Studio Build Tools**: Download from [visualstudio.microsoft.com](https://visualstudio.microsoft.com/downloads/) - Choose "Desktop development with C++" and "CMake tools for Windows"

5. **Build CFG Exporter**
   ```powershell
   cd cpp-tools\cfg-exporter
   mkdir build -Force
   cd build
   cmake ..
   cmake --build . --config Release
   ```

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

4. **Explore Features**
   - **CFG Tab**: View individual function control flow graphs
   - **Call Graph Tab**: See function call relationships
   - **Parameters & Returns Tab**: View parameter mapping and return value analysis
   - **Inter-Procedural Tab**: See inter-procedural dataflow analysis
   - **Taint Analysis Tab**: View taint sources, sinks, and vulnerabilities
   - **Interconnected CFG Tab**: Unified view of all functions with all edge types

5. **Explore Vulnerabilities**
   - Click on the "Taint Analysis" tab in the visualizer
   - Click any vulnerability to highlight its attack path
   - View detailed information including CWE links and recommendations

### Configuration

Open VSCode settings (`Ctrl+,` or `Cmd+,`) and search for "Dataflow Analyzer":

- **Update Mode**: Choose when to trigger analysis
  - `keystroke`: Update on every keystroke (with debounce)
  - `save`: Update only when files are saved (default)

- **Debounce Delay**: Delay in milliseconds for keystroke mode (default: 500ms)

- **Enable Liveness**: Toggle liveness analysis (default: true)

- **Enable Reaching Definitions**: Toggle reaching definitions analysis (default: true)

- **Enable Taint Analysis**: Toggle taint analysis (default: true)

- **Enable Inter-Procedural**: Toggle inter-procedural analysis (default: true)

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
│   │   ├── CPPParser.ts                      # Primitive parser (fallback)
│   │   ├── EnhancedCPPParser.ts              # Main parser using CFG exporter
│   │   ├── ClangASTParser.ts                 # CFG exporter wrapper (uses libclang)
│   │   ├── DataflowAnalyzer.ts               # Main orchestrator
│   │   ├── LivenessAnalyzer.ts               # Liveness analysis (backward DFA)
│   │   ├── ReachingDefinitionsAnalyzer.ts    # Reaching definitions (forward DFA)
│   │   ├── TaintAnalyzer.ts                  # Taint analysis (forward propagation)
│   │   ├── TaintSourceRegistry.ts            # Taint source registry
│   │   ├── TaintSinkRegistry.ts              # Taint sink registry
│   │   ├── SanitizationRegistry.ts           # Sanitization function registry
│   │   ├── SecurityAnalyzer.ts               # Vulnerability detection & attack path
│   │   ├── CallGraphAnalyzer.ts              # Call graph construction (Phase 1)
│   │   ├── CallGraphAnalyzer.Extensions.ts   # Advanced call graph analysis (Phase 2)
│   │   ├── InterProceduralReachingDefinitions.ts  # Inter-procedural dataflow (Phase 3)
│   │   ├── ParameterAnalyzer.ts              # Parameter mapping (Phase 4)
│   │   ├── ReturnValueAnalyzer.ts            # Return value analysis (Phase 4)
│   │   ├── FunctionSummaries.ts              # Library function summaries (Phase 4)
│   │   ├── FunctionCallExtractor.ts          # Robust function call extraction
│   │   └── __tests__/                        # Unit tests
│   ├── visualizer/
│   │   └── CFGVisualizer.ts                  # CFG webview visualizer (vis-network)
│   ├── state/
│   │   └── StateManager.ts                   # State persistence (.vscode/dataflow-state.json)
│   ├── types.ts                              # Type definitions (CFG, Analysis, etc.)
│   └── extension.ts                          # Extension entry point
├── cpp-tools/
│   └── cfg-exporter/                         # C++ CFG exporter tool
│       ├── cfg-exporter.cpp                  # Main CFG exporter using libclang
│       ├── CMakeLists.txt                    # CMake build configuration
│       ├── build/
│       │   └── cfg-exporter                  # Compiled binary (after build)
│       └── README.md                         # CFG exporter documentation
├── out/                                      # Compiled JavaScript (generated)
├── package.json                              # Extension manifest
├── tsconfig.json                             # TypeScript configuration
└── README.md                                 # This file
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
   - Entry/exit block detection using graph-theoretic properties (no predecessors/successors)

2. **Analysis Layer**
   - **LivenessAnalyzer.ts**: Backward dataflow analysis
     - Equation: `IN[B] = USE[B] ∪ (OUT[B] - DEF[B])`
     - Equation: `OUT[B] = ∪ IN[S] for all successors S`
     - Fixed-point iteration until convergence
     - Based on Dragon Book & Cooper & Torczon algorithms
   
   - **ReachingDefinitionsAnalyzer.ts**: Forward dataflow analysis
     - Equation: `IN[B] = ∪ OUT[P] for all predecessors P`
     - Equation: `OUT[B] = GEN[B] ∪ (IN[B] - KILL[B])`
     - Tracks definition propagation through CFG
     - Maintains complete path history for each definition
     - Function parameters initialized as definitions at entry block
     - MAX_ITERATIONS safety check to prevent infinite loops
     - Cycle detection in propagation paths
     - Academic-correct implementation
   
   - **TaintAnalyzer.ts**: Forward propagation of taint information
     - Enhanced source detection (7 categories)
     - Sink detection (7 vulnerability types)
     - Sanitization detection (6 sanitization types)
     - Taint label propagation
     - Vulnerability detection with source-to-sink path tracking
     - Worklist algorithm with Set-based deduplication
     - Note: Inter-procedural taint propagation planned for v1.7+
   
   - **CallGraphAnalyzer.ts**: Call graph construction (Phase 1)
     - Function call extraction from CFG statements
     - Caller/callee relationship mapping
     - Direct recursion detection
     - Mutual recursion detection using DFS
     - Tail recursion identification
   
   - **CallGraphAnalyzer.Extensions.ts**: Advanced call graph analysis (Phase 2)
     - External function identification (5 categories: STDLIB, CSTDLIB, POSIX, SYSTEM, UNKNOWN)
     - Pre-defined summaries for 13+ common library functions (printf, scanf, malloc, free, strcpy, memcpy, open, read, write, close, system, exit, etc.)
     - Recursion depth calculation
     - Strongly connected components (Tarjan's algorithm)
     - Call statistics and metrics
   
   - **InterProceduralReachingDefinitions.ts**: Inter-procedural dataflow (Phase 3)
     - Context-insensitive analysis
     - Definition propagation through function calls
     - Parameter mapping
     - Return value propagation
     - Global variable handling
     - Fixed-point iteration with MAX_ITERATIONS
   
   - **ParameterAnalyzer.ts**: Parameter mapping (Phase 4)
     - 7 types of argument derivations (direct, expression, composite, address, call, dereference, array access)
     - Sophisticated parameter-to-argument mapping
   
   - **ReturnValueAnalyzer.ts**: Return value analysis (Phase 4)
     - 6 return value types (variable, expression, call, constant, conditional, void)
     - Return value extraction and tracking
   
   - **FunctionSummaries.ts**: Library function summaries (Phase 4)
     - Pre-defined models for common C library functions
     - Parameter effects and return value tracking
   
   - **SecurityAnalyzer.ts**: Vulnerability pattern detection and attack path construction

3. **Visualization Layer**
   - `CFGVisualizer.ts`: Webview-based interactive CFG visualization
   - Uses vis-network for graph rendering
   - Displays blocks in topological order (academic CFG standard)
   - Shows liveness, reaching definitions, and taint information on blocks
   - Real-time updates and interactive features
   - Color-coded blocks for vulnerability severity
   - Tabbed interface: CFG, Call Graph, Parameters & Returns, Inter-Procedural, Taint Analysis, Interconnected CFG
   - Separate information windows for block info and call graph info
   - Debug toggle for debug information panel
   - Interconnected CFG visualization with three edge types

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

**Implementation:**
- Collects all definitions in function upfront (including function parameters at entry block)
- Computes GEN and KILL sets for each block
- Iteratively propagates definitions
- Tracks propagation path for each definition: `sourceBlock -> ... -> currentBlock`
- MAX_ITERATIONS safety check (10 * number of blocks)
- Cycle detection in propagation paths (represented as `[cycle]*`)
- Enhanced to store full history for debugging and visualization

#### Taint Analysis (Forward)

Forward propagation with source/sink identification:

```
Sources: scanf, gets, fgets, read, network input, file I/O, environment, etc.
Sinks: printf, puts, write, sprintf, system, SQL queries, etc.
Sanitization: Input validation, encoding, escaping, whitelisting, etc.

For each statement:
  - If assignment: propagate taint from RHS to LHS
  - If sink: flag vulnerability if tainted variable used
  - If sanitization: remove taint from sanitized variables
  - Track path from source to sink
```

**Implementation:**
- Enhanced source registry with 7 categories
- Sink registry with 7 vulnerability types
- Sanitization registry with 6 sanitization types
- Taint label propagation (USER_INPUT, FILE_CONTENT, NETWORK_DATA, etc.)
- Vulnerability detection with source-to-sink path tracking
- Worklist algorithm with Set-based deduplication
- Note: Inter-procedural taint propagation planned for v1.7+

#### Inter-Procedural Analysis

**Call Graph Construction:**
- Extracts function calls from CFG statements
- Builds caller/callee relationship maps
- Detects direct, mutual, and tail recursion
- Identifies external/library functions

**Inter-Procedural Dataflow:**
- Fixed-point iteration across function boundaries
- Parameter mapping (7 derivation types)
- Return value tracking (6 return types)
- Global variable handling
- Function summaries for library functions

### CFG Generation Pipeline

1. **Source File** → `cfg-exporter` (C++ tool)
2. `cfg-exporter` uses `clang::CFG::buildCFG()`
3. Generates JSON with CFG structure (blocks, edges, statements)
4. `ClangASTParser.ts` parses JSON
5. `EnhancedCPPParser.ts` extracts function information
6. Entry/exit block detection using graph-theoretic properties
7. `DataflowAnalyzer.ts` orchestrates analyses
8. Results stored and visualized

### Academic Correctness

- Uses official `clang::CFG::buildCFG()` from libclang/LLVM
- CFG follows academic standard: Entry → Basic Blocks → Exit
- Entry block = block with no predecessors
- Exit block = block with no successors
- Each block has statements, predecessors, successors
- Dataflow equations match standard compiler textbooks
- Topological sorting for visualization follows academic standards
- Propagation paths track complete flow through CFG
- Function parameters initialized as definitions at entry (academic standard)
- MAX_ITERATIONS safety checks prevent infinite loops
- Cycle detection in propagation paths

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

9. **Taint-Based Vulnerabilities**
   - Detected when tainted data reaches security sinks without sanitization
   - Includes all above types when taint analysis is enabled

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

## 📝 License

[Specify your license here]

## 🙏 Acknowledgments

- Uses [vis-network](https://visjs.github.io/vis-network/) for graph visualization
- Integrates with clang/LLVM for AST parsing and CFG generation
- Built on VSCode Extension API
- Algorithms from Dragon Book (Aho, Sethi, Ullman) and Engineering a Compiler (Cooper & Torczon)

## 📚 Documentation

- **README.md**: Complete user guide and feature documentation
- **FUTURE_PLANS.md**: Roadmap and planned enhancements
- **FRAMEWORK.md**: Technical architecture and design decisions
- **MANUAL_TESTING_GUIDE.md**: Step-by-step manual testing procedures for v1.6.0
- **validate_v1.6.sh**: Automated validation script for v1.6.0 improvements
- **validate_v1.6.md**: Validation checklist and test procedures

## 📚 References

- [CWE - Common Weakness Enumeration](https://cwe.mitre.org/)
- [Clang Documentation](https://clang.llvm.org/docs/)
- [VSCode Extension API](https://code.visualstudio.com/api)
- [Dataflow Analysis](https://en.wikipedia.org/wiki/Data-flow_analysis)
- [Dragon Book](https://www.pearsonhighered.com/program/Aho-Compilers-Principles-Techniques-and-Tools-2nd-Edition/PGM310509.html)
- [Engineering a Compiler](https://www.elsevier.com/books/engineering-a-compiler/cooper/978-0-12-811905-1)

## 🐛 Known Issues

- Inter-procedural analysis context sensitivity is limited (context-insensitive only)
- Some complex C++ features may not be fully parsed
- Performance may degrade on very large codebases
- Inter-procedural taint propagation not yet implemented (planned for v1.7+)

## 📈 Version History

### v1.8.0 (December 2024)
- **🎉 MAJOR**: Completed all LOGIC.md fixes (15/15) - comprehensive code quality improvements:
  - **Phase 1 (Critical Algorithm Fixes)**: MAX_ITERATIONS safety, Taint Analysis RD map fix, Null checks
  - **Phase 2 (Concurrency & Safety)**: Race condition mutex, Propagation path tracking, Error handling
  - **Phase 3 (Algorithm Correctness)**: GEN set computation, Fixed-point detection, CFG validation
  - **Phase 4 (Code Quality)**: Map/Object consistency, Memory leak fixes, Error logging utility, Set optimization, Hardcoded list removal, Type guards
- **Added**: Centralized error logging utility (ErrorLogger.ts)
- **Added**: Comprehensive agent onboarding guide (CLICK_ME.md)
- **Improved**: Algorithm correctness and robustness across all analyzers
- **Improved**: Code quality and maintainability
- **Improved**: Documentation completeness and organization

### v1.7.0 (December 2024)
- **Added**: Comprehensive JSDoc comments to SecurityAnalyzer.ts
- **Added**: Manual testing guide (MANUAL_TESTING_GUIDE.md) for visualization verification
- **Improved**: Documentation organization and completeness
- **Completed**: Task 11 - Comprehensive code comments
- **Completed**: Task 7 - Webview error handling improvements
- **Completed**: Task 10 - Documentation review and updates
- **🎉 MAJOR**: Completed all LOGIC.md fixes (15/15) - comprehensive code quality improvements:
  - **Phase 1 (Critical Algorithm Fixes)**: MAX_ITERATIONS safety, Taint Analysis RD map fix, Null checks
  - **Phase 2 (Concurrency & Safety)**: Race condition mutex, Propagation path tracking, Error handling
  - **Phase 3 (Algorithm Correctness)**: GEN set computation, Fixed-point detection, CFG validation
  - **Phase 4 (Code Quality)**: Map/Object consistency, Memory leak fixes, Error logging utility, Set optimization, Hardcoded list removal, Type guards
- **Added**: Centralized error logging utility (ErrorLogger.ts)
- **Improved**: Algorithm correctness and robustness across all analyzers
- **Improved**: Code quality and maintainability

### v1.6.0 (December 2024)
- **Fixed**: Blue edges (function call edges) now correctly display in interconnected CFG
- **Fixed**: Orange edges (data flow edges) now correctly display with improved visibility
- **Added**: Panel tracking for multi-file visualization management
- **Improved**: Enhanced webview error handling with graceful degradation
- **Improved**: Better edge styling (brighter colors, increased width, better dash patterns)
- **Added**: Comprehensive error handling for vis-network loading failures
- **Added**: JSON parsing error handling throughout webview code
- **Added**: Network creation error handling for all visualization types
- **Added**: Comprehensive JSDoc comments to all major analyzer files
- **Added**: Manual testing guide for visualization verification
- **Technical**: Fixed Map data structure handling for call graph iteration
- **Technical**: Corrected blockId usage for data flow edge construction

- **v1.5.1**: Documentation consolidation - merged all technical docs into README.md and FUTURE_PLANS.md
- **v1.5.0**: Interconnected CFG visualization with red-highlighted function nodes
- **v1.4.0**: Fix critical code review issues, improved entry/exit block detection
- **v1.3.0**: Enhanced taint analysis with sanitization, vulnerability detection, and GUI integration
- **v1.2.0**: Inter-Procedural Analysis (IPA) with Call Graphs, Parameter Analysis, and Enhanced GUI
- **v1.1.1**: Add comprehensive code comments to analyzer modules
- **v1.1.0**: Fixed reaching definitions analysis with full propagation tracking

---

**Built with ❤️ for security researchers and developers**

**Version**: 1.8.0  
**Last Updated**: December 2024