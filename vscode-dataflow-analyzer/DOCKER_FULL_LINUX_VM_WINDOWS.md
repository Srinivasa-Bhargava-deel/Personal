# Fully Dockerized Build and Run - Linux Docker VM on Windows AMD x64

Complete guide for building and running the VS Code Dataflow Analyzer extension entirely in Docker, using Linux containers running on a Windows AMD x64 64-bit machine.

## 🎯 Overview

This guide covers:
- ✅ Running Docker Desktop on Windows AMD x64
- ✅ Building everything in Linux Docker containers
- ✅ Running the extension in Docker
- ✅ Complete end-to-end workflow

**Architecture:**
```
Windows AMD x64 PC
  └── Docker Desktop (WSL2 backend)
      └── Linux Docker VM (Ubuntu-based containers)
          └── VS Code Dataflow Analyzer Extension
```

## 📋 Prerequisites

### System Requirements

- **Windows 10/11** (64-bit) on AMD x64 processor
- **8GB RAM minimum** (16GB recommended)
- **20GB free disk space**
- **Virtualization enabled** (AMD-V/SVM in BIOS)

### Required Software (ONLY These Need to be Installed on Windows)

1. **Docker Desktop for Windows** (AMD64 version)
   - Download: https://www.docker.com/products/docker-desktop/
   - Version: Latest stable
   - Architecture: AMD64/x64 (auto-detected)

2. **WSL 2** (Windows Subsystem for Linux)
   - Automatically installed with Docker Desktop
   - Or install manually: `wsl --install`

3. **Git for Windows**
   - Download: https://git-scm.com/download/win
   - Choose: 64-bit version

4. **VS Code** (for installing and using the extension)
   - Download: https://code.visualstudio.com/
   - Version: 1.80.0 or higher
   - **Note**: VS Code Extension Development Host is included with VS Code

### ✅ What Docker Handles Automatically (NO Installation Needed!)

**The Docker container automatically installs and includes:**

- ✅ **LLVM/Clang 17** - Installed automatically in Docker container
- ✅ **CMake** - Installed automatically in Docker container
- ✅ **Build Tools** (build-essential, g++, make) - Installed automatically
- ✅ **Node.js 20** - Included in Node.js base image
- ✅ **TypeScript** - Installed via npm in Docker container
- ✅ **npm dependencies** - Installed automatically during build
- ✅ **VS Code Extension Manager (@vscode/vsce)** - Installed automatically when packaging (uses helper script)
- ✅ **All development tools** - Everything needed for building

**You do NOT need to install these on Windows:**
- ❌ LLVM/Clang
- ❌ CMake
- ❌ Node.js
- ❌ TypeScript
- ❌ Visual Studio Build Tools
- ❌ Any C++ compilers or build tools
- ❌ npm or yarn (except what comes with Node.js if you install it separately)

**What you DO need on Windows:**
- ✅ Docker Desktop (handles everything else)
- ✅ VS Code (to install and use the .vsix extension)
- ✅ Git (to clone the repository)

## 🚀 Step 1: Install Docker Desktop on Windows AMD x64

### 1.1 Verify System Architecture

```powershell
# Open PowerShell and verify AMD x64 architecture
systeminfo | findstr /C:"System Type"
# Expected: x64-based PC

wmic cpu get name
# Should show your AMD processor (e.g., AMD Ryzen 7 5800X)
```

### 1.2 Enable Virtualization (If Not Enabled)

**For AMD Processors:**
1. Restart computer → Enter BIOS/UEFI (F2, F10, or Del)
2. Navigate to: **Advanced** → **CPU Configuration** → **SVM Mode**
3. Set to: **Enabled**
4. Save and exit

**Verify virtualization:**
```powershell
systeminfo | findstr /C:"Hyper-V"
# Should show: "A hypervisor has been detected"
```

### 1.3 Install WSL 2

```powershell
# Run PowerShell as Administrator
wsl --install

# Restart computer when prompted
# After restart, verify WSL 2:
wsl --version
# Should show: WSL version 2.x.x
```

### 1.4 Install Docker Desktop

1. **Download Docker Desktop**
   - Go to: https://www.docker.com/products/docker-desktop/
   - Click **"Download for Windows"**
   - File: `Docker Desktop Installer.exe` (AMD64 version)

2. **Run Installer**
   - Right-click installer → **Run as Administrator**
   - ✅ Check **"Use WSL 2 instead of Hyper-V"** (recommended)
   - ✅ Check **"Add shortcut to desktop"**
   - Click **"OK"** to install

3. **Restart Computer**
   - Restart when prompted
   - Docker Desktop will start automatically after restart

### 1.5 Configure Docker Desktop

1. **Open Docker Desktop**
   - Click Docker Desktop icon in system tray
   - Or search "Docker Desktop" in Start Menu

2. **Settings Configuration**
   - Click **Settings** (gear icon)
   
   **General Tab:**
   - ✅ **"Use the WSL 2 based engine"** (checked)
   - ✅ **"Start Docker Desktop when you log in"** (optional)
   
   **Resources Tab:**
   - **Memory**: Set to **8GB** or higher (if you have 16GB+ RAM)
   - **CPUs**: Use all available cores (default)
   - **Disk image size**: 64GB (default)
   
   **WSL Integration Tab:**
   - ✅ Enable integration with your default WSL distro
   - ✅ Enable integration with Ubuntu (if installed)

3. **File Sharing**
   - **Resources** → **File Sharing**
   - Add your project directory (e.g., `C:\Users\YourName\Desktop`)
   - Click **"Apply & Restart"**

### 1.6 Verify Docker Installation

```powershell
# Check Docker version
docker --version
# Expected: Docker version 24.x.x or higher

# Check Docker Compose version
docker-compose --version
# Expected: Docker Compose version v2.x.x or higher

# Verify Docker is running
docker ps
# Should show empty list or running containers (no errors)

# Test Docker with hello-world
docker run hello-world
# Should download and run successfully

# Check platform
docker version
# Should show: OS/Arch: linux/amd64 (when using Linux containers)
```

## 🏗️ Step 2: Clone Repository

```powershell
# Navigate to your desired directory
cd C:\Users\YourName\Desktop

# Clone repository
git clone https://github.com/Srinivasa-Bhargava-deel/Personal.git
cd Personal\vscode-dataflow-analyzer

# Or if you have a different repository URL:
# git clone <your-repository-url>
# cd vscode-dataflow-analyzer
```

## 🔨 Step 3: Build Extension in Docker (Linux Container)

**Important**: This step builds everything inside Docker. The Docker container automatically:
- ✅ Installs LLVM/Clang 17
- ✅ Installs CMake
- ✅ Installs all build tools
- ✅ Installs Node.js and TypeScript
- ✅ Builds the C++ cfg-exporter binary
- ✅ Compiles the TypeScript extension

**You don't need to install ANY of these on Windows!**

### 3.1 Build Using PowerShell Script (Recommended)

```powershell
# Navigate to project root
cd C:\Users\YourName\Desktop\Personal\vscode-dataflow-analyzer

# Build Docker image (Linux container)
.\build-docker.ps1 build

# This will automatically:
# - Install LLVM/Clang 17 in Docker container
# - Install CMake in Docker container
# - Install Node.js 20 and TypeScript in Docker container
# - Build C++ cfg-exporter binary in Linux container
# - Compile TypeScript extension
# - Create Docker image: vscode-dataflow-analyzer:latest
```

**Expected Output:**
```
Building Docker image for Linux AMD x64 platform...
Using Dockerfile: Dockerfile
Platform: linux/amd64 (compatible with AMD x64 and Intel x64)
[+] Building ... 
[+] Building ... done
Build completed successfully!
```

### 3.2 Build Using Docker Directly

```powershell
# Build with explicit platform specification
docker build --platform linux/amd64 -t vscode-dataflow-analyzer:latest .

# Or use the default Dockerfile
docker build -t vscode-dataflow-analyzer:latest .
```

### 3.3 Verify Build

```powershell
# List Docker images
docker images | findstr vscode-dataflow-analyzer

# Should show:
# vscode-dataflow-analyzer   latest   <image-id>   <time>   <size>

# Inspect image
docker inspect vscode-dataflow-analyzer:latest | findstr /C:"Architecture"
# Should show: "Architecture": "amd64"
```

## 📦 Step 4: Package Extension (.vsix) in Docker

### 4.1 Package Using PowerShell Script

```powershell
# Package extension as .vsix file
.\build-docker.ps1 package

# This will:
# - Build the extension
# - Install vsce (VS Code Extension Manager)
# - Create .vsix package
# - Output: dist/dataflow-analyzer.vsix
```

### 4.2 Package Using Docker Directly

```powershell
# Ensure dist directory exists
if (-not (Test-Path "dist")) {
    New-Item -ItemType Directory -Path "dist"
}

# Package extension (using helper script that handles prepublish)
docker run --rm `
    --platform linux/amd64 `
    -v "${PWD}/dist:/app/dist" `
    -v "${PWD}/docker-package.sh:/tmp/docker-package.sh:ro" `
    -w /app `
    vscode-dataflow-analyzer:latest `
    sh -c "chmod +x /tmp/docker-package.sh && /tmp/docker-package.sh"

# Verify package created
dir dist\dataflow-analyzer.vsix
```

## 🚀 Step 5: Run Extension in Docker

### 5.1 Development Container (Recommended)

```powershell
# Start development container
.\build-docker.ps1 dev

# Or using docker-compose:
docker-compose up -d dev

# This starts a container with:
# - Source code mounted as volumes
# - Hot-reload capability
# - Persistent state
```

**Access Development Container:**
```powershell
# Execute commands in container
docker-compose exec dev bash

# Inside container, you can:
npm run compile      # Compile TypeScript
npm test            # Run tests
npm run lint        # Lint code

# Exit container
exit
```

### 5.2 Run Interactive Container

```powershell
# Run container interactively
.\build-docker.ps1 run

# Or manually:
docker run -it --rm `
    --platform linux/amd64 `
    -v "${PWD}/src:/app/src" `
    -v "${PWD}/out:/app/out" `
    -v "${PWD}/tests:/app/tests" `
    -w /app `
    vscode-dataflow-analyzer:latest `
    bash
```

### 5.3 Run Production Container

```powershell
# Run production container
docker-compose up production

# Or manually:
docker run --rm `
    --platform linux/amd64 `
    -v "${PWD}/dist:/app/dist" `
    -v "${PWD}/workspace:/app/workspace:ro" `
    vscode-dataflow-analyzer:latest `
    node --version
```

## 🧪 Step 6: Test Extension in Docker

### 6.1 Run Tests

```powershell
# Run tests in Docker container
.\build-docker.ps1 test

# Or manually:
docker run --rm `
    --platform linux/amd64 `
    -v "${PWD}:/workspace" `
    -w /workspace `
    vscode-dataflow-analyzer:latest `
    npm test
```

### 6.2 Test C++ Binary

```powershell
# Test cfg-exporter binary in container
docker run --rm `
    --platform linux/amd64 `
    -v "${PWD}/tests:/app/tests:ro" `
    vscode-dataflow-analyzer:latest `
    sh -c "cpp-tools/cfg-exporter/build/cfg-exporter tests/test_cfg_basic.cpp -- -std=c++17"

# Should output JSON CFG data
```

## 📥 Step 7: Install Extension in VS Code

**Note**: VS Code must be installed on your Windows machine. The Docker container only builds the extension - it doesn't include VS Code itself.

### 7.1 Install VS Code (If Not Already Installed)

1. **Download VS Code**
   - Go to: https://code.visualstudio.com/
   - Download: **"Windows x64 User Installer"** (for AMD x64)
   - Run installer and complete installation

2. **Verify Installation**
   ```powershell
   code --version
   # Should show: 1.80.0 or higher
   ```

### 7.2 Install Extension from .vsix File

1. **Open VS Code** on Windows
2. **Open Extensions** (Ctrl+Shift+X)
3. Click **"..."** (three dots) → **"Install from VSIX..."**
4. Navigate to: `C:\Users\YourName\Desktop\Personal\vscode-dataflow-analyzer\dist\dataflow-analyzer.vsix`
5. Click **"Install"**
6. **Reload VS Code** when prompted

**Note**: VS Code Extension Development Host is included with VS Code - no separate installation needed.

### 7.2 Verify Installation

1. **Open Command Palette** (Ctrl+Shift+P)
2. Type: **"Show Control Flow Graph"**
3. Should see: **"Dataflow Analyzer: Show Control Flow Graph"**
4. Extension is installed and ready!

## 🔄 Complete Workflow Example

### Daily Development Workflow

```powershell
# 1. Start development container
.\build-docker.ps1 dev

# 2. Make code changes in VS Code (on Windows)
# Files are automatically synced via volume mounts

# 3. Compile in container
docker-compose exec dev npm run compile

# 4. Test in container
docker-compose exec dev npm test

# 5. Package when ready
.\build-docker.ps1 package

# 6. Install updated .vsix in VS Code
# Extensions → Install from VSIX → dist/dataflow-analyzer.vsix
```

### Clean Build Workflow

```powershell
# 1. Clean previous builds
.\build-docker.ps1 clean

# 2. Fresh build
.\build-docker.ps1 build

# 3. Package
.\build-docker.ps1 package

# 4. Install in VS Code
```

## 🐛 Troubleshooting

### Issue: "Cannot connect to Docker daemon"

**Solution:**
```powershell
# Start Docker Desktop
# Wait for whale icon in system tray to be steady

# Verify Docker is running
docker ps
```

### Issue: "Platform mismatch" errors

**Solution:**
```powershell
# Explicitly specify platform
docker build --platform linux/amd64 -t vscode-dataflow-analyzer:latest .

# Or use PowerShell script (handles platform automatically)
.\build-docker.ps1 build
```

### Issue: "Volume mount permission denied"

**Solution:**
1. Docker Desktop → Settings → Resources → File Sharing
2. Add your project directory: `C:\Users\YourName\Desktop`
3. Click **"Apply & Restart"**
4. Restart Docker Desktop

### Issue: "WSL 2 installation is incomplete"

**Solution:**
```powershell
# Run as Administrator
wsl --update
wsl --set-default-version 2
wsl --shutdown
# Wait 10 seconds, then start Docker Desktop
```

### Issue: "Out of memory" during build

**Solution:**
1. Docker Desktop → Settings → Resources → Memory
2. Increase to **8GB** or higher
3. Click **"Apply & Restart"**

### Issue: "Slow build performance"

**Solution:**
1. Ensure **WSL 2 backend** is enabled
2. Increase Docker memory allocation
3. Close unnecessary applications
4. Use `--no-cache` flag only when needed:
   ```powershell
   .\build-docker.ps1 build -NoCache
   ```

## 📊 Docker Container Management

### View Running Containers

```powershell
# List running containers
docker ps

# List all containers (including stopped)
docker ps -a

# View container logs
docker-compose logs dev
```

### Stop Containers

```powershell
# Stop development container
docker-compose stop dev

# Stop all containers
docker-compose down

# Stop specific container
docker stop <container-id>
```

### Remove Containers and Images

```powershell
# Clean up everything
.\build-docker.ps1 clean

# Or manually:
docker-compose down
docker rmi vscode-dataflow-analyzer:latest
docker system prune -f
```

## 🔍 Verification Checklist

After completing all steps, verify:

```powershell
# 1. Docker is running
docker ps
# ✅ Should show containers or empty list (no errors)

# 2. Image exists
docker images | findstr vscode-dataflow-analyzer
# ✅ Should show image

# 3. Extension package exists
dir dist\dataflow-analyzer.vsix
# ✅ Should exist

# 4. Container can run
docker run --rm vscode-dataflow-analyzer:latest node --version
# ✅ Should show Node.js version

# 5. Extension installed in VS Code
# ✅ Open VS Code → Extensions → Should see "C++ Dataflow Analyzer"
```

## 📚 Quick Reference Commands

```powershell
# Build
.\build-docker.ps1 build

# Run development container
.\build-docker.ps1 dev

# Package extension
.\build-docker.ps1 package

# Run tests
.\build-docker.ps1 test

# Clean up
.\build-docker.ps1 clean

# View logs
docker-compose logs -f dev

# Execute command in container
docker-compose exec dev npm run compile
```

## 🎯 Summary

**Complete Dockerized Workflow:**

1. ✅ **Install Docker Desktop** on Windows AMD x64
2. ✅ **Configure WSL 2** backend
3. ✅ **Build extension** in Linux Docker container
4. ✅ **Package extension** as .vsix file
5. ✅ **Run tests** in Docker container
6. ✅ **Install .vsix** in VS Code on Windows
7. ✅ **Use extension** in VS Code

**Key Benefits:**
- ✅ **No need to install ANY build tools on Windows** - Docker handles everything:
  - ✅ LLVM/Clang (installed automatically in container)
  - ✅ CMake (installed automatically in container)
  - ✅ Node.js/TypeScript (included in container)
  - ✅ All npm dependencies (installed automatically)
  - ✅ Build tools (g++, make, etc. - installed automatically)
- ✅ Consistent build environment across all machines
- ✅ Easy to share and reproduce builds
- ✅ Isolated development environment
- ✅ **Only VS Code needs to be installed on Windows** (to use the extension)

## 📖 Related Documentation

- [DOCKER_QUICKSTART.md](DOCKER_QUICKSTART.md) - Quick start guide
- [DOCKER_WHAT_IS_INCLUDED.md](DOCKER_WHAT_IS_INCLUDED.md) - **What's included in Docker vs what you need to install**
- [DOCKER_WINDOWS_AMD64.md](DOCKER_WINDOWS_AMD64.md) - AMD x64 specific instructions
- [DOCKER_WINDOWS_COMPATIBILITY.md](DOCKER_WINDOWS_COMPATIBILITY.md) - Windows compatibility details
- [DOCKER.md](DOCKER.md) - Complete Docker documentation

---

## ❓ Frequently Asked Questions

### Q: Do I need to install LLVM/Clang on Windows?
**A: No!** Docker container automatically installs LLVM/Clang 17 during build.

### Q: Do I need to install CMake on Windows?
**A: No!** Docker container automatically installs CMake during build.

### Q: Do I need to install Node.js/TypeScript on Windows?
**A: No!** Docker container includes Node.js 20 and installs TypeScript automatically.

### Q: Do I need Visual Studio Build Tools?
**A: No!** Docker uses Linux build tools (gcc, g++, make) - no Windows build tools needed.

### Q: Do I need to install VS Code?
**A: Yes!** VS Code must be installed on Windows to use the extension. Docker only builds it.

### Q: What's the minimum I need on Windows?
**A: Only 3 things:**
1. Docker Desktop
2. VS Code
3. Git

Everything else is handled by Docker automatically!

---

**Happy Dockerizing! 🐳**

