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
        const cfg = this.extractCFGFromFunctionNode(funcNode);
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
   * Extract CFG from function node
   */
  private extractCFGFromFunctionNode(funcNode: ASTNode): FunctionCFG | null {
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
    let entryBlock = '';
    let exitBlock = '';

    for (const [id, block] of blocks) {
      if (block.label.includes('Entry') || block.label.includes('(ENTRY)')) {
        entryBlock = id;
      }
      if (block.label.includes('Exit') || block.label.includes('(EXIT)')) {
        exitBlock = id;
      }
    }

    // If no explicit entry/exit found, use first/last blocks
    if (!entryBlock && blocks.size > 0) {
      const firstKey = blocks.keys().next();
      entryBlock = firstKey.done ? '' : firstKey.value;
    }
    if (!exitBlock && blocks.size > 0) {
      const blockIds = Array.from(blocks.keys());
      exitBlock = blockIds.length > 0 ? blockIds[blockIds.length - 1] : '';
    }

    // Build the CFG structure
    const cfg: FunctionCFG = {
      name: funcNode.name || 'unknown',
      entry: entryBlock || '',
      exit: exitBlock || '',
      blocks: blocks,
      parameters: [] // CFG dump doesn't provide parameter info
    };

    console.log(`  ✓ Built CFG for ${cfg.name} with ${blocks.size} blocks (entry: ${entryBlock}, exit: ${exitBlock})`);
    return cfg;
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
