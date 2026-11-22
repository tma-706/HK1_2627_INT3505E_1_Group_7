# Migration PostgreSQL

Đặt migration có thứ tự tại đây khi triển khai dữ liệu của UC. Mỗi thay đổi kiểm được trên DB rỗng và từ bản schema trước nếu có. [Kiến trúc](../../docs/architecture/overview.md#dữ-liệu-và-bất-biến) ghi bất biến cần giữ.

Áp `001_identity.sql` trên DB mới cho UC-01. Migration tạo `accounts`, `sessions` và `login_attempts` trong một giao dịch. Kiểm tên cột, kiểu và khóa/ràng buộc với tệp SQL trước khi xác nhận DB cũ đã có baseline 001. Giữ nguyên dữ liệu và ghi nhận chênh lệch nếu schema cũ cần nâng cấp riêng.

## Bảng định danh và phiên

Quy tắc bảo trì phiên của thiết kế UC-01 dùng cho lần triển khai tiếp theo. Xóa lượt cấp có `original_token_expires_at` đã qua trước khi dọn phiên. Giữ phiên thu hồi ít nhất 90 ngày từ `revoked_at`. Phiên chưa thu hồi chỉ dọn khi hết hạn. Giữ phiên nếu còn lượt cấp tham chiếu. Chạy từng pha trong giao dịch và xác nhận số hàng dự kiến bằng truy vấn đọc. Giữ tài khoản ngoài phạm vi dọn phiên.

## Dữ liệu thử nghiệm UC-02

Áp `002_my_area.sql` một lần sau 001 để tạo hai bảng fixture và bảng cursor. Với DB từng áp 002, đối chiếu cột, kiểu, ràng buộc và chỉ mục với tệp SQL trước khi xác nhận baseline. Nếu tương thích, tiếp tục dùng các bảng và dữ liệu hiện có. Ghi chênh lệch để xem xét migration riêng. Mã cursor chỉ được lưu dưới dạng băm, có hiệu lực 24 giờ. Bảo trì có thể dọn bản ghi cursor đã hết hạn trong DB thử nghiệm.
