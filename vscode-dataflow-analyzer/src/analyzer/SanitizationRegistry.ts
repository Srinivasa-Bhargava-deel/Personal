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
 * Registry of all known sanitization functions
 */
export class SanitizationRegistry {
  private sanitizers: Map<string, SanitizationFunction> = new Map();
  private customSanitizers: Set<string> = new Set();

  constructor() {
    this.initializeDefaultSanitizers();
  }

  /**
   * Initialize default sanitization functions covering all major sanitization types
   */
  private initializeDefaultSanitizers(): void {
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

    // Register all sanitizers
    const allSanitizers = [
      ...validationSanitizers,
      ...encodingSanitizers,
      ...escapingSanitizers,
      ...whitelistSanitizers,
      ...conversionSanitizers,
      ...lengthLimitSanitizers,
    ];

    allSanitizers.forEach(sanitizer => {
      this.sanitizers.set(sanitizer.functionName, sanitizer);
    });
  }

  /**
   * Check if a function is a known sanitization function
   */
  isSanitizationFunction(functionName: string): boolean {
    return this.sanitizers.has(functionName) || this.customSanitizers.has(functionName);
  }

  /**
   * Get sanitization function definition
   */
  getSanitizationFunction(functionName: string): SanitizationFunction | undefined {
    return this.sanitizers.get(functionName);
  }

  /**
   * Add custom sanitization function
   */
  addCustomSanitizer(sanitizer: SanitizationFunction): void {
    this.sanitizers.set(sanitizer.functionName, sanitizer);
    this.customSanitizers.add(sanitizer.functionName);
  }

  /**
   * Extract sanitized variable from a sanitization function call
   * 
   * For functions that return sanitized values: return value is sanitized
   * For functions that sanitize in-place: output argument is sanitized
   */
  extractSanitizedVariable(
    stmtText: string,
    sanitizer: SanitizationFunction
  ): string | null {
    // For return value sanitizers (outputIndex = -1)
    if (sanitizer.outputIndex === -1) {
      // Look for assignment: var = sanitizer(...)
      const assignmentMatch = stmtText.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*/);
      if (assignmentMatch) {
        return assignmentMatch[1];
      }
      return null;
    }

    // For in-place sanitizers (outputIndex >= 0)
    // Extract the output argument
    const callMatch = stmtText.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/);
    if (!callMatch) return null;

    const args = callMatch[2].split(',').map(arg => arg.trim());
    if (sanitizer.outputIndex >= args.length) return null;

    const outputArg = args[sanitizer.outputIndex];
    // Extract variable name from argument (remove operators like &, *, etc.)
    const varMatch = outputArg.match(/(?:&|\*)?\s*([a-zA-Z_][a-zA-Z0-9_]*)/);
    return varMatch ? varMatch[1] : null;
  }

  /**
   * Extract input variable from a sanitization function call
   */
  extractInputVariable(
    stmtText: string,
    sanitizer: SanitizationFunction
  ): string | null {
    const callMatch = stmtText.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/);
    if (!callMatch) return null;

    const args = callMatch[2].split(',').map(arg => arg.trim());
    if (sanitizer.inputIndex >= args.length) return null;

    const inputArg = args[sanitizer.inputIndex];
    // Extract variable name from argument
    const varMatch = inputArg.match(/(?:&|\*)?\s*([a-zA-Z_][a-zA-Z0-9_]*)/);
    return varMatch ? varMatch[1] : null;
  }
}

// Default singleton instance
export const defaultSanitizationRegistry = new SanitizationRegistry();

