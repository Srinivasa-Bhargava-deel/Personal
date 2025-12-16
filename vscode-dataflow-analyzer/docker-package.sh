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
npm install -g @vscode/vsce

# Package extension
# The repository URL is now in package.json, so vsce can detect it automatically
# Try with --allow-missing-repository flag first (in case flag is supported)
# If that fails, fall back to regular packaging (should work with repository in package.json)
if ! vsce package --out /app/dist/dataflow-analyzer.vsix --allow-missing-repository 2>&1; then
    echo "Retrying without --allow-missing-repository flag (repository URL is in package.json)..."
    vsce package --out /app/dist/dataflow-analyzer.vsix
fi
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




