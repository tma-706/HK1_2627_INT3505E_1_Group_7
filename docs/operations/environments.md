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

## Chạy app Expo

Dùng Node.js 22.13+ (nhánh 22) hoặc 24.3+ (nhánh 24) với npm. Từ gốc repo, chạy `npm run mobile:setup` rồi `npm run mobile:web`. Mở [localhost:8082](http://localhost:8082) để xem UC-01 với dữ liệu mô phỏng trong bộ nhớ. Kiểm tra TypeScript và luồng mobile bằng `npm run check --prefix apps/mobile` và `npm test --prefix apps/mobile`.

Trên Windows x64, cài JDK 17 và Android Studio. Đặt `JAVA_HOME` tới JDK 17 và cài **Android SDK Command-line Tools (latest)** trong SDK Manager. Nếu SDK ở ngoài thư mục mặc định, đặt `ANDROID_HOME` tới thư mục SDK. Chạy lệnh sau từ gốc repo.

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\scripts\mobile-android.ps1
```

Trên Mac Apple Silicon đã cài JDK 17, chạy `npm run mobile:setup`, `npm run mobile:android:setup` rồi `npm run mobile:android`. Để chạy iOS trên macOS, cài Xcode và chạy `npm run ios --prefix apps/mobile`.

Nếu đã tạo thư mục native từ bản UC-01/02 trước đây, sao lưu chỉnh sửa native cục bộ rồi chạy `npx expo prebuild --clean` từ `apps/mobile` trước khi build lại.

## Chạy và kiểm UC-01

Trên DB thử nghiệm rỗng, áp [migration 001](../../db/migrations/001_identity.sql) sau khi PostgreSQL sẵn sàng. Với DB có baseline trước, theo [hướng dẫn migration](../../db/migrations/README.md) để kiểm khả năng dùng lại. Kiểm hợp đồng Core trên DB tạm bằng `bash tests/integration/core-identity.sh`. Sau `npm run build`, chạy `node --test tests/unit/google-token.test.mjs` để kiểm xác minh chữ ký và claim với khóa fixture cục bộ.

Cấu hình Core với `GOOGLE_CLIENT_ID` là Web OAuth client ID, `SESSION_REPLAY_KEY_VERSION` là phiên bản khóa đang dùng và `SESSION_REPLAY_KEYS` là JSON ánh xạ phiên bản tới khóa ngẫu nhiên 32 byte mã hóa base64url. Giữ cùng cấu hình khóa trên các instance và giữ khóa cũ tới khi token gốc của các lượt liên quan hết hạn. Cấp khóa qua cơ chế secrets của môi trường.

Build native với `EXPO_PUBLIC_CORE_URL` là URL HTTPS của gateway có hậu tố `/api`, `EXPO_PUBLIC_GOOGLE_CLIENT_ID` trùng Web OAuth client ID của Core và các URL HTTPS `EXPO_PUBLIC_TERMS_URL`, `EXPO_PUBLIC_PRIVACY_URL`. Android cần OAuth client khớp package và chứng chỉ build. iOS cần `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` và `GOOGLE_IOS_URL_SCHEME` là URL scheme từ cấu hình iOS OAuth. Dùng tài khoản thử và gateway bật TLS khi nghiệm thu Google thật.

Tra kịch bản theo [đặc tả UC-01](../use-cases/uc-01-google-sign-in-and-session.md) và [lượt UC-01 v2](runs/uc-01-essential-v2.json).

## Chạy và kiểm UC-02

Áp [migration 002](../../db/migrations/002_my_area.sql) sau 001 trên DB thử nghiệm. Xem [hướng dẫn migration](../../db/migrations/README.md) nếu DB từng áp 002. Từ gốc repo, `bash tests/integration/core-identity.sh` tạo PostgreSQL tạm, áp hai migration và dùng fixture tổng hợp để kiểm phiên, quyền đọc, phân trang và schema. Bài phân trang sâu đối chiếu đủ 1.000 mục mỗi tab. `npm test --prefix apps/mobile` kiểm thêm luồng Hồ sơ, đổi tab, xử lý cursor, giữ dữ liệu khi lỗi tạm và dọn dữ liệu khi mất phiên.

Trong Expo web dev, dùng tài khoản mô phỏng rồi chạm **Hồ sơ** để xem cả ba tab. Native gọi API qua cùng gateway HTTPS với UC-01. Các trạng thái UI, kiểm chứng trên thiết bị và số đo theo dõi trong [lượt UC-02 v2](runs/uc-02-essential-v2.json) và [đặc tả UC-02](../use-cases/uc-02-profile-and-my-items.md).
