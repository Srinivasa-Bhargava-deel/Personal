# Build and Run Launch Guide

Complete platform-specific instructions for building and running the C++ Dataflow Analyzer extension on macOS, Windows, and Linux.

## Table of Contents

1. [macOS Setup](#macos-setup)
2. [Linux Setup](#linux-setup)
3. [Windows Setup](#windows-setup)
4. [Verification](#verification)
5. [Troubleshooting](#troubleshooting)

---

## macOS Setup

### Step 1: Install Homebrew (if not already installed)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Verify installation:
```bash
brew --version
# Output: Homebrew 4.x.x
```

### Step 2: Install Required Tools

```bash
# Install Node.js (includes npm)
brew install node

# Install CMake
brew install cmake

# Install LLVM/Clang (21.1.5)
brew install llvm

# Verify installations
node --version      # Should show v20.x.x or higher
npm --version       # Should show 10.x.x or higher
cmake --version     # Should show 3.16 or higher
clang --version     # Should show Apple clang 21.1.5 or Homebrew LLVM 21.1.5
```

**Important for Homebrew LLVM**: Add to your shell profile (`.zshrc` or `.bash_profile`):

```bash
# Add to ~/.zshrc or ~/.bash_profile
export PATH="/opt/homebrew/opt/llvm/bin:$PATH"
export LDFLAGS="-L/opt/homebrew/opt/llvm/lib"
export CPPFLAGS="-I/opt/homebrew/opt/llvm/include"
```

Apply changes:
```bash
source ~/.zshrc  # or ~/.bash_profile
```

### Step 3: Clone and Navigate to Project

```bash
cd /path/to/vscode-dataflow-analyzer
```

### Step 4: Build CFG Exporter

```bash
cd cpp-tools/cfg-exporter
mkdir -p build && cd build

# Configure with CMake
cmake ..

# Build the exporter
cmake --build .

# Verify binary exists
ls -la cfg-exporter
# Output: -rwxr-xr-x cfg-exporter
```

If CMake cannot find LLVM, run:
```bash
cmake .. -DLLVM_DIR=/opt/homebrew/opt/llvm/lib/cmake/llvm
```

### Step 5: Build Extension

```bash
cd /path/to/vscode-dataflow-analyzer

# Install npm dependencies
npm install

# Compile TypeScript
npm run compile

# Verify compilation succeeded
ls -la out/extension.js
```

### Step 6: Run Extension

```bash
# Open VSCode with project
code .
```

In VSCode:
1. Press `F5` to launch Extension Development Host
2. In the new VSCode window, open a folder with C++ files
3. Press `Ctrl+Shift+P` (or `Cmd+Shift+P`)
4. Type "Analyze Workspace" and press Enter
5. Wait for analysis
6. Type "Show Control Flow Graph" to see results

### Troubleshooting macOS

**Issue**: `cmake: command not found`
```bash
brew install cmake
# Add to PATH if needed
export PATH="/opt/homebrew/bin:$PATH"
```

**Issue**: `clang: command not found`
```bash
# Use Xcode Command Line Tools
xcode-select --install

# OR use Homebrew LLVM
brew install llvm
export PATH="/opt/homebrew/opt/llvm/bin:$PATH"
```

**Issue**: CMake cannot find LLVM
```bash
cd cpp-tools/cfg-exporter/build
cmake .. -DLLVM_DIR=/opt/homebrew/opt/llvm/lib/cmake/llvm
cmake --build .
```

**Issue**: Extension won't activate
```bash
# Check Node version
node --version  # Must be 20.0.0 or higher

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm run compile
```

---

## Linux Setup

### Step 1: Update Package Manager

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get upgrade

# RedHat/CentOS/Fedora
sudo yum update
```

### Step 2: Install Required Tools

```bash
# Ubuntu/Debian
sudo apt-get install -y \
    nodejs npm \
    cmake \
    clang clang++ llvm llvm-dev \
    build-essential \
    git

# RedHat/CentOS/Fedora
sudo yum install -y \
    nodejs npm \
    cmake \
    clang clang-tools-extra llvm llvm-devel \
    gcc gcc-c++ make \
    git

# Verify installations
node --version      # Should show v20.x.x or higher
npm --version       # Should show 10.x.x or higher
cmake --version     # Should show 3.16 or higher
clang --version     # Should show appropriate version
```

### Step 3: Clone and Navigate to Project

```bash
cd /path/to/vscode-dataflow-analyzer
```

### Step 4: Build CFG Exporter

```bash
cd cpp-tools/cfg-exporter
mkdir -p build && cd build

# Configure with CMake
cmake ..

# Build the exporter
cmake --build .

# Verify binary exists
ls -la cfg-exporter
# Output: -rwxr-xr-x cfg-exporter
```

If CMake cannot find LLVM libraries:
```bash
cmake .. -DLLVM_DIR=/usr/lib/cmake/llvm  # or appropriate path
```

### Step 5: Build Extension

```bash
cd /path/to/vscode-dataflow-analyzer

# Install npm dependencies
npm install

# Compile TypeScript
npm run compile

# Verify compilation succeeded
ls -la out/extension.js
```

### Step 6: Install VSCode

```bash
# Ubuntu/Debian
wget https://code.visualstudio.com/sha/download?build=stable&os=linux-deb -O vscode.deb
sudo apt-get install -y ./vscode.deb

# Or install via snap
sudo snap install code --classic

# RedHat/CentOS/Fedora
sudo rpm --import https://packages.microsoft.com/keys/microsoft.asc
sudo dnf install -y code
```

### Step 7: Run Extension

```bash
# Open VSCode with project
code .
```

In VSCode:
1. Press `F5` to launch Extension Development Host
2. In the new VSCode window, open a folder with C++ files
3. Press `Ctrl+Shift+P`
4. Type "Analyze Workspace" and press Enter
5. Wait for analysis
6. Type "Show Control Flow Graph" to see results

### Troubleshooting Linux

**Issue**: `apt-get: command not found`
```bash
# Use yum for RedHat/CentOS/Fedora instead
sudo yum install clang cmake nodejs
```

**Issue**: CMake cannot find LLVM
```bash
# Find LLVM cmake directory
find /usr -name "LLVMConfig.cmake" 2>/dev/null
# Use the found path:
cmake .. -DLLVM_DIR=/path/to/cmake
```

**Issue**: Permission denied on cfg-exporter
```bash
chmod +x cpp-tools/cfg-exporter/build/cfg-exporter
```

**Issue**: Node/npm not found
```bash
# Install via NVM (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
```

---

## Windows Setup

### Step 1: Install Required Tools

#### Node.js and npm

1. Download from [nodejs.org](https://nodejs.org/) (LTS version, 20.x or higher)
2. Run the installer
3. Accept default settings
4. Restart your terminal/PowerShell
5. Verify:
   ```powershell
   node --version    # Should show v20.x.x
   npm --version     # Should show 10.x.x
   ```

#### CMake

1. Download from [cmake.org](https://cmake.org/download/)
2. Choose "Windows x64 Installer"
3. Run installer
4. Select "Add CMake to system PATH" during installation
5. Restart terminal
6. Verify:
   ```powershell
   cmake --version   # Should show 3.16 or higher
   ```

#### LLVM/Clang

1. Download from [llvm.org](https://github.com/llvm/llvm-project/releases)
2. Choose "LLVM-21.1.5-win64.exe" (or latest stable)
3. Run installer
4. Select "Add LLVM to the system PATH"
5. Restart PowerShell
6. Verify:
   ```powershell
   clang --version   # Should show LLVM 21.1.5
   ```

#### Visual Studio Build Tools (Required for compilation)

1. Download from [visualstudio.microsoft.com](https://visualstudio.microsoft.com/downloads/)
2. Choose "Visual Studio Build Tools"
3. In installer, select:
   - "Desktop development with C++"
   - "CMake tools for Windows"
4. Complete installation
5. Restart PowerShell

#### Git (Optional but recommended)

1. Download from [git-scm.com](https://git-scm.com/)
2. Run installer with default settings
3. Restart PowerShell

### Step 2: Open PowerShell as Administrator

```powershell
# Press Windows key, type "PowerShell"
# Right-click, select "Run as administrator"
```

### Step 3: Clone/Navigate to Project

```powershell
cd C:\path\to\vscode-dataflow-analyzer
```

### Step 4: Build CFG Exporter

```powershell
cd cpp-tools\cfg-exporter
mkdir build -Force
cd build

# Configure with CMake
cmake ..

# Build the exporter
cmake --build . --config Release

# Verify executable exists
dir cfg-exporter.exe
# Should list: cfg-exporter.exe
```

If CMake cannot find LLVM:
```powershell
cmake .. -DLLVM_DIR="C:\Program Files\LLVM\lib\cmake\llvm"
```

### Step 5: Build Extension

```powershell
cd C:\path\to\vscode-dataflow-analyzer

# Install npm dependencies
npm install

# Compile TypeScript
npm run compile

# Verify compilation succeeded
dir out\extension.js
```

### Step 6: Run Extension

```powershell
# Open VSCode with project
code .
```

In VSCode:
1. Press `F5` to launch Extension Development Host
2. In the new VSCode window, open a folder with C++ files
3. Press `Ctrl+Shift+P`
4. Type "Analyze Workspace" and press Enter
5. Wait for analysis
6. Type "Show Control Flow Graph" to see results

### Troubleshooting Windows

**Issue**: `cmake: command not found`
1. Add CMake to PATH:
   - Windows key → "Edit environment variables"
   - Add `C:\Program Files\CMake\bin` to PATH
   - Restart PowerShell

**Issue**: `clang: command not found`
1. Add LLVM to PATH:
   - Windows key → "Edit environment variables"
   - Add `C:\Program Files\LLVM\bin` to PATH
   - Restart PowerShell

**Issue**: CMake cannot find compiler
```powershell
# Specify Visual Studio generator
cd cpp-tools\cfg-exporter\build
cmake .. -G "Visual Studio 17 2022"
cmake --build . --config Release
```

**Issue**: "Long path" errors during build
```powershell
# Enable long path support
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -Force
```

**Issue**: Node/npm installation issues
1. Completely uninstall Node.js
2. Delete `C:\Program Files\nodejs` if it exists
3. Delete `C:\Users\[username]\AppData\Roaming\npm` if it exists
4. Restart computer
5. Reinstall Node.js

---

## Verification

After building, verify everything works:

### Step 1: Test CFG Exporter

```bash
# macOS/Linux
./cpp-tools/cfg-exporter/build/cfg-exporter --version

# Windows
.\cpp-tools\cfg-exporter\build\cfg-exporter.exe --version
```

Should show version information without errors.

### Step 2: Test TypeScript Compilation

```bash
npm run compile
# Should complete without errors
ls out/extension.js  # or dir out\extension.js on Windows
```

### Step 3: Test Extension

1. Open VSCode: `code .`
2. Press `F5`
3. In Extension Development Host:
   - Open folder with C++ files
   - Press `Ctrl+Shift+P` → "Analyze Workspace"
   - Wait for completion
   - Check Output console for analysis logs

### Step 4: Create Test File

```cpp
// test.cpp
#include <stdio.h>

int main() {
    int x = 5;
    printf("%d\n", x);
    return 0;
}
```

1. Open this file in Extension Development Host
2. Run "Analyze Workspace"
3. Run "Show Control Flow Graph"
4. Should see CFG visualization

---

## Troubleshooting

### General Issues

**"Clang is required but not found"**
- macOS: `brew install llvm && export PATH="/opt/homebrew/opt/llvm/bin:$PATH"`
- Linux: `sudo apt-get install clang` or `sudo yum install clang`
- Windows: Install LLVM from [llvm.org](https://llvm.org/) and add to PATH

**"CMake not found"**
- macOS: `brew install cmake`
- Linux: `sudo apt-get install cmake` or `sudo yum install cmake`
- Windows: Download and install from [cmake.org](https://cmake.org/)

**"Node version too old"**
```bash
node --version
# If < 20.0.0, update:
# macOS: brew upgrade node
# Linux: nvm install 20 (using nvm) or apt-get update && apt-get install nodejs
# Windows: Download from nodejs.org
```

**Extension won't compile**
```bash
# Clean and rebuild
rm -rf out/ node_modules package-lock.json  # or del /s on Windows
npm install
npm run compile
```

**CFG Exporter won't build**
1. Verify CMake: `cmake --version` (should be 3.16+)
2. Verify Clang: `clang --version` (should be 21.1.5+)
3. Clean build:
   ```bash
   rm -rf cpp-tools/cfg-exporter/build
   mkdir cpp-tools/cfg-exporter/build
   cd cpp-tools/cfg-exporter/build
   cmake ..
   cmake --build .
   ```

**Analysis produces no results**
1. Check that C++ files use .cpp, .c, .hpp, or .h extensions
2. Ensure file is valid C++ code
3. Check Extension Output console for errors
4. Try simpler test file first

### Platform-Specific Resources

- **macOS**: [Homebrew Docs](https://brew.sh/)
- **Linux**: [LLVM Docs](https://llvm.org/docs/)
- **Windows**: [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/)

---

## Next Steps

After successfully building and running:

1. **Explore Features**: Try analyzing different C++ files
2. **Configure Settings**: Customize analysis options in VSCode settings
3. **Review Results**: Check CFG visualizations and vulnerability reports
4. **Read Documentation**: See [README.md](README.md) for full feature documentation

For issues or questions, check the troubleshooting section above or review logs in the Extension Output console.

---

**Happy analyzing! 🔍**

