# Kiến trúc triển khai Campus Lost & Found

Áp dụng cho đợt triển khai đầu từ ngày 27/11/2026. Dự án dùng một monorepo. Core là modular monolith, Worker chạy thành tiến trình riêng từ cùng mã nguồn Core, còn AI chạy thành dịch vụ Python riêng. Core sở hữu trạng thái nghiệp vụ và quyết định phân quyền. [Kiến trúc V4](https://github.com/tma-706/HK1_2627_INT3505E_1_Group_7/blob/5438d8be44360ca264e5759dc41c16554f9141bc/docs/architecture/Lost_and_Found_Architecture_v4_Testing.pdf)

## Cấu trúc đích

```text
apps/
  core/
    src/
      api.ts
      worker.ts
      modules/
  mobile/
  matching/
db/migrations/
docs/api/core/v1/
infra/
tests/
compose.yaml
```

- **Core.** Dùng Node.js 22 LTS, TypeScript, Fastify, `pg` và migration SQL có thứ tự. `api.ts` và `worker.ts` là hai điểm khởi động. Chia module theo nghiệp vụ, chẳng hạn `identity`, `posts`, `claims`, `media`, `discovery`, `communication` và `moderation`. Mỗi module sở hữu quy tắc và truy vấn ghi của mình. Route và job handler gọi application service. Module khác truy cập qua giao diện công khai của module sở hữu. Ví dụ, job hết hạn claim gọi service của `claims` để chuyển trạng thái và ghi lịch sử.
- **Mobile.** Dùng Expo/React Native và TypeScript. Dùng npm workspaces cho các package JavaScript. Lấy kiểu request/response từ OpenAPI. Mobile gửi yêu cầu tới Core qua Nginx, còn quyền truy cập và trạng thái nghiệp vụ do Core xác định.
- **AI.** Dùng Python và FastAPI trong `apps/matching/`. Worker gọi AI qua hợp đồng nội bộ. Matching dùng dữ liệu đã xử lý được phép dùng và trả kết quả gắn với ID và revision. Core kiểm lại quyền, trạng thái và revision trước khi dùng kết quả. AI index là dữ liệu dẫn xuất có thể dựng lại.
- **Hạ tầng.** Dùng Docker Compose cho local và CI, Nginx giữ nguyên prefix `/api/v1`, PostgreSQL lưu dữ liệu nghiệp vụ và job, kho object private tương thích S3 cấp quyền upload có thời hạn. [Ranh giới hạ tầng](../infrastructure/architecture.md)

## Xử lý nền

Core ghi thay đổi nghiệp vụ và bản ghi outbox trong cùng giao dịch PostgreSQL. Worker nhận việc bằng `FOR UPDATE SKIP LOCKED` và lease, dùng ID sự kiện ổn định để xử lý an toàn khi giao lặp, retry có backoff và chuyển job hết lượt thử sang `DEAD`. Replay giữ nguyên ID sự kiện. Khi áp dụng kết quả bất đồng bộ, Core kiểm lại trạng thái và revision hiện hành. Đợt đầu dùng PostgreSQL cho hàng đợi. Xem xét dispatcher và broker riêng khi có yêu cầu vận hành cụ thể.

## Hợp đồng và quyết định còn mở

- **REST.** Đặc tả chuẩn của Core là [OpenAPI v1](../api/core/v1/openapi.yaml). Dùng mock để smoke test định tuyến, sau đó đối chiếu response từ Core thật với đặc tả.
- **Đăng nhập.** OpenAPI v1 hiện mô tả đăng ký, xác minh email và đăng nhập bằng mật khẩu. Nhánh `experiment/v2` có luồng Google Sign-In để tham khảo. Chốt phương thức cho bản triển khai trước khi mang route đăng nhập hoặc migration danh tính từ nhánh thử nghiệm sang. [OpenAPI tài khoản](../api/core/v1/paths/accounts.yaml) · [Kiến trúc thực nghiệm](https://github.com/tma-706/HK1_2627_INT3505E_1_Group_7/blob/fa1d58a354ffbd5ba90e7421ffc3af20fd0ddf1e/docs/architecture/overview.md)
- **Vị trí.** Chốt mức dữ liệu công khai và bộ lọc dùng `areaId` hay tọa độ/bán kính trước khi tạo migration vị trí. PostgreSQL thông thường đủ cho đợt đầu. Đánh giá PostGIS khi cần truy vấn hoặc chỉ mục không gian.
- **Realtime.** REST là hợp đồng hiện hành cho chat. Chốt hợp đồng realtime trước khi triển khai WebSocket/WSS.

## Lát cắt triển khai đầu tiên

Chạy `GET /api/v1/posts` qua Nginx đến Core thật. Core đọc dữ liệu mẫu được tạo sau khi chạy migration PostgreSQL. CI kiểm đặc tả OpenAPI, chạy request qua Nginx và đối chiếu mã trạng thái cùng schema response. Kết quả mock dùng để kiểm định tuyến. Có thể triển khai lát cắt đọc công khai trong khi chốt đăng nhập, dữ liệu vị trí và các tham số vận hành Worker.
