# ==============================================================================
# Script: test_session_client.ps1
# Usage:  .\test_session_client.ps1 [-SessionId <UUID>]
# ==============================================================================

param (
    [string]$BaseUrl   = "http://localhost:8000/api",
    [string]$SessionId = "0f538bf1-c6aa-595f-850d-eea3934ba4b3",
    [string]$Email     = "caleb.eriksen1@example.com",
    [string]$Password  = "Strongpass123",
    [string]$Portal    = "caregiver"
)

# Helper function to read HTTP re
sponse stream on error
function Get-ResponseErrorDetails {
    param ($Exception)
    if ($Exception.Response) {
        $stream = $Exception.Response.GetResponseStream()
        if ($stream) {
            $reader = New-Object System.IO.StreamReader($stream)
            return $reader.ReadToEnd()
        }
    }
    return $null
}

try {
    # --------------------------------------------------------------------------
    # 1. Authenticate & Obtain Token
    # --------------------------------------------------------------------------
    Write-Host "Authenticating as $Email..." -ForegroundColor Cyan

    $loginBody = @{
        email    = $Email
        password = $Password
        portal   = $Portal
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod `
        -Uri "$BaseUrl/auth/login" `
        -Method Post `
        -Body $loginBody `
        -ContentType "application/json" `
        -ErrorAction Stop

    $accessToken = $loginResponse.access_token

    if (-not $accessToken) {
        throw "Login succeeded but no access_token was returned in response."
    }

    Write-Host "Authentication successful!" -ForegroundColor Green

    # --------------------------------------------------------------------------
    # 2. Fetch Session Client
    # --------------------------------------------------------------------------
    Write-Host "Fetching client for session: $SessionId..." -ForegroundColor Cyan

    $headers = @{
        "Authorization" = "Bearer $accessToken"
    }

    $clientResponse = Invoke-RestMethod `
        -Uri "$BaseUrl/scheduling/sessions/$SessionId/client" `
        -Headers $headers `
        -Method Get `
        -ErrorAction Stop

    Write-Host "Success! Client details:" -ForegroundColor Green
    $clientResponse | ConvertTo-Json -Depth 10

}
catch {
    Write-Host "`nHTTP Request Failed!" -ForegroundColor Red
    Write-Host "Error Message: $($_.Exception.Message)" -ForegroundColor Yellow

    $errorBody = Get-ResponseErrorDetails -Exception $_.Exception
    if ($errorBody) {
        Write-Host "Response Body:" -ForegroundColor Red
        Write-Host $errorBody
    }
}