/**
 * Return Value Analyzer - Phase 4 of IPA Framework
 * 
 * Analyzes how return values flow back to callers in inter-procedural analysis.
 * 
 * This module tracks:
 * 1. Variable returns: return x;
 * 2. Expression returns: return x + 1;
 * 3. Call returns: return foo();
 * 4. Conditional returns: return (condition) ? a : b;
 * 5. Multiple return paths: different returns in different blocks
 * 
 * Academic Foundation:
 * - "Interprocedural Constant Propagation" (Callahan et al., 1986)
 * - "Flow-Sensitive Dataflow Analysis" (Reps, Horwitz, Sagiv, 1995)
 * - Chapter 9: Inter-Procedural Analysis, "Engineering a Compiler"
 * 
 * Example:
 *   int compute(int x) {
 *     if (x > 0) return x * 2;  // Expression return
 *     return 0;                  // Constant return
 *   }
 *   void main() {
 *     int result = compute(5);   // Return value tracked
 *   }
 */

import { FunctionCFG, Statement } from '../types';

/**
 * Types of return value patterns.
 */
export enum ReturnValueType {
  /** Variable return: return x; */
  VARIABLE = 'variable',
  
  /** Expression return: return x + 1; */
  EXPRESSION = 'expression',
  
  /** Function call return: return foo(); */
  CALL = 'call',
  
  /** Constant return: return 5; */
  CONSTANT = 'constant',
  
  /** Conditional return: return (cond) ? a : b; */
  CONDITIONAL = 'conditional',
  
  /** Void return: return; (no value) */
  VOID = 'void'
}

/**
 * Analysis result for a return statement.
 */
export interface ReturnValueInfo {
  /** Return value expression */
  value: string;
  
  /** Block ID where return occurs */
  blockId: string;
  
  /** Statement ID of return statement */
  statementId?: string;
  
  /** Type of return pattern */
  type: ReturnValueType;
  
  /** Variables used in return expression */
  usedVariables: string[];
  
  /** Inferred return type */
  inferredType: string;
  
  /** Line number of return statement */
  line?: number;
}

/**
 * Return value analyzer for inter-procedural analysis.
 * 
 * Extracts and analyzes all return statements in a function.
 */
export class ReturnValueAnalyzer {
  /**
   * Extract all return statements from a function CFG.
   * 
   * Finds all return statements and analyzes their patterns.
   * 
   * @param funcCFG - Function control flow graph
   * @returns Array of return value information
   */
  analyzeReturns(funcCFG: FunctionCFG): ReturnValueInfo[] {
    const returns: ReturnValueInfo[] = [];

    // STEP 1: Find all blocks that have return statements
    for (const [blockId, block] of funcCFG.blocks.entries()) {
      for (const stmt of block.statements) {
        const stmtText = stmt.content || stmt.text;
        
        if (stmtText.includes('return')) {
          // STEP 2: Extract return value
          const returnInfo = this.extractReturnValue(stmt, blockId);
          
          if (returnInfo) {
            returns.push(returnInfo);
            console.log(
              `[RA] Return: ${returnInfo.value} ` +
              `(${returnInfo.type}) from block ${blockId}`
            );
          }
        }
      }
    }

    return returns;
  }

  /**
   * Extract return value from a return statement.
   * 
   * Analyzes the pattern and extracts relevant information.
   * 
   * @param stmt - Statement containing return
   * @param blockId - Block ID where return occurs
   * @returns Return value information or null if void return
   */
  private extractReturnValue(
    stmt: Statement,
    blockId: string
  ): ReturnValueInfo | null {
    const stmtText = stmt.content || stmt.text;
    
    // Pattern: return expression;
    const returnMatch = stmtText.match(/return\s+(.+?);?$/);
    
    if (!returnMatch) {
      // Void return: just "return;"
      return {
        value: '',
        blockId,
        statementId: stmt.id,
        type: ReturnValueType.VOID,
        usedVariables: [],
        inferredType: 'void',
        line: stmt.range?.start.line
      };
    }

    const returnValue = returnMatch[1].trim();
    const usedVars: string[] = [];
    
    // STEP 1: Check for function call
    if (returnValue.includes('(') && returnValue.includes(')')) {
      const callMatch = returnValue.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/);
      if (callMatch) {
        const funcName = callMatch[1];
        const args = callMatch[2];
        
        // Extract variables from arguments
        this.extractVariables(args, usedVars);
        
        return {
          value: returnValue,
          blockId,
          statementId: stmt.id,
          type: ReturnValueType.CALL,
          usedVariables: usedVars,
          inferredType: this.inferReturnType(returnValue),
          line: stmt.range?.start.line
        };
      }
    }

    // STEP 2: Check for conditional expression (ternary operator)
    if (returnValue.includes('?') && returnValue.includes(':')) {
      const parts = returnValue.split('?');
      if (parts.length === 2) {
        const condition = parts[0].trim();
        const branches = parts[1].split(':');
        if (branches.length === 2) {
          this.extractVariables(condition, usedVars);
          this.extractVariables(branches[0], usedVars);
          this.extractVariables(branches[1], usedVars);
          
          return {
            value: returnValue,
            blockId,
            statementId: stmt.id,
            type: ReturnValueType.CONDITIONAL,
            usedVariables: usedVars,
            inferredType: this.inferReturnType(returnValue),
            line: stmt.range?.start.line
          };
        }
      }
    }

    // STEP 3: Check for arithmetic/expression
    if (returnValue.match(/[\+\-\*\/\%\<\>\=\!\&\|]/)) {
      this.extractVariables(returnValue, usedVars);
      
      return {
        value: returnValue,
        blockId,
        statementId: stmt.id,
        type: ReturnValueType.EXPRESSION,
        usedVariables: usedVars,
        inferredType: this.inferReturnType(returnValue),
        line: stmt.range?.start.line
      };
    }

    // STEP 4: Check for constant
    if (returnValue.match(/^\d+$/) || returnValue.match(/^\d+\.\d+$/) ||
        returnValue === 'true' || returnValue === 'false' ||
        returnValue === 'nullptr' || returnValue === 'NULL') {
      return {
        value: returnValue,
        blockId,
        statementId: stmt.id,
        type: ReturnValueType.CONSTANT,
        usedVariables: [],
        inferredType: this.inferReturnType(returnValue),
        line: stmt.range?.start.line
      };
    }

    // STEP 5: Variable return (simple variable name)
    const varMatch = returnValue.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*$/);
    if (varMatch) {
      usedVars.push(varMatch[1]);
      
      return {
        value: returnValue,
        blockId,
        statementId: stmt.id,
        type: ReturnValueType.VARIABLE,
        usedVariables: usedVars,
        inferredType: this.inferReturnType(returnValue),
        line: stmt.range?.start.line
      };
    }

    // Fallback: treat as expression
    this.extractVariables(returnValue, usedVars);
    return {
      value: returnValue,
      blockId,
      statementId: stmt.id,
      type: ReturnValueType.EXPRESSION,
      usedVariables: usedVars,
      inferredType: this.inferReturnType(returnValue),
      line: stmt.range?.start.line
    };
  }

  /**
   * Infer return type from return value expression.
   * 
   * Uses heuristics to determine the type of the return value.
   * 
   * @param returnValue - Return value expression
   * @returns Inferred type string
   */
  private inferReturnType(returnValue: string): string {
    if (!returnValue || returnValue.trim() === '') {
      return 'void';
    }

    const trimmed = returnValue.trim();

    // Integer literal
    if (trimmed.match(/^\d+$/)) {
      return 'int';
    }

    // Floating point literal
    if (trimmed.match(/^\d+\.\d+/)) {
      return 'double';
    }

    // Boolean literal
    if (trimmed === 'true' || trimmed === 'false') {
      return 'bool';
    }

    // Null pointer
    if (trimmed === 'nullptr' || trimmed === 'NULL') {
      return 'void*';
    }

    // String literal
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      return 'const char*';
    }

    // Character literal
    if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
      return 'char';
    }

    // Function call - infer from call
    if (trimmed.includes('(') && trimmed.includes(')')) {
      return 'auto'; // Would need call graph to infer
    }

    // Default: let compiler deduce
    return 'auto';
  }

  /**
   * Extract variable names from an expression.
   * 
   * @param expr - Expression string
   * @param vars - Array to populate with variable names
   */
  private extractVariables(expr: string, vars: string[]): void {
    const keywords = new Set([
      'int', 'float', 'double', 'char', 'bool', 'void', 'return',
      'if', 'else', 'while', 'for', 'do', 'switch', 'case', 'default',
      'const', 'static', 'extern', 'auto', 'register', 'inline',
      'true', 'false', 'nullptr', 'NULL'
    ]);

    const varMatches = expr.matchAll(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g);
    for (const match of varMatches) {
      const varName = match[1];
      if (!keywords.has(varName) && !vars.includes(varName)) {
        vars.push(varName);
      }
    }
  }

  /**
   * Propagate return values to call sites.
   * 
   * Creates reaching definitions for return value variables in callers.
   * 
   * @param returnValues - Array of return value information
   * @param callSiteBlockId - Block ID where call occurs
   * @param returnValueVariable - Variable in caller that receives return value
   * @returns Array of variable names that affect the return value
   */
  propagateReturnValue(
    returnValues: ReturnValueInfo[],
    callSiteBlockId: string,
    returnValueVariable: string
  ): string[] {
    const affectingVars = new Set<string>();

    // Collect all variables that affect any return path
    for (const ret of returnValues) {
      ret.usedVariables.forEach(v => affectingVars.add(v));
    }

    console.log(
      `[RA] Propagate return: ${returnValueVariable} ` +
      `affected by [${Array.from(affectingVars).join(', ')}]`
    );

    return Array.from(affectingVars);
  }

  /**
   * Check if function has multiple return paths.
   * 
   * Useful for determining if return value analysis needs to merge multiple paths.
   * 
   * @param returnValues - Array of return value information
   * @returns true if function has multiple return statements
   */
  hasMultipleReturnPaths(returnValues: ReturnValueInfo[]): boolean {
    return returnValues.length > 1;
  }

  /**
   * Check if function has conditional returns.
   * 
   * Useful for tracking conditional return patterns.
   * 
   * @param returnValues - Array of return value information
   * @returns true if any return is conditional
   */
  hasConditionalReturns(returnValues: ReturnValueInfo[]): boolean {
    return returnValues.some(ret => ret.type === ReturnValueType.CONDITIONAL);
  }
}
