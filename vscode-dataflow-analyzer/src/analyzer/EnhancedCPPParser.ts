/**
 * Enhanced C++ parser using libclang/clang AST
 * Falls back to primitive parser if clang is not available
 */

import * as fs from 'fs';
import { Statement, StatementType, BasicBlock, CFG, FunctionCFG, Position, Range } from '../types';
import { ClangASTParser } from './ClangASTParser';
import { ASTNode, CXCursorKind } from './ClangASTParser';

export class EnhancedCPPParser {
  private clangParser: ClangASTParser;

  constructor() {
    this.clangParser = new ClangASTParser();
    
    if (this.clangParser.isAvailable()) {
      console.log('Using clang command-line tool for parsing');
    } else {
      console.warn('Clang not found. Falling back to primitive parser.');
    }
  }

  /**
   * Parse a C++ file and extract functions
   */
  async parseFile(filePath: string): Promise<{ functions: FunctionInfo[]; globalVars: string[] }> {
    if (this.clangParser.isAvailable()) {
      return this.parseWithClangAST(filePath);
    } else {
      return this.parsePrimitive(filePath);
    }
  }

  /**
   * Parse using clang AST dump
   */
  private async parseWithClangAST(filePath: string): Promise<{ functions: FunctionInfo[]; globalVars: string[] }> {
    try {
      const ast = await this.clangParser.parseFile(filePath);
      if (!ast) {
        return this.parsePrimitive(filePath);
      }

      return this.extractFunctionsFromAST(ast, filePath);
    } catch (error) {
      console.error('Error parsing with clang AST:', error);
      return this.parsePrimitive(filePath);
    }
  }

  /**
   * Extract functions from AST
   */
  private extractFunctionsFromAST(ast: ASTNode, filePath: string): { functions: FunctionInfo[]; globalVars: string[] } {
    const functions: FunctionInfo[] = [];
    const globalVars: string[] = [];

    // Traverse AST to find function declarations
    this.traverseAST(ast, (node) => {
      if (node.kind === CXCursorKind.FUNCTION_DECL || 
          node.kind === CXCursorKind.CXX_METHOD) {
        if (node.isDefinition) {
          const funcInfo = this.buildFunctionInfoFromAST(node, filePath);
          if (funcInfo) {
            functions.push(funcInfo);
          }
        }
      } else if (node.kind === CXCursorKind.VAR_DECL && 
                 node.storageClass !== 'static') {
        // Global variable
        if (node.spelling) {
          globalVars.push(node.spelling);
        }
      }
    });

    return { functions, globalVars };
  }

  /**
   * Build function info from AST node
   */
  private buildFunctionInfoFromAST(node: ASTNode, filePath: string): FunctionInfo | null {
    if (!node.spelling) {
      return null;
    }

    const parameters: string[] = [];
    const body: Array<{ line: number; content: string }> = [];

    // Extract parameters
    for (const child of node.children) {
      if (child.kind === CXCursorKind.PARM_DECL) {
        parameters.push(child.spelling || '');
      }
    }

    // Extract function body statements
    const compoundStmt = node.children.find(c => 
      c.kind === CXCursorKind.COMPOUND_STMT
    );

    if (compoundStmt) {
      this.extractStatementsFromAST(compoundStmt, body, filePath);
    }

    return {
      name: node.spelling,
      startLine: node.location.line,
      endLine: node.extent.end.line,
      parameters,
      body,
      astNode: node
    };
  }

  /**
   * Extract statements from AST compound statement
   */
  private extractStatementsFromAST(
    node: ASTNode, 
    statements: Array<{ line: number; content: string }>,
    filePath: string
  ): void {
    for (const child of node.children) {
      const stmtType = this.getStatementType(child.kind);
      if (stmtType !== null) {
        // Read original source code for this statement
        const content = this.getSourceCodeForNode(child, filePath);
        statements.push({
          line: child.location.line,
          content: content || child.kindName
        });
      }

      // Recursively process nested statements
      if (this.isStatementContainer(child.kind)) {
        this.extractStatementsFromAST(child, statements, filePath);
      }
    }
  }

  /**
   * Get statement type from cursor kind
   */
  private getStatementType(kind: CXCursorKind): StatementType | null {
    switch (kind) {
      case CXCursorKind.DECL_STMT:
        return StatementType.DECLARATION;
      case CXCursorKind.IF_STMT:
        return StatementType.CONDITIONAL;
      case CXCursorKind.WHILE_STMT:
      case CXCursorKind.FOR_STMT:
      case CXCursorKind.DO_STMT:
        return StatementType.LOOP;
      case CXCursorKind.RETURN_STMT:
        return StatementType.RETURN;
      case CXCursorKind.CALL_EXPR:
        return StatementType.FUNCTION_CALL;
      case CXCursorKind.BINARY_OPERATOR:
        return StatementType.ASSIGNMENT;
      default:
        return null;
    }
  }

  /**
   * Check if node is a statement container
   */
  private isStatementContainer(kind: CXCursorKind): boolean {
    return kind === CXCursorKind.COMPOUND_STMT ||
           kind === CXCursorKind.IF_STMT ||
           kind === CXCursorKind.WHILE_STMT ||
           kind === CXCursorKind.FOR_STMT ||
           kind === CXCursorKind.SWITCH_STMT;
  }

  /**
   * Get source code for AST node
   */
  private getSourceCodeForNode(node: ASTNode, filePath: string): string {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      if (node.extent.start.line > 0 && node.extent.end.line > 0) {
        const startLine = Math.max(0, node.extent.start.line - 1);
        const endLine = Math.min(lines.length, node.extent.end.line);
        
        if (startLine === endLine - 1) {
          // Single line
          const line = lines[startLine];
          const startCol = Math.max(0, node.extent.start.column - 1);
          const endCol = Math.min(line.length, node.extent.end.column);
          return line.substring(startCol, endCol).trim();
        } else {
          // Multi-line - return first line
          return lines[startLine].trim();
        }
      }
    } catch (error) {
      console.error('Error reading source code:', error);
    }
    
    return '';
  }

  /**
   * Traverse AST tree
   */
  private traverseAST(node: ASTNode, visitor: (node: ASTNode) => void): void {
    visitor(node);
    for (const child of node.children) {
      this.traverseAST(child, visitor);
    }
  }

  /**
   * Build CFG from parsed function using AST
   */
  buildCFGForFunction(functionInfo: FunctionInfo, functionName: string): FunctionCFG {
    const blocks = new Map<string, BasicBlock>();

    // Create entry block
    const entryBlockId = `entry_${functionName}`;
    const entryBlock: BasicBlock = {
      id: entryBlockId,
      label: `Entry (${functionName})`,
      statements: [],
      predecessors: [],
      successors: []
    };
    blocks.set(entryBlockId, entryBlock);

    // Build CFG from AST if available
    if (functionInfo.astNode) {
      return this.buildCFGFromAST(functionInfo.astNode, functionName, blocks);
    }

    // Fallback to primitive CFG building
    return this.buildCFGFromStatements(functionInfo, functionName, blocks);
  }

  /**
   * Build CFG from AST node
   */
  private buildCFGFromAST(
    funcNode: ASTNode,
    functionName: string,
    blocks: Map<string, BasicBlock>
  ): FunctionCFG {
    let blockIdCounter = 0;
    let statementIdCounter = 0;
    let currentBlockId = `entry_${functionName}`;

    const compoundStmt = funcNode.children.find(c => 
      c.kind === CXCursorKind.COMPOUND_STMT
    );

    if (compoundStmt) {
      const result = this.buildBlocksFromAST(compoundStmt, blocks, currentBlockId, blockIdCounter, statementIdCounter);
      blockIdCounter = result.blockIdCounter;
      statementIdCounter = result.statementIdCounter;
      currentBlockId = result.blockId;
    }

    // Create exit block
    const exitBlockId = `exit_${functionName}`;
    const exitBlock: BasicBlock = {
      id: exitBlockId,
      label: `Exit (${functionName})`,
      statements: [],
      predecessors: [currentBlockId],
      successors: []
    };
    blocks.get(currentBlockId)!.successors.push(exitBlockId);
    blocks.set(exitBlockId, exitBlock);

    return {
      name: functionName,
      entry: `entry_${functionName}`,
      exit: exitBlockId,
      blocks,
      parameters: this.extractParametersFromAST(funcNode)
    };
  }

  /**
   * Build blocks from AST recursively
   */
  private buildBlocksFromAST(
    node: ASTNode,
    blocks: Map<string, BasicBlock>,
    currentBlockId: string,
    blockIdCounter: number,
    statementIdCounter: number
  ): { blockId: string; blockIdCounter: number; statementIdCounter: number } {
    for (const child of node.children) {
      const stmtType = this.getStatementType(child.kind);
      
      if (stmtType === StatementType.CONDITIONAL || stmtType === StatementType.LOOP) {
        // Create new block for control flow
        const newBlockId = `block_${blockIdCounter++}`;
        const statement = this.createStatementFromAST(child, statementIdCounter++);
        
        const newBlock: BasicBlock = {
          id: newBlockId,
          label: child.kindName,
          statements: [statement],
          predecessors: [currentBlockId],
          successors: []
        };
        
        blocks.get(currentBlockId)!.successors.push(newBlockId);
        blocks.set(newBlockId, newBlock);
        
        // Process then/else branches
        if (child.kind === CXCursorKind.IF_STMT) {
          const thenBlock = child.children.find(c => 
            c.kind === CXCursorKind.COMPOUND_STMT || 
            this.isStatementContainer(c.kind)
          );
          if (thenBlock) {
            const result = this.buildBlocksFromAST(
              thenBlock, blocks, newBlockId, blockIdCounter, statementIdCounter
            );
            blockIdCounter = result.blockIdCounter;
            statementIdCounter = result.statementIdCounter;
          }
        }
        
        currentBlockId = newBlockId;
      } else if (stmtType !== null) {
        // Add statement to current block
        const statement = this.createStatementFromAST(child, statementIdCounter++);
        blocks.get(currentBlockId)!.statements.push(statement);
      } else if (this.isStatementContainer(child.kind)) {
        // Recursively process nested statements
        const result = this.buildBlocksFromAST(
          child, blocks, currentBlockId, blockIdCounter, statementIdCounter
        );
        blockIdCounter = result.blockIdCounter;
        statementIdCounter = result.statementIdCounter;
        currentBlockId = result.blockId;
      }
    }

    return { blockId: currentBlockId, blockIdCounter, statementIdCounter };
  }

  /**
   * Create statement from AST node
   */
  private createStatementFromAST(node: ASTNode, id: number): Statement {
    const stmtType = this.getStatementType(node.kind) || StatementType.OTHER;
    const range: Range = {
      start: {
        line: node.extent.start.line,
        column: node.extent.start.column
      },
      end: {
        line: node.extent.end.line,
        column: node.extent.end.column
      }
    };

    const variables = this.extractVariablesFromAST(node);

    return {
      id: `stmt_${id}`,
      type: stmtType,
      text: node.spelling || node.kindName,
      range,
      variables
    };
  }

  /**
   * Extract variables from AST node
   */
  private extractVariablesFromAST(node: ASTNode): { defined: string[]; used: string[] } {
    const defined: string[] = [];
    const used: string[] = [];

    this.traverseAST(node, (n) => {
      if (n.kind === CXCursorKind.VAR_DECL || n.kind === CXCursorKind.PARM_DECL) {
        if (n.spelling) {
          defined.push(n.spelling);
        }
      } else if (n.kind === CXCursorKind.DECL_REF_EXPR || 
                 n.kind === CXCursorKind.MEMBER_REF_EXPR) {
        if (n.spelling && !defined.includes(n.spelling)) {
          used.push(n.spelling);
        }
      }
    });

    return { defined, used };
  }

  /**
   * Extract parameters from function AST
   */
  private extractParametersFromAST(funcNode: ASTNode): string[] {
    const parameters: string[] = [];
    for (const child of funcNode.children) {
      if (child.kind === CXCursorKind.PARM_DECL && child.spelling) {
        parameters.push(child.spelling);
      }
    }
    return parameters;
  }

  /**
   * Build CFG from statements (fallback)
   */
  private buildCFGFromStatements(
    functionInfo: FunctionInfo,
    functionName: string,
    blocks: Map<string, BasicBlock>
  ): FunctionCFG {
    // Similar to original implementation but using functionInfo.body
    const entryBlockId = `entry_${functionName}`;
    let currentBlockId = entryBlockId;
    let blockIdCounter = 0;
    let statementIdCounter = 0;

    for (const bodyLine of functionInfo.body) {
      const content = bodyLine.content.trim();
      if (content.length === 0) continue;

      const stmtType = this.inferStatementType(content);
      
      if (stmtType === StatementType.CONDITIONAL || stmtType === StatementType.LOOP) {
        const newBlockId = `block_${blockIdCounter++}`;
        const statement = this.createStatementFromText(content, bodyLine.line, statementIdCounter++);
        
        const newBlock: BasicBlock = {
          id: newBlockId,
          label: content.substring(0, 30) + '...',
          statements: [statement],
          predecessors: [currentBlockId],
          successors: []
        };
        
        blocks.get(currentBlockId)!.successors.push(newBlockId);
        blocks.set(newBlockId, newBlock);
        currentBlockId = newBlockId;
      } else {
        const statement = this.createStatementFromText(content, bodyLine.line, statementIdCounter++);
        blocks.get(currentBlockId)!.statements.push(statement);
      }
    }

    const exitBlockId = `exit_${functionName}`;
    const exitBlock: BasicBlock = {
      id: exitBlockId,
      label: `Exit (${functionName})`,
      statements: [],
      predecessors: [currentBlockId],
      successors: []
    };
    blocks.get(currentBlockId)!.successors.push(exitBlockId);
    blocks.set(exitBlockId, exitBlock);

    return {
      name: functionName,
      entry: entryBlockId,
      exit: exitBlockId,
      blocks,
      parameters: functionInfo.parameters
    };
  }

  /**
   * Infer statement type from text (fallback)
   */
  private inferStatementType(content: string): StatementType {
    if (content.includes('=') && !content.includes('==')) {
      return StatementType.ASSIGNMENT;
    } else if (content.startsWith('if') || content.startsWith('else')) {
      return StatementType.CONDITIONAL;
    } else if (content.startsWith('while') || content.startsWith('for')) {
      return StatementType.LOOP;
    } else if (content.startsWith('return')) {
      return StatementType.RETURN;
    } else if (/^\s*(int|float|double|char|void)\s+\w+/.test(content)) {
      return StatementType.DECLARATION;
    } else if (content.includes('(') && content.includes(')')) {
      return StatementType.FUNCTION_CALL;
    }
    return StatementType.OTHER;
  }

  /**
   * Create statement from text (fallback)
   */
  private createStatementFromText(content: string, line: number, id: number): Statement {
    const stmtType = this.inferStatementType(content);
    const range: Range = {
      start: { line, column: 0 },
      end: { line, column: content.length }
    };

    const variables = { defined: [] as string[], used: [] as string[] };
    const varMatches = content.matchAll(/(\w+)/g);
    for (const match of varMatches) {
      const varName = match[1];
      if (!['int', 'float', 'double', 'char', 'void', 'return', 'if', 'else', 'while', 'for'].includes(varName)) {
        if (content.includes('=') && match.index === content.indexOf(varName)) {
          variables.defined.push(varName);
        } else {
          variables.used.push(varName);
        }
      }
    }

    return {
      id: `stmt_${id}`,
      type: stmtType,
      text: content,
      range,
      variables
    };
  }

  /**
   * Primitive parser fallback
   */
  private parsePrimitive(filePath: string): { functions: FunctionInfo[]; globalVars: string[] } {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const functions: FunctionInfo[] = [];
    const globalVars: string[] = [];
    
    let i = 0;
    let braceDepth = 0;
    let inFunction = false;
    let currentFunction: FunctionInfo | null = null;

    while (i < lines.length) {
      const line = lines[i].trim();
      const functionMatch = line.match(/(\w+)\s*\([^)]*\)\s*\{?/);
      
      if (functionMatch && !inFunction && !line.includes(';')) {
        inFunction = true;
        currentFunction = {
          name: functionMatch[1],
          startLine: i,
          endLine: i,
          parameters: this.extractParameters(line),
          body: []
        };
        if (line.includes('{')) braceDepth = 1;
      } else if (inFunction && currentFunction) {
        for (const char of line) {
          if (char === '{') braceDepth++;
          if (char === '}') braceDepth--;
        }
        currentFunction.body.push({ line: i, content: line });
        if (braceDepth === 0) {
          currentFunction.endLine = i;
          functions.push(currentFunction);
          inFunction = false;
          currentFunction = null;
        }
      } else {
        const varMatch = line.match(/(\w+)\s+(\w+)\s*[=;]/);
        if (varMatch && !line.includes('(') && !line.includes('{')) {
          globalVars.push(varMatch[2]);
        }
      }
      i++;
    }

    return { functions, globalVars };
  }

  /**
   * Extract parameters from signature
   */
  private extractParameters(signature: string): string[] {
    const paramMatch = signature.match(/\(([^)]*)\)/);
    if (!paramMatch) return [];
    return paramMatch[1]
      .split(',')
      .map(p => p.trim().split(/\s+/).pop() || '')
      .filter(p => p.length > 0);
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    // No resources to dispose for clang command-line approach
  }
}

export interface FunctionInfo {
  name: string;
  startLine: number;
  endLine: number;
  parameters: string[];
  body: Array<{ line: number; content: string }>;
  astNode?: ASTNode;
}

