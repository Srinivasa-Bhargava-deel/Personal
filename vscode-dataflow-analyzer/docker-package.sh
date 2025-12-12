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
vsce package --out /app/dist/dataflow-analyzer.vsix
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




