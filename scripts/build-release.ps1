[CmdletBinding()]
param([string]$ResumeStage)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$version = (Get-Content -LiteralPath (Join-Path $repositoryRoot "package.json") -Raw -Encoding UTF8 | ConvertFrom-Json).version
$stageRoot = [IO.Path]::GetFullPath((Join-Path $repositoryRoot ".release-stage"))
$stagePath = Join-Path $stageRoot ("v$version-" + [Guid]::NewGuid().ToString("N"))
if ($ResumeStage) {
  $stagePath = (Resolve-Path -LiteralPath $ResumeStage).Path
  if ([IO.Path]::GetDirectoryName($stagePath) -ne $stageRoot -or [IO.Path]::GetFileName($stagePath) -notlike "v$version-*") {
    throw "Refusing to resume an unexpected staging directory"
  }
}
$outputPath = Join-Path $repositoryRoot "dist\$version"
$originalAppRoot = $env:PC_SPEC_SECURITY_APP_ROOT
$completed = $false
New-Item -ItemType Directory -Path $stagePath -Force | Out-Null

function Get-Sha256Hex([string]$FilePath) {
  $algorithm = [Security.Cryptography.SHA256]::Create()
  $stream = [IO.File]::OpenRead($FilePath)
  try { return ([BitConverter]::ToString($algorithm.ComputeHash($stream))).Replace("-", "").ToLowerInvariant() }
  finally { $stream.Dispose(); $algorithm.Dispose() }
}

Push-Location $repositoryRoot
try {
  if (-not $ResumeStage) {
    & (Join-Path $repositoryRoot "node_modules\.bin\electron-builder.cmd") --win --x64 --publish never "--config.directories.output=$stagePath" "--config.electronDist=$(Join-Path $repositoryRoot 'node_modules\electron\dist')"
    if ($LASTEXITCODE -ne 0) { throw "electron-builder failed with exit code $LASTEXITCODE" }
  }

  $env:PC_SPEC_SECURITY_APP_ROOT = Join-Path $stagePath "win-unpacked\resources\app.asar"
  & node (Join-Path $PSScriptRoot "run-security-tests.cjs")
  if ($LASTEXITCODE -ne 0) { throw "Packaged application verification failed" }

  $setupName = "PC-Spec-Tool-Setup-$version.exe"
  $portableName = "PC-Spec-Tool-Portable-$version.exe"
  $zipName = "PC-Spec-Tool-Portable-$version.zip"
  $folderName = "PC-Spec-Tool-Portable-$version"
  $portableFolder = Join-Path $stagePath $folderName
  New-Item -ItemType Directory -Path $portableFolder -Force | Out-Null
  Copy-Item -LiteralPath (Join-Path $stagePath $portableName) -Destination (Join-Path $portableFolder $portableName) -Force
  $readme = (Get-Content -LiteralPath (Join-Path $repositoryRoot "build\portable-readme.txt") -Raw -Encoding UTF8).Replace("{{VERSION}}", $version)
  [IO.File]::WriteAllText((Join-Path $portableFolder "README.txt"), $readme, (New-Object Text.UTF8Encoding($false)))
  Compress-Archive -LiteralPath $portableFolder -DestinationPath (Join-Path $stagePath $zipName) -CompressionLevel Optimal -Force

  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $archive = [IO.Compression.ZipFile]::OpenRead((Join-Path $stagePath $zipName))
  try {
    $actual = @($archive.Entries | Where-Object { -not $_.FullName.EndsWith("/") } | ForEach-Object { $_.FullName.Replace("\", "/") } | Sort-Object)
    $expected = @("$folderName/$portableName", "$folderName/README.txt") | Sort-Object
    if (($actual -join "`n") -ne ($expected -join "`n")) { throw "Unexpected portable ZIP structure" }
  } finally { $archive.Dispose() }

  $names = @()
  foreach ($name in @($setupName, $portableName, $zipName)) {
    $artifact = Join-Path $stagePath $name
    if ((Get-Item -LiteralPath $artifact).Length -lt 1MB) { throw "Incomplete artifact: $name" }
    $hash = Get-Sha256Hex $artifact
    [IO.File]::WriteAllText("$artifact.sha256", "$hash  $name`r`n", [Text.Encoding]::ASCII)
    $names += $name
    $names += "$name.sha256"
  }

  # Copy only the generated files; previous releases and PortableData stay in place.
  New-Item -ItemType Directory -Path $outputPath -Force | Out-Null
  foreach ($name in $names) {
    Copy-Item -LiteralPath (Join-Path $stagePath $name) -Destination (Join-Path $outputPath $name) -Force
    if ((Get-Sha256Hex (Join-Path $stagePath $name)) -ne (Get-Sha256Hex (Join-Path $outputPath $name))) {
      throw "Copy verification failed: $name"
    }
  }
  $completed = $true
  Write-Output "Release artifacts verified: $outputPath"
  Get-ChildItem -LiteralPath $outputPath -File | Select-Object Name, Length
} finally {
  $env:PC_SPEC_SECURITY_APP_ROOT = $originalAppRoot
  Pop-Location
  if ($completed) {
    $resolvedStage = (Resolve-Path -LiteralPath $stagePath).Path
    if ([IO.Path]::GetDirectoryName($resolvedStage) -ne $stageRoot) { throw "Refusing to clean an unexpected staging directory" }
    Remove-Item -LiteralPath $resolvedStage -Recurse -Force
  }
}
