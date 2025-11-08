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
    // If there's an active C/C++ editor, analyze only that file to avoid pulling in library functions
    try {
      const active = vscode.window.activeTextEditor;
      if (active && (active.document.languageId === 'cpp' || active.document.languageId === 'c')) {
        return await this.analyzeSpecificFiles([active.document.uri.fsPath]);
      }
    } catch {
      // Fall through to workspace analysis
    }
    
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
   * Analyze only specific files (strict mode)
   */
  async analyzeSpecificFiles(filePaths: string[]): Promise<AnalysisState> {
    const workspacePath = this.currentState!.workspacePath;
    const cfg: CFG = {
      entry: 'global_entry',
      exit: 'global_exit',
      blocks: new Map(),
      functions: new Map()
    };

    const fileStates = new Map<string, FileAnalysisState>();

    for (const filePath of filePaths) {
      // Only allow source files
      const ext = path.extname(filePath).toLowerCase();
      const sourceExtensions = ['.cpp', '.cxx', '.cc', '.c'];
      if (!sourceExtensions.includes(ext)) {
        console.log(`Skipping non-source file: ${filePath}`);
        continue;
      }
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
      }
    });

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

    this.stateManager.saveState(this.currentState);
    return this.currentState;
  }

  /**
   * Analyze a single file
   */
  private async analyzeFile(filePath: string, cfg: CFG): Promise<FileAnalysisState> {
    const hash = this.stateManager.computeFileHash(filePath);
    const stats = fs.statSync(filePath);

    console.log(`Analyzing file: ${filePath}`);
    const normalizedSourcePath = path.resolve(filePath);
    const sourceFileBase = path.basename(filePath);
    const sourceFileDir = path.dirname(filePath);
    
    const { functions, globalVars } = await this.parser.parseFile(filePath);
    console.log(`Parser returned ${functions.length} functions from ${filePath}`);

    const functionNames: string[] = [];
    let addedCount = 0;
    let skippedCount = 0;

    for (const funcInfo of functions) {
      // CRITICAL: Verify function is actually from this source file
      // IMPORTANT: Clang location.file behavior:
      // - Builtin types: NO location or NO line
      // - Source file nodes: location has line but NO file
      // - Included file nodes: location has file set
      // - CFG functions: NO location info but parsed directly from source file
      let isFromThisFile = false;

      // Special handling for CFG-based functions (parsed directly from source file)
      if (funcInfo.cfg && (!funcInfo.astNode || !funcInfo.astNode.location)) {
        isFromThisFile = true;
        console.log(`ACCEPTING CFG-based function ${funcInfo.name} (no location verification needed)`);
      } else if (funcInfo.astNode && funcInfo.astNode.location) {
        const funcLoc = funcInfo.astNode.location;
        const funcLocAny = funcLoc as any;
        const funcFile = funcLoc.file;
        
        // Must have a line number to be a real code location
        if (!funcLoc.line) {
          // No line = builtin/synthetic - REJECT
          isFromThisFile = false;
        } else if (funcLocAny.includedFrom && funcLocAny.includedFrom.file) {
          // Has includedFrom = from included header - REJECT
          console.log(`SKIPPING function ${funcInfo.name} - from included file ${funcLocAny.includedFrom.file}`);
          skippedCount++;
          continue;
        } else if (!funcFile) {
          // Has line but NO file and NO includedFrom = from source file - ACCEPT
          isFromThisFile = true;
        } else {
          // Has file - check if it matches
          try {
            const normalizedFuncPath = path.resolve(funcFile);
            if (normalizedFuncPath === normalizedSourcePath) {
              isFromThisFile = true;
            } else {
              // Check by filename and directory
              const funcFileBase = path.basename(funcFile);
              if (funcFileBase === sourceFileBase) {
                const funcFileDir = path.dirname(funcFile);
                if (path.resolve(funcFileDir) === path.resolve(sourceFileDir)) {
                  isFromThisFile = true;
                }
              }
            }
          } catch (e) {
            // Path resolution failed
            isFromThisFile = false;
          }
        }
      }
      // If we cannot verify, skip the function (no astNode or location)
      // This prevents pulling in library/system functions without precise location info
      // No fallback based on startLine to avoid false positives
      
      
      // Reject header files
      if (funcInfo.astNode && funcInfo.astNode.location && funcInfo.astNode.location.file) {
        const funcFile = funcInfo.astNode.location.file;
        const headerExts = ['.h', '.hpp', '.hxx', '.hh', '.H'];
        const fileExt = path.extname(funcFile).toLowerCase();
        if (headerExts.includes(fileExt)) {
          console.log(`SKIPPING function ${funcInfo.name} - from header file ${funcFile}`);
          skippedCount++;
          continue;
        }
        
        // Reject system/library paths
        if (funcFile.includes('/usr/') || 
            funcFile.includes('/System/') ||
            funcFile.includes('/Applications/') ||
            funcFile.includes('/Library/') ||
            funcFile.includes('/opt/') ||
            funcFile.includes('/include/')) {
          console.log(`SKIPPING function ${funcInfo.name} - from system/library ${funcFile}`);
          skippedCount++;
          continue;
        }
      }
      
      if (!isFromThisFile) {
        console.log(`SKIPPING function ${funcInfo.name} - not from source file ${filePath}`);
        skippedCount++;
        continue;
      }
      
      // Function is verified to be from this file - add it
      // Use the CFG that was already built by the parser (from Clang CFG generation)
      if (funcInfo.cfg) {
        cfg.functions.set(funcInfo.name, funcInfo.cfg);
        functionNames.push(funcInfo.name);
        addedCount++;
        console.log(`✓ Added function to CFG: ${funcInfo.name} (from ${filePath}, ${funcInfo.cfg.blocks.size} blocks)`);
      } else {
        console.warn(`Function ${funcInfo.name} has no CFG - skipping`);
        skippedCount++;
        continue;
      }
    }

    console.log(`File ${filePath}: ${addedCount} functions added, ${skippedCount} skipped, total in CFG: ${cfg.functions.size}`);

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
   * Find all C++ source files in workspace (exclude headers and libraries)
   */
  private async findCppFiles(workspacePath: string): Promise<string[]> {
    const files: string[] = [];
    // Only analyze source files, NOT header files
    const sourceExtensions = ['.cpp', '.cxx', '.cc', '.c'];
    // Explicitly exclude header files
    const headerExtensions = ['.h', '.hpp', '.hxx', '.hh'];

    async function walkDir(dir: string): Promise<void> {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        // Skip hidden directories and common build/output directories
        if (entry.name.startsWith('.') || 
            entry.name === 'node_modules' || 
            entry.name === 'build' ||
            entry.name === 'out' ||
            entry.name === 'include' ||
            entry.name === 'lib' ||
            entry.name === 'libs') {
          continue;
        }

        if (entry.isDirectory()) {
          await walkDir(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          // Only include source files, explicitly exclude headers
          if (sourceExtensions.includes(ext) && !headerExtensions.includes(ext)) {
            // Double-check: make sure it's not in a system directory
            if (!fullPath.includes('/usr/') && 
                !fullPath.includes('/System/') &&
                !fullPath.includes('/Applications/') &&
                !fullPath.includes('/Library/') &&
                !fullPath.includes('/opt/')) {
              files.push(fullPath);
            }
          }
        }
      }
    }

    await walkDir(workspacePath);
    console.log(`Found ${files.length} source files to analyze:`, files);
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

