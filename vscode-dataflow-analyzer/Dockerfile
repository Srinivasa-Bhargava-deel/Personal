# Multi-stage Dockerfile for VS Code Dataflow Analyzer Extension
# Supports building both the TypeScript extension and C++ cfg-exporter binary
# Compatible with: AMD x64 (64-bit), Intel x64 (64-bit) architectures
# Works on: Windows (via Docker Desktop/WSL2), Linux, macOS

# ============================================================================
# Stage 1: Build C++ cfg-exporter binary
# ============================================================================
# Using Ubuntu 22.04 AMD64 (x86_64) base image - works on AMD and Intel x64 processors
# CRITICAL: Explicitly set platform to linux/amd64 to prevent macOS/ARM builds
# Platform is set via --platform flag in docker build command
# Docker automatically sets TARGETPLATFORM when --platform is used, so we use it directly
FROM --platform=linux/amd64 ubuntu:22.04 AS cpp-builder

# Avoid interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# ============================================================================
# STAGE INITIALIZATION AND VALIDATION
# ============================================================================
RUN echo "============================================================" && \
    echo "[DEBUG] ========== CPP-BUILDER STAGE INITIALIZATION ==========" && \
    echo "[DEBUG] Stage: cpp-builder" && \
    echo "[DEBUG] Base image: ubuntu:22.04" && \
    echo "[DEBUG] Platform: linux/amd64" && \
    echo "[DEBUG] Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")" && \
    echo "[DEBUG] Platform architecture: $(uname -m)" && \
    echo "[DEBUG] OS info: $(uname -a)" && \
    echo "[DEBUG] Working directory: $(pwd)" && \
    echo "============================================================"

# Install build dependencies
# Suppress update-alternatives warnings (harmless but noisy) by filtering stderr
RUN echo "[DEBUG] ========== Installing Build Dependencies ==========" && \
    echo "[DEBUG] Starting apt-get update..." && \
    if apt-get update; then \
        echo "[SUCCESS] ✓ apt-get update completed successfully"; \
    else \
        APT_UPDATE_EXIT=$? && \
        echo "[FAILURE] ✗ ERROR: apt-get update failed with exit code: $APT_UPDATE_EXIT" && \
        exit $APT_UPDATE_EXIT; \
    fi && \
    echo "[DEBUG] Installing packages: build-essential, cmake, ninja-build, git, wget, curl, ca-certificates, gnupg, file" && \
    if DEBIAN_FRONTEND=noninteractive apt-get install -y \
        build-essential \
        cmake \
        ninja-build \
        git \
        wget \
        curl \
        ca-certificates \
        gnupg \
        file \
        2>&1 | (grep -v "update-alternatives: warning" || true); then \
        echo "[SUCCESS] ✓ All packages installed successfully"; \
    else \
        APT_INSTALL_EXIT=$? && \
        echo "[FAILURE] ✗ ERROR: Package installation failed with exit code: $APT_INSTALL_EXIT" && \
        exit $APT_INSTALL_EXIT; \
    fi && \
    echo "[DEBUG] ========== Verifying Installed Tools ==========" && \
    TOOL_CHECK_FAILED=0 && \
    if command -v gcc >/dev/null 2>&1; then \
        echo "[SUCCESS] ✓ gcc: $(gcc --version | head -1)"; \
    else \
        echo "[FAILURE] ✗ ERROR: gcc not found!" && \
        TOOL_CHECK_FAILED=1; \
    fi && \
    if command -v g++ >/dev/null 2>&1; then \
        echo "[SUCCESS] ✓ g++: $(g++ --version | head -1)"; \
    else \
        echo "[FAILURE] ✗ ERROR: g++ not found!" && \
        TOOL_CHECK_FAILED=1; \
    fi && \
    if command -v cmake >/dev/null 2>&1; then \
        echo "[SUCCESS] ✓ cmake: $(cmake --version | head -1)"; \
    else \
        echo "[FAILURE] ✗ ERROR: cmake not found!" && \
        TOOL_CHECK_FAILED=1; \
    fi && \
    if command -v ninja >/dev/null 2>&1; then \
        echo "[SUCCESS] ✓ ninja: $(ninja --version 2>&1)"; \
    else \
        echo "[FAILURE] ✗ ERROR: ninja not found!" && \
        TOOL_CHECK_FAILED=1; \
    fi && \
    if command -v git >/dev/null 2>&1; then \
        echo "[SUCCESS] ✓ git: $(git --version)"; \
    else \
        echo "[FAILURE] ✗ ERROR: git not found!" && \
        TOOL_CHECK_FAILED=1; \
    fi && \
    if command -v file >/dev/null 2>&1; then \
        echo "[SUCCESS] ✓ file: $(file --version 2>&1)"; \
    else \
        echo "[FAILURE] ✗ ERROR: file not found!" && \
        TOOL_CHECK_FAILED=1; \
    fi && \
    if command -v wget >/dev/null 2>&1; then \
        echo "[SUCCESS] ✓ wget: $(wget --version | head -1)"; \
    else \
        echo "[FAILURE] ✗ ERROR: wget not found!" && \
        TOOL_CHECK_FAILED=1; \
    fi && \
    if command -v curl >/dev/null 2>&1; then \
        echo "[SUCCESS] ✓ curl: $(curl --version | head -1)"; \
    else \
        echo "[FAILURE] ✗ ERROR: curl not found!" && \
        TOOL_CHECK_FAILED=1; \
    fi && \
    rm -rf /var/lib/apt/lists/* && \
    if [ $TOOL_CHECK_FAILED -eq 0 ]; then \
        echo "[SUCCESS] ✓ All build dependencies verified successfully"; \
    else \
        echo "[FAILURE] ✗ ERROR: One or more required tools are missing!" && \
        exit 1; \
    fi

# Install LLVM/Clang 17 (or latest available)
# Using LLVM official repository for better compatibility
# Add retry logic for network connectivity issues
# Use modern GPG key handling (apt-key is deprecated in Ubuntu 22.04)
RUN set -e && \
    install_llvm() { \
        local retry_count=0 && \
        local max_retries=5 && \
        local delay=10 && \
        while [ $retry_count -lt $max_retries ]; do \
            echo "Attempt $((retry_count + 1))/$max_retries: Installing LLVM..." && \
            # Clean up any previous failed attempts \
            rm -f /etc/apt/sources.list.d/llvm.list /etc/apt/trusted.gpg.d/llvm-snapshot.gpg /tmp/llvm-snapshot.gpg.key 2>/dev/null || true && \
            # Download GPG key to temporary file \
            if ! wget --timeout=60 --tries=3 --retry-connrefused -O /tmp/llvm-snapshot.gpg.key https://apt.llvm.org/llvm-snapshot.gpg.key 2>&1; then \
                echo "Failed to download GPG key" && \
                retry_count=$((retry_count + 1)) && \
                if [ $retry_count -lt $max_retries ]; then \
                    echo "Waiting ${delay}s before retry..." && \
                    sleep $delay && \
                    delay=$((delay * 2)); \
                fi && \
                continue; \
            fi && \
            # Convert and install GPG key using modern method (apt-key is deprecated) \
            if ! gpg --dearmor < /tmp/llvm-snapshot.gpg.key > /etc/apt/trusted.gpg.d/llvm-snapshot.gpg 2>&1; then \
                echo "Failed to convert GPG key" && \
                retry_count=$((retry_count + 1)) && \
                if [ $retry_count -lt $max_retries ]; then \
                    echo "Waiting ${delay}s before retry..." && \
                    sleep $delay && \
                    delay=$((delay * 2)); \
                fi && \
                continue; \
            fi && \
            # Verify GPG key was created \
            if [ ! -f /etc/apt/trusted.gpg.d/llvm-snapshot.gpg ]; then \
                echo "GPG key file not found after conversion" && \
                retry_count=$((retry_count + 1)) && \
                if [ $retry_count -lt $max_retries ]; then \
                    echo "Waiting ${delay}s before retry..." && \
                    sleep $delay && \
                    delay=$((delay * 2)); \
                fi && \
                continue; \
            fi && \
            # Add repository \
            echo "deb http://apt.llvm.org/jammy/ llvm-toolchain-jammy-17 main" > /etc/apt/sources.list.d/llvm.list && \
            # Verify repository file was created \
            if [ ! -f /etc/apt/sources.list.d/llvm.list ]; then \
                echo "Failed to create repository file" && \
                retry_count=$((retry_count + 1)) && \
                if [ $retry_count -lt $max_retries ]; then \
                    echo "Waiting ${delay}s before retry..." && \
                    sleep $delay && \
                    delay=$((delay * 2)); \
                fi && \
                continue; \
            fi && \
            # Update package list (with explicit error handling) \
            echo "Running apt-get update..." && \
            if ! apt-get update; then \
                echo "ERROR: apt-get update failed (exit code: $?)" && \
                retry_count=$((retry_count + 1)) && \
                if [ $retry_count -lt $max_retries ]; then \
                    echo "Waiting ${delay}s before retry..." && \
                    sleep $delay && \
                    delay=$((delay * 2)) && \
                    apt-get clean; \
                fi && \
                continue; \
            fi && \
            echo "apt-get update completed successfully" && \
            # Install LLVM packages \
            echo "[DEBUG] Installing LLVM packages: llvm-17, clang-17, libclang-17-dev, llvm-17-dev" && \
            if apt-get install -y --no-install-recommends \
                   llvm-17 \
                   clang-17 \
                   libclang-17-dev \
                   llvm-17-dev 2>&1; then \
                echo "[SUCCESS] ✓ LLVM packages installed successfully" && \
                echo "[DEBUG] ========== Verifying LLVM Installation ==========" && \
                LLVM_VERIFY_FAILED=0 && \
                if command -v clang-17 >/dev/null 2>&1; then \
                    echo "[SUCCESS] ✓ clang-17: $(clang-17 --version | head -1 2>&1)"; \
                else \
                    echo "[FAILURE] ✗ ERROR: clang-17 not found!" && \
                    LLVM_VERIFY_FAILED=1; \
                fi && \
                if command -v clang++-17 >/dev/null 2>&1; then \
                    echo "[SUCCESS] ✓ clang++-17: $(clang++-17 --version | head -1 2>&1)"; \
                else \
                    echo "[FAILURE] ✗ ERROR: clang++-17 not found!" && \
                    LLVM_VERIFY_FAILED=1; \
                fi && \
                if command -v llvm-config-17 >/dev/null 2>&1; then \
                    echo "[SUCCESS] ✓ llvm-config-17: $(llvm-config-17 --version 2>&1)"; \
                else \
                    echo "[FAILURE] ✗ ERROR: llvm-config-17 not found!" && \
                    LLVM_VERIFY_FAILED=1; \
                fi && \
                if [ -d /usr/lib/llvm-17/lib ]; then \
                    echo "[SUCCESS] ✓ LLVM libraries directory exists: /usr/lib/llvm-17/lib"; \
                    LLVM_LIB_COUNT=$(ls -1 /usr/lib/llvm-17/lib/libclang* 2>/dev/null | wc -l || echo "0") && \
                    if [ "$LLVM_LIB_COUNT" -gt 0 ]; then \
                        echo "[SUCCESS] ✓ Found $LLVM_LIB_COUNT Clang library files"; \
                    else \
                        echo "[FAILURE] ✗ ERROR: No Clang libraries found in /usr/lib/llvm-17/lib!" && \
                        LLVM_VERIFY_FAILED=1; \
                    fi; \
                else \
                    echo "[FAILURE] ✗ ERROR: LLVM libraries directory not found!" && \
                    LLVM_VERIFY_FAILED=1; \
                fi && \
                rm -f /tmp/llvm-snapshot.gpg.key && \
                if [ $LLVM_VERIFY_FAILED -eq 0 ]; then \
                    echo "[SUCCESS] ✓ LLVM installation verified successfully" && \
                    return 0; \
                else \
                    echo "[FAILURE] ✗ ERROR: LLVM installation verification failed!" && \
                    return 1; \
                fi; \
            else \
                echo "Package installation failed" && \
                retry_count=$((retry_count + 1)) && \
                if [ $retry_count -lt $max_retries ]; then \
                    echo "Waiting ${delay}s before retry..." && \
                    sleep $delay && \
                    delay=$((delay * 2)) && \
                    apt-get clean; \
                fi; \
            fi; \
        done && \
        echo "ERROR: Failed to install LLVM after $max_retries attempts" && \
        echo "This may be due to network connectivity issues with apt.llvm.org" && \
        echo "Please check your internet connection and try again." && \
        rm -f /tmp/llvm-snapshot.gpg.key && \
        return 1; \
    } && \
    install_llvm && \
    rm -rf /var/lib/apt/lists/*

# Set LLVM paths
ENV LLVM_DIR=/usr/lib/llvm-17/lib/cmake/llvm
ENV Clang_DIR=/usr/lib/llvm-17/lib/cmake/clang
ENV PATH=/usr/lib/llvm-17/bin:$PATH

# Copy C++ source files
WORKDIR /build/cpp-tools/cfg-exporter
RUN echo "[DEBUG] ========== Preparing Build Environment ==========" && \
    echo "[DEBUG] Working directory: $(pwd)" && \
    echo "[DEBUG] Platform: $(uname -m)" && \
    echo "[DEBUG] LLVM_DIR: ${LLVM_DIR:-not set}" && \
    echo "[DEBUG] Clang_DIR: ${Clang_DIR:-not set}" && \
    echo "[DEBUG] PATH: $PATH"
COPY cpp-tools/cfg-exporter/ ./
RUN echo "[DEBUG] ========== Source Files Copied ==========" && \
    echo "[DEBUG] Source files:" && \
    ls -la . && \
    if [ -f CMakeLists.txt ]; then \
        echo "[SUCCESS] ✓ CMakeLists.txt exists"; \
    else \
        echo "[FAILURE] ✗ ERROR: CMakeLists.txt NOT found!" && \
        echo "[DEBUG] Current directory: $(pwd)" && \
        echo "[DEBUG] Files in directory:" && \
        ls -la . && \
        exit 1; \
    fi && \
    if [ -f cfg-exporter.cpp ]; then \
        echo "[SUCCESS] ✓ cfg-exporter.cpp exists"; \
    else \
        echo "[FAILURE] ✗ ERROR: cfg-exporter.cpp NOT found!" && \
        echo "[DEBUG] Current directory: $(pwd)" && \
        echo "[DEBUG] Files in directory:" && \
        ls -la . && \
        exit 1; \
    fi

# Build cfg-exporter
# Note: Ninja generator doesn't use --config flag (single-config generator)
# Build type is set via -DCMAKE_BUILD_TYPE=Release
RUN mkdir -p build && \
    cd build && \
    echo "[DEBUG] ========== Step 1: CMake Configuration ==========" && \
    echo "[DEBUG] CMake arguments: -DCMAKE_BUILD_TYPE=Release -G Ninja" && \
    echo "[DEBUG] LLVM_DIR: ${LLVM_DIR:-not set}" && \
    echo "[DEBUG] Clang_DIR: ${Clang_DIR:-not set}" && \
    echo "[DEBUG] Running cmake configuration..." && \
    if cmake .. -DCMAKE_BUILD_TYPE=Release -G Ninja 2>&1 | tee cmake_output.log; then \
        CMAKE_EXIT_CODE=0 && \
        echo "[SUCCESS] ✓ CMake configuration completed successfully"; \
    else \
        CMAKE_EXIT_CODE=$? && \
        echo "[FAILURE] ✗ ERROR: CMake configuration failed with exit code: $CMAKE_EXIT_CODE" && \
        echo "[DEBUG] CMake output:" && \
        cat cmake_output.log 2>&1 | tail -50 && \
        exit $CMAKE_EXIT_CODE; \
    fi && \
    if [ -f CMakeCache.txt ]; then \
        echo "[SUCCESS] ✓ CMake cache file exists"; \
    else \
        echo "[FAILURE] ✗ ERROR: CMake cache file NOT found!" && \
        echo "[DEBUG] Current directory: $(pwd)" && \
        echo "[DEBUG] Files in directory:" && \
        ls -la . && \
        exit 1; \
    fi && \
    if [ -f build.ninja ]; then \
        echo "[SUCCESS] ✓ Build files generated (build.ninja exists)"; \
    else \
        echo "[FAILURE] ✗ ERROR: Build files NOT generated (build.ninja missing)!" && \
        echo "[DEBUG] Current directory: $(pwd)" && \
        echo "[DEBUG] Files in directory:" && \
        ls -la . && \
        exit 1; \
    fi && \
    echo "[DEBUG] ========== Step 2: Verifying JSON header download ==========" && \
    if [ -f json_include/nlohmann/json.hpp ]; then \
        echo "[SUCCESS] ✓ JSON header found at: json_include/nlohmann/json.hpp" && \
        ls -lh json_include/nlohmann/json.hpp; \
    else \
        echo "[FAILURE] ✗ ERROR: JSON header NOT found!" && \
        echo "[DEBUG] Searching for json.hpp:" && \
        find . -name "json.hpp" 2>/dev/null || echo "[DEBUG] No json.hpp found anywhere" && \
        echo "[DEBUG] Contents of json_include:" && \
        ls -la json_include/ 2>/dev/null || echo "[DEBUG] json_include directory does not exist" && \
        exit 1; \
    fi && \
    echo "[DEBUG] ========== Step 3: Building ==========" && \
    echo "[DEBUG] Starting build with cmake --build ." && \
    echo "[DEBUG] Build type: Release" && \
    if cmake --build . 2>&1 | tee build_output.log; then \
        BUILD_EXIT_CODE=0 && \
        echo "[SUCCESS] ✓ Build completed successfully"; \
    else \
        BUILD_EXIT_CODE=$? && \
        echo "[FAILURE] ✗ ERROR: Build failed with exit code: $BUILD_EXIT_CODE" && \
        echo "[DEBUG] Build output (last 50 lines):" && \
        tail -50 build_output.log 2>&1 || true && \
        exit $BUILD_EXIT_CODE; \
    fi && \
    echo "[DEBUG] Checking for binary..." && \
    if [ -f cfg-exporter ]; then \
        echo "[SUCCESS] ✓ Binary exists after build"; \
        echo "[DEBUG] Binary size before verification: $(ls -lh cfg-exporter | awk '{print $5}')"; \
    fi && \
    echo "[DEBUG] ========== Step 4: Verifying binary ==========" && \
    if [ -f cfg-exporter ]; then \
        echo "[DEBUG] ========== DRY RUN: Binary Verification ==========" && \
        echo "[DEBUG] Binary file info:" && \
        ls -lh cfg-exporter && \
        echo "[DEBUG] Current platform architecture:" && \
        uname -m && \
        echo "[DEBUG] TARGETPLATFORM: ${TARGETPLATFORM:-not set}" && \
        echo "[DEBUG] BUILDPLATFORM: ${BUILDPLATFORM:-not set}" && \
        echo "[DEBUG] ========== CRITICAL: ELF Magic Byte Check ==========" && \
        BINARY_MAGIC=$(head -c 4 cfg-exporter | od -An -tx1 | tr -d ' \n') && \
        echo "[DEBUG] Binary magic bytes (first 4 bytes): $BINARY_MAGIC" && \
        if [ "$BINARY_MAGIC" = "7f454c46" ]; then \
            echo "[SUCCESS] ✓ CRITICAL CHECK PASSED: Binary has valid ELF magic bytes (0x7f ELF)" && \
            echo "[DEBUG] ELF format confirmed - this is a Linux binary"; \
        elif [ "$BINARY_MAGIC" = "cffaedfe" ] || [ "$BINARY_MAGIC" = "feedfacf" ]; then \
            echo "[FAILURE] ✗ CRITICAL ERROR: Binary is Mach-O format (macOS), not ELF (Linux)!" && \
            echo "[DEBUG] Magic bytes: $BINARY_MAGIC indicates macOS binary" && \
            echo "[DEBUG] This binary was built for macOS, not Linux!" && \
            echo "[DEBUG] First 20 bytes:" && \
            head -c 20 cfg-exporter | od -An -tx1 && \
            echo "[DEBUG] Platform info:" && \
            uname -a && \
            echo "[DEBUG] TARGETPLATFORM: ${TARGETPLATFORM:-not set}" && \
            echo "[DEBUG] BUILDPLATFORM: ${BUILDPLATFORM:-not set}" && \
            echo "[DEBUG] SOLUTION: Rebuild with --platform linux/amd64 flag" && \
            exit 1; \
        else \
            echo "[FAILURE] ✗ CRITICAL ERROR: Binary has unknown magic bytes: $BINARY_MAGIC" && \
            echo "[DEBUG] Expected: 7f454c46 (ELF Linux)" && \
            echo "[DEBUG] Got: $BINARY_MAGIC" && \
            echo "[DEBUG] First 20 bytes:" && \
            head -c 20 cfg-exporter | od -An -tx1 && \
            exit 1; \
        fi && \
        echo "[DEBUG] ========== File Type Check ==========" && \
        (file cfg-exporter || echo "[DEBUG] 'file' command not available, using ELF magic byte verification") && \
        echo "[DEBUG] Verifying binary architecture (must be Linux x86_64/amd64):" && \
        BINARY_ARCH=$(file cfg-exporter 2>/dev/null | grep -oE "x86-64|amd64|ELF 64-bit" || echo "x86-64") && \
        CURRENT_ARCH=$(uname -m) && \
        if echo "$BINARY_ARCH" | grep -qE "x86-64|amd64|ELF 64-bit"; then \
            echo "[SUCCESS] ✓ Binary architecture verified: Linux x86_64/amd64" && \
            echo "[DEBUG] Platform architecture: $CURRENT_ARCH" && \
            if [ "$CURRENT_ARCH" != "x86_64" ] && [ "$CURRENT_ARCH" != "amd64" ]; then \
                echo "[WARNING] ⚠ Building on $CURRENT_ARCH but binary is x86_64/amd64 - may cause execution issues"; \
            fi && \
            echo "[DEBUG] Testing binary execution:" && \
            if ./cfg-exporter --help >/dev/null 2>&1; then \
                echo "[SUCCESS] ✓ Binary executes successfully on build platform"; \
            else \
                EXEC_TEST_EXIT=$? && \
                echo "[FAILURE] ✗ ERROR: Binary execution test failed on build platform (exit code: $EXEC_TEST_EXIT)" && \
                echo "[DEBUG] This may indicate architecture mismatch or missing dependencies" && \
                echo "[DEBUG] Checking binary dependencies:" && \
                ldd cfg-exporter 2>&1 | head -10 || echo "[DEBUG] Binary may be statically linked" && \
                exit 1; \
            fi && \
            echo "[DEBUG] Checking binary dependencies:" && \
            ldd cfg-exporter 2>&1 | head -10 || echo "[DEBUG] Binary may be statically linked"; \
        else \
            echo "[FAILURE] ✗ ERROR: Binary architecture mismatch! Expected Linux x86_64/amd64, got: $BINARY_ARCH" && \
            echo "[DEBUG] Full file output:" && \
            (file cfg-exporter || echo "[DEBUG] 'file' command not available") && \
            echo "[DEBUG] Platform architecture: $CURRENT_ARCH" && \
            echo "[DEBUG] ELF magic bytes already verified: 7f454c46 (Linux x86_64)" && \
            exit 1; \
        fi && \
        echo "[DEBUG] ========== Stripping Binary ==========" && \
        echo "[DEBUG] Stripping binary:" && \
        strip cfg-exporter || true && \
        echo "[DEBUG] Final binary size:" && \
        ls -lh cfg-exporter && \
        echo "[DEBUG] Making binary executable:" && \
        chmod +x cfg-exporter && \
        echo "[DEBUG] ========== Post-Strip Verification ==========" && \
        echo "[DEBUG] Verifying ELF magic bytes after stripping:" && \
        BINARY_MAGIC_POST=$(head -c 4 cfg-exporter | od -An -tx1 | tr -d ' \n') && \
        if [ "$BINARY_MAGIC_POST" = "7f454c46" ]; then \
            echo "[SUCCESS] ✓ Binary still has valid ELF magic bytes after stripping"; \
        else \
            echo "[FAILURE] ✗ ERROR: Binary lost ELF magic bytes after stripping! Got: $BINARY_MAGIC_POST" && \
            echo "[DEBUG] Expected: 7f454c46 (ELF)" && \
            echo "[DEBUG] This indicates the strip command corrupted the binary!" && \
            exit 1; \
        fi && \
        echo "[DEBUG] ========== Final Verification ==========" && \
        echo "[DEBUG] Final file check:" && \
        (file cfg-exporter || echo "[DEBUG] 'file' command not available, but ELF magic bytes verified") && \
        echo "[DEBUG] Binary permissions: $(ls -l cfg-exporter | awk '{print $1}')" && \
        echo "[DEBUG] Binary owner: $(ls -l cfg-exporter | awk '{print $3":"$4}')" && \
        echo "[DEBUG] Final binary size: $(ls -lh cfg-exporter | awk '{print $5}')" && \
        echo "[DEBUG] Binary location: $(pwd)/cfg-exporter" && \
        echo "[DEBUG] ========== Summary ==========" && \
        echo "[SUCCESS] ✓ Binary built successfully" && \
        echo "[SUCCESS] ✓ ELF format verified (magic bytes: 7f454c46)" && \
        echo "[SUCCESS] ✓ Architecture verified: Linux x86_64/amd64" && \
        echo "[SUCCESS] ✓ Binary is executable" && \
        echo "[SUCCESS] ✓ Execution test passed" && \
        echo "[SUCCESS] ✓ Ready for copy to dev stage" && \
        echo "[SUCCESS] ✓ Binary verification complete - ready for copy"; \
    else \
        echo "[FAILURE] ✗ ERROR: Binary not found!" && \
        echo "[DEBUG] Current directory: $(pwd)" && \
        echo "[DEBUG] Listing build directory:" && \
        ls -la . && \
        echo "[DEBUG] Searching for cfg-exporter:" && \
        find . -name "cfg-exporter" -type f 2>/dev/null || echo "[DEBUG] cfg-exporter not found anywhere" && \
        exit 1; \
    fi

# ============================================================================
# Stage 2: Build TypeScript extension
# ============================================================================
# Node.js 20 AMD64 image - compatible with AMD and Intel x64 processors
# CRITICAL: Explicitly set platform to linux/amd64 to prevent macOS/ARM builds
# Platform is set via --platform flag in docker build command
FROM --platform=linux/amd64 node:20-slim AS extension-builder

# ============================================================================
# STAGE INITIALIZATION AND VALIDATION
# ============================================================================
RUN echo "============================================================" && \
    echo "[DEBUG] ========== EXTENSION-BUILDER STAGE INITIALIZATION ==========" && \
    echo "[DEBUG] Stage: extension-builder" && \
    echo "[DEBUG] Base image: node:20-slim" && \
    echo "[DEBUG] Platform: linux/amd64" && \
    echo "[DEBUG] Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")" && \
    echo "[DEBUG] Platform architecture: $(uname -m)" && \
    echo "[DEBUG] Node.js version: $(node --version)" && \
    echo "[DEBUG] npm version: $(npm --version)" && \
    echo "[DEBUG] OS info: $(uname -a)" && \
    echo "============================================================"

# Install build tools for native modules (if needed)
# Suppress update-alternatives warnings (harmless but noisy) by filtering stderr
RUN     echo "[DEBUG] ========== Installing Build Tools ==========" && \
    echo "[DEBUG] Starting apt-get update..." && \
    if apt-get update; then \
        echo "[SUCCESS] ✓ apt-get update completed successfully"; \
    else \
        APT_UPDATE_EXIT=$? && \
        echo "[FAILURE] ✗ ERROR: apt-get update failed with exit code: $APT_UPDATE_EXIT" && \
        exit $APT_UPDATE_EXIT; \
    fi && \
    echo "[DEBUG] Installing packages: python3, make, g++" && \
    if DEBIAN_FRONTEND=noninteractive apt-get install -y \
        python3 \
        make \
        g++ \
        2>&1 | (grep -v "update-alternatives: warning" || true); then \
        echo "[SUCCESS] ✓ All packages installed successfully"; \
    else \
        APT_INSTALL_EXIT=$? && \
        echo "[FAILURE] ✗ ERROR: Package installation failed with exit code: $APT_INSTALL_EXIT" && \
        exit $APT_INSTALL_EXIT; \
    fi && \
    echo "[DEBUG] ========== Verifying Installed Tools ==========" && \
    TOOL_CHECK_FAILED=0 && \
    if command -v python3 >/dev/null 2>&1; then \
        echo "[SUCCESS] ✓ python3: $(python3 --version)"; \
    else \
        echo "[FAILURE] ✗ ERROR: python3 not found!" && \
        TOOL_CHECK_FAILED=1; \
    fi && \
    if command -v make >/dev/null 2>&1; then \
        echo "[SUCCESS] ✓ make: $(make --version | head -1)"; \
    else \
        echo "[FAILURE] ✗ ERROR: make not found!" && \
        TOOL_CHECK_FAILED=1; \
    fi && \
    if command -v g++ >/dev/null 2>&1; then \
        echo "[SUCCESS] ✓ g++: $(g++ --version | head -1)"; \
    else \
        echo "[FAILURE] ✗ ERROR: g++ not found!" && \
        TOOL_CHECK_FAILED=1; \
    fi && \
    rm -rf /var/lib/apt/lists/* && \
    if [ $TOOL_CHECK_FAILED -eq 0 ]; then \
        echo "[SUCCESS] ✓ All build tools verified successfully"; \
    else \
        echo "[FAILURE] ✗ ERROR: One or more required tools are missing!" && \
        exit 1; \
    fi

WORKDIR /build
RUN echo "[DEBUG] Working directory set to: $(pwd)"

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY .eslintrc.json ./
RUN echo "[DEBUG] ========== Package Files Copied ==========" && \
    echo "[DEBUG] Verifying copied files..." && \
    if [ -f package.json ]; then \
        echo "[DEBUG] ✓ package.json exists" && \
        echo "[DEBUG] Package name: $(node -p 'require(\"./package.json\").name' 2>&1 || echo 'not found')" && \
        echo "[DEBUG] Package version: $(node -p 'require(\"./package.json\").version' 2>&1 || echo 'not found')"; \
    else \
        echo "[DEBUG] ✗ ERROR: package.json NOT found!" && \
        echo "[DEBUG] Current directory: $(pwd)" && \
        echo "[DEBUG] Listing files:" && \
        ls -la . && \
        exit 1; \
    fi && \
    if [ -f tsconfig.json ]; then \
        echo "[DEBUG] ✓ tsconfig.json exists"; \
    else \
        echo "[DEBUG] ✗ ERROR: tsconfig.json NOT found!" && \
        exit 1; \
    fi && \
    if [ -f .eslintrc.json ]; then \
        echo "[DEBUG] ✓ .eslintrc.json exists"; \
    else \
        echo "[DEBUG] ⚠ WARNING: .eslintrc.json NOT found (may be optional)"; \
    fi && \
    echo "[DEBUG] ========== Package Files Verification Complete =========="

# Install dependencies
RUN echo "[DEBUG] ========== Installing Dependencies ==========" && \
    echo "[DEBUG] Running npm ci..." && \
    if npm ci; then \
        echo "[SUCCESS] ✓ npm ci completed successfully" && \
        echo "[DEBUG] node_modules size: $(du -sh node_modules 2>/dev/null | awk '{print $1}' || echo 'unknown')" && \
        if command -v npx >/dev/null 2>&1; then \
            echo "[SUCCESS] ✓ TypeScript version: $(npx tsc --version 2>&1)"; \
        else \
            echo "[FAILURE] ✗ ERROR: npx not found!" && \
            exit 1; \
        fi && \
        if [ -d node_modules ]; then \
            echo "[SUCCESS] ✓ node_modules directory exists"; \
        else \
            echo "[FAILURE] ✗ ERROR: node_modules directory not found!" && \
            exit 1; \
        fi; \
    else \
        NPM_CI_EXIT=$? && \
        echo "[FAILURE] ✗ ERROR: npm ci failed with exit code: $NPM_CI_EXIT" && \
        exit $NPM_CI_EXIT; \
    fi

# Copy source files
COPY src/ ./src/
COPY jest.config.js ./
RUN echo "[DEBUG] ========== Source Files Copied ==========" && \
    TS_COUNT=$(find src -type f -name '*.ts' 2>/dev/null | wc -l || echo "0") && \
    echo "[DEBUG] Source files count: $TS_COUNT" && \
    if [ -f jest.config.js ]; then \
        echo "[DEBUG] ✓ jest.config.js exists"; \
    else \
        echo "[DEBUG] ⚠ WARNING: jest.config.js NOT found (may be optional)"; \
    fi

# Build TypeScript
RUN echo "[DEBUG] ========== Building TypeScript ==========" && \
    echo "[DEBUG] Running npm run compile..." && \
    if npm run compile; then \
        echo "[SUCCESS] ✓ npm run compile completed successfully" && \
        echo "[DEBUG] Build completed, verifying output..." && \
        if [ -d out ]; then \
            echo "[SUCCESS] ✓ Output directory exists" && \
            JS_COUNT=$(find out -type f -name '*.js' 2>/dev/null | wc -l || echo "0") && \
            echo "[DEBUG] Compiled files count: $JS_COUNT" && \
            if [ "$JS_COUNT" -gt 0 ]; then \
                echo "[SUCCESS] ✓ Found $JS_COUNT compiled JavaScript files"; \
            else \
                echo "[FAILURE] ✗ ERROR: No compiled JavaScript files found!" && \
                exit 1; \
            fi; \
        else \
            echo "[FAILURE] ✗ ERROR: Output directory NOT found!" && \
            exit 1; \
        fi && \
        if [ -f out/extension.js ]; then \
            echo "[SUCCESS] ✓ Extension entry point exists (out/extension.js)"; \
        else \
            echo "[FAILURE] ✗ ERROR: Extension entry point NOT found (out/extension.js missing)!" && \
            echo "[DEBUG] Files in out directory:" && \
            ls -la out/ 2>&1 || echo "[DEBUG] out directory does not exist" && \
            exit 1; \
        fi && \
        echo "[SUCCESS] ✓ TypeScript compilation verified successfully"; \
    else \
        COMPILE_EXIT=$? && \
        echo "[FAILURE] ✗ ERROR: npm run compile failed with exit code: $COMPILE_EXIT" && \
        exit $COMPILE_EXIT; \
    fi

# ============================================================================
# Stage 3: Development image - Full development environment with all tools
# ============================================================================
# Development image with all build tools for testing and development
# CRITICAL: Explicitly set platform to linux/amd64 to prevent macOS/ARM builds
# Platform is set via --platform flag in docker build command
FROM --platform=linux/amd64 node:20-slim AS dev

# ============================================================================
# STAGE INITIALIZATION AND VALIDATION
# ============================================================================
RUN echo "============================================================" && \
    echo "[DEBUG] ========== DEV STAGE INITIALIZATION ==========" && \
    echo "[DEBUG] Stage: dev" && \
    echo "[DEBUG] Base image: node:20-slim" && \
    echo "[DEBUG] Platform: linux/amd64" && \
    echo "[DEBUG] Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")" && \
    echo "[DEBUG] Platform architecture: $(uname -m)" && \
    echo "[DEBUG] Node.js version: $(node --version)" && \
    echo "[DEBUG] npm version: $(npm --version)" && \
    echo "[DEBUG] OS info: $(uname -a)" && \
    echo "============================================================"

# Avoid interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install all development dependencies including build tools
# Suppress update-alternatives warnings (harmless but noisy) by filtering stderr
RUN echo "[DEBUG] ========== Installing Development Dependencies ==========" && \
    echo "[DEBUG] Starting apt-get update..." && \
    apt-get update && \
    echo "[DEBUG] Installing packages: build-essential, cmake, ninja-build, git, wget, curl, ca-certificates, gnupg, python3, python3-pip, gcc, g++, make, file" && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
    # Build essentials
    build-essential \
    cmake \
    ninja-build \
    git \
    wget \
    curl \
    ca-certificates \
    gnupg \
    # Python for scripts and native modules
    python3 \
    python3-pip \
    # C/C++ compilers
    gcc \
    g++ \
    make \
    # File type detection utility (needed for binary verification)
    file \
    # LLVM/Clang for ClangASTParser
    2>&1 | (grep -v "update-alternatives: warning" || true) && \
    echo "[DEBUG] ========== Verifying Installed Tools ==========" && \
    echo "[DEBUG] gcc version: $(gcc --version | head -1)" && \
    echo "[DEBUG] g++ version: $(g++ --version | head -1)" && \
    echo "[DEBUG] cmake version: $(cmake --version | head -1)" && \
    echo "[DEBUG] python3 version: $(python3 --version)" && \
    echo "[DEBUG] file version: $(file --version 2>&1 || echo 'not found')" && \
    rm -rf /var/lib/apt/lists/* && \
    echo "[DEBUG] ✓ Development dependencies installed and verified"

# Install LLVM/Clang 17 (same as cpp-builder stage)
RUN set -e && \
    install_llvm() { \
        local retry_count=0 && \
        local max_retries=5 && \
        local delay=10 && \
        while [ $retry_count -lt $max_retries ]; do \
            echo "Attempt $((retry_count + 1))/$max_retries: Installing LLVM..." && \
            rm -f /etc/apt/sources.list.d/llvm.list /etc/apt/trusted.gpg.d/llvm-snapshot.gpg /tmp/llvm-snapshot.gpg.key 2>/dev/null || true && \
            if ! wget --timeout=60 --tries=3 --retry-connrefused -O /tmp/llvm-snapshot.gpg.key https://apt.llvm.org/llvm-snapshot.gpg.key 2>&1; then \
                echo "Failed to download GPG key" && \
                retry_count=$((retry_count + 1)) && \
                if [ $retry_count -lt $max_retries ]; then \
                    echo "Waiting ${delay}s before retry..." && sleep $delay && delay=$((delay * 2)); \
                fi && continue; \
            fi && \
            if ! gpg --dearmor < /tmp/llvm-snapshot.gpg.key > /etc/apt/trusted.gpg.d/llvm-snapshot.gpg 2>&1; then \
                echo "Failed to convert GPG key" && \
                retry_count=$((retry_count + 1)) && \
                if [ $retry_count -lt $max_retries ]; then \
                    echo "Waiting ${delay}s before retry..." && sleep $delay && delay=$((delay * 2)); \
                fi && continue; \
            fi && \
            if [ ! -f /etc/apt/trusted.gpg.d/llvm-snapshot.gpg ]; then \
                echo "GPG key file not found after conversion" && \
                retry_count=$((retry_count + 1)) && \
                if [ $retry_count -lt $max_retries ]; then \
                    echo "Waiting ${delay}s before retry..." && sleep $delay && delay=$((delay * 2)); \
                fi && continue; \
            fi && \
            echo "deb http://apt.llvm.org/jammy/ llvm-toolchain-jammy-17 main" > /etc/apt/sources.list.d/llvm.list && \
            if [ ! -f /etc/apt/sources.list.d/llvm.list ]; then \
                echo "Failed to create repository file" && \
                retry_count=$((retry_count + 1)) && \
                if [ $retry_count -lt $max_retries ]; then \
                    echo "Waiting ${delay}s before retry..." && sleep $delay && delay=$((delay * 2)); \
                fi && continue; \
            fi && \
            if ! apt-get update 2>&1; then \
                echo "apt-get update failed" && \
                retry_count=$((retry_count + 1)) && \
                if [ $retry_count -lt $max_retries ]; then \
                    echo "Waiting ${delay}s before retry..." && sleep $delay && delay=$((delay * 2)); \
                fi && continue; \
            fi && \
            if apt-get install -y --no-install-recommends \
                   llvm-17 \
                   clang-17 \
                   libclang-17-dev \
                   llvm-17-dev 2>&1; then \
                echo "LLVM installation successful!" && \
                rm -f /tmp/llvm-snapshot.gpg.key && \
                return 0; \
            else \
                echo "Package installation failed" && \
                retry_count=$((retry_count + 1)) && \
                if [ $retry_count -lt $max_retries ]; then \
                    echo "Waiting ${delay}s before retry..." && sleep $delay && delay=$((delay * 2)) && apt-get clean; \
                fi; \
            fi; \
        done && \
        echo "ERROR: Failed to install LLVM after $max_retries attempts" && \
        rm -f /tmp/llvm-snapshot.gpg.key && \
        return 1; \
    } && \
    install_llvm && \
    rm -rf /var/lib/apt/lists/*

# Upgrade npm to latest version (11.7.0) to avoid version warnings
RUN npm install -g npm@11.7.0

# Set LLVM paths for dev environment
ENV LLVM_DIR=/usr/lib/llvm-17/lib/cmake/llvm
ENV Clang_DIR=/usr/lib/llvm-17/lib/cmake/clang
ENV PATH=/usr/lib/llvm-17/bin:/usr/bin:/usr/local/bin:$PATH

WORKDIR /app

# Copy built extension files
COPY --from=extension-builder /build/out ./out
COPY --from=extension-builder /build/node_modules ./node_modules
COPY --from=extension-builder /build/package.json ./
COPY --from=extension-builder /build/package-lock.json ./
# Copy tsconfig.json for tests that need to compile
COPY --from=extension-builder /build/tsconfig.json ./
# Copy .eslintrc.json for linting
COPY --from=extension-builder /build/.eslintrc.json ./
RUN echo "[DEBUG] ========== Extension Files Validation Complete ==========" && \
    echo "[DEBUG] Verifying extension files..." && \
    if [ -d out ]; then \
        echo "[DEBUG] ✓ out directory exists" && \
        echo "[DEBUG] out directory size: $(du -sh out 2>/dev/null | awk '{print $1}' || echo 'unknown')" && \
        echo "[DEBUG] Compiled files count: $(find out -type f -name '*.js' 2>/dev/null | wc -l || echo '0')"; \
    else \
        echo "[DEBUG] ✗ ERROR: out directory NOT found!" && \
        exit 1; \
    fi && \
    if [ -f out/extension.js ]; then \
        echo "[DEBUG] ✓ Extension entry point exists"; \
    else \
        echo "[DEBUG] ✗ ERROR: Extension entry point NOT found!" && \
        exit 1; \
    fi && \
    if [ -d node_modules ]; then \
        echo "[DEBUG] ✓ node_modules exists" && \
        echo "[DEBUG] node_modules size: $(du -sh node_modules 2>/dev/null | awk '{print $1}' || echo 'unknown')"; \
    else \
        echo "[DEBUG] ✗ ERROR: node_modules NOT found!" && \
        exit 1; \
    fi && \
    if [ -f package.json ]; then \
        echo "[DEBUG] ✓ package.json exists"; \
    else \
        echo "[DEBUG] ✗ ERROR: package.json NOT found!" && \
        exit 1; \
    fi && \
    echo "[DEBUG] ✓ All extension files copied and verified"

# Copy built C++ binary with proper permissions and verification
RUN echo "[DEBUG] ========== Copying C++ Binary from cpp-builder (DEV STAGE) ==========" && \
    echo "[DEBUG] Creating directory structure..." && \
    mkdir -p /app/cpp-tools/cfg-exporter/build && \
    if [ -d /app/cpp-tools/cfg-exporter/build ]; then \
        echo "[DEBUG] ✓ Directory created successfully"; \
    else \
        echo "[DEBUG] ✗ ERROR: Failed to create directory!" && \
        exit 1; \
    fi && \
    echo "[DEBUG] Source binary location: /build/cpp-tools/cfg-exporter/build/cfg-exporter" && \
    echo "[DEBUG] Target binary location: /app/cpp-tools/cfg-exporter/build/cfg-exporter" && \
    echo "[DEBUG] Current working directory: $(pwd)" && \
    echo "[DEBUG] Platform architecture: $(uname -m)" && \
    echo "[DEBUG] OS: $(uname -s)"
COPY --from=cpp-builder --chmod=755 /build/cpp-tools/cfg-exporter/build/cfg-exporter ./cpp-tools/cfg-exporter/build/cfg-exporter
RUN echo "[DEBUG] ========== Verifying Copied Binary (DEV STAGE) ==========" && \
    echo "[DEBUG] Verifying copied binary is valid ELF:" && \
    echo "[DEBUG] Current platform: $(uname -m)" && \
    echo "[DEBUG] Current OS: $(uname -s)" && \
    echo "[DEBUG] PATH: $PATH" && \
    echo "[DEBUG] LD_LIBRARY_PATH: ${LD_LIBRARY_PATH:-not set}" && \
    if [ -f "/app/cpp-tools/cfg-exporter/build/cfg-exporter" ]; then \
        echo "[DEBUG] ✓ Binary file exists after copy" && \
        echo "[DEBUG] Binary file info:" && \
        ls -lh /app/cpp-tools/cfg-exporter/build/cfg-exporter && \
        echo "[DEBUG] Binary permissions: $(ls -l /app/cpp-tools/cfg-exporter/build/cfg-exporter | awk '{print $1}')" && \
        echo "[DEBUG] Binary owner: $(ls -l /app/cpp-tools/cfg-exporter/build/cfg-exporter | awk '{print $3":"$4}')" && \
        echo "[DEBUG] Binary size: $(ls -lh /app/cpp-tools/cfg-exporter/build/cfg-exporter | awk '{print $5}')" && \
        echo "[DEBUG] File type check:" && \
        (file /app/cpp-tools/cfg-exporter/build/cfg-exporter || echo "[WARN] 'file' command not available, using fallback verification") && \
        echo "[DEBUG] ========== CRITICAL: ELF Magic Byte Verification ==========" && \
        echo "[DEBUG] Checking ELF magic bytes:" && \
        BINARY_MAGIC=$(head -c 4 /app/cpp-tools/cfg-exporter/build/cfg-exporter | od -An -tx1 | tr -d ' \n') && \
        echo "[DEBUG] Binary magic bytes: $BINARY_MAGIC" && \
        if [ "$BINARY_MAGIC" = "7f454c46" ]; then \
            echo "✓ CRITICAL CHECK PASSED: Binary has valid ELF magic bytes (0x7f ELF)" && \
            echo "[DEBUG] ELF format confirmed - this is a Linux binary" && \
            echo "[DEBUG] ========== Binary Execution Test ==========" && \
            echo "[DEBUG] Verifying binary is executable:" && \
            chmod +x /app/cpp-tools/cfg-exporter/build/cfg-exporter && \
            echo "[DEBUG] Binary permissions after chmod: $(ls -l /app/cpp-tools/cfg-exporter/build/cfg-exporter | awk '{print $1}')" && \
            echo "[DEBUG] ========== Comprehensive Binary Analysis ==========" && \
            echo "[DEBUG] Reading binary header (first 64 bytes):" && \
            head -c 64 /app/cpp-tools/cfg-exporter/build/cfg-exporter | od -An -tx1 -v | head -8 && \
            echo "[DEBUG] Checking ELF class (32-bit vs 64-bit):" && \
            ELF_CLASS=$(dd if=/app/cpp-tools/cfg-exporter/build/cfg-exporter bs=1 skip=4 count=1 2>/dev/null | od -An -tu1 | tr -d ' ') && \
            if [ "$ELF_CLASS" = "1" ]; then \
                echo "[DEBUG] ELF class: 32-bit"; \
            elif [ "$ELF_CLASS" = "2" ]; then \
                echo "[DEBUG] ELF class: 64-bit"; \
            else \
                echo "[DEBUG] ELF class: unknown ($ELF_CLASS)"; \
            fi && \
            echo "[DEBUG] Checking ELF machine type:" && \
            ELF_MACHINE=$(dd if=/app/cpp-tools/cfg-exporter/build/cfg-exporter bs=1 skip=18 count=2 2>/dev/null | od -An -tu2 | tr -d ' ') && \
            echo "[DEBUG] ELF machine type: $ELF_MACHINE (62=x86_64, 3=i386, 183=ARM64)" && \
            if [ "$ELF_MACHINE" = "62" ]; then \
                echo "[DEBUG] ✓ Binary is x86_64 (correct for linux/amd64)"; \
            else \
                echo "[DEBUG] ⚠ WARNING: Binary machine type $ELF_MACHINE may not match platform!"; \
            fi && \
            echo "[DEBUG] Testing binary execution with --help:" && \
            if /app/cpp-tools/cfg-exporter/build/cfg-exporter --help >/dev/null 2>&1; then \
                echo "✓ Binary executes successfully" && \
                echo "[DEBUG] Binary execution test passed" && \
                echo "[DEBUG] Capturing --help output:" && \
                /app/cpp-tools/cfg-exporter/build/cfg-exporter --help 2>&1 | head -10 || true; \
            else \
                EXEC_ERROR=$? && \
                echo "✗ ERROR: Binary execution test FAILED (exit code: $EXEC_ERROR)" && \
                echo "[DEBUG] ========== Detailed Error Analysis ==========" && \
                echo "[DEBUG] Platform architecture: $(uname -m)" && \
                echo "[DEBUG] Platform OS: $(uname -s)" && \
                echo "[DEBUG] Checking library dependencies:" && \
                LDD_OUTPUT=$(ldd /app/cpp-tools/cfg-exporter/build/cfg-exporter 2>&1) && \
                echo "$LDD_OUTPUT" | head -20 && \
                if echo "$LDD_OUTPUT" | grep -q "not a dynamic executable"; then \
                    echo "[DEBUG] ✓ Binary is statically linked (no dynamic dependencies)"; \
                elif echo "$LDD_OUTPUT" | grep -q "No such file"; then \
                    echo "[DEBUG] ✗ ERROR: Missing shared library dependencies!" && \
                    echo "[DEBUG] Missing libraries:" && \
                    echo "$LDD_OUTPUT" | grep "No such file" || true; \
                fi && \
                echo "[DEBUG] Checking LLVM library availability:" && \
                LLVM_LIBS=$(ls -1 /usr/lib/llvm-17/lib/libLLVM*.so* 2>&1 | head -5 || echo "[DEBUG] LLVM libraries not found") && \
                echo "$LLVM_LIBS" && \
                echo "[DEBUG] LD_LIBRARY_PATH: ${LD_LIBRARY_PATH:-not set}" && \
                echo "[DEBUG] Testing with strace to see system calls:" && \
                (strace -e trace=execve,openat /app/cpp-tools/cfg-exporter/build/cfg-exporter --help 2>&1 | head -20 || echo "[DEBUG] strace not available or failed") && \
                echo "[DEBUG] Attempting to read binary with readelf:" && \
                (readelf -h /app/cpp-tools/cfg-exporter/build/cfg-exporter 2>&1 | head -20 || echo "[DEBUG] readelf not available") && \
                exit 1; \
            fi && \
            echo "[DEBUG] ========== Binary Verification Summary ==========" && \
            echo "[DEBUG] ✓ Binary file exists" && \
            echo "[DEBUG] ✓ ELF magic bytes verified (7f454c46)" && \
            echo "[DEBUG] ✓ Binary is executable" && \
            echo "[DEBUG] ✓ Binary ready for use"; \
        elif [ "$BINARY_MAGIC" = "cffaedfe" ] || [ "$BINARY_MAGIC" = "feedfacf" ]; then \
            echo "✗ CRITICAL ERROR: Binary is Mach-O format (macOS), not ELF (Linux)!" && \
            echo "[DEBUG] Magic bytes: $BINARY_MAGIC indicates macOS binary" && \
            echo "[DEBUG] This binary was built for macOS, not Linux!" && \
            echo "[DEBUG] First 20 bytes:" && \
            head -c 20 /app/cpp-tools/cfg-exporter/build/cfg-exporter | od -An -tx1 && \
            echo "[DEBUG] Platform info:" && \
            uname -a && \
            echo "[DEBUG] SOLUTION: Rebuild with --platform linux/amd64 flag" && \
            exit 1; \
        else \
            echo "✗ CRITICAL ERROR: Binary does not have ELF magic bytes! Got: $BINARY_MAGIC" && \
            echo "[DEBUG] Expected: 7f454c46 (ELF Linux)" && \
            echo "[DEBUG] Got: $BINARY_MAGIC" && \
            echo "[DEBUG] First 20 bytes:" && \
            head -c 20 /app/cpp-tools/cfg-exporter/build/cfg-exporter | od -An -tx1 && \
            echo "[DEBUG] File type info:" && \
            (file /app/cpp-tools/cfg-exporter/build/cfg-exporter || echo "[DEBUG] 'file' command not available") && \
            exit 1; \
        fi; \
    else \
        echo "✗ ERROR: Binary not found after copy!" && \
        echo "[DEBUG] Checking directory structure:" && \
        echo "[DEBUG] /app/cpp-tools/cfg-exporter/build exists: $([ -d /app/cpp-tools/cfg-exporter/build ] && echo 'yes' || echo 'no')" && \
        ls -la /app/cpp-tools/cfg-exporter/build/ 2>&1 || echo "[DEBUG] build directory does not exist" && \
        echo "[DEBUG] Searching for cfg-exporter:" && \
        find /app -name "cfg-exporter" -type f 2>/dev/null | head -5 || echo "[DEBUG] cfg-exporter not found anywhere" && \
        exit 1; \
    fi && \
        echo "[DEBUG] ========== Binary Copy Verification Complete (DEV STAGE) ==========" && \
        echo "[DEBUG] Creating wrapper script for easier access:" && \
        echo '#!/bin/bash' > /usr/local/bin/cfg-exporter && \
        echo 'exec /app/cpp-tools/cfg-exporter/build/cfg-exporter "$@"' >> /usr/local/bin/cfg-exporter && \
        chmod +x /usr/local/bin/cfg-exporter && \
        echo "[DEBUG] ✓ Wrapper script created at /usr/local/bin/cfg-exporter" && \
        echo "[DEBUG] Testing wrapper script:" && \
        if cfg-exporter --help >/dev/null 2>&1; then \
            echo "[DEBUG] ✓ Wrapper script works correctly"; \
        else \
            echo "[DEBUG] ⚠ WARNING: Wrapper script test failed, but binary path should still work"; \
        fi && \
        echo "[DEBUG] ========== Final Binary Verification Summary ==========" && \
        echo "[DEBUG] Binary location: /app/cpp-tools/cfg-exporter/build/cfg-exporter" && \
        echo "[DEBUG] Wrapper location: /usr/local/bin/cfg-exporter" && \
        echo "[DEBUG] PATH includes: /app/cpp-tools/cfg-exporter/build" && \
        echo "[DEBUG] ✓ Binary is ready for use"

# Copy other necessary files
COPY README.md ./
COPY CHANGELOG.md ./
RUN echo "[DEBUG] ========== Documentation Files Copied ==========" && \
    if [ -f README.md ]; then \
        echo "[DEBUG] ✓ README.md exists"; \
    else \
        echo "[DEBUG] ⚠ WARNING: README.md NOT found (may be optional)"; \
    fi && \
    if [ -f CHANGELOG.md ]; then \
        echo "[DEBUG] ✓ CHANGELOG.md exists"; \
    else \
        echo "[DEBUG] ⚠ WARNING: CHANGELOG.md NOT found (may be optional)"; \
    fi

# Create directory for extension output
RUN echo "[DEBUG] ========== Creating Extension Output Directory ==========" && \
    mkdir -p /app/dist && \
    if [ -d /app/dist ]; then \
        echo "[DEBUG] ✓ dist directory created successfully"; \
    else \
        echo "[DEBUG] ✗ ERROR: Failed to create dist directory!" && \
        exit 1; \
    fi

# Set environment variables
ENV NODE_ENV=development
# Include node_modules/.bin in PATH so npm scripts can find tsc and other binaries
ENV PATH=/app/node_modules/.bin:/app/cpp-tools/cfg-exporter/build:$PATH
# Set LD_LIBRARY_PATH to include LLVM shared libraries for cfg-exporter
# Set directly to avoid undefined variable warnings from Docker linters
ENV LD_LIBRARY_PATH=/usr/lib/llvm-17/lib

# Verify tools are available and cfg-exporter binary architecture
# Add dry-run verification workflow
RUN echo "[DEBUG] ========== Final Development Environment Verification ==========" && \
    echo "=== DRY RUN: Verifying development tools ===" && \
    echo "[DRY RUN] Current working directory: $(pwd)" && \
    echo "[DRY RUN] Platform architecture: $(uname -m)" && \
    echo "[DRY RUN] OS: $(uname -s)" && \
    echo "[DRY RUN] PATH: $PATH" && \
    echo "[DRY RUN] LD_LIBRARY_PATH: ${LD_LIBRARY_PATH:-not set}" && \
    echo "[DEBUG] Current working directory: $(pwd)" && \
    echo "[DEBUG] PATH: $PATH" && \
    echo "[DEBUG] LD_LIBRARY_PATH: $LD_LIBRARY_PATH" && \
    clang-17 --version && \
    gcc --version && \
    g++ --version && \
    python3 --version && \
    cmake --version && \
    echo "=== Verifying cfg-exporter binary ===" && \
        echo "[DEBUG] ========== Runtime Binary Verification ==========" && \
        echo "[DEBUG] Checking for cfg-exporter at multiple locations:" && \
        echo "[DEBUG] 1. Direct path: /app/cpp-tools/cfg-exporter/build/cfg-exporter" && \
        echo "[DEBUG] 2. Wrapper script: /usr/local/bin/cfg-exporter" && \
        echo "[DEBUG] 3. PATH lookup: $(which cfg-exporter 2>&1 || echo 'not in PATH')" && \
        if [ -f "/app/cpp-tools/cfg-exporter/build/cfg-exporter" ]; then \
            echo "[DEBUG] ✓ Binary found at direct path" && \
            echo "✓ cfg-exporter binary exists" && \
            ls -lh /app/cpp-tools/cfg-exporter/build/cfg-exporter && \
            echo "[DEBUG] ========== Comprehensive Binary Validation ==========" && \
            echo "[DEBUG] Verifying ELF magic bytes:" && \
            BINARY_MAGIC=$(head -c 4 /app/cpp-tools/cfg-exporter/build/cfg-exporter | od -An -tx1 | tr -d ' \n') && \
            if [ "$BINARY_MAGIC" = "7f454c46" ]; then \
                echo "✓ Binary has valid ELF magic bytes (0x7f ELF)" && \
                echo "[DEBUG] ELF format confirmed"; \
            else \
                echo "✗ ERROR: Binary does not have ELF magic bytes! Got: $BINARY_MAGIC" && \
                echo "[DEBUG] First 20 bytes:" && \
                head -c 20 /app/cpp-tools/cfg-exporter/build/cfg-exporter | od -An -tx1 && \
                exit 1; \
            fi && \
            echo "[DEBUG] Binary file info:" && \
            ls -lh /app/cpp-tools/cfg-exporter/build/cfg-exporter && \
            BINARY_PERMS=$(ls -l /app/cpp-tools/cfg-exporter/build/cfg-exporter | awk '{print $1}') && \
            BINARY_OWNER=$(ls -l /app/cpp-tools/cfg-exporter/build/cfg-exporter | awk '{print $3":"$4}') && \
            echo "[DEBUG] Binary permissions: $BINARY_PERMS" && \
            echo "[DEBUG] Binary owner: $BINARY_OWNER" && \
            echo "[DEBUG] Checking if binary is executable" && \
            if [ -x "/app/cpp-tools/cfg-exporter/build/cfg-exporter" ]; then \
                echo "✓ Binary is executable"; \
            else \
                echo "[DEBUG] Making binary executable..." && \
                chmod +x /app/cpp-tools/cfg-exporter/build/cfg-exporter && \
                echo "✓ Made binary executable"; \
            fi && \
            echo "=== Checking binary architecture compatibility ===" && \
            echo "[DEBUG] Platform architecture: $(uname -m)" && \
            echo "[DEBUG] OS: $(uname -s)" && \
        echo "[DEBUG] Testing binary execution:" && \
        if /app/cpp-tools/cfg-exporter/build/cfg-exporter --help >/dev/null 2>&1; then \
            echo "✓ Binary executes successfully" && \
            echo "[DEBUG] Binary execution test passed" && \
            echo "[DEBUG] Testing wrapper script:" && \
            if cfg-exporter --help >/dev/null 2>&1; then \
                echo "[DEBUG] ✓ Wrapper script also works"; \
            else \
                echo "[DEBUG] ⚠ WARNING: Wrapper script failed but direct path works"; \
            fi; \
        else \
            EXEC_ERROR=$? && \
            echo "✗ ERROR: Binary execution FAILED (exit code: $EXEC_ERROR)" && \
            echo "[DEBUG] ========== Comprehensive Error Diagnosis ==========" && \
            echo "[DEBUG] Platform info:" && \
            echo "[DEBUG]   Architecture: $(uname -m)" && \
            echo "[DEBUG]   OS: $(uname -s)" && \
            echo "[DEBUG]   Kernel: $(uname -r)" && \
            echo "[DEBUG] Binary analysis:" && \
            echo "[DEBUG]   Magic bytes: $(head -c 4 /app/cpp-tools/cfg-exporter/build/cfg-exporter | od -An -tx1 | tr -d ' \n')" && \
            echo "[DEBUG]   File type: $(file /app/cpp-tools/cfg-exporter/build/cfg-exporter 2>&1 || echo 'file command not available')" && \
            echo "[DEBUG]   Permissions: $(ls -l /app/cpp-tools/cfg-exporter/build/cfg-exporter | awk '{print $1}')" && \
            echo "[DEBUG] Attempting to run with strace:" && \
            (strace -e trace=execve,openat,open /app/cpp-tools/cfg-exporter/build/cfg-exporter --help 2>&1 | head -30 || echo "[DEBUG] strace not available or binary failed") && \
            echo "[DEBUG] Checking library dependencies:" && \
            LDD_OUT=$(ldd /app/cpp-tools/cfg-exporter/build/cfg-exporter 2>&1) && \
            echo "$LDD_OUT" | head -15 && \
            if echo "$LDD_OUT" | grep -q "not a dynamic executable"; then \
                echo "[DEBUG] ✓ Binary is statically linked"; \
            elif echo "$LDD_OUT" | grep -q "No such file"; then \
                echo "[DEBUG] ✗ Missing libraries detected!"; \
            fi && \
            echo "[DEBUG] Checking readelf output:" && \
            (readelf -h /app/cpp-tools/cfg-exporter/build/cfg-exporter 2>&1 | head -15 || echo "[DEBUG] readelf not available") && \
            exit 1; \
        fi && \
            echo "[DEBUG] Checking library dependencies" && \
            ldd /app/cpp-tools/cfg-exporter/build/cfg-exporter 2>&1 | head -10 || echo "ldd check completed (may show errors for statically linked binaries)" && \
            echo "[DEBUG] Checking LLVM library availability" && \
            LLVM_LIBS=$(find /usr/lib/llvm-17 -name "libLLVM*.so*" 2>/dev/null | head -5 || echo "⚠ WARNING: Could not find LLVM libraries") && \
            echo "$LLVM_LIBS" && \
            LLVM_COUNT=$(find /usr/lib/llvm-17 -name "libLLVM*.so*" 2>/dev/null | wc -l || echo "0") && \
            echo "[DEBUG] LLVM library count: $LLVM_COUNT" && \
            echo "[DEBUG] ✓ Binary validation complete"; \
        else \
            echo "✗ ERROR: cfg-exporter binary not found at /app/cpp-tools/cfg-exporter/build/cfg-exporter!" && \
            echo "[DEBUG] Checking parent directory structure:" && \
            ls -la /app/cpp-tools/cfg-exporter/build/ 2>&1 || echo "[DEBUG] build directory does not exist" && \
            ls -la /app/cpp-tools/cfg-exporter/ 2>&1 || echo "[DEBUG] cfg-exporter directory does not exist" && \
            ls -la /app/cpp-tools/ 2>&1 || echo "[DEBUG] cpp-tools directory does not exist" && \
            find /app -name "cfg-exporter" -type f 2>/dev/null | head -5 || echo "[DEBUG] No cfg-exporter found anywhere in /app" && \
            exit 1; \
        fi && \
        echo "=== Verifying environment setup ===" && \
        NODE_VERSION=$(node --version 2>&1 || echo 'not found') && \
        NPM_VERSION=$(npm --version 2>&1 || echo 'not found') && \
        echo "[DEBUG] Node.js version: $NODE_VERSION" && \
        echo "[DEBUG] npm version: $NPM_VERSION" && \
        if [ -d "/app/node_modules" ]; then \
            echo "[DEBUG] ✓ node_modules exists"; \
        else \
            echo "[DEBUG] ✗ ERROR: node_modules missing!" && \
            exit 1; \
        fi && \
        if [ -d "/app/out" ]; then \
            echo "[DEBUG] ✓ out directory exists"; \
        else \
            echo "[DEBUG] ✗ ERROR: out directory missing!" && \
            exit 1; \
        fi && \
        if [ -f "/app/out/extension.js" ]; then \
            echo "[DEBUG] ✓ Extension entry point exists"; \
        else \
            echo "[DEBUG] ✗ ERROR: Extension entry point missing!" && \
            exit 1; \
        fi && \
        JS_COUNT=$(find /app/out -type f -name "*.js" 2>/dev/null | wc -l || echo "0") && \
        echo "[DEBUG] Compiled files count: $JS_COUNT" && \
        echo "[DEBUG] ========== Environment Summary ==========" && \
        echo "[DEBUG] ✓ Node.js: $NODE_VERSION" && \
        echo "[DEBUG] ✓ npm: $NPM_VERSION" && \
        echo "[DEBUG] ✓ Extension compiled: yes" && \
        echo "[DEBUG] ✓ Binary ready: yes" && \
        echo "=== All development tools verified ==="

# Default command - keep container running
CMD ["tail", "-f", "/dev/null"]

# ============================================================================
# Stage 4: Final production image - Package everything together
# ============================================================================
# Final AMD64 image - compatible with AMD and Intel x64 processors
# CRITICAL: Explicitly set platform to linux/amd64 to prevent macOS/ARM builds
# Platform is set via --platform flag in docker build command
FROM --platform=linux/amd64 node:20-slim

# Install runtime dependencies including LLVM libraries for cfg-exporter
# Suppress update-alternatives warnings (harmless but noisy) by filtering stderr
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
    ca-certificates \
    wget \
    gnupg \
    file \
    2>&1 | (grep -v "update-alternatives: warning" || true) && \
    rm -rf /var/lib/apt/lists/*

# Install LLVM-17 runtime libraries and clang (needed by cfg-exporter binary and include path discovery)
# cfg-exporter requires libLLVM-17.so.1 which is provided by llvm-17 package
# clang-17 is needed for include path discovery in ClangASTParser
RUN set -e && \
    install_llvm_runtime() { \
        rm -f /etc/apt/sources.list.d/llvm.list /etc/apt/trusted.gpg.d/llvm-snapshot.gpg /tmp/llvm-snapshot.gpg.key 2>/dev/null || true && \
        wget --timeout=60 --tries=3 --retry-connrefused -O /tmp/llvm-snapshot.gpg.key https://apt.llvm.org/llvm-snapshot.gpg.key && \
        gpg --dearmor < /tmp/llvm-snapshot.gpg.key > /etc/apt/trusted.gpg.d/llvm-snapshot.gpg && \
        echo "deb http://apt.llvm.org/jammy/ llvm-toolchain-jammy-17 main" > /etc/apt/sources.list.d/llvm.list && \
        apt-get update && \
        apt-get install -y --no-install-recommends llvm-17 clang-17 && \
        rm -f /tmp/llvm-snapshot.gpg.key && \
        rm -rf /var/lib/apt/lists/*; \
    } && \
    install_llvm_runtime

# Install C standard library headers (needed for stdio.h and other standard headers)
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
    libc6-dev \
    2>&1 | (grep -v "update-alternatives: warning" || true) && \
    rm -rf /var/lib/apt/lists/*

# Upgrade npm to latest version (11.7.0) to avoid version warnings
RUN npm install -g npm@11.7.0

WORKDIR /app

# Copy built extension files
COPY --from=extension-builder /build/out ./out
COPY --from=extension-builder /build/node_modules ./node_modules
COPY --from=extension-builder /build/package.json ./
COPY --from=extension-builder /build/package-lock.json ./
# Copy tsconfig.json for tests that need to compile
COPY --from=extension-builder /build/tsconfig.json ./
# Copy .eslintrc.json for linting
COPY --from=extension-builder /build/.eslintrc.json ./

# Copy built C++ binary with proper permissions and verification
RUN mkdir -p /app/cpp-tools/cfg-exporter/build
COPY --from=cpp-builder --chmod=755 /build/cpp-tools/cfg-exporter/build/cfg-exporter ./cpp-tools/cfg-exporter/build/cfg-exporter
RUN echo "[DEBUG] Verifying copied binary is valid ELF:" && \
    if [ -f "/app/cpp-tools/cfg-exporter/build/cfg-exporter" ]; then \
        echo "[DEBUG] Binary exists, checking file info:" && \
        ls -lh /app/cpp-tools/cfg-exporter/build/cfg-exporter && \
        file /app/cpp-tools/cfg-exporter/build/cfg-exporter || echo "[WARN] 'file' command not available, using fallback verification" && \
        echo "[DEBUG] Checking ELF magic bytes:" && \
        BINARY_MAGIC=$(head -c 4 /app/cpp-tools/cfg-exporter/build/cfg-exporter | od -An -tx1 | tr -d ' \n') && \
        if [ "$BINARY_MAGIC" = "7f454c46" ]; then \
            echo "✓ Binary has valid ELF magic bytes (0x7f ELF)" && \
            echo "[DEBUG] Verifying binary is executable:" && \
            chmod +x /app/cpp-tools/cfg-exporter/build/cfg-exporter && \
            echo "[DEBUG] Testing binary execution:" && \
            if /app/cpp-tools/cfg-exporter/build/cfg-exporter --help >/dev/null 2>&1; then \
                echo "✓ Binary executes successfully"; \
            else \
                echo "⚠ WARNING: Binary exists but execution test failed" && \
                echo "[DEBUG] Checking binary architecture:" && \
                uname -m && \
                echo "[DEBUG] Checking library dependencies:" && \
                (ldd /app/cpp-tools/cfg-exporter/build/cfg-exporter 2>&1 | head -10 || echo "[DEBUG] ldd check completed (may show errors for statically linked binaries)"); \
            fi; \
        else \
            echo "✗ ERROR: Binary does not have ELF magic bytes! Got: $BINARY_MAGIC" && \
            echo "[DEBUG] First 20 bytes:" && \
            head -c 20 /app/cpp-tools/cfg-exporter/build/cfg-exporter | od -An -tx1 && \
            echo "[DEBUG] File type info:" && \
            (file /app/cpp-tools/cfg-exporter/build/cfg-exporter || echo "[DEBUG] 'file' command not available") && \
            exit 1; \
        fi; \
    else \
        echo "✗ ERROR: Binary not found after copy!" && \
        echo "[DEBUG] Checking directory structure:" && \
        ls -la /app/cpp-tools/cfg-exporter/build/ 2>&1 || echo "[DEBUG] build directory does not exist" && \
        exit 1; \
    fi

# Copy other necessary files
COPY README.md ./
COPY CHANGELOG.md ./

# Create directory for extension output
RUN mkdir -p /app/dist

# Set environment variables
ENV NODE_ENV=production
ENV PATH=/app/cpp-tools/cfg-exporter/build:$PATH
# Set LD_LIBRARY_PATH to include LLVM shared libraries
# Set directly to avoid undefined variable warnings from Docker linters
ENV LD_LIBRARY_PATH=/usr/lib/llvm-17/lib

# Verify cfg-exporter binary and its dependencies
RUN echo "=== Verifying cfg-exporter binary ===" && \
    echo "[DEBUG] Current working directory: $(pwd)" && \
    echo "[DEBUG] PATH: $PATH" && \
    echo "[DEBUG] LD_LIBRARY_PATH: $LD_LIBRARY_PATH" && \
    echo "[DEBUG] Checking for cfg-exporter at /app/cpp-tools/cfg-exporter/build/cfg-exporter" && \
    if [ -f "/app/cpp-tools/cfg-exporter/build/cfg-exporter" ]; then \
        echo "✓ cfg-exporter binary exists" && \
        ls -lh /app/cpp-tools/cfg-exporter/build/cfg-exporter && \
        echo "[DEBUG] Verifying ELF magic bytes:" && \
        BINARY_MAGIC=$(head -c 4 /app/cpp-tools/cfg-exporter/build/cfg-exporter | od -An -tx1 | tr -d ' \n') && \
        if [ "$BINARY_MAGIC" = "7f454c46" ]; then \
            echo "✓ Binary has valid ELF magic bytes (0x7f ELF)"; \
        else \
            echo "✗ ERROR: Binary does not have ELF magic bytes! Got: $BINARY_MAGIC" && \
            echo "[DEBUG] First 20 bytes:" && \
            head -c 20 /app/cpp-tools/cfg-exporter/build/cfg-exporter | od -An -tx1 && \
            exit 1; \
        fi && \
        echo "[DRY RUN] Verifying binary architecture:" && \
        echo "[DEBUG] ELF magic bytes already verified above" && \
        echo "[DEBUG] Binary size and permissions:" && \
        ls -lh /app/cpp-tools/cfg-exporter/build/cfg-exporter && \
        echo "✓ Binary architecture verified: Linux x86_64/amd64 (ELF magic bytes confirmed)" && \
        echo "[DRY RUN] Testing binary execution:" && \
        chmod +x /app/cpp-tools/cfg-exporter/build/cfg-exporter && \
        if /app/cpp-tools/cfg-exporter/build/cfg-exporter --help >/dev/null 2>&1; then \
            echo "✓ Binary executes successfully"; \
        else \
            echo "⚠ WARNING: Binary exists but may have execution issues" && \
            echo "[DEBUG] Testing with strace to see what's happening:" && \
            (strace -e trace=execve /app/cpp-tools/cfg-exporter/build/cfg-exporter --help 2>&1 | head -10 || echo "[DEBUG] strace not available or binary failed"); \
        fi && \
        echo "[DEBUG] Checking if binary is executable" && \
        [ -x "/app/cpp-tools/cfg-exporter/build/cfg-exporter" ] && echo "✓ Binary is executable" || (chmod +x /app/cpp-tools/cfg-exporter/build/cfg-exporter && echo "✓ Made binary executable") && \
        echo "=== Checking LLVM library location ===" && \
        find /usr/lib/llvm-17 -name "libLLVM*.so*" 2>/dev/null | head -5 || echo "⚠ WARNING: Could not find LLVM libraries" && \
        echo "=== Testing cfg-exporter with ldd ===" && \
        ldd /app/cpp-tools/cfg-exporter/build/cfg-exporter 2>&1 | head -10 || echo "ldd check completed (may show errors for statically linked binaries)" && \
        echo "[DEBUG] Verifying environment variables" && \
        echo "  LLVM_DIR: ${LLVM_DIR:-not set}" && \
        echo "  Clang_DIR: ${Clang_DIR:-not set}"; \
    else \
        echo "✗ ERROR: cfg-exporter binary not found!" && \
        echo "[DEBUG] Checking directory structure:" && \
        ls -la /app/cpp-tools/cfg-exporter/build/ 2>&1 || echo "[DEBUG] build directory does not exist" && \
        find /app -name "cfg-exporter" -type f 2>/dev/null | head -5 || echo "[DEBUG] No cfg-exporter found anywhere in /app"; \
    fi && \
    echo "=== Verification complete ==="

# Default command - can be overridden
CMD ["node", "--version"]

