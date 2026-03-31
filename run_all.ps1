param(
  [string]$EmailEnvPath = "email_otp\.env",
  [switch]$NoEmailOtpService
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSCommandPath

$envPathResolved = $EmailEnvPath
if (-not [System.IO.Path]::IsPathRooted($EmailEnvPath)) {
  $envPathResolved = Join-Path $repoRoot $EmailEnvPath
}

$emailAppPath = Join-Path $repoRoot "email_otp\app.py"
$hiPath = Join-Path $repoRoot "hi.py"

if (!(Test-Path $hiPath)) {
  throw "Could not find hi.py at: $hiPath"
}

if (!(Test-Path $envPathResolved)) {
  throw "Could not find env file at: $envPathResolved. Edit EmailEnvPath or create it."
}

Write-Host "Loading env from $envPathResolved (process scope)..."
$envLines = Get-Content $envPathResolved -ErrorAction Stop
foreach ($line in $envLines) {
  if ($null -eq $line) { continue }
  $trim = $line.Trim()
  if ($trim.Length -eq 0) { continue }
  if ($trim.StartsWith("#")) { continue }
  if ($trim -notmatch "^(?<key>[^=]+)=(?<value>.*)$") { continue }

  $key = $Matches["key"].Trim()
  $value = $Matches["value"].Trim()

  # Avoid printing secrets; just set env for this run.
  Set-Item -Path ("Env:{0}" -f $key) -Value $value
}

function Start-Proc($file, $argList, $workDir = $repoRoot) {
  Write-Host ("Starting: {0} {1}" -f $file, $argList)
  return Start-Process -FilePath $file -ArgumentList $argList -WorkingDirectory $workDir -PassThru
}

$procs = @()

# Start Flask + BLE server (port defaults to 5000, env var PORT can override)
$procs += Start-Proc -file "python" -argList "`"$hiPath`""

if (-not $NoEmailOtpService) {
  # Start standalone email OTP service (port defaults to 5056, env var OTP_SERVICE_PORT can override)
  if (!(Test-Path $emailAppPath)) {
    throw "Could not find email OTP app.py at: $emailAppPath"
  }
  $procs += Start-Proc -file "python" -argList "`"$emailAppPath`""
}

# Start React dev server (uses proxy to Flask at localhost:5000)
$env:NODE_OPTIONS = "--max_old_space_size=4096"
$procs += Start-Proc -file "npm" -argList "start" -workDir $repoRoot

Write-Host ""
Write-Host "All processes started."
Write-Host "Press Ctrl+C to stop everything."

try {
  while ($true) {
    # If any process exits, stop the rest (so you notice failures immediately).
    $exited = $procs | Where-Object { $_.HasExited }
    if ($exited.Count -gt 0) { break }
    Start-Sleep -Seconds 1
  }
}
finally {
  foreach ($p in $procs) {
    if ($null -ne $p -and -not $p.HasExited) {
      try { Stop-Process -Id $p.Id -Force } catch {}
    }
  }
}

