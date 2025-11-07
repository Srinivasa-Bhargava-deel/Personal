/**
 * Main analyzer orchestrator
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { EnhancedCPPParser } from './EnhancedCPPParser';
import { LivenessAnalyzer } from './LivenessAnalyzer';
import { ReachingDefinitionsAnalyzer } from './ReachingDefinitionsAnalyzer';
import { TaintAnalyzer } from './TaintAnalyzer';
import { SecurityAnalyzer } from './SecurityAnalyzer';
import { StateManager } from '../state/StateManager';
import { 
  CFG, 
  FunctionCFG, 
  AnalysisState, 
  FileAnalysisState,
  AnalysisConfig 
} from '../types';

export class DataflowAnalyzer {
  private parser: EnhancedCPPParser;
  private livenessAnalyzer: LivenessAnalyzer;
  private reachingDefinitionsAnalyzer: ReachingDefinitionsAnalyzer;
  private taintAnalyzer: TaintAnalyzer;
  private securityAnalyzer: SecurityAnalyzer;
  private stateManager: StateManager;
  private config: AnalysisConfig;
  private currentState: AnalysisState | null = null;

  constructor(workspacePath: string, config: AnalysisConfig) {
    this.parser = new EnhancedCPPParser();
    this.livenessAnalyzer = new LivenessAnalyzer();
    this.reachingDefinitionsAnalyzer = new ReachingDefinitionsAnalyzer();
    this.taintAnalyzer = new TaintAnalyzer();
    this.securityAnalyzer = new SecurityAnalyzer();
    this.stateManager = new StateManager(workspacePath);
    this.config = config;
    
    // Load existing state
    this.currentState = this.stateManager.loadState();
    if (!this.currentState) {
      this.currentState = this.createEmptyState(workspacePath);
    }
  }

  /**
   * Analyze entire workspace
   */
  async analyzeWorkspace(): Promise<AnalysisState> {
    const workspacePath = this.currentState!.workspacePath;
    const cfg: CFG = {
      entry: 'global_entry',
      exit: 'global_exit',
      blocks: new Map(),
      functions: new Map()
    };

    const fileStates = new Map<string, FileAnalysisState>();

    // Find all C++ files
    const cppFiles = await this.findCppFiles(workspacePath);
    
    for (const filePath of cppFiles) {
      try {
        const fileState = await this.analyzeFile(filePath, cfg);
        fileStates.set(filePath, fileState);
      } catch (error) {
        console.error(`Error analyzing ${filePath}:`, error);
      }
    }

    // Perform analyses
    const liveness = new Map();
    const reachingDefinitions = new Map();
    const taintAnalysis = new Map();
    const vulnerabilities = new Map();

    cfg.functions.forEach((funcCFG, funcName) => {
      if (this.config.enableLiveness) {
        const funcLiveness = this.livenessAnalyzer.analyze(funcCFG);
        funcLiveness.forEach((info, blockId) => {
          liveness.set(`${funcName}_${blockId}`, info);
        });
      }

      if (this.config.enableReachingDefinitions) {
        const funcRD = this.reachingDefinitionsAnalyzer.analyze(funcCFG);
        funcRD.forEach((info, blockId) => {
          reachingDefinitions.set(`${funcName}_${blockId}`, info);
        });
      }

      if (this.config.enableTaintAnalysis) {
        const funcRD = reachingDefinitions.get(`${funcName}_entry`) || 
                      new Map().set('entry', { in: new Map(), out: new Map() });
        const funcTaint = this.taintAnalyzer.analyze(funcCFG, funcRD);
        taintAnalysis.set(funcName, Array.from(funcTaint.values()).flat());
        
        // Run security analysis
        const funcVulns = this.securityAnalyzer.analyzeVulnerabilities(
          funcCFG,
          funcTaint,
          Array.from(fileStates.keys())[0] || ''
        );
        if (funcVulns.length > 0) {
          vulnerabilities.set(funcName, funcVulns);
        }
      }
    });

    // Update state
    this.currentState = {
      workspacePath,
      timestamp: Date.now(),
      cfg,
      liveness,
      reachingDefinitions,
      taintAnalysis,
      vulnerabilities,
      fileStates
    };

    // Save state
    this.stateManager.saveState(this.currentState);

    return this.currentState;
  }

  /**
   * Analyze a single file
   */
  private async analyzeFile(filePath: string, cfg: CFG): Promise<FileAnalysisState> {
    const hash = this.stateManager.computeFileHash(filePath);
    const stats = fs.statSync(filePath);

    const { functions, globalVars } = await this.parser.parseFile(filePath);
    const functionNames: string[] = [];

    for (const funcInfo of functions) {
      const funcCFG = this.parser.buildCFGForFunction(funcInfo, funcInfo.name);
      cfg.functions.set(funcInfo.name, funcCFG);
      functionNames.push(funcInfo.name);
    }

    return {
      path: filePath,
      lastModified: stats.mtimeMs,
      hash,
      functions: functionNames
    };
  }

  /**
   * Incrementally update analysis for a changed file
   */
  async updateFile(filePath: string): Promise<void> {
    if (!this.currentState) {
      await this.analyzeWorkspace();
      return;
    }

    const newHash = this.stateManager.computeFileHash(filePath);
    const existingState = this.currentState.fileStates.get(filePath);

    // Check if file actually changed
    if (existingState && existingState.hash === newHash) {
      return;
    }

    // Remove old function CFGs from this file
    if (existingState) {
      existingState.functions.forEach(funcName => {
        this.currentState!.cfg.functions.delete(funcName);
      });
    }

    // Re-analyze file
    const fileState = await this.analyzeFile(filePath, this.currentState.cfg);
    this.currentState.fileStates.set(filePath, fileState);

    // Re-run analyses for affected functions
    const liveness = new Map();
    const reachingDefinitions = new Map();
    const taintAnalysis = new Map();

    this.currentState.cfg.functions.forEach((funcCFG, funcName) => {
      if (this.config.enableLiveness) {
        const funcLiveness = this.livenessAnalyzer.analyze(funcCFG);
        funcLiveness.forEach((info, blockId) => {
          liveness.set(`${funcName}_${blockId}`, info);
        });
      }

      if (this.config.enableReachingDefinitions) {
        const funcRD = this.reachingDefinitionsAnalyzer.analyze(funcCFG);
        funcRD.forEach((info, blockId) => {
          reachingDefinitions.set(`${funcName}_${blockId}`, info);
        });
      }

      if (this.config.enableTaintAnalysis) {
        const funcRD = reachingDefinitions.get(`${funcName}_entry`) || 
                      new Map().set('entry', { in: new Map(), out: new Map() });
        const funcTaint = this.taintAnalyzer.analyze(funcCFG, funcRD);
        taintAnalysis.set(funcName, Array.from(funcTaint.values()).flat());
      }
    });

    this.currentState.liveness = liveness;
    this.currentState.reachingDefinitions = reachingDefinitions;
    this.currentState.taintAnalysis = taintAnalysis;
    this.currentState.timestamp = Date.now();

    this.stateManager.saveState(this.currentState);
  }

  /**
   * Find all C++ files in workspace
   */
  private async findCppFiles(workspacePath: string): Promise<string[]> {
    const files: string[] = [];
    const extensions = ['.cpp', '.cxx', '.cc', '.c', '.hpp', '.h'];

    async function walkDir(dir: string): Promise<void> {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        // Skip hidden directories and common build/output directories
        if (entry.name.startsWith('.') || 
            entry.name === 'node_modules' || 
            entry.name === 'build' ||
            entry.name === 'out') {
          continue;
        }

        if (entry.isDirectory()) {
          await walkDir(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    }

    await walkDir(workspacePath);
    return files;
  }

  /**
   * Create empty state
   */
  private createEmptyState(workspacePath: string): AnalysisState {
    return {
      workspacePath,
      timestamp: Date.now(),
      cfg: {
        entry: 'global_entry',
        exit: 'global_exit',
        blocks: new Map(),
        functions: new Map()
      },
      liveness: new Map(),
      reachingDefinitions: new Map(),
      taintAnalysis: new Map(),
      vulnerabilities: new Map(),
      fileStates: new Map()
    };
  }

  /**
   * Get current analysis state
   */
  getState(): AnalysisState | null {
    return this.currentState;
  }

  /**
   * Update configuration
   */
  updateConfig(config: AnalysisConfig): void {
    this.config = config;
  }
}

