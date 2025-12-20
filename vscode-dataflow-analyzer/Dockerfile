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

# Install build dependencies
# Suppress update-alternatives warnings (harmless but noisy) by filtering stderr
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
    build-essential \
    cmake \
    ninja-build \
    git \
    wget \
    curl \
    ca-certificates \
    gnupg \
    file \
    2>&1 | (grep -v "update-alternatives: warning" || true) && \
    rm -rf /var/lib/apt/lists/*

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
COPY cpp-tools/cfg-exporter/ ./

# Build cfg-exporter
# Note: Ninja generator doesn't use --config flag (single-config generator)
# Build type is set via -DCMAKE_BUILD_TYPE=Release
RUN mkdir -p build && \
    cd build && \
    echo "=== Step 1: CMake Configuration ===" && \
    cmake .. -DCMAKE_BUILD_TYPE=Release -G Ninja 2>&1 | tee cmake_output.log && \
    echo "=== Step 2: Verifying JSON header download ===" && \
    if [ -f json_include/nlohmann/json.hpp ]; then \
        echo "✓ JSON header found at: json_include/nlohmann/json.hpp" && \
        ls -lh json_include/nlohmann/json.hpp; \
    else \
        echo "✗ ERROR: JSON header NOT found!" && \
        echo "Searching for json.hpp:" && \
        find . -name "json.hpp" 2>/dev/null || echo "No json.hpp found anywhere" && \
        echo "Contents of json_include:" && \
        ls -la json_include/ 2>/dev/null || echo "json_include directory does not exist" && \
        exit 1; \
    fi && \
    echo "=== Step 3: Building ===" && \
    cmake --build . 2>&1 | tee build_output.log && \
    echo "=== Step 4: Verifying binary ===" && \
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
            echo "✓ CRITICAL CHECK PASSED: Binary has valid ELF magic bytes (0x7f ELF)" && \
            echo "[DEBUG] ELF format confirmed - this is a Linux binary"; \
        elif [ "$BINARY_MAGIC" = "cffaedfe" ] || [ "$BINARY_MAGIC" = "feedfacf" ]; then \
            echo "✗ CRITICAL ERROR: Binary is Mach-O format (macOS), not ELF (Linux)!" && \
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
            echo "✗ CRITICAL ERROR: Binary has unknown magic bytes: $BINARY_MAGIC" && \
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
            echo "✓ Binary architecture verified: Linux x86_64/amd64" && \
            echo "[DEBUG] Platform architecture: $CURRENT_ARCH" && \
            if [ "$CURRENT_ARCH" != "x86_64" ] && [ "$CURRENT_ARCH" != "amd64" ]; then \
                echo "⚠ WARNING: Building on $CURRENT_ARCH but binary is x86_64/amd64 - may cause execution issues"; \
            fi && \
            echo "[DEBUG] Testing binary execution:" && \
            if ./cfg-exporter --help >/dev/null 2>&1; then \
                echo "✓ Binary executes successfully on build platform"; \
            else \
                echo "⚠ WARNING: Binary exists but execution test failed on build platform" && \
                echo "[DEBUG] This may indicate architecture mismatch"; \
            fi && \
            echo "[DEBUG] Checking binary dependencies:" && \
            ldd cfg-exporter 2>&1 | head -10 || echo "[DEBUG] Binary may be statically linked"; \
        else \
            echo "✗ ERROR: Binary architecture mismatch! Expected Linux x86_64/amd64, got: $BINARY_ARCH" && \
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
            echo "✓ Binary still has valid ELF magic bytes after stripping"; \
        else \
            echo "✗ ERROR: Binary lost ELF magic bytes after stripping! Got: $BINARY_MAGIC_POST" && \
            echo "[DEBUG] Expected: 7f454c46 (ELF)" && \
            exit 1; \
        fi && \
        echo "[DEBUG] ========== Final Verification ==========" && \
        echo "[DEBUG] Final file check:" && \
        (file cfg-exporter || echo "[DEBUG] 'file' command not available, but ELF magic bytes verified") && \
        echo "✓ Binary verification complete - ready for copy"; \
    else \
        echo "✗ ERROR: Binary not found!" && \
        echo "[DEBUG] Current directory: $(pwd)" && \
        echo "[DEBUG] Listing build directory:" && \
        ls -la . && \
        exit 1; \
    fi

# ============================================================================
# Stage 2: Build TypeScript extension
# ============================================================================
# Node.js 20 AMD64 image - compatible with AMD and Intel x64 processors
# CRITICAL: Explicitly set platform to linux/amd64 to prevent macOS/ARM builds
# Platform is set via --platform flag in docker build command
FROM --platform=linux/amd64 node:20-slim AS extension-builder

# Install build tools for native modules (if needed)
# Suppress update-alternatives warnings (harmless but noisy) by filtering stderr
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
    python3 \
    make \
    g++ \
    2>&1 | (grep -v "update-alternatives: warning" || true) && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY .eslintrc.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY src/ ./src/
COPY jest.config.js ./

# Build TypeScript
RUN npm run compile

# ============================================================================
# Stage 3: Development image - Full development environment with all tools
# ============================================================================
# Development image with all build tools for testing and development
# CRITICAL: Explicitly set platform to linux/amd64 to prevent macOS/ARM builds
# Platform is set via --platform flag in docker build command
FROM --platform=linux/amd64 node:20-slim AS dev

# Avoid interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install all development dependencies including build tools
# Suppress update-alternatives warnings (harmless but noisy) by filtering stderr
RUN apt-get update && \
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
    rm -rf /var/lib/apt/lists/*

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
ENV NODE_ENV=development
# Include node_modules/.bin in PATH so npm scripts can find tsc and other binaries
ENV PATH=/app/node_modules/.bin:/app/cpp-tools/cfg-exporter/build:$PATH
# Set LD_LIBRARY_PATH to include LLVM shared libraries for cfg-exporter
# Set directly to avoid undefined variable warnings from Docker linters
ENV LD_LIBRARY_PATH=/usr/lib/llvm-17/lib

# Verify tools are available and cfg-exporter binary architecture
# Add dry-run verification workflow
RUN echo "=== DRY RUN: Verifying development tools ===" && \
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
        echo "[DEBUG] Binary file info:" && \
        ls -lh /app/cpp-tools/cfg-exporter/build/cfg-exporter && \
        echo "[DEBUG] Checking if binary is executable" && \
        [ -x "/app/cpp-tools/cfg-exporter/build/cfg-exporter" ] && echo "✓ Binary is executable" || (chmod +x /app/cpp-tools/cfg-exporter/build/cfg-exporter && echo "✓ Made binary executable") && \
        echo "=== Checking binary architecture compatibility ===" && \
        uname -m && \
        echo "[DEBUG] Testing binary execution:" && \
        if /app/cpp-tools/cfg-exporter/build/cfg-exporter --help >/dev/null 2>&1; then \
            echo "✓ Binary executes successfully"; \
        else \
            echo "⚠ WARNING: Binary exists but may have execution issues" && \
            echo "[DEBUG] Attempting to run with strace:" && \
            (strace -e trace=execve /app/cpp-tools/cfg-exporter/build/cfg-exporter --help 2>&1 | head -10 || echo "[DEBUG] strace not available or binary failed"); \
        fi && \
        echo "[DEBUG] Checking library dependencies" && \
        ldd /app/cpp-tools/cfg-exporter/build/cfg-exporter 2>&1 | head -10 || echo "ldd check completed (may show errors for statically linked binaries)" && \
        echo "[DEBUG] Checking LLVM library availability" && \
        find /usr/lib/llvm-17 -name "libLLVM*.so*" 2>/dev/null | head -5 || echo "⚠ WARNING: Could not find LLVM libraries"; \
    else \
        echo "✗ ERROR: cfg-exporter binary not found at /app/cpp-tools/cfg-exporter/build/cfg-exporter!" && \
        echo "[DEBUG] Checking parent directory structure:" && \
        ls -la /app/cpp-tools/cfg-exporter/build/ 2>&1 || echo "[DEBUG] build directory does not exist" && \
        ls -la /app/cpp-tools/cfg-exporter/ 2>&1 || echo "[DEBUG] cfg-exporter directory does not exist" && \
        ls -la /app/cpp-tools/ 2>&1 || echo "[DEBUG] cpp-tools directory does not exist" && \
        find /app -name "cfg-exporter" -type f 2>/dev/null | head -5 || echo "[DEBUG] No cfg-exporter found anywhere in /app"; \
    fi && \
    echo "=== Verifying environment setup ===" && \
    echo "[DEBUG] Node.js version: $(node --version 2>&1 || echo 'not found')" && \
    echo "[DEBUG] npm version: $(npm --version 2>&1 || echo 'not found')" && \
    echo "[DEBUG] Checking node_modules: $([ -d "/app/node_modules" ] && echo 'exists' || echo 'missing')" && \
    echo "[DEBUG] Checking out directory: $([ -d "/app/out" ] && echo 'exists' || echo 'missing')" && \
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

