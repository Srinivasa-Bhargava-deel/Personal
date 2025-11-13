/**
 * Taint Source Registry
 * 
 * Comprehensive registry of functions and operations that introduce tainted data
 * into the program. Covers all major input channels: user input, file I/O,
 * network, environment variables, command line arguments, etc.
 * 
 * Phase 1 of Enhanced Taint Analysis Implementation
 */

export type TaintSourceCategory = 
  | 'user_input' 
  | 'file_io' 
  | 'network' 
  | 'environment' 
  | 'command_line' 
  | 'database' 
  | 'configuration';

export type TaintType = 'string' | 'buffer' | 'integer' | 'pointer';

/**
 * Represents a taint source function or operation
 */
export interface TaintSource {
  /** Function name (e.g., "scanf", "fread") */
  functionName: string;
  
  /** Category of taint source */
  category: TaintSourceCategory;
  
  /** Which argument index receives tainted data (0-based) */
  argumentIndex: number;
  
  /** Type of tainted data */
  taintType: TaintType;
  
  /** Optional: regex pattern for matching function calls */
  pattern?: RegExp;
  
  /** Optional: description of the source */
  description?: string;
}

/**
 * Registry of all known taint sources
 */
export class TaintSourceRegistry {
  private sources: Map<string, TaintSource> = new Map();
  private customSources: Set<string> = new Set();

  constructor() {
    this.initializeDefaultSources();
  }

  /**
   * Initialize default taint sources covering all major input channels
   */
  private initializeDefaultSources(): void {
    // User Input Sources
    const userInputSources: TaintSource[] = [
      { functionName: 'scanf', category: 'user_input', argumentIndex: 1, taintType: 'string', description: 'Standard input scanning' },
      { functionName: 'gets', category: 'user_input', argumentIndex: 0, taintType: 'buffer', description: 'Read line from stdin (unsafe)' },
      { functionName: 'fgets', category: 'user_input', argumentIndex: 0, taintType: 'buffer', description: 'Read line from stream' },
      { functionName: 'getchar', category: 'user_input', argumentIndex: -1, taintType: 'integer', description: 'Read character from stdin' },
      { functionName: 'getline', category: 'user_input', argumentIndex: 0, taintType: 'buffer', description: 'Read line from stream' },
      { functionName: 'read', category: 'user_input', argumentIndex: 1, taintType: 'buffer', description: 'Read from file descriptor' },
      { functionName: 'readline', category: 'user_input', argumentIndex: 0, taintType: 'string', description: 'Read line from stream' },
      // C++ iostream
      { functionName: 'cin', category: 'user_input', argumentIndex: 0, taintType: 'string', description: 'C++ standard input stream' },
      { functionName: 'getline', category: 'user_input', argumentIndex: 1, taintType: 'string', description: 'C++ getline from stream' },
    ];

    // File I/O Sources
    const fileIOSources: TaintSource[] = [
      { functionName: 'fread', category: 'file_io', argumentIndex: 0, taintType: 'buffer', description: 'Read from file' },
      { functionName: 'fscanf', category: 'file_io', argumentIndex: 1, taintType: 'string', description: 'Formatted read from file' },
      { functionName: 'fgets', category: 'file_io', argumentIndex: 0, taintType: 'buffer', description: 'Read line from file' },
      { functionName: 'read', category: 'file_io', argumentIndex: 1, taintType: 'buffer', description: 'Read from file descriptor' },
      { functionName: 'pread', category: 'file_io', argumentIndex: 1, taintType: 'buffer', description: 'Positional read from file' },
      { functionName: 'mmap', category: 'file_io', argumentIndex: -1, taintType: 'pointer', description: 'Memory map file' },
      { functionName: 'pread64', category: 'file_io', argumentIndex: 1, taintType: 'buffer', description: '64-bit positional read' },
      // C++ file operations
      { functionName: 'ifstream', category: 'file_io', argumentIndex: 0, taintType: 'string', description: 'C++ input file stream' },
    ];

    // Network Sources
    const networkSources: TaintSource[] = [
      { functionName: 'recv', category: 'network', argumentIndex: 1, taintType: 'buffer', description: 'Receive from socket' },
      { functionName: 'recvfrom', category: 'network', argumentIndex: 1, taintType: 'buffer', description: 'Receive from socket with address' },
      { functionName: 'recvmsg', category: 'network', argumentIndex: 1, taintType: 'buffer', description: 'Receive message from socket' },
      { functionName: 'read', category: 'network', argumentIndex: 1, taintType: 'buffer', description: 'Read from socket descriptor' },
      { functionName: 'SSL_read', category: 'network', argumentIndex: 1, taintType: 'buffer', description: 'SSL read from socket' },
      { functionName: 'SSL_recv', category: 'network', argumentIndex: 1, taintType: 'buffer', description: 'SSL receive from socket' },
      { functionName: 'recv_ex', category: 'network', argumentIndex: 1, taintType: 'buffer', description: 'Extended receive' },
    ];

    // Environment Sources
    const environmentSources: TaintSource[] = [
      { functionName: 'getenv', category: 'environment', argumentIndex: -1, taintType: 'string', description: 'Get environment variable' },
      { functionName: 'secure_getenv', category: 'environment', argumentIndex: -1, taintType: 'string', description: 'Secure getenv' },
      { functionName: 'environ', category: 'environment', argumentIndex: 0, taintType: 'string', description: 'Environment variables array' },
    ];

    // Command Line Sources
    const commandLineSources: TaintSource[] = [
      { functionName: 'argv', category: 'command_line', argumentIndex: 0, taintType: 'string', description: 'Command line arguments' },
      { functionName: 'argc', category: 'command_line', argumentIndex: -1, taintType: 'integer', description: 'Command line argument count' },
    ];

    // Database Sources (if database integration exists)
    const databaseSources: TaintSource[] = [
      { functionName: 'sqlite3_column_text', category: 'database', argumentIndex: -1, taintType: 'string', description: 'SQLite column text result' },
      { functionName: 'sqlite3_column_blob', category: 'database', argumentIndex: -1, taintType: 'buffer', description: 'SQLite column blob result' },
      { functionName: 'mysql_fetch_row', category: 'database', argumentIndex: 0, taintType: 'string', description: 'MySQL fetch row result' },
      { functionName: 'PQgetvalue', category: 'database', argumentIndex: -1, taintType: 'string', description: 'PostgreSQL get value' },
    ];

    // Configuration Sources
    const configurationSources: TaintSource[] = [
      { functionName: 'json_parse', category: 'configuration', argumentIndex: 0, taintType: 'string', description: 'JSON parsing' },
      { functionName: 'yaml_parse', category: 'configuration', argumentIndex: 0, taintType: 'string', description: 'YAML parsing' },
      { functionName: 'xml_parse', category: 'configuration', argumentIndex: 0, taintType: 'string', description: 'XML parsing' },
      { functionName: 'ini_parse', category: 'configuration', argumentIndex: 0, taintType: 'string', description: 'INI file parsing' },
    ];

    // Register all sources
    const allSources = [
      ...userInputSources,
      ...fileIOSources,
      ...networkSources,
      ...environmentSources,
      ...commandLineSources,
      ...databaseSources,
      ...configurationSources,
    ];

    allSources.forEach(source => {
      this.sources.set(source.functionName, source);
    });
  }

  /**
   * Check if a function is a known taint source
   */
  isTaintSource(functionName: string): boolean {
    return this.sources.has(functionName) || this.customSources.has(functionName);
  }

  /**
   * Get taint source information for a function
   */
  getTaintSource(functionName: string): TaintSource | undefined {
    return this.sources.get(functionName);
  }

  /**
   * Get all taint sources
   */
  getAllSources(): TaintSource[] {
    return Array.from(this.sources.values());
  }

  /**
   * Get taint sources by category
   */
  getSourcesByCategory(category: TaintSourceCategory): TaintSource[] {
    return Array.from(this.sources.values()).filter(s => s.category === category);
  }

  /**
   * Add a custom taint source
   */
  addCustomSource(source: TaintSource): void {
    this.sources.set(source.functionName, source);
    this.customSources.add(source.functionName);
  }

  /**
   * Remove a custom taint source
   */
  removeCustomSource(functionName: string): void {
    if (this.customSources.has(functionName)) {
      this.sources.delete(functionName);
      this.customSources.delete(functionName);
    }
  }

  /**
   * Match function call against source patterns
   * Useful for regex-based matching
   */
  matchSource(functionCall: string): TaintSource | undefined {
    for (const source of this.sources.values()) {
      if (source.pattern) {
        if (source.pattern.test(functionCall)) {
          return source;
        }
      } else if (functionCall.includes(source.functionName + '(')) {
        return source;
      }
    }
    return undefined;
  }

  /**
   * Extract target variable from function call
   * For functions like scanf("%s", &buffer), extract "buffer"
   */
  extractTargetVariable(functionCall: string, source: TaintSource): string | null {
    // For scanf-like functions: scanf("%s", &var) -> var
    if (source.functionName === 'scanf' || source.functionName === 'fscanf') {
      const match = functionCall.match(/&\s*([a-zA-Z_][a-zA-Z0-9_]*)/);
      return match ? match[1] : null;
    }

    // For gets-like functions: gets(buffer) -> buffer, fgets(buffer, size, stream) -> buffer
    if (source.functionName === 'gets' || source.functionName === 'fgets') {
      // Extract first argument (argumentIndex 0) - this is the buffer that gets tainted
      const args = this.extractArguments(functionCall);
      if (args.length > 0) {
        // Remove any leading/trailing whitespace and extract variable name
        const firstArg = args[0].trim();
        // Handle cases like "buffer", "*buffer", "&buffer"
        const varMatch = firstArg.match(/(?:[&*]\s*)?([a-zA-Z_][a-zA-Z0-9_]*)/);
        return varMatch ? varMatch[1] : null;
      }
      // Fallback: try single argument pattern
        const singleArgMatch = functionCall.match(/\(([a-zA-Z_][a-zA-Z0-9_]*)/);
        return singleArgMatch ? singleArgMatch[1] : null;
    }

    // For read-like functions: read(fd, buffer, size) -> buffer
    if (source.functionName === 'read' || source.functionName === 'recv') {
      const args = this.extractArguments(functionCall);
      if (args.length > source.argumentIndex && source.argumentIndex >= 0) {
        return args[source.argumentIndex].replace(/[&*]/g, '').trim();
      }
    }

    // For getenv: getenv("VAR") -> return value
    if (source.functionName === 'getenv') {
      // Return value is assigned to a variable, extract from assignment
      const assignmentMatch = functionCall.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*getenv/);
      return assignmentMatch ? assignmentMatch[1] : null;
    }

    // Default: try to extract from argument index
    const args = this.extractArguments(functionCall);
    if (args.length > source.argumentIndex && source.argumentIndex >= 0) {
      return args[source.argumentIndex].replace(/[&*]/g, '').trim();
    }

    return null;
  }

  /**
   * Extract arguments from function call string
   */
  private extractArguments(functionCall: string): string[] {
    const argsMatch = functionCall.match(/\(([^)]*)\)/);
    if (!argsMatch) return [];

    const argsStr = argsMatch[1];
    const args: string[] = [];
    let depth = 0;
    let current = '';

    for (const char of argsStr) {
      if (char === '(') depth++;
      else if (char === ')') depth--;
      else if (char === ',' && depth === 0) {
        args.push(current.trim());
        current = '';
        continue;
      }
      current += char;
    }

    if (current.trim()) {
      args.push(current.trim());
    }

    return args;
  }
}

/**
 * Default singleton instance
 */
export const defaultTaintSourceRegistry = new TaintSourceRegistry();

