# Chọn phép đo hiệu năng cho UC

Bắt đầu từ hành trình và kết quả người dùng cần nhận. Chọn chỉ số, ranh giới và điều kiện đo trước khi chọn hồ sơ tải. Lấy mục tiêu từ PR trong SRS hoặc quyết định của dự án, giữ trạng thái đề xuất hay đã xác nhận của nguồn. Khi thiếu ngưỡng, ghi phép đo dự kiến và mục tiêu còn mở.

## Bốn nhóm tín hiệu

- **Latency.** Đo thời gian từ mốc bắt đầu đến kết quả, bằng ms hoặc giây. Dùng p95 hoặc tỷ lệ lượt hoàn tất trong ngưỡng theo cách yêu cầu được viết. Nêu tập mẫu và quy tắc xử lý timeout, lỗi và lượt chưa hoàn tất. Với UI hoặc xử lý nền, đo riêng thời gian API phản hồi, thời gian xử lý nền khi có, và thời gian đến kết quả người dùng thấy.
- **Traffic.** Ghi đơn vị nhu cầu như lượt bắt đầu hành trình/giây, yêu cầu HTTP/giây hoặc phiên đồng thời. So tải mục tiêu với tải thực tế và ghi thêm tốc độ hoàn tất khi cần đánh giá công suất. Một hành trình có thể phát nhiều yêu cầu.
- **Errors.** Tính tỷ lệ lỗi trên số lượt thử đủ điều kiện. Xác định lỗi theo kết quả nghiệp vụ và hợp đồng, gồm timeout, phản hồi sai và lỗi phụ thuộc nếu ảnh hưởng đến lượt đo. Ghi cách tính phản hồi từ chối dự kiến theo từng kịch bản.
- **Saturation.** Chọn tài nguyên có khả năng giới hạn hành trình. Ví dụ, đo tỷ lệ kết nối DB đang dùng, thời gian chờ mượn kết nối, tuổi công việc cũ nhất trong hàng đợi, CPU hoặc RAM. Gắn các mẫu với đúng pha tải để đối chiếu độ trễ và lỗi.

Bốn nhóm này dùng được xuyên suốt các hồ sơ tải. Thêm chỉ số nghiệp vụ theo PR, chẳng hạn tỷ lệ danh sách hiển thị đủ hoặc dung lượng cache trên thiết bị. [Google SRE, The Four Golden Signals](https://sre.google/sre-book/monitoring-distributed-systems/#the-four-golden-signals)

## Hồ sơ tải theo câu hỏi cần trả lời

- **Load** giữ tải đại diện của hành trình. Đánh giá tỷ lệ hoàn tất trong ngưỡng hoặc p95 và tỷ lệ lỗi trong cửa sổ ổn định. Ghi tải thực đạt để làm đường cơ sở cho so sánh.
- **Spike** mô phỏng một đợt tăng đột ngột rồi đưa tải về mức nền. Đo số lượt bị ảnh hưởng và thời gian từ khi tải giảm đến khi latency, errors hoặc tồn đọng đạt điều kiện hồi phục đã định.
- **Stress** giữ mức tải cao đã chọn dựa trên nhu cầu giờ cao điểm hoặc kịch bản quá tải có căn cứ. Đo tốc độ hoàn tất, mức suy giảm latency và errors, cùng dấu hiệu bão hòa trong thời gian giữ và hồi phục nếu có.
- **Breakpoint** tăng tải qua các bậc để tìm bậc cuối còn đáp ứng tiêu chí và bậc đầu vi phạm hoặc kích hoạt điều kiện dừng. Báo cả hai bậc và tín hiệu tương ứng. Nếu chạm trần môi trường trước, ghi mức cao nhất đã kiểm chứng.
- **Soak** giữ tải đủ lâu để quan sát chu kỳ nghiệp vụ hoặc tài nguyên đã chọn. So xu hướng theo các cửa sổ của latency, errors, RAM, kết nối hoặc tồn đọng. Đưa vào kế hoạch khi có câu hỏi về suy giảm theo thời gian và đủ ngân sách chạy.

Dùng smoke để kiểm script, fixture và đích đo ở tải tối thiểu trước lần chạy chính. Chọn hồ sơ theo câu hỏi của UC và giới hạn môi trường. [Grafana k6, API load testing](https://grafana.com/docs/k6/latest/testing-guides/api-load-testing/)

## Bàn giao từ phân tích đến phép đo

1. Trong analysis, ghi PR hoặc nguồn quyết định, hành trình, mốc đo, chỉ số và đơn vị, tập mẫu, cửa sổ, điều kiện tải và ngưỡng hoặc trạng thái còn mở.
2. Trong thiết kế API, ánh xạ phần quan sát được qua operation. Ghi đích bàn giao cho phần đo ở UI, xử lý nền hoặc vận hành. Với API bất đồng bộ, xác định riêng hành vi nhận việc và tín hiệu hoàn tất khi UC cần cả hai.
3. Trong test plan, ánh xạ hồ sơ tải tới SCN/PERF và operation hoặc tín hiệu ngoài API. Ghi tải mục tiêu và thực tế, dữ liệu, pha đo, số mẫu và điều kiện dừng theo [quy tắc đo của test-performance](../../../.agents/skills/test-performance/references/run-validation.md). Ghi thiếu bằng chứng khi điều kiện đo hoặc căn cứ ngưỡng còn thiếu.

Ví dụ, `PERF-PRF-001` dùng mục tiêu thử nghiệm PR-04/05 là hiển thị đủ trong 2.000 ms ở ít nhất 95% lượt đủ điều kiện của từng hành trình hồ sơ và tải trang. Mốc đủ nội dung nằm ở mobile. Thời gian phản hồi Core giúp tìm phần chậm trong hành trình. Khi xây workload cho mức đề xuất ít nhất 200 phiên hoạt động đồng thời theo PR-01, cần chốt tỷ trọng hành trình và nhịp thao tác. Khi đo UI, cần chốt cách tính ảnh thay thế. [Phân tích UC-01/02](../analysis/uc-01-02.md)
