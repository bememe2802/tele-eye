# Login to get token
$loginBody = @{
    email = "admin@test.com"
    password = "admin123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:8081/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginResponse.accessToken
Write-Host "Token: $token"

# Create doctor with token
$doctorBody = @{
    email = "nguyengiahuy@yopmail.com"
    password = "123456789"
    full_name = "BS. Nguyễn Gia Huy"
    title = "Bác sĩ đa khoa"
    license_number = "LIC001"
    consultation_fee = 300000
} | ConvertTo-Json

$headers = @{
    Authorization = "Bearer $token"
}

try {
    $doctorResponse = Invoke-RestMethod -Uri "http://localhost:8082/doctors" -Method Post -Body $doctorBody -ContentType "application/json" -Headers $headers
    Write-Host "Doctor created:"
    $doctorResponse | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Response: $($_.ErrorDetails.Message)"
}