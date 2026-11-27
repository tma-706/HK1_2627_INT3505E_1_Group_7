# Kiểm tra trước và sau deploy

## Thứ tự thực thi

| Giai đoạn | Thực hiện | Điều kiện sang bước sau |
| --- | --- | --- |
| Kiểm thử nhanh | Chạy unit, integration và kiểm tra hợp đồng OpenAPI bằng công cụ của dự án | Các kiểm tra bắt buộc đạt |
| CI trước staging | Build bản ứng viên, dựng API và phụ thuộc trong môi trường tạm, đợi sẵn sàng, chạy smoke và nhóm bài hồi quy đã chọn | Smoke đạt và gate đủ dữ liệu, đạt SLO hồi quy |
| Sau deploy staging | Deploy đúng bản build đã qua gate CI tạm. Kiểm tra phiên bản, readiness và smoke trên staging rồi chạy nhóm bài nghiệp vụ của staging | Gate staging đạt trên bản ứng viên, dưới tải dự kiến đã xác định |
| Phát hành production | Áp dụng luồng release và phê duyệt của dự án | Chỉ phát hành bản ứng viên có gate staging đạt |

- Dùng môi trường, dữ liệu và tài khoản test riêng cho CI tạm. Đợi readiness của API và các phụ thuộc với timeout hữu hạn. Dùng cùng URL cho smoke và Locust. Dùng bộ smoke sẵn có như Newman nếu dự án dùng Postman.
- Lấy danh sách profile của `pre-deploy` và `staging` từ cấu hình tải của dự án. Với mỗi profile, chạy đúng hành trình và đường tải đã chốt, áp dụng [quy tắc đo và xác thực kết quả](run-validation.md) và lưu cấu hình hiệu lực cùng báo cáo vào thư mục theo ID. Mỗi gate chỉ đạt khi tất cả profile bắt buộc đủ bằng chứng và đạt SLO. Nếu chỉ có bài thăm dò hoặc chưa đủ tải đại diện, ghi staging chưa kiểm chứng được mục tiêu phát hành.
- Dùng phiên bản bất biến như image digest hoặc mã định danh bản build để nối kết quả với bản release. Chuyển bản build đã test qua artifact hoặc registry. Kiểm tra staging đang chạy bản đó trước gate staging và kiểm tra lại sau mỗi lần chạy gate staging hoàn tất, kể cả khi gate fail. Giữ cùng khóa từ lúc deploy đến khi hoàn tất bài đo. Trong cùng repo, dùng chung concurrency group cho các workflow đụng tới staging. Với nhiều repo hoặc deploy ở ngoài CI, dùng cơ chế khóa chung của hệ thống deploy.
- Chạy riêng các bài khảo sát có mục tiêu và ngân sách vượt phạm vi CI. Khi dự án chưa có đường deploy staging, hoàn thành gate tạm và ghi phần staging còn thiếu. Khi đã có luồng phát hành production, giữ cơ chế phê duyệt và nối kết quả gate staging với đúng bản sẽ phát hành.

## Tích hợp mẫu GitHub Actions

Dùng [mẫu workflow](../assets/pre-deploy.yml) cho dự án dùng Docker Compose trên GitHub-hosted runner. Khi repo đã có CI hoặc CD, tích hợp các bước vào job tương ứng và tái sử dụng lệnh sẵn có. Đổi tên nhánh, đường dẫn Docker build, service, danh sách secrets và ngân sách job theo dự án.

| Thành phần mẫu | Hợp đồng khi tích hợp |
| --- | --- |
| `ci/fast-verification.sh` | Chạy unit, integration và lint/kiểm tra hợp đồng của dự án. Trả lỗi khi kiểm tra bắt buộc không đạt. |
| `ci/compose.ephemeral.yml` | Service `api` sử dụng `${CANDIDATE_IMAGE}` vừa build. Publish API tại `127.0.0.1:18080`, cấu hình healthcheck đủ để xác nhận có thể phục vụ và chuẩn bị fixture cho smoke. |
| `ci/smoke.sh <url> <output-dir>` | Chạy smoke và ghi JUnit hoặc báo cáo tương đương. Trả lỗi khi luồng bắt buộc không đạt. |
| `ci/performance-gate.sh <stage> <url> <output-dir>` | Nạp dependencies đã chốt phiên bản, đọc nhóm profile theo stage (`pre-deploy` hoặc `staging`) từ `workloads.yml` hoặc cấu hình tương đương của cùng bản ứng viên, báo lỗi nếu thiếu nhóm hoặc profile, chạy Locust cho từng ID, ghi HTML/CSV, mã thoát gốc và kết quả của bộ đánh giá. Trả mã 0 sau khi đủ bằng chứng và tất cả chỉ số bắt buộc đạt. |
| `ci/deploy-staging.sh <image> <commit> <release-file>` | Publish hoặc triển khai image đã qua gate bằng cơ chế của dự án. Ghi JSON có trường `release_id` là mã định danh bất biến một dòng, ví dụ image digest. Chỉ ghi metadata không nhạy cảm vào file này. |
| `ci/verify-staging.sh <url> <release-file>` | Chờ readiness và kiểm tra bản đang phục vụ khớp với `release_id`. Ghi bản kỳ vọng và bản quan sát được vào log. Trả lỗi nếu không xác nhận được. |

- Biến `STAGING_URL` và secrets dùng cho deploy, smoke và Locust nằm trong cấu hình staging. Map các secrets cần cho từng bước cụ thể. PR dùng fixture tạm.
- Trong cùng workflow, đặt job production hiện có phụ thuộc vào `staging-load-gate` và dùng output `release_id` cho bản phát hành. Với production ở workflow riêng, lấy artifact phê duyệt từ lần chạy thành công của workflow đã cấu hình trên nhánh phát hành. Kiểm tra `release_id` khớp bản chọn phát hành cùng metadata commit, run và attempt. Giữ nguyên mã đó từ lúc chờ phê duyệt đến khi deploy.
- Trước khi hoàn tất tích hợp, kiểm tra các nhánh fast verification fail, readiness fail, smoke fail, gate CI tạm fail, gate staging fail và phiên bản staging lệch. Xác nhận các bước hậu kiểm lưu báo cáo đã tạo. Kiểm tra PR chỉ thực hiện gate tạm và push lên nhánh phát hành mới mở đường deploy staging. Kiểm tra toàn pipeline trên runner của dự án khi các lệnh deploy và biến môi trường đã có.
