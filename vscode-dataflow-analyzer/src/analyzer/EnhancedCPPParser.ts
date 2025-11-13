/**
 * EnhancedCPPParser - Control Flow Graph extraction from C++ source
 * 
 * This module converts Clang/LLVM CFG output into our internal dataflow analysis format.
 * 
 * Architecture:
 * 1. Receives CFG JSON from cfg-exporter (Clang/LLVM-based)
 * 2. Parses CFG blocks and their relationships (predecessors/successors)
 * 3. Extracts statements from each block
 * 4. Converts to FunctionCFG structure for dataflow analysis
 * 
 * Academic Correctness:
 * - CFG blocks represent "basic blocks" - maximal sequences of statements
 *   with a single entry point and exit point
 * - Edges represent control flow (jumps, branches, returns)
 * - Each block contains statements to be analyzed for variable definition/use
 * 
 * Key Distinction:
 * - Does NOT parse C++ syntax directly
 * - Works exclusively with Clang/LLVM CFG output (official libraries)
 * - Ensures theoretical soundness of generated CFGs
 * 
 * References:
 * - "Engineering a Compiler" Chapter 4 (Control Flow Graphs)
 * - Clang CFG Generation Algorithm
 */

import * as fs from 'fs';
import * as path from 'path';
import { Statement, StatementType, BasicBlock, CFG, FunctionCFG, Position, Range } from '../types';
import { ClangASTParser } from './ClangASTParser';
import { ASTNode, CXCursorKind } from './ClangASTParser';
import { logError, logWarning, logInfo } from '../utils/ErrorLogger';

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
    this.clangParser = new ClangASTParser();
    
    // Require clang for this parser
    if (!this.clangParser.isAvailable()) {
      throw new Error('Clang is required but not found. Please install clang/clang++ to use this extension.');
    }
    
    console.log('Using clang command-line tool for CFG parsing');
  }

  /**
   * Parse a C++ source file and extract all functions.
   * 
   * @param filePath - Absolute path to C++ source file
   * @returns Object containing array of functions and global variables
   * @throws Error if file cannot be parsed
   */
  async parseFile(filePath: string): Promise<{ functions: FunctionInfo[]; globalVars: string[] }> {
    return this.parseWithClangAST(filePath);
  }

  /**
   * Parse using clang's official AST/CFG generation.
   * 
   * @param filePath - Path to C++ source file
   * @returns Extracted functions and global variables
   * @throws Error if clang parsing fails
   */
  private async parseWithClangAST(filePath: string): Promise<{ functions: FunctionInfo[]; globalVars: string[] }> {
    // STEP 1: Parse file with clang to generate CFG
    const ast = await this.clangParser.parseFile(filePath);
    if (!ast) {
      throw new Error(`Failed to parse ${filePath} with clang. Please ensure clang is properly installed and the file is valid C++ code.`);
    }

    // STEP 2: Extract functions from CFG AST
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

    console.log(`Extracting functions from CFG-based AST for ${filePath}`);

    // STEP 1: Iterate through all functions in AST
    // Functions are stored as named keys in ast.inner (from cfg-exporter)
    for (const funcName in ast.inner || {}) {
      const funcNode = (ast.inner as any)[funcName];
      
      // STEP 2: Validate that this is indeed a function node
      // Check for FunctionDecl kind or presence of inner CFG blocks
      if (funcNode && (funcNode.kind === 'FunctionDecl' || (funcNode.inner && funcNode.name))) {
        console.log(`Found function: ${funcName}`);

        // STEP 3: Extract CFG blocks from function node
        const cfg = this.extractCFGFromFunctionNode(funcNode, filePath);
        if (cfg) {
          const funcInfo: FunctionInfo = {
            name: funcName,
            range: funcNode.range || { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } },
            cfg: cfg,
            astNode: funcNode
          };

          functions.push(funcInfo);
          console.log(`✓ Extracted function: ${funcName} with ${cfg.blocks.size} blocks`);
        }
      }
    }

    console.log(`Extracted ${functions.length} functions from CFG structure`);
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
    try {
      // CRITICAL FIX (LOGIC.md #7): Validate file exists and is readable
      if (!fs.existsSync(filePath)) {
        logWarning('Parser', `File not found for parameter extraction: ${filePath}`, { funcName, filePath });
        return [];
      }

      const sourceCode = fs.readFileSync(filePath, 'utf-8');
      if (!sourceCode || sourceCode.trim().length === 0) {
        logWarning('Parser', `Empty file for parameter extraction: ${filePath}`, { funcName, filePath });
        return [];
      }

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
            console.log(`[Parser] Function ${funcName} has no parameters`);
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
          
          console.log(`[Parser] Extracted ${params.length} parameters for ${funcName}: ${params.join(', ')}`);
          return params;
        }
      }
      
      // CRITICAL FIX (LOGIC.md #7): Distinguish between "no signature found" and "error"
      if (!foundSignature) {
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
    
    // Split by whitespace and take the last token (parameter name)
    // This handles: "int n", "int* ptr", "const char* str"
    const parts = trimmed.split(/\s+/);
    const name = parts[parts.length - 1];
    
    // Remove pointer/reference operators from name
    // Handles: "int* ptr" -> "ptr", "int& ref" -> "ref"
    const cleanName = name.replace(/[*&\[\]]/g, '');
    
    return cleanName;
  }

  /**
   * Extract CFG from function node
   */
  private extractCFGFromFunctionNode(funcNode: ASTNode, filePath?: string): FunctionCFG | null {
    if (!funcNode.inner) {
      console.log(`  ✗ No inner property for function ${funcNode.name}`);
      return null;
    }

    console.log(`  - Extracting CFG from ${funcNode.name}, inner is ${Array.isArray(funcNode.inner) ? 'array' : 'object'}`);

    let cfgBlocks: ASTNode[] = [];

    if (Array.isArray(funcNode.inner)) {
      // From cfg-exporter: inner is directly [CFGBlock, CFGBlock, ...]
      // The blocks are generated at ClangASTParser.ts lines 357-381
      console.log(`  - funcNode.inner is array with ${funcNode.inner.length} items`);
      
      // First, check if items are directly CFGBlock
      const directBlocks = funcNode.inner.filter(node => node.kind === 'CFGBlock');
      if (directBlocks.length > 0) {
        cfgBlocks = directBlocks;
        console.log(`  - Found ${cfgBlocks.length} CFGBlocks directly in inner array`);
      } else {
        // Fallback: look for CompoundStmt wrapping the blocks
        for (const item of funcNode.inner) {
          if (item.kind === 'CompoundStmt' && item.inner) {
            const innerItems = Array.isArray(item.inner) ? item.inner : Object.values(item.inner);
            cfgBlocks = innerItems.filter(node => node.kind === 'CFGBlock');
            console.log(`  - Found ${cfgBlocks.length} CFGBlocks in CompoundStmt`);
            break;
          }
        }
      }
    } else {
      // Handle object format - look for CFGBlock nodes directly
      const innerValues = Object.values(funcNode.inner);
      cfgBlocks = innerValues.filter(node => node.kind === 'CFGBlock');
      console.log(`  - funcNode.inner is object with ${cfgBlocks.length} CFGBlock items`);
    }

    if (cfgBlocks.length === 0) {
      console.log(`  ✗ No CFGBlocks found in ${funcNode.name}`);
      console.log(`  DEBUG: funcNode.inner items are:`, Array.isArray(funcNode.inner) ? funcNode.inner.map((n: any) => n.kind) : 'not an array');
      return null;
    }

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
      console.log(`  - Added block ${block.id} (${block.label}) - successors: [${block.successors.join(',')}], predecessors: [${block.predecessors.join(',')}]`);
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
    const funcName = funcNode.name || 'unknown';
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
    const validationErrors = this.validateCFGStructure(cfg);
    if (validationErrors.length > 0) {
      console.warn(`[Parser] WARNING: CFG structure validation failed for ${funcName}:`);
      validationErrors.forEach(error => console.warn(`[Parser]   - ${error}`));
      // Continue anyway - some errors may be recoverable
    } else {
      console.log(`[Parser] CFG structure validation passed for ${funcName}`);
    }

    console.log(`  ✓ Built CFG for ${cfg.name} with ${blocks.size} blocks (entry: ${entryBlock}, exit: ${exitBlock}), ${parameters.length} parameters`);
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
