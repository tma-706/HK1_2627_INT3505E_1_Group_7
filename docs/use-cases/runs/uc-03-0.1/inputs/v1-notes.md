# Bàn giao Core API v1

Xem [hướng dẫn Core API](../core-api/README.md) để chạy mock và kiểm tra hợp đồng. Tra cứu [phạm vi UC01–UC30, các quyết định cần chốt và ánh xạ operation](../core-api/scope.md) trước khi triển khai. Đặc tả REST ở [OpenAPI v1](v1/openapi.yaml).

## UC01 – Đăng ký và xác thực email

- Nguồn nghiệp vụ là mô tả UC-01 trong yêu cầu cập nhật, gồm luồng chính, ngoại lệ và tiêu chí chấp nhận. Bản hợp đồng dùng để so sánh là `/api/v1`, `info.version` `1.0.0`, commit `00a9b3d`. Bản cập nhật nằm trong diff hiện tại và dùng các operation tại [accounts.yaml](v1/paths/accounts.yaml).
- `registerAccount` từ chối tạo tài khoản khi email đã chuẩn hóa bị trùng. Hợp đồng hiện tại trả biên nhận `202` chung cho cả đăng ký hợp lệ và email đã tồn tại. `getEmailRequestStatus` chỉ cho biết yêu cầu đã được tiếp nhận. Nếu UC cần hiển thị thông báo riêng khi email trùng, đây là quyết định cần chốt vì sẽ thay đổi phản hồi công khai và cách Mobile xử lý đăng ký.
- Core lưu tài khoản chưa xác thực cùng việc gửi email ban đầu trong một giao dịch. Worker gửi thư theo luồng thông báo liên quan UC20. Khi gửi lỗi, Worker thử lại tối đa ba lần sau lần gửi đầu. Các lần thử lại thuộc cùng việc gửi và không tính vào hạn mức khách yêu cầu gửi lại. Khi hết lượt, Worker ghi nhận việc gửi thất bại. Tài khoản vẫn chưa xác thực và khách có thể yêu cầu gửi lại theo hạn mức.
- `verifyAccountEmail` trả `204` sau khi kích hoạt tài khoản và `410` nếu token đã hết hạn hoặc đã dùng. Token có hiệu lực 15 phút kể từ khi Core cấp. Yêu cầu gửi lại đủ điều kiện cấp token mới có thời hạn riêng. `requestVerificationEmail` trả `429` kèm `Retry-After` khi vượt hạn mức. `createPasswordSession` chỉ cấp phiên cho tài khoản hoạt động theo điều kiện của UC02. Xem [kịch bản nghiệm thu UC01](../core-api/acceptance-tests.md#uc01).

<a name="uc02-login"></a>

## UC02 · Đăng nhập

- Nguồn là [UC02](../../use-cases/uc-02.md) và mô tả trong yêu cầu rà soát. Bản nền là [Core REST v1](v1/openapi.yaml), `/api/v1`, `info.version: 1.0.0`, OpenAPI `3.1.0`, commit `fbc3973`. Bản chỉnh nằm trong diff hiện tại.
- Luồng chính và tiêu chí 1, 6 dùng `createPasswordSession` và `getCurrentSession`. Phản hồi phiên mô tả vai trò đúng với `Session` và `SessionView`. Core xác minh trạng thái tài khoản trước khi cấp phiên và kiểm quyền ở từng operation Bearer. Hành vi thu hồi phiên hiện tại vẫn thuộc `revokeCurrentSession`. [Tài khoản và phiên](v1/paths/accounts.yaml)
- Tiêu chí 2–4 dùng phản hồi chung cho email không khớp và mật khẩu sai. Diễn giải cửa sổ 15 phút là cửa sổ trượt, dùng cùng khóa email chuẩn hóa cho cả hai trường hợp, bỏ các lần sai đã đủ 15 phút trước khi tính lần mới. `429` tại lần sai thứ năm là tín hiệu để Mobile thông báo ngay. Nếu cần gửi thêm qua email hoặc UC20, cần chốt kênh và điều kiện gửi. `moderateAccount` kiểm quyền mở khóa theo loại và lưu audit. [Tài khoản và phiên](v1/paths/accounts.yaml) · [Kiểm duyệt](v1/paths/moderation.yaml)
- Tiêu chí 5 dùng `getPublicPost` để tải lại bài sau khi đăng nhập. Mobile giữ ngữ cảnh điều hướng. Core kiểm quyền tại operation đích, ví dụ `getClaimQuestions` và `submitClaim` cho Found hoặc `submitFinderResponse` cho Lost, với các điều kiện của UC15 và UC17. [Bài đăng](v1/paths/posts.yaml) · [Tương tác](v1/paths/interactions.yaml)
- SEC áp dụng cho bảo mật credential, phản hồi chung, trạng thái khóa nhất quán khi có yêu cầu đồng thời, Bearer, quyền theo tài nguyên và audit mở khóa. PERF có thể đo từ lúc gửi biểu mẫu đến khi nhận kết quả và từ lúc đăng nhập xong đến khi tải lại bài trong UC13. Chưa có ngưỡng PERF UC02 được chốt trong nguồn đang dùng. [Kịch bản nghiệm thu](../../core-api/acceptance-tests.md#uc02)
- Tương thích cấu trúc với Core REST v1 và kiểu dữ liệu Mobile hiện tại. Giữ đường dẫn, operation ID, schema payload và tập mã HTTP. Với client đăng nhập tương lai, lượt sai thứ năm và các lượt trong khóa tạm dùng nhánh `429`, với `Retry-After` từ 1 đến 900 giây. Thời hạn và chính sách thu hồi phiên ngoài luồng UC02 tiếp tục theo [phạm vi bàn giao](../../core-api/scope.md).

<a name="uc03"></a>

## UC03 · Đặt lại mật khẩu

- Nguồn nghiệp vụ là yêu cầu trong hội thoại, đã được cập nhật vào [UC‑03](../../use-cases/uc-03.md). Bản nền là [Core REST v1](v1/openapi.yaml) tại `c5822ea`. Bản sửa là diff trong checkout, với `/api/v1`, `info.version` `1.0.0` và OpenAPI `3.1.0`.
- Bước 1–2 và tiêu chí 1, 5 dùng `requestPasswordReset`. `202` và `getEmailRequestStatus` chỉ xác nhận tiếp nhận. Lỗi gửi thuộc Worker của UC20, với tối đa ba lần thử lại sau lần đầu. Diễn giải hạn mức là cửa sổ trượt 15 phút theo email chuẩn hóa. Khi 15 phút qua chưa có yêu cầu được tiếp nhận, yêu cầu tiếp theo là lượt đầu. Lượt đầu nằm ngoài hạn mức ba lượt gửi lại. Lần thử của Worker giữ nguyên token và mốc hết hạn. [Operation tài khoản](v1/paths/accounts.yaml)
- Bước 3 là điều hướng của Client. Bước 4–5 và tiêu chí 2–4, 6 dùng `resetPassword`. Core kiểm token tại lúc xử lý, trả `410` cho token hết hạn hoặc đã dùng và cập nhật mật khẩu cùng việc tiêu thụ token trong một giao dịch. Mở liên kết rồi chờ quá hạn vẫn dẫn đến `410` khi gửi biểu mẫu. [Operation tài khoản](v1/paths/accounts.yaml)
- SEC bao gồm bảo mật thông tin xác thực, phản hồi chung cho email tồn tại và chưa đăng ký, hạn mức nhất quán khi xử lý đồng thời và tiêu thụ token đúng tài khoản và mục đích. Core và Client tránh ghi token, mật khẩu hoặc liên kết chứa token vào log và telemetry. PERF lấy thời điểm Client gửi yêu cầu làm mốc chung, rồi đo riêng đến lúc nhận `202` và đến lúc thư tới hộp thư kiểm thử. Nguồn UC03 chưa chốt ngưỡng cho hai phép đo này. [Kịch bản nghiệm thu](../../core-api/acceptance-tests.md#uc03)
- Hai operation ghi được làm rõ về hành vi và dùng lại các đường dẫn, operation ID, quyền, schema, mã HTTP và header hiện có. `getEmailRequestStatus` và các schema dùng chung với UC01 giữ nguyên. Bộ sinh kiểu Mobile hiện chưa đưa hai POST của UC03 vào danh sách operation.
- Trước khi triển khai, cần chốt điểm đích của liên kết, chính sách mật khẩu mới, điều kiện của tài khoản chưa xác thực hoặc đang bị khóa, hiệu lực của các token khác đã cấp khi gửi lại hoặc khi một lần đặt lại thành công, và chính sách thu hồi phiên sau khi đặt lại. [Phạm vi bàn giao](../../core-api/scope.md)
