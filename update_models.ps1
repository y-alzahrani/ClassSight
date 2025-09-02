# Model Update Script for ClassSight
# This script copies the latest trained YOLO models from the ML repository to the production backend

param(
    [string]$ModelSource = "c:\Users\rssh1\Downloads\ClassSight-main\ClassSight-main",
    [string]$TargetDir = "c:\Users\rssh1\Downloads\classsight\classsight\backend\models\trained_models"
)

Write-Host "=== ClassSight Model Update Script ===" -ForegroundColor Green

# Check if source directory exists
if (-not (Test-Path $ModelSource)) {
    Write-Error "Source directory not found: $ModelSource"
    exit 1
}

# Check if target directory exists, create if not
if (-not (Test-Path $TargetDir)) {
    Write-Host "Creating target directory: $TargetDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $TargetDir -Force
}

# Find all trained models
$modelPaths = @()
Get-ChildItem "$ModelSource\runs" -Recurse -Filter "best.pt" | ForEach-Object {
    $modelPaths += [PSCustomObject]@{
        Path = $_.FullName
        LastWriteTime = $_.LastWriteTime
        RunName = Split-Path (Split-Path $_.DirectoryName -Parent) -Leaf
    }
}

if ($modelPaths.Count -eq 0) {
    Write-Warning "No trained models found in $ModelSource\runs"
    exit 1
}

# Sort by date and show options
$sortedModels = $modelPaths | Sort-Object LastWriteTime -Descending

Write-Host "`nAvailable trained models:" -ForegroundColor Cyan
for ($i = 0; $i -lt $sortedModels.Count; $i++) {
    $model = $sortedModels[$i]
    Write-Host "[$i] $($model.RunName) - $($model.LastWriteTime)" -ForegroundColor White
}

# Copy the latest model
$latestModel = $sortedModels[0]
Write-Host "`nCopying latest model: $($latestModel.RunName)" -ForegroundColor Green

try {
    Copy-Item $latestModel.Path "$TargetDir\best.pt" -Force
    Copy-Item $latestModel.Path "$TargetDir\best_$($latestModel.RunName).pt" -Force
    
    Write-Host "✅ Successfully updated models!" -ForegroundColor Green
    Write-Host "   - best.pt (current production model)" -ForegroundColor White
    Write-Host "   - best_$($latestModel.RunName).pt (backup with run name)" -ForegroundColor White
    
} catch {
    Write-Error "Failed to copy model: $_"
    exit 1
}

# Show current models in target directory
Write-Host "`nCurrent models in production:" -ForegroundColor Cyan
Get-ChildItem $TargetDir -Filter "*.pt" | ForEach-Object {
    $sizeKB = [math]::Round($_.Length / 1KB, 1)
    Write-Host "  $($_.Name) - ${sizeKB}KB - $($_.LastWriteTime)" -ForegroundColor White
}

Write-Host "`n=== Update Complete! ===" -ForegroundColor Green
