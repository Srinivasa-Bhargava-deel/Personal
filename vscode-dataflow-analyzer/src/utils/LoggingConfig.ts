/**
 * Centralized Logging Configuration
 * 
 * Controls logging output for different modules/functions.
 * Set flags to true to enable logging for specific modules.
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

