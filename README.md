# Campus Lost & Found · Core API

Nhánh triển khai Core API cho các luồng tài khoản, bài Lost/Found, yêu cầu nhận đồ, trao trả, chat, ảnh, thông báo, kiểm duyệt và danh mục.

- [Bắt đầu và chạy mock cục bộ](docs/core-api/README.md)
- [Phạm vi, kế hoạch bàn giao và ánh xạ use case](docs/core-api/scope.md)
- [Đặc tả REST v1](docs/api/core/v1/openapi.yaml)
- [Quy tắc nghiệp vụ và phân quyền](docs/core-api/domain-rules.md)
- [Mô hình dữ liệu và fixture](docs/core-api/data-model.md)
- [Giao diện tích hợp](docs/core-api/integration-contracts.md)
- [Nghiệm thu và smoke test](docs/core-api/acceptance-tests.md)

## Chạy UC-01 với Gateway và hộp thư local

Core v1 dùng `compose.yaml` và `compose.core.yaml`. Tạo chứng chỉ với Git Bash (`sh infra/nginx/generate-local-tls.sh`). Trong PowerShell, đặt khóa mã hóa trước khi khởi chạy stack local. Dùng lại cùng khóa khi khởi động lại stack còn công việc chờ gửi.

```powershell
$env:LF_IDENTITY_OUTBOX_KEY = node -p "require('node:crypto').randomBytes(32).toString('hex')"
docker compose -f compose.yaml -f compose.core.yaml up -d --build --wait
$env:NODE_EXTRA_CA_CERTS = (Resolve-Path '.local/tls/gateway-ca.crt').Path
node tests/core-identity.mjs
```

Mở [hộp thư local](http://127.0.0.1:8025) để xem thư tổng hợp. Đặt `EXPO_PUBLIC_GATEWAY_URL` trong `apps/mobile/.env` theo địa chỉ Gateway mà thiết bị truy cập được. Đặt `EXPO_PUBLIC_MAILBOX_URL=http://10.0.2.2:8025` để nút **Mở hộp thư** trên giả lập Android đưa người dùng vào Mailpit. Dùng bản Expo development build nhận scheme `campus-lost-found`. Liên kết thử nghiệm mặc định là `campus-lost-found://verify-email`. Dùng Git Bash với `sh tests/core-feed.sh` để kiểm hồi quy bảng tin khi stack đã chạy.

```powershell
npm ci
npm run generate:identity
npm run check:clients
npm run android --workspace @lost-found/mobile
```

Sau khi xác thực, màn đăng ký bàn giao sang điểm tích hợp đăng nhập UC02. Hộp thư local giữ email tổng hợp trong môi trường chạy thử.
