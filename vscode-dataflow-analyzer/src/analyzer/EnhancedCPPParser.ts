/**
 * EnhancedCPPParser.ts
 * 
 * Enhanced C++ Parser - Control Flow Graph Extraction from C++ Source
 * 
 * PURPOSE:
 * This module converts Clang/LLVM CFG JSON output into our internal dataflow analysis format.
 * It bridges the gap between the cfg-exporter tool's JSON output and the analysis engine's
 * internal CFG representation.
 * 
 * SIGNIFICANCE IN OVERALL FLOW:
 * This is the SECOND step in the analysis pipeline (after cfg-exporter). It transforms
 * raw CFG JSON data into structured FunctionCFG objects that all analyzers can work with.
 * Without this parser, the CFG data from cfg-exporter cannot be used by the analysis engine.
 * 
 * DATA FLOW:
 * INPUTS:
 *   - CFG JSON data (from ClangASTParser.ts, which reads from cfg-exporter stdout)
 *   - Source file path (for context)
 * 
 * PROCESSING:
 *   1. Receives JSON from ClangASTParser.parseFile()
 *   2. Parses CFG blocks and their relationships (predecessors/successors)
 *   3. Extracts statements from each block
 *   4. Identifies entry/exit blocks using graph-theoretic properties
 *   5. Extracts function parameters from source code
 *   6. Converts to FunctionCFG structure
 * 
 * OUTPUTS:
 *   - FunctionInfo[] array containing:
 *     - Function name
 *     - FunctionCFG structure with:
 *       - Blocks Map (blockId -> BasicBlock)
 *       - Entry/exit block IDs
 *       - Parameters array
 *   - FunctionCFG objects -> DataflowAnalyzer.ts (for analysis)
 * 
 * DEPENDENCIES:
 *   - ClangASTParser.ts: Provides JSON CFG data
 *   - types.ts: Provides CFG, FunctionCFG, BasicBlock, Statement interfaces
 * 
 * KEY DISTINCTION:
 * - Does NOT parse C++ syntax directly
 * - Works exclusively with Clang/LLVM CFG output (official libraries)
 * - Ensures theoretical soundness of generated CFGs
 * 
 * ACADEMIC CORRECTNESS:
 * - CFG blocks represent "basic blocks" - maximal sequences of statements
 *   with a single entry point and exit point
 * - Edges represent control flow (jumps, branches, returns)
 * - Each block contains statements to be analyzed for variable definition/use
 * 
 * REFERENCES:
 * - "Engineering a Compiler" Chapter 4 (Control Flow Graphs)
 * - Clang CFG Generation Algorithm
 */

import * as fs from 'fs';
import * as path from 'path';
import { Statement, StatementType, BasicBlock, CFG, FunctionCFG, Position, Range } from '../types';
import { ClangASTParser } from './ClangASTParser';
import { ASTNode, CXCursorKind } from './ClangASTParser';
import { logError, logWarning, logInfo } from '../utils/ErrorLogger';
import { LoggingConfig } from '../utils/LoggingConfig';

/**
 * Represents a complete function for analysis.
 * Contains the function name, source location, and CFG for dataflow analysis.
 */
export interface FunctionInfo {
  name: string;                           // Function name (e.g., "factorial")
  range: Range;                           // Source code location of function
  cfg: FunctionCFG;                       // Control Flow Graph for this function
  astNode?: ASTNode;                      // Reference to AST node (optional)
}

/**
 * Extracts Control Flow Graphs from C++ source using Clang/LLVM.
 * 
 * This class handles the complete CFG extraction pipeline:
 * 1. Parse file with clang
 * 2. Convert clang CFG to internal format
 * 3. Extract blocks, statements, and control flow edges
 */
export class EnhancedCPPParser {
  private clangParser: ClangASTParser;

  /**
   * Initialize parser with clang integration.
   * 
   * @throws Error if clang is not available on the system
   */
  constructor() {
    LoggingConfig.section('Parser', 'Initializing Enhanced C++ Parser');
    LoggingConfig.log('Parser', 'Creating ClangASTParser instance');
    
    this.clangParser = new ClangASTParser();
    
    // Require clang for this parser
    if (!this.clangParser.isAvailable()) {
      LoggingConfig.error('Parser', 'Clang is required but not found. Please install clang/clang++ to use this extension.');
      throw new Error('Clang is required but not found. Please install clang/clang++ to use this extension.');
    }
    
    LoggingConfig.log('Parser', 'Clang is available - using clang command-line tool for CFG parsing');
  }

  /**
   * Parse a C++ source file and extract all functions.
   * 
   * @param filePath - Absolute path to C++ source file
   * @returns Object containing array of functions and global variables
   * @throws Error if file cannot be parsed
   */
  async parseFile(filePath: string): Promise<{ functions: FunctionInfo[]; globalVars: string[] }> {
    LoggingConfig.section('Parser', `Parsing File: ${filePath}`);
    LoggingConfig.log('Parser', `File path: ${filePath}`);
    
    const parseStartTime = Date.now();
    try {
      const result = await this.parseWithClangAST(filePath);
      const parseTimeMs = Date.now() - parseStartTime;
      
      LoggingConfig.log('Parser', `Parsing complete: ${result.functions.length} functions, ${result.globalVars.length} global vars`);
      LoggingConfig.log('Parser', `Parse time: ${parseTimeMs}ms`);
      
      if (result.functions.length > 0) {
        LoggingConfig.subsection('Parser', 'Extracted Functions');
        result.functions.forEach((func, idx) => {
          LoggingConfig.detail('Parser', `Function[${idx}]: ${func.name} (${func.cfg.blocks.size} blocks, ${func.cfg.parameters.length} params)`);
        });
      }
      
      return result;
    } catch (error) {
      const parseTimeMs = Date.now() - parseStartTime;
      LoggingConfig.error('Parser', `Failed to parse file: ${filePath}`, error);
      LoggingConfig.log('Parser', `Parse failed after ${parseTimeMs}ms`);
      throw error;
    }
  }

  /**
   * Parse using clang's official AST/CFG generation.
   * 
   * @param filePath - Path to C++ source file
   * @returns Extracted functions and global variables
   * @throws Error if clang parsing fails
   */
  private async parseWithClangAST(filePath: string): Promise<{ functions: FunctionInfo[]; globalVars: string[] }> {
    LoggingConfig.subsection('Parser', 'STEP 1: Parsing file with Clang AST');
    LoggingConfig.detail('Parser', `Calling ClangASTParser.parseFile(${filePath})`);
    
    // STEP 1: Parse file with clang to generate CFG
    const ast = await this.clangParser.parseFile(filePath);
    if (!ast) {
      LoggingConfig.error('Parser', `Clang AST parsing returned null for ${filePath}`);
      throw new Error(`Failed to parse ${filePath} with clang. Please ensure clang is properly installed and the file is valid C++ code.`);
    }

    LoggingConfig.log('Parser', 'Clang AST parsing successful');
    LoggingConfig.verbose('Parser', 'AST structure', { 
      kind: ast.kind, 
      name: ast.name,
      hasInner: !!ast.inner,
      innerType: ast.inner ? (Array.isArray(ast.inner) ? 'array' : 'object') : 'none'
    });

    // STEP 2: Extract functions from CFG AST
    LoggingConfig.subsection('Parser', 'STEP 2: Extracting functions from AST');
    return this.extractFunctionsFromAST(ast, filePath);
  }

  /**
   * Extract functions from CFG-based AST structure.
   * 
   * CFG structure format (from cfg-exporter):
   * Object with function names as keys, each containing FunctionDecl nodes
   * with inner array of CFGBlock nodes.
   * 
   * @param ast - AST from clang parser
   * @param filePath - Source file path
   * @returns Functions and global variables extracted from AST
   */
  private extractFunctionsFromAST(ast: ASTNode, filePath: string): { functions: FunctionInfo[]; globalVars: string[] } {
    const functions: FunctionInfo[] = [];
    const globalVars: string[] = [];

    LoggingConfig.log('Parser', `Extracting functions from CFG-based AST for ${filePath}`);

    /**
     * FUNCTION EXTRACTION FROM AST
     * 
     * Iterates through AST nodes to extract function definitions and their CFGs.
     */
    // STEP 1: Iterate through all functions in AST
    // Functions are stored as named keys in ast.inner (from cfg-exporter)
    const innerKeys = ast.inner ? Object.keys(ast.inner) : [];
    LoggingConfig.detail('Parser', `AST inner keys count: ${innerKeys.length}`);
    
    for (const funcName in ast.inner || {}) {
      const funcNode = (ast.inner as any)[funcName];
      
      LoggingConfig.detail('Parser', `Processing AST node: ${funcName} (kind: ${funcNode?.kind || 'unknown'})`);
      
      // STEP 2: Validate that this is indeed a function node
      // Check for FunctionDecl kind or presence of inner CFG blocks
      if (funcNode && (funcNode.kind === 'FunctionDecl' || (funcNode.inner && funcNode.name))) {
        LoggingConfig.log('Parser', `Found function: ${funcName}`);

        // STEP 3: Extract CFG blocks from function node
        LoggingConfig.detail('Parser', `Extracting CFG for function: ${funcName}`);
        const cfg = this.extractCFGFromFunctionNode(funcNode, filePath);
        if (cfg) {
          const funcInfo: FunctionInfo = {
            name: funcName,
            range: funcNode.range || { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } },
            cfg: cfg,
            astNode: funcNode
          };

          functions.push(funcInfo);
          LoggingConfig.log('Parser', `✓ Extracted function: ${funcName} with ${cfg.blocks.size} blocks, ${cfg.parameters.length} parameters`);
        } else {
          LoggingConfig.warn('Parser', `Failed to extract CFG for function: ${funcName}`);
        }
      } else {
        LoggingConfig.detail('Parser', `Skipping non-function node: ${funcName} (kind: ${funcNode?.kind || 'unknown'})`);
      }
    }

    LoggingConfig.log('Parser', `Extracted ${functions.length} functions from CFG structure`);
    return { functions, globalVars };
  }

  /**
   * Traverse CFG-based AST structure
   */
  private traverseCFG(node: ASTNode, callback: (node: ASTNode) => void): void {
    callback(node);

    if (node.inner) {
      if (Array.isArray(node.inner)) {
        // Handle array format
        for (const child of node.inner) {
          this.traverseCFG(child, callback);
        }
      } else {
        // Handle object format (functions as named keys)
        for (const key in node.inner) {
          this.traverseCFG(node.inner[key], callback);
        }
      }
    }
  }

  /**
   * Extract function parameters from source code
   * 
   * Since cfg-exporter doesn't provide parameter info, we parse it from source.
   * Looks for function signature: "returnType functionName(param1, param2, ...)"
   * 
   * CRITICAL FIX (LOGIC.md #7): Improved error handling to distinguish between
   * "no parameters" and "extraction failed".
   * 
   * @param funcName - Function name to search for
   * @param filePath - Path to source file
   * @returns Array of parameter names, or empty array if no parameters or extraction failed
   */
  private extractParametersFromSource(funcName: string, filePath: string): string[] {
    LoggingConfig.detail('Parser', `Extracting parameters for function: ${funcName} from ${filePath}`);
    
    try {
      // CRITICAL FIX (LOGIC.md #7): Validate file exists and is readable
      if (!fs.existsSync(filePath)) {
        LoggingConfig.warn('Parser', `File not found for parameter extraction: ${filePath}`);
        logWarning('Parser', `File not found for parameter extraction: ${filePath}`, { funcName, filePath });
        return [];
      }

      const sourceCode = fs.readFileSync(filePath, 'utf-8');
      if (!sourceCode || sourceCode.trim().length === 0) {
        LoggingConfig.warn('Parser', `Empty file for parameter extraction: ${filePath}`);
        logWarning('Parser', `Empty file for parameter extraction: ${filePath}`, { funcName, filePath });
        return [];
      }
      
      LoggingConfig.detail('Parser', `Source file read: ${sourceCode.length} characters`);

      const lines = sourceCode.split('\n');
      
      // Pattern to match function signature (definition, not call):
      // - Must have return type (int, void, char, char*, int*, etc.) before function name
      // - Function name
      // - Parameter list in parentheses
      // Handles: "int fibonacci(int n)", "void helperA(int x)", "char* get_user_input()", etc.
      // Also handles forward declarations: "int fibonacci(int n);"
      // Does NOT match function calls: "helper_function(1)" (no return type)
      // Pattern matches: return_type (with optional * after type) + whitespace + function_name
      // Examples: "char* get_user_input()", "int* func()", "char *func()", "int func()"
      const funcPattern = new RegExp(
        `(?:\\w+\\s*\\*\\s+|\\w+\\s+)+${funcName}\\s*\\(([^)]*)\\)`,
        'g'
      );
      
      let foundSignature = false;
      
      // Search through all lines for function signature
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Reset regex lastIndex for each line
        funcPattern.lastIndex = 0;
        const match = funcPattern.exec(line);
        if (match) {
          foundSignature = true;
          const paramList = match[1].trim();
          
          // Handle empty parameter list (distinct from extraction failure)
          if (!paramList) {
            LoggingConfig.detail('Parser', `Function ${funcName} has no parameters`);
            return [];
          }
          
          // Split parameters by comma, respecting nested parentheses
          const params: string[] = [];
          let current = '';
          let parenDepth = 0;
          
          for (const char of paramList) {
            if (char === '(') {
              parenDepth++;
              current += char;
            } else if (char === ')') {
              parenDepth--;
              current += char;
            } else if (char === ',' && parenDepth === 0) {
              // Comma at top level - parameter separator
              const paramName = this.extractParameterName(current.trim());
              if (paramName) {
                params.push(paramName);
              }
              current = '';
            } else {
              current += char;
            }
          }
          
          // Don't forget the last parameter
          if (current.trim()) {
            const paramName = this.extractParameterName(current.trim());
            if (paramName) {
              params.push(paramName);
            }
          }
          
          LoggingConfig.detail('Parser', `Extracted ${params.length} parameters for ${funcName}: ${params.join(', ')}`);
          return params;
        }
      }
      
      // CRITICAL FIX (LOGIC.md #7): Distinguish between "no signature found" and "error"
      if (!foundSignature) {
        LoggingConfig.warn('Parser', `Function signature not found for ${funcName} in ${filePath}`);
        logWarning('Parser', `Function signature not found for ${funcName} in ${filePath}`, {
          funcName,
          filePath,
          possibleReasons: [
            'Function name mismatch',
            'Function defined in different file',
            'Parsing pattern mismatch'
          ]
        });
      }
      
      return [];
    } catch (error) {
      // CRITICAL FIX (LOGIC.md #7): Better error reporting
      LoggingConfig.error('Parser', `Failed to extract parameters for ${funcName} from ${filePath}`, error);
      logError('Parser', `Failed to extract parameters for ${funcName} from ${filePath}`, error, {
        funcName,
        filePath,
        impact: 'Parameter definitions may be missing'
      });
      // Return empty array but log the error clearly
      return [];
    }
  }

  /**
   * Extract parameter name from parameter declaration
   * 
   * Examples:
   * - "int n" -> "n"
   * - "int* ptr" -> "ptr"
   * - "const char* str" -> "str"
   * - "int base, int exp" -> "exp" (for the second param)
   * 
   * @param paramDecl - Parameter declaration string
   * @returns Parameter name or empty string
   */
  private extractParameterName(paramDecl: string): string {
    if (!paramDecl) return '';
    
    // Remove leading/trailing whitespace
    const trimmed = paramDecl.trim();
    
    /**
     * PARAMETER NAME EXTRACTION
     * 
     * Handles various parameter declaration formats including function pointers.
     */
    // Debug: Log all parameter declarations to understand formats
    LoggingConfig.verbose('Parser', `extractParameterName input: "${trimmed}"`);
    
    // Handle function pointer syntax: "int (*callback)(int)" -> "callback"
    // Pattern matches: type (*name)(params)
    const funcPtrMatch = trimmed.match(/\(\s*\*\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)\s*\([^)]*\)/);
    if (funcPtrMatch) {
      LoggingConfig.verbose('Parser', `Extracted function pointer parameter: ${funcPtrMatch[1]} from "${trimmed}"`);
      return funcPtrMatch[1];
    }
    
    // Handle function pointer with return type before: "int (*callback)(int)" from Clang
    // Sometimes Clang format is slightly different
    const funcPtrMatch2 = trimmed.match(/\*\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)\s*\(/);
    if (funcPtrMatch2) {
      LoggingConfig.verbose('Parser', `Extracted function pointer (alt): ${funcPtrMatch2[1]} from "${trimmed}"`);
      return funcPtrMatch2[1];
    }
    
    // Handle function pointer typedef syntax: "Callback callback" where Callback is a typedef
    // Also handles array of function pointers: "void (*callbacks[])(int)"
    const funcPtrArrayMatch = trimmed.match(/\(\s*\*\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\[\]\s*\)\s*\([^)]*\)/);
    if (funcPtrArrayMatch) {
      LoggingConfig.verbose('Parser', `Extracted function pointer array parameter: ${funcPtrArrayMatch[1]} from "${trimmed}"`);
      return funcPtrArrayMatch[1];
    }
    
    // Split by whitespace and take the last token (parameter name)
    // This handles: "int n", "int* ptr", "const char* str"
    const parts = trimmed.split(/\s+/);
    const name = parts[parts.length - 1];
    
    // Remove pointer/reference operators from name
    // Handles: "int* ptr" -> "ptr", "int& ref" -> "ref"
    // Also remove leading/trailing parentheses from function pointer names
    let cleanName = name.replace(/[*&\[\]]/g, '');
    
    // Clean up any leading ( from function pointer syntax that wasn't matched
    cleanName = cleanName.replace(/^\(+/, '').replace(/\)+$/, '');
    
    LoggingConfig.verbose('Parser', `extractParameterName result: "${cleanName}" from "${trimmed}"`);
    
    return cleanName;
  }

  /**
   * Extract CFG from function node
   */
  private extractCFGFromFunctionNode(funcNode: ASTNode, filePath?: string): FunctionCFG | null {
    const funcName = funcNode.name || 'unknown';
    LoggingConfig.detail('Parser', `Extracting CFG from function node: ${funcName}`);
    
    if (!funcNode.inner) {
      LoggingConfig.warn('Parser', `No inner property for function ${funcName}`);
      return null;
    }

    LoggingConfig.detail('Parser', `Function ${funcName}: inner is ${Array.isArray(funcNode.inner) ? 'array' : 'object'}`);

    let cfgBlocks: ASTNode[] = [];

    if (Array.isArray(funcNode.inner)) {
      /**
       * CFG BLOCK EXTRACTION FROM ARRAY FORMAT
       * 
       * Handles cases where inner is an array of CFGBlocks or wrapped in CompoundStmt.
       */
      // From cfg-exporter: inner is directly [CFGBlock, CFGBlock, ...]
      // The blocks are generated at ClangASTParser.ts lines 357-381
      LoggingConfig.detail('Parser', `Function ${funcName}: funcNode.inner is array with ${funcNode.inner.length} items`);
      
      // First, check if items are directly CFGBlock
      const directBlocks = funcNode.inner.filter(node => node.kind === 'CFGBlock');
      if (directBlocks.length > 0) {
        cfgBlocks = directBlocks;
        LoggingConfig.detail('Parser', `Function ${funcName}: Found ${cfgBlocks.length} CFGBlocks directly in inner array`);
      } else {
        // Fallback: look for CompoundStmt wrapping the blocks
        for (const item of funcNode.inner) {
          if (item.kind === 'CompoundStmt' && item.inner) {
            const innerItems = Array.isArray(item.inner) ? item.inner : Object.values(item.inner);
            cfgBlocks = innerItems.filter(node => node.kind === 'CFGBlock');
            LoggingConfig.detail('Parser', `Function ${funcName}: Found ${cfgBlocks.length} CFGBlocks in CompoundStmt`);
            break;
          }
        }
      }
    } else {
      /**
       * CFG BLOCK EXTRACTION FROM OBJECT FORMAT
       * 
       * Handles cases where inner is an object with CFGBlock nodes as values.
       */
      // Handle object format - look for CFGBlock nodes directly
      const innerValues = Object.values(funcNode.inner);
      cfgBlocks = innerValues.filter(node => node.kind === 'CFGBlock');
      LoggingConfig.detail('Parser', `Function ${funcName}: funcNode.inner is object with ${cfgBlocks.length} CFGBlock items`);
    }

    if (cfgBlocks.length === 0) {
      const innerKinds = Array.isArray(funcNode.inner) ? funcNode.inner.map((n: any) => n.kind) : 'not an array';
      LoggingConfig.warn('Parser', `No CFGBlocks found in ${funcName}. Inner items: ${JSON.stringify(innerKinds)}`);
      return null;
    }
    
    LoggingConfig.detail('Parser', `Function ${funcName}: Processing ${cfgBlocks.length} CFG blocks`);

    const blocks = new Map<string, BasicBlock>();

    // Process each CFG block
    for (const blockNode of cfgBlocks) {
      const block: BasicBlock = {
        id: blockNode.id || `block_${Math.random()}`,
        label: blockNode.label || 'Unknown',
        statements: blockNode.statements || [],
        successors: blockNode.successors || [],
        predecessors: blockNode.predecessors || []
      };

      blocks.set(block.id, block);
      LoggingConfig.verbose('Parser', `Function ${funcName}: Added block ${block.id} (${block.label}) - ${block.statements.length} statements, successors: [${block.successors.join(',')}], predecessors: [${block.predecessors.join(',')}]`);
    }

    // Find entry and exit blocks
    // MODERATE FIX (Issue #7): Use graph-theoretic properties (predecessor/successor count)
    // instead of heuristics, per academic standards
    let entryBlock = '';
    let exitBlock = '';

    // First, try explicit labels (for compatibility)
    for (const [id, block] of blocks) {
      if (block.label.includes('Entry') || block.label.includes('(ENTRY)')) {
        entryBlock = id;
      }
      if (block.label.includes('Exit') || block.label.includes('(EXIT)')) {
        exitBlock = id;
      }
    }

    // If no explicit entry found, use graph-theoretic property: block with no predecessors
    if (!entryBlock) {
      for (const [id, block] of blocks) {
        if (block.predecessors.length === 0) {
          entryBlock = id;
          break;
        }
      }
    }

    // If no explicit exit found, use graph-theoretic property: block with no successors
    if (!exitBlock) {
      for (const [id, block] of blocks) {
        if (block.successors.length === 0) {
          exitBlock = id;
          break;
        }
      }
    }

    // Fallback: use first/last blocks if still not found (should rarely happen)
    if (!entryBlock && blocks.size > 0) {
      const firstKey = blocks.keys().next();
      entryBlock = firstKey.done ? '' : firstKey.value;
    }
    if (!exitBlock && blocks.size > 0) {
      const blockIds = Array.from(blocks.keys());
      exitBlock = blockIds.length > 0 ? blockIds[blockIds.length - 1] : '';
    }

    // Extract parameters from source code
    // Note: funcName is already declared at the start of this function
    const parameters = filePath ? this.extractParametersFromSource(funcName, filePath) : [];

    // Build the CFG structure
    const cfg: FunctionCFG = {
      name: funcName,
      entry: entryBlock || '',
      exit: exitBlock || '',
      blocks: blocks,
      parameters: parameters // Extracted from source code
    };

    // CRITICAL FIX (LOGIC.md #14): Validate CFG structure before returning
    LoggingConfig.detail('Parser', `Validating CFG structure for ${funcName}`);
    const validationErrors = this.validateCFGStructure(cfg);
    /**
     * CFG VALIDATION
     * 
     * Validates CFG structure integrity before returning.
     */
    if (validationErrors.length > 0) {
      LoggingConfig.warn('Parser', `CFG structure validation failed for ${funcName}: ${validationErrors.length} errors`);
      validationErrors.forEach(error => {
        LoggingConfig.warn('Parser', `  Validation error: ${error}`);
      });
      // Continue anyway - some errors may be recoverable
    } else {
      LoggingConfig.detail('Parser', `CFG structure validation passed for ${funcName}`);
    }

    LoggingConfig.log('Parser', `✓ Built CFG for ${cfg.name} with ${blocks.size} blocks (entry: ${entryBlock}, exit: ${exitBlock}), ${parameters.length} parameters`);
    return cfg;
  }

  /**
   * Validate CFG structure integrity
   * 
   * CRITICAL FIX (LOGIC.md #14): Validates:
   * - Entry/exit blocks exist and are valid
   * - All successor/predecessor references point to valid blocks
   * - Bidirectional consistency (if A->B, then B should reference A as predecessor)
   * 
   * @param cfg - FunctionCFG to validate
   * @returns Array of validation error messages (empty if valid)
   */
  private validateCFGStructure(cfg: FunctionCFG): string[] {
    const errors: string[] = [];
    
    // 1. Validate entry block exists
    if (!cfg.entry || !cfg.blocks.has(cfg.entry)) {
      errors.push(`Entry block '${cfg.entry}' does not exist in blocks map`);
    }
    
    // 2. Validate exit block exists
    if (!cfg.exit || !cfg.blocks.has(cfg.exit)) {
      errors.push(`Exit block '${cfg.exit}' does not exist in blocks map`);
    }
    
    // 3. Validate all successor/predecessor references
    cfg.blocks.forEach((block, blockId) => {
      // Check successors
      block.successors.forEach(succId => {
        if (!cfg.blocks.has(succId)) {
          errors.push(`Block ${blockId} has invalid successor reference: ${succId}`);
        } else {
          // Check bidirectional consistency
          const succBlock = cfg.blocks.get(succId)!;
          if (!succBlock.predecessors.includes(blockId)) {
            errors.push(`Bidirectional inconsistency: Block ${blockId} -> ${succId}, but ${succId} doesn't list ${blockId} as predecessor`);
          }
        }
      });
      
      // Check predecessors
      block.predecessors.forEach(predId => {
        if (!cfg.blocks.has(predId)) {
          errors.push(`Block ${blockId} has invalid predecessor reference: ${predId}`);
        } else {
          // Check bidirectional consistency
          const predBlock = cfg.blocks.get(predId)!;
          if (!predBlock.successors.includes(blockId)) {
            errors.push(`Bidirectional inconsistency: Block ${blockId} <- ${predId}, but ${predId} doesn't list ${blockId} as successor`);
          }
        }
      });
    });
    
    // 4. Validate entry block has no predecessors (graph-theoretic property)
    if (cfg.entry && cfg.blocks.has(cfg.entry)) {
      const entryBlock = cfg.blocks.get(cfg.entry)!;
      if (entryBlock.predecessors.length > 0) {
        errors.push(`Entry block ${cfg.entry} has predecessors: [${entryBlock.predecessors.join(', ')}] (should be 0)`);
      }
    }
    
    // 5. Validate exit block has no successors (graph-theoretic property)
    if (cfg.exit && cfg.blocks.has(cfg.exit)) {
      const exitBlock = cfg.blocks.get(cfg.exit)!;
      if (exitBlock.successors.length > 0) {
        errors.push(`Exit block ${cfg.exit} has successors: [${exitBlock.successors.join(', ')}] (should be 0)`);
      }
    }
    
    return errors;
  }

  /**
   * Build CFG for function - uses pre-built CFG from Clang
   */
  buildCFGForFunction(functionInfo: FunctionInfo, functionName: string): FunctionCFG {
    // Return the pre-built CFG from Clang CFG generation
    return functionInfo.cfg;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    // No resources to dispose for clang command-line approach
  }
}
