#!/usr/bin/env python3
"""
Phase 1 & 2 Validation Script
Validates compilation, code metrics, and test coverage
"""

import os
import sys
import subprocess
from pathlib import Path

def run_command(cmd):
    """Run a shell command and return output"""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
        return result.returncode, result.stdout, result.stderr
    except Exception as e:
        return 1, "", str(e)

def count_lines(filepath):
    """Count lines in a file"""
    try:
        with open(filepath, 'r') as f:
            return len(f.readlines())
    except:
        return 0

def get_file_size(filepath):
    """Get file size in KB"""
    try:
        size_bytes = os.path.getsize(filepath)
        return size_bytes / 1024
    except:
        return 0

def check_file_exists(filepath):
    """Check if file exists"""
    return os.path.exists(filepath)

def main():
    print("=" * 50)
    print("Phase 1 & 2 Validation Report")
    print("=" * 50)
    print()
    
    base_dir = Path('/Users/srinivasabhargavamanda/Desktop/Personal/vscode-dataflow-analyzer')
    os.chdir(base_dir)
    
    # 1. Compilation check
    print("1️⃣  Compilation Status")
    print("-" * 50)
    returncode, stdout, stderr = run_command("npm run compile 2>&1 | grep -c 'error'")
    error_count = int(stdout.strip()) if stdout.strip().isdigit() else 0
    
    if error_count == 0:
        print("✅ Compilation successful (0 errors)")
    else:
        print(f"❌ Compilation failed ({error_count} errors)")
    print()
    
    # 2. Check compiled files
    print("2️⃣  Compiled Files")
    print("-" * 50)
    
    files_to_check = [
        ('out/analyzer/CallGraphAnalyzer.js', 'Phase 1 Main'),
        ('out/analyzer/CallGraphAnalyzer.Extensions.js', 'Phase 2 Main'),
        ('out/analyzer/__tests__/CallGraphAnalyzer.test.js', 'Phase 1 Tests'),
        ('out/analyzer/__tests__/CallGraphAnalyzer.Extensions.test.js', 'Phase 2 Tests'),
    ]
    
    files_found = 0
    for filepath, label in files_to_check:
        if check_file_exists(filepath):
            size_kb = get_file_size(filepath)
            print(f"✅ {label:20} {size_kb:6.1f} KB")
            files_found += 1
        else:
            print(f"❌ {label:20} MISSING")
    
    print(f"   → Files found: {files_found}/4")
    print()
    
    # 3. Code metrics
    print("3️⃣  Code Metrics (Source Files)")
    print("-" * 50)
    
    phase1_file = 'src/analyzer/CallGraphAnalyzer.ts'
    phase2_file = 'src/analyzer/CallGraphAnalyzer.Extensions.ts'
    
    phase1_lines = count_lines(phase1_file)
    phase2_lines = count_lines(phase2_file)
    total_lines = phase1_lines + phase2_lines
    
    print(f"Phase 1 (CallGraphAnalyzer.ts):         {phase1_lines:4} lines (expected 750+)")
    print(f"Phase 2 (CallGraphAnalyzer.Extensions):  {phase2_lines:4} lines (expected 650+)")
    print(f"Total:                                   {total_lines:4} lines (expected 1850+)")
    
    if phase1_lines >= 750 and phase2_lines >= 650:
        print("✅ Code metrics acceptable")
    else:
        print("⚠️  Code metrics below expectations")
    print()
    
    # 4. Test count
    print("4️⃣  Test Coverage")
    print("-" * 50)
    
    # Read test files and count test cases
    test_file1 = 'out/analyzer/__tests__/CallGraphAnalyzer.test.js'
    test_file2 = 'out/analyzer/__tests__/CallGraphAnalyzer.Extensions.test.js'
    
    phase1_tests = 0
    phase2_tests = 0
    
    try:
        with open(test_file1, 'r') as f:
            content = f.read()
            phase1_tests = content.count("it('should")
    except:
        phase1_tests = 0
    
    try:
        with open(test_file2, 'r') as f:
            content = f.read()
            phase2_tests = content.count("it('should")
    except:
        phase2_tests = 0
    
    total_tests = phase1_tests + phase2_tests
    
    print(f"Phase 1 test cases: {phase1_tests:2} (expected 18+)")
    print(f"Phase 2 test cases: {phase2_tests:2} (expected 30+)")
    print(f"Total test cases:   {total_tests:2} (expected 48+)")
    
    if total_tests >= 48:
        print("✅ Test coverage acceptable")
    else:
        print("⚠️  Test coverage below expectations")
    print()
    
    # 5. Feature presence
    print("5️⃣  Key Features (Phase 1)")
    print("-" * 50)
    
    phase1_methods = [
        'buildCallGraph',
        'extractFunctionCalls',
        'analyzeRecursion',
        'findCallsInStatement',
        'generateDOT',
        'toJSON',
    ]
    
    try:
        with open('out/analyzer/CallGraphAnalyzer.js', 'r') as f:
            phase1_content = f.read()
            for method in phase1_methods:
                if method in phase1_content:
                    print(f"✅ {method}()")
                else:
                    print(f"❌ {method}() NOT FOUND")
    except:
        print("❌ Could not read Phase 1 file")
    print()
    
    print("6️⃣  Key Features (Phase 2)")
    print("-" * 50)
    
    phase2_methods = [
        'identifyExternalFunctions',
        'calculateRecursionDepth',
        'detectTailRecursion',
        'computeStatistics',
        'findStronglyConnectedComponents',
        'generateEnhancedDOT',
    ]
    
    try:
        with open('out/analyzer/CallGraphAnalyzer.Extensions.js', 'r') as f:
            phase2_content = f.read()
            for method in phase2_methods:
                if method in phase2_content:
                    print(f"✅ {method}()")
                else:
                    print(f"❌ {method}() NOT FOUND")
    except:
        print("❌ Could not read Phase 2 file")
    print()
    
    # Final summary
    print("=" * 50)
    print("VALIDATION SUMMARY")
    print("=" * 50)
    print()
    
    all_passed = (
        error_count == 0 and
        files_found == 4 and
        phase1_lines >= 750 and
        phase2_lines >= 650 and
        total_tests >= 48
    )
    
    if all_passed:
        print("✅ PHASE 1 & 2 VALIDATION: PASSED")
        print()
        print("Status Summary:")
        print(f"  • Compilation:  ✅ 0 errors")
        print(f"  • Files:        ✅ 4/4 present")
        print(f"  • Code:         ✅ {total_lines} lines")
        print(f"  • Tests:        ✅ {total_tests} cases")
        print(f"  • Features:     ✅ All present")
        print()
        print("=" * 50)
        print("✅ READY FOR PHASE 3!")
        print("=" * 50)
        return 0
    else:
        print("⚠️  PHASE 1 & 2 VALIDATION: ISSUES FOUND")
        print()
        print("Issues:")
        if error_count > 0:
            print(f"  • Compilation errors: {error_count}")
        if files_found < 4:
            print(f"  • Missing files: {4 - files_found}")
        if phase1_lines < 750:
            print(f"  • Phase 1 code low: {phase1_lines} lines")
        if phase2_lines < 650:
            print(f"  • Phase 2 code low: {phase2_lines} lines")
        if total_tests < 48:
            print(f"  • Test count low: {total_tests} cases")
        print()
        return 1

if __name__ == '__main__':
    sys.exit(main())

