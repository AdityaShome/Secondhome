# Newsletter Testing Script (PowerShell)
Write-Host "🧪 Testing Newsletter System..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Send Weekly Digest
Write-Host "📧 Test 1: Sending Weekly Digest..." -ForegroundColor Yellow
$headers1 = @{
    "Authorization" = "Bearer your-secret-key-123"
    "Content-Type" = "application/json"
}
try {
    $response1 = Invoke-RestMethod -Uri "http://localhost:3000/api/newsletter/send-weekly" -Method Post -Headers $headers1
    Write-Host "✅ Success:" -ForegroundColor Green
    Write-Host ($response1 | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
Write-Host ""

# Test 2: Send Instant Alert
Write-Host "⚡ Test 2: Sending Instant Alert..." -ForegroundColor Yellow
$body2 = @{
    propertyData = @{
        _id = "test123"
        title = "Cozy 2BHK near RV College"
        location = "Jayanagar, Bangalore"
        price = 15000
        type = "Flat"
        description = "Fully furnished with WiFi, AC, and parking"
    }
} | ConvertTo-Json

$headers2 = @{
    "Content-Type" = "application/json"
}

try {
    $response2 = Invoke-RestMethod -Uri "http://localhost:3000/api/newsletter/send-instant" -Method Post -Headers $headers2 -Body $body2
    Write-Host "✅ Success:" -ForegroundColor Green
    Write-Host ($response2 | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

Write-Host ""
Write-Host "✅ Tests completed! Check your email inbox." -ForegroundColor Green




