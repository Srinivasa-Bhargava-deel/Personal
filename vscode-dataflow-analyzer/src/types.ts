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

export interface Position {
  line: number;
  column: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface BasicBlock {
  id: string;
  label: string;
  statements: Statement[];
  predecessors: string[];
  successors: string[];
  range?: Range;
  isEntry?: boolean;  // Optional marker for entry block
  isExit?: boolean;   // Optional marker for exit block
}

export interface Statement {
  id?: string;
  type?: StatementType;
  text: string;
  content?: string;  // Alias for text, used by some parsers
  range?: Range;
  variables?: {
    defined: string[];
    used: string[];
  };
}

export enum StatementType {
  ASSIGNMENT = 'assignment',
  CONDITIONAL = 'conditional',
  LOOP = 'loop',
  RETURN = 'return',
  DECLARATION = 'declaration',
  FUNCTION_CALL = 'function_call',
  OTHER = 'other'
}

export interface CFG {
  entry: string;
  exit: string;
  blocks: Map<string, BasicBlock>;
  functions: Map<string, FunctionCFG>;
}

export interface FunctionCFG {
  name: string;
  entry: string;
  exit: string;
  blocks: Map<string, BasicBlock>;
  parameters: string[];
}

export interface LivenessInfo {
  blockId: string;
  in: Set<string>;
  out: Set<string>;
}

export interface ReachingDefinition {
  variable: string;
  definitionId: string;
  blockId: string;
  statementId?: string;
  range?: Range;
  // History tracking: shows the path of this definition through the CFG
  sourceBlock?: string;        // Original block where definition was created
  propagationPath?: string[];  // Path from source to current block: [B0 -> B1 -> B2]
  killed?: boolean;            // Whether this definition was killed
  isParameter?: boolean;       // Whether this is a function parameter definition
}

export interface ReachingDefinitionsInfo {
  blockId: string;
  gen: Map<string, ReachingDefinition[]>;
  kill: Map<string, ReachingDefinition[]>;
  in: Map<string, ReachingDefinition[]>;
  out: Map<string, ReachingDefinition[]>;
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

export interface TaintInfo {
  variable: string;
  source: string;
  tainted: boolean;
  propagationPath: string[];
  // Enhanced fields for Phase 1+
  sourceCategory?: 'user_input' | 'file_io' | 'network' | 'environment' | 'command_line' | 'database' | 'configuration';
  taintType?: 'string' | 'buffer' | 'integer' | 'pointer';
  sourceFunction?: string;
  sourceLocation?: {
    blockId: string;
    statementId?: string;
    range?: Range;
  };
  // Phase 3: Sanitization tracking
  sanitized?: boolean;
  sanitizationPoints?: Array<{ location: string; type: string }>;
  // Phase 4: Enhanced propagation - taint labels
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

