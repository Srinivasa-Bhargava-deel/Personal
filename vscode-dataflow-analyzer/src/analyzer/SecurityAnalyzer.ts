/**
 * Security Vulnerability Analyzer for Exploit Post-Mortems
 */

import { BasicBlock, FunctionCFG, Statement, StatementType } from '../types';
import { TaintInfo } from '../types';

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
   */
  analyzeVulnerabilities(
    functionCFG: FunctionCFG,
    taintAnalysis: Map<string, TaintInfo[]>,
    filePath: string
  ): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];

    // 1. Check for tainted data reaching security sinks
    vulnerabilities.push(...this.detectTaintedSinkUsage(functionCFG, taintAnalysis, filePath));

    // 2. Check for buffer operations without bounds checking
    vulnerabilities.push(...this.detectBufferOverflows(functionCFG, filePath));

    // 3. Check for use-after-free patterns
    vulnerabilities.push(...this.detectUseAfterFree(functionCFG, filePath));

    // 4. Check for double free
    vulnerabilities.push(...this.detectDoubleFree(functionCFG, filePath));

    // 5. Check for format string vulnerabilities
    vulnerabilities.push(...this.detectFormatStringVulns(functionCFG, taintAnalysis, filePath));

    // 6. Check for unsafe function calls
    vulnerabilities.push(...this.detectUnsafeFunctions(functionCFG, filePath));

    // 7. Check for uninitialized variables
    vulnerabilities.push(...this.detectUninitializedVariables(functionCFG, filePath));

    return vulnerabilities;
  }

  /**
   * Detect tainted data reaching security sinks
   */
  private detectTaintedSinkUsage(
    functionCFG: FunctionCFG,
    taintAnalysis: Map<string, TaintInfo[]>,
    filePath: string
  ): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];
    let vulnId = 0;

    functionCFG.blocks.forEach((block, blockId) => {
      block.statements.forEach(stmt => {
        if (stmt.type === StatementType.FUNCTION_CALL && stmt.text) {
          const funcName = stmt.text.match(/(\w+)\s*\(/)?.[1];
          if (!funcName) return;

          const vulnType = this.securitySinks.get(funcName);
          if (!vulnType) return;

          // Check if any arguments are tainted
          stmt.variables?.used.forEach(varName => {
            const taintInfo = taintAnalysis.get(varName);
            if (taintInfo && taintInfo.some(t => t.tainted)) {
              const taint = taintInfo.find(t => t.tainted)!;
              const sourceToSinkPath = [...taint.propagationPath, `${blockId}:${stmt.id}`];

              vulnerabilities.push({
                id: `vuln_${vulnId++}`,
                type: vulnType,
                severity: this.getSeverityForType(vulnType),
                location: {
                  file: filePath,
                  line: stmt.range.start.line,
                  column: stmt.range.start.column,
                  blockId,
                  statementId: stmt.id
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

    return vulnerabilities;
  }

  /**
   * Detect buffer overflow patterns
   */
  private detectBufferOverflows(functionCFG: FunctionCFG, filePath: string): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];
    let vulnId = 0;

    functionCFG.blocks.forEach((block, blockId) => {
      block.statements.forEach(stmt => {
        if (stmt.type === StatementType.FUNCTION_CALL && stmt.text) {
          const funcName = stmt.text.match(/(\w+)\s*\(/)?.[1];
          if (!funcName) return;

          // Check for unsafe buffer functions without size checks
          if (['strcpy', 'strcat', 'sprintf', 'gets'].includes(funcName)) {
            // Look for bounds checking in preceding blocks
            const hasBoundsCheck = this.hasBoundsCheck(functionCFG, blockId);

            if (!hasBoundsCheck) {
              vulnerabilities.push({
                id: `vuln_${vulnId++}`,
                type: VulnerabilityType.BUFFER_OVERFLOW,
                severity: Severity.HIGH,
                location: {
                  file: filePath,
                  line: stmt.range.start.line,
                  column: stmt.range.start.column,
                  blockId,
                  statementId: stmt.id
                },
                description: `Unsafe buffer operation "${funcName}" without bounds checking`,
                sourceToSinkPath: [`${blockId}:${stmt.id}`],
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
   */
  private detectUseAfterFree(functionCFG: FunctionCFG, filePath: string): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];
    let vulnId = 0;
    const freedPointers = new Map<string, string>(); // pointer -> blockId where freed

    functionCFG.blocks.forEach((block, blockId) => {
      block.statements.forEach(stmt => {
        // Track free() calls
        if (stmt.type === StatementType.FUNCTION_CALL && stmt.text?.includes('free(')) {
          stmt.variables?.used.forEach(ptrVar => {
            freedPointers.set(ptrVar, blockId);
          });
        }

        // Check for use after free
        if (stmt.variables?.used) {
          stmt.variables.used.forEach(varName => {
            if (freedPointers.has(varName)) {
              const freedAt = freedPointers.get(varName)!;
              // Check if this use is after the free
              if (this.isAfterFree(functionCFG, freedAt, blockId)) {
                vulnerabilities.push({
                  id: `vuln_${vulnId++}`,
                  type: VulnerabilityType.USE_AFTER_FREE,
                  severity: Severity.CRITICAL,
                  location: {
                    file: filePath,
                    line: stmt.range.start.line,
                    column: stmt.range.start.column,
                    blockId,
                    statementId: stmt.id
                  },
                  description: `Use of pointer "${varName}" after it was freed at block ${freedAt}`,
                  sourceToSinkPath: [freedAt, `${blockId}:${stmt.id}`],
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
   * Detect double free
   */
  private detectDoubleFree(functionCFG: FunctionCFG, filePath: string): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];
    let vulnId = 0;
    const freedPointers = new Set<string>();

    functionCFG.blocks.forEach((block, blockId) => {
      block.statements.forEach(stmt => {
        if (stmt.type === StatementType.FUNCTION_CALL && stmt.text?.includes('free(')) {
          stmt.variables?.used.forEach(ptrVar => {
            if (freedPointers.has(ptrVar)) {
              vulnerabilities.push({
                id: `vuln_${vulnId++}`,
                type: VulnerabilityType.DOUBLE_FREE,
                severity: Severity.HIGH,
                location: {
                  file: filePath,
                  line: stmt.range.start.line,
                  column: stmt.range.start.column,
                  blockId,
                  statementId: stmt.id
                },
                description: `Double free detected for pointer "${ptrVar}"`,
                sourceToSinkPath: [`${blockId}:${stmt.id}`],
                exploitability: Exploitability.EXPLOITABLE,
                cweId: 'CWE-415',
                recommendation: 'Set pointer to NULL after free() to prevent double free'
              });
            } else {
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
   */
  private detectFormatStringVulns(
    functionCFG: FunctionCFG,
    taintAnalysis: Map<string, TaintInfo[]>,
    filePath: string
  ): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];
    let vulnId = 0;

    const formatFunctions = ['printf', 'fprintf', 'sprintf', 'snprintf'];

    functionCFG.blocks.forEach((block, blockId) => {
      block.statements.forEach(stmt => {
        if (stmt.type === StatementType.FUNCTION_CALL && stmt.text) {
          const funcName = stmt.text.match(/(\w+)\s*\(/)?.[1];
          if (!funcName || !formatFunctions.includes(funcName)) return;

          // Check if format string argument is tainted
          stmt.variables?.used.forEach(varName => {
            const taintInfo = taintAnalysis.get(varName);
            if (taintInfo && taintInfo.some(t => t.tainted)) {
              vulnerabilities.push({
                id: `vuln_${vulnId++}`,
                type: VulnerabilityType.FORMAT_STRING,
                severity: Severity.HIGH,
                location: {
                  file: filePath,
                  line: stmt.range.start.line,
                  column: stmt.range.start.column,
                  blockId,
                  statementId: stmt.id
                },
                description: `Format string in "${funcName}" may be controlled by user input`,
                sourceToSinkPath: [`${blockId}:${stmt.id}`],
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
                line: stmt.range.start.line,
                column: stmt.range.start.column,
                blockId,
                statementId: stmt.id
              },
              description: `Unsafe function "${funcName}" detected`,
              sourceToSinkPath: [`${blockId}:${stmt.id}`],
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
   * Detect uninitialized variables
   */
  private detectUninitializedVariables(functionCFG: FunctionCFG, filePath: string): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];
    let vulnId = 0;
    const initializedVars = new Set<string>();

    functionCFG.blocks.forEach((block, blockId) => {
      block.statements.forEach(stmt => {
        // Track initialized variables
        if (stmt.variables?.defined) {
          stmt.variables.defined.forEach(v => initializedVars.add(v));
        }

        // Check for use of uninitialized variables
        if (stmt.variables?.used) {
          stmt.variables.used.forEach(varName => {
            if (!initializedVars.has(varName) && !functionCFG.parameters.includes(varName)) {
              vulnerabilities.push({
                id: `vuln_${vulnId++}`,
                type: VulnerabilityType.UNINITIALIZED_VARIABLE,
                severity: Severity.MEDIUM,
                location: {
                  file: filePath,
                  line: stmt.range.start.line,
                  column: stmt.range.start.column,
                  blockId,
                  statementId: stmt.id
                },
                description: `Use of potentially uninitialized variable "${varName}"`,
                sourceToSinkPath: [`${blockId}:${stmt.id}`],
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
   * Check if block has bounds checking before buffer operation
   */
  private hasBoundsCheck(functionCFG: FunctionCFG, blockId: string): boolean {
    const block = functionCFG.blocks.get(blockId);
    if (!block) return false;

    // Check predecessors for bounds checking
    for (const predId of block.predecessors) {
      const predBlock = functionCFG.blocks.get(predId);
      if (predBlock) {
        for (const stmt of predBlock.statements) {
          // Look for length checks, size comparisons
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
   * Check if use block is after free block
   */
  private isAfterFree(functionCFG: FunctionCFG, freedAt: string, useAt: string): boolean {
    // Simple check - in real implementation, would do proper CFG traversal
    // For now, assume different blocks mean potential use-after-free
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

