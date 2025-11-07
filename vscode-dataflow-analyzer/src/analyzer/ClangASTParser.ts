/**
 * Alternative libclang integration using clang command-line tool
 * More reliable than FFI bindings for VSCode extensions
 */

import * as child_process from 'child_process';
import * as util from 'util';
import * as path from 'path';

export interface SourceLocation {
  file: string;
  line: number;
  column: number;
  offset: number;
}

export enum CXCursorKind {
  FUNCTION_DECL = 8,
  CXX_METHOD = 21,
  VAR_DECL = 9,
  PARM_DECL = 10,
  FIELD_DECL = 6,
  COMPOUND_STMT = 203,
  IF_STMT = 205,
  WHILE_STMT = 209,
  FOR_STMT = 210,
  DO_STMT = 211,
  SWITCH_STMT = 206,
  CASE_STMT = 207,
  DEFAULT_STMT = 208,
  RETURN_STMT = 215,
  BREAK_STMT = 214,
  CONTINUE_STMT = 213,
  GOTO_STMT = 211,
  LABEL_STMT = 204,
  DECL_STMT = 201,
  BINARY_OPERATOR = 114,
  UNARY_OPERATOR = 112,
  CALL_EXPR = 103,
  DECL_REF_EXPR = 101,
  MEMBER_REF_EXPR = 102,
  ARRAY_SUBSCRIPT_EXPR = 113,
  CONDITIONAL_OPERATOR = 116,
  INTEGER_LITERAL = 106,
  FLOATING_LITERAL = 107,
  STRING_LITERAL = 109,
  CHARACTER_LITERAL = 110,
  CLASS_DECL = 4,
  STRUCT_DECL = 2,
  UNION_DECL = 3,
  ENUM_DECL = 5,
  TYPEDEF_DECL = 20,
  NAMESPACE = 22,
  TRANSLATION_UNIT = 300,
  UNEXPOSED_DECL = 1
}

export interface ASTNode {
  kind: CXCursorKind;
  kindName: string;
  spelling: string;
  location: SourceLocation;
  extent: { start: SourceLocation; end: SourceLocation };
  children: ASTNode[];
  isDefinition: boolean;
  type?: string;
  storageClass?: string;
}

const exec = util.promisify(child_process.exec);

export interface ClangASTNode {
  kind: string;
  name?: string;
  value?: string;
  loc?: {
    file: string;
    line: number;
    col: number;
    offset: number;
  };
  range?: {
    begin: { line: number; col: number; offset: number };
    end: { line: number; col: number; offset: number };
  };
  inner?: ClangASTNode[];
  type?: string;
  storageClass?: string;
  isDefinition?: boolean;
}

export class ClangASTParser {
  private clangPath: string | null = null;

  constructor() {
    this.clangPath = this.findClang();
  }

  /**
   * Find clang executable
   */
  private findClang(): string | null {
    const possiblePaths = [
      'clang',
      'clang++',
      '/usr/bin/clang',
      '/usr/bin/clang++',
      '/usr/local/bin/clang',
      '/usr/local/bin/clang++',
      '/opt/homebrew/bin/clang',
      '/opt/homebrew/bin/clang++'
    ];

    // Try to find clang in PATH
    for (const clang of possiblePaths) {
      try {
        child_process.execSync(`which ${clang}`, { stdio: 'ignore' });
        return clang;
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Check if clang is available
   */
  isAvailable(): boolean {
    return this.clangPath !== null;
  }

  /**
   * Parse file using clang AST dump
   */
  async parseFile(filePath: string, args: string[] = []): Promise<ASTNode | null> {
    if (!this.clangPath) {
      return null;
    }

    try {
      // Use clang -Xclang -ast-dump=json to get JSON AST
      const clangArgs = [
        '-Xclang',
        '-ast-dump=json',
        '-fsyntax-only',
        ...args,
        filePath
      ];

      const { stdout, stderr } = await exec(`${this.clangPath} ${clangArgs.join(' ')}`, {
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });

      if (stderr && !stderr.includes('warning')) {
        console.warn('Clang warnings:', stderr);
      }

      // Parse JSON AST
      const astJson = this.extractJSONFromOutput(stdout);
      if (!astJson) {
        return null;
      }

      const clangAST = JSON.parse(astJson) as ClangASTNode;
      return this.convertClangASTToASTNode(clangAST, filePath);
    } catch (error: any) {
      console.error('Error parsing with clang:', error.message);
      return null;
    }
  }

  /**
   * Extract JSON from clang AST dump output
   */
  private extractJSONFromOutput(output: string): string | null {
    // Clang AST dump JSON starts after initial text
    const jsonStart = output.indexOf('{');
    if (jsonStart === -1) {
      return null;
    }

    // Find matching closing brace
    let braceCount = 0;
    let jsonEnd = jsonStart;
    for (let i = jsonStart; i < output.length; i++) {
      if (output[i] === '{') braceCount++;
      if (output[i] === '}') braceCount--;
      if (braceCount === 0) {
        jsonEnd = i + 1;
        break;
      }
    }

    return output.substring(jsonStart, jsonEnd);
  }

  /**
   * Convert clang AST JSON to our ASTNode format
   */
  private convertClangASTToASTNode(node: ClangASTNode, filePath: string): ASTNode {
    const kind = this.mapClangKindToCursorKind(node.kind);
    const location: SourceLocation = node.loc ? {
      file: node.loc.file || filePath,
      line: node.loc.line || 0,
      column: node.loc.col || 0,
      offset: node.loc.offset || 0
    } : {
      file: filePath,
      line: 0,
      column: 0,
      offset: 0
    };

    const extent = node.range ? {
      start: {
        file: filePath,
        line: node.range.begin.line || 0,
        column: node.range.begin.col || 0,
        offset: node.range.begin.offset || 0
      },
      end: {
        file: filePath,
        line: node.range.end.line || 0,
        column: node.range.end.col || 0,
        offset: node.range.end.offset || 0
      }
    } : {
      start: location,
      end: location
    };

    const children: ASTNode[] = [];
    if (node.inner) {
      for (const child of node.inner) {
        children.push(this.convertClangASTToASTNode(child, filePath));
      }
    }

    return {
      kind,
      kindName: node.kind,
      spelling: node.name || node.value || '',
      location,
      extent,
      children,
      isDefinition: node.isDefinition || false,
      type: node.type,
      storageClass: node.storageClass
    };
  }

  /**
   * Map clang AST kind to CXCursorKind enum
   */
  private mapClangKindToCursorKind(kind: string): CXCursorKind {
    const kindMap: { [key: string]: CXCursorKind } = {
      'FunctionDecl': CXCursorKind.FUNCTION_DECL,
      'CXXMethodDecl': CXCursorKind.CXX_METHOD,
      'VarDecl': CXCursorKind.VAR_DECL,
      'ParmVarDecl': CXCursorKind.PARM_DECL,
      'FieldDecl': CXCursorKind.FIELD_DECL,
      'CompoundStmt': CXCursorKind.COMPOUND_STMT,
      'IfStmt': CXCursorKind.IF_STMT,
      'WhileStmt': CXCursorKind.WHILE_STMT,
      'ForStmt': CXCursorKind.FOR_STMT,
      'SwitchStmt': CXCursorKind.SWITCH_STMT,
      'CaseStmt': CXCursorKind.CASE_STMT,
      'DefaultStmt': CXCursorKind.DEFAULT_STMT,
      'ReturnStmt': CXCursorKind.RETURN_STMT,
      'BreakStmt': CXCursorKind.BREAK_STMT,
      'ContinueStmt': CXCursorKind.CONTINUE_STMT,
      'GotoStmt': CXCursorKind.GOTO_STMT,
      'LabelStmt': CXCursorKind.LABEL_STMT,
      'DeclStmt': CXCursorKind.DECL_STMT,
      'BinaryOperator': CXCursorKind.BINARY_OPERATOR,
      'UnaryOperator': CXCursorKind.UNARY_OPERATOR,
      'CallExpr': CXCursorKind.CALL_EXPR,
      'DeclRefExpr': CXCursorKind.DECL_REF_EXPR,
      'MemberExpr': CXCursorKind.MEMBER_REF_EXPR,
      'ArraySubscriptExpr': CXCursorKind.ARRAY_SUBSCRIPT_EXPR,
      'ConditionalOperator': CXCursorKind.CONDITIONAL_OPERATOR,
      'IntegerLiteral': CXCursorKind.INTEGER_LITERAL,
      'FloatingLiteral': CXCursorKind.FLOATING_LITERAL,
      'StringLiteral': CXCursorKind.STRING_LITERAL,
      'CharacterLiteral': CXCursorKind.CHARACTER_LITERAL,
      'CXXRecordDecl': CXCursorKind.CLASS_DECL,
      'StructDecl': CXCursorKind.STRUCT_DECL,
      'UnionDecl': CXCursorKind.UNION_DECL,
      'EnumDecl': CXCursorKind.ENUM_DECL,
      'TypedefDecl': CXCursorKind.TYPEDEF_DECL,
      'NamespaceDecl': CXCursorKind.NAMESPACE,
      'TranslationUnitDecl': CXCursorKind.TRANSLATION_UNIT
    };

    return kindMap[kind] || CXCursorKind.UNEXPOSED_DECL;
  }
}

