# Chạy suite hiệu năng và phân tích kết quả

Chỉ dùng phần này khi được giao chạy suite hoặc phân tích kết quả. Đọc suite và cấu hình có sẵn, xác nhận entry point, dữ liệu giả, quyền chạy, URL, bản build thực tế và giới hạn môi trường. Đối chiếu [điều kiện đo và dừng](run-validation.md) trước khi phát tải. Khi dùng CI, đọc [cách nối gate](ci-pre-deploy.md) trong phạm vi tích hợp được giao.

Lưu HTML, CSV, lệnh và cấu hình hiệu lực theo run ID và profile trong thư mục kết quả của suite hoặc artifact CI. Tái sử dụng đường dẫn hiện có khi chạy suite cũ. Tại Lost & Found, giữ kết quả theo revision ngoài Git.

## Xác minh script và smoke

- Khi cần hiện thực bộ phát tải Locust, tạo hoặc cập nhật `locustfile.py` với `HttpUser`, journeys và wait-time từ profile đã chọn trong cấu hình tải của dự án. Khi API dùng token, lấy token trong `on_start`, đặt timeout, xử lý lỗi đăng nhập và hết hạn token theo hợp đồng API, ghi login thành nhóm riêng. Dùng `name` để nhóm URL động theo route mẫu.
- Dùng `catch_response=True` để kiểm tra status và dữ liệu bắt buộc. Chỉ đánh dấu phản hồi nghiệp vụ dự kiến là đúng khi khớp ngữ cảnh test, status và nội dung lỗi theo đặc tả. Ghi số phản hồi loại này và quy tắc đưa vào từng SLI. Ghi nhận lỗi nghiệp vụ ngoài dự kiến, lỗi auth, lỗi mạng, timeout, 5xx và sai hợp đồng.
- Cung cấp lệnh CLI tái lập dùng `--headless`, `--csv` và `--html`. Chạy smoke ở đích đã lên kế hoạch. Với CI trước deploy, đợi bản build trong môi trường tạm sẵn sàng rồi chạy smoke và các profile hồi quy của dự án. Với bài chạy staging, xác minh phiên bản và smoke trên staging trước khi tăng tải. Lưu HTML, CSV và lệnh đã chạy. Ghi riêng kết quả smoke của luồng bắt buộc và kết quả gate. Sửa lỗi script, xác thực hoặc dữ liệu và chạy lại cho tới khi smoke xác nhận được các luồng bắt buộc hoặc có blocker cụ thể.

## Thực thi kiểm thử tải

- Sau khi smoke xác nhận các luồng bắt buộc, chạy các profile đã lập kế hoạch trong giới hạn môi trường. Nếu smoke hợp lệ nhưng gate báo lỗi hiệu năng, kiểm tra tín hiệu quá tải trước khi tăng tải tiếp theo kế hoạch. Khi điều kiện dừng được kích hoạt, lưu dữ liệu, mốc giờ, bậc tải, chỉ số kích hoạt và lý do. Kiểm tra môi trường đã hồi phục trước lần chạy tiếp.
- Thực thi ngưỡng dừng trong lúc chạy cho spike, stress và breakpoint theo [quy tắc đo và xác thực kết quả](run-validation.md). Kiểm thử nhánh đạt ngưỡng và nhánh cần dừng trước khi dùng trên staging. Khi chạm trần tải được phép trước khi tìm ra breakpoint, ghi mức cao nhất đã kiểm chứng và phạm vi khảo sát.
- Lưu CSV và HTML theo từng profile và mã lần chạy. Ghi phiên bản triển khai, cấu hình hiệu lực, mốc từng phase, số request, RPS thực tế và trạng thái máy phát tải. Loại secrets và dữ liệu nhạy cảm khỏi lệnh được lưu, log và báo cáo. Dùng dữ liệu đúng cửa sổ khi kết luận. Ghi nguồn và cách tính nếu số liệu trong HTML toàn phiên và số liệu dùng cho gate được đo ở hai cửa sổ khác nhau.
- Thu CPU, RAM, DB slow-query log và số liệu connection pool gồm kết nối đang dùng, số request chờ, thời gian chờ và timeout khi hệ thống cung cấp. Ghi nguồn và khoảng thời gian của từng số liệu, đánh dấu nguồn còn thiếu.
- Khi phân tích bài chạy dài, dùng ngưỡng truy vấn chậm của dự án nếu có để đối chiếu thời gian truy vấn với thống kê latency và connection pool.

## Phân tích và tìm điểm nghẽn

- Viết `analysis.md` theo endpoint và profile. Ghi tải mục tiêu và thực tế, cửa sổ đo, số mẫu, p95, tỷ lệ lỗi, ngưỡng tương ứng, kết luận và nguồn số liệu. Kết luận đạt hoặc vi phạm theo `slo.yml` khi lần đo hợp lệ. Ghi không đủ bằng chứng khi thiếu ngưỡng, thiếu mẫu, sai cửa sổ đo, tải dưới mục tiêu, máy phát tải bão hòa hoặc lỗi setup ảnh hưởng kết quả. Khi một endpoint có phép đo hợp lệ và vi phạm ngưỡng, vẫn nêu vi phạm đó dù endpoint khác thiếu bằng chứng.
- Ghi Apdex, T và phạm vi tính khi profile có ngưỡng Apdex. Phân loại lỗi và đối chiếu các mốc bất thường với telemetry, trace, query và mã nguồn. Với điểm nghẽn đã xác nhận, nêu đường dẫn code hoặc khóa cấu hình, bằng chứng và đề xuất sửa. Với giả thuyết, nêu phép đo hoặc lần chạy đối chứng có thể kiểm chứng. Báo cáo chỉ số nghiệp vụ và tiêu chí riêng của từng profile đã chạy.

## Tối ưu và tích hợp CI/CD gate

- Áp dụng thay đổi code hoặc cấu hình trong phạm vi công việc được giao. Chạy lại cùng profile, dữ liệu tương đương, tải mục tiêu, cửa sổ đo và điều kiện môi trường. Thêm bảng trước/sau trong `analysis.md` với phiên bản, RPS, số mẫu, p95, tỷ lệ lỗi, thay đổi tuyệt đối hoặc phần trăm và giới hạn so sánh. Khi chưa có lần chạy sau tối ưu, ghi phần so sánh là chưa có kết quả.
- Khi được giao tích hợp CI/CD, thêm bước vào workflow hiện có hoặc tạo `perf.yml` theo nền tảng của dự án. Dùng kiểm thử nhanh, smoke và các profile hồi quy đã chọn trên bản build tạm làm điều kiện deploy staging. Chỉ nối bước deploy khi môi trường, chính sách phát hành và phạm vi thay đổi đã rõ. Xác minh staging đã chạy chính bản build đó trước khi chạy các profile staging. Nếu dự án có luồng phát hành production, nối bước phát hành bản build tương ứng với kết quả gate staging. Áp dụng [quy trình CI trước và sau deploy](ci-pre-deploy.md) để nối lệnh deploy và kiểm tra các nhánh fail.
- Lấy secrets staging từ CI cho job staging. Lưu HTML, CSV, báo cáo SLO và metadata của mỗi gate kể cả khi bước kiểm thử thất bại. Tính ngân sách CI cho setup, tăng tải, đo ổn định, đợi request kết thúc và tải artifact lên.
- Dùng cùng `slo.yml` và quy tắc đo cho báo cáo và CI. Dùng mã thoát của bộ đánh giá làm kết luận CI và lưu mã thoát gốc của Locust. Phân biệt số request lỗi trong ngân sách SLO với lỗi thực thi script, setup hoặc worker. Kiểm thử các ca trong phần CI của [quy tắc đo và xác thực kết quả](run-validation.md).
