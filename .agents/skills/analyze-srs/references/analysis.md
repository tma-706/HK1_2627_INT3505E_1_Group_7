# Soạn bản phân tích

Mở đầu với UC, phạm vi và nguồn đã đọc, gồm đường dẫn, phiên bản và mục liên quan. Dùng các mục sau theo tình huống.

- **GAP** · ID và REQ nếu có · Sự kiện → người chịu tác động → hậu quả → phần SRS bỏ ngỏ · Lựa chọn và chi phí cho người hợp lệ · Câu hỏi cần quyết định, vai trò trả lời · Bước bị ảnh hưởng hoặc UC cần nhận bàn giao.
- **SEC** · ID và REQ/GAP · Tài sản hoặc quyền, tác nhân và điều kiện · Hành vi mong đợi và dấu hiệu xác minh · Nguồn và trạng thái · Gợi ý giao diện chịu ảnh hưởng hoặc tầng thực thi khác.
- **PERF** · ID và REQ/GAP · Hành trình, chỉ số, đơn vị và mốc đo · Tập mẫu và cửa sổ, điều kiện tải và dữ liệu · Căn cứ ngưỡng hoặc câu hỏi mở · Cách lấy số liệu và người quyết định.

## Ví dụ từ SRS báo nhặt đang làm rõ

Các mục dưới đây minh họa cách suy luận. Đọc phiên bản SRS thực tế trước khi chọn mã và trạng thái.

- **GAP-FOUND-001** · REQ-FOUND-001. AI lỗi sau khi người nhặt gửi ảnh → người nhặt có thể tưởng bài đã đăng và bỏ qua việc xử lý → món đồ chưa đến được người mất. SRS còn hỏi cách giữ và khôi phục công việc của người nhặt. Giữ riêng tư để thử lại tiết kiệm công nhập nhưng cần quyền đọc, hạn lưu và dọn ảnh. Yêu cầu đổi ảnh giảm phần trạng thái cần lưu nhưng tăng công làm lại. Sản phẩm cùng thiết kế cần chốt người nhặt có tiếp tục trên bản đang nhập hay phải gửi ảnh khác, và họ thấy gì khi chờ hoặc thất bại. Ảnh hưởng luồng gửi ảnh, trạng thái hiển thị và thiết kế giao tiếp nếu có.
- **SEC-FOUND-001** · REQ-FOUND-001 là căn cứ cho ràng buộc ảnh công khai. Khi người xem mở bảng tin hoặc tải ảnh qua liên kết bảng tin trả về, họ chỉ nhận bản đã che. Dùng ảnh tổng hợp có dấu hiệu nhận biết để kiểm nội dung API và byte ảnh tải về. Quyền đọc, cách lưu bản gốc và chính sách thử lại khi AI lỗi vẫn theo trạng thái nguồn. Giữ riêng tư để thử lại là đề xuất.
- **PERF-FOUND-001** · REQ-FOUND-001. Đo thời gian nhận yêu cầu từ lúc gửi đến phản hồi và thời gian từ lúc gửi đến khi người nhặt thấy kết quả xử lý, tính bằng ms. Thu mẫu cho cả kết quả thành công và lỗi theo từng nhóm kích thước ảnh, tải đồng thời và tình trạng phụ thuộc. Ghi cửa sổ đo và báo kết quả riêng từng nhóm. QA cần bộ ảnh, dữ liệu tải và phép đo pilot. Sản phẩm cần chốt thời gian chờ chấp nhận được. SLO còn mở.

## Ví dụ chuyển tiếp sang luồng xin nhận

Người giữ đồ có thể chìm trong thông báo do nhiều yêu cầu hợp lệ về hình thức, còn người mất có thể bấm lại một lần do mạng chậm. Ghi hai sự kiện riêng trong UC xin nhận hoặc ghi việc cần chuyển tiếp nếu SRS luồng đó chưa có. Khử gửi trùng có thể giữ một hiệu ứng cho lần thử lại, trong khi hạn chế tần suất có thể chặn cả người mất có nhu cầu chính đáng. Hỏi sản phẩm cách phân biệt một lần thử lại với yêu cầu mới và ai chịu chi phí nếu chặn nhầm. Hạn mức và cơ chế khóa tài khoản cần quyết định và căn cứ riêng.
