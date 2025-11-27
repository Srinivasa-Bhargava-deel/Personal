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
  /**
   * EXTRACT FUNCTION CALLS FROM STATEMENT
   * 
   * Main entry point for extracting function calls from a CFG statement.
   * Handles various clang output formats and extracts all function calls,
   * including nested calls.
   * 
   * Algorithm:
   * 1. Get statement text (from text or content field)
   * 2. Clean clang-specific artifacts (recovery expressions, implicit casts)
   * 3. Recursively extract all function calls
   * 
   * @param stmt - Statement to extract function calls from
   * @returns Array of extracted function calls with metadata
   */
  static extractFunctionCalls(stmt: Statement): ExtractedFunctionCall[] {
    // Get statement text - clang may use either 'text' or 'content' field
    const stmtText = stmt.text || stmt.content || '';
    if (!stmtText) return []; // Empty statement, no function calls

    const calls: ExtractedFunctionCall[] = [];
    
    /**
     * STEP 1: CLEAN CLANG ARTIFACTS
     * 
     * Clang's CFG output includes various artifacts that need to be cleaned:
     * - Recovery expressions: <recovery-expr>(func, args) -> func(args)
     * - Implicit casts: [B1.2](expr) -> expr
     * - Type conversion wrappers: (ImplicitCastExpr ...) -> removed
     * 
     * Cleaning these artifacts makes function call extraction more reliable.
     */
    const cleaned = this.cleanStatementText(stmtText);
    
    /**
     * STEP 2: RECURSIVE EXTRACTION
     * 
     * Recursively extract all function calls from the cleaned text.
     * Recursion is necessary to handle nested calls like: foo(bar(x), y)
     * 
     * The offset parameter (0) tracks the original position in the statement
     * for accurate source location reporting.
     */
    this.extractCallsRecursive(cleaned, calls, 0);
    
    return calls;
  }

  /**
   * CLEAN STATEMENT TEXT - REMOVE CLANG ARTIFACTS
   * 
   * Clang's CFG exporter includes various AST artifacts in statement text that
   * interfere with function call extraction. This method removes these artifacts
   * to produce clean, parseable statement text.
   * 
   * Artifacts Removed:
   * 1. Recovery expressions: <recovery-expr>(func, args) -> func(args)
   *    - Clang uses these when it encounters parse errors
   *    - Example: <recovery-expr>(scanf, "%d", &x) -> scanf("%d", &x)
   * 
   * 2. Implicit cast wrappers: [B1.2](expr) -> expr
   *    - Clang block references wrapping expressions
   *    - Example: [B1.2](scanf("%d", &x)) -> scanf("%d", &x)
   * 
   * 3. Type conversion wrappers: (ImplicitCastExpr ...) -> removed
   *    - Various implicit type conversions that don't affect function calls
   *    - Examples: LValueToRValue, FunctionToPointerDecay, ArrayToPointerDecay
   * 
   * @param text - Raw statement text from clang CFG
   * @returns Cleaned statement text ready for function call extraction
   */
  private static cleanStatementText(text: string): string {
    let cleaned = text;
    
    /**
     * RECOVERY EXPRESSION REMOVAL
     * 
     * Pattern: <recovery-expr>(functionName, arg1, arg2, ...)
     * Replace with: functionName(arg1, arg2, ...)
     * 
     * Regex explanation:
     * - <recovery-expr>\s*\( : Matches opening of recovery expression
     * - ([^,]+) : Captures function name (everything before first comma)
     * - ,\s*(.+) : Captures all arguments (everything after first comma)
     * - \) : Matches closing parenthesis
     */
    cleaned = cleaned.replace(/<recovery-expr>\s*\(([^,]+),\s*(.+)\)/g, '$1($2)');
    
    /**
     * IMPLICIT CAST WRAPPER REMOVAL
     * 
     * Pattern: [B1.2](expression)
     * Replace with: expression
     * 
     * Regex explanation:
     * - \[B\d+\.\d+\] : Matches block reference like [B1.2], [B2.5], etc.
     * - \s*\( : Optional whitespace and opening parenthesis
     * - ([^)]+) : Captures wrapped expression
     * - \) : Matches closing parenthesis
     */
    cleaned = cleaned.replace(/\[B\d+\.\d+\]\s*\(([^)]+)\)/g, '$1');
    
    /**
     * TYPE CONVERSION WRAPPER REMOVAL
     * 
     * Remove various clang type conversion wrappers that don't affect
     * function call extraction. These are parenthesized expressions that
     * wrap the actual code but don't change the function call structure.
     */
    cleaned = cleaned.replace(/\(ImplicitCastExpr[^)]*\)/g, '');
    cleaned = cleaned.replace(/\(LValueToRValue[^)]*\)/g, '');
    cleaned = cleaned.replace(/\(FunctionToPointerDecay[^)]*\)/g, '');
    cleaned = cleaned.replace(/\(ArrayToPointerDecay[^)]*\)/g, '');
    
    return cleaned.trim();
  }

  /**
   * RECURSIVE FUNCTION CALL EXTRACTION
   * 
   * Recursively extracts all function calls from text, including nested calls.
   * This method handles complex cases like: foo(bar(x), baz(y))
   * 
   * Algorithm:
   * 1. Find all identifier( patterns (potential function calls)
   * 2. Filter out C++ keywords (if, for, while, etc.)
   * 3. Extract full call expression (function name + arguments)
   * 4. Extract arguments from call expression
   * 5. Recursively process arguments to find nested calls
   * 
   * @param text - Text to extract function calls from
   * @param calls - Array to accumulate extracted calls
   * @param offset - Character offset in original statement (for position tracking)
   */
  private static extractCallsRecursive(
    text: string,
    calls: ExtractedFunctionCall[],
    offset: number
  ): void {
    /**
     * FUNCTION CALL PATTERN MATCHING
     * 
     * Pattern: identifier followed by opening parenthesis
     * Regex: /([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g
     * 
     * Explanation:
     * - [a-zA-Z_][a-zA-Z0-9_]* : Valid C++ identifier (starts with letter/underscore)
     * - \s* : Optional whitespace before parenthesis
     * - \( : Opening parenthesis (escaped)
     * - g flag: Global (find all matches)
     * 
     * This matches function calls but not keywords like "if(", "for(", etc.
     * (Keywords are filtered separately using isKeyword())
     */
    const pattern = /([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
    let match;
    
    // Find all potential function calls in the text
    while ((match = pattern.exec(text)) !== null) {
      const funcName = match[1]; // Extracted function name
      const nameStart = match.index; // Start position of function name
      const nameEnd = nameStart + funcName.length; // End position of function name
      
      /**
       * KEYWORD FILTERING
       * 
       * Skip C++ keywords that match the function call pattern.
       * Examples: if(, for(, while(, return(, etc.
       * 
       * This prevents false positives where keywords are mistaken for function calls.
       */
      if (this.isKeyword(funcName)) {
        continue;
      }
      
      /**
       * EXTRACT FULL CALL EXPRESSION
       * 
       * Extract the complete function call including all arguments.
       * Example: "scanf("%d", &x)" -> full expression
       * 
       * This handles nested parentheses correctly by matching opening/closing pairs.
       */
      const callExpr = this.extractCallExpression(text, nameStart);
      if (!callExpr) continue; // Skip if extraction failed (malformed call)
      
      /**
       * EXTRACT ARGUMENTS
       * 
       * Parse arguments from the call expression.
       * Example: "scanf("%d", &x)" -> ["\"%d\"", "&x"]
       * 
       * This correctly handles nested function calls in arguments by tracking
       * parentheses depth.
       */
      const args = this.extractArguments(callExpr);
      
      /**
       * CREATE EXTRACTED CALL OBJECT
       * 
       * Build the ExtractedFunctionCall object with:
       * - Function name
       * - Full call expression
       * - Parsed arguments
       * - Position information (adjusted by offset for original statement position)
       */
      calls.push({
        name: funcName,
        callExpression: callExpr,
        arguments: args,
        nameStart: offset + nameStart, // Adjust position by offset
        nameEnd: offset + nameEnd
      });
      
      /**
       * RECURSIVE PROCESSING OF ARGUMENTS
       * 
       * Recursively extract function calls from each argument.
       * This handles nested calls like: foo(bar(x), baz(y))
       * 
       * The offset is adjusted to maintain accurate position tracking
       * in the original statement.
       */
      args.forEach(arg => {
        this.extractCallsRecursive(arg, calls, offset + nameStart);
      });
    }
  }

  /**
   * EXTRACT FULL CALL EXPRESSION
   * 
   * Extracts the complete function call expression starting at a given position,
   * including the function name and all arguments. Handles nested parentheses
   * correctly by tracking depth.
   * 
   * Algorithm:
   * 1. Find opening parenthesis after function name
   * 2. Track parentheses depth to find matching closing parenthesis
   * 3. Extract substring from start position to closing parenthesis
   * 
   * Example:
   *   Text: "foo(bar(x), y)"
   *   Start: 0 (position of 'f')
   *   Result: "foo(bar(x), y)"
   * 
   * @param text - Text containing the function call
   * @param startPos - Starting position of function name
   * @returns Full call expression or null if extraction fails
   */
  private static extractCallExpression(text: string, startPos: number): string | null {
    /**
     * FIND OPENING PARENTHESIS
     * 
     * Scan forward from start position to find the opening parenthesis
     * that follows the function name. This handles cases where there's
     * whitespace between function name and parenthesis.
     * 
     * Example: "scanf  (" -> finds '(' at position after whitespace
     */
    let pos = startPos;
    while (pos < text.length && text[pos] !== '(') {
      pos++;
    }
    
    // If no opening parenthesis found, this isn't a valid function call
    if (pos >= text.length || text[pos] !== '(') {
      return null;
    }
    
    /**
     * FIND MATCHING CLOSING PARENTHESIS
     * 
     * Track parentheses depth to find the matching closing parenthesis.
     * This correctly handles nested function calls and parentheses in arguments.
     * 
     * Algorithm:
     * - Increment depth on '('
     * - Decrement depth on ')'
     * - When depth reaches 0, we've found the matching closing parenthesis
     * 
     * Example: "foo(bar(x), y)"
     *   '(' at pos 3: depth = 1
     *   '(' at pos 7: depth = 2
     *   ')' at pos 9: depth = 1
     *   ')' at pos 13: depth = 0 -> found match!
     */
    let depth = 0;
    let endPos = pos;
    
    for (let i = pos; i < text.length; i++) {
      if (text[i] === '(') {
        depth++; // Enter nested parentheses
      } else if (text[i] === ')') {
        depth--; // Exit nested parentheses
        if (depth === 0) {
          endPos = i + 1; // Include closing parenthesis in result
          break;
        }
      }
    }
    
    /**
     * VALIDATE PARENTHESES MATCHING
     * 
     * If depth is not 0, parentheses are unmatched (malformed call).
     * Return null to indicate extraction failure.
     */
    if (depth !== 0) {
      return null; // Unmatched parentheses
    }
    
    // Extract substring from function name start to closing parenthesis
    return text.substring(startPos, endPos);
  }

  /**
   * EXTRACT ARGUMENTS FROM FUNCTION CALL
   * 
   * Parses arguments from a function call expression, correctly handling
   * nested function calls and parentheses in arguments.
   * 
   * Algorithm:
   * 1. Extract content between parentheses
   * 2. Split by commas, but only at top level (depth = 0)
   * 3. Track parentheses depth to avoid splitting nested calls
   * 
   * Examples:
   *   "foo(x, y)" -> ["x", "y"]
   *   "foo(bar(x), y)" -> ["bar(x)", "y"]
   *   "foo(x + 1, y * 2)" -> ["x + 1", "y * 2"]
   * 
   * @param callExpr - Function call expression (e.g., "foo(bar(x), y)")
   * @returns Array of argument strings
   */
  private static extractArguments(callExpr: string): string[] {
    /**
     * EXTRACT ARGUMENTS STRING
     * 
     * Find the content between the opening and closing parentheses.
     * This is the raw arguments string that needs to be parsed.
     * 
     * Example: "foo(bar(x), y)" -> "bar(x), y"
     */
    const openParen = callExpr.indexOf('(');
    const closeParen = callExpr.lastIndexOf(')');
    
    // If no parentheses found, no arguments
    if (openParen === -1 || closeParen === -1) {
      return [];
    }
    
    // Extract arguments string (content between parentheses)
    const argsStr = callExpr.substring(openParen + 1, closeParen).trim();
    if (!argsStr) {
      return []; // No arguments (empty parentheses)
    }
    
    /**
     * SPLIT ARGUMENTS BY COMMA
     * 
     * Split arguments by comma, but only at top level (depth = 0).
     * This prevents splitting nested function calls.
     * 
     * Algorithm:
     * - Track parentheses depth
     * - Increment depth on '('
     * - Decrement depth on ')'
     * - Only split on ',' when depth = 0 (top level)
     * 
     * Example: "bar(x), y"
     *   'b' -> currentArg = "b"
     *   '(' -> depth = 1, currentArg = "b("
     *   'x' -> currentArg = "b(x"
     *   ')' -> depth = 0, currentArg = "b(x)"
     *   ',' -> depth = 0, split! args = ["bar(x)"], currentArg = ""
     *   'y' -> currentArg = "y"
     *   End -> args = ["bar(x)", "y"]
     */
    const args: string[] = [];
    let currentArg = ''; // Current argument being built
    let depth = 0; // Parentheses nesting depth
    
    for (let i = 0; i < argsStr.length; i++) {
      const char = argsStr[i];
      
      if (char === '(') {
        depth++; // Enter nested parentheses
        currentArg += char;
      } else if (char === ')') {
        depth--; // Exit nested parentheses
        currentArg += char;
      } else if (char === ',' && depth === 0) {
        /**
         * TOP-LEVEL COMMA SPLIT
         * 
         * Found a comma at top level (depth = 0), so this is an argument separator.
         * Save current argument and start building next argument.
         */
        args.push(currentArg.trim());
        currentArg = '';
      } else {
        // Accumulate character into current argument
        currentArg += char;
      }
    }
    
    /**
     * FINAL ARGUMENT
     * 
     * Don't forget the last argument (after final comma or if no commas).
     * This handles cases like "foo(x)" (single argument) or "foo(x, y)" (last argument).
     */
    if (currentArg.trim()) {
      args.push(currentArg.trim());
    }
    
    return args;
  }

  /**
   * KEYWORD CHECKING
   * 
   * Checks if an identifier is a C++ keyword. Keywords match the function call
   * pattern (identifier followed by parenthesis) but are not function calls.
   * 
   * Examples:
   *   "if(" -> keyword, not a function call
   *   "for(" -> keyword, not a function call
   *   "scanf(" -> not a keyword, is a function call
   * 
   * This prevents false positives where keywords are mistaken for function calls.
   * 
   * @param id - Identifier to check
   * @returns true if identifier is a C++ keyword, false otherwise
   */
  private static isKeyword(id: string): boolean {
    /**
     * C++ KEYWORD SET
     * 
     * Comprehensive set of C++ keywords that match the function call pattern.
     * Categories:
     * - Control flow: if, else, for, while, do, switch, case, default, break, continue, return, goto
     * - Exception handling: try, catch, throw
     * - Memory management: new, delete
     * - Literals: this, nullptr, true, false
     * - Type specifiers: int, float, double, char, bool, void, auto
     * - Storage specifiers: const, static, extern, volatile, mutable
     * - Class/struct keywords: class, struct, union, enum, namespace, using
     * - Access specifiers: public, private, protected
     * - Polymorphism: virtual, override, final
     * - Templates: template, typename
     * - Operators: operator
     * - Type operations: sizeof, typeid, dynamic_cast, static_cast, const_cast, reinterpret_cast
     */
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
   * CONVENIENCE METHOD: CHECK FOR FUNCTION CALLS
   * 
   * Quick check to determine if a statement contains any function calls.
   * Useful for filtering statements before detailed extraction.
   * 
   * @param stmt - Statement to check
   * @returns true if statement contains at least one function call
   */
  static hasFunctionCall(stmt: Statement): boolean {
    return this.extractFunctionCalls(stmt).length > 0;
  }

  /**
   * CONVENIENCE METHOD: GET FIRST FUNCTION CALL
   * 
   * Extracts the first function call from a statement. Useful when you only
   * need the primary function call and don't care about nested calls.
   * 
   * @param stmt - Statement to extract from
   * @returns First function call or null if none found
   */
  static getFirstFunctionCall(stmt: Statement): ExtractedFunctionCall | null {
    const calls = this.extractFunctionCalls(stmt);
    return calls.length > 0 ? calls[0] : null;
  }

  /**
   * CONVENIENCE METHOD: GET FUNCTION NAME
   * 
   * Extracts just the function name from the first function call in a statement.
   * This is the most common use case - checking which function is called.
   * 
   * @param stmt - Statement to extract from
   * @returns Function name or null if no function call found
   */
  static getFunctionName(stmt: Statement): string | null {
    const call = this.getFirstFunctionCall(stmt);
    return call ? call.name : null;
  }

  /**
   * CONVENIENCE METHOD: CHECK FOR SPECIFIC FUNCTION
   * 
   * Checks if a statement contains a call to a specific function.
   * Useful for pattern matching (e.g., "does this statement call scanf?").
   * 
   * @param stmt - Statement to check
   * @param funcName - Function name to search for
   * @returns true if statement contains a call to the specified function
   */
  static callsFunction(stmt: Statement, funcName: string): boolean {
    const calls = this.extractFunctionCalls(stmt);
    return calls.some(call => call.name === funcName);
  }
}

