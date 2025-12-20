# Fully Dockerized Build and Run - Linux Docker VM on Windows AMD x64

Complete guide for building and running the VS Code Dataflow Analyzer extension using VS Code Remote Containers on Windows AMD x64.

## 🎯 Overview

This guide provides a single, streamlined workflow using **VS Code Remote Containers** to build and run the extension entirely in Docker, without installing any build tools locally.

**Architecture:**
```
Windows AMD x64 PC
  └── Docker Desktop (WSL2 backend)
      └── Linux Docker VM (Ubuntu-based containers)
          └── VS Code Remote Containers
              └── VS Code Dataflow Analyzer Extension
```

## 📋 Prerequisites

### System Requirements

- **Windows 10/11** (64-bit) on AMD x64 processor
- **8GB RAM minimum** (16GB recommended)
- **20GB free disk space**
- **Virtualization enabled** (AMD-V/SVM in BIOS)

### Required Software

1. **Docker Desktop for Windows** (AMD64 version)
   - Download: https://www.docker.com/products/docker-desktop/
   - Version: Latest stable

2. **VS Code** (for development)
   - Download: https://code.visualstudio.com/
   - Version: 1.80.0 or higher

3. **Git for Windows**
   - Download: https://git-scm.com/download/win
   - Choose: 64-bit version

### ✅ What Docker Handles Automatically

**The Docker container automatically installs and includes:**
- ✅ **LLVM/Clang 17** - Installed automatically
- ✅ **CMake** - Installed automatically
- ✅ **Build Tools** (build-essential, g++, make) - Installed automatically
- ✅ **Node.js 20** - Included in base image
- ✅ **TypeScript 5.0+** - Installed via npm
- ✅ **npm dependencies** - Installed automatically
- ✅ **Pre-built cfg-exporter binary** - Built during container creation
- ✅ **VS Code extensions** - TypeScript, ESLint, C++ tools

**You do NOT need to install these on Windows:**
- ❌ LLVM/Clang
- ❌ CMake
- ❌ Node.js
- ❌ TypeScript
- ❌ Visual Studio Build Tools
- ❌ Any C++ compilers or build tools

## 🚀 Step-by-Step Instructions

### Step 1: Verify System Architecture

```powershell
systeminfo | findstr /C:"System Type"
wmic cpu get name
```

### Step 2: Enable Virtualization

**For AMD Processors:**
1. Restart computer → Enter BIOS/UEFI (F2, F10, or Del)
2. Navigate to: **Advanced** → **CPU Configuration** → **SVM Mode**
3. Set to: **Enabled**
4. Save and exit

**Verify virtualization:**
```powershell
systeminfo | findstr /C:"Hyper-V"
```

### Step 3: Install WSL 2

```powershell
wsl --install
```

Restart computer when prompted, then verify:
```powershell
wsl --version
```

### Step 4: Install Docker Desktop

1. **Download Docker Desktop**
   - Go to: https://www.docker.com/products/docker-desktop/
   - Click **"Download for Windows"**
   - File: `Docker Desktop Installer.exe` (AMD64 version)

2. **Run Installer**
   - Right-click installer → **Run as Administrator**
   - Check **"Use WSL 2 instead of Hyper-V"**
   - Check **"Add shortcut to desktop"**
   - Click **"OK"** to install

3. **Restart Computer**
   - Restart when prompted
   - Docker Desktop will start automatically after restart

4. **Configure Docker Desktop**
   - Open Docker Desktop
   - Click **Settings** (gear icon)
   - **General Tab**: Check **"Use the WSL 2 based engine"**
   - **Resources Tab**: Set **Memory** to **8GB** or higher
   - **Resources → File Sharing**: Add your project directory
   - Click **"Apply & Restart"**

5. **Verify Docker Installation**
   ```powershell
   docker --version
   docker ps
   docker run hello-world
   ```

### Step 5: Install VS Code Extensions

1. **Open VS Code**
   ```powershell
   code
   ```

2. **Install Remote - Containers Extension**
   - Press `Ctrl+Shift+X` to open Extensions
   - Search for: `Remote - Containers`
   - Install: `ms-vscode-remote.remote-containers`

3. **Install Docker Extension**
   - Search for: `Docker`
   - Install: `ms-azuretools.vscode-docker`

### Step 6: Clone Repository

```powershell
cd C:\Users\YourName\Desktop
git clone https://github.com/Srinivasa-Bhargava-deel/Personal.git
cd Personal\vscode-dataflow-analyzer
```

### Step 7: Verify VS Code CLI

```powershell
code --version
```

**If `code` command is not found:**
1. Open VS Code
2. Press `Ctrl+Shift+P`
3. Type: `Shell Command: Install 'code' command in PATH`
4. Select it and restart PowerShell
5. Verify: `code --version`

### Step 8: Open Project in VS Code Remote Container

1. **Open Project in VS Code**
   ```powershell
   code .
   ```

2. **Reopen in Container**
   - Press `F1`
   - Type: `Remote-Containers: Reopen in Container`
   - Select it and wait for the container to build

3. **Wait for Container Build**
   - **First build takes 10-15 minutes**
   - Container automatically builds Docker image, installs dependencies, and compiles
   - Check VS Code status bar for progress
   - Check Output panel → "Dev Containers" for build logs

4. **Verify Container is Ready**
   - VS Code status bar shows: **"Dev Container: C++ Dataflow Analyzer Development"**
   - Open terminal in VS Code (container terminal)
   - Verify tools:
     ```bash
     node --version
     npm --version
     cfg-exporter --help
     ```

### Step 9: Run the Extension

1. **Press F5** to launch Extension Development Host
   - A new VS Code window opens (Extension Development Host)
   - Extension is loaded and ready

2. **Test the Extension**
   - In Extension Development Host window:
   - Open a C++ file (`.cpp` or `.hpp`)
   - Press `Ctrl+Shift+P`
   - Type: `Analyze Workspace`
   - Select: **"Dataflow Analyzer: Analyze Workspace"**
   - Wait for analysis to complete
   - Press `Ctrl+Shift+P`
   - Type: `Show Control Flow Graph`
   - Select: **"Dataflow Analyzer: Show Control Flow Graph"**
   - CFG visualization appears

## 🔄 Clean Build Workflow (For Rebuilding)

When you need to rebuild from scratch:

1. **Clean Previous Builds**
   ```powershell
   docker system prune -a -f
   ```

2. **Rebuild Container**
   - Press `F1`
   - Type: `Remote-Containers: Rebuild Container Without Cache`
   - Select it and wait for rebuild

3. **Verify Build**
   - Check container starts successfully
   - Verify tools are available:
     ```bash
     node --version
     cfg-exporter --help
     npm run compile
     ```

## ✅ Validate Docker Fixes (Dry-Run Validation)

Before committing changes or troubleshooting issues, run the validation script to verify all Docker fixes are in place:

### Running the Validation Script

**From Windows PowerShell (in project directory):**
```powershell
# Navigate to project directory
cd C:\Users\YourName\Desktop\Personal\vscode-dataflow-analyzer

# Run validation script (outputs to logs2.txt)
bash validate-docker-fixes.sh
```

**From VS Code Container Terminal:**
```bash
# In VS Code container terminal
cd /app
bash validate-docker-fixes.sh
```

### What the Script Validates

The `validate-docker-fixes.sh` script checks:

1. **devcontainer.json Configuration**
   - ✓ `workspaceFolder` is set to `/app`
   - ✓ `postCreateCommand` includes `cd /app`

2. **Dockerfile Binary Architecture**
   - ✓ Binary architecture verification for Linux x86_64/amd64
   - ✓ Binary executable permissions set (`chmod +x`)

3. **Dry-Run Logging**
   - ✓ `[DRY RUN]` logging present at major stages

4. **Working Directory Enforcement**
   - ✓ `docker-compose.yml` enforces `/app` working directory

5. **LD_LIBRARY_PATH Configuration**
   - ✓ `LD_LIBRARY_PATH` set correctly
   - ✓ No undefined variable warnings

### Output

- **Console Output**: Validation results displayed in terminal
- **Log File**: All output written to `logs2.txt` with timestamp
- **Exit Code**: `0` if all checks pass, `1` if any check fails

### Example Output

```
=== DRY RUN: Validating Docker Fixes ===
Timestamp: 2025-12-20 10:30:45

[DRY RUN] Checking devcontainer.json...
  ✓ workspaceFolder is set to /app
  ✓ postCreateCommand includes cd /app
[DRY RUN] Checking Dockerfile for binary architecture verification...
  ✓ Binary architecture verification found
...
=== DRY RUN VALIDATION COMPLETE ===
✓ All checks passed!
✓ Validation output written to logs2.txt
```

### Troubleshooting

If validation fails:
1. Check `logs2.txt` for detailed error messages
2. Review the specific check that failed
3. Fix the issue in the corresponding file (Dockerfile, devcontainer.json, or docker-compose.yml)
4. Re-run validation: `bash validate-docker-fixes.sh`

## 🐛 Troubleshooting

### Issue: "Cannot connect to Docker daemon"

**Solution:**
```powershell
docker ps
```

Start Docker Desktop and wait for whale icon in system tray to be steady.

### Issue: "Container won't build"

**Solution:**
1. Ensure Docker Desktop is running
2. Docker Desktop → Settings → Resources → Memory: Set to 8GB+
3. Press `F1` → Type: `Remote-Containers: Rebuild Container`
4. Check Output panel → "Dev Containers" for errors

### Issue: "Out of memory" during build

**Solution:**
1. Docker Desktop → Settings → Resources → Memory
2. Increase to **8GB** or higher
3. Click **"Apply & Restart"**
4. Press `F1` → Type: `Remote-Containers: Rebuild Container Without Cache`

### Issue: "WSL 2 installation is incomplete"

**Solution:**
```powershell
wsl --update
wsl --set-default-version 2
wsl --shutdown
```

Wait 10 seconds, then start Docker Desktop.

### Issue: "Volume mount permission denied"

**Solution:**
1. Docker Desktop → Settings → Resources → File Sharing
2. Add your project directory: `C:\Users\YourName\Desktop`
3. Click **"Apply & Restart"**
4. Restart Docker Desktop

### Issue: "Extension doesn't launch after reopening in container"

**Solution:**
1. Check container is ready (status bar shows "Dev Container")
2. Wait for "postCreateCommand" to complete
3. Check Output panel → "Dev Containers" for errors
4. Press `F1` → Type: `Remote-Containers: Rebuild Container`

For more detailed troubleshooting, see [DOCKER_TROUBLESHOOTING.md](DOCKER_TROUBLESHOOTING.md)

## 🔍 Verification Checklist

After completing all steps, verify:

```powershell
docker ps
```

In VS Code:
- Status bar shows: "Dev Container: C++ Dataflow Analyzer Development"
- Open terminal (container terminal):
  ```bash
  node --version
  npm --version
  cfg-exporter --help
  ```
- Press `F5` → Extension Development Host opens
- Run `Ctrl+Shift+P` → `Dataflow Analyzer: Analyze Workspace`
- Run `Ctrl+Shift+P` → `Dataflow Analyzer: Show Control Flow Graph`

## 📚 Quick Reference

### Essential VS Code Commands

1. **Open project**: 
   ```powershell
   code .
   ```

2. **Reopen in container**: 
   - Press `F1`
   - Type: `Remote-Containers: Reopen in Container`

3. **Run extension**: 
   - Press `F5`

4. **Rebuild container**: 
   - Press `F1`
   - Type: `Remote-Containers: Rebuild Container Without Cache`

5. **Check container status**: 
   - Look at VS Code status bar (bottom left)

6. **View container logs**: 
   - View → Output → Select "Dev Containers"

### Container Terminal Commands

After container is running, use these commands in VS Code terminal:

```bash
npm run compile
npm run watch
npm test
npm run lint
cfg-exporter --help
node --version
npm --version
```

### VS Code Command Palette Commands

After pressing `F5`, use these commands in Extension Development Host:

- `Ctrl+Shift+P` → `Dataflow Analyzer: Analyze Workspace`
- `Ctrl+Shift+P` → `Dataflow Analyzer: Show Control Flow Graph`
- `Ctrl+Shift+P` → `Dataflow Analyzer: Analyze Active File`
- `Ctrl+Shift+P` → `Dataflow Analyzer: Re-Analyze`

## 🎯 Summary

**Complete Workflow:**

1. ✅ **Install Docker Desktop** on Windows AMD x64
2. ✅ **Install Remote - Containers extension** in VS Code
3. ✅ **Clone repository**
4. ✅ **Open project**: `code .`
5. ✅ **Reopen in Container**: `F1` → `Remote-Containers: Reopen in Container`
6. ✅ **Wait for container** to build (first time: ~10-15 minutes)
7. ✅ **Press F5** to run extension
8. ✅ **Develop and test** directly in container

**Key Benefits:**
- ✅ **No need to install ANY build tools on Windows** - Docker handles everything
- ✅ **Consistent environment** - Same setup on all machines
- ✅ **Easy to share** - Just clone and reopen in container
- ✅ **Isolated** - Doesn't affect your Windows system
- ✅ **Full VS Code integration** - Debugging, IntelliSense, etc. work perfectly

## 📖 Related Documentation

- [DOCKER_QUICKSTART.md](DOCKER_QUICKSTART.md) - Quick start guide
- [DOCKER_TROUBLESHOOTING.md](DOCKER_TROUBLESHOOTING.md) - Comprehensive troubleshooting guide
- [DOCKER.md](DOCKER.md) - Complete Docker documentation
- [DOCKER_WHAT_IS_INCLUDED.md](DOCKER_WHAT_IS_INCLUDED.md) - What's included in Docker vs what you need to install

---

**Happy Dockerizing! 🐳**
