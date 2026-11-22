# Lost & Found

Thực nghiệm UC-01 **Đăng nhập Google và quản lý phiên** và UC-02 **Hồ sơ và Mục của tôi**. Nghiệp vụ và màn hình lấy từ [SRS](docs/requirements/lost-and-found-srs.pdf), mục 3.1–3.3. Phạm vi đầu gồm các yêu cầu Essential của hai UC.

| Cần làm | Nguồn |
| --- | --- |
| Xác định phạm vi, trường hợp lỗi và cách nghiệm thu | [Phân tích UC-01/02](docs/requirements/analysis/uc-01-02.md) |
| Tra tiêu chí bảo mật và chọn phép đo hiệu năng | [Tiêu chí tham chiếu](docs/requirements/quality/README.md) |
| Tìm ranh giới, dữ liệu và công nghệ | [Kiến trúc thực nghiệm](docs/architecture/overview.md) |
| Từ SRS đến contract, UC spec và mã | [Quy trình bàn giao](docs/skill-workflow.md) |
| Tra kịch bản nghiệm thu và phạm vi bàn giao | [UC-01 · Đăng nhập Google và quản lý phiên](docs/use-cases/uc-01-google-sign-in-and-session.md), [UC-02 · Hồ sơ và Mục của tôi](docs/use-cases/uc-02-profile-and-my-items.md) |
| Dựng local và chạy kiểm tra | [Hướng dẫn chạy](docs/operations/environments.md) |
| Tra hợp đồng thiết kế API | [OpenAPI Core](docs/api/core/openapi.json) |

Core phục vụ `GET /health/ready`, ba operation quản lý phiên của UC-01 và hai operation đọc của UC-02. App Expo mở Hồ sơ và ba tab Mục của tôi bằng một lần chạm. Các tab dùng dữ liệu tổng hợp của môi trường thử nghiệm. Xem [hướng dẫn môi trường](docs/operations/environments.md) để dựng Core và chạy bản mobile.
