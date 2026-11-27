# Phạm vi và ranh giới hạ tầng

Đây là kiến trúc mục tiêu. Ưu tiên dựng môi trường local có thể chạy lặp lại, sau đó kiểm thử tích hợp các thành phần theo tiến độ của Core API và Worker.

| Thành phần | Trách nhiệm hạ tầng |
| --- | --- |
| Nginx Edge | Định tuyến HTTPS đến Core API, chuyển tiếp địa chỉ giao thức/host phù hợp và quản lý giới hạn lưu lượng ở biên. Giữ nguyên `/api/v1` khi chuyển tuyến theo [OpenAPI](../api/core/v1/openapi.yaml). Cấu hình WSS khi hợp đồng realtime đã chốt. |
| PostgreSQL + PostGIS | Cấp database, tài khoản theo vai trò, volume và kiểm tra readiness. Phối hợp sao lưu và phục hồi dữ liệu. Core quản lý migration nghiệp vụ và ghi outbox trong giao dịch cùng thay đổi trạng thái. |
| Kho object private | Cấp bucket, tài khoản truy cập có phạm vi và endpoint cho từng môi trường. Kiểm đường upload trực tiếp bằng grant có thời hạn và quyền đọc của Core/Worker. |
| Dispatcher và hàng đợi bền vững | Môi trường chạy dispatcher, cấu hình kênh phát/nhận, retry, dead-letter queue (DLQ) và theo dõi backlog. Hợp đồng bàn giao phải chịu được giao lặp. |
| Core API và Worker | Cấu hình kết nối, quản lý cấu hình theo môi trường, health/readiness, logs và CI. Logic API và các tác vụ nghiệp vụ được triển khai trong phần việc tương ứng. |
| Email, push và AI | Cấp cấu hình tích hợp khi đến đợt triển khai. Local/CI dùng adapter giả lập hoặc môi trường thử nghiệm theo hợp đồng đã chốt. AI index là dữ liệu dẫn xuất và có thể dựng lại. |

## Quyết định cần chốt khi triển khai

- Chọn kiểu chạy local và phiên bản thành phần phù hợp với máy phát triển và CI.
- Chọn sản phẩm cho object storage và queue. Chốt quyền bucket, vòng đời dữ liệu, publish/ack, retry, DLQ và cách replay.
- Chốt endpoint readiness cho từng tiến trình, chính sách TLS/rate limit và cách cấp thông tin xác thực cho từng môi trường.
- Chốt mục tiêu vận hành, lưu giữ log, lịch backup, quy trình thử restore và thời điểm mở rộng sang staging.
