/**
 * CFG Visualizer Webview
 */

import * as vscode from 'vscode';
import { CFG, FunctionCFG, AnalysisState, FileAnalysisState, LivenessInfo, ReachingDefinitionsInfo, ReachingDefinition, TaintInfo } from '../types';
import { Vulnerability } from '../analyzer/SecurityAnalyzer';

export class CFGVisualizer {
  private panels: Map<string, vscode.WebviewPanel> = new Map(); // Track panels by filename+viewType key
  private panel: vscode.WebviewPanel | undefined; // Current active panel reference
  private currentState: AnalysisState | null = null;
  private currentFunction: string | null = null;
  private visNetworkUri: vscode.Uri | null = null;

  /**
   * Get panel key from filename and viewType
   */
  private getPanelKey(filename: string | undefined, viewType: 'Viz' | 'Viz/Cfg'): string {
    const baseName = filename ? filename.split(/[/\\]/).pop() || filename : 'default';
    return `${baseName}:${viewType}`;
  }

  /**
   * Create or show the visualizer panel
   * @param context Extension context
   * @param filename Name of the file being analyzed (for tab title)
   * @param viewType Type of view: 'Viz' for analysis, 'Viz/Cfg' for CFG display
   */
  async createOrShow(context: vscode.ExtensionContext, filename?: string, viewType: 'Viz' | 'Viz/Cfg' = 'Viz'): Promise<void> {
    console.log('[CFGVisualizer] createOrShow called');
    console.log('[CFGVisualizer] Filename:', filename);
    console.log('[CFGVisualizer] View type:', viewType);

    const panelKey = this.getPanelKey(filename, viewType);
    console.log('[CFGVisualizer] Panel key:', panelKey);

    // Check if panel already exists for this key
    const existingPanel = this.panels.get(panelKey);
    if (existingPanel) {
      console.log('[CFGVisualizer] Panel exists for key, revealing it');
      const column = vscode.window.activeTextEditor
        ? vscode.window.activeTextEditor.viewColumn
        : undefined;
      existingPanel.reveal(column);
      this.panel = existingPanel; // Set current panel reference
      return;
    }

    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;
    console.log('[CFGVisualizer] Target column:', column);

    // Determine panel title based on filename
    let panelTitle = 'Control Flow Graph Visualizer';
    if (filename) {
      const baseName = filename.split(/[/\\]/).pop() || filename;
      panelTitle = `${baseName}: ${viewType}`;
    }

    console.log('[CFGVisualizer] Creating new webview panel with title:', panelTitle);
    console.log('[CFGVisualizer] Panel options:', {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media').toString()]
    });

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

    // Store panel in map
    this.panels.set(panelKey, panel);
    this.panel = panel; // Set current panel reference

    console.log('[CFGVisualizer] Panel created successfully');
    console.log('[CFGVisualizer] Total panels tracked:', this.panels.size);
    console.log('[CFGVisualizer] Panel webview available:', !!panel.webview);
    console.log('[CFGVisualizer] Panel webview CSP source:', panel.webview.cspSource);

    panel.onDidDispose(() => {
      console.log('[CFGVisualizer] Panel disposed, removing from tracking');
      this.panels.delete(panelKey);
      if (this.panel === panel) {
        this.panel = undefined;
      }
    }, null, context.subscriptions);

    // Handle messages from webview
    panel.webview.onDidReceiveMessage(
      async message => {
        if (message.type === 'changeFunction') {
          console.log('[CFGVisualizer] Function changed to:', message.functionName);
          this.currentFunction = message.functionName;
          await this.updateWebview(panel);
        }
      },
      null,
      context.subscriptions
    );

    // Only update webview if we have state, otherwise it will be updated when state is provided
    if (this.currentState) {
      console.log('[CFGVisualizer] Panel created with existing state, updating webview');
      await this.updateWebview(panel);
    } else {
      console.log('[CFGVisualizer] Panel created without state, will update when state is provided');
    }
  }

  /**
   * Update visualization for a specific file's panel
   * @param filename Filename to update
   * @param state Analysis state
   * @param viewType View type ('Viz' or 'Viz/Cfg')
   */
  async updateVisualizationForFile(filename: string, state: AnalysisState, viewType: 'Viz' | 'Viz/Cfg' = 'Viz'): Promise<void> {
    const panelKey = this.getPanelKey(filename, viewType);
    const panel = this.panels.get(panelKey);
    
    if (panel) {
      console.log('[CFGVisualizer] Updating visualization for file:', filename, 'viewType:', viewType);
      this.currentState = state;
      this.panel = panel;
      await this.updateWebview(panel);
    } else {
      console.log('[CFGVisualizer] No panel found for file:', filename, 'viewType:', viewType);
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
   * @param panel Optional panel to update (defaults to current panel)
   */
  private async updateWebview(panel?: vscode.WebviewPanel): Promise<void> {
    console.log('[CFGVisualizer] updateWebview called');
    const targetPanel = panel || this.panel;
    if (!targetPanel) {
      console.log('[CFGVisualizer] No panel, returning');
      return;
    }

    const state = this.currentState;
    if (!state) {
      console.log('[CFGVisualizer] No state, showing empty HTML');
      targetPanel.webview.html = this.getEmptyHtml('No analysis state available. Please run "Analyze Workspace" or "Analyze Active File" first.');
      return;
    }

    console.log('[CFGVisualizer] State available, functions:', state.cfg.functions.size);

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

    // Check if any functions were found
    if (state.cfg.functions.size === 0) {
      console.log('[CFGVisualizer] No functions in state, showing empty HTML');
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
      console.log('[CFGVisualizer] Using preferred function:', preferredFunction);
    } else if (this.currentFunction && state.cfg.functions.has(this.currentFunction)) {
      funcCFG = state.cfg.functions.get(this.currentFunction)!;
      console.log('[CFGVisualizer] Using current function:', this.currentFunction);
    } else if (state.cfg.functions.size > 0) {
      // Show first function by default
      const firstFunc = Array.from(state.cfg.functions.keys())[0] as string;
      funcCFG = state.cfg.functions.get(firstFunc)!;
      this.currentFunction = firstFunc;
      console.log('[CFGVisualizer] Using first function:', firstFunc);
    }

    if (!funcCFG) {
      console.log('[CFGVisualizer] Could not find funcCFG, showing empty HTML');
      targetPanel.webview.html = this.getEmptyHtml('Could not find function CFG to display.');
      return;
    }

    // Check if function has blocks
    if (funcCFG.blocks.size === 0) {
      console.log('[CFGVisualizer] Function has no blocks:', funcCFG.name);
      targetPanel.webview.html = this.getEmptyHtml(
        `Function "${funcCFG.name}" has no basic blocks. This might indicate a parsing issue.`
      );
      return;
    }

    console.log('[CFGVisualizer] Function', funcCFG.name, 'has', funcCFG.blocks.size, 'blocks');

    // Prepare data for visualization
    const graphData = await this.prepareGraphData(funcCFG, state);
    
    // Prepare IPA data if available
    const callGraphData = state.callGraph ? this.prepareCallGraphData(state.callGraph) : null;
    const ipaData = this.prepareIPAData(state, funcCFG.name);
    const taintData = this.prepareTaintData(state, funcCFG.name);
    const interconnectedData = this.prepareInterconnectedCFGData(state);
    
    console.log('[CFGVisualizer] Taint data for', funcCFG.name, ':', {
      totalTaintedVariables: taintData.totalTaintedVariables,
      totalVulnerabilities: taintData.totalVulnerabilities,
      taintedVariablesCount: taintData.taintedVariables?.length || 0,
      vulnerabilitiesCount: taintData.vulnerabilities?.length || 0,
      taintInfoFromState: state.taintAnalysis.get(funcCFG.name)?.length || 0,
      vulnerabilitiesFromState: state.vulnerabilities.get(funcCFG.name)?.length || 0
    });
    
    console.log('[CFGVisualizer] Interconnected CFG data:', {
      nodesCount: interconnectedData.nodes.length,
      edgesCount: interconnectedData.edges.length,
      functionsCount: interconnectedData.functions.length
    });
    
    console.log('[CFGVisualizer] Setting webview HTML with graph data');
    console.log('[CFGVisualizer] Graph data summary:', {
      functionName: funcCFG.name,
      nodesCount: graphData.nodes.length,
      edgesCount: graphData.edges.length,
      hasCallGraph: !!callGraphData,
      hasIPAData: !!ipaData,
      hasTaintData: taintData.totalTaintedVariables > 0 || taintData.totalVulnerabilities > 0
    });

    const htmlContent = this.getWebviewContent(
      graphData,
      state,
      funcCFG.name,
      targetPanel.webview.cspSource,
      callGraphData,
      ipaData,
      taintData,
      interconnectedData
    );

    console.log('[CFGVisualizer] Generated HTML length:', htmlContent.length);
    console.log('[CFGVisualizer] Number of script tags:', (htmlContent.match(/<script/g) || []).length);
    console.log('[CFGVisualizer] Number of JSON script tags:', (htmlContent.match(/<script[^>]*type="application\/json"/g) || []).length);
    console.log('[CFGVisualizer] CSP Source:', targetPanel.webview.cspSource);
    console.log('[CFGVisualizer] First 500 chars of HTML:', htmlContent.substring(0, 500));
    console.log('[CFGVisualizer] Last 500 chars of HTML:', htmlContent.substring(htmlContent.length - 500));

    // Check for any potential issues
    if (htmlContent.includes('undefined')) {
      console.warn('[CFGVisualizer] WARNING: HTML contains "undefined" - possible template issue');
    }
    if (htmlContent.includes('null')) {
      console.warn('[CFGVisualizer] WARNING: HTML contains "null" - possible data issue');
    }

    targetPanel.webview.html = htmlContent;
    console.log('[CFGVisualizer] Webview HTML set successfully');
    console.log('[CFGVisualizer] Panel visibility state:', targetPanel.visible);
    console.log('[CFGVisualizer] Panel active state:', targetPanel.active);
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
    
    taintInfo.forEach((taint: TaintInfo) => {
      if (taint.tainted) {
        taintedVars.add(taint.variable);
        // Mark blocks in propagation path as tainted
        taint.propagationPath.forEach((path: string) => {
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
      attackPaths: Array.from(attackPaths.entries()).map(([id, info]: [string, any]) => ({
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
   * Prepare interconnected CFG data showing all functions and their relationships
   */
  private prepareInterconnectedCFGData(state: AnalysisState): any {
    console.log('[CFGVisualizer] Preparing interconnected CFG data');
    const nodes: any[] = [];
    const edges: any[] = [];
    const functionGroups = new Map<string, number>();
    let groupId = 0;

    // Extract call graph data
    const callGraphData = state.callGraph;
    console.log('[CFGVisualizer] Call graph available:', !!callGraphData);

    // Create nodes for each basic block in each function
    state.cfg.functions.forEach((funcCFG, funcName) => {
      console.log(`[CFGVisualizer] Processing function: ${funcName} with ${funcCFG.blocks.size} blocks`);
      functionGroups.set(funcName, groupId++);
      
      funcCFG.blocks.forEach((block, blockId) => {
        const nodeId = `${funcName}_${blockId}`;
        const label = block.statements.length > 0 
          ? block.statements[0].text.substring(0, 30) + (block.statements[0].text.length > 30 ? '...' : '')
          : `Block ${blockId}`;
        
        nodes.push({
          id: nodeId,
          label: `${funcName}::${blockId}\n${label}`,
          group: functionGroups.get(funcName),
          title: `Function: ${funcName}\nBlock: ${blockId}\nStatements: ${block.statements.length}`,
          color: {
            background: '#ff6b6b',  // Red background for all function nodes
            border: '#c92a2a',
            highlight: {
              background: '#ff8787',
              border: '#e03131'
            }
          },
          font: { color: '#ffffff' },
          shape: 'box',
          metadata: {
            function: funcName,
            blockId: blockId,
            isEntry: block.isEntry || false,
            isExit: block.isExit || false
          }
        });
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

    // Add inter-function call edges (blue) from call graph
    if (state.callGraph && state.callGraph.callsFrom) {
      console.log('[CFGVisualizer] Adding inter-function call edges');
      console.log('[CFGVisualizer] callsFrom type:', state.callGraph.callsFrom instanceof Map ? 'Map' : typeof state.callGraph.callsFrom);
      console.log('[CFGVisualizer] callsFrom size:', state.callGraph.callsFrom instanceof Map ? state.callGraph.callsFrom.size : Object.keys(state.callGraph.callsFrom).length);
      
      const blueEdgeSet = new Set<string>(); // Track unique edges to avoid duplicates
      
      // Handle both Map and plain object
      const callsFromEntries: [string, any][] = state.callGraph.callsFrom instanceof Map
        ? Array.from(state.callGraph.callsFrom.entries())
        : Object.entries(state.callGraph.callsFrom);
      
      callsFromEntries.forEach(([caller, calls]) => {
        if (Array.isArray(calls)) {
          calls.forEach((call: any) => {
            const callee = call.calleeId;
            const callSiteBlockId = call.callSite?.blockId;
            
            // Skip external functions
            const externalFunctions = ['printf', 'scanf', 'malloc', 'free', 'strlen', 'strcpy', 'strcat'];
            if (externalFunctions.includes(callee)) {
              return;
            }
            
            const callerCFG = state.cfg.functions.get(caller);
            const calleeCFG = state.cfg.functions.get(callee);
            
            if (callerCFG && calleeCFG) {
              // Find entry block of callee
              let calleeEntryId = '';
              calleeCFG.blocks.forEach((block, blockId) => {
                if (block.isEntry || block.predecessors.length === 0) {
                  calleeEntryId = blockId;
                }
              });

              // Use callSite.blockId if available, otherwise find block with call
              let fromBlockId = callSiteBlockId;
              if (!fromBlockId) {
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
                    title: `Call: ${caller} → ${callee}`,
                    metadata: {
                      type: 'function_call',
                      fromFunction: caller,
                      toFunction: callee
                    }
                  });
                } else {
                  if (!fromExists) {
                    console.log(`[CFGVisualizer] Blue edge skipped: from node ${fromNodeId} does not exist`);
                  }
                  if (!toExists) {
                    console.log(`[CFGVisualizer] Blue edge skipped: to node ${toNodeId} does not exist`);
                  }
                }
              }
            }
          });
        }
      });
      
      const blueEdgeCount = edges.filter(e => e.metadata && e.metadata.type === 'function_call').length;
      console.log('[CFGVisualizer] Total blue (function call) edges created:', blueEdgeCount);
    }

    // Add data flow edges (orange) based on reaching definitions
    if (state.reachingDefinitions) {
      console.log('[CFGVisualizer] Adding data flow edges');
      console.log('[CFGVisualizer] Reaching definitions map size:', state.reachingDefinitions.size);
      
      // Reorganize reaching definitions by function name
      const rdByFunction = new Map<string, Map<string, ReachingDefinitionsInfo>>();
      state.reachingDefinitions.forEach((rdInfo, key) => {
        const [funcName, blockId] = key.split('_');
        if (!rdByFunction.has(funcName)) {
          rdByFunction.set(funcName, new Map());
        }
        rdByFunction.get(funcName)!.set(blockId, rdInfo);
      });
      
      console.log('[CFGVisualizer] Organized RD by function:', rdByFunction.size, 'functions');
      
      rdByFunction.forEach((funcRD, funcName) => {
        console.log(`[CFGVisualizer] Processing function ${funcName} for orange edges`);
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
                    if (!fromExists) {
                      console.log(`[CFGVisualizer] Orange edge skipped: from node ${fromNodeId} does not exist (def.blockId=${def.blockId}, var=${varName})`);
                    }
                    if (!toExists) {
                      console.log(`[CFGVisualizer] Orange edge skipped: to node ${toNodeId} does not exist (blockId=${blockId}, var=${varName})`);
                    }
                  }
                }
              });
            });
          }
        });
        console.log(`[CFGVisualizer] Function ${funcName}: created ${funcOrangeEdges} orange edges`);
      });
      
      const orangeEdgeCount = edges.filter(e => e.metadata && e.metadata.type === 'data_flow').length;
      console.log('[CFGVisualizer] Total orange (data flow) edges created:', orangeEdgeCount);
    }

    console.log(`[CFGVisualizer] Interconnected CFG prepared: ${nodes.length} nodes, ${edges.length} edges`);

    return {
      nodes,
      edges,
      functions: Array.from(functionGroups.keys()),
      groups: Object.fromEntries(functionGroups)
    };
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
   * Prepare call graph data for visualization
   */
  private prepareCallGraphData(callGraph: any): any {
    const nodes: any[] = [];
    const edges: any[] = [];

    // Add function nodes
    callGraph.functions.forEach((metadata: any, funcName: string) => {
      nodes.push({
        id: funcName,
        label: funcName,
        isExternal: metadata.isExternal,
        isRecursive: metadata.isRecursive,
        parameters: metadata.parameters.map((p: any) => p.name).join(', '),
        callsCount: metadata.callsCount
      });
    });

    // Add call edges
    callGraph.calls.forEach((call: any) => {
      edges.push({
        from: call.callerId,
        to: call.calleeId,
        label: `${call.arguments.actual.length} args`,
        returnValueUsed: call.returnValueUsed
      });
    });

    return { nodes, edges };
  }

  /**
   * Prepare IPA data for display
   */
  private prepareIPAData(state: AnalysisState, functionName: string): any {
    const ipaData: any = {
      parameterAnalysis: null,
      returnValueAnalysis: null,
      interProceduralRD: null
    };

    // Get parameter analysis for this function
    if (state.parameterAnalysis && state.parameterAnalysis.has(functionName)) {
      ipaData.parameterAnalysis = state.parameterAnalysis.get(functionName);
    }

    // Get return value analysis for this function
    if (state.returnValueAnalysis && state.returnValueAnalysis.has(functionName)) {
      ipaData.returnValueAnalysis = state.returnValueAnalysis.get(functionName);
    }

    // Get inter-procedural reaching definitions
    if (state.interProceduralRD && state.interProceduralRD.has(functionName)) {
      const funcRD = state.interProceduralRD.get(functionName);
      ipaData.interProceduralRD = Array.from(funcRD!.entries()).map(([blockId, rdInfo]: [string, any]) => ({
        blockId,
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
      }));
    }

    return ipaData;
  }

  /**
   * Prepare taint analysis data for display
   */
  private prepareTaintData(state: AnalysisState, functionName: string): any {
    const taintInfo = state.taintAnalysis.get(functionName) || [];
    const vulnerabilities = state.vulnerabilities.get(functionName) || [];
    
    console.log(`[CFGVisualizer] prepareTaintData for ${functionName}:`, {
      taintInfoCount: taintInfo.length,
      vulnerabilitiesCount: vulnerabilities.length,
      taintInfoSample: taintInfo.length > 0 ? taintInfo[0] : null,
      vulnerabilitiesSample: vulnerabilities.length > 0 ? vulnerabilities[0] : null
    });
    
    // Separate TaintVulnerability from other Vulnerability types
    const taintVulnerabilities = vulnerabilities.filter((v: any) => 
      v.type && ['sql_injection', 'command_injection', 'format_string', 'path_traversal', 
                  'buffer_overflow', 'code_injection', 'integer_overflow'].includes(v.type)
    );
    
    console.log(`[CFGVisualizer] Filtered taint vulnerabilities: ${taintVulnerabilities.length} out of ${vulnerabilities.length}`);
    
    // Group taint info by variable
    const taintByVariable = new Map<string, TaintInfo[]>();
    taintInfo.forEach((taint: TaintInfo) => {
      if (taint.tainted) {
        const existing = taintByVariable.get(taint.variable) || [];
        existing.push(taint);
        taintByVariable.set(taint.variable, existing);
      }
    });
    
    console.log(`[CFGVisualizer] Tainted variables found: ${taintByVariable.size}`);
    
    // Prepare taint sources summary
    const sourcesByCategory = new Map<string, number>();
    taintInfo.forEach((taint: TaintInfo) => {
      if (taint.tainted && taint.sourceCategory) {
        const count = sourcesByCategory.get(taint.sourceCategory) || 0;
        sourcesByCategory.set(taint.sourceCategory, count + 1);
      }
    });
    
    const result = {
      taintedVariables: Array.from(taintByVariable.entries()).map(([varName, taints]) => ({
        variable: varName,
        sources: taints.map(t => ({
          source: t.source,
          category: t.sourceCategory || 'unknown',
          taintType: t.taintType || 'unknown',
          sourceFunction: t.sourceFunction,
          propagationPath: t.propagationPath,
          sourceLocation: t.sourceLocation
        })),
        isTainted: true
      })),
      vulnerabilities: taintVulnerabilities.map((vuln: any) => ({
        id: vuln.id,
        type: vuln.type,
        severity: vuln.severity,
        source: vuln.source,
        sink: vuln.sink,
        propagationPath: vuln.propagationPath,
        sanitized: vuln.sanitized,
        sanitizationPoints: vuln.sanitizationPoints || [],
        cweId: vuln.cweId,
        description: vuln.description
      })),
      sourcesByCategory: Array.from(sourcesByCategory.entries()).map(([category, count]) => ({
        category,
        count
      })),
      totalTaintedVariables: taintByVariable.size,
      totalVulnerabilities: taintVulnerabilities.length
    };
    
    console.log(`[CFGVisualizer] prepareTaintData result:`, {
      totalTaintedVariables: result.totalTaintedVariables,
      totalVulnerabilities: result.totalVulnerabilities,
      taintedVariablesArrayLength: result.taintedVariables.length
    });
    
    return result;
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
    interconnectedData?: any
  ): string {
    // Helper function to format vulnerability type names
    const formatVulnType = (type: string): string => {
      return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };
    
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
    </style>
</head>
<body>
    <div class="header">
        <h2>Dataflow Analysis: ${functionName}</h2>
        <div class="function-selector">
            <label>Function: </label>
            <select id="functionSelect">
                ${Array.from(state.cfg.functions.keys()).map(name => 
                  `<option value="${name}" ${name === functionName ? 'selected' : ''}>${name}</option>`
                ).join('')}
            </select>
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
        ${interconnectedData ? '<div class="tab" data-tab="interconnected">Interconnected CFG</div>' : ''}
    </div>
    
    <!-- CFG Tab Content -->
    <div class="tab-content active" id="cfg-tab">
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
                    <div style="padding: 10px; margin: 5px 0; background: #e8f4f8; border-radius: 5px; color: #333333;">
                        <strong style="color: #333333;">Return:</strong> <span style="color: #333333;">${ret.value || '(void)'}</span>
                        <br><small style="color: #666666;">Type: ${ret.type}, Block: ${ret.blockId}</small>
                        ${ret.usedVariables && ret.usedVariables.length > 0 ? `<br><small style="color: #666666;">Variables: ${ret.usedVariables.join(', ')}</small>` : ''}
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
                <div style="padding: 10px; margin: 5px 0; background: #e8f4f8; border-radius: 5px; color: #333333;">
                    <strong style="color: #333333;">Block: ${blockRD.blockId}</strong>
                    ${blockRD.out && blockRD.out.length > 0 ? `
                        <div style="margin-top: 5px;">
                            <strong style="color: #333333;">OUT:</strong>
                            ${blockRD.out.map((varInfo: any) => `
                                <div style="margin-left: 15px;">
                                    <strong style="color: #333333;">${varInfo.variable}:</strong>
                                    ${varInfo.definitions.map((def: any) => `
                                        <div style="margin-left: 15px; font-size: 0.9em; color: #666666;">
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
                    <span style="color: #333333; font-size: 1.2em; font-weight: bold;">${taintData.totalTaintedVariables}</span>
                </div>
                <div>
                    <strong style="color: #856404;">Vulnerabilities:</strong> 
                    <span style="color: #dc3545; font-size: 1.2em; font-weight: bold;">${taintData.totalVulnerabilities}</span>
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
                ${taintData.taintedVariables.map((varInfo: any) => `
                    <div style="padding: 15px; margin: 10px 0; background: #ffe0e0; border-left: 4px solid #dc3545; border-radius: 5px;">
                        <div style="display: flex; align-items: center; margin-bottom: 10px;">
                            <strong style="color: #333333; font-size: 1.1em;">Variable: ${varInfo.variable}</strong>
                            <span style="margin-left: 10px; padding: 2px 8px; background: #dc3545; color: white; border-radius: 3px; font-size: 0.85em;">TAINTED</span>
                        </div>
                        ${varInfo.sources && varInfo.sources.length > 0 ? `
                        <div style="margin-top: 10px;">
                            <strong style="color: #333333;">Sources:</strong>
                            ${varInfo.sources.map((source: any) => `
                                <div style="margin-left: 15px; margin-top: 8px; padding: 8px; background: #fff; border-radius: 3px;">
                                    <div style="color: #333333;">
                                        <strong>${source.source}</strong>
                                        ${source.sourceFunction ? `<span style="color: #666666; margin-left: 10px;">(${source.sourceFunction})</span>` : ''}
                                    </div>
                                    <div style="margin-top: 5px; font-size: 0.9em; color: #666666;">
                                        <span style="padding: 2px 6px; background: #e8f4f8; border-radius: 3px; margin-right: 5px;">
                                            Category: ${source.category}
                                        </span>
                                        <span style="padding: 2px 6px; background: #e8f4f8; border-radius: 3px;">
                                            Type: ${source.taintType}
                                        </span>
                                    </div>
                                    ${source.propagationPath && source.propagationPath.length > 0 ? `
                                    <div style="margin-top: 5px; font-size: 0.85em; color: #666666;">
                                        <strong>Path:</strong> ${source.propagationPath.join(' → ')}
                                    </div>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
        
        <!-- Vulnerabilities Section -->
        ${taintData.vulnerabilities && taintData.vulnerabilities.length > 0 ? `
        <div>
            <h3 style="color: #333333;">Detected Vulnerabilities</h3>
            <div id="taint-vulnerabilities">
                ${taintData.vulnerabilities.map((vuln: any) => `
                    <div class="vulnerability-item ${vuln.severity}" style="padding: 15px; margin: 10px 0; background: ${vuln.severity === 'critical' ? '#ffe0e0' : vuln.severity === 'high' ? '#ffe8e8' : '#fff3cd'}; border-radius: 5px; cursor: pointer;" onclick="highlightVulnerabilityPath('${vuln.id}')">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div style="flex: 1;">
                                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                                    <strong style="color: #333333; font-size: 1.1em;">${formatVulnType(vuln.type)}</strong>
                                    <span style="margin-left: 10px; padding: 2px 8px; background: ${vuln.severity === 'critical' ? '#dc3545' : vuln.severity === 'high' ? '#ff6b6b' : '#ffa500'}; color: white; border-radius: 3px; font-size: 0.85em; text-transform: uppercase;">
                                        ${vuln.severity}
                                    </span>
                                    ${vuln.cweId ? `<span style="margin-left: 10px; padding: 2px 8px; background: #e8f4f8; border-radius: 3px; font-size: 0.85em; color: #333333;">${vuln.cweId}</span>` : ''}
                                </div>
                                ${vuln.description ? `<p style="color: #333333; margin: 5px 0;">${vuln.description}</p>` : ''}
                                <div style="margin-top: 10px; font-size: 0.9em;">
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
                <p style="font-size: 0.9em; color: #666666;">
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
    
    <!-- Interconnected CFG Tab Content -->
    ${interconnectedData ? `
    <div class="tab-content" id="interconnected-tab">
        <div style="margin-bottom: 20px; padding: 15px; background: #e7f5ff; border-left: 4px solid #4dabf7; border-radius: 5px;">
            <h3 style="color: #1864ab; margin-top: 0;">Interconnected Control Flow Graph</h3>
            <p style="color: #333333; margin-bottom: 10px;">
                This view shows all functions and their relationships in a unified graph.
            </p>
            <div style="display: flex; gap: 30px; flex-wrap: wrap; margin-top: 15px;">
                <div>
                    <strong style="color: #1864ab;">Total Functions:</strong>
                    <span style="color: #333333;">${interconnectedData.functions.length}</span>
                </div>
                <div>
                    <strong style="color: #1864ab;">Total Nodes:</strong>
                    <span style="color: #333333;">${interconnectedData.nodes.length}</span>
                </div>
                <div>
                    <strong style="color: #1864ab;">Total Edges:</strong>
                    <span style="color: #333333;">${interconnectedData.edges.length}</span>
                </div>
            </div>
            <div style="margin-top: 15px; padding: 10px; background: white; border-radius: 3px;">
                <strong style="color: #1864ab;">Legend:</strong>
                <div style="display: flex; gap: 20px; margin-top: 8px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <div style="width: 20px; height: 20px; background: #ff6b6b; border: 2px solid #c92a2a;"></div>
                        <span style="color: #333333;">Function Nodes (Red)</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <div style="width: 30px; height: 3px; background: #51cf66;"></div>
                        <span style="color: #333333;">Control Flow (Green)</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <div style="width: 30px; height: 3px; background: #4dabf7; border-top: 2px dashed #4dabf7;"></div>
                        <span style="color: #333333;">Function Calls (Blue, Dashed)</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <div style="width: 30px; height: 3px; background: #ffa94d; border-top: 2px dashed #ffa94d;"></div>
                        <span style="color: #333333;">Data Flow (Orange, Dashed)</span>
                    </div>
                </div>
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
        <div id="debug-logs" style="max-height: 200px; overflow-y: auto; font-family: monospace; font-size: 12px; background: white; padding: 10px; border-radius: 3px;">
            <div style="color: #007bff;">✓ HTML loaded</div>
            <div style="color: #28a745;">✓ vis-network loading from CDN...</div>
        </div>
    </div>
        

    <script type="application/json" id="graph-data-json">
${JSON.stringify(graphData).replace(/<\//g, '<\\/')}
    </script>
    
    <script type="application/json" id="callgraph-data-json">
${callGraphData ? JSON.stringify(callGraphData).replace(/<\//g, '<\\/') : '{}'}
    </script>
    
    <script type="application/json" id="ipa-data-json">
${ipaData ? JSON.stringify(ipaData).replace(/<\//g, '<\\/') : '{}'}
    </script>
    
    <script type="application/json" id="taint-data-json">
${taintData ? JSON.stringify(taintData).replace(/<\//g, '<\\/') : '{}'}
    </script>
    
    <script type="application/json" id="interconnected-data-json">
${interconnectedData ? JSON.stringify(interconnectedData).replace(/<\//g, '<\\/') : '{}'}
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

        // Initialize network with retry logic and error handling
        var initRetryCount = 0;
        var maxInitRetries = 50; // 5 seconds max wait
        
        function initNetwork() {
            if (typeof vis === 'undefined') {
                initRetryCount++;
                if (initRetryCount < maxInitRetries) {
                    setTimeout(initNetwork, 100);
                    return;
                } else {
                    logDebug('ERROR: vis-network not available after ' + maxInitRetries + ' retries');
                    showError('vis-network library failed to initialize. Please refresh the panel.');
                    return;
                }
            }
            
            // Reset retry count on success
            initRetryCount = 0;

            logDebug('vis-network loaded, initializing...');

            const vscode = acquireVsCodeApi();
            const graphDataElement = document.getElementById('graph-data-json');
            if (!graphDataElement) {
                logDebug('ERROR: Graph data element not found');
                showError('Graph data not found. Please refresh the panel.');
                return;
            }
            
            let graphData;
            try {
                graphData = JSON.parse(graphDataElement.textContent);
            } catch (parseError) {
                logDebug('ERROR: Failed to parse graph data: ' + parseError.message);
                console.error('JSON parse error:', parseError);
                showError('Failed to parse graph data.\\n\\nError: ' + parseError.message);
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
            if (!container) {
                logDebug('ERROR: Network container element not found');
                showError('Visualization container not found. Please refresh the panel.');
                return;
            }
            
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
        
            try {
                const network = new vis.Network(container, data, options);
                logDebug('vis.Network created successfully');
                
                // Store network reference for potential updates
                window.network = network;
                
                // Handle network errors
                network.on('error', function(params) {
                    logDebug('Network error: ' + JSON.stringify(params));
                    console.error('vis-network error:', params);
                });
            } catch (error) {
                logDebug('ERROR: Failed to create vis.Network: ' + (error.message || 'Unknown error'));
                console.error('Failed to create network:', error);
                showError('Failed to create visualization network.\\n\\nError: ' + (error.message || 'Unknown error'));
                return;
            }

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
                            let html = '<h4 style="color: #333333;">Block: ' + node.label + '</h4>';
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
            });
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
                    
                    // Initialize call graph if switching to call graph tab
                    if (targetTab === 'callgraph' && typeof vis !== 'undefined') {
                        initCallGraph();
                    }
                    
                    // Initialize interconnected CFG if switching to interconnected tab
                    if (targetTab === 'interconnected' && typeof vis !== 'undefined') {
                        initInterconnectedNetwork();
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
                console.error('Error highlighting vulnerability path:', e);
            }
        }
        
        // Make highlightVulnerabilityPath available globally
        window.highlightVulnerabilityPath = highlightVulnerabilityPath;

        // Initialize call graph visualization with error handling
        function initCallGraph() {
            try {
                const callGraphDataElement = document.getElementById('callgraph-data-json');
                if (!callGraphDataElement) {
                    logDebug('No call graph data element found');
                    return;
                }
                
                let callGraphData;
                try {
                    callGraphData = JSON.parse(callGraphDataElement.textContent);
                } catch (parseError) {
                    logDebug('ERROR: Failed to parse call graph data: ' + parseError.message);
                    console.error('JSON parse error:', parseError);
                    return;
                }
                
                if (!callGraphData || !callGraphData.nodes || callGraphData.nodes.length === 0) {
                    logDebug('No call graph data available');
                    return;
                }
                
                if (typeof vis === 'undefined') {
                    logDebug('ERROR: vis-network not available for call graph');
                    return;
                }
                
                logDebug('Initializing call graph visualization...');
            
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
                        size: 12,
                        face: 'Monaco, Menlo, "Ubuntu Mono", monospace'
                    },
                    title: 'Function: ' + node.label + '\\nParameters: ' + node.parameters + 
                           '\\nRecursive: ' + (node.isRecursive ? 'Yes' : 'No') +
                           '\\nExternal: ' + (node.isExternal ? 'Yes' : 'No')
                };
            }));
            
            const cgEdges = new vis.DataSet(callGraphData.edges.map(function(edge) {
                return {
                    from: edge.from,
                    to: edge.to,
                    label: edge.label,
                    arrows: { to: { enabled: true } },
                    color: { color: '#666', highlight: '#0984e3' },
                    title: edge.returnValueUsed ? 'Return value used' : 'Return value unused'
                };
            }));
            
            const cgContainer = document.getElementById('callgraph-network');
            if (cgContainer) {
                const cgData = { nodes: cgNodes, edges: cgEdges };
                const cgOptions = {
                    nodes: {
                        shape: 'ellipse',
                        font: { size: 12 },
                        margin: 10
                    },
                    edges: {
                        arrows: { to: { enabled: true } },
                        smooth: { type: 'cubicBezier' },
                        color: { color: '#666' }
                    },
                    layout: {
                        hierarchical: {
                            direction: 'LR',
                            sortMethod: 'directed',
                            nodeSpacing: 150,
                            levelSeparation: 200
                        }
                    },
                    physics: { enabled: false },
                    interaction: { hover: true }
                };
                
                try {
                    const cgNetwork = new vis.Network(cgContainer, cgData, cgOptions);
                    logDebug('Call graph network created');
                    
                    // Handle network errors
                    cgNetwork.on('error', function(params) {
                        logDebug('Call graph network error: ' + JSON.stringify(params));
                        console.error('Call graph network error:', params);
                    });
                    
                    // Handle node click on call graph
                    cgNetwork.on('click', function(params) {
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
                });
            }
        }
        
        // Initialize interconnected CFG network with error handling
        function initInterconnectedNetwork() {
            try {
                const interconnectedDataElement = document.getElementById('interconnected-data-json');
                if (!interconnectedDataElement) {
                    logDebug('No interconnected data element found');
                    return;
                }
                
                let interconnectedData;
                try {
                    interconnectedData = JSON.parse(interconnectedDataElement.textContent);
                } catch (parseError) {
                    logDebug('ERROR: Failed to parse interconnected data: ' + parseError.message);
                    console.error('JSON parse error:', parseError);
                    return;
                }
                
                if (!interconnectedData || !interconnectedData.nodes || interconnectedData.nodes.length === 0) {
                    logDebug('No interconnected CFG data available');
                    return;
                }
                
                if (typeof vis === 'undefined') {
                    logDebug('ERROR: vis-network not available for interconnected CFG');
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
            
            // Process edges to ensure styling is preserved
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
                    widthConstraint: { maximum: 200 }
                },
                edges: {
                    smooth: { type: 'cubicBezier' },
                    arrows: { to: { enabled: true, scaleFactor: 0.5 } },
                    // Don't override individual edge colors/widths
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
            };
            
            // Add group colors for different functions
            if (interconnectedData.groups) {
                var colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f7b731', '#5f27cd', '#00d2d3', '#ff9ff3', '#54a0ff'];
                var groupIndex = 0;
                for (var funcName in interconnectedData.groups) {
                    var colorIndex = groupIndex % colors.length;
                    icOptions.groups[interconnectedData.groups[funcName]] = {
                        color: {
                            background: colors[colorIndex],
                            border: colors[colorIndex],
                            highlight: {
                                background: colors[colorIndex],
                                border: '#000'
                            }
                        }
                    };
                    groupIndex++;
                }
            }
            
                try {
                    const icNetwork = new vis.Network(icContainer, icData, icOptions);
                    logDebug('Interconnected CFG network created successfully');
                    
                    // Handle network errors
                    icNetwork.on('error', function(params) {
                        logDebug('Interconnected network error: ' + JSON.stringify(params));
                        console.error('Interconnected network error:', params);
                    });
                    
                    // Handle node click
                    icNetwork.on('click', function(params) {
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
                            infoDiv.innerHTML = html;
                        }
                    }
                } else {
                    const infoDiv = document.getElementById('interconnected-info');
                    if (infoDiv) {
                        infoDiv.innerHTML = '<h4 style="color: #1864ab;">Node Information</h4><p style="color: #666666;">Click on a node to see details</p>';
                    }
                }
            });
                } catch (error) {
                    logDebug('ERROR: Failed to create interconnected network: ' + (error.message || 'Unknown error'));
                    console.error('Failed to create interconnected network:', error);
                    showError('Failed to create interconnected CFG visualization.\\n\\nError: ' + (error.message || 'Unknown error'));
                }
            } catch (error) {
                logDebug('ERROR: Interconnected network initialization failed: ' + (error.message || 'Unknown error'));
                console.error('Interconnected network initialization error:', error);
            }
        }

        // Load vis-network from CDN with improved error handling
        logDebug('Loading vis-network from CDN...');
        var script = document.createElement('script');
        script.src = 'https://unpkg.com/vis-network/standalone/umd/vis-network.min.js';
        script.async = true;
        script.crossOrigin = 'anonymous';
        
        var loadTimeout = setTimeout(function() {
            if (typeof vis === 'undefined') {
                logDebug('ERROR: vis-network loading timeout after 10 seconds');
                showError('Failed to load vis-network library. Please check your internet connection and try again.');
            }
        }, 10000);
        
        script.onload = function() {
            clearTimeout(loadTimeout);
            logDebug('vis-network loaded from CDN successfully');
            // Verify vis is actually available
            if (typeof vis !== 'undefined') {
                initNetwork();
            } else {
                logDebug('ERROR: vis-network script loaded but vis object not available');
                showError('vis-network library loaded but not initialized. Please refresh the panel.');
            }
        };
        
        script.onerror = function(error) {
            clearTimeout(loadTimeout);
            logDebug('ERROR: Failed to load vis-network from CDN: ' + (error.message || 'Unknown error'));
            showError('Failed to load visualization library. Please check your internet connection.\\n\\n' +
                     'Error: ' + (error.message || 'Network error') + '\\n\\n' +
                     'You can try:\\n' +
                     '1. Check your internet connection\\n' +
                     '2. Refresh the visualization panel\\n' +
                     '3. Check if unpkg.com is accessible');
        };
        
        document.head.appendChild(script);
        
        // Error display function
        function showError(message) {
            const errorDiv = document.createElement('div');
            errorDiv.id = 'error-message';
            errorDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); ' +
                'background: #f8d7da; border: 2px solid #dc3545; border-radius: 5px; padding: 20px; ' +
                'max-width: 500px; z-index: 10000; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
            errorDiv.innerHTML = '<h3 style="color: #721c24; margin-top: 0;">⚠ Visualization Error</h3>' +
                '<p style="color: #721c24; white-space: pre-line;">' + message + '</p>' +
                '<button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; ' +
                'background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">Reload Panel</button>';
            document.body.appendChild(errorDiv);
        }

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
    // Dispose all tracked panels
    this.panels.forEach(panel => panel.dispose());
    this.panels.clear();
  }
}

