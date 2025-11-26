/**
 * LoggingConfig.ts
 * 
 * Centralized Logging Configuration with Comprehensive Output
 * 
 * PURPOSE:
 * Provides centralized control over logging output for different modules and functions
 * throughout the extension. Enables fine-grained control over which components log
 * information, improving debugging and reducing log clutter.
 * 
 * FEATURES:
 * - Automatic file logging to .vscode/logs.txt
 * - Auto-clear logs on extension deactivation (EDH window close)
 * - Console + file dual output
 * 
 * LOGGING LEVELS:
 * - VERBOSE: All details including data structures
 * - DETAILED: Most details for understanding flow
 * - NORMAL: Standard operational logging
 * - MINIMAL: Only errors and important events
 */

import * as fs from 'fs';
import * as path from 'path';

export enum LogLevel {
  VERBOSE = 0,   // Everything including data dumps
  DETAILED = 1,  // Most details
  NORMAL = 2,    // Standard logs
  MINIMAL = 3    // Only errors/warnings
}

export class LoggingConfig {
  // MASTER SWITCH - Enable/disable ALL logging
  static GLOBAL_ENABLED: boolean = true;
  
  // Current log level (set to VERBOSE for test validation)
  static LOG_LEVEL: LogLevel = LogLevel.VERBOSE;
  
  // File logging
  private static logFilePath: string | null = null;
  private static logStream: fs.WriteStream | null = null;
  private static writeQueue: string[] = [];
  private static isWriting: boolean = false;
  
  // Original console methods (for intercepting)
  private static originalConsoleLog: typeof console.log = console.log;
  private static originalConsoleError: typeof console.error = console.error;
  private static originalConsoleWarn: typeof console.warn = console.warn;
  private static isIntercepting: boolean = false;
  
  // CFG Visualization
  static CFGViz: boolean = true;
  static InterCFGViz: boolean = true;
  static CallGraphViz: boolean = true;
  static VizTabs: boolean = true;         // Tab-specific logging
  static VizNodes: boolean = true;        // Node details
  static VizEdges: boolean = true;        // Edge details
  static VizColors: boolean = true;       // Color coding details
  static VizTaint: boolean = true;        // Taint visualization
  
  // Analysis Modules
  static TaintAnalysis: boolean = true;
  static TaintSources: boolean = true;    // Taint source detection
  static TaintSinks: boolean = true;      // Taint sink detection
  static TaintPropagation: boolean = true; // Taint propagation
  static InterProceduralTaint: boolean = true;
  static ContextSensitiveTaint: boolean = true;
  static ControlDependentTaint: boolean = true;  // Control-dependent taint
  static ReachingDefinitions: boolean = true;
  static LivenessAnalysis: boolean = true;
  static InterProceduralRD: boolean = true;
  
  // Call Graph Analysis
  static CallGraphAnalysis: boolean = true;
  static ParameterAnalysis: boolean = true;
  static ReturnValueAnalysis: boolean = true;
  
  // Security Analysis
  static SecurityAnalysis: boolean = true;
  static VulnerabilityDetection: boolean = true;  // Vulnerability details
  
  // Parser
  static Parser: boolean = true;
  static ASTDetails: boolean = true;      // AST parsing details
  
  // State Management
  static StateManager: boolean = true;
  
  // Dataflow Analyzer (orchestrator)
  static DataflowAnalyzer: boolean = true;
  
  // Extension
  static Extension: boolean = true;
  
  // Test Validation - Extra detailed logging for tests
  static TestValidation: boolean = true;
  
  /**
   * Initialize file logging with the workspace path
   * Creates/clears the log file at .vscode/logs.txt
   * Also intercepts all console.log/error/warn to write to file
   */
  static initializeFileLogging(workspacePath: string): void {
    try {
      const vscodeDir = path.join(workspacePath, '.vscode');
      
      // Ensure .vscode directory exists
      if (!fs.existsSync(vscodeDir)) {
        fs.mkdirSync(vscodeDir, { recursive: true });
      }
      
      LoggingConfig.logFilePath = path.join(vscodeDir, 'logs.txt');
      
      // Clear the log file on initialization
      fs.writeFileSync(LoggingConfig.logFilePath, '', 'utf8');
      
      // Create write stream for appending
      LoggingConfig.logStream = fs.createWriteStream(LoggingConfig.logFilePath, { 
        flags: 'a',
        encoding: 'utf8'
      });
      
      // Intercept console methods to also write to file
      LoggingConfig.interceptConsole();
      
      console.log(`[LoggingConfig] File logging initialized: ${LoggingConfig.logFilePath}`);
      LoggingConfig.writeToFile(`[LoggingConfig] === Log session started at ${new Date().toISOString()} ===\n`);
    } catch (error) {
      LoggingConfig.originalConsoleError('[LoggingConfig] Failed to initialize file logging:', error);
    }
  }
  
  /**
   * Intercept console.log/error/warn to also write to file
   */
  private static interceptConsole(): void {
    if (LoggingConfig.isIntercepting) return;
    LoggingConfig.isIntercepting = true;
    
    // Intercept console.log
    console.log = (...args: any[]) => {
      LoggingConfig.originalConsoleLog.apply(console, args);
      const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      LoggingConfig.writeToFile(message);
    };
    
    // Intercept console.error
    console.error = (...args: any[]) => {
      LoggingConfig.originalConsoleError.apply(console, args);
      const message = '[ERROR] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      LoggingConfig.writeToFile(message);
    };
    
    // Intercept console.warn
    console.warn = (...args: any[]) => {
      LoggingConfig.originalConsoleWarn.apply(console, args);
      const message = '[WARN] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      LoggingConfig.writeToFile(message);
    };
  }
  
  /**
   * Restore original console methods
   */
  private static restoreConsole(): void {
    if (!LoggingConfig.isIntercepting) return;
    console.log = LoggingConfig.originalConsoleLog;
    console.error = LoggingConfig.originalConsoleError;
    console.warn = LoggingConfig.originalConsoleWarn;
    LoggingConfig.isIntercepting = false;
  }
  
  /**
   * Write message to log file (async, non-blocking)
   */
  private static writeToFile(message: string): void {
    if (!LoggingConfig.logFilePath) return;
    
    // Add to queue
    LoggingConfig.writeQueue.push(message + '\n');
    
    // Process queue if not already writing
    if (!LoggingConfig.isWriting) {
      LoggingConfig.processWriteQueue();
    }
  }
  
  /**
   * Process the write queue
   */
  private static processWriteQueue(): void {
    if (LoggingConfig.writeQueue.length === 0 || !LoggingConfig.logStream) {
      LoggingConfig.isWriting = false;
      return;
    }
    
    LoggingConfig.isWriting = true;
    const message = LoggingConfig.writeQueue.shift();
    
    if (message && LoggingConfig.logStream) {
      LoggingConfig.logStream.write(message, () => {
        // Continue processing queue
        LoggingConfig.processWriteQueue();
      });
    }
  }
  
  /**
   * Clear the log file
   */
  static clearLogFile(): void {
    if (LoggingConfig.logFilePath && fs.existsSync(LoggingConfig.logFilePath)) {
      try {
        fs.writeFileSync(LoggingConfig.logFilePath, '', 'utf8');
        console.log('[LoggingConfig] Log file cleared');
      } catch (error) {
        console.error('[LoggingConfig] Failed to clear log file:', error);
      }
    }
  }
  
  /**
   * Close the log stream and optionally clear the file
   * Called on extension deactivation
   */
  static async closeFileLogging(clearOnClose: boolean = true): Promise<void> {
    return new Promise((resolve) => {
      // Restore original console methods first
      LoggingConfig.restoreConsole();
      
      // Write closing message
      if (LoggingConfig.logStream) {
        LoggingConfig.logStream.write(`\n[LoggingConfig] === Log session ended at ${new Date().toISOString()} ===\n`, () => {
          if (LoggingConfig.logStream) {
            LoggingConfig.logStream.end(() => {
              LoggingConfig.logStream = null;
              
              // Clear the file if requested
              if (clearOnClose && LoggingConfig.logFilePath) {
                try {
                  fs.writeFileSync(LoggingConfig.logFilePath, '', 'utf8');
                  LoggingConfig.originalConsoleLog('[LoggingConfig] Log file cleared on close');
                } catch (error) {
                  LoggingConfig.originalConsoleError('[LoggingConfig] Failed to clear log file on close:', error);
                }
              }
              
              LoggingConfig.logFilePath = null;
              resolve();
            });
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
  
  /**
   * Check if logging is enabled for a module at the current level
   */
  private static isEnabled(module: keyof typeof LoggingConfig, level: LogLevel = LogLevel.NORMAL): boolean {
    if (!LoggingConfig.GLOBAL_ENABLED) return false;
    if (level < LoggingConfig.LOG_LEVEL) return false;
    const moduleValue = LoggingConfig[module];
    return moduleValue === true;
  }
  
  /**
   * Log message if the specified module logging is enabled
   */
  static log(module: keyof typeof LoggingConfig, message: string, ...args: any[]): void {
    if (LoggingConfig.isEnabled(module, LogLevel.NORMAL)) {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
      const logMessage = `[${timestamp}] [${module}] ${message}`;
      console.log(logMessage, ...args);
      
      // Also write to file
      const argsStr = args.length > 0 ? ' ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') : '';
      LoggingConfig.writeToFile(logMessage + argsStr);
    }
  }
  
  /**
   * Log detailed message (more verbose than log)
   */
  static detail(module: keyof typeof LoggingConfig, message: string, ...args: any[]): void {
    if (LoggingConfig.isEnabled(module, LogLevel.DETAILED)) {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
      const logMessage = `[${timestamp}] [${module}] [DETAIL] ${message}`;
      console.log(logMessage, ...args);
      
      // Also write to file
      const argsStr = args.length > 0 ? ' ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') : '';
      LoggingConfig.writeToFile(logMessage + argsStr);
    }
  }
  
  /**
   * Log verbose message with data dump
   */
  static verbose(module: keyof typeof LoggingConfig, message: string, data?: any): void {
    if (LoggingConfig.isEnabled(module, LogLevel.VERBOSE)) {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
      const logMessage = `[${timestamp}] [${module}] [VERBOSE] ${message}`;
      console.log(logMessage);
      LoggingConfig.writeToFile(logMessage);
      
      if (data !== undefined) {
        if (typeof data === 'object') {
          const dataStr = JSON.stringify(data, null, 2);
          console.log(dataStr);
          LoggingConfig.writeToFile(dataStr);
        } else {
          console.log(data);
          LoggingConfig.writeToFile(String(data));
        }
      }
    }
  }
  
  /**
   * Log a section header for readability
   */
  static section(module: keyof typeof LoggingConfig, title: string): void {
    if (LoggingConfig.isEnabled(module, LogLevel.NORMAL)) {
      const sep = '='.repeat(60);
      const header = `[${module}] ${title}`;
      console.log(`\n${sep}`);
      console.log(header);
      console.log(sep);
      
      LoggingConfig.writeToFile(`\n${sep}`);
      LoggingConfig.writeToFile(header);
      LoggingConfig.writeToFile(sep);
    }
  }
  
  /**
   * Log a subsection header
   */
  static subsection(module: keyof typeof LoggingConfig, title: string): void {
    if (LoggingConfig.isEnabled(module, LogLevel.DETAILED)) {
      const sep = '-'.repeat(40);
      const header = `[${module}] ${title}`;
      console.log(`\n${sep}`);
      console.log(header);
      console.log(sep);
      
      LoggingConfig.writeToFile(`\n${sep}`);
      LoggingConfig.writeToFile(header);
      LoggingConfig.writeToFile(sep);
    }
  }
  
  /**
   * Log a table of key-value pairs
   */
  static table(module: keyof typeof LoggingConfig, title: string, data: Record<string, any>): void {
    if (LoggingConfig.isEnabled(module, LogLevel.DETAILED)) {
      const header = `\n[${module}] ${title}:`;
      console.log(header);
      LoggingConfig.writeToFile(header);
      
      Object.entries(data).forEach(([key, value]) => {
        const displayValue = typeof value === 'object' ? JSON.stringify(value) : value;
        const line = `  ${key}: ${displayValue}`;
        console.log(line);
        LoggingConfig.writeToFile(line);
      });
    }
  }
  
  /**
   * Log error message (always logged)
   */
  static error(module: keyof typeof LoggingConfig, message: string, ...args: any[]): void {
    const logMessage = `[ERROR] [${module}] ${message}`;
    console.error(logMessage, ...args);
    
    const argsStr = args.length > 0 ? ' ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') : '';
    LoggingConfig.writeToFile(logMessage + argsStr);
  }
  
  /**
   * Log warning message (always logged)
   */
  static warn(module: keyof typeof LoggingConfig, message: string, ...args: any[]): void {
    const logMessage = `[WARN] [${module}] ${message}`;
    console.warn(logMessage, ...args);
    
    const argsStr = args.length > 0 ? ' ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') : '';
    LoggingConfig.writeToFile(logMessage + argsStr);
  }
  
  /**
   * Log for test validation (always enabled when TestValidation is true)
   */
  static test(testName: string, message: string, data?: any): void {
    if (LoggingConfig.TestValidation) {
      const logMessage = `[TEST:${testName}] ${message}`;
      console.log(logMessage);
      LoggingConfig.writeToFile(logMessage);
      
      if (data !== undefined) {
        const dataStr = JSON.stringify(data, null, 2);
        console.log(dataStr);
        LoggingConfig.writeToFile(dataStr);
      }
    }
  }
  
  /**
   * Direct console.log wrapper that also writes to file
   * Use this to capture raw console.log output
   */
  static raw(message: string, ...args: any[]): void {
    console.log(message, ...args);
    
    const argsStr = args.length > 0 ? ' ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') : '';
    LoggingConfig.writeToFile(message + argsStr);
  }
  
  /**
   * Enable all logging (for debugging/testing)
   */
  static enableAll(): void {
    LoggingConfig.GLOBAL_ENABLED = true;
    LoggingConfig.LOG_LEVEL = LogLevel.VERBOSE;
    // Enable all modules
    Object.keys(LoggingConfig).forEach(key => {
      if (typeof (LoggingConfig as any)[key] === 'boolean' && key !== 'GLOBAL_ENABLED') {
        (LoggingConfig as any)[key] = true;
      }
    });
    const msg = '[LoggingConfig] All logging enabled at VERBOSE level';
    console.log(msg);
    LoggingConfig.writeToFile(msg);
  }
  
  /**
   * Disable all logging (for production)
   */
  static disableAll(): void {
    LoggingConfig.GLOBAL_ENABLED = false;
    console.log('[LoggingConfig] All logging disabled');
  }
}
