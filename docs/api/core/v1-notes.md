# Bàn giao Core API v1

Xem [hướng dẫn Core API](../core-api/README.md) để chạy mock và kiểm tra hợp đồng. Tra cứu [phạm vi UC01–UC30, các quyết định cần chốt và ánh xạ operation](../core-api/scope.md) trước khi triển khai. Đặc tả REST ở [OpenAPI v1](v1/openapi.yaml).

## UC01 – Đăng ký và xác thực email

- Nguồn nghiệp vụ là mô tả UC-01 trong yêu cầu cập nhật, gồm luồng chính, ngoại lệ và tiêu chí chấp nhận. Bản hợp đồng dùng để so sánh là `/api/v1`, `info.version` `1.0.0`, commit `00a9b3d`. Bản cập nhật nằm trong diff hiện tại và dùng các operation tại [accounts.yaml](v1/paths/accounts.yaml).
- `registerAccount` từ chối tạo tài khoản khi email đã chuẩn hóa bị trùng. Hợp đồng hiện tại trả biên nhận `202` chung cho cả đăng ký hợp lệ và email đã tồn tại. `getEmailRequestStatus` chỉ cho biết yêu cầu đã được tiếp nhận. Nếu UC cần hiển thị thông báo riêng khi email trùng, đây là quyết định cần chốt vì sẽ thay đổi phản hồi công khai và cách Mobile xử lý đăng ký.
- Core lưu tài khoản chưa xác thực cùng việc gửi email ban đầu trong một giao dịch. Worker gửi thư theo luồng thông báo liên quan UC20. Khi gửi lỗi, Worker thử lại tối đa ba lần sau lần gửi đầu. Các lần thử lại thuộc cùng việc gửi và không tính vào hạn mức khách yêu cầu gửi lại. Khi hết lượt, Worker ghi nhận việc gửi thất bại. Tài khoản vẫn chưa xác thực và khách có thể yêu cầu gửi lại theo hạn mức.
- `verifyAccountEmail` trả `204` sau khi kích hoạt tài khoản và `410` nếu token đã hết hạn hoặc đã dùng. Token có hiệu lực 15 phút kể từ khi Core cấp. Yêu cầu gửi lại đủ điều kiện cấp token mới có thời hạn riêng. `requestVerificationEmail` trả `429` kèm `Retry-After` khi vượt hạn mức. `createPasswordSession` chỉ cấp phiên cho tài khoản hoạt động theo điều kiện của UC02. Xem [kịch bản nghiệm thu UC01](../core-api/acceptance-tests.md#uc01).
