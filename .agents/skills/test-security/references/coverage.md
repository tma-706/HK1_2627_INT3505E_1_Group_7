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

## Chọn assertion và đối chứng

- **Cấp lại phiên.** Với SCN-AUTH-09, `UC01-SESSION-REPLAY` giữ nguyên token gốc, thiết bị và `attemptId` cho `initial` và `repeat`. `same-attempt-session` so bằng nhau giữa hai mã. Đối chứng `independent-session` đổi duy nhất `attemptId` và phải phân biệt phiên. `validated-replay-account` so tài khoản của phiên lặp với A. Ghi boolean và nhãn bước. Để mở phép đo số bản ghi, thời điểm tạo/hoạt động, hash lưu trữ và gửi đồng thời.
- **Đọc cá nhân.** Với SCN-PRF-07/09, `cursor-same-tab-records` so toàn bộ hàng trang sau với `expectedPages`, theo ID, thứ tự và trường. Đối chứng thành công cùng cursor và quyền đọc của A/B giải thích hai nhánh `INVALID_CURSOR`. Bản sao đúng HTTP 200 với một ID sai phải cho FAIL. Khi thiếu assertion đã khai báo hoặc thiếu bằng chứng của bước đối chứng, ca giữ MISSING.
- **Firefox.** Cùng lượt fixture, so tài khoản ở phản hồi cấp phiên, Bearer ở các bước sau, hồ sơ đánh dấu theo lượt, hai trang Lost, phản hồi thu hồi rỗng và màn hình sau đăng xuất. Preview tái hiện thao tác với dữ liệu mẫu và có 0 request Core. Một lần mất GET trong nhóm hai trang làm số nhận thành 1/2 và bằng chứng UI thiếu. Ghi phạm vi bố cục bản web đang kiểm theo UC và quyết định hiện hành.
- **Đúng biên hết hạn.** Dùng phiên độc lập cho ngay trước và đúng mốc, với hạn kia còn hiệu lực. Oracle trước mốc theo operation. Tại mốc cần 401, `SESSION_INVALID` và Bearer challenge. Chỉ điền tám ô nếu cố định được thời điểm PostgreSQL dùng trong quyết định. `ageSession` chỉnh tuổi phiên cho ca đã quá hạn. Ghi thiếu điều khiển `clock_timestamp()` vào `unobservedCells`.
- **Rule 10015.** Từ source và operation, mở nhóm HTTP 200 rồi đối chiếu `AuthNoStore` trong OpenAPI với assertion `<operation>-no-store` của runner hoặc `<step>-no-store` của Firefox. Lưu add-on/version và đối chiếu digest của từng nguồn review. Khi add-on hoặc nguồn đổi, phân loại lại. Giữ REVIEW của cảnh báo, FAIL của oracle khi có sai lệch và MISSING của cache thiết bị. Rule 10010 trên mẫu self-check chỉ dùng để xác nhận passive đã xử lý cho nguồn đó.

Manifest v4 lưu `oracle.question`, `oracle.limits`, `oracle.assertions` và `oracle.controls`. Mỗi assertion có `id` và có thể gắn `step`. Mỗi đối chứng trỏ `caseId` và `assertion` đã khai báo, cùng danh sách assertion đích trong `supports`. Đặt nhãn status bắt buộc ở mỗi bước HTTP. Kiểm quyết định phạm vi trên bản sao OpenAPI khi thêm operation. Giữ phiên bản manifest cũ để đọc bằng chứng baseline và so theo phạm vi tương đương.

## Reconciliation và gate

Hành vi nghiệp vụ tạo từ runner và thao tác Firefox. ZAP dùng AF import HAR với `sendRequests: false`, `--network none`, chờ passive rồi export. Mỗi nguồn có số nhận/số cần và self-check riêng. Khi AF chưa chạy, kiểm trường phương pháp quan sát và bước lỗi trong artifact. Authenticated active DAST là hạng mục mở. Khi có giao việc riêng, bằng chứng đánh giá gồm revision/môi trường, operation đã duyệt, trao đổi do scanner thực sự tạo trong phiên, mức hoàn tất, triage và giới hạn.

Tự kiểm reporter bằng dữ liệu sao chép trong thư mục tạm. Kiểm đường đạt, mất assertion, sai payload với status đúng, sai nguồn, thiếu nhóm lặp, thiếu sentinel, lỗi launch, lỗi cleanup, cảnh báo đồng thời với FAIL và lọc chuỗi đánh dấu. Giữ hai artifact lọc của lượt thật nguyên trạng để so sánh.
