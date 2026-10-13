[CmdletBinding()]
param(
  [switch]$DryRun,
  [string]$CommitMessage = 'Update PenPal Pages website'
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$WebsiteSource = Join-Path $ProjectRoot 'Website'
$AssetsSource = Join-Path $ProjectRoot 'public\assets'
$WorkflowSource = Join-Path $ProjectRoot '.github\workflows\deploy-pages.yml'
$ExpectedRemote = 'https://github.com/jezreichmann/PenPalPages.git'
if (-not (Test-Path (Join-Path $WebsiteSource 'package-lock.json')) -or -not (Test-Path $WorkflowSource) -or -not (Test-Path $AssetsSource)) {
  throw 'Website source, lockfile, workflow, or public artwork folder is missing.'
}

Push-Location $ProjectRoot
try {
  Write-Host 'Installing the isolated website dependencies...' -ForegroundColor Cyan
  & npm ci --prefix Website
  if ($LASTEXITCODE -ne 0) { throw 'Website dependency installation failed.' }
  & npm --prefix Website run build
  if ($LASTEXITCODE -ne 0) { throw 'Website build failed; nothing was committed or pushed.' }
} finally { Pop-Location }

$PublishRoot = Join-Path $env:TEMP ("PenPalPages-publish-" + [guid]::NewGuid().ToString('N'))
Write-Host "Preparing an isolated publish checkout at $PublishRoot" -ForegroundColor Cyan
& git clone --branch main --single-branch $ExpectedRemote $PublishRoot
if ($LASTEXITCODE -ne 0) { throw 'Could not clone the website repository. Check GitHub access and try again.' }

$WebsiteDestination = Join-Path $PublishRoot 'Website'
& robocopy.exe $WebsiteSource $WebsiteDestination /MIR /XD (Join-Path $WebsiteSource 'node_modules') (Join-Path $WebsiteSource 'dist') /NFL /NDL /NJH /NJS /NP
if ($LASTEXITCODE -ge 8) { throw 'Could not copy the website source into the isolated checkout.' }

$AssetsDestination = Join-Path $PublishRoot 'public\assets'
New-Item -ItemType Directory -Force -Path $AssetsDestination | Out-Null
& robocopy.exe $AssetsSource $AssetsDestination /MIR /NFL /NDL /NJH /NJS /NP
if ($LASTEXITCODE -ge 8) { throw 'Could not copy the bundled artwork into the isolated checkout.' }

$WorkflowDestination = Join-Path $PublishRoot '.github\workflows\deploy-pages.yml'
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $WorkflowDestination) | Out-Null
Copy-Item -LiteralPath $WorkflowSource -Destination $WorkflowDestination -Force

& git -C $PublishRoot add -- Website public/assets .github/workflows/deploy-pages.yml
if ($LASTEXITCODE -ne 0) { throw 'Could not stage the selected website paths.' }
$StagedPaths = @(& git -C $PublishRoot diff --cached --name-only)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect the staged website paths.' }
$UnexpectedPaths = @($StagedPaths | Where-Object { $_ -notmatch '^(Website/|public/assets/|\.github/workflows/deploy-pages\.yml$)' })
if ($UnexpectedPaths.Count) { throw "Unexpected paths were staged: $($UnexpectedPaths -join ', ')" }
if (-not $StagedPaths.Count) {
  Write-Host 'The GitHub website repository already matches the local website files.' -ForegroundColor Green
  Write-Host "Temporary checkout retained at $PublishRoot"
  exit 0
}

Write-Host ''
Write-Host 'Only these website paths are staged:' -ForegroundColor Cyan
$StagedPaths | ForEach-Object { Write-Host "  $_" }
Write-Host ''
& git -C $PublishRoot diff --cached --stat

if ($DryRun) {
  Write-Host ''
  Write-Host 'Dry run complete. Nothing was committed or pushed.' -ForegroundColor Yellow
  Write-Host "Review the isolated checkout at $PublishRoot"
  exit 0
}

if ([string]::IsNullOrWhiteSpace($CommitMessage)) { throw 'Commit message cannot be empty.' }
& git -C $PublishRoot commit -m $CommitMessage
if ($LASTEXITCODE -ne 0) { throw "Commit failed. Review the isolated checkout at $PublishRoot" }
& git -C $PublishRoot push origin main
if ($LASTEXITCODE -ne 0) { throw "Push failed. The isolated checkout is retained at $PublishRoot for inspection and retry." }

Write-Host ''
Write-Host 'Website update pushed. Check GitHub Actions for the Pages deployment.' -ForegroundColor Green
Write-Host "Isolated checkout retained at $PublishRoot"