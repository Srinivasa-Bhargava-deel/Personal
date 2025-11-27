/**
 * extension.ts
 * 
 * VS Code Extension Entry Point
 * 
 * PURPOSE:
 * This module serves as the main activation point for the C++ Dataflow Analyzer extension.
 * It handles extension lifecycle, command registration, and coordination between
 * the analyzer and visualizer components.
 * 
 * SIGNIFICANCE IN OVERALL FLOW:
 * This is the entry point of the entire extension. It initializes all components and
 * provides the bridge between VS Code's extension API and the analysis engine.
 * 
 * DATA FLOW:
 * INPUTS:
 *   - VS Code extension context (from VS Code API)
 *   - User commands (Show CFG, Analyze Workspace, Analyze Active File, Clear State)
 *   - Configuration settings (from VS Code settings)
 *   - File change events (from VS Code file watchers)
 * 
 * OUTPUTS:
 *   - Initialized DataflowAnalyzer instance -> DataflowAnalyzer.ts
 *   - Initialized CFGVisualizer instance -> CFGVisualizer.ts
 *   - Command handlers that trigger analysis workflows
 *   - File watchers that trigger incremental updates
 * 
 * KEY RESPONSIBILITIES:
 * - Extension activation and deactivation
 * - Command registration (Show CFG, Analyze Workspace, Analyze Active File, Clear State, Save State, Re-analyze)
 * - Configuration management (including taint sensitivity levels)
 * - File watcher setup for incremental updates
 * - Error handling and user notifications
 * - State persistence and save states list management (v1.9.0+)
 * 
 * LOGGING STRATEGY:
 * This file uses a two-phase logging approach:
 * 
 * PHASE 1 (Before LoggingConfig.initializeFileLogging()):
 *   - Use console.log/error/warn directly for early activation logs
 *   - These logs occur during workspace path detection and initial setup
 *   - They will be captured by console interception once logging is initialized
 * 
 * PHASE 2 (After LoggingConfig.initializeFileLogging()):
 *   - Use LoggingConfig methods for all logging:
 *     - LoggingConfig.log() - Normal operational messages
 *     - LoggingConfig.detail() - Detailed debugging information
 *     - LoggingConfig.error() - Error messages
 *     - LoggingConfig.warn() - Warning messages
 *     - LoggingConfig.section() - Major event headers
 *     - LoggingConfig.raw() - Raw messages without module prefix
 *   - All logs are automatically written to .vscode/logs.txt via console interception
 *   - Logs are cleared when EDH window closes (via deactivate())
 * 
 * NEW FEATURES (v1.9.0):
 * - Taint sensitivity configuration with 5 levels (MINIMAL → MAXIMUM)
 * - Manual save state button in visualization header
 * - Re-analyze button for sensitivity changes
 * - Save states list tracking (`.vscode/save-states-list.json`)
 * - Enhanced incremental analysis with comprehensive logging
 * 
 * BUG FIXES (v1.9.1):
 * - Fixed tab switching sensitivity mismatch detection
 * - Added automatic re-analysis trigger when sensitivity changes
 * - Enhanced visualization data regeneration on sensitivity change
 * - Added extensive logging for debugging sensitivity issues
 * - Improved error handling for sensitivity mismatches
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { DataflowAnalyzer } from './analyzer/DataflowAnalyzer';
import { CFGVisualizer } from './visualizer/CFGVisualizer';
import { AnalysisConfig, TaintSensitivity } from './types';
import { StateManager } from './state/StateManager';
import { LoggingConfig } from './utils/LoggingConfig';

// Global extension state
let analyzer: DataflowAnalyzer | null = null;  // Main dataflow analyzer instance
let visualizer: CFGVisualizer | null = null;   // CFG visualization component
let debounceTimer: NodeJS.Timeout | null = null;  // Timer for debouncing keystroke updates

/**
 * Extension activation function
 * 
 * Called by VS Code when the extension is activated. Initializes the analyzer
 * and visualizer, registers commands, and sets up file watchers.
 * 
 * @param context - VS Code extension context for managing subscriptions
 */
// Flag to prevent config change handler from overriding programmatic sensitivity changes
let isUpdatingSensitivityProgrammatically = false;

export function activate(context: vscode.ExtensionContext) {
  /**
   * LOGGING STRATEGY:
   * - Before LoggingConfig.initializeFileLogging(): Use console.log/error/warn directly
   *   These will be captured by console interception once logging is initialized.
   * - After LoggingConfig.initializeFileLogging(): Use LoggingConfig methods:
   *   - LoggingConfig.log() for normal operational messages
   *   - LoggingConfig.detail() for detailed debugging info
   *   - LoggingConfig.error() for errors
   *   - LoggingConfig.warn() for warnings
   *   - LoggingConfig.section() for major event headers
   *   - LoggingConfig.raw() for raw messages without module prefix
   * 
   * All logs are automatically written to .vscode/logs.txt via console interception.
   */
  
  // CRITICAL: Always log activation - use console.log directly to ensure it works
  // These logs occur BEFORE LoggingConfig initialization, so they use console.log
  // They will be captured by console interception once logging is initialized
  console.log('=== EXTENSION ACTIVATION CALLED ===');
  console.log('Context:', context ? 'valid' : 'null');
  console.log('Timestamp:', new Date().toISOString());
  
  // Show immediate notification to verify activation
  vscode.window.showInformationMessage('🔍 Extension activation started!', { modal: false }).then(() => {
    console.log('Activation notification shown');
  }, (err: any) => {
    console.error('Failed to show activation notification:', err);
  });
  
  try {
    console.log('Dataflow Analyzer extension is activating...');

    // Determine workspace path - always use workspace root, not subdirectories
    let workspacePath: string = require('os').homedir(); // Default fallback
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      console.log(`[Extension] Workspace folders count: ${workspaceFolders ? workspaceFolders.length : 0}`);
      if (workspaceFolders && workspaceFolders.length > 0) {
        // Use the first workspace folder - this is the actual workspace root
        workspacePath = workspaceFolders[0].uri.fsPath;
        console.log('Using workspace folder:', workspacePath);
      } else {
        console.log('[Extension] No workspace folders found, using fallback detection');
        // No workspace folder - try to find workspace root by walking up from active file
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor?.document?.uri?.fsPath) {
          const activeFilePath = activeEditor.document.uri.fsPath;
          let currentDir = path.dirname(activeFilePath);
          
          // Walk up directory tree to find workspace root (where .vscode or package.json exists)
          let foundWorkspace = false;
          const maxDepth = 10; // Prevent infinite loops
          let depth = 0;
          
          // First pass: Look for package.json (strongest indicator of workspace root)
          let packageJsonPath: string | null = null;
          let currentDirForPackage = currentDir;
          let depthForPackage = 0;
          
          while (depthForPackage < maxDepth) {
            const packageJson = path.join(currentDirForPackage, 'package.json');
            if (fs.existsSync(packageJson)) {
              packageJsonPath = currentDirForPackage;
              console.log(`Found package.json at: ${packageJsonPath} (depth: ${depthForPackage})`);
              break;
            }
            const parentDir = path.dirname(currentDirForPackage);
            if (parentDir === currentDirForPackage) {
              break; // Reached filesystem root
            }
            currentDirForPackage = parentDir;
            depthForPackage++;
          }
          
          if (packageJsonPath) {
            // Use package.json location as workspace root
            workspacePath = packageJsonPath;
            foundWorkspace = true;
            console.log(`Using workspace root: ${workspacePath} (found via package.json)`);
          } else {
            // Fallback: Look for .vscode with extension files (but only if no package.json found)
            while (depth < maxDepth && !foundWorkspace) {
              const vscodeDir = path.join(currentDir, '.vscode');
              
              if (fs.existsSync(vscodeDir)) {
                // Check if this .vscode directory contains workspace-specific files
                // to avoid false positives (e.g., tests/.vscode)
                const logsFile = path.join(vscodeDir, 'logs.txt');
                const stateFile = path.join(vscodeDir, 'dataflow-state.json');
                if (fs.existsSync(logsFile) || fs.existsSync(stateFile)) {
                  // This .vscode contains our extension's files, so it's likely the workspace root
                  workspacePath = currentDir;
                  foundWorkspace = true;
                  console.log(`Found workspace root at: ${workspacePath} (depth: ${depth}) via .vscode with extension files`);
                  break;
                }
              }
              
              const parentDir = path.dirname(currentDir);
              if (parentDir === currentDir) {
                // Reached filesystem root
                break;
              }
              currentDir = parentDir;
              depth++;
            }
          }
          
          if (!foundWorkspace) {
            // Fallback to active file directory if we couldn't find workspace root
            workspacePath = path.dirname(activeFilePath);
            console.log('Using active file directory (workspace root not found):', workspacePath);
          }
        } else {
          try {
            workspacePath = process.cwd();
            console.log('Using process.cwd():', workspacePath);
          } catch {
            workspacePath = require('os').homedir();
            console.log('Using home directory:', workspacePath);
          }
        }
      }
    } catch (error) {
      console.error('Error determining workspace path:', error);
      workspacePath = require('os').homedir();
      console.log('Fallback to home directory:', workspacePath);
    }
    
    /**
     * INITIALIZE FILE LOGGING
     * 
     * This must be called FIRST before any LoggingConfig methods are used.
     * It sets up:
     * - .vscode/logs.txt file (cleared on initialization)
     * - Console interception (all console.log/error/warn → logs.txt)
     * - Write stream for async logging
     * 
     * After this point, ALL console output is automatically written to logs.txt.
     */
    LoggingConfig.initializeFileLogging(workspacePath);
    
    /**
     * POST-INITIALIZATION LOGGING
     * 
     * Now we can use LoggingConfig methods safely. All logs will be:
     * - Written to console (for Developer Console visibility)
     * - Written to .vscode/logs.txt (via console interception)
     * - Cleared when EDH window closes (via deactivate())
     */
    LoggingConfig.section('Extension', '🚀 MAJOR EVENT: Extension Activation Started');
    LoggingConfig.raw('[MAJOR EVENT] Extension: Dataflow Analyzer is activating');
    LoggingConfig.log('Extension', `Extension Version: 1.9.6`);
    LoggingConfig.log('Extension', `Activation Time: ${new Date().toISOString()}`);
    LoggingConfig.log('Extension', `Workspace path: ${workspacePath}`);
    
    // Extension is now active - log using LoggingConfig
    LoggingConfig.log('Extension', 'Dataflow Analyzer extension is now active');

    // Initialize visualizer component
    visualizer = new CFGVisualizer();
    LoggingConfig.log('Extension', 'CFGVisualizer initialized');

    // Load extension configuration from VS Code settings
    const config = vscode.workspace.getConfiguration('dataflowAnalyzer');
    const taintSensitivityStr = config.get<string>('taintSensitivity', 'precise');
    const taintSensitivity = taintSensitivityStr as TaintSensitivity || TaintSensitivity.PRECISE;
    
    // Log configuration details - use detail() for configuration info
    LoggingConfig.detail('Extension', `Configuration loaded: Taint Sensitivity = ${taintSensitivity}`);
    
    const analysisConfig: AnalysisConfig = {
      updateMode: config.get('updateMode', 'save'),  // 'save' or 'keystroke'
      enableLiveness: config.get('enableLiveness', true),
      enableReachingDefinitions: config.get('enableReachingDefinitions', true),
      enableTaintAnalysis: config.get('enableTaintAnalysis', true),
      debounceDelay: config.get('debounceDelay', 500),  // Milliseconds for keystroke debouncing
      enableInterProcedural: config.get('enableInterProcedural', true),
      taintSensitivity: taintSensitivity  // Taint analysis sensitivity level (v1.9+)
    };

    // Initialize main analyzer with workspace path and configuration
    const analyzerInitStartTime = Date.now();
    analyzer = new DataflowAnalyzer(workspacePath, analysisConfig);
    const analyzerInitTimeMs = Date.now() - analyzerInitStartTime;
    
    // Check if state was loaded and notify user
    setTimeout(() => {
      const state = analyzer?.getState();
      if (state && state.cfg.functions.size > 0 && (state as any).loadTimeMs !== undefined) {
        // State was loaded (has functions and load time)
        const fileName = Array.from(state.fileStates.keys())[0]?.split(/[/\\]/).pop() || 'workspace';
        const loadTimeMs = (state as any).loadTimeMs;
        vscode.window.showInformationMessage(`Loaded saved analysis state for ${fileName} (${loadTimeMs}ms)`);
        LoggingConfig.log('Extension', `Analyzer initialized in ${analyzerInitTimeMs}ms, state loaded in ${loadTimeMs}ms`);
      } else {
        LoggingConfig.log('Extension', `Analyzer initialized in ${analyzerInitTimeMs}ms (no saved state)`);
      }
    }, 100);

    // Register VS Code commands
    const showCFGCommand = vscode.commands.registerCommand('dataflowAnalyzer.showCFG', async () => {
    LoggingConfig.section('Extension', '🎯 MAJOR EVENT: showCFG command triggered');
    LoggingConfig.raw('[MAJOR EVENT] User clicked: Show CFG Visualization');
    if (visualizer) {
      const active = vscode.window.activeTextEditor;
      const filename = active?.document.fileName || undefined;
      LoggingConfig.log('Extension', `Active File: ${filename || 'none'}`);
      // Create/show CFG visualization panel
      await visualizer.createOrShow(context, filename, 'Viz/Cfg');
      const state = analyzer?.getState();
      if (state) {
        LoggingConfig.log('Extension', `State Available: ${state.cfg.functions.size} functions`);
        // State loaded from analyzer is from saved state (if it exists)
        const isFromSavedState = !!(state as any).loadTimeMs;
        await visualizer.updateVisualization(state, undefined, isFromSavedState);
      }
    } else {
      LoggingConfig.warn('Extension', 'Visualizer not initialized');
    }
  });

  /**
   * Register command: Analyze Workspace
   * 
   * Analyzes all C++ files in the workspace and displays results in the visualizer.
   * Shows progress notification and handles errors gracefully.
   */
  const analyzeWorkspaceCommand = vscode.commands.registerCommand('dataflowAnalyzer.analyzeWorkspace', async () => {
    LoggingConfig.section('Extension', '🎯 MAJOR EVENT: analyzeWorkspace command triggered');
    LoggingConfig.raw('[MAJOR EVENT] User clicked: Analyze Workspace');
    if (!analyzer) {
      LoggingConfig.error('Extension', 'Analyzer not initialized');
      vscode.window.showErrorMessage('Analyzer not initialized');
      return;
    }
    
    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: "Analyzing workspace...",
      cancellable: false
    }, async (progress) => {
      try {
        progress.report({ increment: 0, message: "Parsing C++ files..." });
        LoggingConfig.log('Extension', 'Starting workspace analysis...');
        if (!analyzer) {
          vscode.window.showErrorMessage('Analyzer not initialized');
          return;
        }
        const analysisStartTime = Date.now();
        const state = await analyzer.analyzeWorkspace();
        const analysisTimeMs = Date.now() - analysisStartTime;
        
        LoggingConfig.section('Extension', 'ANALYSIS COMPLETE');
        LoggingConfig.log('Extension', `Analysis Time: ${analysisTimeMs}ms`);
        LoggingConfig.log('Extension', `Functions Found: ${state.cfg.functions.size}`);
        LoggingConfig.log('Extension', `Taint Sensitivity: ${state.taintSensitivity}`);
        
        // Log summary of all analysis results
        LoggingConfig.table('Extension', 'Analysis Summary', {
          'Functions': state.cfg.functions.size,
          'Liveness Entries': state.liveness.size,
          'RD Entries': state.reachingDefinitions.size,
          'Taint Entries': state.taintAnalysis.size,
          'Vulnerability Functions': state.vulnerabilities.size
        });
        
        // Log function names found during analysis
        LoggingConfig.detail('Extension', `Analysis complete. Found ${state.cfg.functions.size} functions: ${Array.from(state.cfg.functions.keys()).join(', ')}`);
        LoggingConfig.log('Extension', `Total analysis time: ${analysisTimeMs}ms`);
        
        progress.report({ increment: 50, message: "Building CFG..." });
        
        progress.report({ increment: 100, message: "Complete!" });
        
        const functionCount = state.cfg.functions.size;
        
        if (visualizer) {
          // Check if any panels already exist - if so, update them instead of creating new ones
          LoggingConfig.detail('Extension', 'Checking for existing panels before updating visualization...');
          const hasExistingPanels = visualizer.hasPanels();
          LoggingConfig.detail('Extension', `hasPanels() returned: ${hasExistingPanels}`);
          LoggingConfig.detail('Extension', `Panel count: ${visualizer.getPanelCount?.() || 'method not available'}`);
          
          if (hasExistingPanels) {
            // Update existing panels with new analysis results
            LoggingConfig.log('Extension', 'Panels exist - updating existing visualization panels with re-analysis results');
            LoggingConfig.detail('Extension', `Current sensitivity: ${state.taintSensitivity || 'precise'}`);
            LoggingConfig.detail('Extension', 'Calling updateVisualization() to update existing panels');
            // Fresh analysis - not from saved state
            await visualizer.updateVisualization(state, undefined, false);
            LoggingConfig.detail('Extension', 'updateVisualization() completed');
            
            // Update panel titles to reflect current sensitivity
            const sensitivity = state.taintSensitivity || 'precise';
            const panelKeys = visualizer.getPanelKeys?.() || [];
            LoggingConfig.detail('Extension', `Updating ${panelKeys.length} panel title(s) to include sensitivity: ${sensitivity}`);
            // Note: Panel titles are updated in updateVisualization, but VS Code doesn't allow runtime title changes
            // The title will be correct on next panel creation or webview reload
          } else {
            // No panels exist, create/show one
            LoggingConfig.log('Extension', 'No panels exist - creating new visualization panel');
            // Determine filename from analyzed files
            let filename: string | undefined;
            if (state.fileStates.size > 0) {
              // Use the first file's name, or workspace name if multiple files
              const firstFile = Array.from(state.fileStates.keys())[0];
              if (state.fileStates.size === 1) {
                filename = firstFile;
              } else {
                // Multiple files - use workspace name
                const wsFolders = vscode.workspace.workspaceFolders;
                filename = wsFolders?.[0]?.name || 'Workspace';
              }
            }
            LoggingConfig.detail('Extension', `Determined filename for new panel: ${filename}`);
            
            // Open/show the visualizer panel with filename
            LoggingConfig.detail('Extension', 'Calling createOrShow() to create new panel');
            await visualizer.createOrShow(context, filename, 'Viz');
            LoggingConfig.detail('Extension', 'createOrShow() completed, now updating visualization');
            // Update it with the analysis results - fresh analysis, not from saved state
            await visualizer.updateVisualization(state, undefined, false);
            LoggingConfig.detail('Extension', 'updateVisualization() completed for new panel');
          }
        }
        if (functionCount === 0) {
          vscode.window.showWarningMessage(
            'Analysis complete but no functions found. Make sure your C++ files contain function definitions.'
          );
        } else {
          vscode.window.showInformationMessage(`Analysis complete! Found ${functionCount} function(s) in ${analysisTimeMs}ms.`);
        }
      } catch (error) {
        LoggingConfig.error('Extension', 'Workspace analysis error', error);
        vscode.window.showErrorMessage(`Analysis failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  });

  /**
   * Register command: Analyze Active File
   * 
   * Analyzes only the currently active C/C++ file and displays results.
   * Validates that a C/C++ file is open before proceeding.
   */
  const analyzeActiveFileCommand = vscode.commands.registerCommand('dataflowAnalyzer.analyzeActiveFile', async () => {
    LoggingConfig.section('Extension', '🎯 MAJOR EVENT: analyzeActiveFile command triggered');
    LoggingConfig.raw('[MAJOR EVENT] User clicked: Analyze Active File');
    if (!analyzer) {
      vscode.window.showErrorMessage('Analyzer not initialized');
      return;
    }
    const active = vscode.window.activeTextEditor;
    if (!active || (active.document.languageId !== 'cpp' && active.document.languageId !== 'c')) {
      vscode.window.showWarningMessage('Open a C/C++ source file to analyze.');
      return;
    }
    const filePath = active.document.uri.fsPath;
    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: "Analyzing active file...",
      cancellable: false
    }, async () => {
      try {
        const state = await analyzer!.analyzeSpecificFiles([filePath]);
        const functionCount = state.cfg.functions.size;
        if (visualizer) {
          // Open/show the visualizer panel with active file name
          await visualizer.createOrShow(context, filePath, 'Viz');
          // Update it with the analysis results
          // Fresh analysis - not from saved state
          await visualizer.updateVisualization(state, undefined, false);
        }
        vscode.window.showInformationMessage(`Analysis complete! Found ${functionCount} function(s) in active file.`);
        LoggingConfig.log('Extension', `Active file analysis complete: ${functionCount} function(s) found`);
      } catch (error) {
        LoggingConfig.error('Extension', 'Active-file analysis error', error);
        vscode.window.showErrorMessage(`Analysis failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  });

  /**
   * Register command: Clear State
   * 
   * Clears all persisted analysis state and reinitializes the analyzer.
   * Useful for resetting analysis when code structure changes significantly.
   */
  const clearStateCommand = vscode.commands.registerCommand('dataflowAnalyzer.clearState', () => {
    LoggingConfig.section('Extension', '🎯 MAJOR EVENT: clearState command triggered');
    LoggingConfig.raw('[MAJOR EVENT] User clicked: Clear State');
    const stateManager = new StateManager(workspacePath);
    stateManager.clearState();
    if (analyzer) {
      analyzer = new DataflowAnalyzer(workspacePath, analysisConfig);
    }
    vscode.window.showInformationMessage('Analysis state cleared.');
  });

  /**
   * Register command: Delete State and Re-Analyze
   * 
   * Completely deletes the saved analysis state and forces a fresh full re-analysis.
   * This is useful when the saved state is corrupted or outdated after code changes.
   */
  const deleteStateAndReAnalyzeCommand = vscode.commands.registerCommand('dataflowAnalyzer.deleteStateAndReAnalyze', async () => {
    LoggingConfig.section('Extension', '🎯 MAJOR EVENT: deleteStateAndReAnalyze command triggered');
    LoggingConfig.raw('[MAJOR EVENT] User clicked: Delete State and Re-Analyze (Fresh Analysis)');
    LoggingConfig.section('Extension', '========== DELETE STATE AND RE-ANALYZE ==========');
    
    // Step 1: Delete the saved state file
    const stateManager = new StateManager(workspacePath);
    stateManager.clearState();
    LoggingConfig.log('Extension', 'Cleared saved state file');
    
    // Step 2: Reinitialize analyzer with fresh state
    analyzer = new DataflowAnalyzer(workspacePath, analysisConfig);
    LoggingConfig.log('Extension', 'Reinitialized analyzer with fresh config');
    LoggingConfig.detail('Extension', `Taint sensitivity: ${analysisConfig.taintSensitivity}`);
    
    // Step 3: Run full workspace analysis
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Dataflow Analyzer',
      cancellable: false
    }, async (progress) => {
      progress.report({ message: 'Deleting state and re-analyzing workspace...' });
      
      try {
        const state = await analyzer!.analyzeWorkspace();
        
        // Update visualizer with new state
        if (visualizer) {
          // Fresh analysis - not from saved state
          await visualizer.updateVisualization(state, undefined, false);
        }
        
        const funcCount = state.cfg.functions.size;
        const vulnCount = state.vulnerabilities.size;
        
        LoggingConfig.log('Extension', `Fresh analysis complete: ${funcCount} functions, ${vulnCount} vulnerabilities`);
        vscode.window.showInformationMessage(
          `Fresh analysis complete: ${funcCount} functions analyzed, ${vulnCount} vulnerabilities found.`
        );
      } catch (error) {
        LoggingConfig.error('Extension', 'Fresh analysis failed', error);
        vscode.window.showErrorMessage(`Fresh analysis failed: ${error}`);
      }
    });
  });

  /**
   * Register command: Change Sensitivity and Analyze
   * 
   * Updates taint sensitivity and immediately triggers re-analysis.
   * This ensures the analyzer uses the new sensitivity level.
   */
  const changeSensitivityAndAnalyzeCommand = vscode.commands.registerCommand('dataflowAnalyzer.changeSensitivityAndAnalyze', async (sensitivity: string) => {
    LoggingConfig.section('Extension', '🎯 MAJOR EVENT: changeSensitivityAndAnalyze command triggered');
    LoggingConfig.raw(`[MAJOR EVENT] User changed: Taint Sensitivity to "${sensitivity}"`);
    LoggingConfig.raw(`[Extension] [INFO] ========== SENSITIVITY CHANGE REQUEST ==========`);
    LoggingConfig.raw(`[Extension] [INFO] changeSensitivityAndAnalyze command called`);
    LoggingConfig.raw(`[Extension] [INFO] Requested sensitivity: ${sensitivity}`);
    LoggingConfig.raw(`[Extension] [INFO] Sensitivity type: ${typeof sensitivity}`);
    LoggingConfig.raw(`[Extension] [INFO] Valid sensitivity values: minimal, conservative, balanced, precise, maximum`);
    
    if (!analyzer) {
      LoggingConfig.error('Extension', 'Analyzer not initialized');
      vscode.window.showErrorMessage('Analyzer not initialized');
      return;
    }
    
    // Validate sensitivity value
    const validSensitivities = ['minimal', 'conservative', 'balanced', 'precise', 'maximum'];
    if (!validSensitivities.includes(sensitivity.toLowerCase())) {
      LoggingConfig.error('Extension', `Invalid sensitivity value: ${sensitivity}`);
      vscode.window.showErrorMessage(`Invalid sensitivity level: ${sensitivity}. Valid values: ${validSensitivities.join(', ')}`);
      return;
    }
    
    const normalizedSensitivity = sensitivity.toLowerCase() as TaintSensitivity;
    LoggingConfig.log('Extension', `Normalized sensitivity: ${normalizedSensitivity}`);
    LoggingConfig.log('Extension', `Changing sensitivity to ${normalizedSensitivity} and re-analyzing...`);
    
    // Set flag to prevent config change handler from overriding
    isUpdatingSensitivityProgrammatically = true;
    LoggingConfig.detail('Extension', 'Set isUpdatingSensitivityProgrammatically = true (prevents config handler override)');
    
    try {
      // Update analyzer config with new sensitivity FIRST
      const currentConfig = analyzer.getConfig();
      const oldSensitivity = currentConfig.taintSensitivity;
      LoggingConfig.detail('Extension', `Current analyzer sensitivity: ${oldSensitivity}`);
      LoggingConfig.detail('Extension', `Target sensitivity: ${normalizedSensitivity}`);
      LoggingConfig.detail('Extension', `Sensitivity change: ${oldSensitivity} -> ${normalizedSensitivity}`);
      
      const newConfig: AnalysisConfig = {
        ...currentConfig,
        taintSensitivity: normalizedSensitivity
      };
      
      LoggingConfig.detail('Extension', `Calling analyzer.updateConfig() with new sensitivity: ${normalizedSensitivity}`);
      analyzer.updateConfig(newConfig);
      
      // Verify the update
      const updatedConfig = analyzer.getConfig();
      LoggingConfig.detail('Extension', 'Analyzer config updated');
      LoggingConfig.detail('Extension', `Updated config sensitivity: ${updatedConfig.taintSensitivity}`);
      LoggingConfig.detail('Extension', `Config update successful: ${updatedConfig.taintSensitivity === normalizedSensitivity}`);
      
      if (updatedConfig.taintSensitivity !== normalizedSensitivity) {
        LoggingConfig.error('Extension', `Config update failed! Expected ${normalizedSensitivity}, got ${updatedConfig.taintSensitivity}`);
        vscode.window.showErrorMessage(`Failed to update sensitivity. Expected ${normalizedSensitivity}, got ${updatedConfig.taintSensitivity}`);
        return;
      }
      
      // Try to update VS Code settings (but don't wait for it or fail if it doesn't work)
      try {
        const config = vscode.workspace.getConfiguration('dataflowAnalyzer');
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        LoggingConfig.detail('Extension', 'Updating VS Code settings...');
        LoggingConfig.detail('Extension', `Workspace folder available: ${!!workspaceFolder}`);
        
        if (workspaceFolder) {
          await config.update('taintSensitivity', normalizedSensitivity, vscode.ConfigurationTarget.Workspace);
          LoggingConfig.log('Extension', `VS Code workspace settings updated to ${normalizedSensitivity}`);
        } else {
          await config.update('taintSensitivity', normalizedSensitivity, vscode.ConfigurationTarget.Global);
          LoggingConfig.log('Extension', `VS Code user settings updated to ${normalizedSensitivity}`);
        }
        
        // Verify settings update
        const settingsValue = config.get<string>('taintSensitivity', 'precise');
        LoggingConfig.detail('Extension', `VS Code settings value after update: ${settingsValue}`);
      } catch (settingsError) {
        LoggingConfig.warn('Extension', `Failed to update VS Code settings: ${settingsError}`);
        LoggingConfig.warn('Extension', 'Continuing anyway - analyzer config is already updated');
        // Continue anyway - analyzer config is already updated
      }
      
      // CRITICAL FIX: Clear old visualization data BEFORE re-analysis
      // This ensures the old data is cleared and new data will be generated with correct sensitivity
      if (analyzer.getState) {
        const currentState = analyzer.getState();
        if (currentState) {
          LoggingConfig.detail('Extension', 'Clearing old visualization data before re-analysis');
          LoggingConfig.detail('Extension', `Old state sensitivity: ${currentState.taintSensitivity || 'unknown'}`);
          LoggingConfig.detail('Extension', `Old visualization data sensitivity: ${(currentState.visualizationData as any)?.taintSensitivity || 'unknown'}`);
          currentState.visualizationData = undefined;
          // Ensure state's taintSensitivity matches the new config
          currentState.taintSensitivity = normalizedSensitivity;
          LoggingConfig.detail('Extension', `Updated state.taintSensitivity to: ${normalizedSensitivity}`);
        }
      }
      
      // Small delay to let settings update propagate
      LoggingConfig.detail('Extension', 'Waiting 100ms for settings to propagate...');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Now trigger re-analysis - use the command directly to ensure it runs
      LoggingConfig.detail('Extension', 'Executing analyzeWorkspace command for re-analysis...');
      LoggingConfig.detail('Extension', `Expected sensitivity in analysis: ${normalizedSensitivity}`);
      await vscode.commands.executeCommand('dataflowAnalyzer.analyzeWorkspace');
      
      // Verify sensitivity after re-analysis
      const finalConfig = analyzer.getConfig();
      const finalState = analyzer.getState();
      LoggingConfig.section('Extension', '========== RE-ANALYSIS COMPLETE ==========');
      LoggingConfig.log('Extension', `Final analyzer config sensitivity: ${finalConfig.taintSensitivity}`);
      LoggingConfig.log('Extension', `Final state sensitivity: ${finalState?.taintSensitivity || 'undefined'}`);
      LoggingConfig.detail('Extension', `Sensitivity match: ${finalConfig.taintSensitivity === normalizedSensitivity}`);
      LoggingConfig.detail('Extension', `State sensitivity match: ${finalState?.taintSensitivity === normalizedSensitivity}`);
      
      if (finalConfig.taintSensitivity !== normalizedSensitivity) {
        LoggingConfig.error('Extension', `Sensitivity mismatch after re-analysis! Expected ${normalizedSensitivity}, got ${finalConfig.taintSensitivity}`);
      }
      
      LoggingConfig.log('Extension', `Re-analysis completed for sensitivity: ${normalizedSensitivity}`);
    } catch (error) {
      LoggingConfig.error('Extension', '========== SENSITIVITY CHANGE FAILED ==========');
      LoggingConfig.error('Extension', 'Failed to trigger re-analysis', error);
      vscode.window.showErrorMessage(`Failed to re-analyze: ${error instanceof Error ? error.message : String(error)}`);
      throw error; // Re-throw so caller knows it failed
    } finally {
      // Reset flag after a delay to allow config change events to settle
      setTimeout(() => {
        isUpdatingSensitivityProgrammatically = false;
        LoggingConfig.detail('Extension', 'Reset isUpdatingSensitivityProgrammatically = false');
      }, 500);
    }
  });
  
  /**
   * Register command: Re-analyze Workspace
   * 
   * Manually triggers re-analysis of the workspace with current settings.
   */
  const reAnalyzeCommand = vscode.commands.registerCommand('dataflowAnalyzer.reAnalyze', async () => {
    LoggingConfig.section('Extension', '🎯 MAJOR EVENT: reAnalyze command triggered');
    LoggingConfig.raw('[MAJOR EVENT] User clicked: Re-Analyze Workspace');
    LoggingConfig.raw(`[Extension] [INFO] reAnalyze command called`);
    
    if (!analyzer) {
      LoggingConfig.error('Extension', 'Analyzer not initialized');
      vscode.window.showErrorMessage('Analyzer not initialized');
      return;
    }
    
    // Check if visualizer has panels before re-analysis
    let panelCount = 0;
    if (visualizer) {
      panelCount = visualizer.getPanelCount?.() || 0;
      LoggingConfig.detail('Extension', `Before re-analysis - panel count: ${panelCount}`);
      if (panelCount > 0) {
        const panelKeys = visualizer.getPanelKeys?.() || [];
        LoggingConfig.detail('Extension', `Existing panel keys: ${panelKeys.join(', ')}`);
      }
    }
    
    const currentConfig = analyzer.getConfig();
    LoggingConfig.detail('Extension', `Current sensitivity: ${currentConfig.taintSensitivity}`);
    LoggingConfig.log('Extension', 'Manual re-analysis triggered with current settings');
    
    // Ensure sensitivity is preserved - don't let config change handler reset it
    // Get current sensitivity from analyzer (which may differ from settings)
    const currentSensitivity = currentConfig.taintSensitivity;
    LoggingConfig.detail('Extension', `Preserving current sensitivity: ${currentSensitivity}`);
    
    try {
      LoggingConfig.detail('Extension', 'Executing analyzeWorkspace command for re-analysis...');
      await vscode.commands.executeCommand('dataflowAnalyzer.analyzeWorkspace');
      LoggingConfig.log('Extension', 'Re-analysis completed');
      
      // Verify sensitivity wasn't reset
      const configAfter = analyzer.getConfig();
      if (configAfter.taintSensitivity !== currentSensitivity) {
        LoggingConfig.warn('Extension', `Sensitivity changed during re-analysis: ${currentSensitivity} -> ${configAfter.taintSensitivity}`);
        // Restore the original sensitivity
        analyzer.updateConfig({
          ...configAfter,
          taintSensitivity: currentSensitivity
        });
        LoggingConfig.log('Extension', `Restored sensitivity to: ${currentSensitivity}`);
      } else {
        LoggingConfig.detail('Extension', `Sensitivity preserved: ${currentSensitivity}`);
      }
      
      // Check panel count after re-analysis
      if (visualizer) {
        const panelCountAfter = visualizer.getPanelCount?.() || 0;
        LoggingConfig.detail('Extension', `After re-analysis - panel count: ${panelCountAfter}`);
        if (panelCountAfter !== panelCount) {
          LoggingConfig.warn('Extension', `Panel count changed from ${panelCount} to ${panelCountAfter} - new panel may have been created`);
        } else {
          LoggingConfig.log('Extension', `Panel count unchanged (${panelCount}) - existing panels updated`);
        }
      }
    } catch (error) {
      LoggingConfig.error('Extension', 'Failed to trigger re-analysis', error);
      vscode.window.showErrorMessage(`Failed to re-analyze: ${error instanceof Error ? error.message : String(error)}`);
      throw error; // Re-throw so caller knows it failed
    }
  });

  /**
   * Register command: Save State
   * 
   * Saves the current analysis state with a timestamp and updates the save states list.
   */
  const saveStateCommand = vscode.commands.registerCommand('dataflowAnalyzer.saveState', async () => {
    LoggingConfig.section('Extension', '🎯 MAJOR EVENT: saveState command triggered');
    LoggingConfig.raw('[MAJOR EVENT] User clicked: Save State');
    if (!analyzer) {
      vscode.window.showErrorMessage('Analyzer not initialized');
      return;
    }
    
    const state = analyzer.getState();
    if (!state) {
      vscode.window.showWarningMessage('No analysis state to save');
      return;
    }
    
    try {
      const stateManager = new StateManager(workspacePath);
      const timestamp = new Date().toISOString();
      const fileName = Array.from(state.fileStates.keys())[0]?.split(/[/\\]/).pop() || 'workspace';
      
      // Save the state
      stateManager.saveState(state);
      
      // Update save states list
      await updateSaveStatesList(workspacePath, {
        timestamp,
        fileName,
        functionCount: state.cfg.functions.size,
        sensitivity: state.taintSensitivity || 'precise',
        fileCount: state.fileStates.size
      });
      
      vscode.window.showInformationMessage(`Analysis state saved (${timestamp})`);
      LoggingConfig.log('Extension', `State saved at ${timestamp}`);
    } catch (error) {
      LoggingConfig.error('Extension', 'Error saving state', error);
      vscode.window.showErrorMessage(`Failed to save state: ${error instanceof Error ? error.message : String(error)}`);
    }
    });

    context.subscriptions.push(showCFGCommand, analyzeWorkspaceCommand, analyzeActiveFileCommand, clearStateCommand, deleteStateAndReAnalyzeCommand, changeSensitivityAndAnalyzeCommand, saveStateCommand, reAnalyzeCommand);
    
    // CRITICAL DEBUG: Verify command registration
    LoggingConfig.section('Extension', '=== COMMAND REGISTRATION COMPLETE ===');
    LoggingConfig.detail('Extension', `Subscriptions count: ${context.subscriptions.length}`);
    LoggingConfig.detail('Extension', `Analyzer: ${analyzer ? 'initialized' : 'NULL'}`);
    LoggingConfig.detail('Extension', `Visualizer: ${visualizer ? 'initialized' : 'NULL'}`);
    
    // Verify commands are registered (use setTimeout to allow VS Code to register commands)
    setTimeout(() => {
      vscode.commands.getCommands().then(commands => {
        const ourCommands = commands.filter(c => c.startsWith('dataflowAnalyzer.'));
        LoggingConfig.section('Extension', '=== REGISTERED COMMANDS ===');
        LoggingConfig.detail('Extension', `Found ${ourCommands.length} commands: ${ourCommands.join(', ')}`);
        if (ourCommands.length !== 8) {
          LoggingConfig.warn('Extension', `Expected 8 commands, found ${ourCommands.length}`);
          vscode.window.showWarningMessage(`Expected 8 commands, found ${ourCommands.length}. Check Developer Console.`);
        } else {
          LoggingConfig.log('Extension', 'All 8 commands registered successfully');
          vscode.window.showInformationMessage('✅ Extension activated! 8 commands registered.');
        }
      }, (err: any) => {
        LoggingConfig.error('Extension', 'Error checking commands', err);
      });
    }, 100);

    // Set up file change listeners
    setupFileWatchers(context, analysisConfig);

    // Watch for configuration changes
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('dataflowAnalyzer')) {
      // Skip sensitivity updates if we're programmatically updating it
      // This prevents the config change handler from resetting sensitivity to PRECISE
      const isSensitivityChange = e.affectsConfiguration('dataflowAnalyzer.taintSensitivity');
      if (isSensitivityChange && isUpdatingSensitivityProgrammatically) {
        LoggingConfig.detail('Extension', 'Ignoring sensitivity config change (programmatic update in progress)');
        return;
      }
      
      const config = vscode.workspace.getConfiguration('dataflowAnalyzer');
      
      // If sensitivity is being changed, use the analyzer's current sensitivity if available
      // This prevents resetting to PRECISE when settings haven't updated yet
      let taintSensitivity: TaintSensitivity;
      if (isSensitivityChange && analyzer) {
        const currentConfig = analyzer.getConfig();
        const settingsSensitivity = config.get<string>('taintSensitivity', 'precise');
        // Use analyzer's current sensitivity if it differs from settings (programmatic update)
        if (currentConfig.taintSensitivity && currentConfig.taintSensitivity !== settingsSensitivity) {
          LoggingConfig.detail('Extension', `Using analyzer's current sensitivity (${currentConfig.taintSensitivity}) instead of settings (${settingsSensitivity})`);
          taintSensitivity = currentConfig.taintSensitivity;
        } else {
          taintSensitivity = (settingsSensitivity as TaintSensitivity) || TaintSensitivity.PRECISE;
        }
      } else {
        const taintSensitivityStr = config.get<string>('taintSensitivity', 'precise');
        taintSensitivity = (taintSensitivityStr as TaintSensitivity) || TaintSensitivity.PRECISE;
      }
      
      const newConfig: AnalysisConfig = {
        updateMode: config.get('updateMode', 'save'),
        enableLiveness: config.get('enableLiveness', true),
        enableReachingDefinitions: config.get('enableReachingDefinitions', true),
        enableTaintAnalysis: config.get('enableTaintAnalysis', true),
        debounceDelay: config.get('debounceDelay', 500),
        enableInterProcedural: config.get('enableInterProcedural', true),
        taintSensitivity: taintSensitivity
      };
      
      LoggingConfig.detail('Extension', 'Configuration changed, updating analyzer config');
      LoggingConfig.detail('Extension', `New sensitivity: ${taintSensitivity}`);
      
      if (analyzer) {
        analyzer.updateConfig(newConfig);
      }
      
        // Re-setup watchers if update mode changed
        if (e.affectsConfiguration('dataflowAnalyzer.updateMode')) {
          setupFileWatchers(context, newConfig);
        }
      }
    });

    // Initial analysis prompt
    vscode.window.showInformationMessage(
      'Dataflow Analyzer is ready. Run "Analyze Workspace" to start.',
      'Analyze Workspace'
    ).then(selection => {
      if (selection === 'Analyze Workspace') {
        vscode.commands.executeCommand('dataflowAnalyzer.analyzeWorkspace');
      }
    });
  } catch (error) {
    // CRITICAL: Catch any errors during activation to prevent silent failure
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('[Extension] CRITICAL: Activation failed:', errorMessage);
    if (errorStack) {
      console.error('[Extension] Stack trace:', errorStack);
    }
    
    // Try to log to file if logging is initialized
    try {
      LoggingConfig.error('Extension', `CRITICAL: Activation failed: ${errorMessage}`);
      if (errorStack) {
        LoggingConfig.raw(`[Extension] Stack trace: ${errorStack}`);
      }
    } catch (logError) {
      // If logging fails, at least show error to user
      console.error('[Extension] Failed to log activation error:', logError);
    }
    
    // Show error to user
    vscode.window.showErrorMessage(
      `Dataflow Analyzer failed to activate: ${errorMessage}. ` +
      `Please check the Developer Console (Help > Toggle Developer Tools) for details.`
    );
    
    // Re-throw to let VS Code know activation failed
    throw error;
  }
}

/**
 * Setup file watchers for incremental analysis updates
 * 
 * Configures file change listeners based on the update mode:
 * - 'save': Updates analysis when files are saved
 * - 'keystroke': Updates analysis on text changes (with debouncing)
 * 
 * @param context - VS Code extension context for subscription management
 * @param config - Analysis configuration containing update mode and debounce delay
 */
function setupFileWatchers(context: vscode.ExtensionContext, config: AnalysisConfig) {
  // Remove existing watchers (if any)
  context.subscriptions.forEach(sub => {
    if (sub && typeof sub.dispose === 'function') {
      // Keep command subscriptions, only remove file watchers if needed
    }
  });

  if (config.updateMode === 'save') {
    // Watch for file saves - triggers analysis when user saves a C/C++ file
    const saveWatcher = vscode.workspace.onDidSaveTextDocument(async (document) => {
      if (document.languageId === 'cpp' || document.languageId === 'c') {
        if (analyzer) {
          try {
            await analyzer.updateFile(document.fileName);
            const state = analyzer.getState();
            if (state && visualizer) {
              // Update visualization for the saved file's panel
              await visualizer.updateVisualizationForFile(document.fileName, state, 'Viz');
            }
          } catch (error) {
            LoggingConfig.error('Extension', `Error updating file: ${document.fileName}`, error);
          }
        }
      }
    });
    context.subscriptions.push(saveWatcher);
  } else if (config.updateMode === 'keystroke') {
    // Watch for text changes with debouncing - updates analysis as user types
    // Debouncing prevents excessive analysis runs during rapid typing
    const changeWatcher = vscode.workspace.onDidChangeTextDocument(async (event) => {
      const document = event.document;
      if (document.languageId === 'cpp' || document.languageId === 'c') {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        
        debounceTimer = setTimeout(async () => {
          if (analyzer) {
            try {
              await analyzer.updateFile(document.fileName);
              const state = analyzer.getState();
              if (state && visualizer) {
                // Update visualization for the changed file's panel
                await visualizer.updateVisualizationForFile(document.fileName, state, 'Viz');
              }
            } catch (error) {
              LoggingConfig.error('Extension', `Error updating file: ${document.fileName}`, error);
            }
          }
        }, config.debounceDelay);
      }
    });
    context.subscriptions.push(changeWatcher);
  }
}

/**
 * Update save states list file
 * 
 * Maintains a JSON file listing all saved states with metadata for developer use.
 */
async function updateSaveStatesList(workspacePath: string, stateInfo: {
  timestamp: string;
  fileName: string;
  functionCount: number;
  sensitivity: string;
  fileCount: number;
}): Promise<void> {
  const saveStatesListPath = path.join(workspacePath, '.vscode', 'save-states-list.json');
  
  let saveStatesList: Array<typeof stateInfo> = [];
  
  // Load existing list if it exists
  if (fs.existsSync(saveStatesListPath)) {
    try {
      const data = fs.readFileSync(saveStatesListPath, 'utf-8');
      saveStatesList = JSON.parse(data);
    } catch (error) {
      LoggingConfig.warn('Extension', 'Error reading save states list', error);
      saveStatesList = [];
    }
  }
  
  // Add new state entry
  saveStatesList.push(stateInfo);
  
  // Keep only last 50 entries to prevent file from growing too large
  if (saveStatesList.length > 50) {
    saveStatesList = saveStatesList.slice(-50);
  }
  
  // Ensure directory exists
  const dir = path.dirname(saveStatesListPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Write updated list
  fs.writeFileSync(saveStatesListPath, JSON.stringify(saveStatesList, null, 2), 'utf-8');
  LoggingConfig.log('Extension', `Updated save states list with ${saveStatesList.length} entries`);
}

/**
 * Extension deactivation function
 * 
 * Called by VS Code when the extension is deactivated (including when EDH window closes).
 * Cleans up resources:
 * - Clears debounce timer
 * - Disposes visualizer and its webview panels
 * - Flushes all pending log writes and clears logs.txt file
 * 
 * CRITICAL: This function ensures logs.txt is completely cleared when the EDH window exits.
 */
export async function deactivate() {
  // Clear debounce timer to prevent memory leaks
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  // Dispose visualizer and all webview panels
  if (visualizer) {
    visualizer.dispose();
  }
  
  // Log deactivation before closing file logging
  // Note: These logs will be written to file, then the file will be cleared
  LoggingConfig.section('Extension', '🛑 MAJOR EVENT: Extension Deactivation');
  LoggingConfig.raw('[MAJOR EVENT] Extension: Dataflow Analyzer is deactivating');
  LoggingConfig.raw('[MAJOR EVENT] EDH window closing - logs.txt will be cleared');
  
  // CRITICAL: Close file logging and clear logs.txt completely on EDH window close
  // This ensures a fresh log file for the next session
  await LoggingConfig.closeFileLogging(true);
  
  // Note: LoggingConfig is now closed, so console.log will not be intercepted
  // This final message goes to VS Code's Developer Console only
  console.log('[Extension] Deactivated - logs.txt cleared and ready for next session');
}

