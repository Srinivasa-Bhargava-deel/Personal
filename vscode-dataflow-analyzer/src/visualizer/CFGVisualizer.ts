/**
 * CFG Visualizer Webview
 */

import * as vscode from 'vscode';
import { CFG, FunctionCFG, AnalysisState, LivenessInfo, ReachingDefinitionsInfo, TaintInfo } from '../types';
import { Vulnerability } from '../analyzer/SecurityAnalyzer';

export class CFGVisualizer {
  private panel: vscode.WebviewPanel | undefined;
  private currentState: AnalysisState | null = null;
  private currentFunction: string | null = null;
  private visNetworkUri: vscode.Uri | null = null;

  /**
   * Create or show the visualizer panel
   */
  async createOrShow(context: vscode.ExtensionContext): Promise<void> {
    console.log('[CFGVisualizer] createOrShow called');
    console.log('[CFGVisualizer] Current panel state:', this.panel ? 'exists' : 'null');
    console.log('[CFGVisualizer] Context extension URI:', context.extensionUri.toString());

    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;
    console.log('[CFGVisualizer] Target column:', column);

    if (this.panel) {
      console.log('[CFGVisualizer] Panel already exists, revealing it');
      console.log('[CFGVisualizer] Panel title:', this.panel.title);
      console.log('[CFGVisualizer] Panel viewType:', this.panel.viewType);
      this.panel.reveal(column);
      console.log('[CFGVisualizer] Panel revealed successfully');
      return;
    }

    console.log('[CFGVisualizer] Creating new webview panel');
    console.log('[CFGVisualizer] Panel options:', {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media').toString()]
    });

    this.panel = vscode.window.createWebviewPanel(
      'cfgVisualizer',
      'Control Flow Graph Visualizer',
      column || vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')]
      }
    );

    console.log('[CFGVisualizer] Panel created successfully');
    console.log('[CFGVisualizer] Panel webview available:', !!this.panel.webview);
    console.log('[CFGVisualizer] Panel webview CSP source:', this.panel.webview.cspSource);

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    }, null, context.subscriptions);

    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(
      async message => {
        if (message.type === 'changeFunction') {
          console.log('[CFGVisualizer] Function changed to:', message.functionName);
          this.currentFunction = message.functionName;
          await this.updateWebview();
        }
      },
      null,
      context.subscriptions
    );

    // Only update webview if we have state, otherwise it will be updated when state is provided
    if (this.currentState) {
      console.log('[CFGVisualizer] Panel created with existing state, updating webview');
      await this.updateWebview();
    } else {
      console.log('[CFGVisualizer] Panel created without state, will update when state is provided');
    }
  }

  /**
   * Update the webview with current analysis state
   */
  async updateVisualization(state: AnalysisState, functionName?: string): Promise<void> {
    console.log('[CFGVisualizer] updateVisualization called');
    console.log('[CFGVisualizer] State analysis summary:', {
      functionsCount: state.cfg.functions.size,
      functionNames: Array.from(state.cfg.functions.keys()),
      fileStatesCount: state.fileStates.size,
      vulnerabilitiesCount: state.vulnerabilities.size,
      livenessKeys: Object.keys(state.liveness).length,
      reachingDefinitionsKeys: Object.keys(state.reachingDefinitions).length,
      taintAnalysisKeys: Object.keys(state.taintAnalysis).length
    });

    if (functionName) {
      console.log('[CFGVisualizer] Requested specific function:', functionName);
      this.currentFunction = functionName;
    } else {
      console.log('[CFGVisualizer] No specific function requested, using current:', this.currentFunction);
    }

    this.currentState = state;
    console.log('[CFGVisualizer] State stored, checking panel...');

    if (this.panel) {
      console.log('[CFGVisualizer] Panel exists, calling updateWebview');
      console.log('[CFGVisualizer] Panel is visible:', this.panel.visible);
      console.log('[CFGVisualizer] Panel is active:', this.panel.active);
      await this.updateWebview();
    } else {
      console.log('[CFGVisualizer] WARNING: Panel does not exist, cannot update');
      console.log('[CFGVisualizer] This may indicate createOrShow was not called first');
    }
  }

  /**
   * Update webview content
   */
  private async updateWebview(): Promise<void> {
    console.log('[CFGVisualizer] updateWebview called');
    if (!this.panel) {
      console.log('[CFGVisualizer] No panel, returning');
      return;
    }

    const state = this.currentState;
    if (!state) {
      console.log('[CFGVisualizer] No state, showing empty HTML');
      this.panel.webview.html = this.getEmptyHtml('No analysis state available. Please run "Analyze Workspace" or "Analyze Active File" first.');
      return;
    }

    console.log('[CFGVisualizer] State available, functions:', state.cfg.functions.size);

    // Prefer functions from the active editor's file if available
    let preferredFunction: string | null = null;
    const active = vscode.window.activeTextEditor;
    if (active) {
      const activePath = active.document.uri.fsPath;
      state.fileStates.forEach((fileState, path) => {
        if (path === activePath && fileState.functions.length > 0) {
          preferredFunction = fileState.functions[0];
        }
      });
    }

    // Check if any functions were found
    if (state.cfg.functions.size === 0) {
      console.log('[CFGVisualizer] No functions in state, showing empty HTML');
      this.panel.webview.html = this.getEmptyHtml(
        'No functions found in the analysis. Make sure your C++ files contain function definitions and that the analysis completed successfully.'
      );
      return;
    }

    // Get function to display
    let funcCFG: FunctionCFG | null = null;
    if (preferredFunction && state.cfg.functions.has(preferredFunction)) {
      funcCFG = state.cfg.functions.get(preferredFunction)!;
      this.currentFunction = preferredFunction;
      console.log('[CFGVisualizer] Using preferred function:', preferredFunction);
    } else if (this.currentFunction && state.cfg.functions.has(this.currentFunction)) {
      funcCFG = state.cfg.functions.get(this.currentFunction)!;
      console.log('[CFGVisualizer] Using current function:', this.currentFunction);
    } else if (state.cfg.functions.size > 0) {
      // Show first function by default
      const firstFunc = Array.from(state.cfg.functions.keys())[0];
      funcCFG = state.cfg.functions.get(firstFunc)!;
      this.currentFunction = firstFunc;
      console.log('[CFGVisualizer] Using first function:', firstFunc);
    }

    if (!funcCFG) {
      console.log('[CFGVisualizer] Could not find funcCFG, showing empty HTML');
      this.panel.webview.html = this.getEmptyHtml('Could not find function CFG to display.');
      return;
    }

    // Check if function has blocks
    if (funcCFG.blocks.size === 0) {
      console.log('[CFGVisualizer] Function has no blocks:', funcCFG.name);
      this.panel.webview.html = this.getEmptyHtml(
        `Function "${funcCFG.name}" has no basic blocks. This might indicate a parsing issue.`
      );
      return;
    }

    console.log('[CFGVisualizer] Function', funcCFG.name, 'has', funcCFG.blocks.size, 'blocks');

    // Prepare data for visualization
    const graphData = await this.prepareGraphData(funcCFG, state);
    
    console.log('[CFGVisualizer] Setting webview HTML with graph data');
    console.log('[CFGVisualizer] Graph data summary:', {
      functionName: funcCFG.name,
      nodesCount: graphData.nodes.length,
      edgesCount: graphData.edges.length,
      nodeLabels: graphData.nodes.map((n: any) => n.label),
      edgeConnections: graphData.edges.map((e: any) => `${e.from}->${e.to}`)
    });

    const htmlContent = this.getWebviewContent(
      graphData,
      state,
      funcCFG.name,
      this.panel.webview.cspSource
    );

    console.log('[CFGVisualizer] Generated HTML length:', htmlContent.length);
    console.log('[CFGVisualizer] Number of script tags:', (htmlContent.match(/<script/g) || []).length);
    console.log('[CFGVisualizer] Number of JSON script tags:', (htmlContent.match(/<script[^>]*type="application\/json"/g) || []).length);
    console.log('[CFGVisualizer] CSP Source:', this.panel.webview.cspSource);
    console.log('[CFGVisualizer] First 500 chars of HTML:', htmlContent.substring(0, 500));
    console.log('[CFGVisualizer] Last 500 chars of HTML:', htmlContent.substring(htmlContent.length - 500));

    // Check for any potential issues
    if (htmlContent.includes('undefined')) {
      console.warn('[CFGVisualizer] WARNING: HTML contains "undefined" - possible template issue');
    }
    if (htmlContent.includes('null')) {
      console.warn('[CFGVisualizer] WARNING: HTML contains "null" - possible data issue');
    }

    this.panel.webview.html = htmlContent;
    console.log('[CFGVisualizer] Webview HTML set successfully');
    console.log('[CFGVisualizer] Panel visibility state:', this.panel.visible);
    console.log('[CFGVisualizer] Panel active state:', this.panel.active);
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

    console.log(`[CFGVisualizer] Topological order for ${funcCFG.name}: [${ordered.join(', ')}]`);
    return ordered;
  }

  /**
   * Prepare graph data for visualization
   */
  private async prepareGraphData(funcCFG: FunctionCFG, state: AnalysisState): Promise<any> {
    const nodes: any[] = [];
    const edges: any[] = [];

    // Get taint analysis for this function
    const taintInfo = state.taintAnalysis.get(funcCFG.name) || [];
    const taintedVars = new Set<string>();
    const taintedBlocks = new Set<string>();
    
    taintInfo.forEach(taint => {
      if (taint.tainted) {
        taintedVars.add(taint.variable);
        // Mark blocks in propagation path as tainted
        taint.propagationPath.forEach(path => {
          const blockId = path.split(':')[0];
          taintedBlocks.add(blockId);
        });
      }
    });

    // Get vulnerabilities for this function
    const vulnerabilities = state.vulnerabilities.get(funcCFG.name) || [];
    const attackPaths = new Map<string, any>(); // vulnId -> path info
    
    vulnerabilities.forEach((vuln: Vulnerability) => {
      if (vuln.sourceToSinkPath && vuln.sourceToSinkPath.length > 0) {
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
      const livenessKey = `${funcCFG.name}_${blockId}`;
      const liveness = state.liveness.get(livenessKey);
      console.log(`Looking up liveness for key: ${livenessKey}, found: ${!!liveness}`);
      if (liveness) {
        console.log(`Liveness data: in=[${Array.from(liveness.in).join(', ')}], out=[${Array.from(liveness.out).join(', ')}]`);
      }
      const rdKey = `${funcCFG.name}_${blockId}`;
      const rd = state.reachingDefinitions.get(rdKey);
      
      console.log(`Preparing node for block ${blockId}, label: ${block.label}, statements: ${block.statements.length}`);

      // Find tainted variables used/defined in this block
      const blockTaintedVars: string[] = [];
      block.statements.forEach(stmt => {
        stmt.variables?.defined.forEach(v => {
          if (taintedVars.has(v)) {
            blockTaintedVars.push(v);
          }
        });
        stmt.variables?.used.forEach(v => {
          if (taintedVars.has(v)) {
            blockTaintedVars.push(v);
          }
        });
      });

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

      // Create node
      const node = {
        id: blockId,
        label: block.label,
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
          isTainted: taintedBlocks.has(blockId),
          taintedVariables: Array.from(new Set(blockTaintedVars)),
          allTaintedVars: Array.from(taintedVars)
        },
        attackPath: pathId ? {
          pathId,
          index: pathIndex,
          isSource: pathIndex === 0,
          isSink: pathIndex === (attackPaths.get(pathId)?.blocks.length || 0) - 1,
          vulnerabilities: blockVulnerabilities
        } : null
      };
      nodes.push(node);

      // Create edges
      block.successors.forEach(succId => {
        // Check if this edge is part of an attack path
        let isAttackPathEdge = false;
        let pathColor = '';
        
        attackPaths.forEach((pathInfo, vulnId) => {
          const fromIndex = pathInfo.blocks.indexOf(blockId);
          const toIndex = pathInfo.blocks.indexOf(succId);
          if (fromIndex !== -1 && toIndex !== -1 && toIndex === fromIndex + 1) {
            isAttackPathEdge = true;
            // Color based on vulnerability severity
            const vuln = pathInfo.vulnerability;
            if (vuln.severity === 'Critical') pathColor = '#ff0000';
            else if (vuln.severity === 'High') pathColor = '#ff6b6b';
            else if (vuln.severity === 'Medium') pathColor = '#ffa500';
            else pathColor = '#ffd700';
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

    console.log(`Prepared graph data: ${nodes.length} nodes, ${edges.length} edges for function ${funcCFG.name}`);

    return { 
      nodes, 
      edges, 
      taintSummary: taintInfo,
      attackPaths: Array.from(attackPaths.entries()).map(([id, info]) => ({
        id,
        blocks: info.blocks,
        vulnerability: info.vulnerability,
        edges: info.edges
      }))
    };
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
        console.warn(`Could not read source file ${filePath}:`, error);
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
   * Get webview HTML content
   */
  private getWebviewContent(graphData: any, state: AnalysisState, functionName: string, cspSource: string): string {
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
            color: var(--vscode-editor-foreground);
        }
        .header {
            margin-bottom: 20px;
        }
        .function-selector {
            margin-bottom: 20px;
        }
        select {
            padding: 8px;
            background-color: var(--vscode-dropdown-background);
            color: var(--vscode-dropdown-foreground);
            border: 1px solid var(--vscode-dropdown-border);
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
        }
        .block-info {
            margin: 10px 0;
            padding: 10px;
            background-color: var(--vscode-editor-background);
            border-left: 3px solid var(--vscode-textLink-foreground);
        }
        .liveness-info, .rd-info {
            margin-top: 10px;
            font-size: 0.9em;
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
            font-size: 0.9em;
        }
        .taint-warning {
            color: #ff6b6b;
            font-weight: bold;
        }
        .taint-path {
            font-size: 0.85em;
            color: var(--vscode-descriptionForeground);
            margin-left: 15px;
        }
        .summary-panel {
            margin-top: 20px;
            padding: 15px;
            background-color: var(--vscode-editor-selectionBackground);
            border-radius: 5px;
        }
        .summary-section {
            margin: 10px 0;
        }
        .summary-section h4 {
            margin-top: 0;
            margin-bottom: 10px;
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
        }
        .tab.active {
            border-bottom-color: var(--vscode-textLink-foreground);
            color: var(--vscode-textLink-foreground);
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
    </style>
</head>
<body>
    <div class="header">
        <h2>Control Flow Graph: ${functionName}</h2>
        <div class="function-selector">
            <label>Function: </label>
            <select id="functionSelect">
                ${Array.from(state.cfg.functions.keys()).map(name => 
                  `<option value="${name}" ${name === functionName ? 'selected' : ''}>${name}</option>`
                ).join('')}
            </select>
        </div>
    </div>
    
    <div id="network" style="width: 100%; height: 600px; border: 1px solid #ccc;"></div>
    
    <div id="blockInfo" style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 5px; color: black;">
        <h3 style="color: black;">Block Information</h3>
        <p style="color: black;">Click on a node in the graph above to see its details here.</p>
        </div>
        
    <div id="debug-panel" style="margin-top: 20px; padding: 15px; background: #fff3cd; border: 2px solid #ffc107; border-radius: 5px;">
        <h3 style="color: #856404;">Debug Information</h3>
        <div id="debug-logs" style="max-height: 200px; overflow-y: auto; font-family: monospace; font-size: 12px; background: white; padding: 10px; border-radius: 3px;">
            <div style="color: #007bff;">✓ HTML loaded</div>
            <div style="color: #28a745;">✓ vis-network loading from CDN...</div>
        </div>
        </div>
        

    <script type="application/json" id="graph-data-json">
${JSON.stringify(graphData).replace(/<\//g, '<\\/')}
    </script>

    <script>
        // Simple debugging
        function logDebug(message) {
            var debugDiv = document.getElementById('debug-logs');
            if (debugDiv) {
                var timestamp = new Date().toLocaleTimeString();
                debugDiv.innerHTML += '<div style="color: #007bff; margin: 2px 0; font-size: 11px;">[' + timestamp + '] ' + message + '</div>';
                debugDiv.scrollTop = debugDiv.scrollHeight;
            }
        }

        logDebug('Starting initialization...');

        function initNetwork() {
            if (typeof vis === 'undefined') {
                setTimeout(initNetwork, 100);
                return;
            }

            logDebug('vis-network loaded, initializing...');

            const vscode = acquireVsCodeApi();
            const graphDataElement = document.getElementById('graph-data-json');
            const graphData = JSON.parse(graphDataElement.textContent);

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
            
            return {
                id: node.id,
                        label: label,
                shape: 'box',
                color: {
                            background: node.taintInfo && node.taintInfo.isTainted ? '#ffeaa7' : '#e8f4f8',
                            border: node.taintInfo && node.taintInfo.isTainted ? '#d63031' : '#2e7d32',
                            highlight: { background: '#74b9ff', border: '#0984e3' }
                },
                font: {
                            color: node.taintInfo && node.taintInfo.isTainted ? '#d63031' : '#333',
                            size: 11,
                            face: 'Monaco, Menlo, "Ubuntu Mono", monospace'
                        },
                        margin: 10,
                        widthConstraint: { minimum: 120, maximum: 200 }
            };
        }));
        
        const edges = new vis.DataSet(graphData.edges);
        
            const container = document.getElementById('network');
        const data = { nodes, edges };
        const options = {
            nodes: {
                shape: 'box',
                        font: { size: 11, face: 'Monaco, Menlo, "Ubuntu Mono", monospace' },
                margin: 10,
                        widthConstraint: { minimum: 120, maximum: 200 },
                        heightConstraint: { minimum: 40 }
            },
            edges: {
                        arrows: { to: { enabled: true, scaleFactor: 0.8 } },
                        smooth: { type: 'cubicBezier', forceDirection: 'vertical' },
                        color: { color: '#666', highlight: '#0984e3' },
                        width: 2,
                        font: { size: 10, align: 'top' }
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

        const network = new vis.Network(container, data, options);
            logDebug('vis.Network created successfully');

            // Handle function selector changes
            const functionSelect = document.getElementById('functionSelect');
            if (functionSelect) {
                functionSelect.addEventListener('change', function(event) {
                    const selectedFunction = event.target.value;
                    logDebug('Function selector changed to: ' + selectedFunction);

                    // Send message to extension to update visualization
                    vscode.postMessage({
                        type: 'changeFunction',
                        functionName: selectedFunction
                    });
                });
                logDebug('Function selector event listener attached');
                } else {
                logDebug('ERROR: functionSelect element not found');
            }

            // Handle node click (show info on click)
            network.on('click', function(params) {
                if (params.nodes.length > 0) {
                    // Clicked on a node - show its info
                    const nodeId = params.nodes[0];
                    const node = graphData.nodes.find(function(n) { return n.id === nodeId; });
                    if (node) {
                        const infoDiv = document.getElementById('blockInfo');
                        if (infoDiv) {
                            let html = '<h4 style="color: black;">Block: ' + node.label + '</h4>';
                            html += '<div style="color: black;"><strong>Statements:</strong><ul style="color: black;">';
                            node.statements.forEach(function(stmt) {
                                const stmtText = typeof stmt === 'string' ? stmt : stmt.text;
                                html += '<li style="color: black;">' + stmtText + '</li>';
                            });
                            html += '</ul></div>';

                            // Add additional node information
                if (node.liveness) {
                                html += '<div style="color: black; margin-top: 10px;"><strong>Live Variables In:</strong> ' +
                                    (node.liveness.in.length > 0 ? node.liveness.in.join(', ') : 'none') + '</div>';
                                html += '<div style="color: black;"><strong>Live Variables Out:</strong> ' +
                                    (node.liveness.out.length > 0 ? node.liveness.out.join(', ') : 'none') + '</div>';
                            }

                            if (node.reachingDefinitions && node.reachingDefinitions.out) {
                                html += '<div style="color: black; margin-top: 10px;"><strong>Reaching Definitions:</strong><br>';
                                Object.keys(node.reachingDefinitions.out).forEach(function(varName) {
                                    html += '<span style="color: black; margin-right: 10px;">' + varName + ': ' +
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
                        infoDiv.innerHTML = '<h3 style="color: black;">Block Information</h3><p style="color: black;">Click on a node in the graph above to see its details here.</p>';
                    }
                }
            });
        }

        // Load vis-network from CDN
        logDebug('Loading vis-network from CDN...');
        var script = document.createElement('script');
        script.src = 'https://unpkg.com/vis-network/standalone/umd/vis-network.min.js';
        script.onload = function() {
            logDebug('vis-network loaded from CDN');
            initNetwork();
        };
        script.onerror = function() {
            logDebug('ERROR: Failed to load vis-network');
        };
        document.head.appendChild(script);

        // Handle messages from extension
        window.addEventListener('message', function(event) {
            const message = event.data;
            logDebug('Received message from extension: ' + JSON.stringify(message));

            if (message.type === 'updateVisualization') {
                logDebug('Updating visualization with new data');
                // This would require reloading the graph data, for now just log
                logDebug('Visualization update requested but not implemented in webview');
            }
        });

        logDebug('Initialization script completed, waiting for vis-network to load');
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
   * Dispose the visualizer
   */
  dispose(): void {
    if (this.panel) {
      this.panel.dispose();
      this.panel = undefined;
    }
  }
}

