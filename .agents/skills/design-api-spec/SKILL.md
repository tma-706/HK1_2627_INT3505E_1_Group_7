---
name: design-api-spec
description: Soạn Execution Prompt thiết kế API để duyệt, rồi thực hiện đúng bản đã duyệt. Dùng khi chuyển SRS và phân tích SEC/PERF thành hợp đồng API hoặc thiết kế tiếp từ contract, yêu cầu và ràng buộc sẵn có.
---

# Thiết kế hợp đồng API

## Đầu vào

Ở Lost & Found, đọc SRS, bản phân tích liên quan trong `docs/requirements/analysis/<slug>.md` và contract hiện có của giao diện. Ghi phiên bản theo [quy ước bàn giao](../../../docs/skill-workflow.md). Readiness của Core là hợp đồng nguyên mẫu. Nếu thiếu analysis, chỉ rõ đường dẫn cần có, ràng buộc đã có thể đưa vào bản nháp và operation còn phụ thuộc kết quả phân tích. Ngoài chế độ dự án, dùng các yêu cầu, câu chuyện người dùng, contract và ràng buộc được giao.

## 1. Soạn Execution Prompt để duyệt

- Viết một prompt tự chứa trong khối Markdown, mang đủ dữ kiện cho chat mới. Ghi nội dung và phiên bản nguồn đã dùng, người dùng API, mô hình tài nguyên, tương tác, format đích, quyền, kết quả quan sát được và kiểm tra cần làm. Có thể lưu prompt ở file người dùng chỉ định để bàn giao.
- Với từng REQ/SEC/PERF liên quan, đưa ID, trạng thái, nội dung ràng buộc và ánh xạ operation dự kiến hoặc lý do thuộc tầng khác. Với SLO còn mở, đưa phạm vi và cách đo. Với chính sách chưa chốt, ghi câu hỏi và operation chịu ảnh hưởng. Chỉ cam kết mã lỗi, hạn mức và response khi có căn cứ trong phạm vi được duyệt.
- Khi cần chọn phương án, dùng [hướng dẫn SOA và định dạng](references/soa-course.md), [mẫu tương tác](references/design-patterns.md), [quyền và đo lường](references/service-operations.md) hoặc [tích hợp và vòng đời API](references/api-product.md), tùy quyết định trước mắt. Với REST, dùng phiên bản OpenAPI phù hợp công cụ và giao diện hiện có. Với giao diện khác, dùng định dạng bản địa phù hợp.
- Trình đúng bản prompt để người dùng duyệt hoặc yêu cầu sửa. Đợi duyệt trước khi tạo hợp đồng đầy đủ. Chat mới có thể nhận bản prompt và lời duyệt chỉ đúng bản đó.

## 2. Thực hiện bản đã duyệt

- Ghi contract tại `docs/api/<giao-dien>/` hoặc vị trí đã duyệt, tái sử dụng contract dùng chung. Với từng operation, mô tả định danh, input, quyền, kết quả, lỗi có căn cứ và ví dụ phù hợp. Đặt ánh xạ và quy tắc định dạng máy chưa biểu diễn được ở cạnh contract. Mang phiên bản SRS và analysis vào bàn giao, kể cả phân loại yêu cầu nội bộ và câu hỏi mở.
- Đối chiếu cả SRS lẫn analysis với contract và ghi chú. Kiểm tra từng REQ/SEC/PERF trong phạm vi có operation cùng hành vi quan sát được, hoặc có lý do thuộc tầng khác và đích bàn giao. Kiểm tra chiều ngược lại để phát hiện quyền, trạng thái và lỗi contract đặt thêm. Nếu nguồn đã đổi sau duyệt, chỉ rõ phạm vi lệch và xin duyệt lại phần thay đổi nội dung prompt.
- Kiểm tra định danh, schema, quyền thực tế và ví dụ bằng công cụ sẵn có. Bàn giao một bộ contract và ghi chú đồng bộ, cùng phạm vi đã duyệt, bước xác minh đã chạy và phần còn mở cho UC.
