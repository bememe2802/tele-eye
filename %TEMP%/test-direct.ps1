$token = (Invoke-RestMethod -Uri 'http://localhost:8080/api/auth/login' -Method Post -ContentType 'application/json' -Body '{"email":"admin@test.com","password":"admin123"}').accessToken
Write-Output "TOKEN: $token"

$body = '{"email":"test@test.com","password":"123456","full_name":"Test Doctor","title":"Cardiology","license_number":"LIC123","consultation_fee":200000}'
try {
    $r = Invoke-WebRequest -Uri 'http://localhost:8082/doctors' -Method Post -ContentType 'application/json' -Body $body -Headers @{Authorization="Bearer $token"}
    Write-Output "SUCCESS: $($r.Content)"
} catch {
    Write-Output "ERROR: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $body = $reader.ReadToEnd()
        Write-Output "BODY: $body"
    }
}