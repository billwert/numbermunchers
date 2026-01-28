# Publish Number Munchers to GitHub Pages
# This script pushes your code to GitHub and enables GitHub Pages

param(
    [string]$RepoName = "numbermunchers",
    [string]$RemoteName = "origin"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Publishing to GitHub Pages ===" -ForegroundColor Cyan

# Check if we have a remote configured
$remote = git remote get-url $RemoteName 2>$null
if (-not $remote) {
    Write-Host "`nNo remote '$RemoteName' found." -ForegroundColor Yellow
    Write-Host "Please create a GitHub repository first, then run:" -ForegroundColor Yellow
    Write-Host "  git remote add origin https://github.com/YOUR_USERNAME/$RepoName.git" -ForegroundColor White
    Write-Host "`nThen re-run this script.`n"
    exit 1
}

Write-Host "Remote: $remote" -ForegroundColor Gray

# Make sure all changes are committed
$status = git status --porcelain
if ($status) {
    Write-Host "`nYou have uncommitted changes:" -ForegroundColor Yellow
    git status --short
    $confirm = Read-Host "`nCommit all changes before publishing? (y/n)"
    if ($confirm -eq 'y') {
        git add -A
        git commit -m "Prepare for GitHub Pages deployment"
    } else {
        Write-Host "Please commit your changes first." -ForegroundColor Red
        exit 1
    }
}

# Get current branch
$branch = git branch --show-current
Write-Host "Current branch: $branch" -ForegroundColor Gray

# Push to GitHub
Write-Host "`nPushing to GitHub..." -ForegroundColor Cyan
git push -u $RemoteName $branch

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to push. Check your remote configuration." -ForegroundColor Red
    exit 1
}

# Extract username and repo from remote URL
if ($remote -match "github\.com[:/]([^/]+)/([^/.]+)") {
    $username = $Matches[1]
    $repo = $Matches[2]
    
    Write-Host "`n=== Success! ===" -ForegroundColor Green
    Write-Host "`nNext steps to enable GitHub Pages:" -ForegroundColor Cyan
    Write-Host "1. Go to: https://github.com/$username/$repo/settings/pages" -ForegroundColor White
    Write-Host "2. Under 'Source', select 'Deploy from a branch'" -ForegroundColor White
    Write-Host "3. Select branch '$branch' and folder '/ (root)'" -ForegroundColor White
    Write-Host "4. Click 'Save'" -ForegroundColor White
    Write-Host "`nYour site will be live at:" -ForegroundColor Green
    Write-Host "  https://$username.github.io/$repo/" -ForegroundColor White
    Write-Host "`n(It may take 1-2 minutes for the first deployment)`n"
    
    # Offer to open the settings page
    $open = Read-Host "Open GitHub Pages settings in browser? (y/n)"
    if ($open -eq 'y') {
        Start-Process "https://github.com/$username/$repo/settings/pages"
    }
} else {
    Write-Host "`nPushed successfully!" -ForegroundColor Green
    Write-Host "Go to your repo's Settings > Pages to enable GitHub Pages." -ForegroundColor White
}
