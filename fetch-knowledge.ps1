param(
  [string]$Owner     = "editorav010-dev",
  [string]$Repo      = "meme-capsule-sync",
  [string]$Branch    = "main",
  [string]$LocalPath = ".knowledge\MEME_CAPSULE_KNOWLEDGE.md",
  [string]$DocsPath  = "docs\MEME_CAPSULE_KNOWLEDGE.md",
  [string]$MetaPath  = ".knowledge\.knowledge_meta.json"
)

$token = $env:CAPSULE_TOKEN
if (-not $token) {
  $token = [System.Environment]::GetEnvironmentVariable('CAPSULE_TOKEN', 'User')
  if (-not $token) {
    $token = [System.Environment]::GetEnvironmentVariable('CAPSULE_TOKEN', 'Machine')
  }
}
if (-not $token) { Write-Error "CAPSULE_TOKEN not set. Run Step 2 first."; exit 1 }

$headers = @{
  Authorization = "token $token"
  Accept        = "application/vnd.github.v3+json"
}

$url = "https://api.github.com/repos/$Owner/$Repo/contents/MEME_CAPSULE_KNOWLEDGE.md?ref=$Branch"

try {
  $resp = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
} catch {
  Write-Error "Failed to fetch from GitHub: $_"
  exit 1
}

$content = [System.Text.Encoding]::UTF8.GetString(
  [System.Convert]::FromBase64String($resp.content)
)

New-Item -ItemType Directory -Force -Path (Split-Path $LocalPath) | Out-Null
Set-Content -Path $LocalPath -Value $content -NoNewline -Encoding UTF8
@{ sha = $resp.sha } | ConvertTo-Json | Set-Content -Path $MetaPath -Encoding UTF8

# Also keep docs/MEME_CAPSULE_KNOWLEDGE.md updated so editor view is always fresh
if (Test-Path "docs") {
  Set-Content -Path $DocsPath -Value $content -NoNewline -Encoding UTF8
  Write-Host "MEME_CAPSULE_KNOWLEDGE.md fetched. (sha: $($resp.sha.Substring(0,7))) -> synced to .knowledge/ and docs/"
} else {
  Write-Host "MEME_CAPSULE_KNOWLEDGE.md fetched. (sha: $($resp.sha.Substring(0,7)))"
}
