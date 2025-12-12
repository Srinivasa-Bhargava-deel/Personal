# Docker Windows Compatibility Guide

## ⚠️ Important: What Works and What Doesn't

### ✅ **What WILL Work on Windows:**

1. **Linux Containers via Docker Desktop** (Recommended)
   - The main `Dockerfile` uses Linux containers (Ubuntu)
   - Works perfectly on Windows via Docker Desktop with WSL2 backend
   - This is the **standard and recommended approach**
   - Builds Linux binaries inside the container
   - Perfect for: Building extension package (.vsix), CI/CD, development

2. **Building the Extension Package (.vsix)**
   - ✅ Works perfectly - builds TypeScript extension
   - ✅ Creates .vsix file you can install in VS Code
   - ✅ No Windows-specific issues

3. **Development Workflow**
   - ✅ Compile TypeScript in container
   - ✅ Run tests in container
   - ✅ Use volume mounts for live development

### ⚠️ **What Has Limitations:**

1. **C++ Binary (`cfg-exporter`) Built in Linux Container**
   - ❌ Linux binary won't run natively on Windows
   - ✅ But you can build Windows binary separately (see below)
   - ✅ Extension package (.vsix) doesn't include the binary anyway

2. **Windows Containers** (`Dockerfile.windows`)
   - ⚠️ More complex setup
   - ⚠️ Requires Windows containers mode in Docker Desktop
   - ⚠️ Much larger images (~10GB+)
   - ⚠️ May have issues with Chocolatey/LLVM installation
   - ⚠️ Not recommended unless you specifically need Windows containers

## 🎯 **Recommended Approach for Windows Users**

### Option 1: Use Docker for Extension Development (Recommended)

```powershell
# 1. Build extension package (.vsix) using Docker
.\build-docker.ps1 package

# 2. Install .vsix in VS Code
# Extensions → ... → Install from VSIX → dist/dataflow-analyzer.vsix

# 3. Build Windows binary separately (one-time setup)
# Follow WINDOWS_BUILD_INSTRUCTIONS.md to build cfg-exporter.exe locally
```

**Why this works:**
- Extension package (.vsix) is platform-agnostic
- VS Code extension runs on Windows
- You only need to build the C++ binary once on Windows
- Binary stays in your project directory

### Option 2: Full Local Windows Build

```powershell
# Follow WINDOWS_BUILD_INSTRUCTIONS.md for complete local setup
# This builds everything natively on Windows
```

**When to use:**
- You want everything built locally
- You're actively developing the C++ tool
- You need to debug the binary

### Option 3: Hybrid Approach (Best of Both Worlds)

```powershell
# Use Docker for TypeScript extension development
.\build-docker.ps1 dev
docker-compose exec dev npm run compile
docker-compose exec dev npm test

# Build C++ binary locally on Windows (one-time)
cd cpp-tools\cfg-exporter
mkdir build
cd build
cmake .. -G "Visual Studio 17 2022" -A x64
cmake --build . --config Release
```

## 🔧 **Detailed Compatibility Matrix**

| Component | Linux Container | Windows Container | Native Windows |
|-----------|----------------|-------------------|----------------|
| **TypeScript Extension** | ✅ Works | ✅ Works | ✅ Works |
| **Extension Package (.vsix)** | ✅ Works | ✅ Works | ✅ Works |
| **C++ Binary (Linux)** | ✅ Works | ❌ N/A | ❌ Won't run |
| **C++ Binary (Windows)** | ❌ Can't build | ⚠️ Complex | ✅ Works |
| **Development Workflow** | ✅ Excellent | ⚠️ Complex | ✅ Excellent |
| **CI/CD** | ✅ Perfect | ⚠️ Limited | ✅ Works |

## 📋 **Step-by-Step: Using Docker on Windows**

### Prerequisites Check

```powershell
# 1. Verify Docker Desktop is installed and running
docker --version
docker-compose --version

# 2. Verify WSL2 backend is enabled
# Docker Desktop → Settings → General → "Use the WSL 2 based engine" ✅

# 3. Verify file sharing is configured
# Docker Desktop → Settings → Resources → File Sharing
# Add your project directory (e.g., C:\Users\YourName\...)
```

### Build Extension Package

```powershell
# This will work perfectly on Windows
.\build-docker.ps1 build
.\build-docker.ps1 package

# Result: dist/dataflow-analyzer.vsix
# This .vsix file works on Windows, macOS, and Linux
```

### Build Windows Binary (Required for Extension to Work)

The extension needs `cfg-exporter.exe` to analyze C++ files. You have two options:

**Option A: Build Locally (Recommended)**
```powershell
# Follow WINDOWS_BUILD_INSTRUCTIONS.md
# This builds cfg-exporter.exe in cpp-tools\cfg-exporter\build\Release\
```

**Option B: Use Windows Container (Advanced)**
```powershell
# Switch Docker to Windows containers mode
# Docker Desktop → Settings → General → Uncheck "Use WSL 2"

# Build Windows binary
docker build -f Dockerfile.windows -t vscode-dataflow-analyzer:windows .

# Extract binary from container
docker create --name temp-container vscode-dataflow-analyzer:windows
docker cp temp-container:/app/cpp-tools/cfg-exporter/build/cfg-exporter.exe ./cpp-tools/cfg-exporter/build/Release/
docker rm temp-container
```

## 🐛 **Common Issues and Solutions**

### Issue: "Cannot connect to Docker daemon"

**Solution:**
1. Start Docker Desktop
2. Wait for it to fully start (whale icon in system tray)
3. Verify: `docker ps` should work

### Issue: "Volume mount permission denied"

**Solution:**
1. Docker Desktop → Settings → Resources → File Sharing
2. Add your project directory
3. Restart Docker Desktop

### Issue: "Linux binary won't run on Windows"

**This is expected!** The Linux binary from Docker won't run on Windows. You need to:
1. Build Windows binary separately (see WINDOWS_BUILD_INSTRUCTIONS.md)
2. Or use Windows containers (complex, not recommended)

### Issue: "Windows containers not working"

**Solution:**
- Use Linux containers instead (recommended)
- Linux containers work perfectly on Windows via WSL2
- Windows containers are only needed if you specifically need Windows binaries

## ✅ **Verification Checklist**

After setting up Docker on Windows, verify:

```powershell
# 1. Docker works
docker --version
docker ps

# 2. Can build extension
.\build-docker.ps1 build
# Should complete without errors

# 3. Can package extension
.\build-docker.ps1 package
# Should create dist/dataflow-analyzer.vsix

# 4. Windows binary exists (for extension to work)
dir cpp-tools\cfg-exporter\build\Release\cfg-exporter.exe
# Should exist if you built it locally
```

## 🎯 **Summary**

**For Windows Users:**

1. ✅ **Docker works perfectly** for building the TypeScript extension
2. ✅ **Extension package (.vsix) works** on Windows
3. ⚠️ **C++ binary must be built separately** on Windows (one-time setup)
4. ✅ **Recommended workflow**: Use Docker for extension dev, build binary locally

**Bottom Line:** Docker on Windows works great for extension development and packaging. You just need to build the Windows C++ binary separately (which is a one-time setup).

## 📚 **Related Documentation**

- [DOCKER_QUICKSTART.md](DOCKER_QUICKSTART.md) - Quick start guide
- [DOCKER.md](DOCKER.md) - Complete Docker documentation
- [WINDOWS_BUILD_INSTRUCTIONS.md](WINDOWS_BUILD_INSTRUCTIONS.md) - Windows binary build instructions


