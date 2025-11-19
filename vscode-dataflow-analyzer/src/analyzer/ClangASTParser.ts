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
  GOTO_STMT = 211,
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
      const { execSync } = require('child_process');
      const clangPath = this.clangPath || '/opt/homebrew/opt/llvm/bin/clang';
      
      try {
        // Run clang in verbose mode to see where it looks for headers
        // This gives us the exact SDK and system paths clang is using
        const output = execSync(`${clangPath} -E -v -x c++ /dev/null 2>&1`, {
          encoding: 'utf8',
          maxBuffer: 10 * 1024 * 1024
        });
        
        // Parse the output to extract include paths
        const lines = output.split('\n');
        let inSearchPaths = false;
        
        for (const line of lines) {
          // Start collecting after "search list:" marker
          if (line.includes('search list:')) {
            inSearchPaths = true;
            continue;
          }
          
          // Stop at the end of search paths (empty line or new section)
          if (inSearchPaths && line.trim() === '') {
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
        
        console.log('Discovered clang include paths:', paths.length > 0 ? paths : 'none found');
      } catch (verboseError) {
        console.log('Verbose clang query failed, trying xcrun for SDK path');
        
        // Fallback: use xcrun to get SDK path on macOS
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
      }
    } catch (err) {
      console.log('Include path discovery failed completely, using hardcoded fallbacks');
      // Absolute fallback
      paths.push('-I/opt/homebrew/opt/llvm/include/c++/v1');
      paths.push('-I/opt/homebrew/opt/llvm/lib/clang/21.1.5/include');
      paths.push('-isystem/usr/include');
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
    // List of possible installation locations (platform-agnostic)
    const possiblePaths = [
      'clang',
      'clang++',
      '/usr/bin/clang',
      '/usr/bin/clang++',
      '/usr/local/bin/clang',
      '/usr/local/bin/clang++',
      '/opt/homebrew/bin/clang',
      '/opt/homebrew/bin/clang++'
    ];

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
    if (!this.clangPath) {
      throw new Error('Clang is not available');
    }

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

      // Use streaming parser for large files
      return await this.parseFileStreaming(filePath, clangArgs);
    } catch (error: any) {
      console.error('Error parsing with clang:', error.message);
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
      const fs = require('fs');
      const isWindows = process.platform === 'win32';
      
      // Try Windows path first (Release subdirectory + .exe extension)
      let exporterPath = path.join(__dirname, '..', '..', 'cpp-tools', 'cfg-exporter', 'build', 'Release', isWindows ? 'cfg-exporter.exe' : 'cfg-exporter');
      
      // If Windows path doesn't exist, try Unix path (directly in build/)
      if (!fs.existsSync(exporterPath)) {
        exporterPath = path.join(__dirname, '..', '..', 'cpp-tools', 'cfg-exporter', 'build', isWindows ? 'cfg-exporter.exe' : 'cfg-exporter');
      }
      
      // If still not found, try without extension (for Unix compatibility)
      if (!fs.existsSync(exporterPath)) {
        exporterPath = path.join(__dirname, '..', '..', 'cpp-tools', 'cfg-exporter', 'build', 'cfg-exporter');
      }
      
      try {
        // Check if exporter exists
        if (!fs.existsSync(exporterPath)) {
          const buildInstructions = isWindows 
            ? 'cd cpp-tools\\cfg-exporter\\build && cmake .. -G "Visual Studio 17 2022" -A x64 && cmake --build . --config Release'
            : 'cd cpp-tools/cfg-exporter && mkdir -p build && cd build && cmake .. && cmake --build .';
          reject(new Error(`cfg-exporter binary not found at ${exporterPath}. Please build it first: ${buildInstructions}`));
          return;
        }
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

      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`cfg-exporter exited with code ${code}: ${errorOutput}`));
          return;
        }

        try {
          // Parse JSON output from cfg-exporter
          console.log('cfg-exporter output length:', output.length);
          console.log('cfg-exporter output preview:', output.substring(0, 300));
          
          const jsonOutput = JSON.parse(output);
          const cfgData = this.parseCFGExporterJSON(jsonOutput, filePath);
          console.log('Parsed CFG with', cfgData ? Object.keys(cfgData.inner || {}).length : 0, 'functions');
          resolve(cfgData);
        } catch (parseError: any) {
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
            block.statements!.push(stmt);
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
      return {
        kind: 'TranslationUnit',
        inner: functions
      };
    } catch (error: any) {
      console.error('Error parsing cfg-exporter JSON:', error.message);
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
  private parseCFGOutput(cfgOutput: string, sourceFilePath: string): ASTNode | null {
    console.log('CFG Output length:', cfgOutput.length);
    console.log('CFG Output preview:', cfgOutput.substring(0, 500));

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

      // DEBUG: Log ALL lines with parentheses to see what's in the output
      if (line.includes('(') && line.includes(')')) {
        console.log('LINE WITH PARENTHESES:', JSON.stringify(line));
      }

      // Check for function start - function signature on its own line
      // Must match patterns like: "int main()" or "void factorial(int n)"
      // But NOT CFG elements like "Succs (1): B2" or "2: [B4.1] (ImplicitCastExpr..."
      const funcSignatureRegex = /^\s*(?:\w+\s+)+\w+\s*\([^)]*\)\s*$/;
      if (line && funcSignatureRegex.test(line) && !line.startsWith('[') && !line.includes('Succs') && !line.includes('Preds') && !line.includes(':') && !line.includes('B') && line.trim().split(/\s+/).length >= 2) {
        console.log('ACCEPTED AS FUNCTION:', line);

        // Save previous function if exists
        if (currentFunction && currentBlocks.length > 0) {
          functions[currentFunction] = this.createASTNodeFromCFGBlocks(currentBlocks, currentFunction, sourceFilePath);
        }

        currentFunction = line;
        currentBlocks = [];
        currentBlock = null;
        console.log('Found function:', currentFunction);
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

        console.log('Found block:', currentBlock.label);
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

    // Save last function
    console.log('END OF PARSING - currentFunction:', currentFunction, 'blocks:', currentBlocks.length);
    if (currentFunction && currentBlocks.length > 0) {
      console.log('Saving last function:', currentFunction);
      functions[currentFunction] = this.createASTNodeFromCFGBlocks(currentBlocks, currentFunction, sourceFilePath);
      console.log('Saved function with', functions[currentFunction].inner ? Object.keys(functions[currentFunction].inner!).length : 0, 'CFG blocks');
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

    console.log('Created AST node with', Object.keys(functions).length, 'functions');
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
        console.log(`  ✓ isSourceFile: ${node.kind} "${node.name || 'none'}" at line ${loc.line} (no file/includedFrom = source)`);
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
    
    console.log(`Filtering AST for source file: ${sourceFilePath}`);
    console.log(`Normalized source path: ${normalizedSourcePath}`);
    console.log(`Source file base: ${sourceFileBase}, dir: ${sourceFileDir}`);
    
    // Debug: Log top-level nodes BEFORE filtering
    console.log(`BEFORE FILTERING: AST has ${ast.inner?.length || 0} top-level nodes`);
    if (ast.inner && ast.inner.length > 0) {
      // Find and log function nodes specifically
      const funcNodes = ast.inner.filter(n => n.kind === 'FunctionDecl' || n.kind === 'CXXMethodDecl');
      console.log(`  Found ${funcNodes.length} function declarations in raw AST`);
      funcNodes.slice(0, 10).forEach((node, idx) => {
        console.log(`  Function ${idx}: name=${node.name || 'none'}, loc=${JSON.stringify(node.loc)}`);
      });
      
      // Log sample of all nodes
      ast.inner.slice(0, 5).forEach((node, idx) => {
        console.log(`  Pre-filter node ${idx}: kind=${node.kind}, name=${node.name || 'none'}, loc.file=${node.loc?.file || 'NONE'}, loc.line=${node.loc?.line || 'NONE'}`);
      });
    }
    
    const filtered = filterNode(ast, 0, false);
    
    // Debug: count nodes after filtering
    if (filtered && filtered.inner) {
      const functionNodes = filtered.inner.filter(n => 
        n.kind === 'FunctionDecl' || n.kind === 'CXXMethodDecl'
      );
      console.log(`After filtering: ${filtered.inner.length} top-level nodes, ${functionNodes.length} function declarations`);
      
      // Count functions from source file vs others
      let sourceFileFunctions = 0;
      let otherFileFunctions = 0;
      functionNodes.forEach(node => {
        if (isSourceFile(node)) {
          sourceFileFunctions++;
          console.log(`  ✓ Function from source: ${node.name || 'unnamed'} at line ${node.loc?.line}`);
        } else {
          otherFileFunctions++;
          // Log all functions from other files (no limit)
          console.log(`  ✗ Function from other file: ${node.name || 'unnamed'} at ${node.loc?.file || 'no location'}:${node.loc?.line || 0}`);
        }
      });
      
      console.log(`Function breakdown: ${sourceFileFunctions} from source file, ${otherFileFunctions} from other files`);
      
      // Log sample of filtered nodes
      filtered.inner.slice(0, 10).forEach((node, idx) => {
        console.log(`  Filtered node ${idx}: kind=${node.kind}, name=${node.name || 'none'}, loc=${node.loc?.file || 'none'}:${node.loc?.line || 0}`);
      });
    } else {
      console.warn('Filtered AST is null or has no inner nodes!');
      if (ast && ast.inner) {
        console.log(`Original AST had ${ast.inner.length} top-level nodes`);
        ast.inner.slice(0, 5).forEach((node, idx) => {
          console.log(`  Original node ${idx}: kind=${node.kind}, name=${node.name || 'none'}, loc=${node.loc?.file || 'none'}:${node.loc?.line || 0}`);
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

