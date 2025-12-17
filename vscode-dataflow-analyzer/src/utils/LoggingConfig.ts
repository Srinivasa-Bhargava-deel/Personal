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
  private static writeToFileCallCount: number = 0; // Diagnostic counter
  
  // Pending console output (captured before initialization)
  private static pendingConsoleOutput: string[] = [];
  private static isInitialized: boolean = false;
  
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
   * 
   * Creates/clears the log file at .vscode/logs.txt and sets up automatic logging:
   * - Intercepts ALL console.log/error/warn calls to write to file
   * - All LoggingConfig methods automatically write to file
   * - File is cleared on initialization (fresh start)
   * - File will be cleared again when EDH window closes (via deactivate)
   */
  /**
   * Helper to write diagnostic message directly to file AND console
   * This ensures diagnostics are always captured even if interception isn't working
   */
  private static diagWrite(message: string): void {
    // Write directly to console (VS Code will capture this)
    LoggingConfig.originalConsoleLog(message);
    
    // Also write directly to file if available
    if (LoggingConfig.logFilePath) {
      try {
        // Use appendFileSync for immediate write (bypasses queue)
        fs.appendFileSync(LoggingConfig.logFilePath, message + '\n', 'utf8');
      } catch (err) {
        // Ignore errors - file might not be ready yet
      }
    }
  }

  static initializeFileLogging(workspacePath: string): void {
    
    // DIAGNOSTIC: Write directly to file AND console
    const timestamp = new Date().toISOString();
    LoggingConfig.diagWrite(`[${timestamp}] [LoggingConfig] [DIAG] ========== FILE LOGGING INITIALIZATION START ==========`);
    LoggingConfig.diagWrite(`[${timestamp}] [LoggingConfig] [DIAG] Pending console messages captured: ${LoggingConfig.pendingConsoleOutput.length}`);
    LoggingConfig.diagWrite(`[${timestamp}] [LoggingConfig] [DIAG] Workspace path (raw): ${workspacePath}`);
    LoggingConfig.diagWrite(`[${timestamp}] [LoggingConfig] [DIAG] Workspace path exists: ${fs.existsSync(workspacePath)}`);
    
    try {
      // Ensure workspacePath is absolute and resolve it
      const absoluteWorkspacePath = path.isAbsolute(workspacePath) 
        ? workspacePath 
        : path.resolve(workspacePath);
      LoggingConfig.diagWrite(`[${timestamp}] [LoggingConfig] [DIAG] Absolute workspace path: ${absoluteWorkspacePath}`);
      LoggingConfig.diagWrite(`[${timestamp}] [LoggingConfig] [DIAG] Absolute workspace path exists: ${fs.existsSync(absoluteWorkspacePath)}`);
      
      const vscodeDir = path.join(absoluteWorkspacePath, '.vscode');
      LoggingConfig.diagWrite(`[${timestamp}] [LoggingConfig] [DIAG] VS Code dir: ${vscodeDir}`);
      LoggingConfig.diagWrite(`[${timestamp}] [LoggingConfig] [DIAG] VS Code dir exists: ${fs.existsSync(vscodeDir)}`);
      
      // Ensure .vscode directory exists
      if (!fs.existsSync(vscodeDir)) {
        LoggingConfig.diagWrite(`[${timestamp}] [LoggingConfig] [DIAG] Creating .vscode directory...`);
        fs.mkdirSync(vscodeDir, { recursive: true });
        LoggingConfig.diagWrite(`[${timestamp}] [LoggingConfig] [DIAG] Directory created: ${fs.existsSync(vscodeDir)}`);
      } else {
        LoggingConfig.diagWrite(`[${timestamp}] [LoggingConfig] [DIAG] .vscode directory already exists`);
      }
      
      // Verify directory is writable
      try {
        const testFile = path.join(vscodeDir, '.test-write-permission');
        fs.writeFileSync(testFile, 'test', 'utf8');
        fs.unlinkSync(testFile);
        LoggingConfig.diagWrite(`[${timestamp}] [LoggingConfig] [DIAG] Directory is writable: true`);
      } catch (writeError) {
        LoggingConfig.diagWrite(`[${timestamp}] [LoggingConfig] [DIAG] Directory is writable: false - ${writeError}`);
      }
      
      LoggingConfig.logFilePath = path.join(vscodeDir, 'logs.txt');
      LoggingConfig.diagWrite(`[${timestamp}] [LoggingConfig] [DIAG] Log file path: ${LoggingConfig.logFilePath}`);
      LoggingConfig.diagWrite(`[${timestamp}] [LoggingConfig] [DIAG] Log file path is absolute: ${path.isAbsolute(LoggingConfig.logFilePath)}`);
      LoggingConfig.diagWrite(`[${timestamp}] [LoggingConfig] [DIAG] Log file exists: ${fs.existsSync(LoggingConfig.logFilePath)}`);
      
      // Verify the resolved path matches expected location
      const expectedPath = path.join(absoluteWorkspacePath, '.vscode', 'logs.txt');
      if (LoggingConfig.logFilePath !== expectedPath) {
        LoggingConfig.diagWrite(`[${timestamp}] [LoggingConfig] [DIAG] WARNING: Log file path mismatch! Expected: ${expectedPath}, Got: ${LoggingConfig.logFilePath}`);
      } else {
        LoggingConfig.diagWrite(`[${timestamp}] [LoggingConfig] [DIAG] Log file path matches expected location`);
      }
      
      // Clear the log file on initialization (fresh start for this session)
      LoggingConfig.diagWrite(`[${timestamp}] [LoggingConfig] [DIAG] Clearing log file...`);
      fs.writeFileSync(LoggingConfig.logFilePath, '', 'utf8');
      LoggingConfig.diagWrite(`[${timestamp}] [LoggingConfig] [DIAG] Log file cleared`);
      
      // Write initialization marker directly to file
      fs.appendFileSync(LoggingConfig.logFilePath, `[${timestamp}] [LoggingConfig] === Log session started ===\n`, 'utf8');
      
      // Create write stream for appending (all subsequent writes will append)
      LoggingConfig.diagWrite(`[${timestamp}] [LoggingConfig] [DIAG] Creating write stream...`);
      LoggingConfig.logStream = fs.createWriteStream(LoggingConfig.logFilePath, { 
        flags: 'a',
        encoding: 'utf8'
      });
      const streamStatus = LoggingConfig.logStream ? 'SUCCESS' : 'FAILED';
      LoggingConfig.diagWrite(`[${timestamp}] [LoggingConfig] [DIAG] Write stream created: ${streamStatus}`);
      
      // Mark as initialized - now all console output will go directly to file
      LoggingConfig.isInitialized = true;
      
      // Intercept console methods - ALL console output is now automatically written to file
      LoggingConfig.diagWrite(`[${timestamp}] [LoggingConfig] [DIAG] Setting up console interception...`);
      LoggingConfig.interceptConsole();
      LoggingConfig.diagWrite(`[${timestamp}] [LoggingConfig] [DIAG] Console interception active: ${LoggingConfig.isIntercepting}`);
      
      // Write a test message directly to verify stream works
      LoggingConfig.diagWrite(`[${timestamp}] [LoggingConfig] [DIAG] Writing test message directly to stream...`);
      if (LoggingConfig.logStream) {
        const testMsg = `[${timestamp}] [LoggingConfig] [DIAG] Direct stream write test\n`;
        LoggingConfig.logStream.write(testMsg, (err) => {
          if (err) {
            LoggingConfig.diagWrite(`[${timestamp}] [LoggingConfig] [DIAG] Direct stream write FAILED: ${err}`);
          } else {
            LoggingConfig.diagWrite(`[${timestamp}] [LoggingConfig] [DIAG] Direct stream write SUCCESS`);
          }
        });
      }
      
      // Log initialization message (this will also be written to file via interception)
      console.log(`[LoggingConfig] File logging initialized: ${LoggingConfig.logFilePath}`);
      console.log(`[LoggingConfig] All logs will be automatically written to: ${LoggingConfig.logFilePath}`);
      console.log(`[LoggingConfig] Log file will be cleared when EDH window closes`);
      
      // Write session start marker directly (before console interception is fully active)
      LoggingConfig.diagWrite(`[${timestamp}] [LoggingConfig] [DIAG] Calling writeToFile for session start marker...`);
      LoggingConfig.writeToFile(`[LoggingConfig] === Log session started at ${timestamp} ===`);
      LoggingConfig.writeToFile(`[LoggingConfig] All console output and LoggingConfig calls will be automatically logged`);
      LoggingConfig.diagWrite(`[${timestamp}] [LoggingConfig] [DIAG] writeToFile calls completed`);
      
      // Force flush the queue to ensure initial messages are written
      LoggingConfig.diagWrite(`[${timestamp}] [LoggingConfig] [DIAG] Queue length: ${LoggingConfig.writeQueue.length}`);
      LoggingConfig.diagWrite(`[${timestamp}] [LoggingConfig] [DIAG] Is writing: ${LoggingConfig.isWriting}`);
      
      // Test write using writeToFile
      LoggingConfig.diagWrite(`[${timestamp}] [LoggingConfig] [DIAG] Testing writeToFile with test message...`);
      LoggingConfig.writeToFile(`[LoggingConfig] [DIAG] Test writeToFile message at ${timestamp}`);
      
      LoggingConfig.diagWrite(`[${timestamp}] [LoggingConfig] [DIAG] ========== INITIALIZATION COMPLETE ==========`);
    } catch (error) {
      // Use diagnostic write which goes to both console and file
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      LoggingConfig.diagWrite(`[${new Date().toISOString()}] [LoggingConfig] [DIAG] FAILED to initialize file logging: ${errorMsg}`);
      if (errorStack) {
        LoggingConfig.diagWrite(`[${new Date().toISOString()}] [LoggingConfig] [DIAG] Error stack: ${errorStack}`);
      }
      LoggingConfig.originalConsoleError('[LoggingConfig] [DIAG] FAILED to initialize file logging:', error);
    }
  }
  
  /**
   * Intercept console.log/error/warn to automatically write to file
   * 
   * This ensures ALL console output is captured in logs.txt automatically.
   * Called during initialization and remains active until deactivation.
   */
  private static interceptConsole(): void {
    if (LoggingConfig.isIntercepting) {
      LoggingConfig.diagWrite(`[${new Date().toISOString()}] [LoggingConfig] [DIAG] Console already intercepted, skipping`);
      return;
    }
    
    LoggingConfig.diagWrite(`[${new Date().toISOString()}] [LoggingConfig] [DIAG] Setting up console interception...`);
    LoggingConfig.isIntercepting = true;
    
    // Store original methods BEFORE intercepting
    const originalLog = LoggingConfig.originalConsoleLog;
    const originalError = LoggingConfig.originalConsoleError;
    const originalWarn = LoggingConfig.originalConsoleWarn;
    
    // Intercept console.log - ALL console.log calls are automatically written to file
    console.log = (...args: any[]) => {
      // First, output to console (original behavior)
      originalLog.apply(console, args);
      // Then, automatically write to file using synchronous write for reliability
      try {
        const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        if (LoggingConfig.logFilePath) {
          // Use synchronous write for immediate, reliable writes
          fs.appendFileSync(LoggingConfig.logFilePath, message + '\n', 'utf8');
        }
      } catch (e) {
        // If sync write fails, fall back to async queue
        const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        LoggingConfig.writeToFile(message);
      }
    };
    
    // Intercept console.error - ALL console.error calls are automatically written to file
    console.error = (...args: any[]) => {
      originalError.apply(console, args);
      try {
        const message = '[ERROR] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        if (LoggingConfig.logFilePath) {
          fs.appendFileSync(LoggingConfig.logFilePath, message + '\n', 'utf8');
        }
      } catch (e) {
        const message = '[ERROR] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        LoggingConfig.writeToFile(message);
      }
    };
    
    // Intercept console.warn - ALL console.warn calls are automatically written to file
    console.warn = (...args: any[]) => {
      originalWarn.apply(console, args);
      try {
        const message = '[WARN] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        if (LoggingConfig.logFilePath) {
          fs.appendFileSync(LoggingConfig.logFilePath, message + '\n', 'utf8');
        }
      } catch (e) {
        const message = '[WARN] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        LoggingConfig.writeToFile(message);
      }
    };
    
    LoggingConfig.diagWrite(`[${new Date().toISOString()}] [LoggingConfig] [DIAG] Console interception setup complete`);
    
    // Test the interception immediately
    LoggingConfig.diagWrite(`[${new Date().toISOString()}] [LoggingConfig] [DIAG] Testing intercepted console.log...`);
    console.log(`[LoggingConfig] [TEST] This message should be written to file via interception`);
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
   * 
   * Automatically writes all logs to .vscode/logs.txt
   * This is called by:
   * - Console interception (console.log/error/warn)
   * - LoggingConfig methods (log, detail, verbose, error, warn, etc.)
   * - Direct calls to writeToFile
   */
  private static writeToFile(message: string): void {
    // DIAGNOSTIC: Log every writeToFile call (using original console to avoid recursion)
    const hasPath = !!LoggingConfig.logFilePath;
    const hasStream = !!LoggingConfig.logStream;
    const queueLength = LoggingConfig.writeQueue.length;
    const isWriting = LoggingConfig.isWriting;
    
    // Only log diagnostics occasionally to avoid spam (every 10th call or on errors)
    if (!LoggingConfig.writeToFileCallCount) {
      LoggingConfig.writeToFileCallCount = 0;
    }
    LoggingConfig.writeToFileCallCount++;
    
    if (LoggingConfig.writeToFileCallCount % 10 === 0 || !hasPath || !hasStream) {
      const diagMsg = `[${new Date().toISOString()}] [LoggingConfig] [DIAG] writeToFile called #${LoggingConfig.writeToFileCallCount}: path=${hasPath}, stream=${hasStream}, queue=${queueLength}, writing=${isWriting}`;
      LoggingConfig.originalConsoleLog(diagMsg);
      // Also write directly to file for diagnostics
      if (LoggingConfig.logFilePath) {
        try {
          fs.appendFileSync(LoggingConfig.logFilePath, diagMsg + '\n', 'utf8');
        } catch (e) {
          // Ignore
        }
      }
    }
    
    if (!LoggingConfig.logFilePath) {
      // Log file not initialized yet - this can happen during early startup
      const warnMsg = `[${new Date().toISOString()}] [LoggingConfig] [DIAG] writeToFile SKIPPED: logFilePath is null`;
      LoggingConfig.originalConsoleWarn(warnMsg);
      return;
    }
    
    if (!LoggingConfig.logStream) {
      // Fallback: write directly to file if stream isn't available
      const warnMsg = `[${new Date().toISOString()}] [LoggingConfig] [DIAG] writeToFile: logStream is null, using direct write`;
      LoggingConfig.originalConsoleWarn(warnMsg);
      try {
        fs.appendFileSync(LoggingConfig.logFilePath, message + '\n', 'utf8');
      } catch (e) {
        LoggingConfig.originalConsoleError(`[LoggingConfig] [DIAG] Direct write also failed:`, e);
      }
      return;
    }
    
    // Ensure message ends with newline if it doesn't already
    const messageWithNewline = message.endsWith('\n') ? message : message + '\n';
    
    // Add to queue
    LoggingConfig.writeQueue.push(messageWithNewline);
    
    if (LoggingConfig.writeToFileCallCount % 10 === 0) {
      const diagMsg = `[${new Date().toISOString()}] [LoggingConfig] [DIAG] Message queued, new queue length: ${LoggingConfig.writeQueue.length}`;
      LoggingConfig.originalConsoleLog(diagMsg);
      if (LoggingConfig.logFilePath) {
        try {
          fs.appendFileSync(LoggingConfig.logFilePath, diagMsg + '\n', 'utf8');
        } catch (e) {
          // Ignore
        }
      }
    }
    
    // Process queue if not already writing
    if (!LoggingConfig.isWriting) {
      if (LoggingConfig.writeToFileCallCount % 10 === 0) {
        LoggingConfig.originalConsoleLog(`[LoggingConfig] [DIAG] Starting processWriteQueue...`);
      }
      LoggingConfig.processWriteQueue();
    } else {
      if (LoggingConfig.writeToFileCallCount % 10 === 0) {
        LoggingConfig.originalConsoleLog(`[LoggingConfig] [DIAG] Already writing, skipping processWriteQueue`);
      }
    }
  }
  
  /**
   * Process the write queue
   */
  private static processWriteQueue(): void {
    // DIAGNOSTIC: Log queue processing
    const queueLength = LoggingConfig.writeQueue.length;
    const hasStream = !!LoggingConfig.logStream;
    
    if (queueLength % 10 === 0 || !hasStream) {
      LoggingConfig.originalConsoleLog(`[LoggingConfig] [DIAG] processWriteQueue: queue=${queueLength}, stream=${hasStream}, writing=${LoggingConfig.isWriting}`);
    }
    
    if (LoggingConfig.writeQueue.length === 0 || !LoggingConfig.logStream) {
      LoggingConfig.isWriting = false;
      if (queueLength === 0) {
        LoggingConfig.originalConsoleLog(`[LoggingConfig] [DIAG] processWriteQueue: Queue empty, stopping`);
      } else {
        LoggingConfig.originalConsoleWarn(`[LoggingConfig] [DIAG] processWriteQueue: No stream available!`);
      }
      return;
    }
    
    LoggingConfig.isWriting = true;
    const message = LoggingConfig.writeQueue.shift();
    
    if (message && LoggingConfig.logStream) {
      const messagePreview = message.substring(0, 50).replace(/\n/g, '\\n');
      if (queueLength % 10 === 0) {
        LoggingConfig.originalConsoleLog(`[LoggingConfig] [DIAG] Writing message: "${messagePreview}..."`);
      }
      
      LoggingConfig.logStream.write(message, (err) => {
        if (err) {
          LoggingConfig.originalConsoleError(`[LoggingConfig] [DIAG] Stream write ERROR:`, err);
          LoggingConfig.isWriting = false;
        } else {
          if (queueLength % 10 === 0) {
            LoggingConfig.originalConsoleLog(`[LoggingConfig] [DIAG] Stream write SUCCESS, continuing queue...`);
          }
          // Continue processing queue
          LoggingConfig.processWriteQueue();
        }
      });
    } else {
      LoggingConfig.originalConsoleWarn(`[LoggingConfig] [DIAG] processWriteQueue: No message or stream!`);
      LoggingConfig.isWriting = false;
      LoggingConfig.isWriting = false;
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
   * Called on extension deactivation (EDH window close)
   * 
   * CRITICAL: Ensures all queued writes are flushed before closing,
   * then clears the log file completely.
   */
  static async closeFileLogging(clearOnClose: boolean = true): Promise<void> {
    return new Promise((resolve) => {
      // Step 1: Flush all pending writes in the queue
      const flushQueue = (callback: () => void) => {
        if (LoggingConfig.writeQueue.length === 0 || !LoggingConfig.logStream) {
          callback();
          return;
        }
        
        // Process remaining queue items
        const processRemaining = () => {
          if (LoggingConfig.writeQueue.length === 0 || !LoggingConfig.logStream) {
            callback();
            return;
          }
          
          const message = LoggingConfig.writeQueue.shift();
          if (message && LoggingConfig.logStream) {
            LoggingConfig.logStream.write(message, () => {
              processRemaining();
            });
          } else {
            callback();
          }
        };
        
        processRemaining();
      };
      
      // Step 2: After queue is flushed, write closing message and close stream
      flushQueue(() => {
        // Restore original console methods (no longer intercept)
        LoggingConfig.restoreConsole();
        
        // Write closing message if stream exists
        if (LoggingConfig.logStream) {
          const closingMessage = `\n[LoggingConfig] === Log session ended at ${new Date().toISOString()} ===\n`;
          LoggingConfig.logStream.write(closingMessage, () => {
            if (LoggingConfig.logStream) {
              // Close the stream
              LoggingConfig.logStream.end(() => {
                LoggingConfig.logStream = null;
                
                // Step 3: Clear the file completely if requested
                if (clearOnClose && LoggingConfig.logFilePath) {
                  try {
                    // Ensure file is completely cleared
                    fs.writeFileSync(LoggingConfig.logFilePath, '', 'utf8');
                    LoggingConfig.originalConsoleLog('[LoggingConfig] Log file cleared on EDH window close');
                  } catch (error) {
                    LoggingConfig.originalConsoleError('[LoggingConfig] Failed to clear log file on close:', error);
                  }
                }
                
                // Clear the file path reference
                LoggingConfig.logFilePath = null;
                LoggingConfig.writeQueue = [];
                LoggingConfig.isWriting = false;
                
                resolve();
              });
            } else {
              resolve();
            }
          });
        } else {
          // No stream, but still try to clear file if it exists
          if (clearOnClose && LoggingConfig.logFilePath) {
            try {
              fs.writeFileSync(LoggingConfig.logFilePath, '', 'utf8');
              LoggingConfig.originalConsoleLog('[LoggingConfig] Log file cleared on EDH window close (no active stream)');
            } catch (error) {
              LoggingConfig.originalConsoleError('[LoggingConfig] Failed to clear log file:', error);
            }
          }
          LoggingConfig.logFilePath = null;
          LoggingConfig.writeQueue = [];
          LoggingConfig.isWriting = false;
          resolve();
        }
      });
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