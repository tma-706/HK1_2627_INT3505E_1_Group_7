# Hướng dẫn làm việc với Campus Lost & Found

- Trước khi sửa Core, mobile, AI hoặc hạ tầng, đọc [kiến trúc triển khai](docs/architecture/implementation-baseline.md). Đây là nguồn chuẩn về stack, cấu trúc repo, quyền sở hữu nghiệp vụ và phạm vi đợt đầu.
- Với thay đổi HTTP, đối chiếu operation và schema trong [OpenAPI v1](docs/api/core/v1/openapi.yaml). Khi thay đổi hợp đồng đã được thống nhất, cập nhật đặc tả và kiểm thử liên quan cùng mã triển khai.
- Khi tham khảo `experiment/v2`, đối chiếu lại hành vi với hợp đồng hiện hành. Với quyết định còn mở, tiếp tục phần việc độc lập và dùng quyết định đó khi nhóm đã chốt.
- Khi sửa môi trường chạy, đọc [kế hoạch local/CI](docs/infrastructure/local-stack.md) và [tiêu chí nghiệm thu](docs/infrastructure/acceptance.md).

## GitHub

Khi được yêu cầu push, luôn dùng tài khoản [`hehuanglu`](https://github.com/hehuanglu). Trước khi push, kiểm tra username của Git credential thực tế và remote đích. Dùng repo và nhánh người dùng chỉ định. Nếu chưa có chỉ định, kiểm tra cấu hình Git và nhánh hiện tại rồi báo đích. Dừng và nêu rõ lý do nếu không thể xác minh hoặc dùng `hehuanglu`.
