#!/bin/bash
# Comprehensive dependency scanner for TypeScript files

echo "=== SCANNING ALL FILE DEPENDENCIES ==="
echo ""

cd "$(dirname "$0")"

broken_count=0
total_files=0
total_imports=0

for file in $(find src -name "*.ts" -type f | grep -v __tests__ | grep -v __mocks__ | sort); do
    total_files=$((total_files + 1))
    echo "Scanning: $file"
    
    # Extract all imports
    imports=$(grep -E "^import|^export|require\(" "$file" | grep -E "from ['\"]|require\(['\"]" | sed -E "s/.*from ['\"]([^'\"]+)['\"].*/\1/" | sed -E "s/.*require\(['\"]([^'\"]+)['\"].*/\1/")
    
    for imp in $imports; do
        # Skip node modules and built-ins
        if [[ "$imp" =~ ^(vscode|fs|path|crypto|os|util|child_process|events|stream|http|https|net|url|querystring|buffer|process|assert|cluster|dgram|dns|domain|module|punycode|readline|repl|string_decoder|tls|tty|vm|zlib)$ ]]; then
            continue
        fi
        
        total_imports=$((total_imports + 1))
        
        # Check if it's a relative import
        if [[ "$imp" =~ ^\.\.?/ ]]; then
            # Resolve relative path
            dir=$(dirname "$file")
            resolved=$(cd "$dir" && cd "$(dirname "$imp")" 2>/dev/null && pwd)/$(basename "$imp") 2>/dev/null || echo "")
            
            # Try with .ts extension
            if [ -f "${resolved}.ts" ]; then
                echo "  ✓ $imp -> ${resolved}.ts"
            elif [ -f "$resolved" ]; then
                echo "  ✓ $imp -> $resolved"
            elif [ -f "${resolved}/index.ts" ]; then
                echo "  ✓ $imp -> ${resolved}/index.ts"
            else
                echo "  ✗ BROKEN: $imp (resolved: $resolved)"
                broken_count=$((broken_count + 1))
            fi
        fi
    done
    echo ""
done

echo "=== SUMMARY ==="
echo "Total files scanned: $total_files"
echo "Total imports checked: $total_imports"
echo "Broken imports: $broken_count"

if [ $broken_count -eq 0 ]; then
    echo "✅ All imports are valid!"
    exit 0
else
    echo "❌ Found $broken_count broken imports"
    exit 1
fi

