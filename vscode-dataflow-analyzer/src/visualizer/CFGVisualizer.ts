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

  /**
   * Create or show the visualizer panel
   */
  createOrShow(context: vscode.ExtensionContext): void {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (this.panel) {
      this.panel.reveal(column);
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'cfgVisualizer',
      'Control Flow Graph Visualizer',
      column || vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    }, null, context.subscriptions);

    this.updateWebview();
  }

  /**
   * Update the webview with current analysis state
   */
  updateVisualization(state: AnalysisState, functionName?: string): void {
    this.currentState = state;
    if (functionName) {
      this.currentFunction = functionName;
    }
    if (this.panel) {
      this.updateWebview();
    }
  }

  /**
   * Update webview content
   */
  private updateWebview(): void {
    if (!this.panel) return;

    const state = this.currentState;
    if (!state) {
      this.panel.webview.html = this.getEmptyHtml();
      return;
    }

    // Get function to display
    let funcCFG: FunctionCFG | null = null;
    if (this.currentFunction && state.cfg.functions.has(this.currentFunction)) {
      funcCFG = state.cfg.functions.get(this.currentFunction)!;
    } else if (state.cfg.functions.size > 0) {
      // Show first function by default
      const firstFunc = Array.from(state.cfg.functions.keys())[0];
      funcCFG = state.cfg.functions.get(firstFunc)!;
      this.currentFunction = firstFunc;
    }

    if (!funcCFG) {
      this.panel.webview.html = this.getEmptyHtml();
      return;
    }

    // Prepare data for visualization
    const graphData = this.prepareGraphData(funcCFG, state);
    
    this.panel.webview.html = this.getWebviewContent(graphData, state, funcCFG.name);
  }

  /**
   * Prepare graph data for visualization
   */
  private prepareGraphData(funcCFG: FunctionCFG, state: AnalysisState): any {
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

    funcCFG.blocks.forEach((block, blockId) => {
      // Get analysis info
      const livenessKey = `${funcCFG.name}_${blockId}`;
      const liveness = state.liveness.get(livenessKey);
      const rdKey = `${funcCFG.name}_${blockId}`;
      const rd = state.reachingDefinitions.get(rdKey);

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
          in: this.serializeRD(rd.in),
          out: this.serializeRD(rd.out)
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
    });

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
  private serializeRD(rdMap: Map<string, any[]>): any {
    const result: any = {};
    rdMap.forEach((defs, varName) => {
      result[varName] = defs.map(d => ({
        variable: d.variable,
        definitionId: d.definitionId,
        blockId: d.blockId
      }));
    });
    return result;
  }

  /**
   * Get webview HTML content
   */
  private getWebviewContent(graphData: any, state: AnalysisState, functionName: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CFG Visualizer</title>
    <script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
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
    
    <div id="network"></div>
    
    <div class="info-panel">
        <div class="tab-container">
            <div class="tab active" onclick="showTab('block')">Block Details</div>
            <div class="tab" onclick="showTab('summary')">Analysis Summary</div>
            <div class="tab" onclick="showTab('vulnerabilities')">Vulnerabilities</div>
            <div class="tab" onclick="showTab('attackPaths')">Attack Paths</div>
        </div>
        
        <div id="blockTab" class="tab-content active">
            <h3>Block Information</h3>
            <div id="analysisInfo"></div>
        </div>
        
        <div id="summaryTab" class="tab-content">
            <h3>Analysis Summary</h3>
            <div id="summaryInfo"></div>
        </div>
        
        <div id="vulnerabilitiesTab" class="tab-content">
            <h3>Security Vulnerabilities</h3>
            <div id="vulnerabilitiesInfo"></div>
        </div>
        
        <div id="attackPathsTab" class="tab-content">
            <h3>Attack Paths</h3>
            <div id="attackPathsInfo"></div>
        </div>
    </div>

    <script>
        const graphData = ${JSON.stringify(graphData)};
        
        let highlightedPathId = null;
        
        const nodes = new vis.DataSet(graphData.nodes.map(node => {
            let bgColor = '#e8f4f8';
            let borderColor = '#2e7d32';
            let fontColor = '#333';
            
            if (node.attackPath) {
                if (node.attackPath.isSource) {
                    bgColor = '#e8f8f5';
                    borderColor = '#4ecdc4';
                } else if (node.attackPath.isSink) {
                    bgColor = '#ffe0e0';
                    borderColor = '#ff0000';
                    fontColor = '#cc0000';
                } else {
                    bgColor = '#fff4e6';
                    borderColor = '#ffa500';
                }
            } else if (node.taintInfo && node.taintInfo.isTainted) {
                bgColor = '#ffe0e0';
                borderColor = '#ff6b6b';
                fontColor = '#cc0000';
            }
            
            return {
                id: node.id,
                label: node.label + '\\n' + node.statements.slice(0, 2).map(s => typeof s === 'string' ? s : s.text).join('\\n'),
                shape: 'box',
                color: {
                    background: bgColor,
                    border: borderColor
                },
                font: {
                    color: fontColor,
                    size: node.attackPath ? 13 : 12,
                    bold: node.attackPath ? true : false
                },
                borderWidth: node.attackPath ? 3 : 1
            };
        }));
        
        const edges = new vis.DataSet(graphData.edges);
        
        const data = { nodes, edges };
        const options = {
            nodes: {
                shape: 'box',
                font: {
                    size: 12,
                    color: '#333'
                },
                margin: 10,
                widthConstraint: {
                    maximum: 200
                }
            },
            edges: {
                arrows: {
                    to: {
                        enabled: true,
                        scaleFactor: 1.2
                    }
                },
                smooth: {
                    type: 'cubicBezier',
                    forceDirection: 'vertical',
                    roundness: 0.4
                }
            },
            layout: {
                hierarchical: {
                    direction: 'UD',
                    sortMethod: 'directed',
                    levelSeparation: 100,
                    nodeSpacing: 150
                }
            },
            physics: {
                enabled: false
            }
        };
        
        const container = document.getElementById('network');
        const network = new vis.Network(container, data, options);
        
        let selectedNode = null;
        network.on('click', function(params) {
            if (params.nodes.length > 0) {
                selectedNode = params.nodes[0];
                updateAnalysisInfo(selectedNode);
            }
        });
        
        function updateAnalysisInfo(nodeId) {
            const node = graphData.nodes.find(n => n.id === nodeId);
            if (!node) return;
            
            let html = '<div class="block-info">';
            html += '<h4>Block: ' + node.label + '</h4>';
            if (node.taintInfo && node.taintInfo.isTainted) {
                html += '<div class="taint-warning">⚠ Tainted Block</div>';
            }
            html += '<div><strong>Statements:</strong><ul>';
            node.statements.forEach(stmt => {
                const stmtText = typeof stmt === 'string' ? stmt : stmt.text;
                html += '<li>' + stmtText + '</li>';
            });
            html += '</ul></div>';
            
            if (node.liveness) {
                html += '<div class="liveness-info">';
                html += '<strong>Live In:</strong> ';
                if (node.liveness.in.length === 0) {
                    html += '<em>none</em>';
                } else {
                    node.liveness.in.forEach(v => {
                        html += '<span>' + v + '</span>';
                    });
                }
                html += '<br><strong>Live Out:</strong> ';
                if (node.liveness.out.length === 0) {
                    html += '<em>none</em>';
                } else {
                    node.liveness.out.forEach(v => {
                        html += '<span>' + v + '</span>';
                    });
                }
                html += '</div>';
            }
            
            if (node.reachingDefinitions) {
                html += '<div class="rd-info">';
                html += '<strong>Reaching Definitions:</strong><br>';
                const rdKeys = Object.keys(node.reachingDefinitions.out);
                if (rdKeys.length === 0) {
                    html += '<em>none</em>';
                } else {
                    rdKeys.forEach(varName => {
                        html += '<strong>' + varName + ':</strong> ';
                        node.reachingDefinitions.out[varName].forEach(def => {
                            html += '<span>' + def.definitionId + '</span>';
                        });
                        html += '<br>';
                    });
                }
                html += '</div>';
            }
            
            if (node.taintInfo && node.taintInfo.taintedVariables.length > 0) {
                html += '<div class="taint-info">';
                html += '<strong class="taint-warning">Tainted Variables:</strong> ';
                node.taintInfo.taintedVariables.forEach(v => {
                    html += '<span style="background-color: #ff6b6b; color: white;">' + v + '</span>';
                });
                html += '</div>';
            }
            
            html += '</div>';
            document.getElementById('analysisInfo').innerHTML = html;
            
            // Update summary
            updateSummary();
        }
        
        function updateSummary() {
            let html = '';
            
            // Liveness Summary
            html += '<div class="summary-section">';
            html += '<h4>Liveness Analysis</h4>';
            const allLiveVars = new Set();
            graphData.nodes.forEach(node => {
                if (node.liveness) {
                    node.liveness.in.forEach(v => allLiveVars.add(v));
                    node.liveness.out.forEach(v => allLiveVars.add(v));
                }
            });
            if (allLiveVars.size === 0) {
                html += '<em>No live variables detected</em>';
            } else {
                html += '<p>Variables that are live at some point: ';
                Array.from(allLiveVars).forEach(v => {
                    html += '<span>' + v + '</span>';
                });
                html += '</p>';
            }
            html += '</div>';
            
            // Reaching Definitions Summary
            html += '<div class="summary-section">';
            html += '<h4>Reaching Definitions</h4>';
            const allDefs = new Set();
            graphData.nodes.forEach(node => {
                if (node.reachingDefinitions) {
                    Object.keys(node.reachingDefinitions.out).forEach(varName => {
                        allDefs.add(varName);
                    });
                }
            });
            if (allDefs.size === 0) {
                html += '<em>No reaching definitions detected</em>';
            } else {
                html += '<p>Variables with reaching definitions: ';
                Array.from(allDefs).forEach(v => {
                    html += '<span>' + v + '</span>';
                });
                html += '</p>';
            }
            html += '</div>';
            
            // Taint Analysis Summary
            html += '<div class="summary-section">';
            html += '<h4>Taint Analysis</h4>';
            if (!graphData.taintSummary || graphData.taintSummary.length === 0) {
                html += '<em>No tainted variables detected</em>';
            } else {
                const taintedVars = graphData.taintSummary.filter(t => t.tainted);
                if (taintedVars.length === 0) {
                    html += '<em>No tainted variables detected</em>';
                } else {
                    html += '<p class="taint-warning">⚠ Found ' + taintedVars.length + ' tainted variable(s):</p>';
                    html += '<ul>';
                    taintedVars.forEach(taint => {
                        html += '<li>';
                        html += '<strong>' + taint.variable + '</strong>';
                        html += ' (source: ' + taint.source + ')';
                        html += '<div class="taint-path">Path: ' + taint.propagationPath.join(' → ') + '</div>';
                        html += '</li>';
                    });
                    html += '</ul>';
                }
            }
            html += '</div>';
            
            document.getElementById('summaryInfo').innerHTML = html;
        }
        
        function showTab(tabName) {
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Show selected tab
            document.getElementById(tabName + 'Tab').classList.add('active');
            event.target.classList.add('active');
            
            if (tabName === 'summary') {
                updateSummary();
            }
        }
        
        // Initial summary update
        updateSummary();
        updateVulnerabilities();
        updateAttackPaths();
        
        function updateVulnerabilities() {
            const vulns = ${JSON.stringify(Array.from((state.vulnerabilities.get(functionName) || [])))};
            let html = '';
            
            if (vulns.length === 0) {
                html = '<p><em>No vulnerabilities detected in this function.</em></p>';
            } else {
                html += '<div class="vulnerability-list">';
                vulns.forEach(vuln => {
                    html += '<div class="vulnerability-item ' + vuln.severity.toLowerCase() + '" onclick="highlightAttackPath(\\'' + vuln.id + '\\')">';
                    html += '<h4>' + vuln.type + ' <span style="color: ' + getSeverityColor(vuln.severity) + '">(' + vuln.severity + ')</span></h4>';
                    html += '<p><strong>Location:</strong> Line ' + vuln.location.line + ', Column ' + vuln.location.column + '</p>';
                    html += '<p><strong>Description:</strong> ' + vuln.description + '</p>';
                    html += '<p><strong>Exploitability:</strong> ' + vuln.exploitability + '</p>';
                    if (vuln.cweId) {
                        html += '<p><strong>CWE:</strong> <a href="https://cwe.mitre.org/data/definitions/' + vuln.cweId.split('-')[1] + '.html" target="_blank">' + vuln.cweId + '</a></p>';
                    }
                    if (vuln.recommendation) {
                        html += '<p><strong>Recommendation:</strong> ' + vuln.recommendation + '</p>';
                    }
                    html += '<button class="show-path-btn" onclick="highlightAttackPath(\\'' + vuln.id + '\\'); event.stopPropagation();">Show Attack Path</button>';
                    html += '</div>';
                });
                html += '</div>';
            }
            
            document.getElementById('vulnerabilitiesInfo').innerHTML = html;
        }
        
        function updateAttackPaths() {
            const paths = ${JSON.stringify(graphData.attackPaths || [])};
            let html = '';
            
            if (paths.length === 0) {
                html = '<p><em>No attack paths detected.</em></p>';
            } else {
                paths.forEach(path => {
                    html += '<div class="attack-path-panel">';
                    html += '<h4>Attack Path: ' + path.vulnerability.type + '</h4>';
                    html += '<p><strong>Severity:</strong> <span style="color: ' + getSeverityColor(path.vulnerability.severity) + '">' + path.vulnerability.severity + '</span></p>';
                    html += '<p><strong>Description:</strong> ' + path.vulnerability.description + '</p>';
                    html += '<h5>Path Steps:</h5>';
                    path.blocks.forEach((blockId, index) => {
                        const node = graphData.nodes.find(n => n.id === blockId);
                        const stepClass = index === 0 ? 'source' : (index === path.blocks.length - 1 ? 'sink' : '');
                        html += '<div class="attack-path-step ' + stepClass + '">';
                        html += '<strong>Step ' + (index + 1) + ':</strong> ' + (index === 0 ? 'SOURCE' : (index === path.blocks.length - 1 ? 'SINK' : 'Propagation')) + '<br>';
                        html += '<strong>Block:</strong> ' + (node ? node.label : blockId) + '<br>';
                        if (node && node.statements.length > 0) {
                            html += '<strong>Statement:</strong> ' + node.statements[0].text;
                        }
                        html += '</div>';
                    });
                    html += '<button class="show-path-btn" onclick="highlightAttackPath(\\'' + path.id + '\\')">Highlight in Graph</button>';
                    html += '</div>';
                });
            }
            
            document.getElementById('attackPathsInfo').innerHTML = html;
        }
        
        function getSeverityColor(severity) {
            switch(severity) {
                case 'Critical': return '#ff0000';
                case 'High': return '#ff6b6b';
                case 'Medium': return '#ffa500';
                case 'Low': return '#ffd700';
                default: return '#333';
            }
        }
        
        function highlightAttackPath(pathId) {
            highlightedPathId = pathId;
            const path = graphData.attackPaths.find(p => p.id === pathId);
            if (!path) return;
            
            // Update node colors
            const nodeUpdates = graphData.nodes.map(node => {
                const index = path.blocks.indexOf(node.id);
                if (index !== -1) {
                    return {
                        id: node.id,
                        color: {
                            background: index === 0 ? '#4ecdc4' : (index === path.blocks.length - 1 ? '#ff0000' : '#ffa500'),
                            border: index === 0 ? '#2ecc71' : (index === path.blocks.length - 1 ? '#cc0000' : '#ff8c00')
                        },
                        font: { size: 14, bold: true },
                        borderWidth: 4
                    };
                }
                return null;
            }).filter(n => n !== null);
            
            nodes.update(nodeUpdates);
            
            // Update edge colors
            const edgeUpdates: any[] = [];
            graphData.edges.forEach(edge => {
                const fromIndex = path.blocks.indexOf(edge.from);
                const toIndex = path.blocks.indexOf(edge.to);
                if (fromIndex !== -1 && toIndex !== -1 && toIndex === fromIndex + 1) {
                    edgeUpdates.push({
                        id: edge.id || (edge.from + '-' + edge.to),
                        color: { color: '#ff0000', highlight: '#ff0000' },
                        width: 4
                    });
                }
            });
            
            if (edgeUpdates.length > 0) {
                edges.update(edgeUpdates);
            }
            
            // Focus on the path
            network.focus(path.blocks[0], {
                scale: 1.5,
                animation: true
            });
        }
        
        document.getElementById('functionSelect').addEventListener('change', function(e) {
            const funcName = e.target.value;
            vscode.postMessage({
                command: 'changeFunction',
                functionName: funcName
            });
        });
        
        const vscode = acquireVsCodeApi();
    </script>
</body>
</html>`;
  }

  /**
   * Get empty HTML when no state available
   */
  private getEmptyHtml(): string {
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
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
    </style>
</head>
<body>
    <div>
        <h2>No analysis data available</h2>
        <p>Run workspace analysis to generate CFG visualization.</p>
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

