# Django API Test Script
# Tests all authentication endpoints
# Ensure Django server is running at http://localhost:8000

Write-Host "Starting API Tests..." -ForegroundColor Green
Write-Host "----------------------------------------" -ForegroundColor Cyan

# Base configuration
$apiBaseUrl = "http://localhost:8000/api"
$testEmail = "testuser_$(Get-Date -Format 'HHmmss')@example.com"
$testPassword = "TestPassword123!"
$registerBody = @{email=$testEmail; password=$testPassword} | ConvertTo-Json
$loginBody = $registerBody  # Same structure

# Helper function for API requests
function Invoke-ApiRequest {
    param(
        [string]$Url,
        [string]$Method = "GET",
        [string]$Body = $null,
        [string]$Token = $null
    )
    
    $headers = @{"Content-Type" = "application/json"}
    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $headers
        }
        
        if ($Body) {
            $params["Body"] = $Body
        }
        
        $response = Invoke-RestMethod @params
        return @{
            Success = $true
            Response = $response
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $statusDescription = $_.Exception.Response.StatusDescription
        $errorDetails = $_.ErrorDetails.Message
        
        try {
            $errorJson = $errorDetails | ConvertFrom-Json
            $errorMessage = $errorJson.error
        } catch {
            $errorMessage = $errorDetails
        }
        
        return @{
            Success = $false
            StatusCode = $statusCode
            StatusDescription = $statusDescription
            ErrorMessage = $errorMessage
        }
    }
}

# Test 1: New User Registration
Write-Host "TEST 1: New User Registration" -ForegroundColor Yellow
$registerResult = Invoke-ApiRequest -Url "$apiBaseUrl/register/" -Method POST -Body $registerBody

if ($registerResult.Success) {
    Write-Host "SUCCESS: User registered" -ForegroundColor Green
    $registerResult.Response | Format-List
} else {
    Write-Host "ERROR: $($registerResult.StatusCode) - $($registerResult.StatusDescription)" -ForegroundColor Red
    Write-Host "Details: $($registerResult.ErrorMessage)" -ForegroundColor Red
}

Write-Host "`n"

# Test 2: Duplicate Registration
Write-Host "TEST 2: Duplicate Registration" -ForegroundColor Yellow
$duplicateResult = Invoke-ApiRequest -Url "$apiBaseUrl/register/" -Method POST -Body $registerBody

if ($duplicateResult.Success) {
    Write-Host "SUCCESS: Unexpected success" -ForegroundColor Green
    $duplicateResult.Response | Format-List
} else {
    if ($duplicateResult.StatusCode -eq 400) {
        Write-Host "SUCCESS: Duplicate registration prevented" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Unexpected status code $($duplicateResult.StatusCode)" -ForegroundColor Red
    }
    Write-Host "Details: $($duplicateResult.ErrorMessage)" -ForegroundColor DarkYellow
}

Write-Host "`n"

# Test 3: Valid Login
Write-Host "TEST 3: Valid Login" -ForegroundColor Yellow
$loginResult = Invoke-ApiRequest -Url "$apiBaseUrl/login/" -Method POST -Body $loginBody

if ($loginResult.Success) {
    Write-Host "SUCCESS: Login successful" -ForegroundColor Green
    $accessToken = $loginResult.Response.access
    $loginResult.Response | Format-List
} else {
    Write-Host "ERROR: $($loginResult.StatusCode) - $($loginResult.StatusDescription)" -ForegroundColor Red
    Write-Host "Details: $($loginResult.ErrorMessage)" -ForegroundColor Red
}

Write-Host "`n"

# Test 4: Protected Endpoint
if ($accessToken) {
    Write-Host "TEST 4: Protected Endpoint" -ForegroundColor Yellow
    $protectedResult = Invoke-ApiRequest -Url "$apiBaseUrl/protected/" -Method GET -Token $accessToken
    
    if ($protectedResult.Success) {
        Write-Host "SUCCESS: Accessed protected endpoint" -ForegroundColor Green
        $protectedResult.Response | Format-List
    } else {
        Write-Host "ERROR: $($protectedResult.StatusCode) - $($protectedResult.StatusDescription)" -ForegroundColor Red
        Write-Host "Details: $($protectedResult.ErrorMessage)" -ForegroundColor Red
    }
} else {
    Write-Host "SKIPPED TEST 4: No access token available" -ForegroundColor Yellow
}

Write-Host "`n"

# Test 5: Invalid Login
Write-Host "TEST 5: Invalid Login" -ForegroundColor Yellow
$invalidBody = @{email=$testEmail; password="wrongpassword"} | ConvertTo-Json
$invalidLogin = Invoke-ApiRequest -Url "$apiBaseUrl/login/" -Method POST -Body $invalidBody

if ($invalidLogin.Success) {
    Write-Host "ERROR: Login should not succeed with invalid credentials" -ForegroundColor Red
    $invalidLogin.Response | Format-List
} else {
    if ($invalidLogin.StatusCode -eq 401) {
        Write-Host "SUCCESS: Invalid credentials rejected" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Unexpected status code $($invalidLogin.StatusCode)" -ForegroundColor Red
    }
    Write-Host "Details: $($invalidLogin.ErrorMessage)" -ForegroundColor DarkYellow
}

Write-Host "`n"

# Test 6: Unauthenticated Protected Endpoint
Write-Host "TEST 6: Unauthenticated Protected Endpoint" -ForegroundColor Yellow
$unauthenticatedResult = Invoke-ApiRequest -Url "$apiBaseUrl/protected/" -Method GET

if ($unauthenticatedResult.Success) {
    Write-Host "ERROR: Should not access protected endpoint without token" -ForegroundColor Red
    $unauthenticatedResult.Response | Format-List
} else {
    if ($unauthenticatedResult.StatusCode -eq 401) {
        Write-Host "SUCCESS: Protected endpoint rejects unauthenticated requests" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Unexpected status code $($unauthenticatedResult.StatusCode)" -ForegroundColor Red
    }
    Write-Host "Details: $($unauthenticatedResult.ErrorMessage)" -ForegroundColor DarkYellow
}

Write-Host "`n----------------------------------------" -ForegroundColor Cyan
Write-Host "Test Summary:" -ForegroundColor Green
Write-Host "Created test user: $testEmail" -ForegroundColor Cyan
Write-Host "Password used: $testPassword" -ForegroundColor Cyan
if ($accessToken) {
    Write-Host "Access token obtained: $($accessToken.Substring(0,20))..." -ForegroundColor Cyan
}
Write-Host "API Tests Completed" -ForegroundColor Green