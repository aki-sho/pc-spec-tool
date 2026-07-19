$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$version = "1.0.2"
$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$distPath = Join-Path $repositoryRoot "dist"
$expectedDistPath = [System.IO.Path]::GetFullPath((Join-Path $repositoryRoot "dist"))

function Get-Sha256Hex {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  $sha256 = [System.Security.Cryptography.SHA256]::Create()
  $stream = [System.IO.File]::OpenRead($Path)
  try {
    $hashBytes = $sha256.ComputeHash($stream)
    return ([System.BitConverter]::ToString($hashBytes)).Replace("-", "").ToLowerInvariant()
  } finally {
    $stream.Dispose()
    $sha256.Dispose()
  }
}

if (Test-Path -LiteralPath $distPath) {
  $resolvedDistPath = (Resolve-Path -LiteralPath $distPath).Path
  if ($resolvedDistPath -ne $expectedDistPath) {
    throw "Refusing to clean unexpected output directory: $resolvedDistPath"
  }

  Get-ChildItem -LiteralPath $resolvedDistPath -Force | Remove-Item -Recurse -Force
} else {
  New-Item -ItemType Directory -Path $distPath | Out-Null
}

Push-Location $repositoryRoot
try {
  & (Join-Path $repositoryRoot "node_modules\.bin\electron-builder.cmd") --win --x64
  if ($LASTEXITCODE -ne 0) {
    throw "electron-builder failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}

$setupName = "PC-Spec-Tool-Setup-$version.exe"
$portableName = "PC-Spec-Tool-Portable-$version.exe"
$zipName = "PC-Spec-Tool-Portable-$version.zip"
$setupPath = Join-Path $distPath $setupName
$portablePath = Join-Path $distPath $portableName
$zipPath = Join-Path $distPath $zipName
$portableFolderName = "PC-Spec-Tool-Portable-$version"
$portableFolderPath = Join-Path $distPath $portableFolderName
$portableReadmeSource = Join-Path $repositoryRoot "build\portable-readme.txt"

foreach ($requiredPath in @($setupPath, $portablePath, $portableReadmeSource)) {
  if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
    throw "Required build output is missing: $requiredPath"
  }
}

New-Item -ItemType Directory -Path $portableFolderPath | Out-Null
Copy-Item -LiteralPath $portablePath -Destination (Join-Path $portableFolderPath $portableName)
Copy-Item -LiteralPath $portableReadmeSource -Destination (Join-Path $portableFolderPath "README.txt")
Compress-Archive -LiteralPath $portableFolderPath -DestinationPath $zipPath -CompressionLevel Optimal

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipArchive = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
try {
  $zipEntries = @(
    $zipArchive.Entries |
      Where-Object { -not $_.FullName.EndsWith("/") } |
      ForEach-Object { $_.FullName.Replace("\", "/") } |
      Sort-Object
  )
} finally {
  $zipArchive.Dispose()
}

$expectedZipEntries = @(
  "$portableFolderName/$portableName",
  "$portableFolderName/README.txt"
) | Sort-Object

if (($zipEntries -join "`n") -ne ($expectedZipEntries -join "`n")) {
  throw "Unexpected ZIP structure: $($zipEntries -join ", ")"
}

$utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
foreach ($artifactPath in @($setupPath, $portablePath, $zipPath)) {
  $hash = Get-Sha256Hex -Path $artifactPath
  $hashFilePath = "$artifactPath.sha256"
  $hashLine = "$hash  $([System.IO.Path]::GetFileName($artifactPath))`r`n"
  [System.IO.File]::WriteAllText($hashFilePath, $hashLine, $utf8WithoutBom)
}

$finalNames = @(
  $setupName,
  "$setupName.sha256",
  $portableName,
  "$portableName.sha256",
  $zipName,
  "$zipName.sha256"
)

Get-ChildItem -LiteralPath $distPath -Force |
  Where-Object { $_.Name -notin $finalNames } |
  Remove-Item -Recurse -Force

$actualNames = @(
  Get-ChildItem -LiteralPath $distPath -File |
    Select-Object -ExpandProperty Name |
    Sort-Object
)
$expectedNames = @($finalNames | Sort-Object)

if (($actualNames -join "`n") -ne ($expectedNames -join "`n")) {
  throw "Unexpected files in dist: $($actualNames -join ", ")"
}

Write-Output "Release artifacts created and verified:"
Get-ChildItem -LiteralPath $distPath -File |
  Sort-Object Name |
  Select-Object Name, Length, LastWriteTime
