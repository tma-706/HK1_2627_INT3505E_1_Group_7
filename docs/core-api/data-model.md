# Mô hình dữ liệu Core API

Mô hình dưới đây là thiết kế logic để viết migration theo từng cụm UC. Schema request/response nằm trong [OpenAPI](../api/core/v1/openapi.yaml). Thiết kế cột, kiểu khóa và chỉ mục được chốt khi triển khai.

| Nhóm dữ liệu Core sở hữu | Quan hệ và ràng buộc cần giữ |
| --- | --- |
| Tài khoản, hồ sơ, phiên, xác minh email và đặt lại mật khẩu | Chuẩn hóa email theo chính sách đã chốt trước khi kiểm tính duy nhất. Phiên và thông tin xác thực ngắn hạn gắn với tài khoản, có hạn và trạng thái thu hồi hoặc tiêu thụ. Đổi mật khẩu và tiêu thụ token reset trong cùng giao dịch. |
| Danh mục, khu vực, bản nháp, bài và revision | Mỗi bài có tác giả, loại Lost/Found và hai trục trạng thái xử lý/hiển thị. Gắn bản che và ảnh vào revision tương ứng. Truy vấn công khai theo tiêu chí đã chốt và thứ tự `publishedAt DESC, postId DESC` với bộ lọc để tiếp tục phân trang. |
| Câu hỏi xác minh, claim và phản hồi | Gắn tương tác với bài đích và chủ thể gửi. Duy trì giới hạn tương tác hoạt động và cửa sổ quota theo [quy tắc nghiệp vụ](domain-rules.md). Quyết định đồng thời trên cùng bài chỉ có một kết quả thắng. |
| Yêu cầu trao trả và hội thoại | Gắn với bài và tương tác đã được duyệt. Chỉ hai bên của tương tác có quyền theo trạng thái. Lưu việc xác nhận của từng bên và cập nhật kết quả trao trả trong cùng giao dịch với thay đổi liên quan. |
| Upload, ảnh và bản che | Gắn grant với chủ thể, đích, mục đích và nội dung yêu cầu. Ghi tham chiếu phiên bản nguồn và bản dẫn xuất, ngăn xác nhận lặp tạo thêm việc. Phân biệt bản dẫn xuất được phép đọc công khai và dữ liệu gốc hạn chế theo quyền. |
| Tin nhắn, thông báo và tùy chọn | Tin nhắn thuộc hội thoại. Inbox, trạng thái đọc và tùy chọn kênh gắn với người nhận. Tác vụ gửi lại có khóa xử lý lặp phù hợp với sự kiện và người nhận. |
| Báo cáo, vụ việc kiểm duyệt, quyết định và khiếu nại | Lưu chủ thể, tài nguyên, thời điểm, lý do và quyết định được khiếu nại. Quyết định xét lại giữ lịch sử, cập nhật biện pháp và ghi audit nhất quán. |
| Outbox | Thay đổi nghiệp vụ và bản ghi sự kiện cần phát được lưu trong cùng giao dịch. Mỗi event có định danh ổn định để bên nhận xử lý giao lặp. |

## Migration và dữ liệu mẫu

- Thiết kế theo PostgreSQL. Chốt cách dùng PostGIS cùng hợp đồng dữ liệu vị trí trước khi tạo các trường hoặc chỉ mục không gian dùng trong nghiệp vụ.
- Đưa migration ràng buộc và dữ liệu tham chiếu cần thiết vào cùng thay đổi triển khai. Kiểm cả khởi tạo sạch và nâng cấp từ dữ liệu đã có khi một migration thay đổi cấu trúc hoặc cách hiểu dữ liệu.
- Dựng fixture tổng hợp gồm tác giả bài Found, người báo Lost, hai người gửi tương tác, một người ngoài và tài khoản kiểm duyệt có scope xác định. Thêm bài Open + Visible, bài đã ẩn hoặc đóng, ảnh gốc/bản đã che và phiên đã thu hồi. Khởi tạo đồng hồ có kiểm soát cho quota và các mốc trao trả.
- Ví dụ cho HTTP nằm trong [bộ đặc tả v1](../api/core/v1/openapi.yaml). Seed database và lệnh migration đi cùng bản triển khai của cụm.
