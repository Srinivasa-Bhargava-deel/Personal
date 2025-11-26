/**
 * working_overview.cpp
 * 
 * This file models the VS Code Dataflow Analyzer extension architecture as a Control Flow Graph (CFG).
 * When "Analyze Workspace" is invoked, this file generates a CFG that visually represents how the project works.
 * 
 * Architecture Overview:
 * 
 * Entry Point: Extension Activation
 * ├── Extension Layer (extension.ts)
 * │   ├── Command Registration
 * │   ├── File Watchers
 * │   └── Configuration Management
 * │
 * ├── Analysis Orchestration (DataflowAnalyzer.ts)
 * │   ├── File Discovery
 * │   ├── Parsing Pipeline
 * │   ├── Intra-Procedural Analysis
 * │   └── Inter-Procedural Analysis
 * │
 * ├── Parsing Layer
 * │   ├── ClangASTParser.ts (wraps cfg-exporter binary)
 * │   └── EnhancedCPPParser.ts (converts JSON to CFG)
 * │
 * ├── Analysis Components
 * │   ├── LivenessAnalyzer.ts (backward dataflow)
 * │   ├── ReachingDefinitionsAnalyzer.ts (forward dataflow)
 * │   ├── TaintAnalyzer.ts (taint propagation)
 * │   ├── SecurityAnalyzer.ts (vulnerability detection)
 * │   ├── CallGraphAnalyzer.ts (call graph construction)
 * │   ├── InterProceduralReachingDefinitions.ts (IPA RD)
 * │   ├── InterProceduralTaintAnalyzer.ts (IPA taint)
 * │   └── ContextSensitiveTaintAnalyzer.ts (context-sensitive taint)
 * │
 * ├── Supporting Analysis
 * │   ├── ParameterAnalyzer.ts (parameter mapping)
 * │   ├── ReturnValueAnalyzer.ts (return value tracking)
 * │   ├── FunctionCallExtractor.ts (call extraction)
 * │   ├── TaintSourceRegistry.ts (taint sources)
 * │   ├── TaintSinkRegistry.ts (taint sinks)
 * │   └── SanitizationRegistry.ts (sanitization detection)
 * │
 * ├── Visualization Layer (CFGVisualizer.ts)
 * │   ├── Webview Panel Management
 * │   ├── Graph Data Preparation
 * │   └── Interactive Visualization
 * │
 * └── State Management (StateManager.ts)
 *     ├── State Persistence
 *     └── State Serialization
 * 
 * Data Flow:
 * C++ Source File → cfg-exporter (C++ binary, uses Clang/LLVM) → JSON → ClangASTParser → EnhancedCPPParser → CFG
 * → DataflowAnalyzer → Analyzers (Liveness, RD, Taint, Security) → Analysis Results
 * → StateManager (persistence) → CFGVisualizer (visualization data preparation) → Webview (vis-network)
 * 
 * Taint Sensitivity Levels (v1.9.0+):
 * - MINIMAL (Level 1): Only explicit data-flow taint
 * - CONSERVATIVE (Level 2): Basic control-dependent taint
 * - BALANCED (Level 3): Full control-dependent + inter-procedural
 * - PRECISE (Level 4): Path-sensitive + field-sensitive
 * - MAXIMUM (Level 5): Context-sensitive + flow-sensitive
 * 
 * CFG Block Colors:
 * - Yellow (#ffd60a): Data-flow taint only
 * - Orange (#ffa94d): Control-dependent taint only
 * - Purple (#9d4edd): Mixed taint (both types)
 * - Magenta (#c77dff): Synthetic taint (return statements without variables)
 * - Light Blue (#e8f4f8): Normal blocks (no taint)
 */

#include <iostream>
#include <string>
#include <vector>
#include <map>
#include <set>

// Forward declarations representing major components
class Extension;
class DataflowAnalyzer;
class ClangASTParser;
class EnhancedCPPParser;
class LivenessAnalyzer;
class ReachingDefinitionsAnalyzer;
class TaintAnalyzer;
class SecurityAnalyzer;
class CallGraphAnalyzer;
class InterProceduralReachingDefinitions;
class InterProceduralTaintAnalyzer;
class ContextSensitiveTaintAnalyzer;
class ParameterAnalyzer;
class ReturnValueAnalyzer;
class FunctionCallExtractor;
class TaintSourceRegistry;
class TaintSinkRegistry;
class SanitizationRegistry;
class CFGVisualizer;
class StateManager;
class LoggingConfig;
class ErrorLogger;

/**
 * LoggingConfig - Centralized logging system (v1.9.0+)
 * Models: src/utils/LoggingConfig.ts
 */
class LoggingConfig {
public:
    static void initializeFileLogging(const std::string& workspacePath) {
        std::cout << "[LoggingConfig] Initializing file logging to .vscode/logs.txt...\n";
        std::cout << "  [LoggingConfig] Setting up console interception...\n";
    }
    
    static void closeFileLogging(bool clearOnClose) {
        std::cout << "[LoggingConfig] Closing file logging...\n";
        if (clearOnClose) {
            std::cout << "  [LoggingConfig] Clearing log file...\n";
        }
    }
    
    static void raw(const std::string& message) {
        std::cout << "[LoggingConfig] " << message << "\n";
    }
    
    static void section(const std::string& module, const std::string& title) {
        std::cout << "[LoggingConfig] [" << module << "] ========== " << title << " ==========\n";
    }
};

/**
 * Extension Layer - Entry point and command orchestration
 * Models: src/extension.ts
 */
class Extension {
public:
    void activate() {
        // Block 1: Initialize workspace
        std::cout << "[Extension] Initializing workspace...\n";
        
        // Block 2: Initialize visualizer (pointer declaration only for CFG representation)
        std::cout << "[Extension] Initializing CFGVisualizer...\n";
        
        // Block 3: Load configuration
        std::cout << "[Extension] Loading configuration...\n";
        
        // Block 4: Initialize analyzer (pointer declaration only for CFG representation)
        std::cout << "[Extension] Initializing DataflowAnalyzer...\n";
        
        // Block 5: Register commands
        registerCommands(nullptr, nullptr);
        
        // Block 6: Setup file watchers
        setupFileWatchers();
        
        // Block 7: Show initial prompt
        showInitialPrompt();
    }
    
private:
    void registerCommands(DataflowAnalyzer* analyzer, CFGVisualizer* visualizer) {
        // Command 1: Show CFG
        std::cout << "[Extension] Registering 'Show CFG' command...\n";
        
        // Command 2: Analyze Workspace
        std::cout << "[Extension] Registering 'Analyze Workspace' command...\n";
        // This triggers: analyzer->analyzeWorkspace()
        
        // Command 3: Analyze Active File
        std::cout << "[Extension] Registering 'Analyze Active File' command...\n";
        
        // Command 4: Clear State
        std::cout << "[Extension] Registering 'Clear State' command...\n";
        
        // Command 5: Delete State and Re-Analyze (v1.9.1+)
        std::cout << "[Extension] Registering 'Delete State and Re-Analyze' command...\n";
        
        // Command 6: Change Sensitivity and Analyze (v1.9.0+)
        std::cout << "[Extension] Registering 'Change Sensitivity and Analyze' command...\n";
        
        // Command 7: Save State (v1.9.0+)
        std::cout << "[Extension] Registering 'Save State' command...\n";
        
        // Command 8: Re-Analyze (v1.9.0+)
        std::cout << "[Extension] Registering 'Re-Analyze' command...\n";
    }
    
    void setupFileWatchers() {
        std::cout << "[Extension] Setting up file watchers...\n";
    }
    
    void showInitialPrompt() {
        std::cout << "[Extension] Showing initial prompt...\n";
    }
};

/**
 * DataflowAnalyzer - Main orchestrator
 * Models: src/analyzer/DataflowAnalyzer.ts
 */
class DataflowAnalyzer {
public:
    DataflowAnalyzer() {
        // Initialize all analyzers (simplified for CFG representation)
        std::cout << "[DataflowAnalyzer] Constructor: Initializing analyzers...\n";
        parser = nullptr;
        livenessAnalyzer = nullptr;
        reachingDefinitionsAnalyzer = nullptr;
        taintAnalyzer = nullptr;
        securityAnalyzer = nullptr;
        stateManager = nullptr;
    }
    
    void analyzeWorkspace() {
        // Block 1: Find C++ files
        std::vector<std::string> cppFiles = findCppFiles();
        
        // Block 2: Parse each file
        for (const auto& filePath : cppFiles) {
            analyzeFile(filePath);
        }
        
        // Block 3: Run intra-procedural analyses
        runIntraProceduralAnalyses();
        
        // Block 4: Build call graph
        std::cout << "[DataflowAnalyzer] Creating CallGraphAnalyzer...\n";
        void* callGraph = nullptr; // Simplified for CFG representation
        
        // Block 5: Run inter-procedural analyses
        if (callGraph) {
            runInterProceduralAnalyses(callGraph);
        }
        
        // Block 6: Prepare visualization data
        std::cout << "[DataflowAnalyzer] Preparing visualization data...\n";
        
        // Block 7: Save state
        std::cout << "[DataflowAnalyzer] Saving state...\n";
    }
    
    void analyzeSpecificFiles() {
        std::cout << "[DataflowAnalyzer] Analyzing specific files...\n";
    }
    
    std::vector<std::string> findCppFiles() {
        std::cout << "[DataflowAnalyzer] Finding C++ files...\n";
        return std::vector<std::string>();
    }
    
    void parseFile(const std::string& filePath) {
        std::cout << "[DataflowAnalyzer] Parsing file: " << filePath << "\n";
    }
    
    void* buildCallGraph() {
        std::cout << "[DataflowAnalyzer] Building call graph...\n";
        return nullptr;
    }
    
    void* getState() {
        return nullptr; // Simplified for CFG representation
    }
    
    void saveState() {
        std::cout << "[DataflowAnalyzer] Saving state...\n";
    }
    
    void runIntraProceduralAnalyses() {
        std::cout << "[DataflowAnalyzer] Running intra-procedural analyses...\n";
        // Block 1: Liveness Analysis (backward)
        std::cout << "  [LivenessAnalyzer] Analyzing liveness...\n";
        
        // Block 2: Reaching Definitions (forward)
        std::cout << "  [ReachingDefinitionsAnalyzer] Analyzing reaching definitions...\n";
        
        // Block 3: Taint Analysis (forward)
        std::cout << "  [TaintAnalyzer] Analyzing taint propagation...\n";
        
        // Block 4: Security Analysis
        std::cout << "  [SecurityAnalyzer] Detecting vulnerabilities...\n";
    }
    
    void runInterProceduralAnalyses(void* callGraph) {
        std::cout << "[DataflowAnalyzer] Running inter-procedural analyses...\n";
        // Block 1: Inter-Procedural Reaching Definitions
        std::cout << "  [InterProceduralRD] Analyzing inter-procedural reaching definitions...\n";
        
        // Block 2: Parameter Analysis
        std::cout << "  [ParameterAnalyzer] Mapping parameters...\n";
        
        // Block 3: Return Value Analysis
        std::cout << "  [ReturnValueAnalyzer] Analyzing return values...\n";
        
        // Block 4: Inter-Procedural Taint Analysis
        std::cout << "  [InterProceduralTaint] Analyzing inter-procedural taint...\n";
        
        // Block 5: Context-Sensitive Taint Analysis
        std::cout << "  [ContextSensitiveTaint] Analyzing context-sensitive taint...\n";
    }
    
private:
    void analyzeFile(const std::string& filePath) {
        // Block 1: Parse file to CFG
        std::cout << "[DataflowAnalyzer] Parsing file: " << filePath << "\n";
        
        // Block 2: Extract functions
        std::cout << "[DataflowAnalyzer] Extracting functions from CFG...\n";
    }
    
    EnhancedCPPParser* parser;
    LivenessAnalyzer* livenessAnalyzer;
    ReachingDefinitionsAnalyzer* reachingDefinitionsAnalyzer;
    TaintAnalyzer* taintAnalyzer;
    SecurityAnalyzer* securityAnalyzer;
    StateManager* stateManager;
    
    struct AnalysisState {
        std::map<std::string, void*> cfg;
        std::map<std::string, void*> liveness;
        std::map<std::string, void*> reachingDefinitions;
        std::map<std::string, void*> taintAnalysis;
        std::map<std::string, void*> vulnerabilities;
        void* interProceduralRD;
        void* parameterAnalysis;
        void* returnValueAnalysis;
        void* interProceduralTaint;
        void* contextSensitiveTaint;
    } currentState;
};

/**
 * EnhancedCPPParser - Converts C++ source to CFG
 * Models: src/analyzer/EnhancedCPPParser.ts
 */
class EnhancedCPPParser {
public:
    struct ParseResult {
        struct FunctionInfo {
            std::string name;
            void* cfg;
        };
        std::vector<FunctionInfo> functions;
        std::vector<std::string> globalVars;
    };
    
    ParseResult parseFile(const std::string& filePath) {
        std::cout << "[EnhancedCPPParser] Parsing file: " << filePath << "\n";
        // Block 1: Call ClangASTParser to get JSON
        std::cout << "  [ClangASTParser] Spawning cfg-exporter...\n";
        std::cout << "  [ClangASTParser] Reading JSON output...\n";
        std::cout << "  [ClangASTParser] Parsing JSON to ASTNode...\n";
        
        // Block 2: Extract functions from AST
        std::cout << "  [EnhancedCPPParser] Extracting functions from AST...\n";
        ParseResult result;
        return result;
    }
    
private:
    ParseResult extractFunctionsFromAST(void* ast) {
        std::cout << "[EnhancedCPPParser] Extracting functions from AST...\n";
        return ParseResult();
    }
};

/**
 * ClangASTParser - Wraps cfg-exporter binary
 * Models: src/analyzer/ClangASTParser.ts
 */
class ClangASTParser {
public:
    void* parseFile(const std::string& filePath) {
        // Block 1: Build path to cfg-exporter
        std::string exporterPath = "cpp-tools/cfg-exporter/build/cfg-exporter";
        
        // Block 2: Spawn cfg-exporter process
        std::cout << "[ClangASTParser] Spawning cfg-exporter for " << filePath << "...\n";
        
        // Block 3: Read JSON output
        std::string jsonOutput = readProcessOutput();
        
        // Block 4: Parse JSON to ASTNode
        void* ast = parseJSON(jsonOutput);
        
        return ast;
    }
    
private:
    std::string readProcessOutput() {
        std::cout << "[ClangASTParser] Reading process output...\n";
        return "";
    }
    
    void* parseJSON(const std::string& json) {
        std::cout << "[ClangASTParser] Parsing JSON...\n";
        return nullptr;
    }
};

/**
 * LivenessAnalyzer - Backward dataflow analysis
 * Models: src/analyzer/LivenessAnalyzer.ts
 */
class LivenessAnalyzer {
public:
    void* analyze(void* funcCFG) {
        // Block 1: Initialize IN/OUT sets
        std::cout << "[LivenessAnalyzer] Initializing IN/OUT sets...\n";
        
        // Block 2: Fixed-point iteration
        bool changed = true;
        int iterations = 0;
        while (changed && iterations < 100) {
            changed = false;
            
            // Block 3: Process each block in reverse order
            // IN[B] = USE[B] ∪ (OUT[B] - DEF[B])
            // OUT[B] = ∪ IN[S] for all successors S
            
            iterations++;
        }
        
        std::cout << "[LivenessAnalyzer] Converged after " << iterations << " iterations\n";
        return nullptr;
    }
};

/**
 * ReachingDefinitionsAnalyzer - Forward dataflow analysis
 * Models: src/analyzer/ReachingDefinitionsAnalyzer.ts
 */
class ReachingDefinitionsAnalyzer {
public:
    void* analyze(void* funcCFG) {
        // Block 1: Initialize GEN/KILL sets
        std::cout << "[ReachingDefinitionsAnalyzer] Computing GEN/KILL sets...\n";
        
        // Block 2: Fixed-point iteration
        bool changed = true;
        int iterations = 0;
        while (changed && iterations < 100) {
            changed = false;
            
            // Block 3: Process each block in forward order
            // IN[B] = ∪ OUT[P] for all predecessors P
            // OUT[B] = GEN[B] ∪ (IN[B] - KILL[B])
            
            iterations++;
        }
        
        std::cout << "[ReachingDefinitionsAnalyzer] Converged after " << iterations << " iterations\n";
        return nullptr;
    }
};

/**
 * TaintAnalyzer - Taint propagation analysis
 * Models: src/analyzer/TaintAnalyzer.ts
 */
class TaintAnalyzer {
public:
    void* analyze(void* funcCFG, void* reachingDefs) {
        // Block 1: Detect taint sources (TaintSourceRegistry)
        std::cout << "[TaintAnalyzer] Detecting taint sources...\n";
        
        // Block 2: Forward propagation (worklist algorithm)
        std::cout << "[TaintAnalyzer] Propagating taint forward...\n";
        
        // Block 3: Control-dependent taint propagation (if sensitivity ≥ CONSERVATIVE)
        std::cout << "[TaintAnalyzer] Building control dependency graph...\n";
        std::cout << "[TaintAnalyzer] Propagating control-dependent taint...\n";
        std::cout << "[TaintAnalyzer] Creating synthetic taint variables (__block_X__)...\n";
        
        // Block 4: Detect sanitization (SanitizationRegistry)
        std::cout << "[TaintAnalyzer] Detecting sanitization...\n";
        
        // Block 5: Detect taint sinks (TaintSinkRegistry)
        std::cout << "[TaintAnalyzer] Detecting taint sinks...\n";
        
        // Block 6: Check for vulnerabilities (source → sink paths)
        std::cout << "[TaintAnalyzer] Checking for vulnerabilities...\n";
        
        return nullptr;
    }
    
    // Sensitivity level helpers (v1.9.0+)
    bool shouldEnableControlDependent() { return true; }  // Level 2+
    bool shouldEnableRecursivePropagation() { return true; }  // Level 3+
    bool shouldEnablePathSensitive() { return true; }  // Level 4+
    bool shouldEnableFieldSensitive() { return true; }  // Level 4+
    bool shouldEnableContextSensitive() { return false; }  // Level 5 only
    bool shouldEnableFlowSensitive() { return false; }  // Level 5 only
};

/**
 * SecurityAnalyzer - Vulnerability detection
 * Models: src/analyzer/SecurityAnalyzer.ts
 */
class SecurityAnalyzer {
public:
    std::vector<void*> analyzeVulnerabilities(void* funcCFG, void* taint) {
        std::cout << "[SecurityAnalyzer] Analyzing vulnerabilities...\n";
        return std::vector<void*>();
    }
};

/**
 * CallGraphAnalyzer - Call graph construction
 * Models: src/analyzer/CallGraphAnalyzer.ts
 */
class CallGraphAnalyzer {
public:
    void* buildCallGraph() {
        // Block 1: Index functions (name, parameters, return type)
        std::cout << "[CallGraphAnalyzer] Indexing functions...\n";
        
        // Block 2: Extract function calls (FunctionCallExtractor)
        std::cout << "[CallGraphAnalyzer] Extracting function calls...\n";
        
        // Block 3: Collect function pointer assignments
        std::cout << "[CallGraphAnalyzer] Collecting function pointer assignments...\n";
        
        // Block 4: Collect callback arguments
        std::cout << "[CallGraphAnalyzer] Collecting callback arguments...\n";
        
        // Block 5: Resolve indirect calls (function pointers, callbacks)
        std::cout << "[CallGraphAnalyzer] Resolving indirect calls...\n";
        
        // Block 6: Build caller/callee maps (callsFrom, callsTo)
        std::cout << "[CallGraphAnalyzer] Building caller/callee maps...\n";
        
        // Block 7: Detect recursion (direct, mutual, tail)
        std::cout << "[CallGraphAnalyzer] Detecting recursion...\n";
        
        return nullptr;
    }
};

/**
 * InterProceduralReachingDefinitions - IPA reaching definitions
 * Models: src/analyzer/InterProceduralReachingDefinitions.ts
 */
class InterProceduralReachingDefinitions {
public:
    void* analyze() {
        std::cout << "[InterProceduralRD] Analyzing inter-procedural reaching definitions...\n";
        return nullptr;
    }
};

/**
 * InterProceduralTaintAnalyzer - IPA taint propagation
 * Models: src/analyzer/InterProceduralTaintAnalyzer.ts
 */
class InterProceduralTaintAnalyzer {
public:
    void* analyze() {
        // Block 1: Process function calls
        std::cout << "[InterProceduralTaint] Processing function calls...\n";
        
        // Block 2: Propagate parameter taint
        std::cout << "[InterProceduralTaint] Propagating parameter taint...\n";
        
        // Block 3: Propagate return value taint
        std::cout << "[InterProceduralTaint] Propagating return value taint...\n";
        
        // Block 4: Process library functions
        std::cout << "[InterProceduralTaint] Processing library functions...\n";
        
        return nullptr;
    }
};

/**
 * ContextSensitiveTaintAnalyzer - Context-sensitive taint analysis
 * Models: src/analyzer/ContextSensitiveTaintAnalyzer.ts
 */
class ContextSensitiveTaintAnalyzer {
public:
    void* analyze() {
        // Block 1: Build call-site context
        std::cout << "[ContextSensitiveTaint] Building call-site context...\n";
        
        // Block 2: Track taint with context
        std::cout << "[ContextSensitiveTaint] Tracking taint with context...\n";
        
        // Block 3: Merge contexts (k-limited)
        std::cout << "[ContextSensitiveTaint] Merging contexts...\n";
        
        return nullptr;
    }
};

/**
 * ParameterAnalyzer - Parameter mapping analysis
 * Models: src/analyzer/ParameterAnalyzer.ts
 */
class ParameterAnalyzer {
public:
    void* mapParameters(void* callGraph) {
        std::cout << "[ParameterAnalyzer] Mapping parameters...\n";
        return nullptr;
    }
};

/**
 * ReturnValueAnalyzer - Return value tracking
 * Models: src/analyzer/ReturnValueAnalyzer.ts
 */
class ReturnValueAnalyzer {
public:
    void* analyzeReturns(void* cfg) {
        std::cout << "[ReturnValueAnalyzer] Analyzing return values...\n";
        return nullptr;
    }
};

/**
 * FunctionCallExtractor - Function call extraction
 * Models: src/analyzer/FunctionCallExtractor.ts
 */
class FunctionCallExtractor {
public:
    std::vector<void*> extractCalls() {
        std::cout << "[FunctionCallExtractor] Extracting function calls...\n";
        return std::vector<void*>();
    }
};

/**
 * TaintSourceRegistry - Taint source detection
 * Models: src/analyzer/TaintSourceRegistry.ts
 */
class TaintSourceRegistry {
public:
    std::vector<void*> detectSources(void* funcCFG) {
        std::cout << "[TaintSourceRegistry] Detecting taint sources...\n";
        return std::vector<void*>();
    }
};

/**
 * TaintSinkRegistry - Taint sink detection
 * Models: src/analyzer/TaintSinkRegistry.ts
 */
class TaintSinkRegistry {
public:
    std::vector<void*> detectSinks(void* funcCFG) {
        std::cout << "[TaintSinkRegistry] Detecting taint sinks...\n";
        return std::vector<void*>();
    }
};

/**
 * SanitizationRegistry - Sanitization detection
 * Models: src/analyzer/SanitizationRegistry.ts
 */
class SanitizationRegistry {
public:
    std::vector<void*> detectSanitization(void* funcCFG) {
        std::cout << "[SanitizationRegistry] Detecting sanitization...\n";
        return std::vector<void*>();
    }
};

/**
 * CFGVisualizer - Visualization component
 * Models: src/visualizer/CFGVisualizer.ts
 */
class CFGVisualizer {
public:
    static void* prepareAllVisualizationData(void* state) {
        // Block 1: Prepare CFG graph data (for each function)
        std::cout << "[CFGVisualizer] Preparing CFG graph data...\n";
        std::cout << "  [CFGVisualizer] Applying taint colors (Yellow/Orange/Purple/Magenta/Light Blue)...\n";
        std::cout << "  [CFGVisualizer] Adding double-click navigation (file path + line number)...\n";
        
        // Block 2: Prepare call graph data
        std::cout << "[CFGVisualizer] Preparing call graph data...\n";
        
        // Block 3: Prepare taint data (for each function)
        std::cout << "[CFGVisualizer] Preparing taint data...\n";
        std::cout << "  [CFGVisualizer] Processing synthetic taint variables (__block_X__)...\n";
        
        // Block 4: Prepare inter-procedural taint data (for each function)
        std::cout << "[CFGVisualizer] Preparing inter-procedural taint data...\n";
        
        // Block 5: Prepare interconnected CFG data (unified view)
        std::cout << "[CFGVisualizer] Preparing interconnected CFG data...\n";
        std::cout << "  [CFGVisualizer] Adding edge types (Control Flow, Function Calls, Data Flow)...\n";
        
        return nullptr;
    }
    
    void createOrShow() {
        std::cout << "[CFGVisualizer] Creating/showing webview panel...\n";
        std::cout << "  [CFGVisualizer] Setting up message handlers (function selection, tab switching, sensitivity change, double-click)...\n";
    }
    
    void updateVisualization(void* state) {
        std::cout << "[CFGVisualizer] Updating visualization...\n";
        std::cout << "  [CFGVisualizer] Checking for sensitivity mismatch...\n";
        std::cout << "  [CFGVisualizer] Regenerating visualization data if needed...\n";
        std::cout << "  [CFGVisualizer] Sending data to webview via postMessage...\n";
    }
};

/**
 * StateManager - State persistence
 * Models: src/state/StateManager.ts
 */
class StateManager {
public:
    void* loadState() {
        std::cout << "[StateManager] Loading state from disk...\n";
        std::cout << "  [StateManager] Reading .vscode/dataflow-state.json...\n";
        std::cout << "  [StateManager] Deserializing JSON to AnalysisState...\n";
        std::cout << "  [StateManager] Reconstructing Maps and Sets...\n";
        return nullptr;
    }
    
    void saveState(void* state) {
        std::cout << "[StateManager] Saving state to disk...\n";
        std::cout << "  [StateManager] Serializing AnalysisState to JSON...\n";
        std::cout << "  [StateManager] Converting Maps to arrays...\n";
        std::cout << "  [StateManager] Converting Sets to arrays...\n";
        std::cout << "  [StateManager] Writing to .vscode/dataflow-state.json...\n";
    }
    
    void clearState() {
        std::cout << "[StateManager] Clearing state...\n";
        std::cout << "  [StateManager] Deleting .vscode/dataflow-state.json...\n";
    }
    
    std::string computeFileHash(const std::string& filePath) {
        std::cout << "[StateManager] Computing file hash (SHA-256) for incremental analysis...\n";
        return "";
    }
};

/**
 * Main entry point - Models extension activation
 * This represents the CFG entry block for the entire system
 * 
 * CFG Structure:
 * 
 * Entry → Extension.activate()
 *   ├─→ Initialize workspace
 *   ├─→ Initialize LoggingConfig (file logging to .vscode/logs.txt)
 *   ├─→ Initialize visualizer
 *   ├─→ Load configuration (taint sensitivity, update mode, etc.)
 *   ├─→ Initialize analyzer
 *   ├─→ Register commands (8 commands)
 *   │   ├─→ Show CFG command
 *   │   ├─→ Analyze Workspace command → DataflowAnalyzer.analyzeWorkspace()
 *   │   ├─→ Analyze Active File command
 *   │   ├─→ Clear State command
 *   │   ├─→ Delete State and Re-Analyze command (v1.9.1+)
 *   │   ├─→ Change Sensitivity and Analyze command (v1.9.0+)
 *   │   ├─→ Save State command (v1.9.0+)
 *   │   └─→ Re-Analyze command (v1.9.0+)
 *   ├─→ Setup file watchers (incremental analysis)
 *   ├─→ Load saved state (if exists)
 *   └─→ Show initial prompt
 * 
 * When "Analyze Workspace" is invoked:
 * 
 * DataflowAnalyzer.analyzeWorkspace()
 *   ├─→ Block 1: Check active editor (conditional branch)
 *   │   ├─→ If active C++ file: analyzeSpecificFiles()
 *   │   └─→ Else: continue to workspace analysis
 *   ├─→ Block 2: Initialize global CFG structure
 *   ├─→ Block 3: Find all C++ files (findCppFiles)
 *   ├─→ Block 4: Loop through each file
 *   │   ├─→ analyzeFile(filePath)
 *   │   │   ├─→ EnhancedCPPParser.parseFile()
 *   │   │   │   ├─→ ClangASTParser.parseFile()
 *   │   │   │   │   ├─→ Spawn cfg-exporter process
 *   │   │   │   │   ├─→ Read JSON output
 *   │   │   │   │   └─→ Parse JSON to ASTNode
 *   │   │   │   └─→ Extract functions from AST
 *   │   │   └─→ Add functions to global CFG
 *   │   └─→ Continue loop
 *   ├─→ Block 5: Run intra-procedural analyses (for each function)
 *   │   ├─→ LivenessAnalyzer.analyze() [backward dataflow]
 *   │   ├─→ ReachingDefinitionsAnalyzer.analyze() [forward dataflow]
 *   │   ├─→ TaintAnalyzer.analyze() [forward propagation]
 *   │   └─→ SecurityAnalyzer.analyzeVulnerabilities()
 *   ├─→ Block 6: Build call graph (if inter-procedural enabled)
 *   │   ├─→ CallGraphAnalyzer.buildCallGraph()
 *   │   │   ├─→ Index functions
 *   │   │   ├─→ Extract function calls
 *   │   │   ├─→ Build relationship maps
 *   │   │   └─→ Analyze recursion
 *   ├─→ Block 7: Run inter-procedural analyses (if call graph exists)
 *   │   ├─→ InterProceduralReachingDefinitions.analyze()
 *   │   ├─→ ParameterAnalyzer.mapParameters()
 *   │   ├─→ ReturnValueAnalyzer.analyzeReturns()
 *   │   ├─→ InterProceduralTaintAnalyzer.analyze()
 *   │   │   ├─→ Process function calls
 *   │   │   ├─→ Propagate parameter taint
 *   │   │   ├─→ Propagate return value taint
 *   │   │   └─→ Process library functions
 *   │   └─→ ContextSensitiveTaintAnalyzer.analyze()
 *   │       ├─→ Build call-site context
 *   │       ├─→ Track taint with context
 *   │       └─→ Merge contexts (k-limited)
 *   ├─→ Block 8: Re-propagate taint (for functions with new parameter taint)
 *   ├─→ Block 9: Prepare visualization data
 *   │   └─→ CFGVisualizer.prepareAllVisualizationData()
 *   │       ├─→ Prepare CFG graph data
 *   │       ├─→ Prepare call graph data
 *   │       ├─→ Prepare taint data
 *   │       ├─→ Prepare inter-procedural taint data
 *   │       └─→ Prepare interconnected CFG data
 *   ├─→ Block 10: Save state
 *   │   └─→ StateManager.saveState()
 *   └─→ Exit: Return AnalysisState
 * 
 * Visualization Flow:
 * CFGVisualizer.updateWebview()
 *   ├─→ Get pre-prepared data from state.visualizationData (prepared during analysis)
 *   ├─→ If missing: Prepare data on-demand
 *   ├─→ Check for sensitivity mismatch (regenerate if needed)
 *   ├─→ Send data to webview via postMessage
 *   └─→ Webview JavaScript (vis-network)
 *       ├─→ Render CFG nodes and edges
 *       ├─→ Apply colors (Yellow/Orange/Purple/Magenta/Light Blue)
 *       ├─→ Handle user interactions (function selection, tab switching, double-click)
 *       └─→ Send messages back to extension host (sensitivity change, re-analyze, etc.)
 */
int main() {
    std::cout << "=== VS Code Dataflow Analyzer - Architecture CFG ===\n\n";
    
    // Entry Block: Extension Activation
    std::cout << "[ENTRY] Extension activation starting...\n";
    Extension* extension = new Extension();
    
    // Block 1: Initialize workspace
    std::cout << "[BLOCK 1] Initializing workspace...\n";
    
    // Block 2: Initialize visualizer
    std::cout << "[BLOCK 2] Initializing CFGVisualizer...\n";
    CFGVisualizer* visualizer = new CFGVisualizer();
    
    // Block 3: Load configuration
    std::cout << "[BLOCK 3] Loading configuration...\n";
    
    // Block 4: Initialize analyzer
    std::cout << "[BLOCK 4] Initializing DataflowAnalyzer...\n";
    DataflowAnalyzer* analyzer = new DataflowAnalyzer();
    
    // Block 5: Register commands
    std::cout << "[BLOCK 5] Registering VS Code commands...\n";
    extension->activate();
    
    // Block 6: Setup file watchers
    std::cout << "[BLOCK 6] Setting up file watchers...\n";
    
    // Block 7: Show initial prompt
    std::cout << "[BLOCK 7] Showing initial prompt...\n";
    
    // Conditional Branch: User invokes "Analyze Workspace"
    std::cout << "\n[BRANCH] User invokes 'Analyze Workspace' command...\n";
    
    // Block 8: Check active editor
    std::cout << "[BLOCK 8] Checking active editor...\n";
    bool hasActiveCppFile = false; // Simplified for CFG representation
    
    if (hasActiveCppFile) {
        // Branch: Analyze specific file
        std::cout << "[BRANCH TRUE] Analyzing active file only...\n";
        analyzer->analyzeSpecificFiles();
    } else {
        // Branch: Analyze entire workspace
        std::cout << "[BRANCH FALSE] Analyzing entire workspace...\n";
        
        // Block 9: Initialize global CFG
        std::cout << "[BLOCK 9] Initializing global CFG structure...\n";
        
        // Block 10: Find C++ files
        std::cout << "[BLOCK 10] Finding C++ files in workspace...\n";
        std::vector<std::string> cppFiles = analyzer->findCppFiles();
        
        // Block 11: Loop through files
        std::cout << "[BLOCK 11] Processing " << cppFiles.size() << " C++ files...\n";
        for (const auto& filePath : cppFiles) {
            // Block 11.1: Parse file
            std::cout << "  [BLOCK 11.1] Parsing file: " << filePath << "\n";
            analyzer->parseFile(filePath);
        }
        
        // Block 12: Run intra-procedural analyses (for each function)
        std::cout << "[BLOCK 12] Running intra-procedural analyses...\n";
        std::cout << "  [BLOCK 12.1] Liveness Analysis (backward dataflow)...\n";
        std::cout << "  [BLOCK 12.2] Reaching Definitions (forward dataflow)...\n";
        std::cout << "  [BLOCK 12.3] Taint Analysis (forward propagation with sensitivity levels)...\n";
        std::cout << "    [BLOCK 12.3.1] Detect taint sources...\n";
        std::cout << "    [BLOCK 12.3.2] Forward propagation (worklist algorithm)...\n";
        std::cout << "    [BLOCK 12.3.3] Control-dependent taint propagation (if sensitivity ≥ CONSERVATIVE)...\n";
        std::cout << "    [BLOCK 12.3.4] Create synthetic taint variables (__block_X__) for return statements...\n";
        std::cout << "    [BLOCK 12.3.5] Detect sanitization...\n";
        std::cout << "    [BLOCK 12.3.6] Detect sink vulnerabilities...\n";
        std::cout << "  [BLOCK 12.4] Security Analysis (vulnerability detection)...\n";
        analyzer->runIntraProceduralAnalyses();
        
        // Block 13: Check if inter-procedural enabled
        std::cout << "[BLOCK 13] Checking inter-procedural analysis configuration...\n";
        bool interProceduralEnabled = true;
        
        if (interProceduralEnabled) {
            // Block 14: Build call graph
            std::cout << "[BLOCK 14] Building call graph...\n";
            std::cout << "  [BLOCK 14.1] Index functions...\n";
            std::cout << "  [BLOCK 14.2] Extract function calls...\n";
            std::cout << "  [BLOCK 14.3] Collect function pointer assignments...\n";
            std::cout << "  [BLOCK 14.4] Collect callback arguments...\n";
            std::cout << "  [BLOCK 14.5] Resolve indirect calls (function pointers, callbacks)...\n";
            std::cout << "  [BLOCK 14.6] Build caller/callee maps...\n";
            std::cout << "  [BLOCK 14.7] Detect recursion...\n";
            void* callGraph = analyzer->buildCallGraph();
            
            // Block 15: Run inter-procedural analyses
            std::cout << "[BLOCK 15] Running inter-procedural analyses...\n";
            std::cout << "  [BLOCK 15.1] Inter-Procedural Reaching Definitions...\n";
            std::cout << "  [BLOCK 15.2] Parameter Analysis (parameter mapping)...\n";
            std::cout << "  [BLOCK 15.3] Return Value Analysis (return value tracking)...\n";
            std::cout << "  [BLOCK 15.4] Inter-Procedural Taint Analysis...\n";
            std::cout << "    [BLOCK 15.4.1] Process function calls (worklist algorithm)...\n";
            std::cout << "    [BLOCK 15.4.2] Propagate parameter taint (actual → formal)...\n";
            std::cout << "    [BLOCK 15.4.3] Propagate return value taint (callee → caller)...\n";
            std::cout << "    [BLOCK 15.4.4] Process library functions (FunctionSummaries)...\n";
            std::cout << "  [BLOCK 15.5] Context-Sensitive Taint Analysis (if sensitivity = MAXIMUM)...\n";
            analyzer->runInterProceduralAnalyses(callGraph);
            
            // Block 15.6: Re-propagate taint for functions with new parameter taint
            std::cout << "[BLOCK 15.6] Re-propagating taint for functions with new parameter taint...\n";
        }
        
        // Block 16: Prepare visualization data (backend, during analysis)
        std::cout << "[BLOCK 16] Preparing visualization data...\n";
        std::cout << "  [CFGVisualizer] Preparing CFG graph data (for each function)...\n";
        std::cout << "    [CFGVisualizer] Applying taint colors (Yellow/Orange/Purple/Magenta/Light Blue)...\n";
        std::cout << "    [CFGVisualizer] Adding double-click navigation (file path + line number)...\n";
        std::cout << "  [CFGVisualizer] Preparing call graph data...\n";
        std::cout << "  [CFGVisualizer] Preparing taint data (for each function)...\n";
        std::cout << "    [CFGVisualizer] Processing synthetic taint variables (__block_X__)...\n";
        std::cout << "  [CFGVisualizer] Preparing inter-procedural taint data (for each function)...\n";
        std::cout << "  [CFGVisualizer] Preparing interconnected CFG data (unified view)...\n";
        std::cout << "    [CFGVisualizer] Adding edge types (Control Flow, Function Calls, Data Flow)...\n";
        
        // Block 17: Save state
        std::cout << "[BLOCK 17] Saving analysis state...\n";
        analyzer->saveState();
    }
    
    // Exit Block
    std::cout << "\n[EXIT] Analysis complete. Visualization ready.\n";
    std::cout << "\n=== Architecture CFG Complete ===\n";
    std::cout << "\nThis CFG represents:\n";
    std::cout << "  - Entry: Extension activation\n";
    std::cout << "  - Blocks: Major processing steps\n";
    std::cout << "  - Edges: Control flow and data dependencies\n";
    std::cout << "  - Functions: Component modules\n";
    std::cout << "  - Exit: Analysis results and visualization\n";
    
    return 0;
}

