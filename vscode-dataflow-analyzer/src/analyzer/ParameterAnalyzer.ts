/**
 * Parameter Analyzer - Phase 4 of IPA Framework
 * 
 * Sophisticated parameter mapping and analysis for inter-procedural analysis.
 * 
 * This module extends basic parameter mapping (from Phase 3) to handle:
 * 1. Direct parameters: foo(x) -> direct reference
 * 2. Derived expressions: foo(x + 1) -> arithmetic expression
 * 3. Composite access: foo(obj.field) -> member access
 * 4. Address-of: foo(&x) -> pointer parameter
 * 5. Function call results: foo(bar(y)) -> nested call
 * 
 * Academic Foundation:
 * - "Interprocedural Constant Propagation" (Callahan et al., 1986)
 * - "Flow-Sensitive Pointer Analysis" (Reps, Horwitz, Sagiv, 1995)
 * - Chapter 9: Inter-Procedural Analysis, "Engineering a Compiler"
 * 
 * Example:
 *   void process(int x, int* ptr, MyStruct obj) { ... }
 *   void main() {
 *     int a = 5;
 *     process(a, &a, myStruct.field);  // Direct, address-of, composite
 *   }
 */

import { FunctionCall, FunctionMetadata } from './CallGraphAnalyzer';

/**
 * Types of argument derivation patterns.
 */
export enum ArgumentDerivationType {
  /** Direct variable reference: foo(x) */
  DIRECT = 'direct',
  
  /** Arithmetic expression: foo(x + 1) */
  EXPRESSION = 'expression',
  
  /** Structure/object member access: foo(obj.field) */
  COMPOSITE = 'composite',
  
  /** Address-of operator: foo(&x) */
  ADDRESS = 'address',
  
  /** Function call result: foo(bar(y)) */
  CALL = 'call',
  
  /** Array access: foo(arr[i]) */
  ARRAY_ACCESS = 'array_access',
  
  /** Pointer dereference: foo(*ptr) */
  DEREFERENCE = 'dereference'
}

/**
 * Analysis result for how an argument value is derived.
 * 
 * Tracks the base variable and transformations applied to it.
 */
export interface ArgumentDerivation {
  /** Type of derivation pattern */
  type: ArgumentDerivationType;
  
  /** Base variable name (before transformations) */
  base: string;
  
  /** List of transformations applied */
  transformations: string[];
  
  /** Full argument expression */
  expression: string;
  
  /** Variables used in the expression */
  usedVariables: string[];
}

/**
 * Parameter mapping result with derivation analysis.
 */
export interface ParameterMapping {
  /** Formal parameter name */
  formalParam: string;
  
  /** Actual argument expression */
  actualArg: string;
  
  /** How the argument is derived */
  derivation: ArgumentDerivation;
  
  /** Position in parameter list */
  position: number;
}

/**
 * Sophisticated parameter analyzer for inter-procedural analysis.
 * 
 * Extends basic parameter mapping with detailed derivation analysis.
 */
export class ParameterAnalyzer {
  /**
   * Map formal parameters to actual arguments with derivation analysis.
   * 
   * @param call - Function call from call graph
   * @param calleeMetadata - Callee function metadata
   * @returns Array of parameter mappings with derivation analysis
   */
  mapParametersWithDerivation(
    call: FunctionCall,
    calleeMetadata: FunctionMetadata
  ): ParameterMapping[] {
    const mappings: ParameterMapping[] = [];

    // Match parameters by position
    for (let i = 0; i < calleeMetadata.parameters.length && i < call.arguments.actual.length; i++) {
      const formalParam = calleeMetadata.parameters[i];
      const actualArg = call.arguments.actual[i].trim();

      // Analyze how this argument is derived
      const derivation = this.analyzeArgumentDerivation(actualArg);

      mappings.push({
        formalParam: formalParam.name,
        actualArg,
        derivation,
        position: i
      });

      console.log(
        `[PA] Map param: ${formalParam.name} <- ${actualArg} ` +
        `(${derivation.type}, base: ${derivation.base})`
      );
    }

    return mappings;
  }

  /**
   * Analyze how an argument value is derived.
   * 
   * Determines the derivation pattern and extracts:
   * - Base variable(s)
   * - Transformations applied
   * - Variables used in expression
   * 
   * Examples:
   *   "x"           -> direct reference
   *   "x + 1"       -> expression (arithmetic)
   *   "obj.field"   -> composite (member access)
   *   "&x"          -> address-of
   *   "foo(y)"      -> function call result
   *   "arr[i]"      -> array access
   *   "*ptr"        -> pointer dereference
   * 
   * @param arg - Actual argument expression
   * @returns Derivation analysis result
   */
  analyzeArgumentDerivation(arg: string): ArgumentDerivation {
    const trimmed = arg.trim();
    const usedVars: string[] = [];

    // STEP 1: Check for address-of operator
    if (trimmed.startsWith('&')) {
      const base = trimmed.substring(1).trim();
      this.extractVariables(base, usedVars);
      
      return {
        type: ArgumentDerivationType.ADDRESS,
        base,
        transformations: ['&'],
        expression: trimmed,
        usedVariables: usedVars
      };
    }

    // STEP 2: Check for pointer dereference
    if (trimmed.startsWith('*')) {
      const base = trimmed.substring(1).trim();
      this.extractVariables(base, usedVars);
      
      return {
        type: ArgumentDerivationType.DEREFERENCE,
        base,
        transformations: ['*'],
        expression: trimmed,
        usedVariables: usedVars
      };
    }

    // STEP 3: Check for function call (nested call)
    if (trimmed.includes('(') && trimmed.includes(')')) {
      const callMatch = trimmed.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/);
      if (callMatch) {
        const funcName = callMatch[1];
        const args = callMatch[2];
        
        // Extract variables from arguments
        this.extractVariables(args, usedVars);
        
        return {
          type: ArgumentDerivationType.CALL,
          base: funcName,
          transformations: ['call'],
          expression: trimmed,
          usedVariables: usedVars
        };
      }
    }

    // STEP 4: Check for array access
    if (trimmed.includes('[') && trimmed.includes(']')) {
      const arrayMatch = trimmed.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*\[([^\]]+)\]/);
      if (arrayMatch) {
        const arrayName = arrayMatch[1];
        const index = arrayMatch[2];
        
        usedVars.push(arrayName);
        this.extractVariables(index, usedVars);
        
        return {
          type: ArgumentDerivationType.ARRAY_ACCESS,
          base: arrayName,
          transformations: [`[${index}]`],
          expression: trimmed,
          usedVariables: usedVars
        };
      }
    }

    // STEP 5: Check for member access (structure/object)
    if (trimmed.includes('.') || trimmed.includes('->')) {
      const separator = trimmed.includes('.') ? '.' : '->';
      const parts = trimmed.split(separator);
      
      if (parts.length >= 2) {
        const base = parts[0].trim();
        const members = parts.slice(1);
        
        usedVars.push(base);
        
        return {
          type: ArgumentDerivationType.COMPOSITE,
          base,
          transformations: members,
          expression: trimmed,
          usedVariables: usedVars
        };
      }
    }

    // STEP 6: Check for arithmetic/expression
    if (trimmed.match(/[\+\-\*\/\%\<\>\=\!\&\|]/)) {
      // Extract all variables from expression
      this.extractVariables(trimmed, usedVars);
      
      // Find the "primary" variable (first one)
      const primaryMatch = trimmed.match(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/);
      const base = primaryMatch ? primaryMatch[1] : trimmed;
      
      return {
        type: ArgumentDerivationType.EXPRESSION,
        base,
        transformations: ['arithmetic'],
        expression: trimmed,
        usedVariables: usedVars
      };
    }

    // STEP 7: Direct reference (simple variable name)
    const varMatch = trimmed.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*$/);
    if (varMatch) {
      return {
        type: ArgumentDerivationType.DIRECT,
        base: varMatch[1],
        transformations: [],
        expression: trimmed,
        usedVariables: [varMatch[1]]
      };
    }

    // Fallback: treat as expression
    this.extractVariables(trimmed, usedVars);
    return {
      type: ArgumentDerivationType.EXPRESSION,
      base: trimmed,
      transformations: [],
      expression: trimmed,
      usedVariables: usedVars
    };
  }

  /**
   * Extract variable names from an expression.
   * 
   * Finds all identifiers that appear to be variables (not keywords).
   * 
   * @param expr - Expression string
   * @param vars - Array to populate with variable names
   */
  private extractVariables(expr: string, vars: string[]): void {
    const keywords = new Set([
      'int', 'float', 'double', 'char', 'bool', 'void', 'return',
      'if', 'else', 'while', 'for', 'do', 'switch', 'case', 'default',
      'const', 'static', 'extern', 'auto', 'register', 'inline'
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
   * Get simplified parameter mapping (for backward compatibility).
   * 
   * Returns a Map from formal parameter names to actual argument expressions.
   * 
   * @param call - Function call
   * @param calleeMetadata - Callee function metadata
   * @returns Map from formal parameter names to actual arguments
   */
  mapParameters(
    call: FunctionCall,
    calleeMetadata: FunctionMetadata
  ): Map<string, string> {
    const mapping = new Map<string, string>();

    for (let i = 0; i < calleeMetadata.parameters.length && i < call.arguments.actual.length; i++) {
      const formalParam = calleeMetadata.parameters[i];
      const actualArg = call.arguments.actual[i].trim();
      mapping.set(formalParam.name, actualArg);
    }

    return mapping;
  }

  /**
   * Check if an argument derivation indicates a pointer parameter.
   * 
   * Useful for tracking pointer aliasing and side effects.
   * 
   * @param derivation - Argument derivation analysis
   * @returns true if argument is a pointer
   */
  isPointerArgument(derivation: ArgumentDerivation): boolean {
    return derivation.type === ArgumentDerivationType.ADDRESS ||
           derivation.type === ArgumentDerivationType.DEREFERENCE;
  }

  /**
   * Check if an argument derivation indicates a composite/object access.
   * 
   * Useful for tracking object field access patterns.
   * 
   * @param derivation - Argument derivation analysis
   * @returns true if argument involves member access
   */
  isCompositeArgument(derivation: ArgumentDerivation): boolean {
    return derivation.type === ArgumentDerivationType.COMPOSITE ||
           derivation.type === ArgumentDerivationType.ARRAY_ACCESS;
  }

  /**
   * Check if an argument derivation involves a function call.
   * 
   * Useful for tracking nested function calls and their effects.
   * 
   * @param derivation - Argument derivation analysis
   * @returns true if argument is result of function call
   */
  isCallArgument(derivation: ArgumentDerivation): boolean {
    return derivation.type === ArgumentDerivationType.CALL;
  }
}
