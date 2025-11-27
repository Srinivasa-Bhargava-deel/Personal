/**
 * ErrorLogger.ts
 * 
 * Error Logger - Consistent Error Handling Utility
 * 
 * PURPOSE:
 * Provides consistent error handling and reporting across the entire extension.
 * Ensures all errors are logged with proper formatting, severity levels, and context
 * information, making debugging and error tracking easier.
 * 
 * SIGNIFICANCE IN OVERALL FLOW:
 * This utility is used throughout the extension for error reporting. It provides a
 * standardized way to log errors, warnings, and informational messages, ensuring
 * consistent error handling across all modules. This is critical for debugging
 * and user experience.
 * 
 * DATA FLOW:
 * INPUTS:
 *   - Component name (string) - Identifies which component is reporting the error
 *   - Message (string) - Error message
 *   - Error object (optional) - The actual error that occurred
 *   - Context (optional) - Additional context information
 *   - Severity (ERROR/WARNING/INFO) - Severity level
 * 
 * PROCESSING:
 *   1. Formats error message with component prefix
 *   2. Includes error details if error object provided
 *   3. Includes context information if provided
 *   4. Outputs to console with appropriate formatting
 *   5. Could be extended to write to file or VS Code output channel
 * 
 * OUTPUTS:
 *   - Formatted error messages to console
 *   - Error information helps developers debug issues
 *   - Consistent error format improves maintainability
 * 
 * USAGE:
 *   logError('Parser', 'Failed to parse file', error, { filePath: 'test.cpp' });
 *   logWarning('Analyzer', 'Function has no CFG', undefined, { functionName: 'foo' });
 *   logInfo('Visualizer', 'Panel created successfully');
 * 
 * CRITICAL FIX (LOGIC.md #15):
 * Provides consistent error handling strategy across the codebase. All errors should
 * use these functions to ensure uniform error reporting and easier debugging.
 */

import { LoggingConfig } from './LoggingConfig';

export enum ErrorSeverity {
  ERROR = 'ERROR',      // Critical errors that prevent operation
  WARNING = 'WARNING',  // Non-critical issues that may affect results
  INFO = 'INFO'         // Informational messages
}

/**
 * Log an error with consistent formatting
 * 
 * Integrates with LoggingConfig for centralized logging control.
 * Also outputs to console.error for immediate visibility.
 * 
 * @param component - Component name (e.g., 'Parser', 'Analyzer')
 * @param message - Error message
 * @param error - Optional error object
 * @param context - Additional context information
 */
export function logError(
  component: string,
  message: string,
  error?: Error | unknown,
  context?: Record<string, any>
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const contextStr = context ? ` Context: ${JSON.stringify(context)}` : '';
  const errorStr = error ? ` Error: ${errorMessage}` : '';
  
  const fullMessage = `${message}${errorStr}${contextStr}`;
  
  // Use LoggingConfig for centralized logging
  LoggingConfig.error(component as any, fullMessage);
  
  // Also output to console for immediate visibility
  console.error(`[${component}] ERROR: ${fullMessage}`);
  
  // Log stack trace if available
  if (error instanceof Error && error.stack) {
    LoggingConfig.raw(`[${component}] Stack trace: ${error.stack}`);
  }
}

/**
 * Log a warning with consistent formatting
 * 
 * Integrates with LoggingConfig for centralized logging control.
 * Also outputs to console.warn for immediate visibility.
 * 
 * @param component - Component name
 * @param message - Warning message
 * @param context - Additional context information
 */
export function logWarning(
  component: string,
  message: string,
  context?: Record<string, any>
): void {
  const contextStr = context ? ` Context: ${JSON.stringify(context)}` : '';
  const fullMessage = `${message}${contextStr}`;
  
  // Use LoggingConfig for centralized logging
  LoggingConfig.warn(component as any, fullMessage);
  
  // Also output to console for immediate visibility
  console.warn(`[${component}] WARNING: ${fullMessage}`);
}

/**
 * Log an info message with consistent formatting
 * 
 * Integrates with LoggingConfig for centralized logging control.
 * Also outputs to console.log for immediate visibility.
 * 
 * @param component - Component name
 * @param message - Info message
 * @param context - Additional context information
 */
export function logInfo(
  component: string,
  message: string,
  context?: Record<string, any>
): void {
  const contextStr = context ? ` Context: ${JSON.stringify(context)}` : '';
  const fullMessage = `${message}${contextStr}`;
  
  // Use LoggingConfig for centralized logging (if component matches a known module)
  // Otherwise just use console.log
  try {
    LoggingConfig.log(component as any, fullMessage);
  } catch {
    // Component not in LoggingConfig, use console directly
    console.log(`[${component}] INFO: ${fullMessage}`);
  }
}

