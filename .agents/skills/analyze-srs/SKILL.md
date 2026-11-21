---
name: analyze-srs
description: Rà SRS hoàn chỉnh hoặc đang viết dở để tìm tình huống gây hại cho người dùng, khoảng trống nghiệp vụ và suy ra yêu cầu bảo mật SEC, hiệu năng PERF có thể kiểm chứng. Dùng khi được hỏi SRS còn bỏ sót gì hoặc cần đo gì từ UC.
---

# Phân tích SRS Lost & Found

1. Đọc SRS, các quyết định hiện hành và luồng kề liên quan qua README. Mở UI hoặc mô hình dữ liệu khi cần giải một câu hỏi về bước, trường dữ liệu, quyền hoặc vòng đời. Ghi phiên bản nguồn theo [quy ước bàn giao](../../../docs/skill-workflow.md#mã-định-danh-và-phiên-bản).
2. Đi qua từng tác nhân, hành động, dữ liệu nhận/trả và chuyển trạng thái. Xét thao tác nhầm, thử lại, cạnh tranh, phụ thuộc chậm hoặc lỗi và lạm dụng thao tác hợp lệ. Với mỗi tình huống có căn cứ, lần từ sự kiện đến người chịu hậu quả và điều SRS chưa giải quyết. Ghi câu hỏi làm thay đổi thiết kế, lựa chọn, đánh đổi và vai trò quyết định. Chuyển vấn đề sang UC kề khi UC đó sở hữu hành vi.
3. Với SEC, ghi tài sản hoặc quyền, tác nhân, điều kiện, hành vi mong đợi và tín hiệu kiểm được. Với PERF, ghi hành trình, mốc bắt đầu/kết thúc, chỉ số và đơn vị, cửa sổ, điều kiện tải, nguồn mục tiêu và phép đo còn thiếu. Với ảnh, xét thời gian API nhận yêu cầu và thời gian đến kết quả mà người dùng thấy như hai phép đo riêng.
4. Cập nhật `docs/requirements/analysis/<slug>.md`. Dùng [mẫu và ví dụ](references/analysis.md) khi cần soạn từng mục. Đọc cả trạng thái chung của SRS và căn cứ riêng từng REQ. Với SRS đang làm rõ, ghi REQ làm nguồn suy luận. Chỉ đánh dấu SEC/PERF đã xác nhận khi có căn cứ xác nhận ràng buộc đó. Giới hạn quyết định của fixture hoặc luồng kề đúng phạm vi nguồn. Với đầu vào thiếu, ghi giả định và câu hỏi rồi phân tích phần đọc được.

Bàn giao bản phân tích khi mỗi GAP/SEC/PERF có căn cứ, liên kết REQ hoặc GAP đang chờ REQ, phạm vi ảnh hưởng và bước xác minh tiếp theo. Chỉ rõ điều API cần thể hiện và điều UC spec cần mang tiếp ở tầng UI, xử lý nội bộ hoặc vận hành. Khi nguồn đổi, giữ ID theo ý nghĩa và nêu đầu ra nào cần đánh giá lại. Chuyển kết luận vào SRS khi có quyết định và yêu cầu cập nhật SRS.
