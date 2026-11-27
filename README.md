# Campus Lost & Found · Hạ tầng

Nhánh dựng môi trường chạy cho Core API và Worker.

- [Kiến trúc triển khai và tổ chức mã nguồn](docs/architecture/implementation-baseline.md)
- [Phạm vi và ranh giới hạ tầng](docs/infrastructure/architecture.md)
- [Kế hoạch triển khai môi trường local và CI](docs/infrastructure/local-stack.md)
- [Giao diện tích hợp và tiêu chí nghiệm thu](docs/infrastructure/acceptance.md)
- [Hợp đồng REST v1 dùng để kiểm thử định tuyến](docs/api/core/v1/openapi.yaml)

## Chạy stack mock qua HTTPS

Cần Docker đang chạy, Docker Compose có hỗ trợ `up --wait`, `curl` và `openssl` có hỗ trợ `req -addext`. Chạy từ gốc repo trên macOS hoặc Linux.

```sh
sh infra/nginx/generate-local-tls.sh
docker compose up --build --wait --wait-timeout 60
curl --noproxy '*' --cacert .local/tls/gateway-ca.crt -i \
  https://127.0.0.1:8443/api/v1/posts
sh infra/smoke-posts.sh
```

`curl` xác minh chứng chỉ và địa chỉ IP, rồi in HTTP `200` cùng JSON. Script smoke kiểm thêm `Content-Type` và kiểm toàn bộ response theo schema `PublicPostPage` của OpenAPI v1 đã bundle. Nginx giữ nguyên `/api/v1` khi chuyển tiếp đến mock trong mạng Compose. Nếu cổng `8443` đang bận, chạy `export LF_HTTPS_PORT=9443` trước khi khởi động và dùng cổng đó trong lệnh `curl`.

Chứng chỉ máy chủ phát triển có hiệu lực 30 ngày. Script cấp lại chứng chỉ máy chủ bằng CA local hiện có. File công khai của CA là `.local/tls/gateway-ca.crt`, khóa ký nằm trong `.local/gateway-ca.key`. Khi tạo lại chứng chỉ máy chủ, dùng `docker compose restart nginx` để Nginx nạp chứng chỉ mới.

```sh
docker compose down
```

Để chạy lại, dùng `docker compose up --build --wait --wait-timeout 60` với chứng chỉ còn hạn. Workflow `Local stack` trên `pull_request` lint và bundle OpenAPI khi build image mock, rồi chạy cùng script smoke qua Nginx.

## Chạy bảng tin Core với PostgreSQL

Dùng cùng Docker Compose, chứng chỉ và cổng HTTPS như stack mock. Nếu stack mock đang chạy, dừng bằng `docker compose down` trước khi đổi cấu hình. Chạy từ gốc repo:

```sh
export COMPOSE_FILE=compose.yaml:compose.core.yaml
sh infra/nginx/generate-local-tls.sh
docker compose up --build --wait --wait-timeout 90
curl --noproxy '*' --cacert .local/tls/gateway-ca.crt -i \
  https://127.0.0.1:8443/api/v1/posts
sh tests/core-feed.sh
docker compose down
unset COMPOSE_FILE
```

Compose chạy migration và nạp fixture trước khi Core phục vụ request. PostgreSQL và Core chỉ có cổng trong mạng Compose. Core kết nối bằng role `core_reader` có quyền đọc bảng bài đăng. Mock cấp bộ kiểm schema cho smoke test, còn Nginx chuyển request đến Core. Bảng tin hiện trả danh sách ảnh công khai rỗng.

Giá trị mặc định là thông tin mẫu cho local. Có thể chép `.env.example` thành `.env` và sửa giá trị trước khi khởi tạo volume lần đầu. `docker compose down` giữ dữ liệu. Để đặt lại môi trường local, dùng `docker compose down --volumes` trong lúc `COMPOSE_FILE` đang được đặt. Lệnh đó xóa PostgreSQL volume của dự án Compose hiện tại.

## Kiểm tra kho ảnh riêng

Dùng Node.js 22 trở lên. Stack Core khởi tạo bucket SeaweedFS private có versioning. Media có cổng HTTPS riêng, mặc định là `8444`.

```sh
export COMPOSE_FILE=compose.yaml:compose.core.yaml
export LF_MEDIA_UPLOAD_SECONDS=10
sh infra/nginx/generate-local-tls.sh
docker compose up --build --wait --wait-timeout 90
NODE_EXTRA_CA_CERTS="$PWD/.local/tls/gateway-ca.crt" node tests/core-media.mjs
```

Bài kiểm tự tạo hai phiên Bearer tạm trong PostgreSQL và dọn bản ghi khi xong. Core cấp POST cho một object ảnh đại diện tạm qua `POST /api/v1/me/uploads`. Chủ lượt upload có thể lấy URL xem ảnh tối đa 60 giây từ `GET /api/v1/uploads/{uploadId}` sau khi Core khớp dung lượng, metadata và SHA-256 của phiên bản object. Mặc định grant upload có hiệu lực 5 phút. Bỏ biến `LF_MEDIA_UPLOAD_SECONDS` để chạy với thời hạn mặc định.

Dùng `docker compose down` để dừng stack và giữ các volume. Với client ngoài máy host, đặt `LF_S3_PUBLIC_ENDPOINT` thành origin HTTPS mà client truy cập được và có trong chứng chỉ local.


## Demo bảng tin trên Mobile và Admin

Khởi động stack Core và PostgreSQL như ở trên và giữ stack chạy trong lúc demo. Cài các client bằng Node.js 22.13+ hoặc 24.3+ từ gốc repo.

```sh
npm ci
npm run check:clients
```

### Admin trên trình duyệt

Thêm `.local/tls/gateway-ca.crt` vào kho CA tin cậy của trình duyệt hoặc hệ điều hành trên máy demo. Trong Firefox có thể nhập tại **Settings → Privacy & Security → Certificates → View Certificates → Authorities** và bật quyền xác thực website. Mở `https://127.0.0.1:8443/api/v1/posts` trong trình duyệt và kiểm JSON tải được qua HTTPS. Sau đó chạy:

```sh
cp apps/admin/.env.example apps/admin/.env.local
npm run dev -w @lost-found/admin
```

Mở `http://127.0.0.1:5173`. Gateway cho phép origin này đọc `GET /api/v1/posts` qua CORS. Nếu đổi origin Admin, đặt `LF_ADMIN_ORIGIN` bằng origin đầy đủ rồi chạy lại `docker compose up -d nginx` trong stack Core.

### Mobile trên Android Emulator

Dùng Android SDK, JDK 21 và một AVD đang chạy. Android Emulator dùng `10.0.2.2` để vào loopback của máy phát triển. Chứng chỉ Gateway local có địa chỉ đó trong SAN. Build debug Expo có thể nạp đúng CA local để Android kiểm cả chuỗi chứng chỉ lẫn địa chỉ Gateway.

```sh
cp apps/mobile/.env.example apps/mobile/.env.local
LF_ANDROID_GATEWAY_CA="$PWD/.local/tls/gateway-ca.crt" \
  npm run android -w @lost-found/mobile
```

Expo áp dụng plugin khi tạo dự án native. Nếu thư mục `apps/mobile/android` đã tồn tại và CA thay đổi, chạy `(cd apps/mobile && LF_ANDROID_GATEWAY_CA="$PWD/../../.local/tls/gateway-ca.crt" npx expo prebuild --platform android)` trước khi build lại. Với Gateway có chứng chỉ được thiết bị tin cậy sẵn, chỉ cần cấu hình `EXPO_PUBLIC_GATEWAY_URL` và dùng Expo Go tương thích với SDK 58 hoặc development build.

Với điện thoại Android cùng mạng LAN, đặt `LF_TLS_LAN_IP` và `LF_HTTPS_BIND_IP` bằng IPv4 LAN của máy phát triển, chạy lại script cấp TLS, rồi chạy `docker compose up -d --force-recreate nginx` trong stack Core. Đổi `EXPO_PUBLIC_GATEWAY_URL` thành `https://<IPv4-LAN>:8443` trước khi chạy Mobile. Với thiết bị iOS, dùng Gateway có CA được thiết bị tin cậy và SAN khớp với địa chỉ thiết bị truy cập.

Cả hai màn hình phải hiển thị **Chìa khóa ở thư viện** (`fixture-found-keys`) và **Ví vải màu xanh** (`fixture-lost-wallet`) từ Core. Kiểm cả tiêu đề và mô tả ở mỗi màn hình. Khi cổng HTTPS thay đổi, cập nhật URL của cả hai client và khởi động lại Vite hoặc Metro. [Mạng Android Emulator](https://developer.android.com/studio/run/emulator-networking-address)

Sau khi đổi schema response của bảng tin trong OpenAPI, chạy `npm run generate:feed` và kiểm lại hai client.
