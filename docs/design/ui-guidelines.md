# Hướng dẫn thiết kế UI Lost & Found

**Phiên bản 0.2 · Chờ duyệt**

Dùng hướng dẫn này khi thiết kế màn và trạng thái giao diện do Lost & Found sở hữu. Các mẫu bên dưới áp dụng cho hành vi có căn cứ trong UC và hợp đồng API. Dùng cùng phiên bản hướng dẫn cho các màn và trạng thái dùng chung giữa nhiều UC.

## Bố cục theo loại màn hình

Phong cách dựa trên hai mẫu thiết kế cũ của nhóm: chuỗi màn chào và đăng nhập, cùng chuỗi màn hồ sơ. Bộ minh họa UC-01 áp dụng phong cách này cho luồng đăng ký bằng email và mật khẩu. [Xem màn đăng ký](../use-cases/ui/uc-01/dang-ky.svg).

| Loại màn | Cách bố trí |
| --- | --- |
| Khởi động | Nền trắng, mảng tròn xanh nhạt ở rìa. Đặt kính lúp trắng trong ô xanh bo góc và tên Lost & Found ở giữa. Hiển thị chỉ báo tải gần đáy trong lúc khởi động. |
| Chào, đăng ký, đăng nhập | Đầu trang xanh dương với hai hình tròn trắng có độ mờ khoảng 8%, cắt theo mép. Căn giữa ô trắng chứa kính lúp xanh, tên Lost & Found và lời giới thiệu. Khối nội dung trắng bo hai góc trên 24, tiêu đề và biểu mẫu căn trái. Với bước xác thực ngắn, có thể thu gọn đầu trang. |
| Điều khoản và chính sách | Dùng đầu trang trắng gọn, thẻ tài khoản xanh nhạt và nội dung chia mục. Cho phép cuộn nội dung và đặt hành động đồng ý, từ chối ở cuối màn. |
| Hồ sơ và danh sách | Đặt tiêu đề và thao tác tài khoản ở hàng trên, tiếp theo là avatar tròn, thông tin cá nhân và các tab có số lượng. Tab đang chọn có chữ xanh và gạch chân. Mỗi hàng có ảnh thu nhỏ, tên vật phẩm, thông tin phụ và nhãn trạng thái. Thanh điều hướng dưới cùng dẫn đến các khu vực chính. |
| Lỗi danh sách và hộp thoại | Giữ tiêu đề và tab khi danh sách tải lỗi. Đặt biểu tượng, thông báo và nút thử lại ở giữa vùng danh sách. Hộp xác nhận dùng thẻ trắng bo góc trên lớp nền tối mờ, với nút hủy và nút ghi rõ hành động. |

Dùng bố cục mobile một cột. Trên khung minh họa 390 × 760, biểu mẫu có lề ngang 24, trường nhập và nút cao 48, bo góc 11. Hộp thông báo bo góc 12. Dùng hệ khoảng cách 4, 8, 12, 16, 24 và 32, vùng chạm tối thiểu 48 × 48. Các kích thước là đơn vị logic. Tôn trọng vùng an toàn, cho phép xuống dòng và cuộn khi bàn phím mở hoặc người dùng tăng cỡ chữ.

## Chữ và biểu tượng

Dùng **Inter**, dự phòng **Roboto**, **Segoe UI** rồi đến sans-serif hệ thống có đủ dấu tiếng Việt. Phông và các thông số dưới đây là lựa chọn tái hiện ảnh mẫu trong bộ minh họa UC-01. Ảnh gốc không ghi tên phông.

| Vai trò | Cỡ chữ | Độ đậm |
| --- | ---: | ---: |
| Tên thương hiệu | 26 | 700 |
| Tiêu đề màn | 23 | 700 |
| Nội dung, mô tả và thông báo | 15 | 400 |
| Nhãn trường hoặc liên kết phụ | 15 | 600 |
| Giá trị nhập | 16 | 400 |
| Nút chính | 16 | 700 |
| Lỗi dưới trường | 14 | 400 |

Dùng biểu tượng nét đơn, đầu nét tròn. Trên đầu trang xác thực, đặt kính lúp trong ô trắng 64 × 64 bo góc 17. Trong danh sách, dùng ảnh vật phẩm khi có ảnh và biểu tượng ảnh trên nền xanh nhạt khi thiếu ảnh. Kết hợp biểu tượng với nhãn trạng thái, chẳng hạn phong bì cho yêu cầu gửi email và dấu kiểm cho xác thực thành công.

## Màu theo vai trò

| Vai trò | Màu và cách dùng |
| --- | --- |
| Nhận diện và tương tác | Xanh dương `#1E4BDD` cho đầu trang, nút chính, liên kết, mục đang chọn và viền lấy nét. Dùng chữ trắng `#FFFFFF` trên nút xanh. |
| Bề mặt và đường viền | Trắng `#FFFFFF` cho biểu mẫu và thẻ. Nền danh sách có thể dùng `#F8FAFC`. Viền trường và thẻ dùng `#D8E3F2`. |
| Văn bản | Chữ chính `#10192C`, chữ phụ `#506279`, mô tả trên đầu trang xanh `#EAF2FF`. |
| Thông báo | Nền `#EEF5FF`, chữ `#294782`, biểu tượng xanh nhận diện. Dùng câu chữ và biểu tượng riêng cho tiếp nhận, thành công và cần thử lại. |
| Nút đang chờ hoặc bị khóa | Nền `#E5EDFA`, chữ `#2F4D82`. Khi có hạn gửi lại, hiển thị thời gian chờ từ phản hồi API. |
| Lỗi tại trường nhập | Viền `#D44B52`, chữ lỗi `#A72735`. Đặt hướng dẫn sửa ngay dưới trường. |

## Thành phần và trạng thái

- **Thao tác.** Mỗi màn ưu tiên một nút chính cho thao tác tiếp theo. Dùng nút phụ hoặc liên kết có nhãn cho đường quay lại hay lựa chọn khác. Dùng động từ cụ thể, ví dụ “Đăng ký” hoặc “Gửi lại email”.
- **Biểu mẫu.** Đặt nhãn cố định phía trên trường. Ghi lỗi có thể sửa ngay dưới trường liên quan và chỉ cách sửa. Với lỗi ảnh hưởng cả biểu mẫu, đặt thông báo gần nhóm thao tác. Giữ dữ liệu người dùng có thể tiếp tục sửa theo ràng buộc của UC.
- **Đang xử lý.** Giữ bố cục và hiển thị chỉ báo cạnh thao tác đang chờ. Vô hiệu hóa thao tác lặp trong lúc chờ nếu luồng yêu cầu. Dùng thông báo riêng cho yêu cầu đã tiếp nhận khi kết quả cuối đến sau.
- **Kết quả và phục hồi.** Nêu kết quả đã xác nhận rồi chỉ bước tiếp theo nếu có. Khi trạng thái hết hạn, bị giới hạn hoặc rỗng, giải thích ngắn gọn và hiển thị thao tác phục hồi được luồng cho phép. Khi API cung cấp thời điểm thử lại, dùng mốc đó cho lời nhắc hoặc trạng thái thao tác.
- **Nội dung.** Viết tiếng Việt ngắn, cụ thể và nhất quán với thuật ngữ trong UC. Chỉ hiển thị kết quả và dữ liệu mà người dùng được phép quan sát. Nếu API trả biên nhận chung, dùng cùng thông báo cho các kết quả nội bộ tương ứng. Dùng dữ liệu mẫu trong hình minh họa.

## Áp dụng và cập nhật

Ghi phiên bản đã dùng và những điểm thiết kế còn chờ duyệt trong tài liệu UI của UC. Khi đề xuất một thành phần hoặc mẫu trạng thái dùng lại được, mô tả nó trong bản UI đang soạn. Đưa mẫu vào hướng dẫn chung sau khi được xác nhận và tăng phiên bản hướng dẫn khi nội dung áp dụng thay đổi.
