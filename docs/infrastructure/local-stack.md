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
