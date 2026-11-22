# Kiểm thử hiệu năng UC-01

- [UC-01](../../../docs/use-cases/uc-01-google-sign-in-and-session.md), `sha256:e680abe1cd3abeab2c7bb59361af19de929bf7c628f4142d234e6630cede8519`.
- [OpenAPI Core 0.3.0](../../../docs/api/core/openapi.json), `sha256:837aac16902c2383a0d849eb2e2404048682f7fe8519a50dd65bbc35ce21ee25`.
- [SRS, mục 3.3](../../../docs/requirements/lost-and-found-srs.pdf), `sha256:2f67606fba01394440f4ece54716541ce4188ce8a4564748fffdf048d8a5196b`.

| Profile | Kịch bản và tải |
| --- | --- |
| `smoke` | Một user, 9 request. Cấp phiên, gửi lại cùng lượt, cấp phiên cho thiết bị thứ hai, xác minh, thu hồi, lặp thu hồi, xác minh phiên đã thu hồi và kiểm phiên của thiết bị còn lại. Đối chiếu Core của SCN-AUTH-04/05/09/11/13 và FR-AUTH-12/14. |
| `local-pilot` | Ba danh tính riêng, tăng 1 user/s, cấu hình 40 giây gồm ramp. Một vòng gồm cấp phiên, mô phỏng 2–3 lần mở lại, rồi thu hồi. Nghỉ 2–4 giây giữa lần mở và trước vòng mới. Dùng để quan sát các operation hỗ trợ SCN-AUTH-21 ở tải thăm dò. |
| `local-session-reconnect` | Spike 3 → 12 → 3 VU trên Core fixture, 100 giây. Xác minh Core xử lý một đợt kết nối lại và quan sát độ trễ sau khi hạ tải (SCN-AUTH-21 và GAP-AUTH-006). |

Ba ID trên là kế hoạch thực thi ở local. Smoke và pilot đồng thời là hồi quy CI. Hai profile ngắn cung cấp đường cơ sở để đọc kết quả spike.

## Hồ sơ từng kịch bản

| Loại | File thông số | Phạm vi |
| --- | --- | --- |
| Smoke | [smoke.txt](../scenarios/uc-01/smoke/smoke.txt) | Core fixture local và CI |
| Pilot | [local-pilot.txt](../scenarios/uc-01/pilot/local-pilot.txt) | Core fixture local và CI |
| Spike | [local-session-reconnect.txt](../scenarios/uc-01/spike/local-session-reconnect.txt) | Core fixture local. Kịch bản được chọn để đo burst và hồi phục. |

## Thiết kế staging chờ điều kiện chạy

| Loại | File thông số | Phạm vi dự kiến |
| --- | --- | --- |
| Load | [steady-session-turnover.txt](../scenarios/uc-01/load/steady-session-turnover.txt) | Giữ 200 phiên và đo vòng đời phiên |
| Stress | [session-pool-pressure.txt](../scenarios/uc-01/stress/session-pool-pressure.txt) | Tìm dấu hiệu bão hòa pool đến 300 VU và đo hồi phục |
| Spike | [session-reconnect-burst.txt](../scenarios/uc-01/spike/session-reconnect-burst.txt) | Tăng từ 60 lên 220 VU trong 4 giây |
| Soak | [session-state-retention.txt](../scenarios/uc-01/soak/session-state-retention.txt) | Giữ 200 VU trong 2 giờ, theo dõi tài nguyên phiên |
| Breakpoint | [session-capacity-steps.txt](../scenarios/uc-01/breakpoint/session-capacity-steps.txt) | Tăng từng bậc 50 VU đến trần thiết kế 350 VU |

[workloads.yml](workloads.yml) ghi thông số các profile local của bản thực nghiệm. [scenarios.yml](scenarios.yml) giữ các thiết kế staging để chọn khi có đích và fixture đại diện. Mức 200 VU lấy từ mục tiêu thử nghiệm PR-01. Nhịp tăng, đỉnh và thời gian giữ cần được hiệu chỉnh theo nhu cầu thật, trần staging và bằng chứng từ pilot.

Fixture cấp JWT ký bằng khóa thử nghiệm cùng bộ xác minh Core để mô phỏng đầu vào Google, một danh tính độc lập mỗi user, hiệu lực 5 phút. Không gọi Google thật. Cấp phiên dùng `POST /api/auth/sessions`, mở lại dùng `POST /api/auth/sessions/current/validate`, đăng xuất dùng `DELETE /api/auth/sessions/current`. Smoke kiểm `200`, `204` và `401 SESSION_INVALID` ở đúng bước và kiểm tài khoản, trạng thái phiên, `Cache-Control: no-store`. Tỷ lệ lỗi tính trên số yêu cầu, kết quả `401` mong đợi ở bước xác minh sau thu hồi được ghi nhóm riêng. Pilot đặt timeout kết nối/đọc 5 giây để giới hạn bài thăm dò. Điều kiện thời gian của mobile được đo ở app.

Với giả định 2,5 lần mở lại và 3 giây nghỉ bình quân mỗi lần chờ, một vòng dự kiến 4,5 request trong khoảng 10,5 giây, tương đương 1,29 RPS cho ba user khi latency nhỏ. Đây là nhịp thăm dò để mỗi user chạy đủ ba operation, nguồn traffic thật chưa có. Báo tải thử, tải thực, số mẫu, lỗi và p95 theo nhóm. Kiểm trạng thái máy phát, CPU, RAM, pool và truy vấn DB nếu cần xác minh điểm nghẽn hoặc chốt ngưỡng.

Fixture và runner theo UC cần được nối lại với bản triển khai mới trước khi chạy. Xem [phạm vi hồi quy](../README.md) và [căn cứ chỉ tiêu](slo-rationale.md).
