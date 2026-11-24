param(
    [string]$Server = "root@82.112.235.245",
    [string]$RemoteBase = "/var/www/assuredrewards/web",
    [string]$Pm2App = "assuredrewards-web",
    [int]$KeepReleases = 3
)

# Builds the Next.js app locally and deploys it as a Node server (PM2) on the VPS.
#
# Layout on the server:
#   $RemoteBase/releases/<timestamp>/   one folder per deploy
#   $RemoteBase/current -> releases/... symlink to the live release
#
# Rollback: point `current` at the previous release and `pm2 restart assuredrewards-web`.
# First-time setup (PM2 + nginx) is described in DEPLOYMENT_VPS.md.

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $projectRoot

npm ci
if ($LASTEXITCODE -ne 0) {
    Write-Warning "npm ci failed. Retrying with npm install..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "Dependency install failed."
    }
}

npm run build
if ($LASTEXITCODE -ne 0) {
    throw "Frontend build failed."
}

# Assemble the self-contained bundle: standalone server + static assets + public files.
$stage = Join-Path $projectRoot ".next\deploy-stage"
if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
Copy-Item -Recurse ".next\standalone" $stage
Copy-Item -Recurse ".next\static" (Join-Path $stage ".next\static")
Copy-Item -Recurse "public" (Join-Path $stage "public")
Copy-Item "deploy\ecosystem.frontend.config.cjs" (Join-Path $stage "ecosystem.frontend.config.cjs")
# Local env files are already baked into the build; never ship them.
Get-ChildItem $stage -Filter ".env*" -Force | Remove-Item -Force

$release = Get-Date -Format "yyyyMMddHHmmss"
$archive = Join-Path $projectRoot ".next\frontend-$release.tgz"
tar -czf $archive -C $stage .
if ($LASTEXITCODE -ne 0) {
    throw "Packaging failed."
}

scp $archive "${Server}:/tmp/frontend-$release.tgz"
if ($LASTEXITCODE -ne 0) {
    throw "Frontend upload failed."
}

$remoteScript = @"
set -e
mkdir -p $RemoteBase/releases/$release
tar -xzf /tmp/frontend-$release.tgz -C $RemoteBase/releases/$release
rm -f /tmp/frontend-$release.tgz
ln -sfn $RemoteBase/releases/$release $RemoteBase/current
cd $RemoteBase/current
if pm2 describe $Pm2App > /dev/null 2>&1; then
  pm2 restart $Pm2App --update-env
else
  pm2 start ecosystem.frontend.config.cjs
  pm2 save
fi
cd $RemoteBase/releases && ls -1t | tail -n +$($KeepReleases + 1) | xargs -r rm -rf
sleep 3
curl -fsS -o /dev/null -w 'Next.js responded with HTTP %{http_code}\n' http://127.0.0.1:3000/
pm2 status $Pm2App
"@

$remoteScript = $remoteScript -replace "`r", ""
$remoteScript | ssh $Server "bash -s"
if ($LASTEXITCODE -ne 0) {
    throw "Remote deploy failed."
}

Remove-Item $archive -Force
Write-Host "Frontend deploy complete (release $release)."
