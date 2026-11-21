# Kết quả kiểm thử hồi quy hiệu năng Core

## Lần chạy lại ngày 22/11/2026

Đã chạy lại [danh sách CI](ci.yml) cho UC-01 và UC-02 với cùng bản Core và môi trường fixture local như lần trước. Runner xác nhận đủ ba user trong mỗi pilot. Mỗi pilot dùng ba danh tính hoặc phiên tổng hợp riêng, tăng 1 user/giây. Thời lượng cấu hình gồm ramp là 40 giây cho UC-01 và 45 giây cho UC-02. Các số liệu lấy từ CSV toàn phiên, với lỗi chia cho tổng số request.

| UC | Smoke | Pilot | p95 pilot | RPS pilot |
| --- | --- | --- | --- | --- |
| UC-01 | 9/9, `20261121T173112Z-4c95989b` | 48 request, 0 lỗi, `20261121T173145Z-266bafc7` | 29 ms | 1,28 |
| UC-02 | 10/10, `20261121T173245Z-19686d26` | 65 request, 0 lỗi, `20261121T173314Z-28917dc3` | 34 ms | 1,76 |

| Nhóm request pilot | Số mẫu | Lỗi | p95 |
| --- | ---: | ---: | ---: |
| UC-01 · Cấp phiên | 11 | 0 | 97 ms |
| UC-01 · Xác minh phiên | 27 | 0 | 13 ms |
| UC-01 · Thu hồi phiên | 10 | 0 | 52 ms |
| UC-02 · Hồ sơ | 24 | 0 | 83 ms |
| UC-02 · Lost trang đầu | 18 | 0 | 37 ms |
| UC-02 · Lost trang sau | 4 | 0 | 29 ms |
| UC-02 · Found trang đầu | 8 | 0 | 32 ms |
| UC-02 · Found làm mới | 4 | 0 | 34 ms |
| UC-02 · Claims trang đầu | 6 | 0 | 19 ms |
| UC-02 · Claims làm mới | 1 | 0 | 28 ms |

P95 toàn phiên quan sát được từ lần trước đến lần này là 55 → 29 ms cho UC-01 và 150 → 34 ms cho UC-02. Mã Core và migration có cùng mã băm qua hai lần. Cỡ mẫu nhỏ, dữ liệu fixture được tạo mới và UC-02 chọn ngẫu nhiên hành trình, nên số chênh lệch chưa đủ để kết luận cải thiện hoặc xác định điểm nghẽn. Lần này chưa thu CPU, RAM, pool hoặc truy vấn chậm để đối soát.

Từng kế hoạch UC có năm thiết kế `load`, `stress`, `spike`, `soak` và `breakpoint`. Các bài này chờ staging cô lập, fixture đủ VU, cấu hình phát tải nhiều pha và kiểm điều kiện dừng. PR-01 từ 200 phiên, OAuth thật, mốc mobile và SLO API chưa được kiểm chứng ở local. Danh sách profile hồi quy của GitHub Actions hiện là smoke và pilot cho cả hai UC. [Kế hoạch UC-01](uc-01/test-plan.md) · [Kế hoạch UC-02](uc-02/test-plan.md)

## Lần chạy trước

Đã chạy danh sách [CI](ci.yml) trên cùng Core build `core-and-migrations:sha256:ed92c3ffcd032743fcb91503733310d434de20466479efe42e3a2a88278f46db`. Môi trường local dùng proxy Node HTTPS và PGlite 0.5.10 với adapter tuần tự hóa giao dịch. Smoke và pilot đều dùng dữ liệu tổng hợp. Báo cáo từng lượt lưu trong `dist/performance/` theo ID dưới đây.

| UC | Smoke | Pilot | p95 pilot | RPS pilot |
| --- | --- | --- | --- | --- |
| UC-01 | 9/9, `20261121T171647Z-f2c22b7d` | 48 request, 0 lỗi, `20261121T171732Z-fd089d90` | 55 ms | 1,27 |
| UC-02 | 10/10, `20261121T171844Z-8e1fa8bc` | 58 request, 0 lỗi, `20261121T171920Z-3e97d2ab` | 150 ms | 1,54 |

Mỗi pilot ramp tới ba user. Số liệu lấy từ `locust_final_stats.csv` của toàn phiên, theo số request thực đạt. Các pilot ngắn và mẫu ít nên chênh lệch p95 giữa UC hoặc giữa lần chạy chỉ là quan sát. Nghiệm thu cần đích chạy đại diện, cửa sổ ổn định, số mẫu phù hợp với từng operation và telemetry DB, Core và máy phát tải. Staging, tải đề xuất từ 200 phiên, giao diện mobile, OAuth thật và SLO API nằm ngoài bằng chứng local này.
