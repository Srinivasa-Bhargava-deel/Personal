/**
 * Extension entry point
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { DataflowAnalyzer } from './analyzer/DataflowAnalyzer';
import { CFGVisualizer } from './visualizer/CFGVisualizer';
import { AnalysisConfig } from './types';
import { StateManager } from './state/StateManager';

let analyzer: DataflowAnalyzer | null = null;
let visualizer: CFGVisualizer | null = null;
let debounceTimer: NodeJS.Timeout | null = null;

export function activate(context: vscode.ExtensionContext) {
  console.log('Dataflow Analyzer extension is now active');

  const workspaceFolders = vscode.workspace.workspaceFolders;
  let workspacePath: string;
  
  if (!workspaceFolders || workspaceFolders.length === 0) {
    // Try to get workspace from active editor
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
    workspacePath = workspaceFolders[0].uri.fsPath;
  }
  
  // Initialize visualizer
  visualizer = new CFGVisualizer();

  // Load configuration
  const config = vscode.workspace.getConfiguration('dataflowAnalyzer');
  const analysisConfig: AnalysisConfig = {
    updateMode: config.get('updateMode', 'save'),
    enableLiveness: config.get('enableLiveness', true),
    enableReachingDefinitions: config.get('enableReachingDefinitions', true),
    enableTaintAnalysis: config.get('enableTaintAnalysis', true),
    debounceDelay: config.get('debounceDelay', 500)
  };

  // Initialize analyzer
  analyzer = new DataflowAnalyzer(workspacePath, analysisConfig);

  // Register commands
  const showCFGCommand = vscode.commands.registerCommand('dataflowAnalyzer.showCFG', async () => {
    if (visualizer) {
      await visualizer.createOrShow(context);
      const state = analyzer?.getState();
      if (state) {
        await visualizer.updateVisualization(state);
      }
    }
  });

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
          // Open/show the visualizer panel
          await visualizer.createOrShow(context);
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
          // Open/show the visualizer panel
          await visualizer.createOrShow(context);
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
        debounceDelay: config.get('debounceDelay', 500)
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

function setupFileWatchers(context: vscode.ExtensionContext, config: AnalysisConfig) {
  // Remove existing watchers
  context.subscriptions.forEach(sub => {
    if (sub && typeof sub.dispose === 'function') {
      // Keep command subscriptions, only remove file watchers if needed
    }
  });

  if (config.updateMode === 'save') {
    // Watch for file saves
    const saveWatcher = vscode.workspace.onDidSaveTextDocument(async (document) => {
      if (document.languageId === 'cpp' || document.languageId === 'c') {
        if (analyzer) {
          try {
            await analyzer.updateFile(document.fileName);
            const state = analyzer.getState();
            if (state && visualizer) {
              await visualizer.updateVisualization(state);
            }
          } catch (error) {
            console.error('Error updating file:', error);
          }
        }
      }
    });
    context.subscriptions.push(saveWatcher);
  } else if (config.updateMode === 'keystroke') {
    // Watch for text changes with debouncing
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
                await visualizer.updateVisualization(state);
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

export function deactivate() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  if (visualizer) {
    visualizer.dispose();
  }
}

