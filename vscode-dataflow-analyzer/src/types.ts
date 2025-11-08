/**
 * Core types and interfaces for the dataflow analyzer
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
  USER_INPUT = 'user_input',      // Direct user input
  FILE_CONTENT = 'file_content',  // File contents
  NETWORK_DATA = 'network_data',  // Network data
  ENVIRONMENT = 'environment',    // Environment variables
  COMMAND_LINE = 'command_line',  // Command line arguments
  DATABASE = 'database',          // Database query results
  CONFIGURATION = 'configuration', // Configuration files
  DERIVED = 'derived'             // Derived from tainted data
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

export interface AnalysisConfig {
  updateMode: 'keystroke' | 'save';
  enableLiveness: boolean;
  enableReachingDefinitions: boolean;
  enableTaintAnalysis: boolean;
  debounceDelay: number;
  enableInterProcedural?: boolean; // Enable IPA features (v1.2+)
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
}

