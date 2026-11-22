# Duy trì suite qua sprint

| Đầu vào đổi | Thao tác |
| --- | --- |
| Catalog, kiến trúc, dữ liệu | So ID và CWE, đọc nội dung từng chunk, cập nhật nghĩa vụ theo bề mặt. Giữ các ID ca đang bảo vệ cùng hành vi. |
| SCN hoặc contract | Đối chiếu điều khoản, operation và phiên bản. Thêm ca cho hành vi mới. Cập nhật kỳ vọng cũ khi điều khoản sở hữu thay đổi và lưu căn cứ. |
| Sửa lỗi có kỳ vọng rõ | Dùng fixture tổng hợp tái hiện sai lệch ở tầng được chỉ định. Giữ ca hồi quy khi thêm sprint hoặc đổi cách triển khai. |
| Cùng đầu vào | Chạy validate và suite với manifest đã lưu. So digest và diff để kiểm ca hồi quy còn nguyên. |

Mỗi hàng phân loại một chunk trên một bề mặt, có lý do và phép kiểm hoặc bằng chứng còn thiếu. Tạo thêm hàng nếu chunk áp dụng ở nhiều tầng. Giữ đối chứng hợp lệ cho kiểm tra quyền. Với dữ liệu phân trang, khai báo trước tập ID, thứ tự và trường từ fixture. Dùng mã nguồn để định vị lượt đọc và điều tra kết quả, dùng SCN và hợp đồng để xác định đúng/sai.

## Operation và trạng thái phiên

- Đọc method, path, operationId và security hiệu lực từ OpenAPI, gồm khai báo ghi đè của operation. Ghi quyết định phạm vi và lý do loại trừ trong `manifest.json`. Giữ readiness riêng và đồng bộ context trong `zap.yaml` với đường dẫn qua gateway. So theo operation kể cả khi hai method dùng cùng path.
- Từ SCN, chọn trạng thái fixture áp dụng cho mỗi operation. Khai báo từng bước cùng trạng thái, nguồn và status dự kiến. Lấy kỳ vọng riêng cho success, lỗi tham số và lỗi phiên, gồm mã lỗi, schema và header theo contract. Với UC-01/02, thu hồi lặp khi bản ghi còn giữ trả `204`, phiên thiếu hoặc hết hạn khi thu hồi trả `401`. Giữ phép kiểm phiên thứ hai và cursor. Khi thiếu điều khiển thời gian giao dịch, ghi các ô mốc thời gian vào `unobservedCells` cùng lý do.
- Đối soát HAR theo nguồn, method, path và status sau khi ZAP xử lý tín hiệu tự kiểm thụ động. Với bộ trùng, ghi số nhận trên số đã gửi. Khi mất một bản ghi trong bộ, các bước của bộ thiếu đối soát. Cảnh báo liên kết rule, operation, nguồn và nhóm bản ghi. Quy nguyên nhân cho một bước hoặc người dùng cần bằng chứng định danh riêng.
- Khi đổi runner, chạy kiểm với export giả lập thiếu một trao đổi, status sai và mã lỗi sai để xác nhận gate báo MISSING hoặc FAIL tương ứng. Đối chiếu số ô đủ bằng chứng trên tổng ô áp dụng theo từng nguồn. Chỉ cập nhật nghĩa vụ catalog khi có oracle tương ứng.

## Hành trình qua trình duyệt

- Chọn bước từ SCN có tương tác UI và phản hồi Core cần chứng minh. Khai báo bước, operation, trạng thái, status và SCN. Đối chiếu hiển thị với dữ liệu tổng hợp có dấu hiệu riêng mỗi lượt và xác minh cùng phiên ở phản hồi đọc. Với UC-01/02, đi từ đăng nhập tới Hồ sơ, Mục của tôi, cuộn sang trang tiếp và xác nhận đăng xuất.
- Dùng build web fixture và API client của app trên cùng origin gateway. Kiểm readiness qua HTTPS; trình duyệt tin CA trong profile tạm. Phát hành danh tính tổng hợp từ tiến trình kiểm thử. Browser chỉ nhận ID token ngắn hạn trong bộ nhớ. Giữ khóa ký trong fixture phía runner.
- Chờ phản hồi trong bước đã phát sinh bằng tương tác UI. Đóng context để hoàn tất HAR, đối chiếu với phản hồi của từng bước và gửi qua cùng AF plan trong lượt phân tích riêng theo nguồn. Chỉ dùng origin fixture. Báo cáo giữ method, path chuẩn hóa, status, nguồn và tham chiếu nhóm. HAR, query, credential và nội dung phản hồi ở vùng tạm riêng và được dọn sau chạy.
- Chạy hành trình preview làm đối chứng và kiểm gate với một bước UI bị bỏ. Thiếu bằng chứng UI giữ trạng thái MISSING kể cả khi runner đã quan sát cùng operation. Nghĩa vụ kho phiên native, cache ảnh thiết bị và gateway triển khai cần phép kiểm trên tầng tương ứng.

## Điều tra và bàn giao

Runner kiểm tài liệu đầu vào, ID, liên kết và hợp đồng, chạy ca đã đăng ký, đối soát HTTP với ZAP, lọc quan sát, tổng hợp rồi trả mã thoát. PASS chỉ đại diện phạm vi của hàng đã mô tả. Một chunk có hàng MISSING hoặc REVIEW giữ trạng thái chưa hoàn tất. Mỗi FAIL được ghi kèm ca/assertion, phạm vi thiếu và đúng revision. Dùng REVIEW khi cảnh báo thụ động cần đối chiếu và MISSING khi chưa quan sát được bằng chứng. Ghi căn cứ cụ thể cho N/A.

Khi điều tra, đối chiếu caseId, request/status đã lọc, fixture và vị trí sở hữu hành vi. Với lỗi đã xác nhận, bổ sung nguyên nhân và permalink file/dòng ở SHA quan sát. Với câu hỏi nghiệp vụ, ghi điều khoản đang xung đột hoặc thiếu, hành vi quan sát và quyết định cần người sở hữu UC chốt.
