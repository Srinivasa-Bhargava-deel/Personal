/**
 * LoggingConfig.ts
 * 
 * Centralized Logging Configuration
 * 
 * PURPOSE:
 * Provides centralized control over logging output for different modules and functions
 * throughout the extension. Enables fine-grained control over which components log
 * information, improving debugging and reducing log clutter.
 * 
 * SIGNIFICANCE IN OVERALL FLOW:
 * This utility is used by ALL modules in the extension for logging. It provides a
 * consistent logging interface and allows developers to enable/disable logging for
 * specific modules without modifying individual files. This is critical for debugging
 * and performance monitoring.
 * 
 * DATA FLOW:
 * INPUTS:
 *   - Module name (string) - Identifies which module is logging
 *   - Log message (string) - The log message to output
 *   - Log level (log/error/warn) - Severity of the log
 *   - Boolean flags (static properties) - Control whether each module logs
 * 
 * PROCESSING:
 *   1. Checks if logging is enabled for the specified module
 *   2. Formats log message with module prefix
 *   3. Outputs to console (or could be extended to file/VS Code output channel)
 * 
 * OUTPUTS:
 *   - Console log output (visible in VS Code Developer Console)
 *   - Log messages help developers debug and understand analysis flow
 * 
 * USAGE:
 *   LoggingConfig.log('TaintAnalysis', 'Taint detected in variable x');
 *   LoggingConfig.error('Parser', 'Failed to parse file', error);
 *   LoggingConfig.warn('CFGViz', 'Missing visualization data');
 * 
 * MODULE FLAGS:
 * Each module has a boolean flag that controls its logging:
 * - CFGViz: CFG visualization logging
 * - InterCFGViz: Interconnected CFG visualization logging
 * - TaintAnalysis: Taint analysis logging
 * - InterProceduralTaint: Inter-procedural taint logging
 * - ContextSensitiveTaint: Context-sensitive taint logging
 * - ReachingDefinitions: Reaching definitions logging
 * - LivenessAnalysis: Liveness analysis logging
 * - And more...
 * 
 * BENEFITS:
 * - Reduces log clutter by enabling only relevant modules
 * - Improves debugging by focusing on specific components
 * - Consistent log format across all modules
 * - Easy to toggle logging on/off without code changes
 */

export class LoggingConfig {
  // CFG Visualization
  static CFGViz: boolean = true;
  static InterCFGViz: boolean = true;
  static CallGraphViz: boolean = true;
  
  // Analysis Modules
  static TaintAnalysis: boolean = true;
  static InterProceduralTaint: boolean = true;
  static ContextSensitiveTaint: boolean = true;
  static ReachingDefinitions: boolean = true;
  static LivenessAnalysis: boolean = true;
  static InterProceduralRD: boolean = true;
  
  // Call Graph Analysis
  static CallGraphAnalysis: boolean = true;
  static ParameterAnalysis: boolean = true;
  static ReturnValueAnalysis: boolean = true;
  
  // Security Analysis
  static SecurityAnalysis: boolean = true;
  
  // Parser
  static Parser: boolean = true;
  
  // State Management
  static StateManager: boolean = true;
  
  // Dataflow Analyzer (orchestrator)
  static DataflowAnalyzer: boolean = true;
  
  // Extension
  static Extension: boolean = true;
  
  /**
   * Log message if the specified module logging is enabled
   */
  static log(module: keyof typeof LoggingConfig, message: string, ...args: any[]): void {
    if (LoggingConfig[module] === true) {
      console.log(message, ...args);
    }
  }
  
  /**
   * Log error message (always logged, but prefixed with module name)
   */
  static error(module: keyof typeof LoggingConfig, message: string, ...args: any[]): void {
    console.error(`[${module}]`, message, ...args);
  }
  
  /**
   * Log warning message (always logged, but prefixed with module name)
   */
  static warn(module: keyof typeof LoggingConfig, message: string, ...args: any[]): void {
    console.warn(`[${module}]`, message, ...args);
  }
}

