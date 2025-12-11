/**
 * CFGVisualizer.ts
 * 
 * CFG Visualizer Webview - Interactive Visualization Component
 * 
 * PURPOSE:
 * This module provides the webview-based visualization for Control Flow Graphs (CFGs) and
 * all analysis results. It creates interactive visualizations using vis-network library
 * and manages multiple visualization panels for different files and view types.
 * 
 * SIGNIFICANCE IN OVERALL FLOW:
 * This is the FINAL step in the analysis pipeline - the user-facing visualization layer.
 * It takes all analysis results from DataflowAnalyzer and presents them in an interactive
 * webview. Users interact with this component to explore CFGs, call graphs, taint analysis,
 * and vulnerabilities. All visualization data is prepared during analysis (backend) and
 * displayed on-demand when tabs are clicked.
 * 
 * DATA FLOW:
 * INPUTS:
 *   - AnalysisState object (from DataflowAnalyzer.ts) containing:
 *     - CFG structures (functions, blocks, statements)
 *     - Liveness analysis results
 *     - Reaching definitions results
 *     - Taint analysis results
 *     - Vulnerability results
 *     - Call graph
 *     - Inter-procedural analysis results
 *     - Pre-prepared visualization data (optional, prepared in backend)
 *   - VS Code webview API (for creating panels)
 *   - User interactions (function selection, tab clicks)
 * 
 * PROCESSING:
 *   1. Receives AnalysisState from extension.ts or DataflowAnalyzer
 *   2. Prepares graph data for vis-network:
 *      - prepareGraphData(): CFG visualization data
 *      - prepareCallGraphData(): Call graph visualization data
 *      - prepareTaintData(): Taint analysis visualization data
 *      - prepareInterProceduralTaintData(): Inter-procedural taint visualization data
 *      - prepareInterconnectedCFGData(): Unified CFG visualization data
 *   3. Generates HTML content with vis-network integration
 *   4. Handles user interactions (function selection, tab switching)
 *   5. Updates visualization when analysis state changes
 * 
 * OUTPUTS:
 *   - Webview panels (displayed in VS Code)
 *   - Interactive visualizations:
 *     - CFG Tab: Individual function control flow graphs
 *     - Call Graph Tab: Function call relationships
 *     - Taint Analysis Tab: Taint sources, sinks, vulnerabilities
 *     - Inter-Procedural Taint Tab: Cross-function taint propagation
 *     - Interconnected CFG Tab: Unified view with all edge types
 *   - User interaction events -> extension.ts (for re-analysis if needed)
 * 
 * DEPENDENCIES:
 *   - types.ts: AnalysisState, FunctionCFG, TaintInfo, etc.
 *   - vis-network library: Graph visualization engine
 *   - VS Code webview API: Panel creation and management
 * 
 * KEY FEATURES:
 * - Individual function CFG visualization
 * - Call graph visualization
 * - Interconnected CFG visualization (all functions with control flow, call, and data flow edges)
 * - Panel tracking for multi-file management
 * - Real-time updates when analysis state changes
 * - Backend data preparation (all data ready before tab click)
 * - Sensitivity mismatch detection and automatic re-analysis (v1.9.1)
 * 
 * EDGE TYPES IN INTERCONNECTED CFG:
 * - Green: Control flow edges (within functions)
 * - Blue: Function call edges (between functions)
 * - Orange: Data flow edges (reaching definitions)
 * 
 * NEW FEATURES (v1.9.1):
 * - Automatic sensitivity mismatch detection on tab switching
 * - Enhanced visualization data regeneration when sensitivity changes
 * - Comprehensive logging for debugging sensitivity issues
 * - Sensitivity storage in visualization data for mismatch detection
 * 
 * LOGGING STRATEGY:
 * This file uses LoggingConfig methods for all logging:
 * - LoggingConfig.log() - Normal operational messages (e.g., "Panel created...")
 * - LoggingConfig.detail() - Detailed debugging info (e.g., panel keys, sensitivity checks)
 * - LoggingConfig.verbose() - Very detailed info (e.g., graph data structures)
 * - LoggingConfig.error() - Error messages
 * - LoggingConfig.warn() - Warning messages
 * - LoggingConfig.section() - Major event headers
 * - LoggingConfig.raw() - Raw messages without module prefix (for webview messages)
 * 
 * All logs are automatically written to .vscode/logs.txt via console interception.
 * Module flags: LoggingConfig.CFGViz, LoggingConfig.VizTabs, LoggingConfig.VizNodes, etc.
 */

import * as vscode from 'vscode';
import { CFG, FunctionCFG, BasicBlock, AnalysisState, FileAnalysisState, LivenessInfo, ReachingDefinitionsInfo, ReachingDefinition, TaintInfo, TaintLabel, TaintSensitivity, StatementType } from '../types';
import { Vulnerability } from '../analyzer/SecurityAnalyzer';
import { LoggingConfig } from '../utils/LoggingConfig';

/**
 * CFGVisualizer manages webview panels for CFG visualization
 * 
 * This class handles:
 * - Creating and managing webview panels
 * - Preparing graph data for visualization
 * - Handling user interactions (function selection, tab switching)
 * - Panel lifecycle management (creation, updates, disposal)
 */
export class CFGVisualizer {
  // Panel tracking: Map of panel keys (filename:viewType) to webview panels
  private panels: Map<string, vscode.WebviewPanel> = new Map(); // Track panels by filename+viewType key
  private panel: vscode.WebviewPanel | undefined; // Current active panel reference
  private currentState: AnalysisState | null = null;  // Current analysis state
  private currentFunction: string | null = null;  // Currently displayed function
  private visNetworkUri: vscode.Uri | null = null;  // URI for vis-network library
  private notifyCommandRegistered: boolean = false;  // Track if notify command is registered (prevents duplicate registration)
  private context: vscode.ExtensionContext | null = null;  // Store extension context for panel recreation
  // Track pending re-analyses: Map of panel key -> panel reference (for sending success message after visualization updates)
  private pendingReAnalyses: Map<string, vscode.WebviewPanel> = new Map();
  private isRecreatingPanel: boolean = false;  // Guard flag to prevent infinite recreation loops

  /**
   * Get panel key from filename and viewType
   * 
   * Creates a unique key for tracking panels. Format: "filename:viewType"
   * 
   * @param filename - Name of the file being analyzed (optional)
   * @param viewType - Type of view: 'Viz' for analysis, 'Viz/Cfg' for CFG display
   * @returns Panel key string
   */
  private getPanelKey(filename: string | undefined, viewType: 'Viz' | 'Viz/Cfg'): string {
    const baseName = filename ? filename.split(/[/\\]/).pop() || filename : 'default';
    return `${baseName}:${viewType}`;
  }

  /**
   * Check if any panels exist
   * 
   * @returns true if any panels are currently tracked
   */
  /**
   * Check if any panels exist
   * 
   * Used to determine if visualization panels are currently open.
   * Returns true if any panels are tracked in the panels Map.
   * 
   * @returns true if any panels are currently tracked
   */
  hasPanels(): boolean {
    const count = this.panels.size;
    LoggingConfig.detail('CFGViz', `hasPanels() called - panel count: ${count}`);
    if (count > 0) {
      const panelKeys = Array.from(this.panels.keys());
      LoggingConfig.detail('CFGViz', `Existing panel keys: ${panelKeys.join(', ')}`);
    }
    return count > 0;
  }

  /**
   * Get panel count (for debugging)
   * 
   * @returns number of panels currently tracked
   */
  getPanelCount(): number {
    return this.panels.size;
  }

  /**
   * Get panel keys (for debugging)
   * 
   * @returns array of panel keys currently tracked
   */
  getPanelKeys(): string[] {
    return Array.from(this.panels.keys());
  }

  /**
   * Create or show the visualizer panel
   * 
   * Creates a new webview panel or reveals an existing one if it already exists
   * for the given filename and view type. This enables multi-file visualization
   * where each file gets its own panel.
   * 
   * @param context - Extension context for managing subscriptions
   * @param filename - Name of the file being analyzed (for tab title)
   * @param viewType - Type of view: 'Viz' for analysis, 'Viz/Cfg' for CFG display
   */
  /**
   * Create or show the visualizer panel
   * 
   * Creates a new webview panel or reveals an existing one if it already exists
   * for the given filename and view type. This enables multi-file visualization
   * where each file gets its own panel.
   * 
   * CRITICAL: Handles sensitivity mismatch detection - recreates panel if sensitivity changed.
   * 
   * @param context - Extension context for managing subscriptions
   * @param filename - Name of the file being analyzed (for tab title)
   * @param viewType - Type of view: 'Viz' for analysis, 'Viz/Cfg' for CFG display
   * @param state - Optional analysis state (if provided, updates currentState)
   */
  async createOrShow(context: vscode.ExtensionContext, filename?: string, viewType: 'Viz' | 'Viz/Cfg' = 'Viz', state?: AnalysisState): Promise<void> {
    /**
     * PANEL CREATION/REVEAL LOGIC
     * 
     * This method handles:
     * 1. Checking if panel already exists for this filename+viewType combination
     * 2. Detecting sensitivity mismatches (panel title doesn't match current sensitivity)
     * 3. Creating new panel or revealing existing one
     * 4. Updating panel with current analysis state
     */
    // #region agent log
    LoggingConfig.raw(`[DEBUG] createOrShow ENTRY | location:CFGVisualizer.ts:200 | hypothesisId:D | data:${JSON.stringify({filename,viewType,panelCount:this.panels.size,isRecreating:this.isRecreatingPanel,hasState:!!state,hasCurrentState:!!this.currentState})} | timestamp:${Date.now()}`);
    // #endregion
    // CRITICAL FIX: Store context for later use
    this.context = context;
    
    LoggingConfig.log('CFGViz', 'createOrShow called');
    LoggingConfig.detail('CFGViz', `Filename: ${filename || 'undefined'}`);
    LoggingConfig.detail('CFGViz', `View type: ${viewType}`);
    LoggingConfig.detail('CFGViz', `Current panel count: ${this.panels.size}`);
    LoggingConfig.detail('CFGViz', `Current panel keys: ${Array.from(this.panels.keys()).join(', ')}`);

    const panelKey = this.getPanelKey(filename, viewType);
    LoggingConfig.detail('CFGViz', `Computed panel key: ${panelKey}`);

    /**
     * EXISTING PANEL CHECK AND SENSITIVITY MISMATCH DETECTION
     * 
     * Checks if a panel already exists for this filename+viewType combination.
     * CRITICAL: Detects sensitivity mismatches by comparing panel title with current sensitivity.
     * If sensitivity changed, disposes old panel and creates new one (VS Code doesn't allow runtime title updates).
     */
    // Check if panel already exists for this key
    const existingPanel = this.panels.get(panelKey);
    if (existingPanel) {
      LoggingConfig.log('CFGViz', 'Panel exists for key, checking if title needs update...');
      
      // CRITICAL FIX: Check if panel title needs to be updated (sensitivity changed)
      // VS Code doesn't allow runtime title updates, so we need to recreate the panel
      // Priority: passed state > currentState > VS Code config > 'precise'
      let currentSensitivity: TaintSensitivity | undefined = state?.taintSensitivity || this.currentState?.taintSensitivity;
      if (!currentSensitivity) {
        const config = vscode.workspace.getConfiguration('dataflowAnalyzer');
        const configValue = config.get<string>('taintSensitivity', 'precise');
        currentSensitivity = (configValue as TaintSensitivity) || TaintSensitivity.PRECISE;
      }
      currentSensitivity = currentSensitivity || TaintSensitivity.PRECISE;
      
      const currentTitle = existingPanel.title;
      const baseName = filename ? filename.split(/[/\\]/).pop() || filename : 'default';
      const expectedTitle = `${baseName}: ${viewType} [${currentSensitivity.toUpperCase()}]`;
      
      if (currentTitle !== expectedTitle) {
        // #region agent log
        LoggingConfig.raw(`[DEBUG] TITLE MISMATCH in createOrShow | location:CFGVisualizer.ts:249 | hypothesisId:A | data:${JSON.stringify({panelKey,currentTitle,expectedTitle,isRecreating:this.isRecreatingPanel})} | timestamp:${Date.now()}`);
        // #endregion
        // Sensitivity mismatch detected - recreate panel with correct title
        LoggingConfig.detail('CFGViz', `Panel title mismatch: "${currentTitle}" vs "${expectedTitle}"`);
        LoggingConfig.log('CFGViz', 'Sensitivity changed - closing old panel and creating new one with correct title');
        
        // Dispose old panel
        existingPanel.dispose();
        this.panels.delete(panelKey);
        
        // Continue to create new panel below with correct title
      } else {
        // Panel title matches - reveal existing panel and update with current state
        LoggingConfig.log('CFGViz', 'Panel title matches current sensitivity, revealing existing panel');
      const column = vscode.window.activeTextEditor
        ? vscode.window.activeTextEditor.viewColumn
        : undefined;
      existingPanel.reveal(column);
      this.panel = existingPanel; // Set current panel reference
        
        // CRITICAL FIX: Update the existing panel with current state if it exists
        if (this.currentState) {
          LoggingConfig.detail('CFGViz', 'Updating existing panel with current state');
          await this.updateWebview(existingPanel);
        }
      return;
      }
    }
    
    /**
     * NEW PANEL CREATION
     * 
     * No existing panel found - create a new webview panel.
     * Panel title includes sensitivity level for user visibility.
     */
    LoggingConfig.log('CFGViz', 'No existing panel found for key, creating new panel');

    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;
    LoggingConfig.detail('CFGViz', `Target column: ${column || 'undefined'}`);

    /**
     * PANEL TITLE DETERMINATION
     * 
     * Determines panel title based on filename and current sensitivity.
     * CRITICAL: Priority order for sensitivity:
     * 1. Passed state parameter
     * 2. Current state (this.currentState)
     * 3. VS Code configuration
     * 4. Default (PRECISE)
     * 
     * Panel title format: "filename: viewType [SENSITIVITY]" or "default: viewType [SENSITIVITY]"
     * CRITICAL FIX: Always use the format that matches updateVisualization expectations to prevent infinite loops
     */
    // Determine panel title based on filename and current sensitivity
    // CRITICAL FIX: Use passed state, then currentState, then VS Code config, then default
    // CRITICAL FIX: Always use format "baseName: viewType [SENSITIVITY]" to match updateVisualization expectations
    const baseName = filename ? filename.split(/[/\\]/).pop() || filename : 'default';
    // CRITICAL FIX: Priority: passed state > currentState > VS Code config > TaintSensitivity.PRECISE
    let sensitivity: TaintSensitivity | undefined = state?.taintSensitivity || this.currentState?.taintSensitivity;
    if (!sensitivity) {
      // Fallback: try to get from VS Code configuration
      const config = vscode.workspace.getConfiguration('dataflowAnalyzer');
      const configValue = config.get<string>('taintSensitivity', 'precise');
      sensitivity = (configValue as TaintSensitivity) || TaintSensitivity.PRECISE;
      LoggingConfig.detail('CFGViz', `No sensitivity in state/currentState, using VS Code config: ${sensitivity}`);
    } else {
      LoggingConfig.detail('CFGViz', `Using sensitivity from ${state ? 'passed state' : 'currentState'}: ${sensitivity}`);
    }
    // Final fallback to PRECISE if still not set
    sensitivity = sensitivity || TaintSensitivity.PRECISE;
    LoggingConfig.detail('CFGViz', `Creating panel with sensitivity: ${sensitivity}`);
    const panelTitle = `${baseName}: ${viewType} [${sensitivity.toUpperCase()}]`;
    
    // CRITICAL FIX: Update currentState if state was passed
    if (state) {
      this.currentState = state;
      LoggingConfig.detail('CFGViz', 'Updated currentState from passed state parameter');
    }

    LoggingConfig.log('CFGViz', `Creating new webview panel with title: ${panelTitle}`);
    LoggingConfig.detail('CFGViz', `Panel options: enableScripts=true, retainContextWhenHidden=true`);

    // Create a new panel
    const panel = vscode.window.createWebviewPanel(
      'cfgVisualizer',
      panelTitle,
      column || vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')]
      }
    );

    /**
     * PANEL TRACKING AND LIFECYCLE MANAGEMENT
     * 
     * Stores panel in Map for tracking and sets up disposal handler.
     * CRITICAL: Panel must be removed from Map on disposal to prevent memory leaks.
     */
    // Store panel in map
    this.panels.set(panelKey, panel);
    this.panel = panel; // Set current panel reference

    LoggingConfig.log('CFGViz', 'Panel created successfully');
    LoggingConfig.detail('CFGViz', `Panel key stored: ${panelKey}`);
    LoggingConfig.detail('CFGViz', `Total panels tracked: ${this.panels.size}`);
    LoggingConfig.detail('CFGViz', `All panel keys: ${Array.from(this.panels.keys()).join(', ')}`);
    LoggingConfig.detail('CFGViz', `Panel webview available: ${!!panel.webview}`);
    LoggingConfig.detail('CFGViz', `Panel webview CSP source: ${panel.webview.cspSource}`);

    /**
     * PANEL DISPOSAL HANDLER
     * 
     * Removes panel from tracking Map when disposed.
     * CRITICAL: Prevents memory leaks by cleaning up panel references.
     */
    panel.onDidDispose(() => {
      // #region agent log
      LoggingConfig.raw(`[DEBUG] PANEL DISPOSED | location:CFGVisualizer.ts:367 | hypothesisId:A | data:${JSON.stringify({panelKey,remainingPanels:this.panels.size-1,isRecreating:this.isRecreatingPanel})} | timestamp:${Date.now()}`);
      // #endregion
      LoggingConfig.detail('CFGViz', 'Panel disposed, removing from tracking');
      // CRITICAL FIX (LOGIC.md #9): Ensure panel is removed from Map to prevent memory leak
      this.panels.delete(panelKey);
      if (this.panel === panel) {
      this.panel = undefined;
      }
      LoggingConfig.log('CFGViz', `Panel ${panelKey} removed. Remaining panels: ${this.panels.size}`);
    }, null, context.subscriptions);

    /**
     * WEBVIEW MESSAGE HANDLER
     * 
     * Handles messages from the webview (user interactions):
     * - changeFunction: User selected a different function to visualize
     * - changeSensitivity: User changed taint sensitivity level
     * - saveState: User clicked save state button
     * - reAnalyze: User clicked re-analyze button
     * 
     * All messages are logged for debugging and audit purposes.
     */
    // Handle messages from webview
    panel.webview.onDidReceiveMessage(
      async message => {
        LoggingConfig.detail('CFGViz', `Received message from webview: ${JSON.stringify(message)}`);
        
        if (message.type === 'changeFunction') {
          // User selected a different function - update visualization
          LoggingConfig.log('CFGViz', `Function changed to: ${message.functionName}`);
          this.currentFunction = message.functionName;
          await this.updateWebview(panel);
        } else if (message.type === 'changeSensitivity') {
          /**
           * SENSITIVITY CHANGE HANDLER
           * 
           * User changed taint sensitivity level from the webview dropdown.
           * Updates VS Code settings and optionally triggers re-analysis.
           */
          LoggingConfig.section('CFGViz', '🎯 MAJOR EVENT: Sensitivity Change Requested');
          LoggingConfig.raw(`[MAJOR EVENT] User changed: Taint Sensitivity to "${message.sensitivity}"`);
          LoggingConfig.log('CFGViz', 'changeSensitivity message received from webview');
          LoggingConfig.detail('CFGViz', `Sensitivity: ${message.sensitivity}, triggerReAnalysis: ${message.triggerReAnalysis}`);
          
          // Try to update VS Code settings (workspace or user)
          // If workspace is not available, fall back to user settings or skip
          let settingsUpdated = false;
          LoggingConfig.raw(`[CFGVisualizer] [SETTINGS] Attempting to update VS Code settings to: ${message.sensitivity}`);
          try {
            const config = vscode.workspace.getConfiguration('dataflowAnalyzer');
            // Try workspace first, fall back to global if workspace not available
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (workspaceFolder) {
              LoggingConfig.raw(`[CFGVisualizer] [SETTINGS] Updating workspace settings (workspace folder: ${workspaceFolder.name})`);
              await config.update('taintSensitivity', message.sensitivity, vscode.ConfigurationTarget.Workspace);
              LoggingConfig.raw(`[CFGVisualizer] [SETTINGS] ✅ VS Code workspace settings updated successfully`);
              LoggingConfig.log('CFGViz', 'VS Code workspace settings updated');
              settingsUpdated = true;
            } else {
              // No workspace, try user settings
              LoggingConfig.raw(`[CFGVisualizer] [SETTINGS] No workspace found, updating global user settings`);
              await config.update('taintSensitivity', message.sensitivity, vscode.ConfigurationTarget.Global);
              LoggingConfig.raw(`[CFGVisualizer] [SETTINGS] ✅ VS Code user settings updated successfully`);
              LoggingConfig.detail('CFGViz', 'VS Code user settings updated (no workspace)');
              settingsUpdated = true;
            }
          } catch (error) {
            // Settings update failed, but we can still update analyzer config directly
            LoggingConfig.raw(`[CFGVisualizer] [SETTINGS] ❌ WARNING: Failed to update VS Code settings: ${error}`);
            LoggingConfig.raw(`[CFGVisualizer] [SETTINGS] Will update analyzer config directly instead`);
            LoggingConfig.warn('CFGViz', 'Failed to update VS Code settings', error);
            LoggingConfig.detail('CFGViz', 'Will update analyzer config directly instead');
            settingsUpdated = false;
          }
          
          /**
           * RE-ANALYSIS TRIGGER
           * 
           * If triggerReAnalysis is true, executes changeSensitivityAndAnalyze command
           * to trigger full re-analysis with new sensitivity.
           */
          // Only trigger re-analysis if explicitly requested
          if (message.triggerReAnalysis) {
            LoggingConfig.raw(`[CFGVisualizer] [RE-ANALYSIS] triggerReAnalysis=true, triggering re-analysis with sensitivity: ${message.sensitivity}`);
            LoggingConfig.log('CFGViz', `Triggering re-analysis with sensitivity: ${message.sensitivity}`);
            vscode.window.showInformationMessage(`Taint sensitivity changed to ${message.sensitivity.toUpperCase()}. Re-analyzing workspace...`);
            
            // Send a message to extension to update analyzer config, then trigger re-analysis
            // We'll use a custom command that handles both
            try {
              LoggingConfig.raw(`[CFGVisualizer] [RE-ANALYSIS] Executing changeSensitivityAndAnalyze command with sensitivity: ${message.sensitivity}`);
              LoggingConfig.detail('CFGViz', 'Executing changeSensitivityAndAnalyze command...');
              await vscode.commands.executeCommand('dataflowAnalyzer.changeSensitivityAndAnalyze', message.sensitivity);
              LoggingConfig.raw(`[CFGVisualizer] [RE-ANALYSIS] ✅ changeSensitivityAndAnalyze command completed successfully`);
              LoggingConfig.log('CFGViz', 'changeSensitivityAndAnalyze command completed successfully');
              // Send success message back to webview
              panel.webview.postMessage({ type: 'reAnalyzeResult', success: true });
              LoggingConfig.raw(`[CFGVisualizer] [RE-ANALYSIS] ✅ Sent success message back to webview`);
            } catch (error) {
              // Re-analysis failed - log error and notify webview
              LoggingConfig.raw(`[CFGVisualizer] [RE-ANALYSIS] ❌ ERROR: Failed to trigger re-analysis: ${error}`);
              LoggingConfig.error('CFGViz', 'Failed to trigger re-analysis', error);
              panel.webview.postMessage({ type: 'reAnalyzeResult', success: false, error: String(error) });
              LoggingConfig.raw(`[CFGVisualizer] [RE-ANALYSIS] ❌ Sent error message back to webview`);
            }
          } else {
            // Sensitivity updated but re-analysis not triggered - user will trigger manually
            LoggingConfig.raw(`[CFGVisualizer] [SETTINGS] triggerReAnalysis=false, sensitivity updated but waiting for manual re-analysis trigger`);
            LoggingConfig.detail('CFGViz', 'Sensitivity updated, waiting for manual re-analysis trigger');
            // Just update settings, don't trigger re-analysis
            if (settingsUpdated) {
              LoggingConfig.raw(`[CFGVisualizer] [SETTINGS] Settings updated successfully, showing info message to user`);
              vscode.window.showInformationMessage(`Taint sensitivity set to ${message.sensitivity.toUpperCase()}. Click "Re-analyze" to apply.`);
            } else {
              // Settings update failed, but we can still proceed
              // The analyzer config will be updated when re-analysis is triggered
              LoggingConfig.raw(`[CFGVisualizer] [SETTINGS] Settings update failed, will update when re-analysis is triggered`);
              vscode.window.showInformationMessage(`Taint sensitivity will be set to ${message.sensitivity.toUpperCase()} when you click "Re-analyze".`);
            }
          }
        } else if (message.type === 'saveState') {
          /**
           * SAVE STATE HANDLER
           * 
           * User clicked save state button - executes saveState command.
           */
          LoggingConfig.log('CFGViz', 'saveState message received');
          try {
            // Trigger save state command
            LoggingConfig.detail('CFGViz', 'Executing saveState command...');
            await vscode.commands.executeCommand('dataflowAnalyzer.saveState');
            LoggingConfig.log('CFGViz', 'saveState command completed successfully');
            // Send success message back to webview
            panel.webview.postMessage({ type: 'saveStateResult', success: true });
          } catch (error) {
            // Save state failed - log error and notify webview
            LoggingConfig.error('CFGViz', 'Error saving state', error);
            panel.webview.postMessage({ type: 'saveStateResult', success: false, error: String(error) });
          }
        } else if (message.type === 'reAnalyze') {
          /**
           * RE-ANALYZE HANDLER
           * 
           * User clicked re-analyze button - executes reAnalyze command.
           * Tracks panel as pending re-analysis - success message sent after visualization updates.
           */
          LoggingConfig.raw('[CFGVisualizer] [RE-ANALYSIS] reAnalyze message received from webview');
          LoggingConfig.log('CFGViz', 'reAnalyze message received');
          
          // CRITICAL FIX: Track this panel as having a pending re-analysis
          // The success message will be sent after updateVisualization completes
          this.pendingReAnalyses.set(panelKey, panel);
          LoggingConfig.raw(`[CFGVisualizer] [RE-ANALYSIS] Marked panel ${panelKey} as pending re-analysis`);
          
          try {
            // Trigger re-analysis command (uses current analyzer config)
            // This will call analyzeWorkspace which calls updateVisualization
            LoggingConfig.raw('[CFGVisualizer] [RE-ANALYSIS] Executing reAnalyze command...');
            LoggingConfig.detail('CFGViz', 'Executing reAnalyze command...');
            await vscode.commands.executeCommand('dataflowAnalyzer.reAnalyze');
            LoggingConfig.raw('[CFGVisualizer] [RE-ANALYSIS] reAnalyze command completed');
            LoggingConfig.log('CFGViz', 'reAnalyze command completed successfully');
            
            // Note: Success message will be sent after updateVisualization completes
            // See updateVisualization method below
          } catch (error) {
            // Re-analysis failed - log error, remove from pending, and notify webview
            LoggingConfig.raw(`[CFGVisualizer] [RE-ANALYSIS] ❌ ERROR: Failed to trigger re-analysis: ${error}`);
            LoggingConfig.error('CFGViz', 'Failed to trigger re-analysis', error);
            // Remove from pending on error
            this.pendingReAnalyses.delete(panelKey);
            panel.webview.postMessage({ type: 'reAnalyzeResult', success: false, error: String(error) });
          }
        } else if (message.type === 'openFileAtLine') {
          /**
           * OPEN FILE AT LINE HANDLER
           * 
           * User double-clicked a CFG block - opens the source file at that block's line.
           * This enables navigation from visualization back to source code.
           */
          // Handle double-click on CFG block: open file at the block's starting line
          LoggingConfig.section('CFGViz', '🎯 MAJOR EVENT: CFG Block Double-Clicked');
          LoggingConfig.raw(`[MAJOR EVENT] User double-clicked: CFG Block to open file at line`);
          LoggingConfig.log('CFGViz', 'openFileAtLine message received');
          LoggingConfig.detail('CFGViz', `File: ${message.filePath}, Line: ${message.line}`);
          
          try {
            if (message.filePath) {
              const uri = vscode.Uri.file(message.filePath);
              const lineNumber = message.line ? Math.max(0, message.line - 1) : 0; // VS Code lines are 0-indexed
              
              // Open the document
              const document = await vscode.workspace.openTextDocument(uri);
              
              // Show the document and navigate to the line
              const editor = await vscode.window.showTextDocument(document, {
                preview: false,
                selection: new vscode.Selection(
                  new vscode.Position(lineNumber, 0),
                  new vscode.Position(lineNumber, 0)
                )
              });
              
              // Reveal the line in the center of the editor
              editor.revealRange(
                new vscode.Range(lineNumber, 0, lineNumber, 0),
                vscode.TextEditorRevealType.InCenter
              );
              
              LoggingConfig.log('CFGViz', `Opened file at line ${message.line}`);
            } else {
              // No file path provided - show warning to user
              LoggingConfig.warn('CFGViz', 'No file path provided for openFileAtLine');
              vscode.window.showWarningMessage('No file path available for this block');
            }
          } catch (error) {
            // File open failed - log error and show error message to user
            LoggingConfig.error('CFGViz', 'Failed to open file', error);
            vscode.window.showErrorMessage(`Failed to open file: ${error instanceof Error ? error.message : String(error)}`);
          }
        } else {
          // Unknown message type - log warning
          LoggingConfig.warn('CFGViz', `Unknown message type: ${message.type}`);
        }
      },
      null,
      context.subscriptions
    );
    
    // Handle messages from extension to webview (for save state result)
    // Register command only once (not per panel) to avoid duplicate registration errors
    if (!this.notifyCommandRegistered) {
      try {
        context.subscriptions.push(
          vscode.commands.registerCommand('dataflowAnalyzer.notifySaveStateResult', (success: boolean, message?: string) => {
            // Post message to all active panels
            this.panels.forEach((p) => {
              p.webview.postMessage({ type: 'saveStateResult', success, message });
            });
          })
        );
        this.notifyCommandRegistered = true;
        LoggingConfig.detail('CFGViz', 'notifySaveStateResult command registered');
      } catch (error) {
        // Command might already exist from previous activation, that's OK
        LoggingConfig.detail('CFGViz', 'notifySaveStateResult command already exists (reload scenario)');
        this.notifyCommandRegistered = true; // Mark as registered to avoid retrying
      }
    }

    /**
     * INITIAL WEBVIEW UPDATE
     * 
     * If state is already available, update webview immediately.
     * Otherwise, webview will be updated when state is provided via updateVisualization().
     */
    // Only update webview if we have state, otherwise it will be updated when state is provided
    if (this.currentState) {
      LoggingConfig.detail('CFGViz', 'Panel created with existing state, updating webview');
      await this.updateWebview(panel);
    } else {
      LoggingConfig.detail('CFGViz', 'Panel created without state, will update when state is provided');
    }
      // #region agent log
      LoggingConfig.raw(`[DEBUG] createOrShow EXIT | location:CFGVisualizer.ts:629 | hypothesisId:D | data:${JSON.stringify({panelKey,panelTitle:panel.title,panelCount:this.panels.size,isRecreating:this.isRecreatingPanel})} | timestamp:${Date.now()}`);
      // #endregion
  }

  /**
   * Update visualization for a specific file's panel
   * 
   * Finds the panel associated with the given filename and view type,
   * then updates it with the new analysis state. Used by file watchers
   * to update visualizations when files are saved or changed.
   * 
   * @param filename - Filename to update
   * @param state - Analysis state containing CFG and analysis results
   * @param viewType - View type ('Viz' or 'Viz/Cfg')
   */
  /**
   * Update visualization for a specific file's panel
   * 
   * Finds the panel associated with the given filename and view type,
   * then updates it with the new analysis state. Used by file watchers
   * to update visualizations when files are saved or changed.
   * 
   * @param filename - Filename to update
   * @param state - Analysis state containing CFG and analysis results
   * @param viewType - View type ('Viz' or 'Viz/Cfg')
   */
  async updateVisualizationForFile(filename: string, state: AnalysisState, viewType: 'Viz' | 'Viz/Cfg' = 'Viz'): Promise<void> {
    const panelKey = this.getPanelKey(filename, viewType);
    const panel = this.panels.get(panelKey);
    
    if (panel) {
      LoggingConfig.log('CFGViz', `Updating visualization for file: ${filename}, viewType: ${viewType}`);
      this.currentState = state;
      this.panel = panel;
      await this.updateWebview(panel);
    } else {
      // No panel found for this file - panel may not have been created yet
      LoggingConfig.detail('CFGViz', `No panel found for file: ${filename}, viewType: ${viewType}`);
    }
  }

  /**
   * Update the webview with current analysis state
   * 
   * Updates the visualization with new analysis results. Can optionally
   * focus on a specific function. If no panel exists, logs a warning.
   * 
   * @param state - Complete analysis state with CFG and all analysis results
   * @param functionName - Optional function name to display (defaults to current or first function)
   */
  async updateVisualization(state: AnalysisState, functionName?: string, isFromSavedState: boolean = false): Promise<void> {
    // #region agent log
    LoggingConfig.raw(`[DEBUG] updateVisualization ENTRY | location:CFGVisualizer.ts:689 | hypothesisId:B | data:${JSON.stringify({functionCount:state.cfg.functions.size,panelCount:this.panels.size,isRecreating:this.isRecreatingPanel,sensitivity:state.taintSensitivity})} | timestamp:${Date.now()}`);
    // #endregion
    /**
     * VISUALIZATION UPDATE ENTRY POINT
     * 
     * Updates all visualization panels with new analysis state.
     * Handles panel recreation if sensitivity changed, and updates webview content.
     */
    LoggingConfig.section('CFGViz', '🔄 updateVisualization CALLED');
    LoggingConfig.raw(`[CFGViz] updateVisualization called with ${state.cfg.functions.size} functions`);
    LoggingConfig.raw(`[CFGViz] State sensitivity: ${state.taintSensitivity || 'not set'}`);
    LoggingConfig.raw(`[CFGViz] State source: ${isFromSavedState ? 'Saved State' : 'Current Analysis'}`);
    LoggingConfig.log('CFGViz', 'updateVisualization called');
    // Store state source for UI display
    (state as any).isFromSavedState = isFromSavedState;
    // Log comprehensive state summary
    LoggingConfig.table('CFGViz', 'State Analysis Summary', {
      'Functions': state.cfg.functions.size,
      'Function Names': Array.from(state.cfg.functions.keys()).join(', '),
      'File States': state.fileStates.size,
      'Vulnerabilities': state.vulnerabilities.size,
      'Liveness Entries': Object.keys(state.liveness).length,
      'RD Entries': Object.keys(state.reachingDefinitions).length,
      'Taint Entries': Object.keys(state.taintAnalysis).length
    });

    /**
     * FUNCTION SELECTION LOGIC
     * 
     * Determines which function to display:
     * 1. Explicitly requested function (if provided)
     * 2. Current function (if set)
     * 3. First function in state (default)
     */
    if (functionName) {
      LoggingConfig.detail('CFGViz', `Requested specific function: ${functionName}`);
      this.currentFunction = functionName;
    } else {
      LoggingConfig.detail('CFGViz', `No specific function requested, using current: ${this.currentFunction || 'none'}`);
    }

    /**
     * STATE STORAGE AND PANEL UPDATE
     * 
     * CRITICAL: Update currentState BEFORE checking panels to ensure
     * panel titles and other state-dependent operations use correct state.
     */
    // CRITICAL FIX: Update currentState BEFORE checking panels
    // This ensures panel titles and other state-dependent operations use the correct state
    this.currentState = state;
    LoggingConfig.raw(`[CFGViz] State stored. Panels count: ${this.panels.size}`);
    LoggingConfig.detail('CFGViz', 'State stored, checking panels...');
    LoggingConfig.detail('CFGViz', `Current state sensitivity: ${state.taintSensitivity || 'precise'}`);

    /**
     * PANEL UPDATE LOOP
     * 
     * Updates all existing panels with new analysis state.
     * CRITICAL: Checks for sensitivity mismatches and recreates panels if needed.
     */
    // Update all existing panels instead of creating new ones
    if (this.panels.size > 0) {
      LoggingConfig.raw(`[CFGViz] Updating ${this.panels.size} existing panel(s)`);
      LoggingConfig.log('CFGViz', `Updating ${this.panels.size} existing panel(s) with new analysis results`);
      // Update all panels
      for (const [panelKey, panel] of this.panels.entries()) {
        LoggingConfig.detail('CFGViz', `Updating panel: ${panelKey}`);
        if (!panel || !panel.webview) {
          // Panel has no webview - likely disposed, skip it
          LoggingConfig.warn('CFGViz', `Panel ${panelKey} has no webview, skipping`);
          continue;
        }
        // Check if panel is disposed (VS Code doesn't expose this directly, but we can check visibility)
        try {
          const isVisible = panel.visible;
          
          /**
           * SENSITIVITY MISMATCH DETECTION AND PANEL RECREATION
           * 
           * CRITICAL: If panel title doesn't match current sensitivity, recreate panel.
           * VS Code doesn't allow runtime title updates, so we must dispose and recreate.
           */
          // CRITICAL FIX: Check if panel needs to be recreated due to title mismatch
          const sensitivity = state.taintSensitivity || 'precise';
          const currentTitle = panel.title;
          // Extract base name from current title or panel key
          const baseName = panelKey.split(':')[0] || 'Workspace';
          const viewType = panelKey.split(':')[1] || 'Viz';
          const newTitle = `${baseName}: ${viewType} [${sensitivity.toUpperCase()}]`;
          
          if (currentTitle !== newTitle) {
            // #region agent log
            LoggingConfig.raw(`[DEBUG] TITLE MISMATCH in updateVisualization | location:CFGVisualizer.ts:781 | hypothesisId:C | data:${JSON.stringify({panelKey,currentTitle,newTitle,isRecreating:this.isRecreatingPanel})} | timestamp:${Date.now()}`);
            // #endregion
            // CRITICAL FIX: Prevent infinite recreation loop
            if (this.isRecreatingPanel) {
              // #region agent log
              LoggingConfig.raw(`[DEBUG] GUARD FLAG ACTIVE - skipping recreation | location:CFGVisualizer.ts:786 | hypothesisId:C | data:${JSON.stringify({panelKey,isRecreating:this.isRecreatingPanel})} | timestamp:${Date.now()}`);
              // #endregion
              LoggingConfig.warn('CFGViz', `Already recreating a panel, skipping recreation of ${panelKey} to prevent infinite loop`);
              continue;
            }
            
            // Sensitivity mismatch - recreate panel with correct title
            LoggingConfig.detail('CFGViz', `Panel title mismatch: "${currentTitle}" vs "${newTitle}"`);
            LoggingConfig.log('CFGViz', `Recreating panel ${panelKey} with correct title`);
            
            // Set guard flag to prevent recursive recreation
            // #region agent log
            LoggingConfig.raw(`[DEBUG] SETTING GUARD FLAG | location:CFGVisualizer.ts:800 | hypothesisId:C | data:${JSON.stringify({panelKey,isRecreatingBefore:this.isRecreatingPanel})} | timestamp:${Date.now()}`);
            // #endregion
            this.isRecreatingPanel = true;
            
            try {
              // Dispose old panel
              panel.dispose();
              this.panels.delete(panelKey);
              
              // Recreate panel with correct title (pass state to ensure correct sensitivity)
              const fullFilename = baseName === 'default' ? undefined : baseName;
              if (this.context) {
                await this.createOrShow(this.context, fullFilename, viewType as 'Viz' | 'Viz/Cfg', state);
              } else {
                // Context not available - cannot recreate panel
                LoggingConfig.error('CFGViz', 'Cannot recreate panel - context not available');
              }
            } finally {
              // Always reset guard flag, even if recreation fails
              // #region agent log
              LoggingConfig.raw(`[DEBUG] RESETTING GUARD FLAG | location:CFGVisualizer.ts:820 | hypothesisId:C | data:${JSON.stringify({panelKey,isRecreatingBefore:this.isRecreatingPanel})} | timestamp:${Date.now()}`);
              // #endregion
              this.isRecreatingPanel = false;
            }
            continue; // Skip updating this panel, it's been recreated
          }
          
          /**
           * PANEL WEBVIEW UPDATE
           * 
           * Panel title matches - update webview with new analysis state.
           */
          this.panel = panel; // Set current panel reference
          await this.updateWebview(panel);
          LoggingConfig.log('CFGViz', `Panel ${panelKey} updated successfully (visible: ${isVisible}, sensitivity: ${sensitivity})`);
        } catch (error) {
          // Panel update failed - likely disposed, remove from tracking
          LoggingConfig.error('CFGViz', `Failed to update panel ${panelKey}`, error);
          // Panel might be disposed, remove it from tracking
          this.panels.delete(panelKey);
        }
      }
    } else {
      // No panels exist yet - state will be used when panel is created
      LoggingConfig.log('CFGViz', 'No panels exist yet, state stored for when panel is created');
    }
    // #region agent log
    LoggingConfig.raw(`[DEBUG] updateVisualization EXIT | location:CFGVisualizer.ts:847 | hypothesisId:B | data:${JSON.stringify({panelCount:this.panels.size,isRecreating:this.isRecreatingPanel})} | timestamp:${Date.now()}`);
    // #endregion
  }

  /**
   * Update webview content
   * @param panel Optional panel to update (defaults to current panel)
   */
  /**
   * Update webview content
   * 
   * Updates the webview HTML with current analysis state and visualization data.
   * Handles data preparation (pre-prepared or on-demand) and HTML generation.
   * 
   * @param panel Optional panel to update (defaults to current panel)
   */
  private async updateWebview(panel?: vscode.WebviewPanel): Promise<void> {
    // #region agent log
    LoggingConfig.raw(`[DEBUG] updateWebview ENTRY | location:CFGVisualizer.ts:865 | hypothesisId:B | data:${JSON.stringify({hasPanel:!!panel,hasCurrentPanel:!!this.panel,panelCount:this.panels.size})} | timestamp:${Date.now()}`);
    // #endregion
    LoggingConfig.raw(`[CFGViz] updateWebview called`);
    LoggingConfig.detail('CFGViz', 'updateWebview called');
    const targetPanel = panel || this.panel;
    if (!targetPanel) {
      // No panel available - cannot update webview
      LoggingConfig.raw(`[CFGViz] ERROR: No panel found, cannot update webview`);
      LoggingConfig.warn('CFGViz', 'No panel, returning');
      return;
    }

    const state = this.currentState;
    if (!state) {
      // No state available - show empty HTML with message
      LoggingConfig.warn('CFGViz', 'No state, showing empty HTML');
      targetPanel.webview.html = this.getEmptyHtml('No analysis state available. Please run "Analyze Workspace" or "Analyze Active File" first.');
      return;
    }

    /**
     * STATE VALIDATION AND VISUALIZATION DATA CHECK
     * 
     * Validates state has functions and checks for pre-prepared visualization data.
     * Pre-prepared data is faster but may need regeneration if sensitivity changed.
     */
    LoggingConfig.detail('CFGViz', `State available, functions: ${state.cfg.functions.size}`);
    LoggingConfig.detail('CFGViz', `State has visualizationData: ${!!state.visualizationData}`);
    if (state.visualizationData) {
      LoggingConfig.detail('CFGViz', `Visualization data functions count: ${state.visualizationData.interconnectedCFGData?.functions?.length || 'N/A'}`);
      LoggingConfig.detail('CFGViz', `Visualization data nodes count: ${state.visualizationData.interconnectedCFGData?.nodes?.length || 'N/A'}`);
      LoggingConfig.detail('CFGViz', `Visualization data edges count: ${state.visualizationData.interconnectedCFGData?.edges?.length || 'N/A'}`);
    }

    // Prefer functions from the active editor's file if available
    let preferredFunction: string | null = null;
    const active = vscode.window.activeTextEditor;
    if (active) {
      const activePath = active.document.uri.fsPath;
      state.fileStates.forEach((fileState: FileAnalysisState, path: string) => {
        if (path === activePath && fileState.functions.length > 0) {
          preferredFunction = fileState.functions[0];
        }
      });
    }

    /**
     * FUNCTION SELECTION AND VALIDATION
     * 
     * Selects function to display based on priority:
     * 1. Preferred function (from active editor's file)
     * 2. Current function (previously selected)
     * 3. First function (default)
     */
    // Check if any functions were found
    if (state.cfg.functions.size === 0) {
      // No functions found - show empty HTML with helpful message
      LoggingConfig.warn('CFGViz', 'No functions in state, showing empty HTML');
      targetPanel.webview.html = this.getEmptyHtml(
        'No functions found in the analysis. Make sure your C++ files contain function definitions and that the analysis completed successfully.'
      );
      return;
    }

    // Get function to display
    let funcCFG: FunctionCFG | null = null;
    if (preferredFunction && state.cfg.functions.has(preferredFunction)) {
      funcCFG = state.cfg.functions.get(preferredFunction)!;
      this.currentFunction = preferredFunction;
      LoggingConfig.detail('CFGViz', `Using preferred function: ${preferredFunction}`);
    } else if (this.currentFunction && state.cfg.functions.has(this.currentFunction)) {
      funcCFG = state.cfg.functions.get(this.currentFunction)!;
      LoggingConfig.detail('CFGViz', `Using current function: ${this.currentFunction}`);
    } else if (state.cfg.functions.size > 0) {
      // Show first function by default
      const firstFunc = Array.from(state.cfg.functions.keys())[0] as string;
      funcCFG = state.cfg.functions.get(firstFunc)!;
      this.currentFunction = firstFunc;
      LoggingConfig.detail('CFGViz', `Using first function: ${firstFunc}`);
    }

    if (!funcCFG) {
      // Function CFG not found - show error message
      LoggingConfig.error('CFGViz', 'Could not find funcCFG, showing empty HTML');
      targetPanel.webview.html = this.getEmptyHtml('Could not find function CFG to display.');
      return;
    }

    /**
     * FUNCTION CFG VALIDATION
     * 
     * Validates function CFG has blocks before proceeding with visualization.
     */
    // Check if function has blocks
    if (funcCFG.blocks.size === 0) {
      // Function has no blocks - likely a parsing issue
      LoggingConfig.warn('CFGViz', `Function has no blocks: ${funcCFG.name}`);
      targetPanel.webview.html = this.getEmptyHtml(
        `Function "${funcCFG.name}" has no basic blocks. This might indicate a parsing issue.`
      );
      return;
    }

    LoggingConfig.log('CFGViz', `Function ${funcCFG.name} has ${funcCFG.blocks.size} blocks`);

    // Use pre-prepared visualization data if available (prepared during analysis)
    // Otherwise, prepare on-demand (fallback for backward compatibility)
    let graphData: any;
    let callGraphData: any;
    let ipaData: any;
    let taintData: any;
    let interconnectedData: any;
    let interProceduralTaintData: any;
    
    // CRITICAL FIX: Check if visualization data needs to be regenerated
    // If sensitivity changed, the visualization data might be stale
    const currentSensitivity = state.taintSensitivity || 'precise';
    const dataSensitivity = (state.visualizationData as any)?.taintSensitivity;
    const hasVisualizationData = !!state.visualizationData;
    const needsRegeneration = hasVisualizationData && (!dataSensitivity || dataSensitivity !== currentSensitivity);
    
    LoggingConfig.raw(`[CFGViz] Checking visualization data: hasData=${hasVisualizationData}, dataSensitivity=${dataSensitivity || 'none'}, currentSensitivity=${currentSensitivity}, needsRegen=${needsRegeneration}`);
    
    /**
     * VISUALIZATION DATA PREPARATION STRATEGY
     * 
     * Uses pre-prepared data from backend if available and sensitivity matches.
     * Otherwise prepares data on-demand (fallback for backward compatibility).
     * CRITICAL: Clears stale data if sensitivity changed to ensure correct visualization.
     */
    if (needsRegeneration) {
      // Sensitivity mismatch - clear stale data and regenerate
      LoggingConfig.raw(`[CFGViz] ⚠️ CLEARING STALE VISUALIZATION DATA: ${dataSensitivity || 'none'} -> ${currentSensitivity}`);
      LoggingConfig.detail('CFGViz', `Visualization data sensitivity mismatch: ${dataSensitivity || 'none'} vs ${currentSensitivity}`);
      LoggingConfig.log('CFGViz', 'Regenerating visualization data with new sensitivity');
      // CRITICAL FIX: Clear old visualization data AND regenerate it immediately
      state.visualizationData = undefined;
      LoggingConfig.detail('CFGViz', 'Cleared old visualization data, will regenerate on-demand');
    } else if (hasVisualizationData) {
      // Using cached data - sensitivity matches
      LoggingConfig.raw(`[CFGViz] ✅ Using cached visualization data (sensitivity matches: ${dataSensitivity})`);
    }
    
    if (state.visualizationData && !needsRegeneration) {
      /**
       * PRE-PREPARED DATA PATH
       * 
       * Uses data prepared during analysis (faster, preferred path).
       * Falls back to on-demand preparation if any data is missing.
       */
      // Use pre-prepared data from backend
      LoggingConfig.detail('CFGViz', 'Using pre-prepared visualization data');
      LoggingConfig.detail('CFGViz', `Visualization data sensitivity: ${(state.visualizationData as any)?.taintSensitivity || 'unknown'}`);
      // CRITICAL FIX: Add null checks for Map.get() calls
      graphData = state.visualizationData.cfgGraphData?.get(funcCFG.name) || null;
      callGraphData = state.visualizationData.callGraphData || null;
      taintData = state.visualizationData.taintData?.get(funcCFG.name) || null;
      interProceduralTaintData = state.visualizationData.interProceduralTaintData?.get(funcCFG.name) || null;
      interconnectedData = state.visualizationData.interconnectedCFGData || null;
      
      // Still need to prepare IPA data (it's function-specific and not stored)
      ipaData = this.prepareIPAData(state, funcCFG.name);
      
      /**
       * FALLBACK: ON-DEMAND DATA PREPARATION
       * 
       * If any pre-prepared data is missing, prepare it on-demand.
       * This ensures visualization works even if backend preparation was incomplete.
       */
      // If data is missing, fall back to on-demand preparation
      if (!graphData) {
        LoggingConfig.detail('CFGViz', 'Pre-prepared graphData missing, preparing on-demand');
        graphData = await this.prepareGraphData(funcCFG, state);
      }
      if (!taintData) {
        LoggingConfig.detail('CFGViz', 'Pre-prepared taintData missing, preparing on-demand');
        taintData = this.prepareTaintData(state, funcCFG.name);
      }
      if (!interProceduralTaintData) {
        LoggingConfig.detail('CFGViz', 'Pre-prepared interProceduralTaintData missing, preparing on-demand');
        interProceduralTaintData = this.prepareInterProceduralTaintData(state, funcCFG.name);
      }
      if (!interconnectedData) {
        LoggingConfig.raw(`[CFGViz] ⚠️ Pre-prepared interconnectedData missing, preparing on-demand with sensitivity: ${state.taintSensitivity}`);
        LoggingConfig.detail('CFGViz', 'Pre-prepared interconnectedData missing, preparing on-demand');
        interconnectedData = this.prepareInterconnectedCFGData(state);
        LoggingConfig.raw(`[CFGViz] ✅ Interconnected data prepared: ${interconnectedData.nodes?.length || 0} nodes, ${interconnectedData.edges?.length || 0} edges`);
      } else {
        LoggingConfig.raw(`[CFGViz] ✅ Using pre-prepared interconnectedData: ${interconnectedData.nodes?.length || 0} nodes, ${interconnectedData.edges?.length || 0} edges, sensitivity: ${interconnectedData.taintSensitivity || 'none'}`);
      }
      if (!callGraphData && state.callGraph) {
        LoggingConfig.detail('CFGViz', 'Pre-prepared callGraphData missing, preparing on-demand');
        callGraphData = this.prepareCallGraphData(state.callGraph, state);
      }
    } else {
      /**
       * ON-DEMAND DATA PREPARATION PATH
       * 
       * Fallback: prepare all data on-demand (backward compatibility).
       * Used when no pre-prepared data exists or sensitivity changed.
       */
      // Fallback: prepare on-demand (backward compatibility)
      LoggingConfig.raw(`[CFGViz] ⚠️ No pre-prepared data, preparing ALL data on-demand with sensitivity: ${state.taintSensitivity}`);
      LoggingConfig.log('CFGViz', 'No pre-prepared data, preparing on-demand');
      graphData = await this.prepareGraphData(funcCFG, state);
      callGraphData = state.callGraph ? this.prepareCallGraphData(state.callGraph, state) : null;
      ipaData = this.prepareIPAData(state, funcCFG.name);
      taintData = this.prepareTaintData(state, funcCFG.name);
      interconnectedData = this.prepareInterconnectedCFGData(state);
      interProceduralTaintData = this.prepareInterProceduralTaintData(state, funcCFG.name);
      LoggingConfig.raw(`[CFGViz] ✅ On-demand preparation complete: interconnectedData has ${interconnectedData.nodes?.length || 0} nodes`);
    }
    
    /**
     * HTML GENERATION AND WEBVIEW UPDATE
     * 
     * Generates HTML content with all visualization data and sets it to webview.
     * Includes comprehensive logging for debugging visualization issues.
     */
    // Only log visualization-specific information (not analysis data)
    LoggingConfig.detail('CFGViz', 'Setting webview HTML with graph data');
    LoggingConfig.table('CFGViz', 'Graph Data Summary', {
      'Function': funcCFG.name,
      'Nodes': graphData.nodes.length,
      'Edges': graphData.edges.length,
      'Has Call Graph': !!callGraphData,
      'Has IPA Data': !!ipaData,
      'Has Taint Data': taintData.totalTaintedVariables > 0 || taintData.totalVulnerabilities > 0,
      'Has Inter-Procedural Taint': interProceduralTaintData.totalInterProceduralTaint > 0,
      'Inter-Procedural Taint Count': interProceduralTaintData.totalInterProceduralTaint
    });

    const htmlContent = this.getWebviewContent(
      graphData,
      state,
      funcCFG.name,
      targetPanel.webview.cspSource,
      callGraphData,
      ipaData,
      taintData,
      interconnectedData,
      interProceduralTaintData
    );

    /**
     * HTML CONTENT VALIDATION AND LOGGING
     * 
     * Logs HTML generation details and checks for potential issues.
     */
    LoggingConfig.detail('CFGViz', `Generated HTML length: ${htmlContent.length}`);
    LoggingConfig.detail('CFGViz', `Number of script tags: ${(htmlContent.match(/<script/g) || []).length}`);
    LoggingConfig.detail('CFGViz', `Number of JSON script tags: ${(htmlContent.match(/<script[^>]*type="application\/json"/g) || []).length}`);
    LoggingConfig.detail('CFGViz', `CSP Source: ${targetPanel.webview.cspSource}`);

    // Log current sensitivity and data counts for debugging
    const sensitivityInState = state.taintSensitivity || 'precise';
    LoggingConfig.subsection('CFGViz', '========== WEBVIEW UPDATE ==========');
    LoggingConfig.detail('CFGViz', `Setting webview HTML with sensitivity: ${sensitivityInState}`);
    LoggingConfig.detail('CFGViz', `State.taintSensitivity value: ${state.taintSensitivity}`);
    LoggingConfig.detail('CFGViz', `State.taintSensitivity type: ${typeof state.taintSensitivity}`);
    LoggingConfig.detail('CFGViz', `State functions count: ${state.cfg.functions.size}`);
    if (interconnectedData) {
      LoggingConfig.detail('CFGViz', `Interconnected CFG functions count: ${interconnectedData.functions?.length || 'N/A'}`);
      LoggingConfig.detail('CFGViz', `Interconnected CFG nodes count: ${interconnectedData.nodes?.length || 'N/A'}`);
      LoggingConfig.detail('CFGViz', `Interconnected CFG edges count: ${interconnectedData.edges?.length || 'N/A'}`);
    }

    /**
     * HTML CONTENT VALIDATION
     * 
     * Checks for potential issues in generated HTML (undefined/null values).
     */
    // Check for any potential issues
    if (htmlContent.includes('undefined')) {
      LoggingConfig.warn('CFGViz', 'WARNING: HTML contains "undefined" - possible template issue');
    }
    if (htmlContent.includes('null')) {
      LoggingConfig.warn('CFGViz', 'WARNING: HTML contains "null" - possible data issue');
    }

    /**
     * SENSITIVITY VERIFICATION
     * 
     * CRITICAL: Verifies interconnected data sensitivity matches state sensitivity.
     * Logs warnings if mismatch detected.
     */
    // CRITICAL FIX: Log interconnected data sensitivity for verification
    if (interconnectedData && interconnectedData.taintSensitivity) {
      LoggingConfig.detail('CFGViz', `Interconnected data sensitivity: ${interconnectedData.taintSensitivity}`);
      LoggingConfig.detail('CFGViz', `Sensitivity match: ${sensitivityInState === interconnectedData.taintSensitivity}`);
      if (sensitivityInState !== interconnectedData.taintSensitivity) {
        LoggingConfig.warn('CFGViz', `Sensitivity mismatch in interconnected data! State: ${sensitivityInState}, Data: ${interconnectedData.taintSensitivity}`);
      }
    } else {
      LoggingConfig.warn('CFGViz', 'Interconnected data missing sensitivity metadata!');
    }

    /**
     * WEBVIEW HTML SETTING
     * 
     * Sets HTML content to webview, forcing VS Code to reload the webview.
     * This triggers JavaScript re-initialization with new data.
     */
    // Force webview refresh by setting HTML (this should reload the webview completely)
    // Setting webview.html to a new value forces VS Code to reload the webview
    LoggingConfig.raw(`[CFGViz] ✅ SETTING WEBVIEW HTML - Sensitivity: ${state.taintSensitivity}, Functions: ${state.cfg.functions.size}, HTML Length: ${htmlContent.length}`);
    LoggingConfig.detail('CFGViz', `Setting webview HTML with interconnected data sensitivity: ${interconnectedData?.taintSensitivity || 'not set'}`);
    targetPanel.webview.html = htmlContent;
    LoggingConfig.raw(`[CFGViz] ✅ WEBVIEW HTML SET SUCCESSFULLY`);
    LoggingConfig.detail('CFGViz', 'Webview HTML set - webview should reload with new data');
    LoggingConfig.log('CFGViz', 'Webview HTML set successfully');
    LoggingConfig.detail('CFGViz', `Panel visibility state: ${targetPanel.visible}`);
    
    /**
     * PENDING RE-ANALYSIS COMPLETION
     * 
     * CRITICAL: If there's a pending re-analysis for this panel, send success message now.
     * This ensures "Analysis complete" only appears after visualization is actually updated.
     * Checks all pending re-analyses and sends success for any that match this panel.
     */
    // CRITICAL FIX: If there's a pending re-analysis for this panel, send success message now
    // This ensures "Analysis complete" only appears after visualization is actually updated
    // Check all pending re-analyses and send success for any that match this panel
    const pendingKeysToRemove: string[] = [];
    for (const [pendingPanelKey, pendingPanel] of this.pendingReAnalyses.entries()) {
      if (pendingPanel === targetPanel) {
        LoggingConfig.raw(`[CFGViz] [RE-ANALYSIS] ✅ Visualization updated for panel ${pendingPanelKey}, sending success message`);
        try {
          pendingPanel.webview.postMessage({ type: 'reAnalyzeResult', success: true });
          LoggingConfig.raw(`[CFGViz] [RE-ANALYSIS] ✅ Success message sent to panel ${pendingPanelKey}`);
          pendingKeysToRemove.push(pendingPanelKey);
        } catch (error) {
          // Panel might be disposed - remove from pending anyway
          LoggingConfig.raw(`[CFGViz] [RE-ANALYSIS] ❌ ERROR sending success message: ${error}`);
          LoggingConfig.error('CFGViz', 'Error sending success message to panel', error);
          // Panel might be disposed, remove it anyway
          pendingKeysToRemove.push(pendingPanelKey);
        }
      }
    }
    // Remove completed pending re-analyses
    pendingKeysToRemove.forEach(key => this.pendingReAnalyses.delete(key));
    LoggingConfig.detail('CFGViz', `Panel active state: ${targetPanel.active}`);
    LoggingConfig.detail('CFGViz', `Webview reloaded - JavaScript will re-initialize with new data (sensitivity: ${sensitivityInState})`);
  }

  /**
   * Get blocks in topological order (academic CFG standard)
   * Entry block first, then all other blocks in BFS order, Exit block last
   */
  private getTopologicalOrder(funcCFG: FunctionCFG): string[] {
    const ordered: string[] = [];
    const visited = new Set<string>();
    const queue: string[] = [];

    // Find entry block
    let entryBlockId = funcCFG.entry;
    if (!entryBlockId && funcCFG.blocks.size > 0) {
      // Fallback: find block with no predecessors
      for (const [id, block] of funcCFG.blocks) {
        if (block.predecessors.length === 0) {
          entryBlockId = id;
          break;
        }
      }
    }

    // Start BFS from entry block
    if (entryBlockId) {
      queue.push(entryBlockId);
      visited.add(entryBlockId);
      ordered.push(entryBlockId);

      while (queue.length > 0) {
        const current = queue.shift()!;
        const block = funcCFG.blocks.get(current);
        
        if (block) {
          // Add successors to queue in a deterministic order
          const successors = [...block.successors].sort();
          for (const succId of successors) {
            if (!visited.has(succId)) {
              visited.add(succId);
              queue.push(succId);
              
              // Add non-exit blocks to ordered list
              const succBlock = funcCFG.blocks.get(succId);
              if (succBlock && !succBlock.label.includes('Exit')) {
                ordered.push(succId);
              }
            }
          }
        }
      }
    }

    // Add any unvisited blocks (shouldn't happen in well-formed CFG)
    for (const [id, block] of funcCFG.blocks) {
      if (!visited.has(id)) {
        ordered.push(id);
      }
    }

    // Ensure exit block is last
    const exitBlockId = funcCFG.exit;
    if (exitBlockId && ordered.includes(exitBlockId)) {
      // Remove exit block and re-add at end
      const index = ordered.indexOf(exitBlockId);
      ordered.splice(index, 1);
    }
    if (exitBlockId) {
      ordered.push(exitBlockId);
    }

    // Log topological order (verbose level for debugging)
    LoggingConfig.verbose('CFGViz', `Topological order for ${funcCFG.name}: [${ordered.join(', ')}]`);
    return ordered;
  }

  /**
   * Prepare graph data for a single function CFG visualization
   * 
   * Converts a FunctionCFG into vis-network compatible format with nodes and edges.
   * Includes taint analysis highlighting, vulnerability attack paths, liveness info,
   * and reaching definitions data.
   * 
   * @param funcCFG - Function CFG to visualize
   * @param state - Complete analysis state for accessing analysis results
   * @returns Graph data object with nodes and edges arrays
   */
  private async prepareGraphData(funcCFG: FunctionCFG, state: AnalysisState): Promise<any> {
    // ============================================================
    // COMPREHENSIVE LOGGING: CFG Tab Data Preparation
    // ============================================================
    LoggingConfig.section('CFGViz', `PREPARING CFG DATA: ${funcCFG.name}`);
    LoggingConfig.log('CFGViz', `Function: ${funcCFG.name}`);
    LoggingConfig.log('CFGViz', `Total Blocks: ${funcCFG.blocks.size}`);
    LoggingConfig.log('CFGViz', `Entry Block: ${funcCFG.entry}`);
    LoggingConfig.log('CFGViz', `Exit Block: ${funcCFG.exit}`);
    LoggingConfig.log('CFGViz', `Parameters: ${funcCFG.parameters?.join(', ') || 'none'}`);
    LoggingConfig.log('CFGViz', `Taint Sensitivity: ${state.taintSensitivity || 'precise'}`);
    
    const nodes: any[] = [];
    const edges: any[] = [];

    // Get the file path for this function (for double-click navigation)
    const filePath = this.getFilePathForFunction(state, funcCFG.name);
    LoggingConfig.detail('CFGViz', `File Path: ${filePath || 'unknown'}`);

    // Get taint analysis for this function
    // Taint analysis results contain information about which variables are tainted
    // and where taint propagates through the CFG
    const taintInfo = state.taintAnalysis.get(funcCFG.name) || [];
    const taintedVars = new Set<string>(); // Track all tainted variable names
    const taintedBlocks = new Set<string>(); // Track blocks that contain tainted variables
    const taintByBlock = new Map<string, Set<string>>(); // blockId -> Set of tainted variables
    
    LoggingConfig.subsection('VizTaint', 'Taint Analysis Data');
    LoggingConfig.log('VizTaint', `Total Taint Entries: ${taintInfo.length}`);
    
    // Process each taint entry to build taint tracking structures
    // This allows us to highlight tainted blocks in the visualization
    taintInfo.forEach((taint: TaintInfo, index: number) => {
      if (taint.tainted) {
        taintedVars.add(taint.variable);
        LoggingConfig.detail('VizTaint', `Taint[${index}]: Variable="${taint.variable}", Labels=[${taint.labels?.join(', ') || 'none'}], Source="${taint.source || 'unknown'}"`);
        
        // Mark blocks in propagation path as tainted
        // Propagation path format: "functionName:blockId" or "blockId"
        // We extract the blockId to mark blocks that taint flows through
        if (taint.propagationPath && taint.propagationPath.length > 0) {
          LoggingConfig.verbose('VizTaint', `  Propagation Path: [${taint.propagationPath.join(' -> ')}]`);
          taint.propagationPath.forEach((path: string) => {
            // Extract block ID from path (format: "functionName:blockId" or just "blockId")
            const blockId = path.split(':')[0];
            taintedBlocks.add(blockId);
          });
        }
        // Also mark the source location block as tainted
        // Source location is where taint was first introduced (e.g., scanf call)
        if (taint.sourceLocation?.blockId) {
          LoggingConfig.detail('VizTaint', `  Source Location: Block=${taint.sourceLocation.blockId}, Line=${taint.sourceLocation.range?.start?.line || 'unknown'}`);
          taintedBlocks.add(taint.sourceLocation.blockId);
          // Track which variables are tainted in each block
          if (!taintByBlock.has(taint.sourceLocation.blockId)) {
            taintByBlock.set(taint.sourceLocation.blockId, new Set());
          }
          taintByBlock.get(taint.sourceLocation.blockId)!.add(taint.variable);
        }
      }
    });
    
    LoggingConfig.log('VizTaint', `Total Tainted Variables: ${taintedVars.size} [${Array.from(taintedVars).join(', ')}]`);
    LoggingConfig.log('VizTaint', `Total Tainted Blocks: ${taintedBlocks.size} [${Array.from(taintedBlocks).join(', ')}]`);

    // Get vulnerabilities for this function
    const vulnerabilities = state.vulnerabilities.get(funcCFG.name) || [];
    const attackPaths = new Map<string, any>(); // vulnId -> path info
    
    LoggingConfig.subsection('VulnerabilityDetection', 'Vulnerabilities');
    LoggingConfig.log('VulnerabilityDetection', `Total Vulnerabilities: ${vulnerabilities.length}`);
    
    vulnerabilities.forEach((vuln: Vulnerability, index: number) => {
      LoggingConfig.detail('VulnerabilityDetection', `Vuln[${index}]: Type="${vuln.type}", Severity="${vuln.severity}", ID="${vuln.id}"`);
      LoggingConfig.verbose('VulnerabilityDetection', `  Description: ${vuln.description}`);
      if (vuln.sourceToSinkPath && vuln.sourceToSinkPath.length > 0) {
        LoggingConfig.detail('VulnerabilityDetection', `  Attack Path: [${vuln.sourceToSinkPath.join(' -> ')}]`);
        const pathBlocks = vuln.sourceToSinkPath.map(p => p.split(':')[0]);
        attackPaths.set(vuln.id, {
          blocks: pathBlocks,
          vulnerability: vuln,
          edges: this.buildPathEdges(pathBlocks, funcCFG)
        });
      }
    });

    // Reorder blocks in topological order (academic CFG standard)
    const orderedBlockIds = this.getTopologicalOrder(funcCFG);

    for (const blockId of orderedBlockIds) {
      const block = funcCFG.blocks.get(blockId);
      if (!block) continue;
      // Get analysis info
      /**
       * ANALYSIS DATA LOOKUP
       * 
       * Retrieves liveness and reaching definitions data for this block.
       * Used to populate node tooltips and visualization details.
       */
      const livenessKey = `${funcCFG.name}_${blockId}`;
      const liveness = state.liveness.get(livenessKey);
      LoggingConfig.verbose('CFGViz', `Looking up liveness for key: ${livenessKey}, found: ${!!liveness}`);
      if (liveness) {
        LoggingConfig.verbose('CFGViz', `Liveness data: in=[${Array.from(liveness.in).join(', ')}], out=[${Array.from(liveness.out).join(', ')}]`);
      }
      const rdKey = `${funcCFG.name}_${blockId}`;
      const rd = state.reachingDefinitions.get(rdKey);
      
      LoggingConfig.verbose('CFGViz', `Preparing node for block ${blockId}, label: ${block.label}, statements: ${block.statements.length}`);

      // Find tainted variables used/defined in this block
      // This identifies which variables in this block are tainted, either by:
      // 1. Being defined from a tainted source (e.g., x = tainted_var)
      // 2. Being used in a tainted context (e.g., printf(tainted_var))
      const blockTaintedVars: string[] = [];
      const blockTaintInfos: TaintInfo[] = []; // Track full TaintInfo objects for taint type detection
      
      block.statements.forEach(stmt => {
        // Check variables defined in this statement (left-hand side of assignments)
        // If a variable is assigned from a tainted source, it becomes tainted
        stmt.variables?.defined.forEach(v => {
          if (taintedVars.has(v)) {
            blockTaintedVars.push(v);
            // Find the TaintInfo for this variable
            const varTaintInfos = taintInfo.filter((t: TaintInfo) => t.variable === v && t.tainted);
            blockTaintInfos.push(...varTaintInfos);
          }
        });
        // Check variables used in this statement (right-hand side of assignments, function args)
        // If a tainted variable is used, the block is marked as containing taint
        stmt.variables?.used.forEach(v => {
          if (taintedVars.has(v)) {
            blockTaintedVars.push(v);
            // Find the TaintInfo for this variable
            const varTaintInfos = taintInfo.filter((t: TaintInfo) => t.variable === v && t.tainted);
            blockTaintInfos.push(...varTaintInfos);
          }
        });
      });
      
      // CRITICAL FIX: Check for synthetic block variables (__block_{blockId}__)
      // These represent blocks with return statements but no variables
      const syntheticVarName = `__block_${blockId}__`;
      if (taintedVars.has(syntheticVarName)) {
        const syntheticTaintInfos = taintInfo.filter((t: TaintInfo) => 
          t.variable === syntheticVarName && t.tainted
        );
        if (syntheticTaintInfos.length > 0) {
          blockTaintedVars.push(syntheticVarName);
          blockTaintInfos.push(...syntheticTaintInfos);
        }
      }
      
      // If block has tainted variables, mark it as tainted
      // This ensures blocks are highlighted in red in the visualization
      if (blockTaintedVars.length > 0) {
        taintedBlocks.add(blockId);
      }
      
      // Also check if this block is a source location for any taint
      // Source locations are where taint is introduced (e.g., scanf, fgets)
      // This ensures source blocks are always marked as tainted, even if they don't
      // explicitly use/define tainted variables in their statements
      if (taintByBlock.has(blockId)) {
        taintedBlocks.add(blockId);
        const blockTaintVars = taintByBlock.get(blockId)!;
        // Merge taint variables from source location tracking
        blockTaintVars.forEach(v => {
          if (!blockTaintedVars.includes(v)) {
            blockTaintedVars.push(v);
            // Find the TaintInfo for this variable
            const varTaintInfos = taintInfo.filter((t: TaintInfo) => t.variable === v && t.tainted);
            blockTaintInfos.push(...varTaintInfos);
          }
        });
      }
      
      // Determine taint type for proper coloring
      // Check for data-flow taint (explicit propagation) and control-dependent taint (implicit flow)
      // Data-flow taint: Any label that is NOT CONTROL_DEPENDENT (USER_INPUT, FILE_CONTENT, DERIVED, etc.)
      // Control-dependent taint: Explicitly marked with CONTROL_DEPENDENT label
      let hasDataFlowTaint = false;
      let hasControlDependentTaint = false;
      
      // Check each TaintInfo to determine taint types
      for (const taintInfo of blockTaintInfos) {
        if (taintInfo.labels && taintInfo.labels.length > 0) {
          // Check if this taint has any data-flow labels (any label that is not CONTROL_DEPENDENT)
          if (taintInfo.labels.some(l => l !== TaintLabel.CONTROL_DEPENDENT)) {
            hasDataFlowTaint = true;
          }
          // Check if this taint has control-dependent label
          if (taintInfo.labels.includes(TaintLabel.CONTROL_DEPENDENT)) {
            hasControlDependentTaint = true;
          }
        }
      }
      
      // CRITICAL FIX: Detect synthetic taint separately (blocks with return statements but no variables)
      let hasSyntheticTaint = false;
      if (blockTaintInfos.some((t: TaintInfo) => t.variable === syntheticVarName)) {
        hasSyntheticTaint = true;
        // Synthetic taint is a type of control-dependent taint, but we'll mark it separately for coloring
        hasControlDependentTaint = true;
        LoggingConfig.raw(`[VizColors] Block ${blockId} detected as synthetic taint via variable ${syntheticVarName}`);
      }
      
      // CRITICAL FIX: Also check if block is control-dependent by checking predecessors
      // This handles cases like return statements that don't define/use variables
      // but are still control-dependent (e.g., return 1; in a branch)
      if (!hasControlDependentTaint && block.predecessors.length > 0) {
        // Check if any predecessor is a conditional block with tainted condition
        for (const predId of block.predecessors) {
          const predBlock = funcCFG.blocks.get(predId);
          if (predBlock) {
            // Check if predecessor is conditional (has multiple successors = branching)
            const isConditional = predBlock.successors.length > 1;
            if (isConditional) {
              // Check if predecessor uses tainted variables in its condition
              const predHasTaintedCondition = predBlock.statements.some(stmt => {
                const stmtText = stmt.text || stmt.content || '';
                // Check if statement contains comparison operators (conditional)
                const hasComparison = /[><=!]=?/.test(stmtText) || 
                                     stmtText.includes('&&') || 
                                     stmtText.includes('||') ||
                                     stmt.type === StatementType.CONDITIONAL ||
                                     stmt.type === StatementType.LOOP;
                if (hasComparison) {
                  // Check if any variables used in this condition are tainted
                  return stmt.variables?.used.some(v => taintedVars.has(v)) || false;
                }
                return false;
              });
              
              if (predHasTaintedCondition) {
                // This block is control-dependent!
                hasControlDependentTaint = true;
                LoggingConfig.raw(`[VizColors] Block ${blockId} detected as control-dependent via predecessor ${predId}`);
                break;
              }
            }
          }
        }
      }
      
      // COMPREHENSIVE LOGGING: Node Color Decision
      LoggingConfig.subsection('VizColors', `Block ${blockId} Color Decision`);
      LoggingConfig.detail('VizColors', `Block ID: ${blockId}`);
      LoggingConfig.detail('VizColors', `Block Label: ${block.label || 'unnamed'}`);
      LoggingConfig.detail('VizColors', `Statements: ${block.statements.length}`);
      LoggingConfig.detail('VizColors', `Tainted Vars in Block: [${blockTaintedVars.join(', ')}]`);
      LoggingConfig.detail('VizColors', `TaintInfo Count: ${blockTaintInfos.length}`);
      LoggingConfig.detail('VizColors', `Has Data-Flow Taint: ${hasDataFlowTaint}`);
      LoggingConfig.detail('VizColors', `Has Control-Dependent Taint: ${hasControlDependentTaint}`);
      
      // Determine node color based on taint type
      // Color scheme: Yellow (data-flow), Orange (control-dependent), Purple (mixed), Magenta (synthetic), Light blue (normal)
      // CRITICAL FIX: Add synthetic taint color (magenta) for blocks with return statements but no variables
      let nodeColor: string;
      let nodeBorder: string;
      let colorReason: string;
      
      // CRITICAL FIX: Check for synthetic taint FIRST (it's a special case of control-dependent)
      if (hasSyntheticTaint && !hasDataFlowTaint) {
        // Magenta: Synthetic taint only (return statements without variables)
        nodeColor = '#c77dff';  // Magenta/Purple-pink
        nodeBorder = '#9d4edd';  // Dark purple
        colorReason = 'synthetic (return statement without variables)';
      } else if (hasDataFlowTaint && hasControlDependentTaint) {
        // Purple: Mixed taint (both data-flow and control-dependent)
        nodeColor = '#9d4edd';
        nodeBorder = '#7b2cbf';
        colorReason = 'PURPLE (Mixed: Data-flow + Control-dependent)';
      } else if (hasControlDependentTaint) {
        // Orange: Control-dependent only (implicit flow)
        nodeColor = '#ffa94d';
        nodeBorder = '#ff8800';
        colorReason = 'ORANGE (Control-dependent only)';
      } else if (hasDataFlowTaint) {
        // Yellow: Data-flow only (explicit propagation)
        nodeColor = '#ffd60a';
        nodeBorder = '#ffc300';
        colorReason = 'YELLOW (Data-flow only)';
      } else {
        // Normal block (no taint) - ALWAYS use this for blocks without explicit labels
        // CRITICAL FIX: Removed fallback that assigned yellow to blocks with tainted vars but no labels
        // This ensures we only have 4 colors total
        nodeColor = '#e8f4f8';
        nodeBorder = '#2e7d32';
        colorReason = 'LIGHT BLUE (Normal - no taint)';
      }
      
      LoggingConfig.log('VizColors', `  -> Color Decision: ${colorReason}`);
      LoggingConfig.log('VizColors', `  -> Background: ${nodeColor}, Border: ${nodeBorder}`);
      
      const isTainted = blockTaintedVars.length > 0 || hasDataFlowTaint || hasControlDependentTaint;

      // Check if this block is part of any attack path
      const blockVulnerabilities: Vulnerability[] = [];
      let pathIndex = -1;
      let pathId = '';
      
      attackPaths.forEach((pathInfo, vulnId) => {
        const index = pathInfo.blocks.indexOf(blockId);
        if (index !== -1) {
          blockVulnerabilities.push(pathInfo.vulnerability);
          if (pathIndex === -1 || index < pathIndex) {
            pathIndex = index;
            pathId = vulnId;
          }
        }
      });

      // Generate descriptive block name
      const descriptiveName = this.generateDescriptiveBlockName(block, blockId);
      const blockLabel = block.label || (block.isEntry ? 'Entry' : block.isExit ? 'Exit' : `B${blockId}`);
      // Clean, natural label - just the descriptive name (function/block info in hover)
      const nodeLabel = descriptiveName;
      // Context info for hover text
      const hoverContext = `${funcCFG.name} :: ${blockLabel}`;
      
      // Get the start line for this block (for double-click navigation)
      const startLine = this.getBlockStartLine(block);
      
      // Build tooltip with taint type information
      // CRITICAL FIX: Make tooltip consistent with coloring logic - match the exact same order and conditions as color logic
      let taintTypeText = '';
      // Match the exact same logic as color determination to ensure consistency
      if (hasSyntheticTaint && !hasDataFlowTaint) {
        taintTypeText = '\nTaint Type: Synthetic (Control-dependent - return statement without variables)';
      } else if (hasDataFlowTaint && hasControlDependentTaint) {
        taintTypeText = '\nTaint Type: Mixed (Data-flow + Control-dependent)';
      } else if (hasControlDependentTaint) {
        taintTypeText = '\nTaint Type: Control-dependent (Implicit Flow)';
      } else if (hasDataFlowTaint) {
        taintTypeText = '\nTaint Type: Data-flow (Explicit Flow)';
      }
      // Normal blocks (no taint) show no taint type text
      
      // Create node with proper color configuration
      const node = {
        id: blockId,
        label: nodeLabel,
        // Include context for hover text display in webview
        hoverContext: hoverContext,
        blockLabel: blockLabel,
        statements: block.statements.map(s => ({
          text: s.text,
          type: s.type,
          variables: s.variables
        })),
        liveness: liveness ? {
          in: Array.from(liveness.in),
          out: Array.from(liveness.out)
        } : null,
        reachingDefinitions: rd ? {
          in: await this.serializeRD(rd.in, state),
          out: await this.serializeRD(rd.out, state)
        } : null,
        taintInfo: {
          isTainted: isTainted,
          hasDataFlowTaint: hasDataFlowTaint,
          hasControlDependentTaint: hasControlDependentTaint,
          taintedVariables: Array.from(new Set(blockTaintedVars)),
          allTaintedVars: Array.from(taintedVars)
        },
        attackPath: pathId ? {
          pathId,
          index: pathIndex,
          isSource: pathIndex === 0,
          isSink: pathIndex === (attackPaths.get(pathId)?.blocks.length || 0) - 1,
          vulnerabilities: blockVulnerabilities
        } : null,
        // Navigation info for double-click to open file at block location
        filePath: filePath,
        startLine: startLine,
        functionName: funcCFG.name,
        // Color configuration based on taint type
        color: {
          background: nodeColor,
          border: nodeBorder,
          highlight: {
            background: isTainted ? '#a29bfe' : '#74b9ff',
            border: isTainted ? '#6c5ce7' : '#0984e3'
          }
        },
        // Hover tooltip with context info and taint type
        title: `${hoverContext}\n${block.statements.length} statement(s)${blockTaintedVars.length > 0 ? '\n⚠ Tainted: ' + Array.from(new Set(blockTaintedVars)).join(', ') : ''}${taintTypeText}${startLine ? '\nLine ' + startLine : ''}\n\nDouble-click to open in editor`
      };
      nodes.push(node);

      // Create edges representing control flow between blocks
      // Each edge connects a block to its successor(s) in the CFG
      block.successors.forEach(succId => {
        // Check if this edge is part of an attack path
        // Attack paths show the flow of tainted data from source to sink
        // These edges are highlighted with colors based on vulnerability severity
        let isAttackPathEdge = false;
        let pathColor = '';
        
        // Check all attack paths to see if this edge is part of any vulnerability path
        attackPaths.forEach((pathInfo, vulnId) => {
          const fromIndex = pathInfo.blocks.indexOf(blockId);
          const toIndex = pathInfo.blocks.indexOf(succId);
          // Edge is part of attack path if both blocks are consecutive in the path
          // This means tainted data flows along this edge
          if (fromIndex !== -1 && toIndex !== -1 && toIndex === fromIndex + 1) {
            isAttackPathEdge = true;
            // Color based on vulnerability severity for visual emphasis
            // Critical vulnerabilities get the most attention (bright red)
            const vuln = pathInfo.vulnerability;
            if (vuln.severity === 'Critical') pathColor = '#ff0000';
            else if (vuln.severity === 'High') pathColor = '#ff6b6b';
            else if (vuln.severity === 'Medium') pathColor = '#ffa500';
            else pathColor = '#ffd700'; // Low severity
          }
        });

        edges.push({
          from: blockId,
          to: succId,
          id: `${blockId}-${succId}`,
          arrows: 'to',
          color: isAttackPathEdge ? { color: pathColor, highlight: pathColor } : undefined,
          width: isAttackPathEdge ? 3 : 1,
          dashes: false
        });
      });
    }

    // ============================================================
    // COMPREHENSIVE LOGGING: CFG Tab Data Summary
    // ============================================================
    LoggingConfig.section('CFGViz', `CFG DATA SUMMARY: ${funcCFG.name}`);
    LoggingConfig.log('CFGViz', `Total Nodes Created: ${nodes.length}`);
    LoggingConfig.log('CFGViz', `Total Edges Created: ${edges.length}`);
    
    // Node color statistics
    const colorStats = {
      yellow: nodes.filter(n => n.color?.background === '#ffd60a').length,
      orange: nodes.filter(n => n.color?.background === '#ffa94d').length,
      purple: nodes.filter(n => n.color?.background === '#9d4edd').length,
      lightBlue: nodes.filter(n => n.color?.background === '#e8f4f8').length
    };
    LoggingConfig.table('VizColors', 'Node Color Distribution', {
      'Yellow (Data-flow)': colorStats.yellow,
      'Orange (Control-dependent)': colorStats.orange,
      'Purple (Mixed)': colorStats.purple,
      'Light Blue (Normal)': colorStats.lightBlue,
      'Total Tainted': colorStats.yellow + colorStats.orange + colorStats.purple
    });
    
    // Log each node for test validation
    LoggingConfig.subsection('VizNodes', 'All Nodes Detail');
    nodes.forEach((node, idx) => {
      LoggingConfig.detail('VizNodes', `Node[${idx}]: id="${node.id}", label="${node.label}", color="${node.color?.background}", tainted=${node.taintInfo?.isTainted}`);
      if (node.taintInfo?.isTainted) {
        LoggingConfig.verbose('VizNodes', `  Tainted Vars: [${node.taintInfo.taintedVariables?.join(', ')}]`);
        LoggingConfig.verbose('VizNodes', `  Data-flow: ${node.taintInfo.hasDataFlowTaint}, Control-dep: ${node.taintInfo.hasControlDependentTaint}`);
      }
    });
    
    // Log each edge for test validation
    LoggingConfig.subsection('VizEdges', 'All Edges Detail');
    edges.forEach((edge, idx) => {
      LoggingConfig.detail('VizEdges', `Edge[${idx}]: ${edge.from} -> ${edge.to}${edge.color ? ', color=' + (edge.color.color || edge.color) : ''}`);
    });
    
    LoggingConfig.log('CFGViz', `Attack Paths: ${attackPaths.size}`);
    attackPaths.forEach((info, vulnId) => {
      LoggingConfig.detail('VulnerabilityDetection', `Attack Path "${vulnId}": [${info.blocks.join(' -> ')}]`);
    });
    
    /**
     * GRAPH DATA PREPARATION COMPLETE
     * 
     * Summary of prepared graph data for this function.
     */
    LoggingConfig.log('CFGViz', `Prepared graph data: ${nodes.length} nodes, ${edges.length} edges for function ${funcCFG.name}`);

    return { 
      nodes, 
      edges, 
      taintSummary: taintInfo,
      attackPaths: Array.from(attackPaths.entries()).map(([id, info]: [string, any]) => ({
        id,
        blocks: info.blocks,
        vulnerability: info.vulnerability,
        edges: info.edges
      }))
    };
  }

  /**
   * Get the file path for a given function from the analysis state
   * 
   * @param state - Analysis state containing fileStates
   * @param funcName - Name of the function to look up
   * @returns File path or undefined if not found
   */
  private getFilePathForFunction(state: AnalysisState, funcName: string): string | undefined {
    for (const [filePath, fileState] of state.fileStates) {
      if (fileState.functions.includes(funcName)) {
        return filePath;
      }
    }
    return undefined;
  }

  /**
   * Get the starting line number for a block
   * 
   * @param block - The basic block
   * @returns Starting line number or undefined if not available
   */
  private getBlockStartLine(block: BasicBlock): number | undefined {
    // First try block's range
    if (block.range?.start?.line) {
      return block.range.start.line;
    }
    // Fall back to first statement's range
    if (block.statements.length > 0 && block.statements[0].range?.start?.line) {
      return block.statements[0].range.start.line;
    }
    return undefined;
  }

  /**
   * Build path edges from block sequence
   */
  private buildPathEdges(blocks: string[], funcCFG: FunctionCFG): Array<{from: string, to: string}> {
    const pathEdges: Array<{from: string, to: string}> = [];
    for (let i = 0; i < blocks.length - 1; i++) {
      const fromBlock = funcCFG.blocks.get(blocks[i]);
      const toBlock = blocks[i + 1];
      if (fromBlock && fromBlock.successors.includes(toBlock)) {
        pathEdges.push({ from: blocks[i], to: toBlock });
      }
    }
    return pathEdges;
  }

  /**
   * Prepare interconnected CFG data combining all functions
   * 
   * Creates a unified graph showing all functions with three edge types:
   * - Green: Control flow edges (within functions)
   * - Blue: Function call edges (between functions)
   * - Orange: Data flow edges (reaching definitions)
   * 
   * This is the main visualization for inter-procedural analysis.
   * 
   * @param state - Complete analysis state with CFG, call graph, and reaching definitions
   * @returns Graph data object with nodes, edges, functions list, and groups
   */
  private prepareInterconnectedCFGData(state: AnalysisState): any {
    // ============================================================
    // COMPREHENSIVE LOGGING: Interconnected CFG Data Preparation
    // ============================================================
    LoggingConfig.section('InterCFGViz', 'PREPARING INTERCONNECTED CFG DATA');
    LoggingConfig.log('InterCFGViz', `Total Functions: ${state.cfg.functions.size}`);
    LoggingConfig.log('InterCFGViz', `Taint Sensitivity: ${state.taintSensitivity || 'precise'}`);
    
    const nodes: any[] = [];
    const edges: any[] = [];
    const functionGroups = new Map<string, number>();
    let groupId = 0;

    // Extract call graph data
    const callGraphData = state.callGraph;
    LoggingConfig.log('InterCFGViz', `Call Graph Available: ${!!callGraphData}`);
    if (callGraphData) {
      LoggingConfig.detail('CallGraphViz', `Call Graph Functions: ${callGraphData.functions?.size || 0}`);
      LoggingConfig.detail('CallGraphViz', `Call Graph Edges: ${callGraphData.callsFrom?.size || 0} source functions`);
    }

    // Create nodes for each basic block in each function
    state.cfg.functions.forEach((funcCFG, funcName) => {
      LoggingConfig.subsection('InterCFGViz', `Function: ${funcName}`);
      LoggingConfig.log('InterCFGViz', `  Blocks: ${funcCFG.blocks.size}, Entry: ${funcCFG.entry}, Exit: ${funcCFG.exit}`);
      functionGroups.set(funcName, groupId++);
      
      // Get the file path for this function (for double-click navigation)
      const filePath = this.getFilePathForFunction(state, funcName);
      
      funcCFG.blocks.forEach((block, blockId) => {
        const nodeId = `${funcName}_${blockId}`;
        
        // Generate descriptive block name from statements
        const descriptiveName = this.generateDescriptiveBlockName(block, blockId);
        
        // Create human-readable block label
        let blockLabel: string;
        if (block.label && block.label.trim().length > 0) {
          // Use the block's label (e.g., "Entry", "Exit", "B1", "B2")
          blockLabel = block.label.trim();
        } else if (block.isEntry) {
          blockLabel = 'Entry';
        } else if (block.isExit) {
          blockLabel = 'Exit';
        } else {
          // Fallback: use block ID or generate a descriptive name
          blockLabel = `B${blockId}`;
        }
        
        // Clean, natural label - just the descriptive name (function/block info in hover text)
        const nodeLabel = descriptiveName;
        
        // Check if this block has tainted variables
        const funcTaint = state.taintAnalysis.get(funcName) || [];
        // Get all taint info for variables defined in this block
        const blockTaintedVars: TaintInfo[] = [];
        block.statements.forEach(stmt => {
          stmt.variables?.defined.forEach(varName => {
            const varTaintInfos = funcTaint.filter((t: TaintInfo) => t.variable === varName && t.tainted);
            blockTaintedVars.push(...varTaintInfos);
          });
        });
        
        // Check for data-flow taint and control-dependent taint separately
        // Data-flow taint: Any label that is NOT CONTROL_DEPENDENT (USER_INPUT, FILE_CONTENT, DERIVED, etc.)
        // Control-dependent taint: Explicitly marked with CONTROL_DEPENDENT label
        let hasDataFlowTaint = false;
        let hasControlDependentTaint = false;
        
        // Check each TaintInfo to determine taint types
        for (const taintInfo of blockTaintedVars) {
          if (taintInfo.labels && taintInfo.labels.length > 0) {
            // Check if this taint has any data-flow labels (any label that is not CONTROL_DEPENDENT)
            if (taintInfo.labels.some(l => l !== TaintLabel.CONTROL_DEPENDENT)) {
              hasDataFlowTaint = true;
            }
            // Check if this taint has control-dependent label
            if (taintInfo.labels.includes(TaintLabel.CONTROL_DEPENDENT)) {
              hasControlDependentTaint = true;
            }
          }
        }
        
        // CRITICAL FIX: Check for synthetic block variables (__block_{blockId}__)
        // These are created for return statements without variables
        const syntheticVarName = `__block_${blockId}__`;
        let hasSyntheticTaint = false;
        if (!hasControlDependentTaint) {
          const syntheticTaintInfos = funcTaint.filter((t: TaintInfo) => 
            t.variable === syntheticVarName && 
            t.tainted && 
            t.labels?.includes(TaintLabel.CONTROL_DEPENDENT)
          );
          if (syntheticTaintInfos.length > 0) {
            hasControlDependentTaint = true;
            hasSyntheticTaint = true;
            blockTaintedVars.push(...syntheticTaintInfos);
            LoggingConfig.raw(`[InterCFGViz] Block ${blockId} (${funcName}) detected as synthetic taint via variable ${syntheticVarName}`);
          }
        }
        
        // CRITICAL FIX: Also check if block is control-dependent by checking predecessors
        // This handles cases like return statements that don't define/use variables
        if (!hasControlDependentTaint && block.predecessors.length > 0) {
          // Get all tainted variables for this function
          const allTaintedVars = new Set<string>();
          funcTaint.forEach((t: TaintInfo) => {
            if (t.tainted) {
              allTaintedVars.add(t.variable);
            }
          });
          
          // Check if any predecessor is a conditional block with tainted condition
          for (const predId of block.predecessors) {
            const predBlock = funcCFG.blocks.get(predId);
            if (predBlock) {
              // Check if predecessor is conditional (has multiple successors = branching)
              const isConditional = predBlock.successors.length > 1;
              if (isConditional) {
                // Check if predecessor uses tainted variables in its condition
                const predHasTaintedCondition = predBlock.statements.some(stmt => {
                  const stmtText = stmt.text || stmt.content || '';
                  // Check if statement contains comparison operators (conditional)
                  const hasComparison = /[><=!]=?/.test(stmtText) || 
                                       stmtText.includes('&&') || 
                                       stmtText.includes('||') ||
                                       stmt.type === StatementType.CONDITIONAL ||
                                       stmt.type === StatementType.LOOP;
                  if (hasComparison) {
                    // Check if any variables used in this condition are tainted
                    return stmt.variables?.used.some(v => allTaintedVars.has(v)) || false;
                  }
                  return false;
                });
                
                if (predHasTaintedCondition) {
                  // This block is control-dependent!
                  hasControlDependentTaint = true;
                  LoggingConfig.raw(`[InterCFGViz] Block ${blockId} (${funcName}) detected as control-dependent via predecessor ${predId}`);
                  break;
                }
              }
            }
          }
        }
        
        // DEBUG: Log taint detection for this block
        if (blockTaintedVars.length > 0 || hasControlDependentTaint) {
          const labelsFound = blockTaintedVars.map(t => t.labels?.join(',') || 'none').join('; ');
          LoggingConfig.raw(`[InterCFGViz] Block ${blockId} (${funcName}): ${blockTaintedVars.length} tainted vars, labels=[${labelsFound}], hasDataFlow=${hasDataFlowTaint}, hasControlDep=${hasControlDependentTaint}`);
        }
        
        // Determine node color based on taint type
        let nodeColor: string;
        let nodeBorder: string;
        let nodeBorderStyle: string | undefined;
        
        // CRITICAL FIX: Check for synthetic taint FIRST (it's a special case of control-dependent)
        if (hasSyntheticTaint && !hasDataFlowTaint) {
          // Magenta: Synthetic taint only (return statements without variables)
          nodeColor = '#c77dff';  // Magenta/Purple-pink
          nodeBorder = '#9d4edd';  // Dark purple
          nodeBorderStyle = 'dashed';  // Dashed border to distinguish from regular control-dependent
        } else if (hasDataFlowTaint && hasControlDependentTaint) {
          // Purple: Mixed taint
          nodeColor = '#9d4edd';  // Purple
          nodeBorder = '#7b2cbf';  // Dark purple
          nodeBorderStyle = undefined;  // Solid border
        } else if (hasControlDependentTaint) {
          // Orange with dashed border: Control-dependent only
          nodeColor = '#ffa94d';  // Orange
          nodeBorder = '#ff8800';  // Dark orange
          nodeBorderStyle = 'dashed';  // Dashed border
        } else if (hasDataFlowTaint) {
          // Yellow: Data-flow only
          nodeColor = '#ffd60a';  // Yellow
          nodeBorder = '#ffc300';  // Dark yellow/gold
          nodeBorderStyle = undefined;  // Solid border
        } else {
          // Normal block
          nodeColor = '#e8f4f8';  // Light blue
          nodeBorder = '#2e7d32';  // Dark green
          nodeBorderStyle = undefined;  // Solid border
        }
        
        const isTainted = hasDataFlowTaint || hasControlDependentTaint;
        
        // Create detailed title with statement info
        const startLine = this.getBlockStartLine(block);
        let title = `${funcName} :: ${blockLabel}\nStatements: ${block.statements.length}`;
        if (isTainted) {
          title += `\nTainted Variables: ${[...new Set(blockTaintedVars.map((t: TaintInfo) => t.variable))].join(', ')}`;
          // Match the exact same logic as color determination to ensure consistency
          if (hasSyntheticTaint && !hasDataFlowTaint) {
            title += `\nTaint Type: Synthetic (Control-dependent - return statement without variables)`;
          } else if (hasDataFlowTaint && hasControlDependentTaint) {
            title += `\nTaint Type: Mixed (Data-flow + Control-dependent)`;
          } else if (hasControlDependentTaint) {
            title += `\nTaint Type: Control-dependent (Implicit Flow)`;
          } else if (hasDataFlowTaint) {
            title += `\nTaint Type: Data-flow (Explicit Flow)`;
          }
        }
        if (block.statements.length > 0) {
          const firstStmt = block.statements[0].text.substring(0, 50);
          title += `\nFirst statement: ${firstStmt}${block.statements[0].text.length > 50 ? '...' : ''}`;
        }
        if (startLine) {
          title += `\nLine ${startLine}`;
        }
        title += `\n\nDouble-click to open in editor`;
        
        // Calculate dynamic size based on data amount
        // Base size: 100px width, scales with:
        // - Number of statements (each statement adds ~15px)
        // - Number of tainted variables (each adds ~10px)
        // - Length of label (longer labels need more space)
        const baseWidth = 100;
        const statementWidth = Math.min(block.statements.length * 15, 100); // Max 100px for statements
        const taintWidth = Math.min(blockTaintedVars.length * 10, 50); // Max 50px for taint info
        const labelWidth = Math.min(nodeLabel.length * 6, 80); // Max 80px for label
        const dynamicWidth = Math.max(baseWidth, Math.min(baseWidth + statementWidth + taintWidth + labelWidth, 300)); // Max 300px
        
        // Calculate height based on content
        const baseHeight = 60;
        const statementHeight = Math.min(block.statements.length * 12, 120); // Max 120px for statements
        const dynamicHeight = Math.max(baseHeight, Math.min(baseHeight + statementHeight, 200)); // Max 200px
        
        // Use colors based on taint type
        const nodeData: any = {
          id: nodeId,
          label: nodeLabel,
          group: functionGroups.get(funcName),
          title: title,
          color: {
            background: nodeColor,
            border: nodeBorder,
            highlight: {
              background: isTainted ? '#a29bfe' : '#74b9ff',
              border: isTainted ? '#6c5ce7' : '#0984e3'
            }
          },
          borderWidth: 2,
          borderWidthSelected: 3,
          font: { 
            color: '#333',  // Always black text for readability
            size: Math.max(8, Math.min(11 - Math.floor(dynamicWidth / 50), 11)) // Scale font size with width (reduced for compactness)
          },
          shape: 'box',
          width: dynamicWidth,
          height: dynamicHeight,
          metadata: {
            function: funcName,
            blockId: blockId,
            isEntry: block.isEntry || false,
            isExit: block.isExit || false,
            isTainted: isTainted,
            hasDataFlowTaint: hasDataFlowTaint,
            hasControlDependentTaint: hasControlDependentTaint,
            hasSyntheticTaint: hasSyntheticTaint,
            taintedVariables: [...new Set(blockTaintedVars.map((t: TaintInfo) => t.variable))],
            // Navigation info for double-click to open file at block location
            filePath: filePath,
            startLine: this.getBlockStartLine(block)
          }
        };
        
        // Add dashed border for control-dependent taint
        if (nodeBorderStyle === 'dashed') {
          nodeData.borderDashes = [5, 5];
        }
        
        nodes.push(nodeData);
      });

      // Add intra-function control flow edges (green)
      funcCFG.blocks.forEach((block, blockId) => {
        const fromNodeId = `${funcName}_${blockId}`;
        block.successors.forEach(succId => {
          const toNodeId = `${funcName}_${succId}`;
          edges.push({
            from: fromNodeId,
            to: toNodeId,
            color: { color: '#51cf66', highlight: '#37b24d' },  // Green for control flow
            width: 2,
            arrows: 'to',
            smooth: { type: 'continuous', roundness: 0.3 },  // Slight curve to avoid overlaps
            title: 'Control Flow',
            metadata: {
              type: 'control_flow',
              fromFunction: funcName,
              toFunction: funcName
            }
          });
        });
      });
    });

    /**
     * INTER-FUNCTION CALL EDGES (BLUE EDGES)
     * 
     * Adds blue edges representing function calls between different functions.
     * These edges connect call sites in caller functions to entry blocks in callee functions.
     */
    // Add inter-function call edges (blue) from call graph
    if (state.callGraph && state.callGraph.callsFrom) {
      LoggingConfig.log('InterCFGViz', 'Adding inter-function call edges');
      LoggingConfig.detail('InterCFGViz', `callsFrom type: ${state.callGraph.callsFrom instanceof Map ? 'Map' : typeof state.callGraph.callsFrom}`);
      LoggingConfig.detail('InterCFGViz', `callsFrom size: ${state.callGraph.callsFrom instanceof Map ? state.callGraph.callsFrom.size : Object.keys(state.callGraph.callsFrom).length}`);
      
      // CRITICAL FIX (LOGIC.md #5): Standardize on Map type - callsFrom is always a Map
      // Convert to Map if it's been serialized as an object
      let callsFromMap: Map<string, any[]>;
      if (state.callGraph.callsFrom instanceof Map) {
        callsFromMap = state.callGraph.callsFrom;
      } else {
        // Convert plain object to Map (happens after JSON serialization/deserialization)
        callsFromMap = new Map(Object.entries(state.callGraph.callsFrom));
        LoggingConfig.detail('InterCFGViz', 'Converted callsFrom from Object to Map');
      }
      
      const blueEdgeSet = new Set<string>(); // Track unique edges to avoid duplicates
      // Edge key format: "caller_blockId->callee_blockId"
      // Using a Set prevents duplicate edges when multiple calls exist between same blocks
      
      // Iterate over Map entries (standardized type)
      // callsFromMap maps caller function names to arrays of function calls they make
      callsFromMap.forEach((calls, caller) => {
        if (Array.isArray(calls)) {
          calls.forEach((call: any) => {
            const callee = call.calleeId;
            const callSiteBlockId = call.callSite?.blockId;
            
            // CRITICAL FIX (LOGIC.md #11): Use external function registry instead of hardcoded list
            // Check if function is external by checking if it's not in our CFG functions
            // External functions (library functions) are not visualized in interconnected CFG
            // because we don't have their CFG structure
            const isExternal = !state.cfg.functions.has(callee);
            if (isExternal) {
              return; // Skip external functions (library functions)
            }
            
            const callerCFG = state.cfg.functions.get(caller);
            const calleeCFG = state.cfg.functions.get(callee);
            
            if (callerCFG && calleeCFG) {
              // Find entry block of callee
              // The entry block is where control flow enters the called function
              // This is typically the first block with no predecessors or marked as entry
              let calleeEntryId = '';
              calleeCFG.blocks.forEach((block, blockId) => {
                if (block.isEntry || block.predecessors.length === 0) {
                  calleeEntryId = blockId;
                }
              });

              // Use callSite.blockId if available, otherwise find block with call
              // The call site block is where the function call occurs in the caller
              // This is needed to draw the edge from caller to callee
              let fromBlockId = callSiteBlockId;
              if (!fromBlockId) {
                // Fallback: search for block containing the function call
                // This handles cases where callSite.blockId is not set
                callerCFG.blocks.forEach((block, blockId) => {
                  const hasCall = block.statements.some(stmt => 
                    stmt.text.includes(callee + '(')
                  );
                  if (hasCall) {
                    fromBlockId = blockId;
                  }
                });
              }
                
              if (fromBlockId && calleeEntryId) {
                const fromNodeId = `${caller}_${fromBlockId}`;
                  const toNodeId = `${callee}_${calleeEntryId}`;
                const edgeKey = `${fromNodeId}->${toNodeId}`;
                
                // Check if nodes exist and edge not already added
                const fromExists = nodes.some(n => n.id === fromNodeId);
                const toExists = nodes.some(n => n.id === toNodeId);
                
                if (fromExists && toExists && !blueEdgeSet.has(edgeKey)) {
                  blueEdgeSet.add(edgeKey);
                  edges.push({
                    from: fromNodeId,
                    to: toNodeId,
                    color: { color: '#4dabf7', highlight: '#1c7ed6' },  // Blue for calls
                    width: 3,
                    arrows: 'to',
                    dashes: true,
                    smooth: { type: 'continuous', roundness: 0.5 },  // Medium curve to avoid overlaps
                    title: `Call: ${caller} → ${callee}`,
                    metadata: {
                      type: 'function_call',
                      fromFunction: caller,
                      toFunction: callee
                    }
                  });
                } else {
                  // Edge skipped - log reason for debugging
                  if (!fromExists) {
                    LoggingConfig.verbose('VizEdges', `Blue edge skipped: from node ${fromNodeId} does not exist`);
                  }
                  if (!toExists) {
                    LoggingConfig.verbose('VizEdges', `Blue edge skipped: to node ${toNodeId} does not exist`);
                  }
                }
              }
            }
          });
        }
      });
      
      /**
       * BLUE EDGES SUMMARY
       * 
       * Total function call edges created for interconnected CFG.
       */
      const blueEdgeCount = edges.filter(e => e.metadata && e.metadata.type === 'function_call').length;
      LoggingConfig.log('VizEdges', `Total blue (function call) edges created: ${blueEdgeCount}`);
    }

    /**
     * DATA FLOW EDGES (ORANGE EDGES)
     * 
     * Adds orange edges representing data flow via reaching definitions.
     * These edges show where variables are defined and where they reach.
     */
    // Add data flow edges (orange) based on reaching definitions
    if (state.reachingDefinitions) {
      LoggingConfig.log('InterCFGViz', 'Adding data flow edges');
      LoggingConfig.detail('InterCFGViz', `Reaching definitions map size: ${state.reachingDefinitions.size}`);
      
      // Reorganize reaching definitions by function name
      const rdByFunction = new Map<string, Map<string, ReachingDefinitionsInfo>>();
      state.reachingDefinitions.forEach((rdInfo, key) => {
        // CRITICAL FIX: Split on LAST underscore only (function names can contain underscores)
        const lastUnderscoreIndex = key.lastIndexOf('_');
        if (lastUnderscoreIndex === -1) {
          LoggingConfig.warn('InterCFGViz', `Invalid RD key format: ${key}`);
          return;
        }
        const funcName = key.substring(0, lastUnderscoreIndex);
        const blockId = key.substring(lastUnderscoreIndex + 1);
        
        if (!rdByFunction.has(funcName)) {
          rdByFunction.set(funcName, new Map());
        }
        const rdMap = rdByFunction.get(funcName);
        // CRITICAL FIX (LOGIC.md #12): Add type guard instead of non-null assertion
        if (rdMap) {
          rdMap.set(blockId, rdInfo);
        } else {
          LoggingConfig.warn('InterCFGViz', `No RD map found for function ${funcName}`);
        }
      });
      
      LoggingConfig.log('InterCFGViz', `Organized RD by function: ${rdByFunction.size} functions`);
      
      rdByFunction.forEach((funcRD, funcName) => {
        LoggingConfig.detail('InterCFGViz', `Processing function ${funcName} for orange edges`);
        let funcOrangeEdges = 0;
        funcRD.forEach((rdInfo, blockId) => {
          if (rdInfo && rdInfo.out) {
            // rdInfo.out is a Map<string, ReachingDefinition[]>
            rdInfo.out.forEach((defs: ReachingDefinition[], varName: string) => {
              defs.forEach(def => {
                // Use def.blockId (where definition occurs) not def.definitionId (unique ID like "d0")
                if (def.blockId && def.blockId !== blockId) {
                  const fromNodeId = `${funcName}_${def.blockId}`;
                  const toNodeId = `${funcName}_${blockId}`;
                  
                  // Only add if both nodes exist
                  const fromExists = nodes.some(n => n.id === fromNodeId);
                  const toExists = nodes.some(n => n.id === toNodeId);
                  
                  if (fromExists && toExists) {
                    // Check for duplicate edges
                    const isDuplicate = edges.some(e => 
                      e.from === fromNodeId && 
                      e.to === toNodeId && 
                      e.metadata?.variable === varName &&
                      e.metadata?.type === 'data_flow'
                    );
                    
                    if (!isDuplicate) {
                      funcOrangeEdges++;
                    edges.push({
                      from: fromNodeId,
                      to: toNodeId,
                        color: { color: '#ff8800', highlight: '#ff6600' },  // Bright orange for data flow
                        width: 3,  // Increased to make more visible
                      arrows: 'to',
                        dashes: [8, 4],  // Dashed line pattern: 8px dash, 4px gap
                        smooth: { type: 'continuous', roundness: 0.7 },  // Higher curve to avoid overlaps with other edges
                        title: `Data Flow: ${varName} (${def.definitionId})`,
                      metadata: {
                        type: 'data_flow',
                        variable: varName,
                        fromFunction: funcName,
                          toFunction: funcName,
                          definitionId: def.definitionId
                      }
                    });
                    }
                  } else {
                    // Edge skipped - log reason for debugging
                    if (!fromExists) {
                      LoggingConfig.verbose('VizEdges', `Orange edge skipped: from node ${fromNodeId} does not exist (def.blockId=${def.blockId}, var=${varName})`);
                    }
                    if (!toExists) {
                      LoggingConfig.verbose('VizEdges', `Orange edge skipped: to node ${toNodeId} does not exist (blockId=${blockId}, var=${varName})`);
                    }
                  }
                }
              });
            });
          }
        });
        LoggingConfig.detail('VizEdges', `Function ${funcName}: created ${funcOrangeEdges} orange edges`);
      });
      
      /**
       * ORANGE EDGES SUMMARY
       * 
       * Total data flow edges created for interconnected CFG.
       */
      const orangeEdgeCount = edges.filter(e => e.metadata && e.metadata.type === 'data_flow').length;
      LoggingConfig.log('VizEdges', `Total orange (data flow) edges created: ${orangeEdgeCount}`);
    }

    // ============================================================
    // COMPREHENSIVE LOGGING: Interconnected CFG Summary
    // ============================================================
    LoggingConfig.section('InterCFGViz', 'INTERCONNECTED CFG DATA SUMMARY');
    LoggingConfig.log('InterCFGViz', `Total Nodes: ${nodes.length}`);
    LoggingConfig.log('InterCFGViz', `Total Edges: ${edges.length}`);
    LoggingConfig.log('InterCFGViz', `Functions: ${Array.from(functionGroups.keys()).join(', ')}`);
    
    // Edge type statistics
    const edgeStats = {
      controlFlow: edges.filter(e => e.metadata?.type === 'control_flow').length,
      functionCall: edges.filter(e => e.metadata?.type === 'function_call').length,
      dataFlow: edges.filter(e => e.metadata?.type === 'data_flow').length
    };
    LoggingConfig.table('VizEdges', 'Edge Type Distribution', {
      'Green (Control Flow)': edgeStats.controlFlow,
      'Blue (Function Calls)': edgeStats.functionCall,
      'Orange (Data Flow)': edgeStats.dataFlow,
      'Total': edges.length
    });
    
    // Node color statistics
    const nodeColorStats = {
      yellow: nodes.filter(n => n.color?.background === '#ffd60a').length,
      orange: nodes.filter(n => n.color?.background === '#ffa94d').length,
      purple: nodes.filter(n => n.color?.background === '#9d4edd').length,
      magenta: nodes.filter(n => n.color?.background === '#c77dff').length,
      lightBlue: nodes.filter(n => n.color?.background === '#e8f4f8').length
    };
    LoggingConfig.table('VizColors', 'Interconnected CFG Node Colors', {
      'Yellow (Data-flow)': nodeColorStats.yellow,
      'Orange (Control-dependent)': nodeColorStats.orange,
      'Purple (Mixed)': nodeColorStats.purple,
      'Light Blue (Normal)': nodeColorStats.lightBlue,
      'Total Tainted': nodeColorStats.yellow + nodeColorStats.orange + nodeColorStats.purple
    });
    
    // Log all nodes for test validation
    LoggingConfig.subsection('VizNodes', 'Interconnected CFG Nodes Detail');
    nodes.forEach((node, idx) => {
      LoggingConfig.detail('VizNodes', `InterNode[${idx}]: id="${node.id}", label="${node.label}", func="${node.metadata?.function}", color="${node.color?.background}"`);
      if (node.metadata?.isTainted) {
        LoggingConfig.verbose('VizNodes', `  Tainted: dataFlow=${node.metadata?.hasDataFlowTaint}, controlDep=${node.metadata?.hasControlDependentTaint}`);
        LoggingConfig.verbose('VizNodes', `  Variables: [${node.metadata?.taintedVariables?.join(', ')}]`);
      }
    });
    
    // Log all edges for test validation
    LoggingConfig.subsection('VizEdges', 'Interconnected CFG Edges Detail');
    edges.forEach((edge, idx) => {
      const edgeType = edge.metadata?.type || 'unknown';
      const colorName = edgeType === 'control_flow' ? 'green' : edgeType === 'function_call' ? 'blue' : 'orange';
      LoggingConfig.detail('VizEdges', `InterEdge[${idx}]: ${edge.from} -> ${edge.to} [${colorName}/${edgeType}]`);
    });
    
    /**
     * INTERCONNECTED CFG PREPARATION COMPLETE
     * 
     * Summary of prepared interconnected CFG data.
     */
    LoggingConfig.log('InterCFGViz', `Interconnected CFG prepared: ${nodes.length} nodes, ${edges.length} edges`);

    const result = {
      nodes,
      edges,
      functions: Array.from(functionGroups.keys()),
      groups: Object.fromEntries(functionGroups),
      // CRITICAL FIX: Store sensitivity in interconnected data to detect when it needs regeneration
      taintSensitivity: state.taintSensitivity || 'precise'
    };
    
    LoggingConfig.raw(`[InterCFGViz] ✅ Interconnected CFG data prepared with sensitivity: ${result.taintSensitivity}`);
    return result;
  }

  /**
   * Generate descriptive block name from block statements
   * 
   * Analyzes block statements to create a meaningful name like:
   * - "if_user_input_>_0" for conditional blocks
   * - "assign_x" for assignment blocks
   * - "call_printf" for function call blocks
   * - "return_result" for return blocks
   * - "while_loop_var_>_0" for loop blocks
   * 
   * @param block - Basic block to analyze
   * @param blockId - Block ID for fallback
   * @returns Descriptive name string
   */
  private generateDescriptiveBlockName(block: BasicBlock, blockId: string): string {
    // Handle special blocks
    if (block.isEntry) {
      return 'Entry';
    }
    if (block.isExit) {
      return 'Exit';
    }
    
    if (!block.statements || block.statements.length === 0) {
      return `Empty Block`;
    }
    
    // Analyze first significant statement
    for (const stmt of block.statements) {
      const text = (stmt.text || stmt.content || '').trim();
      if (!text || text.length === 0) continue;
      
      // Extract meaningful parts - use natural, readable format
      let name = '';
      
      // Check for conditionals (if, else, switch, case)
      if (text.match(/^\s*if\s*\(/i)) {
        const condition = text.replace(/^\s*if\s*\(/i, '').replace(/\)\s*\{?\s*$/, '').trim();
        const cleanCondition = this.sanitizeForNaturalLabel(condition);
        name = `if (${cleanCondition})`;
      } else if (text.match(/^\s*else\s+if\s*\(/i)) {
        const condition = text.replace(/^\s*else\s+if\s*\(/i, '').replace(/\)\s*\{?\s*$/, '').trim();
        const cleanCondition = this.sanitizeForNaturalLabel(condition);
        name = `else if (${cleanCondition})`;
      } else if (text.match(/^\s*else\s*\{?/i)) {
        name = 'else';
      } else if (text.match(/^\s*switch\s*\(/i)) {
        const condition = text.replace(/^\s*switch\s*\(/i, '').replace(/\)\s*\{?\s*$/, '').trim();
        const cleanCondition = this.sanitizeForNaturalLabel(condition);
        name = `switch (${cleanCondition})`;
      } else if (text.match(/^\s*case\s+/i)) {
        const caseValue = text.replace(/^\s*case\s+/i, '').replace(/:\s*$/, '').trim();
        name = `case ${caseValue}`;
      } else if (text.match(/^\s*default\s*:/i)) {
        name = 'default';
      }
      // Check for loops
      else if (text.match(/^\s*while\s*\(/i)) {
        const condition = text.replace(/^\s*while\s*\(/i, '').replace(/\)\s*\{?\s*$/, '').trim();
        const cleanCondition = this.sanitizeForNaturalLabel(condition);
        name = `while (${cleanCondition})`;
      } else if (text.match(/^\s*for\s*\(/i)) {
        const forParts = text.replace(/^\s*for\s*\(/i, '').replace(/\)\s*\{?\s*$/, '').trim();
        // Extract condition part (middle part of for loop)
        const parts = forParts.split(';');
        if (parts.length >= 2) {
          const cleanCondition = this.sanitizeForNaturalLabel(parts[1].trim());
          name = `for (${cleanCondition})`;
        } else {
          name = `for loop`;
        }
      } else if (text.match(/^\s*do\s*\{/i)) {
        name = 'do-while';
      }
      // Check for returns
      else if (text.match(/^\s*return\s+/i)) {
        const returnValue = text.replace(/^\s*return\s+/i, '').replace(/;\s*$/, '').trim();
        if (returnValue && returnValue !== 'void' && returnValue.length > 0) {
          const cleanReturn = this.sanitizeForNaturalLabel(returnValue);
          name = `return ${cleanReturn}`;
        } else {
          name = 'return';
        }
      }
      // Check for function calls
      else if (text.match(/^\s*\w+\s*\(/)) {
        const funcMatch = text.match(/^\s*(\w+)\s*\(/);
        if (funcMatch) {
          name = `${funcMatch[1]}()`;
        }
      }
      // Check for assignments
      else if (text.includes('=') && !text.match(/[<>=!]=/)) {
        const assignMatch = text.match(/^\s*(\w+)\s*=/);
        if (assignMatch) {
          name = `${assignMatch[1]} = ...`;
        }
      }
      // Check for declarations
      else if (text.match(/^\s*(int|char|float|double|void|bool|auto|const)\s+\w+/)) {
        const declMatch = text.match(/^\s*(\w+)\s+(\w+)/);
        if (declMatch) {
          name = `${declMatch[1]} ${declMatch[2]}`;
        }
      }
      
      if (name) {
        return name;
      }
    }
    
    // Fallback: use first statement text (truncated and cleaned)
    const firstStmt = block.statements[0]?.text || block.statements[0]?.content || '';
    if (firstStmt) {
      const truncated = firstStmt.substring(0, 25).trim();
      return this.sanitizeForNaturalLabel(truncated) || `Block ${blockId}`;
    }
    
    return `Block ${blockId}`;
  }
  
  /**
   * Sanitize text for natural, readable labels
   * Preserves readability while limiting length
   */
  private sanitizeForNaturalLabel(text: string): string {
    if (!text) return '';
    // Remove excessive whitespace
    let cleaned = text.replace(/\s+/g, ' ').trim();
    // Truncate if too long
    if (cleaned.length > 20) {
      cleaned = cleaned.substring(0, 18) + '...';
    }
    return cleaned;
  }
  
  /**
   * Sanitize text for use in block labels
   * Replaces special characters with underscores and limits length
   */
  private sanitizeForLabel(text: string): string {
    if (!text) return '';
    
    return text
      .replace(/[^a-zA-Z0-9_<>=\s]/g, '_')  // Replace special chars with underscore
      .replace(/\s+/g, '_')                  // Replace spaces with underscore
      .replace(/_+/g, '_')                    // Collapse multiple underscores
      .replace(/^_|_$/g, '')                  // Remove leading/trailing underscores
      .substring(0, 40)                       // Limit length
      .toLowerCase();
  }

  /**
   * Serialize reaching definitions for display
   */
  private async serializeRD(rdMap: Map<string, any[]>, state: AnalysisState): Promise<any> {
    const result: any = {};

    // Read source files content for extracting actual code
    const fileContents = new Map<string, string>();

    // Collect all unique file paths that have definitions
    const filePaths = new Set<string>();
    rdMap.forEach((defs, varName) => {
      defs.forEach(def => {
        if (def.range && def.range.file) {
          filePaths.add(def.range.file);
        }
      });
    });

    // Read all source files
    for (const filePath of filePaths) {
      try {
        const uri = vscode.Uri.file(filePath);
        const content = await vscode.workspace.fs.readFile(uri);
        fileContents.set(filePath, content.toString());
      } catch (error) {
        // File read error - log warning but continue
        LoggingConfig.warn('CFGViz', `Could not read source file ${filePath}`, error);
      }
    }

    rdMap.forEach((defs, varName) => {
      result[varName] = defs.map(d => {
        let sourceCode = d.definitionId; // fallback

        // Try to extract actual source code
        if (d.range && d.range.file && fileContents.has(d.range.file)) {
          const content = fileContents.get(d.range.file)!;
          const lines = content.split('\n');
          const line = lines[d.range.start.line - 1]; // lines are 1-indexed in range

          if (line) {
            const startCol = d.range.start.character || 0;
            const endCol = d.range.end.character || line.length;
            const code = line.substring(startCol, endCol).trim();

            if (code) {
              const filename = vscode.workspace.asRelativePath(d.range.file);
              sourceCode = `[${filename}:${d.range.start.line}, ${code}]`;
            }
          }
        } else {
          // For CFG-based definitions without source locations,
          // provide a more readable format
          const [blockId, stmtId] = d.definitionId.split('_');
          sourceCode = `[${d.variable} defined in block ${blockId}]`;
        }

        return {
        variable: d.variable,
        definitionId: d.definitionId,
          blockId: d.blockId,
          sourceCode: sourceCode
        };
    });
    });

    return result;
  }

  /**
   * Prepare call graph data for visualization
   */
  private prepareCallGraphData(callGraph: any, state?: AnalysisState): any {
    // ============================================================
    // COMPREHENSIVE LOGGING: Call Graph Data Preparation
    // ============================================================
    LoggingConfig.section('CallGraphViz', 'PREPARING CALL GRAPH DATA');
    LoggingConfig.log('CallGraphViz', `Functions in Call Graph: ${callGraph.functions?.size || 0}`);
    LoggingConfig.log('CallGraphViz', `Total Calls: ${callGraph.calls?.length || 0}`);
    
    const nodes: any[] = [];
    const edges: any[] = [];

    // Helper to get function start line from CFG
    const getFunctionStartLine = (funcName: string): number | undefined => {
      if (!state || !state.cfg) return undefined;
      const funcCFG = state.cfg.functions.get(funcName);
      if (!funcCFG) return undefined;
      
      // Try to get from entry block
      const entryBlock = funcCFG.blocks.get(funcCFG.entry);
      if (entryBlock) {
        const startLine = this.getBlockStartLine(entryBlock);
        if (startLine) return startLine;
      }
      
      // Fallback: try first block
      const firstBlock = Array.from(funcCFG.blocks.values())[0];
      if (firstBlock) {
        return this.getBlockStartLine(firstBlock);
      }
      
      return undefined;
    };

    // Add function nodes
    callGraph.functions.forEach((metadata: any, funcName: string) => {
      const filePath = state ? this.getFilePathForFunction(state, funcName) : undefined;
      const startLine = getFunctionStartLine(funcName);
      
      LoggingConfig.detail('CallGraphViz', `Function Node: "${funcName}", external=${metadata.isExternal}, recursive=${metadata.isRecursive}, params=[${metadata.parameters.map((p: any) => p.name).join(', ')}], filePath=${filePath || 'none'}, startLine=${startLine || 'none'}`);
      nodes.push({
        id: funcName,
        label: funcName,
        isExternal: metadata.isExternal,
        isRecursive: metadata.isRecursive,
        parameters: metadata.parameters.map((p: any) => p.name).join(', '),
        callsCount: metadata.callsCount,
        filePath: filePath,
        startLine: startLine
      });
    });

    // Add call edges
    callGraph.calls.forEach((call: any, idx: number) => {
      // Build label with actual arguments
      const argsLabel = call.arguments.actual && call.arguments.actual.length > 0
        ? call.arguments.actual.slice(0, 3).join(', ') + (call.arguments.actual.length > 3 ? '...' : '')
        : 'no args';
      
      // Build return value label
      const returnLabel = call.returnValueUsed ? 'returns used' : 'returns unused';
      
      // Combine into full label
      const fullLabel = `${argsLabel}\n${returnLabel}`;
      
      LoggingConfig.detail('CallGraphViz', `Call Edge[${idx}]: ${call.callerId} -> ${call.calleeId}, args=[${call.arguments.actual?.join(', ') || 'none'}], returnUsed=${call.returnValueUsed}`);
      
      edges.push({
        from: call.callerId,
        to: call.calleeId,
        label: fullLabel,
        returnValueUsed: call.returnValueUsed,
        arguments: call.arguments.actual || [],
        argumentCount: call.arguments.actual?.length || 0
      });
    });

    // Summary logging
    LoggingConfig.log('CallGraphViz', `Call Graph Summary: ${nodes.length} function nodes, ${edges.length} call edges`);
    LoggingConfig.verbose('CallGraphViz', 'Call Graph Nodes', nodes.map(n => ({ id: n.id, external: n.isExternal, recursive: n.isRecursive })));

    return { nodes, edges };
  }

  /**
   * Prepare IPA data for display
   */
  private prepareIPAData(state: AnalysisState, functionName: string): any {
    // ============================================================
    // COMPREHENSIVE LOGGING: IPA Data Preparation
    // ============================================================
    LoggingConfig.section('InterProceduralRD', `PREPARING IPA DATA: ${functionName}`);
    
    const ipaData: any = {
      parameterAnalysis: null,
      returnValueAnalysis: null,
      interProceduralRD: null
    };

    // Get parameter analysis for this function
    if (state.parameterAnalysis && state.parameterAnalysis.has(functionName)) {
      ipaData.parameterAnalysis = state.parameterAnalysis.get(functionName);
      LoggingConfig.log('ParameterAnalysis', `Parameter Analysis Found: ${JSON.stringify(ipaData.parameterAnalysis)}`);
    } else {
      LoggingConfig.detail('ParameterAnalysis', `No parameter analysis for ${functionName}`);
    }

    // Get return value analysis for this function
    if (state.returnValueAnalysis && state.returnValueAnalysis.has(functionName)) {
      const returnValues = state.returnValueAnalysis.get(functionName)!;
      
      // CRITICAL FIX: Check if return values are tainted (including synthetic taint)
      // Get taint analysis for this function
      const taintInfo = state.taintAnalysis.get(functionName) || [];
      
      // Enhance return values with taint information and line numbers
      const funcCFG = state.cfg.functions.get(functionName);
      const enhancedReturns = returnValues.map((ret: any) => {
        const retInfo: any = { ...ret };
        
        // Add line number from block
        if (funcCFG && ret.blockId) {
          const retBlock = funcCFG.blocks.get(ret.blockId);
          if (retBlock) {
            retInfo.line = this.getBlockStartLine(retBlock);
          }
        }
        
        // Check if this return statement is tainted
        // 1. Check if return value uses tainted variables
        if (ret.usedVariables && ret.usedVariables.length > 0) {
          const hasTaintedVar = ret.usedVariables.some((varName: string) => 
            taintInfo.some((t: TaintInfo) => t.variable === varName && t.tainted)
          );
          if (hasTaintedVar) {
            retInfo.isTainted = true;
            retInfo.taintType = 'data-flow';
          }
        }
        
        // 2. Check for synthetic taint (return statements without variables, e.g., return 1;)
        // Synthetic taint is marked with __block_{blockId}__
        if (!retInfo.isTainted && ret.type === 'constant') {
          const syntheticVarName = `__block_${ret.blockId}__`;
          const hasSyntheticTaint = taintInfo.some((t: TaintInfo) => 
            t.variable === syntheticVarName && 
            t.tainted && 
            t.labels?.includes(TaintLabel.CONTROL_DEPENDENT)
          );
          if (hasSyntheticTaint) {
            retInfo.isTainted = true;
            retInfo.taintType = 'synthetic';
          }
        }
        
        // 3. Check if return block is control-dependent (even without explicit variables)
        if (!retInfo.isTainted) {
          const funcCFG = state.cfg.functions.get(functionName);
          if (funcCFG) {
            const retBlock = funcCFG.blocks.get(ret.blockId);
            if (retBlock && retBlock.predecessors.length > 0) {
              // Check if any predecessor is a conditional block with tainted condition
              for (const predId of retBlock.predecessors) {
                const predBlock = funcCFG.blocks.get(predId);
                if (predBlock && predBlock.successors.length > 1) {
                  // Predecessor is conditional (branching)
                  const predHasTaintedCondition = predBlock.statements.some(stmt => {
                    const stmtText = stmt.text || stmt.content || '';
                    const hasComparison = /[><=!]=?/.test(stmtText) || 
                                         stmtText.includes('&&') || 
                                         stmtText.includes('||') ||
                                         stmt.type === StatementType.CONDITIONAL ||
                                         stmt.type === StatementType.LOOP;
                    if (hasComparison) {
                      return stmt.variables?.used.some(v => 
                        taintInfo.some((t: TaintInfo) => t.variable === v && t.tainted)
                      ) || false;
                    }
                    return false;
                  });
                  
                  if (predHasTaintedCondition) {
                    retInfo.isTainted = true;
                    retInfo.taintType = 'control-dependent';
                    break;
                  }
                }
              }
            }
          }
        }
        
        return retInfo;
      });
      
      ipaData.returnValueAnalysis = enhancedReturns;
      LoggingConfig.log('ReturnValueAnalysis', `Return Value Analysis Found: ${enhancedReturns.length} returns, ${enhancedReturns.filter((r: any) => r.isTainted).length} tainted`);
    } else {
      LoggingConfig.detail('ReturnValueAnalysis', `No return value analysis for ${functionName}`);
    }

    // Get inter-procedural reaching definitions
    if (state.interProceduralRD && state.interProceduralRD.has(functionName)) {
      const funcRD = state.interProceduralRD.get(functionName);
      LoggingConfig.log('InterProceduralRD', `Inter-procedural RD Found: ${funcRD?.size || 0} blocks`);
      // CRITICAL FIX (LOGIC.md #12): Add type guard instead of non-null assertion
      if (funcRD) {
        const funcCFG = state.cfg.functions.get(functionName);
        ipaData.interProceduralRD = Array.from(funcRD.entries()).map(([blockId, rdInfo]: [string, any]) => {
          // Get line number for this block
          let blockLine: number | undefined = undefined;
          if (funcCFG) {
            const block = funcCFG.blocks.get(blockId);
            if (block) {
              blockLine = this.getBlockStartLine(block);
            }
          }
          return {
            blockId,
            line: blockLine,
            in: Array.from(rdInfo.in.entries() as Iterable<[string, any[]]>).map(([varName, defs]: [string, any[]]) => ({
              variable: varName,
              definitions: defs.map((d: any) => ({
                definitionId: d.definitionId,
                sourceBlock: d.sourceBlock,
                propagationPath: d.propagationPath || []
              }))
            })),
            out: Array.from(rdInfo.out.entries() as Iterable<[string, any[]]>).map(([varName, defs]: [string, any[]]) => ({
              variable: varName,
              definitions: defs.map((d: any) => ({
                definitionId: d.definitionId,
                sourceBlock: d.sourceBlock,
                propagationPath: d.propagationPath || []
              }))
            }))
          };
        });
      }
    }

    return ipaData;
  }

  /**
   * Prepare taint analysis data for display
   */
  private prepareTaintData(state: AnalysisState, functionName: string): any {
    // ============================================================
    // COMPREHENSIVE LOGGING: Taint Data Preparation
    // ============================================================
    LoggingConfig.section('TaintAnalysis', `PREPARING TAINT DATA: ${functionName}`);
    LoggingConfig.log('TaintAnalysis', `Taint Sensitivity: ${state.taintSensitivity || 'precise'}`);
    
    const taintInfo = state.taintAnalysis.get(functionName) || [];
    const vulnerabilities = state.vulnerabilities.get(functionName) || [];
    
    LoggingConfig.log('TaintAnalysis', `Total Taint Entries: ${taintInfo.length}`);
    LoggingConfig.log('TaintAnalysis', `Total Vulnerabilities: ${vulnerabilities.length}`);
    
    // Detailed taint info logging
    LoggingConfig.subsection('TaintSources', 'Taint Source Details');
    taintInfo.forEach((taint: TaintInfo, idx: number) => {
      if (taint.tainted) {
        LoggingConfig.detail('TaintSources', `Taint[${idx}]: var="${taint.variable}", source="${taint.source}", labels=[${taint.labels?.join(', ') || 'none'}]`);
        LoggingConfig.verbose('TaintSources', `  Category: ${taint.sourceCategory || 'unknown'}, SourceFunc: ${taint.sourceFunction || 'N/A'}`);
        if (taint.propagationPath?.length) {
          LoggingConfig.verbose('TaintSources', `  PropagationPath: [${taint.propagationPath.join(' -> ')}]`);
        }
      }
    });
    
    // Count taint by label type
    const labelStats = {
      userInput: taintInfo.filter((t: TaintInfo) => t.labels?.includes(TaintLabel.USER_INPUT)).length,
      derived: taintInfo.filter((t: TaintInfo) => t.labels?.includes(TaintLabel.DERIVED)).length,
      controlDependent: taintInfo.filter((t: TaintInfo) => t.labels?.includes(TaintLabel.CONTROL_DEPENDENT)).length,
      fileContent: taintInfo.filter((t: TaintInfo) => t.labels?.includes(TaintLabel.FILE_CONTENT)).length,
      networkData: taintInfo.filter((t: TaintInfo) => t.labels?.includes(TaintLabel.NETWORK_DATA)).length,
      database: taintInfo.filter((t: TaintInfo) => t.labels?.includes(TaintLabel.DATABASE)).length
    };
    LoggingConfig.table('TaintAnalysis', 'Taint Label Distribution', labelStats);
    
    // Separate TaintVulnerability from other Vulnerability types
    const taintVulnerabilities = vulnerabilities.filter((v: any) => 
      v.type && ['sql_injection', 'command_injection', 'format_string', 'path_traversal', 
                  'buffer_overflow', 'code_injection', 'integer_overflow'].includes(v.type)
    );
    
    LoggingConfig.log('TaintSinks', `Taint-related Vulnerabilities: ${taintVulnerabilities.length} out of ${vulnerabilities.length} total`);
    taintVulnerabilities.forEach((vuln: any, idx: number) => {
      LoggingConfig.detail('TaintSinks', `Vuln[${idx}]: type="${vuln.type}", severity="${vuln.severity}", source="${vuln.source}", sink="${vuln.sink}"`);
    });
    
    // Group taint info by variable
    const taintByVariable = new Map<string, TaintInfo[]>();
    taintInfo.forEach((taint: TaintInfo) => {
      if (taint.tainted) {
        const existing = taintByVariable.get(taint.variable) || [];
        existing.push(taint);
        taintByVariable.set(taint.variable, existing);
      }
    });
    
    LoggingConfig.log('TaintAnalysis', `Unique Tainted Variables: ${taintByVariable.size}`);
    
    // Prepare taint sources summary
    const sourcesByCategory = new Map<string, number>();
    taintInfo.forEach((taint: TaintInfo) => {
      if (taint.tainted && taint.sourceCategory) {
        const count = sourcesByCategory.get(taint.sourceCategory) || 0;
        sourcesByCategory.set(taint.sourceCategory, count + 1);
      }
    });
    
    // Helper to get line number from source location
    const funcCFG = state.cfg.functions.get(functionName);
    const getLineFromSourceLocation = (sourceLocation: any): number | undefined => {
      if (!sourceLocation || !funcCFG) return undefined;
      if (sourceLocation.range?.start?.line) {
        return sourceLocation.range.start.line;
      }
      if (sourceLocation.blockId) {
        const block = funcCFG.blocks.get(sourceLocation.blockId);
        if (block) {
          return this.getBlockStartLine(block);
        }
      }
      return undefined;
    };

    const result = {
      taintedVariables: Array.from(taintByVariable.entries()).map(([varName, taints]) => {
        // Get line number from first taint entry's source location
        const firstTaint = taints[0];
        const lineNumber = getLineFromSourceLocation(firstTaint.sourceLocation);
        
        return {
          variable: varName,
          line: lineNumber,
          sources: taints.map(t => ({
            source: t.source,
            category: t.sourceCategory || 'unknown',
            taintType: t.taintType || 'unknown',
            sourceFunction: t.sourceFunction,
            propagationPath: t.propagationPath,
            sourceLocation: t.sourceLocation,
            line: getLineFromSourceLocation(t.sourceLocation)
          })),
          isTainted: true
        };
      }),
      vulnerabilities: taintVulnerabilities.map((vuln: any) => {
        // Get line number from source location
        const sourceLine = vuln.source?.blockId && funcCFG 
          ? (() => {
              const block = funcCFG.blocks.get(vuln.source.blockId);
              return block ? this.getBlockStartLine(block) : undefined;
            })()
          : undefined;
        
        return {
          id: vuln.id,
          type: vuln.type,
          severity: vuln.severity,
          source: vuln.source,
          sink: vuln.sink,
          propagationPath: vuln.propagationPath,
          sanitized: vuln.sanitized,
          sanitizationPoints: vuln.sanitizationPoints || [],
          cweId: vuln.cweId,
          description: vuln.description,
          line: sourceLine
        };
      }),
      sourcesByCategory: Array.from(sourcesByCategory.entries()).map(([category, count]) => ({
        category,
        count
      })),
      totalTaintedVariables: taintByVariable.size,
      totalVulnerabilities: taintVulnerabilities.length
    };
    
    LoggingConfig.log('CFGViz', `[CFGVisualizer] prepareTaintData result:`, {
      totalTaintedVariables: result.totalTaintedVariables,
      totalVulnerabilities: result.totalVulnerabilities,
      taintedVariablesArrayLength: result.taintedVariables.length
    });
    
    return result;
  }

  /**
   * Prepare inter-procedural taint analysis data for display
   */
  private prepareInterProceduralTaintData(state: AnalysisState, functionName: string): any {
    // Get all taint info for this function
    const taintInfo = state.taintAnalysis.get(functionName) || [];
    
    LoggingConfig.log('CFGViz', `[CFGVisualizer] prepareInterProceduralTaintData for ${functionName}:`, {
      totalTaintInfo: taintInfo.length,
      taintInfoSample: taintInfo.length > 0 ? {
        variable: taintInfo[0].variable,
        source: taintInfo[0].source,
        sourceFunction: taintInfo[0].sourceFunction,
        propagationPath: taintInfo[0].propagationPath,
        sourceCategory: taintInfo[0].sourceCategory
      } : null,
      allTaintSources: taintInfo.map((t: TaintInfo) => t.source).slice(0, 5),
      allSourceFunctions: [...new Set(taintInfo.map((t: TaintInfo) => t.sourceFunction).filter(Boolean))].slice(0, 5)
    });
    
    // Filter for inter-procedural taint (has sourceFunction different from current function or parameter/return sources)
    const interProceduralTaint = taintInfo.filter((taint: TaintInfo) => {
      // Check if taint came from another function
      const isFromOtherFunction = taint.sourceFunction && taint.sourceFunction !== functionName;
      // Check if it's from a parameter or return value
      const isParameterTaint = taint.source?.startsWith('parameter:');
      const isReturnTaint = taint.source?.startsWith('return_value:');
      const isLibraryTaint = taint.source?.startsWith('library_function:') || taint.source?.startsWith('file_io:') || taint.source?.startsWith('user_input:');
      // Check if propagation path includes multiple functions
      const hasCrossFunctionPath = taint.propagationPath && taint.propagationPath.length > 1;
      
      const isInterProcedural = isFromOtherFunction || isParameterTaint || isReturnTaint || isLibraryTaint || hasCrossFunctionPath;
      
      if (isInterProcedural) {
        LoggingConfig.log('CFGViz', `[CFGVisualizer] Found inter-procedural taint: ${taint.variable} from ${taint.source} (sourceFunction: ${taint.sourceFunction}, path: ${taint.propagationPath?.join(' → ')})`);
      }
      
      return isInterProcedural;
    });
    
    // CRITICAL FIX: Also include "outgoing" taint flows - taint that flows FROM this function TO other functions
    // This shows parameter taint entries for functions that this function calls
    const outgoingTaintFlows: TaintInfo[] = [];
    if (state.callGraph) {
      const callsFrom = state.callGraph.callsFrom instanceof Map
        ? state.callGraph.callsFrom.get(functionName) || []
        : (state.callGraph.callsFrom as any)[functionName] || [];
      
      LoggingConfig.log('CFGViz', `[CFGVisualizer] Checking outgoing taint flows from ${functionName} to ${callsFrom.length} callees`);
      
      // Track seen parameter taint flows to avoid duplicates (same caller->callee->param)
      const seenFlows = new Set<string>();
      
      callsFrom.forEach((call: any) => {
        const calleeName = call.calleeId;
        const calleeTaint = state.taintAnalysis.get(calleeName) || [];
        
        // Find parameter taint in callee that originated from this caller
        calleeTaint.forEach((calleeTaintInfo: TaintInfo) => {
          if (calleeTaintInfo.source?.startsWith('parameter:') && 
              calleeTaintInfo.sourceFunction === functionName) {
            // Extract parameter name from source (e.g., "parameter:input" -> "input")
            const paramName = calleeTaintInfo.source.replace('parameter:', '');
            
            // Create unique key for this flow to avoid duplicates
            const flowKey = `${functionName}->${calleeName}:${paramName}`;
            if (seenFlows.has(flowKey)) {
              LoggingConfig.log('CFGViz', `[CFGVisualizer] Skipping duplicate outgoing taint flow: ${flowKey}`);
              return;
            }
            seenFlows.add(flowKey);
            
            // Find the tainted variable in caller that maps to this parameter
            const callerTaintedVars = taintInfo.filter((t: TaintInfo) => t.tainted);
            const matchingVar = callerTaintedVars.find((t: TaintInfo) => {
              // Check if this variable is passed as argument to the callee
              if (call.arguments?.actual) {
                return call.arguments.actual.some((arg: string) => 
                  arg.includes(t.variable) || t.variable === arg
                );
              }
              return false;
            });
            
            if (matchingVar) {
              // Create synthetic taint entry showing outgoing flow
              const outgoingTaint: TaintInfo = {
                variable: paramName,
                source: `parameter:${paramName}`,
                tainted: true,
                sourceCategory: matchingVar.sourceCategory,
                taintType: matchingVar.taintType,
                sourceFunction: functionName,
                propagationPath: [functionName, calleeName],
                sourceLocation: {
                  blockId: call.callSite?.blockId || 'unknown'
                },
                labels: [TaintLabel.DERIVED]
              };
              
              outgoingTaintFlows.push(outgoingTaint);
              LoggingConfig.log('CFGViz', `[CFGVisualizer] Found outgoing taint flow: ${functionName}.${matchingVar.variable} -> ${calleeName}.${paramName}`);
            }
          }
        });
      });
    }
    
    // Combine incoming and outgoing taint flows
    const allInterProceduralTaint = [...interProceduralTaint, ...outgoingTaintFlows];
    
    // CRITICAL FIX: Filter out synthetic return_* entries when there's a corresponding assigned variable
    // e.g., filter out "return_get_user_input" if "user_data" (from return_value:get_user_input->user_data) exists
    const syntheticReturnEntries = new Set<string>(); // Track return_* entries to filter
    const assignedVarEntries = new Map<string, TaintInfo>(); // Track assigned variable entries
    
    allInterProceduralTaint.forEach((taint: TaintInfo) => {
      // Check if this is a synthetic return entry (variable starts with "return_")
      if (taint.variable.startsWith('return_') && taint.source?.startsWith('return_value:')) {
        syntheticReturnEntries.add(taint.variable);
      }
      // Check if this is an assigned variable entry (source contains "->")
      if (taint.source?.includes('->') && taint.source.startsWith('return_value:')) {
        // Extract the function name from source (e.g., "return_value:get_user_input->user_data" -> "get_user_input")
        const match = taint.source.match(/return_value:([^->]+)->/);
        if (match) {
          const funcName = match[1];
          const syntheticKey = `return_${funcName}`;
          assignedVarEntries.set(syntheticKey, taint);
        }
      }
    });
    
    // Filter: exclude synthetic return_* entries if there's a corresponding assigned variable entry
    const filteredTaint = allInterProceduralTaint.filter((taint: TaintInfo) => {
      if (taint.variable.startsWith('return_') && taint.source?.startsWith('return_value:')) {
        // Extract function name (e.g., "return_get_user_input" -> "get_user_input")
        const funcName = taint.variable.replace('return_', '');
        const syntheticKey = `return_${funcName}`;
        // Exclude if there's a corresponding assigned variable entry
        if (assignedVarEntries.has(syntheticKey)) {
          LoggingConfig.log('CFGViz', `[CFGVisualizer] Filtering out synthetic return entry: ${taint.variable} (has assigned variable entry)`);
          return false;
        }
      }
      return true;
    });
    
    // CRITICAL FIX: Deduplicate entries by variable name, preferring more specific sources
    // This prevents duplicate entries like "user_input" from "return_value:get_user_number" appearing multiple times
    // Prefer sources with "->" (assigned variable) over sources without
    // Prefer more specific sources (e.g., return_value:process_number->processed over return_value:get_user_number->user_input)
    const deduplicatedTaint = new Map<string, TaintInfo>();
    filteredTaint.forEach((taint: TaintInfo) => {
      // Use variable name as key (not variable + source)
      const key = taint.variable;
      if (!deduplicatedTaint.has(key)) {
        deduplicatedTaint.set(key, taint);
      } else {
        // If duplicate found, prefer the more specific source
        const existing = deduplicatedTaint.get(key)!;
        const existingHasArrow = existing.source?.includes('->') || false;
        const taintHasArrow = taint.source?.includes('->') || false;
        
        // Prefer source with "->" over source without
        if (taintHasArrow && !existingHasArrow) {
          deduplicatedTaint.set(key, taint);
        } else if (!taintHasArrow && existingHasArrow) {
          // Keep existing (has arrow)
        } else if (taintHasArrow && existingHasArrow) {
          // Both have arrow - prefer the one that matches the variable name in the source
          // e.g., return_value:process_number->processed is more specific than return_value:get_user_number->user_input for variable "processed"
          const taintSourceVar = taint.source?.split('->')[1] || '';
          const existingSourceVar = existing.source?.split('->')[1] || '';
          const varName = taint.variable;
          
          // If one source matches the variable name exactly, prefer it
          if (taintSourceVar === varName && existingSourceVar !== varName) {
            deduplicatedTaint.set(key, taint);
          } else if (existingSourceVar === varName && taintSourceVar !== varName) {
            // Keep existing (matches variable name)
          } else {
            // Neither matches exactly - prefer longer propagation path
            if ((taint.propagationPath?.length || 0) > (existing.propagationPath?.length || 0)) {
              deduplicatedTaint.set(key, taint);
            }
          }
        } else {
          // Both don't have arrow - prefer longer propagation path
          if ((taint.propagationPath?.length || 0) > (existing.propagationPath?.length || 0)) {
            deduplicatedTaint.set(key, taint);
          }
        }
      }
    });
    
    let finalInterProceduralTaint = Array.from(deduplicatedTaint.values());
    
    // CRITICAL FIX: Filter out outgoing flows (sourceFunction === functionName) from the final list
    // Outgoing flows are shown in the callee's tab, not the caller's tab
    finalInterProceduralTaint = finalInterProceduralTaint.filter((t: TaintInfo) => {
      // Keep if sourceFunction is not the current function (incoming taint)
      // Or if it's a return value taint (not an outgoing parameter flow)
      const isOutgoingFlow = t.sourceFunction === functionName && t.source?.startsWith('parameter:');
      if (isOutgoingFlow) {
        LoggingConfig.log('CFGViz', `[CFGVisualizer] Filtering out outgoing flow: ${t.variable} (${t.source}) from ${functionName}`);
      }
      return !isOutgoingFlow;
    });
    
    LoggingConfig.log('CFGViz', `[CFGVisualizer] prepareInterProceduralTaintData result for ${functionName}:`, {
      totalTaintInfo: taintInfo.length,
      interProceduralTaintCount: interProceduralTaint.length,
      outgoingTaintFlowsCount: outgoingTaintFlows.length,
      allInterProceduralTaintCount: allInterProceduralTaint.length,
      deduplicatedCount: finalInterProceduralTaint.length,
      parameterTaintCount: finalInterProceduralTaint.filter((t: TaintInfo) => t.source?.startsWith('parameter:')).length,
      returnTaintCount: finalInterProceduralTaint.filter((t: TaintInfo) => t.source?.startsWith('return_value:') || t.source?.startsWith('library_function:')).length,
      crossFunctionPathCount: finalInterProceduralTaint.filter((t: TaintInfo) => t.propagationPath && t.propagationPath.length > 1).length
    });
    
    // Helper to get line number from source location
    const funcCFGForIP = state.cfg.functions.get(functionName);
    const getLineFromSourceLocationIP = (sourceLocation: any): number | undefined => {
      if (!sourceLocation || !funcCFGForIP) return undefined;
      if (sourceLocation.range?.start?.line) {
        return sourceLocation.range.start.line;
      }
      if (sourceLocation.blockId) {
        const block = funcCFGForIP.blocks.get(sourceLocation.blockId);
        if (block) {
          return this.getBlockStartLine(block);
        }
      }
      return undefined;
    };

    // Group by source function
    const taintBySourceFunction = new Map<string, TaintInfo[]>();
    finalInterProceduralTaint.forEach((taint: TaintInfo) => {
      const sourceFunc = taint.sourceFunction || 'unknown';
      const existing = taintBySourceFunction.get(sourceFunc) || [];
      existing.push(taint);
      taintBySourceFunction.set(sourceFunc, existing);
    });
    
    // Group by taint type (parameter, return, library)
    // CRITICAL FIX: Don't count outgoing flows as parameter taint for the caller
    // Outgoing flows (sourceFunction === functionName) are flows TO other functions, not incoming parameter taint
    const parameterTaint = finalInterProceduralTaint.filter((t: TaintInfo) => 
      t.source?.startsWith('parameter:') && t.sourceFunction !== functionName
    );
    const returnTaint = finalInterProceduralTaint.filter((t: TaintInfo) => 
      t.source?.startsWith('return_value:')
    );
    const libraryTaint = finalInterProceduralTaint.filter((t: TaintInfo) =>
      t.source?.startsWith('library_function:') || t.source?.startsWith('file_io:') || t.source?.startsWith('user_input:')
    );
    
    return {
      interProceduralTaint: finalInterProceduralTaint.map((t: TaintInfo) => ({
        variable: t.variable,
        source: t.source,
        sourceCategory: t.sourceCategory || 'unknown',
        taintType: t.taintType || 'unknown',
        sourceFunction: t.sourceFunction,
        propagationPath: t.propagationPath || [],
        sourceLocation: t.sourceLocation,
        labels: t.labels || [],
        line: getLineFromSourceLocationIP(t.sourceLocation)
      })),
      taintBySourceFunction: Array.from(taintBySourceFunction.entries()).map(([funcName, taints]) => ({
        functionName: funcName,
        taintCount: taints.length,
        taints: taints.map((t: TaintInfo) => ({
          variable: t.variable,
          source: t.source,
          propagationPath: t.propagationPath || [],
          line: getLineFromSourceLocationIP(t.sourceLocation)
        }))
      })),
      parameterTaint: parameterTaint.length,
      returnTaint: returnTaint.length,
      libraryTaint: libraryTaint.length,
      totalInterProceduralTaint: finalInterProceduralTaint.length
    };
  }

  /**
   * Get sensitivity features text for display
   */
  private getSensitivityFeaturesText(sensitivity: string): string {
    switch (sensitivity) {
      case 'minimal':
        return 'Data-flow taint only';
      case 'conservative':
        return 'Data-flow + Basic control-dependent (no nested)';
      case 'balanced':
        return 'Data-flow + Full recursive control-dependent + Inter-procedural';
      case 'precise':
        return 'All BALANCED features + Path-sensitive + Field-sensitive';
      case 'maximum':
        return 'All PRECISE features + Context-sensitive + Flow-sensitive';
      default:
        return 'Data-flow + Full recursive control-dependent + Inter-procedural';
    }
  }

  /**
   * Get webview HTML content
   */
  private getWebviewContent(
    graphData: any,
    state: AnalysisState,
    functionName: string,
    cspSource: string,
    callGraphData?: any,
    ipaData?: any,
    taintData?: any,
    interconnectedData?: any,
    interProceduralTaintData?: any
  ): string {
    // Helper function to format vulnerability type names
    const formatVulnType = (type: string): string => {
      return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };
    
    // Calculate legend counts from interconnectedData
    let dataFlowTaintBlocks = 0;
    let controlDependentTaintBlocks = 0;
    let syntheticTaintBlocks = 0;
    let mixedTaintBlocks = 0;
    let normalBlocks = 0;
    let controlFlowEdges = 0;
    let functionCallEdges = 0;
    let dataFlowEdges = 0;
    
    if (interconnectedData && interconnectedData.nodes && interconnectedData.edges) {
      const nodes = interconnectedData.nodes;
      const edges = interconnectedData.edges;
      
      // Count block types
      nodes.forEach((node: any) => {
        if (node.metadata) {
          // CRITICAL FIX: Check for synthetic taint first (it's a special case)
          if (node.metadata.hasSyntheticTaint && !node.metadata.hasDataFlowTaint) {
            syntheticTaintBlocks++;
          } else if (node.metadata.hasDataFlowTaint && node.metadata.hasControlDependentTaint) {
            mixedTaintBlocks++;
          } else if (node.metadata.hasControlDependentTaint) {
            controlDependentTaintBlocks++;
          } else if (node.metadata.hasDataFlowTaint) {
            dataFlowTaintBlocks++;
          } else {
            normalBlocks++;
          }
        } else {
          normalBlocks++;
        }
      });
      
      // Count edge types
      edges.forEach((edge: any) => {
        if (edge.metadata && edge.metadata.type) {
          if (edge.metadata.type === 'control_flow') {
            controlFlowEdges++;
          } else if (edge.metadata.type === 'function_call') {
            functionCallEdges++;
          } else if (edge.metadata.type === 'data_flow') {
            dataFlowEdges++;
          }
        }
      });
    }
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' ${cspSource} https://unpkg.com; style-src 'unsafe-inline'; img-src ${cspSource} data:;">
    <title>CFG Visualizer</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            margin: 0;
            padding: 20px;
            background-color: var(--vscode-editor-background);
            color: #333333;
        }
        .header {
            margin-bottom: 20px;
            color: #333333;
        }
        .header h2 {
            color: #333333;
        }
        .function-selector {
            margin-bottom: 20px;
        }
        select {
            padding: 8px;
            background-color: var(--vscode-dropdown-background);
            color: #333333;
            border: 1px solid var(--vscode-dropdown-border);
        }
        label {
            color: #333333;
        }
        #network {
            width: 100%;
            height: 600px;
            border: 1px solid var(--vscode-panel-border);
            background-color: var(--vscode-editor-background);
        }
        .info-panel {
            margin-top: 20px;
            padding: 15px;
            background-color: var(--vscode-editor-selectionBackground);
            border-radius: 5px;
            color: #333333;
        }
        .block-info {
            margin: 10px 0;
            padding: 10px;
            background-color: var(--vscode-editor-background);
            border-left: 3px solid var(--vscode-textLink-foreground);
            color: #333333;
        }
        .liveness-info, .rd-info {
            margin-top: 10px;
            font-size: 0.8em;
        }
        .liveness-info span, .rd-info span, .taint-info span {
            display: inline-block;
            margin: 2px 5px;
            padding: 2px 6px;
            background-color: var(--vscode-badge-background);
            border-radius: 3px;
        }
        .taint-info {
            margin-top: 10px;
            font-size: 0.8em;
        }
        .taint-warning {
            color: #ff6b6b;
            font-weight: bold;
        }
        .taint-path {
            font-size: 0.75em;
            color: #666666;
            margin-left: 15px;
        }
        .summary-panel {
            margin-top: 20px;
            padding: 15px;
            background-color: var(--vscode-editor-selectionBackground);
            border-radius: 5px;
            color: #333333;
        }
        .summary-section {
            margin: 10px 0;
            color: #333333;
        }
        .summary-section h4 {
            margin-top: 0;
            margin-bottom: 10px;
            color: #333333;
        }
        .tab-container {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .tab {
            padding: 8px 16px;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            color: #333333;
        }
        .tab.active {
            border-bottom-color: var(--vscode-textLink-foreground);
            color: #0066cc;
            font-weight: bold;
        }
        .tab-content {
            display: none;
        }
        .tab-content.active {
            display: block;
        }
        .attack-path-panel {
            margin-top: 20px;
            padding: 15px;
            background-color: var(--vscode-editor-selectionBackground);
            border-radius: 5px;
            border-left: 4px solid #ff6b6b;
        }
        .attack-path-step {
            padding: 8px;
            margin: 5px 0;
            background-color: var(--vscode-editor-background);
            border-left: 3px solid #ff6b6b;
            border-radius: 3px;
        }
        .attack-path-step.source {
            border-left-color: #4ecdc4;
            background-color: #e8f8f5;
        }
        .attack-path-step.sink {
            border-left-color: #ff0000;
            background-color: #ffe0e0;
        }
        .vulnerability-list {
            margin-top: 15px;
        }
        .vulnerability-item {
            padding: 10px;
            margin: 8px 0;
            background-color: var(--vscode-editor-background);
            border-radius: 5px;
            cursor: pointer;
            border: 2px solid transparent;
        }
        .vulnerability-item:hover {
            border-color: var(--vscode-textLink-foreground);
        }
        .vulnerability-item.critical {
            border-left: 4px solid #ff0000;
        }
        .vulnerability-item.high {
            border-left: 4px solid #ff6b6b;
        }
        .vulnerability-item.medium {
            border-left: 4px solid #ffa500;
        }
        .vulnerability-item.low {
            border-left: 4px solid #ffd700;
        }
        .path-highlight {
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        .show-path-btn {
            padding: 5px 10px;
            margin: 5px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 3px;
            cursor: pointer;
        }
        .show-path-btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .debug-toggle-container {
            display: flex;
            align-items: center;
        }
        .debug-toggle-btn {
            transition: background-color 0.2s;
        }
        .debug-toggle-btn:hover {
            opacity: 0.9;
        }
        .debug-toggle-btn.active {
            background-color: #28a745 !important;
        }
        .debug-toggle-btn.inactive {
            background-color: #6c757d !important;
        }
        .edge-toggle-btn {
            transition: background-color 0.2s;
            min-width: 50px;
        }
        .edge-toggle-btn:hover {
            opacity: 0.9;
        }
        .edge-toggle-btn.active {
            background-color: #28a745 !important;
        }
        .edge-toggle-btn.inactive {
            background-color: #6c757d !important;
        }
    </style>
</head>
<body>
    <div class="header">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
            <div style="flex: 1;">
                <h2 style="margin: 0;">Dataflow Analysis: ${functionName}</h2>
                <!-- CRITICAL FIX: Add state source indicator -->
                <div id="stateSourceIndicator" style="margin-top: 5px; font-size: 0.85em; color: #666666;">
                    <span style="padding: 3px 8px; background: ${(state as any).isFromSavedState ? '#fff3cd' : '#d1ecf1'}; border-radius: 3px; border: 1px solid ${(state as any).isFromSavedState ? '#ffc107' : '#0c5460'};">
                        Data Source: ${(state as any).isFromSavedState ? 'Saved State' : 'Current Analysis'}
                        ${(state as any).isFromSavedState && state.timestamp ? ` (${new Date(state.timestamp).toLocaleString()})` : ''}
                    </span>
                </div>
                <div class="function-selector" style="margin-top: 10px;">
            <label>Function: </label>
            <select id="functionSelect">
                ${Array.from(state.cfg.functions.keys()).map(name => 
                  `<option value="${name}" ${name === functionName ? 'selected' : ''}>${name}</option>`
                ).join('')}
            </select>
                </div>
            </div>
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 10px;">
                <div style="display: flex; gap: 10px;">
                    <button id="reAnalyzeBtn" style="padding: 8px 16px; background-color: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px; font-weight: bold;">🔄 Re-analyze</button>
                    <button id="saveStateBtn" style="padding: 8px 16px; background-color: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px; font-weight: bold;">💾 Save State</button>
                </div>
                <div id="reAnalyzeStatus" style="font-size: 0.75em; color: #666666; text-align: center; min-height: 18px;"></div>
                <div id="saveStateStatus" style="font-size: 0.75em; color: #666666; text-align: center; min-height: 18px;"></div>
            </div>
        </div>
        <div class="debug-toggle-container" style="margin-top: 10px;">
            <label for="debugToggle" style="color: #333333; margin-right: 8px;">Show Debug Info:</label>
            <button id="debugToggle" class="debug-toggle-btn active" style="padding: 5px 15px; background-color: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer;">ON</button>
        </div>
    </div>
    
    <!-- Tabs for different views -->
    <div class="tab-container">
        <div class="tab active" data-tab="cfg">CFG</div>
        ${callGraphData ? '<div class="tab" data-tab="callgraph">Call Graph</div>' : ''}
        ${ipaData && (ipaData.parameterAnalysis || ipaData.returnValueAnalysis) ? '<div class="tab" data-tab="params">Parameters & Returns</div>' : ''}
        ${ipaData && ipaData.interProceduralRD ? '<div class="tab" data-tab="ipa">Inter-Procedural</div>' : ''}
        ${taintData ? '<div class="tab" data-tab="taint">Taint Analysis</div>' : ''}
        ${interProceduralTaintData ? '<div class="tab" data-tab="ip-taint">Inter-Procedural Taint</div>' : ''}
        ${interconnectedData ? '<div class="tab" data-tab="interconnected">Interconnected CFG</div>' : ''}
    </div>
    
    <!-- CFG Tab Content -->
    <div class="tab-content active" id="cfg-tab">
        <!-- Color Legend -->
        <div style="margin-bottom: 10px; padding: 10px; background: #f8f9fa; border-radius: 5px; border: 1px solid #dee2e6;">
            <strong style="color: #1864ab; font-size: 0.85em;">Block Color Legend:</strong>
            <div style="display: flex; gap: 15px; margin-top: 8px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 18px; height: 18px; background: #ffd60a; border: 2px solid #ffc300; border-radius: 2px;"></div>
                    <span style="color: #333333; font-size: 0.8em;">Data-flow Taint</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 18px; height: 18px; background: #ffa94d; border: 2px solid #ff8800; border-radius: 2px;"></div>
                    <span style="color: #333333; font-size: 0.8em;">Control-dependent Taint</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 18px; height: 18px; background: #9d4edd; border: 2px solid #7b2cbf; border-radius: 2px;"></div>
                    <span style="color: #333333; font-size: 0.8em;">Mixed Taint</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 18px; height: 18px; background: #c77dff; border: 2px dashed #9d4edd; border-radius: 2px;"></div>
                    <span style="color: #333333; font-size: 0.8em;">Synthetic Taint</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 18px; height: 18px; background: #e8f4f8; border: 2px solid #2e7d32; border-radius: 2px;"></div>
                    <span style="color: #333333; font-size: 0.8em;">Normal Block</span>
                </div>
            </div>
        </div>
        <div id="network" style="width: 100%; height: 600px; border: 1px solid #ccc;"></div>
        <div id="blockInfo" style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 5px; color: #333333;">
            <h3 style="color: #333333;">Block Information</h3>
            <p style="color: #333333;">Click on a node in the graph above to see its details here.</p>
        </div>
    </div>
    
    <!-- Call Graph Tab Content -->
    ${callGraphData ? `
    <div class="tab-content" id="callgraph-tab">
        <div id="callgraph-network" style="width: 100%; height: 600px; border: 1px solid #ccc;"></div>
        <div id="callgraph-info" style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 5px; color: #333333;">
            <h3 style="color: #333333;">Call Graph Information</h3>
            <div id="callgraph-stats" style="margin-bottom: 15px;">
                <p style="color: #333333;"><strong>Functions:</strong> ${callGraphData.nodes.length}</p>
                <p style="color: #333333;"><strong>Function Calls:</strong> ${callGraphData.edges.length}</p>
                <p style="color: #333333;"><strong>Recursive Functions:</strong> ${callGraphData.nodes.filter((n: any) => n.isRecursive).length}</p>
                <p style="color: #333333;"><strong>External Functions:</strong> ${callGraphData.nodes.filter((n: any) => n.isExternal).length}</p>
            </div>
            <div id="callgraph-details" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
                <p style="color: #666666; font-style: italic;">Click on a function node in the graph above to see its details here.</p>
            </div>
        </div>
    </div>
    ` : ''}
    
    <!-- Parameters & Returns Tab Content -->
    ${ipaData && (ipaData.parameterAnalysis || ipaData.returnValueAnalysis) ? `
    <div class="tab-content" id="params-tab">
        ${ipaData.parameterAnalysis ? `
        <div style="margin-bottom: 20px;">
            <h3 style="color: #333333;">Parameter Analysis</h3>
            <div id="parameter-analysis">
                ${ipaData.parameterAnalysis.map((mapping: any) => `
                    <div style="padding: 10px; margin: 5px 0; background: #e8f4f8; border-radius: 5px; color: #333333;">
                        <strong style="color: #333333;">${mapping.formalParam}</strong> ← <span style="color: #333333;">${mapping.actualArg}</span>
                        <br><small style="color: #666666;">Type: ${mapping.derivation.type}, Base: ${mapping.derivation.base}</small>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
        ${ipaData.returnValueAnalysis ? `
        <div>
            <h3 style="color: #333333;">Return Value Analysis</h3>
            <div id="return-analysis">
                ${ipaData.returnValueAnalysis.map((ret: any) => `
                    <div style="padding: 10px; margin: 5px 0; background: ${ret.isTainted ? (ret.taintType === 'synthetic' ? '#f3e5f5' : ret.taintType === 'control-dependent' ? '#ffe0b2' : '#ffe0e0') : '#e8f4f8'}; border-radius: 5px; color: #333333; border-left: ${ret.isTainted ? '4px solid' : 'none'} ${ret.isTainted ? (ret.taintType === 'synthetic' ? '#9d4edd' : ret.taintType === 'control-dependent' ? '#ff8800' : '#dc3545') : ''};" data-line="${ret.line || ''}" data-block-id="${ret.blockId || ''}">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <strong style="color: #333333;">Return:</strong> <span style="color: #333333;">${ret.value || '(void)'}</span>
                            ${ret.isTainted ? `<span style="padding: 2px 6px; background: ${ret.taintType === 'synthetic' ? '#9d4edd' : ret.taintType === 'control-dependent' ? '#ff8800' : '#dc3545'}; color: white; border-radius: 3px; font-size: 0.75em;">${ret.taintType === 'synthetic' ? 'SYNTHETIC TAINT' : ret.taintType === 'control-dependent' ? 'CONTROL-DEPENDENT TAINT' : 'DATA-FLOW TAINT'}</span>` : ''}
                        </div>
                        <br><small style="color: #666666;">Type: ${ret.type}, Block: ${ret.blockId}${ret.line ? `, Line: ${ret.line}` : ''}</small>
                        ${ret.usedVariables && ret.usedVariables.length > 0 ? `<br><small style="color: #666666;">Variables: ${ret.usedVariables.join(', ')}</small>` : ''}
                        ${ret.isTainted && ret.taintType === 'synthetic' ? `<br><small style="color: #666666; font-style: italic;">This return statement is control-dependent (synthetic taint) - no explicit variables but tainted by control flow</small>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
    </div>
    ` : ''}
    
    <!-- Inter-Procedural Analysis Tab Content -->
    ${ipaData && ipaData.interProceduralRD ? `
    <div class="tab-content" id="ipa-tab">
        <h3 style="color: #333333;">Inter-Procedural Reaching Definitions</h3>
        <div id="ipa-rd-info">
            ${ipaData.interProceduralRD.map((blockRD: any) => `
                <div style="padding: 10px; margin: 5px 0; background: #e8f4f8; border-radius: 5px; color: #333333;" data-block-id="${blockRD.blockId}" ${blockRD.line ? `data-line="${blockRD.line}"` : ''}>
                    <strong style="color: #333333;">Block: ${blockRD.blockId}${blockRD.line ? ` (Line ${blockRD.line})` : ''}</strong>
                    ${blockRD.out && blockRD.out.length > 0 ? `
                        <div style="margin-top: 5px;">
                            <strong style="color: #333333;">OUT:</strong>
                            ${blockRD.out.map((varInfo: any) => `
                                <div style="margin-left: 15px;">
                                    <strong style="color: #333333;">${varInfo.variable}:</strong>
                                    ${varInfo.definitions.map((def: any) => `
                                        <div style="margin-left: 15px; font-size: 0.8em; color: #666666;">
                                            ${def.definitionId} [${def.propagationPath.join(' → ')}]
                                        </div>
                                    `).join('')}
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    </div>
    ` : ''}
    
    <!-- Taint Analysis Tab Content -->
    ${taintData ? `
    <div class="tab-content" id="taint-tab">
        ${(taintData.totalTaintedVariables > 0 || taintData.totalVulnerabilities > 0) ? `
        <!-- Summary Statistics -->
        <div style="margin-bottom: 20px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 5px;">
            <h3 style="color: #856404; margin-top: 0;">Taint Analysis Summary</h3>
            <div style="display: flex; gap: 30px; flex-wrap: wrap;">
                <div>
                    <strong style="color: #856404;">Tainted Variables:</strong> 
                    <span style="color: #333333; font-size: 1.0em; font-weight: bold;">${taintData.totalTaintedVariables}</span>
                </div>
                <div>
                    <strong style="color: #856404;">Vulnerabilities:</strong> 
                    <span style="color: #dc3545; font-size: 1.0em; font-weight: bold;">${taintData.totalVulnerabilities}</span>
                </div>
            </div>
            ${taintData.sourcesByCategory && taintData.sourcesByCategory.length > 0 ? `
            <div style="margin-top: 10px;">
                <strong style="color: #856404;">Source Categories:</strong>
                ${taintData.sourcesByCategory.map((cat: any) => `
                    <span style="margin-left: 10px; padding: 3px 8px; background: #fff; border-radius: 3px; color: #333333;">
                        ${cat.category}: ${cat.count}
                    </span>
                `).join('')}
            </div>
            ` : ''}
        </div>
        
        <!-- Tainted Variables Section -->
        ${taintData.taintedVariables && taintData.taintedVariables.length > 0 ? `
        <div style="margin-bottom: 30px;">
            <h3 style="color: #333333;">Tainted Variables</h3>
            <div id="tainted-variables">
                ${taintData.taintedVariables.map((varInfo: any) => {
                    // CRITICAL FIX: Detect synthetic block variables (__block_X__) and show "Block:" instead of "Variable:"
                    const isSynthetic = varInfo.variable && varInfo.variable.startsWith('__block_') && varInfo.variable.endsWith('__');
                    const blockMatch = varInfo.variable ? varInfo.variable.match(/^__block_(\d+)__$/) : null;
                    const displayLabel = isSynthetic ? 'Block' : 'Variable';
                    const displayValue = blockMatch ? blockMatch[1] : varInfo.variable;
                    
                    return `
                    <div style="padding: 15px; margin: 10px 0; background: #ffe0e0; border-left: 4px solid #dc3545; border-radius: 5px;" data-line="${varInfo.line || ''}" data-variable="${varInfo.variable || ''}">
                        <div style="display: flex; align-items: center; margin-bottom: 10px;">
                            <strong style="color: #333333; font-size: 0.95em;">${displayLabel}: ${displayValue}${varInfo.line ? ` (Line ${varInfo.line})` : ''}</strong>
                            <span style="margin-left: 10px; padding: 2px 8px; background: #dc3545; color: white; border-radius: 3px; font-size: 0.75em;">TAINTED</span>
                            ${isSynthetic ? '<span style="margin-left: 10px; padding: 2px 8px; background: #9d4edd; color: white; border-radius: 3px; font-size: 0.75em;">SYNTHETIC</span>' : ''}
                        </div>
                        ${varInfo.sources && varInfo.sources.length > 0 ? `
                        <div style="margin-top: 10px;">
                            <strong style="color: #333333;">Sources:</strong>
                            ${varInfo.sources.map((source: any) => `
                                <div style="margin-left: 15px; margin-top: 8px; padding: 8px; background: #fff; border-radius: 3px;" ${source.line ? `data-line="${source.line}"` : ''}>
                                    <div style="color: #333333;">
                                        <strong>${source.source}</strong>
                                        ${source.sourceFunction ? `<span style="color: #666666; margin-left: 10px;">(${source.sourceFunction})</span>` : ''}
                                        ${source.line ? `<span style="color: #666666; margin-left: 10px;">Line ${source.line}</span>` : ''}
                                    </div>
                                    <div style="margin-top: 5px; font-size: 0.8em; color: #666666;">
                                        <span style="padding: 2px 6px; background: #e8f4f8; border-radius: 3px; margin-right: 5px;">
                                            Category: ${source.category}
                                        </span>
                                        <span style="padding: 2px 6px; background: #e8f4f8; border-radius: 3px;">
                                            Type: ${source.taintType}
                                        </span>
                                    </div>
                                    ${source.propagationPath && source.propagationPath.length > 0 ? `
                                    <div style="margin-top: 5px; font-size: 0.75em; color: #666666;">
                                        <strong>Path:</strong> ${source.propagationPath.join(' → ')}
                                    </div>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                        ` : ''}
                    </div>
                `;
                }).join('')}
            </div>
        </div>
        ` : ''}
        
        <!-- Vulnerabilities Section -->
        ${taintData.vulnerabilities && taintData.vulnerabilities.length > 0 ? `
        <div>
            <h3 style="color: #333333;">Detected Vulnerabilities</h3>
            <div id="taint-vulnerabilities">
                ${taintData.vulnerabilities.map((vuln: any) => `
                    <div class="vulnerability-item ${vuln.severity}" style="padding: 15px; margin: 10px 0; background: ${vuln.severity === 'critical' ? '#ffe0e0' : vuln.severity === 'high' ? '#ffe8e8' : '#fff3cd'}; border-radius: 5px; cursor: pointer;" onclick="highlightVulnerabilityPath('${vuln.id}')" ${vuln.line ? `data-line="${vuln.line}"` : ''}>
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div style="flex: 1;">
                                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                                    <strong style="color: #333333; font-size: 0.95em;">${formatVulnType(vuln.type)}</strong>
                                    <span style="margin-left: 10px; padding: 2px 8px; background: ${vuln.severity === 'critical' ? '#dc3545' : vuln.severity === 'high' ? '#ff6b6b' : '#ffa500'}; color: white; border-radius: 3px; font-size: 0.75em; text-transform: uppercase;">
                                        ${vuln.severity}
                                    </span>
                                    ${vuln.cweId ? `<span style="margin-left: 10px; padding: 2px 8px; background: #e8f4f8; border-radius: 3px; font-size: 0.75em; color: #333333;">${vuln.cweId}</span>` : ''}
                                </div>
                                ${vuln.description ? `<p style="color: #333333; margin: 5px 0;">${vuln.description}</p>` : ''}
                                <div style="margin-top: 10px; font-size: 0.8em;">
                                    <div style="color: #333333; margin: 5px 0;">
                                        <strong>Source:</strong> ${vuln.source.variable} in ${vuln.source.function} (${vuln.source.statement})
                                    </div>
                                    <div style="color: #333333; margin: 5px 0;">
                                        <strong>Sink:</strong> ${vuln.sink.function}(${vuln.sink.argumentIndex >= 0 ? `arg[${vuln.sink.argumentIndex}]` : 'unknown'}) - ${vuln.sink.statement}
                                    </div>
                                    ${vuln.propagationPath && vuln.propagationPath.length > 0 ? `
                                    <div style="margin-top: 8px; padding: 8px; background: #fff; border-radius: 3px;">
                                        <strong style="color: #333333;">Propagation Path:</strong>
                                        <div style="margin-top: 5px; color: #666666; font-size: 0.85em;">
                                            ${vuln.propagationPath.map((step: any) => `${step.function}:${step.blockId}`).join(' → ')}
                                        </div>
                                    </div>
                                    ` : ''}
                                    ${vuln.sanitized ? `
                                    <div style="margin-top: 8px; padding: 5px; background: #d4edda; border-radius: 3px; color: #155724;">
                                        ✓ Sanitized: ${vuln.sanitizationPoints && vuln.sanitizationPoints.length > 0 ? vuln.sanitizationPoints.map((sp: any) => sp.location).join(', ') : 'Yes'}
                                    </div>
                                    ` : `
                                    <div style="margin-top: 8px; padding: 5px; background: #f8d7da; border-radius: 3px; color: #721c24;">
                                        ⚠ Not Sanitized
                                    </div>
                                    `}
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : `
        <div style="padding: 20px; text-align: center; color: #666666;">
            <p>No vulnerabilities detected. All tainted data flows are safe.</p>
        </div>
        `}
        ` : `
        <!-- No Taint Data Message -->
        <div style="padding: 30px; text-align: center;">
            <h3 style="color: #333333; margin-bottom: 15px;">Taint Analysis</h3>
            <div style="padding: 20px; background: #e8f4f8; border-radius: 5px; color: #333333;">
                <p style="margin-bottom: 10px;">No taint analysis data found for this function.</p>
                <p style="font-size: 0.8em; color: #666666;">
                    This could mean:
                </p>
                <ul style="text-align: left; display: inline-block; margin-top: 10px; color: #666666;">
                    <li>No taint sources were detected in this function</li>
                    <li>Taint analysis may not have run yet</li>
                    <li>Make sure taint analysis is enabled in settings</li>
                </ul>
                <p style="margin-top: 15px; font-size: 0.9em; color: #666666;">
                    To test taint analysis, try using functions like <code>scanf</code>, <code>gets</code>, or <code>fgets</code> in your code.
                </p>
            </div>
        </div>
        `}
    </div>
    ` : ''}
    
    <!-- Inter-Procedural Taint Analysis Tab Content -->
    ${interProceduralTaintData ? `
    <div class="tab-content" id="ip-taint-tab">
        <!-- Summary Statistics -->
        <div style="margin-bottom: 20px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 5px;">
            <h3 style="color: #856404; margin-top: 0;">Inter-Procedural Taint Analysis Summary</h3>
            <div style="display: flex; gap: 30px; flex-wrap: wrap;">
                <div>
                    <strong style="color: #856404;">Cross-Function Taint Entries:</strong> 
                    <span style="color: #333333; font-size: 1.0em; font-weight: bold;">${interProceduralTaintData.totalInterProceduralTaint}</span>
                </div>
                <div>
                    <strong style="color: #856404;">Parameter Taint:</strong> 
                    <span style="color: #333333; font-size: 1.0em; font-weight: bold;">${interProceduralTaintData.parameterTaint}</span>
                </div>
                <div>
                    <strong style="color: #856404;">Return Value Taint:</strong> 
                    <span style="color: #333333; font-size: 1.0em; font-weight: bold;">${interProceduralTaintData.returnTaint}</span>
                </div>
                <div>
                    <strong style="color: #856404;">Library Function Taint:</strong> 
                    <span style="color: #333333; font-size: 1.0em; font-weight: bold;">${interProceduralTaintData.libraryTaint}</span>
                </div>
            </div>
        </div>
        
        <!-- Taint by Source Function -->
        ${interProceduralTaintData.taintBySourceFunction && interProceduralTaintData.taintBySourceFunction.length > 0 ? `
        <div style="margin-bottom: 30px;">
            <h3 style="color: #333333;">Taint Flow by Source Function</h3>
            ${interProceduralTaintData.taintBySourceFunction.map((funcInfo: any) => {
                // Get line number from first taint entry if available
                const firstTaintLine = funcInfo.taints && funcInfo.taints.length > 0 ? funcInfo.taints[0].line : undefined;
                
                return `
                <div style="padding: 15px; margin: 10px 0; background: #ffe0e0; border-left: 4px solid #dc3545; border-radius: 5px;" ${firstTaintLine ? `data-line="${firstTaintLine}"` : ''}>
                    <div style="display: flex; align-items: center; margin-bottom: 10px;">
                        <strong style="color: #333333; font-size: 0.95em;">From Function: ${funcInfo.functionName}${firstTaintLine ? ` (Line ${firstTaintLine})` : ''}</strong>
                        <span style="margin-left: 10px; padding: 2px 8px; background: #dc3545; color: white; border-radius: 3px; font-size: 0.75em;">
                            ${funcInfo.taintCount} taint entries
                        </span>
                    </div>
                    <div style="margin-top: 10px;">
                        ${funcInfo.taints.map((taint: any) => {
                            // CRITICAL FIX: Detect synthetic block variables (__block_X__) and show "Block:" instead of "Variable:"
                            const isSynthetic = taint.variable && taint.variable.startsWith('__block_') && taint.variable.endsWith('__');
                            const blockMatch = taint.variable ? taint.variable.match(/^__block_(\d+)__$/) : null;
                            const displayLabel = isSynthetic ? 'Block' : 'Variable';
                            const displayValue = blockMatch ? blockMatch[1] : taint.variable;
                            
                            return `
                            <div style="margin-left: 15px; margin-top: 8px; padding: 8px; background: #fff; border-radius: 3px; cursor: pointer;" ${taint.line ? `data-line="${taint.line}"` : ''}>
                                <div style="color: #333333;">
                                    <strong>${displayLabel}:</strong> ${displayValue}
                                    ${isSynthetic ? '<span style="margin-left: 10px; padding: 2px 6px; background: #9d4edd; color: white; border-radius: 3px; font-size: 0.75em;">SYNTHETIC</span>' : ''}
                                    ${taint.line ? `<span style="color: #666666; margin-left: 10px;">Line ${taint.line}</span>` : ''}
                                </div>
                                <div style="margin-top: 5px; font-size: 0.9em; color: #666666;">
                                    <strong>Source:</strong> ${taint.source}
                                </div>
                                ${taint.propagationPath && taint.propagationPath.length > 0 ? `
                                <div style="margin-top: 5px; font-size: 0.85em; color: #666666;">
                                    <strong>Path:</strong> ${taint.propagationPath.join(' → ')}
                                </div>
                                ` : ''}
                            </div>
                        `;
                        }).join('')}
                    </div>
                </div>
            `;
            }).join('')}
        </div>
        ` : ''}
        
        ${interProceduralTaintData.totalInterProceduralTaint === 0 ? `
        <!-- No Inter-Procedural Taint Message -->
        <div style="padding: 30px; text-align: center; margin-top: 20px;">
            <h3 style="color: #333333; margin-bottom: 15px;">Inter-Procedural Taint Analysis</h3>
            <div style="padding: 20px; background: #e8f4f8; border-radius: 5px; color: #333333;">
                <p style="margin-bottom: 10px;">No inter-procedural taint detected for this function.</p>
                <p style="font-size: 0.8em; color: #666666;">
                    This could mean:
                </p>
                <ul style="text-align: left; display: inline-block; margin-top: 10px; color: #666666;">
                    <li>No taint flows across function boundaries</li>
                    <li>No taint sources detected in calling functions</li>
                    <li>No parameter or return value taint propagation</li>
                    <li>Inter-procedural taint analysis may not have run yet</li>
                </ul>
                <p style="margin-top: 15px; font-size: 0.9em; color: #666666;">
                    To test inter-procedural taint analysis, try calling functions with tainted arguments or returning tainted values.
                </p>
            </div>
        </div>
        ` : ''}
        
        <!-- Detailed Inter-Procedural Taint Entries -->
        ${interProceduralTaintData.interProceduralTaint && interProceduralTaintData.interProceduralTaint.length > 0 ? `
        <div style="margin-bottom: 30px;">
            <h3 style="color: #333333;">Detailed Inter-Procedural Taint Entries</h3>
            ${interProceduralTaintData.interProceduralTaint.map((taint: any, index: number) => `
                <div style="padding: 15px; margin: 10px 0; background: #ffe0e0; border-left: 4px solid #dc3545; border-radius: 5px;" ${taint.line ? `data-line="${taint.line}"` : ''}>
                    <div style="display: flex; align-items: center; margin-bottom: 10px;">
                        <strong style="color: #333333; font-size: 0.95em;">Entry ${index + 1}: ${taint.variable}${taint.line ? ` (Line ${taint.line})` : ''}</strong>
                        <span style="margin-left: 10px; padding: 2px 8px; background: #dc3545; color: white; border-radius: 3px; font-size: 0.75em;">
                            TAINTED
                        </span>
                        ${taint.source?.startsWith('parameter:') ? '<span style="margin-left: 5px; padding: 2px 6px; background: #ffc107; color: #333; border-radius: 3px; font-size: 0.7em;">PARAMETER</span>' : ''}
                        ${taint.source?.startsWith('return_value:') ? '<span style="margin-left: 5px; padding: 2px 6px; background: #28a745; color: white; border-radius: 3px; font-size: 0.7em;">RETURN</span>' : ''}
                        ${taint.source?.startsWith('library_function:') || taint.source?.startsWith('file_io:') || taint.source?.startsWith('user_input:') ? '<span style="margin-left: 5px; padding: 2px 6px; background: #17a2b8; color: white; border-radius: 3px; font-size: 0.7em;">LIBRARY</span>' : ''}
                    </div>
                    <div style="margin-top: 10px; font-size: 0.8em; color: #333333;">
                        <div style="margin: 5px 0;">
                            <strong>Source:</strong> ${taint.source}
                            ${taint.sourceFunction ? `<span style="color: #666666; margin-left: 10px;">(${taint.sourceFunction})</span>` : ''}
                        </div>
                        ${taint.sourceFunction && taint.sourceFunction !== functionName ? `
                        <div style="margin: 5px 0; padding: 5px; background: #f0f0f0; border-radius: 3px;">
                            <strong style="color: #0066cc;">Context-Sensitive:</strong> 
                            <span style="color: #333333;">Taint propagated from ${taint.sourceFunction} → ${functionName}</span>
                        </div>
                        ` : ''}
                        <div style="margin: 5px 0;">
                            <strong>Category:</strong> ${taint.sourceCategory || 'unknown'}
                        </div>
                        <div style="margin: 5px 0;">
                            <strong>Type:</strong> ${taint.taintType || 'unknown'}
                        </div>
                        ${taint.propagationPath && taint.propagationPath.length > 0 ? `
                        <div style="margin-top: 8px; padding: 8px; background: #fff; border-radius: 3px;">
                            <strong>Propagation Path:</strong>
                            <div style="margin-top: 5px; color: #666666; font-size: 0.85em;">
                                ${taint.propagationPath.join(' → ')}
                            </div>
                        </div>
                        ` : ''}
                        ${taint.labels && taint.labels.length > 0 ? `
                        <div style="margin-top: 8px;">
                            <strong>Labels:</strong>
                            ${taint.labels.map((label: string) => `
                                <span style="margin-left: 5px; padding: 2px 6px; background: #e8f4f8; border-radius: 3px; font-size: 0.75em;">
                                    ${label}
                                </span>
                            `).join('')}
                        </div>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
        ` : ''}
    </div>
    ` : ''}
    
    <!-- Interconnected CFG Tab Content -->
    ${interconnectedData ? `
    <div class="tab-content" id="interconnected-tab">
        <div style="margin-bottom: 20px; padding: 15px; background: #e7f5ff; border-left: 4px solid #4dabf7; border-radius: 5px;">
            <h3 style="color: #1864ab; margin-top: 0;">Interconnected Control Flow Graph</h3>
            <p style="color: #333333; margin-bottom: 10px;">
                This view shows all functions and their relationships in a unified graph.
            </p>
            
            <!-- Sensitivity Level Dropdown and Re-analysis Button -->
            <div style="margin-top: 15px; margin-bottom: 15px; padding: 10px; background: white; border-radius: 3px;">
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 400px;">
                        <label for="sensitivitySelect" style="color: #1864ab; font-weight: bold; margin-right: 10px;">Taint Analysis Sensitivity:</label>
                        <select id="sensitivitySelect" style="padding: 6px 12px; background-color: var(--vscode-dropdown-background); color: #ffffff; border: 1px solid var(--vscode-dropdown-border); border-radius: 3px; cursor: pointer; font-size: 12px;">
                            <option value="minimal" ${state.taintSensitivity === 'minimal' ? 'selected' : ''}>MINIMAL - Only explicit data-flow (fastest, no control-dependent)</option>
                            <option value="conservative" ${state.taintSensitivity === 'conservative' ? 'selected' : ''}>CONSERVATIVE - Basic control-dependent (direct branches only)</option>
                            <option value="balanced" ${state.taintSensitivity === 'balanced' ? 'selected' : ''}>BALANCED - Full recursive control-dependent + inter-procedural</option>
                            <option value="precise" ${state.taintSensitivity === 'precise' ? 'selected' : (!state.taintSensitivity ? 'selected' : '')}>PRECISE - Path-sensitive + field-sensitive (reduces false positives)</option>
                            <option value="maximum" ${state.taintSensitivity === 'maximum' ? 'selected' : ''}>MAXIMUM - Context-sensitive + flow-sensitive (most precise, slowest)</option>
                        </select>
                        <span id="sensitivityNote" style="margin-left: 10px; color: #666666; font-size: 0.8em; font-style: italic;">Current: ${(state.taintSensitivity || 'precise').toUpperCase()}</span>
                    </div>
                </div>
                <div id="sensitivityFeatures" style="margin-top: 10px; padding: 8px; background: #f0f0f0; border-radius: 3px; font-size: 0.75em;">
                    <strong style="color: #1864ab;">Active Features:</strong>
                    <span id="sensitivityFeaturesList" style="color: #333333;">
                        ${this.getSensitivityFeaturesText(state.taintSensitivity || 'precise')}
                    </span>
                </div>
            </div>
            
            <!-- Edge Type Toggles -->
            <div style="margin-top: 15px; margin-bottom: 15px; padding: 10px; background: white; border-radius: 3px;">
                <strong style="color: #1864ab; display: block; margin-bottom: 10px;">Toggle Edge Types:</strong>
                <div style="display: flex; gap: 20px; flex-wrap: wrap; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <button id="toggleControlFlow" class="edge-toggle-btn active" style="padding: 6px 12px; background-color: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">ON</button>
                        <div style="width: 30px; height: 3px; background: #51cf66;"></div>
                        <span style="color: #333333;">Control Flow</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <button id="toggleFunctionCalls" class="edge-toggle-btn active" style="padding: 6px 12px; background-color: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">ON</button>
                        <div style="width: 30px; height: 3px; background: #4dabf7; border-top: 2px dashed #4dabf7;"></div>
                        <span style="color: #333333;">Function Calls</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <button id="toggleDataFlow" class="edge-toggle-btn active" style="padding: 6px 12px; background-color: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">ON</button>
                        <div style="width: 30px; height: 3px; background: #ffa94d; border-top: 2px dashed #ffa94d;"></div>
                        <span style="color: #333333;">Data Flow</span>
                    </div>
                </div>
            </div>
            
            <div style="display: flex; gap: 30px; flex-wrap: wrap; margin-top: 15px;">
                <div>
                    <strong style="color: #1864ab;">Total Functions:</strong>
                    <span style="color: #333333;">${interconnectedData && interconnectedData.functions ? interconnectedData.functions.length : 0}</span>
                </div>
                <div>
                    <strong style="color: #1864ab;">Total Nodes:</strong>
                    <span style="color: #333333;">${interconnectedData && interconnectedData.nodes ? interconnectedData.nodes.length : 0}</span>
                </div>
                <div>
                    <strong style="color: #1864ab;">Total Edges:</strong>
                    <span style="color: #333333;">${interconnectedData && interconnectedData.edges ? interconnectedData.edges.length : 0}</span>
                </div>
            </div>
            <div style="margin-top: 15px; padding: 10px; background: white; border-radius: 3px;">
                <strong style="color: #1864ab;">Legend:</strong>
                ${interconnectedData && interconnectedData.nodes && interconnectedData.edges ? `
                    <div style="margin-top: 12px;">
                        <div style="margin-bottom: 12px;">
                            <strong style="color: #1864ab; font-size: 0.85em;">Block Types:</strong>
                            <div style="display: flex; gap: 15px; margin-top: 8px; flex-wrap: wrap;">
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <div style="width: 20px; height: 20px; background: #ffd60a; border: 2px solid #ffc300; border-radius: 2px;"></div>
                                    <span style="color: #333333; font-size: 0.8em;">Data-flow Taint</span>
                                    <span style="color: #666666; font-size: 0.75em; margin-left: 4px;">(${dataFlowTaintBlocks})</span>
                    </div>
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <div style="width: 20px; height: 20px; background: #ffa94d; border: 2px dashed #ff8800; border-radius: 2px;"></div>
                                    <span style="color: #333333; font-size: 0.8em;">Control-dependent Taint</span>
                                    <span style="color: #666666; font-size: 0.75em; margin-left: 4px;">(${controlDependentTaintBlocks})</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <div style="width: 20px; height: 20px; background: #9d4edd; border: 2px solid #7b2cbf; border-radius: 2px;"></div>
                                    <span style="color: #333333; font-size: 0.8em;">Mixed Taint</span>
                                    <span style="color: #666666; font-size: 0.75em; margin-left: 4px;">(${mixedTaintBlocks})</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <div style="width: 20px; height: 20px; background: #c77dff; border: 2px dashed #9d4edd; border-radius: 2px;"></div>
                                    <span style="color: #333333; font-size: 0.8em;">Synthetic Taint</span>
                                    <span style="color: #666666; font-size: 0.75em; margin-left: 4px;">(${syntheticTaintBlocks})</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <div style="width: 20px; height: 20px; background: #e8f4f8; border: 2px solid #2e7d32; border-radius: 2px;"></div>
                                    <span style="color: #333333; font-size: 0.8em;">Normal Blocks</span>
                                    <span style="color: #666666; font-size: 0.75em; margin-left: 4px;">(${normalBlocks})</span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <strong style="color: #1864ab; font-size: 0.85em;">Edge Types:</strong>
                            <div style="display: flex; gap: 15px; margin-top: 8px; flex-wrap: wrap;">
                                <div style="display: flex; align-items: center; gap: 6px;">
                        <div style="width: 30px; height: 3px; background: #51cf66;"></div>
                                    <span style="color: #333333; font-size: 0.8em;">Control Flow</span>
                                    <span style="color: #666666; font-size: 0.75em; margin-left: 4px;">(${controlFlowEdges})</span>
                    </div>
                                <div style="display: flex; align-items: center; gap: 6px;">
                        <div style="width: 30px; height: 3px; background: #4dabf7; border-top: 2px dashed #4dabf7;"></div>
                                    <span style="color: #333333; font-size: 0.8em;">Function Calls</span>
                                    <span style="color: #666666; font-size: 0.75em; margin-left: 4px;">(${functionCallEdges})</span>
                    </div>
                                <div style="display: flex; align-items: center; gap: 6px;">
                        <div style="width: 30px; height: 3px; background: #ffa94d; border-top: 2px dashed #ffa94d;"></div>
                                    <span style="color: #333333; font-size: 0.8em;">Data Flow</span>
                                    <span style="color: #666666; font-size: 0.75em; margin-left: 4px;">(${dataFlowEdges})</span>
                    </div>
                </div>
                        </div>
                    </div>
                ` : '<div style="color: #666666; margin-top: 8px;">No data available</div>'}
            </div>
        </div>
        
        <div id="interconnected-network" style="width: 100%; height: 800px; border: 1px solid #ccc; background: white;"></div>
        
        <div id="interconnected-info" style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 5px; color: #333333;">
            <h4 style="color: #1864ab;">Node Information</h4>
            <p style="color: #666666;">Click on a node to see details</p>
        </div>
    </div>
    ` : ''}
    
    <!-- Debug Panel (initially visible, can be toggled) -->
    <div id="debug-panel" style="margin-top: 20px; padding: 15px; background: #fff3cd; border: 2px solid #ffc107; border-radius: 5px;">
        <h3 style="color: #856404;">Debug Information</h3>
        <div id="debug-logs" style="max-height: 200px; overflow-y: auto; font-family: monospace; font-size: 10px; background: white; padding: 10px; border-radius: 3px;">
            <div style="color: #007bff;">✓ HTML loaded</div>
            <div style="color: #28a745;">✓ vis-network loading from CDN...</div>
        </div>
    </div>
        

    <script type="application/json" id="graph-data-json">
${JSON.stringify(graphData, (key, value) => {
        // Replace null/undefined with empty values to prevent "null" in HTML
        if (value === null || value === undefined) {
            return '';
        }
        return value;
    }).replace(/<\//g, '<\\/')}
    </script>
    
    <script type="application/json" id="callgraph-data-json">
${callGraphData ? JSON.stringify(callGraphData, (key, value) => {
        // Keep null/undefined for filePath and startLine (needed for double-click)
        if (key === 'filePath' || key === 'startLine') {
            return value !== null && value !== undefined ? value : null;
        }
        // Replace null/undefined with empty values for other fields to prevent "null" in HTML
        if (value === null || value === undefined) {
            return '';
        }
        return value;
    }).replace(/<\//g, '<\\/') : '{}'}
    </script>
    
    <script type="application/json" id="ipa-data-json">
${ipaData ? JSON.stringify(ipaData, (key, value) => {
        // Replace null/undefined with empty values to prevent "null" in HTML
        if (value === null || value === undefined) {
            return '';
        }
        return value;
    }).replace(/<\//g, '<\\/') : '{}'}
    </script>
    
    <script type="application/json" id="taint-data-json">
${taintData ? JSON.stringify(taintData, (key, value) => {
        // Replace null/undefined with empty values to prevent "null" in HTML
        if (value === null || value === undefined) {
            return '';
        }
        return value;
    }).replace(/<\//g, '<\\/') : '{}'}
    </script>
    
    <script type="application/json" id="interconnected-data-json">
${interconnectedData ? JSON.stringify(interconnectedData, (key, value) => {
        // Replace null/undefined with empty values to prevent "null" in HTML
        if (value === null || value === undefined) {
            return '';
        }
        return value;
    }).replace(/<\//g, '<\\/') : '{}'}
    </script>
    
    <script type="application/json" id="state-data-json">
${JSON.stringify({ 
        taintSensitivity: state.taintSensitivity || 'precise',
        isFromSavedState: (state as any).isFromSavedState || false,
        timestamp: state.timestamp || Date.now()
    }, (key, value) => {
        // Replace null/undefined with empty values to prevent "null" in HTML
        if (value === null || value === undefined) {
            return '';
        }
        return value;
    }).replace(/<\//g, '<\\/')}
    </script>

    <script>
        // Simple debugging
        function logDebug(message) {
            var debugDiv = document.getElementById('debug-logs');
            if (debugDiv) {
                var timestamp = new Date().toLocaleTimeString();
                debugDiv.innerHTML += '<div style="color: #007bff; margin: 2px 0; font-size: 9px;">[' + timestamp + '] ' + message + '</div>';
                debugDiv.scrollTop = debugDiv.scrollHeight;
            }
        }

        logDebug('Starting initialization...');
        
        // CRITICAL: Acquire VS Code API once at the top level
        // This must be done before any event listeners that use it
        const vscode = acquireVsCodeApi();
        logDebug('VS Code API acquired');
        
        // Helper function to get file path for current function
        function getCurrentFunctionFilePath() {
            try {
                const graphDataElement = document.getElementById('graph-data-json');
                if (graphDataElement) {
                    const graphData = JSON.parse(graphDataElement.textContent);
                    if (graphData && graphData.nodes && graphData.nodes.length > 0) {
                        const firstNode = graphData.nodes[0];
                        if (firstNode && firstNode.filePath) {
                            return firstNode.filePath;
                        }
                    }
                }
                // Fallback: try interconnected data
                const interconnectedDataElement = document.getElementById('interconnected-data-json');
                if (interconnectedDataElement) {
                    const interconnectedData = JSON.parse(interconnectedDataElement.textContent);
                    if (interconnectedData && interconnectedData.nodes && interconnectedData.nodes.length > 0) {
                        const firstNode = interconnectedData.nodes[0];
                        if (firstNode && firstNode.metadata && firstNode.metadata.filePath) {
                            return firstNode.metadata.filePath;
                        }
                    }
                }
            } catch (e) {
                logDebug('WARNING: Failed to get file path: ' + e);
            }
            return null;
        }
        
        // Helper to extract line number from text (e.g., "Block: B5", "Line 42", etc.)
        function extractLineNumber(text) {
            if (!text) return null;
            // Try to find "Line X" pattern
            const lineMatch = text.match(/Line\s+(\d+)/i);
            if (lineMatch) {
                return parseInt(lineMatch[1], 10);
            }
            // Try to find block ID and get line from block data
            const blockMatch = text.match(/Block[:\s]+(B\d+|block_\d+)/i);
            if (blockMatch) {
                const blockId = blockMatch[1];
                // Try to get line from graph data
                try {
                    const graphDataElement = document.getElementById('graph-data-json');
                    if (graphDataElement) {
                        const graphData = JSON.parse(graphDataElement.textContent);
                        if (graphData && graphData.nodes) {
                            const blockNode = graphData.nodes.find(function(n) {
                                return n.id === blockId || n.id === blockId.replace('B', 'block_');
                            });
                            if (blockNode && blockNode.startLine) {
                                return blockNode.startLine;
                            }
                        }
                    }
                } catch (e) {
                    // Ignore
                }
            }
            return null;
        }
        
        // Add double-click handlers for HTML-based tabs (Taint, IPA, Parameters)
        function setupHTMLTabDoubleClick() {
            const filePath = getCurrentFunctionFilePath();
            if (!filePath) {
                logDebug('WARNING: No file path available for HTML tab double-click');
                return;
            }
            
            // Helper to get line number from element
            function getLineFromElement(element) {
                // Check data attribute first
                if (element.dataset && element.dataset.line) {
                    return parseInt(element.dataset.line, 10);
                }
                // Check text content for line number
                const lineNum = extractLineNumber(element.textContent);
                if (lineNum) return lineNum;
                // Check parent elements
                let parent = element.parentElement;
                for (let i = 0; i < 3 && parent; i++) {
                    if (parent.dataset && parent.dataset.line) {
                        return parseInt(parent.dataset.line, 10);
                    }
                    const parentLineNum = extractLineNumber(parent.textContent);
                    if (parentLineNum) return parentLineNum;
                    parent = parent.parentElement;
                }
                return null;
            }
            
            // Add double-click handler to all divs in taint/IPA/params tabs
            const tabContents = ['taint-tab', 'ip-taint-tab', 'params-tab', 'ipa-tab'];
            tabContents.forEach(function(tabId) {
                const tab = document.getElementById(tabId);
                if (tab) {
                    // Add double-click handler to all clickable divs
                    // Select divs with padding style OR divs with data-line attribute
                    const divs = tab.querySelectorAll('div[style*="padding"], div[data-line]');
                    divs.forEach(function(div) {
                        // Skip if already has cursor style set
                        if (div.style.cursor === 'pointer') return;
                        
                        div.style.cursor = 'pointer';
                        const lineNum = getLineFromElement(div);
                        div.title = 'Double-click to open file' + (lineNum ? ' at line ' + lineNum : '');
                        div.addEventListener('dblclick', function() {
                            const line = getLineFromElement(div) || 1;
                            logDebug('Double-click on HTML element in ' + tabId + ', opening file: ' + filePath + ' at line ' + line);
                            vscode.postMessage({
                                type: 'openFileAtLine',
                                filePath: filePath,
                                line: line
                            });
                        });
                    });
                }
            });
            logDebug('HTML tab double-click handlers set up');
        }

        // Debug panel toggle functionality
        let debugVisible = true;
        const debugToggle = document.getElementById('debugToggle');
        const debugPanel = document.getElementById('debug-panel');
        
        if (debugToggle && debugPanel) {
            debugToggle.addEventListener('click', function() {
                debugVisible = !debugVisible;
                if (debugVisible) {
                    debugPanel.style.display = 'block';
                    debugToggle.textContent = 'ON';
                    debugToggle.classList.remove('inactive');
                    debugToggle.classList.add('active');
                    debugToggle.style.backgroundColor = '#28a745';
                } else {
                    debugPanel.style.display = 'none';
                    debugToggle.textContent = 'OFF';
                    debugToggle.classList.remove('active');
                    debugToggle.classList.add('inactive');
                    debugToggle.style.backgroundColor = '#6c757d';
                }
            });
            // Set initial state
            debugToggle.classList.add('active');
        }

        function initNetwork() {
            // Check if vis-network is loaded
            if (typeof vis === 'undefined') {
                logDebug('vis-network not yet loaded, retrying...');
                setTimeout(initNetwork, 100);
                return;
            }

            logDebug('vis-network loaded, initializing...');

            try {
            // Use the top-level vscode variable (already acquired above)
            const graphDataElement = document.getElementById('graph-data-json');
                
                if (!graphDataElement) {
                    logDebug('ERROR: graph-data-json element not found');
                    showErrorFallback('Graph data element not found. Please reload the visualization.');
                    return;
                }
                
                // Parse JSON with error handling
                let graphData;
                try {
                    graphData = JSON.parse(graphDataElement.textContent);
                } catch (parseError) {
                    logDebug('ERROR: Failed to parse graph data JSON: ' + parseError);
                    showErrorFallback('Failed to parse graph data. The analysis may be corrupted.');
                    return;
                }

            logDebug('Parsed graph data: ' + graphData.nodes.length + ' nodes, ' + graphData.edges.length + ' edges');

                // Create the network
                const nodes = new vis.DataSet(graphData.nodes.map(function(node) {
                    // Create a more detailed label showing the block type and key statements
                    let label = node.label;
                    if (node.statements && node.statements.length > 0) {
                        // Show first 2 statements in the block
                        const statements = node.statements.slice(0, 2).map(function(s) {
                            const stmtText = typeof s === 'string' ? s : s.text;
                            // Truncate long statements
                            return stmtText.length > 30 ? stmtText.substring(0, 27) + '...' : stmtText;
                        });
                        label += '\\n' + statements.join('\\n');
            }
            
            // Use pre-computed colors from backend (based on taint type: data-flow, control-dependent, mixed)
            // Color coding:
            // - Yellow (#ffd60a): Data-flow taint only (explicit propagation)
            // - Orange (#ffa94d): Control-dependent taint only (implicit flow)
            // - Purple (#9d4edd): Mixed taint (both data-flow and control-dependent)
            // - Light blue (#e8f4f8): Normal (no taint)
            const nodeColor = node.color || {
                background: '#e8f4f8',
                border: '#2e7d32',
                highlight: { background: '#74b9ff', border: '#0984e3' }
            };
            
            // Determine font color based on taint status
            const isTainted = node.taintInfo && node.taintInfo.isTainted;
            const fontColor = isTainted ? '#333' : '#333';  // Always use dark text for readability
            
            return {
                id: node.id,
                        label: label,
                shape: 'box',
                color: nodeColor,
                font: {
                    color: fontColor,
                            size: 9,
                            face: 'Monaco, Menlo, "Ubuntu Mono", monospace'
                        },
                        margin: 10,
                widthConstraint: { minimum: 120, maximum: 200 },
                title: node.title  // Tooltip with taint type info
            };
        }));
        
        const edges = new vis.DataSet(graphData.edges);
        
            const container = document.getElementById('network');
            if (!container) {
                logDebug('ERROR: network container element not found');
                showErrorFallback('Network container element not found. Please reload the visualization.');
                return;
            }
            
        const data = { nodes, edges };
        const options = {
            nodes: {
                shape: 'box',
                        font: { size: 9, face: 'Monaco, Menlo, "Ubuntu Mono", monospace' },
                margin: 8,
                        widthConstraint: { minimum: 120, maximum: 200 },
                        heightConstraint: { minimum: 40 }
            },
            edges: {
                        arrows: { to: { enabled: true, scaleFactor: 0.8 } },
                        smooth: { type: 'cubicBezier', forceDirection: 'vertical' },
                        color: { color: '#666', highlight: '#0984e3' },
                        width: 2,
                        font: { size: 8, align: 'top' }
            },
            layout: {
                hierarchical: {
                    direction: 'UD',
                    sortMethod: 'directed',
                            nodeSpacing: 120,
                            levelSeparation: 150,
                            edgeMinimization: false
                }
            },
                    physics: { enabled: false },
                    interaction: {
                        hover: true,
                        tooltipDelay: 200,
                        multiselect: false
            }
        };
        
            // Create network with error handling
            try {
        const network = new vis.Network(container, data, options);
            logDebug('vis.Network created successfully');
                
                // Store network globally for vulnerability path highlighting
                window.network = network;
            } catch (networkError) {
                logDebug('ERROR: Failed to create vis.Network: ' + networkError);
                showErrorFallback('Failed to create network visualization: ' + networkError.message);
                return;
            }

            // Handle function selector changes
            const functionSelect = document.getElementById('functionSelect');
            if (functionSelect) {
                functionSelect.addEventListener('change', function(event) {
                    const selectedFunction = event.target.value;
                    logDebug('[FUNCTION-SELECT] Changed to: ' + selectedFunction);

                    // Send message to extension to update visualization
                    try {
                    vscode.postMessage({
                        type: 'changeFunction',
                        functionName: selectedFunction
                    });
                        logDebug('[FUNCTION-SELECT] Message sent successfully');
                    } catch (messageError) {
                        logDebug('[FUNCTION-SELECT] ERROR: Failed to send message: ' + messageError);
                    }
                });
                logDebug('[FUNCTION-SELECT] Event listener attached');
                } else {
                logDebug('[FUNCTION-SELECT] WARNING: functionSelect element not found (this is OK if no functions available)');
            }
            
            // Handle re-analyze button (in header, available in ALL tabs)
            const reAnalyzeBtn = document.getElementById('reAnalyzeBtn');
            const reAnalyzeStatus = document.getElementById('reAnalyzeStatus');
            if (reAnalyzeBtn) {
                // CRITICAL FIX: Show button on ALL tabs (including Interconnected CFG)
                // The sensitivity dropdown in Interconnected CFG tab can trigger re-analysis,
                // but users should also be able to manually trigger re-analysis from any tab
                reAnalyzeBtn.style.display = 'inline-block';
                if (reAnalyzeStatus) {
                    reAnalyzeStatus.style.display = 'block';
                }
                logDebug('[RE-ANALYZE] Button shown on all tabs (initial load)');
                
                // Clone button to remove any existing listeners
                const newBtn = reAnalyzeBtn.cloneNode(true);
                reAnalyzeBtn.parentNode?.replaceChild(newBtn, reAnalyzeBtn);
                const btn = document.getElementById('reAnalyzeBtn');
                
                if (btn) {
                    btn.addEventListener('click', function() {
                        logDebug('[RE-ANALYZE] 🎯 MAJOR EVENT: Re-analyze button clicked');
                        
                        // Update button state
                        btn.textContent = '🔄 Analyzing...';
                        btn.disabled = true;
                        btn.style.backgroundColor = '#6c757d';
                        if (reAnalyzeStatus) {
                            reAnalyzeStatus.textContent = 'Re-analysis in progress...';
                            reAnalyzeStatus.style.color = '#ff8800';
                        }
                        
                        // Send message to trigger re-analysis with current analyzer config
                        try {
                            logDebug('[RE-ANALYZE] Sending reAnalyze message');
                            vscode.postMessage({
                                type: 'reAnalyze',
                                triggerReAnalysis: true
                            });
                            logDebug('[RE-ANALYZE] Message sent successfully');
                        } catch (error) {
                            logDebug('[RE-ANALYZE] ERROR: Failed to send message: ' + error);
                            // Reset button state on error
                            btn.textContent = '🔄 Re-analyze';
                            btn.disabled = false;
                            btn.style.backgroundColor = '#007bff';
                            if (reAnalyzeStatus) {
                                reAnalyzeStatus.textContent = 'Failed to send message: ' + error;
                                reAnalyzeStatus.style.color = '#dc3545';
                            }
                        }
                    });
                    logDebug('[RE-ANALYZE] Event listener attached to reAnalyzeBtn (all tabs)');
                }
            } else {
                logDebug('[RE-ANALYZE] WARNING: reAnalyzeBtn element not found');
            }
            
            // Handle save state button (in header, available in all tabs)
            const saveStateBtn = document.getElementById('saveStateBtn');
            const saveStateStatus = document.getElementById('saveStateStatus');
            if (saveStateBtn) {
                saveStateBtn.addEventListener('click', function() {
                    logDebug('[SAVE-STATE] Button clicked');
                    try {
                        vscode.postMessage({
                            type: 'saveState'
                        });
                        logDebug('[SAVE-STATE] Message sent successfully');
                        
                        // Update button and status
                        saveStateBtn.textContent = '💾 Saving...';
                        saveStateBtn.disabled = true;
                        saveStateBtn.style.backgroundColor = '#6c757d';
                        if (saveStateStatus) {
                            saveStateStatus.textContent = 'Saving state...';
                            saveStateStatus.style.color = '#ff8800';
                        }
                    } catch (error) {
                        logDebug('[SAVE-STATE] ERROR: Failed to send message: ' + error);
                        if (saveStateStatus) {
                            saveStateStatus.textContent = 'Failed to send message: ' + error;
                            saveStateStatus.style.color = '#dc3545';
                        }
                    }
                });
                logDebug('[SAVE-STATE] Event listener attached to saveStateBtn');
            } else {
                logDebug('[SAVE-STATE] WARNING: saveStateBtn element not found');
            }
            
            // CRITICAL FIX: Global sensitivity dropdown handler (works on ALL tabs)
            // This must be initialized at startup, not just in the Interconnected CFG tab
            function initGlobalSensitivityHandler() {
                const sensitivitySelect = document.getElementById('sensitivitySelect');
                if (!sensitivitySelect) {
                    logDebug('[SENSITIVITY-GLOBAL] sensitivitySelect element not found (dropdown may not be present on this view)');
                    return;
                }
                
                logDebug('[SENSITIVITY-GLOBAL] Initializing global sensitivity handler');
                
                // Clone element to remove any existing listeners
                const newSelect = sensitivitySelect.cloneNode(true);
                sensitivitySelect.parentNode.replaceChild(newSelect, sensitivitySelect);
                logDebug('[SENSITIVITY-GLOBAL] Cloned and replaced sensitivity dropdown element to remove existing listeners');
                
                // Read current sensitivity from state JSON
                let currentSensitivity = 'precise';
                try {
                    const stateDataElement = document.getElementById('state-data-json');
                    if (stateDataElement) {
                        const stateData = JSON.parse(stateDataElement.textContent);
                        currentSensitivity = stateData.taintSensitivity || 'precise';
                        logDebug('[SENSITIVITY-GLOBAL] Read sensitivity from state JSON: ' + currentSensitivity);
                        newSelect.value = currentSensitivity;
                        logDebug('[SENSITIVITY-GLOBAL] Set dropdown value to: ' + currentSensitivity);
                    } else {
                        logDebug('[SENSITIVITY-GLOBAL] state-data-json element not found, using default: precise');
                    }
                } catch (error) {
                    logDebug('[SENSITIVITY-GLOBAL] WARNING: Failed to read state JSON: ' + error);
                }
                
                // Update features list
                const featuresList = document.getElementById('sensitivityFeaturesList');
                if (featuresList) {
                    const featuresText = {
                        'minimal': 'Data-flow taint only',
                        'conservative': 'Data-flow + Basic control-dependent (no nested)',
                        'balanced': 'Data-flow + Full recursive control-dependent + Inter-procedural',
                        'precise': 'All BALANCED features + Path-sensitive + Field-sensitive',
                        'maximum': 'All PRECISE features + Context-sensitive + Flow-sensitive'
                    };
                    featuresList.textContent = featuresText[currentSensitivity] || featuresText['balanced'];
                }
                
                // Update note
                const note = document.getElementById('sensitivityNote');
                if (note) {
                    note.textContent = 'Current: ' + currentSensitivity.toUpperCase();
                    note.style.color = '#666666';
                }
                
                // Attach change event listener
                newSelect.addEventListener('change', function(event) {
                    const selectedSensitivity = event.target.value;
                    
                    // COMPREHENSIVE LOGGING: Sensitivity dropdown change
                    logDebug('[SENSITIVITY-GLOBAL] 🎯 MAJOR EVENT: Sensitivity Dropdown Changed');
                    logDebug('[SENSITIVITY-GLOBAL] User selected: Taint Sensitivity "' + selectedSensitivity + '" from dropdown');
                    logDebug('[SENSITIVITY-GLOBAL] Dropdown changed to: ' + selectedSensitivity);
                    logDebug('[SENSITIVITY-GLOBAL] Previous value was: ' + currentSensitivity);
                    
                    // Skip if no actual change
                    if (selectedSensitivity === currentSensitivity) {
                        logDebug('[SENSITIVITY-GLOBAL] No change detected (' + selectedSensitivity + ' === ' + currentSensitivity + '), skipping');
                        return;
                    }
                    
                    logDebug('[SENSITIVITY-GLOBAL] Sensitivity change confirmed: ' + currentSensitivity + ' -> ' + selectedSensitivity);
                    currentSensitivity = selectedSensitivity;
                    
                    // Update features list
                    if (featuresList) {
                        const featuresText = {
                            'minimal': 'Data-flow taint only',
                            'conservative': 'Data-flow + Basic control-dependent (no nested)',
                            'balanced': 'Data-flow + Full recursive control-dependent + Inter-procedural',
                            'precise': 'All BALANCED features + Path-sensitive + Field-sensitive',
                            'maximum': 'All PRECISE features + Context-sensitive + Flow-sensitive'
                        };
                        const newFeatures = featuresText[selectedSensitivity] || featuresText['balanced'];
                        featuresList.textContent = newFeatures;
                        logDebug('[SENSITIVITY-GLOBAL] Updated features list: ' + newFeatures);
                    }
                    
                    // Update note
                    if (note) {
                        note.textContent = 'Current: ' + selectedSensitivity.toUpperCase() + ' - Re-analyzing...';
                        note.style.color = '#ff8800';
                        logDebug('[SENSITIVITY-GLOBAL] Updated UI note to show: ' + selectedSensitivity.toUpperCase() + ' - Re-analyzing...');
                    }
                    
                    // Send message to trigger re-analysis
                    try {
                        logDebug('[SENSITIVITY-GLOBAL] Preparing to send changeSensitivity message with triggerReAnalysis=true');
                        vscode.postMessage({
                            type: 'changeSensitivity',
                            sensitivity: selectedSensitivity,
                            triggerReAnalysis: true
                        });
                        logDebug('[SENSITIVITY-GLOBAL] ✅ changeSensitivity message sent successfully to extension');
                    } catch (error) {
                        logDebug('[SENSITIVITY-GLOBAL] ❌ ERROR: Failed to send changeSensitivity message: ' + error);
                    }
                });
                
                logDebug('[SENSITIVITY-GLOBAL] ✅ Event listener attached successfully to sensitivity dropdown');
            }
            
            // Initialize sensitivity handler immediately
            logDebug('[SENSITIVITY-GLOBAL] Calling initGlobalSensitivityHandler() to initialize sensitivity dropdown');
            initGlobalSensitivityHandler();
            logDebug('[SENSITIVITY-GLOBAL] ✅ initGlobalSensitivityHandler() completed');
            
            // Function to attach edge toggle handlers (can be called multiple times safely)
            // CRITICAL FIX: Make it globally accessible
            window.attachEdgeToggleHandlers = function attachEdgeToggleHandlers() {
                // Initialize edge visibility state if not already set
                if (!window.icEdgeVisibility) {
                    window.icEdgeVisibility = {
                        controlFlow: true,
                        functionCalls: true,
                        dataFlow: true
                    };
                }
                
                // Initialize toggle functions if not already set
                if (!window.toggleEdgeType) {
                    window.toggleEdgeType = function(edgeType, buttonId) {
                        const button = document.getElementById(buttonId);
                        if (!button) {
                            logDebug('[EDGE-TOGGLE] Button not found: ' + buttonId);
                            return;
                        }
                        if (!window.icNetwork || !window.icEdgeDataSet) {
                            logDebug('[EDGE-TOGGLE] WARNING: Network or dataset not ready, cannot toggle');
                            return;
                        }
                        
                        window.icEdgeVisibility[edgeType] = !window.icEdgeVisibility[edgeType];
                        const isEnabled = window.icEdgeVisibility[edgeType];
                        
                        // Update button
                        button.textContent = isEnabled ? 'ON' : 'OFF';
                        button.style.backgroundColor = isEnabled ? '#28a745' : '#6c757d';
                        button.classList.toggle('active', isEnabled);
                        button.classList.toggle('inactive', !isEnabled);
                        
                        // Update all edge visibility
                        if (window.updateAllEdgeVisibility) {
                            const updatedCount = window.updateAllEdgeVisibility();
                            logDebug('[EDGE-TOGGLE] Edge type ' + edgeType + ' toggled to: ' + (isEnabled ? 'ON' : 'OFF') + ' (updated ' + updatedCount + ' edges)');
                        }
                    };
                }
                
                if (!window.updateAllEdgeVisibility) {
                    window.updateAllEdgeVisibility = function() {
                        if (!window.icEdgeDataSet) return 0;
                        
                        const allEdges = window.icEdgeDataSet.get();
                        const updates = [];
                        
                        allEdges.forEach(function(edge) {
                            const metadata = edge.metadata || {};
                            const metadataType = metadata.type || '';
                            
                            let shouldHide = false;
                            if (metadataType === 'control_flow') {
                                shouldHide = !window.icEdgeVisibility.controlFlow;
                            } else if (metadataType === 'function_call') {
                                shouldHide = !window.icEdgeVisibility.functionCalls;
                            } else if (metadataType === 'data_flow') {
                                shouldHide = !window.icEdgeVisibility.dataFlow;
                            }
                            
                            if (edge.hidden !== shouldHide) {
                                updates.push({
                                    id: edge.id,
                                    hidden: shouldHide
                                });
                            }
                        });
                        
                        if (updates.length > 0) {
                            window.icEdgeDataSet.update(updates);
                        }
                        
                        return updates.length;
                    };
                }
                
                // Attach handlers to toggle buttons
                logDebug('[EDGE-TOGGLE] Attaching toggle button handlers...');
                const toggleControlFlowBtn = document.getElementById('toggleControlFlow');
                if (toggleControlFlowBtn) {
                    // Remove old listener by cloning
                    const newBtn = toggleControlFlowBtn.cloneNode(true);
                    toggleControlFlowBtn.parentNode?.replaceChild(newBtn, toggleControlFlowBtn);
                    const btn = document.getElementById('toggleControlFlow');
                    if (btn) {
                        btn.addEventListener('click', function() {
                            logDebug('[EDGE-TOGGLE] Control Flow button clicked');
                            window.toggleEdgeType('controlFlow', 'toggleControlFlow');
                        });
                        logDebug('[EDGE-TOGGLE] Control Flow handler attached');
                    }
                }
                
                const toggleFunctionCallsBtn = document.getElementById('toggleFunctionCalls');
                if (toggleFunctionCallsBtn) {
                    const newBtn = toggleFunctionCallsBtn.cloneNode(true);
                    toggleFunctionCallsBtn.parentNode?.replaceChild(newBtn, toggleFunctionCallsBtn);
                    const btn = document.getElementById('toggleFunctionCalls');
                    if (btn) {
                        btn.addEventListener('click', function() {
                            logDebug('[EDGE-TOGGLE] Function Calls button clicked');
                            window.toggleEdgeType('functionCalls', 'toggleFunctionCalls');
                        });
                        logDebug('[EDGE-TOGGLE] Function Calls handler attached');
                    }
                }
                
                const toggleDataFlowBtn = document.getElementById('toggleDataFlow');
                if (toggleDataFlowBtn) {
                    const newBtn = toggleDataFlowBtn.cloneNode(true);
                    toggleDataFlowBtn.parentNode?.replaceChild(newBtn, toggleDataFlowBtn);
                    const btn = document.getElementById('toggleDataFlow');
                    if (btn) {
                        btn.addEventListener('click', function() {
                            logDebug('[EDGE-TOGGLE] Data Flow button clicked');
                            window.toggleEdgeType('dataFlow', 'toggleDataFlow');
                        });
                        logDebug('[EDGE-TOGGLE] Data Flow handler attached');
                    }
                }
            }
            
            // Attach edge toggle handlers immediately (buttons exist in HTML)
            // CRITICAL FIX: Use window.attachEdgeToggleHandlers if available, otherwise call directly
            if (window.attachEdgeToggleHandlers) {
                window.attachEdgeToggleHandlers();
            } else if (typeof attachEdgeToggleHandlers === 'function') {
                attachEdgeToggleHandlers();
            }
            logDebug('[EDGE-TOGGLE] Initial toggle handlers attached');
            
            // Handle node click (show info on click)
            if (window.network) {
                window.network.on('click', function(params) {
                    try {
                if (params.nodes.length > 0) {
                    // Clicked on a node - show its info
                    const nodeId = params.nodes[0];
                    const node = graphData.nodes.find(function(n) { return n.id === nodeId; });
                    if (node) {
                        const infoDiv = document.getElementById('blockInfo');
                        if (infoDiv) {
                            // Show block label with function context
                            let html = '<h4 style="color: #333333;">Block: ' + node.label + '</h4>';
                            if (node.hoverContext) {
                                html += '<div style="color: #666666; font-size: 12px; margin-bottom: 8px;"><em>' + node.hoverContext + '</em></div>';
                            } else if (node.functionName && node.blockLabel) {
                                html += '<div style="color: #666666; font-size: 12px; margin-bottom: 8px;"><em>' + node.functionName + ' :: ' + node.blockLabel + '</em></div>';
                            }
                            html += '<div style="color: #333333;"><strong>Statements:</strong><ul style="color: #333333;">';
                            node.statements.forEach(function(stmt) {
                                const stmtText = typeof stmt === 'string' ? stmt : stmt.text;
                                html += '<li style="color: #333333;">' + stmtText + '</li>';
                            });
                            html += '</ul></div>';

                            // Add additional node information
                if (node.liveness) {
                                html += '<div style="color: #333333; margin-top: 10px;"><strong>Live Variables In:</strong> ' +
                                    (node.liveness.in.length > 0 ? node.liveness.in.join(', ') : 'none') + '</div>';
                                html += '<div style="color: #333333;"><strong>Live Variables Out:</strong> ' +
                                    (node.liveness.out.length > 0 ? node.liveness.out.join(', ') : 'none') + '</div>';
            }

                            if (node.reachingDefinitions && node.reachingDefinitions.out) {
                                html += '<div style="color: #333333; margin-top: 10px;"><strong>Reaching Definitions:</strong><br>';
                                Object.keys(node.reachingDefinitions.out).forEach(function(varName) {
                                    html += '<span style="color: #333333; margin-right: 10px;">' + varName + ': ' +
                                        node.reachingDefinitions.out[varName].map(function(def) { return def.sourceCode; }).join('<br>') + '</span><br>';
                });
            html += '</div>';
                            }

                            if (node.taintInfo && node.taintInfo.taintedVariables && node.taintInfo.taintedVariables.length > 0) {
                                html += '<div style="color: #d9534f; margin-top: 10px;"><strong>⚠ Tainted Variables:</strong> ' +
                                    node.taintInfo.taintedVariables.join(', ') + '</div>';
            }

                            infoDiv.innerHTML = html;
                        }
                    }
            } else {
                    // Clicked on empty space - clear info
                    const infoDiv = document.getElementById('blockInfo');
                    if (infoDiv) {
                        infoDiv.innerHTML = '<h3 style="color: #333333;">Block Information</h3><p style="color: #333333;">Click on a node in the graph above to see its details here.</p>';
                    }
                }
                    } catch (clickError) {
                        logDebug('ERROR: Failed to handle node click: ' + clickError);
                    }
            });
            
                // Handle double-click: open file at block location
                window.network.on('doubleClick', function(params) {
                    try {
                        if (params.nodes.length > 0) {
                            const nodeId = params.nodes[0];
                            const node = graphData.nodes.find(function(n) { return n.id === nodeId; });
                            if (node && node.filePath) {
                                logDebug('Double-click on node: ' + nodeId + ', opening file: ' + node.filePath + ' at line ' + (node.startLine || 1));
                                vscode.postMessage({
                                    type: 'openFileAtLine',
                                    filePath: node.filePath,
                                    line: node.startLine || 1
                                });
                            } else if (node) {
                                logDebug('Double-click on node ' + nodeId + ' but no file path available');
                            }
                        }
                    } catch (dblClickError) {
                        logDebug('ERROR: Failed to handle double-click: ' + dblClickError);
                    }
            });
            }
            } catch (initError) {
                logDebug('ERROR: Failed to initialize network: ' + initError);
                showErrorFallback('Failed to initialize network visualization: ' + initError.message);
            }
        }

        // Tab switching functionality
        const tabs = document.querySelectorAll('.tab');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabs.forEach(function(tab) {
            tab.addEventListener('click', function() {
                const targetTab = this.getAttribute('data-tab');
                
                // Remove active class from all tabs and contents
                tabs.forEach(function(t) { t.classList.remove('active'); });
                tabContents.forEach(function(tc) { tc.classList.remove('active'); });
                
                // Add active class to clicked tab and corresponding content
                this.classList.add('active');
                const targetContent = document.getElementById(targetTab + '-tab');
                if (targetContent) {
                    targetContent.classList.add('active');
                    logDebug('Switched to tab: ' + targetTab + ', content element: ' + targetContent.id);
                    
                    // CRITICAL FIX: Update re-analyze button visibility when switching tabs
                    const reAnalyzeBtn = document.getElementById('reAnalyzeBtn');
                    const reAnalyzeStatus = document.getElementById('reAnalyzeStatus');
                    if (reAnalyzeBtn) {
                        // CRITICAL FIX: Show button on ALL tabs (including Interconnected CFG)
                        reAnalyzeBtn.style.display = 'inline-block';
                        if (reAnalyzeStatus) {
                            reAnalyzeStatus.style.display = 'block';
                        }
                        logDebug('[TAB-SWITCH] Re-analyze button shown in ' + targetTab + ' tab (all tabs)');
                    }
                    
                    // Initialize call graph if switching to call graph tab
                    if (targetTab === 'callgraph' && typeof vis !== 'undefined') {
                        initCallGraph();
                    }
                    
                    // Setup double-click handlers for HTML-based tabs
                    if (targetTab === 'taint' || targetTab === 'ip-taint' || targetTab === 'params' || targetTab === 'ipa') {
                        // Small delay to ensure DOM is ready
                        setTimeout(function() {
                            setupHTMLTabDoubleClick();
                        }, 100);
                    }
                    
                    // Initialize interconnected CFG if switching to interconnected tab
                    if (targetTab === 'ip-taint') {
                        // Inter-Procedural Taint tab - no special initialization needed
                        logDebug('Switched to Inter-Procedural Taint tab');
                    } else if (targetTab === 'interconnected' && typeof vis !== 'undefined') {
                        logDebug('Switching to interconnected tab, initializing network...');
                        
                        // CRITICAL FIX: Check if network already exists and data has changed
                        // If network exists but data changed, destroy and re-initialize
                        if (window.icNetwork) {
                            try {
                                // Check if data has changed by comparing sensitivity
                                const stateDataElement = document.getElementById('state-data-json');
                                const interconnectedDataElement = document.getElementById('interconnected-data-json');
                                
                                if (stateDataElement && interconnectedDataElement) {
                                    try {
                                        const stateData = JSON.parse(stateDataElement.textContent);
                                        const interconnectedData = JSON.parse(interconnectedDataElement.textContent);
                                        
                                        const stateSensitivity = stateData.taintSensitivity || 'precise';
                                        const dataSensitivity = interconnectedData.taintSensitivity || stateSensitivity;
                                        
                                        // If sensitivity changed or network exists but data might be stale, re-initialize
                                        if (stateSensitivity !== dataSensitivity || !window.icEdgeDataSet) {
                                            logDebug('[TAB-SWITCH] Data changed or network stale, destroying and re-initializing...');
                                            window.icNetwork.destroy();
                                            window.icNetwork = null;
                                            window.icOriginalEdges = null;
                                            window.icOriginalNodes = null;
                                            window.icEdgeDataSet = null;
                                        } else {
                                            logDebug('[TAB-SWITCH] Network exists and data matches, skipping re-initialization');
                                            // Network already initialized with correct data, just ensure handlers are attached
                                            if (window.attachEdgeToggleHandlers) {
                                                window.attachEdgeToggleHandlers();
                                            }
                                            return; // Skip re-initialization
                                        }
                                    } catch (parseError) {
                                        logDebug('[TAB-SWITCH] WARNING: Failed to check data, re-initializing anyway: ' + parseError);
                                        // If we can't check, destroy and re-initialize to be safe
                                        window.icNetwork.destroy();
                                        window.icNetwork = null;
                                        window.icOriginalEdges = null;
                                        window.icOriginalNodes = null;
                                        window.icEdgeDataSet = null;
                                    }
                                } else {
                                    logDebug('[TAB-SWITCH] Data elements not found, destroying old network and re-initializing...');
                                    window.icNetwork.destroy();
                                    window.icNetwork = null;
                                    window.icOriginalEdges = null;
                                    window.icOriginalNodes = null;
                                    window.icEdgeDataSet = null;
                                }
                            } catch (destroyError) {
                                logDebug('[TAB-SWITCH] WARNING: Failed to destroy old network: ' + destroyError);
                                // Clear references anyway
                                window.icNetwork = null;
                                window.icOriginalEdges = null;
                                window.icOriginalNodes = null;
                                window.icEdgeDataSet = null;
                            }
                        }
                        
                        initInterconnectedNetwork();
                        // Also ensure toggle handlers are attached (in case they weren't attached during init)
                        // CRITICAL FIX: Use window.attachEdgeToggleHandlers if available
                        if (window.attachEdgeToggleHandlers) {
                            window.attachEdgeToggleHandlers();
                        } else if (typeof attachEdgeToggleHandlers === 'function') {
                            attachEdgeToggleHandlers();
                        }
                        
                        // CRITICAL FIX: Show re-analyze button on ALL tabs (including Interconnected CFG)
                        const reAnalyzeBtn = document.getElementById('reAnalyzeBtn');
                        const reAnalyzeStatus = document.getElementById('reAnalyzeStatus');
                        if (reAnalyzeBtn) {
                            reAnalyzeBtn.style.display = 'inline-block';
                            logDebug('[RE-ANALYZE] Button shown in ' + targetTab + ' tab (all tabs)');
                        }
                        if (reAnalyzeStatus) {
                            reAnalyzeStatus.style.display = 'block';
                        }
                    } else {
                        // Show re-analyze button in other tabs
                        const reAnalyzeBtn = document.getElementById('reAnalyzeBtn');
                        const reAnalyzeStatus = document.getElementById('reAnalyzeStatus');
                        if (reAnalyzeBtn) {
                            reAnalyzeBtn.style.display = 'inline-block';
                            logDebug('[RE-ANALYZE] Button shown in ' + targetTab + ' tab');
                        }
                        if (reAnalyzeStatus) {
                            reAnalyzeStatus.style.display = 'block';
                        }
                    }
                } else {
                    logDebug('WARNING: Tab content element not found for: ' + targetTab + '-tab');
                }
            });
        });
        
        // Function to highlight vulnerability path in CFG
        function highlightVulnerabilityPath(vulnId) {
            const taintDataElement = document.getElementById('taint-data-json');
            if (!taintDataElement) return;
            
            try {
                const taintData = JSON.parse(taintDataElement.textContent);
                const vuln = taintData.vulnerabilities.find(function(v) { return v.id === vulnId; });
                if (!vuln || !vuln.propagationPath) return;
                
                // Switch to CFG tab
                const cfgTab = document.querySelector('.tab[data-tab="cfg"]');
                if (cfgTab) {
                    cfgTab.click();
                }
                
                // Highlight blocks in the path after a short delay
                setTimeout(function() {
                    const graphDataElement = document.getElementById('graph-data-json');
                    if (!graphDataElement || typeof vis === 'undefined') return;
                    
                    const graphData = JSON.parse(graphDataElement.textContent);
                    const pathBlocks = vuln.propagationPath.map(function(step) { return step.blockId; });
                    
                    // Update node colors to highlight path
                    if (window.network) {
                        const updatedNodes = graphData.nodes.map(function(node) {
                            if (pathBlocks.includes(node.id)) {
                                var newNode = {};
                                for (var key in node) {
                                    newNode[key] = node[key];
                                }
                                newNode.color = { background: '#ff6b6b', border: '#dc3545' };
                                newNode.font = { color: '#fff', size: 14, face: 'Arial', bold: true };
                                return newNode;
                            }
                            return node;
                        });
                        
                        window.network.setData({ 
                            nodes: new vis.DataSet(updatedNodes), 
                            edges: new vis.DataSet(graphData.edges) 
                        });
                    }
                }, 200);
            } catch (e) {
                LoggingConfig.error('CFGViz', 'Error highlighting vulnerability path', e);
            }
        }
        
        // Make highlightVulnerabilityPath available globally
        window.highlightVulnerabilityPath = highlightVulnerabilityPath;

        // Initialize call graph visualization with error handling
        function initCallGraph() {
            try {
            const callGraphDataElement = document.getElementById('callgraph-data-json');
                if (!callGraphDataElement) {
                    logDebug('WARNING: callgraph-data-json element not found');
                    return;
                }
                
                let callGraphData;
                try {
                    callGraphData = JSON.parse(callGraphDataElement.textContent);
                    logDebug('Call graph data parsed successfully. Nodes: ' + (callGraphData.nodes ? callGraphData.nodes.length : 0));
                    if (callGraphData.nodes && callGraphData.nodes.length > 0) {
                        logDebug('First node sample: id=' + callGraphData.nodes[0].id + ', filePath=' + (callGraphData.nodes[0].filePath || 'null') + ', startLine=' + (callGraphData.nodes[0].startLine || 'null'));
                    }
                } catch (parseError) {
                    logDebug('ERROR: Failed to parse call graph data JSON: ' + parseError);
                    return;
                }
                
            if (!callGraphData || !callGraphData.nodes || callGraphData.nodes.length === 0) {
                logDebug('No call graph data available');
                return;
            }
            
            logDebug('Initializing call graph visualization with ' + callGraphData.nodes.length + ' nodes...');
            
            const cgNodes = new vis.DataSet(callGraphData.nodes.map(function(node) {
                return {
                    id: node.id,
                    label: node.label + '\\n(' + node.parameters + ')',
                    shape: 'ellipse',
                    color: {
                        background: node.isExternal ? '#ffeaa7' : (node.isRecursive ? '#ff6b6b' : '#74b9ff'),
                        border: node.isExternal ? '#fdcb6e' : (node.isRecursive ? '#d63031' : '#0984e3'),
                        highlight: { background: '#a29bfe', border: '#6c5ce7' }
                    },
                    font: {
                        size: 10,
                        face: 'Monaco, Menlo, "Ubuntu Mono", monospace'
                    },
                    title: 'Function: ' + node.label + '\\nParameters: ' + node.parameters + 
                           '\\nRecursive: ' + (node.isRecursive ? 'Yes' : 'No') +
                           '\\nExternal: ' + (node.isExternal ? 'Yes' : 'No') +
                           (node.filePath ? '\\nFile: ' + node.filePath : '') +
                           (node.startLine ? '\\nLine: ' + node.startLine : '') +
                           '\\nDouble-click to open function definition',
                    // Store original node data for double-click handler
                    filePath: node.filePath,
                    startLine: node.startLine
                };
            }));
            
            const cgEdges = new vis.DataSet(callGraphData.edges.map(function(edge) {
                // Build detailed title with arguments
                const argsList = edge.arguments && edge.arguments.length > 0
                    ? edge.arguments.join(', ')
                    : 'no arguments';
                const returnStatus = edge.returnValueUsed ? 'used' : 'unused';
                const title = 'Arguments: ' + argsList + '\\nReturn value: ' + returnStatus;
                
                return {
                    from: edge.from,
                    to: edge.to,
                    label: edge.label || (edge.argumentCount || 0) + ' args',
                    arrows: { to: { enabled: true } },
                    color: { color: '#666', highlight: '#0984e3' },
                    font: { align: 'horizontal', size: 8, face: 'Arial' },
                    smooth: { type: 'cubicBezier', forceDirection: 'none', roundness: 0.5 },
                    length: 250,
                    width: 1.5,
                    title: title
                };
            }));
            
            const cgContainer = document.getElementById('callgraph-network');
            if (!cgContainer) {
                logDebug('ERROR: callgraph-network container not found');
                return;
            }
            
            try {
                const cgData = { nodes: cgNodes, edges: cgEdges };
                const cgOptions = {
                    nodes: {
                        shape: 'ellipse',
                        font: { size: 10 },
                        margin: 8
                    },
                    edges: {
                        arrows: { to: { enabled: true, scaleFactor: 0.8 } },
                        smooth: { type: 'cubicBezier', forceDirection: 'none', roundness: 0.5 },
                        color: { color: '#666' },
                        font: { align: 'horizontal', size: 8, face: 'Arial' },
                        labelHighlightBold: false,
                        length: 250,
                        width: 1.5,
                        selectionWidth: 2
                    },
                    layout: {
                        hierarchical: {
                            direction: 'LR',
                            sortMethod: 'directed',
                            nodeSpacing: 200,
                            levelSeparation: 300,
                            edgeMinimization: true,
                            blockShifting: true
                        }
                    },
                    physics: { enabled: false },
                    interaction: { hover: true }
                };
                
                const cgNetwork = new vis.Network(cgContainer, cgData, cgOptions);
                logDebug('Call graph network created successfully');
                
                // Store callGraphData in a scope-accessible variable for double-click handler
                window.callGraphDataForDoubleClick = callGraphData;
                
                // Handle node click on call graph
                cgNetwork.on('click', function(params) {
                    try {
                    if (params.nodes.length > 0) {
                        // Clicked on a node - show its info
                        const nodeId = params.nodes[0];
                        const node = callGraphData.nodes.find(function(n) { return n.id === nodeId; });
                        if (node) {
                            const detailsDiv = document.getElementById('callgraph-details');
                            if (detailsDiv) {
                                let html = '<h4 style="color: #333333; margin-top: 0;">Function: ' + node.label + '</h4>';
                                html += '<p style="color: #333333;"><strong>Parameters:</strong> ' + (node.parameters || 'none') + '</p>';
                                html += '<p style="color: #333333;"><strong>Recursive:</strong> ' + (node.isRecursive ? 'Yes' : 'No') + '</p>';
                                html += '<p style="color: #333333;"><strong>External:</strong> ' + (node.isExternal ? 'Yes' : 'No') + '</p>';
                                html += '<p style="color: #333333;"><strong>Calls Count:</strong> ' + (node.callsCount || 0) + '</p>';
                                if (node.filePath && node.startLine) {
                                    html += '<p style="color: #333333;"><strong>Location:</strong> ' + node.filePath + ':' + node.startLine + '</p>';
                                }
                                html += '<p style="color: #666666; font-size: 0.85em; margin-top: 10px; font-style: italic;">Double-click to open function definition</p>';
                                detailsDiv.innerHTML = html;
                            }
                        }
                    } else {
                        // Clicked on empty space - clear details
                        const detailsDiv = document.getElementById('callgraph-details');
                        if (detailsDiv) {
                            detailsDiv.innerHTML = '<p style="color: #666666; font-style: italic;">Click on a function node in the graph above to see its details here.</p>';
                        }
                    }
                    } catch (clickError) {
                        logDebug('ERROR: Failed to handle call graph node click: ' + clickError);
                    }
                });
                
                // Handle double-click: open file at function definition
                cgNetwork.on('doubleClick', function(params) {
                    try {
                        console.log('[CallGraph] Double-click event received:', params);
                        logDebug('[CallGraph] Double-click event received, params: ' + JSON.stringify(params));
                        
                        // Use callGraphData from window scope or local scope
                        const cgData = window.callGraphDataForDoubleClick || callGraphData;
                        
                        if (!cgData || !cgData.nodes) {
                            console.error('[CallGraph] callGraphData not available!');
                            logDebug('ERROR: callGraphData not available for double-click');
                            return;
                        }
                        
                        if (params.nodes && params.nodes.length > 0) {
                            const nodeId = params.nodes[0];
                            console.log('[CallGraph] Double-click on node ID:', nodeId);
                            logDebug('Call graph double-click detected on node: ' + nodeId);
                            
                            // Get the node from callGraphData (source of truth)
                            const node = cgData.nodes.find(function(n) { return n.id === nodeId; });
                            
                            console.log('[CallGraph] Node lookup result:', node ? 'found' : 'not found');
                            console.log('[CallGraph] callGraphData.nodes length:', cgData.nodes ? cgData.nodes.length : 0);
                            if (cgData.nodes && cgData.nodes.length > 0) {
                                console.log('[CallGraph] First node sample:', JSON.stringify(cgData.nodes[0], null, 2));
                            }
                            
                            if (node) {
                                console.log('[CallGraph] Node data:', JSON.stringify(node, null, 2));
                                logDebug('Found node in callGraphData: id=' + node.id + ', label=' + node.label + ', filePath=' + (node.filePath || 'null') + ', startLine=' + (node.startLine || 'null'));
                                
                                const filePath = node.filePath || null;
                                const startLine = node.startLine || 1;
                                
                                if (filePath) {
                                    console.log('[CallGraph] Opening file:', filePath, 'at line', startLine);
                                    logDebug('Double-click on call graph node: ' + nodeId + ' (' + node.label + '), opening file: ' + filePath + ' at line ' + startLine);
                                    vscode.postMessage({
                                        type: 'openFileAtLine',
                                        filePath: filePath,
                                        line: startLine
                                    });
                                } else {
                                    console.warn('[CallGraph] No file path for node:', nodeId, 'Node:', JSON.stringify(node, null, 2));
                                    logDebug('Double-click on call graph node ' + nodeId + ' but no file path available. Node data: ' + JSON.stringify(node));
                                }
                            } else {
                                console.warn('[CallGraph] Node not found:', nodeId);
                                const availableIds = cgData.nodes ? cgData.nodes.map(function(n) { return n.id; }).join(', ') : 'none';
                                logDebug('Double-click on call graph node ' + nodeId + ' but node not found in callGraphData. Available nodes: ' + availableIds);
                            }
                        } else {
                            console.log('[CallGraph] Double-click but no nodes selected, params:', JSON.stringify(params));
                            logDebug('Call graph double-click detected but no nodes selected');
                        }
                    } catch (dblClickError) {
                        console.error('[CallGraph] Double-click error:', dblClickError);
                        logDebug('ERROR: Failed to handle call graph double-click: ' + dblClickError);
                        console.error('Call graph double-click error:', dblClickError);
                    }
                });
            } catch (cgError) {
                logDebug('ERROR: Failed to create call graph network: ' + cgError);
            }
            } catch (initError) {
                logDebug('ERROR: Failed to initialize call graph: ' + initError);
            }
        }
        
        // Initialize interconnected CFG network with error handling
        function initInterconnectedNetwork() {
            try {
            const interconnectedDataElement = document.getElementById('interconnected-data-json');
            if (!interconnectedDataElement) {
                    logDebug('WARNING: interconnected-data-json element not found');
                return;
            }
            
                let interconnectedData;
                try {
                    interconnectedData = JSON.parse(interconnectedDataElement.textContent);
                } catch (parseError) {
                    logDebug('ERROR: Failed to parse interconnected data JSON: ' + parseError);
                    return;
                }
                
            if (!interconnectedData || !interconnectedData.nodes || interconnectedData.nodes.length === 0) {
                logDebug('No interconnected CFG data available');
                return;
            }
            
            logDebug('Initializing interconnected CFG visualization with ' + interconnectedData.nodes.length + ' nodes...');
            
            const icContainer = document.getElementById('interconnected-network');
            if (!icContainer) {
                logDebug('ERROR: Interconnected network container not found');
                return;
            }
            
            // Create vis.js datasets
            const icNodes = new vis.DataSet(interconnectedData.nodes);
            
            // Process edges to ensure styling is preserved and add smooth routing
            const processedEdges = interconnectedData.edges.map(function(edge) {
                const processed = {
                    from: edge.from,
                    to: edge.to,
                    arrows: edge.arrows || { to: { enabled: true } },
                    title: edge.title || '',
                    metadata: edge.metadata || {}
                };
                
                // Preserve edge-specific styling
                if (edge.color) {
                    processed.color = edge.color;
                }
                if (edge.width !== undefined) {
                    processed.width = edge.width;
                }
                if (edge.dashes !== undefined) {
                    processed.dashes = edge.dashes;
                }
                
                // Preserve smooth property if set, otherwise add default based on edge type
                if (edge.smooth) {
                    processed.smooth = edge.smooth;
                } else {
                    // Add smooth routing based on edge type to avoid overlaps
                    const edgeType = edge.metadata?.type;
                    if (edgeType === 'control_flow') {
                        processed.smooth = { type: 'continuous', roundness: 0.3 };
                    } else if (edgeType === 'function_call') {
                        processed.smooth = { type: 'continuous', roundness: 0.5 };
                    } else if (edgeType === 'data_flow') {
                        processed.smooth = { type: 'continuous', roundness: 0.7 };
                    } else {
                        processed.smooth = { type: 'continuous', roundness: 0.4 };
                    }
                }
                
                return processed;
            });
            
            // Log edge types for debugging
            const blueEdges = processedEdges.filter(e => e.metadata && e.metadata.type === 'function_call');
            const orangeEdges = processedEdges.filter(e => e.metadata && e.metadata.type === 'data_flow');
            const greenEdges = processedEdges.filter(e => !e.metadata || (!e.metadata.type || e.metadata.type === 'control_flow'));
            logDebug('Edge counts - Blue: ' + blueEdges.length + ', Orange: ' + orangeEdges.length + ', Green: ' + greenEdges.length);
            
            const icEdges = new vis.DataSet(processedEdges);
            
            const icData = {
                nodes: icNodes,
                edges: icEdges
            };
            
            const icOptions = {
                nodes: {
                    shape: 'box',
                    margin: 10,
                    widthConstraint: { maximum: 300 },  // Increased to support dynamic sizing
                    heightConstraint: { maximum: 200 }  // Added height constraint
                },
                edges: {
                    smooth: { type: 'continuous' },  // Use continuous curves for better non-overlapping routing
                    arrows: { to: { enabled: true, scaleFactor: 0.5 } },
                    // Don't override individual edge colors/widths - let each edge specify its own smooth properties
                    color: { inherit: false },
                    width: 1  // Default width, but individual edges can override
                },
                layout: {
                    hierarchical: {
                        enabled: false
                    }
                },
                physics: {
                    enabled: true,
                    stabilization: {
                        enabled: true,
                        iterations: 200
                    },
                    barnesHut: {
                        gravitationalConstant: -8000,
                        centralGravity: 0.3,
                        springLength: 150,
                        springConstant: 0.04
                    }
                },
                interaction: {
                    hover: true,
                    tooltipDelay: 100
                },
                groups: {}
                // CRITICAL FIX: Do NOT set group colors - we want taint-based colors, not function-based colors
                // Individual node colors (based on taint type) will be used instead
            };
            
            // CRITICAL FIX: Removed group color assignment that was overriding individual node colors
            // Nodes already have explicit colors set based on taint type (yellow/orange/purple/light blue)
            // Setting group colors was causing extra colors to appear in the visualization
            
            // Store network reference globally for edge toggling
            window.icNetwork = null;
            
            try {
            const icNetwork = new vis.Network(icContainer, icData, icOptions);
            window.icNetwork = icNetwork; // Store for edge toggling
            logDebug('Interconnected CFG network created successfully');
            
                // Handle node click with error handling
            icNetwork.on('click', function(params) {
                    try {
                if (params.nodes.length > 0) {
                    const nodeId = params.nodes[0];
                    const node = interconnectedData.nodes.find(function(n) { return n.id === nodeId; });
                    if (node && node.metadata) {
                        const infoDiv = document.getElementById('interconnected-info');
                        if (infoDiv) {
                            var html = '<h4 style="color: #1864ab; margin-top: 0;">Node Information</h4>';
                            html += '<p style="color: #333333;"><strong>Function:</strong> ' + node.metadata.function + '</p>';
                            html += '<p style="color: #333333;"><strong>Block ID:</strong> ' + node.metadata.blockId + '</p>';
                            html += '<p style="color: #333333;"><strong>Entry Block:</strong> ' + (node.metadata.isEntry ? 'Yes' : 'No') + '</p>';
                            html += '<p style="color: #333333;"><strong>Exit Block:</strong> ' + (node.metadata.isExit ? 'Yes' : 'No') + '</p>';
                            html += '<p style="color: #333333;"><strong>Label:</strong> ' + node.label + '</p>';
                            if (node.metadata.hasDataFlowTaint || node.metadata.hasControlDependentTaint) {
                                html += '<p style="color: #333333;"><strong>Taint Type:</strong> ';
                                if (node.metadata.hasDataFlowTaint && node.metadata.hasControlDependentTaint) {
                                    html += '<span style="color: #7b2cbf;">Mixed (Data-flow + Control-dependent)</span>';
                                } else if (node.metadata.hasControlDependentTaint) {
                                    html += '<span style="color: #ff8800;">Control-dependent (Implicit Flow)</span>';
                                } else {
                                    html += '<span style="color: #ffc300;">Data-flow (Explicit Flow)</span>';
                                }
                                html += '</p>';
                            }
                            infoDiv.innerHTML = html;
                        }
                    }
                } else {
                    const infoDiv = document.getElementById('interconnected-info');
                    if (infoDiv) {
                        infoDiv.innerHTML = '<h4 style="color: #1864ab;">Node Information</h4><p style="color: #666666;">Click on a node to see details</p>';
                    }
                }
                    } catch (clickError) {
                        logDebug('ERROR: Failed to handle interconnected network node click: ' + clickError);
                    }
                });
                
                // Handle double-click: open file at block location
                icNetwork.on('doubleClick', function(params) {
                    try {
                        if (params.nodes.length > 0) {
                            const nodeId = params.nodes[0];
                            const node = interconnectedData.nodes.find(function(n) { return n.id === nodeId; });
                            if (node && node.metadata && node.metadata.filePath) {
                                logDebug('Double-click on interconnected node: ' + nodeId + ', opening file: ' + node.metadata.filePath + ' at line ' + (node.metadata.startLine || 1));
                                vscode.postMessage({
                                    type: 'openFileAtLine',
                                    filePath: node.metadata.filePath,
                                    line: node.metadata.startLine || 1
                                });
                            } else if (node) {
                                logDebug('Double-click on interconnected node ' + nodeId + ' but no file path available');
                            }
                        }
                    } catch (dblClickError) {
                        logDebug('ERROR: Failed to handle interconnected network double-click: ' + dblClickError);
                    }
                });
                
                // Store original edges and nodes for toggling
                window.icOriginalEdges = processedEdges;
                window.icOriginalNodes = interconnectedData.nodes;
                window.icEdgeVisibility = {
                    controlFlow: true,
                    functionCalls: true,
                    dataFlow: true
                };
                window.icEdgeDataSet = icEdges; // Store the DataSet for updates
                
                // CRITICAL FIX: Call attachEdgeToggleHandlers after network is created
                // Make sure it's defined and accessible
                if (window.attachEdgeToggleHandlers) {
                    window.attachEdgeToggleHandlers();
                    logDebug('[EDGE-TOGGLE] Toggle handlers attached after interconnected network creation');
                } else {
                    logDebug('[EDGE-TOGGLE] WARNING: attachEdgeToggleHandlers not available, will be called later');
                }
                
                // Handle sensitivity dropdown change - CRITICAL FIX: Remove old listener before adding new one
                const sensitivitySelect = document.getElementById('sensitivitySelect');
                if (sensitivitySelect) {
                    // CRITICAL FIX: Remove any existing event listeners by cloning the element
                    const newSelect = sensitivitySelect.cloneNode(true);
                    sensitivitySelect.parentNode.replaceChild(newSelect, sensitivitySelect);
                    
                    // CRITICAL FIX: Read current sensitivity from state JSON data
                    let currentSensitivity = 'precise';
                    try {
                        const stateDataElement = document.getElementById('state-data-json');
                        if (stateDataElement) {
                            const stateData = JSON.parse(stateDataElement.textContent);
                            currentSensitivity = stateData.taintSensitivity || 'precise';
                            logDebug('[SENSITIVITY] Read sensitivity from state JSON: ' + currentSensitivity);
                            
                            // Set dropdown value to match current state
                            newSelect.value = currentSensitivity;
                            logDebug('[SENSITIVITY] Set dropdown value to: ' + currentSensitivity);
                        }
                    } catch (error) {
                        logDebug('[SENSITIVITY] WARNING: Failed to read state JSON: ' + error);
                    }
                    
                    // Update features list to match current sensitivity
                    const featuresList = document.getElementById('sensitivityFeaturesList');
                    if (featuresList) {
                        const featuresText = {
                            'minimal': 'Data-flow taint only',
                            'conservative': 'Data-flow + Basic control-dependent (no nested)',
                            'balanced': 'Data-flow + Full recursive control-dependent + Inter-procedural',
                            'precise': 'All BALANCED features + Path-sensitive + Field-sensitive',
                            'maximum': 'All PRECISE features + Context-sensitive + Flow-sensitive'
                        };
                        featuresList.textContent = featuresText[currentSensitivity] || featuresText['balanced'];
                    }
                    
                    // Update note to show current sensitivity
                    const note = document.getElementById('sensitivityNote');
                    if (note) {
                        note.textContent = 'Current: ' + currentSensitivity.toUpperCase();
                        note.style.color = '#666666';
                    }
                    
                    // Add event listener to the new select element
                    newSelect.addEventListener('change', function(event) {
                        const selectedSensitivity = event.target.value;
                        logDebug('[SENSITIVITY] Dropdown changed to: ' + selectedSensitivity);
                        
                        // Update features list
                        const featuresList = document.getElementById('sensitivityFeaturesList');
                        if (featuresList) {
                            const featuresText = {
                                'minimal': 'Data-flow taint only',
                                'conservative': 'Data-flow + Basic control-dependent (no nested)',
                                'balanced': 'Data-flow + Full recursive control-dependent + Inter-procedural',
                                'precise': 'All BALANCED features + Path-sensitive + Field-sensitive',
                                'maximum': 'All PRECISE features + Context-sensitive + Flow-sensitive'
                            };
                            featuresList.textContent = featuresText[selectedSensitivity] || featuresText['balanced'];
                        }
                        
                        // Update note - re-analysis will be triggered automatically
                        const note = document.getElementById('sensitivityNote');
                        if (note) {
                            note.textContent = 'Current: ' + selectedSensitivity.toUpperCase() + ' - Re-analyzing...';
                            note.style.color = '#ff8800';
                        }
                        
                        // Update VS Code settings and trigger re-analysis automatically
                        try {
                            logDebug('[SENSITIVITY] Sending changeSensitivity message with re-analysis');
                            vscode.postMessage({
                                type: 'changeSensitivity',
                                sensitivity: selectedSensitivity,
                                triggerReAnalysis: true  // Trigger re-analysis automatically
                            });
                            logDebug('[SENSITIVITY] Message sent successfully - re-analysis will be triggered');
                        } catch (error) {
                            logDebug('[SENSITIVITY] ERROR: Failed to send message: ' + error);
                        }
                    });
                    logDebug('[SENSITIVITY] Event listener attached to sensitivitySelect (replaced old element)');
                } else {
                    logDebug('[SENSITIVITY] WARNING: sensitivitySelect element not found (not in Interconnected CFG tab)');
                }
                
                // Note: Re-analyze and Save State button handlers are set up in main initialization
                // (above, outside of tab-specific code) so they work in all tabs
                
                // Function to update all edge visibility based on current toggle states
                function updateAllEdgeVisibility() {
                    if (!window.icEdgeDataSet) return;
                    
                    // Get all edges from the DataSet
                    const allEdges = window.icEdgeDataSet.get();
                    const updates = [];
                    
                    allEdges.forEach(function(edge) {
                        const metadataType = edge.metadata?.type || 'control_flow';
                        let shouldHide = false;
                        
                        // Determine if this edge should be hidden based on its type and visibility settings
                        if (metadataType === 'control_flow' || (!metadataType && !edge.metadata)) {
                            shouldHide = !window.icEdgeVisibility.controlFlow;
                        } else if (metadataType === 'function_call') {
                            shouldHide = !window.icEdgeVisibility.functionCalls;
                        } else if (metadataType === 'data_flow') {
                            shouldHide = !window.icEdgeVisibility.dataFlow;
                        }
                        
                        // Only update if visibility changed
                        if (edge.hidden !== shouldHide) {
                            updates.push({
                                id: edge.id,
                                hidden: shouldHide
                            });
                        }
                    });
                    
                    // Batch update all edges
                    if (updates.length > 0) {
                        window.icEdgeDataSet.update(updates);
                    }
                    
                    return updates.length;
                }
                
                // Handle edge toggle buttons - use hidden property instead of filtering
                function toggleEdgeType(edgeType, buttonId) {
                    const button = document.getElementById(buttonId);
                    if (!button || !window.icNetwork || !window.icEdgeDataSet) return;
                    
                    window.icEdgeVisibility[edgeType] = !window.icEdgeVisibility[edgeType];
                    const isEnabled = window.icEdgeVisibility[edgeType];
                    
                    // Update button
                    button.textContent = isEnabled ? 'ON' : 'OFF';
                    button.style.backgroundColor = isEnabled ? '#28a745' : '#6c757d';
                    button.classList.toggle('active', isEnabled);
                    button.classList.toggle('inactive', !isEnabled);
                    
                    // Update all edge visibility (re-evaluate all edges)
                    const updatedCount = updateAllEdgeVisibility();
                    
                    logDebug('Edge type ' + edgeType + ' toggled to: ' + (isEnabled ? 'ON' : 'OFF') + ' (updated ' + updatedCount + ' edges)');
                }
                
                // Attach toggle button handlers (use global function)
                // Note: Handlers are also attached globally on page load, but re-attach here
                // to ensure they work after network initialization
                attachEdgeToggleHandlers();
                logDebug('[EDGE-TOGGLE] Toggle handlers re-attached after network initialization');
                
            } catch (icError) {
                logDebug('ERROR: Failed to create interconnected network: ' + icError);
            }
            } catch (initError) {
                logDebug('ERROR: Failed to initialize interconnected network: ' + initError);
            }
        }

        // Load vis-network from CDN with enhanced error handling
        logDebug('Loading vis-network from CDN...');
        var script = document.createElement('script');
        script.src = 'https://unpkg.com/vis-network/standalone/umd/vis-network.min.js';
        
        // Timeout handling: fail after 10 seconds
        var loadTimeout = setTimeout(function() {
            if (typeof vis === 'undefined') {
                logDebug('ERROR: vis-network loading timeout after 10 seconds');
                showErrorFallback('Failed to load vis-network library. Please check your internet connection and try again.');
            }
        }, 10000);
        
        script.onload = function() {
            clearTimeout(loadTimeout);
            logDebug('vis-network loaded from CDN successfully');
            // Small delay to ensure vis is fully initialized
            setTimeout(function() {
                if (typeof vis !== 'undefined') {
            initNetwork();
                } else {
                    logDebug('ERROR: vis-network loaded but vis object not available');
                    showErrorFallback('vis-network library loaded but initialization failed.');
                }
            }, 100);
        };
        
        script.onerror = function() {
            clearTimeout(loadTimeout);
            logDebug('ERROR: Failed to load vis-network from CDN');
            showErrorFallback('Failed to load vis-network library. This may be due to network issues or CDN unavailability. Please check your internet connection.');
        };
        
        document.head.appendChild(script);
        
        /**
         * Show error fallback UI when vis-network fails to load
         * 
         * @param errorMessage - Error message to display to user
         */
        function showErrorFallback(errorMessage) {
            const container = document.getElementById('network');
            if (container) {
                container.innerHTML = '<div style="padding: 20px; text-align: center; color: #d63031;">' +
                    '<h3 style="color: #d63031;">⚠️ Visualization Error</h3>' +
                    '<p style="color: #333333;">' + errorMessage + '</p>' +
                    '<button onclick="location.reload()" style="margin-top: 15px; padding: 10px 20px; background: #0984e3; color: white; border: none; border-radius: 5px; cursor: pointer;">Reload Visualization</button>' +
                    '</div>';
            }
            
            // Also show in debug panel
            logDebug('ERROR FALLBACK: ' + errorMessage);
        }

        // Handle messages from extension
        window.addEventListener('message', function(event) {
            const message = event.data;
            logDebug('Received message from extension: ' + JSON.stringify(message));

            if (message.type === 'updateVisualization') {
                logDebug('Updating visualization with new data');
                // This would require reloading the graph data, for now just log
                logDebug('Visualization update requested but not implemented in webview');
            } else if (message.type === 'saveStateResult') {
                const saveStateBtn = document.getElementById('saveStateBtn');
                const saveStateStatus = document.getElementById('saveStateStatus');
                
                if (message.success) {
                    if (saveStateBtn) {
                        saveStateBtn.textContent = '💾 Save State';
                        saveStateBtn.disabled = false;
                        saveStateBtn.style.backgroundColor = '#28a745';
                    }
                    if (saveStateStatus) {
                        saveStateStatus.textContent = 'State saved successfully';
                        saveStateStatus.style.color = '#28a745';
                        // Clear status after 3 seconds
                        setTimeout(() => {
                            if (saveStateStatus) {
                                saveStateStatus.textContent = '';
                            }
                        }, 3000);
                    }
                    logDebug('State saved successfully');
                } else {
                    if (saveStateBtn) {
                        saveStateBtn.textContent = '💾 Save State';
                        saveStateBtn.disabled = false;
                        saveStateBtn.style.backgroundColor = '#28a745';
                    }
                    if (saveStateStatus) {
                        saveStateStatus.textContent = 'Failed to save state: ' + (message.error || 'Unknown error');
                        saveStateStatus.style.color = '#dc3545';
                    }
                    logDebug('State save failed: ' + (message.error || 'Unknown error'));
                }
            } else if (message.type === 'reAnalyzeResult') {
                const reAnalyzeBtn = document.getElementById('reAnalyzeBtn');
                const reAnalyzeStatus = document.getElementById('reAnalyzeStatus');
                
                if (message.success) {
                    if (reAnalyzeBtn) {
                        reAnalyzeBtn.textContent = '🔄 Re-analyze';
                        reAnalyzeBtn.disabled = false;
                        reAnalyzeBtn.style.backgroundColor = '#007bff';
                    }
                    if (reAnalyzeStatus) {
                        reAnalyzeStatus.textContent = 'Re-analysis completed';
                        reAnalyzeStatus.style.color = '#28a745';
                        // Clear status after 3 seconds
                        setTimeout(() => {
                            if (reAnalyzeStatus) {
                                reAnalyzeStatus.textContent = '';
                            }
                        }, 3000);
                    }
                    logDebug('[RE-ANALYZE] Re-analysis completed successfully');
                    
                    // CRITICAL FIX: Re-initialize interconnected network if we're on that tab
                    // The HTML has been updated with new data, but the network needs to be re-initialized
                    const interconnectedTab = document.getElementById('interconnected-tab');
                    const isInterconnectedTab = interconnectedTab && interconnectedTab.classList.contains('active');
                    
                    if (isInterconnectedTab && typeof vis !== 'undefined') {
                        logDebug('[RE-ANALYZE] Re-initializing interconnected network with new data...');
                        
                        // Destroy old network if it exists
                        if (window.icNetwork) {
                            try {
                                window.icNetwork.destroy();
                                logDebug('[RE-ANALYZE] Destroyed old interconnected network');
                            } catch (destroyError) {
                                logDebug('[RE-ANALYZE] WARNING: Failed to destroy old network: ' + destroyError);
                            }
                            window.icNetwork = null;
                        }
                        
                        // Clear old data references
                        window.icOriginalEdges = null;
                        window.icOriginalNodes = null;
                        window.icEdgeDataSet = null;
                        
                        // Re-initialize with new data from updated HTML
                        setTimeout(() => {
                            try {
                                initInterconnectedNetwork();
                                logDebug('[RE-ANALYZE] Interconnected network re-initialized successfully');
                                
                                // Re-attach toggle handlers
                                if (window.attachEdgeToggleHandlers) {
                                    window.attachEdgeToggleHandlers();
                                    logDebug('[RE-ANALYZE] Edge toggle handlers re-attached');
                                }
                                
                                // Update sensitivity dropdown to match new state
                                const stateDataElement = document.getElementById('state-data-json');
                                if (stateDataElement) {
                                    try {
                                        const stateData = JSON.parse(stateDataElement.textContent);
                                        const currentSensitivity = stateData.taintSensitivity || 'precise';
                                        const sensitivitySelect = document.getElementById('sensitivitySelect');
                                        if (sensitivitySelect) {
                                            sensitivitySelect.value = currentSensitivity;
                                            logDebug('[RE-ANALYZE] Updated sensitivity dropdown to: ' + currentSensitivity);
                                            
                                            // Update features list
                                            const featuresList = document.getElementById('sensitivityFeaturesList');
                                            if (featuresList) {
                                                const featuresText = {
                                                    'minimal': 'Data-flow taint only',
                                                    'conservative': 'Data-flow + Basic control-dependent (no nested)',
                                                    'balanced': 'Data-flow + Full recursive control-dependent + Inter-procedural',
                                                    'precise': 'All BALANCED features + Path-sensitive + Field-sensitive',
                                                    'maximum': 'All PRECISE features + Context-sensitive + Flow-sensitive'
                                                };
                                                featuresList.textContent = featuresText[currentSensitivity] || featuresText['balanced'];
                                            }
                                            
                                            // Update note
                                            const note = document.getElementById('sensitivityNote');
                                            if (note) {
                                                note.textContent = 'Current: ' + currentSensitivity.toUpperCase();
                                                note.style.color = '#666666';
                                            }
                                        }
                                    } catch (stateError) {
                                        logDebug('[RE-ANALYZE] WARNING: Failed to update sensitivity dropdown: ' + stateError);
                                    }
                                }
                            } catch (initError) {
                                logDebug('[RE-ANALYZE] ERROR: Failed to re-initialize network: ' + initError);
                            }
                        }, 100); // Small delay to ensure HTML is fully updated
                    } else {
                        logDebug('[RE-ANALYZE] Not on interconnected tab, skipping network re-initialization');
                    }
                } else {
                    if (reAnalyzeBtn) {
                        reAnalyzeBtn.textContent = '🔄 Re-analyze';
                        reAnalyzeBtn.disabled = false;
                        reAnalyzeBtn.style.backgroundColor = '#007bff';
                    }
                    if (reAnalyzeStatus) {
                        reAnalyzeStatus.textContent = 'Re-analysis failed: ' + (message.error || 'Unknown error');
                        reAnalyzeStatus.style.color = '#dc3545';
                    }
                    logDebug('[RE-ANALYZE] Re-analysis failed: ' + (message.error || 'Unknown error'));
                }
            }
        });

        logDebug('Initialization script completed, waiting for vis-network to load');
        
        // CRITICAL FIX: Check if we're on interconnected tab when page loads
        // This handles the case where HTML is updated but we're already on that tab
        function checkAndInitializeInterconnectedTab() {
            const interconnectedTab = document.getElementById('interconnected-tab');
            const isInterconnectedTab = interconnectedTab && interconnectedTab.classList.contains('active');
            
            if (isInterconnectedTab && typeof vis !== 'undefined') {
                logDebug('[INIT] Page loaded on interconnected tab, initializing network...');
                
                // Small delay to ensure all data is parsed
                setTimeout(() => {
                    try {
                        // Check if network already exists
                        if (window.icNetwork) {
                            logDebug('[INIT] Network already exists, checking if data changed...');
                            
                            // Check if data has changed
                            const stateDataElement = document.getElementById('state-data-json');
                            const interconnectedDataElement = document.getElementById('interconnected-data-json');
                            
                            if (stateDataElement && interconnectedDataElement) {
                                try {
                                    const stateData = JSON.parse(stateDataElement.textContent);
                                    const interconnectedData = JSON.parse(interconnectedDataElement.textContent);
                                    
                                    const stateSensitivity = stateData.taintSensitivity || 'precise';
                                    const dataSensitivity = interconnectedData.taintSensitivity || stateSensitivity;
                                    
                                    logDebug('[INIT] State sensitivity: ' + stateSensitivity);
                                    logDebug('[INIT] Data sensitivity: ' + dataSensitivity);
                                    
                                    // If data changed or network is stale, re-initialize
                                    if (stateSensitivity !== dataSensitivity || !window.icEdgeDataSet) {
                                        logDebug('[INIT] Data changed or network stale, re-initializing...');
                                        window.icNetwork.destroy();
                                        window.icNetwork = null;
                                        window.icOriginalEdges = null;
                                        window.icOriginalNodes = null;
                                        window.icEdgeDataSet = null;
                                        initInterconnectedNetwork();
                                        
                                        // Re-attach handlers
                                        if (window.attachEdgeToggleHandlers) {
                                            window.attachEdgeToggleHandlers();
                                        }
                                    } else {
                                        logDebug('[INIT] Network exists and data matches, no re-initialization needed');
                                    }
                                } catch (parseError) {
                                    logDebug('[INIT] WARNING: Failed to check data, re-initializing anyway: ' + parseError);
                                    window.icNetwork.destroy();
                                    window.icNetwork = null;
                                    window.icOriginalEdges = null;
                                    window.icOriginalNodes = null;
                                    window.icEdgeDataSet = null;
                                    initInterconnectedNetwork();
                                    
                                    if (window.attachEdgeToggleHandlers) {
                                        window.attachEdgeToggleHandlers();
                                    }
                                }
                            } else {
                                logDebug('[INIT] Data elements not found, re-initializing network...');
                                window.icNetwork.destroy();
                                window.icNetwork = null;
                                window.icOriginalEdges = null;
                                window.icOriginalNodes = null;
                                window.icEdgeDataSet = null;
                                initInterconnectedNetwork();
                                
                                if (window.attachEdgeToggleHandlers) {
                                    window.attachEdgeToggleHandlers();
                                }
                            }
                        } else {
                            logDebug('[INIT] No network exists, initializing...');
                            initInterconnectedNetwork();
                            
                            if (window.attachEdgeToggleHandlers) {
                                window.attachEdgeToggleHandlers();
                            }
                        }
                    } catch (initError) {
                        logDebug('[INIT] ERROR: Failed to initialize interconnected network: ' + initError);
                    }
                }, 200); // Delay to ensure vis-network and data are ready
            } else {
                logDebug('[INIT] Not on interconnected tab or vis-network not loaded, skipping initialization');
            }
        }
        
        // Check when vis-network loads
        if (typeof vis !== 'undefined') {
            logDebug('[INIT] vis-network already loaded, checking interconnected tab...');
            checkAndInitializeInterconnectedTab();
        } else {
            // Wait for vis-network to load
            window.addEventListener('load', function() {
                logDebug('[INIT] Window loaded, checking interconnected tab...');
                setTimeout(checkAndInitializeInterconnectedTab, 500);
            });
        }
    </script>
</body>
</html>`;
  }

  /**
   * Get empty HTML when no state available
   */
  private getEmptyHtml(message?: string): string {
    const defaultMessage = 'No analysis data available. Run workspace analysis to generate CFG visualization.';
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CFG Visualizer</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            padding: 20px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        .message-container {
            text-align: center;
            max-width: 600px;
        }
        .message-container h2 {
            color: var(--vscode-textLink-foreground);
            margin-bottom: 15px;
        }
        .message-container p {
            line-height: 1.6;
            margin-bottom: 10px;
        }
        .steps {
            text-align: left;
            margin-top: 20px;
            padding: 15px;
            background-color: var(--vscode-editor-selectionBackground);
            border-radius: 5px;
        }
        .steps ol {
            margin: 10px 0;
            padding-left: 25px;
        }
        .steps li {
            margin: 8px 0;
        }
    </style>
</head>
<body>
    <div class="message-container">
        <h2>No CFG Data Available</h2>
        <p>${message || defaultMessage}</p>
        <div class="steps">
            <strong>To generate CFG visualization:</strong>
            <ol>
                <li>Make sure you have C++ files (.cpp, .c, .hpp, .h) in your workspace</li>
                <li>Press <code>Cmd+Shift+P</code> (Mac) or <code>Ctrl+Shift+P</code> (Windows/Linux)</li>
                <li>Type "Analyze Workspace" and select the command</li>
                <li>Wait for the analysis to complete</li>
                <li>Then open this visualizer again</li>
            </ol>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Dispose of all resources
   * 
   * CRITICAL FIX (LOGIC.md #9): Explicitly clear panels Map to prevent memory leaks
   * Ensures all panels are disposed and references are removed
   */
  /**
   * Dispose of all resources
   * 
   * CRITICAL FIX (LOGIC.md #9): Explicitly clear panels Map to prevent memory leaks
   * Ensures all panels are disposed and references are removed.
   */
  dispose(): void {
    LoggingConfig.log('CFGViz', `Disposing visualizer. Cleaning up ${this.panels.size} panels`);
    
    if (this.panel) {
      this.panel.dispose();
      this.panel = undefined;
    }
    // Dispose all tracked panels
    this.panels.forEach((panel, key) => {
      LoggingConfig.detail('CFGViz', `Disposing panel: ${key}`);
      panel.dispose();
    });
    // CRITICAL FIX (LOGIC.md #9): Clear Map to release all references
    this.panels.clear();
    LoggingConfig.log('CFGViz', 'Visualizer disposed successfully');
  }

  /**
   * Log all tab visual data for automated validation
   */
  /**
   * Log all tab visual data for automated validation
   * 
   * Comprehensive logging of visualization data for all tabs.
   * Used for automated testing and validation of visualization correctness.
   * 
   * @param functionName - Function being visualized
   * @param graphData - CFG graph data
   * @param callGraphData - Call graph data
   * @param taintData - Taint analysis data
   * @param interProceduralTaintData - Inter-procedural taint data
   * @param interconnectedData - Interconnected CFG data
   */
  private logAllTabData(
    functionName: string,
    graphData: any,
    callGraphData: any,
    taintData: any,
    interProceduralTaintData: any,
    interconnectedData: any,
    ipaData?: any
  ): void {
    LoggingConfig.section('VizTabs', '========== TAB VISUAL DATA LOG ==========');
    LoggingConfig.log('VizTabs', `Function: ${functionName}`);
    LoggingConfig.detail('VizTabs', `Timestamp: ${new Date().toISOString()}`);
    
    /**
     * TAB 1: CFG DATA LOGGING
     * 
     * Logs CFG tab statistics: nodes, edges, tainted nodes, tainted variables.
     */
    // Tab 1: CFG
    const redNodes = graphData.nodes.filter((n: any) => n.taintInfo?.isTainted).length;
    const taintedVarsInCFG = new Set<string>();
    graphData.nodes.forEach((n: any) => {
      if (n.taintInfo?.taintedVariables) {
        n.taintInfo.taintedVariables.forEach((v: string) => taintedVarsInCFG.add(v));
      }
    });
    LoggingConfig.table('VizTabs', 'CFG Tab', {
      'Total Nodes': graphData.nodes.length,
      'Red/Tainted Nodes': redNodes,
      'Tainted Variables': Array.from(taintedVarsInCFG).join(', ') || 'none',
      'Total Edges': graphData.edges.length
    });
    
    /**
     * TAB 2: CALL GRAPH DATA LOGGING
     * 
     * Logs call graph tab statistics: nodes, edges, edge labels.
     */
    // Tab 2: Call Graph
    if (callGraphData) {
      const edgesWithLabels = callGraphData.edges.filter((e: any) => e.label && !e.label.includes('unused')).length;
      LoggingConfig.table('VizTabs', 'Call Graph Tab', {
        'Total Nodes': callGraphData.nodes.length,
        'Total Edges': callGraphData.edges.length,
        'Edges with Labels': edgesWithLabels,
        'Edge Labels': callGraphData.edges.map((e: any) => e.label || 'no label').join(', ')
      });
    } else {
      LoggingConfig.detail('VizTabs', 'Call Graph Tab: Not available');
    }
    
    /**
     * TAB 3: PARAMETERS & RETURNS DATA LOGGING
     * 
     * Logs Parameters & Returns tab statistics: parameter mappings, return values.
     */
    // Tab 3: Parameters & Returns
    if (ipaData && (ipaData.parameterAnalysis || ipaData.returnValueAnalysis)) {
      const paramCount = ipaData.parameterAnalysis ? ipaData.parameterAnalysis.length : 0;
      const returnCount = ipaData.returnValueAnalysis ? ipaData.returnValueAnalysis.length : 0;
      const taintedReturns = ipaData.returnValueAnalysis ? ipaData.returnValueAnalysis.filter((r: any) => r.isTainted).length : 0;
      
      LoggingConfig.table('VizTabs', 'Parameters & Returns Tab', {
        'Parameter Mappings': paramCount,
        'Return Values': returnCount,
        'Tainted Returns': taintedReturns,
        'Parameter Details': ipaData.parameterAnalysis ? ipaData.parameterAnalysis.map((p: any) => `${p.formalParam}←${p.actualArg}(${p.derivation?.type})`).join(', ') || 'none' : 'none',
        'Return Details': ipaData.returnValueAnalysis ? ipaData.returnValueAnalysis.map((r: any) => `${r.value}(${r.type}${r.isTainted ? ',TAINTED' : ''})`).join(', ') || 'none' : 'none'
      });
      
      // Log detailed parameter mappings
      if (ipaData.parameterAnalysis && ipaData.parameterAnalysis.length > 0) {
        LoggingConfig.detail('VizTabs', 'Parameter Mappings:');
        ipaData.parameterAnalysis.forEach((mapping: any, idx: number) => {
          LoggingConfig.verbose('VizTabs', `  ${idx + 1}. ${mapping.formalParam} ← ${mapping.actualArg} (${mapping.derivation?.type}, base: ${mapping.derivation?.base})`);
        });
      }
      
      // Log detailed return values
      if (ipaData.returnValueAnalysis && ipaData.returnValueAnalysis.length > 0) {
        LoggingConfig.detail('VizTabs', 'Return Values:');
        ipaData.returnValueAnalysis.forEach((ret: any, idx: number) => {
          const taintInfo = ret.isTainted ? ` [${ret.taintType || 'tainted'}]` : '';
          LoggingConfig.verbose('VizTabs', `  ${idx + 1}. ${ret.value || '(void)'} (${ret.type}${taintInfo}, block: ${ret.blockId}${ret.line ? `, line: ${ret.line}` : ''})`);
        });
      }
    } else {
      LoggingConfig.detail('VizTabs', 'Parameters & Returns Tab: Not available');
    }
    
    /**
     * TAB 4: INTER-PROCEDURAL REACHING DEFINITIONS DATA LOGGING
     * 
     * Logs Inter-Procedural tab statistics: reaching definitions across functions.
     */
    // Tab 4: Inter-Procedural Reaching Definitions
    if (ipaData && ipaData.interProceduralRD) {
      const rdBlocks = ipaData.interProceduralRD.length;
      const rdVariables = new Set<string>();
      ipaData.interProceduralRD.forEach((blockRD: any) => {
        if (blockRD.out) {
          blockRD.out.forEach((varInfo: any) => {
            rdVariables.add(varInfo.variable);
          });
        }
      });
      
      LoggingConfig.table('VizTabs', 'Inter-Procedural Tab', {
        'Blocks with RD': rdBlocks,
        'Variables Tracked': rdVariables.size,
        'Variable Names': Array.from(rdVariables).join(', ') || 'none'
      });
      
      // Log detailed RD information
      if (ipaData.interProceduralRD.length > 0) {
        LoggingConfig.detail('VizTabs', 'Inter-Procedural RD Details:');
        ipaData.interProceduralRD.forEach((blockRD: any, idx: number) => {
          const varCount = blockRD.out ? blockRD.out.length : 0;
          const defCount = blockRD.out ? blockRD.out.reduce((sum: number, v: any) => sum + (v.definitions?.length || 0), 0) : 0;
          LoggingConfig.verbose('VizTabs', `  Block ${blockRD.blockId}${blockRD.line ? ` (line ${blockRD.line})` : ''}: ${varCount} variables, ${defCount} definitions`);
        });
      }
    } else {
      LoggingConfig.detail('VizTabs', 'Inter-Procedural Tab: Not available');
    }
    
    /**
     * TAB 5: TAINT ANALYSIS DATA LOGGING
     * 
     * Logs taint analysis tab statistics: tainted variables, vulnerabilities.
     */
    // Tab 5: Taint Analysis
    LoggingConfig.table('VizTabs', 'Taint Analysis Tab', {
      'Total Tainted Variables': taintData.totalTaintedVariables,
      'Total Vulnerabilities': taintData.totalVulnerabilities,
      'Tainted Variable Names': taintData.taintedVariables?.map((v: any) => v.variable).join(', ') || 'none',
      'Vulnerability Types': taintData.vulnerabilities?.map((v: any) => v.type).join(', ') || 'none'
    });
    
    // Log detailed vulnerability information
    if (taintData.vulnerabilities && taintData.vulnerabilities.length > 0) {
      LoggingConfig.detail('VizTabs', 'Vulnerability Details:');
      taintData.vulnerabilities.forEach((vuln: any, idx: number) => {
        LoggingConfig.verbose('VizTabs', `  ${idx + 1}. ${vuln.type} (${vuln.severity}): ${vuln.source.variable} → ${vuln.sink.function}${vuln.sanitized ? ' [SANITIZED]' : ' [NOT SANITIZED]'}`);
      });
    }
    
    /**
     * TAB 6: INTER-PROCEDURAL TAINT DATA LOGGING
     * 
     * Logs inter-procedural taint tab statistics: parameter taint, return taint, library taint.
     */
    // Tab 6: Inter-Procedural Taint
    LoggingConfig.table('VizTabs', 'Inter-Procedural Taint Tab', {
      'Total Entries': interProceduralTaintData.totalInterProceduralTaint,
      'Parameter Taint': interProceduralTaintData.parameterTaint,
      'Return Value Taint': interProceduralTaintData.returnTaint,
      'Library Function Taint': interProceduralTaintData.libraryTaint
    });
    if (interProceduralTaintData.interProceduralTaint && interProceduralTaintData.interProceduralTaint.length > 0) {
      LoggingConfig.detail('VizTabs', 'Entry Details:');
      interProceduralTaintData.interProceduralTaint.forEach((entry: any, idx: number) => {
        const badges = [];
        if (entry.source?.startsWith('parameter:')) badges.push('PARAMETER');
        if (entry.source?.startsWith('return_value:')) badges.push('RETURN');
        if (entry.source?.startsWith('library_function:') || entry.source?.startsWith('file_io:') || entry.source?.startsWith('user_input:')) badges.push('LIBRARY');
        LoggingConfig.verbose('VizTabs', `Entry ${idx + 1}: ${entry.variable} - Source: ${entry.source} [${badges.join(', ') || 'none'}]`);
      });
    }
    
    /**
     * TAB 7: INTERCONNECTED CFG DATA LOGGING
     * 
     * Logs interconnected CFG tab statistics: functions, nodes, edges by type.
     */
    // Tab 7: Interconnected CFG
    const redBlocks = interconnectedData.nodes.filter((n: any) => {
      const bg = n.color?.background;
      return bg === '#ffe0e0' || bg === '#ffcccc' || (n.metadata && n.metadata.isTainted);
    }).length;
    const greenEdges = interconnectedData.edges.filter((e: any) => {
      const edgeColor = e.color?.color;
      return edgeColor === '#51cf66' || (e.metadata && e.metadata.type === 'control_flow');
    }).length;
    const blueEdges = interconnectedData.edges.filter((e: any) => {
      const edgeColor = e.color?.color;
      return edgeColor === '#4dabf7' || (e.metadata && e.metadata.type === 'function_call');
    }).length;
    const orangeEdges = interconnectedData.edges.filter((e: any) => {
      const edgeColor = e.color?.color;
      return edgeColor === '#ffa94d' || edgeColor === '#ff9500' || edgeColor === '#ff8800' || (e.metadata && e.metadata.type === 'data_flow');
    }).length;
    LoggingConfig.table('VizTabs', 'Interconnected CFG Tab', {
      'Total Functions': interconnectedData.functions.length,
      'Function Names': interconnectedData.functions.join(', '),
      'Total Nodes': interconnectedData.nodes.length,
      'Red/Tainted Blocks': redBlocks,
      'Normal Blocks': interconnectedData.nodes.length - redBlocks,
      'Total Edges': interconnectedData.edges.length,
      'Green (Control Flow)': greenEdges,
      'Blue (Function Calls)': blueEdges,
      'Orange (Data Flow)': orangeEdges
    });
    
    LoggingConfig.section('VizTabs', '========== END TAB VISUAL DATA LOG ==========');
  }

  /**
   * Log tab visual data for ALL functions (for complete validation)
   */
  /**
   * Log tab visual data for ALL functions (for complete validation)
   * 
   * Logs comprehensive visualization data statistics for all functions.
   * Used for automated testing and validation of visualization correctness.
   * 
   * @param state - Complete analysis state
   * @param interconnectedData - Interconnected CFG data
   */
  private logAllFunctionsTabData(state: AnalysisState, interconnectedData: any): void {
    LoggingConfig.section('VizTabs', '========== ALL FUNCTIONS TAB LOG ==========');
    LoggingConfig.detail('VizTabs', `Timestamp: ${new Date().toISOString()}`);
    
    /**
     * PER-FUNCTION DATA LOGGING
     * 
     * Logs taint analysis and inter-procedural taint data for each function.
     */
    // Log for each function
    state.cfg.functions.forEach((funcCFG: FunctionCFG, funcName: string) => {
      const taintData = this.prepareTaintData(state, funcName);
      const interProceduralTaintData = this.prepareInterProceduralTaintData(state, funcName);
      
      LoggingConfig.subsection('VizTabs', `Function: ${funcName}`);
      LoggingConfig.table('VizTabs', 'Function Data', {
        'Taint Analysis': `${taintData.totalTaintedVariables} tainted variables, ${taintData.totalVulnerabilities} vulnerabilities`,
        'Inter-Procedural Taint': `${interProceduralTaintData.totalInterProceduralTaint} entries`,
        'Parameter Taint': interProceduralTaintData.parameterTaint,
        'Return Value Taint': interProceduralTaintData.returnTaint,
        'Library Function Taint': interProceduralTaintData.libraryTaint
      });
      if (interProceduralTaintData.interProceduralTaint && interProceduralTaintData.interProceduralTaint.length > 0) {
        LoggingConfig.detail('VizTabs', 'Entry Details:');
        interProceduralTaintData.interProceduralTaint.forEach((entry: any, idx: number) => {
          const badges = [];
          if (entry.source?.startsWith('parameter:')) badges.push('PARAMETER');
          if (entry.source?.startsWith('return_value:')) badges.push('RETURN');
          if (entry.source?.startsWith('library_function:') || entry.source?.startsWith('file_io:') || entry.source?.startsWith('user_input:')) badges.push('LIBRARY');
          LoggingConfig.verbose('VizTabs', `Entry ${idx + 1}: ${entry.variable} - ${entry.source} [${badges.join(', ') || 'none'}]`);
        });
      }
    });
    
    /**
     * INTERCONNECTED CFG SUMMARY LOGGING
     * 
     * Logs aggregated statistics for interconnected CFG across all functions.
     * Includes edge type counts and node type counts (legend).
     */
    // Log interconnected CFG summary (same for all functions)
    const redBlocks = interconnectedData.nodes.filter((n: any) => {
      const bg = n.color?.background || n.color?.background;
      return bg === '#ffe0e0' || bg === '#ffcccc' || (n.metadata && n.metadata.isTainted);
    }).length;
    const greenEdges = interconnectedData.edges.filter((e: any) => {
      const edgeColor = e.color?.color || e.color;
      return edgeColor === '#51cf66' || (e.metadata && e.metadata.type === 'control_flow');
    }).length;
    const blueEdges = interconnectedData.edges.filter((e: any) => {
      const edgeColor = e.color?.color || e.color;
      return edgeColor === '#4dabf7' || (e.metadata && e.metadata.type === 'function_call');
    }).length;
    const orangeEdges = interconnectedData.edges.filter((e: any) => {
      const edgeColor = e.color?.color || e.color;
      return edgeColor === '#ffa94d' || edgeColor === '#ff9500' || edgeColor === '#ff8800' || (e.metadata && e.metadata.type === 'data_flow');
    }).length;
    
    // CRITICAL FIX: Calculate detailed legend counts from interconnectedData
    let dataFlowTaintBlocks = 0;
    let controlDependentTaintBlocks = 0;
    let mixedTaintBlocks = 0;
    let normalBlocks = 0;
    
    interconnectedData.nodes.forEach((node: any) => {
      if (node.metadata) {
        if (node.metadata.hasDataFlowTaint && node.metadata.hasControlDependentTaint) {
          mixedTaintBlocks++;
        } else if (node.metadata.hasControlDependentTaint) {
          controlDependentTaintBlocks++;
        } else if (node.metadata.hasDataFlowTaint) {
          dataFlowTaintBlocks++;
        } else {
          normalBlocks++;
        }
      } else {
        normalBlocks++;
      }
    });
    
    LoggingConfig.table('VizTabs', 'Interconnected CFG Summary', {
      'Total Functions': interconnectedData.functions.length,
      'Function Names': interconnectedData.functions.join(', '),
      'Total Nodes': interconnectedData.nodes.length,
      'Total Edges': interconnectedData.edges.length
    });
    
    LoggingConfig.table('VizTabs', 'Edge Type Counts', {
      'Green (Control Flow)': greenEdges,
      'Blue (Function Calls)': blueEdges,
      'Orange (Data Flow)': orangeEdges
    });
    
    LoggingConfig.table('VizTabs', 'Node Type Counts (Legend)', {
      'Data-flow Taint Blocks': dataFlowTaintBlocks,
      'Control-dependent Taint Blocks': controlDependentTaintBlocks,
      'Mixed Taint Blocks': dataFlowTaintBlocks + controlDependentTaintBlocks > 0 ? mixedTaintBlocks : 0,
      'Normal Blocks': normalBlocks,
      'Total Tainted Blocks': dataFlowTaintBlocks + controlDependentTaintBlocks + mixedTaintBlocks,
      'Red/Tainted Blocks (legacy)': redBlocks
    });
    
    LoggingConfig.section('VizTabs', '========== END ALL FUNCTIONS TAB LOG ==========');
  }

  /**
   * Prepare all visualization data for all functions during analysis (backend preparation)
   * This is called from DataflowAnalyzer after analysis completes to pre-prepare all data
   * 
   * @param state - Complete analysis state
   * @returns Visualization data object with all prepared data
   */
  /**
   * Prepare all visualization data for all functions during analysis (backend preparation)
   * 
   * This is called from DataflowAnalyzer after analysis completes to pre-prepare all data.
   * Pre-prepared data is faster than on-demand preparation and ensures consistency.
   * 
   * CRITICAL: Stores sensitivity in visualization data to detect when regeneration is needed.
   * 
   * @param state - Complete analysis state
   * @returns Visualization data object with all prepared data
   */
  static async prepareAllVisualizationData(state: AnalysisState): Promise<any> {
    LoggingConfig.section('CFGViz', '========== BACKEND VISUALIZATION DATA PREPARATION ==========');
    LoggingConfig.log('CFGViz', 'Preparing all visualization data for backend...');
    LoggingConfig.detail('CFGViz', `Preparing visualization data with sensitivity: ${state.taintSensitivity || 'precise'}`);
    const visualizer = new CFGVisualizer();
    
    const cfgGraphData = new Map<string, any>();
    const taintData = new Map<string, any>();
    const interProceduralTaintData = new Map<string, any>();
    
    /**
     * PER-FUNCTION DATA PREPARATION
     * 
     * Prepares visualization data for each function:
     * - CFG graph data (nodes, edges, taint highlighting)
     * - Taint analysis data (tainted variables, vulnerabilities)
     * - Inter-procedural taint data (parameter/return/library taint)
     */
    // Prepare data for each function
    for (const [funcName, funcCFG] of state.cfg.functions) {
      LoggingConfig.detail('CFGViz', `Preparing data for function: ${funcName}`);
      
      // Prepare CFG graph data
      const graphData = await visualizer.prepareGraphData(funcCFG, state);
      cfgGraphData.set(funcName, graphData);
      
      // Prepare taint data
      const taintDataForFunc = visualizer.prepareTaintData(state, funcName);
      taintData.set(funcName, taintDataForFunc);
      
      // Prepare inter-procedural taint data
      const interProceduralTaintDataForFunc = visualizer.prepareInterProceduralTaintData(state, funcName);
      interProceduralTaintData.set(funcName, interProceduralTaintDataForFunc);
    }
    
    /**
     * SHARED DATA PREPARATION
     * 
     * Prepares data shared across all functions:
     * - Call graph data (function call relationships)
     * - Interconnected CFG data (unified view with all edge types)
     */
    // Prepare call graph data (same for all functions)
    const callGraphData = state.callGraph ? visualizer.prepareCallGraphData(state.callGraph, state) : null;
    
    // Prepare interconnected CFG data (same for all functions)
    const interconnectedCFGData = visualizer.prepareInterconnectedCFGData(state);
    
    /**
     * COMPREHENSIVE DATA LOGGING
     * 
     * Logs all tab data for automated validation and debugging.
     */
    // Log all tab data for automated validation
    LoggingConfig.section('VizTabs', '========== BACKEND VISUALIZATION DATA PREPARATION ==========');
    LoggingConfig.detail('VizTabs', `Timestamp: ${new Date().toISOString()}`);
    LoggingConfig.log('VizTabs', `Total Functions: ${state.cfg.functions.size}`);
    
    for (const [funcName, funcCFG] of state.cfg.functions) {
      // CRITICAL FIX: Add null checks to prevent null variable errors
      const graphData = cfgGraphData.get(funcName);
      const taintDataForFunc = taintData.get(funcName);
      const interProceduralTaintDataForFunc = interProceduralTaintData.get(funcName);
      
      // Prepare IPA data for this function (Parameters & Returns, Inter-Procedural RD)
      const ipaDataForFunc = visualizer.prepareIPAData(state, funcName);
      
      // Only log if data exists
      if (graphData && taintDataForFunc && interProceduralTaintDataForFunc) {
      visualizer.logAllTabData(funcName, graphData, callGraphData, taintDataForFunc, interProceduralTaintDataForFunc, interconnectedCFGData, ipaDataForFunc);
      } else {
        // Missing visualization data - log warning
        LoggingConfig.warn('CFGViz', `Missing visualization data for function: ${funcName}`);
      }
    }
    
    // Log interconnected CFG summary
    visualizer.logAllFunctionsTabData(state, interconnectedCFGData);
    
    /**
     * COMPREHENSIVE SUMMARY LOGGING
     * 
     * Logs aggregated statistics across all functions for validation.
     */
    // CRITICAL FIX: Log comprehensive summary with all counts
    LoggingConfig.section('VizTabs', '========== COMPREHENSIVE VISUALIZATION DATA SUMMARY ==========');
    LoggingConfig.log('VizTabs', `Sensitivity: ${state.taintSensitivity || 'precise'}`);
    LoggingConfig.log('VizTabs', `Total Functions Analyzed: ${state.cfg.functions.size}`);
    LoggingConfig.log('VizTabs', `Call Graph Nodes: ${callGraphData?.nodes?.length || 0}`);
    LoggingConfig.log('VizTabs', `Call Graph Edges: ${callGraphData?.edges?.length || 0}`);
    
    if (interconnectedCFGData) {
      // Calculate detailed counts
      let dataFlowTaintBlocks = 0;
      let controlDependentTaintBlocks = 0;
      let mixedTaintBlocks = 0;
      let normalBlocks = 0;
      
      interconnectedCFGData.nodes.forEach((node: any) => {
        if (node.metadata) {
          if (node.metadata.hasDataFlowTaint && node.metadata.hasControlDependentTaint) {
            mixedTaintBlocks++;
          } else if (node.metadata.hasControlDependentTaint) {
            controlDependentTaintBlocks++;
          } else if (node.metadata.hasDataFlowTaint) {
            dataFlowTaintBlocks++;
          } else {
            normalBlocks++;
          }
        } else {
          normalBlocks++;
        }
      });
      
      const greenEdges = interconnectedCFGData.edges.filter((e: any) => 
        e.metadata?.type === 'control_flow' || (!e.metadata?.type && !e.metadata)
      ).length;
      const blueEdges = interconnectedCFGData.edges.filter((e: any) => 
        e.metadata?.type === 'function_call'
      ).length;
      const orangeEdges = interconnectedCFGData.edges.filter((e: any) => 
        e.metadata?.type === 'data_flow'
      ).length;
      
      LoggingConfig.table('VizTabs', 'Interconnected CFG', {
        'Total Nodes': interconnectedCFGData.nodes.length,
        'Total Edges': interconnectedCFGData.edges.length,
        'Control Flow (Green)': greenEdges,
        'Function Calls (Blue)': blueEdges,
        'Data Flow (Orange)': orangeEdges
      });
      
      LoggingConfig.table('VizTabs', 'Node Breakdown (Legend)', {
        'Data-flow Taint Only': dataFlowTaintBlocks,
        'Control-dependent Taint Only': controlDependentTaintBlocks,
        'Mixed Taint (Both)': mixedTaintBlocks,
        'Normal Blocks': normalBlocks,
        'Total Tainted': dataFlowTaintBlocks + controlDependentTaintBlocks + mixedTaintBlocks
      });
    }
    
    /**
     * PER-FUNCTION AGGREGATE STATISTICS
     * 
     * Calculates and logs aggregate statistics across all functions.
     */
    // Log per-function summary
    let totalCFGNodes = 0;
    let totalCFGEdges = 0;
    let totalTaintVars = 0;
    let totalVulnerabilities = 0;
    
    for (const [funcName, graphData] of cfgGraphData.entries()) {
      if (graphData) {
        totalCFGNodes += graphData.nodes?.length || 0;
        totalCFGEdges += graphData.edges?.length || 0;
      }
      const funcTaintData = taintData.get(funcName);
      if (funcTaintData) {
        totalTaintVars += funcTaintData.totalTaintedVariables || 0;
        totalVulnerabilities += funcTaintData.totalVulnerabilities || 0;
      }
    }
    
    LoggingConfig.table('VizTabs', 'Per-Function Aggregates', {
      'Total CFG Nodes (all functions)': totalCFGNodes,
      'Total CFG Edges (all functions)': totalCFGEdges,
      'Total Tainted Variables': totalTaintVars,
      'Total Vulnerabilities': totalVulnerabilities
    });
    
    LoggingConfig.section('VizTabs', '========== END COMPREHENSIVE VISUALIZATION DATA SUMMARY ==========');
    LoggingConfig.section('VizTabs', '========== END BACKEND VISUALIZATION DATA PREPARATION ==========');
    
    /**
     * VISUALIZATION DATA RESULT ASSEMBLY
     * 
     * Assembles final visualization data object with all prepared data.
     * CRITICAL: Stores sensitivity to detect when regeneration is needed.
     */
    const result = {
      cfgGraphData,
      callGraphData,
      taintData,
      interProceduralTaintData,
      interconnectedCFGData,
      // CRITICAL FIX: Store sensitivity in visualization data to detect when it needs regeneration
      taintSensitivity: state.taintSensitivity || 'precise'
    };
    
    LoggingConfig.detail('CFGViz', `Visualization data prepared with sensitivity: ${result.taintSensitivity}`);
    return result;
  }
}

