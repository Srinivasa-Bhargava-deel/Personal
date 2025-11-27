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
/**
 * TAINT SOURCE REGISTRY CLASS
 * 
 * Manages a comprehensive registry of functions and operations that introduce
 * tainted (untrusted) data into the program. This registry is used by the
 * taint analyzer to identify where taint originates.
 * 
 * Features:
 * - Pre-configured with common taint sources (user input, file I/O, network, etc.)
 * - Support for custom taint sources
 * - Categorization by input channel type
 * - Argument index tracking (which argument receives tainted data)
 */
export class TaintSourceRegistry {
  /**
   * REGISTRY STORAGE
   * 
   * Maps function names to their taint source definitions.
   * This allows O(1) lookup when checking if a function is a taint source.
   */
  private sources: Map<string, TaintSource> = new Map();
  
  /**
   * CUSTOM SOURCES TRACKING
   * 
   * Tracks which sources were added by the user (not default sources).
   * This allows selective removal of custom sources without affecting defaults.
   */
  private customSources: Set<string> = new Set();

  constructor() {
    /**
     * INITIALIZATION
     * 
     * Populate registry with default taint sources covering all major
     * input channels: user input, file I/O, network, environment, etc.
     */
    this.initializeDefaultSources();
  }

  /**
   * INITIALIZE DEFAULT TAINT SOURCES
   * 
   * Populates the registry with comprehensive default taint sources.
   * These cover all major input channels that can introduce untrusted data:
   * 
   * 1. User Input: scanf, gets, fgets, cin, etc.
   * 2. File I/O: fread, fscanf, read, etc.
   * 3. Network: recv, recvfrom, SSL_read, etc.
   * 4. Environment: getenv, environ, etc.
   * 5. Command Line: argv, argc
   * 6. Database: sqlite3_column_text, mysql_fetch_row, etc.
   * 7. Configuration: json_parse, yaml_parse, xml_parse, etc.
   * 
   * Each source includes:
   * - Function name
   * - Category (input channel type)
   * - Argument index (which argument receives tainted data, -1 for return value)
   * - Taint type (string, buffer, integer, pointer)
   * - Optional description
   */
  private initializeDefaultSources(): void {
    /**
     * USER INPUT SOURCES
     * 
     * Functions that read data directly from user input (stdin, keyboard, etc.).
     * These are the most common taint sources in interactive programs.
     * 
     * Examples:
     * - scanf("%d", &x): Reads formatted input, taints argument at index 1
     * - gets(buffer): Reads line, taints argument at index 0
     * - cin >> x: C++ input stream, taints variable x
     */
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

    /**
     * FILE I/O SOURCES
     * 
     * Functions that read data from files. File contents are considered
     * untrusted because files can be modified by attackers or contain
     * malicious data.
     * 
     * Examples:
     * - fread(buffer, size, count, file): Reads from file, taints buffer
     * - fscanf(file, "%s", buffer): Formatted read from file
     * - read(fd, buffer, size): Low-level file read
     */
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

    /**
     * NETWORK SOURCES
     * 
     * Functions that receive data over the network (sockets, SSL connections).
     * Network data is highly untrusted as it comes from potentially malicious
     * remote sources.
     * 
     * Examples:
     * - recv(socket, buffer, size): Receive from socket
     * - recvfrom(socket, buffer, size, flags, addr): Receive with address
     * - SSL_read(ssl, buffer, size): SSL-encrypted receive
     */
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

    /**
     * ENVIRONMENT SOURCES
     * 
     * Functions that read environment variables. Environment variables can
     * be set by attackers or contain configuration data that should be validated.
     * 
     * Examples:
     * - getenv("VAR"): Get environment variable (returns tainted string)
     * - environ: Global environment variables array
     */
    // Environment Sources
    const environmentSources: TaintSource[] = [
      { functionName: 'getenv', category: 'environment', argumentIndex: -1, taintType: 'string', description: 'Get environment variable' },
      { functionName: 'secure_getenv', category: 'environment', argumentIndex: -1, taintType: 'string', description: 'Secure getenv' },
      { functionName: 'environ', category: 'environment', argumentIndex: 0, taintType: 'string', description: 'Environment variables array' },
    ];

    /**
     * COMMAND LINE SOURCES
     * 
     * Command line arguments passed to the program. These are user-controlled
     * and should be validated before use.
     * 
     * Examples:
     * - argv[1]: First command line argument
     * - argc: Argument count (less commonly tainted, but tracked)
     */
    // Command Line Sources
    const commandLineSources: TaintSource[] = [
      { functionName: 'argv', category: 'command_line', argumentIndex: 0, taintType: 'string', description: 'Command line arguments' },
      { functionName: 'argc', category: 'command_line', argumentIndex: -1, taintType: 'integer', description: 'Command line argument count' },
    ];

    /**
     * DATABASE SOURCES
     * 
     * Functions that retrieve data from databases. Database query results
     * can contain untrusted data if the database itself is compromised or
     * if queries return user-generated content.
     * 
     * Examples:
     * - sqlite3_column_text(stmt, col): Get text column from SQLite
     * - mysql_fetch_row(result): Fetch row from MySQL
     * - PQgetvalue(result, row, col): Get value from PostgreSQL
     */
    // Database Sources (if database integration exists)
    const databaseSources: TaintSource[] = [
      { functionName: 'sqlite3_column_text', category: 'database', argumentIndex: -1, taintType: 'string', description: 'SQLite column text result' },
      { functionName: 'sqlite3_column_blob', category: 'database', argumentIndex: -1, taintType: 'buffer', description: 'SQLite column blob result' },
      { functionName: 'mysql_fetch_row', category: 'database', argumentIndex: 0, taintType: 'string', description: 'MySQL fetch row result' },
      { functionName: 'PQgetvalue', category: 'database', argumentIndex: -1, taintType: 'string', description: 'PostgreSQL get value' },
    ];

    /**
     * CONFIGURATION SOURCES
     * 
     * Functions that parse configuration files (JSON, YAML, XML, INI).
     * Configuration files can be modified by attackers or contain
     * malicious data that should be validated.
     * 
     * Examples:
     * - json_parse(file): Parse JSON configuration
     * - yaml_parse(file): Parse YAML configuration
     * - xml_parse(file): Parse XML configuration
     */
    // Configuration Sources
    const configurationSources: TaintSource[] = [
      { functionName: 'json_parse', category: 'configuration', argumentIndex: 0, taintType: 'string', description: 'JSON parsing' },
      { functionName: 'yaml_parse', category: 'configuration', argumentIndex: 0, taintType: 'string', description: 'YAML parsing' },
      { functionName: 'xml_parse', category: 'configuration', argumentIndex: 0, taintType: 'string', description: 'XML parsing' },
      { functionName: 'ini_parse', category: 'configuration', argumentIndex: 0, taintType: 'string', description: 'INI file parsing' },
    ];

    /**
     * REGISTER ALL SOURCES
     * 
     * Combine all source categories into a single array and register them
     * in the sources Map. This allows efficient lookup by function name.
     * 
     * Registration order doesn't matter since Map keys are unique.
     * If a function appears in multiple categories (e.g., read() can be
     * both file I/O and network), the last registration wins.
     */
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

    // Add each source to the registry Map
    allSources.forEach(source => {
      this.sources.set(source.functionName, source);
    });
  }

  /**
   * CHECK IF FUNCTION IS TAINT SOURCE
   * 
   * Determines if a function is registered as a taint source (either default
   * or custom). This is the primary lookup method used by the taint analyzer.
   * 
   * @param functionName - Name of function to check
   * @returns true if function is a known taint source
   */
  isTaintSource(functionName: string): boolean {
    // Check both default sources and custom sources
    return this.sources.has(functionName) || this.customSources.has(functionName);
  }

  /**
   * GET TAINT SOURCE INFORMATION
   * 
   * Retrieves the complete taint source definition for a function.
   * This includes category, argument index, taint type, and description.
   * 
   * @param functionName - Name of function to look up
   * @returns TaintSource object or undefined if not found
   */
  getTaintSource(functionName: string): TaintSource | undefined {
    return this.sources.get(functionName);
  }

  /**
   * GET ALL TAINT SOURCES
   * 
   * Returns all registered taint sources (default + custom).
   * Useful for debugging, logging, or UI display.
   * 
   * @returns Array of all taint source definitions
   */
  getAllSources(): TaintSource[] {
    return Array.from(this.sources.values());
  }

  /**
   * GET SOURCES BY CATEGORY
   * 
   * Filters taint sources by category (user_input, file_io, network, etc.).
   * Useful for category-specific analysis or reporting.
   * 
   * @param category - Category to filter by
   * @returns Array of taint sources in the specified category
   */
  getSourcesByCategory(category: TaintSourceCategory): TaintSource[] {
    return Array.from(this.sources.values()).filter(s => s.category === category);
  }

  /**
   * ADD CUSTOM TAINT SOURCE
   * 
   * Allows users to register custom taint sources for application-specific
   * functions. Custom sources are tracked separately so they can be removed
   * without affecting default sources.
   * 
   * Use cases:
   * - Application-specific input functions
   * - Third-party library functions that read untrusted data
   * - Custom protocol parsers
   * 
   * @param source - TaintSource definition to add
   */
  addCustomSource(source: TaintSource): void {
    this.sources.set(source.functionName, source);
    this.customSources.add(source.functionName);
  }

  /**
   * REMOVE CUSTOM TAINT SOURCE
   * 
   * Removes a custom taint source that was previously added. Only removes
   * sources that were added via addCustomSource(), not default sources.
   * This prevents accidental removal of built-in taint sources.
   * 
   * @param functionName - Name of custom source to remove
   */
  removeCustomSource(functionName: string): void {
    // Only remove if it's a custom source (not a default source)
    if (this.customSources.has(functionName)) {
      this.sources.delete(functionName);
      this.customSources.delete(functionName);
    }
  }

  /**
   * MATCH FUNCTION CALL AGAINST SOURCE PATTERNS
   * 
   * Attempts to match a function call string against registered taint sources.
   * Supports both regex pattern matching and simple string matching.
   * 
   * This is useful when you have a function call string (e.g., from CFG)
   * and need to determine if it's a taint source without extracting the
   * function name first.
   * 
   * Matching strategies:
   * 1. If source has a regex pattern, test against that pattern
   * 2. Otherwise, check if function call contains "functionName("
   * 
   * @param functionCall - Function call string to match (e.g., "scanf("%d", &x)")
   * @returns Matching TaintSource or undefined if no match
   */
  matchSource(functionCall: string): TaintSource | undefined {
    // Iterate through all registered sources
    for (const source of this.sources.values()) {
      // Try regex pattern matching first (if pattern is defined)
      if (source.pattern) {
        if (source.pattern.test(functionCall)) {
          return source;
        }
      } else {
        // Fallback to simple string matching: check if call contains "functionName("
        // This handles cases like "scanf("%d", &x)" matching "scanf"
        if (functionCall.includes(source.functionName + '(')) {
          return source;
        }
      }
    }
    return undefined;
  }

  /**
   * EXTRACT TARGET VARIABLE FROM FUNCTION CALL
   * 
   * Extracts the variable name that receives tainted data from a function call.
   * This is critical for taint analysis - we need to know which variable
   * becomes tainted when a taint source function is called.
   * 
   * Different functions have different argument patterns:
   * - scanf("%s", &buffer): Taints buffer (second argument, with &)
   * - gets(buffer): Taints buffer (first argument)
   * - read(fd, buffer, size): Taints buffer (second argument)
   * - getenv("VAR"): Taints return value (assigned to variable)
   * 
   * @param functionCall - Function call string (e.g., "scanf("%d", &x)")
   * @param source - TaintSource definition for the function
   * @returns Variable name that receives tainted data, or null if extraction fails
   */
  extractTargetVariable(functionCall: string, source: TaintSource): string | null {
    /**
     * SCANF/FSCANF PATTERN
     * 
     * scanf and fscanf use format strings and pointer arguments.
     * Pattern: scanf("%s", &buffer) -> extract "buffer"
     * 
     * The tainted variable is the second argument (index 1), which is
     * passed by reference using & operator.
     */
    if (source.functionName === 'scanf' || source.functionName === 'fscanf') {
      // Match pattern: &variable (pointer argument)
      const match = functionCall.match(/&\s*([a-zA-Z_][a-zA-Z0-9_]*)/);
      return match ? match[1] : null;
    }

    /**
     * GETS/FGETS PATTERN
     * 
     * gets and fgets write directly to a buffer argument.
     * Pattern: gets(buffer) -> extract "buffer"
     * Pattern: fgets(buffer, size, stream) -> extract "buffer" (first arg)
     * 
     * The tainted variable is the first argument (index 0), which is
     * the destination buffer.
     */
    if (source.functionName === 'gets' || source.functionName === 'fgets') {
      // Extract first argument (argumentIndex 0) - this is the buffer that gets tainted
      const args = this.extractArguments(functionCall);
      if (args.length > 0) {
        // Remove any leading/trailing whitespace and extract variable name
        const firstArg = args[0].trim();
        // Handle cases like "buffer", "*buffer", "&buffer"
        // Pattern matches: optional & or *, followed by variable name
        const varMatch = firstArg.match(/(?:[&*]\s*)?([a-zA-Z_][a-zA-Z0-9_]*)/);
        return varMatch ? varMatch[1] : null;
      }
      // Fallback: try single argument pattern for simple cases
      const singleArgMatch = functionCall.match(/\(([a-zA-Z_][a-zA-Z0-9_]*)/);
      return singleArgMatch ? singleArgMatch[1] : null;
    }

    /**
     * READ/RECV PATTERN
     * 
     * read and recv write to a buffer argument at a specific index.
     * Pattern: read(fd, buffer, size) -> extract "buffer" (second arg, index 1)
     * 
     * The tainted variable is at source.argumentIndex (typically 1 for buffer).
     */
    if (source.functionName === 'read' || source.functionName === 'recv') {
      const args = this.extractArguments(functionCall);
      if (args.length > source.argumentIndex && source.argumentIndex >= 0) {
        // Remove pointer operators (&, *) and whitespace
        return args[source.argumentIndex].replace(/[&*]/g, '').trim();
      }
    }

    /**
     * GETENV PATTERN
     * 
     * getenv returns a tainted value that is assigned to a variable.
     * Pattern: var = getenv("VAR") -> extract "var"
     * 
     * Since getenv returns a value (not writing to an argument), we need
     * to extract the variable from the assignment statement.
     */
    if (source.functionName === 'getenv') {
      // Return value is assigned to a variable, extract from assignment
      // Pattern: variable = getenv(...)
      const assignmentMatch = functionCall.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*getenv/);
      return assignmentMatch ? assignmentMatch[1] : null;
    }

    /**
     * DEFAULT PATTERN
     * 
     * For most functions, extract the variable from the argument at
     * source.argumentIndex. This handles the general case where tainted
     * data is passed as a function argument.
     */
    const args = this.extractArguments(functionCall);
    if (args.length > source.argumentIndex && source.argumentIndex >= 0) {
      // Remove pointer operators and extract variable name
      return args[source.argumentIndex].replace(/[&*]/g, '').trim();
    }

    return null;
  }

  /**
   * EXTRACT ARGUMENTS FROM FUNCTION CALL
   * 
   * Parses arguments from a function call string, correctly handling
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
   * @param functionCall - Function call string (e.g., "scanf("%d", &x)")
   * @returns Array of argument strings
   */
  private extractArguments(functionCall: string): string[] {
    // Extract content between parentheses
    const argsMatch = functionCall.match(/\(([^)]*)\)/);
    if (!argsMatch) return [];

    const argsStr = argsMatch[1];
    const args: string[] = [];
    let depth = 0; // Track nesting depth of parentheses
    let current = ''; // Current argument being built

    /**
     * PARSE ARGUMENTS WITH DEPTH TRACKING
     * 
     * Iterate through characters, tracking parentheses depth.
     * Only split on commas when depth = 0 (top level).
     * This correctly handles nested function calls in arguments.
     */
    for (const char of argsStr) {
      if (char === '(') {
        depth++; // Enter nested parentheses
      } else if (char === ')') {
        depth--; // Exit nested parentheses
      } else if (char === ',' && depth === 0) {
        // Top-level comma: split argument
        args.push(current.trim());
        current = '';
        continue;
      }
      current += char; // Accumulate character
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
export const defaultTaintSourceRegistry = new TaintSourceRegistry();

