#!/bin/bash
# Helper script to package VS Code extension without running prepublish
# This script temporarily disables vscode:prepublish since code is already compiled

set -e

# Backup and remove vscode:prepublish script
if [ -f package.json ]; then
    # Use node to safely modify package.json
    node << 'EOF'
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

if (pkg.scripts && pkg.scripts['vscode:prepublish']) {
    pkg.scripts['_vscode_prepublish_backup'] = pkg.scripts['vscode:prepublish'];
    delete pkg.scripts['vscode:prepublish'];
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
}
EOF
fi

# Install vsce and package
echo "=== Installing @vscode/vsce ==="
npm install -g @vscode/vsce

# Verify package.json exists and has repository URL
echo "=== Verifying package.json ==="
if [ ! -f package.json ]; then
    echo "ERROR: package.json not found in /app directory"
    exit 1
fi

# Check if repository URL is in package.json
if ! grep -q '"repository"' package.json; then
    echo "WARNING: repository field not found in package.json"
    echo "This may cause vsce to fail repository detection"
fi

# Package extension
# The repository URL is now in package.json, so vsce can detect it automatically
# Try with --allow-missing-repository flag first (in case flag is supported)
# If that fails, fall back to regular packaging (should work with repository in package.json)
echo "=== Packaging extension ==="
echo "Attempting to package with --allow-missing-repository flag..."
if ! vsce package --out /app/dist/dataflow-analyzer.vsix --allow-missing-repository 2>&1; then
    echo "WARNING: Packaging with --allow-missing-repository flag failed"
    echo "Retrying without --allow-missing-repository flag (repository URL is in package.json)..."
    if ! vsce package --out /app/dist/dataflow-analyzer.vsix 2>&1; then
        echo "ERROR: Packaging failed with both methods"
        echo "Check the error messages above for details"
        exit 1
    fi
fi

echo "=== Packaging completed successfully ==="
EXIT_CODE=$?

# Restore vscode:prepublish script
if [ -f package.json ]; then
    node << 'EOF'
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

if (pkg.scripts && pkg.scripts['_vscode_prepublish_backup']) {
    pkg.scripts['vscode:prepublish'] = pkg.scripts['_vscode_prepublish_backup'];
    delete pkg.scripts['_vscode_prepublish_backup'];
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
}
EOF
fi

exit $EXIT_CODE




