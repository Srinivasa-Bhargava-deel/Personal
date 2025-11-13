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
 * C++ Source File → cfg-exporter → JSON → ClangASTParser → EnhancedCPPParser → CFG
 * → DataflowAnalyzer → Analyzers → Analysis Results → StateManager → CFGVisualizer → Webview
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
        // Command: Show CFG
        std::cout << "[Extension] Registering 'Show CFG' command...\n";
        
        // Command: Analyze Workspace
        std::cout << "[Extension] Registering 'Analyze Workspace' command...\n";
        // This triggers: analyzer->analyzeWorkspace()
        
        // Command: Analyze Active File
        std::cout << "[Extension] Registering 'Analyze Active File' command...\n";
        
        // Command: Clear State
        std::cout << "[Extension] Registering 'Clear State' command...\n";
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
        // Block 1: Detect taint sources
        std::cout << "[TaintAnalyzer] Detecting taint sources...\n";
        
        // Block 2: Propagate taint forward
        std::cout << "[TaintAnalyzer] Propagating taint...\n";
        
        // Block 3: Detect taint sinks
        std::cout << "[TaintAnalyzer] Detecting taint sinks...\n";
        
        // Block 4: Check for vulnerabilities (source → sink paths)
        std::cout << "[TaintAnalyzer] Checking for vulnerabilities...\n";
        
        return nullptr;
    }
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
        // Block 1: Extract function calls
        std::cout << "[CallGraphAnalyzer] Extracting function calls...\n";
        
        // Block 2: Build caller/callee maps
        std::cout << "[CallGraphAnalyzer] Building caller/callee maps...\n";
        
        // Block 3: Detect recursion
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
        // Block 1: Prepare CFG graph data
        std::cout << "[CFGVisualizer] Preparing CFG graph data...\n";
        
        // Block 2: Prepare call graph data
        std::cout << "[CFGVisualizer] Preparing call graph data...\n";
        
        // Block 3: Prepare taint data
        std::cout << "[CFGVisualizer] Preparing taint data...\n";
        
        // Block 4: Prepare inter-procedural taint data
        std::cout << "[CFGVisualizer] Preparing inter-procedural taint data...\n";
        
        // Block 5: Prepare interconnected CFG data
        std::cout << "[CFGVisualizer] Preparing interconnected CFG data...\n";
        
        return nullptr;
    }
    
    void createOrShow() {
        std::cout << "[CFGVisualizer] Creating/showing webview panel...\n";
    }
    
    void updateVisualization(void* state) {
        std::cout << "[CFGVisualizer] Updating visualization...\n";
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
        return nullptr;
    }
    
    void saveState(void* state) {
        std::cout << "[StateManager] Saving state to disk...\n";
    }
    
    void clearState() {
        std::cout << "[StateManager] Clearing state...\n";
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
 *   ├─→ Initialize visualizer
 *   ├─→ Load configuration
 *   ├─→ Initialize analyzer
 *   ├─→ Register commands
 *   │   ├─→ Show CFG command
 *   │   ├─→ Analyze Workspace command → DataflowAnalyzer.analyzeWorkspace()
 *   │   ├─→ Analyze Active File command
 *   │   └─→ Clear State command
 *   ├─→ Setup file watchers
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
 *   ├─→ Get pre-prepared data from state
 *   ├─→ Prepare graph data for current function
 *   ├─→ Prepare call graph data
 *   ├─→ Prepare taint data
 *   ├─→ Prepare inter-procedural taint data
 *   ├─→ Prepare interconnected CFG data
 *   └─→ Render webview HTML with vis-network
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
        
        // Block 12: Run intra-procedural analyses
        std::cout << "[BLOCK 12] Running intra-procedural analyses...\n";
        analyzer->runIntraProceduralAnalyses();
        
        // Block 13: Check if inter-procedural enabled
        std::cout << "[BLOCK 13] Checking inter-procedural analysis configuration...\n";
        bool interProceduralEnabled = true;
        
        if (interProceduralEnabled) {
            // Block 14: Build call graph
            std::cout << "[BLOCK 14] Building call graph...\n";
            void* callGraph = analyzer->buildCallGraph();
            
            // Block 15: Run inter-procedural analyses
            std::cout << "[BLOCK 15] Running inter-procedural analyses...\n";
            analyzer->runInterProceduralAnalyses(callGraph);
        }
        
        // Block 16: Prepare visualization data
        std::cout << "[BLOCK 16] Preparing visualization data...\n";
        std::cout << "  [CFGVisualizer] Preparing CFG graph data...\n";
        std::cout << "  [CFGVisualizer] Preparing call graph data...\n";
        std::cout << "  [CFGVisualizer] Preparing taint data...\n";
        std::cout << "  [CFGVisualizer] Preparing inter-procedural taint data...\n";
        std::cout << "  [CFGVisualizer] Preparing interconnected CFG data...\n";
        
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

