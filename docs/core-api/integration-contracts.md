# Giao diện tích hợp Core API

Endpoint và schema HTTP ở [OpenAPI v1](../api/core/v1/openapi.yaml). Các giao diện dưới đây mô tả dữ liệu và hành vi Core cần để triển khai adapter và test double. Tên giao diện, định dạng message hoặc giao thức nội bộ cần được thống nhất khi triển khai từng tích hợp.

| Giao diện | Dữ liệu vào và kết quả Core cần | Lỗi và mô phỏng |
| --- | --- | --- |
| HTTP vào Core | Request theo `/api/v1`. Core lấy chủ thể và quyền từ credential phù hợp với operation. Phản hồi dùng schema của operation, với `Problem` cho lỗi được khai báo. | Kiểm Bearer thiếu/hết hiệu lực, scope thiếu, tài nguyên ngoài phạm vi, quota và `Retry-After` khi đặc tả yêu cầu. Mock HTTP và ví dụ có trong [hướng dẫn chạy](README.md). |
| Cấp quyền ghi và đọc object | Đích upload, chủ thể, mục đích và thông tin file. Core nhận grant có hạn và kiểm phiên bản đối tượng khi xác nhận. Quyền đọc gắn với quyền tài nguyên, mục đích và thời hạn. | Giả lập grant quá hạn, object thiếu, sai phiên bản và file không đạt kiểm tra. Cùng lần xác nhận hợp lệ chỉ chốt một nguồn và một tác vụ. |
| Phát việc bất đồng bộ và nhận kết quả | ID sự kiện, tài nguyên, phiên bản và dữ liệu tối thiểu cho việc cần chạy. Core cập nhật kết quả theo đúng trạng thái và phiên bản hiện hành. | Giả lập giao lặp, đến sai thứ tự, lỗi tạm thời và kết quả cũ. Việc phát lại giữ nguyên ID sự kiện. Kiểm giao dịch rollback không tạo sự kiện để phát. |
| Che dữ liệu và tạo bản xem trước | Tham chiếu nguồn, phiên bản và mục đích xử lý. Core nhận trạng thái, đề xuất vùng hoặc đoạn che, và tham chiếu bản dẫn xuất khi có. | Giả lập lỗi xử lý, đề xuất bỏ sót và kết quả cũ. Core kiểm điều kiện xuất bản và đúng revision. Kiểm luồng chỉnh thủ công trước khi công khai. |
| Đối sánh và gợi ý câu hỏi | Dữ liệu đã xử lý được phép dùng, kèm định danh và phiên bản. Core nhận danh sách đề xuất hoặc trạng thái không khả dụng. | Giả lập không có kết quả, phụ thuộc lỗi, bài đã ẩn/đóng và revision cũ. Core kiểm lại quyền và trạng thái trước khi trả gợi ý. |
| Gửi email và thông báo | ID việc, người nhận, mục đích hoặc loại sự kiện và dữ liệu tối thiểu cần gửi. Core giữ trạng thái inbox và quyền xem theo chủ thể. | Giả lập lỗi gửi tạm thời, giao lặp và kênh bị tắt. Phản hồi endpoint xin email xác thực/reset giữ cùng dạng biên nhận theo hợp đồng. |

Dùng fixture tổng hợp cho adapter và giữ thông tin truy cập môi trường trong cấu hình cục bộ. Xem [phạm vi](scope.md) để biết quyết định cần chốt về vị trí, realtime, thời hạn media và tùy chọn thông báo.
