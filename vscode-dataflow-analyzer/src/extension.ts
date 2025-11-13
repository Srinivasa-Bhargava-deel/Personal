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
 * - Command registration (Show CFG, Analyze Workspace, Analyze Active File, Clear State)
 * - Configuration management
 * - File watcher setup for incremental updates
 * - Error handling and user notifications
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { DataflowAnalyzer } from './analyzer/DataflowAnalyzer';
import { CFGVisualizer } from './visualizer/CFGVisualizer';
import { AnalysisConfig } from './types';
import { StateManager } from './state/StateManager';

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
export function activate(context: vscode.ExtensionContext) {
  console.log('Dataflow Analyzer extension is now active');

  // Determine workspace path from VS Code workspace folders or active editor
  const workspaceFolders = vscode.workspace.workspaceFolders;
  let workspacePath: string;
  
  if (!workspaceFolders || workspaceFolders.length === 0) {
    // Fallback: Try to get workspace from active editor
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && activeEditor.document.uri.fsPath) {
      const filePath = activeEditor.document.uri.fsPath;
      // Use parent directory as workspace
      workspacePath = path.dirname(filePath);
      console.log('Using file directory as workspace:', workspacePath);
    } else {
      vscode.window.showWarningMessage('No workspace folder open. Please open a workspace or file to use the Dataflow Analyzer.');
      return;
    }
  } else {
    // Use first workspace folder
    workspacePath = workspaceFolders[0].uri.fsPath;
  }
  
  // Initialize visualizer component
  visualizer = new CFGVisualizer();

  // Load extension configuration from VS Code settings
  const config = vscode.workspace.getConfiguration('dataflowAnalyzer');
  const analysisConfig: AnalysisConfig = {
    updateMode: config.get('updateMode', 'save'),  // 'save' or 'keystroke'
    enableLiveness: config.get('enableLiveness', true),
    enableReachingDefinitions: config.get('enableReachingDefinitions', true),
    enableTaintAnalysis: config.get('enableTaintAnalysis', true),
    debounceDelay: config.get('debounceDelay', 500),  // Milliseconds for keystroke debouncing
    enableInterProcedural: config.get('enableInterProcedural', true)
  };

  // Initialize main analyzer with workspace path and configuration
  analyzer = new DataflowAnalyzer(workspacePath, analysisConfig);

  // Register VS Code commands
  const showCFGCommand = vscode.commands.registerCommand('dataflowAnalyzer.showCFG', async () => {
    if (visualizer) {
      const active = vscode.window.activeTextEditor;
      const filename = active?.document.fileName || undefined;
      // Create/show CFG visualization panel
      await visualizer.createOrShow(context, filename, 'Viz/Cfg');
      const state = analyzer?.getState();
      if (state) {
        await visualizer.updateVisualization(state);
      }
    }
  });

  /**
   * Register command: Analyze Workspace
   * 
   * Analyzes all C++ files in the workspace and displays results in the visualizer.
   * Shows progress notification and handles errors gracefully.
   */
  const analyzeWorkspaceCommand = vscode.commands.registerCommand('dataflowAnalyzer.analyzeWorkspace', async () => {
    if (!analyzer) {
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
        console.log('Starting workspace analysis...');
        if (!analyzer) {
          vscode.window.showErrorMessage('Analyzer not initialized');
          return;
        }
        const state = await analyzer.analyzeWorkspace();
        
        console.log(`Analysis complete. Found ${state.cfg.functions.size} functions:`, 
          Array.from(state.cfg.functions.keys()));
        
        progress.report({ increment: 50, message: "Building CFG..." });
        
        progress.report({ increment: 100, message: "Complete!" });
        
        const functionCount = state.cfg.functions.size;
        
        if (visualizer) {
          // Determine filename from analyzed files
          let filename: string | undefined;
          if (state.fileStates.size > 0) {
            // Use the first file's name, or workspace name if multiple files
            const firstFile = Array.from(state.fileStates.keys())[0];
            if (state.fileStates.size === 1) {
              filename = firstFile;
            } else {
              // Multiple files - use workspace name
              filename = workspaceFolders?.[0]?.name || 'Workspace';
            }
          }
          
          // Open/show the visualizer panel with filename
          await visualizer.createOrShow(context, filename, 'Viz');
          // Update it with the analysis results
          await visualizer.updateVisualization(state);
        }
        if (functionCount === 0) {
          vscode.window.showWarningMessage(
            'Analysis complete but no functions found. Make sure your C++ files contain function definitions.'
          );
        } else {
          vscode.window.showInformationMessage(`Analysis complete! Found ${functionCount} function(s).`);
        }
      } catch (error) {
        console.error('Analysis error:', error);
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
          await visualizer.updateVisualization(state);
        }
        vscode.window.showInformationMessage(`Analysis complete! Found ${functionCount} function(s) in active file.`);
      } catch (error) {
        console.error('Active-file analysis error:', error);
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
    const stateManager = new StateManager(workspacePath);
    stateManager.clearState();
    if (analyzer) {
      analyzer = new DataflowAnalyzer(workspacePath, analysisConfig);
    }
    vscode.window.showInformationMessage('Analysis state cleared.');
  });

  context.subscriptions.push(showCFGCommand, analyzeWorkspaceCommand, analyzeActiveFileCommand, clearStateCommand);

  // Set up file change listeners
  setupFileWatchers(context, analysisConfig);

  // Watch for configuration changes
  vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('dataflowAnalyzer')) {
      const config = vscode.workspace.getConfiguration('dataflowAnalyzer');
      const newConfig: AnalysisConfig = {
        updateMode: config.get('updateMode', 'save'),
        enableLiveness: config.get('enableLiveness', true),
        enableReachingDefinitions: config.get('enableReachingDefinitions', true),
        enableTaintAnalysis: config.get('enableTaintAnalysis', true),
        debounceDelay: config.get('debounceDelay', 500),
        enableInterProcedural: config.get('enableInterProcedural', true)
      };
      
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
            console.error('Error updating file:', error);
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
              console.error('Error updating file:', error);
            }
          }
        }, config.debounceDelay);
      }
    });
    context.subscriptions.push(changeWatcher);
  }
}

/**
 * Extension deactivation function
 * 
 * Called by VS Code when the extension is deactivated. Cleans up resources:
 * - Clears debounce timer
 * - Disposes visualizer and its webview panels
 */
export function deactivate() {
  // Clear debounce timer to prevent memory leaks
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  // Dispose visualizer and all webview panels
  if (visualizer) {
    visualizer.dispose();
  }
}

