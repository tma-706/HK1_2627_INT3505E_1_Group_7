---
name: test-performance
description: Với lời gọi tường minh, thiết kế workload và suite hiệu năng từ UC spec hoặc chạy và phân tích suite sẵn có bằng Locust hay công cụ của repo. Dùng cho thiết kế tải, baseline, spike, stress, soak, breakpoint hoặc kiểm tra SLO trong CI.
---

# Thiết kế và chạy kiểm thử hiệu năng

Chọn điểm vào theo yêu cầu. Dùng [quy ước bàn giao](../../../docs/skill-workflow.md) để ghi phiên bản UC và theo [hướng dẫn môi trường](../../../docs/operations/environments.md) để xác định đích thực có tại Lost & Found.

## Thiết kế suite

1. Đọc UC spec trước. Dùng SCN/PERF để chọn hành trình và contract để tra operation. Nếu thiếu UC, xác định việc cần bổ sung và ghi phạm vi thiết kế thăm dò làm được từ nguồn đang có.
2. Ở Lost & Found, tra [hướng dẫn chọn phép đo hiệu năng](../../../docs/requirements/quality/performance.md) để ghép câu hỏi của UC với tín hiệu và hồ sơ tải. Dùng [cách sinh workload](references/dynamic-workloads.md) để chọn dữ liệu, tỷ trọng hành trình, tốc độ đến hoặc số người dùng đồng thời, các pha, số mẫu và giới hạn. Ghi mốc đo, phạm vi, công thức, cách tính lỗi, tiêu chí và nguồn của từng ngưỡng. Với luồng xử lý ảnh, ghi riêng thời gian nhận yêu cầu và thời gian đến kết quả hiển thị nếu UC cần cả hai. Nếu thiếu ngưỡng, thiết kế phép đo và ghi chưa đủ căn cứ kết luận SLO.
3. Lưu thiết kế ở `tests/performance/<slug>/`, với phiên bản UC và ánh xạ profile → SCN/PERF → operation hay tín hiệu ngoài API. Dùng lại cấu trúc cũ khi đầu vào đã chỉ định suite có sẵn. Có thể bàn giao thiết kế trước mã hoặc staging. Ghi runner, fixture và thiết lập còn thiếu để ca chạy được.

## Chạy suite hoặc phân tích lần chạy

Dùng suite, profile và build xác định cùng môi trường thực có. Đọc [hướng dẫn chạy với Locust, phân tích và CI](references/execution.md) cho phần được giao. Khi thiếu đích chạy, tiếp tục chuẩn bị phần thiết kế hoặc phân tích bằng chứng đã có. Chỉ báo profile đã chạy khi có lệnh và kết quả, ghi riêng smoke, phép đo và kết luận theo đúng môi trường. Chỉ cấu hình gate hoặc deploy trong phạm vi được giao, dựa trên ngưỡng có nguồn và điều kiện đo hợp lệ.
