# Kế hoạch môi trường local và CI

1. **Cấu hình và dữ liệu.** Tạo Docker Compose và tệp biến môi trường mẫu với giá trị giả. Khai báo endpoint nội bộ, cổng cần truy cập từ host và tài khoản riêng theo vai trò. Dựng PostgreSQL với volume và hướng dẫn khởi tạo, dừng, đặt lại dữ liệu local.
2. **Lát cắt feed công khai.** Định tuyến `/api/v1` qua Nginx đến mock, sau đó chạy `GET /api/v1/posts` với Core thật và PostgreSQL đã chạy migration cùng dữ liệu mẫu. CI lint/bundle OpenAPI, gửi request qua Nginx và kiểm mã trạng thái cùng schema response. Kiểm readiness và hành vi khi upstream mất kết nối.
3. **Kho object và xử lý nền.** Khi tích hợp media, dựng bucket private và kiểm đường upload từ client. Khi tích hợp Worker, kiểm job bền qua restart, thu hồi lease hết hạn, retry, chuyển `DEAD` và replay.
4. **Staging.** Bổ sung cấu hình triển khai, readiness, thông tin xác thực, backup/restore và tài liệu xử lý lỗi.

## Mock để thử định tuyến

Dùng Node.js 22 trở lên và chạy từ gốc repo trên macOS/Linux.

```sh
spec="${TMPDIR:-/tmp}/lost-found-infra-openapi.json"
npx --yes @redocly/cli@2.82.0 bundle docs/api/core/v1/openapi.yaml --output "$spec"
node docs/api/core/v1/mock.mjs "$spec"
```

Gọi `curl -i http://127.0.0.1:4010/api/v1/posts`, dự kiến trả HTTP `200`. Các phản hồi mock lấy từ ví dụ tĩnh trong đặc tả. Dùng bản backend tích hợp để kiểm readiness, quyền truy cập dữ liệu và xử lý nền.

## Kết quả kiểm tra stack mock qua Nginx

Chạy [các lệnh trong README](../../README.md#chạy-stack-mock-qua-https) từ bản sao sạch. Môi trường kiểm tra dùng macOS arm64, Docker Engine 29.8.1, Compose 5.5.1, Nginx 1.30.8, Node.js 22.23.4, Redocly CLI 2.82.0 và Ajv 8.18.0.

- `docker compose --progress plain build --no-cache mock` lint và bundle thành công. Redocly báo một cảnh báo có sẵn về `info.license`.
- `docker compose up --wait --wait-timeout 60` báo cả hai dịch vụ healthy. `curl --cacert` nhận `200 application/json` qua Nginx. `sh infra/smoke-posts.sh` xác nhận một bài đăng hợp schema `PublicPostPage`.
- `curl` trả mã thoát `60` khi thiếu `--cacert` hoặc khi dùng sai hostname. Ajv từ chối response thiếu `nextCursor` và response có `occurredAt` sai định dạng.
- Sau `docker compose stop mock`, request đầu nhận `504`, rồi Nginx trả `502` và chuyển sang `unhealthy`. Chạy lại `docker compose up --wait --wait-timeout 60` khôi phục HTTP `200` với cùng container Nginx.
- `actionlint .github/workflows/local-stack.yml` đạt. Cần xác minh lượt chạy `pull_request` trên runner GitHub `ubuntu-24.04`, gồm bước lint/bundle, smoke HTTPS và teardown.

## Kiểm tra bảng tin Core với PostgreSQL

Dùng cấu hình Compose tích hợp trong [README](../../README.md#chạy-bảng-tin-core-với-postgresql). Trên macOS arm64 với Compose 5.5.1, Node.js 22.23.4, Nginx 1.30.8 và PostgreSQL 17.12, `docker compose up --build --wait --wait-timeout 90` đã chạy migration từ volume rỗng. `sh tests/core-feed.sh` nhận HTTP 200 với TLS hợp lệ, đối chiếu schema và ID của hai fixture công khai, rồi kiểm tra bộ lọc, phân trang và cursor sai phạm vi. Sau `docker compose restart db` và `docker compose up --wait --wait-timeout 90`, phép kiểm vẫn đạt. Quyền của role `core_reader` trên bảng bài đăng cho phép SELECT và từ chối INSERT.

Chạy lại mode mock với `sh infra/smoke-posts.sh item-123` cũng đạt. GitHub Actions chạy cả hai chế độ trong hai job riêng.

## Kiểm tra Mobile và Admin với Core

Đã chạy theo [hướng dẫn demo](../../README.md#demo-bảng-tin-trên-mobile-và-admin) trên macOS arm64 với Node.js 24.4.0, Compose 5.5.1, Nginx 1.30.8 và PostgreSQL 17.12. `npm run check:clients`, build Admin và `sh tests/core-feed.sh` đều đạt. Phép kiểm Gateway xác nhận origin Admin được phép đọc bảng tin và một origin khác bị từ chối.

- **Mobile.** Build debug Expo 58.1.0 trên Android Emulator 37.3.10.0 chạy API 36. Ứng dụng xác minh TLS qua CA local với URL `https://10.0.2.2:8443/api/v1/posts`. Nginx ghi nhận HTTP 200 từ Android.
- **Admin.** Firefox 159.0 nạp CA local trong profile demo và nhận HTTP 200 từ `https://127.0.0.1:8443/api/v1/posts`. Admin chạy trên Vite 7.3.8 tại `http://127.0.0.1:5173`. Đã kiểm tra thông báo lỗi và nút thử lại khi ngắt request trong trình duyệt.

Cả hai màn hình hiển thị tiêu đề và mô tả của `fixture-found-keys` và `fixture-lost-wallet`.

## Kiểm tra kho ảnh riêng

Stack Core dùng SeaweedFS 4.55 với bucket `campus-private` trên volume riêng, bật versioning và quy tắc hết hạn sau một ngày cho các object tạm dưới `uploads/`. Core dùng tài khoản S3 giới hạn theo bucket và vùng object. Nginx công bố cổng HTTPS media riêng và chuyển tiếp đường dẫn cùng host đã ký.

Đã chạy [bộ kiểm ảnh mẫu](../../README.md#kiểm-tra-kho-ảnh-riêng) trên Docker Engine 29.8.1 và Compose 5.5.1 từ volume PostgreSQL và SeaweedFS rỗng. POST hợp lệ trả `204` và version ID. Policy hết hạn, sai key, sai loại ảnh và sai dung lượng đều bị kho từ chối. Chủ lượt lấy được ảnh đúng byte qua URL xem trước. Người dùng khác nhận `404`, khách nhận `401` từ Core, và kho trả `403` khi đọc object không có chữ ký. Bộ kiểm cũng kiểm việc gửi lại cùng khóa idempotency, giữ đúng phiên bản đã ký và không cấp preview cho dữ liệu sai SHA-256. Bài kiểm bảng tin chạy đạt trên cùng stack.

CI chạy các ca này trong job Core. Luồng đã tích hợp dùng ảnh đại diện tạm và phiên thử nghiệm được nạp trực tiếp vào PostgreSQL. Các mục đích upload gắn với bài đăng, phản hồi, khiếu nại, và xử lý ảnh qua Worker phụ thuộc vào các module nghiệp vụ tương ứng.
