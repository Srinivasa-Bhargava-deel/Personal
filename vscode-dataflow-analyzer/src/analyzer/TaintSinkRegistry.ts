/**
 * Taint Sink Registry
 * 
 * Comprehensive registry of functions and operations that are dangerous
 * when used with tainted data. These are "sinks" where tainted data should
 * not flow without sanitization.
 * 
 * Phase 2 of Enhanced Taint Analysis Implementation
 */

export type TaintSinkCategory = 
  | 'sql' 
  | 'command' 
  | 'format_string' 
  | 'path' 
  | 'buffer' 
  | 'code'
  | 'integer_overflow';

export type VulnerabilitySeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Represents a taint sink function or operation
 */
export interface TaintSink {
  /** Function name (e.g., "system", "sprintf") */
  functionName: string;
  
  /** Category of sink */
  category: TaintSinkCategory;
  
  /** Which argument indices must be sanitized (0-based) */
  argumentIndices: number[];
  
  /** Severity if tainted data reaches this sink */
  severity: VulnerabilitySeverity;
  
  /** Optional: regex pattern for matching function calls */
  pattern?: RegExp;
  
  /** Optional: description of the sink */
  description?: string;
  
  /** Optional: CWE (Common Weakness Enumeration) ID */
  cweId?: string;
}

/**
 * TAINT SINK REGISTRY CLASS
 * 
 * Manages a comprehensive registry of functions and operations that are dangerous
 * when used with tainted (untrusted) data. These "sinks" are where tainted data
 * should not flow without sanitization.
 * 
 * Features:
 * - Pre-configured with common security sinks (SQL injection, command injection, etc.)
 * - Support for custom taint sinks
 * - Categorization by vulnerability type
 * - Severity assessment for each sink
 * - Argument index tracking (which arguments must be sanitized)
 * 
 * Usage:
 * The taint analyzer uses this registry to detect when tainted data reaches
 * dangerous functions, triggering vulnerability reports.
 */
export class TaintSinkRegistry {
  /**
   * REGISTRY STORAGE
   * 
   * Maps function names to their taint sink definitions.
   * This allows O(1) lookup when checking if a function is a taint sink.
   */
  private sinks: Map<string, TaintSink> = new Map();
  
  /**
   * CUSTOM SINKS TRACKING
   * 
   * Tracks which sinks were added by the user (not default sinks).
   * This allows selective removal of custom sinks without affecting defaults.
   */
  private customSinks: Set<string> = new Set();

  constructor() {
    /**
     * INITIALIZATION
     * 
     * Populate registry with default taint sinks covering all major
     * vulnerability types: SQL injection, command injection, format strings,
     * path traversal, buffer overflows, code injection, etc.
     */
    this.initializeDefaultSinks();
  }

  /**
   * INITIALIZE DEFAULT TAINT SINKS
   * 
   * Populates the registry with comprehensive default taint sinks.
   * These cover all major vulnerability types that can occur when
   * tainted data reaches dangerous functions:
   * 
   * 1. SQL Injection: sprintf, sqlite3_exec, mysql_query, etc.
   * 2. Command Injection: system, popen, exec, execve, etc.
   * 3. Format String: printf, fprintf, sprintf, snprintf, etc.
   * 4. Path Traversal: fopen, open, chmod, chown, etc.
   * 5. Buffer Overflow: strcpy, strcat, sprintf, gets, etc.
   * 6. Code Injection: eval, system, etc.
   * 
   * Each sink includes:
   * - Function name
   * - Category (vulnerability type)
   * - Argument indices (which arguments must be sanitized)
   * - Severity (critical, high, medium, low)
   * - Optional CWE ID and description
   */
  private initializeDefaultSinks(): void {
    /**
     * SQL INJECTION SINKS
     * 
     * Functions that execute SQL queries. If tainted data reaches these
     * functions without sanitization, SQL injection attacks are possible.
     * 
     * Examples:
     * - sprintf(query, "SELECT * FROM users WHERE id = %s", user_input)
     * - sqlite3_exec(db, user_query, ...)
     * - mysql_query(conn, user_query)
     * 
     * Severity: Critical - SQL injection can lead to data breach, data loss,
     * or complete database compromise.
     */
    // SQL Injection Sinks
    const sqlSinks: TaintSink[] = [
      { 
        functionName: 'sprintf', 
        category: 'sql', 
        argumentIndices: [0, 1], 
        severity: 'critical',
        description: 'Formatted string - dangerous if format string or arguments contain SQL',
        cweId: 'CWE-89'
      },
      { 
        functionName: 'snprintf', 
        category: 'sql', 
        argumentIndices: [0, 1], 
        severity: 'critical',
        description: 'Bounded formatted string - dangerous if format contains SQL',
        cweId: 'CWE-89'
      },
      { 
        functionName: 'sqlite3_exec', 
        category: 'sql', 
        argumentIndices: [1], 
        severity: 'critical',
        description: 'SQLite execute SQL query',
        cweId: 'CWE-89'
      },
      { 
        functionName: 'sqlite3_prepare_v2', 
        category: 'sql', 
        argumentIndices: [1], 
        severity: 'critical',
        description: 'SQLite prepare statement',
        cweId: 'CWE-89'
      },
      { 
        functionName: 'mysql_query', 
        category: 'sql', 
        argumentIndices: [1], 
        severity: 'critical',
        description: 'MySQL query execution',
        cweId: 'CWE-89'
      },
      { 
        functionName: 'PQexec', 
        category: 'sql', 
        argumentIndices: [1], 
        severity: 'critical',
        description: 'PostgreSQL execute query',
        cweId: 'CWE-89'
      },
    ];

    /**
     * COMMAND INJECTION SINKS
     * 
     * Functions that execute shell commands or programs. If tainted data
     * reaches these functions, command injection attacks are possible.
     * 
     * Examples:
     * - system(user_input): Executes shell command
     * - popen(user_input, "r"): Opens process pipe
     * - execve(user_program, args, env): Executes program
     * 
     * Severity: Critical - Command injection can lead to arbitrary code
     * execution, system compromise, or data exfiltration.
     */
    // Command Injection Sinks
    const commandSinks: TaintSink[] = [
      { 
        functionName: 'system', 
        category: 'command', 
        argumentIndices: [0], 
        severity: 'critical',
        description: 'Execute shell command',
        cweId: 'CWE-78'
      },
      { 
        functionName: 'popen', 
        category: 'command', 
        argumentIndices: [0], 
        severity: 'critical',
        description: 'Open process pipe',
        cweId: 'CWE-78'
      },
      { 
        functionName: 'exec', 
        category: 'command', 
        argumentIndices: [0], 
        severity: 'critical',
        description: 'Execute program',
        cweId: 'CWE-78'
      },
      { 
        functionName: 'execve', 
        category: 'command', 
        argumentIndices: [0], 
        severity: 'critical',
        description: 'Execute program with environment',
        cweId: 'CWE-78'
      },
      { 
        functionName: 'execl', 
        category: 'command', 
        argumentIndices: [0], 
        severity: 'critical',
        description: 'Execute program with list of arguments',
        cweId: 'CWE-78'
      },
      { 
        functionName: 'execvp', 
        category: 'command', 
        argumentIndices: [0], 
        severity: 'critical',
        description: 'Execute program searching PATH',
        cweId: 'CWE-78'
      },
      { 
        functionName: 'execv', 
        category: 'command', 
        argumentIndices: [0], 
        severity: 'critical',
        description: 'Execute program with argument vector',
        cweId: 'CWE-78'
      },
    ];

    /**
     * FORMAT STRING SINKS
     * 
     * Functions that interpret format strings. If the format string itself
     * is tainted (user-controlled), format string attacks are possible.
     * 
     * Examples:
     * - printf(user_format, ...): Format string controlled by user
     * - sprintf(buffer, user_format, ...): Format string in buffer write
     * 
     * Severity: High - Format string attacks can lead to memory disclosure,
     * memory corruption, or code execution (via %n format specifier).
     */
    // Format String Sinks
    const formatStringSinks: TaintSink[] = [
      { 
        functionName: 'printf', 
        category: 'format_string', 
        argumentIndices: [0], 
        severity: 'high',
        description: 'Print formatted string - dangerous if format string is user-controlled',
        cweId: 'CWE-134'
      },
      { 
        functionName: 'fprintf', 
        category: 'format_string', 
        argumentIndices: [1], 
        severity: 'high',
        description: 'Print formatted string to file',
        cweId: 'CWE-134'
      },
      { 
        functionName: 'sprintf', 
        category: 'format_string', 
        argumentIndices: [1], 
        severity: 'high',
        description: 'Write formatted string to buffer',
        cweId: 'CWE-134'
      },
      { 
        functionName: 'snprintf', 
        category: 'format_string', 
        argumentIndices: [2], 
        severity: 'high',
        description: 'Write bounded formatted string to buffer',
        cweId: 'CWE-134'
      },
      { 
        functionName: 'syslog', 
        category: 'format_string', 
        argumentIndices: [1], 
        severity: 'high',
        description: 'System log with format string',
        cweId: 'CWE-134'
      },
    ];

    /**
     * PATH TRAVERSAL SINKS
     * 
     * Functions that operate on file paths. If the path is tainted,
     * path traversal attacks (directory traversal) are possible.
     * 
     * Examples:
     * - fopen(user_path, "r"): Opens file at user-specified path
     * - chmod(user_path, mode): Changes permissions of user-specified file
     * 
     * Severity: High - Path traversal can lead to unauthorized file access,
     * file deletion, or privilege escalation.
     */
    // Path Traversal Sinks
    const pathSinks: TaintSink[] = [
      { 
        functionName: 'fopen', 
        category: 'path', 
        argumentIndices: [0], 
        severity: 'high',
        description: 'Open file - dangerous if path is user-controlled',
        cweId: 'CWE-22'
      },
      { 
        functionName: 'open', 
        category: 'path', 
        argumentIndices: [0], 
        severity: 'high',
        description: 'Open file descriptor',
        cweId: 'CWE-22'
      },
      { 
        functionName: 'openat', 
        category: 'path', 
        argumentIndices: [1], 
        severity: 'high',
        description: 'Open file relative to directory',
        cweId: 'CWE-22'
      },
      { 
        functionName: 'chmod', 
        category: 'path', 
        argumentIndices: [0], 
        severity: 'high',
        description: 'Change file permissions',
        cweId: 'CWE-22'
      },
      { 
        functionName: 'chown', 
        category: 'path', 
        argumentIndices: [0], 
        severity: 'high',
        description: 'Change file ownership',
        cweId: 'CWE-22'
      },
      { 
        functionName: 'unlink', 
        category: 'path', 
        argumentIndices: [0], 
        severity: 'high',
        description: 'Delete file',
        cweId: 'CWE-22'
      },
      { 
        functionName: 'remove', 
        category: 'path', 
        argumentIndices: [0], 
        severity: 'high',
        description: 'Remove file',
        cweId: 'CWE-22'
      },
    ];

    /**
     * BUFFER OVERFLOW SINKS
     * 
     * Functions that write to buffers without bounds checking. If tainted
     * data exceeds buffer size, buffer overflow attacks are possible.
     * 
     * Examples:
     * - strcpy(dest, tainted_source): Copies without size limit
     * - strcat(dest, tainted_source): Concatenates without size limit
     * - sprintf(buffer, format, tainted_data): Formats without size limit
     * 
     * Severity: Critical - Buffer overflows can lead to memory corruption,
     * code execution, or system crashes.
     */
    // Buffer Overflow Sinks
    const bufferSinks: TaintSink[] = [
      { 
        functionName: 'strcpy', 
        category: 'buffer', 
        argumentIndices: [1], 
        severity: 'critical',
        description: 'Copy string - no bounds checking',
        cweId: 'CWE-120'
      },
      { 
        functionName: 'strcat', 
        category: 'buffer', 
        argumentIndices: [1], 
        severity: 'critical',
        description: 'Concatenate string - no bounds checking',
        cweId: 'CWE-120'
      },
      { 
        functionName: 'sprintf', 
        category: 'buffer', 
        argumentIndices: [2], 
        severity: 'critical',
        description: 'Formatted string to buffer - no bounds checking',
        cweId: 'CWE-120'
      },
      { 
        functionName: 'gets', 
        category: 'buffer', 
        argumentIndices: [0], 
        severity: 'critical',
        description: 'Read line - no bounds checking (also a source!)',
        cweId: 'CWE-120'
      },
      { 
        functionName: 'scanf', 
        category: 'buffer', 
        argumentIndices: [1], 
        severity: 'high',
        description: 'Scan input - dangerous if buffer size not checked (also a source!)',
        cweId: 'CWE-120'
      },
    ];

    /**
     * CODE INJECTION SINKS
     * 
     * Functions that execute code dynamically. If tainted data reaches
     * these functions, code injection attacks are possible.
     * 
     * Examples:
     * - eval(user_code): Evaluates code string
     * - system(user_command): Executes shell command (also command injection)
     * 
     * Severity: Critical - Code injection can lead to arbitrary code
     * execution and complete system compromise.
     */
    // Code Injection Sinks
    const codeSinks: TaintSink[] = [
      { 
        functionName: 'eval', 
        category: 'code', 
        argumentIndices: [0], 
        severity: 'critical',
        description: 'Evaluate code string',
        cweId: 'CWE-94'
      },
      { 
        functionName: 'system', 
        category: 'code', 
        argumentIndices: [0], 
        severity: 'critical',
        description: 'Execute shell command (also command injection)',
        cweId: 'CWE-94'
      },
    ];

    /**
     * REGISTER ALL SINKS
     * 
     * Combine all sink categories into a single array and register them
     * in the sinks Map. This allows efficient lookup by function name.
     * 
     * Note: Some functions appear in multiple categories (e.g., sprintf
     * is both SQL injection and buffer overflow sink). The last registration
     * wins, but the function will still be detected as a sink regardless.
     */
    // Register all sinks
    const allSinks = [
      ...sqlSinks,
      ...commandSinks,
      ...formatStringSinks,
      ...pathSinks,
      ...bufferSinks,
      ...codeSinks,
    ];

    // Add each sink to the registry Map
    allSinks.forEach(sink => {
      this.sinks.set(sink.functionName, sink);
    });
  }

  /**
   * CHECK IF FUNCTION IS TAINT SINK
   * 
   * Determines if a function is registered as a taint sink (either default
   * or custom). This is the primary lookup method used by the taint analyzer
   * and security analyzer.
   * 
   * @param functionName - Name of function to check
   * @returns true if function is a known taint sink
   */
  isTaintSink(functionName: string): boolean {
    // Check both default sinks and custom sinks
    return this.sinks.has(functionName) || this.customSinks.has(functionName);
  }

  /**
   * GET TAINT SINK INFORMATION
   * 
   * Retrieves the complete taint sink definition for a function.
   * This includes category, argument indices, severity, and CWE ID.
   * 
   * @param functionName - Name of function to look up
   * @returns TaintSink object or undefined if not found
   */
  getTaintSink(functionName: string): TaintSink | undefined {
    return this.sinks.get(functionName);
  }

  /**
   * GET ALL TAINT SINKS
   * 
   * Returns all registered taint sinks (default + custom).
   * Useful for debugging, logging, or UI display.
   * 
   * @returns Array of all taint sink definitions
   */
  getAllSinks(): TaintSink[] {
    return Array.from(this.sinks.values());
  }

  /**
   * GET SINKS BY CATEGORY
   * 
   * Filters taint sinks by category (sql, command, format_string, etc.).
   * Useful for category-specific analysis or reporting.
   * 
   * @param category - Category to filter by
   * @returns Array of taint sinks in the specified category
   */
  getSinksByCategory(category: TaintSinkCategory): TaintSink[] {
    return Array.from(this.sinks.values()).filter(s => s.category === category);
  }

  /**
   * GET SINKS BY SEVERITY
   * 
   * Filters taint sinks by severity (critical, high, medium, low).
   * Useful for prioritizing vulnerabilities or generating severity reports.
   * 
   * @param severity - Severity level to filter by
   * @returns Array of taint sinks with the specified severity
   */
  getSinksBySeverity(severity: VulnerabilitySeverity): TaintSink[] {
    return Array.from(this.sinks.values()).filter(s => s.severity === severity);
  }

  /**
   * ADD CUSTOM TAINT SINK
   * 
   * Allows users to register custom taint sinks for application-specific
   * dangerous functions. Custom sinks are tracked separately so they can
   * be removed without affecting default sinks.
   * 
   * Use cases:
   * - Application-specific dangerous functions
   * - Third-party library functions that are security-sensitive
   * - Custom protocol handlers that execute code
   * 
   * @param sink - TaintSink definition to add
   */
  addCustomSink(sink: TaintSink): void {
    this.sinks.set(sink.functionName, sink);
    this.customSinks.add(sink.functionName);
  }

  /**
   * REMOVE CUSTOM TAINT SINK
   * 
   * Removes a custom taint sink that was previously added. Only removes
   * sinks that were added via addCustomSink(), not default sinks.
   * This prevents accidental removal of built-in taint sinks.
   * 
   * @param functionName - Name of custom sink to remove
   */
  removeCustomSink(functionName: string): void {
    // Only remove if it's a custom sink (not a default sink)
    if (this.customSinks.has(functionName)) {
      this.sinks.delete(functionName);
      this.customSinks.delete(functionName);
    }
  }

  /**
   * Extract arguments from function call string
   * 
   * This method correctly handles nested function calls and parentheses
   * by tracking brace depth. For example:
   *   f(g(x, y), h(z)) -> ["g(x, y)", "h(z)"]
   * 
   * Algorithm:
   * 1. Extract content between parentheses
   * 2. Track depth of nested parentheses
   * 3. Split on commas only when depth = 0 (top-level)
   * 4. This ensures nested calls are not split incorrectly
   */
  extractArguments(functionCall: string): string[] {
    const argsMatch = functionCall.match(/\(([^)]*)\)/);
    if (!argsMatch) return [];

    const argsStr = argsMatch[1];
    const args: string[] = [];
    let depth = 0; // Track nesting depth of parentheses
    let current = ''; // Current argument being built

    // Parse character by character, tracking nested parentheses
    for (const char of argsStr) {
      if (char === '(') {
        depth++; // Enter nested call
      } else if (char === ')') {
        depth--; // Exit nested call
      } else if (char === ',' && depth === 0) {
        // Only split on comma when at top level (depth = 0)
        // This prevents splitting nested function calls
        args.push(current.trim());
        current = '';
        continue;
      }
      current += char; // Accumulate characters for current argument
    }

    // Don't forget the last argument (after final comma or if no commas)
    if (current.trim()) {
      args.push(current.trim());
    }

    return args;
  }
}

/**
 * Default singleton instance
 */
export const defaultTaintSinkRegistry = new TaintSinkRegistry();

