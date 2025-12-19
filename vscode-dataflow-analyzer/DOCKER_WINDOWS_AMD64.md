# Docker Setup for AMD x64 64-bit Windows PCs

Complete guide for running Docker on **AMD x64 (64-bit)** and **Intel x64 (64-bit)** Windows systems.

## 🚀 Quick Start: VS Code Remote Containers (Recommended)

The **easiest way** to develop on AMD x64 Windows is using **VS Code Remote Containers**:

1. **Install Docker Desktop** (see Step 4 below)
2. **Install Remote - Containers extension** in VS Code (`ms-vscode-remote.remote-containers`)
3. **Open project**: `code .`
4. **Reopen in Container**: `F1` → `Remote-Containers: Reopen in Container`
5. **Press F5** to run extension!

See [DOCKER_QUICKSTART.md](DOCKER_QUICKSTART.md) for detailed Remote Containers instructions.

---

## ✅ Compatibility Confirmation

**YES, Docker works perfectly on AMD x64 64-bit Windows PCs!**

- ✅ **AMD Ryzen processors** (all generations)
- ✅ **AMD EPYC processors**
- ✅ **Intel Core processors** (all generations)
- ✅ **Intel Xeon processors**
- ✅ Any x64 (x86_64) 64-bit Windows system

## Prerequisites for AMD x64 Windows

### System Requirements

1. **Windows 10/11** (64-bit) - AMD x64 compatible
2. **AMD x64 processor** (or Intel x64) - 64-bit architecture
3. **8GB RAM minimum** (16GB recommended for Docker)
4. **20GB free disk space** (for Docker images and containers)
5. **Virtualization enabled** in BIOS/UEFI:
   - AMD: AMD-V / SVM
   - Intel: Intel VT-x / VT-d

### Required Software

1. **Docker Desktop for Windows** (AMD64 version)
   - Download: [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
   - **Important**: Download the AMD64/x64 version (not ARM64)
   - File: `Docker Desktop Installer.exe` (works on both AMD and Intel x64)

2. **WSL 2** (Windows Subsystem for Linux)
   - Automatically installed with Docker Desktop
   - Or install manually: `wsl --install`

3. **Git for Windows** (AMD64 version)
   - Download: [Git for Windows](https://git-scm.com/download/win)
   - Choose: "64-bit Git for Windows Setup"

## Step-by-Step Installation (AMD x64)

### Step 1: Verify Your System Architecture

```powershell
# Open PowerShell and check your processor architecture
systeminfo | findstr /C:"System Type"

# Should show: "x64-based PC" (for AMD x64 or Intel x64)
# If it shows "ARM64", you need different instructions

# Check processor details
wmic cpu get name

# Should show your AMD or Intel processor name
```

**Expected Output:**
```
System Type: x64-based PC
Processor: AMD Ryzen 7 5800X 8-Core Processor
# OR
Processor: Intel(R) Core(TM) i7-10700K CPU @ 3.80GHz
```

### Step 2: Enable Virtualization (If Not Already Enabled)

**For AMD Processors:**
1. Restart computer and enter BIOS/UEFI (usually F2, F10, or Del)
2. Navigate to: **Advanced** → **CPU Configuration** → **SVM Mode**
3. Set to: **Enabled**
4. Save and exit

**For Intel Processors:**
1. Restart computer and enter BIOS/UEFI
2. Navigate to: **Advanced** → **CPU Configuration** → **Intel Virtualization Technology**
3. Set to: **Enabled**
4. Save and exit

**Verify virtualization is enabled:**
```powershell
# Check if virtualization is enabled
systeminfo | findstr /C:"Hyper-V"

# Should show: "Hyper-V Requirements: A hypervisor has been detected"
```

### Step 3: Install WSL 2 (If Not Already Installed)

```powershell
# Run PowerShell as Administrator
wsl --install

# Restart computer when prompted
# After restart, WSL 2 will be ready
```

**Verify WSL 2:**
```powershell
wsl --version
# Should show WSL version 2.x.x
```

### Step 4: Install Docker Desktop for Windows (AMD64)

1. **Download Docker Desktop**
   - Go to: https://www.docker.com/products/docker-desktop/
   - Click: **"Download for Windows"**
   - **Important**: This downloads the AMD64/x64 version automatically

2. **Run Installer**
   - File: `Docker Desktop Installer.exe`
   - Run installer as Administrator
   - ✅ Check "Use WSL 2 instead of Hyper-V" (recommended)
   - ✅ Check "Add shortcut to desktop"
   - Click "OK" to install

3. **Complete Installation**
   - Wait for installation to complete (~5 minutes)
   - **Restart computer** when prompted
   - After restart, Docker Desktop will start automatically

4. **Verify Docker Desktop**
   ```powershell
   # Check Docker version
   docker --version
   # Should show: Docker version 24.x.x or higher
   
   # Check Docker Compose version
   docker-compose --version
   # Should show: Docker Compose version v2.x.x or higher
   
   # Test Docker
   docker run hello-world
   # Should download and run hello-world container successfully
   ```

### Step 5: Configure Docker Desktop for AMD x64

1. **Open Docker Desktop**
   - Click Docker Desktop icon in system tray
   - Or search "Docker Desktop" in Start Menu

2. **Configure Settings**
   - Click **Settings** (gear icon)
   - **General** tab:
     - ✅ **"Use the WSL 2 based engine"** (checked)
     - ✅ **"Start Docker Desktop when you log in"** (optional)
   
   - **Resources** tab:
     - **Memory**: Set to **8GB** or higher (if you have 16GB+ RAM)
     - **CPUs**: Use all available cores (default)
     - **Disk image size**: 64GB (default, increase if needed)
   
   - **WSL Integration** tab:
     - ✅ Enable integration with your default WSL distro
     - ✅ Enable integration with Ubuntu (if installed)

3. **File Sharing**
   - **Resources** → **File Sharing**
   - Add your project directory (e.g., `C:\Users\YourName\Desktop`)
   - Click **"Apply & Restart"**

### Step 6: Verify AMD x64 Compatibility

```powershell
# Check Docker platform
docker version

# Should show:
# OS/Arch: windows/amd64
# OR
# OS/Arch: linux/amd64 (if using Linux containers)

# Check system info
docker info | findstr /C:"Architecture"

# Should show: Architecture: x86_64 or amd64
```

## Building the Extension (AMD x64)

### Option 1: Linux Containers (Recommended for AMD x64)

```powershell
# Navigate to project directory
cd C:\Users\YourName\Desktop\vscode-dataflow-analyzer

# Build using Linux containers (works perfectly on AMD x64)
.\build-docker.ps1 build

# Or manually:
docker build --platform linux/amd64 -t vscode-dataflow-analyzer .
```

**Why Linux containers work on AMD x64 Windows:**
- Docker Desktop uses WSL 2 (Linux kernel)
- Linux containers run natively in WSL 2
- AMD x64 processors fully support x86_64 Linux containers
- This is the **standard and recommended approach**

### Option 2: Windows Containers (Advanced)

```powershell
# Switch Docker to Windows containers mode
# Docker Desktop → Settings → General → Uncheck "Use WSL 2"

# Build Windows container (AMD x64)
.\build-docker.ps1 build -Windows

# Or manually:
docker build --platform windows/amd64 -f Dockerfile.windows -t vscode-dataflow-analyzer:windows .
```

**Note**: Windows containers are larger (~10GB+) and more complex. Linux containers are recommended.

## AMD x64 Specific Build Commands

### Build Extension Package

```powershell
# Build extension package (.vsix) - works on AMD x64
.\build-docker.ps1 package

# This creates: dist/dataflow-analyzer.vsix
# This .vsix file works on AMD x64, Intel x64, and ARM64 Windows systems
# 
# Note: Uses @vscode/vsce with --allow-missing-repository flag (safe for Docker)
# This only skips README.md link validation and does NOT affect extension functionality
```

### Build Windows C++ Binary (Required for Extension)

The extension needs `cfg-exporter.exe` built for AMD x64 Windows:

```powershell
# Navigate to cfg-exporter directory
cd cpp-tools\cfg-exporter

# Create build directory
mkdir build -Force
cd build

# Configure for AMD x64 (Visual Studio 2022)
cmake .. -G "Visual Studio 17 2022" -A x64

# Build Release version (AMD x64)
cmake --build . --config Release

# Verify binary was created
dir Release\cfg-exporter.exe
# Should exist: cpp-tools\cfg-exporter\build\Release\cfg-exporter.exe
```

**Why `-A x64` works on AMD x64:**
- `x64` means AMD64/x86_64 architecture
- Works on both AMD and Intel x64 processors
- Generates native 64-bit Windows executable

## Troubleshooting AMD x64 Specific Issues

### Issue: "WSL 2 installation is incomplete"

**Solution:**
```powershell
# Run as Administrator
wsl --update
wsl --set-default-version 2
wsl --install --distribution Ubuntu
```

### Issue: "Virtualization not enabled" (AMD)

**Solution:**
1. Restart and enter BIOS/UEFI (F2, F10, or Del)
2. Find: **Advanced** → **CPU Configuration** → **SVM Mode**
3. Enable SVM (AMD Virtualization)
4. Save and restart

### Issue: "Docker Desktop won't start" (AMD x64)

**Solution:**
```powershell
# Check WSL 2 status
wsl --status

# Restart WSL 2
wsl --shutdown
# Wait 10 seconds, then start Docker Desktop again

# If still not working, reinstall WSL 2
wsl --unregister Ubuntu
wsl --install
```

### Issue: "Platform mismatch" errors

**Solution:**
```powershell
# Explicitly specify AMD64 platform
docker build --platform linux/amd64 -t vscode-dataflow-analyzer .

# Or for Windows containers:
docker build --platform windows/amd64 -f Dockerfile.windows -t vscode-dataflow-analyzer:windows .
```

### Issue: "Slow performance on AMD Ryzen"

**Solution:**
1. Docker Desktop → Settings → Resources
2. Increase **Memory** allocation (8GB+)
3. Enable **"Use WSL 2 based engine"**
4. WSL 2 provides better performance on AMD processors

## Verification Checklist (AMD x64)

Run these commands to verify everything works:

```powershell
# 1. Verify system architecture
systeminfo | findstr /C:"System Type"
# Expected: x64-based PC

# 2. Verify Docker is running
docker ps
# Should show running containers or empty list (no errors)

# 3. Verify Docker platform
docker version
# Should show: OS/Arch: windows/amd64 or linux/amd64

# 4. Test Docker build
docker build --platform linux/amd64 -t test-image .
# Should complete without errors

# 5. Verify WSL 2
wsl --version
# Should show: WSL version 2.x.x

# 6. Check processor
wmic cpu get name
# Should show your AMD or Intel processor
```

## Performance Tips for AMD x64

1. **Use WSL 2 Backend**
   - Better performance than Hyper-V on AMD processors
   - Docker Desktop → Settings → General → ✅ "Use WSL 2"

2. **Allocate More Memory**
   - Docker Desktop → Settings → Resources → Memory
   - Set to 8GB+ if you have 16GB+ RAM

3. **Use Linux Containers**
   - Faster than Windows containers
   - Smaller image sizes
   - Better compatibility

4. **Enable Hardware Acceleration**
   - Ensure virtualization is enabled in BIOS
   - AMD: SVM Mode enabled
   - Intel: VT-x enabled

## Summary

✅ **Docker works perfectly on AMD x64 64-bit Windows PCs**

- Use **Linux containers** via WSL 2 (recommended)
- Docker Desktop automatically detects AMD x64 architecture
- All Docker commands work identically on AMD and Intel x64
- Build Windows binary separately using `-A x64` flag

## Related Documentation

- **🚀 Recommended**: [DOCKER_QUICKSTART.md](DOCKER_QUICKSTART.md) - Quick start guide with Remote Containers
- [DOCKER_FULL_LINUX_VM_WINDOWS.md](DOCKER_FULL_LINUX_VM_WINDOWS.md) - Complete Docker guide with Remote Containers
- [DOCKER_WINDOWS_COMPATIBILITY.md](DOCKER_WINDOWS_COMPATIBILITY.md) - Windows compatibility details
- [WINDOWS_BUILD_INSTRUCTIONS.md](WINDOWS_BUILD_INSTRUCTIONS.md) - Windows binary build instructions





