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
  console.log('Dataflow Analyzer extension is now active');

  // Determine workspace path from VS Code workspace folders or active editor
  const workspaceFolders = vscode.workspace.workspaceFolders;
  let workspacePath: string;
  
  if (!workspaceFolders || workspaceFolders.length === 0) {
    // Fallback: Try to get workspace from active editor
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && activeEditor.document.uri.fsPath) {
      const filePath = activeEditor.document.uri.fsPath;
      // Walk up directory tree to find project root (contains package.json, tsconfig.json, etc.)
      let currentDir = path.dirname(filePath);
      let foundRoot = false;
      const maxDepth = 10; // Prevent infinite loops
      let depth = 0;
      
      // Initialize workspacePath as fallback
      workspacePath = currentDir;
      
      while (depth < maxDepth && !foundRoot) {
        // Check for project root indicators
        const hasPackageJson = fs.existsSync(path.join(currentDir, 'package.json'));
        const hasTsConfig = fs.existsSync(path.join(currentDir, 'tsconfig.json'));
        const hasGit = fs.existsSync(path.join(currentDir, '.git'));
        const hasSrc = fs.existsSync(path.join(currentDir, 'src'));
        
        if (hasPackageJson || hasTsConfig || (hasGit && hasSrc)) {
          foundRoot = true;
          workspacePath = currentDir;
          console.log('Found project root:', workspacePath);
          break;
        }
        
        const parentDir = path.dirname(currentDir);
        // Stop if we've reached filesystem root
        if (parentDir === currentDir) {
          break;
        }
        currentDir = parentDir;
        depth++;
      }
      
      if (!foundRoot) {
        // Fallback: Use parent directory of file
        console.log('Using file directory as workspace (project root not found):', workspacePath);
      }
    } else {
      vscode.window.showWarningMessage('No workspace folder open. Please open a workspace or file to use the Dataflow Analyzer.');
      return;
    }
  } else {
    // Use first workspace folder
    workspacePath = workspaceFolders[0].uri.fsPath;
  }
  
  // Initialize visualizer component
  let visualizer = new CFGVisualizer();

  // Load extension configuration from VS Code settings
  const config = vscode.workspace.getConfiguration('dataflowAnalyzer');
  const taintSensitivityStr = config.get<string>('taintSensitivity', 'precise');
  const taintSensitivity = taintSensitivityStr as TaintSensitivity || TaintSensitivity.PRECISE;
  
  console.log(`[Extension] Configuration loaded: Taint Sensitivity = ${taintSensitivity}`);
  
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
  let analyzer = new DataflowAnalyzer(workspacePath, analysisConfig);
  const analyzerInitTimeMs = Date.now() - analyzerInitStartTime;
  
  // Check if state was loaded and notify user
  setTimeout(() => {
    const state = analyzer?.getState();
    if (state && state.cfg.functions.size > 0 && (state as any).loadTimeMs !== undefined) {
      // State was loaded (has functions and load time)
      const fileName = Array.from(state.fileStates.keys())[0]?.split(/[/\\]/).pop() || 'workspace';
      const loadTimeMs = (state as any).loadTimeMs;
      vscode.window.showInformationMessage(`Loaded saved analysis state for ${fileName} (${loadTimeMs}ms)`);
      console.log(`[Extension] Analyzer initialized in ${analyzerInitTimeMs}ms, state loaded in ${loadTimeMs}ms`);
    } else {
      console.log(`[Extension] Analyzer initialized in ${analyzerInitTimeMs}ms (no saved state)`);
    }
  }, 100);

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
        const analysisStartTime = Date.now();
        const state = await analyzer.analyzeWorkspace();
        const analysisTimeMs = Date.now() - analysisStartTime;
        
        console.log(`Analysis complete. Found ${state.cfg.functions.size} functions:`, 
          Array.from(state.cfg.functions.keys()));
        console.log(`[Extension] Total analysis time: ${analysisTimeMs}ms`);
        
        progress.report({ increment: 50, message: "Building CFG..." });
        
        progress.report({ increment: 100, message: "Complete!" });
        
        const functionCount = state.cfg.functions.size;
        
        if (visualizer) {
          // Check if any panels already exist - if so, update them instead of creating new ones
          console.log('[Extension] [DEBUG] Checking for existing panels before updating visualization...');
          const hasExistingPanels = visualizer.hasPanels();
          console.log('[Extension] [DEBUG] hasPanels() returned:', hasExistingPanels);
          console.log('[Extension] [DEBUG] Panel count:', visualizer.getPanelCount?.() || 'method not available');
          
          if (hasExistingPanels) {
            // Update existing panels with new analysis results
            console.log('[Extension] [INFO] Panels exist - updating existing visualization panels with re-analysis results');
            console.log('[Extension] [DEBUG] Current sensitivity:', state.taintSensitivity || 'precise');
            console.log('[Extension] [DEBUG] Calling updateVisualization() to update existing panels');
            await visualizer.updateVisualization(state);
            console.log('[Extension] [DEBUG] updateVisualization() completed');
            
            // Update panel titles to reflect current sensitivity
            const sensitivity = state.taintSensitivity || 'precise';
            const panelKeys = visualizer.getPanelKeys?.() || [];
            console.log(`[Extension] [DEBUG] Updating ${panelKeys.length} panel title(s) to include sensitivity: ${sensitivity}`);
            // Note: Panel titles are updated in updateVisualization, but VS Code doesn't allow runtime title changes
            // The title will be correct on next panel creation or webview reload
          } else {
            // No panels exist, create/show one
            console.log('[Extension] [INFO] No panels exist - creating new visualization panel');
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
            console.log('[Extension] [DEBUG] Determined filename for new panel:', filename);
            
            // Open/show the visualizer panel with filename
            console.log('[Extension] [DEBUG] Calling createOrShow() to create new panel');
            await visualizer.createOrShow(context, filename, 'Viz');
            console.log('[Extension] [DEBUG] createOrShow() completed, now updating visualization');
            // Update it with the analysis results
            await visualizer.updateVisualization(state);
            console.log('[Extension] [DEBUG] updateVisualization() completed for new panel');
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

  /**
   * Register command: Change Sensitivity and Analyze
   * 
   * Updates taint sensitivity and immediately triggers re-analysis.
   * This ensures the analyzer uses the new sensitivity level.
   */
  const changeSensitivityAndAnalyzeCommand = vscode.commands.registerCommand('dataflowAnalyzer.changeSensitivityAndAnalyze', async (sensitivity: string) => {
    console.log(`[Extension] [INFO] ========== SENSITIVITY CHANGE REQUEST ==========`);
    console.log(`[Extension] [INFO] changeSensitivityAndAnalyze command called`);
    console.log(`[Extension] [INFO] Requested sensitivity: ${sensitivity}`);
    console.log(`[Extension] [INFO] Sensitivity type: ${typeof sensitivity}`);
    console.log(`[Extension] [INFO] Valid sensitivity values: minimal, conservative, balanced, precise, maximum`);
    
    if (!analyzer) {
      console.error(`[Extension] [ERROR] Analyzer not initialized`);
      vscode.window.showErrorMessage('Analyzer not initialized');
      return;
    }
    
    // Validate sensitivity value
    const validSensitivities = ['minimal', 'conservative', 'balanced', 'precise', 'maximum'];
    if (!validSensitivities.includes(sensitivity.toLowerCase())) {
      console.error(`[Extension] [ERROR] Invalid sensitivity value: ${sensitivity}`);
      vscode.window.showErrorMessage(`Invalid sensitivity level: ${sensitivity}. Valid values: ${validSensitivities.join(', ')}`);
      return;
    }
    
    const normalizedSensitivity = sensitivity.toLowerCase() as TaintSensitivity;
    console.log(`[Extension] [INFO] Normalized sensitivity: ${normalizedSensitivity}`);
    console.log(`[Extension] [INFO] Changing sensitivity to ${normalizedSensitivity} and re-analyzing...`);
    
    // Set flag to prevent config change handler from overriding
    isUpdatingSensitivityProgrammatically = true;
    console.log(`[Extension] [DEBUG] Set isUpdatingSensitivityProgrammatically = true`);
    
    try {
      // Update analyzer config with new sensitivity FIRST
      const currentConfig = analyzer.getConfig();
      const oldSensitivity = currentConfig.taintSensitivity;
      console.log(`[Extension] [DEBUG] Current analyzer sensitivity: ${oldSensitivity}`);
      console.log(`[Extension] [DEBUG] Target sensitivity: ${normalizedSensitivity}`);
      console.log(`[Extension] [DEBUG] Sensitivity change: ${oldSensitivity} -> ${normalizedSensitivity}`);
      
      const newConfig: AnalysisConfig = {
        ...currentConfig,
        taintSensitivity: normalizedSensitivity
      };
      
      console.log(`[Extension] [DEBUG] Calling analyzer.updateConfig() with new sensitivity: ${normalizedSensitivity}`);
      analyzer.updateConfig(newConfig);
      
      // Verify the update
      const updatedConfig = analyzer.getConfig();
      console.log(`[Extension] [DEBUG] Analyzer config updated`);
      console.log(`[Extension] [DEBUG] Updated config sensitivity: ${updatedConfig.taintSensitivity}`);
      console.log(`[Extension] [DEBUG] Config update successful: ${updatedConfig.taintSensitivity === normalizedSensitivity}`);
      
      if (updatedConfig.taintSensitivity !== normalizedSensitivity) {
        console.error(`[Extension] [ERROR] Config update failed! Expected ${normalizedSensitivity}, got ${updatedConfig.taintSensitivity}`);
        vscode.window.showErrorMessage(`Failed to update sensitivity. Expected ${normalizedSensitivity}, got ${updatedConfig.taintSensitivity}`);
        return;
      }
      
      // Try to update VS Code settings (but don't wait for it or fail if it doesn't work)
      try {
        const config = vscode.workspace.getConfiguration('dataflowAnalyzer');
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        console.log(`[Extension] [DEBUG] Updating VS Code settings...`);
        console.log(`[Extension] [DEBUG] Workspace folder available: ${!!workspaceFolder}`);
        
        if (workspaceFolder) {
          await config.update('taintSensitivity', normalizedSensitivity, vscode.ConfigurationTarget.Workspace);
          console.log(`[Extension] [DEBUG] VS Code workspace settings updated to ${normalizedSensitivity}`);
        } else {
          await config.update('taintSensitivity', normalizedSensitivity, vscode.ConfigurationTarget.Global);
          console.log(`[Extension] [DEBUG] VS Code user settings updated to ${normalizedSensitivity}`);
        }
        
        // Verify settings update
        const settingsValue = config.get<string>('taintSensitivity', 'precise');
        console.log(`[Extension] [DEBUG] VS Code settings value after update: ${settingsValue}`);
      } catch (settingsError) {
        console.log(`[Extension] [WARN] Failed to update VS Code settings: ${settingsError}`);
        console.log(`[Extension] [WARN] Continuing anyway - analyzer config is already updated`);
        // Continue anyway - analyzer config is already updated
      }
      
      // CRITICAL FIX: Clear old visualization data BEFORE re-analysis
      // This ensures the old data is cleared and new data will be generated with correct sensitivity
      if (analyzer.getState) {
        const currentState = analyzer.getState();
        if (currentState) {
          console.log(`[Extension] [DEBUG] Clearing old visualization data before re-analysis`);
          console.log(`[Extension] [DEBUG] Old state sensitivity: ${currentState.taintSensitivity || 'unknown'}`);
          console.log(`[Extension] [DEBUG] Old visualization data sensitivity: ${(currentState.visualizationData as any)?.taintSensitivity || 'unknown'}`);
          currentState.visualizationData = undefined;
          // Ensure state's taintSensitivity matches the new config
          currentState.taintSensitivity = normalizedSensitivity;
          console.log(`[Extension] [DEBUG] Updated state.taintSensitivity to: ${normalizedSensitivity}`);
        }
      }
      
      // Small delay to let settings update propagate
      console.log(`[Extension] [DEBUG] Waiting 100ms for settings to propagate...`);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Now trigger re-analysis - use the command directly to ensure it runs
      console.log(`[Extension] [DEBUG] Executing analyzeWorkspace command for re-analysis...`);
      console.log(`[Extension] [DEBUG] Expected sensitivity in analysis: ${normalizedSensitivity}`);
      await vscode.commands.executeCommand('dataflowAnalyzer.analyzeWorkspace');
      
      // Verify sensitivity after re-analysis
      const finalConfig = analyzer.getConfig();
      const finalState = analyzer.getState();
      console.log(`[Extension] [INFO] ========== RE-ANALYSIS COMPLETE ==========`);
      console.log(`[Extension] [INFO] Final analyzer config sensitivity: ${finalConfig.taintSensitivity}`);
      console.log(`[Extension] [INFO] Final state sensitivity: ${finalState?.taintSensitivity || 'undefined'}`);
      console.log(`[Extension] [INFO] Sensitivity match: ${finalConfig.taintSensitivity === normalizedSensitivity}`);
      console.log(`[Extension] [INFO] State sensitivity match: ${finalState?.taintSensitivity === normalizedSensitivity}`);
      
      if (finalConfig.taintSensitivity !== normalizedSensitivity) {
        console.error(`[Extension] [ERROR] Sensitivity mismatch after re-analysis! Expected ${normalizedSensitivity}, got ${finalConfig.taintSensitivity}`);
      }
      
      console.log(`[Extension] [INFO] Re-analysis completed for sensitivity: ${normalizedSensitivity}`);
    } catch (error) {
      console.error(`[Extension] [ERROR] ========== SENSITIVITY CHANGE FAILED ==========`);
      console.error(`[Extension] [ERROR] Failed to trigger re-analysis:`, error);
      vscode.window.showErrorMessage(`Failed to re-analyze: ${error instanceof Error ? error.message : String(error)}`);
      throw error; // Re-throw so caller knows it failed
    } finally {
      // Reset flag after a delay to allow config change events to settle
      setTimeout(() => {
        isUpdatingSensitivityProgrammatically = false;
        console.log(`[Extension] [DEBUG] Reset isUpdatingSensitivityProgrammatically = false`);
      }, 500);
    }
  });
  
  /**
   * Register command: Re-analyze Workspace
   * 
   * Manually triggers re-analysis of the workspace with current settings.
   */
  const reAnalyzeCommand = vscode.commands.registerCommand('dataflowAnalyzer.reAnalyze', async () => {
    console.log(`[Extension] [INFO] reAnalyze command called`);
    
    if (!analyzer) {
      console.error(`[Extension] [ERROR] Analyzer not initialized`);
      vscode.window.showErrorMessage('Analyzer not initialized');
      return;
    }
    
    // Check if visualizer has panels before re-analysis
    let panelCount = 0;
    if (visualizer) {
      panelCount = visualizer.getPanelCount?.() || 0;
      console.log(`[Extension] [DEBUG] Before re-analysis - panel count: ${panelCount}`);
      if (panelCount > 0) {
        const panelKeys = visualizer.getPanelKeys?.() || [];
        console.log(`[Extension] [DEBUG] Existing panel keys:`, panelKeys);
      }
    }
    
    const currentConfig = analyzer.getConfig();
    console.log(`[Extension] [DEBUG] Current sensitivity: ${currentConfig.taintSensitivity}`);
    console.log(`[Extension] [INFO] Manual re-analysis triggered with current settings`);
    
    // Ensure sensitivity is preserved - don't let config change handler reset it
    // Get current sensitivity from analyzer (which may differ from settings)
    const currentSensitivity = currentConfig.taintSensitivity;
    console.log(`[Extension] [DEBUG] Preserving current sensitivity: ${currentSensitivity}`);
    
    try {
      console.log(`[Extension] [DEBUG] Executing analyzeWorkspace command for re-analysis...`);
      await vscode.commands.executeCommand('dataflowAnalyzer.analyzeWorkspace');
      console.log(`[Extension] [INFO] Re-analysis completed`);
      
      // Verify sensitivity wasn't reset
      const configAfter = analyzer.getConfig();
      if (configAfter.taintSensitivity !== currentSensitivity) {
        console.log(`[Extension] [WARN] Sensitivity changed during re-analysis: ${currentSensitivity} -> ${configAfter.taintSensitivity}`);
        // Restore the original sensitivity
        analyzer.updateConfig({
          ...configAfter,
          taintSensitivity: currentSensitivity
        });
        console.log(`[Extension] [INFO] Restored sensitivity to: ${currentSensitivity}`);
      } else {
        console.log(`[Extension] [DEBUG] Sensitivity preserved: ${currentSensitivity}`);
      }
      
      // Check panel count after re-analysis
      if (visualizer) {
        const panelCountAfter = visualizer.getPanelCount?.() || 0;
        console.log(`[Extension] [DEBUG] After re-analysis - panel count: ${panelCountAfter}`);
        if (panelCountAfter !== panelCount) {
          console.log(`[Extension] [WARN] Panel count changed from ${panelCount} to ${panelCountAfter} - new panel may have been created`);
        } else {
          console.log(`[Extension] [INFO] Panel count unchanged (${panelCount}) - existing panels updated`);
        }
      }
    } catch (error) {
      console.error(`[Extension] [ERROR] Failed to trigger re-analysis:`, error);
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
      console.log(`[Extension] State saved at ${timestamp}`);
    } catch (error) {
      console.error('[Extension] Error saving state:', error);
      vscode.window.showErrorMessage(`Failed to save state: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  context.subscriptions.push(showCFGCommand, analyzeWorkspaceCommand, analyzeActiveFileCommand, clearStateCommand, changeSensitivityAndAnalyzeCommand, saveStateCommand, reAnalyzeCommand);

  // Set up file change listeners
  setupFileWatchers(context, analysisConfig);

  // Watch for configuration changes
  vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('dataflowAnalyzer')) {
      // Skip sensitivity updates if we're programmatically updating it
      // This prevents the config change handler from resetting sensitivity to PRECISE
      const isSensitivityChange = e.affectsConfiguration('dataflowAnalyzer.taintSensitivity');
      if (isSensitivityChange && isUpdatingSensitivityProgrammatically) {
        console.log('[Extension] [DEBUG] Ignoring sensitivity config change (programmatic update in progress)');
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
          console.log(`[Extension] [DEBUG] Using analyzer's current sensitivity (${currentConfig.taintSensitivity}) instead of settings (${settingsSensitivity})`);
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
      
      console.log(`[Extension] [DEBUG] Configuration changed, updating analyzer config`);
      console.log(`[Extension] [DEBUG] New sensitivity: ${taintSensitivity}`);
      
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
      console.warn('[Extension] Error reading save states list:', error);
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
  console.log(`[Extension] Updated save states list with ${saveStatesList.length} entries`);
}

/**
 * Extension deactivation function
 * 
 * Called by VS Code when the extension is deactivated. Cleans up resources:
 * - Clears debounce timer
 * - Disposes visualizer and its webview panels
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
}

