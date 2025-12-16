#!/bin/bash
# Helper script to package VS Code extension without running prepublish
# This script temporarily disables vscode:prepublish since code is already compiled

set -e

# Enhanced logging function
log_info() {
    echo "[INFO] $(date '+%Y-%m-%d %H:%M:%S') - $*"
}

log_error() {
    echo "[ERROR] $(date '+%Y-%m-%d %H:%M:%S') - $*" >&2
}

log_warn() {
    echo "[WARN] $(date '+%Y-%m-%d %H:%M:%S') - $*" >&2
}

log_info "Starting VS Code extension packaging process..."
log_info "Working directory: $(pwd)"
log_info "User: $(whoami)"
log_info "Node version: $(node --version)"
log_info "NPM version: $(npm --version)"

# Verify we're in the right directory
if [ ! -f package.json ]; then
    log_error "package.json not found in current directory: $(pwd)"
    log_error "Listing current directory contents:"
    ls -la
    exit 1
fi

log_info "Found package.json, reading version..."
PACKAGE_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "unknown")
log_info "Package version: $PACKAGE_VERSION"

# Backup and remove vscode:prepublish script
log_info "Checking for vscode:prepublish script..."
if [ -f package.json ]; then
    # Use node to safely modify package.json
    log_info "Backing up vscode:prepublish script..."
    node << 'EOF'
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

if (pkg.scripts && pkg.scripts['vscode:prepublish']) {
    console.log('[INFO] Found vscode:prepublish script, backing up...');
    pkg.scripts['_vscode_prepublish_backup'] = pkg.scripts['vscode:prepublish'];
    delete pkg.scripts['vscode:prepublish'];
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
    console.log('[INFO] vscode:prepublish script backed up and removed');
} else {
    console.log('[INFO] No vscode:prepublish script found, skipping backup');
}
EOF
fi

# Install vsce and package
log_info "Installing @vscode/vsce globally..."
if ! npm install -g @vscode/vsce; then
    log_error "Failed to install @vscode/vsce"
    exit 1
fi

log_info "Verifying vsce installation..."
if ! command -v vsce &> /dev/null; then
    log_error "vsce command not found after installation"
    exit 1
fi

VSCE_VERSION=$(vsce --version 2>/dev/null || echo "unknown")
log_info "vsce version: $VSCE_VERSION"

# Verify package.json exists and has repository URL
log_info "Verifying package.json structure..."
if [ ! -f package.json ]; then
    log_error "package.json not found in /app directory"
    exit 1
fi

# Check if repository field exists
log_info "Checking for repository field in package.json..."
if ! node -e "const pkg = require('./package.json'); if (!pkg.repository) { process.exit(1); }" 2>/dev/null; then
    log_warn "package.json does not have a 'repository' field"
    log_warn "This may cause vsce to fail. Consider adding a repository URL to package.json"
else
    REPO_URL=$(node -p "require('./package.json').repository.url || require('./package.json').repository" 2>/dev/null || echo "unknown")
    log_info "✓ package.json has repository field: $REPO_URL"
fi

# Verify dist directory exists
log_info "Checking dist directory..."
if [ ! -d "/app/dist" ]; then
    log_warn "dist directory does not exist, creating it..."
    mkdir -p /app/dist || {
        log_error "Failed to create dist directory"
        exit 1
    }
fi

# Verify compiled code exists
log_info "Checking for compiled code..."
if [ ! -d "out" ]; then
    log_error "out directory not found. Code must be compiled before packaging."
    log_error "Run 'npm run compile' first."
    exit 1
fi

OUT_FILE_COUNT=$(find out -type f 2>/dev/null | wc -l || echo "0")
log_info "Found $OUT_FILE_COUNT files in out directory"

# Package extension
# The repository URL is now in package.json, so vsce can detect it automatically
# Try with --allow-missing-repository flag first (in case flag is supported)
# If that fails, fall back to regular packaging (should work with repository in package.json)
log_info "=== Packaging extension ==="
log_info "Attempting to package with --allow-missing-repository flag..."
if vsce package --out /app/dist/dataflow-analyzer.vsix --allow-missing-repository 2>&1; then
    EXIT_CODE=0
    log_info "Packaging with --allow-missing-repository succeeded!"
else
    EXIT_CODE=$?
    log_warn "Packaging with --allow-missing-repository failed (exit code: $EXIT_CODE)"
    log_info "Falling back to packaging without the flag (relying on package.json repository field)..."
    if vsce package --out /app/dist/dataflow-analyzer.vsix 2>&1; then
        EXIT_CODE=0
        log_info "Packaging without flag succeeded!"
    else
        EXIT_CODE=$?
        log_error "Packaging failed with exit code: $EXIT_CODE"
    fi
fi

# Verify VSIX file was created
if [ $EXIT_CODE -eq 0 ]; then
    if [ -f "/app/dist/dataflow-analyzer.vsix" ]; then
        VSIX_SIZE=$(du -h /app/dist/dataflow-analyzer.vsix | cut -f1)
        log_info "✓ VSIX file created successfully: /app/dist/dataflow-analyzer.vsix ($VSIX_SIZE)"
    else
        log_error "VSIX file not found at /app/dist/dataflow-analyzer.vsix"
        EXIT_CODE=1
    fi
fi

# Restore vscode:prepublish script
log_info "Restoring vscode:prepublish script..."
if [ -f package.json ]; then
    node << 'EOF'
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

if (pkg.scripts && pkg.scripts['_vscode_prepublish_backup']) {
    console.log('[INFO] Restoring vscode:prepublish script...');
    pkg.scripts['vscode:prepublish'] = pkg.scripts['_vscode_prepublish_backup'];
    delete pkg.scripts['_vscode_prepublish_backup'];
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
    console.log('[INFO] vscode:prepublish script restored');
} else {
    console.log('[INFO] No backup found, skipping restore');
}
EOF
fi

if [ $EXIT_CODE -eq 0 ]; then
    log_info "=== Packaging completed successfully ==="
else
    log_error "=== Packaging failed with exit code: $EXIT_CODE ==="
fi

exit $EXIT_CODE




