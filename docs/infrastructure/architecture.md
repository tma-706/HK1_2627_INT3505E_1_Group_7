# Phạm vi và ranh giới hạ tầng

Ưu tiên dựng môi trường local có thể chạy lặp lại, sau đó kiểm thử tích hợp theo tiến độ của Core API và Worker. Xem [kiến trúc triển khai](../architecture/implementation-baseline.md) để tra stack, tổ chức mã nguồn và phạm vi đợt đầu.

| Thành phần | Trách nhiệm hạ tầng |
| --- | --- |
| Nginx Edge | Định tuyến HTTPS đến Core API, chuyển tiếp địa chỉ giao thức/host phù hợp và quản lý giới hạn lưu lượng ở biên. Giữ nguyên `/api/v1` khi chuyển tuyến theo [OpenAPI](../api/core/v1/openapi.yaml). Cấu hình WSS khi hợp đồng realtime đã chốt. |
| PostgreSQL | Cấp database, tài khoản theo vai trò, volume và kiểm tra readiness. Phối hợp sao lưu và phục hồi dữ liệu. Core quản lý migration nghiệp vụ và ghi outbox trong giao dịch cùng thay đổi trạng thái. |
| Kho object private | Cấp bucket, tài khoản truy cập có phạm vi và endpoint cho từng môi trường. Kiểm đường upload trực tiếp bằng grant có thời hạn và quyền đọc của Core/Worker. |
| Hàng đợi PostgreSQL | Cấp môi trường để Worker nhận job bằng lease, retry và replay job `DEAD`. Theo dõi backlog và lỗi xử lý. |
| Core API và Worker | Cấu hình kết nối, quản lý cấu hình theo môi trường, health/readiness, logs và CI. Logic API và các tác vụ nghiệp vụ được triển khai trong phần việc tương ứng. |
| Email, push và AI | Cấp cấu hình tích hợp khi đến đợt triển khai. Local/CI dùng adapter giả lập hoặc môi trường thử nghiệm theo hợp đồng đã chốt. AI index là dữ liệu dẫn xuất và có thể dựng lại. |

## Quyết định cần chốt khi triển khai

- Ghim phiên bản image trong Compose phù hợp với máy phát triển và CI.
- Chọn sản phẩm kho object tương thích S3. Chốt quyền bucket và vòng đời dữ liệu.
- Chốt thời hạn lease, lịch retry và thao tác replay job `DEAD` khi tích hợp Worker.
- Chốt endpoint readiness cho từng tiến trình, chính sách TLS/rate limit và cách cấp thông tin xác thực cho từng môi trường.
- Chốt mục tiêu vận hành, lưu giữ log, lịch backup, quy trình thử restore và thời điểm mở rộng sang staging.
