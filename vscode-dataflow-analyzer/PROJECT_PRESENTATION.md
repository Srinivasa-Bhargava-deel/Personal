# C++ Dataflow Analyzer: Technical Presentation

## Slide 1: Project Overview

### **C++ Dataflow Analyzer Extension**
- **VS Code extension** for **static analysis** of C++ code
- **Real-time** CFG visualization and **dataflow analysis**
- **Security vulnerability detection** with **taint analysis**
- Built on **official Clang/LLVM** libraries for **academic correctness**

### **Core Capabilities**
- **Control Flow Graph (CFG)** generation using `clang::CFG::buildCFG()`
- **Liveness analysis** (backward dataflow)
- **Reaching definitions** analysis (forward dataflow)
- **Taint analysis** with **5 sensitivity levels**
- **Inter-procedural analysis** across function boundaries
- **Security vulnerability detection** with **source-to-sink path tracking**

---

## Slide 2: Architecture Overview

### **Analysis Pipeline**
1. **Parsing**: C++ source → CFG (via `cfg-exporter` C++ tool)
2. **Intra-procedural**: Liveness, Reaching Definitions, Taint
3. **Inter-procedural**: Call graphs, Parameter mapping, Return values
4. **Visualization**: Interactive webview with **vis-network**

### **Key Components**
- **DataflowAnalyzer**: Main orchestrator
- **TaintAnalyzer**: Security-focused taint propagation
- **CallGraphAnalyzer**: Function call relationship construction
- **CFGVisualizer**: Interactive visualization layer
- **Extension.ts**: VS Code integration point

---

## Slide 3: CFG Generation Pipeline

### **cfg-exporter C++ Tool**
- **Uses official Clang/LLVM** libraries
- **`clang::CFG::buildCFG()`** for CFG generation
- **`clang::RecursiveASTVisitor`** for AST traversal
- **CMake build system** for compilation

### **Pipeline**
1. **C++ source file** → cfg-exporter
2. **AST construction** → Clang AST
3. **CFG generation** → Clang CFG
4. **JSON export** → Structured CFG data
5. **ClangASTParser** → Parses JSON
6. **EnhancedCPPParser** → Internal CFG format

---

## Slide 4: Extension.ts - Overview

### **Purpose**
- **VS Code extension entry point**
- **Extension lifecycle management**: Activation, deactivation
- **Command registration**: Show CFG, Analyze Workspace, etc.
- **Configuration management**: Taint sensitivity, update mode

### **Key Responsibilities**
- **Initialize** DataflowAnalyzer and CFGVisualizer
- **Register commands** with VS Code
- **Handle file watchers** for incremental updates
- **Manage state persistence** and save states list

---

## Slide 5: Extension.ts - Implementation

### **Commands**
- **Show CFG**: Opens CFG visualization panel
- **Analyze Workspace**: Analyzes all C++ files in workspace
- **Analyze Active File**: Analyzes only the active file
- **Clear State**: Clears saved analysis state
- **Save State**: Manually saves current state
- **Re-analyze**: Triggers re-analysis with current settings
- **Change Sensitivity**: Changes taint sensitivity and re-analyzes

### **Configuration**
- **Update Mode**: Keystroke or Save
- **Enable/Disable Analyses**: Liveness, Reaching Definitions, Taint
- **Taint Sensitivity**: MINIMAL → MAXIMUM
- **Inter-Procedural**: Enable/disable IPA features

---

## Slide 6: DataflowAnalyzer - Overview

### **Purpose**
- **Main orchestrator** of the analysis pipeline
- Coordinates all **intra-procedural** and **inter-procedural** analyses
- Manages **analysis state** and **visualization data preparation**
- **Central hub** for all analysis workflows

### **Responsibilities**
- **Parse** C++ files into CFGs
- **Execute** liveness, reaching definitions, taint analyses
- **Build** call graphs for IPA
- **Run** inter-procedural analyses
- **Prepare** visualization data

---

## Slide 7: DataflowAnalyzer - Implementation

### **Analysis Pipeline**
1. **File parsing** → CFG structures
2. **Intra-procedural**: Liveness, Reaching Definitions, Taint
3. **Call graph construction** → CallGraphAnalyzer
4. **Inter-procedural**: IPA RD, IPA Taint, Context-Sensitive Taint
5. **Visualization preparation** → CFGVisualizer
6. **State persistence** → StateManager

### **State Management**
- **AnalysisState**: Complete analysis results
- **Incremental updates**: SHA-256 file hashing
- **State persistence**: `.vscode/dataflow-state.json`
- **Mutex protection**: Prevents race conditions

---

## Slide 8: Intra-Procedural Analyses

### **Liveness Analysis**
- **Backward dataflow** analysis
- **Equation**: `IN[B] = USE[B] ∪ (OUT[B] - DEF[B])`
- **Fixed-point iteration** until convergence
- **Academic correctness**: Cooper & Torczon algorithm

### **Reaching Definitions Analysis**
- **Forward dataflow** analysis
- **Equation**: `IN[B] = ∪ OUT[P]`, `OUT[B] = GEN[B] ∪ (IN[B] - KILL[B])`
- **Path tracking**: Complete propagation history
- **Function parameters**: Initialized as definitions at entry

---

## Slide 9: FunctionCallExtractor - Overview

### **Purpose**
- **Extracts function calls** from CFG statements
- **CFG/AST-aware parsing** (not regex-based)
- Handles **Clang-specific formats** (recovery expressions, implicit casts)
- Used by **CallGraphAnalyzer** and **TaintAnalyzer**

### **Key Features**
- **Recursive extraction** for nested calls
- **Clang artifact removal** (recovery-expr, implicit casts)
- **Argument parsing** with proper nesting handling
- **Position tracking** for call sites

---

## Slide 10: FunctionCallExtractor - Implementation

### **Algorithm**
1. **Clean statement text**: Remove Clang artifacts
2. **Pattern matching**: Identifier followed by `(`
3. **Recursive extraction**: Handle nested calls
4. **Argument parsing**: Balance parentheses
5. **Position tracking**: Start/end positions

### **Handled Formats**
- **Normal**: `scanf("%d", &x)`
- **Recovery**: `<recovery-expr>(scanf, "%d", &x)`
- **Implicit casts**: `[B1.2](scanf("%d", &x))`
- **Nested**: `foo(bar(x), y)`

---

## Slide 11: TaintAnalyzer - Overview

### **Purpose**
- **Forward taint propagation** analysis
- Tracks **potentially malicious data** through the program
- **5 sensitivity levels**: MINIMAL → MAXIMUM
- **Source-to-sink tracking** for vulnerability detection

### **Key Features**
- **Taint sources**: User input, file I/O, network, environment
- **Taint propagation**: Through assignments and function calls
- **Taint sinks**: SQL injection, command injection, format strings
- **Control-dependent taint**: Implicit flow tracking

---

## Slide 12: TaintAnalyzer - Sensitivity Levels

### **MINIMAL**
- **Data-flow taint only** (explicit flow)
- **No control-dependent** taint
- **Fastest** analysis, **cleanest** visualization

### **CONSERVATIVE**
- **Basic control-dependent** taint (direct branches)
- **No nested** structures
- **Fast** analysis

### **BALANCED**
- **Full control-dependent** taint (including nested)
- **Inter-procedural** taint propagation
- **Recursive** propagation

---

## Slide 13: TaintAnalyzer - Sensitivity Levels (Continued)

### **PRECISE**
- **Path-sensitive** analysis (reduces false positives)
- **Field-sensitive** analysis (struct field level)
- **All BALANCED features**

### **MAXIMUM**
- **Context-sensitive** analysis (k-limited contexts)
- **Flow-sensitive** analysis (statement order awareness)
- **All PRECISE features**
- **Maximum precision**, slower analysis

---

## Slide 14: TaintAnalyzer - Source Registry

### **TaintSourceRegistry**
- **7 source categories**: User input, File I/O, Network, Environment, Command line, Database, Configuration
- **Function patterns**: `scanf`, `gets`, `fgets`, `read`, `recv`, `getenv`, `argv`
- **Automatic detection**: Identifies taint sources in statements
- **Label assignment**: USER_INPUT, FILE_CONTENT, NETWORK_DATA, etc.

### **Usage**
- **TaintAnalyzer** scans statements for source patterns
- **Marks variables** as tainted with appropriate labels
- **Tracks propagation path** from source

---

## Slide 15: TaintAnalyzer - Sink Registry

### **TaintSinkRegistry**
- **7 sink categories**: SQL injection, Command injection, Format string, Path traversal, Buffer overflow, Code injection, Integer overflow
- **Function patterns**: `printf`, `system`, `sprintf`, `strcpy`, `exec*`, SQL queries
- **Vulnerability mapping**: Sink → Vulnerability type
- **Severity classification**: Critical, High, Medium, Low

### **Usage**
- **TaintAnalyzer** checks if tainted variables reach sinks
- **Reports vulnerabilities** when taint reaches sink unsanitized
- **Constructs attack paths** from source to sink

---

## Slide 16: SanitizationRegistry - Overview

### **Purpose**
- **Registry of sanitization functions** that remove taint
- Prevents **false positives** by identifying safe operations
- **6 sanitization types**: Validation, Encoding, Escaping, Whitelist, Conversion, Length Limit
- Used by **TaintAnalyzer** to remove taint

### **Key Features**
- **Function detection**: Identifies sanitization calls
- **Taint removal**: Marks sanitized variables as safe
- **Type classification**: Categorizes sanitization methods
- **Custom sanitizers**: User-defined sanitization functions

---

## Slide 17: SanitizationRegistry - Implementation

### **Sanitization Types**
- **VALIDATION**: `isalnum()`, `isdigit()` → Input validation
- **ENCODING**: `url_encode()`, `html_encode()` → Data encoding
- **ESCAPING**: `sql_escape()`, `shell_escape()` → Special character escaping
- **WHITELIST**: Allowlist validation → Restricted character sets
- **CONVERSION**: Type conversion → Safe type transformations
- **LENGTH_LIMIT**: Buffer size limits → Bounds checking

### **Usage**
- **TaintAnalyzer** checks registry before reporting vulnerabilities
- **Removes taint** from sanitized variables
- **Prevents false positives** in security analysis

---

## Slide 18: SecurityAnalyzer - Overview

### **Purpose**
- **Detects security vulnerabilities** in C++ code
- Integrates with **taint analysis** for source-to-sink tracking
- **14 vulnerability types**: Buffer overflow, SQL injection, Command injection, etc.
- **CWE mapping** for vulnerability classification

### **Key Features**
- **Taint-based detection**: Tainted data → Security sinks
- **Pattern-based detection**: Unsafe operations
- **Attack path construction**: Source-to-sink paths
- **Severity classification**: Critical, High, Medium, Low

---

## Slide 19: SecurityAnalyzer - Implementation

### **Vulnerability Types**
- **Buffer Overflow**: `strcpy()`, `strcat()`, `sprintf()`
- **SQL Injection**: Unsafe SQL query construction
- **Command Injection**: `system()`, `popen()`, `exec*()`
- **Format String**: `printf()` with user-controlled format
- **Use-After-Free**: Pointer use after `free()`
- **Double Free**: Multiple `free()` calls
- **Path Traversal**: Unsafe file operations

### **Algorithm**
- **Check taint flow** to security sinks
- **Verify sanitization** (using SanitizationRegistry)
- **Construct attack paths** from source to sink
- **Classify severity** and **exploitability**

---

## Slide 20: CallGraphAnalyzer - Overview

### **Purpose**
- Builds **call graphs** for **inter-procedural analysis**
- Extracts **function calls** from CFG statements
- Creates **caller/callee relationship maps**
- **Phase 1** of IPA framework

### **Key Features**
- **Function call extraction** using `FunctionCallExtractor`
- **Recursion detection** (direct, mutual, tail recursion)
- **External function identification** (library/system calls)
- **Bidirectional mapping**: `callsFrom` and `callsTo`

---

## Slide 21: CallGraphAnalyzer - Implementation

### **Data Structures**
- **CallGraph**: Functions map, calls array, `callsFrom`, `callsTo`
- **FunctionCall**: Caller, callee, call site, arguments
- **FunctionMetadata**: CFG, parameters, return type, flags

### **Algorithm**
- **Iterate** through all function CFGs
- **Extract calls** from statements using `FunctionCallExtractor`
- **Build indices** for efficient lookup
- **Detect recursion** using **DFS** traversal
- **Identify externals** using predefined patterns

---

## Slide 22: ParameterAnalyzer - Overview

### **Purpose**
- **Sophisticated parameter mapping** for inter-procedural analysis
- Analyzes **argument derivation patterns**
- **7 derivation types**: Direct, Expression, Composite, Address, Call, Dereference, Array Access
- **Phase 4** of IPA framework

### **Key Features**
- **Derivation analysis**: How arguments are computed
- **Variable tracking**: Base variables and transformations
- **Type inference**: Argument types for matching
- **Position mapping**: Formal ↔ Actual parameter mapping

---

## Slide 23: ParameterAnalyzer - Implementation

### **Derivation Types**
- **DIRECT**: `foo(x)` → Direct variable reference
- **EXPRESSION**: `foo(x + 1)` → Arithmetic expression
- **COMPOSITE**: `foo(obj.field)` → Member access
- **ADDRESS**: `foo(&x)` → Address-of operator
- **CALL**: `foo(bar(y))` → Function call result
- **DEREFERENCE**: `foo(*ptr)` → Pointer dereference
- **ARRAY_ACCESS**: `foo(arr[i])` → Array indexing

### **Algorithm**
- **Parse argument expression**
- **Identify derivation pattern**
- **Extract base variables**
- **Track transformations**
- **Map to formal parameter**

---

## Slide 24: ReturnValueAnalyzer - Overview

### **Purpose**
- **Analyzes return statements** for inter-procedural analysis
- Tracks **return value patterns** and **variables used**
- **6 return types**: Variable, Expression, Call, Constant, Conditional, Void
- **Phase 4** of IPA framework

### **Key Features**
- **Return extraction**: Find all return statements
- **Pattern classification**: Identify return type
- **Variable tracking**: Variables used in return
- **Type inference**: Return type analysis

---

## Slide 25: ReturnValueAnalyzer - Implementation

### **Return Types**
- **VARIABLE**: `return x;` → Direct variable return
- **EXPRESSION**: `return x + 1;` → Arithmetic expression
- **CALL**: `return foo();` → Function call result
- **CONSTANT**: `return 5;` → Constant value
- **CONDITIONAL**: `return (cond) ? a : b;` → Ternary operator
- **VOID**: `return;` → No return value

### **Algorithm**
- **Scan all blocks** for return statements
- **Parse return expression**
- **Classify pattern type**
- **Extract used variables**
- **Infer return type**

---

## Slide 26: FunctionSummaries - Overview

### **Purpose**
- **Pre-defined models** for **library functions**
- Describes **parameter effects** and **return values**
- Enables **taint propagation** through external functions
- **Phase 4** of IPA framework

### **Key Information**
- **Parameter modes**: IN, OUT, INOUT
- **Return value** taint propagation
- **Global variable** effects
- **Taint summaries** for security analysis

---

## Slide 27: FunctionSummaries - Implementation

### **Summary Structure**
- **ParameterSummary**: Index, name, mode, taint propagation
- **ReturnValueSummary**: Type, taint status, dependencies
- **GlobalEffect**: Variable modifications and taint
- **FunctionSummary**: Complete function model

### **Example: strcpy**
- **Parameter 0** (dest): OUT mode
- **Parameter 1** (src): IN mode, **taints return**
- **Return value**: Tainted by parameter 1
- **Effect**: Copies taint from src to dest

---

## Slide 28: InterProceduralTaintAnalyzer - Overview

### **Purpose**
- **Extends taint analysis** across function boundaries
- Handles **parameter taint mapping** and **return value propagation**
- Uses **library function summaries** for external calls
- **Context-insensitive** base for context-sensitive enhancement

### **Key Features**
- **Parameter taint**: Maps actual arguments to formal parameters
- **Return value taint**: Propagates taint back to callers
- **Taint summaries**: Applies library function models
- **Fixed-point iteration**: Worklist algorithm

---

## Slide 29: InterProceduralTaintAnalyzer - Implementation

### **Algorithm**
1. **Process function calls**: Check if arguments are tainted
2. **Map taint**: Actual arguments → formal parameters
3. **Propagate within callee**: Use intra-procedural taint
4. **Track return values**: Extract and propagate back
5. **Apply summaries**: Use FunctionSummaries for libraries
6. **Iterate**: Until fixed point (no new taint)

### **Example**
```
main() {
  user_input = getchar();        // Tainted
  result = process(user_input);  // Parameter taint → process()
}
process(input) {                 // input tainted
  return input;                  // Return value tainted
}
```

---

## Slide 30: Context-Sensitive Taint Analysis - Overview

### **Purpose**
- **Enhances precision** of inter-procedural taint analysis
- Tracks taint with **call-site context**
- **Reduces false positives** by distinguishing call sites
- **k-limited context** (k=1 or k=2) for scalability

### **Key Concept**
- **Context-insensitive**: All calls to `f(x)` treated the same
- **Context-sensitive**: `f(tainted)` vs `f(safe)` tracked separately
- **K-limited**: Track last k functions in call stack

---

## Slide 31: Context-Sensitive Taint Analysis - Implementation

### **Algorithm**
- **Build call-site context** from call stack
- **Track taint state** per call site (arguments, return, globals)
- **Propagate taint** with context separation
- **Merge contexts** when k-limit reached
- **Worklist algorithm** for fixed-point iteration

### **Example**
```
main() → process(user_input)  [Context: main]
main() → process("safe")      [Context: main]
```
- **Two separate contexts** prevent false positives
- **Return value taint** propagated back with context

---

## Slide 32: CFGVisualizer - Overview

### **Purpose**
- **Interactive visualization** of CFGs and analysis results
- **Webview-based** using **vis-network** library
- **Multiple visualization tabs**: CFG, Call Graph, Taint, Inter-Procedural, Interconnected
- **Real-time updates** when analysis state changes

### **Key Features**
- **Panel management**: Multiple files, multiple views
- **Backend data preparation**: All data ready before display
- **Interactive exploration**: Click blocks for details
- **Sensitivity mismatch detection**: Automatic re-analysis

---

## Slide 33: CFGVisualizer - Implementation

### **Visualization Tabs**
- **CFG Tab**: Individual function control flow graphs
- **Call Graph Tab**: Function call relationships
- **Taint Analysis Tab**: Taint sources, sinks, vulnerabilities
- **Inter-Procedural Taint Tab**: Cross-function taint propagation
- **Interconnected CFG Tab**: Unified view with all edge types

### **Edge Types (Interconnected CFG)**
- **Green**: Control flow edges (within functions)
- **Blue**: Function call edges (between functions)
- **Orange**: Data flow edges (reaching definitions)

### **Data Preparation**
- **prepareGraphData()**: CFG visualization
- **prepareCallGraphData()**: Call graph visualization
- **prepareTaintData()**: Taint analysis visualization
- **prepareInterconnectedCFGData()**: Unified CFG visualization

---

## Slide 34: Inter-Procedural Analysis Framework

### **Phase 1: Call Graph Construction**
- **CallGraphAnalyzer**: Builds call graph
- **Recursion detection**: Direct, mutual, tail
- **External identification**: Library/system functions

### **Phase 2: Advanced Call Graph Analysis**
- **Statistics**: Call counts, recursion depth
- **Strongly connected components**: Tarjan's algorithm
- **External categorization**: STDLIB, CSTDLIB, POSIX, SYSTEM

---

## Slide 35: Inter-Procedural Analysis Framework (Continued)

### **Phase 3: Inter-Procedural Reaching Definitions**
- **Context-insensitive** analysis
- **Definition propagation** across function calls
- **Parameter mapping**: Actual → Formal
- **Return value tracking**: Callee → Caller

### **Phase 4: Parameter & Return Value Analysis**
- **ParameterAnalyzer**: 7 derivation types
- **ReturnValueAnalyzer**: 6 return types
- **FunctionSummaries**: Library function models

---

## Slide 36: Taint Analysis Features

### **Control-Dependent Taint**
- **Implicit flow** tracking through control dependencies
- **Fixed-point iteration** for propagation
- **Recursive propagation** through nested structures
- **Path-sensitive** analysis for precision

### **Taint Labels**
- **USER_INPUT**: From user input sources
- **FILE_CONTENT**: From file I/O
- **NETWORK_DATA**: From network input
- **CONTROL_DEPENDENT**: From control dependencies

---

## Slide 37: Visualization Features

### **Interactive CFG**
- **Click blocks** for detailed information
- **Color-coded nodes**: Tainted blocks, attack paths
- **Topological layout**: Academic CFG standard
- **Real-time updates**: As code changes

### **Interconnected CFG**
- **Unified graph**: All functions in one view
- **Three edge types**: Control flow, Function calls, Data flow
- **Dynamic block sizing**: Based on content
- **Edge type toggles**: Show/hide specific edge types

---

## Slide 38: State Management

### **State Persistence**
- **AnalysisState**: Complete analysis results
- **File-based storage**: `.vscode/dataflow-state.json`
- **Per-workspace**: Separate state per workspace
- **Cross-session**: Persists across VS Code restarts

### **Incremental Analysis**
- **SHA-256 file hashing**: Change detection
- **Selective re-analysis**: Only changed files
- **Performance optimization**: Faster updates
- **Save states list**: Tracks all saved states

---

## Slide 39: Academic Foundation

### **References**
- **"Engineering a Compiler"** (Cooper & Torczon): Dataflow analysis algorithms
- **"Compilers: Principles, Techniques, and Tools"** (Aho, Sethi, Ullman): Dragon Book
- **"Interprocedural Dataflow Analysis"** (Reps, Horwitz, Sagiv, 1995): IPA framework
- **"Context-Sensitive Interprocedural Analysis"** (Sharir & Pnueli, 1981): Context sensitivity

### **Correctness**
- **Official Clang CFG**: Uses `clang::CFG::buildCFG()`
- **Academic algorithms**: Standard dataflow equations
- **Theoretical soundness**: Follows compiler textbook methods

---

## Slide 40: Project Statistics

### **Codebase**
- **~15,000 lines** of TypeScript
- **~1,000 lines** of C++ (cfg-exporter)
- **25+ analyzer modules**
- **5 sensitivity levels** for taint analysis

### **Features**
- **14 vulnerability types** detected
- **7 taint source categories**
- **7 taint sink categories**
- **6 sanitization types**
- **7 parameter derivation types**
- **6 return value types**

---

## Slide 41: Use Cases

### **Security Research**
- **Vulnerability detection** in C++ codebases
- **Attack path visualization** from source to sink
- **Exploit post-mortem** analysis

### **Code Review**
- **Dataflow understanding**: How data flows through code
- **Taint tracking**: Where user input propagates
- **Vulnerability identification**: Security issues before deployment

### **Education**
- **CFG visualization**: Learn control flow structures
- **Dataflow analysis**: Understand compiler analysis techniques
- **Security analysis**: Learn taint analysis methods

---

## Slide 42: Technical Highlights

### **Official Clang Integration**
- **Not a parse-only solution**: Uses official Clang CFG generation
- **Academic correctness**: Theoretically sound CFGs
- **Cross-platform**: Windows, macOS, Linux support

### **Advanced Analysis**
- **Context-sensitive taint**: k-limited contexts
- **Path-sensitive analysis**: Reduces false positives
- **Field-sensitive analysis**: Struct field level tracking
- **Flow-sensitive analysis**: Statement order awareness

---

## Slide 43: Future Enhancements

### **Planned Features**
- **Pointer analysis**: More precise alias analysis
- **Symbolic execution**: Path exploration
- **Concurrency analysis**: Race condition detection
- **Performance optimization**: Faster analysis on large codebases

### **Research Directions**
- **Machine learning**: Vulnerability prediction
- **Incremental updates**: Faster re-analysis
- **Parallel analysis**: Multi-threaded processing

---

## Slide 44: Conclusion

### **Key Achievements**
- **Comprehensive static analysis** for C++ code
- **Security-focused** vulnerability detection
- **Academic correctness** using official Clang libraries
- **Interactive visualization** for exploration

### **Impact**
- **Security research**: Vulnerability detection and analysis
- **Code review**: Automated security scanning
- **Education**: Learning dataflow analysis techniques

---

## Slide 45: Questions & Discussion

### **Topics for Discussion**
- **Taint analysis** sensitivity levels and precision trade-offs
- **Inter-procedural analysis** challenges and solutions
- **Context-sensitive** analysis implementation details
- **Visualization** techniques and user interaction

### **Contact & Resources**
- **GitHub**: Repository with full source code
- **Documentation**: Comprehensive README and guides
- **Version**: 1.9.2.1 (latest release)
