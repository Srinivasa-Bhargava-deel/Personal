/**
 * Error handling utility for consistent error reporting
 * 
 * CRITICAL FIX (LOGIC.md #15): Provides consistent error handling strategy
 * across the codebase. All errors should use these functions.
 */

export enum ErrorSeverity {
  ERROR = 'ERROR',      // Critical errors that prevent operation
  WARNING = 'WARNING',  // Non-critical issues that may affect results
  INFO = 'INFO'         // Informational messages
}

/**
 * Log an error with consistent formatting
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
  
  console.error(`[${component}] ERROR: ${message}${errorStr}${contextStr}`);
}

/**
 * Log a warning with consistent formatting
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
  console.warn(`[${component}] WARNING: ${message}${contextStr}`);
}

/**
 * Log an info message with consistent formatting
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
  console.log(`[${component}] INFO: ${message}${contextStr}`);
}

