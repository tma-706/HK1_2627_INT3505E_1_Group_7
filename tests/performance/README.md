# Kiểm thử hiệu năng Core theo use case

| Use case | Profile của bản thực nghiệm trước | Phạm vi đo |
| --- | --- | --- |
| [UC-01 · Đăng nhập Google và quản lý phiên](uc-01/test-plan.md) | `smoke`, `local-pilot`, `local-session-reconnect` | Cấp, xác minh, thu hồi phiên và hồi phục sau đợt kết nối lại |
| [UC-02 · Hồ sơ và Mục của tôi](uc-02/test-plan.md) | `smoke`, `local-pilot`, `local-deep-pagination` | Đọc hồ sơ, làm mới danh sách và duyệt đủ 1.000 mục mỗi tab |

Các kế hoạch, thông số tải và [kết quả đã chạy](analysis.md) là tài liệu tham chiếu cho bản triển khai tiếp theo. Hai suite và job hồi quy hiệu năng đã được gỡ cùng mã UC cũ. CI hiện chạy kiểm tra Core dùng chung. Khi có bản triển khai mới, cập nhật fixture và suite theo contract rồi đăng ký lại các profile đã chọn trong CI.
