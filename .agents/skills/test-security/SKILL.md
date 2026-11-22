---
name: test-security
description: Lập và chạy suite bảo mật tích lũy từ catalog, đặc tả UC của sprint và checkout. Dùng khi cần nghiệm thu bản build, mở rộng ca hồi quy hoặc truy vết bằng chứng theo tiêu chí SEC.
---

# Kiểm thử bảo mật tích lũy

1. Xác định ba đầu vào: catalog bảo mật đầy đủ, đặc tả sprint kèm SRS/analysis/OpenAPI, và checkout chứa mã, cấu hình cùng suite đã có. Trong Lost & Found, tra README và dùng các nguồn được khóa trong `tests/security/manifest.json`. Ghi revision checkout và đối chiếu phiên bản, digest của từng nguồn.
2. Khi đầu vào thay đổi, đọc toàn bộ catalog và xác định chỗ UC mới ảnh hưởng tới các bề mặt cũ. Chọn operation, trạng thái phiên và hành trình UI từ SCN và hợp đồng. Cập nhật ma trận, ca và context ZAP theo [hướng dẫn duy trì](references/coverage.md). Chốt kỳ vọng trước khi đọc luồng xử lý. Giữ ID và ca hồi quy còn hiệu lực. Khi đặc tả thiếu hoặc mâu thuẫn, ghi nguồn, bằng chứng và câu hỏi cần chốt. Với cùng bộ đầu vào, kiểm lại manifest đã có và giữ nguyên.
3. Từ gốc checkout, dùng Node 22, Docker Compose, OpenSSL và `certutil` của NSS theo [hướng dẫn môi trường](../../../docs/operations/environments.md#nghiệm-thu-bảo-mật-uc-0102). CI dùng cùng entrypoint và công cụ trình duyệt. Chạy với fixture HTTPS tổng hợp. Mỗi checkout có một lượt security tại một thời điểm. Nếu cổng 8443 bận, chọn cổng loopback khác qua `UC01_HTTPS_PORT`.

   ```sh
   npm ci
   npm run mobile:setup
   npm run security:web:setup
   npm run security:validate
   npm run security:test
   ```

4. Đọc cả `dist/security/summary.md` và `dist/security/results.json`. Đối chiếu build SHA, digest, ca bắt buộc, bảng operation, số ô đủ bằng chứng theo nguồn, đối chứng preview, tín hiệu tự kiểm ZAP và kết quả dọn fixture. Kiểm lại `npm run security:validate` và diff manifest khi chạy lại cùng đầu vào.
5. Khi có sai lệch, lấy assertion hoặc rule, operation, nguồn và tham chiếu bằng chứng từ báo cáo đã lọc. Đọc mã và cấu hình tại đúng `buildSha` bằng `git show <sha>:<path>`, ghi nguyên nhân cùng file/dòng tại revision đó. Đối chiếu cảnh báo cache với yêu cầu cache đã duyệt. Sửa lỗi công cụ hoặc hành vi đã có kỳ vọng rõ, chạy lại bước lỗi và cả suite. Nếu quyết định nghiệp vụ còn mở, ghi câu hỏi và dừng các ca phụ thuộc.
6. Bàn giao số lượng PASS, FAIL, REVIEW, MISSING và N/A của toàn catalog, thay đổi độ phủ so với build trước, lý do bằng chứng còn thiếu, link CI/artifact theo revision và lệnh tái lập. Một lượt đạt gate khi các ca bắt buộc đủ bằng chứng, công cụ chạy thành công và fixture đã dọn.

Xem [bản giao việc](../../../docs/operations/security-test-plan.md) để nghiệm thu triển khai chính skill và workflow.
