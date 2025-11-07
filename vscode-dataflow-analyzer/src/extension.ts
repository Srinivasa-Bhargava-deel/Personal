/**
 * Extension entry point
 */

import * as vscode from 'vscode';
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
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showWarningMessage('No workspace folder open. Please open a workspace to use the Dataflow Analyzer.');
    return;
  }

  const workspacePath = workspaceFolders[0].uri.fsPath;
  
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
  const showCFGCommand = vscode.commands.registerCommand('dataflowAnalyzer.showCFG', () => {
    if (visualizer) {
      visualizer.createOrShow(context);
      const state = analyzer?.getState();
      if (state) {
        visualizer.updateVisualization(state);
      }
    }
  });

  const analyzeWorkspaceCommand = vscode.commands.registerCommand('dataflowAnalyzer.analyzeWorkspace', async () => {
    if (!analyzer) return;
    
    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: "Analyzing workspace...",
      cancellable: false
    }, async (progress) => {
      try {
        progress.report({ increment: 0, message: "Parsing C++ files..." });
        if (!analyzer) {
          vscode.window.showErrorMessage('Analyzer not initialized');
          return;
        }
        const state = await analyzer.analyzeWorkspace();
        
        progress.report({ increment: 50, message: "Building CFG..." });
        
        progress.report({ increment: 100, message: "Complete!" });
        
        if (visualizer) {
          visualizer.updateVisualization(state);
        }
        
        vscode.window.showInformationMessage(`Analysis complete! Found ${state.cfg.functions.size} functions.`);
      } catch (error) {
        vscode.window.showErrorMessage(`Analysis failed: ${error}`);
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

  context.subscriptions.push(showCFGCommand, analyzeWorkspaceCommand, clearStateCommand);

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
              visualizer.updateVisualization(state);
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
                visualizer.updateVisualization(state);
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

