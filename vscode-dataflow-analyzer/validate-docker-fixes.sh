#!/bin/bash
# Dry-run validation script for Docker fixes
# Validates that all logical errors are fixed before committing
# Outputs are written to logs2.txt

set -e

LOG_FILE="logs2.txt"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Function to log to both stdout and file
log() {
    echo "$@" | tee -a "$LOG_FILE"
}

# Initialize log file with timestamp
echo "=== DRY RUN: Validating Docker Fixes ===" > "$LOG_FILE"
echo "Timestamp: $TIMESTAMP" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

log "=== DRY RUN: Validating Docker Fixes ==="
log "Timestamp: $TIMESTAMP"
log ""

# Check 1: Verify devcontainer.json has correct working directory
log "[DRY RUN] Checking devcontainer.json..."
if grep -q '"workspaceFolder": "/app"' .devcontainer/devcontainer.json; then
    log "  ✓ workspaceFolder is set to /app"
else
    log "  ✗ ERROR: workspaceFolder not set correctly"
    exit 1
fi

if grep -q 'cd /app' .devcontainer/devcontainer.json; then
    log "  ✓ postCreateCommand includes cd /app"
else
    log "  ✗ ERROR: postCreateCommand missing cd /app"
    exit 1
fi

# Check 2: Verify Dockerfile has binary architecture verification
log "[DRY RUN] Checking Dockerfile for binary architecture verification..."
if grep -q "Binary architecture verified: Linux x86_64/amd64" Dockerfile; then
    log "  ✓ Binary architecture verification found"
else
    log "  ✗ ERROR: Binary architecture verification missing"
    exit 1
fi

# Check 3: Verify Dockerfile has dry-run logging
log "[DRY RUN] Checking Dockerfile for dry-run logging..."
if grep -q "\[DRY RUN\]" Dockerfile; then
    log "  ✓ Dry-run logging found"
else
    log "  ✗ ERROR: Dry-run logging missing"
    exit 1
fi

# Check 4: Verify docker-compose.yml has working directory enforcement
log "[DRY RUN] Checking docker-compose.yml..."
if grep -q "cd /app" docker-compose.yml; then
    log "  ✓ Working directory enforcement found"
else
    log "  ✗ ERROR: Working directory enforcement missing"
    exit 1
fi

# Check 5: Verify LD_LIBRARY_PATH is set correctly (no undefined variable warnings)
log "[DRY RUN] Checking LD_LIBRARY_PATH usage..."
if grep -q "ENV LD_LIBRARY_PATH=/usr/lib/llvm-17/lib" Dockerfile; then
    log "  ✓ LD_LIBRARY_PATH set correctly"
else
    log "  ✗ ERROR: LD_LIBRARY_PATH not set correctly"
    exit 1
fi

# Check for problematic syntax that causes undefined variable warnings
if grep -q 'LD_LIBRARY_PATH.*LD_LIBRARY_PATH:+:' Dockerfile; then
    log "  ✗ ERROR: Found problematic LD_LIBRARY_PATH syntax"
    exit 1
else
    log "  ✓ No problematic LD_LIBRARY_PATH syntax found"
fi

# Check 6: Verify binary is made executable
log "[DRY RUN] Checking binary executable permissions..."
if grep -q "chmod +x.*cfg-exporter" Dockerfile; then
    log "  ✓ Binary executable permissions set"
else
    log "  ✗ ERROR: Binary executable permissions missing"
    exit 1
fi

log ""
log "=== DRY RUN VALIDATION COMPLETE ==="
log "✓ All checks passed!"
log ""
log "Summary of fixes:"
log "  1. ✓ Binary architecture verification added"
log "  2. ✓ Working directory enforcement (/app) added"
log "  3. ✓ Dry-run logging added at major stages"
log "  4. ✓ LD_LIBRARY_PATH warnings fixed"
log "  5. ✓ Binary executable permissions ensured"
log ""
log "Ready to commit!"
log ""
log "Validation completed at: $(date '+%Y-%m-%d %H:%M:%S')"
log ""
log "✓ Validation output written to $LOG_FILE"
