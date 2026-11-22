# Kiểm thử hiệu năng UC-02

## Nguồn và phạm vi

- [UC-02](../../../docs/use-cases/uc-02-profile-and-my-items.md), `sha256:21945bc6ef29ef01f5a806690ae5c783b037727bdea6a050fe96a44ed262b5c2`.
- [OpenAPI Core 0.3.0](../../../docs/api/core/openapi.json), `sha256:837aac16902c2383a0d849eb2e2404048682f7fe8519a50dd65bbc35ce21ee25`.
- [SRS, mục 3.3](../../../docs/requirements/lost-and-found-srs.pdf), `sha256:2f67606fba01394440f4ece54716541ce4188ce8a4564748fffdf048d8a5196b`.

Core đọc hồ sơ qua `GET /api/me/profile` và danh sách qua `GET /api/me/items`. Hành trình tải dùng một phiên hợp lệ riêng cho mỗi người dùng ảo. Fixture hồi quy có 21 mục mỗi tab để kiểm biên 20/21. Bài duyệt sâu dùng 1.000 mục mỗi tab. Các mục cùng thời điểm tạo để kiểm thứ tự theo ID. Thời gian cấp phiên và nạp DB nằm ngoài số đo đọc API. Dữ liệu ảnh và hiển thị được đo riêng trên mobile.

| Bài chạy | Kịch bản và mục tiêu | Tải |
| --- | --- | --- |
| `smoke` | SCN-PRF-01/03/04/06/07. Kiểm hồ sơ đúng tài khoản, `no-store`, đủ ba tab, thứ tự ID, cursor và làm mới. | Một phiên, đúng 10 lời gọi cần có kết quả. |
| `local-pilot` | SCN-PRF-01/03/07, PERF-PRF-001. Xác minh script và quan sát tín hiệu đọc API ban đầu. | Ba phiên riêng, tăng 1 user/s, 45 giây gồm cả tăng tải. |
| `local-deep-pagination` | SCN-PRF-18, phần Core của PR-09. Duyệt hết ba tab, đối chiếu ID, thứ tự, biên trang và kết thúc. | 3 VU, tăng 1 VU/s, 1.000 mục/tab/tài khoản, 453 request dự kiến trong tối đa 75 giây gồm ramp. |

Ba ID trên là kế hoạch thực thi ở local. Smoke và pilot đồng thời là hồi quy CI. Phép đo trên thiết bị cho SCN-PRF-17/19 cần fixture tích hợp, đo hiển thị, ảnh và dung lượng cache.

Pilot dùng giả định 30% chỉ mở hồ sơ, 50% mở Hồ sơ → Mục của tôi → Lost → chuyển Found hoặc Claims (chia đều), 20% cuộn trang sau của Lost. Một nửa hành trình chuyển tab có làm mới. Kỳ vọng 2,65 yêu cầu mỗi hành trình, gồm một lượt đọc hồ sơ và trung bình 1,65 lượt đọc danh sách. Thời gian chờ giữa thao tác 0,5–1,5 giây, giữa hành trình 2–4 giây. Với độ trễ API nhỏ, ba phiên ước tính khoảng 1,7 RPS theo `3 × 2,65 / (3 + 1,65)`. Dùng RPS thực đo để kiểm giả định. Tỷ trọng và nhịp thao tác chỉ phục vụ pilot.

## Hồ sơ từng kịch bản

| Loại | File thông số | Phạm vi |
| --- | --- | --- |
| Smoke | [smoke.txt](../scenarios/uc-02/smoke/smoke.txt) | Core fixture local và CI |
| Pilot | [local-pilot.txt](../scenarios/uc-02/pilot/local-pilot.txt) | Core fixture local và CI |
| Load | [local-deep-pagination.txt](../scenarios/uc-02/load/local-deep-pagination.txt) | Core fixture local. Duyệt sâu ba tab để kiểm quy mô dữ liệu PR-09. |

## Thiết kế staging chờ điều kiện chạy

| Loại | File thông số | Phạm vi dự kiến |
| --- | --- | --- |
| Load | [steady-profile-items.txt](../scenarios/uc-02/load/steady-profile-items.txt) | Giữ 200 phiên và đo hồ sơ, danh sách, phân trang |
| Stress | [items-query-pressure.txt](../scenarios/uc-02/stress/items-query-pressure.txt) | Khảo sát truy vấn và pool đến 320 VU rồi đo hồi phục |
| Spike | [items-refresh-burst.txt](../scenarios/uc-02/spike/items-refresh-burst.txt) | Tăng từ 80 lên 240 VU trong 4 giây |
| Soak | [items-cursor-growth.txt](../scenarios/uc-02/soak/items-cursor-growth.txt) | Giữ 200 VU trong 90 phút, theo dõi độ trễ và cursor |
| Breakpoint | [items-capacity-steps.txt](../scenarios/uc-02/breakpoint/items-capacity-steps.txt) | Tăng từng bậc 40 VU đến trần thiết kế 360 VU |

[workloads.yml](workloads.yml) cấu hình các profile local đang chạy. [scenarios.yml](scenarios.yml) giữ các thiết kế staging để chọn khi có đích và fixture đại diện. Mức 200 VU lấy từ PR-01. Nhịp tăng, đỉnh và thời gian giữ cần được hiệu chỉnh theo nhu cầu thật, trần staging và bằng chứng từ pilot.

## Điều kiện đo và SLO

- Smoke phải đạt trên cùng build, URL và bộ fixture trước pilot. Pilot ghi toàn phiên. Dùng `locust_final_stats.csv` được xuất khi Locust kết thúc, trạng thái tiến trình và các nhóm request thực chạy. CSV định kỳ phục vụ theo dõi tiến trình. Mỗi phản hồi mạng lỗi, HTTP ngoài `200`, cache header sai hoặc payload lệch fixture tính một lỗi trên tổng số request đọc. Local đặt timeout kết nối/đọc 5 giây để giới hạn bài thăm dò. PR-07 được đánh giá theo hạn 15 giây của từng request trên app.
- [SLO](slo.yml) giữ riêng các ngưỡng chưa chốt cho p95 và tỷ lệ lỗi của Core. Mốc 2.000 ms áp dụng cho thời điểm mobile hiển thị đầy đủ, với ít nhất 95% lượt đủ điều kiện theo từng hành trình. Khi đo mobile, tính cả lỗi, timeout và lượt chưa hoàn tất vào mẫu số. Báo cache nguội/ấm, tỷ lệ có ảnh, ảnh lỗi/thay thế và mốc Core nhận yêu cầu, client nhận phản hồi, thiết bị render. QA và sản phẩm chốt cách tính ảnh thay thế và dung lượng cache OS.
- Trước bài đo chính thức, xác nhận bản build và fixture, tỷ trọng hành trình, tải thực đạt, cửa sổ ổn định sau ramp, cỡ mẫu cho từng nhóm và tình trạng máy phát tải. Đồng bộ CPU, RAM, tín hiệu DB/pool và trace với mốc bất thường. Đặt trần và điều kiện dừng theo staging trước khi tăng tải. Giữ cùng cấu hình, dữ liệu và cửa sổ khi so trước/sau. Chỉ dùng ngưỡng đã chốt và lần đo đủ bằng chứng cho gate.

## Chạy trên gateway fixture của repo

Từ gốc repo, dùng Git Bash, Node.js, Python, Docker Compose và OpenSSL. Các lệnh tạo phiên và dữ liệu tổng hợp trong Compose project `lf-uc01-local`.

```bash
npm ci
bash infra/uc01-local/run.sh up
python -m pip install -r tests/performance/uc-02/requirements.txt
export NODE_EXTRA_CA_CERTS="$PWD/dist/uc01-local/tls/ca.crt"
sessions=$(node tests/performance/uc-02/fixture.mjs)
build=$(git rev-parse HEAD) # Dùng định danh nội dung/bản build riêng nếu có thay đổi chưa commit.
python tests/performance/uc-02/run.py smoke --sessions "$sessions" --build "$build" --environment compose-local
python tests/performance/uc-02/run.py local-pilot --sessions "$sessions" --build "$build" --environment compose-local
deep_sessions=$(node tests/performance/uc-02/fixture.mjs 1000)
python tests/performance/uc-02/run.py smoke --sessions "$deep_sessions" --build "$build" --environment compose-local
python tests/performance/uc-02/run.py local-deep-pagination --sessions "$deep_sessions" --build "$build" --environment compose-local
```

Với cổng khác 8443, đặt `UC01_HTTPS_PORT` cho gateway và fixture, rồi truyền `--host https://127.0.0.1:<cổng>` khi chạy. `run.json`, log, HTML và CSV nằm trong `dist/performance/uc-02/<run-id>/<profile>/`. Fixture phiên có token và nằm trong `dist/`, ngoài Git. Với CI, chọn profile hồi quy sau khi chốt ngân sách CI, kiểm fixture và đánh giá ngưỡng API trên bản build tạm trước khi nối deploy staging.

Nếu CA local được tạo bằng script cũ và Python báo thiếu `key usage`, dừng fixture gateway, chuyển `dist/uc01-local/tls` sang một thư mục sao lưu và chạy lại `up` để tạo chuỗi chứng chỉ mới. Việc này giữ cơ sở dữ liệu fixture.
