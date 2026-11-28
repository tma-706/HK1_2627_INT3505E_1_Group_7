# Gói duyệt triển khai UC-01 0.2

**Lần chạy `uc-01-0.2` · Gói A–F bản 2 · Chờ duyệt**

## A · Phạm vi và quyết định cần duyệt

Triển khai đăng ký và xác thực email cho Campus Lost & Found, từ `SCN-UC01-01` đến `SCN-UC01-08`. Đích là worktree `implementation/core-api` ở `00a9b3d` cùng các bản sửa đặc tả đang có. Dùng UC 0.2, UI 0.4, hướng dẫn UI 0.2 và Core REST v1.0.0 dưới `/api/v1`. Bảng dưới đây ghi các hành vi được đề xuất để phê duyệt cùng gói. [UC-01](../../uc-01.md) · [UI UC-01](../../uc-01-ui.md) · [UI guidelines](../../../design/ui-guidelines.md) · [Core REST v1](../../../api/core/v1/openapi.yaml)

| Quyết định | Phương án đề xuất |
| --- | --- |
| Phương thức và chuẩn hóa email | Dùng email và mật khẩu cho UC-01. Bỏ khoảng trắng đầu/cuối email và chuyển chữ thường trước khi áp dụng quy tắc duy nhất hoặc quota. Giữ dấu chấm và phần `+` theo đúng địa chỉ khách nhập. Cùng một quy tắc được dùng tại các đường vào Identity. |
| Mật khẩu đăng ký | Cho phép 15–128 ký tự Unicode, gồm khoảng trắng, không áp mẫu bắt buộc về loại ký tự. Chuẩn hóa mật khẩu bằng NFC trước khi băm và đối chiếu. Tách schema cho đăng ký để công bố giới hạn và giữ schema đăng nhập hiện có. Đây là quyết định thay đổi đầu vào `registerAccount` cần được duyệt. |
| Token và gửi lại | Theo yêu cầu của người dùng, token xác thực email có hiệu lực **15 phút kể từ lúc Core cấp**. Trả `410` chung cho token đã biết nhưng hết hạn hoặc đã dùng, `400` cho token không hợp lệ hoặc không nhận diện được. Mỗi yêu cầu gửi lại đủ điều kiện cấp token mới với thời hạn riêng. Lượt Worker thử lại giữ nguyên token và thời điểm hết hạn. Token còn hạn chỉ có tác dụng khi tài khoản chưa xác thực. Lượt kích hoạt đầu tiên vô hiệu hóa tác dụng của các token xác thực còn lại. Quota gửi lại là cửa sổ trượt 15 phút. |
| Tích hợp hạ tầng | Lấy nền Core, Mobile, PostgreSQL và gateway cần cho UC-01 từ `origin/implementation/infrastructure` tại `4c358225`, có lát cắt feed thật để kiểm hồi quy. Giữ nhánh hiện tại và các sửa đổi tài liệu đang có. Mở rộng bằng module Identity, tiến trình Worker và migration tương thích với thứ tự hiện có. |
| Email và điểm mở liên kết | Nghiệm thu bằng hộp thư thử nghiệm trong stack local với dữ liệu tổng hợp. Dùng URL thử nghiệm cấu hình được, kiểm liên kết mở ứng dụng, và truyền token trong body đến Core. Việc bật gửi thư thật, tên miền App Links và trang đích khi chưa cài ứng dụng cần nhóm Mobile/Hạ tầng xác nhận trước nghiệm thu môi trường đó. |
| Ranh giới UC02 | Triển khai quy tắc Core chỉ cho tài khoản đã xác thực đi tiếp tới cấp phiên. Sau `204`, Mobile bàn giao sang điểm vào UC02. Nếu chưa có dịch vụ UC02 thật, chứng minh điều kiện tại lớp Identity và ghi phần đăng nhập/cấp phiên/truy cập sau đó của `SCN-UC01-06` đang chờ tích hợp. UC02 quyết định thời hạn, thu hồi phiên, lockout và cấp phiên. |

Các tài liệu nguồn đang ghi thời hạn xác thực email 24 giờ. Gói bản 2 ghi nhận quyết định dùng 15 phút và đưa việc đồng bộ các nguồn đó vào bước D sau duyệt. [UC-01](../../uc-01.md) · [Đặc tả tài khoản](../../../api/core/v1/paths/accounts.yaml) · [Nghiệm thu Core](../../../core-api/acceptance-tests.md#uc01) · [Quy tắc Core](../../../core-api/domain-rules.md)

Nguồn tham khảo cho lựa chọn độ dài mật khẩu và kỹ thuật lưu mật khẩu. [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/) · [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

## B · Thiết kế và dữ liệu

| Operation hoặc lớp xử lý | Hành vi và kịch bản |
| --- | --- |
| `registerAccount` · `POST /accounts` | Guest gửi email và mật khẩu. Tạo tài khoản chưa xác thực, token, job gửi ban đầu và biên nhận cùng giao dịch. Email trùng tuần tự hoặc đồng thời nhận cùng cấu trúc `202`, `Location` và `no-store`. Nhánh trùng chỉ tạo biên nhận. `400` và `503` theo `Problem`. SCN 01, 02, 08. |
| `getEmailRequestStatus` · `GET /email-request-status/{requestId}` | Guest dùng mã biên nhận ngẫu nhiên. `200` chỉ gồm `requestId`, `receivedAt`, `status: received` và `no-store`. Mã hợp lệ mà không tồn tại trả `404` chung. SCN 01, 02, 05, 07. |
| `verifyAccountEmail` · `POST /email-verifications` | Xác minh token trong body. Core kiểm mục đích, trạng thái và cửa sổ 15 phút kể từ lúc cấp. Tiêu thụ token và kích hoạt cùng giao dịch. `204` rỗng, `400`, `410` và `503` dùng theo quyết định ở A. SCN 03, 04, 08. |
| `requestVerificationEmail` · `POST /email-verification-requests` | Mỗi email hợp lệ sau chuẩn hóa có tối đa ba lượt tiếp nhận trong 15 phút bất kể trạng thái tài khoản. Lượt thứ tư nhận `429 VERIFICATION_RESEND_LIMIT` với `Retry-After` tính bằng số giây tròn lên đến lúc có lượt mới. Dưới hạn trả `202` chung. Chỉ tài khoản chưa xác thực tạo token và job. SCN 04, 05, 08. |
| Điều kiện của `createPasswordSession` · `POST /auth/sessions` | Core kiểm chủ thể ở trạng thái được phép sau bước kiểm thông tin xác thực và trước bước cấp phiên. API UC02 có thể trả `403` chung với mật khẩu đúng của tài khoản chưa xác thực. Luồng hoàn chỉnh của SCN 06 cần dịch vụ phiên thật và một đường cần `CoreSession`. |
| Worker và Mobile | Worker xử lý job email, tái kiểm điều kiện gửi và giữ biên nhận ở `received` kể cả khi gửi thất bại. Mobile thực hiện trạng thái UI 0.4, khóa thao tác lặp trong khi chờ, áp dụng phản hồi theo yêu cầu hiện hành và dùng `Retry-After` để cho gửi lại. SCN 02–08. |

Hợp đồng dùng prefix `/api/v1` cho tất cả operation trong bảng. Thử lại trên lỗi mạng hoặc `503` giữ trạng thái phù hợp trên Mobile. Sau mất kết nối ở bước xác thực, khách có thể kiểm bằng luồng đăng nhập khi UC02 sẵn sàng. Ảnh hộp thư trong UI 0.4 là bước chuyển ra ứng dụng email. [Đặc tả tài khoản](../../../api/core/v1/paths/accounts.yaml) · [Lỗi chuẩn](../../../api/core/v1/components/responses.yaml) · [Nghiệm thu Core](../../../core-api/acceptance-tests.md#uc01)

| Dữ liệu đề xuất | Ràng buộc và quyền sở hữu |
| --- | --- |
| Tài khoản Identity | ID, email chuẩn hóa có `UNIQUE`, mật khẩu đã băm, trạng thái chưa xác thực hoặc hoạt động và thời điểm xác thực. Core ghi và kích hoạt. Dùng `scrypt` bất đồng bộ với salt ngẫu nhiên và tham số lưu cùng hash, đề xuất `N=32768`, `r=8`, `p=3`. |
| Token xác thực | Digest duy nhất của token ngẫu nhiên 32 byte, tài khoản, mục đích, thời điểm cấp, hạn và thời điểm tiêu thụ. Token tới hạn tại `issued_at + 15 phút`. Khóa hoặc cập nhật có điều kiện để chặn hai lần kích hoạt đồng thời. |
| Biên nhận | ID ngẫu nhiên khó đoán, thời điểm tiếp nhận và trạng thái công khai cố định `received`. Không chứa email, kết quả gửi hoặc trạng thái tài khoản. |
| Hạn mức gửi lại | Khóa theo email chuẩn hóa và thời điểm các lượt tiếp nhận còn hiệu lực. Cập nhật nguyên tử cùng biên nhận và công việc phát sinh. Lượt đăng ký ban đầu, lượt bị chặn và retry nội bộ không tăng bộ đếm gửi lại. |
| Outbox và job email | ID sự kiện ổn định, tham chiếu Identity/token, payload nhạy cảm mã hóa bằng khóa cấu hình, trạng thái, số lần thử, `next_attempt_at` và lease. Core ghi cùng giao dịch. Worker nhận bằng `FOR UPDATE SKIP LOCKED`, gửi lại theo backoff với tối đa ba lần sau lần đầu trong thời hạn token và ghi `DEAD` khi cạn lượt hoặc hết hạn trước khi gửi thành công. Dùng ID ổn định khi retry/replay và giữ payload nhạy cảm phục vụ gửi tối đa đến hạn token. |

Migration bổ sung theo thứ tự, kiểm khởi tạo sạch và nâng cấp từ nền phù hợp. Role ứng dụng và Worker chỉ nhận quyền cần thiết. Cơ chế phiên do UC02 sở hữu, vì vậy migration UC-01 chỉ thêm dữ liệu Identity, biên nhận, quota và hàng đợi cần cho luồng đăng ký. [Mô hình Core](../../../core-api/data-model.md) · [Quy tắc Core](../../../core-api/domain-rules.md) · [Tích hợp Worker](../../../core-api/integration-contracts.md)

## C · Phạm vi bảo mật

Đặc tả nêu nghĩa vụ SEC cho UC-01 mà chưa gắn ID. Gói này định danh từng nghĩa vụ bằng `SEC-UC01-01` đến `SEC-UC01-10` và ghép tương ứng với SR trong E. Tiêu chí được chọn vì tác động trực tiếp tới bí mật credentials, tính nhất quán của đăng ký và xác thực, hạn mức hoặc ranh giới truy cập. Tiêu chí UI áp dụng cho các trạng thái có thể khiến người dùng hiểu sai kết quả hoặc gửi lặp. [Đặc tả UC-01](../../uc-01.md) · [Quy tắc Core](../../../core-api/domain-rules.md)

## D · Chỉ dẫn sinh mã và kiểm tra

1. Sau duyệt gói, lấy phần nền đã pin cần cho UC-01, giữ lớp định tuyến `/api/v1` qua Nginx và kiểm hồi quy `GET /api/v1/posts`. Tách các route và application service Identity trong `apps/core/src/modules/identity`, đăng ký ở `apps/core/src/api.ts` và chạy job từ `apps/core/src/worker.ts`. Dùng Node.js 22 LTS, TypeScript, Fastify, `pg` và PostgreSQL, với migration SQL có thứ tự trong `db/migrations/`. [Bối cảnh dự án](../../../../.agents/lost-and-found-context.md)
2. Dùng `apps/mobile` với Expo, React Native, TypeScript và kiểu request/response từ OpenAPI. Áp dụng UI 0.4 cho biểu mẫu, trạng thái chờ, gửi lại, xác thực và bàn giao. Cấu hình endpoint HTTPS và điểm mở link local. Gửi token tới Core bằng body. Loại credential khỏi log, analytics, thông tin lỗi và dữ liệu biên nhận. [UI UC-01](../../uc-01-ui.md)
3. Giữ các status, trường response và mã lỗi đã công bố. Đồng bộ thời hạn 15 phút trong đặc tả UC-01, OpenAPI, quy tắc Core và các kịch bản nghiệm thu liên quan. Bổ sung schema mật khẩu riêng của đăng ký và mô tả `410`. Ràng buộc các thao tác ghi qua transaction và dùng kênh email thử nghiệm trong Compose. Giữ quyền và cấu hình của nền hạ tầng cho các luồng hiện có. [Đặc tả tài khoản](../../../api/core/v1/paths/accounts.yaml)
4. Trên cùng bản mã, chạy lint/bundle OpenAPI, build/typecheck Core và Mobile, migration sạch/nâng cấp và kiểm tích hợp Core thật qua HTTPS Gateway với PostgreSQL, Worker, đồng hồ kiểm soát và hộp thư thử nghiệm. Kiểm Mobile bằng build và trạng thái chạy được khi có thiết bị hoặc giả lập. Lưu rõ phần có bằng chứng runtime và phần còn chờ. Bằng chứng mock chỉ dùng cho hợp đồng/định tuyến. Ghi riêng độ trễ `202` và thời gian thư đến nếu quan sát được. UC-01 hiện chưa quy định ngưỡng PERF. [Nghiệm thu Core](../../../core-api/acceptance-tests.md#uc01)

## E · Prompt audit

Đánh giá từng dòng trên cùng revision bằng `met`, `unmet` hoặc `not_evaluable`. Ghi revision, SCN, đường dẫn và dòng chứng cứ, kiểm tra runtime liên quan và lý do. Với điều kiện kiểm trên thiết bị hoặc chờ UC02, ghi rõ điều kiện đã quan sát được và phần chưa thể đánh giá.

| SEC và SR | Điều kiện đạt | Chứng cứ bắt buộc |
| --- | --- | --- |
| `SEC-UC01-01` · `SR-UC01-01` | Email chuẩn hóa chỉ tạo một tài khoản và một việc gửi ban đầu. Yêu cầu đăng ký mới và trùng có cùng status, dạng biên nhận, dạng `Location`, `no-store` và kết quả GET. | SCN 01. Migration `UNIQUE`, transaction và kết quả thử tuần tự/đồng thời trên PostgreSQL với đếm hàng thực. |
| `SEC-UC01-02` · `SR-UC01-02` | API kiểm đầu vào ở server, dùng các trường/status đã map và trả `Problem` đúng mã cho lỗi. Biên nhận giữ dạng công khai ngay cả khi mail không đến. | SCN 01, 02, 04, 05, 07, 08. Schema, error mapping, lint/bundle và HTTP response thực qua Gateway cho các ca tương ứng. |
| `SEC-UC01-03` · `SR-UC01-03` | Mật khẩu dùng hàm băm có salt riêng. Token xác thực lưu digest, được bảo vệ khi chuyển tới Worker và không xuất hiện trong log/biên nhận. | SCN 02, 03, 06, 07. Mã và cấu hình, kiểm lưu trữ và log bằng dữ liệu tổng hợp. |
| `SEC-UC01-04` · `SR-UC01-04` | Một token đúng chỉ kích hoạt một lần. Các giao dịch song song, rollback và token đã dùng giữ nhất quán trạng thái tài khoản. | SCN 03. Mã transaction, ca song song và rollback, bằng chứng trạng thái trước/sau. |
| `SEC-UC01-05` · `SR-UC01-05` | Token còn hạn ngay trước mốc 15 phút kể từ lúc Core cấp. Tại mốc hoặc sau đó, token hết hạn trả `410`, giữ tài khoản chưa xác thực và cho gửi lại. Yêu cầu gửi lại đủ điều kiện cấp token mới có thời hạn 15 phút tính từ lúc cấp mới. | SCN 02–04. Ghi thời điểm cấp, dùng đồng hồ kiểm soát và token/fixture riêng cho các ca ngay trước, đúng tại và sau mốc. Kiểm HTTP, trạng thái tài khoản và hạn của token mới. |
| `SEC-UC01-06` · `SR-UC01-06` | Quota áp dụng theo cùng khóa email ở mọi trạng thái. Ba lượt đầu được tiếp nhận, lượt thứ tư nhận `429` và `Retry-After` đúng. Lượt bị chặn không tạo job. Đăng ký và retry nội bộ nằm ngoài quota. | SCN 05, 07. Kiểm tuần tự, đồng thời, thời điểm hết cửa sổ, email tồn tại/chưa xác thực/đã xác thực và số job. |
| `SEC-UC01-07` · `SR-UC01-07` | Core từ chối đi tiếp tới cấp phiên trước xác thực dù mật khẩu đúng. Việc truy cập qua phiên hợp lệ sau xác thực cần thực sự qua UC02 và `CoreSession`. | SCN 06. Mã/giao dịch Identity và tích hợp điều kiện cấp phiên. Dùng HTTP cùng dịch vụ phiên thực cho phần hậu xác thực và truy cập được bảo vệ. |
| `SEC-UC01-08` · `SR-UC01-08` | Job bền cùng giao dịch tài khoản. Worker thử lại tối đa ba lần sau lần đầu khi token còn hạn, giữ ID và hạn token khi giao lại, thu hồi lease khi cần và ghi `DEAD` nếu cạn lượt hoặc hết hạn trước khi gửi thành công. Công khai chỉ thấy `received`. | SCN 02, 07. Outbox, migration, log/metrics đã lọc, hộp thư tổng hợp và ca giao lặp, restart hoặc lease hết hạn, rollback, thất bại liên tiếp và job đến lúc xử lý sau hạn token. |
| `SEC-UC01-09` · `SR-UC01-09` | Mobile khóa gửi lặp đang chờ, bỏ phản hồi đã cũ, xử lý đúng `202`, `204`, `400`, `410`, `429`, `503` và mất mạng. Sau xác thực, điều hướng vào điểm bàn giao UC02. | SCN 01–06, 08. Typecheck, kết quả kiểm với client đang chạy và kiểm mở link từ hộp thư trên thiết bị hoặc giả lập khi có. |
| `SEC-UC01-10` · `SR-UC01-10` | Request credential đi qua đường HTTPS cấu hình. Core nhận token trong body. Mã nhạy cảm có quyền và thời gian lưu phù hợp tại lớp gửi email. Log Gateway, Core, Worker và Mobile chứa dữ liệu đã lọc. | SCN 02–04, 07. Cấu hình TLS và DB role, link thử, mã redaction và mẫu log đã lọc từ runtime. |

## F · Sửa lỗi và nghiệm thu

1. Ghi revision đầu và đánh giá toàn bộ E trước khi sửa. Lưu `first_pass_security` cùng số lượng từng trạng thái, revision và các phần thiếu bằng chứng.
2. Mỗi lỗi có bằng chứng được đăng ký một `repair-NNN` trước khi chỉnh. Sửa tối thiểu, kiểm lại build/runtime và giao đánh giá tập SR bị ảnh hưởng. Tạm dừng một lỗi khi thiếu bằng chứng hoặc vẫn còn sau ba lần sửa liên tiếp. Dừng sửa tự động sau 10 lần đã bắt đầu trên toàn lần chạy.
3. Chạy lại kiểm tra cuối trên revision được đánh giá. Ghi kết quả từng SR, các quyết định, nguồn và revision cuối. Giữ phần nghiệm thu còn chờ ở trạng thái phù hợp cho tới khi có bằng chứng, hoặc khi người duyệt đã xác nhận phạm vi nghiệm thu được điều chỉnh.
