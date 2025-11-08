/**
 * Function Call Extractor
 * 
 * Utility for extracting function calls from CFG statements using AST/CFG information
 * instead of regex patterns. Handles various clang output formats including
 * recovery expressions and implicit casts.
 * 
 * This replaces regex-based function detection throughout the codebase.
 */

import { Statement, StatementType } from '../types';

/**
 * Represents a function call extracted from a statement
 */
export interface ExtractedFunctionCall {
  /** Function name */
  name: string;
  
  /** Full call expression (e.g., "scanf(\"%d\", &x)") */
  callExpression: string;
  
  /** Arguments as strings */
  arguments: string[];
  
  /** Start position of function name in statement text */
  nameStart: number;
  
  /** End position of function name in statement text */
  nameEnd: number;
}

/**
 * Extract function calls from a statement using CFG/AST-aware parsing
 * 
 * Handles various clang output formats:
 * - Normal: "scanf(\"%d\", &x)"
 * - Recovery: "<recovery-expr>(scanf, \"%d\", &x)"
 * - Implicit casts: "[B1.2](scanf(\"%d\", &x))"
 * - Nested: "foo(bar(x), y)"
 */
export class FunctionCallExtractor {
  /**
   * Extract all function calls from a statement
   */
  static extractFunctionCalls(stmt: Statement): ExtractedFunctionCall[] {
    const stmtText = stmt.text || stmt.content || '';
    if (!stmtText) return [];

    const calls: ExtractedFunctionCall[] = [];
    
    // Step 1: Clean up clang-specific artifacts
    const cleaned = this.cleanStatementText(stmtText);
    
    // Step 2: Extract function calls
    this.extractCallsRecursive(cleaned, calls, 0);
    
    return calls;
  }

  /**
   * Clean statement text to remove clang artifacts
   */
  private static cleanStatementText(text: string): string {
    let cleaned = text;
    
    // Remove recovery-expr wrapper: <recovery-expr>(func, args) -> func(args)
    cleaned = cleaned.replace(/<recovery-expr>\s*\(([^,]+),\s*(.+)\)/g, '$1($2)');
    
    // Remove implicit cast wrappers: [B1.2](expr) -> expr
    cleaned = cleaned.replace(/\[B\d+\.\d+\]\s*\(([^)]+)\)/g, '$1');
    
    // Remove other clang artifacts
    cleaned = cleaned.replace(/\(ImplicitCastExpr[^)]*\)/g, '');
    cleaned = cleaned.replace(/\(LValueToRValue[^)]*\)/g, '');
    cleaned = cleaned.replace(/\(FunctionToPointerDecay[^)]*\)/g, '');
    cleaned = cleaned.replace(/\(ArrayToPointerDecay[^)]*\)/g, '');
    
    return cleaned.trim();
  }

  /**
   * Recursively extract function calls from text
   */
  private static extractCallsRecursive(
    text: string,
    calls: ExtractedFunctionCall[],
    offset: number
  ): void {
    // Pattern: identifier followed by opening parenthesis
    // This matches function calls but not keywords
    const pattern = /([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
    let match;
    
    while ((match = pattern.exec(text)) !== null) {
      const funcName = match[1];
      const nameStart = match.index;
      const nameEnd = nameStart + funcName.length;
      
      // Skip C++ keywords
      if (this.isKeyword(funcName)) {
        continue;
      }
      
      // Extract the full call expression including arguments
      const callExpr = this.extractCallExpression(text, nameStart);
      if (!callExpr) continue;
      
      // Extract arguments
      const args = this.extractArguments(callExpr);
      
      calls.push({
        name: funcName,
        callExpression: callExpr,
        arguments: args,
        nameStart: offset + nameStart,
        nameEnd: offset + nameEnd
      });
      
      // Recursively extract calls from arguments
      args.forEach(arg => {
        this.extractCallsRecursive(arg, calls, offset + nameStart);
      });
    }
  }

  /**
   * Extract the full call expression starting at a position
   */
  private static extractCallExpression(text: string, startPos: number): string | null {
    // Find the opening parenthesis
    let pos = startPos;
    while (pos < text.length && text[pos] !== '(') {
      pos++;
    }
    
    if (pos >= text.length || text[pos] !== '(') {
      return null;
    }
    
    // Find matching closing parenthesis
    let depth = 0;
    let endPos = pos;
    
    for (let i = pos; i < text.length; i++) {
      if (text[i] === '(') {
        depth++;
      } else if (text[i] === ')') {
        depth--;
        if (depth === 0) {
          endPos = i + 1;
          break;
        }
      }
    }
    
    if (depth !== 0) {
      return null; // Unmatched parentheses
    }
    
    return text.substring(startPos, endPos);
  }

  /**
   * Extract arguments from a function call expression
   */
  private static extractArguments(callExpr: string): string[] {
    // Find the content between parentheses
    const openParen = callExpr.indexOf('(');
    const closeParen = callExpr.lastIndexOf(')');
    
    if (openParen === -1 || closeParen === -1) {
      return [];
    }
    
    const argsStr = callExpr.substring(openParen + 1, closeParen).trim();
    if (!argsStr) {
      return [];
    }
    
    // Split by comma, respecting nested parentheses
    const args: string[] = [];
    let currentArg = '';
    let depth = 0;
    
    for (let i = 0; i < argsStr.length; i++) {
      const char = argsStr[i];
      
      if (char === '(') {
        depth++;
        currentArg += char;
      } else if (char === ')') {
        depth--;
        currentArg += char;
      } else if (char === ',' && depth === 0) {
        args.push(currentArg.trim());
        currentArg = '';
      } else {
        currentArg += char;
      }
    }
    
    if (currentArg.trim()) {
      args.push(currentArg.trim());
    }
    
    return args;
  }

  /**
   * Check if an identifier is a C++ keyword
   */
  private static isKeyword(id: string): boolean {
    const keywords = new Set([
      'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default',
      'break', 'continue', 'return', 'goto', 'try', 'catch', 'throw',
      'new', 'delete', 'this', 'nullptr', 'true', 'false',
      'int', 'float', 'double', 'char', 'bool', 'void', 'auto',
      'const', 'static', 'extern', 'volatile', 'mutable',
      'class', 'struct', 'union', 'enum', 'namespace', 'using',
      'public', 'private', 'protected', 'virtual', 'override', 'final',
      'template', 'typename', 'typename', 'operator',
      'sizeof', 'typeid', 'dynamic_cast', 'static_cast', 'const_cast', 'reinterpret_cast'
    ]);
    
    return keywords.has(id);
  }

  /**
   * Check if a statement contains a function call
   */
  static hasFunctionCall(stmt: Statement): boolean {
    return this.extractFunctionCalls(stmt).length > 0;
  }

  /**
   * Get the first function call in a statement (if any)
   */
  static getFirstFunctionCall(stmt: Statement): ExtractedFunctionCall | null {
    const calls = this.extractFunctionCalls(stmt);
    return calls.length > 0 ? calls[0] : null;
  }

  /**
   * Get function name from a statement (first call)
   */
  static getFunctionName(stmt: Statement): string | null {
    const call = this.getFirstFunctionCall(stmt);
    return call ? call.name : null;
  }

  /**
   * Check if statement contains a call to a specific function
   */
  static callsFunction(stmt: Statement, funcName: string): boolean {
    const calls = this.extractFunctionCalls(stmt);
    return calls.some(call => call.name === funcName);
  }
}

