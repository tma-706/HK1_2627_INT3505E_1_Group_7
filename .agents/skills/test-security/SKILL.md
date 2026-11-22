---
name: test-security
description: Lập và chạy suite bảo mật tích lũy từ catalog, đặc tả UC của sprint và checkout. Dùng khi cần nghiệm thu bản build, mở rộng ca hồi quy hoặc truy vết bằng chứng theo tiêu chí SEC.
---

# Kiểm thử bảo mật tích lũy

1. **Chọn rủi ro từ thay đổi.** Ghi nhánh, HEAD và trạng thái checkout. Từ README, đọc SRS, UC/SCN, OpenAPI và kiến trúc của sprint. So phiên bản và digest với `tests/security/manifest.json`. Rà catalog trên các tầng bị ảnh hưởng, kể cả operation cũ dùng chung. Ghi hậu quả và nguồn sở hữu trong ma trận nghĩa vụ. Mỗi operation mới cần mapping hoặc lý do loại trừ. Khi điều khoản xung đột, ghi cả hai nguồn, dừng ca phụ thuộc và tiếp tục phần độc lập.
2. **Chọn tầng, oracle và đối chứng.** Từ SCN và hợp đồng, khai báo câu hỏi, kỳ vọng, các assertion bắt buộc theo tên, bước HTTP và đối chứng độc lập. Ghi giới hạn kết luận. Dùng lại ID và oracle còn hiệu lực. So chủ thể, tập ID, thứ tự, trường, mã lỗi và header có liên quan. Fixture web, unit test mobile, Android/iOS và gateway triển khai có phạm vi riêng. Xem [ví dụ duy trì coverage](references/coverage.md).
3. **Chạy từ root.** Dùng Node 22, Docker Compose, OpenSSL và `certutil` của NSS theo [hướng dẫn môi trường](../../../docs/operations/environments.md#nghiệm-thu-bảo-mật-uc-0102). Dùng HTTPS loopback, CA và dữ liệu tổng hợp. Kiểm chủ sở hữu nếu còn khóa `dist/.security-run`. Đặt `UC01_HTTPS_PORT` khi cổng 8443 bận. CI cài Firefox cùng thư viện hệ thống bằng `--with-deps`.

   ```sh
   npm ci
   npm run mobile:setup
   npm run security:web:setup
   npm run security:validate
   npm run security:test
   ```

4. **Xác minh công cụ và bằng chứng.** Mở `dist/security/summary.md` và `dist/security/results.json`. Đối chiếu HEAD, trạng thái cây, dấu vân tay checkout, digest nguồn, assertion, đối chứng và mẫu số theo operation/trạng thái/nguồn. Kiểm từng nguồn runner và Firefox về import HAR, chờ passive, self-check và số nhận/số cần. Mở pointer từ summary. Kiểm cleanup và lặp lại cùng đầu vào, giữ manifest nguyên byte.
5. **Điều tra theo quan sát.** Bắt đầu từ assertion hoặc rule, add-on/version, operation, nguồn và nhóm trao đổi. So yêu cầu tại cùng build với assertion và tham chiếu mã. Với checkout sạch dùng `git show <sha>:<path>`. Với cây local đối chiếu digest và diff của chính checkout. Sau sửa lỗi, chạy phép kiểm hẹp rồi chạy toàn suite. Nếu thiếu công cụ, chạy các phép kiểm độc lập và ghi chính xác bước lỗi, phần đã chạy, bằng chứng còn thiếu và cleanup.
6. **Ký kết luận có phạm vi.** Ghi số PASS, FAIL, REVIEW, MISSING và N/A trên toàn catalog, delta có mẫu số, thời lượng, retry và giới hạn. Gate yêu cầu các ca bắt buộc có oracle và đối chứng, công cụ thành công và fixture được dọn. Giữ MISSING và REVIEW theo từng nghĩa vụ dù gate đạt. Ghi authenticated active DAST là **chưa thực hiện** cho lượt dùng HAR import thụ động. Dẫn hai artifact của đúng lượt và lệnh tái lập.

Xem [quy trình nghiệm thu suite](../../../docs/operations/security-test-plan.md) và [cách thử oracle](references/coverage.md#chọn-assertion-và-đối-chứng).
