# Django API Test Script
# Tests all authentication and data endpoints
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

# Test 1: Health Check
Write-Host "TEST 1: Health Check" -ForegroundColor Yellow
$healthResult = Invoke-ApiRequest -Url "$apiBaseUrl/health/" -Method GET

if ($healthResult.Success) {
    Write-Host "SUCCESS: Health check passed" -ForegroundColor Green
    $healthResult.Response | Format-List
} else {
    Write-Host "ERROR: $($healthResult.StatusCode) - $($healthResult.StatusDescription)" -ForegroundColor Red
    Write-Host "Details: $($healthResult.ErrorMessage)" -ForegroundColor Red
}

Write-Host "`n"

# Test 2: New User Registration
Write-Host "TEST 2: New User Registration" -ForegroundColor Yellow
$registerResult = Invoke-ApiRequest -Url "$apiBaseUrl/register/" -Method POST -Body $registerBody

if ($registerResult.Success) {
    Write-Host "SUCCESS: User registered" -ForegroundColor Green
    $registerResult.Response | Format-List
} else {
    Write-Host "ERROR: $($registerResult.StatusCode) - $($registerResult.StatusDescription)" -ForegroundColor Red
    Write-Host "Details: $($registerResult.ErrorMessage)" -ForegroundColor Red
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
    # Exit if login fails as we need token for subsequent tests
    Write-Host "Exiting tests as login failed" -ForegroundColor Red
    exit
}

Write-Host "`n"

# Test 4: Protected Endpoint
Write-Host "TEST 4: Protected Endpoint" -ForegroundColor Yellow
$protectedResult = Invoke-ApiRequest -Url "$apiBaseUrl/protected/" -Method GET -Token $accessToken

if ($protectedResult.Success) {
    Write-Host "SUCCESS: Accessed protected endpoint" -ForegroundColor Green
    $protectedResult.Response | Format-List
} else {
    Write-Host "ERROR: $($protectedResult.StatusCode) - $($protectedResult.StatusDescription)" -ForegroundColor Red
    Write-Host "Details: $($protectedResult.ErrorMessage)" -ForegroundColor Red
}

Write-Host "`n"

# Test 5: Get Devices
Write-Host "TEST 5: Get Devices" -ForegroundColor Yellow
$devicesResult = Invoke-ApiRequest -Url "$apiBaseUrl/devices/" -Method GET -Token $accessToken

if ($devicesResult.Success) {
    Write-Host "SUCCESS: Retrieved devices" -ForegroundColor Green
    $devices = $devicesResult.Response
    Write-Host "Found $($devices.Count) devices: $($devices -join ', ')" -ForegroundColor Cyan
    
    # Store the first device for subsequent tests
    if ($devices.Count -gt 0) {
        $firstDevice = $devices[0]
        Write-Host "Using device: $firstDevice for subsequent tests" -ForegroundColor Cyan
    }
} else {
    Write-Host "ERROR: $($devicesResult.StatusCode) - $($devicesResult.StatusDescription)" -ForegroundColor Red
    Write-Host "Details: $($devicesResult.ErrorMessage)" -ForegroundColor Red
}

Write-Host "`n"

# Test 6: Get Pollutants
Write-Host "TEST 6: Get Pollutants" -ForegroundColor Yellow
$pollutantsResult = Invoke-ApiRequest -Url "$apiBaseUrl/pollutants/" -Method GET -Token $accessToken

if ($pollutantsResult.Success) {
    Write-Host "SUCCESS: Retrieved pollutants" -ForegroundColor Green
    $pollutants = $pollutantsResult.Response
    Write-Host "Found $($pollutants.Count) pollutants:" -ForegroundColor Cyan
    
    # Store the first pollutant for subsequent tests
    if ($pollutants.Count -gt 0) {
        $firstPollutant = $pollutants[0].id
        Write-Host "Using pollutant: $firstPollutant for subsequent tests" -ForegroundColor Cyan
    }
} else {
    Write-Host "ERROR: $($pollutantsResult.StatusCode) - $($pollutantsResult.StatusDescription)" -ForegroundColor Red
    Write-Host "Details: $($pollutantsResult.ErrorMessage)" -ForegroundColor Red
}

Write-Host "`n"

# Test 7: Get Air Quality Data
if ($firstDevice -and $firstPollutant) {
    Write-Host "TEST 7: Get Air Quality Data" -ForegroundColor Yellow
    $airQualityResult = Invoke-ApiRequest -Url "$apiBaseUrl/air-quality/$firstDevice/$firstPollutant/?days=7" -Method GET -Token $accessToken

    if ($airQualityResult.Success) {
        Write-Host "SUCCESS: Retrieved air quality data" -ForegroundColor Green
        $airQualityData = $airQualityResult.Response
        Write-Host "Found $($airQualityData.Count) air quality records" -ForegroundColor Cyan
        if ($airQualityData.Count -gt 0) {
            Write-Host "Sample record:" -ForegroundColor Cyan
            $airQualityData[0] | Format-List
        }
    } else {
        Write-Host "ERROR: $($airQualityResult.StatusCode) - $($airQualityResult.StatusDescription)" -ForegroundColor Red
        Write-Host "Details: $($airQualityResult.ErrorMessage)" -ForegroundColor Red
    }
} else {
    Write-Host "SKIPPED TEST 7: No device or pollutant available" -ForegroundColor Yellow
}

Write-Host "`n"

# Test 8: Get Battery Data
if ($firstDevice) {
    Write-Host "TEST 8: Get Battery Data" -ForegroundColor Yellow
    $batteryResult = Invoke-ApiRequest -Url "$apiBaseUrl/battery/$firstDevice/?days=7" -Method GET -Token $accessToken

    if ($batteryResult.Success) {
        Write-Host "SUCCESS: Retrieved battery data" -ForegroundColor Green
        $batteryData = $batteryResult.Response
        Write-Host "Found $($batteryData.Count) battery records" -ForegroundColor Cyan
        if ($batteryData.Count -gt 0) {
            Write-Host "Sample record:" -ForegroundColor Cyan
            $batteryData[0] | Format-List
        }
    } else {
        Write-Host "ERROR: $($batteryResult.StatusCode) - $($batteryResult.StatusDescription)" -ForegroundColor Red
        Write-Host "Details: $($batteryResult.ErrorMessage)" -ForegroundColor Red
    }
} else {
    Write-Host "SKIPPED TEST 8: No device available" -ForegroundColor Yellow
}

Write-Host "`n"

# Test 9: Get Weather Data
Write-Host "TEST 9: Get Weather Data" -ForegroundColor Yellow
$weatherResult = Invoke-ApiRequest -Url "$apiBaseUrl/weather/?days=7" -Method GET -Token $accessToken

if ($weatherResult.Success) {
    Write-Host "SUCCESS: Retrieved weather data" -ForegroundColor Green
    $weatherData = $weatherResult.Response
    Write-Host "Found $($weatherData.Count) weather records" -ForegroundColor Cyan
    if ($weatherData.Count -gt 0) {
        Write-Host "Sample record:" -ForegroundColor Cyan
        $weatherData[0] | Format-List
    }
} else {
    Write-Host "ERROR: $($weatherResult.StatusCode) - $($weatherResult.StatusDescription)" -ForegroundColor Red
    Write-Host "Details: $($weatherResult.ErrorMessage)" -ForegroundColor Red
}

Write-Host "`n"

# Test 10: Get Pollutant Statistics
if ($firstDevice) {
    Write-Host "TEST 10: Get Pollutant Statistics" -ForegroundColor Yellow
    $pollutantStatsResult = Invoke-ApiRequest -Url "$apiBaseUrl/stats/air-quality/$firstDevice/" -Method GET -Token $accessToken

    if ($pollutantStatsResult.Success) {
        Write-Host "SUCCESS: Retrieved pollutant statistics" -ForegroundColor Green
        $pollutantStats = $pollutantStatsResult.Response
        Write-Host "Pollutant statistics for ${firstDevice}:" -ForegroundColor Cyan
        
        # Fix for property access
        foreach ($key in $pollutantStats.PSObject.Properties.Name) {
            $value = $pollutantStats.$key
            Write-Host "  $key : Min=$($value.min), Max=$($value.max), Avg=$($value.avg)" -ForegroundColor Cyan
        }
    } else {
        Write-Host "ERROR: $($pollutantStatsResult.StatusCode) - $($pollutantStatsResult.StatusDescription)" -ForegroundColor Red
        Write-Host "Details: $($pollutantStatsResult.ErrorMessage)" -ForegroundColor Red
    }
} else {
    Write-Host "SKIPPED TEST 10: No device available" -ForegroundColor Yellow
}

Write-Host "`n"

# Test 11: Get Battery Statistics
if ($firstDevice) {
    Write-Host "TEST 11: Get Battery Statistics" -ForegroundColor Yellow
    $batteryStatsResult = Invoke-ApiRequest -Url "$apiBaseUrl/stats/battery/$firstDevice/" -Method GET -Token $accessToken

    if ($batteryStatsResult.Success) {
        Write-Host "SUCCESS: Retrieved battery statistics" -ForegroundColor Green
        $batteryStats = $batteryStatsResult.Response
        Write-Host "Battery statistics for ${firstDevice}:" -ForegroundColor Cyan
        Write-Host "  Min: $($batteryStats.min), Max: $($batteryStats.max), Avg: $($batteryStats.avg)" -ForegroundColor Cyan
    } else {
        Write-Host "ERROR: $($batteryStatsResult.StatusCode) - $($batteryStatsResult.StatusDescription)" -ForegroundColor Red
        Write-Host "Details: $($batteryStatsResult.ErrorMessage)" -ForegroundColor Red
    }
} else {
    Write-Host "SKIPPED TEST 11: No device available" -ForegroundColor Yellow
}

Write-Host "`n"

# Test 12: Invalid Login
Write-Host "TEST 12: Invalid Login" -ForegroundColor Yellow
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

# Test 13: Unauthenticated Protected Endpoint
Write-Host "TEST 13: Unauthenticated Protected Endpoint" -ForegroundColor Yellow
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
if ($firstDevice) {
    Write-Host "Test device used: $firstDevice" -ForegroundColor Cyan
}
if ($firstPollutant) {
    Write-Host "Test pollutant used: $firstPollutant" -ForegroundColor Cyan
}
Write-Host "API Tests Completed" -ForegroundColor Green