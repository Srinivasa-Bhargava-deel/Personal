# Windows Build Instructions for v1.9.1

Complete step-by-step guide to build and run the C++ Dataflow Analyzer VS Code extension on Windows.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [System Requirements](#system-requirements)
3. [Installation Steps](#installation-steps)
4. [Building the Extension](#building-the-extension)
5. [Running the Extension](#running-the-extension)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)
8. [Development Workflow](#development-workflow)

---

## Prerequisites

Before starting, ensure you have:
- **Windows 10/11** (64-bit)
- **Administrator privileges** (for installing software)
- **Internet connection** (for downloading dependencies)
- **~5 GB free disk space** (for all dependencies and build artifacts)

---

## System Requirements

### Required Software Versions

| Software | Minimum Version | Recommended Version | Download Link |
|----------|----------------|---------------------|---------------|
| **VS Code** | 1.80.0 | Latest | [code.visualstudio.com](https://code.visualstudio.com/) |
| **Node.js** | 20.0.0 | 20.x LTS | [nodejs.org](https://nodejs.org/) |
| **CMake** | 3.16.0 | 3.28+ | [cmake.org/download](https://cmake.org/download/) |
| **LLVM/Clang** | 21.1.5 | Latest 21.x | [llvm.org/releases](https://github.com/llvm/llvm-project/releases) |
| **Visual Studio Build Tools** | 2019 | 2022 | [visualstudio.microsoft.com/downloads](https://visualstudio.microsoft.com/downloads/) |
| **Git** | 2.30+ | Latest | [git-scm.com/download/win](https://git-scm.com/download/win) |

---

## Installation Steps

### Step 1: Install Git

1. Download Git for Windows from [git-scm.com/download/win](https://git-scm.com/download/win)
2. Run the installer (`Git-2.x.x-64-bit.exe`)
3. **Important**: Select "Git from the command line and also from 3rd-party software"
4. Select "Use Visual Studio Code as Git's default editor" (optional but recommended)
5. Complete the installation
6. **Verify installation**:
   ```powershell
   git --version
   ```

### Step 2: Install Node.js

1. Download Node.js LTS (20.x) from [nodejs.org](https://nodejs.org/)
2. Run the installer (`node-v20.x.x-x64.msi`)
3. **Important**: Check "Add to PATH" during installation
4. Complete the installation
5. **Verify installation**:
   ```powershell
   node --version    # Should show v20.x.x or higher
   npm --version     # Should show 10.x.x or higher
   ```
6. **Update npm** (optional but recommended):
   ```powershell
   npm install -g npm@latest
   ```

### Step 3: Install CMake

1. Download CMake from [cmake.org/download](https://cmake.org/download/)
2. Choose **"Windows x64 Installer"** (`.msi` file)
3. Run the installer (`cmake-x.x.x-windows-x86_64.msi`)
4. **CRITICAL**: Check **"Add CMake to the system PATH for all users"** during installation
5. Select "Add CMake to system PATH" option
6. Complete the installation
7. **Restart PowerShell/Command Prompt** (important for PATH to take effect)
8. **Verify installation**:
   ```powershell
   cmake --version   # Should show 3.16.0 or higher
   ```

### Step 4: Install LLVM/Clang

1. Download LLVM from [llvm.org/releases](https://github.com/llvm/llvm-project/releases)
   - Look for: **"LLVM-21.1.5-win64.exe"** (or latest 21.x version)
   - **Alternative**: Use [LLVM releases page](https://github.com/llvm/llvm-project/releases/tag/llvmorg-21.1.5)
2. Run the installer (`LLVM-21.1.5-win64.exe`)
3. **CRITICAL**: Check **"Add LLVM to the system PATH"** during installation
4. Select installation directory (default: `C:\Program Files\LLVM`)
5. Complete the installation
6. **Restart PowerShell/Command Prompt** (important for PATH to take effect)
7. **Verify installation**:
   ```powershell
   clang --version   # Should show clang version 21.1.5 or higher
   clang++ --version # Should show clang version 21.1.5 or higher
   ```

**Note**: If `clang` command is not found, manually add to PATH:
1. Open "Environment Variables" (Win + R → `sysdm.cpl` → Advanced → Environment Variables)
2. Edit "Path" under "System variables"
3. Add: `C:\Program Files\LLVM\bin`
4. Restart PowerShell

### Step 5: Install Visual Studio Build Tools

**Option A: Visual Studio Build Tools (Recommended for extension development)**

1. Download Visual Studio Build Tools from [visualstudio.microsoft.com/downloads](https://visualstudio.microsoft.com/downloads/)
2. Scroll down to "Tools for Visual Studio" section
3. Download **"Build Tools for Visual Studio 2022"**
4. Run the installer (`vs_buildtools.exe`)
5. Select **"Desktop development with C++"** workload
6. **Also select** (under Individual components):
   - ✅ CMake tools for Windows
   - ✅ Windows 10/11 SDK (latest version)
   - ✅ MSVC v143 - VS 2022 C++ x64/x86 build tools
7. Click "Install"
8. Wait for installation to complete (~3-5 GB download)

**Option B: Visual Studio Community (Full IDE - Optional)**

If you prefer a full IDE:
1. Download Visual Studio Community from [visualstudio.microsoft.com](https://visualstudio.microsoft.com/vs/community/)
2. During installation, select **"Desktop development with C++"** workload
3. Complete installation

**Verify installation**:
```powershell
# Open "x64 Native Tools Command Prompt for VS 2022" from Start Menu
# Then verify:
cl
```

---

## Building the Extension

### Step 1: Clone the Repository

Open **PowerShell** or **Command Prompt**:

```powershell
# Navigate to your desired directory
cd C:\Users\YourUsername\Desktop

# Clone the repository
git clone https://github.com/Srinivasa-Bhargava-deel/Personal.git
cd Personal\vscode-dataflow-analyzer

# Or if you have a different repository URL:
# git clone <your-repository-url>
# cd vscode-dataflow-analyzer
```

**Verify repository structure**:
```powershell
dir
# Should see: src/, cpp-tools/, package.json, tsconfig.json, etc.
```

### Step 2: Install Node.js Dependencies

```powershell
# Ensure you're in the project root directory
cd C:\Users\YourUsername\Desktop\Personal\vscode-dataflow-analyzer

# Install npm dependencies
npm install

# This will install:
# - TypeScript 5.0+
# - @types/vscode, @types/node
# - ESLint and TypeScript ESLint plugins
# - All other devDependencies from package.json
```

**Expected output**: Should complete without errors. May take 1-2 minutes.

**Verify installation**:
```powershell
npm list --depth=0
# Should show all dependencies installed
```

### Step 3: Build CFG Exporter (C++ Tool)

This is the most critical step. The `cfg-exporter` tool is required for CFG generation.

#### Method 1: Using PowerShell/Command Prompt (Recommended)

```powershell
# Navigate to cfg-exporter directory
cd cpp-tools\cfg-exporter

# Create build directory (if it doesn't exist)
# If build directory already exists, you can either:
# Option A: Remove and recreate (clean build)
Remove-Item -Recurse -Force build -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path build -Force | Out-Null

# Option B: Just use existing directory (if you want to keep previous build)
# if (!(Test-Path build)) { New-Item -ItemType Directory -Path build | Out-Null }

cd build

# Configure with CMake
# For Visual Studio 2022:
cmake .. -G "Visual Studio 17 2022" -A x64

# Alternative if above doesn't work:
# cmake .. -G "Visual Studio 16 2019" -A x64

# Build Release configuration
cmake --build . --config Release

# Verify binary was created
dir Release\cfg-exporter.exe
# Should show: cfg-exporter.exe in Release\ directory
```

**Expected output**:
- CMake should find LLVM/Clang libraries
- Build should complete successfully
- Binary should be at: `cpp-tools\cfg-exporter\build\Release\cfg-exporter.exe`

#### Method 2: Using Visual Studio Developer Command Prompt

1. Open **"x64 Native Tools Command Prompt for VS 2022"** from Start Menu
2. Navigate to project:
   ```cmd
   cd C:\Users\YourUsername\Desktop\Personal\vscode-dataflow-analyzer\cpp-tools\cfg-exporter
   ```
3. Build:
   ```cmd
   REM Remove existing build directory if it exists (optional - for clean build)
   if exist build rmdir /s /q build
   
   REM Create build directory
   mkdir build
   cd build
   cmake .. -G "Visual Studio 17 2022" -A x64
   cmake --build . --config Release
   ```

#### Troubleshooting CMake Build

**Issue: "a subdirectory or a file build already exists"**

**Symptoms**: Error when trying to create build directory

**Solutions**:
1. **Remove existing build directory** (recommended for clean build):
   ```powershell
   Remove-Item -Recurse -Force build
   New-Item -ItemType Directory -Path build
   ```
2. **Or use existing directory** (if you want to keep previous configuration):
   ```powershell
   # Just navigate to existing build directory
   cd build
   # Then run cmake configuration
   ```
3. **In Command Prompt**:
   ```cmd
   rmdir /s /q build
   mkdir build
   ```

**Issue: CMake can't find LLVM**

**Solution 1**: Specify LLVM path explicitly:
```powershell
cmake .. -G "Visual Studio 17 2022" -A x64 -DLLVM_DIR="C:\Program Files\LLVM\lib\cmake\llvm"
```

**Solution 2**: Set environment variable:
```powershell
$env:LLVM_DIR = "C:\Program Files\LLVM\lib\cmake\llvm"
cmake .. -G "Visual Studio 17 2022" -A x64
```

**Issue: "MSBuild not found"**

**Solution**: Ensure Visual Studio Build Tools are installed with "Desktop development with C++" workload.

**Issue: "clang/LLVM libraries not found"**

**Solution**: Verify LLVM installation:
```powershell
# Check if LLVM is installed
dir "C:\Program Files\LLVM"

# Check if CMake can find it
cmake --find-package -DNAME=LLVM -DCOMPILER_ID=GNU -DLANGUAGE=CXX -DMODE=COMPILE
```

### Step 4: Compile TypeScript Extension

```powershell
# Return to project root
cd C:\Users\YourUsername\Desktop\Personal\vscode-dataflow-analyzer

# Compile TypeScript to JavaScript
npm run compile

# Expected output:
# - TypeScript compilation completes
# - JavaScript files generated in out/ directory
```

**Verify compilation**:
```powershell
dir out\extension.js
# Should exist and have recent timestamp
```

**Expected output structure**:
```
out/
├── extension.js
├── analyzer/
│   ├── DataflowAnalyzer.js
│   ├── TaintAnalyzer.js
│   └── ... (other analyzer files)
├── visualizer/
│   └── CFGVisualizer.js
└── ... (other compiled files)
```

---

## Running the Extension

### Step 1: Open Project in VS Code

```powershell
# From project root directory
code .
```

Or manually:
1. Open VS Code
2. File → Open Folder
3. Select `vscode-dataflow-analyzer` directory

### Step 2: Launch Extension Development Host

**Method 1: Using F5 (Recommended)**
1. Press `F5` in VS Code
2. A new VS Code window will open: **"Extension Development Host"**
3. This is where your extension runs

**Method 2: Using Command Palette**
1. Press `Ctrl+Shift+P`
2. Type: "Debug: Start Debugging"
3. Select it
4. Extension Development Host will open

**Method 3: Using Debug Panel**
1. Click "Run and Debug" icon in sidebar (or press `Ctrl+Shift+D`)
2. Select "Run Extension" from dropdown
3. Click green play button

### Step 3: Test the Extension

In the **Extension Development Host** window:

1. **Open a C++ workspace**:
   - File → Open Folder
   - Select a folder containing C++ files (`.cpp`, `.c`, `.h`, `.hpp`)

2. **Run Analysis**:
   - Press `Ctrl+Shift+P`
   - Type: **"Analyze Workspace"**
   - Select: `Dataflow Analyzer: Analyze Workspace`

3. **View CFG Visualization**:
   - Press `Ctrl+Shift+P`
   - Type: **"Show Control Flow Graph"**
   - Select: `Dataflow Analyzer: Show Control Flow Graph`
   - CFG visualizer panel should open

4. **Verify Analysis**:
   - Check Output panel for analysis logs
   - CFG visualization should show function graphs
   - Tabs should be available: CFG, Call Graph, Taint Analysis, etc.

---

## Verification

### Verify All Components

Run these commands in PowerShell to verify everything is set up correctly:

```powershell
# 1. Verify Node.js
node --version        # Should be v20.x.x or higher
npm --version         # Should be 10.x.x or higher

# 2. Verify CMake
cmake --version       # Should be 3.16.0 or higher

# 3. Verify Clang/LLVM
clang --version       # Should be 21.1.5 or higher
clang++ --version     # Should be 21.1.5 or higher

# 4. Verify cfg-exporter binary exists
dir cpp-tools\cfg-exporter\build\Release\cfg-exporter.exe
# Should show the file exists

# 5. Test cfg-exporter
cpp-tools\cfg-exporter\build\Release\cfg-exporter.exe --help
# Should show usage information

# 6. Verify TypeScript compilation
dir out\extension.js
# Should show the compiled file exists

# 7. Verify VS Code version
code --version
# Should be 1.80.0 or higher
```

### Test with Sample C++ File

Create a test file:

```powershell
# Create test file
@"
#include <stdio.h>

int main() {
    int x = 10;
    if (x > 5) {
        printf("Hello\n");
    }
    return 0;
}
"@ | Out-File -FilePath test.cpp -Encoding utf8

# Test cfg-exporter
cpp-tools\cfg-exporter\build\Release\cfg-exporter.exe test.cpp -- -std=c++17
# Should output JSON CFG data
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: "cfg-exporter binary not found"

**Symptoms**: Extension fails with "cfg-exporter not found" error

**Solutions**:
1. Verify binary exists:
   ```powershell
   dir cpp-tools\cfg-exporter\build\Release\cfg-exporter.exe
   ```
2. If missing, rebuild cfg-exporter (see Step 3 in Building section)
3. **Windows-specific**: The code automatically detects Windows and looks for `cfg-exporter.exe` in `build\Release\` directory. If you're using a different build configuration, ensure the binary is in one of these locations:
   - `cpp-tools\cfg-exporter\build\Release\cfg-exporter.exe` (Visual Studio Release build - recommended)
   - `cpp-tools\cfg-exporter\build\cfg-exporter.exe` (alternative location)
4. **Note**: The extension code (v1.9.1+) automatically handles Windows paths and `.exe` extension detection

#### Issue 2: "CMake can't find LLVM"

**Symptoms**: CMake configuration fails with "Could not find LLVM"

**Solutions**:
1. Verify LLVM installation:
   ```powershell
   dir "C:\Program Files\LLVM"
   ```
2. Specify LLVM path explicitly:
   ```powershell
   cmake .. -G "Visual Studio 17 2022" -A x64 -DLLVM_DIR="C:\Program Files\LLVM\lib\cmake\llvm"
   ```
3. Check LLVM_DIR environment variable:
   ```powershell
   $env:LLVM_DIR
   ```

#### Issue 3: "clang command not found"

**Symptoms**: `clang --version` fails

**Solutions**:
1. Verify LLVM is installed:
   ```powershell
   dir "C:\Program Files\LLVM\bin\clang.exe"
   ```
2. Add to PATH manually:
   - Win + R → `sysdm.cpl` → Advanced → Environment Variables
   - Edit "Path" → Add: `C:\Program Files\LLVM\bin`
   - Restart PowerShell
3. Verify PATH:
   ```powershell
   $env:PATH -split ';' | Select-String "LLVM"
   ```

#### Issue 4: "MSBuild not found"

**Symptoms**: CMake build fails with MSBuild errors

**Solutions**:
1. Install Visual Studio Build Tools with "Desktop development with C++" workload
2. Use Visual Studio Developer Command Prompt instead of regular PowerShell
3. Verify MSBuild:
   ```powershell
   & "C:\Program Files\Microsoft Visual Studio\2022\BuildTools\MSBuild\Current\Bin\MSBuild.exe" -version
   ```

#### Issue 5: "TypeScript compilation errors"

**Symptoms**: `npm run compile` fails

**Solutions**:
1. Clear node_modules and reinstall:
   ```powershell
   Remove-Item -Recurse -Force node_modules
   Remove-Item package-lock.json
   npm install
   npm run compile
   ```
2. Check TypeScript version:
   ```powershell
   npx tsc --version
   # Should be 5.0.0 or higher
   ```
3. Update TypeScript:
   ```powershell
   npm install --save-dev typescript@latest
   npm run compile
   ```

#### Issue 6: "Extension doesn't activate"

**Symptoms**: Extension doesn't work in Extension Development Host

**Solutions**:
1. Check VS Code version (must be 1.80.0+):
   ```powershell
   code --version
   ```
2. Check Developer Console for errors:
   - In Extension Development Host: Help → Toggle Developer Tools
   - Check Console tab for errors
3. Check Output panel:
   - View → Output
   - Select "Log (Extension Host)" from dropdown
   - Look for error messages

#### Issue 7: "Path too long" errors

**Symptoms**: Windows path length limitations cause build failures

**Solutions**:
1. Enable long path support (Windows 10 1607+):
   ```powershell
   # Run as Administrator
   New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
   ```
2. Restart computer
3. Or clone repository to shorter path (e.g., `C:\dev\vscode-dataflow-analyzer`)

#### Issue 8: "Permission denied" errors

**Symptoms**: Cannot create files or directories

**Solutions**:
1. Run PowerShell as Administrator
2. Check folder permissions
3. Ensure antivirus isn't blocking file creation

---

## Development Workflow

### Watch Mode (Auto-compile on changes)

```powershell
# In one terminal, run watch mode
npm run watch

# Keep this running while developing
# TypeScript will auto-compile on file changes
```

### Manual Compilation

```powershell
# Compile once
npm run compile

# Lint code
npm run lint

# Run tests (if configured)
npm test
```

### Debugging

1. **Set breakpoints** in TypeScript files (`.ts` files in `src/`)
2. **Press F5** to launch Extension Development Host
3. **Breakpoints will hit** when code executes
4. **Use VS Code debugger**:
   - Variables panel: View variable values
   - Call stack: See execution stack
   - Debug console: Evaluate expressions

### Building for Distribution

```powershell
# Prepare for publishing
npm run vscode:prepublish

# This runs:
# - npm run compile
# - Creates production build
# - Prepares extension package
```

---

## Quick Reference

### Essential Commands

```powershell
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode (auto-compile)
npm run watch

# Lint code
npm run lint

# Build cfg-exporter
cd cpp-tools\cfg-exporter
Remove-Item -Recurse -Force build -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path build -Force | Out-Null
cd build
cmake .. -G "Visual Studio 17 2022" -A x64
cmake --build . --config Release

# Test cfg-exporter
cpp-tools\cfg-exporter\build\Release\cfg-exporter.exe --help

# Open in VS Code
code .
```

### File Locations

| Component | Location |
|-----------|----------|
| Extension source | `src/` |
| Compiled JavaScript | `out/` |
| CFG exporter source | `cpp-tools/cfg-exporter/cfg-exporter.cpp` |
| CFG exporter binary | `cpp-tools/cfg-exporter/build/Release/cfg-exporter.exe` |
| Configuration | `package.json`, `tsconfig.json` |
| State files | `.vscode/dataflow-state.json` |

### Environment Variables (if needed)

```powershell
# Set LLVM directory
$env:LLVM_DIR = "C:\Program Files\LLVM\lib\cmake\llvm"

# Add LLVM to PATH (if not already added)
$env:PATH += ";C:\Program Files\LLVM\bin"
```

---

## Additional Resources

- **VS Code Extension API**: [code.visualstudio.com/api](https://code.visualstudio.com/api)
- **TypeScript Documentation**: [typescriptlang.org/docs](https://www.typescriptlang.org/docs/)
- **CMake Documentation**: [cmake.org/documentation](https://cmake.org/documentation/)
- **LLVM Documentation**: [llvm.org/docs](https://llvm.org/docs/)
- **Clang Documentation**: [clang.llvm.org/docs](https://clang.llvm.org/docs/)

---

## Support

If you encounter issues not covered in this guide:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review VS Code Developer Console for errors
3. Check GitHub Issues (if applicable)
4. Verify all prerequisites are installed correctly

---

## Version Information

- **Extension Version**: 1.9.1
- **Last Updated**: December 2024
- **Tested on**: Windows 10/11 (64-bit)

---

## Summary Checklist

Use this checklist to ensure everything is set up correctly:

- [ ] Git installed and verified (`git --version`)
- [ ] Node.js 20.x LTS installed and verified (`node --version`, `npm --version`)
- [ ] CMake 3.16+ installed and added to PATH (`cmake --version`)
- [ ] LLVM/Clang 21.1.5+ installed and added to PATH (`clang --version`)
- [ ] Visual Studio Build Tools installed with "Desktop development with C++" workload
- [ ] Repository cloned successfully
- [ ] Node.js dependencies installed (`npm install`)
- [ ] CFG exporter built successfully (`cfg-exporter.exe` exists in `build\Release\`)
- [ ] TypeScript compiled successfully (`out\extension.js` exists)
- [ ] Extension runs in Extension Development Host (F5)
- [ ] Analysis works on a test C++ file

---

## Key Windows-Specific Notes

1. **Binary Location**: On Windows, Visual Studio builds place binaries in `build\Release\` subdirectory, not directly in `build\`
2. **File Extension**: Windows executables require `.exe` extension (handled automatically in v1.9.1+)
3. **Path Separators**: Use backslashes (`\`) in PowerShell/CMD, forward slashes (`/`) work in Git Bash
4. **PATH Updates**: Restart PowerShell/Command Prompt after installing software to pick up PATH changes
5. **Administrator Rights**: Some installations may require Administrator privileges
6. **Long Paths**: Windows 10 1607+ supports long paths (enable via Group Policy if needed)

---

**Happy Coding! 🚀**

