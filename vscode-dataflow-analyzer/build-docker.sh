#!/bin/bash
# Bash script to build and run VS Code Dataflow Analyzer in Docker
# Usage: ./build-docker.sh [command] [options]

set -e

COMMAND=${1:-help}
WINDOWS=false
NO_CACHE=""
TAG="vscode-dataflow-analyzer:latest"

show_help() {
    cat << EOF
VS Code Dataflow Analyzer - Docker Build Script

Usage: ./build-docker.sh [command] [options]

Commands:
  build      Build the Docker image (default: Linux container)
  run        Run a container interactively
  dev        Start development container with volume mounts
  package    Build and package extension as .vsix file
  test       Run tests in Docker container
  clean      Remove Docker images and containers
  help       Show this help message

Options:
  --windows  Use Windows container (requires Windows containers enabled)
  --no-cache Build without using cache
  --tag TAG  Docker image tag (default: vscode-dataflow-analyzer:latest)

Examples:
  ./build-docker.sh build
  ./build-docker.sh build --windows
  ./build-docker.sh dev
  ./build-docker.sh package
  ./build-docker.sh clean
EOF
}

build_image() {
    local dockerfile="Dockerfile"
    local platform="linux"
    
    if [ "$WINDOWS" = true ]; then
        dockerfile="Dockerfile.windows"
        platform="windows"
    fi
    
    echo "Building Docker image for $platform platform..."
    echo "Using Dockerfile: $dockerfile"
    
    docker build $NO_CACHE -t "$TAG" -f "$dockerfile" .
    
    echo "Build completed successfully!"
}

run_container() {
    echo "Running container interactively..."
    
    docker run -it --rm \
        -v "$(pwd)/src:/app/src" \
        -v "$(pwd)/out:/app/out" \
        -v "$(pwd)/tests:/app/tests" \
        -w /app \
        "$TAG" \
        bash
}

start_dev_container() {
    echo "Starting development container..."
    
    docker-compose up -d dev
    
    echo "Development container started!"
    echo "To execute commands:"
    echo "  docker-compose exec dev npm run compile"
    echo "  docker-compose exec dev npm test"
    echo "  docker-compose exec dev bash"
}

package_extension() {
    echo "Packaging extension as .vsix..."
    
    # Ensure dist directory exists
    mkdir -p dist
    
    # Build and package
    docker run --rm \
        -v "$(pwd)/dist:/app/dist" \
        -v "$(pwd):/workspace" \
        -w /workspace \
        "$TAG" \
        sh -c "npm install -g vsce && npm run compile && vsce package --out /app/dist/dataflow-analyzer.vsix"
    
    echo "Extension packaged successfully!"
    echo "VSIX file: dist/dataflow-analyzer.vsix"
}

run_tests() {
    echo "Running tests in Docker container..."
    
    docker run --rm \
        -v "$(pwd):/workspace" \
        -w /workspace \
        "$TAG" \
        npm test
}

clean_docker() {
    echo "Cleaning Docker resources..."
    
    # Stop and remove containers
    docker-compose down 2>/dev/null || true
    
    # Remove images
    docker rmi "$TAG" 2>/dev/null || true
    docker rmi "vscode-dataflow-analyzer" 2>/dev/null || true
    
    # Remove dangling images
    docker image prune -f
    
    echo "Cleanup completed!"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --windows)
            WINDOWS=true
            shift
            ;;
        --no-cache)
            NO_CACHE="--no-cache"
            shift
            ;;
        --tag)
            TAG="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

# Execute command
case $COMMAND in
    build)
        build_image
        ;;
    run)
        build_image
        run_container
        ;;
    dev)
        build_image
        start_dev_container
        ;;
    package)
        build_image
        package_extension
        ;;
    test)
        build_image
        run_tests
        ;;
    clean)
        clean_docker
        ;;
    help|*)
        show_help
        ;;
esac

