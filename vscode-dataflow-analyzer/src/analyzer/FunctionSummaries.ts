/**
 * Library Function Summaries - Phase 4 of IPA Framework
 * 
 * Provides summaries for external/library functions that we cannot analyze
 * from source code. These summaries describe:
 * 1. Parameter effects (which params are read/written)
 * 2. Return values (what the function returns)
 * 3. Side effects (global modifications)
 * 4. Taint propagation (which params taint return value)
 * 
 * Academic Foundation:
 * - "Interprocedural Constant Propagation" (Callahan et al., 1986)
 * - "Flow-Sensitive Pointer Analysis" (Reps, Horwitz, Sagiv, 1995)
 * - Chapter 9: Inter-Procedural Analysis, "Engineering a Compiler"
 * 
 * Example:
 *   strcpy(dest, src) - copies src to dest, returns dest
 *   Summary: param[0] = OUT, param[1] = IN, return tainted by param[1]
 */

/**
 * Parameter access mode for library functions.
 */
export enum ParameterMode {
  /** Parameter is only read (input) */
  IN = 'in',
  
  /** Parameter is only written (output) */
  OUT = 'out',
  
  /** Parameter is both read and written (input/output) */
  INOUT = 'inout'
}

/**
 * Summary of a library function parameter.
 */
export interface ParameterSummary {
  /** Parameter index (0-based) */
  index: number;
  
  /** Parameter name */
  name: string;
  
  /** Access mode (read/write/both) */
  mode: ParameterMode;
  
  /** Does this parameter taint the return value? */
  taintPropagation: boolean;
  
  /** Description of parameter purpose */
  description?: string;
}

/**
 * Summary of a library function's return value.
 */
export interface ReturnValueSummary {
  /** Return type */
  type: string;
  
  /** Is return value tainted by any parameter? */
  isTainted: boolean;
  
  /** Which parameter indices affect the return value */
  depends: number[];
  
  /** Description of return value */
  description?: string;
}

/**
 * Summary of global variable effects.
 */
export interface GlobalEffect {
  /** Global variable name */
  variable: string;
  
  /** Is this variable modified? */
  modified: boolean;
  
  /** Is this variable tainted? */
  tainted: boolean;
  
  /** Description of effect */
  description?: string;
}

/**
 * Complete summary for a library function.
 */
export interface FunctionSummary {
  /** Function name */
  name: string;
  
  /** Function parameters */
  parameters: ParameterSummary[];
  
  /** Return value information */
  returnValue: ReturnValueSummary;
  
  /** Global variable effects */
  globalEffects: GlobalEffect[];
  
  /** Category of function (stdlib, posix, etc.) */
  category?: string;
  
  /** Description of function behavior */
  description?: string;
}

/**
 * Library function summaries database.
 * 
 * Contains summaries for common C/C++ standard library functions.
 */
export class FunctionSummaries {
  private summaries: Map<string, FunctionSummary> = new Map();

  constructor() {
    this.initializeStandardLibrary();
  }

  /**
   * Initialize standard library function summaries.
   */
  private initializeStandardLibrary(): void {
    // String manipulation functions
    this.addSummary({
      name: 'strcpy',
      parameters: [
        {
          index: 0,
          name: 'dest',
          mode: ParameterMode.OUT,
          taintPropagation: false,
          description: 'Destination buffer (written)'
        },
        {
          index: 1,
          name: 'src',
          mode: ParameterMode.IN,
          taintPropagation: true,
          description: 'Source string (read, taints return)'
        }
      ],
      returnValue: {
        type: 'char*',
        isTainted: true,
        depends: [1],
        description: 'Returns dest, tainted by src'
      },
      globalEffects: [],
      category: 'string',
      description: 'Copies string from src to dest'
    });

    this.addSummary({
      name: 'strcat',
      parameters: [
        {
          index: 0,
          name: 'dest',
          mode: ParameterMode.INOUT,
          taintPropagation: false,
          description: 'Destination buffer (read and written)'
        },
        {
          index: 1,
          name: 'src',
          mode: ParameterMode.IN,
          taintPropagation: true,
          description: 'Source string (read, taints return)'
        }
      ],
      returnValue: {
        type: 'char*',
        isTainted: true,
        depends: [1],
        description: 'Returns dest, tainted by src'
      },
      globalEffects: [],
      category: 'string',
      description: 'Appends src to dest'
    });

    this.addSummary({
      name: 'sprintf',
      parameters: [
        {
          index: 0,
          name: 'str',
          mode: ParameterMode.OUT,
          taintPropagation: false,
          description: 'Output buffer (written)'
        },
        {
          index: 1,
          name: 'format',
          mode: ParameterMode.IN,
          taintPropagation: true,
          description: 'Format string (read, taints return)'
        }
        // Additional parameters are variadic
      ],
      returnValue: {
        type: 'int',
        isTainted: false,
        depends: [],
        description: 'Number of characters written'
      },
      globalEffects: [],
      category: 'string',
      description: 'Formats output to string'
    });

    // Memory management functions
    this.addSummary({
      name: 'malloc',
      parameters: [
        {
          index: 0,
          name: 'size',
          mode: ParameterMode.IN,
          taintPropagation: false,
          description: 'Size in bytes (read)'
        }
      ],
      returnValue: {
        type: 'void*',
        isTainted: false,
        depends: [],
        description: 'Pointer to allocated memory'
      },
      globalEffects: [],
      category: 'memory',
      description: 'Allocates memory'
    });

    this.addSummary({
      name: 'free',
      parameters: [
        {
          index: 0,
          name: 'ptr',
          mode: ParameterMode.IN,
          taintPropagation: false,
          description: 'Pointer to free (read)'
        }
      ],
      returnValue: {
        type: 'void',
        isTainted: false,
        depends: [],
        description: 'No return value'
      },
      globalEffects: [],
      category: 'memory',
      description: 'Frees allocated memory'
    });

    this.addSummary({
      name: 'memcpy',
      parameters: [
        {
          index: 0,
          name: 'dest',
          mode: ParameterMode.OUT,
          taintPropagation: false,
          description: 'Destination buffer (written)'
        },
        {
          index: 1,
          name: 'src',
          mode: ParameterMode.IN,
          taintPropagation: true,
          description: 'Source buffer (read, taints return)'
        },
        {
          index: 2,
          name: 'n',
          mode: ParameterMode.IN,
          taintPropagation: false,
          description: 'Number of bytes (read)'
        }
      ],
      returnValue: {
        type: 'void*',
        isTainted: true,
        depends: [1],
        description: 'Returns dest, tainted by src'
      },
      globalEffects: [],
      category: 'memory',
      description: 'Copies memory from src to dest'
    });

    // I/O functions
    this.addSummary({
      name: 'printf',
      parameters: [
        {
          index: 0,
          name: 'format',
          mode: ParameterMode.IN,
          taintPropagation: false,
          description: 'Format string (read)'
        }
        // Additional parameters are variadic
      ],
      returnValue: {
        type: 'int',
        isTainted: false,
        depends: [],
        description: 'Number of characters printed'
      },
      globalEffects: [],
      category: 'io',
      description: 'Prints formatted output'
    });

    this.addSummary({
      name: 'scanf',
      parameters: [
        {
          index: 0,
          name: 'format',
          mode: ParameterMode.IN,
          taintPropagation: false,
          description: 'Format string (read)'
        }
        // Additional parameters are variadic (OUT)
      ],
      returnValue: {
        type: 'int',
        isTainted: false,
        depends: [],
        description: 'Number of items read'
      },
      globalEffects: [],
      category: 'io',
      description: 'Reads formatted input'
    });

    // File I/O
    this.addSummary({
      name: 'fopen',
      parameters: [
        {
          index: 0,
          name: 'filename',
          mode: ParameterMode.IN,
          taintPropagation: true,
          description: 'File name (read, taints return)'
        },
        {
          index: 1,
          name: 'mode',
          mode: ParameterMode.IN,
          taintPropagation: false,
          description: 'File mode (read)'
        }
      ],
      returnValue: {
        type: 'FILE*',
        isTainted: true,
        depends: [0],
        description: 'File pointer, tainted by filename'
      },
      globalEffects: [],
      category: 'io',
      description: 'Opens a file'
    });

    this.addSummary({
      name: 'fread',
      parameters: [
        {
          index: 0,
          name: 'ptr',
          mode: ParameterMode.OUT,
          taintPropagation: false,
          description: 'Buffer to read into (written)'
        },
        {
          index: 1,
          name: 'size',
          mode: ParameterMode.IN,
          taintPropagation: false,
          description: 'Size of each element (read)'
        },
        {
          index: 2,
          name: 'nmemb',
          mode: ParameterMode.IN,
          taintPropagation: false,
          description: 'Number of elements (read)'
        },
        {
          index: 3,
          name: 'stream',
          mode: ParameterMode.IN,
          taintPropagation: true,
          description: 'File stream (read, taints return)'
        }
      ],
      returnValue: {
        type: 'size_t',
        isTainted: false,
        depends: [],
        description: 'Number of elements read'
      },
      globalEffects: [],
      category: 'io',
      description: 'Reads from file stream'
    });
  }

  /**
   * Add a function summary to the database.
   * 
   * @param summary - Function summary to add
   */
  addSummary(summary: FunctionSummary): void {
    this.summaries.set(summary.name, summary);
  }

  /**
   * Get summary for a library function.
   * 
   * @param funcName - Function name
   * @returns Function summary or null if not found
   */
  getSummary(funcName: string): FunctionSummary | null {
    return this.summaries.get(funcName) || null;
  }

  /**
   * Check if a function has a summary.
   * 
   * @param funcName - Function name
   * @returns true if summary exists
   */
  hasSummary(funcName: string): boolean {
    return this.summaries.has(funcName);
  }

  /**
   * Get all summaries for a category.
   * 
   * @param category - Category name
   * @returns Array of function summaries
   */
  getSummariesByCategory(category: string): FunctionSummary[] {
    return Array.from(this.summaries.values()).filter(
      s => s.category === category
    );
  }

  /**
   * Get all function names with summaries.
   * 
   * @returns Array of function names
   */
  getAllFunctionNames(): string[] {
    return Array.from(this.summaries.keys());
  }
}

/**
 * Global instance of function summaries database.
 */
export const LIBRARY_SUMMARIES = new FunctionSummaries();

/**
 * Get summary for a library function (convenience function).
 * 
 * @param funcName - Function name
 * @returns Function summary or null if not found
 */
export function getFunctionSummary(funcName: string): FunctionSummary | null {
  return LIBRARY_SUMMARIES.getSummary(funcName);
}
