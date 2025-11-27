/**
 * types.ts
 * 
 * Core Types and Interfaces for the Dataflow Analyzer
 * 
 * PURPOSE:
 * This file defines all core TypeScript interfaces and types used throughout the extension.
 * It serves as the central type definition hub, ensuring type consistency across all modules.
 * 
 * SIGNIFICANCE IN OVERALL FLOW:
 * This file is the FOUNDATION for all type definitions in the extension. Every module
 * imports types from this file, making it critical for type safety and code maintainability.
 * Changes to types here affect the entire codebase. It defines the data structures that
 * flow through the entire analysis pipeline.
 * 
 * DATA FLOW:
 * INPUTS:
 *   - Type definitions from TypeScript language
 *   - Domain knowledge (CFG theory, dataflow analysis concepts)
 * 
 * OUTPUTS:
 *   - Exported interfaces and types used by:
 *     - extension.ts: AnalysisConfig, AnalysisState
 *     - DataflowAnalyzer.ts: CFG, FunctionCFG, AnalysisState, all analysis result types
 *     - EnhancedCPPParser.ts: BasicBlock, Statement, FunctionCFG
 *     - LivenessAnalyzer.ts: LivenessInfo
 *     - ReachingDefinitionsAnalyzer.ts: ReachingDefinitionsInfo, ReachingDefinition
 *     - TaintAnalyzer.ts: TaintInfo, TaintLabel, TaintVulnerability
 *     - SecurityAnalyzer.ts: Vulnerability
 *     - CFGVisualizer.ts: All visualization data types
 *     - StateManager.ts: AnalysisState (for serialization)
 * 
 * KEY TYPE CATEGORIES:
 * 1. CFG Structures: CFG, FunctionCFG, BasicBlock, Statement
 * 2. Analysis Results: LivenessInfo, ReachingDefinitionsInfo, TaintInfo
 * 3. Analysis State: AnalysisState, FileAnalysisState, AnalysisConfig
 * 4. Taint Analysis: TaintLabel, TaintVulnerability
 * 5. Position/Range: Position, Range (for source code locations)
 * 
 * CRITICAL TYPES:
 * - AnalysisState: The complete analysis result container, flows from DataflowAnalyzer
 *   to CFGVisualizer and StateManager
 * - FunctionCFG: The core CFG structure, flows from EnhancedCPPParser to all analyzers
 * - TaintInfo: Taint propagation data, flows from TaintAnalyzer to CFGVisualizer
 */

/**
 * POSITION INTERFACE
 * 
 * Represents a position in source code (line and column).
 * Used for precise error reporting and source code navigation.
 */
export interface Position {
  line: number;   // Line number (1-based)
  column: number; // Column number (1-based)
}

/**
 * RANGE INTERFACE
 * 
 * Represents a range of source code (start and end positions).
 * Used to mark the location of statements, blocks, and other code elements.
 */
export interface Range {
  start: Position; // Start position of the range
  end: Position;   // End position of the range
}

/**
 * BASIC BLOCK INTERFACE
 * 
 * Represents a basic block in the Control Flow Graph (CFG).
 * A basic block is a sequence of statements with a single entry point
 * and a single exit point - no branches within the block.
 * 
 * Structure:
 * - id: Unique identifier for the block (e.g., "B0", "B1")
 * - label: Human-readable label (often the first statement)
 * - statements: Array of statements in the block
 * - predecessors: Array of block IDs that can execute before this block
 * - successors: Array of block IDs that can execute after this block
 * - range: Optional source code location
 * - isEntry: Optional marker indicating this is the function entry block
 * - isExit: Optional marker indicating this is the function exit block
 */
export interface BasicBlock {
  id: string;              // Unique block identifier (e.g., "B0")
  label: string;           // Human-readable label (usually first statement)
  statements: Statement[]; // Statements in this block (executed sequentially)
  predecessors: string[]; // Block IDs that can execute before this block
  successors: string[];   // Block IDs that can execute after this block
  range?: Range;          // Optional source code location
  isEntry?: boolean;      // Optional marker for entry block (function start)
  isExit?: boolean;       // Optional marker for exit block (function end)
}

/**
 * STATEMENT INTERFACE
 * 
 * Represents a single statement in the source code. Statements are the
 * atomic units of analysis - each statement can define variables, use
 * variables, or both.
 * 
 * Structure:
 * - id: Optional unique identifier for the statement
 * - type: Optional statement type (assignment, conditional, loop, etc.)
 * - text: Statement text as it appears in source code
 * - content: Alias for text (used by some parsers for compatibility)
 * - range: Optional source code location
 * - variables: Optional variable usage information:
 *   - defined: Variables defined (assigned) in this statement
 *   - used: Variables used (read) in this statement
 */
export interface Statement {
  id?: string;      // Optional unique statement identifier
  type?: StatementType; // Optional statement type classification
  text: string;     // Statement text as it appears in source code
  content?: string; // Alias for text, used by some parsers for compatibility
  range?: Range;    // Optional source code location
  /**
   * VARIABLE USAGE INFORMATION
   * 
   * Tracks which variables are defined (assigned) and used (read) in this statement.
   * This is critical for dataflow analysis - we need to know:
   * - Which variables are modified (defined) -> affects reaching definitions
   * - Which variables are read (used) -> affects liveness analysis
   * 
   * Example: "x = y + z;"
   *   defined: ["x"]
   *   used: ["y", "z"]
   */
  variables?: {
    defined: string[]; // Variables defined (assigned) in this statement
    used: string[];   // Variables used (read) in this statement
  };
}

/**
 * STATEMENT TYPE ENUMERATION
 * 
 * Classifies statements by their semantic type. This helps analyzers
 * apply appropriate analysis rules for different statement types.
 */
export enum StatementType {
  ASSIGNMENT = 'assignment',     // Variable assignment: x = y;
  CONDITIONAL = 'conditional',   // Conditional branch: if (x) { ... }
  LOOP = 'loop',                 // Loop statement: for, while, do-while
  RETURN = 'return',             // Return statement: return x;
  DECLARATION = 'declaration',   // Variable declaration: int x;
  FUNCTION_CALL = 'function_call', // Function call: foo(x, y);
  OTHER = 'other'                // Other/unknown statement type
}

/**
 * CFG (CONTROL FLOW GRAPH) INTERFACE
 * 
 * Represents the complete Control Flow Graph for an entire program or file.
 * Contains all functions and their CFGs, plus global entry/exit points.
 * 
 * Structure:
 * - entry: Entry block ID (typically the first block of main())
 * - exit: Exit block ID (typically the last block of main())
 * - blocks: Map of all basic blocks (keyed by block ID)
 * - functions: Map of function CFGs (keyed by function name)
 */
export interface CFG {
  entry: string;                    // Entry block ID (program entry point)
  exit: string;                     // Exit block ID (program exit point)
  blocks: Map<string, BasicBlock>;  // All basic blocks in the program
  functions: Map<string, FunctionCFG>; // All function CFGs (keyed by function name)
}

/**
 * FUNCTION CFG INTERFACE
 * 
 * Represents the Control Flow Graph for a single function.
 * Each function has its own CFG with entry/exit blocks and basic blocks.
 * 
 * Structure:
 * - name: Function name (e.g., "main", "foo", "bar")
 * - entry: Entry block ID (first block of the function)
 * - exit: Exit block ID (last block of the function)
 * - blocks: Map of basic blocks in this function (keyed by block ID)
 * - parameters: Array of function parameter names
 */
export interface FunctionCFG {
  name: string;                     // Function name
  entry: string;                    // Entry block ID (function start)
  exit: string;                     // Exit block ID (function end)
  blocks: Map<string, BasicBlock>;  // Basic blocks in this function
  parameters: string[];             // Function parameter names (e.g., ["x", "y"])
}

/**
 * LIVENESS INFO INTERFACE
 * 
 * Represents liveness analysis results for a basic block.
 * Liveness analysis determines which variables are "live" (may be used later)
 * at each program point.
 * 
 * Structure:
 * - blockId: Block identifier
 * - in: Set of variables live at the entry of this block
 * - out: Set of variables live at the exit of this block
 * 
 * Algorithm: Backward dataflow analysis
 * - A variable is live if it may be used before being redefined
 * - Used for dead code elimination and register allocation
 */
export interface LivenessInfo {
  blockId: string;      // Block identifier
  in: Set<string>;      // Variables live at block entry (before block executes)
  out: Set<string>;     // Variables live at block exit (after block executes)
}

/**
 * REACHING DEFINITION INTERFACE
 * 
 * Represents a single reaching definition - a variable definition that
 * "reaches" a particular program point (hasn't been killed by a redefinition).
 * 
 * Structure:
 * - variable: Variable name
 * - definitionId: Unique identifier for this definition
 * - blockId: Block where this definition occurs
 * - statementId: Optional statement identifier
 * - range: Optional source code location
 * - sourceBlock: Original block where definition was created
 * - propagationPath: Path from source to current block (for tracking)
 * - killed: Whether this definition was killed (overwritten)
 * - isParameter: Whether this is a function parameter definition
 */
export interface ReachingDefinition {
  variable: string;              // Variable name
  definitionId: string;          // Unique definition identifier
  blockId: string;               // Block where definition occurs
  statementId?: string;          // Optional statement identifier
  range?: Range;                 // Optional source code location
  /**
   * HISTORY TRACKING
   * 
   * Tracks the path of this definition through the CFG:
   * - sourceBlock: Original block where definition was created
   * - propagationPath: Path from source to current block: [B0 -> B1 -> B2]
   * - killed: Whether this definition was killed (overwritten by another definition)
   * - isParameter: Whether this is a function parameter definition (special case)
   */
  sourceBlock?: string;        // Original block where definition was created
  propagationPath?: string[];  // Path from source to current block: [B0 -> B1 -> B2]
  killed?: boolean;            // Whether this definition was killed (overwritten)
  isParameter?: boolean;       // Whether this is a function parameter definition
}

/**
 * REACHING DEFINITIONS INFO INTERFACE
 * 
 * Represents reaching definitions analysis results for a basic block.
 * Reaching definitions analysis determines which variable definitions
 * "reach" each program point (haven't been killed).
 * 
 * Structure:
 * - blockId: Block identifier
 * - gen: Definitions generated (created) in this block
 * - kill: Definitions killed (overwritten) in this block
 * - in: Definitions reaching block entry (from predecessors)
 * - out: Definitions reaching block exit (after GEN/KILL operations)
 * 
 * Algorithm: Forward dataflow analysis
 * - GEN: New definitions created in this block
 * - KILL: Old definitions killed (overwritten) in this block
 * - OUT = (IN - KILL) ∪ GEN
 */
export interface ReachingDefinitionsInfo {
  blockId: string;                              // Block identifier
  gen: Map<string, ReachingDefinition[]>;      // Definitions generated in this block (keyed by variable)
  kill: Map<string, ReachingDefinition[]>;     // Definitions killed in this block (keyed by variable)
  in: Map<string, ReachingDefinition[]>;       // Definitions reaching block entry (keyed by variable)
  out: Map<string, ReachingDefinition[]>;      // Definitions reaching block exit (keyed by variable)
}

// Phase 4: Enhanced Taint Propagation - Taint Labels
export enum TaintLabel {
  USER_INPUT = 'user_input',      // Direct user input (scanf, gets, cin, etc.)
  FILE_CONTENT = 'file_content',  // File contents (fread, fgets, read, etc.)
  NETWORK_DATA = 'network_data',  // Network data (recv, recvfrom, etc.)
  ENVIRONMENT = 'environment',    // Environment variables (getenv, etc.)
  COMMAND_LINE = 'command_line',  // Command line arguments (argv)
  DATABASE = 'database',          // Database query results
  CONFIGURATION = 'configuration', // Configuration files
  DERIVED = 'derived',            // Derived from tainted data (explicit data-flow propagation)
  // CONTROL_DEPENDENT: Implicit flow taint - taint propagated through control dependencies
  // Example: if (tainted_var > 0) { int x = 10; } - x is control-dependent tainted
  // This label is added when taint flows through control structures (if/while/for/switch)
  // rather than through explicit assignments. Critical for detecting implicit information leaks.
  CONTROL_DEPENDENT = 'control_dependent' // Control-dependent taint (implicit flow)
}

/**
 * TAINT INFO INTERFACE
 * 
 * Represents taint analysis information for a variable.
 * Taint analysis tracks the flow of potentially malicious or unsafe data
 * through the program, from sources (user input, file I/O, network) to
 * sinks (dangerous functions).
 * 
 * Structure:
 * - variable: Variable name
 * - source: Taint source description (e.g., "scanf", "user_input")
 * - tainted: Whether variable is currently tainted
 * - propagationPath: Path of taint propagation through CFG blocks
 * - sourceCategory: Category of taint source (user_input, file_io, network, etc.)
 * - taintType: Type of tainted data (string, buffer, integer, pointer)
 * - sourceFunction: Function that introduced taint
 * - sourceLocation: Location where taint was introduced
 * - sanitized: Whether taint has been sanitized
 * - sanitizationPoints: Points where sanitization occurred
 * - labels: Taint labels (multiple labels possible for multiple sources)
 */
export interface TaintInfo {
  variable: string;              // Variable name
  source: string;               // Taint source description (e.g., "scanf", "user_input")
  tainted: boolean;              // Whether variable is currently tainted
  propagationPath: string[];     // Path of taint propagation: [B0, B1, B2, ...]
  
  /**
   * ENHANCED FIELDS (Phase 1+)
   * 
   * Additional metadata about the taint source:
   * - sourceCategory: Category of input channel (user_input, file_io, network, etc.)
   * - taintType: Type of tainted data (string, buffer, integer, pointer)
   * - sourceFunction: Function that introduced taint (e.g., "scanf", "fread")
   * - sourceLocation: Precise location where taint was introduced
   */
  sourceCategory?: 'user_input' | 'file_io' | 'network' | 'environment' | 'command_line' | 'database' | 'configuration';
  taintType?: 'string' | 'buffer' | 'integer' | 'pointer';
  sourceFunction?: string;
  sourceLocation?: {
    blockId: string;
    statementId?: string;
    range?: Range;
  };
  
  /**
   * SANITIZATION TRACKING (Phase 3)
   * 
   * Tracks whether and where taint has been sanitized:
   * - sanitized: Whether taint has been removed through sanitization
   * - sanitizationPoints: Array of locations where sanitization occurred
   */
  sanitized?: boolean;
  sanitizationPoints?: Array<{ location: string; type: string }>;
  
  /**
   * TAINT LABELS (Phase 4)
   * 
   * Multiple labels per variable allow tracking taint from multiple sources.
   * Example: A variable could be tainted from both user_input and file_io.
   * Labels: ['user_input', 'file_content'] indicates taint from both sources.
   */
  labels?: TaintLabel[]; // Multiple labels per variable (tainted from multiple sources)
}

export interface TaintVulnerability {
  id: string;
  type: 'sql_injection' | 'command_injection' | 'format_string' | 'path_traversal' | 'buffer_overflow' | 'code_injection' | 'integer_overflow';
  severity: 'critical' | 'high' | 'medium' | 'low';
  source: {
    file: string;
    line: number;
    function: string;
    statement: string;
    variable: string;
  };
  sink: {
    file: string;
    line: number;
    function: string;
    statement: string;
    argumentIndex: number;
  };
  propagationPath: Array<{
    file: string;
    function: string;
    blockId: string;
    statementId: string;
  }>;
  sanitized: boolean;
  sanitizationPoints: Array<{ location: string; type: string }>;
  cweId?: string;
  description?: string;
}

export interface FileAnalysisState {
  path: string;
  lastModified: number;
  hash: string;
  functions: string[];
}

/**
 * Taint Analysis Sensitivity Levels
 *
 * Different sensitivity levels balance precision vs performance/visualization clarity.
 * Based on research papers on taint analysis precision and soundness.
 *
 * MINIMAL: Very Low Sensitivity - Only explicit data-flow taint
 *   Research: "Minimal Sound Taint Analysis" (Schwartz et al., 2010)
 *   Use Case: Performance-critical, quick scans
 *
 * CONSERVATIVE: Low Sensitivity - Basic control-dependent, no nested structures
 *   Research: "Conservative Control-Flow Taint Analysis" (Livshits & Lam, 2005)
 *   Use Case: General-purpose analysis, balanced precision/performance
 *
 * BALANCED: Medium Sensitivity - Full control-dependent + inter-procedural
 *   Research: "Balanced Taint Analysis" (Tripp et al., 2009)
 *   Use Case: Security analysis, vulnerability detection (current implementation)
 *
 * PRECISE: High Sensitivity - Path-sensitive + field-sensitive
 *   Research: "Path-Sensitive and Field-Sensitive Taint Analysis" (Yin et al., 2007)
 *   Use Case: High-security applications, detailed vulnerability analysis
 *
 * MAXIMUM: Very High Sensitivity - Context-sensitive + flow-sensitive
 *   Research: "Context-Sensitive and Flow-Sensitive Taint Analysis" (Reps et al., 1995)
 *   Use Case: Research, maximum precision requirements
 */
export enum TaintSensitivity {
  MINIMAL = 'minimal',           // Level 1: Very Low - Only explicit data-flow
  CONSERVATIVE = 'conservative', // Level 2: Low - Basic control-dependent, no nested
  BALANCED = 'balanced',         // Level 3: Medium - Full control-dependent + inter-procedural
  PRECISE = 'precise',           // Level 4: High - Path-sensitive + field-sensitive
  MAXIMUM = 'maximum'            // Level 5: Very High - Context-sensitive + flow-sensitive
}

export interface AnalysisConfig {
  updateMode: 'keystroke' | 'save';
  enableLiveness: boolean;
  enableReachingDefinitions: boolean;
  enableTaintAnalysis: boolean;
  debounceDelay: number;
  enableInterProcedural?: boolean; // Enable IPA features (v1.2+)
  taintSensitivity?: TaintSensitivity; // Taint analysis sensitivity level (v1.9+)
}

export interface AnalysisState {
  workspacePath: string;
  timestamp: number;
  cfg: CFG;
  liveness: Map<string, LivenessInfo>;
  reachingDefinitions: Map<string, ReachingDefinitionsInfo>;
  taintAnalysis: Map<string, TaintInfo[]>;
  vulnerabilities: Map<string, any[]>; // Can contain Vulnerability or TaintVulnerability
  fileStates: Map<string, FileAnalysisState>;
  // IPA features (optional, v1.2+)
  callGraph?: any;
  interProceduralRD?: Map<string, Map<string, ReachingDefinitionsInfo>>;
  parameterAnalysis?: Map<string, any>;
  returnValueAnalysis?: Map<string, any>;
  // Taint analysis sensitivity level (v1.9+)
  taintSensitivity?: TaintSensitivity; // Sensitivity level used for this analysis
  // Pre-prepared visualization data (prepared during analysis, not on-demand)
  visualizationData?: {
    // CFG graph data for each function: funcName -> graphData
    cfgGraphData?: Map<string, any>;
    // Call graph visualization data
    callGraphData?: any;
    // Taint analysis data for each function: funcName -> taintData
    taintData?: Map<string, any>;
    // Inter-procedural taint data for each function: funcName -> interProceduralTaintData
    interProceduralTaintData?: Map<string, any>;
    // Interconnected CFG data (same for all functions)
    interconnectedCFGData?: any;
  };
}

