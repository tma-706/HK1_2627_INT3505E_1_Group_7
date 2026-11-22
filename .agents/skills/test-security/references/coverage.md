# Duy trì suite qua sprint

| Đầu vào đổi | Thao tác |
| --- | --- |
| Catalog, kiến trúc, dữ liệu | So ID và CWE, đọc nội dung từng chunk, cập nhật nghĩa vụ theo bề mặt. Giữ các ID ca đang bảo vệ cùng hành vi. |
| SCN hoặc contract | Đối chiếu điều khoản, operation và phiên bản. Thêm ca cho hành vi mới. Cập nhật kỳ vọng cũ khi điều khoản sở hữu thay đổi và lưu căn cứ. |
| Sửa lỗi có kỳ vọng rõ | Dùng fixture tổng hợp tái hiện sai lệch ở tầng được chỉ định. Giữ ca hồi quy khi thêm sprint hoặc đổi cách triển khai. |
| Cùng đầu vào | Chạy validate và suite với manifest đã lưu. So digest và diff để kiểm ca hồi quy còn nguyên. |

Mỗi hàng phân loại một chunk trên một bề mặt, có lý do và phép kiểm hoặc bằng chứng còn thiếu. Tạo thêm hàng nếu chunk áp dụng ở nhiều tầng. Giữ đối chứng hợp lệ cho kiểm tra quyền. Với dữ liệu phân trang, khai báo trước tập ID, thứ tự và trường từ fixture. Dùng mã nguồn để định vị lượt đọc và điều tra kết quả, dùng SCN và hợp đồng để xác định đúng/sai.

Runner kiểm tài liệu đầu vào, ID, liên kết và hợp đồng, chạy ca đã đăng ký, đối soát HTTP với ZAP, lọc quan sát, tổng hợp rồi trả mã thoát. PASS chỉ đại diện phạm vi của hàng đã mô tả. Một chunk có hàng MISSING hoặc REVIEW giữ trạng thái chưa hoàn tất. Mỗi FAIL được ghi kèm ca/assertion, phạm vi thiếu và đúng revision. Dùng REVIEW khi cảnh báo thụ động cần đối chiếu và MISSING khi chưa quan sát được bằng chứng. Ghi căn cứ cụ thể cho N/A.

Khi điều tra, đối chiếu caseId, request/status đã lọc, fixture và vị trí sở hữu hành vi. Với lỗi đã xác nhận, bổ sung nguyên nhân và permalink file/dòng ở SHA quan sát. Với câu hỏi nghiệp vụ, ghi điều khoản đang xung đột hoặc thiếu, hành vi quan sát và quyết định cần người sở hữu UC chốt.
