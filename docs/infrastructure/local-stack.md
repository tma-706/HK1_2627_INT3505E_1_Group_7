# Kế hoạch môi trường local và CI

1. **Cấu hình và mạng.** Tạo cấu hình khởi động local theo cách đã chọn và một tệp biến môi trường mẫu chỉ chứa giá trị giả. Quy định endpoint nội bộ, cổng cần truy cập từ host và cách cấp thông tin xác thực riêng cho từng tiến trình.
2. **Dữ liệu và kho object.** Dựng PostgreSQL với PostGIS, cấp database, tài khoản và volume. Dựng bucket private và kiểm đường truy cập từ ứng dụng cùng đường upload từ client. Bổ sung lệnh khởi tạo, dừng và đặt lại dữ liệu local.
3. **Hàng đợi.** Cấp hàng đợi và DLQ cho luồng thử nghiệm. Kiểm publish, nhận/ack, liệu message có còn sau restart và điều kiện chuyển DLQ.
4. **Edge và smoke test.** Định tuyến `/api/v1` đến mock, sau đó chạy cùng phép kiểm trên Core thật khi có. Bổ sung kiểm cấu hình Nginx, readiness của phụ thuộc và xử lý khi upstream mất kết nối.
5. **CI và staging.** Chạy kiểm hợp đồng và smoke test trong môi trường tạo mới. Khi có staging, bổ sung cấu hình triển khai, readiness, thông tin xác thực, backup/restore và tài liệu xử lý lỗi.

## Mock để thử định tuyến

Dùng Node.js 22 trở lên và chạy từ gốc repo trên macOS/Linux.

```sh
spec="${TMPDIR:-/tmp}/lost-found-infra-openapi.json"
npx --yes @redocly/cli@2.82.0 bundle docs/api/core/v1/openapi.yaml --output "$spec"
node docs/api/core/v1/mock.mjs "$spec"
```

Gọi `curl -i http://127.0.0.1:4010/api/v1/posts`, dự kiến trả HTTP `200`. Các phản hồi mock lấy từ ví dụ tĩnh trong đặc tả. Dùng bản backend tích hợp để kiểm readiness, quyền truy cập dữ liệu và xử lý nền.
