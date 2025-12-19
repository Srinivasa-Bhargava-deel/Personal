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
# Open PowerShell and verify AMD x64 architecture
systeminfo | findstr /C:"System Type"
# Expected: x64-based PC

wmic cpu get name
# Should show your AMD processor (e.g., AMD Ryzen 7 5800X)
```

### Step 2: Enable Virtualization (If Not Enabled)

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

### Step 3: Install WSL 2

```powershell
# Run PowerShell as Administrator
wsl --install

# Restart computer when prompted
# After restart, verify WSL 2:
wsl --version
# Should show: WSL version 2.x.x
```

### Step 4: Install Docker Desktop

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

4. **Configure Docker Desktop**
   - Open Docker Desktop
   - Click **Settings** (gear icon)
   
   **General Tab:**
   - ✅ **"Use the WSL 2 based engine"** (checked)
   
   **Resources Tab:**
   - **Memory**: Set to **8GB** or higher (if you have 16GB+ RAM)
   - **CPUs**: Use all available cores (default)
   
   **Resources → File Sharing:**
   - Add your project directory (e.g., `C:\Users\YourName\Desktop`)
   - Click **"Apply & Restart"**

5. **Verify Docker Installation**
   ```powershell
   # Check Docker version
   docker --version
   # Expected: Docker version 24.x.x or higher
   
   # Verify Docker is running
   docker ps
   # Should show empty list or running containers (no errors)
   
   # Test Docker with hello-world
   docker run hello-world
   # Should download and run successfully
   ```

### Step 5: Install VS Code Extensions

1. **Open VS Code**
   - Launch VS Code

2. **Install Remote - Containers Extension**
   - Press `Ctrl+Shift+X` to open Extensions
   - Search for: `Remote - Containers`
   - Install: `ms-vscode-remote.remote-containers`
   - Or install directly: [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

3. **Install Docker Extension** (Optional but recommended)
   - Search for: `Docker`
   - Install: `ms-azuretools.vscode-docker`
   - Or install directly: [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-docker)

### Step 6: Clone Repository

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

### Step 7: Verify VS Code CLI is Available

Before opening the project, verify the `code` command works:

```powershell
# Check if code command is available
code --version
# Should show: 1.80.0 or higher
```

**If `code` command is not found:**

1. Open VS Code
2. Press `Ctrl+Shift+P` to open Command Palette
3. Type: `Shell Command: Install 'code' command in PATH`
4. Select it and restart PowerShell
5. Verify again: `code --version`

### Step 8: Open Project in VS Code Remote Container

1. **Open Project in VS Code**
   ```powershell
   # From the project directory
   code .
   ```
   
   **Alternative if `code` command doesn't work:**
   - Open VS Code manually
   - File → Open Folder
   - Navigate to: `C:\Users\YourName\Desktop\Personal\vscode-dataflow-analyzer`
   - Click "Select Folder"

2. **Reopen in Container**
   - Press `F1` (or `Ctrl+Shift+P`)
   - Type: `Remote-Containers: Reopen in Container`
   - Select it and wait for the container to build

3. **Wait for Container Build**
   - **First build takes 10-15 minutes**
   - Container automatically:
     - Builds Docker image from Dockerfile
     - Installs LLVM/Clang 17, CMake, Node.js, TypeScript
     - Installs all npm dependencies
     - Builds C++ cfg-exporter binary
     - Compiles TypeScript extension
     - Sets up development environment
   - Check VS Code status bar for progress
   - Check Output panel → "Dev Containers" for build logs

4. **Verify Container is Ready**
   - VS Code status bar should show: **"Dev Container: C++ Dataflow Analyzer Development"**
   - Terminal should be available (container terminal)
   - Open terminal and verify:
     ```bash
     node --version    # Should show v20.x.x
     npm --version     # Should show version
     cfg-exporter --help  # Should show help text
     ```

### Step 9: Run the Extension

1. **Press F5** to launch Extension Development Host
   - A new VS Code window will open (Extension Development Host)
   - The extension is loaded and ready

2. **Test the Extension**
   - In the Extension Development Host window:
   - Open a C++ file (`.cpp` or `.hpp`)
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS)
   - Type: `Analyze Workspace`
   - Select: **"Dataflow Analyzer: Analyze Workspace"**
   - Wait for analysis to complete
   - Press `Ctrl+Shift+P` again
   - Type: `Show Control Flow Graph`
   - Select: **"Dataflow Analyzer: Show Control Flow Graph"**
   - CFG visualization should appear

## 🔄 Clean Build Workflow (For Rebuilding)

When you need to rebuild from scratch:

1. **Clean Previous Builds**
   ```powershell
   # In VS Code terminal (or PowerShell)
   docker system prune -a -f
   ```

2. **Rebuild Container**
   - Press `F1`
   - Type: `Remote-Containers: Rebuild Container Without Cache`
   - Select it and wait for rebuild

3. **Verify Build**
   - Check that container starts successfully
   - Verify tools are available:
     ```bash
     node --version
     cfg-exporter --help
     npm run compile
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

### Issue: "Container won't build"

**Solution:**
1. Ensure Docker Desktop is running
2. Check Docker Desktop → Settings → Resources → Memory: Set to 8GB+
3. Rebuild container: `F1` → `Remote-Containers: Rebuild Container`
4. Check Output panel → "Dev Containers" for errors

### Issue: "Out of memory" during build

**Solution:**
1. Docker Desktop → Settings → Resources → Memory
2. Increase to **8GB** or higher
3. Click **"Apply & Restart"**
4. Rebuild container: `F1` → `Remote-Containers: Rebuild Container Without Cache`

### Issue: "WSL 2 installation is incomplete"

**Solution:**
```powershell
# Run PowerShell as Administrator
wsl --update
wsl --set-default-version 2
wsl --shutdown
# Wait 10 seconds, then start Docker Desktop
```

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
4. Rebuild container: `F1` → `Remote-Containers: Rebuild Container`

For more detailed troubleshooting, see [DOCKER_TROUBLESHOOTING.md](DOCKER_TROUBLESHOOTING.md)

## 🔍 Verification Checklist

After completing all steps, verify:

```powershell
# 1. Docker is running
docker ps
# ✅ Should show containers or empty list (no errors)

# 2. VS Code shows Dev Container status
# ✅ Status bar should show: "Dev Container: C++ Dataflow Analyzer Development"

# 3. Tools are available in container
# ✅ Open terminal in VS Code (container terminal)
node --version    # ✅ Should show v20.x.x
npm --version    # ✅ Should show version
cfg-exporter --help  # ✅ Should show help text

# 4. Extension runs
# ✅ Press F5 → Extension Development Host opens
# ✅ Run "Analyze Workspace" command → Analysis completes
# ✅ Run "Show Control Flow Graph" → Visualization appears
```

## 📚 Quick Reference

### Essential VS Code Commands

1. **Open project**: 
   ```powershell
   code .
   ```

2. **Reopen in container**: 
   - Press `F1` (or `Ctrl+Shift+P`)
   - Type: `Remote-Containers: Reopen in Container`
   - Select it

3. **Run extension**: 
   - Press `F5` (or `Ctrl+F5` to run without debugging)

4. **Rebuild container**: 
   - Press `F1` → Type: `Remote-Containers: Rebuild Container Without Cache`

5. **Check container status**: 
   - Look at VS Code status bar (bottom left)
   - Should show: "Dev Container: C++ Dataflow Analyzer Development"

6. **View container logs**: 
   - View → Output → Select "Dev Containers" from dropdown

### Container Terminal Commands

After container is running, use these commands in the VS Code terminal (container terminal):

```bash
# Compile TypeScript
npm run compile

# Watch mode (auto-compile on changes)
npm run watch

# Run tests
npm test

# Lint code
npm run lint

# Test cfg-exporter
cfg-exporter --help

# Check Node.js version
node --version

# Check npm version
npm --version
```

### VS Code Command Palette Commands

Once the extension is running (F5), use these commands in the Extension Development Host window:

- **`Ctrl+Shift+P`** → `Dataflow Analyzer: Analyze Workspace`
- **`Ctrl+Shift+P`** → `Dataflow Analyzer: Show Control Flow Graph`
- **`Ctrl+Shift+P`** → `Dataflow Analyzer: Analyze Active File`
- **`Ctrl+Shift+P`** → `Dataflow Analyzer: Re-Analyze`

## 🎯 Summary

**Complete Workflow:**

1. ✅ **Install Docker Desktop** on Windows AMD x64
2. ✅ **Install Remote - Containers extension** in VS Code
3. ✅ **Clone repository**
4. ✅ **Open project** in VS Code
5. ✅ **Reopen in Container** (`F1` → `Remote-Containers: Reopen in Container`)
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
