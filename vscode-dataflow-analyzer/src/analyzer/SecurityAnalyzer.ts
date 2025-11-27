/**
 * Security Vulnerability Analyzer for Exploit Post-Mortems
 * 
 * This module detects security vulnerabilities in C++ code by analyzing:
 * 1. Tainted data flow to security sinks (SQL injection, command injection, etc.)
 * 2. Unsafe buffer operations without bounds checking
 * 3. Memory safety issues (use-after-free, double free)
 * 4. Format string vulnerabilities
 * 5. Unsafe function calls
 * 6. Uninitialized variable usage
 * 
 * The analyzer integrates with taint analysis to track data flow from sources
 * (user input, file I/O, network) to security sinks (dangerous functions).
 * 
 * Academic Foundation:
 * - "Flow-Sensitive Pointer Analysis" (Reps, Horwitz, Sagiv, 1995)
 * - "Static Analysis for Security" (Livshits & Lam, 2005)
 * - CWE (Common Weakness Enumeration) database
 */

import { BasicBlock, FunctionCFG, Statement, StatementType } from '../types';
import { TaintInfo } from '../types';
import { LoggingConfig } from '../utils/LoggingConfig';

export interface Vulnerability {
  id: string;
  type: VulnerabilityType;
  severity: Severity;
  location: {
    file: string;
    line: number;
    column: number;
    blockId: string;
    statementId: string;
  };
  description: string;
  sourceToSinkPath: string[];
  exploitability: Exploitability;
  cweId?: string;
  recommendation?: string;
}

export enum VulnerabilityType {
  BUFFER_OVERFLOW = 'Buffer Overflow',
  USE_AFTER_FREE = 'Use After Free',
  DOUBLE_FREE = 'Double Free',
  NULL_POINTER_DEREFERENCE = 'Null Pointer Dereference',
  FORMAT_STRING = 'Format String Vulnerability',
  INTEGER_OVERFLOW = 'Integer Overflow',
  RACE_CONDITION = 'Race Condition',
  UNSAFE_FUNCTION = 'Unsafe Function Call',
  UNINITIALIZED_VARIABLE = 'Uninitialized Variable',
  COMMAND_INJECTION = 'Command Injection',
  SQL_INJECTION = 'SQL Injection',
  PATH_TRAVERSAL = 'Path Traversal',
  ARBITRARY_WRITE = 'Arbitrary Write',
  ARBITRARY_READ = 'Arbitrary Read'
}

export enum Severity {
  CRITICAL = 'Critical',
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
  INFO = 'Info'
}

export enum Exploitability {
  EXPLOITABLE = 'Exploitable',
  PROBABLY_EXPLOITABLE = 'Probably Exploitable',
  PROBABLY_NOT_EXPLOITABLE = 'Probably Not Exploitable',
  UNKNOWN = 'Unknown'
}

export class SecurityAnalyzer {
  // Security sinks - dangerous functions
  private securitySinks: Map<string, VulnerabilityType> = new Map([
    // Buffer operations
    ['strcpy', VulnerabilityType.BUFFER_OVERFLOW],
    ['strcat', VulnerabilityType.BUFFER_OVERFLOW],
    ['sprintf', VulnerabilityType.BUFFER_OVERFLOW],
    ['gets', VulnerabilityType.BUFFER_OVERFLOW],
    ['scanf', VulnerabilityType.BUFFER_OVERFLOW],
    ['fscanf', VulnerabilityType.BUFFER_OVERFLOW],
    ['sscanf', VulnerabilityType.BUFFER_OVERFLOW],
    ['memcpy', VulnerabilityType.BUFFER_OVERFLOW],
    ['memmove', VulnerabilityType.BUFFER_OVERFLOW],
    ['strncpy', VulnerabilityType.BUFFER_OVERFLOW], // Can be unsafe if not used correctly
    
    // Format strings
    ['printf', VulnerabilityType.FORMAT_STRING],
    ['fprintf', VulnerabilityType.FORMAT_STRING],
    ['sprintf', VulnerabilityType.FORMAT_STRING],
    ['snprintf', VulnerabilityType.FORMAT_STRING],
    
    // Memory management
    ['free', VulnerabilityType.DOUBLE_FREE],
    ['malloc', VulnerabilityType.USE_AFTER_FREE],
    ['calloc', VulnerabilityType.USE_AFTER_FREE],
    ['realloc', VulnerabilityType.USE_AFTER_FREE],
    
    // Command execution
    ['system', VulnerabilityType.COMMAND_INJECTION],
    ['popen', VulnerabilityType.COMMAND_INJECTION],
    ['exec', VulnerabilityType.COMMAND_INJECTION],
    ['execve', VulnerabilityType.COMMAND_INJECTION],
    ['execvp', VulnerabilityType.COMMAND_INJECTION],
    
    // File operations
    ['fopen', VulnerabilityType.PATH_TRAVERSAL],
    ['open', VulnerabilityType.PATH_TRAVERSAL],
    ['chmod', VulnerabilityType.PATH_TRAVERSAL],
    ['chown', VulnerabilityType.PATH_TRAVERSAL],
    
    // SQL
    ['mysql_query', VulnerabilityType.SQL_INJECTION],
    ['sqlite3_exec', VulnerabilityType.SQL_INJECTION],
    
    // Pointer operations
    ['*', VulnerabilityType.NULL_POINTER_DEREFERENCE], // Dereference
  ]);

  // Taint sources
  private taintSources: Set<string> = new Set([
    'scanf', 'gets', 'fgets', 'read', 'recv', 'recvfrom',
    'fread', 'getenv', 'argv', 'getc', 'getchar'
  ]);

  /**
   * Analyze function for security vulnerabilities
   * 
   * Performs comprehensive security analysis by checking multiple vulnerability
   * patterns. Combines taint analysis results with pattern matching to identify
   * security issues.
   * 
   * @param functionCFG - Function control flow graph to analyze
   * @param taintAnalysis - Taint analysis results mapping variable names to taint info
   * @param filePath - Path to source file for location reporting
   * @returns Array of detected vulnerabilities with severity and recommendations
   */
  analyzeVulnerabilities(
    functionCFG: FunctionCFG,
    taintAnalysis: Map<string, TaintInfo[]>,
    filePath: string
  ): Vulnerability[] {
    LoggingConfig.section('SecurityAnalysis', `VULNERABILITY ANALYSIS: ${functionCFG.name}`);
    LoggingConfig.log('SecurityAnalysis', `Function: ${functionCFG.name}`);
    LoggingConfig.log('SecurityAnalysis', `File: ${filePath}`);
    LoggingConfig.log('SecurityAnalysis', `Blocks: ${functionCFG.blocks.size}`);
    LoggingConfig.log('SecurityAnalysis', `Taint entries: ${taintAnalysis.size}`);
    
    const analysisStartTime = Date.now();
    const vulnerabilities: Vulnerability[] = [];

    // 1. Check for tainted data reaching security sinks
    LoggingConfig.subsection('VulnerabilityDetection', '1. Detecting tainted sink usage');
    const taintedSinkVulns = this.detectTaintedSinkUsage(functionCFG, taintAnalysis, filePath);
    vulnerabilities.push(...taintedSinkVulns);
    LoggingConfig.log('VulnerabilityDetection', `Tainted sink vulnerabilities: ${taintedSinkVulns.length}`);

    // 2. Check for buffer operations without bounds checking
    LoggingConfig.subsection('VulnerabilityDetection', '2. Detecting buffer overflows');
    const bufferOverflowVulns = this.detectBufferOverflows(functionCFG, filePath);
    vulnerabilities.push(...bufferOverflowVulns);
    LoggingConfig.log('VulnerabilityDetection', `Buffer overflow vulnerabilities: ${bufferOverflowVulns.length}`);

    // 3. Check for use-after-free patterns
    LoggingConfig.subsection('VulnerabilityDetection', '3. Detecting use-after-free');
    const useAfterFreeVulns = this.detectUseAfterFree(functionCFG, filePath);
    vulnerabilities.push(...useAfterFreeVulns);
    LoggingConfig.log('VulnerabilityDetection', `Use-after-free vulnerabilities: ${useAfterFreeVulns.length}`);

    // 4. Check for double free
    LoggingConfig.subsection('VulnerabilityDetection', '4. Detecting double free');
    const doubleFreeVulns = this.detectDoubleFree(functionCFG, filePath);
    vulnerabilities.push(...doubleFreeVulns);
    LoggingConfig.log('VulnerabilityDetection', `Double free vulnerabilities: ${doubleFreeVulns.length}`);

    // 5. Check for format string vulnerabilities
    LoggingConfig.subsection('VulnerabilityDetection', '5. Detecting format string vulnerabilities');
    const formatStringVulns = this.detectFormatStringVulns(functionCFG, taintAnalysis, filePath);
    vulnerabilities.push(...formatStringVulns);
    LoggingConfig.log('VulnerabilityDetection', `Format string vulnerabilities: ${formatStringVulns.length}`);

    // 6. Check for unsafe function calls
    LoggingConfig.subsection('VulnerabilityDetection', '6. Detecting unsafe function calls');
    const unsafeFunctionVulns = this.detectUnsafeFunctions(functionCFG, filePath);
    vulnerabilities.push(...unsafeFunctionVulns);
    LoggingConfig.log('VulnerabilityDetection', `Unsafe function vulnerabilities: ${unsafeFunctionVulns.length}`);

    // 7. Check for uninitialized variables
    LoggingConfig.subsection('VulnerabilityDetection', '7. Detecting uninitialized variables');
    const uninitializedVulns = this.detectUninitializedVariables(functionCFG, filePath);
    vulnerabilities.push(...uninitializedVulns);
    LoggingConfig.log('VulnerabilityDetection', `Uninitialized variable vulnerabilities: ${uninitializedVulns.length}`);

    const analysisTimeMs = Date.now() - analysisStartTime;
    LoggingConfig.section('SecurityAnalysis', `VULNERABILITY ANALYSIS COMPLETE: ${functionCFG.name}`);
    LoggingConfig.log('SecurityAnalysis', `Total vulnerabilities: ${vulnerabilities.length}`);
    LoggingConfig.log('SecurityAnalysis', `Analysis time: ${analysisTimeMs}ms`);
    
    // Log vulnerability breakdown by type
    const vulnByType: Record<string, number> = {};
    vulnerabilities.forEach(v => {
      vulnByType[v.type] = (vulnByType[v.type] || 0) + 1;
    });
    LoggingConfig.table('VulnerabilityDetection', 'Vulnerability Breakdown by Type', vulnByType);
    
    // Log vulnerability breakdown by severity
    const vulnBySeverity: Record<string, number> = {};
    vulnerabilities.forEach(v => {
      vulnBySeverity[v.severity] = (vulnBySeverity[v.severity] || 0) + 1;
    });
    LoggingConfig.table('VulnerabilityDetection', 'Vulnerability Breakdown by Severity', vulnBySeverity);

    return vulnerabilities;
  }

  /**
   * Detect tainted data reaching security sinks
   * 
   * Identifies vulnerabilities where tainted (untrusted) data flows to dangerous
   * functions without sanitization. This is the primary taint-based vulnerability
   * detection mechanism.
   * 
   * Algorithm:
   * 1. Iterate through all function calls in CFG
   * 2. Check if called function is a security sink
   * 3. Check if any arguments are tainted
   * 4. If tainted data reaches sink, create vulnerability report
   * 5. Track source-to-sink path for exploit analysis
   * 
   * @param functionCFG - Function CFG to analyze
   * @param taintAnalysis - Taint analysis results
   * @param filePath - Source file path
   * @returns Array of taint-based vulnerabilities
   */
  private detectTaintedSinkUsage(
    functionCFG: FunctionCFG,
    taintAnalysis: Map<string, TaintInfo[]>,
    filePath: string
  ): Vulnerability[] {
    /**
     * TAINTED SINK DETECTION ALGORITHM
     * 
     * This method implements the core taint-based vulnerability detection:
     * 1. Iterate through all function calls in the CFG
     * 2. Check if called function is a known security sink (dangerous function)
     * 3. For each sink, check if any arguments are tainted (untrusted data)
     * 4. If tainted data reaches sink, create vulnerability report with full path
     * 
     * This is the primary mechanism for detecting SQL injection, command injection,
     * format string vulnerabilities, and other taint-based security issues.
     */
    LoggingConfig.detail('VulnerabilityDetection', 'Scanning for tainted data reaching security sinks');
    const vulnerabilities: Vulnerability[] = [];
    let vulnId = 0; // Unique vulnerability identifier counter
    let sinkCallCount = 0; // Total number of security sink calls found
    let taintedSinkCount = 0; // Number of sinks that receive tainted data

    // Iterate through all basic blocks in the function CFG
    // Each block represents a linear sequence of statements without branches
    functionCFG.blocks.forEach((block, blockId) => {
      // Check each statement in the block for function calls
      block.statements.forEach(stmt => {
        // Only process function call statements (not assignments, conditionals, etc.)
        if (stmt.type === StatementType.FUNCTION_CALL && stmt.text) {
          // Extract function name using regex: matches identifier followed by opening parenthesis
          // Example: "scanf("%d", &x)" -> "scanf"
          const funcName = stmt.text.match(/(\w+)\s*\(/)?.[1];
          if (!funcName) return; // Skip if function name extraction failed

          // Check if this function is a known security sink (dangerous function)
          // Security sinks are functions that can cause vulnerabilities when given untrusted input
          const vulnType = this.securitySinks.get(funcName);
          if (!vulnType) return; // Not a security sink, skip
          
          sinkCallCount++;
          LoggingConfig.verbose('VulnerabilityDetection', `Found security sink: ${funcName} (type: ${vulnType}) at block ${blockId}`);

          /**
           * TAINT CHECKING FOR SINK ARGUMENTS
           * 
           * For each variable used in the function call arguments, check if it's tainted.
           * A variable is tainted if it originates from an untrusted source (user input,
           * file I/O, network, etc.) and hasn't been sanitized.
           * 
           * If tainted data reaches a security sink, this is a vulnerability.
           */
          stmt.variables?.used.forEach(varName => {
            // Get taint information for this variable
            // A variable can have multiple taint entries if it's tainted from multiple sources
            const taintInfo = taintAnalysis.get(varName);
            
            // Check if variable is tainted (any taint entry with tainted=true)
            if (taintInfo && taintInfo.some(t => t.tainted)) {
              taintedSinkCount++;
              // Get the first taint entry (could be enhanced to track all sources)
              const taint = taintInfo.find(t => t.tainted)!;
              
              /**
               * BUILD SOURCE-TO-SINK PROPAGATION PATH
               * 
               * Track the complete path from taint source to security sink.
               * This path is critical for:
               * 1. Understanding how the vulnerability occurs
               * 2. Debugging false positives
               * 3. Providing actionable remediation guidance
               * 
               * Path format: [source_block, ...intermediate_blocks, sink_block:statement]
               */
              const sourceToSinkPath = [...taint.propagationPath, `${blockId}:${stmt.id || 'unknown'}`];

              LoggingConfig.log('VulnerabilityDetection', `⚠️ Tainted sink detected: ${funcName} receives tainted variable "${varName}" from source "${taint.source}"`);
              LoggingConfig.detail('VulnerabilityDetection', `  Block: ${blockId}, Statement: ${stmt.id || 'unknown'}, Path: [${sourceToSinkPath.join(' -> ')}]`);

              /**
               * CREATE VULNERABILITY REPORT
               * 
               * Build comprehensive vulnerability object with:
               * - Unique ID for tracking
               * - Vulnerability type (SQL injection, command injection, etc.)
               * - Severity assessment (critical, high, medium, low)
               * - Precise location (file, line, column, block, statement)
               * - Description of the issue
               * - Complete source-to-sink path
               * - Exploitability assessment
               * - CWE (Common Weakness Enumeration) ID for reference
               * - Remediation recommendation
               */
              vulnerabilities.push({
                id: `vuln_${vulnId++}`,
                type: vulnType,
                severity: this.getSeverityForType(vulnType),
                location: {
                  file: filePath,
                  line: stmt.range?.start.line || 0,
                  column: stmt.range?.start.column || 0,
                  blockId,
                  statementId: stmt.id || `stmt_${blockId}`
                },
                description: `Tainted data from "${taint.source}" reaches unsafe function "${funcName}"`,
                sourceToSinkPath,
                exploitability: this.assessExploitability(vulnType, functionCFG, blockId),
                cweId: this.getCWEForType(vulnType),
                recommendation: this.getRecommendationForType(vulnType, funcName)
              });
            }
          });
        }
      });
    });

    LoggingConfig.detail('VulnerabilityDetection', `Security sink analysis: ${sinkCallCount} sink calls checked, ${taintedSinkCount} tainted sinks found`);
    return vulnerabilities;
  }

  /**
   * Detect buffer overflow patterns
   * 
   * Identifies unsafe buffer operations (strcpy, strcat, sprintf, gets) that
   * may cause buffer overflows. Checks for bounds checking in preceding blocks.
   * 
   * @param functionCFG - Function CFG to analyze
   * @param filePath - Source file path
   * @returns Array of buffer overflow vulnerabilities
   */
  /**
   * BUFFER OVERFLOW DETECTION ALGORITHM
   * 
   * Detects unsafe buffer operations that can cause buffer overflows.
   * Buffer overflows occur when data is written beyond the allocated buffer size,
   * potentially overwriting adjacent memory and leading to code execution.
   * 
   * Detection Strategy:
   * 1. Identify calls to unsafe buffer functions (strcpy, strcat, sprintf, gets)
   * 2. Check if bounds checking exists in preceding blocks
   * 3. If no bounds checking found, flag as vulnerability
   * 
   * Limitations:
   * - Simple heuristic: only checks immediate predecessors for bounds checks
   * - Doesn't verify that bounds checks actually protect this specific call
   * - May produce false positives if bounds checking exists but isn't detected
   */
  private detectBufferOverflows(functionCFG: FunctionCFG, filePath: string): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];
    let vulnId = 0;

    // Scan all blocks for unsafe buffer operations
    functionCFG.blocks.forEach((block, blockId) => {
      block.statements.forEach(stmt => {
        if (stmt.type === StatementType.FUNCTION_CALL && stmt.text) {
          // Extract function name from call statement
          const funcName = stmt.text.match(/(\w+)\s*\(/)?.[1];
          if (!funcName) return;

          /**
           * UNSAFE BUFFER FUNCTION CHECK
           * 
           * These functions are inherently unsafe because they don't check buffer bounds:
           * - strcpy: Copies string without size limit
           * - strcat: Concatenates string without size limit
           * - sprintf: Formats string without size limit
           * - gets: Reads line without size limit (deprecated in C11)
           * 
           * Safe alternatives exist: strncpy, strncat, snprintf, fgets
           */
          if (['strcpy', 'strcat', 'sprintf', 'gets'].includes(funcName)) {
            /**
             * BOUNDS CHECKING VERIFICATION
             * 
             * Check if bounds checking exists in predecessor blocks.
             * Bounds checking typically involves:
             * - strlen() calls to check string length
             * - sizeof() to check buffer size
             * - Comparison operators (<, >, <=) checking size
             * 
             * If bounds checking is found, the operation may be safe (false positive reduction).
             */
            const hasBoundsCheck = this.hasBoundsCheck(functionCFG, blockId);

            // Only flag as vulnerability if no bounds checking detected
            if (!hasBoundsCheck) {
              vulnerabilities.push({
                id: `vuln_${vulnId++}`,
                type: VulnerabilityType.BUFFER_OVERFLOW,
                severity: Severity.HIGH,
                location: {
                  file: filePath,
                  line: stmt.range?.start.line || 0,
                  column: stmt.range?.start.column || 0,
                  blockId,
                  statementId: stmt.id || `stmt_${blockId}`
                },
                description: `Unsafe buffer operation "${funcName}" without bounds checking`,
                sourceToSinkPath: [`${blockId}:${stmt.id || 'unknown'}`],
                exploitability: Exploitability.PROBABLY_EXPLOITABLE,
                cweId: 'CWE-120',
                recommendation: `Replace ${funcName} with safer alternative (e.g., strncpy, snprintf) or add bounds checking`
              });
            }
          }
        }
      });
    });

    return vulnerabilities;
  }

  /**
   * Detect use-after-free patterns
   * 
   * Tracks pointer variables that are freed and then used later in the CFG.
   * This is a critical memory safety vulnerability that can lead to exploitation.
   * 
   * Algorithm:
   * 1. Track all free() calls and the pointers they free
   * 2. For each subsequent use of freed pointers, create vulnerability
   * 3. Report the path from free to use
   * 
   * @param functionCFG - Function CFG to analyze
   * @param filePath - Source file path
   * @returns Array of use-after-free vulnerabilities
   */
  /**
   * USE-AFTER-FREE DETECTION ALGORITHM
   * 
   * Detects memory safety vulnerabilities where a pointer is used after being freed.
   * Use-after-free bugs can lead to:
   * - Memory corruption
   * - Code execution (if freed memory is reallocated and controlled by attacker)
   * - Information disclosure
   * 
   * Detection Strategy:
   * 1. Track all free() calls and the pointers they free
   * 2. For each subsequent statement, check if it uses a freed pointer
   * 3. Verify that use occurs after free (CFG traversal order)
   * 4. Report vulnerability with path from free to use
   * 
   * Limitations:
   * - Simple CFG-based check: doesn't verify actual execution order
   * - May produce false positives if pointer is re-assigned after free
   * - Doesn't track pointer aliases (if ptr1 = ptr2, freeing ptr1 affects ptr2)
   */
  private detectUseAfterFree(functionCFG: FunctionCFG, filePath: string): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];
    let vulnId = 0;
    /**
     * FREED POINTER TRACKING
     * 
     * Maps pointer variable names to the block ID where they were freed.
     * This allows us to track which pointers have been freed and where.
     * 
     * Example: freedPointers.get("ptr") -> "B5" means ptr was freed in block B5
     */
    const freedPointers = new Map<string, string>(); // pointer -> blockId where freed

    // Process blocks in CFG order (topological order)
    functionCFG.blocks.forEach((block, blockId) => {
      block.statements.forEach(stmt => {
        /**
         * TRACK FREE() CALLS
         * 
         * When we encounter a free() call, record which pointer is being freed.
         * The free() function deallocates memory, making the pointer invalid.
         * 
         * Note: We track all variables used in the free() call, assuming they're pointers.
         * In practice, free() should only be called with pointer arguments.
         */
        if (stmt.type === StatementType.FUNCTION_CALL && stmt.text?.includes('free(')) {
          stmt.variables?.used.forEach(ptrVar => {
            freedPointers.set(ptrVar, blockId);
          });
        }

        /**
         * CHECK FOR USE AFTER FREE
         * 
         * For each variable used in a statement, check if it's a freed pointer.
         * If a freed pointer is used (dereferenced, passed as argument, etc.),
         * this is a use-after-free vulnerability.
         * 
         * Note: We check all variable uses, not just dereferences, because:
         * - Passing freed pointer as argument is dangerous
         * - Comparing freed pointer is dangerous
         * - Any use of freed pointer can lead to undefined behavior
         */
        if (stmt.variables?.used) {
          stmt.variables.used.forEach(varName => {
            if (freedPointers.has(varName)) {
              const freedAt = freedPointers.get(varName)!;
              
              /**
               * VERIFY USE OCCURS AFTER FREE
               * 
               * Check if this use block comes after the free block in CFG order.
               * This is a simple heuristic - in practice, we'd need proper CFG traversal
               * to verify reachability and execution order.
               */
              if (this.isAfterFree(functionCFG, freedAt, blockId)) {
                vulnerabilities.push({
                  id: `vuln_${vulnId++}`,
                  type: VulnerabilityType.USE_AFTER_FREE,
                  severity: Severity.CRITICAL,
                  location: {
                    file: filePath,
                    line: stmt.range?.start.line || 0,
                    column: stmt.range?.start.column || 0,
                    blockId,
                    statementId: stmt.id || `stmt_${blockId}`
                  },
                  description: `Use of pointer "${varName}" after it was freed at block ${freedAt}`,
                  sourceToSinkPath: [freedAt, `${blockId}:${stmt.id || 'unknown'}`],
                  exploitability: Exploitability.EXPLOITABLE,
                  cweId: 'CWE-416',
                  recommendation: 'Set pointer to NULL after free() and check for NULL before use'
                });
              }
            }
          });
        }
      });
    });

    return vulnerabilities;
  }

  /**
   * Detect double free vulnerabilities
   * 
   * Identifies cases where the same pointer is freed multiple times.
   * This is a critical memory safety issue that can lead to exploitation.
   * 
   * @param functionCFG - Function CFG to analyze
   * @param filePath - Source file path
   * @returns Array of double free vulnerabilities
   */
  /**
   * DOUBLE FREE DETECTION ALGORITHM
   * 
   * Detects cases where the same pointer is freed multiple times.
   * Double free bugs can lead to:
   * - Memory corruption
   * - Heap metadata corruption
   * - Code execution (if heap metadata is controlled by attacker)
   * 
   * Detection Strategy:
   * 1. Track all pointers that have been freed using a Set
   * 2. When encountering a free() call, check if pointer was already freed
   * 3. If already freed, report double free vulnerability
   * 4. Otherwise, add pointer to freed set
   * 
   * This is simpler than use-after-free detection because we don't need
   * to track where the pointer was freed, only whether it was freed.
   */
  private detectDoubleFree(functionCFG: FunctionCFG, filePath: string): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];
    let vulnId = 0;
    /**
     * FREED POINTER SET
     * 
     * Tracks which pointers have been freed at least once.
     * If a pointer appears in this set and is freed again, it's a double free.
     * 
     * Using a Set provides O(1) lookup time for checking if pointer was freed.
     */
    const freedPointers = new Set<string>();

    // Scan all blocks for free() calls
    functionCFG.blocks.forEach((block, blockId) => {
      block.statements.forEach(stmt => {
        if (stmt.type === StatementType.FUNCTION_CALL && stmt.text?.includes('free(')) {
          // Check each pointer argument to free()
          stmt.variables?.used.forEach(ptrVar => {
            /**
             * DOUBLE FREE CHECK
             * 
             * If pointer was already freed (exists in freedPointers set),
             * this is a double free vulnerability.
             * 
             * Note: This is a conservative check - it flags any second free()
             * call, even if the pointer was re-assigned between frees.
             * In practice, we'd need to track pointer reassignments to reduce false positives.
             */
            if (freedPointers.has(ptrVar)) {
              vulnerabilities.push({
                id: `vuln_${vulnId++}`,
                type: VulnerabilityType.DOUBLE_FREE,
                severity: Severity.HIGH,
                location: {
                  file: filePath,
                  line: stmt.range?.start.line || 0,
                  column: stmt.range?.start.column || 0,
                  blockId,
                  statementId: stmt.id || `stmt_${blockId}`
                },
                description: `Double free detected for pointer "${ptrVar}"`,
                sourceToSinkPath: [`${blockId}:${stmt.id || 'unknown'}`],
                exploitability: Exploitability.EXPLOITABLE,
                cweId: 'CWE-415',
                recommendation: 'Set pointer to NULL after free() to prevent double free'
              });
            } else {
              // First free() call for this pointer - add to set
              freedPointers.add(ptrVar);
            }
          });
        }
      });
    });

    return vulnerabilities;
  }

  /**
   * Detect format string vulnerabilities
   * 
   * Identifies cases where user-controlled format strings are passed to
   * printf-family functions, which can lead to format string attacks.
   * 
   * @param functionCFG - Function CFG to analyze
   * @param taintAnalysis - Taint analysis results
   * @param filePath - Source file path
   * @returns Array of format string vulnerabilities
   */
  /**
   * FORMAT STRING VULNERABILITY DETECTION ALGORITHM
   * 
   * Detects format string vulnerabilities where user-controlled format strings
   * are passed to printf-family functions. Format string attacks can lead to:
   * - Memory disclosure (reading arbitrary memory)
   * - Memory corruption (writing arbitrary memory)
   * - Code execution (if format string contains %n)
   * 
   * Detection Strategy:
   * 1. Identify calls to printf-family functions (printf, fprintf, sprintf, snprintf)
   * 2. Check if format string argument (first/second argument) is tainted
   * 3. If tainted, report format string vulnerability
   * 
   * Note: This is a simplified check - in practice, we'd need to identify
   * which argument is the format string (varies by function).
   */
  private detectFormatStringVulns(
    functionCFG: FunctionCFG,
    taintAnalysis: Map<string, TaintInfo[]>,
    filePath: string
  ): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];
    let vulnId = 0;

    /**
     * FORMAT STRING FUNCTIONS
     * 
     * These functions interpret format strings and can be exploited if
     * the format string is user-controlled:
     * - printf(format, ...): Prints formatted string to stdout
     * - fprintf(stream, format, ...): Prints formatted string to file
     * - sprintf(buffer, format, ...): Writes formatted string to buffer
     * - snprintf(buffer, size, format, ...): Bounded formatted string write
     */
    const formatFunctions = ['printf', 'fprintf', 'sprintf', 'snprintf'];

    // Scan all blocks for format string function calls
    functionCFG.blocks.forEach((block, blockId) => {
      block.statements.forEach(stmt => {
        if (stmt.type === StatementType.FUNCTION_CALL && stmt.text) {
          const funcName = stmt.text.match(/(\w+)\s*\(/)?.[1];
          if (!funcName || !formatFunctions.includes(funcName)) return;

          /**
           * TAINT CHECK FOR FORMAT STRING ARGUMENT
           * 
           * Check if any variable used in the function call is tainted.
           * If a tainted variable is used as the format string argument,
           * this is a format string vulnerability.
           * 
           * Note: This is simplified - ideally we'd identify which argument
           * is the format string (first arg for printf, second for fprintf/sprintf).
           */
          stmt.variables?.used.forEach(varName => {
            const taintInfo = taintAnalysis.get(varName);
            if (taintInfo && taintInfo.some(t => t.tainted)) {
              vulnerabilities.push({
                id: `vuln_${vulnId++}`,
                type: VulnerabilityType.FORMAT_STRING,
                severity: Severity.HIGH,
                location: {
                  file: filePath,
                  line: stmt.range?.start.line || 0,
                  column: stmt.range?.start.column || 0,
                  blockId,
                  statementId: stmt.id || `stmt_${blockId}`
                },
                description: `Format string in "${funcName}" may be controlled by user input`,
                sourceToSinkPath: [`${blockId}:${stmt.id || 'unknown'}`],
                exploitability: Exploitability.EXPLOITABLE,
                cweId: 'CWE-134',
                recommendation: 'Use format string literals or validate format string input'
              });
            }
          });
        }
      });
    });

    return vulnerabilities;
  }

  /**
   * Detect unsafe function calls
   */
  private detectUnsafeFunctions(functionCFG: FunctionCFG, filePath: string): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];
    let vulnId = 0;

    functionCFG.blocks.forEach((block, blockId) => {
      block.statements.forEach(stmt => {
        if (stmt.type === StatementType.FUNCTION_CALL && stmt.text) {
          const funcName = stmt.text.match(/(\w+)\s*\(/)?.[1];
          if (!funcName) return;

          if (this.securitySinks.has(funcName)) {
            const vulnType = this.securitySinks.get(funcName)!;
            vulnerabilities.push({
              id: `vuln_${vulnId++}`,
              type: VulnerabilityType.UNSAFE_FUNCTION,
              severity: Severity.MEDIUM,
              location: {
                file: filePath,
                line: stmt.range?.start.line || 0,
                column: stmt.range?.start.column || 0,
                blockId,
                statementId: stmt.id || `stmt_${blockId}`
              },
              description: `Unsafe function "${funcName}" detected`,
              sourceToSinkPath: [`${blockId}:${stmt.id || 'unknown'}`],
              exploitability: Exploitability.UNKNOWN,
              cweId: this.getCWEForType(vulnType),
              recommendation: `Consider using safer alternative for ${funcName}`
            });
          }
        }
      });
    });

    return vulnerabilities;
  }

  /**
   * Detect uninitialized variable usage
   * 
   * Identifies variables that are used before being initialized.
   * This can lead to undefined behavior and security issues.
   * 
   * @param functionCFG - Function CFG to analyze
   * @param filePath - Source file path
   * @returns Array of uninitialized variable vulnerabilities
   */
  /**
   * UNINITIALIZED VARIABLE DETECTION ALGORITHM
   * 
   * Detects variables that are used before being initialized.
   * Uninitialized variable usage can lead to:
   * - Undefined behavior (reading garbage values)
   * - Security issues (if uninitialized value is used in security-critical operations)
   * - Logic errors (unexpected program behavior)
   * 
   * Detection Strategy:
   * 1. Track all variables that are initialized (assigned values) as we traverse CFG
   * 2. For each variable use, check if it was initialized before use
   * 3. Exclude function parameters (they're initialized by caller)
   * 4. Report uninitialized variable usage
   * 
   * Limitations:
   * - Simple forward pass: doesn't handle control flow properly
   * - May produce false positives if variable is initialized in all execution paths
   * - Doesn't track variable scoping (local vs. global variables)
   */
  private detectUninitializedVariables(functionCFG: FunctionCFG, filePath: string): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];
    let vulnId = 0;
    /**
     * INITIALIZED VARIABLES SET
     * 
     * Tracks which variables have been initialized (assigned a value) as we
     * traverse the CFG in forward order. A variable is initialized when it
     * appears in the 'defined' set of a statement.
     */
    const initializedVars = new Set<string>();

    // Process blocks in forward CFG order
    functionCFG.blocks.forEach((block, blockId) => {
      block.statements.forEach(stmt => {
        /**
         * TRACK VARIABLE INITIALIZATIONS
         * 
         * When a variable is defined (assigned a value), add it to the
         * initialized set. This includes:
         * - Direct assignments: x = 5;
         * - Declarations with initialization: int x = 5;
         * - Function call results: x = foo();
         */
        if (stmt.variables?.defined) {
          stmt.variables.defined.forEach(v => initializedVars.add(v));
        }

        /**
         * CHECK FOR UNINITIALIZED VARIABLE USE
         * 
         * For each variable used in a statement, check if it was initialized
         * before this use. If not initialized and not a function parameter,
         * this is a potential uninitialized variable vulnerability.
         * 
         * Note: Function parameters are excluded because they're initialized
         * by the caller when the function is invoked.
         */
        if (stmt.variables?.used) {
          stmt.variables.used.forEach(varName => {
            /**
             * UNINITIALIZED CHECK
             * 
             * A variable is uninitialized if:
             * 1. It's not in the initializedVars set (never assigned)
             * 2. It's not a function parameter (parameters are initialized by caller)
             * 
             * If both conditions are true, report vulnerability.
             */
            if (!initializedVars.has(varName) && !functionCFG.parameters.includes(varName)) {
              vulnerabilities.push({
                id: `vuln_${vulnId++}`,
                type: VulnerabilityType.UNINITIALIZED_VARIABLE,
                severity: Severity.MEDIUM,
                location: {
                  file: filePath,
                  line: stmt.range?.start.line || 0,
                  column: stmt.range?.start.column || 0,
                  blockId,
                  statementId: stmt.id || `stmt_${blockId}`
                },
                description: `Use of potentially uninitialized variable "${varName}"`,
                sourceToSinkPath: [`${blockId}:${stmt.id || 'unknown'}`],
                exploitability: Exploitability.PROBABLY_NOT_EXPLOITABLE,
                cweId: 'CWE-457',
                recommendation: 'Initialize variable before use'
              });
            }
          });
        }
      });
    });

    return vulnerabilities;
  }

  /**
   * BOUNDS CHECKING VERIFICATION
   * 
   * Checks if bounds checking exists in predecessor blocks before a buffer operation.
   * Bounds checking typically involves:
   * - strlen() calls to check string length
   * - sizeof() to check buffer size
   * - Comparison operators (<, >, <=, >=) checking size
   * 
   * This is a heuristic check - it looks for common patterns but may not catch
   * all forms of bounds checking. More sophisticated analysis would verify that
   * the bounds check actually protects the specific buffer operation.
   * 
   * @param functionCFG - Function CFG containing the buffer operation
   * @param blockId - Block ID where buffer operation occurs
   * @returns true if bounds checking is found in predecessor blocks, false otherwise
   */
  private hasBoundsCheck(functionCFG: FunctionCFG, blockId: string): boolean {
    const block = functionCFG.blocks.get(blockId);
    if (!block) return false;

    /**
     * CHECK PREDECESSOR BLOCKS
     * 
     * Bounds checking typically occurs in blocks that precede the buffer operation.
     * We check all predecessor blocks (blocks that can execute before this block)
     * for common bounds checking patterns.
     * 
     * Note: This is a simple heuristic - in practice, we'd need to verify that
     * the bounds check actually protects this specific buffer operation, not just
     * that a bounds check exists somewhere in the predecessors.
     */
    for (const predId of block.predecessors) {
      const predBlock = functionCFG.blocks.get(predId);
      if (predBlock) {
        // Check each statement in predecessor block for bounds checking patterns
        for (const stmt of predBlock.statements) {
          /**
           * BOUNDS CHECKING PATTERNS
           * 
           * Look for common patterns that indicate bounds checking:
           * - strlen(): String length function
           * - sizeof(): Buffer size operator
           * - Comparison operators: <, >, <=, >= (size comparisons)
           * 
           * Example patterns:
           *   if (strlen(src) < sizeof(dest)) { strcpy(dest, src); }
           *   if (size < MAX_SIZE) { memcpy(buffer, data, size); }
           */
          if (stmt.text && (
            stmt.text.includes('strlen') ||
            stmt.text.includes('sizeof') ||
            stmt.text.includes('<') ||
            stmt.text.includes('>') ||
            stmt.text.includes('<=')
          )) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * USE-AFTER-FREE ORDER VERIFICATION
   * 
   * Checks if a use block comes after a free block in the CFG.
   * This is a simplified check - in a full implementation, we'd need to:
   * 1. Perform proper CFG traversal to verify reachability
   * 2. Check if use block is reachable from free block
   * 3. Verify execution order (use must execute after free)
   * 
   * Current Implementation:
   * - Simple heuristic: if blocks are different, assume use-after-free
   * - This may produce false positives if free and use are in different branches
   * - More sophisticated analysis would use CFG reachability analysis
   * 
   * @param functionCFG - Function CFG containing both blocks
   * @param freedAt - Block ID where pointer was freed
   * @param useAt - Block ID where pointer is used
   * @returns true if use block comes after free block, false otherwise
   */
  private isAfterFree(functionCFG: FunctionCFG, freedAt: string, useAt: string): boolean {
    /**
     * SIMPLIFIED ORDER CHECK
     * 
     * Current implementation: if blocks are different, assume use-after-free.
     * This is conservative (may produce false positives) but safe (won't miss real bugs).
     * 
     * TODO: Implement proper CFG traversal to verify:
     * 1. Is useAt reachable from freedAt?
     * 2. Does execution order guarantee use occurs after free?
     * 3. Are there paths where use occurs before free? (false positive reduction)
     */
    return freedAt !== useAt;
  }

  /**
   * Assess exploitability
   */
  private assessExploitability(
    vulnType: VulnerabilityType,
    functionCFG: FunctionCFG,
    blockId: string
  ): Exploitability {
    switch (vulnType) {
      case VulnerabilityType.BUFFER_OVERFLOW:
      case VulnerabilityType.USE_AFTER_FREE:
      case VulnerabilityType.DOUBLE_FREE:
      case VulnerabilityType.FORMAT_STRING:
        return Exploitability.EXPLOITABLE;
      case VulnerabilityType.UNSAFE_FUNCTION:
        return Exploitability.PROBABLY_EXPLOITABLE;
      default:
        return Exploitability.UNKNOWN;
    }
  }

  /**
   * Get severity for vulnerability type
   */
  private getSeverityForType(type: VulnerabilityType): Severity {
    switch (type) {
      case VulnerabilityType.BUFFER_OVERFLOW:
      case VulnerabilityType.USE_AFTER_FREE:
      case VulnerabilityType.DOUBLE_FREE:
      case VulnerabilityType.FORMAT_STRING:
      case VulnerabilityType.COMMAND_INJECTION:
        return Severity.CRITICAL;
      case VulnerabilityType.SQL_INJECTION:
      case VulnerabilityType.PATH_TRAVERSAL:
        return Severity.HIGH;
      case VulnerabilityType.UNSAFE_FUNCTION:
      case VulnerabilityType.UNINITIALIZED_VARIABLE:
        return Severity.MEDIUM;
      default:
        return Severity.LOW;
    }
  }

  /**
   * Get CWE ID for vulnerability type
   * 
   * Maps vulnerability types to Common Weakness Enumeration (CWE) identifiers.
   * 
   * @param type - Vulnerability type
   * @returns CWE ID string (e.g., "CWE-120")
   */
  private getCWEForType(type: VulnerabilityType): string {
    const cweMap: Map<VulnerabilityType, string> = new Map([
      [VulnerabilityType.BUFFER_OVERFLOW, 'CWE-120'],
      [VulnerabilityType.USE_AFTER_FREE, 'CWE-416'],
      [VulnerabilityType.DOUBLE_FREE, 'CWE-415'],
      [VulnerabilityType.FORMAT_STRING, 'CWE-134'],
      [VulnerabilityType.COMMAND_INJECTION, 'CWE-78'],
      [VulnerabilityType.SQL_INJECTION, 'CWE-89'],
      [VulnerabilityType.PATH_TRAVERSAL, 'CWE-22'],
      [VulnerabilityType.UNINITIALIZED_VARIABLE, 'CWE-457'],
      [VulnerabilityType.NULL_POINTER_DEREFERENCE, 'CWE-476']
    ]);

    return cweMap.get(type) || 'CWE-000';
  }

  /**
   * Get recommendation for vulnerability type
   */
  private getRecommendationForType(type: VulnerabilityType, funcName?: string): string {
    const recommendations: Map<VulnerabilityType, string> = new Map([
      [VulnerabilityType.BUFFER_OVERFLOW, `Replace ${funcName} with safer alternative (strncpy, snprintf) or add bounds checking`],
      [VulnerabilityType.USE_AFTER_FREE, 'Set pointer to NULL after free() and check for NULL before use'],
      [VulnerabilityType.DOUBLE_FREE, 'Set pointer to NULL after free() to prevent double free'],
      [VulnerabilityType.FORMAT_STRING, 'Use format string literals or validate format string input'],
      [VulnerabilityType.COMMAND_INJECTION, 'Use parameterized commands or input validation'],
      [VulnerabilityType.SQL_INJECTION, 'Use parameterized queries/prepared statements'],
      [VulnerabilityType.PATH_TRAVERSAL, 'Validate and sanitize file paths'],
      [VulnerabilityType.UNINITIALIZED_VARIABLE, 'Initialize variable before use']
    ]);

    return recommendations.get(type) || 'Review and fix the vulnerability';
  }
}

