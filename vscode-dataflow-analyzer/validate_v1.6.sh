#!/bin/bash

# Validation Script for v1.6.0
# Validates all improvements made after v1.5.1

echo "=========================================="
echo "v1.6.0 Validation Script"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0
WARNINGS=0

# Function to check if a pattern exists in a file
check_pattern() {
    local file=$1
    local pattern=$2
    local description=$3
    
    if grep -q "$pattern" "$file" 2>/dev/null; then
        echo -e "  ${GREEN}✅${NC} $description"
        ((PASSED++))
        return 0
    else
        echo -e "  ${RED}❌${NC} $description"
        ((FAILED++))
        return 1
    fi
}

# Function to check if a pattern exists (warning)
check_pattern_warn() {
    local file=$1
    local pattern=$2
    local description=$3
    
    if grep -q "$pattern" "$file" 2>/dev/null; then
        echo -e "  ${GREEN}✅${NC} $description"
        ((PASSED++))
        return 0
    else
        echo -e "  ${YELLOW}⚠️${NC} $description (optional)"
        ((WARNINGS++))
        return 1
    fi
}

echo "1️⃣  Compilation Check"
echo "----------------------------------------"
npm run compile > /tmp/compile_v1.6.log 2>&1
if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}✅${NC} Compilation successful (0 errors)"
    ((PASSED++))
else
    echo -e "  ${RED}❌${NC} Compilation failed"
    echo "  Check /tmp/compile_v1.6.log for details"
    ((FAILED++))
fi
echo ""

echo "2️⃣  TypeScript Type Checking"
echo "----------------------------------------"
if command -v tsc &> /dev/null; then
    tsc --noEmit > /tmp/tsc_v1.6.log 2>&1
    if [ $? -eq 0 ]; then
        echo -e "  ${GREEN}✅${NC} TypeScript type checking passed"
        ((PASSED++))
    else
        echo -e "  ${RED}❌${NC} TypeScript errors found"
        echo "  Check /tmp/tsc_v1.6.log for details"
        ((FAILED++))
    fi
else
    # Use npm run compile which includes type checking
    if grep -q "error TS" /tmp/compile_v1.6.log 2>/dev/null; then
        echo -e "  ${RED}❌${NC} TypeScript errors found in compilation"
        ((FAILED++))
    else
        echo -e "  ${GREEN}✅${NC} TypeScript type checking passed (via compilation)"
        ((PASSED++))
    fi
fi
echo ""

echo "3️⃣  Blue Edges Fix (Task 0a)"
echo "----------------------------------------"
CFG_VISUALIZER="src/visualizer/CFGVisualizer.ts"
check_pattern "$CFG_VISUALIZER" "Array.from(state.callGraph.callsFrom.entries())" "Map iteration for call graph"
check_pattern "$CFG_VISUALIZER" "callsFrom instanceof Map" "Map type checking"
check_pattern "$CFG_VISUALIZER" "type: 'function_call'" "Function call edge metadata"
check_pattern "$CFG_VISUALIZER" "#4dabf7.*Blue for calls" "Blue edge color definition"
echo ""

echo "4️⃣  Orange Edges Fix (Task 0b)"
echo "----------------------------------------"
check_pattern "$CFG_VISUALIZER" "def\\.blockId" "Using blockId for data flow edges"
check_pattern "$CFG_VISUALIZER" "#ff8800" "Orange edge color definition"
check_pattern "$CFG_VISUALIZER" "width: 3" "Orange edge width (checking for width: 3)"
check_pattern "$CFG_VISUALIZER" "dashes: \\[8, 4\\]" "Orange edge dash pattern"
check_pattern "$CFG_VISUALIZER" "type: 'data_flow'" "Data flow edge metadata"
echo ""

echo "5️⃣  Panel Tracking Implementation"
echo "----------------------------------------"
check_pattern "$CFG_VISUALIZER" "private panels: Map<string, vscode.WebviewPanel>" "Panel tracking Map"
check_pattern "$CFG_VISUALIZER" "getPanelKey.*filename.*viewType" "Panel key generation"
check_pattern "$CFG_VISUALIZER" "updateVisualizationForFile" "File-specific update method"
check_pattern "src/extension.ts" "updateVisualizationForFile" "Extension uses file-specific updates"
echo ""

echo "6️⃣  Error Handling Improvements (Task 7)"
echo "----------------------------------------"
check_pattern "$CFG_VISUALIZER" "showErrorFallback" "Error fallback function"
check_pattern "$CFG_VISUALIZER" "loadTimeout.*setTimeout" "Script loading timeout"
check_pattern "$CFG_VISUALIZER" "script.onerror" "Script error handler"
check_pattern "$CFG_VISUALIZER" "catch.*parseError" "JSON parsing error handling"
check_pattern "$CFG_VISUALIZER" "catch.*parseError|catch.*cgError|catch.*icError|catch.*networkError|catch.*initError" "Network creation error handling"
check_pattern "$CFG_VISUALIZER" "catch.*clickError" "Click handler error handling"
echo ""

echo "7️⃣  Code Comments (Task 11)"
echo "----------------------------------------"
check_pattern_warn "src/extension.ts" "/\\*\\*.*@param" "JSDoc comments in extension.ts"
check_pattern_warn "$CFG_VISUALIZER" "/\\*\\*.*@param" "JSDoc comments in CFGVisualizer.ts"
check_pattern_warn "src/analyzer/ReachingDefinitionsAnalyzer.ts" "/\\*\\*.*@param" "JSDoc comments in ReachingDefinitionsAnalyzer.ts"
check_pattern_warn "src/analyzer/TaintAnalyzer.ts" "/\\*\\*.*@param" "JSDoc comments in TaintAnalyzer.ts"
echo ""

echo "8️⃣  Key Files Present"
echo "----------------------------------------"
FILES=(
    "src/extension.ts"
    "src/visualizer/CFGVisualizer.ts"
    "src/analyzer/DataflowAnalyzer.ts"
    "src/analyzer/LivenessAnalyzer.ts"
    "src/analyzer/ReachingDefinitionsAnalyzer.ts"
    "src/analyzer/TaintAnalyzer.ts"
    "src/analyzer/CallGraphAnalyzer.ts"
    "package.json"
    "md_files/README.md"
    "md_files/FUTURE_PLANS.md"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "  ${GREEN}✅${NC} $file"
        ((PASSED++))
    else
        echo -e "  ${RED}❌${NC} $file (missing)"
        ((FAILED++))
    fi
done
echo ""

echo "9️⃣  Version Consistency"
echo "----------------------------------------"
VERSION_IN_PACKAGE=$(grep -o '"version": "[^"]*"' package.json | cut -d'"' -f4)
VERSION_IN_README=$(grep -i "version.*1.6" md_files/README.md | head -1 | grep -o "1\.6\.[0-9]" | head -1)

if [ "$VERSION_IN_PACKAGE" = "1.6.0" ]; then
    echo -e "  ${GREEN}✅${NC} package.json version: $VERSION_IN_PACKAGE"
    ((PASSED++))
else
    echo -e "  ${RED}❌${NC} package.json version mismatch: $VERSION_IN_PACKAGE (expected 1.6.0)"
    ((FAILED++))
fi

if [ -n "$VERSION_IN_README" ]; then
    echo -e "  ${GREEN}✅${NC} README.md mentions v1.6"
    ((PASSED++))
else
    echo -e "  ${YELLOW}⚠️${NC} README.md may not mention v1.6"
    ((WARNINGS++))
fi
echo ""

echo "=========================================="
echo "Validation Summary"
echo "=========================================="
echo -e "  ${GREEN}Passed:${NC} $PASSED"
echo -e "  ${RED}Failed:${NC} $FAILED"
echo -e "  ${YELLOW}Warnings:${NC} $WARNINGS"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All critical checks passed!${NC}"
    echo ""
    echo "📋 Next Steps:"
    echo "   1. Run manual visualization testing (see validate_v1.6.md)"
    echo "   2. Test with example.cpp and test_complex_calls.cpp"
    echo "   3. Verify blue and orange edges appear in interconnected CFG"
    echo "   4. Test panel tracking with multiple files"
    exit 0
else
    echo -e "${RED}❌ Some checks failed. Please review the errors above.${NC}"
    exit 1
fi

