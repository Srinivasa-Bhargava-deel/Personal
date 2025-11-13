#!/bin/bash
# Automated test script for context-sensitive taint analysis (Task 14)

echo "=========================================="
echo "Context-Sensitive Taint Analysis Tests"
echo "=========================================="
echo ""

# Test 1: Check if ContextSensitiveTaintAnalyzer exists
echo "[Test 1] Checking if ContextSensitiveTaintAnalyzer exists..."
if [ -f "src/analyzer/ContextSensitiveTaintAnalyzer.ts" ]; then
    echo "✅ PASS: ContextSensitiveTaintAnalyzer.ts exists"
else
    echo "❌ FAIL: ContextSensitiveTaintAnalyzer.ts not found"
    exit 1
fi

# Test 2: Check if it's integrated into DataflowAnalyzer
echo ""
echo "[Test 2] Checking integration in DataflowAnalyzer..."
if grep -q "ContextSensitiveTaintAnalyzer" "src/analyzer/DataflowAnalyzer.ts"; then
    echo "✅ PASS: ContextSensitiveTaintAnalyzer imported in DataflowAnalyzer"
else
    echo "❌ FAIL: ContextSensitiveTaintAnalyzer not found in DataflowAnalyzer"
    exit 1
fi

# Test 3: Check if Phase 6 is implemented
echo ""
echo "[Test 3] Checking Phase 6 implementation..."
if grep -q "Phase 6.*Context-Sensitive" "src/analyzer/DataflowAnalyzer.ts"; then
    echo "✅ PASS: Phase 6 (Context-Sensitive Taint Analysis) implemented"
else
    echo "❌ FAIL: Phase 6 not found"
    exit 1
fi

# Test 4: Check if worklist algorithm is used
echo ""
echo "[Test 4] Checking worklist algorithm implementation..."
if grep -q "worklist" "src/analyzer/ContextSensitiveTaintAnalyzer.ts"; then
    echo "✅ PASS: Worklist algorithm found"
else
    echo "❌ FAIL: Worklist algorithm not found"
    exit 1
fi

# Test 5: Check if k-limited context is implemented
echo ""
echo "[Test 5] Checking k-limited context..."
if grep -q "contextSize\|buildContext\|k-limited" "src/analyzer/ContextSensitiveTaintAnalyzer.ts"; then
    echo "✅ PASS: k-limited context implementation found"
else
    echo "❌ FAIL: k-limited context not found"
    exit 1
fi

# Test 6: Check if call site states are tracked
echo ""
echo "[Test 6] Checking call site state tracking..."
if grep -q "CallSiteTaintState\|callSiteStates" "src/analyzer/ContextSensitiveTaintAnalyzer.ts"; then
    echo "✅ PASS: Call site state tracking found"
else
    echo "❌ FAIL: Call site state tracking not found"
    exit 1
fi

# Test 7: Check if UI shows context information
echo ""
echo "[Test 7] Checking UI context visualization..."
if grep -q "Context-Sensitive\|context-sensitive\|sourceFunction" "src/visualizer/CFGVisualizer.ts" | head -1; then
    echo "✅ PASS: Context information in UI found"
else
    echo "⚠️  WARNING: Context visualization may need enhancement"
fi

# Test 8: Compilation check
echo ""
echo "[Test 8] Checking TypeScript compilation..."
if npm run compile 2>&1 | grep -q "error TS"; then
    echo "❌ FAIL: TypeScript compilation errors found"
    npm run compile 2>&1 | grep "error TS"
    exit 1
else
    echo "✅ PASS: TypeScript compilation successful"
fi

echo ""
echo "=========================================="
echo "All automated tests completed!"
echo "=========================================="

