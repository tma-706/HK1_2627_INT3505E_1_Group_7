# Campus Lost & Found · Hạ tầng

Nhánh dựng môi trường chạy cho Core API và Worker.

- [Kiến trúc triển khai và tổ chức mã nguồn](docs/architecture/implementation-baseline.md)
- [Phạm vi và ranh giới hạ tầng](docs/infrastructure/architecture.md)
- [Kế hoạch triển khai môi trường local và CI](docs/infrastructure/local-stack.md)
- [Giao diện tích hợp và tiêu chí nghiệm thu](docs/infrastructure/acceptance.md)
- [Hợp đồng REST v1 dùng để kiểm thử định tuyến](docs/api/core/v1/openapi.yaml)

## Chạy stack mock qua HTTPS

Cần Docker đang chạy, Docker Compose có hỗ trợ `up --wait`, `curl` và `openssl` có hỗ trợ `req -addext`. Chạy từ gốc repo trên macOS hoặc Linux.

```sh
sh infra/nginx/generate-local-tls.sh
docker compose up --build --wait --wait-timeout 60
curl --noproxy '*' --cacert .local/tls/localhost.crt -i \
  https://127.0.0.1:8443/api/v1/posts
sh infra/smoke-posts.sh
```

`curl` xác minh chứng chỉ và địa chỉ IP, rồi in HTTP `200` cùng JSON. Script smoke kiểm thêm `Content-Type` và kiểm toàn bộ response theo schema `PublicPostPage` của OpenAPI v1 đã bundle. Nginx giữ nguyên `/api/v1` khi chuyển tiếp đến mock trong mạng Compose. Nếu cổng `8443` đang bận, chạy `export LF_HTTPS_PORT=9443` trước khi khởi động và dùng cổng đó trong lệnh `curl`.

Chứng chỉ phát triển có hiệu lực 30 ngày và được lưu cùng khóa riêng trong `.local/tls/`. `--cacert` áp dụng chứng chỉ cho từng lệnh. Khi tạo lại chứng chỉ, dùng `docker compose restart nginx` để Nginx nạp chứng chỉ mới.

```sh
docker compose down
```

Để chạy lại, dùng `docker compose up --build --wait --wait-timeout 60` với chứng chỉ còn hạn. Workflow `Local stack` trên `pull_request` lint và bundle OpenAPI khi build image mock, rồi chạy cùng script smoke qua Nginx.
