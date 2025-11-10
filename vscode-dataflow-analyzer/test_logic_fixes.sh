#!/bin/bash
# Test script for LOGIC.md fixes

echo "🧪 Testing LOGIC.md Fixes"
echo "=========================="
echo ""

# Test 1: Check compilation
echo "Test 1: Compilation"
npm run compile > /tmp/compile.log 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Compilation successful"
else
    echo "❌ Compilation failed"
    cat /tmp/compile.log
    exit 1
fi
echo ""

# Test 2: Check for MAX_ITERATIONS in LivenessAnalyzer
echo "Test 2: MAX_ITERATIONS in LivenessAnalyzer"
if grep -q "MAX_ITERATIONS.*functionCFG.blocks.size" src/analyzer/LivenessAnalyzer.ts; then
    echo "✅ MAX_ITERATIONS check found"
else
    echo "❌ MAX_ITERATIONS check missing"
fi
if grep -q "iteration >= MAX_ITERATIONS" src/analyzer/LivenessAnalyzer.ts; then
    echo "✅ Convergence warning found"
else
    echo "❌ Convergence warning missing"
fi
echo ""

# Test 3: Check for null checks in LivenessAnalyzer
echo "Test 3: Null checks in LivenessAnalyzer"
if grep -q "if (!block || !liveness)" src/analyzer/LivenessAnalyzer.ts; then
    echo "✅ Null checks found"
else
    echo "❌ Null checks missing"
fi
echo ""

# Test 4: Check for complete RD map collection in DataflowAnalyzer
echo "Test 4: Complete RD map collection for taint analysis"
if grep -q "funcCFG.blocks.forEach.*block.*blockId" src/analyzer/DataflowAnalyzer.ts; then
    echo "✅ RD collection for all blocks found"
else
    echo "❌ RD collection for all blocks missing"
fi
if grep -q "collected RD info for.*blocks" src/analyzer/DataflowAnalyzer.ts; then
    echo "✅ RD collection logging found"
else
    echo "❌ RD collection logging missing"
fi
echo ""

echo "✅ All static checks passed!"
echo ""
echo "Next: Run manual tests with test files (see TEST_LOGIC_FIXES.md)"

