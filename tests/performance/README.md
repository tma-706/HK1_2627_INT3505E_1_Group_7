# Kiểm thử hiệu năng Core theo use case

| Use case trong SRS | Bài chạy mọi PR | Phạm vi đo |
| --- | --- | --- |
| [UC-01 · Đăng nhập Google và quản lý phiên](uc-01/test-plan.md) | `smoke`, `local-pilot` | Cấp, xác minh và thu hồi phiên Core qua HTTPS với Google ID token tổng hợp |
| [UC-02 · Hồ sơ và Mục của tôi](uc-02/test-plan.md) | `smoke`, `local-pilot` | Hồ sơ và danh sách ba tab, gồm đọc tiếp và làm mới |

[Danh sách hồi quy](ci.yml) tích lũy tất cả các UC chạy được. Workflow `Verify Core` dựng bản build của PR với PostgreSQL 16 và gateway fixture, rồi chạy mọi profile đã đăng ký sau khi job Core đạt. Smoke cần đạt để chạy tiếp profile của cùng UC. Runner tiếp tục kiểm các UC khác và trả lỗi cho cả job nếu bất kỳ bài bắt buộc nào thất bại. Khi thêm UC mới, bổ sung thư mục suite và một mục vào `ci.yml` để các lần PR sau chạy cả bài mới và các bài cũ.

Từ gốc repo, dùng Node.js 22, Python 3.13, Docker Compose và OpenSSL để chạy cùng lệnh với CI.

```bash
npm ci
python -m pip install -r tests/performance/requirements.txt
bash infra/uc01-local/run.sh up
python tests/performance/run-ci.py --build "$(git rev-parse HEAD)"
bash infra/uc01-local/run.sh down
```

Với thay đổi chưa commit, truyền định danh bản build tương ứng qua `--build`. File tổng hợp, HTML, CSV cuối phiên và log nằm trong `dist/performance/` và được upload từ workflow, kể cả khi job thất bại. Bí mật fixture nằm ở `dist/uc01-local/`, ngoài phạm vi artifact. Các profile ngắn ghi nhận hồi quy luồng và số đo thăm dò. Tải đại diện trên staging, SLO chính thức và mốc render mobile cần phép đo riêng theo SRS mục 3.3.

Kế hoạch local bổ sung một bài theo rủi ro của mỗi UC. [UC-01](uc-01/test-plan.md) thử đợt kết nối lại và hồi phục sau khi hạ tải. [UC-02](uc-02/test-plan.md) kiểm đủ 1.000 mục mỗi tab qua chuỗi cursor. Các kế hoạch ghi lệnh chuẩn bị fixture và chạy từng kịch bản. Xem [kết quả các lần chạy](analysis.md) để đối chiếu phạm vi và báo cáo.
