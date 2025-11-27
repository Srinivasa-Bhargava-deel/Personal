/**
 * Sanitization Registry
 * 
 * Comprehensive registry of functions and operations that remove or clean taint
 * from data. These sanitization functions prevent false positives by identifying
 * where tainted data has been validated, encoded, escaped, or otherwise sanitized.
 * 
 * Phase 3 of Enhanced Taint Analysis Implementation
 */

export type SanitizationType = 
  | 'validation' 
  | 'encoding' 
  | 'escaping' 
  | 'whitelist' 
  | 'conversion'
  | 'length_limit';

/**
 * Represents a sanitization function or operation
 */
export interface SanitizationFunction {
  /** Function name (e.g., "isalnum", "url_encode", "sql_escape") */
  functionName: string;
  
  /** Type of sanitization */
  type: SanitizationType;
  
  /** Does this function completely remove taint? */
  removesTaint: boolean;
  
  /** Which output argument/index is sanitized (0-based, -1 for return value) */
  outputIndex: number;
  
  /** Which input argument is sanitized (0-based) */
  inputIndex: number;
  
  /** Optional: description of the sanitization */
  description?: string;
  
  /** Optional: regex pattern for matching function calls */
  pattern?: RegExp;
}

/**
 * SANITIZATION REGISTRY CLASS
 * 
 * Manages a comprehensive registry of functions and operations that remove or
 * clean taint from data. These sanitization functions prevent false positives
 * by identifying where tainted data has been validated, encoded, escaped, or
 * otherwise sanitized.
 * 
 * Features:
 * - Pre-configured with common sanitization functions
 * - Support for custom sanitization functions
 * - Categorization by sanitization type (validation, encoding, escaping, etc.)
 * - Taint removal tracking (does sanitization completely remove taint?)
 * - Input/output argument tracking
 * 
 * Usage:
 * The taint analyzer uses this registry to detect when tainted data has been
 * sanitized, preventing false positive vulnerability reports.
 */
export class SanitizationRegistry {
  /**
   * REGISTRY STORAGE
   * 
   * Maps function names to their sanitization function definitions.
   * This allows O(1) lookup when checking if a function sanitizes data.
   */
  private sanitizers: Map<string, SanitizationFunction> = new Map();
  
  /**
   * CUSTOM SANITIZERS TRACKING
   * 
   * Tracks which sanitizers were added by the user (not default sanitizers).
   * This allows selective removal of custom sanitizers without affecting defaults.
   */
  private customSanitizers: Set<string> = new Set();

  constructor() {
    /**
     * INITIALIZATION
     * 
     * Populate registry with default sanitization functions covering all major
     * sanitization types: validation, encoding, escaping, whitelisting, conversion, etc.
     */
    this.initializeDefaultSanitizers();
  }

  /**
   * INITIALIZE DEFAULT SANITIZATION FUNCTIONS
   * 
   * Populates the registry with comprehensive default sanitization functions.
   * These cover all major sanitization types:
   * 
   * 1. Validation: Check if input meets criteria (isalnum, isdigit, etc.)
   * 2. Encoding: Transform data to safe representation (url_encode, base64_encode, etc.)
   * 3. Escaping: Escape special characters (sql_escape, shell_escape, etc.)
   * 4. Whitelist: Only allow specific characters/patterns (strpbrk, strtok, etc.)
   * 5. Conversion: Safe type conversions with validation (atoi, strtol, etc.)
   * 6. Length Limit: Bounded operations (strncpy, snprintf, etc.)
   * 
   * Each sanitizer includes:
   * - Function name
   * - Sanitization type
   * - Whether it completely removes taint (removesTaint flag)
   * - Input/output argument indices
   * - Optional description
   */
  private initializeDefaultSanitizers(): void {
    /**
     * VALIDATION FUNCTIONS
     * 
     * Functions that check if input meets certain criteria. These don't
     * remove taint themselves, but indicate that data has been validated
     * and is safe to use in certain contexts.
     * 
     * Examples:
     * - isalnum(c): Checks if character is alphanumeric
     * - isdigit(c): Checks if character is a digit
     * - strspn(str, set): Finds length of initial segment matching character set
     * 
     * Note: Validation functions typically don't remove taint (removesTaint = false)
     * because they only check validity, they don't transform the data.
     */
    // Validation Functions - Check if input meets criteria
    const validationSanitizers: SanitizationFunction[] = [
      { 
        functionName: 'isalnum', 
        type: 'validation', 
        removesTaint: false, // Validation doesn't remove taint, but indicates safe use
        inputIndex: 0,
        outputIndex: -1,
        description: 'Check if character is alphanumeric'
      },
      { 
        functionName: 'isdigit', 
        type: 'validation', 
        removesTaint: false,
        inputIndex: 0,
        outputIndex: -1,
        description: 'Check if character is digit'
      },
      { 
        functionName: 'isalpha', 
        type: 'validation', 
        removesTaint: false,
        inputIndex: 0,
        outputIndex: -1,
        description: 'Check if character is alphabetic'
      },
      { 
        functionName: 'isxdigit', 
        type: 'validation', 
        removesTaint: false,
        inputIndex: 0,
        outputIndex: -1,
        description: 'Check if character is hexadecimal digit'
      },
      { 
        functionName: 'strspn', 
        type: 'validation', 
        removesTaint: false,
        inputIndex: 0,
        outputIndex: -1,
        description: 'Find length of initial segment matching character set'
      },
      { 
        functionName: 'strcspn', 
        type: 'validation', 
        removesTaint: false,
        inputIndex: 0,
        outputIndex: -1,
        description: 'Find length of initial segment not matching character set'
      },
    ];

    /**
     * ENCODING FUNCTIONS
     * 
     * Functions that transform data to a safe representation through encoding.
     * Encoding typically removes taint because the encoded data is no longer
     * in its original form and cannot be directly exploited.
     * 
     * Examples:
     * - url_encode(str): URL-encodes string (e.g., " " -> "%20")
     * - htmlspecialchars(str): Converts special characters to HTML entities
     * - base64_encode(str): Base64-encodes string
     * - json_encode(obj): JSON-encodes object
     * 
     * Note: Encoding functions typically remove taint (removesTaint = true)
     * because encoded data cannot be directly exploited in most contexts.
     */
    // Encoding Functions - Transform data to safe representation
    const encodingSanitizers: SanitizationFunction[] = [
      { 
        functionName: 'url_encode', 
        type: 'encoding', 
        removesTaint: true,
        inputIndex: 0,
        outputIndex: -1,
        description: 'URL encode string'
      },
      { 
        functionName: 'htmlspecialchars', 
        type: 'encoding', 
        removesTaint: true,
        inputIndex: 0,
        outputIndex: -1,
        description: 'Convert special characters to HTML entities'
      },
      { 
        functionName: 'base64_encode', 
        type: 'encoding', 
        removesTaint: true,
        inputIndex: 0,
        outputIndex: -1,
        description: 'Base64 encode string'
      },
      { 
        functionName: 'json_encode', 
        type: 'encoding', 
        removesTaint: true,
        inputIndex: 0,
        outputIndex: -1,
        description: 'JSON encode string'
      },
    ];

    /**
     * ESCAPING FUNCTIONS
     * 
     * Functions that escape special characters to prevent injection attacks.
     * Escaping typically removes taint because escaped data is safe to use
     * in the intended context (SQL, shell, etc.).
     * 
     * Examples:
     * - sql_escape(str): Escapes SQL special characters (e.g., "'" -> "\'")
     * - shell_escape(str): Escapes shell special characters
     * - mysql_real_escape_string(str): MySQL-specific escaping
     * 
     * Note: Escaping functions typically remove taint (removesTaint = true)
     * because escaped data cannot be exploited in the intended context.
     */
    // Escaping Functions - Escape special characters
    const escapingSanitizers: SanitizationFunction[] = [
      { 
        functionName: 'sql_escape', 
        type: 'escaping', 
        removesTaint: true,
        inputIndex: 0,
        outputIndex: -1,
        description: 'Escape SQL special characters'
      },
      { 
        functionName: 'shell_escape', 
        type: 'escaping', 
        removesTaint: true,
        inputIndex: 0,
        outputIndex: -1,
        description: 'Escape shell special characters'
      },
      { 
        functionName: 'addslashes', 
        type: 'escaping', 
        removesTaint: true,
        inputIndex: 0,
        outputIndex: -1,
        description: 'Add backslashes before special characters'
      },
      { 
        functionName: 'mysql_real_escape_string', 
        type: 'escaping', 
        removesTaint: true,
        inputIndex: 0,
        outputIndex: -1,
        description: 'MySQL escape string'
      },
      { 
        functionName: 'sqlite3_mprintf', 
        type: 'escaping', 
        removesTaint: true,
        inputIndex: 0,
        outputIndex: -1,
        description: 'SQLite formatted string with escaping'
      },
    ];

    /**
     * WHITELIST FUNCTIONS
     * 
     * Functions that only allow specific characters or patterns. These
     * functions filter data to match a whitelist, removing anything that
     * doesn't match.
     * 
     * Examples:
     * - strpbrk(str, set): Finds first occurrence of any character in set
     * - strtok(str, delimiters): Tokenizes string with delimiters
     * 
     * Note: Whitelist functions typically don't remove taint (removesTaint = false)
     * because they only filter, they don't guarantee safety in all contexts.
     */
    // Whitelist Functions - Only allow specific characters/patterns
    const whitelistSanitizers: SanitizationFunction[] = [
      { 
        functionName: 'strpbrk', 
        type: 'whitelist', 
        removesTaint: false,
        inputIndex: 0,
        outputIndex: -1,
        description: 'Find first occurrence of any character in set'
      },
      { 
        functionName: 'strtok', 
        type: 'whitelist', 
        removesTaint: false,
        inputIndex: 0,
        outputIndex: -1,
        description: 'Tokenize string with delimiter'
      },
    ];

    /**
     * TYPE CONVERSION FUNCTIONS
     * 
     * Functions that convert data types with validation. These functions
     * parse strings into numeric types, validating the input in the process.
     * 
     * Examples:
     * - atoi(str): Converts string to integer (limited validation)
     * - strtol(str, endptr, base): Converts string to long with validation
     * - strtoul(str, endptr, base): Converts string to unsigned long
     * 
     * Note: Conversion functions typically don't remove taint (removesTaint = false)
     * because converting to a numeric type doesn't guarantee safety - the numeric
     * value could still be used maliciously (e.g., integer overflow).
     */
    // Type Conversion Functions - Safe conversions with validation
    const conversionSanitizers: SanitizationFunction[] = [
      { 
        functionName: 'atoi', 
        type: 'conversion', 
        removesTaint: false, // Integer conversion doesn't remove taint
        inputIndex: 0,
        outputIndex: -1,
        description: 'Convert string to integer'
      },
      { 
        functionName: 'atol', 
        type: 'conversion', 
        removesTaint: false,
        inputIndex: 0,
        outputIndex: -1,
        description: 'Convert string to long'
      },
      { 
        functionName: 'strtol', 
        type: 'conversion', 
        removesTaint: false,
        inputIndex: 0,
        outputIndex: -1,
        description: 'Convert string to long with validation'
      },
      { 
        functionName: 'strtoul', 
        type: 'conversion', 
        removesTaint: false,
        inputIndex: 0,
        outputIndex: -1,
        description: 'Convert string to unsigned long'
      },
    ];

    /**
     * LENGTH LIMIT FUNCTIONS
     * 
     * Functions that perform bounded operations with size limits. These
     * functions prevent buffer overflows by limiting the amount of data
     * that can be written.
     * 
     * Examples:
     * - strncpy(dest, src, size): Bounded string copy
     * - snprintf(buffer, size, format, ...): Bounded formatted string
     * - strlcpy(dest, src, size): Safe string copy with length limit
     * 
     * Note: Length limit functions typically don't remove taint (removesTaint = false)
     * because they only prevent buffer overflows, they don't sanitize the content.
     * The data is still tainted, just bounded in size.
     */
    // Length Limit Functions - Bounded operations
    const lengthLimitSanitizers: SanitizationFunction[] = [
      { 
        functionName: 'strncpy', 
        type: 'length_limit', 
        removesTaint: false, // Only safe if size is properly checked
        inputIndex: 1,
        outputIndex: 0,
        description: 'Bounded string copy'
      },
      { 
        functionName: 'strncat', 
        type: 'length_limit', 
        removesTaint: false,
        inputIndex: 1,
        outputIndex: 0,
        description: 'Bounded string concatenation'
      },
      { 
        functionName: 'snprintf', 
        type: 'length_limit', 
        removesTaint: false,
        inputIndex: 2,
        outputIndex: 0,
        description: 'Bounded formatted string'
      },
      { 
        functionName: 'strlcpy', 
        type: 'length_limit', 
        removesTaint: false,
        inputIndex: 1,
        outputIndex: 0,
        description: 'Safe string copy with length limit'
      },
      { 
        functionName: 'strlcat', 
        type: 'length_limit', 
        removesTaint: false,
        inputIndex: 1,
        outputIndex: 0,
        description: 'Safe string concatenation with length limit'
      },
    ];

    /**
     * REGISTER ALL SANITIZERS
     * 
     * Combine all sanitizer categories into a single array and register them
     * in the sanitizers Map. This allows efficient lookup by function name.
     */
    // Register all sanitizers
    const allSanitizers = [
      ...validationSanitizers,
      ...encodingSanitizers,
      ...escapingSanitizers,
      ...whitelistSanitizers,
      ...conversionSanitizers,
      ...lengthLimitSanitizers,
    ];

    // Add each sanitizer to the registry Map
    allSanitizers.forEach(sanitizer => {
      this.sanitizers.set(sanitizer.functionName, sanitizer);
    });
  }

  /**
   * CHECK IF FUNCTION IS SANITIZATION FUNCTION
   * 
   * Determines if a function is registered as a sanitization function
   * (either default or custom). This is the primary lookup method used
   * by the taint analyzer to detect sanitization.
   * 
   * @param functionName - Name of function to check
   * @returns true if function is a known sanitization function
   */
  isSanitizationFunction(functionName: string): boolean {
    // Check both default sanitizers and custom sanitizers
    return this.sanitizers.has(functionName) || this.customSanitizers.has(functionName);
  }

  /**
   * GET SANITIZATION FUNCTION DEFINITION
   * 
   * Retrieves the complete sanitization function definition. This includes
   * sanitization type, taint removal flag, and input/output argument indices.
   * 
   * @param functionName - Name of function to look up
   * @returns SanitizationFunction object or undefined if not found
   */
  getSanitizationFunction(functionName: string): SanitizationFunction | undefined {
    return this.sanitizers.get(functionName);
  }

  /**
   * ADD CUSTOM SANITIZATION FUNCTION
   * 
   * Allows users to register custom sanitization functions for
   * application-specific sanitization logic. Custom sanitizers are tracked
   * separately so they can be removed without affecting default sanitizers.
   * 
   * Use cases:
   * - Application-specific sanitization functions
   * - Third-party library sanitization functions
   * - Custom encoding/escaping functions
   * 
   * @param sanitizer - SanitizationFunction definition to add
   */
  addCustomSanitizer(sanitizer: SanitizationFunction): void {
    this.sanitizers.set(sanitizer.functionName, sanitizer);
    this.customSanitizers.add(sanitizer.functionName);
  }

  /**
   * EXTRACT SANITIZED VARIABLE FROM FUNCTION CALL
   * 
   * Identifies which variable receives the sanitized value from a sanitization
   * function call. This is critical for taint analysis - we need to know which
   * variable is no longer tainted after sanitization.
   * 
   * Sanitization functions work in two ways:
   * 1. Return sanitized value: var = sanitizer(input) -> var is sanitized
   *    - Example: sanitized = htmlspecialchars(input)
   *    - outputIndex = -1 (return value)
   * 
   * 2. In-place sanitization: sanitizer(&var, input) -> var is sanitized
   *    - Example: strncpy(dest, src, size) -> dest is sanitized
   *    - outputIndex >= 0 (argument index)
   * 
   * @param stmtText - Statement text containing the sanitization call
   * @param sanitizer - Sanitization function definition
   * @returns Variable name that is sanitized, or null if not found
   */
  extractSanitizedVariable(
    stmtText: string,
    sanitizer: SanitizationFunction
  ): string | null {
    /**
     * RETURN VALUE SANITIZERS
     * 
     * Functions that return a sanitized value that is assigned to a variable.
     * Pattern: variable = sanitizer(input)
     * 
     * Example: sanitized = htmlspecialchars(input)
     *          -> Extract "sanitized" from left-hand side of assignment
     */
    if (sanitizer.outputIndex === -1) {
      // Look for assignment pattern: var = sanitizer(...)
      // Extract the variable name on the left-hand side of assignment
      const assignmentMatch = stmtText.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*/);
      if (assignmentMatch) {
        return assignmentMatch[1];
      }
      return null;
    }

    /**
     * IN-PLACE SANITIZERS
     * 
     * Functions that modify a variable passed by reference.
     * Pattern: sanitizer(output_arg, input_arg, ...)
     * 
     * Example: strncpy(dest, src, size)
     *          -> Extract "dest" from argument at outputIndex (0)
     */
    // Extract function call pattern: functionName(arg1, arg2, ...)
    const callMatch = stmtText.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/);
    if (!callMatch) return null;

    /**
     * ARGUMENT PARSING
     * 
     * Split arguments by comma. Note: This is simplified parsing that doesn't
     * handle nested function calls correctly. For production, use a more robust
     * parser that handles nested parentheses (like FunctionCallExtractor).
     */
    const args = callMatch[2].split(',').map(arg => arg.trim());
    if (sanitizer.outputIndex >= args.length) return null;

    // Get the output argument at the specified index
    const outputArg = args[sanitizer.outputIndex];
    
    /**
     * VARIABLE NAME EXTRACTION
     * 
     * Extract variable name from argument, removing pointer operators (&, *).
     * Handles patterns like:
     * - &var -> var
     * - *var -> var
     * - var -> var
     * - var[0] -> var (simplified, doesn't handle array indices)
     */
    const varMatch = outputArg.match(/(?:&|\*)?\s*([a-zA-Z_][a-zA-Z0-9_]*)/);
    return varMatch ? varMatch[1] : null;
  }

  /**
   * EXTRACT INPUT VARIABLE FROM FUNCTION CALL
   * 
   * Identifies which variable is being sanitized (the input to the sanitizer).
   * This is used to track taint removal: if input is tainted and sanitized,
   * the output variable should no longer be tainted (if removesTaint = true).
   * 
   * Example: sanitized = htmlspecialchars(tainted_input)
   *          -> input variable: "tainted_input"
   *          -> output variable: "sanitized" (from extractSanitizedVariable)
   *          -> If removesTaint = true, "sanitized" is no longer tainted
   * 
   * @param stmtText - Statement text containing the sanitization call
   * @param sanitizer - Sanitization function definition
   * @returns Variable name that is input to sanitizer, or null if not found
   */
  extractInputVariable(
    stmtText: string,
    sanitizer: SanitizationFunction
  ): string | null {
    /**
     * FUNCTION CALL EXTRACTION
     * 
     * Extract function call pattern: functionName(arg1, arg2, ...)
     * This gives us access to the arguments that need to be parsed.
     */
    const callMatch = stmtText.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/);
    if (!callMatch) return null;

    /**
     * ARGUMENT PARSING
     * 
     * Split arguments by comma. Note: This is simplified parsing that doesn't
     * handle nested function calls correctly. For production, use a more robust
     * parser that handles nested parentheses (like FunctionCallExtractor).
     * 
     * Example: sanitizer(foo(bar(x)), y) -> Would incorrectly split at comma
     *          inside foo() call. Should use depth tracking.
     */
    const args = callMatch[2].split(',').map(arg => arg.trim());
    if (sanitizer.inputIndex >= args.length) return null;

    /**
     * INPUT ARGUMENT EXTRACTION
     * 
     * Get the input argument at the specified index (sanitizer.inputIndex).
     * This is the variable that is being sanitized.
     */
    const inputArg = args[sanitizer.inputIndex];
    
    /**
     * VARIABLE NAME EXTRACTION
     * 
     * Extract variable name from argument, removing pointer operators (&, *).
     * Handles patterns like:
     * - &var -> var
     * - *var -> var
     * - var -> var
     * - var[0] -> var (simplified, doesn't handle array indices)
     */
    const varMatch = inputArg.match(/(?:&|\*)?\s*([a-zA-Z_][a-zA-Z0-9_]*)/);
    return varMatch ? varMatch[1] : null;
  }
}

// Default singleton instance
export const defaultSanitizationRegistry = new SanitizationRegistry();

