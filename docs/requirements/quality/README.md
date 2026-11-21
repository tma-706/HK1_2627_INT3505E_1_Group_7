# Tiêu chí tham chiếu về bảo mật và hiệu năng

- [Bảo mật](security-owasp-2025.json) lưu 50 tiêu chí rà soát tĩnh tiếng Việt từ catalog nghiên cứu `OWASP-2025-CWE-MITRE-4.20`. Tra theo `sec_id`, nhóm OWASP hoặc CWE. Trường `static_review_scope_vi` là nội dung tiêu chí. Phiên bản và SHA-256 định danh bản nguồn đã trích. Catalog nghiên cứu chọn một tập CWE trong các nhóm OWASP Top 10:2025.
- [Hiệu năng](performance.md) giúp chọn tín hiệu, ranh giới đo và hồ sơ tải theo câu hỏi của UC. Có thể dùng cùng một chỉ số ở nhiều kiểu tải.

[Phân tích theo UC](../analysis/) là nơi ghi các yêu cầu SEC/PERF áp dụng cho Lost & Found. Khi suy ra một yêu cầu, ghi căn cứ từ SRS, GAP hoặc quyết định kiến trúc, cùng ID tham chiếu bảo mật hay mục hiệu năng đã dùng. Ghi cả trạng thái và cách xác minh. Ví dụ, `SEC-A01-01` gợi ý rà kiểm soát quyền phía máy chủ. `SEC-PRF-001` ghi ràng buộc cụ thể về chủ thể của hồ sơ, phạm vi dữ liệu trả về và phép kiểm. [Phân tích UC-01/02](../analysis/uc-01-02.md)

Bản thiết kế API và UC spec nhận các ID SEC/PERF từ bản phân tích theo UC. Theo dõi tiêu chí tham chiếu mới phát hiện dưới dạng câu hỏi cần làm rõ cho đến khi có căn cứ để ghi thành yêu cầu. Ghi phiên bản nguồn đã dùng theo [quy ước bàn giao](../../skill-workflow.md#mã-định-danh-và-phiên-bản).
