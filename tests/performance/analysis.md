# Kết quả kiểm thử hồi quy hiệu năng Core

## Lần chạy từ đầu ngày 22/11/2026, 03:19–03:26 (UTC+7)

Đã hoàn tất **6/6 profile đã chọn** cho UC-01 và UC-02. Core dùng bản build `core-and-migrations:sha256:ed92c3ffcd032743fcb91503733310d434de20466479efe42e3a2a88278f46db`. Môi trường đo local Windows dùng Node 24, gateway HTTPS loopback, PGlite 0.5.10 (PostgreSQL 18.6 nhúng) và adapter tuần tự hóa giao dịch. Locust 2.47.0 dùng PyYAML 6.0.3 trên Python 3.14. Hai bài chuyên biệt chạy tuần tự với fixture mới, sau khi smoke tương ứng đạt. Core và DB trả readiness 200 sau mỗi bài.

| UC | Profile | Thời lượng cấu hình | VU tối đa thực | Request | Lỗi | p95 toàn lượt | RPS Locust | Run ID |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| UC-01 | `smoke` | 16 s | 1 | 9 | 0 | — | — | `20261121T201930Z-1794fa1f` |
| UC-01 | `local-pilot` | 40 s | 3 | 51 | 0 | 44 ms | 1,23 | `20261121T201950Z-4aa9145f` |
| UC-01 | `local-session-reconnect` | 100 s | 12 | 298 | 0 | 82 ms | 2,79 | `20261121T202226Z-cb9cb40a` |
| UC-02 | `smoke` | 16 s | 1 | 10 | 0 | — | — | `20261121T202038Z-50c71f60` |
| UC-02 | `local-pilot` | 45 s | 3 | 79 | 0 | 34 ms | 1,70 | `20261121T202057Z-3dee2b25` |
| UC-02 | `local-deep-pagination` | tối đa 75 s | 3 | 453 | 0 | 42 ms | 21,22 | `20261121T202439Z-5c9cd46f` |

Hai smoke bổ sung chạy trên đúng fixture của bài chuyên biệt. UC-01 đạt 9/9 với 12 danh tính chuẩn bị sẵn (`20261121T202207Z-0ab5788e`). UC-02 đạt 10/10 với 1.000 mục mỗi tab (`20261121T202418Z-adbd127d`). Tổng cộng có tám lượt Locust. Runner hồi quy dùng [danh sách CI](https://github.com/tma-706/HK1_2627_INT3505E_1_Group_7/blob/f6f5ff50049918b558ac023c2216d097483cdc7c/tests/performance/ci.yml), cả bốn lượt bắt buộc có mã thoát 0 (`dist/performance/ci-7f380e430b5748e08f8255dfee7a0aec.json`).

### UC-01 · Tải kết nối lại

| Pha | VU quan sát theo giây | Số request | RPS pha | p95 cấp phiên (số mẫu) |
| --- | ---: | ---: | ---: | --- |
| Tăng nền, 3 s | 0–3 | 5 | 1,67 | 101,6 ms (3) |
| Nền, 24 s | 3 | 31 | 1,29 | 35,5 ms (6) |
| Bùng tải, 4 s | 3–12 | 19 | 4,75 | 396,5 ms (10) |
| Giữ đỉnh, 33 s | 12 | 172 | 5,21 | 43,7 ms (37) |
| Hạ tải, 6 s | 8–12 | 23 | 3,83 | 24,7 ms (2) |
| Hồi phục, 30 s | 3 | 38 | 1,27 | 26,9 ms (9) |

Thực đạt 12 VU ở giây 30,273 và trở về 3 VU ở mẫu đầu của pha hồi phục, giây 70,704. Mỗi endpoint đủ ít nhất 6 mẫu trong ba pha giữ. Kế hoạch 100 giây có 288 request bắt đầu trong các pha và thêm 10 request trong thời gian dừng có chờ. P95 pha dùng mẫu gốc gán theo lúc gửi và tính theo hạng gần nhất. RPS pha chia số request bắt đầu cho thời lượng pha. P95 và RPS toàn lượt trong bảng trên lấy từ CSV cuối phiên và có phạm vi toàn lượt.

P95 xác minh phiên lần lượt là 20,2/313,9/38,7/17,0 ms ở các pha nền/bùng/đỉnh/hồi phục. P95 thu hồi phiên tương ứng là 16,3/25,3/20,1/15,6 ms. Độ trễ cấp và xác minh tăng tập trung ở lúc thêm VU. Chưa đủ số mẫu trong pha bùng và chưa tách kết nối TLS mới khỏi thời gian DB để quy nguyên nhân. Điều kiện dừng 20% lỗi không kích hoạt. Đã kiểm logic dưới số mẫu tối thiểu, dưới ngưỡng, đúng biên, vượt ngưỡng và mẫu hết cửa sổ.

### UC-02 · Đọc toàn bộ 1.000 mục mỗi tab

Đã đối chiếu đúng thứ tự của **9.000 mục** trên ba tài khoản. Mỗi tab trả 50 trang × 20 mục cho từng tài khoản. Tất cả dấu hiệu còn trang và hết trang khớp hợp đồng. 450 request danh sách và 3 request hồ sơ đều đạt. Cursor trong DB fixture có 450 dòng sau bài chuyên biệt và smoke cùng dữ liệu. Mốc này xác nhận đường đi qua cursor trong lần chạy, còn chu kỳ hết hạn 24 giờ chưa được đo.

| Nhóm request | Số mẫu | p95 (ms) |
| --- | ---: | ---: |
| Hồ sơ | 3 | 250 |
| Lost trang đầu / trang tiếp | 3 / 147 | 32 / 37 |
| Found trang đầu / trang tiếp | 3 / 147 | 34 / 46 |
| Claims trang đầu / trang tiếp | 3 / 147 | 62 / 34 |

Locust quan sát request trong khoảng 21,34 giây từ số mẫu và RPS toàn lượt. Các nhóm chỉ có ba mẫu báo số đo quan sát, chưa đủ để so ngưỡng latency. Kết quả xác nhận phần API của SCN-PRF-18.

### Giới hạn phép đo

- CPU và RSS của tiến trình Node cùng gateway và PGlite được lấy mỗi giây, nằm trong `resources.json` của hai bài chuyên biệt. UC-01 tối đa 23,6% một lõi logic và RSS 304,4–330,1 MiB qua 109 mẫu. UC-02 tối đa 43,4% một lõi logic và RSS 331,9–346,1 MiB qua 76 mẫu. Chưa có số đo riêng cho máy phát tải, pool PostgreSQL thật hoặc truy vấn chậm nên chưa kết luận điểm nghẽn.
- Trên Windows, một số log có thông báo đóng file từ writer CSV định kỳ của Locust lúc tắt. Cả tám lượt có CSV cuối phiên, HTML, mã thoát 0, số đếm khớp và bảng lỗi cùng ngoại lệ tác vụ rỗng. Phân tích dùng CSV cuối phiên độc lập.
- Kết luận SLO của cả hai UC là **chưa đủ bằng chứng**. Ngưỡng API còn mở. PR-01 từ 200 phiên và PR-02–08 ở biên mobile yêu cầu môi trường tích hợp phù hợp. Các thiết kế staging trong hai kế hoạch chưa được thực thi, gồm soak UC-02 giữ 200 VU trong 90 phút. Xem [kế hoạch UC-01](uc-01/test-plan.md) và [kế hoạch UC-02](uc-02/test-plan.md).
- Dữ liệu thô của lần chạy nằm trong `dist/performance/<uc>/<run-id>/<profile>/`. Các pilot ở trên giữ cấu hình hồi quy và kết quả thăm dò, số đo local chưa dùng để xác nhận triển khai staging hay production.

## Lần chạy lại trước đó ngày 22/11/2026

Đã chạy lại [danh sách CI](https://github.com/tma-706/HK1_2627_INT3505E_1_Group_7/blob/f6f5ff50049918b558ac023c2216d097483cdc7c/tests/performance/ci.yml) cho UC-01 và UC-02 với cùng bản Core và môi trường fixture local như lần trước. Runner xác nhận đủ ba user trong mỗi pilot. Mỗi pilot dùng ba danh tính hoặc phiên tổng hợp riêng, tăng 1 user/giây. Thời lượng cấu hình gồm ramp là 40 giây cho UC-01 và 45 giây cho UC-02. Các số liệu lấy từ CSV toàn phiên, với lỗi chia cho tổng số request.

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

Đã chạy danh sách [CI](https://github.com/tma-706/HK1_2627_INT3505E_1_Group_7/blob/f6f5ff50049918b558ac023c2216d097483cdc7c/tests/performance/ci.yml) trên cùng Core build `core-and-migrations:sha256:ed92c3ffcd032743fcb91503733310d434de20466479efe42e3a2a88278f46db`. Môi trường local dùng proxy Node HTTPS và PGlite 0.5.10 với adapter tuần tự hóa giao dịch. Smoke và pilot đều dùng dữ liệu tổng hợp. Báo cáo từng lượt lưu trong `dist/performance/` theo ID dưới đây.

| UC | Smoke | Pilot | p95 pilot | RPS pilot |
| --- | --- | --- | --- | --- |
| UC-01 | 9/9, `20261121T171647Z-f2c22b7d` | 48 request, 0 lỗi, `20261121T171732Z-fd089d90` | 55 ms | 1,27 |
| UC-02 | 10/10, `20261121T171844Z-8e1fa8bc` | 58 request, 0 lỗi, `20261121T171920Z-3e97d2ab` | 150 ms | 1,54 |

Mỗi pilot ramp tới ba user. Số liệu lấy từ `locust_final_stats.csv` của toàn phiên, theo số request thực đạt. Các pilot ngắn và mẫu ít nên chênh lệch p95 giữa UC hoặc giữa lần chạy chỉ là quan sát. Nghiệm thu cần đích chạy đại diện, cửa sổ ổn định, số mẫu phù hợp với từng operation và telemetry DB, Core và máy phát tải. Staging, tải đề xuất từ 200 phiên, giao diện mobile, OAuth thật và SLO API nằm ngoài bằng chứng local này.
