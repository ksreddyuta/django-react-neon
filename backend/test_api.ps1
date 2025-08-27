# test_all_parameters.ps1
Write-Host "Comprehensive API Parameter Testing..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

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
} else {
    Write-Host "ERROR: $($healthResult.StatusCode) - $($healthResult.StatusDescription)" -ForegroundColor Red
    Write-Host "Details: $($healthResult.ErrorMessage)" -ForegroundColor Red
    exit
}

Write-Host "`n"

# Test 2: New User Registration
Write-Host "TEST 2: New User Registration" -ForegroundColor Yellow
$registerResult = Invoke-ApiRequest -Url "$apiBaseUrl/register/" -Method POST -Body $registerBody

if ($registerResult.Success) {
    Write-Host "SUCCESS: User registered" -ForegroundColor Green
} else {
    Write-Host "ERROR: $($registerResult.StatusCode) - $($registerResult.StatusDescription)" -ForegroundColor Red
    Write-Host "Details: $($registerResult.ErrorMessage)" -ForegroundColor Red
    exit
}

Write-Host "`n"

# Test 3: Valid Login
Write-Host "TEST 3: Valid Login" -ForegroundColor Yellow
$loginResult = Invoke-ApiRequest -Url "$apiBaseUrl/login/" -Method POST -Body $loginBody

if ($loginResult.Success) {
    Write-Host "SUCCESS: Login successful" -ForegroundColor Green
    $accessToken = $loginResult.Response.access
} else {
    Write-Host "ERROR: $($loginResult.StatusCode) - $($loginResult.StatusDescription)" -ForegroundColor Red
    Write-Host "Details: $($loginResult.ErrorMessage)" -ForegroundColor Red
    exit
}

Write-Host "`n"

# Test 4: Get Devices
Write-Host "TEST 4: Get Devices" -ForegroundColor Yellow
$devicesResult = Invoke-ApiRequest -Url "$apiBaseUrl/devices/" -Method GET -Token $accessToken

if ($devicesResult.Success) {
    Write-Host "SUCCESS: Retrieved devices" -ForegroundColor Green
    $devices = $devicesResult.Response
    
    # Ensure devices is treated as an array
    if ($devices -is [string]) {
        $devices = $devices -split ', '
    }
    
    Write-Host "Found $($devices.Count) devices: $($devices -join ', ')" -ForegroundColor Cyan
    
    # Find VOC and battery devices
    $vocDevices = @($devices | Where-Object { $_ -like "*VOC*" })
    $batteryDevices = @($devices | Where-Object { $_ -like "*battery*" })
    
    # Store devices for subsequent tests
    if ($vocDevices.Count -gt 0) {
        $vocDevice = $vocDevices[0]
        Write-Host "Using VOC device: $vocDevice for air quality tests" -ForegroundColor Cyan
    }
    
    if ($batteryDevices.Count -gt 0) {
        $batteryDevice = $batteryDevices[0]
        Write-Host "Using battery device: $batteryDevice for battery tests" -ForegroundColor Cyan
    }
} else {
    Write-Host "ERROR: $($devicesResult.StatusCode) - $($devicesResult.StatusDescription)" -ForegroundColor Red
    Write-Host "Details: $($devicesResult.ErrorMessage)" -ForegroundColor Red
    exit
}

Write-Host "`n"

# Test 5: Get Pollutants
Write-Host "TEST 5: Get Pollutants" -ForegroundColor Yellow
$pollutantsResult = Invoke-ApiRequest -Url "$apiBaseUrl/pollutants/" -Method GET -Token $accessToken

if ($pollutantsResult.Success) {
    Write-Host "SUCCESS: Retrieved pollutants" -ForegroundColor Green
    $pollutants = $pollutantsResult.Response
    Write-Host "Found $($pollutants.Count) pollutants:" -ForegroundColor Cyan
    
    foreach ($pollutant in $pollutants) {
        Write-Host "  - $($pollutant.id): $($pollutant.name) ($($pollutant.unit))" -ForegroundColor Cyan
    }
} else {
    Write-Host "ERROR: $($pollutantsResult.StatusCode) - $($pollutantsResult.StatusDescription)" -ForegroundColor Red
    Write-Host "Details: $($pollutantsResult.ErrorMessage)" -ForegroundColor Red
    exit
}

Write-Host "`n"

# Test 6: Test All Air Quality Pollutants
Write-Host "TEST 6: Testing All Air Quality Pollutants" -ForegroundColor Yellow
if ($vocDevice -and $pollutants) {
    foreach ($pollutant in $pollutants) {
        $pollutantId = $pollutant.id
        Write-Host "Testing pollutant: $pollutantId" -ForegroundColor Cyan
        
        $airQualityResult = Invoke-ApiRequest -Url "$apiBaseUrl/air-quality/$vocDevice/$pollutantId/?days=7" -Method GET -Token $accessToken

        if ($airQualityResult.Success) {
            $airQualityData = $airQualityResult.Response
            Write-Host "  SUCCESS: Found $($airQualityData.Count) $pollutantId records" -ForegroundColor Green
            
            if ($airQualityData.Count -gt 0) {
                $firstRecord = $airQualityData[0]
                Write-Host "  First record value: $($firstRecord.value) $($pollutant.unit)" -ForegroundColor Cyan
            }
        } else {
            Write-Host "  ERROR: $($airQualityResult.StatusCode) - $($airQualityResult.StatusDescription)" -ForegroundColor Red
            Write-Host "  Details: $($airQualityResult.ErrorMessage)" -ForegroundColor Red
        }
        Write-Host "`n"
    }
} else {
    Write-Host "SKIPPED: No VOC device or pollutants available" -ForegroundColor Yellow
}

Write-Host "`n"

# Test 7: Test Battery Data
Write-Host "TEST 7: Testing Battery Data" -ForegroundColor Yellow
if ($batteryDevice) {
    $batteryResult = Invoke-ApiRequest -Url "$apiBaseUrl/battery/$batteryDevice/?days=7" -Method GET -Token $accessToken

    if ($batteryResult.Success) {
        $batteryData = $batteryResult.Response
        Write-Host "SUCCESS: Found $($batteryData.Count) battery records" -ForegroundColor Green
        
        if ($batteryData.Count -gt 0) {
            $firstRecord = $batteryData[0]
            Write-Host "First record value: $($firstRecord.value) V" -ForegroundColor Cyan
            
            # Check for min/max values
            $minValue = ($batteryData | Measure-Object -Property value -Minimum).Minimum
            $maxValue = ($batteryData | Measure-Object -Property value -Maximum).Maximum
            $avgValue = ($batteryData | Measure-Object -Property value -Average).Average
            
            Write-Host "Battery stats - Min: $minValue V, Max: $maxValue V, Avg: $([math]::Round($avgValue, 2)) V" -ForegroundColor Cyan
        }
    } else {
        Write-Host "ERROR: $($batteryResult.StatusCode) - $($batteryResult.StatusDescription)" -ForegroundColor Red
        Write-Host "Details: $($batteryResult.ErrorMessage)" -ForegroundColor Red
    }
} else {
    Write-Host "SKIPPED: No battery device available" -ForegroundColor Yellow
}

Write-Host "`n"

# Test 8: Test Weather Data Parameters
Write-Host "TEST 8: Testing Weather Data Parameters" -ForegroundColor Yellow
$weatherResult = Invoke-ApiRequest -Url "$apiBaseUrl/weather/?days=7" -Method GET -Token $accessToken

if ($weatherResult.Success) {
    $weatherData = $weatherResult.Response
    Write-Host "SUCCESS: Found $($weatherData.Count) weather records" -ForegroundColor Green
    
    if ($weatherData.Count -gt 0) {
        $firstRecord = $weatherData[0]
        Write-Host "Weather parameters in first record:" -ForegroundColor Cyan
        
        # Extract all available parameters from the first record
        $weatherParams = $firstRecord.PSObject.Properties | Where-Object { $_.Name -ne 'timestamp' }
        foreach ($param in $weatherParams) {
            if ($null -ne $param.Value) {
                Write-Host "  - $($param.Name): $($param.Value)" -ForegroundColor Cyan
            }
        }
        
        # Calculate statistics for each parameter
        Write-Host "`nWeather parameter statistics:" -ForegroundColor Cyan
        foreach ($param in $weatherParams) {
            $paramName = $param.Name
            $values = $weatherData | Where-Object { $null -ne $_.$paramName } | ForEach-Object { $_.$paramName }
            
            if ($values.Count -gt 0) {
                $minValue = ($values | Measure-Object -Minimum).Minimum
                $maxValue = ($values | Measure-Object -Maximum).Maximum
                $avgValue = ($values | Measure-Object -Average).Average
                
                Write-Host "  - ${paramName}: Min=$minValue, Max=$maxValue, Avg=$([math]::Round($avgValue, 2))" -ForegroundColor Cyan
            }
        }
    }
} else {
    Write-Host "ERROR: $($weatherResult.StatusCode) - $($weatherResult.StatusDescription)" -ForegroundColor Red
    Write-Host "Details: $($weatherResult.ErrorMessage)" -ForegroundColor Red
}

Write-Host "`n"

# Test 9: Test Pollutant Statistics
Write-Host "TEST 9: Testing Pollutant Statistics" -ForegroundColor Yellow
if ($vocDevice) {
    $pollutantStatsResult = Invoke-ApiRequest -Url "$apiBaseUrl/stats/air-quality/$vocDevice/" -Method GET -Token $accessToken

    if ($pollutantStatsResult.Success) {
        $pollutantStats = $pollutantStatsResult.Response
        Write-Host "SUCCESS: Retrieved pollutant statistics" -ForegroundColor Green
        Write-Host "Pollutant statistics for ${vocDevice}:" -ForegroundColor Cyan
        
        foreach ($key in ${pollutantStats}.PSObject.Properties.Name) {
            $value = $pollutantStats.$key
            Write-Host "  $key : Min=$($value.min), Max=$($value.max), Avg=$($value.avg)" -ForegroundColor Cyan
        }
    } else {
        Write-Host "ERROR: $($pollutantStatsResult.StatusCode) - $($pollutantStatsResult.StatusDescription)" -ForegroundColor Red
        Write-Host "Details: $($pollutantStatsResult.ErrorMessage)" -ForegroundColor Red
    }
} else {
    Write-Host "SKIPPED: No VOC device available" -ForegroundColor Yellow
}

Write-Host "`n"

# Test 10: Test Battery Statistics
Write-Host "TEST 10: Testing Battery Statistics" -ForegroundColor Yellow
if ($batteryDevice) {
    $batteryStatsResult = Invoke-ApiRequest -Url "$apiBaseUrl/stats/battery/$batteryDevice/" -Method GET -Token $accessToken

    if ($batteryStatsResult.Success) {
        $batteryStats = $batteryStatsResult.Response
        Write-Host "SUCCESS: Retrieved battery statistics" -ForegroundColor Green
        Write-Host "Battery statistics for ${batteryDevice}:" -ForegroundColor Cyan
        Write-Host "  Min: $($batteryStats.min), Max: $($batteryStats.max), Avg: $($batteryStats.avg)" -ForegroundColor Cyan
    } else {
        Write-Host "ERROR: $($batteryStatsResult.StatusCode) - $($batteryStatsResult.StatusDescription)" -ForegroundColor Red
        Write-Host "Details: $($batteryStatsResult.ErrorMessage)" -ForegroundColor Red
    }
} else {
    Write-Host "SKIPPED: No battery device available" -ForegroundColor Yellow
}

Write-Host "`n"

# Test 11: Data Export Test
Write-Host "TEST 11: Testing Data Export" -ForegroundColor Yellow
if ($vocDevice -and $pollutants.Count -gt 0) {
    $firstPollutant = $pollutants[0].id
    $exportResult = Invoke-ApiRequest -Url "$apiBaseUrl/air-quality/$vocDevice/$firstPollutant/?days=1" -Method GET -Token $accessToken

    if ($exportResult.Success) {
        $exportData = $exportResult.Response
        Write-Host "SUCCESS: Retrieved $($exportData.Count) records for export" -ForegroundColor Green
        
        # Test if we can convert to CSV format (simulating export)
        if ($exportData.Count -gt 0) {
            $csvData = $exportData | ConvertTo-Csv -NoTypeInformation
            Write-Host "Data can be exported to CSV format ($($csvData.Count) lines)" -ForegroundColor Cyan
            
            # Show first few lines of CSV
            Write-Host "CSV preview:" -ForegroundColor Cyan
            $csvData[0..2] | ForEach-Object { Write-Host "  $_" -ForegroundColor Cyan }
        }
    } else {
        Write-Host "ERROR: $($exportResult.StatusCode) - $($exportResult.StatusDescription)" -ForegroundColor Red
        Write-Host "Details: $($exportResult.ErrorMessage)" -ForegroundColor Red
    }
} else {
    Write-Host "SKIPPED: No device or pollutants available for export test" -ForegroundColor Yellow
}

Write-Host "`n"

# Test 12: Time Range Testing
Write-Host "TEST 12: Testing Different Time Ranges" -ForegroundColor Yellow
if ($vocDevice -and $pollutants.Count -gt 0) {
    $firstPollutant = $pollutants[0].id
    $timeRanges = @(1, 7, 30, 90)  # days
    
    foreach ($days in $timeRanges) {
        Write-Host "Testing $days days range..." -ForegroundColor Cyan
        $timeRangeResult = Invoke-ApiRequest -Url "$apiBaseUrl/air-quality/$vocDevice/$firstPollutant/?days=$days" -Method GET -Token $accessToken

        if ($timeRangeResult.Success) {
            $timeRangeData = $timeRangeResult.Response
            Write-Host "  SUCCESS: Found $($timeRangeData.Count) records for $days days" -ForegroundColor Green
        } else {
            Write-Host "  ERROR: $($timeRangeResult.StatusCode) - $($timeRangeResult.StatusDescription)" -ForegroundColor Red
            Write-Host "  Details: $($timeRangeResult.ErrorMessage)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "SKIPPED: No device or pollutants available for time range test" -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Comprehensive Testing Summary:" -ForegroundColor Green
Write-Host "Test user: $testEmail" -ForegroundColor Cyan
Write-Host "Access token: $($accessToken.Substring(0,20))..." -ForegroundColor Cyan

if ($vocDevice) {
    Write-Host "VOC device tested: $vocDevice" -ForegroundColor Cyan
}

if ($batteryDevice) {
    Write-Host "Battery device tested: $batteryDevice" -ForegroundColor Cyan
}

if ($pollutants) {
    Write-Host "Pollutants tested: $($pollutants.Count)" -ForegroundColor Cyan
    foreach ($pollutant in $pollutants) {
        Write-Host "  - $($pollutant.id)" -ForegroundColor Cyan
    }
}

Write-Host "All parameter testing completed!" -ForegroundColor Green