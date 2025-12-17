# PowerShell script to build and run VS Code Dataflow Analyzer in Docker
# Usage: .\build-docker.ps1 [command] [options]

param(
    [Parameter(Position=0)]
    [ValidateSet("build", "run", "dev", "package", "test", "clean", "cleanall", "help")]
    [string]$Command = "help",
    
    [switch]$Windows,
    [switch]$NoCache,
    [string]$Tag = "vscode-dataflow-analyzer:latest"
)

$ErrorActionPreference = "Stop"

function Show-Help {
    Write-Host @"
VS Code Dataflow Analyzer - Docker Build Script

Usage: .\build-docker.ps1 [command] [options]

Commands:
  build      Build the Docker image (default: Linux container)
  run        Run a container interactively
  dev        Start development container with volume mounts
  package    Build and package extension as .vsix file
  test       Run tests in Docker container
  clean      Remove Docker images and containers
  cleanall   Complete cleanup: containers, images, and build cache
  help       Show this help message

Options:
  -Windows   Use Windows container (requires Windows containers enabled)
  -NoCache   Build without using cache
  -Tag       Docker image tag (default: vscode-dataflow-analyzer:latest)

Examples:
  .\build-docker.ps1 build
  .\build-docker.ps1 build -Windows
  .\build-docker.ps1 build -NoCache
  .\build-docker.ps1 dev
  .\build-docker.ps1 package
  .\build-docker.ps1 package -NoCache
  .\build-docker.ps1 clean
"@
}

function Build-Image {
    param([bool]$UseWindows)
    
    $dockerfile = if ($UseWindows) { "Dockerfile.windows" } else { "Dockerfile" }
    $platform = if ($UseWindows) { "windows/amd64" } else { "linux/amd64" }
    $platformName = if ($UseWindows) { "Windows AMD x64" } else { "Linux AMD x64" }
    
    Write-Host "Building Docker image for $platformName platform..." -ForegroundColor Cyan
    Write-Host "Using Dockerfile: $dockerfile" -ForegroundColor Gray
    Write-Host "Platform: $platform (compatible with AMD x64 and Intel x64)" -ForegroundColor Gray
    
    # Note: When using --platform flag, Docker automatically sets TARGETPLATFORM build arg
    # We don't need to pass it explicitly, and we don't need it in FROM statements
    $buildArgs = @(
        "build",
        "--platform", $platform,
        "-t", $Tag,
        "-f", $dockerfile
    )
    
    if ($NoCache) {
        $buildArgs += "--no-cache"
    }
    
    $buildArgs += "."
    
    Write-Host "Running: docker $($buildArgs -join ' ')" -ForegroundColor Gray
    docker @buildArgs
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Build failed!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Build completed successfully!" -ForegroundColor Green
}

function Run-Container {
    Write-Host "Running container interactively..." -ForegroundColor Cyan
    
    docker run -it --rm `
        -v "${PWD}/src:/app/src" `
        -v "${PWD}/out:/app/out" `
        -v "${PWD}/tests:/app/tests" `
        -w /app `
        $Tag `
        bash
}

function Start-DevContainer {
    Write-Host "Starting development container..." -ForegroundColor Cyan
    
    docker-compose up -d dev
    
    Write-Host "Development container started!" -ForegroundColor Green
    Write-Host "To execute commands:" -ForegroundColor Yellow
    Write-Host "  docker-compose exec dev npm run compile" -ForegroundColor Gray
    Write-Host "  docker-compose exec dev npm test" -ForegroundColor Gray
    Write-Host "  docker-compose exec dev bash" -ForegroundColor Gray
}

function Package-Extension {
    Write-Host "Packaging extension as .vsix..." -ForegroundColor Cyan
    
    # Ensure dist directory exists
    if (-not (Test-Path "dist")) {
        New-Item -ItemType Directory -Path "dist" | Out-Null
    }
    
    # Copy helper script to container and use it
    # The helper script temporarily disables vscode:prepublish since code is already compiled
    # Using @vscode/vsce (newer maintained version) instead of deprecated vsce
    # Note: Script is mounted read-only, so we run it directly with bash instead of chmod
    docker run --rm `
        -v "${PWD}/dist:/app/dist" `
        -v "${PWD}/docker-package.sh:/tmp/docker-package.sh:ro" `
        -w /app `
        $Tag `
        bash /tmp/docker-package.sh
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Extension packaged successfully!" -ForegroundColor Green
        Write-Host "VSIX file: dist/dataflow-analyzer.vsix" -ForegroundColor Yellow
    } else {
        Write-Host "Packaging failed!" -ForegroundColor Red
        exit 1
    }
}

function Run-Tests {
    Write-Host "Running tests in Docker container..." -ForegroundColor Cyan
    
    # Run tests in the container's /app directory (not mounted workspace)
    # This ensures node_modules and devDependencies are available
    docker run --rm `
        -v "${PWD}/src:/app/src:ro" `
        -v "${PWD}/tests:/app/tests:ro" `
        -w /app `
        $Tag `
        sh -c "npm test"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Tests failed!" -ForegroundColor Red
        exit 1
    }
}

function Clean-Docker {
    Write-Host "Cleaning Docker resources..." -ForegroundColor Cyan
    
    # Stop and remove containers
    docker-compose down 2>$null
    
    # Remove images
    docker rmi $Tag 2>$null
    docker rmi "vscode-dataflow-analyzer" 2>$null
    
    # Remove dangling images
    docker image prune -f
    
    Write-Host "Cleanup completed!" -ForegroundColor Green
}

function Clean-All {
    Write-Host "Performing complete Docker cleanup..." -ForegroundColor Cyan
    
    # Stop containers
    Write-Host "Stopping containers..." -ForegroundColor Yellow
    docker-compose down 2>$null
    
    # Remove containers
    Write-Host "Removing containers..." -ForegroundColor Yellow
    docker container prune -f
    
    # Remove images
    Write-Host "Removing images..." -ForegroundColor Yellow
    docker rmi $Tag 2>$null
    docker rmi "vscode-dataflow-analyzer" 2>$null
    docker image prune -a -f
    
    # Clear build cache
    Write-Host "Clearing build cache..." -ForegroundColor Yellow
    docker builder prune -a -f
    
    Write-Host "Complete cleanup finished!" -ForegroundColor Green
    Write-Host "Run '.\build-docker.ps1 build -NoCache' for fresh build" -ForegroundColor Yellow
}

# Main execution
switch ($Command) {
    "build" {
        Build-Image -UseWindows:$Windows
    }
    "run" {
        Build-Image -UseWindows:$Windows
        Run-Container
    }
    "dev" {
        Build-Image -UseWindows:$Windows
        Start-DevContainer
    }
    "package" {
        Build-Image -UseWindows:$Windows
        Package-Extension
    }
    "test" {
        Build-Image -UseWindows:$Windows
        Run-Tests
    }
    "clean" {
        Clean-Docker
    }
    "cleanall" {
        Clean-All
    }
    "help" {
        Show-Help
    }
    default {
        Show-Help
    }
}

