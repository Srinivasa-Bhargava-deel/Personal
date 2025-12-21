/**
 * ClangASTParser.ts
 * 
 * Clang AST Parser - Integration with Clang/LLVM for C++ Static Analysis
 * 
 * PURPOSE:
 * This module provides the bridge between the VS Code extension and official Clang/LLVM libraries.
 * It wraps the cfg-exporter C++ binary and handles the communication between the TypeScript
 * extension and the native CFG generation tool.
 * 
 * SIGNIFICANCE IN OVERALL FLOW:
 * This is the INTERFACE layer between the TypeScript extension and the C++ cfg-exporter tool.
 * It spawns the cfg-exporter process, reads its JSON output, and converts it to an ASTNode
 * format that EnhancedCPPParser can process. This enables the extension to leverage official
 * Clang/LLVM CFG generation without reimplementing it in TypeScript.
 * 
 * DATA FLOW:
 * INPUTS:
 *   - C++ source file path (from EnhancedCPPParser.ts)
 *   - Compiler arguments (optional, for include paths, etc.)
 *   - cfg-exporter binary (located at cpp-tools/cfg-exporter/build/cfg-exporter)
 * 
 * PROCESSING:
 *   1. Spawns cfg-exporter process with source file path
 *   2. Reads JSON output from cfg-exporter stdout
 *   3. Parses JSON to ASTNode structure
 *   4. Handles errors and timeouts
 *   5. Caches include paths for performance
 * 
 * OUTPUTS:
 *   - ASTNode object containing:
 *     - Functions array with CFG blocks
 *     - Block metadata (ID, label, entry/exit flags)
 *     - Statements with text and ranges
 *     - Predecessors and successors (control flow edges)
 *   - ASTNode -> EnhancedCPPParser.ts (for further processing)
 * 
 * DEPENDENCIES:
 *   - cfg-exporter.cpp: Native C++ binary that generates CFG JSON
 *   - Child process API: For spawning cfg-exporter
 * 
 * KEY FEATURES:
 * - Official Clang/LLVM integration (NOT a parse-only solution)
 * - CFG block extraction with predecessors/successors
 * - Statement-level granularity for dataflow analysis
 * - Cross-platform support (macOS, Linux, Windows)
 * - Include path discovery and caching
 * 
 * ACADEMIC FOUNDATION:
 * - CFGs follow the standard compiler textbook representation
 * - Each block contains statements and control flow edges
 * - Entry/exit blocks properly identified
 * 
 * REFERENCES:
 * - Clang/LLVM Documentation
 * - "Engineering a Compiler" (Cooper & Torczon)
 * - "Compilers: Principles, Techniques, and Tools" (Aho, Sethi, Ullman)
 */

import * as child_process from 'child_process';
import * as util from 'util';
import * as path from 'path';
import { Range, Statement, StatementType } from '../types';
import { FunctionCallExtractor } from './FunctionCallExtractor';
import { LoggingConfig } from '../utils/LoggingConfig';

/**
 * Represents a source code location (file, line, column, offset).
 * Used to map AST nodes back to source code for user interaction.
 */
export interface SourceLocation {
  file: string;        // Source file path
  line: number;        // Line number (1-indexed)
  column: number;      // Column number (1-indexed)
  offset: number;      // Character offset in file
}

export enum CXCursorKind {
  FUNCTION_DECL = 8,
  CXX_METHOD = 21,
  VAR_DECL = 9,
  PARM_DECL = 10,
  FIELD_DECL = 6,
  COMPOUND_STMT = 203,
  IF_STMT = 205,
  WHILE_STMT = 209,
  FOR_STMT = 210,
  DO_STMT = 211,
  SWITCH_STMT = 206,
  CASE_STMT = 207,
  DEFAULT_STMT = 208,
  RETURN_STMT = 215,
  BREAK_STMT = 214,
  CONTINUE_STMT = 213,
  GOTO_STMT = 212,
  LABEL_STMT = 204,
  DECL_STMT = 201,
  BINARY_OPERATOR = 114,
  UNARY_OPERATOR = 112,
  CALL_EXPR = 103,
  DECL_REF_EXPR = 101,
  MEMBER_REF_EXPR = 102,
  ARRAY_SUBSCRIPT_EXPR = 113,
  CONDITIONAL_OPERATOR = 116,
  INTEGER_LITERAL = 106,
  FLOATING_LITERAL = 107,
  STRING_LITERAL = 109,
  CHARACTER_LITERAL = 110,
  CLASS_DECL = 4,
  STRUCT_DECL = 2,
  UNION_DECL = 3,
  ENUM_DECL = 5,
  TYPEDEF_DECL = 20,
  NAMESPACE = 22,
  TRANSLATION_UNIT = 300,
  UNEXPOSED_DECL = 1
}

export interface ASTNode {
  kind: CXCursorKind | string; // Allow string kinds for CFG nodes
  kindName?: string;
  spelling?: string;
  location?: SourceLocation;
  extent?: { start: SourceLocation; end: SourceLocation };
  children?: ASTNode[];
  isDefinition?: boolean;
  type?: string;
  storageClass?: string;
  // CFG-specific properties
  name?: string;
  inner?: ASTNode[] | { [name: string]: ASTNode };
  range?: Range;
  id?: string;
  label?: string;
  statements?: Statement[];
  successors?: string[];
  predecessors?: string[];
  isEntry?: boolean;
  isExit?: boolean;
}

const exec = util.promisify(child_process.exec);

export interface ClangASTNode {
  kind: string;
  name?: string;
  value?: string;
  loc?: {
    file: string;
    line: number;
    col: number;
    offset: number;
  };
  range?: {
    begin: { line: number; col: number; offset: number };
    end: { line: number; col: number; offset: number };
  };
  inner?: ClangASTNode[];
  type?: string;
  storageClass?: string;
  isDefinition?: boolean;
}

export class ClangASTParser {
  private clangPath: string | null = null;
  private cachedIncludePaths: string[] | null = null;

  constructor() {
    this.clangPath = this.findClang();
    // Discover include paths once during initialization
    this.cachedIncludePaths = this.discoverIncludePaths();
  }

  /**
   * Discover clang's include paths by querying the compiler directly
   * This ensures compatibility with different LLVM/SDK versions
   */
  private discoverIncludePaths(): string[] {
    const paths: string[] = [];
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { execSync } = require('child_process');
      const os = require('os');
      const platform = os.platform();
      
      // Determine clang path based on platform
      let clangPath = this.clangPath;
      if (!clangPath) {
        if (platform === 'linux') {
          // Linux: try clang-17 first (from LLVM 17), then clang
          try {
            execSync('which clang-17', { encoding: 'utf8', stdio: 'ignore' });
            clangPath = 'clang-17';
          } catch {
            clangPath = 'clang';
          }
        } else if (platform === 'darwin') {
          // macOS: try Homebrew LLVM first
          clangPath = '/opt/homebrew/opt/llvm/bin/clang';
        } else {
          clangPath = 'clang';
        }
      }
      
      try {
        // Run clang in verbose mode to see where it looks for headers
        // This gives us the exact SDK and system paths clang is using
        // Use /dev/null on Unix, NUL on Windows
        const nullDevice = platform === 'win32' ? 'NUL' : '/dev/null';
        const output = execSync(`${clangPath} -E -v -x c++ ${nullDevice} 2>&1`, {
          encoding: 'utf8',
          maxBuffer: 10 * 1024 * 1024
        });
        
        // Parse the output to extract include paths
        const lines = output.split('\n');
        let inSearchPaths = false;
        
        for (const line of lines) {
          // Start collecting after "search list:" marker
          if (line.includes('search list:') || line.includes('#include <...>')) {
            inSearchPaths = true;
            continue;
          }
          
          // Stop at the end of search paths (empty line or new section)
          if (inSearchPaths && (line.trim() === '' || line.includes('End of search list'))) {
            break;
          }
          
          // Collect actual paths
          if (inSearchPaths) {
            const trimmedPath = line.trim();
            if (trimmedPath && trimmedPath.startsWith('/')) {
              paths.push(`-isystem${trimmedPath}`);
            }
          }
        }
        
        LoggingConfig.detail('Parser', `Discovered clang include paths: ${paths.length > 0 ? paths.join(', ') : 'none found'}`);
      } catch (verboseError) {
        LoggingConfig.detail('Parser', `Verbose clang query failed: ${verboseError}, using platform-specific fallbacks`);
        
        if (platform === 'linux') {
          // Linux fallback paths (Ubuntu/Debian)
          paths.push('-isystem/usr/include');
          paths.push('-isystem/usr/include/c++/11');
          paths.push('-isystem/usr/include/x86_64-linux-gnu/c++/11');
          paths.push('-isystem/usr/lib/llvm-17/include');
          paths.push('-isystem/usr/include/c++/v1');
        } else if (platform === 'darwin') {
          // macOS fallback: use xcrun to get SDK path
          try {
            const sdkPath = execSync('xcrun --show-sdk-path 2>/dev/null', {
              encoding: 'utf8'
            }).trim();
            
            if (sdkPath) {
              paths.push(`-isysroot${sdkPath}`);
              paths.push(`-isystem${sdkPath}/usr/include`);
            }
          } catch (sdkError) {
            // Ignore SDK discovery failure
          }
          
          // Add Homebrew LLVM paths as fallback
          paths.push('-I/opt/homebrew/opt/llvm/include/c++/v1');
          paths.push('-I/opt/homebrew/opt/llvm/lib/clang/21.1.5/include');
          paths.push('-isystem/usr/include');
        } else {
          // Windows or other: generic fallback
          paths.push('-isystem/usr/include');
        }
      }
    } catch (err) {
      LoggingConfig.warn('Parser', `Include path discovery failed completely: ${err}, using hardcoded fallbacks`);
      const os = require('os');
      const platform = os.platform();
      
      if (platform === 'linux') {
        // Linux fallback paths
        paths.push('-isystem/usr/include');
        paths.push('-isystem/usr/include/c++/11');
        paths.push('-isystem/usr/lib/llvm-17/include');
      } else if (platform === 'darwin') {
        // macOS fallback
        paths.push('-I/opt/homebrew/opt/llvm/include/c++/v1');
        paths.push('-I/opt/homebrew/opt/llvm/lib/clang/21.1.5/include');
        paths.push('-isystem/usr/include');
      } else {
        // Windows or other
        paths.push('-isystem/usr/include');
      }
    }
    
    return paths;
  }

  /**
   * Find clang executable in system PATH.
   * 
   * Searches common installation locations for the clang/clang++ binary.
   * 
   * Platform Support:
   * - Linux: /usr/bin/clang, /usr/local/bin/clang
   * - macOS: /usr/bin/clang, /opt/homebrew/bin/clang (Homebrew)
   * - Windows: clang.exe in PATH
   * 
   * @returns Path to clang executable, or null if not found
   */
  private findClang(): string | null {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const os = require('os');
    const platform = os.platform();
    
    // List of possible installation locations (platform-specific)
    let possiblePaths: string[] = [];
    
    if (platform === 'linux') {
      // Linux: prioritize clang-17 (from LLVM 17), then standard clang
      possiblePaths = [
        'clang-17',
        'clang++-17',
        '/usr/bin/clang-17',
        '/usr/bin/clang++-17',
        'clang',
        'clang++',
        '/usr/bin/clang',
        '/usr/bin/clang++',
        '/usr/local/bin/clang',
        '/usr/local/bin/clang++'
      ];
    } else if (platform === 'darwin') {
      // macOS: Homebrew LLVM first, then system clang
      possiblePaths = [
        '/opt/homebrew/opt/llvm/bin/clang',
        '/opt/homebrew/opt/llvm/bin/clang++',
        '/opt/homebrew/bin/clang',
        '/opt/homebrew/bin/clang++',
        '/usr/bin/clang',
        '/usr/bin/clang++',
        'clang',
        'clang++'
      ];
    } else {
      // Windows or other: generic paths
      possiblePaths = [
        'clang',
        'clang++',
        'clang.exe',
        'clang++.exe'
      ];
    }

    // Try each location using 'which' command
    for (const clang of possiblePaths) {
      try {
        child_process.execSync(`which ${clang}`, { stdio: 'ignore' });
        return clang;  // Found - return this path
      } catch {
        continue;      // Not found at this location - try next
      }
    }

    return null;  // Clang not found in any known location
  }

  /**
   * Check if clang is available on this system.
   * 
   * @returns true if clang was found during initialization
   */
  isAvailable(): boolean {
    return this.clangPath !== null;
  }

  /**
   * Parse C++ source file using clang CFG generation.
   * 
   * Architecture:
   * 1. Invokes clang with -analyze flag to generate CFG
   * 2. Passes output to cfg-exporter for JSON conversion
   * 3. Converts JSON to our internal AST representation
   * 
   * This method uses official Clang/LLVM libraries for CFG generation,
   * ensuring theoretical correctness and academic soundness.
   * 
   * @param filePath - Path to C++ source file
   * @param args - Additional compiler arguments
   * @returns AST representation of the file's functions
   * @throws Error if clang is not available or parsing fails
   */
  async parseFile(filePath: string, args: string[] = []): Promise<ASTNode | null> {
    LoggingConfig.section('Parser', `ClangASTParser.parseFile: ${filePath}`);
    LoggingConfig.log('Parser', `File path: ${filePath}`);
    LoggingConfig.detail('Parser', `Additional args: ${args.length > 0 ? args.join(' ') : 'none'}`);
    
    if (!this.clangPath) {
      LoggingConfig.error('Parser', 'Clang is not available');
      throw new Error('Clang is not available');
    }

    LoggingConfig.detail('Parser', `Using clang path: ${this.clangPath}`);
    const parseStartTime = Date.now();

    try {
      // Use clang CFG dump to generate control flow graphs using C++ libraries
      // This leverages Clang's built-in CFG generation instead of manual AST traversal
      const clangArgs = [
        '-Xclang',
        '-analyze',
        '-Xclang',
        '-analyzer-checker=debug.DumpCFG',
        '-fsyntax-only',
        '-fno-color-diagnostics',
        '-std=c++17',
        // Try to limit includes to reduce CFG size
        '-Wno-everything', // Suppress warnings to reduce stderr noise
        ...args,
        filePath
      ];

      LoggingConfig.detail('Parser', `Clang args: ${clangArgs.join(' ')}`);
      
      // Use streaming parser for large files
      const result = await this.parseFileStreaming(filePath, clangArgs);
      const parseTimeMs = Date.now() - parseStartTime;
      
      if (result) {
        const funcCount = result.inner ? (Array.isArray(result.inner) ? result.inner.length : Object.keys(result.inner).length) : 0;
        LoggingConfig.log('Parser', `Parse successful: ${funcCount} functions found in ${parseTimeMs}ms`);
      } else {
        LoggingConfig.warn('Parser', `Parse returned null (no AST generated) after ${parseTimeMs}ms`);
      }
      
      return result;
    } catch (error: any) {
      const parseTimeMs = Date.now() - parseStartTime;
      LoggingConfig.error('Parser', `Error parsing with clang: ${error.message}`, error);
      LoggingConfig.log('Parser', `Parse failed after ${parseTimeMs}ms`);
      throw error;
    }
  }

  /**
   * Parse file using cfg-exporter binary that outputs JSON
   * Uses the libclang-based exporter for clean, structured CFG output
   */
  private async parseFileStreaming(filePath: string, clangArgs: string[]): Promise<ASTNode | null> {
    return new Promise((resolve, reject) => {
      // Build path to cfg-exporter binary
      // Relative path: from src/analyzer -> src -> . (root) -> cpp-tools/cfg-exporter/build/cfg-exporter
      // Windows: build/Release/cfg-exporter.exe
      // Unix: build/cfg-exporter
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-non-null-asserted-optional-chain
      const fs = require('fs');
      const isWindows = process.platform === 'win32';
      
      // Build list of potential paths to check, ordered by priority
      const binaryName = isWindows ? 'cfg-exporter.exe' : 'cfg-exporter';
      const potentialPaths: string[] = [
        // Windows Release build path (highest priority for Windows)
        path.join(__dirname, '..', '..', 'cpp-tools', 'cfg-exporter', 'build', 'Release', binaryName),
        // Direct build path (works for both Windows and Unix)
        path.join(__dirname, '..', '..', 'cpp-tools', 'cfg-exporter', 'build', binaryName),
        // Unix path without extension (for compatibility)
        path.join(__dirname, '..', '..', 'cpp-tools', 'cfg-exporter', 'build', 'cfg-exporter'),
        // Docker container path (Linux)
        path.join('/app', 'cpp-tools', 'cfg-exporter', 'build', 'cfg-exporter'),
        // Current working directory path
        path.join(process.cwd(), 'cpp-tools', 'cfg-exporter', 'build', binaryName),
        path.join(process.cwd(), 'cpp-tools', 'cfg-exporter', 'build', 'cfg-exporter'),
        // PATH-based lookup
        isWindows ? 'cfg-exporter.exe' : 'cfg-exporter',
        'cfg-exporter'
      ];
      
      // On Windows, also check for .exe variants in alternative locations
      if (isWindows) {
        potentialPaths.push(
          path.join(process.cwd(), 'cpp-tools', 'cfg-exporter', 'build', 'Release', 'cfg-exporter.exe'),
          path.join('/app', 'cpp-tools', 'cfg-exporter', 'build', 'cfg-exporter.exe')
        );
      }
      
      let exporterPath: string | null = null;
      const checkedPaths: string[] = [];
      
      // Try each path in order
      for (const testPath of potentialPaths) {
        checkedPaths.push(testPath);
        if (fs.existsSync(testPath)) {
          exporterPath = testPath;
          console.log(`[ClangASTParser] Found cfg-exporter at: ${exporterPath}`);
          break;
        }
      }
      
      try {
        // Check if exporter exists
        if (!exporterPath) {
          // Log all checked paths for debugging
          console.error(`[ClangASTParser] cfg-exporter not found. Checked paths:`);
          checkedPaths.forEach((p, idx) => {
            console.error(`  ${idx + 1}. ${p}`);
          });
          
          const buildInstructions = isWindows 
            ? 'cd cpp-tools\\cfg-exporter\\build && cmake .. -G "Visual Studio 17 2022" -A x64 && cmake --build . --config Release'
            : 'cd cpp-tools/cfg-exporter && mkdir -p build && cd build && cmake .. && cmake --build .';
          reject(new Error(`cfg-exporter binary not found. Checked ${checkedPaths.length} paths. Please build it first: ${buildInstructions}`));
          return;
        }
        
        // Ensure Windows paths have .exe extension
        if (isWindows && !exporterPath.endsWith('.exe')) {
          const exePath = exporterPath + '.exe';
          if (fs.existsSync(exePath)) {
            exporterPath = exePath;
            console.log(`[ClangASTParser] Using .exe variant: ${exporterPath}`);
          }
        }
        
        // Verify binary is executable and valid ELF (Unix/Linux)
        if (!isWindows) {
          try {
            const stats = fs.statSync(exporterPath);
            const isExecutable = (stats.mode & parseInt('111', 8)) !== 0;
            if (!isExecutable) {
              console.warn(`[ClangASTParser] Warning: cfg-exporter at ${exporterPath} may not be executable. Attempting to chmod +x...`);
              try {
                fs.chmodSync(exporterPath, '755');
              } catch (chmodErr) {
                console.warn(`[ClangASTParser] Could not make binary executable: ${chmodErr}`);
              }
            }
            
            // Verify binary is actually an ELF binary, not a script or corrupted file
            const child_process = require('child_process');
            try {
              // First check ELF magic bytes directly (more reliable than file command)
              const fileBuffer = fs.readFileSync(exporterPath);
              const elfMagic = fileBuffer.readUInt32BE(0);
              const isValidELF = elfMagic === 0x7f454c46; // 0x7f 'E' 'L' 'F'
              
              if (!isValidELF) {
                // Check if it looks like a shell script (starts with #!)
                const firstBytes = fileBuffer.toString('utf-8', 0, 2);
                if (firstBytes === '#!') {
                  console.error(`[ClangASTParser] ERROR: cfg-exporter at ${exporterPath} appears to be a shell script, not a binary!`);
                  console.error(`[ClangASTParser] First 20 bytes: ${fileBuffer.toString('hex', 0, 20)}`);
                  reject(new Error(`cfg-exporter at ${exporterPath} appears to be corrupted or invalid. Expected ELF binary but found shell script. Please rebuild the Docker image.`));
                  return;
                }
                console.error(`[ClangASTParser] ERROR: Binary does not have valid ELF magic bytes! Got: 0x${elfMagic.toString(16)}`);
                console.error(`[ClangASTParser] First 20 bytes: ${fileBuffer.toString('hex', 0, 20)}`);
                reject(new Error(`cfg-exporter at ${exporterPath} appears to be corrupted or invalid. Expected ELF binary (magic: 0x7f454c46) but got: 0x${elfMagic.toString(16)}. Please rebuild the Docker image.`));
                return;
              }
              
              // Try to get more info with 'file' command if available
              try {
                const fileOutput = child_process.execSync(`file "${exporterPath}"`, { encoding: 'utf-8', timeout: 5000 });
                console.log(`[ClangASTParser] Binary verified: ${fileOutput.trim()}`);
              } catch (fileErr: any) {
                // 'file' command not available or failed, but ELF magic bytes are valid
                console.log(`[ClangASTParser] Binary verified via ELF magic bytes (file command not available: ${fileErr.message || fileErr})`);
              }
            } catch (verifyErr: any) {
              console.error(`[ClangASTParser] ERROR: Failed to verify binary: ${verifyErr.message || verifyErr}`);
              reject(new Error(`Failed to verify cfg-exporter binary at ${exporterPath}: ${verifyErr.message || verifyErr}`));
              return;
            }
          } catch (statErr) {
            console.warn(`[ClangASTParser] Could not check binary permissions: ${statErr}`);
          }
        }
        
        // Log the path being used for debugging
        console.log(`[ClangASTParser] Using cfg-exporter at: ${exporterPath}`);
        
        // Final pre-execution validation: Verify binary is actually executable
        if (!isWindows) {
          try {
            // Check if file exists and is readable
            if (!fs.existsSync(exporterPath)) {
              reject(new Error(`cfg-exporter binary not found at ${exporterPath}`));
              return;
            }
            
            // Verify ELF magic bytes one more time before execution
            const preExecBuffer = fs.readFileSync(exporterPath);
            const preExecMagic = preExecBuffer.readUInt32BE(0);
            if (preExecMagic !== 0x7f454c46) {
              console.error(`[ClangASTParser] CRITICAL: Binary has invalid ELF magic bytes before execution!`);
              console.error(`[ClangASTParser] Expected: 0x7f454c46, Got: 0x${preExecMagic.toString(16)}`);
              console.error(`[ClangASTParser] First 20 bytes: ${preExecBuffer.toString('hex', 0, 20)}`);
              reject(new Error(`cfg-exporter binary at ${exporterPath} is corrupted or invalid. ELF magic bytes: 0x${preExecMagic.toString(16)}. Please rebuild the Docker image.`));
              return;
            }
            
            // Ensure executable permissions
            try {
              fs.chmodSync(exporterPath, '755');
            } catch (chmodErr) {
              console.warn(`[ClangASTParser] Could not set executable permissions: ${chmodErr}`);
            }
            
            // Test if binary can be executed (dry run with --help)
            try {
              const testResult = child_process.spawnSync(exporterPath, ['--help'], {
                timeout: 5000,
                encoding: 'utf-8'
              });
              
              if (testResult.error) {
                const errorMsg = testResult.error.message || String(testResult.error);
                console.error(`[ClangASTParser] CRITICAL: Pre-execution test failed!`);
                console.error(`[ClangASTParser] Error: ${errorMsg}`);
                console.error(`[ClangASTParser] Binary path: ${exporterPath}`);
                console.error(`[ClangASTParser] Platform: ${process.platform}, Arch: ${process.arch}`);
                console.error(`[ClangASTParser] Binary stats:`, fs.statSync(exporterPath));
                
                // Check if it's an architecture mismatch
                if (errorMsg.includes('Exec format error') || errorMsg.includes('cannot execute binary')) {
                  console.error(`[ClangASTParser] This is an architecture mismatch error!`);
                  console.error(`[ClangASTParser] The binary at ${exporterPath} was built for a different architecture.`);
                  console.error(`[ClangASTParser] Current platform: ${process.platform}, architecture: ${process.arch}`);
                  console.error(`[ClangASTParser] Please rebuild the Docker image with --platform linux/amd64`);
                  reject(new Error(`cfg-exporter binary architecture mismatch. Platform: ${process.platform}, Arch: ${process.arch}. The binary may be built for a different architecture. Please rebuild the Docker image.`));
                  return;
                }
                
                reject(new Error(`cfg-exporter binary not found or not executable at ${exporterPath}. Error: ${errorMsg}`));
                return;
              }
              
              if (testResult.status !== 0 && testResult.status !== null) {
                console.warn(`[ClangASTParser] Pre-execution test returned non-zero exit code: ${testResult.status}`);
                console.warn(`[ClangASTParser] stderr: ${testResult.stderr?.substring(0, 200)}`);
              }
            } catch (preExecErr: any) {
              console.error(`[ClangASTParser] CRITICAL: Pre-execution validation failed!`);
              console.error(`[ClangASTParser] Error: ${preExecErr.message || preExecErr}`);
              console.error(`[ClangASTParser] Binary path: ${exporterPath}`);
              
              // Check for architecture mismatch
              if (preExecErr.message && (preExecErr.message.includes('Exec format error') || preExecErr.message.includes('cannot execute binary'))) {
                reject(new Error(`cfg-exporter binary architecture mismatch. The binary at ${exporterPath} was built for a different architecture (Platform: ${process.platform}, Arch: ${process.arch}). Please rebuild the Docker image.`));
                return;
              }
              
              reject(new Error(`Failed to validate cfg-exporter binary before execution: ${preExecErr.message || preExecErr}`));
              return;
            }
          } catch (statErr) {
            console.warn(`[ClangASTParser] Could not check binary permissions: ${statErr}`);
          }
        }
        
        // Log the path being used for debugging
        console.log(`[ClangASTParser] Using cfg-exporter at: ${exporterPath}`);
        console.log(`[ClangASTParser] Platform: ${process.platform}, Architecture: ${process.arch}`);
        console.log(`[ClangASTParser] Current working directory: ${process.cwd()}`);
        console.log(`[ClangASTParser] PATH: ${process.env.PATH || 'not set'}`);
      } catch (err) {
        reject(new Error(`Failed to check cfg-exporter path: ${err}`));
        return;
      }

      // Use cached include paths discovered during initialization
      // This ensures the exporter has access to all necessary C++ and C system headers
      const exporArgs = [
        filePath,
        '--',
        '-std=c++17',
        ...(this.cachedIncludePaths || [])
      ];

      console.log(`[ClangASTParser] Spawning cfg-exporter with args: ${exporArgs.join(' ')}`);
      const child = child_process.spawn(exporterPath, exporArgs);
      let output = '';
      let errorOutput = '';
      const maxBufferSize = 1000 * 1024 * 1024; // 1GB max

      child.stdout.on('data', (data: Buffer) => {
        const chunk = data.toString();
        output += chunk;

        // Check buffer size
        if (output.length > maxBufferSize) {
          child.kill();
          reject(new Error('CFG exporter output exceeded maximum buffer size'));
          return;
        }
      });

      child.stderr.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });

      child.on('error', (err: Error) => {
        // Enhanced error reporting for debugging
        const errorMsg = err.message || String(err);
        const errorDetails = {
          message: errorMsg,
          exporterPath: exporterPath,
          filePath: filePath,
          platform: process.platform,
          arch: process.arch,
          envPath: process.env.PATH,
          cwd: process.cwd()
        };
        
        // Detect specific error types
        if (errorMsg.includes('ENOENT')) {
          console.error(`[ClangASTParser] ERROR: Binary not found at ${exporterPath}`);
          reject(new Error(`cfg-exporter binary not found at ${exporterPath}. Please ensure the binary is built and available.`));
          return;
        } else if (errorMsg.includes('EACCES') || errorMsg.includes('permission denied')) {
          console.error(`[ClangASTParser] ERROR: Binary is not executable at ${exporterPath}`);
          reject(new Error(`cfg-exporter binary at ${exporterPath} is not executable. Please check permissions.`));
          return;
        } else if (errorMsg.includes('Exec format error') || errorMsg.includes('cannot execute binary file')) {
          console.error(`[ClangASTParser] CRITICAL ERROR: Binary architecture mismatch!`);
          console.error(`[ClangASTParser] Platform: ${process.platform}, Architecture: ${process.arch}`);
          console.error(`[ClangASTParser] Binary path: ${exporterPath}`);
          reject(new Error(`cfg-exporter binary architecture mismatch. The binary at ${exporterPath} was built for a different architecture (Platform: ${process.platform}, Arch: ${process.arch}). Please rebuild the Docker image for the correct architecture.`));
          return;
        }
        
        console.error(`[ClangASTParser] Failed to spawn cfg-exporter:`, errorDetails);
        reject(new Error(`Failed to spawn cfg-exporter: ${errorMsg}. Path: ${exporterPath}. Details: ${JSON.stringify(errorDetails, null, 2)}`));
      });

      child.on('close', (code) => {
        // Log execution details for debugging
        if (code !== 0 || errorOutput) {
          console.warn(`[ClangASTParser] cfg-exporter exited with code ${code}`);
          if (errorOutput) {
            const errorPreview = errorOutput.substring(0, 500);
            console.warn(`[ClangASTParser] cfg-exporter stderr: ${errorPreview}`);
            
            // Check for common binary corruption/architecture errors
            if (errorOutput.includes('Syntax error') || errorOutput.includes('unexpected')) {
              console.error(`[ClangASTParser] CRITICAL ERROR: Binary appears corrupted or invalid!`);
              console.error(`[ClangASTParser] Binary path: ${exporterPath}`);
              console.error(`[ClangASTParser] Platform: ${process.platform}, Architecture: ${process.arch}`);
              console.error(`[ClangASTParser] This error suggests the binary is being interpreted as a shell script.`);
              console.error(`[ClangASTParser] Possible causes:`);
              console.error(`[ClangASTParser]   1. Binary is corrupted or not a valid ELF file`);
              console.error(`[ClangASTParser]   2. Binary architecture mismatch (built for different CPU)`);
              console.error(`[ClangASTParser]   3. Binary was not copied correctly during Docker build`);
              console.error(`[ClangASTParser] Please rebuild the Docker image to ensure binary is built correctly.`);
              reject(new Error(`cfg-exporter binary appears corrupted or invalid. The binary at ${exporterPath} is being interpreted as a script (Syntax error). This usually indicates the binary is corrupted, has wrong architecture, or was not built correctly. Please rebuild the Docker image. Error: ${errorPreview}`));
              return;
            } else if (errorOutput.includes('Exec format error') || errorOutput.includes('cannot execute binary file')) {
              console.error(`[ClangASTParser] CRITICAL ERROR: Binary architecture mismatch!`);
              console.error(`[ClangASTParser] Binary path: ${exporterPath}`);
              console.error(`[ClangASTParser] Platform: ${process.platform}, Architecture: ${process.arch}`);
              reject(new Error(`cfg-exporter binary architecture mismatch. The binary at ${exporterPath} was built for a different architecture (Platform: ${process.platform}, Arch: ${process.arch}). Please rebuild the Docker image for the correct architecture. Error: ${errorPreview}`));
              return;
            }
          }
        }
        
        if (code !== 0) {
          // Provide more context about the failure
          const errorContext = {
            exitCode: code,
            errorOutput: errorOutput.substring(0, 1000),
            exporterPath: exporterPath,
            platform: process.platform,
            arch: process.arch
          };
          reject(new Error(`cfg-exporter exited with code ${code}. ${errorOutput.substring(0, 500)}. Context: ${JSON.stringify(errorContext, null, 2)}`));
          return;
        }

        try {
          /**
           * CFG EXPORTER OUTPUT PARSING
           * 
           * Parses JSON output from cfg-exporter and converts to AST structure.
           */
          // Parse JSON output from cfg-exporter
          LoggingConfig.detail('Parser', `cfg-exporter output length: ${output.length} bytes`);
          LoggingConfig.verbose('Parser', `cfg-exporter output preview: ${output.substring(0, 300)}`);
          
          const jsonOutput = JSON.parse(output);
          LoggingConfig.detail('Parser', 'JSON parsing successful, converting to AST structure');
          const cfgData = this.parseCFGExporterJSON(jsonOutput, filePath);
          const funcCount = cfgData ? Object.keys(cfgData.inner || {}).length : 0;
          LoggingConfig.log('Parser', `Parsed CFG with ${funcCount} functions`);
          resolve(cfgData);
        } catch (parseError: any) {
          LoggingConfig.error('Parser', `Failed to parse cfg-exporter JSON output: ${parseError.message}`, parseError);
          reject(new Error(`Failed to parse cfg-exporter JSON output: ${parseError.message}`));
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to spawn cfg-exporter: ${error.message}`));
      });
    });
  }

  /**
   * Parse cfg-exporter JSON output into AST-like structure
   * The exporter provides clean, structured JSON with functions and their CFG blocks
   */
  private parseCFGExporterJSON(jsonData: any, sourceFilePath: string): ASTNode | null {
    try {
      if (!jsonData || !jsonData.functions) {
        return null;
      }

      const functions: { [name: string]: ASTNode } = {};

      for (const funcData of jsonData.functions) {
        const funcName = funcData.name || 'unknown';
        const blocks: ASTNode[] = [];

        // Convert each block from the JSON
        for (const blockData of (funcData.blocks || [])) {
          const block: ASTNode = {
            kind: 'CFGBlock',
            name: blockData.label || `B${blockData.id}`,
            id: String(blockData.id),
            label: blockData.label,
            isEntry: blockData.isEntry || false,
            isExit: blockData.isExit || false,
            successors: blockData.successors ? blockData.successors.map(String) : [],
            predecessors: blockData.predecessors ? blockData.predecessors.map(String) : [],
            statements: []
          };

          // Convert statements from the JSON
          for (const stmtData of (blockData.statements || [])) {
            const stmtText = stmtData.text || '';
            // Detect function calls using CFG-aware extraction
            const hasFunctionCall = this.detectFunctionCallInStatement(stmtText);
            
            const stmt: Statement = {
              text: stmtText,
              content: stmtText, // Alias for compatibility
              type: hasFunctionCall ? StatementType.FUNCTION_CALL : undefined,
              range: this.convertSourceRange(stmtData.range) || {
                start: { line: 0, column: 0 },
                end: { line: 0, column: 0 }
              }
            };
            if (block.statements) {
              block.statements.push(stmt);
            }
          }

          blocks.push(block);
        }

        // Create function node
        functions[funcName] = {
          kind: 'FunctionDecl',
          name: funcName,
          inner: blocks,
          range: funcData.range ? this.convertSourceRange(funcData.range) : undefined
        };
      }

      // Return root node with functions as inner property
      const funcCount = Object.keys(functions).length;
      LoggingConfig.detail('Parser', `Created AST node with ${funcCount} functions`);
      
      return {
        kind: 'TranslationUnit',
        inner: functions
      };
    } catch (error: any) {
      LoggingConfig.error('Parser', `Error parsing cfg-exporter JSON: ${error.message}`, error);
      return null;
    }
  }

  /**
   * Detect if a statement contains a function call
   * Uses CFG-aware extraction instead of regex
   */
  private detectFunctionCallInStatement(stmtText: string): boolean {
    if (!stmtText) return false;
    
    // Create a temporary statement object for the extractor
    const tempStmt: Statement = { text: stmtText };
    return FunctionCallExtractor.hasFunctionCall(tempStmt);
  }

  /**
   * Convert cfg-exporter source range to internal Range format
   */
  private convertSourceRange(rangeData: any): Range | undefined {
    if (!rangeData) {
      return undefined;
    }

    return {
      start: {
        line: rangeData.start?.line || 0,
        column: rangeData.start?.column || 0
      },
      end: {
        line: rangeData.end?.line || 0,
        column: rangeData.end?.column || 0
      }
    };
  }

  /**
   * Parse Clang CFG dump output into AST-like structure
   * CFG dump provides control flow graphs generated by Clang's CFG library
   */
  /**
   * PARSE CFG OUTPUT FROM CLANG CFG DUMP
   * 
   * Parses Clang CFG dump text output into AST-like structure.
   * This is a fallback method when cfg-exporter JSON is not available.
   */
  private parseCFGOutput(cfgOutput: string, sourceFilePath: string): ASTNode | null {
    LoggingConfig.detail('Parser', `CFG Output length: ${cfgOutput.length}`);
    LoggingConfig.verbose('Parser', `CFG Output preview: ${cfgOutput.substring(0, 500)}`);

    // Actual clang CFG dump output looks like:
    // int main()
    //  [B5 (ENTRY)]
    //    Succs (1): B4
    //  [B1]
    //    1: return 0;
    //    Preds (2): B2 B3
    //    Succs (1): B0
    //  etc.

    const functions: { [name: string]: ASTNode } = {};
    const lines = cfgOutput.split('\n');
    let currentFunction: string | null = null;
    let currentBlocks: any[] = [];
    let currentBlock: any = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      /**
       * CFG OUTPUT PARSING
       * 
       * Parses Clang CFG dump text format line by line to extract functions and blocks.
       */
      // DEBUG: Log ALL lines with parentheses to see what's in the output
      if (line.includes('(') && line.includes(')')) {
        LoggingConfig.verbose('Parser', `LINE WITH PARENTHESES: ${JSON.stringify(line)}`);
      }

      // Check for function start - function signature on its own line
      // Must match patterns like: "int main()" or "void factorial(int n)"
      // But NOT CFG elements like "Succs (1): B2" or "2: [B4.1] (ImplicitCastExpr..."
      const funcSignatureRegex = /^\s*(?:\w+\s+)+\w+\s*\([^)]*\)\s*$/;
      if (line && funcSignatureRegex.test(line) && !line.startsWith('[') && !line.includes('Succs') && !line.includes('Preds') && !line.includes(':') && !line.includes('B') && line.trim().split(/\s+/).length >= 2) {
        LoggingConfig.verbose('Parser', `ACCEPTED AS FUNCTION: ${line}`);

        // Save previous function if exists
        if (currentFunction && currentBlocks.length > 0) {
          functions[currentFunction] = this.createASTNodeFromCFGBlocks(currentBlocks, currentFunction, sourceFilePath);
        }

        currentFunction = line;
        currentBlocks = [];
        currentBlock = null;
        LoggingConfig.detail('Parser', `Found function: ${currentFunction}`);
        continue;
      }

      // Check for block start
      const blockMatch = line.match(/\[B(\d+)\s*(?:\(([^)]+)\))?\]/);
      if (blockMatch && currentFunction) {
        // Save previous block
        if (currentBlock) {
          currentBlocks.push(currentBlock);
        }

        const blockId = blockMatch[1];
        const blockType = blockMatch[2]; // ENTRY, EXIT, or number
        const isEntry = blockType === 'ENTRY';
        const isExit = blockType === 'EXIT';

        currentBlock = {
          id: `block_${blockId}`,
          label: isEntry ? 'Entry' : isExit ? 'Exit' : `B${blockId}`,
          statements: [],
          successors: [],
          predecessors: [],
          isEntry,
          isExit
        };

        LoggingConfig.verbose('Parser', `Found block: ${currentBlock.label}`);
        continue;
      }

      // Check for successors
      const succMatch = line.match(/Succs\s*\(\d+\):\s*(.+)/);
      if (succMatch && currentBlock) {
        const successors = succMatch[1].split(/\s+/).filter(s => s.trim());
        currentBlock.successors = successors.map(s => s.replace(/B(\d+)/g, 'block_$1'));
        continue;
      }

      // Check for predecessors
      const predMatch = line.match(/Preds\s*\(\d+\):\s*(.+)/);
      if (predMatch && currentBlock) {
        const predecessors = predMatch[1].split(/\s+/).filter(s => s.trim());
        currentBlock.predecessors = predecessors.map(s => s.replace(/B(\d+)/g, 'block_$1'));
        continue;
      }

      // Check for statements (lines that start with numbers followed by colon)
      const stmtMatch = line.match(/^\s*\d+:\s*(.+)/);
      if (stmtMatch && currentBlock) {
        const statement = stmtMatch[1].trim();
        // Skip implicit cast expressions and other clang internals
        if (!statement.includes('(ImplicitCastExpr') && !statement.includes('(FunctionToPointerDecay') &&
            !statement.includes('(ArrayToPointerDecay') && !statement.includes('(LValueToRValue')) {
          currentBlock.statements.push({
            text: statement,
            type: this.inferStatementType(statement),
            range: {
              start: { line: 0, column: 0 }, // We don't have exact line info from CFG dump
              end: { line: 0, column: statement.length }
            }
          });
        }
      }
    }

    /**
     * CFG PARSING COMPLETE
     * 
     * Saves the last function and creates the final AST node.
     */
    // Save last function
    LoggingConfig.detail('Parser', `END OF PARSING - currentFunction: ${currentFunction}, blocks: ${currentBlocks.length}`);
    if (currentFunction && currentBlocks.length > 0) {
      LoggingConfig.detail('Parser', `Saving last function: ${currentFunction}`);
      functions[currentFunction] = this.createASTNodeFromCFGBlocks(currentBlocks, currentFunction, sourceFilePath);
      const blockCount = functions[currentFunction].inner ? Object.keys(functions[currentFunction].inner!).length : 0;
      LoggingConfig.detail('Parser', `Saved function with ${blockCount} CFG blocks`);
    }

    // Convert to ASTNode format - preserve function names as keys
    const translationUnit: ASTNode = {
      kind: 'TranslationUnitDecl',
      range: {
        start: { line: 1, column: 0 },
        end: { line: 1, column: 0 }
      },
      inner: functions  // Keep as object with function names as keys
    };

    LoggingConfig.log('Parser', `Created AST node with ${Object.keys(functions).length} functions`);
    return translationUnit;
  }

  /**
   * Create AST node from CFG blocks
   */
  private createASTNodeFromCFGBlocks(blocks: any[], functionName: string, sourceFilePath: string): ASTNode {
    // Build predecessor relationships
    const blockMap = new Map<string, any>();
    blocks.forEach(block => {
      blockMap.set(block.id, block);
    });

    blocks.forEach(block => {
      block.predecessors = [];
      blockMap.forEach((otherBlock, otherId) => {
        if (otherBlock.successors.includes(block.id)) {
          block.predecessors.push(otherId);
        }
      });
    });

    return {
      kind: 'FunctionDecl',
      name: functionName,
      range: {
        start: { line: 1, column: 0 },
        end: { line: 1, column: 0 }
      },
      inner: [
        {
          kind: 'CompoundStmt',
          range: {
            start: { line: 1, column: 0 },
            end: { line: 1, column: 0 }
          },
          inner: blocks.map(block => ({
            kind: 'CFGBlock',
            id: block.id,
            label: block.label,
            statements: block.statements,
            successors: block.successors,
            predecessors: block.predecessors,
            isEntry: block.isEntry,
            isExit: block.isExit,
            range: {
              start: { line: 1, column: 0 },
              end: { line: 1, column: 0 }
            },
            inner: []
          }))
        }
      ]
    };
  }

  /**
   * Infer statement type from code text
   */
  private inferStatementType(code: string): string {
    const trimmed = code.trim();
    if (trimmed.includes('if ')) return 'IfStmt';
    if (trimmed.includes('while ')) return 'WhileStmt';
    if (trimmed.includes('for ')) return 'ForStmt';
    if (trimmed.includes('return ')) return 'ReturnStmt';
    if (trimmed.includes('=')) return 'BinaryOperator';
    if (trimmed.includes('int ') || trimmed.includes('char ') || trimmed.includes('float ')) return 'DeclStmt';
    return 'Expr';
  }

  /**
   * Filter AST to only include nodes from the source file
   * This removes system header nodes which can be huge
   */
  private filterASTBySourceFile(ast: ClangASTNode, sourceFilePath: string): ClangASTNode | null {
    // Normalize paths for comparison
    const normalizedSourcePath = path.resolve(sourceFilePath);
    const sourceFileBase = path.basename(sourceFilePath);
    const sourceFileDir = path.dirname(sourceFilePath);
    
    // Helper to check if a node is from the source file
    // IMPORTANT: Clang behavior for loc.file:
    // - Builtin types: NO loc or loc.line is 0 or undefined
    // - Source file nodes: loc has line>0, NO file, NO includedFrom
    // - Included file nodes: loc has file field OR has includedFrom field
    const isSourceFile = (node: ClangASTNode): boolean => {
      const loc = node.loc as any; // Cast to any to access includedFrom
      const filePath = loc?.file;
      
      // No location at all = builtin/synthetic node - REJECT
      if (!loc) {
        return false;
      }
      
      // loc.line must be > 0 to be real code (line=0 or undefined = builtin)
      if (!loc.line || loc.line === 0) {
        return false;
      }
      
      // CRITICAL: Check for includedFrom field - this means it's from an included file
      if (loc.includedFrom && loc.includedFrom.file) {
        // This node is from an included header - REJECT
        return false;
      }
      
      // Has line>0 but NO file and NO includedFrom = from source file - ACCEPT
      if (!filePath) {
        LoggingConfig.verbose('Parser', `✓ isSourceFile: ${node.kind} "${node.name || 'none'}" at line ${loc.line} (no file/includedFrom = source)`);
        return true;
      }
      
      // Reject ANY absolute path that's not the source file
      // Also reject header files and system/library paths
      if (filePath.startsWith('/')) {
        // Reject system/library paths immediately
        if (filePath.includes('/usr/') || 
            filePath.includes('/System/') ||
            filePath.includes('/Applications/') ||
            filePath.includes('/Library/') ||
            filePath.includes('/opt/') ||
            filePath.includes('/include/')) {
          return false;
        }
        
        // Only allow if it's exactly the source file path
        try {
          const normalizedNodePath = path.resolve(filePath);
          return normalizedNodePath === normalizedSourcePath;
        } catch (e) {
          return false;
        }
      }
      
      // Reject header files (.h, .hpp, etc.)
      const headerExts = ['.h', '.hpp', '.hxx', '.hh', '.H'];
      const fileExt = path.extname(filePath).toLowerCase();
      if (headerExts.includes(fileExt)) {
        return false;
      }
      
      // For relative paths, check if they resolve to the source file
      try {
        const normalizedNodePath = path.resolve(filePath);
        if (normalizedNodePath === normalizedSourcePath) {
          return true;
        }
        
        // Also check by filename and directory
        const nodeFileBase = path.basename(filePath);
        if (nodeFileBase === sourceFileBase) {
          const nodeFileDir = path.dirname(filePath);
          const normalizedNodeDir = path.resolve(nodeFileDir);
          const normalizedSourceDir = path.resolve(sourceFileDir);
          if (normalizedNodeDir === normalizedSourceDir) {
            return true;
          }
        }
      } catch (e) {
        return false;
      }
      
      return false;
    };
    
    // Recursively filter the AST
    const filterNode = (node: ClangASTNode, depth: number = 0, parentIsSource: boolean = false): ClangASTNode | null => {
      const isRoot = depth === 0;
      
      // Root node (TranslationUnitDecl) should always be kept
      if (isRoot) {
        // Filter children first
        let filteredChildren: ClangASTNode[] = [];
        if (node.inner && node.inner.length > 0) {
          filteredChildren = node.inner
            .map(child => filterNode(child, depth + 1, false))
            .filter(n => n !== null) as ClangASTNode[];
        }
        
        // Root node - keep it with filtered children
        return {
          ...node,
          inner: filteredChildren
        };
      }
      
      // Check if this node is from source file
      const nodeIsFromSource = isSourceFile(node);
      
      // Special case: If parent is from source, keep children even if they don't pass isSourceFile
      // This preserves function bodies (CompoundStmt, etc.) which may not have location info
      const shouldKeep = nodeIsFromSource || (parentIsSource && (
        node.kind === 'CompoundStmt' || 
        node.kind === 'DeclStmt' ||
        node.kind === 'ReturnStmt' ||
        node.kind === 'IfStmt' ||
        node.kind === 'ForStmt' ||
        node.kind === 'WhileStmt' ||
        node.kind === 'BinaryOperator' ||
        node.kind === 'UnaryOperator' ||
        node.kind === 'CallExpr' ||
        node.kind === 'DeclRefExpr' ||
        node.kind === 'IntegerLiteral' ||
        node.kind === 'VarDecl' ||
        node.kind === 'ParmVarDecl'
      ));
      
      if (!shouldKeep) {
        // Not from source file and not a child of source node - discard
        return null;
      }
      
      // Node should be kept - recursively filter children
      let filteredChildren: ClangASTNode[] = [];
      if (node.inner && node.inner.length > 0) {
        // Pass down whether THIS node is from source
        const passParentIsSource = nodeIsFromSource || parentIsSource;
        filteredChildren = node.inner
          .map(child => filterNode(child, depth + 1, passParentIsSource))
          .filter(n => n !== null) as ClangASTNode[];
      }
      
      return {
        ...node,
        inner: filteredChildren
      };
    };
    
    /**
     * AST FILTERING FOR SOURCE FILE
     * 
     * Filters AST to only include nodes from the source file, removing system header nodes.
     */
    LoggingConfig.detail('Parser', `Filtering AST for source file: ${sourceFilePath}`);
    LoggingConfig.detail('Parser', `Normalized source path: ${normalizedSourcePath}`);
    LoggingConfig.detail('Parser', `Source file base: ${sourceFileBase}, dir: ${sourceFileDir}`);
    
    // Debug: Log top-level nodes BEFORE filtering
    LoggingConfig.detail('Parser', `BEFORE FILTERING: AST has ${ast.inner?.length || 0} top-level nodes`);
    if (ast.inner && ast.inner.length > 0) {
      // Find and log function nodes specifically
      const funcNodes = ast.inner.filter(n => n.kind === 'FunctionDecl' || n.kind === 'CXXMethodDecl');
      LoggingConfig.detail('Parser', `  Found ${funcNodes.length} function declarations in raw AST`);
      funcNodes.slice(0, 10).forEach((node, idx) => {
        LoggingConfig.verbose('Parser', `  Function ${idx}: name=${node.name || 'none'}, loc=${JSON.stringify(node.loc)}`);
      });
      
      // Log sample of all nodes
      ast.inner.slice(0, 5).forEach((node, idx) => {
        LoggingConfig.verbose('Parser', `  Pre-filter node ${idx}: kind=${node.kind}, name=${node.name || 'none'}, loc.file=${node.loc?.file || 'NONE'}, loc.line=${node.loc?.line || 'NONE'}`);
      });
    }
    
    const filtered = filterNode(ast, 0, false);
    
    /**
     * FILTERING RESULTS
     * 
     * Logs summary of filtering results including function counts.
     */
    // Debug: count nodes after filtering
    if (filtered && filtered.inner) {
      const functionNodes = filtered.inner.filter(n => 
        n.kind === 'FunctionDecl' || n.kind === 'CXXMethodDecl'
      );
      LoggingConfig.detail('Parser', `After filtering: ${filtered.inner.length} top-level nodes, ${functionNodes.length} function declarations`);
      
      // Count functions from source file vs others
      let sourceFileFunctions = 0;
      let otherFileFunctions = 0;
      functionNodes.forEach(node => {
        if (isSourceFile(node)) {
          sourceFileFunctions++;
          LoggingConfig.verbose('Parser', `  ✓ Function from source: ${node.name || 'unnamed'} at line ${node.loc?.line}`);
        } else {
          otherFileFunctions++;
          // Log all functions from other files (no limit)
          LoggingConfig.verbose('Parser', `  ✗ Function from other file: ${node.name || 'unnamed'} at ${node.loc?.file || 'no location'}:${node.loc?.line || 0}`);
        }
      });
      
      LoggingConfig.log('Parser', `Function breakdown: ${sourceFileFunctions} from source file, ${otherFileFunctions} from other files`);
      
      // Log sample of filtered nodes
      filtered.inner.slice(0, 10).forEach((node, idx) => {
        LoggingConfig.verbose('Parser', `  Filtered node ${idx}: kind=${node.kind}, name=${node.name || 'none'}, loc=${node.loc?.file || 'none'}:${node.loc?.line || 0}`);
      });
    } else {
      LoggingConfig.warn('Parser', 'Filtered AST is null or has no inner nodes!');
      if (ast && ast.inner) {
        LoggingConfig.detail('Parser', `Original AST had ${ast.inner.length} top-level nodes`);
        ast.inner.slice(0, 5).forEach((node, idx) => {
          LoggingConfig.verbose('Parser', `  Original node ${idx}: kind=${node.kind}, name=${node.name || 'none'}, loc=${node.loc?.file || 'none'}:${node.loc?.line || 0}`);
        });
      }
    }
    
    return filtered;
  }

  /**
   * Extract JSON from clang AST dump output
   */
  private extractJSONFromOutput(output: string): string | null {
    // Clang AST dump JSON starts after initial text
    const jsonStart = output.indexOf('{');
    if (jsonStart === -1) {
      return null;
    }

    // Find matching closing brace
    let braceCount = 0;
    let jsonEnd = jsonStart;
    for (let i = jsonStart; i < output.length; i++) {
      if (output[i] === '{') braceCount++;
      if (output[i] === '}') braceCount--;
      if (braceCount === 0) {
        jsonEnd = i + 1;
        break;
      }
    }

    return output.substring(jsonStart, jsonEnd);
  }

  /**
   * Convert clang AST JSON to our ASTNode format
   */
  private convertClangASTToASTNode(node: ClangASTNode, filePath: string): ASTNode {
    const kind = this.mapClangKindToCursorKind(node.kind);
    const location: SourceLocation = node.loc ? {
      file: node.loc.file || filePath,
      line: node.loc.line || 0,
      column: node.loc.col || 0,
      offset: node.loc.offset || 0
    } : {
      file: filePath,
      line: 0,
      column: 0,
      offset: 0
    };

    const extent = node.range ? {
      start: {
        file: filePath,
        line: node.range.begin.line || 0,
        column: node.range.begin.col || 0,
        offset: node.range.begin.offset || 0
      },
      end: {
        file: filePath,
        line: node.range.end.line || 0,
        column: node.range.end.col || 0,
        offset: node.range.end.offset || 0
      }
    } : {
      start: location,
      end: location
    };

    const children: ASTNode[] = [];
    if (node.inner) {
      for (const child of node.inner) {
        children.push(this.convertClangASTToASTNode(child, filePath));
      }
    }

    return {
      kind,
      kindName: node.kind,
      spelling: node.name || node.value || '',
      location,
      extent,
      children,
      isDefinition: node.isDefinition || false,
      type: node.type,
      storageClass: node.storageClass
    };
  }

  /**
   * Map clang AST kind to CXCursorKind enum
   */
  private mapClangKindToCursorKind(kind: string): CXCursorKind {
    const kindMap: { [key: string]: CXCursorKind } = {
      'FunctionDecl': CXCursorKind.FUNCTION_DECL,
      'CXXMethodDecl': CXCursorKind.CXX_METHOD,
      'VarDecl': CXCursorKind.VAR_DECL,
      'ParmVarDecl': CXCursorKind.PARM_DECL,
      'FieldDecl': CXCursorKind.FIELD_DECL,
      'CompoundStmt': CXCursorKind.COMPOUND_STMT,
      'IfStmt': CXCursorKind.IF_STMT,
      'WhileStmt': CXCursorKind.WHILE_STMT,
      'ForStmt': CXCursorKind.FOR_STMT,
      'SwitchStmt': CXCursorKind.SWITCH_STMT,
      'CaseStmt': CXCursorKind.CASE_STMT,
      'DefaultStmt': CXCursorKind.DEFAULT_STMT,
      'ReturnStmt': CXCursorKind.RETURN_STMT,
      'BreakStmt': CXCursorKind.BREAK_STMT,
      'ContinueStmt': CXCursorKind.CONTINUE_STMT,
      'GotoStmt': CXCursorKind.GOTO_STMT,
      'LabelStmt': CXCursorKind.LABEL_STMT,
      'DeclStmt': CXCursorKind.DECL_STMT,
      'BinaryOperator': CXCursorKind.BINARY_OPERATOR,
      'UnaryOperator': CXCursorKind.UNARY_OPERATOR,
      'CallExpr': CXCursorKind.CALL_EXPR,
      'DeclRefExpr': CXCursorKind.DECL_REF_EXPR,
      'MemberExpr': CXCursorKind.MEMBER_REF_EXPR,
      'ArraySubscriptExpr': CXCursorKind.ARRAY_SUBSCRIPT_EXPR,
      'ConditionalOperator': CXCursorKind.CONDITIONAL_OPERATOR,
      'IntegerLiteral': CXCursorKind.INTEGER_LITERAL,
      'FloatingLiteral': CXCursorKind.FLOATING_LITERAL,
      'StringLiteral': CXCursorKind.STRING_LITERAL,
      'CharacterLiteral': CXCursorKind.CHARACTER_LITERAL,
      'CXXRecordDecl': CXCursorKind.CLASS_DECL,
      'StructDecl': CXCursorKind.STRUCT_DECL,
      'UnionDecl': CXCursorKind.UNION_DECL,
      'EnumDecl': CXCursorKind.ENUM_DECL,
      'TypedefDecl': CXCursorKind.TYPEDEF_DECL,
      'NamespaceDecl': CXCursorKind.NAMESPACE,
      'TranslationUnitDecl': CXCursorKind.TRANSLATION_UNIT
    };

    return kindMap[kind] || CXCursorKind.UNEXPOSED_DECL;
  }
}

