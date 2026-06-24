# Chay Tele-Eye Flutter App

## 1. Dieu kien can co

May can cai Flutter SDK va nhan duoc lenh:

```powershell
flutter --version
flutter doctor
```

Neu `flutter` khong nhan, cai Flutter SDK truoc, sau do mo terminal moi. Tren Windows co the cai qua:

```powershell
winget install --id Google.Flutter -e
```

Sau khi cai xong, chay:

```powershell
flutter doctor
```

Neu chay Android emulator thi can Android Studio + Android SDK. Neu chay Windows desktop thi can Visual Studio Desktop development with C++.

## 2. Bat backend microservices

Mo Docker Desktop truoc, sau do chay o root repo:

```powershell
cd D:\workspace\tele-eye
docker compose up -d
docker compose ps
```

Gateway phai len o:

```text
http://localhost:8080/api
```

Flutter app da cau hinh API nhu sau:

```text
Web/Desktop/Windows: http://localhost:8080/api
Android Emulator:    http://10.0.2.2:8080/api
```

## 3. Cai package Flutter

```powershell
cd D:\workspace\tele-eye\tele-eye-app
flutter pub get
```

## 4. Chay app

### Cach khuyen dung: Android emulator

Bat emulator trong Android Studio, sau do:

```powershell
flutter devices
flutter run
```

Neu co nhieu device, chon device Android:

```powershell
flutter run -d <device-id>
```

### Chay Windows desktop

```powershell
flutter config --enable-windows-desktop
flutter run -d windows
```

### Chay Web bang Chrome

Backend API Gateway hien cho phep origin `http://localhost:3000`. Neu muon chay Flutter web, dung port 3000 va tam dung frontend Next.js:

```powershell
cd D:\workspace\tele-eye
docker compose stop frontend
cd D:\workspace\tele-eye\tele-eye-app
flutter run -d chrome --web-port 3000
```

## 5. Tai khoan test

Admin seed san:

```text
Email:    admin@test.com
Password: admin123
```

Neu tao doctor tu admin, password phai co it nhat 8 ky tu.

## 6. Loi hay gap

### `flutter` is not recognized

Flutter SDK chua cai hoac chua co trong PATH. Cai Flutter xong mo terminal moi.

### Android app khong goi duoc API

Dung Android emulator thi app phai goi `10.0.2.2:8080`, source da cau hinh san trong:

```text
lib/config/api_config.dart
```

### Web bi CORS

Chay Flutter web o port 3000:

```powershell
flutter run -d chrome --web-port 3000
```

Hoac sua CORS trong API Gateway neu muon dung port khac.

### Docker khong chay

Mo Docker Desktop roi chay lai:

```powershell
docker compose up -d
```
