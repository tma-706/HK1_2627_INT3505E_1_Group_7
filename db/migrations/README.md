# Migration PostgreSQL

Đặt migration có thứ tự tại đây khi triển khai dữ liệu của UC. Mỗi thay đổi kiểm được trên DB rỗng và từ bản schema trước nếu có. [Kiến trúc](../../docs/architecture/overview.md#dữ-liệu-và-bất-biến) ghi bất biến cần giữ.

## Bảng định danh và phiên

`001_identity.sql` tạo ba bảng trên schema Core chưa có nghiệp vụ. Cách áp migration trên DB local có ở [hướng dẫn môi trường](../../docs/operations/environments.md#uc-01).

Khi bảo trì, xóa lượt có `original_token_expires_at` đã qua trước khi dọn phiên. Giữ bản ghi phiên thu hồi ít nhất 90 ngày từ `revoked_at`. Phiên chưa thu hồi chỉ dọn khi hết hạn. Giữ phiên nếu còn lượt tham chiếu. Chạy từng pha trong giao dịch và xác nhận số hàng dự kiến bằng truy vấn đọc trước khi xóa. Không dọn tài khoản trong quy trình này.


## Bảng fixture vùng cá nhân

`002_my_area.sql` áp sau 001, tạo bảng bài và yêu cầu nhận đồ tổng hợp cùng bảng cursor. Chỉ lưu bản băm của cursor. Mỗi cursor gắn tài khoản, tab và mốc thời gian/UUID, hiệu lực 24 giờ. Xem [cách chạy UC-02](../../docs/operations/environments.md#uc-02--hồ-sơ-và-mục-của-tôi).
