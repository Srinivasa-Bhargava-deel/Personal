# Multi-stage Dockerfile for VS Code Dataflow Analyzer Extension
# Supports building both the TypeScript extension and C++ cfg-exporter binary
# Compatible with: AMD x64 (64-bit), Intel x64 (64-bit) architectures
# Works on: Windows (via Docker Desktop/WSL2), Linux, macOS

# ============================================================================
# Stage 1: Build C++ cfg-exporter binary
# ============================================================================
# Using Ubuntu 22.04 AMD64 (x86_64) base image - works on AMD and Intel x64 processors
# Platform is set via --platform flag in docker build command
# Docker automatically sets TARGETPLATFORM when --platform is used, so we don't need to specify it in FROM
FROM ubuntu:22.04 AS cpp-builder

# Avoid interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    ninja-build \
    git \
    wget \
    curl \
    ca-certificates \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

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
        ls -lh cfg-exporter && \
        file cfg-exporter && \
        strip cfg-exporter || true && \
        ls -lh cfg-exporter; \
    else \
        echo "✗ ERROR: Binary not found!" && \
        exit 1; \
    fi

# ============================================================================
# Stage 2: Build TypeScript extension
# ============================================================================
# Node.js 20 AMD64 image - compatible with AMD and Intel x64 processors
# Platform is set via --platform flag in docker build command
# Docker automatically sets TARGETPLATFORM when --platform is used, so we don't need to specify it in FROM
FROM node:20-slim AS extension-builder

# Install build tools for native modules (if needed)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY src/ ./src/
COPY jest.config.js ./

# Build TypeScript
RUN npm run compile

# ============================================================================
# Stage 3: Final image - Package everything together
# ============================================================================
# Final AMD64 image - compatible with AMD and Intel x64 processors
# Platform is set via --platform flag in docker build command
# Docker automatically sets TARGETPLATFORM when --platform is used, so we don't need to specify it in FROM
FROM node:20-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built extension files
COPY --from=extension-builder /build/out ./out
COPY --from=extension-builder /build/node_modules ./node_modules
COPY --from=extension-builder /build/package.json ./
COPY --from=extension-builder /build/package-lock.json ./

# Copy built C++ binary
COPY --from=cpp-builder /build/cpp-tools/cfg-exporter/build/cfg-exporter ./cpp-tools/cfg-exporter/build/

# Copy other necessary files
COPY README.md ./
COPY CHANGELOG.md ./

# Create directory for extension output
RUN mkdir -p /app/dist

# Set environment variables
ENV NODE_ENV=production
ENV PATH=/app/cpp-tools/cfg-exporter/build:$PATH

# Default command - can be overridden
CMD ["node", "--version"]

