param(
  [string]$Owner     = "editorav010-dev",
  [string]$Repo      = "meme-capsule-sync",
  [string]$Branch    = "main",
  [string]$LocalPath = ".knowledge\MEME_CAPSULE_KNOWLEDGE.md",
  [string]$DocsPath  = "docs\MEME_CAPSULE_KNOWLEDGE.md",
  [string]$MetaPath  = ".knowledge\.knowledge_meta.json",
  [string]$Message   = "Update MEME_CAPSULE_KNOWLEDGE.md via AI agent"
)

$token = $env:CAPSULE_TOKEN
if (-not $token) {
  $token = [System.Environment]::GetEnvironmentVariable('CAPSULE_TOKEN', 'User')
  if (-not $token) {
    $token = [System.Environment]::GetEnvironmentVariable('CAPSULE_TOKEN', 'Machine')
  }
}
if (-not $token) { Write-Error "CAPSULE_TOKEN not set. Run Step 2 first."; exit 1 }
if (-not (Test-Path $MetaPath)) { Write-Error "Run fetch-knowledge.ps1 first."; exit 1 }

$sha = (Get-Content $MetaPath -Encoding UTF8 | ConvertFrom-Json).sha

# Resolve latest content: Check both docs/ and .knowledge/
$sourcePath = $LocalPath
if (Test-Path $DocsPath) {
  if (Test-Path $LocalPath) {
    $docsTime = (Get-Item $DocsPath).LastWriteTimeUtc
    $localTime = (Get-Item $LocalPath).LastWriteTimeUtc
    if ($docsTime -gt $localTime) {
      $sourcePath = $DocsPath
    }
  } else {
    $sourcePath = $DocsPath
  }
}

$content = Get-Content $sourcePath -Raw -Encoding UTF8
if ([string]::IsNullOrWhiteSpace($content)) {
  Write-Error "Content file $sourcePath is empty. Aborting."
  exit 1
}

# Keep both local copies synchronized
Set-Content -Path $LocalPath -Value $content -NoNewline -Encoding UTF8
if (Test-Path "docs") {
  Set-Content -Path $DocsPath -Value $content -NoNewline -Encoding UTF8
}

$b64 = [System.Convert]::ToBase64String(
  [System.Text.Encoding]::UTF8.GetBytes($content)
)

$headers = @{
  Authorization = "token $token"
  Accept        = "application/vnd.github.v3+json"
}

$body = @{
  message = $Message
  content = $b64
  sha     = $sha
  branch  = $Branch
} | ConvertTo-Json

$url = "https://api.github.com/repos/$Owner/$Repo/contents/MEME_CAPSULE_KNOWLEDGE.md"

try {
  $resp = Invoke-RestMethod -Uri $url -Headers $headers -Method Put `
          -Body $body -ContentType "application/json"
  $newSha = $resp.content.sha
  @{ sha = $newSha } | ConvertTo-Json | Set-Content -Path $MetaPath -Encoding UTF8

  if ($newSha -eq $sha) {
    Write-Warning "NOTICE: GitHub SHA did not change ($($newSha.Substring(0,7))). The content was identical to what is already on GitHub."
    Write-Warning "TIP: If you just edited the file in your code editor, make sure you pressed Ctrl+S to save your changes to disk before running update!"
  } else {
    Write-Host "MEME_CAPSULE_KNOWLEDGE.md updated successfully! (new sha: $($newSha.Substring(0,7)))" -ForegroundColor Green
    Write-Host "Synced source: $sourcePath (both .knowledge/ and docs/ updated)"
  }
} catch {
  $statusCode = 0
  $errorMsg = ""
  if ($_.Exception -and $_.Exception.Response) {
    $statusCode = [int]$_.Exception.Response.StatusCode
    try {
      $stream = $_.Exception.Response.GetResponseStream()
      $reader = New-Object System.IO.StreamReader($stream)
      $rawBody = $reader.ReadToEnd()
      $jsonBody = $rawBody | ConvertFrom-Json
      $errorMsg = $jsonBody.message
    } catch {}
  }

  if ($statusCode -eq 409) {
    Write-Warning "CONFLICT DETECTED (HTTP 409): Someone updated the file on GitHub after your last fetch."
    Write-Warning "1. Run fetch-knowledge.ps1 to get the latest version."
    Write-Warning "2. Merge your changes into the updated file."
    Write-Warning "3. Run update-knowledge.ps1 again."
  } elseif ($statusCode -eq 403) {
    Write-Error "PERMISSION DENIED (HTTP 403): GitHub returned: '$errorMsg'."
    Write-Error "Your CAPSULE_TOKEN (Personal Access Token) does not have write access to '$Owner/$Repo'."
    Write-Host ""
    Write-Host "HOW TO FIX THIS:" -ForegroundColor Yellow
    Write-Host "1. Go to GitHub -> Settings -> Developer Settings -> Personal Access Tokens -> Fine-grained tokens."
    Write-Host "2. Click your token."
    Write-Host "3. Under 'Repository access', ensure '$Repo' is selected."
    Write-Host "4. Under 'Permissions' -> 'Repository permissions', change 'Contents' from 'Read-only' to 'Read and write'."
    Write-Host "5. Click 'Save changes' at the bottom."
  } elseif ($statusCode -eq 401) {
    Write-Error "AUTHENTICATION FAILED (HTTP 401): The CAPSULE_TOKEN is invalid or expired."
  } else {
    Write-Error "UPDATE FAILED: HTTP $statusCode - $($_.Exception.Message)"
    if ($errorMsg) { Write-Error "GitHub Message: $errorMsg" }
  }
  exit 1
}
