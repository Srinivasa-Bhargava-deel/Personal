/**
 * StateManager.ts
 * 
 * State Manager - Analysis State Persistence
 * 
 * PURPOSE:
 * Handles persistence of analysis results to disk, enabling the extension to save and
 * restore analysis state across VS Code sessions. This improves performance by avoiding
 * re-analysis of unchanged files and provides continuity for users.
 * 
 * SIGNIFICANCE IN OVERALL FLOW:
 * This component sits at the END of the analysis pipeline, persisting results after
 * analysis completes. It also sits at the BEGINNING, loading saved state when the
 * extension activates. It enables incremental analysis by tracking file changes and
 * only re-analyzing modified files.
 * 
 * DATA FLOW:
 * INPUTS:
 *   - AnalysisState object (from DataflowAnalyzer.ts) containing:
 *     - CFG structures
 *     - Liveness analysis results
 *     - Reaching definitions results
 *     - Taint analysis results
 *     - Vulnerability results
 *     - Call graph
 *     - Inter-procedural analysis results
 *     - File states (for change tracking)
 *   - Workspace path (from extension.ts)
 *   - File paths (for computing file hashes)
 * 
 * PROCESSING:
 *   1. Serializes AnalysisState to JSON format:
 *      - Converts Maps to arrays
 *      - Converts Sets to arrays
 *      - Preserves all analysis data
 *   2. Writes JSON to .vscode/dataflow-state.json
 *   3. Loads state from disk:
 *      - Reads JSON file
 *      - Deserializes to AnalysisState object
 *      - Reconstructs Maps and Sets
 *   4. Computes file hashes (SHA-256) for change detection
 *   5. Clears state when requested
 * 
 * OUTPUTS:
 *   - Saved state file: .vscode/dataflow-state.json (persisted to disk)
 *   - Loaded AnalysisState object -> DataflowAnalyzer.ts (for incremental analysis)
 *   - File hash -> DataflowAnalyzer.ts (for change detection)
 * 
 * DEPENDENCIES:
 *   - types.ts: AnalysisState, FileAnalysisState
 *   - Node.js fs module: File system operations
 *   - Node.js crypto module: File hash computation
 *   - VS Code API: Error notifications
 * 
 * STORAGE FORMAT:
 * State is stored as JSON in .vscode/dataflow-state.json with the following structure:
 * - workspacePath: Workspace root path
 * - timestamp: Analysis timestamp
 * - cfg: Serialized CFG structure
 * - liveness: Serialized liveness results
 * - reachingDefinitions: Serialized reaching definitions results
 * - taintAnalysis: Serialized taint analysis results
 * - vulnerabilities: Serialized vulnerability results
 * - fileStates: File metadata with hashes for change detection
 * - callGraph: Serialized call graph
 * - interProceduralRD: Serialized inter-procedural reaching definitions
 * - parameterAnalysis: Serialized parameter analysis
 * - returnValueAnalysis: Serialized return value analysis
 * 
 * INCREMENTAL ANALYSIS:
 * File hashes enable incremental analysis - only files that have changed since the last
 * analysis are re-analyzed, improving performance for large codebases.
 * 
 * Implementation (v1.9.0):
 * - Uses SHA-256 cryptographic hashing for content-based change detection
 * - Only re-analyzes files with changed hashes
 * - Preserves analysis state for unchanged files
 * - Comprehensive logging (DEBUG, INFO, WARN, ERROR) for debugging
 * 
 * References:
 * - "Incremental Static Analysis" - Reps et al. (2003)
 * - "Engineering a Compiler" (Cooper & Torczon) - Incremental Compilation
 * 
 * LOGGING STRATEGY:
 * This file uses LoggingConfig methods for all logging:
 * - LoggingConfig.log() - Normal operational messages (e.g., "State loaded...")
 * - LoggingConfig.detail() - Detailed debugging info (e.g., file sizes, hash values)
 * - LoggingConfig.error() - Error messages
 * - LoggingConfig.warn() - Warning messages
 * - LoggingConfig.raw() - Raw messages without module prefix (for state operations)
 * 
 * All logs are automatically written to .vscode/logs.txt via console interception.
 * Module flag: LoggingConfig.StateManager controls logging for this component.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { AnalysisState, FileAnalysisState } from '../types';
import * as crypto from 'crypto';
import { LoggingConfig } from '../utils/LoggingConfig';

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
   * 
   * Implements state restoration for incremental analysis.
   * Deserializes JSON back to AnalysisState with proper Map/Set reconstruction.
   * 
   * @returns Object with state and load time in milliseconds
   */
  loadState(): { state: AnalysisState | null; loadTimeMs: number } {
    const startTime = Date.now();
    LoggingConfig.raw(`[StateManager] [LOAD] ========== LOADING STATE ==========`);
    LoggingConfig.raw(`[StateManager] [LOAD] State path: ${this.statePath}`);
    try {
      /**
       * STATE FILE EXISTENCE CHECK
       * 
       * Checks if saved state file exists before attempting to load.
       * Returns null state if file doesn't exist (first run scenario).
       */
      if (!fs.existsSync(this.statePath)) {
        // No saved state found - this is normal for first run
        LoggingConfig.raw(`[StateManager] [LOAD] No saved state found at ${this.statePath}`);
        LoggingConfig.detail('StateManager', `No saved state found at ${this.statePath}`);
        return { state: null, loadTimeMs: Date.now() - startTime };
      }

      /**
       * STATE FILE READING AND DESERIALIZATION
       * 
       * Reads JSON file from disk and deserializes to AnalysisState object.
       * Reconstructs Maps and Sets from plain objects.
       */
      LoggingConfig.raw(`[StateManager] [LOAD] Reading state file from disk...`);
      LoggingConfig.log('StateManager', `Loading saved state from ${this.statePath}`);
      const data = fs.readFileSync(this.statePath, 'utf-8');
      const fileSizeKB = (data.length / 1024).toFixed(2);
      LoggingConfig.raw(`[StateManager] [LOAD] State file size: ${fileSizeKB} KB`);
      LoggingConfig.detail('StateManager', `State file size: ${fileSizeKB} KB`);
      
      LoggingConfig.raw(`[StateManager] [LOAD] Parsing JSON...`);
      const state = JSON.parse(data);
      
      // Reconstruct Maps from plain objects
      LoggingConfig.raw(`[StateManager] [LOAD] Deserializing state (reconstructing Maps/Sets)...`);
      const deserializedState = this.deserializeState(state);
      const loadTimeMs = Date.now() - startTime;
      
      /**
       * STATE LOAD SUCCESS
       * 
       * State successfully loaded and deserialized.
       * Logs summary statistics for verification.
       */
      LoggingConfig.raw(`[StateManager] [LOAD] ✅ State loaded successfully in ${loadTimeMs}ms`);
      LoggingConfig.raw(`[StateManager] [LOAD] Functions: ${deserializedState.cfg.functions.size}, Files: ${deserializedState.fileStates.size}`);
      LoggingConfig.raw(`[StateManager] [LOAD] Taint sensitivity: ${deserializedState.taintSensitivity || 'precise'}`);
      LoggingConfig.log('StateManager', `State loaded successfully in ${loadTimeMs}ms (${deserializedState.cfg.functions.size} functions, ${deserializedState.fileStates.size} files)`);
      return { state: deserializedState, loadTimeMs };
    } catch (error) {
      /**
       * STATE LOAD ERROR
       * 
       * Error occurred while loading state - log error and return null state.
       * Extension will proceed with fresh analysis.
       */
      LoggingConfig.raw(`[StateManager] [LOAD] ❌ ERROR loading state: ${error}`);
      LoggingConfig.error('StateManager', 'Error loading state', error);
      return { state: null, loadTimeMs: Date.now() - startTime };
    }
  }

  /**
   * Save analysis state to disk
   * 
   * Implements persistent state storage for incremental analysis.
   * Follows academic standards for state persistence in static analysis tools.
   * 
   * Algorithm:
   * 1. Serialize AnalysisState to JSON (Maps -> Arrays, Sets -> Arrays)
   * 2. Write to .vscode/dataflow-state.json
   * 3. Preserves file hashes for incremental change detection
   * 
   * Reference: "Incremental Static Analysis" - Reps et al. (2003)
   */
  saveState(state: AnalysisState): void {
    LoggingConfig.raw(`[StateManager] [SAVE] ========== SAVING STATE ==========`);
    LoggingConfig.raw(`[StateManager] [SAVE] State path: ${this.statePath}`);
    LoggingConfig.raw(`[StateManager] [SAVE] Functions: ${state.cfg.functions.size}, Files: ${state.fileStates.size}`);
    LoggingConfig.raw(`[StateManager] [SAVE] Taint sensitivity: ${state.taintSensitivity || 'precise'}`);
    try {
      /**
       * STATE SERIALIZATION AND SAVE
       * 
       * Serializes AnalysisState to JSON and writes to disk.
       * Ensures .vscode directory exists before writing.
       */
      LoggingConfig.log('StateManager', `Saving analysis state to ${this.statePath}`);
      
      // Ensure directory exists
      const dir = path.dirname(this.statePath);
      if (!fs.existsSync(dir)) {
        LoggingConfig.raw(`[StateManager] [SAVE] Creating directory: ${dir}`);
        fs.mkdirSync(dir, { recursive: true });
        LoggingConfig.detail('StateManager', `Created directory: ${dir}`);
      }

      LoggingConfig.raw(`[StateManager] [SAVE] Serializing state (converting Maps/Sets to JSON)...`);
      const serialized = this.serializeState(state);
      LoggingConfig.raw(`[StateManager] [SAVE] Converting to JSON string...`);
      const jsonContent = JSON.stringify(serialized, null, 2);
      LoggingConfig.raw(`[StateManager] [SAVE] Writing to disk...`);
      fs.writeFileSync(this.statePath, jsonContent, 'utf-8');
      
      /**
       * STATE SAVE SUCCESS
       * 
       * State successfully written to disk.
       * Logs file size and summary statistics.
       */
      const fileSizeKB = (jsonContent.length / 1024).toFixed(2);
      LoggingConfig.raw(`[StateManager] [SAVE] ✅ State saved successfully (${fileSizeKB} KB)`);
      LoggingConfig.log('StateManager', `State saved successfully (${fileSizeKB} KB, ${state.cfg.functions.size} functions, ${state.fileStates.size} files)`);
    } catch (error) {
      /**
       * STATE SAVE ERROR
       * 
       * Error occurred while saving state - log error and notify user.
       */
      LoggingConfig.raw(`[StateManager] [SAVE] ❌ ERROR saving state: ${error}`);
      LoggingConfig.error('StateManager', 'Error saving state', error);
      vscode.window.showErrorMessage(`Failed to save analysis state: ${error}`);
    }
  }

  /**
   * Clear analysis state
   * 
   * Deletes the saved state file from disk.
   * Used when user wants to reset analysis or when state is corrupted.
   */
  clearState(): void {
    LoggingConfig.raw(`[StateManager] [CLEAR] ========== CLEARING STATE ==========`);
    LoggingConfig.raw(`[StateManager] [CLEAR] State path: ${this.statePath}`);
    try {
      if (fs.existsSync(this.statePath)) {
        // State file exists - delete it
        LoggingConfig.raw(`[StateManager] [CLEAR] Deleting state file...`);
        fs.unlinkSync(this.statePath);
        LoggingConfig.raw(`[StateManager] [CLEAR] ✅ State file deleted successfully`);
        LoggingConfig.log('StateManager', 'State file deleted successfully');
      } else {
        // State file doesn't exist - nothing to clear
        LoggingConfig.raw(`[StateManager] [CLEAR] State file does not exist, nothing to clear`);
        LoggingConfig.detail('StateManager', 'State file does not exist, nothing to clear');
      }
    } catch (error) {
      // Error clearing state - log error
      LoggingConfig.raw(`[StateManager] [CLEAR] ❌ ERROR clearing state: ${error}`);
      LoggingConfig.error('StateManager', 'Error clearing state', error);
    }
  }

  /**
   * Compute file hash for change detection
   * 
   * Uses SHA-256 cryptographic hash for content-based change detection.
   * This enables incremental analysis by detecting file modifications without
   * re-analyzing unchanged files.
   * 
   * Algorithm: SHA-256(content) -> 64-character hex string
   * 
   * Reference: "Incremental Static Analysis" - Reps et al. (2003)
   * 
   * @param filePath - Absolute path to the file
   * @returns SHA-256 hash of file content (empty string on error)
   */
  /**
   * Compute file hash for change detection
   * 
   * Uses SHA-256 cryptographic hash for content-based change detection.
   * This enables incremental analysis by detecting file modifications without
   * re-analyzing unchanged files.
   * 
   * Algorithm: SHA-256(content) -> 64-character hex string
   * 
   * Reference: "Incremental Static Analysis" - Reps et al. (2003)
   * 
   * @param filePath - Absolute path to the file
   * @returns SHA-256 hash of file content (empty string on error)
   */
  computeFileHash(filePath: string): string {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      // Log hash computation (verbose level - only first 8 chars for brevity)
      LoggingConfig.verbose('StateManager', `Computed hash for ${filePath}: ${hash.substring(0, 8)}...`);
      return hash;
    } catch (error) {
      // Hash computation failed - log error and return empty string
      LoggingConfig.error('StateManager', `Failed to compute hash for ${filePath}`, error);
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

