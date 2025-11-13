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
 * Registry of all known taint sinks
 */
export class TaintSinkRegistry {
  private sinks: Map<string, TaintSink> = new Map();
  private customSinks: Set<string> = new Set();

  constructor() {
    this.initializeDefaultSinks();
  }

  /**
   * Initialize default taint sinks covering all major vulnerability types
   */
  private initializeDefaultSinks(): void {
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

    // Register all sinks
    const allSinks = [
      ...sqlSinks,
      ...commandSinks,
      ...formatStringSinks,
      ...pathSinks,
      ...bufferSinks,
      ...codeSinks,
    ];

    allSinks.forEach(sink => {
      this.sinks.set(sink.functionName, sink);
    });
  }

  /**
   * Check if a function is a known taint sink
   */
  isTaintSink(functionName: string): boolean {
    return this.sinks.has(functionName) || this.customSinks.has(functionName);
  }

  /**
   * Get taint sink information for a function
   */
  getTaintSink(functionName: string): TaintSink | undefined {
    return this.sinks.get(functionName);
  }

  /**
   * Get all taint sinks
   */
  getAllSinks(): TaintSink[] {
    return Array.from(this.sinks.values());
  }

  /**
   * Get taint sinks by category
   */
  getSinksByCategory(category: TaintSinkCategory): TaintSink[] {
    return Array.from(this.sinks.values()).filter(s => s.category === category);
  }

  /**
   * Get taint sinks by severity
   */
  getSinksBySeverity(severity: VulnerabilitySeverity): TaintSink[] {
    return Array.from(this.sinks.values()).filter(s => s.severity === severity);
  }

  /**
   * Add a custom taint sink
   */
  addCustomSink(sink: TaintSink): void {
    this.sinks.set(sink.functionName, sink);
    this.customSinks.add(sink.functionName);
  }

  /**
   * Remove a custom taint sink
   */
  removeCustomSink(functionName: string): void {
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

