# Campus Lost & Found

Campus Lost & Found giúp người mất đồ và người nhặt được đồ trong khuôn viên trường tìm thấy nhau, xác minh và trao trả đồ thuận tiện hơn.

## Bài toán và giá trị

Thông tin đồ thất lạc thường nằm rải rác ở nhiều nơi, khiến người mất khó tìm lại đồ và người nhặt khó tìm đúng chủ. Khi hai bên tìm thấy nhau, họ cũng cần một cách xác minh trước khi trao trả.

Dự án tập trung thông tin mất và nhặt được đồ vào một nơi, hỗ trợ hai bên tìm kiếm, xác minh và liên hệ để hoàn tất việc trao trả.

## Người dùng

- **Người mất đồ:** đăng thông tin đồ bị mất, tìm bài đăng liên quan và xác nhận quyền sở hữu.
- **Người nhặt được đồ:** đăng thông tin đồ nhặt được, tìm người mất và xem xét yêu cầu nhận lại đồ.
- **Quản trị viên:** xử lý báo cáo và hỗ trợ duy trì môi trường sử dụng an toàn.

Một người dùng có thể là người mất hoặc người nhặt tùy từng trường hợp. Khách chưa đăng nhập có thể xem và tìm kiếm bài công khai.

## Phạm vi MVP đề xuất

MVP tập trung hoàn thành hành trình từ đăng thông tin đến trao trả:

- Đăng ký, đăng nhập và quản lý bài đăng cá nhân.
- Đăng bài mất đồ hoặc nhặt được đồ; xem, tìm kiếm và lọc bài đăng.
- Gửi và xem xét yêu cầu nhận lại đồ hoặc phản hồi cho bài mất đồ.
- Xác minh qua câu hỏi trên bài nhặt được đồ; liên hệ sau khi yêu cầu hoặc phản hồi được chấp nhận.
- Xác nhận trao trả và nhận thông báo về các cập nhật liên quan.
- Bảo vệ thông tin nhạy cảm trong bài đăng và báo cáo nội dung cần xem xét.

### Ngoài trọng tâm MVP

Các chức năng sau hỗ trợ mở rộng sản phẩm nhưng không phải điều kiện cốt lõi để hai bên tìm và trao trả đồ: gợi ý đối sánh bằng AI, gợi ý câu hỏi xác minh bằng AI, chia sẻ bài đăng, quản trị danh mục nâng cao và quy trình khiếu nại quyết định kiểm duyệt. Phạm vi triển khai cụ thể sẽ được thống nhất theo từng giai đoạn.

## Nghiệp vụ chính

### 1. Đăng thông tin mất hoặc nhặt được đồ

Người dùng đăng nhập, chọn loại bài và cung cấp thông tin giúp nhận diện đồ vật, thời gian, khu vực cùng ảnh liên quan. Với bài nhặt được đồ, người đăng đặt câu hỏi xác minh để hỗ trợ nhận diện chủ sở hữu. Bài được công khai sau khi hoàn tất thông tin cần thiết.

### 2. Tìm bài đăng liên quan

Người dùng hoặc khách xem bảng tin, tìm kiếm và lọc theo thông tin phù hợp. Từ bài chi tiết, người mất có thể tìm bài nhặt được đồ; người nhặt có thể tìm bài mất đồ tương ứng.

### 3. Yêu cầu nhận lại đồ

Người cho rằng mình là chủ đồ trả lời câu hỏi xác minh trên bài nhặt được đồ và gửi yêu cầu. Người đăng xem câu trả lời, sau đó chấp nhận hoặc từ chối. Khi được chấp nhận, hai bên có thể liên hệ để sắp xếp trao trả.

### 4. Phản hồi bài mất đồ

Người nhặt được đồ gửi phản hồi cho bài mất đồ phù hợp. Người đăng xem xét và chấp nhận hoặc từ chối phản hồi. Khi được chấp nhận, hai bên có thể liên hệ để sắp xếp trao trả.

### 5. Xác nhận trao trả

Sau khi thống nhất và trao trả đồ, một bên khởi tạo xác nhận; bên còn lại xác nhận để ghi nhận việc trao trả hoàn tất.

Chi tiết quy tắc và các trường hợp ngoại lệ được phân tích trong tài liệu nghiệp vụ và hợp đồng API theo từng giai đoạn. Tài liệu API hiện có tại [docs/api/core/v1-notes.md](docs/api/core/v1-notes.md).
