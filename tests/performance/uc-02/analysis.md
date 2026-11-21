# Kết quả thăm dò hiệu năng UC-02

Smoke đạt **10/10 request**. Pilot hoàn tất với **59 request, 0 lỗi, p95 47 ms** tính trên toàn lượt chạy và **1,76 request/giây** theo khoảng phát request Locust quan sát. Locust ramp lên đủ ba user. Cấu hình giới hạn bài chạy ở 45 giây, gồm ramp, cộng thời gian đợi request đang chạy kết thúc.

| Nhóm request pilot | Số mẫu | Lỗi | p95 (ms) |
| --- | ---: | ---: | ---: |
| `GET /api/me/profile` | 21 | 0 | 38 |
| `GET /api/me/items` · Lost, trang đầu | 15 | 0 | 27 |
| `GET /api/me/items` · Lost, trang tiếp | 2 | 0 | 18 |
| `GET /api/me/items` · Found, trang đầu | 2 | 0 | 19 |
| `GET /api/me/items` · Found, làm mới | 2 | 0 | 20 |
| `GET /api/me/items` · Claims, trang đầu | 11 | 0 | 62 |
| `GET /api/me/items` · Claims, làm mới | 6 | 0 | 25 |
| Tổng | 59 | 0 | 47 |

## Phạm vi kết luận

- Chạy Core Node 24 qua proxy HTTPS Node trên loopback Windows. PGlite 0.5.10 cung cấp PostgreSQL 18.6 nhúng, qua adapter tuần tự hóa giao dịch. Dùng hai migration của repo, ba phiên độc lập, 21 mục mỗi tab và token ký bằng khóa thử nghiệm. Build `core-and-migrations:sha256:ed92c3ffcd032743fcb91503733310d434de20466479efe42e3a2a88278f46db` băm các tệp TypeScript của Core và migration SQL theo thứ tự đường dẫn với xuống dòng LF.
- Kết quả xác nhận script, hợp đồng phản hồi và tải thăm dò trên môi trường này. Cỡ mẫu từng nhóm thấp, chưa có số liệu CPU, RAM, pool hay slow query để kết luận điểm nghẽn. Nhóm hồ sơ có một lượt tới khoảng 203 ms. Lần đo tiếp có thể tách kết nối mới/đã tái sử dụng và đối chiếu `Server-Timing` với số đo phía client để xác định nguồn chênh lệch.
- Kết luận SLO API là **chưa đủ bằng chứng**. [Ngưỡng API](slo.yml) còn mở. Docker Compose/Nginx với PostgreSQL 16, staging, tải đại diện từ 200 phiên, thời gian hiển thị mobile và dung lượng cache vẫn cần bài đo có điều kiện tương ứng.

## Bằng chứng

Từ gốc repo, mở `dist/performance/uc-02/20261121T170054Z-41a7df7e/smoke/` và `dist/performance/uc-02/20261121T170127Z-8fe171b3/local-pilot/`. Mỗi lượt có `run.json` ghi lệnh và cấu hình, `locust.html`, log và các CSV. Số request, lỗi và p95 tổng hợp của pilot khớp giữa HTML và `locust_final_stats.csv`. Dùng CSV cuối phiên khi đọc kết quả. CSV định kỳ có thể thiếu request hoàn tất giữa lần ghi cuối và lúc Locust dừng.

Đã kiểm nhánh pilot từ chối build thiếu smoke tương ứng. Đã kiểm chuỗi chứng chỉ tạo bằng cấu hình mới với `openssl verify -x509_strict -verify_ip 127.0.0.1`.
