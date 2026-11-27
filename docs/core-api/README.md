# Bàn giao Core API · Campus Lost & Found

Core API thực thi nghiệp vụ, phân quyền theo tài nguyên và quản lý trạng thái của tài khoản, bài đăng, tương tác, trao trả, hội thoại, ảnh, thông báo, kiểm duyệt và danh mục.

Bắt đầu với [phạm vi triển khai](scope.md) và [hợp đồng REST v1](../api/core/v1/openapi.yaml). Chốt use case và phiên bản hợp đồng cho từng đợt trước khi triển khai. Đặc tả hiện là baseline thiết kế `1.0.0` cho `/api/v1`.

- [Phạm vi và ánh xạ use case](scope.md)
- [Quy tắc nghiệp vụ và phân quyền](domain-rules.md)
- [Mô hình dữ liệu và dữ liệu mẫu](data-model.md)
- [Giao diện tích hợp và hành vi lỗi](integration-contracts.md)
- [Kịch bản nghiệm thu](acceptance-tests.md)

## Chạy mock cục bộ

Cần Node.js 22 trở lên. Chạy các lệnh sau từ gốc repo trên macOS/Linux.

```sh
spec="${TMPDIR:-/tmp}/lost-found-core-v1.json"
npx --yes @redocly/cli@2.82.0 bundle docs/api/core/v1/openapi.yaml --output "$spec"
node docs/api/core/v1/mock.mjs "$spec"
```

Mở [Swagger UI](http://127.0.0.1:4010/docs) hoặc thử `curl -i http://127.0.0.1:4010/api/v1/posts`. Với route cần phiên, nhập `demo-core-session` trong **Authorize**. Mock trả ví dụ OpenAPI tĩnh. Nghiệm thu thay đổi trạng thái, phân quyền, truy vấn và xử lý bất đồng bộ trên bản triển khai thực.

## Kiểm tra hợp đồng

```sh
npx --yes @redocly/cli@2.82.0 lint docs/api/core/v1/openapi.yaml
```

Nguồn hiện có đặc tả, mock và bộ kịch bản nghiệm thu. Lệnh chạy backend, migration và test tích hợp sẽ được bổ sung khi có mã triển khai.
