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
}

export interface Statement {
  id?: string;
  type?: StatementType;
  text: string;
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

export interface TaintInfo {
  variable: string;
  source: string;
  tainted: boolean;
  propagationPath: string[];
}

export interface AnalysisState {
  workspacePath: string;
  timestamp: number;
  cfg: CFG;
  liveness: Map<string, LivenessInfo>;
  reachingDefinitions: Map<string, ReachingDefinitionsInfo>;
  taintAnalysis: Map<string, TaintInfo[]>;
  vulnerabilities: Map<string, any[]>; // functionName -> Vulnerability[]
  fileStates: Map<string, FileAnalysisState>;
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
}

