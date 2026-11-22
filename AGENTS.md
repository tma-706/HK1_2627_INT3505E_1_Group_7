# Hướng dẫn làm việc với Lost & Found

## Phạm vi và tài liệu

- Bắt đầu ở [README.md](README.md), đọc SRS, contract và UC spec của phạm vi đang thực hiện. Kiến trúc đã chốt cho thực nghiệm UC-01/02 ở [tài liệu kiến trúc](docs/architecture/overview.md).
- Giữ mỗi quyết định ở một nguồn. Cập nhật yêu cầu, hợp đồng và kiểm tra tương ứng khi đổi hành vi. Dọn tài liệu bị thay thế và giữ dữ liệu thật, secrets, cache cá nhân ngoài Git.

## GitHub

- Dùng repo và nhánh người dùng chỉ định. Nếu người dùng không chỉ định, kiểm tra cấu hình Git và nhánh hiện tại rồi báo đích sẽ dùng.

## Nhận việc sau khi pull

Từ bảng tra cứu trong README, mở SRS theo luồng và ADR liên quan. Khi sửa hành vi, cập nhật nguồn sở hữu quy tắc, hợp đồng và kiểm tra tương ứng trong cùng thay đổi. Chuyển kết luận trong chat vào repo trước khi bàn giao. Giữ lịch sử chat, cache máy cá nhân, secrets và dữ liệu thật ngoài Git. Dùng lệnh kiểm tra tại [hướng dẫn môi trường](docs/operations/environments.md).

Skill dự án ở `.agents/skills/`. Xem [cách chọn skill và bàn giao giữa các bước](docs/skill-workflow.md). Quy trình nghiên cứu có đầu ra và phụ thuộc riêng. Với tác vụ sản phẩm, dùng các đường dẫn đang hoạt động trong README.
