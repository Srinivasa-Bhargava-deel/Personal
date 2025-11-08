/**
 * Enhanced C++ parser using libclang/clang AST
 * Uses clang exclusively - no fallback parser
 */

import * as fs from 'fs';
import * as path from 'path';
import { Statement, StatementType, BasicBlock, CFG, FunctionCFG, Position, Range } from '../types';
import { ClangASTParser } from './ClangASTParser';
import { ASTNode, CXCursorKind } from './ClangASTParser';

export class EnhancedCPPParser {
  private clangParser: ClangASTParser;

  constructor() {
    this.clangParser = new ClangASTParser();
    
    if (!this.clangParser.isAvailable()) {
      throw new Error('Clang is required but not found. Please install clang/clang++ to use this extension.');
    }
    
    console.log('Using clang command-line tool for parsing');
  }

  /**
   * Parse a C++ file and extract functions using clang AST
   */
  async parseFile(filePath: string): Promise<{ functions: FunctionInfo[]; globalVars: string[] }> {
    return this.parseWithClangAST(filePath);
  }

  /**
   * Parse using clang AST dump
   */
  private async parseWithClangAST(filePath: string): Promise<{ functions: FunctionInfo[]; globalVars: string[] }> {
    const ast = await this.clangParser.parseFile(filePath);
    if (!ast) {
      throw new Error(`Failed to parse ${filePath} with clang. Please ensure clang is properly installed and the file is valid C++ code.`);
    }

    return this.extractFunctionsFromAST(ast, filePath);
  }

  /**
   * Extract functions from CFG-based AST structure
   */
  private extractFunctionsFromAST(ast: ASTNode, filePath: string): { functions: FunctionInfo[]; globalVars: string[] } {
    const functions: FunctionInfo[] = [];
    const globalVars: string[] = [];

    console.log(`Extracting functions from CFG-based AST for ${filePath}`);

    // Traverse CFG structure to find functions
    // In clang CFG output, functions are stored as keys in the functions object
    for (const funcName in ast.inner || {}) {
      const funcNode = (ast.inner as any)[funcName];
      if (funcNode && funcNode.kind === 'FunctionDecl') {
        console.log(`Found function: ${funcName}`);

        // Extract CFG blocks from the function
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
      return null;
    }

    let compoundStmt: ASTNode | null = null;

    if (Array.isArray(funcNode.inner)) {
      // Handle array format
      if (funcNode.inner.length === 0) {
        return null;
      }
      compoundStmt = funcNode.inner.find(child => child.kind === 'CompoundStmt') || null;
    } else {
      // Handle object format - look for CFGBlock nodes directly
      // In CFG format, function nodes may contain CFGBlock nodes directly
      const cfgBlocks = Object.values(funcNode.inner).filter(node => node.kind === 'CFGBlock');
      if (cfgBlocks.length > 0) {
        compoundStmt = {
          kind: 'CompoundStmt',
          inner: cfgBlocks
        };
      }
    }

    if (!compoundStmt || !compoundStmt.inner) {
      return null;
    }

    const blocks = new Map<string, BasicBlock>();

    // Process each CFG block
    const innerNodes = Array.isArray(compoundStmt.inner) ? compoundStmt.inner : Object.values(compoundStmt.inner);
    for (const blockNode of innerNodes) {
      if (blockNode.kind === 'CFGBlock') {
        const block: BasicBlock = {
          id: blockNode.id || `block_${Math.random()}`,
          label: blockNode.label || 'Unknown',
          statements: blockNode.statements || [],
          successors: blockNode.successors || [],
          predecessors: blockNode.predecessors || []
        };

        blocks.set(block.id, block);
      }
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

export interface FunctionInfo {
  name: string;
  range: Range;
  cfg: FunctionCFG;
  astNode?: ASTNode;
}
