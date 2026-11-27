# Giao diện tích hợp và nghiệm thu hạ tầng

Khi triển khai từng phần, ghi lệnh chạy, phiên bản thành phần và kết quả kiểm thử cùng thay đổi cấu hình.

| Phần việc | Kiểm khi hoàn thành |
| --- | --- |
| Môi trường local | Khởi động từ cấu hình mẫu trên checkout mới, thao tác dừng và chạy lại có hướng dẫn. Readiness báo đúng tình trạng khi phụ thuộc chưa sẵn sàng. |
| PostgreSQL/PostGIS | Kiểm kết nối từ tiến trình đúng vai trò, extension PostGIS khả dụng và dữ liệu còn sau restart thông thường. Khi thêm triển khai staging, thử restore vào môi trường kiểm thử. |
| Kho object private | Truy cập ẩn danh bị từ chối. Upload đúng mục đích bằng grant hợp lệ thành công. Grant hết hạn hoặc sai phạm vi bị từ chối. |
| Queue, dispatcher và Worker | Tác vụ đã được giao tiếp tục xử lý được sau restart. Thử lỗi tạm thời, giao lặp, chuyển DLQ và replay có kiểm soát khi luồng đầy đủ khả dụng. Kiểm với Core rằng transaction rollback không phát sự kiện. |
| Edge | Request `GET /api/v1/posts` tới đúng upstream. Header xác thực và kiểu nội dung lỗi của upstream tới đúng bên gọi. Kiểm mất upstream, TLS/rate limit theo cấu hình môi trường và WSS khi kênh realtime sẵn sàng. |
| Quan sát và CI | Ghi nhận health/readiness, lỗi và độ trễ HTTP, backlog queue, retry/DLQ khi thành phần tương ứng chạy. Log tránh token, nội dung nhạy cảm và thông tin upload đã ký. CI chạy bundle/lint và smoke test với môi trường đích. |
