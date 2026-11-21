# Chạy và kiểm tra

## Kiểm tra như CI

Từ gốc repo, dùng Node.js 22 trở lên, npm và Docker đang chạy. CI dùng Node.js 22.

```sh
npm ci
npm run check
npm run test:ai-mock
bash tests/integration/core-ready.sh
```

Bộ kiểm AI mock dùng fixture tổng hợp. Kiểm tra integration dựng DB tạm, xác nhận Core trả 200 khi DB sẵn sàng và 503 sau khi DB dừng theo [OpenAPI](../api/core/openapi.json). Đặt `PORT` nếu cổng 8091 đã dùng.

## Smoke test qua gateway

```sh
docker compose --env-file .env.example -p lf-local config --quiet
docker compose --env-file .env.example -p lf-local up --build -d
curl -fsS http://127.0.0.1:8080/api/health/ready
docker compose --env-file .env.example -p lf-local exec -T matching python -c 'import urllib.request; print(urllib.request.urlopen("http://127.0.0.1:8000/health/ready").read().decode())'
docker compose --env-file .env.example -p lf-local down
```

Trang kiểm tra kết nối ở http://127.0.0.1:8080/. Đợi Core sẵn sàng trước khi gọi curl hoặc dùng `docker compose logs` để xem lỗi. `down` giữ volume, `down -v` dọn cả dữ liệu của project test khi đã xác nhận có thể bỏ. Cấu hình mẫu dành cho loopback và dữ liệu giả.

## Khi đưa UC lên môi trường dùng chung

Dùng bản build định danh từ CI, cấu hình Google, secrets và DB riêng cho từng môi trường. Bật TLS khi dùng phiên thật. Chạy lại các kịch bản UC qua app mobile, ghi build, fixture và kết quả. Khi có migration, kiểm nâng cấp và phục hồi trước khi phát hành.
