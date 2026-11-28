# UC-02 · Bản ghi soạn đặc tả 0.2

**Đặc tả 0.2 và UI 0.1 · Chờ duyệt**

- Đầu vào nghiệp vụ là yêu cầu “review và chỉnh sửa uc-02” trong hội thoại, gồm mục tiêu, luồng chính bước 1–4, năm ngoại lệ và sáu tiêu chí chấp nhận. Bản UC02 ngay sau rà soát API, trước khi soạn bản 0.2, có SHA-256 `2469befa08233a9bbf5bf2f997335cba086c398ab6ec7e3c98113d9b36cfba9a`.
- Bản nền của checkout là `fbc39731d81bda93e88175cc30881f63fc0ebf04`. Core REST `/api/v1` có `info.version: 1.0.0`, OpenAPI `3.1.0`. Bản nguồn hợp đồng gồm diff UC02 hiện có trong checkout. [Ghi chú rà soát API](../../../api/core/v1-notes.md#uc02-login)
- Các nguồn về ranh giới triển khai và SEC gồm [bối cảnh dự án](../../../../.agents/lost-and-found-context.md), [quy tắc Core](../../../core-api/domain-rules.md), [phạm vi](../../../core-api/scope.md) và các nghĩa vụ tương ứng trong hợp đồng. Các tiêu chí UC01 về bảo vệ credential và điều kiện cấp phiên tham chiếu [bản duyệt UC01](../uc-01-0.2/approval.md). Chưa có bộ ID SEC/PERF riêng hoặc ngưỡng PERF được chốt cho UC02.
- UI dùng [hướng dẫn 0.2 · Chờ duyệt](../../../design/ui-guidelines.md). Trạng thái từ chối dùng hình của [UC01 UI 0.5](../../uc-01-ui.md#dang-nhap-bi-tu-choi). Các hình còn lại được dựng tại repo.

## Dấu vân tay SHA-256 của nguồn đang dùng

| Đầu vào | SHA-256 |
| --- | --- |
| [OpenAPI root](../../../api/core/v1/openapi.yaml) | `ba0d1fd938011becbbbbda2e824c6f4b5e0a4776a20ecc9fff917979d6b917c7` |
| [Tài khoản và phiên](../../../api/core/v1/paths/accounts.yaml) | `fa65442969ba8efb31f4a06af7f5eb357d2f8b264e5a218cc759b99f18f701b0` |
| [Chi tiết bài](../../../api/core/v1/paths/posts.yaml) | `00cbcd55a316b2dbd3738da7e92c1cea04d738b1a85a231312694c73c798e501` |
| [Kiểm duyệt](../../../api/core/v1/paths/moderation.yaml) | `65d995d49424465961bcd39744cfec726040d6c88254a84612da77cc069744dd` |
| [Tương tác](../../../api/core/v1/paths/interactions.yaml) | `df1cec11dc9a1d4e3aed348857ccbe1e1b5724ed66863f147b9ca288688e4c7f` |
| [Hướng dẫn UI](../../../design/ui-guidelines.md) | `776541b35a1d4016c771fa6f763bebb45789c180c19ceb0bdad67e892cc59372` |

## Tài liệu và khả năng nghiệm thu

- [Đặc tả 0.2](../../uc-02.md) có tám SCN, bao phủ sáu tiêu chí trong yêu cầu và các nhánh lỗi dữ liệu, mất kết nối, phản hồi đến muộn.
- [UI 0.1](../../uc-02-ui.md) có 17 trạng thái gắn với nhánh và SCN. Kịch bản UC02 trên thiết bị cần màn đăng nhập và điều hướng thật. Mobile hiện có điểm vào từ UC01 ở [RegistrationFlow.tsx](../../../../apps/mobile/RegistrationFlow.tsx).
- Các ca trạng thái, quyền và UI của UC02 cần nghiệm thu khi có bản triển khai. [Nghiệm thu Core](../../../core-api/acceptance-tests.md#uc02). [Bộ kiểm thử Identity hiện có](../../../../tests/core-identity.mjs) phục vụ luồng UC01.

## Kiểm chứng bản 0.2 / UI 0.1

- Đã kiểm các liên kết và neo hai chiều giữa tám SCN và 17 trạng thái UI, sáu dấu vân tay đầu vào, bundle OpenAPI và miền bảo mật của tám operation được tham chiếu. Đã kiểm tập phản hồi của createPasswordSession và giới hạn 900 giây của Retry-After.
- Đã render hai tài liệu bằng trình phân tích Markdown để kiểm cấu trúc bảng và danh sách ảnh. Đã phân tích đủ 17 SVG dưới dạng XML, render từng khung bằng Sharp và xem cả ba bảng ảnh để kiểm chữ, vùng bố cục và khả năng đọc.
- npm run check:clients và git diff --check đạt. Bằng chứng trên xác nhận tài liệu, hợp đồng và minh họa tĩnh. Nghiệm thu trong ứng dụng và kiểm hiệu năng chờ bản triển khai UC02.
