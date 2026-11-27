# Hướng dẫn thiết kế UI Lost & Found

**Phiên bản 0.1 · Chờ duyệt**

Dùng hướng dẫn này khi thiết kế màn và trạng thái giao diện do Lost & Found sở hữu. Các mẫu bên dưới áp dụng cho hành vi có căn cứ trong UC và hợp đồng API. Dùng cùng phiên bản hướng dẫn cho các màn và trạng thái dùng chung giữa nhiều UC.

## Bố cục và kiểu chữ

- Với mobile, dùng bố cục một cột, căn đầu dòng và chừa lề ngang 16. Đặt tiêu đề và điểm quay lại ở đầu màn nếu có đích quay lại. Tôn trọng vùng an toàn và cho phép cuộn khi nội dung dài, chữ được phóng to hoặc bàn phím mở.
- Dùng hệ khoảng cách 4, 8, 12, 16, 24 và 32. Đặt khoảng cách 16 giữa các trường và 24 giữa các nhóm. Bo góc 8 cho trường nhập và nút, 12 cho thẻ. Vùng chạm tối thiểu 48 × 48. Các số là đơn vị logic của nền tảng, ví dụ `dp` trên Android hoặc `pt` trên iOS.
- Dùng phông hệ thống hỗ trợ dấu tiếng Việt. Kích thước chữ và chiều cao dòng mặc định là 24/32 cho tiêu đề màn, 18/26 cho tiêu đề nhóm, 16/24 cho nội dung, trường nhập và nút, 14/20 cho lời nhắc và lỗi. Cho phép xuống dòng với nhãn hoặc thông báo dài.

## Màu theo vai trò

- Nền màn `#F8FAFC`, bề mặt `#FFFFFF`, chữ chính `#0F172A`, chữ phụ `#475569`.
- Nút chính và viền lấy nét `#0F766E`. Dùng chữ `#FFFFFF` trên nút chính. Dùng `#64748B` cho viền cần thấy rõ của trường nhập. Với nút tắt, dùng nền `#E2E8F0` và chữ `#475569`.
- Lỗi dùng chữ `#B91C1C` trên nền `#FEF2F2`, cảnh báo dùng `#92400E` trên `#FFFBEB`, thành công dùng `#166534` trên `#F0FDF4`. Đi kèm nhãn hoặc thông báo bằng chữ để diễn đạt trạng thái.

## Thành phần và trạng thái

- **Thao tác.** Mỗi màn ưu tiên một nút chính cho thao tác tiếp theo. Dùng nút phụ hoặc liên kết có nhãn cho đường quay lại hay lựa chọn khác. Dùng động từ cụ thể, ví dụ “Đăng ký” hoặc “Gửi lại email”.
- **Biểu mẫu.** Đặt nhãn cố định phía trên trường. Ghi lỗi có thể sửa ngay dưới trường liên quan và chỉ cách sửa. Với lỗi ảnh hưởng cả biểu mẫu, đặt thông báo gần nhóm thao tác. Giữ dữ liệu người dùng có thể tiếp tục sửa theo ràng buộc của UC.
- **Đang xử lý.** Giữ bố cục và hiển thị chỉ báo cạnh thao tác đang chờ. Vô hiệu hóa thao tác lặp trong lúc chờ nếu luồng yêu cầu. Dùng thông báo riêng cho yêu cầu đã tiếp nhận khi kết quả cuối đến sau.
- **Kết quả và phục hồi.** Nêu kết quả đã xác nhận rồi chỉ bước tiếp theo nếu có. Khi trạng thái hết hạn, bị giới hạn hoặc rỗng, giải thích ngắn gọn và hiển thị thao tác phục hồi được luồng cho phép. Khi API cung cấp thời điểm thử lại, dùng mốc đó cho lời nhắc hoặc trạng thái thao tác.
- **Nội dung.** Viết tiếng Việt ngắn, cụ thể và nhất quán với thuật ngữ trong UC. Chỉ hiển thị kết quả và dữ liệu mà người dùng được phép quan sát. Nếu API trả biên nhận chung, dùng cùng thông báo cho các kết quả nội bộ tương ứng. Dùng dữ liệu mẫu trong hình minh họa.

## Áp dụng và cập nhật

Ghi phiên bản đã dùng và những điểm thiết kế còn chờ duyệt trong tài liệu UI của UC. Khi đề xuất một thành phần hoặc mẫu trạng thái dùng lại được, mô tả nó trong bản UI đang soạn. Đưa mẫu vào hướng dẫn chung sau khi được xác nhận và tăng phiên bản hướng dẫn khi nội dung áp dụng thay đổi.
