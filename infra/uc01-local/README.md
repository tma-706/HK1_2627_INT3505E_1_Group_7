# Môi trường nghiệm thu local UC-01

Chạy ở thư mục dự án với Node.js 22, Docker Compose và OpenSSL.

```sh
npm ci
bash infra/uc01-local/run.sh up
bash infra/uc01-local/run.sh check
```

Gateway HTTPS mặc định ở `https://127.0.0.1:8443`. Dùng `UC01_HTTPS_PORT` nếu cổng đó đang bận. Lệnh `up` tạo DB fixture, áp migration, dựng gateway và kiểm ba API phiên. Lệnh `check` chạy lại phép kiểm bằng tài khoản tổng hợp với hai phiên. PostgreSQL chỉ truy cập được từ mạng Compose.

Kiểm thêm trạng thái mobile qua HTTPS, dùng dữ liệu tổng hợp và kho phiên mô phỏng.

```sh
npm ci --prefix apps/mobile
bash infra/uc01-local/run.sh check-mobile
```

```sh
curl --cacert dist/uc01-local/tls/ca.crt https://127.0.0.1:8443/api/health/ready
bash infra/uc01-local/run.sh down
```

`down` dừng môi trường và giữ DB fixture. Chứng chỉ, khóa và cấu hình phát sinh nằm trong `dist/uc01-local/`, đã được loại khỏi Git. Phép kiểm dùng CA này theo từng tiến trình. Hai URL `/test-terms` và `/test-privacy` phục vụ kiểm thử liên kết. Core dùng khóa công khai tổng hợp qua cấu hình Compose riêng và chạy cùng đường xác minh chữ ký của bản sản phẩm.

Để nghiệm thu app native với Google thật, dùng Android SDK, Xcode và cấu hình OAuth, gateway HTTPS và URL chính sách của môi trường thử nghiệm theo [hướng dẫn UC-01](../../docs/operations/environments.md#uc-01). Môi trường fixture này phù hợp để nghiệm thu Core qua HTTPS và kiểm liên kết. Kịch bản Google picker, kho OS, vùng dữ liệu UC-02 và phép đo pilot cần app chạy trên thiết bị.
