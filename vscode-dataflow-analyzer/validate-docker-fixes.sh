#!/bin/bash
# Dry-run validation script for Docker fixes
# Validates that all logical errors are fixed before committing

set -e

echo "=== DRY RUN: Validating Docker Fixes ==="
echo ""

# Check 1: Verify devcontainer.json has correct working directory
echo "[DRY RUN] Checking devcontainer.json..."
if grep -q '"workspaceFolder": "/app"' .devcontainer/devcontainer.json; then
    echo "  ✓ workspaceFolder is set to /app"
else
    echo "  ✗ ERROR: workspaceFolder not set correctly"
    exit 1
fi

if grep -q 'cd /app' .devcontainer/devcontainer.json; then
    echo "  ✓ postCreateCommand includes cd /app"
else
    echo "  ✗ ERROR: postCreateCommand missing cd /app"
    exit 1
fi

# Check 2: Verify Dockerfile has binary architecture verification
echo "[DRY RUN] Checking Dockerfile for binary architecture verification..."
if grep -q "Binary architecture verified: Linux x86_64/amd64" Dockerfile; then
    echo "  ✓ Binary architecture verification found"
else
    echo "  ✗ ERROR: Binary architecture verification missing"
    exit 1
fi

# Check 3: Verify Dockerfile has dry-run logging
echo "[DRY RUN] Checking Dockerfile for dry-run logging..."
if grep -q "\[DRY RUN\]" Dockerfile; then
    echo "  ✓ Dry-run logging found"
else
    echo "  ✗ ERROR: Dry-run logging missing"
    exit 1
fi

# Check 4: Verify docker-compose.yml has working directory enforcement
echo "[DRY RUN] Checking docker-compose.yml..."
if grep -q "cd /app" docker-compose.yml; then
    echo "  ✓ Working directory enforcement found"
else
    echo "  ✗ ERROR: Working directory enforcement missing"
    exit 1
fi

# Check 5: Verify LD_LIBRARY_PATH is set correctly (no undefined variable warnings)
echo "[DRY RUN] Checking LD_LIBRARY_PATH usage..."
if grep -q "ENV LD_LIBRARY_PATH=/usr/lib/llvm-17/lib" Dockerfile; then
    echo "  ✓ LD_LIBRARY_PATH set correctly"
else
    echo "  ✗ ERROR: LD_LIBRARY_PATH not set correctly"
    exit 1
fi

# Check for problematic syntax that causes undefined variable warnings
if grep -q 'LD_LIBRARY_PATH.*LD_LIBRARY_PATH:+:' Dockerfile; then
    echo "  ✗ ERROR: Found problematic LD_LIBRARY_PATH syntax"
    exit 1
else
    echo "  ✓ No problematic LD_LIBRARY_PATH syntax found"
fi

# Check 6: Verify binary is made executable
echo "[DRY RUN] Checking binary executable permissions..."
if grep -q "chmod +x.*cfg-exporter" Dockerfile; then
    echo "  ✓ Binary executable permissions set"
else
    echo "  ✗ ERROR: Binary executable permissions missing"
    exit 1
fi

echo ""
echo "=== DRY RUN VALIDATION COMPLETE ==="
echo "✓ All checks passed!"
echo ""
echo "Summary of fixes:"
echo "  1. ✓ Binary architecture verification added"
echo "  2. ✓ Working directory enforcement (/app) added"
echo "  3. ✓ Dry-run logging added at major stages"
echo "  4. ✓ LD_LIBRARY_PATH warnings fixed"
echo "  5. ✓ Binary executable permissions ensured"
echo ""
echo "Ready to commit!"

