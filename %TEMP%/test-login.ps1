$body = @{
    email = "admin@test.com"
    password = "admin123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8081/login" -Method Post -Body $body -ContentType "application/json"
    Write-Host "Login success!"
    Write-Host "Token: $($response.access_token)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Response: $($_.ErrorDetails.Message)"
}