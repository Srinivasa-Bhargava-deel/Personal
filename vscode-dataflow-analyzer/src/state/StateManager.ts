/**
 * State management for persisting analysis results
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { AnalysisState, FileAnalysisState } from '../types';
import * as crypto from 'crypto';

export class StateManager {
  private statePath: string;
  private workspacePath: string;

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
    // Store state.json in workspace root
    this.statePath = path.join(workspacePath, '.vscode', 'dataflow-state.json');
  }

  /**
   * Load analysis state from disk
   */
  loadState(): AnalysisState | null {
    try {
      if (!fs.existsSync(this.statePath)) {
        return null;
      }

      const data = fs.readFileSync(this.statePath, 'utf-8');
      const state = JSON.parse(data);
      
      // Reconstruct Maps from plain objects
      return this.deserializeState(state);
    } catch (error) {
      console.error('Error loading state:', error);
      return null;
    }
  }

  /**
   * Save analysis state to disk
   */
  saveState(state: AnalysisState): void {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.statePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const serialized = this.serializeState(state);
      fs.writeFileSync(this.statePath, JSON.stringify(serialized, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving state:', error);
      vscode.window.showErrorMessage(`Failed to save analysis state: ${error}`);
    }
  }

  /**
   * Clear analysis state
   */
  clearState(): void {
    try {
      if (fs.existsSync(this.statePath)) {
        fs.unlinkSync(this.statePath);
      }
    } catch (error) {
      console.error('Error clearing state:', error);
    }
  }

  /**
   * Compute file hash for change detection
   */
  computeFileHash(filePath: string): string {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch (error) {
      return '';
    }
  }

  /**
   * Serialize state for JSON storage
   */
  private serializeState(state: AnalysisState): any {
    return {
      workspacePath: state.workspacePath,
      timestamp: state.timestamp,
      cfg: this.serializeCFG(state.cfg),
      liveness: Array.from(state.liveness.entries()).map(([k, v]: [string, any]) => [
        k,
        {
          blockId: v.blockId,
          in: Array.from(v.in),
          out: Array.from(v.out)
        }
      ]),
      reachingDefinitions: Array.from(state.reachingDefinitions.entries()).map(([k, v]: [string, any]) => [
        k,
        {
          blockId: v.blockId,
          gen: Object.fromEntries((Array.from(v.gen.entries()) as Array<[string, any[]]>).map(([varName, defs]) => [
            varName,
            defs.map((d: any) => ({
              variable: d.variable,
              definitionId: d.definitionId,
              blockId: d.blockId,
              statementId: d.statementId,
              range: d.range
            }))
          ])),
          kill: Object.fromEntries((Array.from(v.kill.entries()) as Array<[string, any[]]>).map(([varName, defs]) => [
            varName,
            defs.map((d: any) => ({
              variable: d.variable,
              definitionId: d.definitionId,
              blockId: d.blockId,
              statementId: d.statementId,
              range: d.range
            }))
          ])),
          in: Object.fromEntries((Array.from(v.in.entries()) as Array<[string, any[]]>).map(([varName, defs]) => [
            varName,
            defs.map((d: any) => ({
              variable: d.variable,
              definitionId: d.definitionId,
              blockId: d.blockId,
              statementId: d.statementId,
              range: d.range
            }))
          ])),
          out: Object.fromEntries((Array.from(v.out.entries()) as Array<[string, any[]]>).map(([varName, defs]) => [
            varName,
            defs.map((d: any) => ({
              variable: d.variable,
              definitionId: d.definitionId,
              blockId: d.blockId,
              statementId: d.statementId,
              range: d.range
            }))
          ]))
        }
      ]),
      taintAnalysis: Array.from(state.taintAnalysis.entries()).map(([k, v]: [string, any[]]) => [
        k,
        v.map((t: any) => ({
          variable: t.variable,
          source: t.source,
          tainted: t.tainted,
          propagationPath: t.propagationPath
        }))
      ]),
      vulnerabilities: Array.from(state.vulnerabilities.entries()).map(([k, v]: [string, any[]]) => [
        k,
        v
      ]),
      fileStates: Array.from(state.fileStates.entries()).map(([k, v]: [string, FileAnalysisState]) => [
        k,
        {
          path: v.path,
          lastModified: v.lastModified,
          hash: v.hash,
          functions: v.functions
        }
      ])
    };
  }

  /**
   * Deserialize state from JSON
   */
  private deserializeState(data: any): AnalysisState {
    const cfg = this.deserializeCFG(data.cfg);
    
    const liveness = new Map<string, any>();
    if (data.liveness) {
      data.liveness.forEach(([k, v]: [string, any]) => {
        liveness.set(k, {
          blockId: v.blockId,
          in: new Set(v.in),
          out: new Set(v.out)
        });
      });
    }

    const reachingDefinitions = new Map<string, any>();
    if (data.reachingDefinitions) {
      data.reachingDefinitions.forEach(([k, v]: [string, any]) => {
        reachingDefinitions.set(k, {
          blockId: v.blockId,
          gen: new Map(Object.entries(v.gen || {})),
          kill: new Map(Object.entries(v.kill || {})),
          in: new Map(Object.entries(v.in || {})),
          out: new Map(Object.entries(v.out || {}))
        });
      });
    }

    const taintAnalysis = new Map<string, any[]>();
    if (data.taintAnalysis) {
      data.taintAnalysis.forEach(([k, v]: [string, any[]]) => {
        taintAnalysis.set(k, v);
      });
    }

    const vulnerabilities = new Map<string, any[]>();
    if (data.vulnerabilities) {
      data.vulnerabilities.forEach(([k, v]: [string, any[]]) => {
        vulnerabilities.set(k, v);
      });
    }

    const fileStates = new Map<string, FileAnalysisState>();
    if (data.fileStates) {
      data.fileStates.forEach(([k, v]: [string, FileAnalysisState]) => {
        fileStates.set(k, v);
      });
    }

    return {
      workspacePath: data.workspacePath,
      timestamp: data.timestamp,
      cfg,
      liveness,
      reachingDefinitions,
      taintAnalysis,
      vulnerabilities,
      fileStates
    };
  }

  private serializeCFG(cfg: any): any {
    return {
      entry: cfg.entry,
      exit: cfg.exit,
      blocks: (Array.from(cfg.blocks.entries()) as Array<[string, any]>).map(([k, v]) => [
        k,
        {
          id: v.id,
          label: v.label,
          statements: v.statements,
          predecessors: v.predecessors,
          successors: v.successors,
          range: v.range
        }
      ]),
      functions: (Array.from(cfg.functions.entries()) as Array<[string, any]>).map(([k, v]) => [
        k,
        {
          name: v.name,
          entry: v.entry,
          exit: v.exit,
          blocks: (Array.from(v.blocks.entries()) as Array<[string, any]>).map(([bk, bv]) => [
            bk,
            {
              id: bv.id,
              label: bv.label,
              statements: bv.statements,
              predecessors: bv.predecessors,
              successors: bv.successors,
              range: bv.range
            }
          ]),
          parameters: v.parameters
        }
      ])
    };
  }

  private deserializeCFG(data: any): any {
    const blocks = new Map();
    if (data.blocks) {
      data.blocks.forEach(([k, v]: [string, any]) => {
        blocks.set(k, v);
      });
    }

    const functions = new Map();
    if (data.functions) {
      data.functions.forEach(([k, v]: [string, any]) => {
        const funcBlocks = new Map();
        if (v.blocks) {
          v.blocks.forEach(([bk, bv]: [string, any]) => {
            funcBlocks.set(bk, bv);
          });
        }
        functions.set(k, {
          name: v.name,
          entry: v.entry,
          exit: v.exit,
          blocks: funcBlocks,
          parameters: v.parameters
        });
      });
    }

    return {
      entry: data.entry,
      exit: data.exit,
      blocks,
      functions
    };
  }
}

