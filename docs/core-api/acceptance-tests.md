# Nghiệm thu Core API

Kiểm cú pháp và tham chiếu bằng lệnh bundle/lint ở [hướng dẫn chạy](README.md). Dùng mock cho smoke test request/response. Khi có backend, chạy lại các kịch bản dưới đây trên dữ liệu tổng hợp, theo phiên bản OpenAPI đã chốt cho cụm và lưu kết quả theo UC, `operationId` và commit triển khai.

| UC | Thao tác và dữ liệu | Kết quả mong đợi |
| --- | --- | --- |
| UC01–04 | Tạo tài khoản, xác minh email, cấp và thu hồi phiên, đọc/sửa hồ sơ, đổi và đặt lại mật khẩu. Dùng hai tài khoản và đồng hồ điều khiển. | Phiên hợp lệ chỉ đọc/sửa dữ liệu đúng chủ thể. Phiên đã thu hồi bị từ chối. Kiểm hạn xác minh 15 phút, hạn reset 30 phút, token dùng một lần, gửi lại tối đa 3 lượt/15 phút và cửa sổ khóa theo baseline. |
| UC08, UC11–14 | Dựng bài công khai, bài đóng, bài ẩn, bài của người khác. Gọi feed, tìm kiếm, chi tiết, trang sau và danh sách của tôi. | Feed, chi tiết và URL chia sẻ áp dụng cùng điều kiện Open + Visible và cùng bản đã che. Danh sách riêng theo chủ thể. Cursor đúng truy vấn tiếp tục đúng thứ tự, cursor sai phạm vi trả lỗi hợp đồng. |
| UC05–07, UC09, UC23–24 | Tạo draft, xin grant, xác nhận hai lần, gửi khóa lặp với payload khác, chỉnh che rồi xuất bản. Thử revision cũ và ảnh của tài nguyên khác. | Cùng grant hợp lệ được trả lại theo baseline. Payload khác với cùng khóa trả 409. Xác nhận lặp giữ cùng nguồn và kết quả hiện hành. Chỉ xuất bản khi nội dung đúng revision và đủ điều kiện. Bản công khai không chứa EXIF/GPS hoặc phần cần che. |
| UC15–19 | Tạo claim hoặc phản hồi, đi qua mốc quota, duyệt hai yêu cầu đồng thời, rồi thử xem/gửi chat từ hai bên và người ngoài. | Chỉ một quyết định có hiệu lực và quyền chat được ghi cùng trạng thái. Người ngoài bị từ chối. Khi bài đóng hoặc đã trao trả, thao tác đọc/gửi theo trạng thái và quyền của hai bên. |
| UC10 | Tạo yêu cầu xác nhận trao trả. Thử một bên xác nhận, hai bên xác nhận, hủy song phương và thời hạn bằng đồng hồ kiểm thử. | Chỉ chuyển Returned khi có hai xác nhận phù hợp. Hủy hợp lệ cập nhật đồng bộ trạng thái. Hàng xem xét ở mốc 7 ngày và xử lý xác nhận muộn theo chính sách đã chốt cho sprint. |
| UC20–21, UC25 | Phát lại cùng sự kiện. Đọc/đánh dấu thông báo bằng tài khoản khác. Cho adapter gợi ý trả dữ liệu cũ sau khi bài đổi revision hoặc bị ẩn. | Xử lý lặp giữ nhất quán inbox và gửi. Chủ thể khác không đọc được inbox. Gợi ý và dữ liệu phản hồi tuân thủ quyền, trạng thái và phiên bản hiện hành. |
| UC22, UC26–30 | Thử báo cáo trùng, đạt ngưỡng báo cáo hợp lệ, duyệt cùng lúc, truy cập bằng scope sai, đổi credential khiếu nại và xét lại. | Áp dụng ngưỡng và phạm vi báo cáo theo hợp đồng. Scope giới hạn chỉ dùng được cho khiếu nại liên quan. Quyết định, biện pháp và audit có kết quả nhất quán. |
| Các UC có xử lý nền | Mô phỏng rollback, giao việc lặp, lỗi tạm thời và kết quả đến muộn. | Thay đổi và outbox cùng commit hoặc rollback. Xử lý lặp giữ nhất quán kết quả. Việc đến muộn kiểm lại trạng thái và revision trước khi ghi. |

## UC01

| Kịch bản | Kết quả mong đợi |
| --- | --- |
| Gửi đăng ký hợp lệ, rồi gửi lại với email cho cùng kết quả chuẩn hóa. Lặp lại với hai yêu cầu đồng thời. | Core chỉ tạo một tài khoản chưa xác thực và một việc gửi thư ban đầu. Cả hai yêu cầu trả biên nhận `202` với `status: received`. |
| Dùng đồng hồ điều khiển và ba liên kết riêng để xác thực ngay trước, đúng tại và sau mốc hết hạn 15 phút. | Token còn hạn trả `204` và kích hoạt tài khoản. Token hết hạn trả `410`, giữ tài khoản chưa xác thực và khách có thể yêu cầu gửi lại. Token đã dùng không kích hoạt lần nữa. |
| Sau đăng ký, gửi bốn yêu cầu gửi lại cho cùng email đã chuẩn hóa trong 15 phút. | Ba yêu cầu đầu trả `202`. Yêu cầu thứ tư trả `429` kèm `Retry-After` và không xếp việc gửi thư mới. |
| Giả lập lỗi gửi thư liên tiếp ở Worker. | Worker thử lại tối đa ba lần sau lần đầu rồi ghi thất bại. Các lần thử lại không trừ lượt gửi lại của khách. Biên nhận vẫn là `received` và tài khoản vẫn chưa xác thực. |
| Thử đăng nhập bằng mật khẩu đúng trước và sau khi xác thực email. | Trước khi xác thực, Core không cấp phiên và thao tác yêu cầu đăng nhập bị từ chối. Sau khi xác thực, Core có thể cấp phiên nếu đáp ứng các điều kiện của UC02. |

## Smoke test mock

Chạy mock trước, rồi thực hiện các lệnh sau. Kết quả lần lượt là `200`, `200`, `401` và `404`.

```sh
base=http://127.0.0.1:4010/api/v1
curl -i "$base/posts?limit=20"
curl -i "$base/me/profile" -H 'Authorization: Bearer demo-core-session'
curl -i "$base/me/profile"
curl -i "$base/posts/item-123" -H 'Prefer: code=404'
```
