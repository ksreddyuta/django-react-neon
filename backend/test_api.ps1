# comprehensive_api_test_with_csv.ps1
# Complete API testing script with CSV export functionality

# Function to display colored output
function Write-ColorOutput($ForegroundColor) {
    $fc = $Host.UI.RawUI.ForegroundColor
    $Host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $Host.UI.RawUI.ForegroundColor = $fc
}

# Function to make API requests and handle responses
function Invoke-ApiTest {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [object]$Body = $null,
        [string]$Token = $null,
        [int]$ExpectedStatus,
        [bool]$ParseJson = $true,
        [bool]$IsFileDownload = $false
    )
    
    Write-ColorOutput Yellow "Testing: $Name"
    Write-ColorOutput Cyan "Endpoint: $Method $Url"
    
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }
    
    try {
        if ($Method -eq "GET") {
            if ($IsFileDownload) {
                $response = Invoke-WebRequest -Uri $Url -Method $Method -Headers $headers -OutFile "download.tmp"
                # Read the downloaded file content
                $content = Get-Content "download.tmp" -Raw
                Remove-Item "download.tmp" -Force
                
                return @{
                    StatusCode = 200
                    Content = $content
                    RawContent = $content
                    Success = $true
                    IsFile = $true
                }
            } else {
                $response = Invoke-WebRequest -Uri $Url -Method $Method -Headers $headers
            }
        }
        else {
            $jsonBody = if ($Body) { $Body | ConvertTo-Json } else { $null }
            $response = Invoke-WebRequest -Uri $Url -Method $Method -Headers $headers -Body $jsonBody
        }
        
        Write-ColorOutput Green "✓ Success: Status $($response.StatusCode)"
        
        if ($ParseJson -and $response.Content -and -not $IsFileDownload) {
            try {
                $parsedContent = $response.Content | ConvertFrom-Json
                return @{
                    StatusCode = $response.StatusCode
                    Content = $parsedContent
                    RawContent = $response.Content
                    Success = $true
                }
            }
            catch {
                return @{
                    StatusCode = $response.StatusCode
                    Content = $response.Content
                    RawContent = $response.Content
                    Success = $true
                }
            }
        }
        else {
            return @{
                StatusCode = $response.StatusCode
                Content = $response.Content
                RawContent = $response.Content
                Success = $true
            }
        }
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorMsg = $_.Exception.Message
        
        if ($statusCode -eq $ExpectedStatus) {
            Write-ColorOutput Green "✓ Expected error: Status $statusCode"
            return @{
                StatusCode = $statusCode
                Error = $errorMsg
                Success = $false
            }
        }
        else {
            Write-ColorOutput Red "✗ Failed: Expected $ExpectedStatus, got $statusCode"
            Write-ColorOutput Red "Error: $errorMsg"
            return @{
                StatusCode = $statusCode
                Error = $errorMsg
                Success = $false
            }
        }
    }
}

# Function to wait for server to be ready
function Wait-ForServer {
    param([string]$Url, [int]$MaxRetries = 30)
    
    $retryCount = 0
    $serverReady = $false
    
    Write-ColorOutput Yellow "Waiting for server to be ready..."
    
    while ($retryCount -lt $MaxRetries -and -not $serverReady) {
        try {
            $response = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                $serverReady = $true
                Write-ColorOutput Green "Server is ready!"
            }
        }
        catch {
            Write-ColorOutput Yellow "Server not ready yet, retrying in 2 seconds... ($retryCount/$MaxRetries)"
            $retryCount++
            Start-Sleep -Seconds 2
        }
    }
    
    if (-not $serverReady) {
        Write-ColorOutput Red "Server did not become ready within the expected time"
        exit 1
    }
}

# Function to export test results to JSON
function Export-TestResults {
    param($Results)
    
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $filename = "api_test_results_$timestamp.json"
    
    $Results | ConvertTo-Json -Depth 10 | Out-File -FilePath $filename -Encoding UTF8
    Write-ColorOutput Green "Test results exported to: $filename"
    return $filename
}

# Function to test CSV export functionality
function Test-CsvExport {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Token,
        [string]$ExpectedContentType = "text/csv"
    )
    
    Write-ColorOutput Yellow "Testing CSV Export: $Name"
    Write-ColorOutput Cyan "Endpoint: GET $Url"
    
    try {
        $headers = @{
            "Authorization" = "Bearer $Token"
        }
        
        $response = Invoke-WebRequest -Uri $Url -Method GET -Headers $headers -OutFile "test_export.csv"
        
        # Check if file was downloaded
        if (Test-Path "test_export.csv") {
            $fileContent = Get-Content "test_export.csv" -Raw
            $fileSize = (Get-Item "test_export.csv").Length
            
            Write-ColorOutput Green "✓ CSV Export Success: Downloaded $fileSize bytes"
            Write-ColorOutput Gray "First 200 chars: $($fileContent.Substring(0, [Math]::Min(200, $fileContent.Length)))..."
            
            # Clean up
            Remove-Item "test_export.csv" -Force
            
            return @{
                Success = $true
                FileSize = $fileSize
                SampleContent = $fileContent.Substring(0, [Math]::Min(200, $fileContent.Length))
            }
        } else {
            Write-ColorOutput Red "✗ CSV Export Failed: No file downloaded"
            return @{
                Success = $false
                Error = "No file downloaded"
            }
        }
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorMsg = $_.Exception.Message
        Write-ColorOutput Red "✗ CSV Export Failed: Status $statusCode - $errorMsg"
        return @{
            Success = $false
            Error = $errorMsg
            StatusCode = $statusCode
        }
    }
}

# Main script execution
Write-ColorOutput Green "Starting Comprehensive API Tests with CSV Export"
Write-ColorOutput Green "=========================================="

# Configuration
$baseUrl = "http://localhost:8000/api"
$healthUrl = "$baseUrl/health/"

# Initialize results object
$testResults = @{
    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    tests = @()
}

# Wait for server to be ready
Wait-ForServer -Url $healthUrl

# Test 1: Health Check
Write-ColorOutput Green "1. Testing Health Check"
$healthResponse = Invoke-ApiTest -Name "Health Check" -Method "GET" -Url $healthUrl -ExpectedStatus 200
$testResults.tests += @{
    name = "Health Check"
    endpoint = "GET /api/health/"
    response = $healthResponse
}

# Test 2: User Registration
Write-ColorOutput Green "2. Testing User Registration"
$randomEmail = "testuser_$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
$registerData = @{
    email = $randomEmail
    password = "TestPass123!"
}

$registerResponse = Invoke-ApiTest -Name "User Registration" -Method "POST" -Url "$baseUrl/register/" -Body $registerData -ExpectedStatus 201
$testResults.tests += @{
    name = "User Registration"
    endpoint = "POST /api/register/"
    request = $registerData
    response = $registerResponse
}

# Test 3: User Login
Write-ColorOutput Green "3. Testing User Login"
$loginData = @{
    email = "admin@example.com"
    password = "Admin@1234"
}

$loginResponse = Invoke-ApiTest -Name "User Login" -Method "POST" -Url "$baseUrl/login/" -Body $loginData -ExpectedStatus 200
$testResults.tests += @{
    name = "User Login"
    endpoint = "POST /api/login/"
    request = $loginData
    response = $loginResponse
}

# Extract tokens from login response if successful
if ($loginResponse.Success -and $loginResponse.StatusCode -eq 200) {
    $accessToken = $loginResponse.Content.access
    $refreshToken = $loginResponse.Content.refresh
    
    Write-ColorOutput Green "Access token obtained: $($accessToken.Substring(0, 20))..."
    Write-ColorOutput Green "Refresh token obtained: $($refreshToken.Substring(0, 20))..."
}
else {
    Write-ColorOutput Red "Login failed, skipping token-dependent tests"
    $accessToken = $null
    $refreshToken = $null
}

# Test 4: Protected Endpoint
if ($accessToken) {
    Write-ColorOutput Green "4. Testing Protected Endpoint"
    $protectedResponse = Invoke-ApiTest -Name "Protected Endpoint" -Method "GET" -Url "$baseUrl/protected/" -Token $accessToken -ExpectedStatus 200
    $testResults.tests += @{
        name = "Protected Endpoint"
        endpoint = "GET /api/protected/"
        response = $protectedResponse
    }
}

# Test 5: Token Refresh
if ($refreshToken) {
    Write-ColorOutput Green "5. Testing Token Refresh"
    $refreshData = @{
        refresh = $refreshToken
    }

    $refreshResponse = Invoke-ApiTest -Name "Token Refresh" -Method "POST" -Url "$baseUrl/token/refresh/" -Body $refreshData -ExpectedStatus 200
    $testResults.tests += @{
        name = "Token Refresh"
        endpoint = "POST /api/token/refresh/"
        request = $refreshData
        response = $refreshResponse
    }
}

# Test 6: Get Devices
Write-ColorOutput Green "6. Testing Get Devices"
$devicesResponse = Invoke-ApiTest -Name "Get Devices" -Method "GET" -Url "$baseUrl/devices/" -ExpectedStatus 200
$testResults.tests += @{
    name = "Get Devices"
    endpoint = "GET /api/devices/"
    response = $devicesResponse
}

# Test 7: Get Pollutants
Write-ColorOutput Green "7. Testing Get Pollutants"
$pollutantsResponse = Invoke-ApiTest -Name "Get Pollutants" -Method "GET" -Url "$baseUrl/pollutants/" -ExpectedStatus 200
$testResults.tests += @{
    name = "Get Pollutants"
    endpoint = "GET /api/pollutants/"
    response = $pollutantsResponse
}

# Test 8: Get Air Quality Data for Multiple Devices and Pollutants
if ($devicesResponse.Success -and $devicesResponse.Content.Length -gt 0) {
    # Get air quality devices (limit to 5-6 as requested)
    $aqDevices = $devicesResponse.Content | Where-Object { $_.type -eq "air_quality" } | Select-Object -First 6
    
    Write-ColorOutput Green "8. Testing Air Quality Data for $($aqDevices.Count) devices"
    
    $airQualityTests = @()
    
    foreach ($device in $aqDevices) {
        Write-ColorOutput Yellow "Testing device: $($device.name)"
        
        # Test all pollutants for this device
        foreach ($pollutant in @("VOC", "O3", "SO2", "NO2")) {
            $airQualityUrl = "$baseUrl/air-quality/$($device.id)/$pollutant/?days=1"
            $airQualityResponse = Invoke-ApiTest -Name "Air Quality $($device.name) - $pollutant" -Method "GET" -Url $airQualityUrl -ExpectedStatus 200
            
            $airQualityTests += @{
                device = $device.name
                device_id = $device.id
                pollutant = $pollutant
                response = $airQualityResponse
            }
            
            # Add a small delay to avoid overwhelming the server
            Start-Sleep -Milliseconds 100
        }
    }
    
    $testResults.tests += @{
        name = "Air Quality Data"
        endpoint = "GET /api/air-quality/{device_id}/{pollutant}/"
        responses = $airQualityTests
    }
}

# Test 9: Get Battery Data for Multiple Devices
if ($devicesResponse.Success -and $devicesResponse.Content.Length -gt 0) {
    # Get battery devices (limit to 5-6 as requested)
    $batteryDevices = $devicesResponse.Content | Where-Object { $_.type -eq "battery" } | Select-Object -First 6
    
    Write-ColorOutput Green "9. Testing Battery Data for $($batteryDevices.Count) devices"
    
    $batteryTests = @()
    
    foreach ($device in $batteryDevices) {
        Write-ColorOutput Yellow "Testing device: $($device.name)"
        
        $batteryUrl = "$baseUrl/battery/$($device.id)/?days=1"
        $batteryResponse = Invoke-ApiTest -Name "Battery $($device.name)" -Method "GET" -Url $batteryUrl -ExpectedStatus 200
        
        $batteryTests += @{
            device = $device.name
            device_id = $device.id
            response = $batteryResponse
        }
        
        # Add a small delay to avoid overwhelming the server
        Start-Sleep -Milliseconds 100
    }
    
    $testResults.tests += @{
        name = "Battery Data"
        endpoint = "GET /api/battery/{device_id}/"
        responses = $batteryTests
    }
}

# Test 10: Get Weather Data
Write-ColorOutput Green "10. Testing Get Weather Data"
$weatherResponse = Invoke-ApiTest -Name "Get Weather Data" -Method "GET" -Url "$baseUrl/weather/?days=1" -ExpectedStatus 200
$testResults.tests += @{
    name = "Weather Data"
    endpoint = "GET /api/weather/"
    response = $weatherResponse
}

# Test 11: Get Pollutant Stats for Multiple Devices
if ($devicesResponse.Success -and $devicesResponse.Content.Length -gt 0) {
    # Test stats for multiple devices (limit to 5-6 as requested)
    $statsDevices = $devicesResponse.Content | Select-Object -First 6
    
    Write-ColorOutput Green "11. Testing Pollutant Stats for $($statsDevices.Count) devices"
    
    $statsTests = @()
    
    foreach ($device in $statsDevices) {
        Write-ColorOutput Yellow "Testing stats for: $($device.name)"
        
        $statsUrl = "$baseUrl/stats/air-quality/$($device.name)/"
        $statsResponse = Invoke-ApiTest -Name "Pollutant Stats $($device.name)" -Method "GET" -Url $statsUrl -ExpectedStatus 200
        
        $statsTests += @{
            device = $device.name
            response = $statsResponse
        }
        
        # Add a small delay to avoid overwhelming the server
        Start-Sleep -Milliseconds 100
    }
    
    $testResults.tests += @{
        name = "Pollutant Stats"
        endpoint = "GET /api/stats/air-quality/{device}/"
        responses = $statsTests
    }
}

# Test 12: Get Battery Stats for Multiple Devices
if ($devicesResponse.Success -and $devicesResponse.Content.Length -gt 0) {
    # Test battery stats for multiple devices (limit to 5-6 as requested)
    $batteryStatsDevices = $devicesResponse.Content | Where-Object { $_.type -eq "battery" } | Select-Object -First 6
    
    Write-ColorOutput Green "12. Testing Battery Stats for $($batteryStatsDevices.Count) devices"
    
    $batteryStatsTests = @()
    
    foreach ($device in $batteryStatsDevices) {
        Write-ColorOutput Yellow "Testing battery stats for: $($device.name)"
        
        $batteryStatsUrl = "$baseUrl/stats/battery/$($device.name)/"
        $batteryStatsResponse = Invoke-ApiTest -Name "Battery Stats $($device.name)" -Method "GET" -Url $batteryStatsUrl -ExpectedStatus 200
        
        $batteryStatsTests += @{
            device = $device.name
            response = $batteryStatsResponse
        }
        
        # Add a small delay to avoid overwhelming the server
        Start-Sleep -Milliseconds 100
    }
    
    $testResults.tests += @{
        name = "Battery Stats"
        endpoint = "GET /api/stats/battery/{device}/"
        responses = $batteryStatsTests
    }
}

# Test 13: Get Latest Dates
Write-ColorOutput Green "13. Testing Get Latest Dates"
$latestDatesResponse = Invoke-ApiTest -Name "Get Latest Dates" -Method "GET" -Url "$baseUrl/latest-dates/" -ExpectedStatus 200
$testResults.tests += @{
    name = "Latest Dates"
    endpoint = "GET /api/latest-dates/"
    response = $latestDatesResponse
}

# Test 14: Multi-Device Data
Write-ColorOutput Green "14. Testing Multi-Device Data"
if ($devicesResponse.Success -and $devicesResponse.Content.Length -gt 1) {
    $deviceNames = ($devicesResponse.Content | Select-Object -First 3 | ForEach-Object { $_.name }) -join ","
    $multiDeviceUrl = "$baseUrl/multi-device-data/?devices=$deviceNames&pollutant=VOC&days=1"
    $multiDeviceResponse = Invoke-ApiTest -Name "Multi-Device Data" -Method "GET" -Url $multiDeviceUrl -ExpectedStatus 200
    
    $testResults.tests += @{
        name = "Multi-Device Data"
        endpoint = "GET /api/multi-device-data/"
        request = @{ devices = $deviceNames; pollutant = "VOC"; days = 1 }
        response = $multiDeviceResponse
    }
}

# Test 15: CSV Export Tests (if authenticated)
if ($accessToken) {
    Write-ColorOutput Green "15. Testing CSV Export Functionality"
    
    $csvTests = @()
    
    # Test Air Quality CSV Export
    if ($devicesResponse.Success -and $devicesResponse.Content.Length -gt 0) {
        $aqDevice = $devicesResponse.Content | Where-Object { $_.type -eq "air_quality" } | Select-Object -First 1
        
        if ($aqDevice) {
            $csvUrl = "$baseUrl/air-quality/$($aqDevice.id)/VOC/?days=1&format=csv"
            $csvResponse = Test-CsvExport -Name "Air Quality CSV Export" -Url $csvUrl -Token $accessToken
            
            $csvTests += @{
                type = "air_quality"
                device = $aqDevice.name
                response = $csvResponse
            }
        }
    }
    
    # Test Battery CSV Export
    if ($devicesResponse.Success -and $devicesResponse.Content.Length -gt 0) {
        $batDevice = $devicesResponse.Content | Where-Object { $_.type -eq "battery" } | Select-Object -First 1
        
        if ($batDevice) {
            $csvUrl = "$baseUrl/battery/$($batDevice.id)/?days=1&format=csv"
            $csvResponse = Test-CsvExport -Name "Battery CSV Export" -Url $csvUrl -Token $accessToken
            
            $csvTests += @{
                type = "battery"
                device = $batDevice.name
                response = $csvResponse
            }
        }
    }
    
    # Test Weather CSV Export
    $csvUrl = "$baseUrl/weather/?days=1&format=csv"
    $csvResponse = Test-CsvExport -Name "Weather CSV Export" -Url $csvUrl -Token $accessToken
    
    $csvTests += @{
        type = "weather"
        response = $csvResponse
    }
    
    $testResults.tests += @{
        name = "CSV Export"
        endpoint = "GET /api/{endpoint}/?format=csv"
        responses = $csvTests
    }
}

# Test 16: Device Groups (if authenticated)
if ($accessToken) {
    Write-ColorOutput Green "16. Testing Device Groups"
    
    # Get device groups
    $deviceGroupsResponse = Invoke-ApiTest -Name "Get Device Groups" -Method "GET" -Url "$baseUrl/device-groups/" -Token $accessToken -ExpectedStatus 200
    $testResults.tests += @{
        name = "Get Device Groups"
        endpoint = "GET /api/device-groups/"
        response = $deviceGroupsResponse
    }
    
    # Create a device group
    $groupData = @{
        name = "Test Group $(Get-Date -Format 'yyyyMMddHHmmss')"
        description = "Test group created by API test"
    }

    $createGroupResponse = Invoke-ApiTest -Name "Create Device Group" -Method "POST" -Url "$baseUrl/device-groups/create/" -Body $groupData -Token $accessToken -ExpectedStatus 201
    $testResults.tests += @{
        name = "Create Device Group"
        endpoint = "POST /api/device-groups/create/"
        request = $groupData
        response = $createGroupResponse
    }
}

# Export test results
$resultsFile = Export-TestResults -Results $testResults

# Summary
Write-ColorOutput Green "=========================================="
Write-ColorOutput Green "COMPREHENSIVE API TESTING COMPLETE!"
Write-ColorOutput Green "Results exported to: $resultsFile"
Write-ColorOutput Green "This file contains detailed responses for React integration."
Write-ColorOutput Green "=========================================="

# Display quick summary
$passedTests = ($testResults.tests | Where-Object { 
    if ($_.response -is [array]) {
        ($_.response | Where-Object { $_.Success -eq $true }).Count -gt 0
    } else {
        $_.response.Success -eq $true
    }
}).Count

$failedTests = ($testResults.tests | Where-Object { 
    if ($_.response -is [array]) {
        ($_.response | Where-Object { $_.Success -eq $false }).Count -gt 0
    } else {
        $_.response.Success -eq $false
    }
}).Count

Write-ColorOutput Green "Tests Passed: $passedTests"
if ($failedTests -gt 0) {
    Write-ColorOutput Red "Tests Failed: $failedTests"
}
else {
    Write-ColorOutput Green "Tests Failed: $failedTests"
}

Write-ColorOutput Green "Total Tests: $($testResults.tests.Count)"
Write-ColorOutput Green "=========================================="