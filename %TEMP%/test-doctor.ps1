$body = @{
    email = 'test@test.com'
    password = '123456'
    fullName = 'Test Doctor'
    specialty = 'Cardiology'
    licenseNumber = 'LIC123'
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri 'http://localhost:8080/api/profile/doctors' -Method Post -ContentType 'application/json' -Body $body -Headers @{Authorization = 'Bearer test'}
    Write-Output "SUCCESS: $($response | ConvertTo-Json)"
} catch {
    Write-Output "ERROR: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Output "BODY: $($reader.ReadToEnd())"
    }
}