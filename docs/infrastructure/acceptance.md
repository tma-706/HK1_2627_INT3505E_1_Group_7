# Giao diện tích hợp và nghiệm thu hạ tầng

Khi triển khai từng phần, ghi lệnh chạy, phiên bản thành phần và kết quả kiểm thử cùng thay đổi cấu hình.

| Phần việc | Kiểm khi hoàn thành |
| --- | --- |
| Môi trường local | Khởi động từ cấu hình mẫu trên checkout mới, thao tác dừng và chạy lại có hướng dẫn. Readiness báo đúng tình trạng khi phụ thuộc chưa sẵn sàng. |
| PostgreSQL | Kiểm kết nối theo vai trò, migration trên database rỗng và dữ liệu còn sau restart. Khi thêm staging, thử restore vào môi trường kiểm thử. |
| Kho object private | Truy cập ẩn danh bị từ chối. Upload đúng mục đích bằng grant hợp lệ thành công. Grant hết hạn hoặc sai phạm vi bị từ chối. |
| Hàng đợi PostgreSQL và Worker | Job tiếp tục xử lý được sau restart và sau khi lease hết hạn. Thử lỗi tạm thời, giao lặp, chuyển `DEAD` và replay cùng ID sự kiện. Kiểm transaction rollback không để lại outbox có thể xử lý. |
| Edge | `GET /api/v1/posts` qua Nginx tới đúng upstream. Với Core thật, mã trạng thái và schema response đúng OpenAPI, dữ liệu lấy từ fixture PostgreSQL. Kiểm chuyển tiếp header xác thực và kiểu nội dung lỗi, mất upstream, TLS/rate limit theo môi trường và WSS khi kênh realtime sẵn sàng. |
| Quan sát và CI | Ghi nhận health/readiness, lỗi và độ trễ HTTP, backlog, retry và số job `DEAD` khi Worker chạy. Log tránh token, nội dung nhạy cảm và thông tin upload đã ký. CI chạy lint/bundle OpenAPI và smoke test qua Nginx. |
