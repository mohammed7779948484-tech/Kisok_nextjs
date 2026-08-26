$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root

$lines = pnpm supabase status -o env
$vars = @{}
foreach ($line in $lines) {
  if ($line -match '^([A-Z0-9_]+)=(.*)$') {
    $key = $Matches[1]
    $value = $Matches[2].Trim().Trim('"')
    $vars[$key] = $value
  }
}

$apiUrl = $vars["API_URL"]
$serviceKey = $vars["SERVICE_ROLE_KEY"]

if ([string]::IsNullOrWhiteSpace($apiUrl) -or [string]::IsNullOrWhiteSpace($serviceKey)) {
  throw "Local API_URL or SERVICE_ROLE_KEY was not returned by 'supabase status -o env'."
}

$uri = [Uri]$apiUrl
if ($uri.Host -notin @("127.0.0.1", "localhost")) {
  throw "Refusing to seed Auth because API_URL is not local: $apiUrl"
}

$headers = @{
  "apikey" = $serviceKey
  "Authorization" = "Bearer $serviceKey"
  "Content-Type" = "application/json"
}

$users = @(
  @{
    email = "admin@kiosk.local"
    password = "KioskLocalAdmin123!"
    display_name = "Local Admin"
    role = "admin"
  },
  @{
    email = "preparation@kiosk.local"
    password = "KioskLocalPreparation123!"
    display_name = "Local Preparation"
    role = "preparation"
  },
  @{
    email = "customer@kiosk.local"
    password = "KioskLocalCustomer123!"
    display_name = "Local Customer"
    role = "customer"
  }
)

$existingResponse = Invoke-RestMethod `
  -Method Get `
  -Uri "$apiUrl/auth/v1/admin/users?page=1&per_page=1000" `
  -Headers $headers

$existingUsers = @($existingResponse.users)

foreach ($spec in $users) {
  $existing = $existingUsers | Where-Object { $_.email -eq $spec.email } | Select-Object -First 1

  if ($null -eq $existing) {
    $body = @{
      email = $spec.email
      password = $spec.password
      email_confirm = $true
    } | ConvertTo-Json

    $created = Invoke-RestMethod `
      -Method Post `
      -Uri "$apiUrl/auth/v1/admin/users" `
      -Headers $headers `
      -Body $body

    $userId = $created.id
    Write-Host "Created local Auth user: $($spec.email)"
  } else {
    $userId = $existing.id
    Write-Host "Local Auth user already exists: $($spec.email)"
  }

  $profileBody = @{
    id = $userId
    display_name = $spec.display_name
    role = $spec.role
    is_active = $true
    email = $spec.email
  } | ConvertTo-Json

  $profileHeaders = $headers.Clone()
  $profileHeaders["Prefer"] = "resolution=merge-duplicates,return=minimal"

  Invoke-RestMethod `
    -Method Post `
    -Uri "$apiUrl/rest/v1/profiles?on_conflict=id" `
    -Headers $profileHeaders `
    -Body $profileBody | Out-Null
}

Write-Host ""
Write-Host "Local development logins:"
Write-Host "  Admin       admin@kiosk.local / KioskLocalAdmin123!"
Write-Host "  Preparation preparation@kiosk.local / KioskLocalPreparation123!"
Write-Host "  Customer    customer@kiosk.local / KioskLocalCustomer123!"
Write-Host ""
Write-Host "These credentials are LOCAL DEVELOPMENT ONLY."
