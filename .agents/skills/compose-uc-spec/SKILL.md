---
name: compose-uc-spec
description: Tổng hợp UC spec từ SRS, phân tích SEC/PERF và API spec đã xác định phiên bản. Dùng để lập kịch bản SCN, rà xung đột quyền hoặc trạng thái và bàn giao cùng một bản UC cho kiểm thử và mã.
---

# Tổng hợp UC spec Lost & Found

1. Đọc SRS, API contract và ghi chú bên cạnh. Theo liên kết từ cả hai để đọc đúng bản analysis và quyết định có liên quan. Ghi phiên bản từng nguồn theo [quy ước bàn giao](../../../docs/skill-workflow.md). Nếu nguồn thiếu, lệch phiên bản hoặc còn mở, ghi phần chưa xác minh được và bước liên quan.
2. Cập nhật `docs/use-cases/<slug>.md` với tác nhân và quyền, tiền/hậu điều kiện, trạng thái, luồng chính và ngoại lệ. Lập bảng có SCN, tiền điều kiện, hành động, trạng thái/kết quả quan sát được, operation, REQ, SEC/PERF và tiêu chí đạt. Dẫn schema qua định danh operation. Ghi “không qua API” và lý do với hành vi UI hoặc nội bộ. Mang cả ràng buộc vận hành, xử lý nội bộ và điều kiện đo vào kịch bản tương ứng.
3. Rà hai chiều. Từ REQ/SEC/PERF kiểm tra SCN và operation hoặc lý do thuộc tầng khác. Từ mỗi SCN và operation trong phạm vi kiểm lại nguồn cho hành động, quyền, trường dữ liệu, trạng thái và tiêu chí. Kiểm định danh và nội dung operation trong contract thực tế. Ghi hai nguồn xung đột, SCN chịu ảnh hưởng và người hoặc nguồn cần giải quyết. Để nguồn sở hữu thực hiện chỉnh sửa.
4. Chỉ rõ SCN đủ căn cứ cho security, performance và triển khai, theo phần có thể làm độc lập. Với điều kiện còn mở, ghi chính xác tiêu chí nào chưa kết luận được. Khi cập nhật, giữ ID và ghi chú tay, rồi liệt kê suite hoặc phần mã cần đánh giá lại.

Bàn giao UC spec cùng phiên bản tính từ file hoàn thiện và danh sách SCN sẵn sàng hoặc bị chặn. Suite và mã dùng phiên bản ấy làm đầu vào.
