/**
 * Simple C++ parser for AST generation
 * Note: For production use, consider integrating with clang/libclang
 */

import * as fs from 'fs';
import { Statement, StatementType, BasicBlock, CFG, FunctionCFG, Position, Range } from '../types';

export class CPPParser {
  /**
   * Parse a C++ file and extract functions
   */
  parseFile(filePath: string): { functions: FunctionInfo[]; globalVars: string[] } {
    const content = fs.readFileSync(filePath, 'utf-8');
    return this.parseContent(content);
  }

  /**
   * Parse C++ content
   */
  parseContent(content: string): { functions: FunctionInfo[]; globalVars: string[] } {
    const functions: FunctionInfo[] = [];
    const globalVars: string[] = [];
    
    const lines = content.split('\n');
    let i = 0;
    let braceDepth = 0;
    let inFunction = false;
    let currentFunction: FunctionInfo | null = null;
    let functionStartLine = 0;

    // Parse line by line, tracking function boundaries using brace depth
    // This is a simple parser that uses brace matching to identify function bodies
    while (i < lines.length) {
      const line = lines[i].trim();
      
      // Simple function detection (can be improved)
      // Pattern matches: functionName(parameters) { or functionName(parameters)
      // Excludes function declarations (ending with ;) and function pointers
      const functionMatch = line.match(/(\w+)\s*\([^)]*\)\s*\{?/);
      if (functionMatch && !inFunction && !line.includes(';')) {
        // Found start of function definition
        inFunction = true;
        functionStartLine = i;
        currentFunction = {
          name: functionMatch[1],
          startLine: i,
          endLine: i,
          parameters: this.extractParameters(line),
          body: []
        };
        // If opening brace is on same line, initialize brace depth
        if (line.includes('{')) {
          braceDepth = 1;
        }
      } else if (inFunction && currentFunction) {
        // Inside function body: track brace depth to find function end
        // Brace depth = 0 means we've closed all braces and exited the function
        for (const char of line) {
          if (char === '{') braceDepth++;
          if (char === '}') braceDepth--;
        }
        
        // Add line to function body
        currentFunction.body.push({ line: i, content: line });
        
        // Function ends when brace depth returns to 0
        // This handles nested braces correctly (e.g., if statements inside functions)
        if (braceDepth === 0) {
          currentFunction.endLine = i;
          functions.push(currentFunction);
          inFunction = false;
          currentFunction = null;
        }
      } else {
        // Outside function: check for global variable declarations
        // Pattern: type variableName [= value];
        // Excludes function calls (has '(') and function definitions (has '{')
        const varMatch = line.match(/(\w+)\s+(\w+)\s*[=;]/);
        if (varMatch && !line.includes('(') && !line.includes('{')) {
          globalVars.push(varMatch[2]);
        }
      }
      
      i++;
    }

    return { functions, globalVars };
  }

  /**
   * Extract function parameters
   */
  private extractParameters(signature: string): string[] {
    const paramMatch = signature.match(/\(([^)]*)\)/);
    if (!paramMatch) return [];
    
    return paramMatch[1]
      .split(',')
      .map(p => p.trim().split(/\s+/).pop() || '')
      .filter(p => p.length > 0);
  }

  /**
   * Build CFG from parsed function
   */
  buildCFGForFunction(functionInfo: FunctionInfo, functionName: string): FunctionCFG {
    const blocks = new Map<string, BasicBlock>();
    const statements: Statement[] = [];
    
    let blockIdCounter = 0;
    let statementIdCounter = 0;
    
    // Create entry block
    const entryBlockId = `entry_${functionName}`;
    const entryBlock: BasicBlock = {
      id: entryBlockId,
      label: `Entry (${functionName})`,
      statements: [],
      predecessors: [],
      successors: []
    };
    blocks.set(entryBlockId, entryBlock);

    // Parse function body into statements
    let currentBlockId = entryBlockId;
    let i = 0;
    
    while (i < functionInfo.body.length) {
      const bodyLine = functionInfo.body[i];
      const content = bodyLine.content.trim();
      
      if (content.length === 0 || content.startsWith('//')) {
        i++;
        continue;
      }

      const statement = this.parseStatement(content, bodyLine.line, statementIdCounter++);
      
      // CFG construction: conditionals and loops create new basic blocks
      // This follows the standard CFG definition where control flow splits at conditionals
      if (statement.type === StatementType.CONDITIONAL || statement.type === StatementType.LOOP) {
        // Create new block for conditional/loop
        // Conditionals (if/else) and loops (while/for) create branch points in the CFG
        // The new block becomes the entry point for the conditional/loop body
        const newBlockId = `block_${blockIdCounter++}`;
        const newBlock: BasicBlock = {
          id: newBlockId,
          label: content.substring(0, 30) + '...', // Truncate long labels
          statements: [statement],
          predecessors: [currentBlockId], // Link back to previous block
          successors: [] // Will be populated when we encounter the end of conditional/loop
        };
        
        // Link current block to new block (control flow edge)
        blocks.get(currentBlockId)!.successors.push(newBlockId);
        blocks.set(newBlockId, newBlock);
        currentBlockId = newBlockId; // Continue building from new block
      } else {
        // Add to current block
        // Sequential statements (assignments, declarations, etc.) stay in same block
        // This follows the basic block definition: maximal sequence of statements with single entry/exit
        const currentBlock = blocks.get(currentBlockId)!;
        currentBlock.statements.push(statement);
      }
      
      i++;
    }

    // Create exit block
    const exitBlockId = `exit_${functionName}`;
    const exitBlock: BasicBlock = {
      id: exitBlockId,
      label: `Exit (${functionName})`,
      statements: [],
      predecessors: [currentBlockId],
      successors: []
    };
    blocks.get(currentBlockId)!.successors.push(exitBlockId);
    blocks.set(exitBlockId, exitBlock);

    return {
      name: functionName,
      entry: entryBlockId,
      exit: exitBlockId,
      blocks,
      parameters: functionInfo.parameters
    };
  }

  /**
   * Parse a statement from source code
   */
  private parseStatement(content: string, line: number, id: number): Statement {
    const trimmed = content.trim();
    const range: Range = {
      start: { line, column: 0 },
      end: { line, column: trimmed.length }
    };

    let type = StatementType.OTHER;
    const variables = { defined: [] as string[], used: [] as string[] };

    // Assignment
    if (trimmed.includes('=') && !trimmed.includes('==') && !trimmed.includes('!=')) {
      type = StatementType.ASSIGNMENT;
      const match = trimmed.match(/(\w+)\s*=/);
      if (match) {
        variables.defined.push(match[1]);
      }
      // Extract used variables (simple heuristic)
      const usedVars = trimmed.match(/(\w+)/g) || [];
      usedVars.forEach(v => {
        if (v !== 'int' && v !== 'float' && v !== 'double' && v !== 'char' && 
            v !== 'void' && v !== 'return' && v !== 'if' && v !== 'while' && 
            v !== 'for' && !variables.defined.includes(v)) {
          variables.used.push(v);
        }
      });
    }
    // Conditional
    else if (trimmed.startsWith('if') || trimmed.startsWith('else')) {
      type = StatementType.CONDITIONAL;
      const usedVars = trimmed.match(/(\w+)/g) || [];
      usedVars.forEach(v => {
        if (v !== 'if' && v !== 'else' && v !== 'int' && v !== 'float') {
          variables.used.push(v);
        }
      });
    }
    // Loop
    else if (trimmed.startsWith('while') || trimmed.startsWith('for')) {
      type = StatementType.LOOP;
      const usedVars = trimmed.match(/(\w+)/g) || [];
      usedVars.forEach(v => {
        if (v !== 'while' && v !== 'for' && v !== 'int' && v !== 'float') {
          variables.used.push(v);
        }
      });
    }
    // Return
    else if (trimmed.startsWith('return')) {
      type = StatementType.RETURN;
      const usedVars = trimmed.match(/(\w+)/g) || [];
      usedVars.forEach(v => {
        if (v !== 'return') {
          variables.used.push(v);
        }
      });
    }
    // Declaration
    else if (/^\s*(int|float|double|char|void)\s+\w+/.test(trimmed)) {
      type = StatementType.DECLARATION;
      const match = trimmed.match(/(\w+)\s*[=;]/);
      if (match) {
        variables.defined.push(match[1]);
      }
    }
    // Function call
    else if (trimmed.includes('(') && trimmed.includes(')') && !trimmed.includes('=')) {
      type = StatementType.FUNCTION_CALL;
      const usedVars = trimmed.match(/(\w+)/g) || [];
      usedVars.forEach(v => {
        if (v !== 'int' && v !== 'float' && v !== 'double' && v !== 'char') {
          variables.used.push(v);
        }
      });
    }

    return {
      id: `stmt_${id}`,
      type,
      text: trimmed,
      range,
      variables
    };
  }
}

export interface FunctionInfo {
  name: string;
  startLine: number;
  endLine: number;
  parameters: string[];
  body: Array<{ line: number; content: string }>;
}

