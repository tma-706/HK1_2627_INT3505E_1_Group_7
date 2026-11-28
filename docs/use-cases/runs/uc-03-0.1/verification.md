# UC‑03 0.1 · Xác minh đặc tả và UI

**28/11/2026 · Chờ duyệt**

- **Đầu vào.** [Đặc tả UC03 0.1](../../uc-03.md), [UI 0.1](../../uc-03-ui.md), Core REST `1.0.0` tại `c5822ea` và diff UC03. [Hướng dẫn UI 0.2](../../../design/ui-guidelines.md).
- **Đối chiếu hợp đồng.** Đọc YAML và xác nhận ánh xạ UC03, quyền Guest và không yêu cầu phiên cho cả ba operation. `requestPasswordReset` có 202/400/429/503, `getEmailRequestStatus` có 200/400/404/503, `resetPassword` có 204/400/410/503. Đối chiếu mốc hết hạn, `Retry-After`, biên nhận chung và nhánh Worker với [ghi chú API UC03](../../../api/core/v1-notes.md#uc03).
- **Kiểm tra tài liệu.** Kiểm bằng Node.js rằng các đường dẫn, neo nội bộ và liên kết tới 16 hình đều tồn tại. Đọc toàn bộ SVG dưới dạng XML và xác nhận khung 390 × 760. `git diff --check` đạt.
- **Kiểm tra hình.** Render 16 khung cục bộ bằng Edge ở kích thước thiết kế và kiểm nội dung, dấu tiếng Việt, trạng thái nút, khoảng cách và đường chuyển thể hiện trong các hình. Hộp thư dùng dữ liệu mẫu. Điểm vào UC02 và đích Mobile còn chờ duyệt.
- **Giới hạn xác minh.** SCN‑UC03‑01 đến SCN‑UC03‑07 đã được đối chiếu trên tài liệu. Nghiệm thu thời hạn, dữ liệu, quyền, Worker, PERF và điều hướng cần bản chạy, hộp thư kiểm thử, đồng hồ điều khiển và thiết bị. Chưa chạy các kịch bản nghiệp vụ. [Điểm cần duyệt](../../uc-03.md#diem-can-duyet)
