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

## Nghiệm thu bảo mật UC-01/02

Dùng Node 22, Docker Compose, OpenSSL và `certutil` của NSS (`brew install nss` trên macOS,
`libnss3-tools` trên Ubuntu). Suite dựng một Compose project riêng và dùng CA của fixture
cho client HTTPS và profile Firefox tạm. Trên Ubuntu, cài thư viện hệ thống của Firefox
qua `npm run security:web:setup -- --with-deps` sau `npm ci`. Báo cáo đã lọc nằm trong `dist/security/`.

```sh
npm ci
npm run mobile:setup
npm run security:web:setup
npm run security:validate
npm run security:test
```

Nếu cổng 8443 đang dùng, đặt `UC01_HTTPS_PORT` thành cổng loopback còn trống. Xem
[skill test-security](../../.agents/skills/test-security/SKILL.md) để cập nhật
suite hoặc điều tra bằng chứng ở revision đã chạy.

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

## UC-01

### Cấu hình Core và cơ sở dữ liệu

Dùng một DB thử nghiệm riêng. Áp migration sau khi PostgreSQL sẵn sàng, trên DB chưa có schema nghiệp vụ. Lệnh dừng tại lỗi SQL và migration chạy trong giao dịch.

```sh
docker compose --env-file .env.example -p lf-local up -d db
docker compose --env-file .env.example -p lf-local exec -T db \
  psql -v ON_ERROR_STOP=1 -U lost_found -d lost_found < db/migrations/001_identity.sql
```

Cấu hình Core theo môi trường bằng `GOOGLE_CLIENT_ID` (Web OAuth client ID), `SESSION_REPLAY_KEY_VERSION` và `SESSION_REPLAY_KEYS`. Biến cuối là JSON ánh xạ phiên bản tới khóa ngẫu nhiên 32 byte mã hóa base64url. Cấp khóa qua cấu hình bí mật, dùng cùng một bộ khóa cho mọi instance trong môi trường và giữ phiên bản cũ tới khi mọi token Google của các lượt dùng khóa đó hết hạn. Đổi khóa đang dùng sau khi mọi instance đọc được cả hai phiên bản. Giữ kết nối HTTPS tới tập khóa Google và bật TLS ở cổng phục vụ thông tin xác thực thật. Các operation qua gateway có tiền tố `/api`. Cấu hình Compose loopback phục vụ kiểm tra local bằng fixture.

Kiểm contract và phiên với `bash tests/integration/core-identity.sh`. Lệnh tạo PostgreSQL fixture tạm, áp migration và chạy kiểm thử qua Core HTTP handler với bộ xác minh được tiêm riêng. Đăng nhập Google thật và thử trên thiết bị cần cấu hình OAuth và gateway HTTPS của môi trường thử nghiệm.

### App Android/iOS

Trên Windows x64, dùng [script PowerShell trong README](../../README.md#chạy-android-trên-windows). Script dùng SDK của Android Studio và mặc định lưu cấu hình máy ảo trong `.mobile/android/avd/`.

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


## UC-02 · Hồ sơ và Mục của tôi

Trên DB thử nghiệm đã có `001_identity.sql`, áp `002_my_area.sql` một lần. Lệnh HTTPS fixture tự áp theo thứ tự trên DB của project local.

```sh
bash infra/uc01-local/run.sh up
bash tests/integration/core-identity.sh
npm run check --prefix apps/mobile
npm test --prefix apps/mobile
```

Bộ kiểm Core áp migration 002 lên PostgreSQL tạm đã có tài khoản và phiên UC-01, sau đó kiểm hai operation đọc bằng tài khoản tổng hợp. Xem [kế hoạch hiệu năng UC-02](../../tests/performance/uc-02/test-plan.md) để nạp dữ liệu và chạy smoke, pilot và phân trang sâu. Bộ fixture hoạt động qua gateway HTTPS cục bộ. Đăng nhập native với Google thật dùng cấu hình thử nghiệm UC-01 ở trên.

Mở **Hồ sơ → Mục của tôi** để kiểm ba tab, cuộn cuối để tải thêm, kéo xuống để làm mới trên Android/iOS. Bản web dùng nút **Làm mới**. Chạm hàng Lost/Found để kiểm loại và mã bài ở đích thử nghiệm. Hàng Yêu cầu nhận đồ chỉ hiển thị dữ liệu. Đăng xuất từ Hồ sơ sử dụng xác nhận của UC-01.
