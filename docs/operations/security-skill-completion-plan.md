# Hoàn thiện test-security sau lượt nghiệm thu manifest v4

## Điểm xuất phát đã kiểm

Hai artifact local của Sol (run-1, run-2) trên cùng cây có thay đổi, HEAD `03f892dc73448288d0ed55544d5d4f4029ba1a56`, fingerprint `fe4e40a9bef2d52abf3d3e9558eae47ab00d650ada77a6e3e22e96cd062fa534`, đều ghi gate PASS, 14 ca đạt, ZAP nhận 52 trao đổi runner và 5 Firefox, self-check hai nguồn đạt, fixture đã dọn. Lượt invalid-port cùng fingerprint có gate đỏ, một ca đạt, ZAP nhận 0. Runner đủ 23/31 ô, Firefox 4/4. Catalog 4 PASS, 0 FAIL, 1 REVIEW, 32 MISSING, 13 N/A. Kết luận áp dụng cho cây local ở thời điểm đó. Checkout hiện chứa sửa đổi v4 chưa commit. Việc thêm chính tệp kế hoạch này cũng làm đổi fingerprint do run.mjs tính cả file untracked. Không ép lượt mới khớp fingerprint cũ.

Đích vòng này là chứng minh skill áp dụng được cho UC tiếp theo, tái sử dụng đúng bằng chứng từ tầng Core/DB và phân biệt kết luận từng điều khoản ngay trong artifact. Các chức năng đã nghiệm thu ở [kế hoạch v4](security-test-design-plan.md) là bộ hồi quy. Giữ chi phí mặc định ở một lượt ZAP cho mỗi nguồn có lưu lượng. Không dùng số request hay số chunk đổi sang PASS làm chỉ tiêu hoàn thành.

## 1. Xác lập revision tái lập được

- Tại checkout có v4, ghi nhánh, HEAD, diff, tệp untracked và phiên bản môi trường. So manifest version, danh sách ca, trường oracle và kết quả trong dist/security với mốc trên. Nếu là clone chỉ chứa HEAD cũ, lấy bản thay đổi v4 do người dùng bàn giao trước khi triển khai phụ thuộc vào nó.
- Phân biệt kết quả local với kết quả trên commit. Khi có revision chứa v4, chạy validate và suite từ cây sạch, lưu SHA, fingerprint, mã thoát, cleanup và checksum hai artifact. Khi chỉ có cây local, tiếp tục phần kỹ thuật với fingerprint mới và ghi “chưa nghiệm thu revision tích hợp”. CI cũ của 03f892d chứng minh suite 13 ca. Mọi kết luận CI của v4 hoặc vòng này phải dẫn run/attempt thực sự test revision tương ứng.
- Giữ bản trước khi chạy lại vì dist/security được ghi đè. Chỉ lưu hai artifact đã lọc theo lượt ở vùng tạm hoặc kho artifact của CI. Kiểm nguồn, gate và cleanup trước khi dùng một bản để so delta.

## 2. Chứng minh thêm được UC thứ ba

**Bằng chứng thiếu hiện tại.** model.mjs đọc SCN từ hai khóa uc01/uc02, whitelist UC-01/02 và suy chủ sở hữu từ tiền tố SCN-AUTH. report.mjs có tiêu đề cố định UC-01/02 và ví dụ hồ sơ dùng assertion viết riêng. Kiểm thêm operation trong cùng contract đã có chưa chứng minh được thao tác thêm UC.

1. Khai báo trong manifest ánh xạ UC ID tới input spec có version/digest, dùng nó cho cả tra SCN và nhãn phạm vi. Giữ một nguồn sở hữu cho mỗi liên kết. Báo lỗi có ID cụ thể khi UC trùng, SCN thuộc sai spec, input thiếu hoặc operation bị bỏ qua. Giữ các quy tắc phiên và dữ liệu đặc thù ở ca của UC sở hữu.
2. Di chuyển lựa chọn ví dụ minh họa của summary sang tham chiếu ca/assertion/operation đã khai báo. Khi không có ví dụ, bảng coverage và kết luận chung vẫn phải render. Giữ tương thích đọc artifact v3/v4 khi so baseline.
3. Dùng fixture model **chỉ cho test** với một UC tổng hợp mới có tiền tố SCN khác AUTH/PRF, một operation đọc và một nghĩa vụ. Qua cùng đường load/validate/render dùng cho suite. Chỉ thêm registration và dữ liệu test. Đối chứng lần lượt bỏ mapping operation, trỏ SCN sang UC khác và bỏ oracle. Cả ba biến thể phải báo lỗi xác định đúng trường. Không thêm yêu cầu giả vào SRS/OpenAPI sản phẩm.
4. Nghiệm thu bằng diff chứng minh việc đăng ký UC trong ví dụ không đòi sửa model/reporter lần thứ hai. Scope summary lấy đúng UC; việc chỉ thêm mô tả thiết kế chưa tạo PASS runtime cho UC tổng hợp. Chạy lại toàn bộ tự kiểm v4 và xác nhận các ca UC-01/02 còn nguyên.

## 3. Đưa bằng chứng SCN-AUTH-09 đã có vào đúng báo cáo

**Điểm Sol để mở có thể thu hẹp ngay.** UC01-SESSION-REPLAY kiểm gửi lại tuần tự qua HTTPS. Trong tests/integration/core-identity.test.mjs, ca “commits once per attempt, deduplicates the account and keeps device sessions independent” gửi đồng thời hai request cùng lượt và một lượt thiết bị khác. Ca so nội dung phản hồi, đếm một tài khoản/hai phiên trong fixture và so created_at, last_activity_at trước/sau lần trả lại. Đây là nguồn oracle Core/DB đã có. Sự hiện diện của mã test mới cho biết có phép đo để chạy.

1. Tra entrypoint thực của bài integration, điều kiện Postgres và trạng thái skip. Thu kết quả đúng **tên ca**, trạng thái chạy, revision/digest code test và fixture. Ưu tiên xuất record đã lọc từ lần chạy sẵn của job Core. Với local, cho phép chạy entrypoint đó và chuyển record qua cùng giao diện. Chỉ thêm adapter cho bài hiện có. Giữ fixture integration độc lập với dữ liệu HTTPS của suite.
2. Trong manifest, nối các điều khoản “cùng lượt cùng kết quả”, “hai lượt độc lập”, “số tài khoản/phiên”, “không đổi mốc khi trả lại” tới oracle tương ứng. Dùng nguồn core-integration cho quan sát DB. Giữ 57/57 làm mốc lưu lượng passive trước thay đổi. Khi import kết quả ngoài tiến trình, kiểm revision, fingerprint khi cây bẩn, phiên bản fixture, ID ca và trạng thái chạy. Chỉ chấp nhận artifact từ lượt thực thi đã xác định, chỉ đưa cờ so sánh/số đếm an toàn vào hai báo cáo.
3. Đối chứng bắt buộc: record cùng build và đạt, record bị skip, thiếu record, sai revision, oracle đếm phiên thất bại. Bốn trường hợp sau lần lượt phải để MISSING, MISSING, MISSING với lý do sai build, và FAIL có assertion. Tách lỗi vận chuyển artifact khỏi lỗi hành vi. Nếu chọn điều khoản làm gate bắt buộc, xác định dependency đó trong cả local và CI rồi mới bật gate.
4. Khi đóng mục mở, ghi chính xác fixture hiện so tổng số phiên trong tập cô lập hay đếm trực tiếp theo attempt. Không suy rộng sang mọi thứ tự xen kẽ giao dịch, mọi trường hợp mất phản hồi hoặc đúng biên hết hạn. Bàn giao ví dụ từ summary đến điều khoản và record của cùng build.

## 4. Tách kết luận theo điều khoản của một SCN

- Pilot là SCN-PRF-03. Spec yêu cầu một lần chạm Hồ sơ mở cả hai vùng và không có nút Mục của tôi. web.mjs hiện click thêm nút. Manifest v4 đã ghi giới hạn trong oracle.limits. Bổ sung kết quả có cấu trúc cho từng điều khoản để bộ đọc JSON và người ký có cùng thông tin. Liên kết bằng case, step, assertion và tầng.
- Giữ phép đo quyền đọc và phân trang hiện tại. Thêm phép quan sát UI độc lập trên Firefox tại thời điểm ngay sau lần chạm Hồ sơ: vùng danh sách hiện, request trang đầu đã phát và có/không có nút trung gian. Nếu kiểm cả yêu cầu tải song song, dùng phản hồi hồ sơ trì hoãn có kiểm soát và xác nhận danh sách bắt đầu trong lúc đó. Đánh dấu rõ bước có điều phối mạng, tách khỏi số đo thời gian thật. Điều khoản nào chưa đo được ghi MISSING.
- Khi quan sát thực tế trái yêu cầu, ghi FAIL ở điều khoản bố cục với bằng chứng của đúng build. Hiển thị ở kết luận UC/UI, quy định phạm vi gate bảo mật và gate sản phẩm riêng. Giữ FAIL hiển thị ngay cả khi gate bảo mật đạt. Giao sửa UI cho backlog sản phẩm nếu chưa có yêu cầu sửa app. Đối chứng reporter phải thể hiện cùng lúc quyền đọc PASS và một lần chạm FAIL; bỏ quan sát bố cục phải đổi điều khoản đó thành MISSING.
- Áp dụng cùng quy tắc cho SCN-AUTH-14. Giữ tám ô đúng biên ở MISSING tới khi phép đo kiểm soát được chính instant Core/DB dùng ra quyết định. Tạo timestamp trước request rồi chờ HTTP không chứng minh được dấu bằng. Tách kết quả đã quá hạn, đúng mốc và ngay trước mốc. Nếu đề xuất thay nguồn clock của Core, lập quyết định kỹ thuật độc lập trước khi thay hành vi dùng chung.

## 5. Sổ việc còn mở và tiêu chí đóng

Dùng nguồn đã có trong manifest, coverage và review. Bổ sung chỗ thiếu để mỗi mục có điều khoản, tầng, lý do mở, bằng chứng tối thiểu, bên cung cấp, điều kiện chạy lại và ảnh hưởng tới gate. Một mục có thể vượt phạm vi sprint; điều này phải đọc được ở đầu báo cáo.

| Hạng mục | Điều kiện đủ để đổi kết luận |
| --- | --- |
| Authenticated active DAST | Đánh giá riêng có phạm vi đã định, revision và môi trường, bằng chứng scanner phát trao đổi trong phiên còn hiệu lực, độ phủ, kết quả phân loại và giới hạn. Trong vòng này chỉ ghi nhận kết quả đánh giá độc lập nếu có. Lượt AF import HAR vẫn mang nhãn passive. |
| Cache native, kho phiên OS | Kết quả trên từng nền tảng liên quan, bản build và tình huống vòng đời phù hợp; phép đo trên Firefox hoặc header no-store chỉ thuộc tầng đã quan sát. |
| Gateway triển khai, REVIEW 10015 | Tách điều khoản cache của Core khỏi chính sách gateway và lưu ảnh thiết bị. Đối chiếu chính sách đã duyệt, bằng chứng đúng môi trường và phiên bản rule. |
| Câu hỏi nghiệp vụ | Giữ nguồn và locator đang có trong openQuestions, ví dụ GAP-AUTH-006 về hạn mức hoặc GAP-PRF-004 về thumbnail. Chỉ cập nhật kỳ vọng khi nguồn sở hữu đã quyết định. |

## Thứ tự chạy và điều kiện ký

1. Chạy validate/test hẹp sau mỗi phần. Chạy bài integration đã chọn và đối chứng import ở bước 3. Chạy Firefox cho bước 4. Xác minh test bỏ dữ liệu, dùng record cũ và bỏ oracle đều báo đúng nguyên nhân.
2. Theo hướng dẫn môi trường của repo, dùng Node 22, Docker Compose, OpenSSL và NSS certutil. Từ root chạy npm ci, npm run mobile:setup, npm run security:web:setup, npm run security:validate, npm run security:test. Đo hai lượt cuối cùng cùng đầu vào, bảo toàn cả hai cặp báo cáo. Giữ nguyên tự kiểm passive, allowlist lọc dữ liệu và cleanup. Khi artifact ngoài tiến trình lỗi, vẫn kết xuất báo cáo phần đã chạy.
3. Bàn giao bảng trước/sau cho từng nguồn và điều khoản. Với số ô, luôn ghi cả tử và mẫu; với chunk, giải thích từng chuyển trạng thái. Giữ ZAP, DB integration, Firefox và test reporter ở đúng tầng. So thời lượng với 71,58–73,96 giây local của Sol như số tham khảo. Hai lượt là số liệu kiểm tính lặp, chưa đủ để cam kết tốc độ CI.
4. Ký hoàn thiện vòng này khi phép thêm UC mới qua validator/reporter đạt, bằng chứng DB cùng build truy được đến điều khoản, sai lệch/mất bằng chứng UI có trạng thái riêng và tất cả hồi quy bắt buộc đạt. Báo riêng kết luận hành vi sản phẩm kể cả FAIL đã xác nhận. Chỉ ghi đã nghiệm thu CI khi có artifact đúng revision. Các việc phụ thuộc thiết bị, môi trường hoặc quyết định nghiệp vụ vẫn có điều kiện đóng cụ thể.
