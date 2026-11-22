# Lost & Found

Thực nghiệm UC-01 **Đăng nhập Google và quản lý phiên** và UC-02 **Hồ sơ và Mục của tôi**. Nghiệp vụ và màn hình lấy từ [SRS](docs/requirements/lost-and-found-srs.pdf), mục 3.1–3.3. Phạm vi đầu gồm các yêu cầu Essential của hai UC.

| Cần làm | Nguồn |
| --- | --- |
| Xác định phạm vi, trường hợp lỗi và cách nghiệm thu | [Phân tích UC-01/02](docs/requirements/analysis/uc-01-02.md) |
| Tra tiêu chí bảo mật và chọn phép đo hiệu năng | [Tiêu chí tham chiếu](docs/requirements/quality/README.md) |
| Tìm ranh giới, dữ liệu và công nghệ | [Kiến trúc thực nghiệm](docs/architecture/overview.md) |
| Từ SRS đến contract, UC spec và mã | [Quy trình bàn giao](docs/skill-workflow.md) |
| Tra kịch bản nghiệm thu và phạm vi bàn giao | [UC-01 · Đăng nhập Google và quản lý phiên](docs/use-cases/uc-01-google-sign-in-and-session.md), [UC-02 · Hồ sơ và Mục của tôi](docs/use-cases/uc-02-profile-and-my-items.md) |
| Dựng local và chạy kiểm tra | [Hướng dẫn chạy](docs/operations/environments.md) |
| Xem API đang chạy | [OpenAPI Core](docs/api/core/openapi.json) |

Core có readiness với PostgreSQL và ba operation phiên của UC-01. App Android/iOS và migration UC-01 có hướng dẫn chạy trong tài liệu môi trường.

## Chạy thử mobile trên trình duyệt

Với Node.js 22.13+ (nhánh 22) hoặc 24.3+ (nhánh 24), chạy từ gốc repo.

```sh
npm run mobile:setup
npm run mobile:web
```

Mở [localhost:8082](http://localhost:8082) và chọn **Dùng tài khoản mô phỏng**. Xem [hướng dẫn chạy mobile](docs/operations/environments.md#app-androidios) để thử Google thật trên Android hoặc iOS.

## Chạy Android trên Windows

Sau khi pull nhánh `experiment/tool-evaluation`, cài Node.js 22.13+ hoặc 24.3+, JDK 17 và Android Studio. Đặt `JAVA_HOME` trỏ tới thư mục JDK 17. Trong Android Studio, mở **SDK Manager → SDK Tools** và cài **Android SDK Command-line Tools (latest)**. Mở PowerShell ở gốc repo trên Windows x64 và chạy:

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\scripts\mobile-android.ps1
```

Script sẽ hỏi giấy phép SDK nếu còn gói cần cài, tải các gói Android, tạo giả lập Pixel 6 có Google Play, cài thư viện và mở bản debug Lost & Found. Lần đầu cần mạng và khoảng 16 GB trống. Nếu dùng SDK ngoài đường dẫn mặc định của Android Studio, đặt `ANDROID_HOME` trước khi chạy. Xem [cách bật tăng tốc giả lập trên Windows](https://developer.android.com/studio/run/emulator-acceleration#vm-windows).

Để thử các nhánh đăng nhập mô phỏng và lỗi đã có trong bộ test, chạy `npm.cmd test --prefix apps/mobile`. Đăng nhập Google thật cần [cấu hình OAuth và gateway HTTPS thử nghiệm](docs/operations/environments.md#app-androidios) từ nhóm.

## Chạy Android trên Mac Apple Silicon

Trên Mac Apple Silicon, sau khi cài JDK 17 và chạy `npm run mobile:setup`, dùng `npm run mobile:android:setup` để cài SDK và tạo giả lập, rồi dùng `npm run mobile:android` để build và mở app. Xem [cấu hình Android/iOS](docs/operations/environments.md#app-androidios) để chạy trên các máy khác hoặc nghiệm thu với Google OAuth.
