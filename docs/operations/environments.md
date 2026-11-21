# Chạy và kiểm tra

## Kiểm tra như CI

Từ gốc repo, dùng Node.js 22 trở lên, npm và Docker đang chạy. CI dùng Node.js 22.

```sh
npm ci
npm run check
npm run test:ai-mock
bash tests/integration/core-ready.sh
```

Bộ kiểm AI mock dùng fixture tổng hợp. Kiểm tra integration dựng DB tạm, xác nhận Core trả 200 khi DB sẵn sàng và 503 sau khi DB dừng theo [OpenAPI](../api/core/openapi.json). Đặt `PORT` nếu cổng 8091 đã dùng.

## Smoke test qua gateway

```sh
docker compose --env-file .env.example -p lf-local config --quiet
docker compose --env-file .env.example -p lf-local up --build -d
curl -fsS http://127.0.0.1:8080/api/health/ready
docker compose --env-file .env.example -p lf-local exec -T matching python -c 'import urllib.request; print(urllib.request.urlopen("http://127.0.0.1:8000/health/ready").read().decode())'
docker compose --env-file .env.example -p lf-local down
```

Trang kiểm tra kết nối ở http://127.0.0.1:8080/. Đợi Core sẵn sàng trước khi gọi curl hoặc dùng `docker compose logs` để xem lỗi. `down` giữ volume, `down -v` dọn cả dữ liệu của project test khi đã xác nhận có thể bỏ. Cấu hình mẫu dành cho loopback và dữ liệu giả.

## Khi đưa UC lên môi trường dùng chung

Dùng bản build định danh từ CI, cấu hình Google, secrets và DB riêng cho từng môi trường. Bật TLS khi dùng phiên thật. Chạy lại các kịch bản UC qua app mobile, ghi build, fixture và kết quả. Khi có migration, kiểm nâng cấp và phục hồi trước khi phát hành.

## Xem trước app mobile trên trình duyệt

Dùng Node.js 22.13+ (nhánh 22) hoặc 24.3+ (nhánh 24) với npm. Từ gốc repo, chạy `npm run mobile:setup` sau khi clone hoặc khi lockfile của app đổi, rồi chạy `npm run mobile:web`. Mở [localhost:8082](http://localhost:8082). Sửa mã trong `apps/mobile` để xem thay đổi khi phát triển. Nhấn Ctrl+C trong terminal để dừng.

Chọn **Dùng tài khoản mô phỏng**, thử hủy hoặc đồng ý điều khoản, vào trang chính rồi thử hủy hoặc xác nhận đăng xuất. Tải lại trang để thử lại từ đầu. Bản xem trước chỉ cần Node.js và trình duyệt. Toàn bộ dữ liệu mô phỏng nằm trong bộ nhớ của trang. Đăng nhập Google, kết nối Core và lưu phiên trong kho hệ điều hành cần bản chạy trên Android hoặc iOS.

## App Android/iOS

Trên Mac Apple Silicon, cài Node.js và JDK 17, rồi chạy từ gốc repo:

```sh
npm run mobile:setup
npm run mobile:android:setup
npm run mobile:android
```

Lần đầu, lệnh setup tải Android SDK, NDK và ảnh Android 16 có Google Play từ Google, hiện bước xác nhận giấy phép SDK và tạo máy ảo Pixel 6 `LostFound_API_36`. Dành khoảng 16 GB trống cho SDK, máy ảo và lần build đầu. SDK và dữ liệu máy ảo mặc định nằm trong `.mobile/android/`, được loại khỏi Git. Có thể dùng lại SDK bằng `ANDROID_HOME` và thư mục máy ảo bằng `ANDROID_AVD_HOME`. Lệnh chạy dùng Java 17 và khởi động máy ảo cùng development build.

Từ `apps/mobile`, chạy `npm ci`, `npm run check` và `npm test`. Cấp `EXPO_PUBLIC_CORE_URL` là URL HTTPS của gateway kèm `/api`, `EXPO_PUBLIC_GOOGLE_CLIENT_ID` là cùng Web OAuth client ID của Core, cùng `EXPO_PUBLIC_TERMS_URL` và `EXPO_PUBLIC_PRIVACY_URL` theo môi trường. Android OAuth client cần package và dấu vân tay chứng chỉ ký của build. iOS cần `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` và `GOOGLE_IOS_URL_SCHEME` là client ID đảo ngược. Giữ khóa và cấu hình riêng ngoài Git, chỉ dùng tài khoản thử trên môi trường thử nghiệm.

Trên các máy khác, cài Android Studio, chọn SDK Platform 37, mở Android Emulator có Google Play hoặc kết nối thiết bị Android, rồi chạy `npm run android` từ `apps/mobile`. Để chạy iOS trên macOS, cài Xcode và iOS Simulator, cấu hình `GOOGLE_IOS_URL_SCHEME` trước khi tạo bản build, rồi chạy `npm run ios` từ cùng thư mục. Xem [hướng dẫn cài công cụ của Expo](https://docs.expo.dev/get-started/set-up-your-environment/).

Hai lệnh tạo development build có Google SDK và kho phiên native. Sau lần cài build đầu tiên, chạy `npm start` từ `apps/mobile` để mở Metro cho các lần sửa JavaScript hoặc TypeScript. Tạo lại development build khi đổi thư viện, mã hoặc cấu hình native. Kiểm SCR-01, điều khoản theo bản cài, SCR-04, mất mạng, khôi phục phiên và cài lại qua các kịch bản UC-01.
