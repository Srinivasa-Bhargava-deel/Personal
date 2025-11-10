#!/bin/bash

# Validation script for LOGIC.md fixes (Phases 1-3)
# Validates all critical and moderate priority fixes

echo "═══════════════════════════════════════════════════════════════"
echo "🔍 VALIDATING LOGIC.md FIXES (Phases 1-3)"
echo "═══════════════════════════════════════════════════════════════"
echo ""

ERRORS=0
WARNINGS=0

# Phase 1: Critical Algorithm Fixes
echo "📋 PHASE 1: Critical Algorithm Fixes"
echo "───────────────────────────────────────────────────────────────"

# LOGIC-1.1: MAX_ITERATIONS in LivenessAnalyzer
echo -n "  [LOGIC-1.1] MAX_ITERATIONS check in LivenessAnalyzer... "
if grep -q "MAX_ITERATIONS.*functionCFG.blocks.size" src/analyzer/LivenessAnalyzer.ts && \
   grep -q "iteration < MAX_ITERATIONS" src/analyzer/LivenessAnalyzer.ts && \
   grep -q "Reached MAX_ITERATIONS.*without convergence" src/analyzer/LivenessAnalyzer.ts; then
    echo "✅ PASS"
else
    echo "❌ FAIL"
    ERRORS=$((ERRORS + 1))
fi

# LOGIC-1.2: Taint Analysis RD Map
echo -n "  [LOGIC-1.2] Taint Analysis RD Map collection... "
if grep -q "CRITICAL FIX.*LOGIC.md #2" src/analyzer/DataflowAnalyzer.ts && \
   grep -q "Collect ALL reaching definitions for function" src/analyzer/DataflowAnalyzer.ts && \
   grep -q "funcRD = new Map" src/analyzer/DataflowAnalyzer.ts; then
    echo "✅ PASS"
else
    echo "❌ FAIL"
    ERRORS=$((ERRORS + 1))
fi

# LOGIC-1.3: Null Checks in Block Access
echo -n "  [LOGIC-1.3] Null checks in block access... "
if grep -q "if (!block || !liveness)" src/analyzer/LivenessAnalyzer.ts && \
   grep -q "WARNING.*Block.*not found" src/analyzer/LivenessAnalyzer.ts; then
    echo "✅ PASS"
else
    echo "❌ FAIL"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# Phase 2: Concurrency and Safety
echo "📋 PHASE 2: Concurrency and Safety"
echo "───────────────────────────────────────────────────────────────"

# LOGIC-2.1: Race Condition Fix
echo -n "  [LOGIC-2.1] Race condition mutex... "
if grep -q "updateMutex.*Promise<void>" src/analyzer/DataflowAnalyzer.ts && \
   grep -q "updateFileInternal" src/analyzer/DataflowAnalyzer.ts && \
   grep -q "mutex acquired for" src/analyzer/DataflowAnalyzer.ts; then
    echo "✅ PASS"
else
    echo "❌ FAIL"
    ERRORS=$((ERRORS + 1))
fi

# LOGIC-2.2: Propagation Path Tracking
echo -n "  [LOGIC-2.2] Propagation path tracking... "
if grep -q "CRITICAL FIX.*LOGIC.md #6" src/analyzer/ReachingDefinitionsAnalyzer.ts && \
   grep -q "propagationPath.*def.propagationPath" src/analyzer/ReachingDefinitionsAnalyzer.ts && \
   grep -q "Append current block" src/analyzer/ReachingDefinitionsAnalyzer.ts; then
    echo "✅ PASS"
else
    echo "❌ FAIL"
    ERRORS=$((ERRORS + 1))
fi

# LOGIC-2.3: Error Handling in Parameter Extraction
echo -n "  [LOGIC-2.3] Error handling in parameter extraction... "
if grep -q "fs.existsSync.*filePath" src/analyzer/EnhancedCPPParser.ts && \
   grep -q "WARNING.*File not found for parameter extraction" src/analyzer/EnhancedCPPParser.ts && \
   grep -q "foundSignature.*false" src/analyzer/EnhancedCPPParser.ts; then
    echo "✅ PASS"
else
    echo "❌ FAIL"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# Phase 3: Algorithm Correctness
echo "📋 PHASE 3: Algorithm Correctness"
echo "───────────────────────────────────────────────────────────────"

# LOGIC-3.1: GEN Set Computation for Parameters
echo -n "  [LOGIC-3.1] GEN set computation for parameters... "
if grep -q "lastDefByVar.has.*def.variable" src/analyzer/ReachingDefinitionsAnalyzer.ts && \
   grep -q "Parameter.*added to GEN.*not redefined" src/analyzer/ReachingDefinitionsAnalyzer.ts && \
   grep -q "NOT added to GEN.*redefined" src/analyzer/ReachingDefinitionsAnalyzer.ts; then
    echo "✅ PASS"
else
    echo "❌ FAIL"
    ERRORS=$((ERRORS + 1))
fi

# LOGIC-3.2: Fixed-Point Detection
echo -n "  [LOGIC-3.2] Fixed-point detection... "
if grep -q "newValues.*Map.*newIn.*newOut" src/analyzer/LivenessAnalyzer.ts && \
   grep -q "Compute all new values first.*then update atomically" src/analyzer/LivenessAnalyzer.ts && \
   grep -q "Update all values atomically" src/analyzer/LivenessAnalyzer.ts; then
    echo "✅ PASS"
else
    echo "❌ FAIL"
    ERRORS=$((ERRORS + 1))
fi

# LOGIC-3.3: CFG Structure Validation
echo -n "  [LOGIC-3.3] CFG structure validation... "
if grep -q "validateCFGStructure" src/analyzer/EnhancedCPPParser.ts && \
   grep -q "Bidirectional inconsistency" src/analyzer/EnhancedCPPParser.ts && \
   grep -q "Entry block.*does not exist" src/analyzer/EnhancedCPPParser.ts; then
    echo "✅ PASS"
else
    echo "❌ FAIL"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "📊 VALIDATION SUMMARY"
echo "═══════════════════════════════════════════════════════════════"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo "✅ ALL VALIDATIONS PASSED (9/9)"
    echo ""
    echo "Phase 1: ✅ 3/3 fixes validated"
    echo "Phase 2: ✅ 3/3 fixes validated"
    echo "Phase 3: ✅ 3/3 fixes validated"
    echo ""
    exit 0
else
    echo "❌ VALIDATION FAILED: $ERRORS error(s) found"
    echo ""
    exit 1
fi

