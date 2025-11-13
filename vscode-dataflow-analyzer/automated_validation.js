#!/usr/bin/env node

/**
 * Automated Validation Script
 * 
 * Parses logs.txt and validates tab visual data against expected values
 * Eliminates need for manual UI testing
 */

const fs = require('fs');
const path = require('path');

// Expected values from DRY_RUN_UI_EXPECTATIONS.md
const EXPECTED = {
  'test_interprocedural_taint.cpp': {
    'main': {
      cfg: { totalNodes: [3, 5], redNodes: [1, 2], taintedVars: ['user_data', 'buffer'] },
      callGraph: { totalNodes: 4, totalEdges: [3, 4], edgesWithLabels: [3, 4] },
      taintAnalysis: { totalTaintedVariables: [4, 6], totalVulnerabilities: [2, 3] },
      interProceduralTaint: { totalEntries: [3, 4], parameterTaint: 2, returnTaint: 1 },
      interconnectedCFG: { totalFunctions: 4, redBlocks: [5, 7], orangeEdges: [3, 4] }
    },
    'get_user_input': {
      cfg: { totalNodes: [3, 4], redNodes: 1, taintedVars: ['buffer'] },
      taintAnalysis: { totalTaintedVariables: [1, 2] }
    },
    'process_input': {
      cfg: { totalNodes: [3, 4], redNodes: [1, 2], taintedVars: ['input', 'local_buffer'] },
      taintAnalysis: { totalTaintedVariables: [2, 3] }
    },
    'duplicate_string': {
      cfg: { totalNodes: [3, 4], redNodes: [1, 2], taintedVars: ['src', 'result'] },
      taintAnalysis: { totalTaintedVariables: [2, 3] }
    }
  },
  'test_arithmetic_taint.cpp': {
    'main': {
      cfg: { totalNodes: [4, 6], redNodes: [1, 2], taintedVars: ['user_input', 'processed', 'fib', 'result'] },
      callGraph: { totalNodes: 5, totalEdges: [5, 6] },
      taintAnalysis: { totalTaintedVariables: [8, 10] },
      interProceduralTaint: { totalEntries: [4, 5], parameterTaint: 3, returnTaint: 1 },
      interconnectedCFG: { totalFunctions: 5, redBlocks: [8, 10], orangeEdges: [5, 6] }
    },
    'process_number': {
      cfg: { totalNodes: [4, 5], redNodes: [2, 3], taintedVars: ['n', 'result1', 'result2', 'result3', 'result4'] },
      taintAnalysis: { totalTaintedVariables: [5, 7] }
    },
    'helper_function': {
      cfg: { totalNodes: [3, 4], redNodes: 1, taintedVars: ['x'] },
      taintAnalysis: { totalTaintedVariables: [1, 2] }
    },
    'fibonacci': {
      cfg: { totalNodes: [4, 5], redNodes: [2, 3], taintedVars: ['n'] },
      taintAnalysis: { totalTaintedVariables: [1, 2] }
    }
  }
};

function parseLogs(logFilePath) {
  const content = fs.readFileSync(logFilePath, 'utf-8');
  const lines = content.split('\n');
  
  const results = {
    functions: new Map(),
    currentFunction: null,
    currentFile: null
  };
  
  let inTabLog = false;
  let currentTabData = {};
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect file being analyzed
    if (line.includes('Analyzing file:') || line.includes('test_interprocedural_taint.cpp') || line.includes('test_arithmetic_taint.cpp')) {
      if (line.includes('test_interprocedural_taint.cpp')) {
        results.currentFile = 'test_interprocedural_taint.cpp';
      } else if (line.includes('test_arithmetic_taint.cpp')) {
        results.currentFile = 'test_arithmetic_taint.cpp';
      }
    }
    
      // Detect TAB_LOG section start
      if (line.includes('========== TAB VISUAL DATA LOG ==========')) {
        inTabLog = true;
        currentTabData = {};
        // Try to detect file from previous lines
        if (i > 0) {
          for (let k = Math.max(0, i - 20); k < i; k++) {
            const prevLine = lines[k];
            if (prevLine.includes('test_interprocedural_taint.cpp')) {
              results.currentFile = 'test_interprocedural_taint.cpp';
              break;
            } else if (prevLine.includes('test_arithmetic_taint.cpp')) {
              results.currentFile = 'test_arithmetic_taint.cpp';
              break;
            }
          }
        }
        continue;
      }
      
      // Detect TAB_LOG section end
      if (line.includes('========== END TAB VISUAL DATA LOG ==========')) {
        if (results.currentFunction && results.currentFile) {
          if (!results.functions.has(results.currentFunction)) {
            results.functions.set(results.currentFunction, {});
          }
          results.functions.get(results.currentFunction)[results.currentFile] = currentTabData;
        }
        inTabLog = false;
        currentTabData = {};
        results.currentFunction = null;
        continue;
      }
    
    if (inTabLog) {
      // Parse function name
      if (line.includes('[TAB_LOG] Function:')) {
        const match = line.match(/Function: (\w+)/);
        if (match) {
          results.currentFunction = match[1];
        }
      }
      
      // Parse CFG Tab
      if (line.includes('[TAB_LOG] CFG Tab:')) {
        currentTabData.cfg = {};
        // Read next few lines
        for (let j = i + 1; j < i + 5 && j < lines.length; j++) {
          const cfgLine = lines[j];
          if (cfgLine.includes('Total Nodes:')) {
            const match = cfgLine.match(/Total Nodes: (\d+)/);
            if (match) currentTabData.cfg.totalNodes = parseInt(match[1]);
          }
          if (cfgLine.includes('Red/Tainted Nodes:')) {
            const match = cfgLine.match(/Red\/Tainted Nodes: (\d+)/);
            if (match) currentTabData.cfg.redNodes = parseInt(match[1]);
          }
          if (cfgLine.includes('Tainted Variables:')) {
            const match = cfgLine.match(/Tainted Variables: \[(.*?)\]/);
            if (match) {
              currentTabData.cfg.taintedVars = match[1] === 'none' ? [] : match[1].split(', ').filter(v => v);
            }
          }
        }
      }
      
      // Parse Call Graph Tab
      if (line.includes('[TAB_LOG] Call Graph Tab:')) {
        currentTabData.callGraph = {};
        for (let j = i + 1; j < i + 6 && j < lines.length; j++) {
          const cgLine = lines[j];
          if (cgLine.includes('Total Nodes:')) {
            const match = cgLine.match(/Total Nodes: (\d+)/);
            if (match) currentTabData.callGraph.totalNodes = parseInt(match[1]);
          }
          if (cgLine.includes('Total Edges:')) {
            const match = cgLine.match(/Total Edges: (\d+)/);
            if (match) currentTabData.callGraph.totalEdges = parseInt(match[1]);
          }
          if (cgLine.includes('Edges with Labels:')) {
            const match = cgLine.match(/Edges with Labels: (\d+)/);
            if (match) currentTabData.callGraph.edgesWithLabels = parseInt(match[1]);
          }
        }
      }
      
      // Parse Taint Analysis Tab
      if (line.includes('[TAB_LOG] Taint Analysis Tab:')) {
        currentTabData.taintAnalysis = {};
        for (let j = i + 1; j < i + 6 && j < lines.length; j++) {
          const taLine = lines[j];
          if (taLine.includes('Total Tainted Variables:')) {
            const match = taLine.match(/Total Tainted Variables: (\d+)/);
            if (match) currentTabData.taintAnalysis.totalTaintedVariables = parseInt(match[1]);
          }
          if (taLine.includes('Total Vulnerabilities:')) {
            const match = taLine.match(/Total Vulnerabilities: (\d+)/);
            if (match) currentTabData.taintAnalysis.totalVulnerabilities = parseInt(match[1]);
          }
          if (taLine.includes('Tainted Variable Names:')) {
            const match = taLine.match(/Tainted Variable Names: \[(.*?)\]/);
            if (match) {
              currentTabData.taintAnalysis.taintedVarNames = match[1] === 'none' ? [] : match[1].split(', ').filter(v => v);
            }
          }
        }
      }
      
      // Parse Inter-Procedural Taint Tab
      if (line.includes('[TAB_LOG] Inter-Procedural Taint Tab:')) {
        currentTabData.interProceduralTaint = {};
        for (let j = i + 1; j < i + 15 && j < lines.length; j++) {
          const iptLine = lines[j];
          if (iptLine.includes('Total Entries:')) {
            const match = iptLine.match(/Total Entries: (\d+)/);
            if (match) currentTabData.interProceduralTaint.totalEntries = parseInt(match[1]);
          }
          if (iptLine.includes('Parameter Taint:')) {
            const match = iptLine.match(/Parameter Taint: (\d+)/);
            if (match) currentTabData.interProceduralTaint.parameterTaint = parseInt(match[1]);
          }
          if (iptLine.includes('Return Value Taint:')) {
            const match = iptLine.match(/Return Value Taint: (\d+)/);
            if (match) currentTabData.interProceduralTaint.returnTaint = parseInt(match[1]);
          }
          if (iptLine.includes('Entry') && iptLine.includes(':')) {
            const match = iptLine.match(/Entry \d+: (\w+) - Source: (.*?) \[(.*?)\]/);
            if (match) {
              if (!currentTabData.interProceduralTaint.entries) {
                currentTabData.interProceduralTaint.entries = [];
              }
              currentTabData.interProceduralTaint.entries.push({
                variable: match[1],
                source: match[2],
                badges: match[3].split(', ').filter(b => b && b !== 'none')
              });
            }
          }
        }
      }
      
      // Parse Interconnected CFG Tab
      if (line.includes('[TAB_LOG] Interconnected CFG Tab:')) {
        currentTabData.interconnectedCFG = {};
        for (let j = i + 1; j < i + 10 && j < lines.length; j++) {
          const icLine = lines[j];
          if (icLine.includes('Total Functions:')) {
            const match = icLine.match(/Total Functions: (\d+)/);
            if (match) currentTabData.interconnectedCFG.totalFunctions = parseInt(match[1]);
          }
          if (icLine.includes('Function Names:')) {
            const match = icLine.match(/Function Names: \[(.*?)\]/);
            if (match) {
              currentTabData.interconnectedCFG.functionNames = match[1].split(', ').filter(f => f);
            }
          }
          if (icLine.includes('Total Nodes:')) {
            const match = icLine.match(/Total Nodes: (\d+)/);
            if (match) currentTabData.interconnectedCFG.totalNodes = parseInt(match[1]);
          }
          if (icLine.includes('Red/Tainted Blocks:')) {
            const match = icLine.match(/Red\/Tainted Blocks: (\d+)/);
            if (match) currentTabData.interconnectedCFG.redBlocks = parseInt(match[1]);
          }
          if (icLine.includes('Orange (Data Flow):')) {
            const match = icLine.match(/Orange \(Data Flow\): (\d+)/);
            if (match) currentTabData.interconnectedCFG.orangeEdges = parseInt(match[1]);
          }
        }
      }
    }
  }
  
  return results;
}

function validateValue(actual, expected, fieldName) {
  if (Array.isArray(expected)) {
    // Range check
    return actual >= expected[0] && actual <= expected[1];
  } else if (Array.isArray(actual) && Array.isArray(expected)) {
    // Array comparison
    return actual.length === expected.length && actual.every(v => expected.includes(v));
  } else {
    return actual === expected;
  }
}

function validateResults(parsed, expected) {
  const issues = [];
  const successes = [];
  
  for (const [funcName, funcData] of parsed.functions.entries()) {
    for (const [fileName, tabData] of Object.entries(funcData)) {
      const expectedData = expected[fileName]?.[funcName];
      if (!expectedData) continue;
      
      // Validate CFG Tab
      if (tabData.cfg && expectedData.cfg) {
        if (tabData.cfg.totalNodes !== undefined) {
          const valid = validateValue(tabData.cfg.totalNodes, expectedData.cfg.totalNodes, 'CFG.totalNodes');
          if (valid) {
            successes.push(`${fileName}:${funcName} - CFG.totalNodes: ${tabData.cfg.totalNodes}`);
          } else {
            issues.push(`${fileName}:${funcName} - CFG.totalNodes: expected ${JSON.stringify(expectedData.cfg.totalNodes)}, got ${tabData.cfg.totalNodes}`);
          }
        }
        if (tabData.cfg.redNodes !== undefined) {
          const valid = validateValue(tabData.cfg.redNodes, expectedData.cfg.redNodes, 'CFG.redNodes');
          if (valid) {
            successes.push(`${fileName}:${funcName} - CFG.redNodes: ${tabData.cfg.redNodes}`);
          } else {
            issues.push(`${fileName}:${funcName} - CFG.redNodes: expected ${JSON.stringify(expectedData.cfg.redNodes)}, got ${tabData.cfg.redNodes}`);
          }
        }
      }
      
      // Validate Call Graph Tab
      if (tabData.callGraph && expectedData.callGraph) {
        if (tabData.callGraph.totalNodes !== undefined) {
          const valid = validateValue(tabData.callGraph.totalNodes, expectedData.callGraph.totalNodes, 'CallGraph.totalNodes');
          if (valid) {
            successes.push(`${fileName}:${funcName} - CallGraph.totalNodes: ${tabData.callGraph.totalNodes}`);
          } else {
            issues.push(`${fileName}:${funcName} - CallGraph.totalNodes: expected ${expectedData.callGraph.totalNodes}, got ${tabData.callGraph.totalNodes}`);
          }
        }
      }
      
      // Validate Taint Analysis Tab
      if (tabData.taintAnalysis && expectedData.taintAnalysis) {
        if (tabData.taintAnalysis.totalTaintedVariables !== undefined) {
          const valid = validateValue(tabData.taintAnalysis.totalTaintedVariables, expectedData.taintAnalysis.totalTaintedVariables, 'TaintAnalysis.totalTaintedVariables');
          if (valid) {
            successes.push(`${fileName}:${funcName} - TaintAnalysis.totalTaintedVariables: ${tabData.taintAnalysis.totalTaintedVariables}`);
          } else {
            issues.push(`${fileName}:${funcName} - TaintAnalysis.totalTaintedVariables: expected ${JSON.stringify(expectedData.taintAnalysis.totalTaintedVariables)}, got ${tabData.taintAnalysis.totalTaintedVariables}`);
          }
        }
      }
      
      // Validate Inter-Procedural Taint Tab
      if (tabData.interProceduralTaint && expectedData.interProceduralTaint) {
        if (tabData.interProceduralTaint.totalEntries !== undefined) {
          const valid = validateValue(tabData.interProceduralTaint.totalEntries, expectedData.interProceduralTaint.totalEntries, 'InterProceduralTaint.totalEntries');
          if (valid) {
            successes.push(`${fileName}:${funcName} - InterProceduralTaint.totalEntries: ${tabData.interProceduralTaint.totalEntries}`);
          } else {
            issues.push(`${fileName}:${funcName} - InterProceduralTaint.totalEntries: expected ${JSON.stringify(expectedData.interProceduralTaint.totalEntries)}, got ${tabData.interProceduralTaint.totalEntries}`);
          }
        }
        if (tabData.interProceduralTaint.parameterTaint !== undefined) {
          const valid = validateValue(tabData.interProceduralTaint.parameterTaint, expectedData.interProceduralTaint.parameterTaint, 'InterProceduralTaint.parameterTaint');
          if (valid) {
            successes.push(`${fileName}:${funcName} - InterProceduralTaint.parameterTaint: ${tabData.interProceduralTaint.parameterTaint}`);
          } else {
            issues.push(`${fileName}:${funcName} - InterProceduralTaint.parameterTaint: expected ${expectedData.interProceduralTaint.parameterTaint}, got ${tabData.interProceduralTaint.parameterTaint}`);
          }
        }
      }
      
      // Validate Interconnected CFG Tab
      if (tabData.interconnectedCFG && expectedData.interconnectedCFG) {
        if (tabData.interconnectedCFG.totalFunctions !== undefined) {
          const valid = validateValue(tabData.interconnectedCFG.totalFunctions, expectedData.interconnectedCFG.totalFunctions, 'InterconnectedCFG.totalFunctions');
          if (valid) {
            successes.push(`${fileName}:${funcName} - InterconnectedCFG.totalFunctions: ${tabData.interconnectedCFG.totalFunctions}`);
          } else {
            issues.push(`${fileName}:${funcName} - InterconnectedCFG.totalFunctions: expected ${expectedData.interconnectedCFG.totalFunctions}, got ${tabData.interconnectedCFG.totalFunctions}`);
          }
        }
        if (tabData.interconnectedCFG.redBlocks !== undefined) {
          const valid = validateValue(tabData.interconnectedCFG.redBlocks, expectedData.interconnectedCFG.redBlocks, 'InterconnectedCFG.redBlocks');
          if (valid) {
            successes.push(`${fileName}:${funcName} - InterconnectedCFG.redBlocks: ${tabData.interconnectedCFG.redBlocks}`);
          } else {
            issues.push(`${fileName}:${funcName} - InterconnectedCFG.redBlocks: expected ${JSON.stringify(expectedData.interconnectedCFG.redBlocks)}, got ${tabData.interconnectedCFG.redBlocks}`);
          }
        }
      }
    }
  }
  
  return { issues, successes };
}

// Main execution
const logFilePath = path.join(__dirname, '.vscode', 'logs.txt');

if (!fs.existsSync(logFilePath)) {
  console.error('ERROR: logs.txt not found at', logFilePath);
  process.exit(1);
}

console.log('Parsing logs from:', logFilePath);
const parsed = parseLogs(logFilePath);

console.log('\nParsed Functions:', Array.from(parsed.functions.keys()));

const validation = validateResults(parsed, EXPECTED);

console.log('\n========== VALIDATION RESULTS ==========');
console.log(`✅ Successes: ${validation.successes.length}`);
console.log(`❌ Issues: ${validation.issues.length}`);

if (validation.successes.length > 0) {
  console.log('\n✅ SUCCESSES:');
  validation.successes.forEach(s => console.log('  ', s));
}

if (validation.issues.length > 0) {
  console.log('\n❌ ISSUES:');
  validation.issues.forEach(i => console.log('  ', i));
} else {
  console.log('\n✅ All validations passed!');
}

console.log('\n========== END VALIDATION RESULTS ==========\n');

process.exit(validation.issues.length > 0 ? 1 : 0);

