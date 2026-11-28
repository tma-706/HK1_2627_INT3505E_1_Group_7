# Gói duyệt triển khai UC-02 0.2

**Lần chạy `uc-02-0.2` · Gói A–F đề xuất · Chờ duyệt**

Gói này là đề xuất để người yêu cầu duyệt, chưa cho phép sinh mã, migration hay chạy kiểm thử. Các phương án sản phẩm dưới đây không phải quyết định đã có. Gói truy vết đủ tám kịch bản từ `SCN-UC02-01` đến `SCN-UC02-08`. Mục B ghi phạm vi triển khai và các điều kiện nghiệm thu còn phụ thuộc UC khác.

## A · Nguồn, phạm vi và quyết định đề xuất

- [UC02 0.2](../../uc-02.md), [UI UC02 0.1](../../uc-02-ui.md), [hướng dẫn UI 0.2](../../../design/ui-guidelines.md), đều đang chờ duyệt. Xem [bản ghi nguồn và SHA-256](verification.md). Core REST `/api/v1`, OpenAPI 3.1.0, `info.version` 1.0.0 tại [root](../../../api/core/v1/openapi.yaml), [accounts](../../../api/core/v1/paths/accounts.yaml), [posts](../../../api/core/v1/paths/posts.yaml), [interactions](../../../api/core/v1/paths/interactions.yaml), [moderation](../../../api/core/v1/paths/moderation.yaml), [ghi chú UC02](../../../api/core/v1-notes.md#uc02-login). Nền `fbc39731d81bda93e88175cc30881f63fc0ebf04` cộng diff hợp đồng UC02 hiện có. [Run record](run.json) ghi hash của từng nguồn cho gói trình duyệt này.
- Ràng buộc [bối cảnh dự án](../../../../.agents/lost-and-found-context.md), [phạm vi](../../../core-api/scope.md), [quy tắc](../../../core-api/domain-rules.md), [nghiệm thu](../../../core-api/acceptance-tests.md#uc02). Kiến trúc và hạ tầng tham chiếu `origin/implementation/infrastructure@4c3582250930cd39f035b0ab0292d582a4630da7`, `docs/architecture/implementation-baseline.md`, `docs/infrastructure/local-stack.md`, `docs/infrastructure/acceptance.md`. Checkout hiện tại là `codex/uc-01`. Giữ diff hiện có và hành vi của các luồng ngoài phạm vi.
- Thực trạng. Identity có đăng ký, xác thực email, `checkPasswordSessionEligibility` và scrypt có đường tính toán tương đương cho tài khoản không tồn tại. Chưa có route phiên. `003_account_verification.sql` chưa có vai trò, quyền, phiên hay khóa. API hiện có bảng tin và Identity của UC01. Mobile có điểm vào đăng nhập sau UC01. Chưa có route công khai UC27, UC15/17 hoặc đường nghiệp vụ Bearer thật để chứng minh quyền theo đối tượng. Media tiếp tục dùng cơ chế phiên hiện có.

**Các lựa chọn cần duyệt cùng gói**

1. **Phiên.** Bearer ngẫu nhiên đủ entropy, chỉ lưu digest. Hạn tuyệt đối **8 giờ từ lúc cấp**, không refresh hay gia hạn trượt. `revokeCurrentSession` thu hồi phiên hiện tại ngay. Đề xuất giữ dấu thu hồi đến hạn gốc của phiên để lần gọi DELETE lặp bằng cùng token còn hạn có thể trả 204. GET và các thao tác bảo vệ trả 401 cho token hết hạn hoặc đã thu hồi. Tạm khóa đăng nhập chỉ chặn cấp phiên mới. Phiên đã cấp vẫn được đánh giá theo thời hạn, trạng thái thu hồi và khóa quản trị. Khóa quản trị từ chối xác minh/truy cập với 403 và không thay thế trạng thái khóa tạm. Quy tắc này cần duyệt vì nguồn chưa quy định TTL và thu hồi.
2. **Lưu phiên trên Mobile.** Chỉ giữ token trong bộ nhớ. Ứng dụng khởi động lại yêu cầu đăng nhập lại. Lưu bền an toàn thuộc quyết định mở rộng riêng. Không đưa token vào điều hướng, log hoặc bộ nhớ cache công khai.
3. **Admin.** Đăng ký UC01 luôn là member. Đề xuất dùng tài khoản Admin tổng hợp do vận hành cấp ngoài API công khai, bằng đường quản trị được phép. Quyền từng chức năng và cơ chế cấp quyền sản xuất thuộc gói của operation tương ứng.
4. **Giới hạn luồng kế cận.** Xây dựng đăng nhập, đọc phiên hiện tại và thu hồi phiên. Triển khai `getPublicPost` thật từ phép chiếu PostgreSQL mà bảng tin đang dùng. Chỉ trả bản công khai Open + Visible theo `PublicPost`, gồm `custody` cho Found và mảng ảnh rỗng khi dữ liệu hiện hành không có ảnh công khai. Giữ `moderateAccount` trong phạm vi của UC27. Mở khóa sớm/audit và quyền theo đối tượng tại tương tác chờ UC sở hữu hoặc một gói phạm vi bổ sung được duyệt.
5. **Điều hướng.** Member về feed thật, Admin tới màn đích quản trị giới hạn, có thông báo trạng thái triển khai và lối đăng xuất. Sau UC13, giữ ID và ý định, tải lại chi tiết thật trước khi tiếp tục. Khi UC15/17 chưa có, hiển thị thao tác chưa khả dụng và giữ phiên. Giữ ngữ cảnh hợp lệ khi qua UC01, không chuyển mật khẩu. Các màn đích và câu chữ cần duyệt sản phẩm/Mobile.
6. **Thông báo.** 429 đồng bộ trên Mobile. Email/UC20 thông báo khóa nằm ngoài gói, chỉ bổ sung sau quyết định kênh và điều kiện. Hai mốc PERF của UC02 chỉ đo và báo số, không tự đặt ngưỡng đạt.

## B · Thiết kế, schema và ranh giới kịch bản

| Thành phần | Hành vi đề xuất và bằng chứng cần có |
| --- | --- |
| `createPasswordSession` | Kiểm body theo `EmailAndPassword`. Mật khẩu đăng nhập có tối thiểu một ký tự theo hợp đồng. Giới hạn kích thước body và 400 không tính sai. Chuẩn hóa email như UC01, so khớp scrypt/NFC với đường làm việc tương đương cho email không tồn tại. Bốn lần sai đầu trả cùng 401. Lần sai thứ năm trong cửa sổ trượt 15 phút trả 429 `LOGIN_TEMPORARILY_LOCKED`, `Retry-After` 1–900. Thời điểm đúng 15 phút loại khỏi cửa sổ. Đang khóa trả 429 kể cả mật khẩu đúng và không dời hạn. Hết khóa hoặc thành công kết thúc chuỗi. Ngoài khóa, đúng mật khẩu nhưng chưa xác thực hoặc khóa quản trị trả cùng 403. Hai trường hợp đều không cấp phiên. Trả 200 `Session`, `no-store` khi đủ điều kiện. SCN 01–04, 06–08. |
| `getCurrentSession`, `revokeCurrentSession` | Xác thực Bearer thật, đọc chủ thể, vai trò, hạn và kiểm lại trạng thái tài khoản và khóa quản trị. Lấy vai trò từ Core. Từ chối phiên thiếu, sai hoặc hết hạn bằng 401 với Bearer challenge. GET trả 401 cho phiên đã thu hồi. DELETE chỉ thu hồi phiên đang dùng và xử lý lần lặp theo lựa chọn ở A. SCN 01, 06. |
| `getPublicPost` | Dùng cùng phép chiếu công khai đã che và cùng điều kiện Open + Visible như feed. Trả 404 chung cho bài đóng, bài ẩn và ID không tồn tại. Đồng nhất schema `PublicPost` giữa hai đường đọc. Kiểm endpoint riêng cho SCN 05 và 08. |
| Mobile | Màn và trạng thái UI 0.1, chặn gửi lặp, xử lý 400/401/403/429/503, mạng lỗi, `Retry-After`, bỏ phản hồi lỗi thời theo lần gửi/email/màn/đích. Phiên chỉ áp dụng khi ngữ cảnh còn hiệu lực. Giữ mật khẩu trong biểu mẫu và body gửi Core. A2 chuyển sang UC01 và có thể trở lại, A1 tải lại bài bằng phiên đã nhận. Lỗi tải lại không đăng nhập lại. SCN 01–08 trong phạm vi các điểm vào nêu ở A. |
| UC27 và UC15/17 | Hợp đồng yêu cầu `moderateAccount` kiểm quyền theo loại khóa và lưu audit. `getClaimQuestions`, `submitClaim`, `submitFinderResponse` kiểm phiên, quyền đối tượng, loại và trạng thái. Do các route chưa có, điều kiện mở khóa sớm/audit, Admin đủ/thiếu quyền, tương tác Found/Lost và từ chối ghi theo đối tượng **chưa nghiệm thu được** trong gói này. Chỉ ghi nhận bằng chứng từ endpoint tương ứng cho các điều kiện này. |

- **Phạm vi kiểm thử 01, 02, 03, 06, 07 và 08.** Kiểm đăng nhập, đọc/thu hồi phiên, chuẩn hóa, trạng thái chặn, đồng thời và các lỗi trên thiết bị khi đủ runtime. Phần kiểm quyền chức năng ở SCN 01 cần endpoint có thẩm quyền thật.
- **Phạm vi kiểm thử 04 và 05.** Kiểm hết khóa, 429, khóa quản trị bằng dữ liệu chuẩn bị có kiểm soát, cùng quay lại bài và xử lý 404. Mở khóa qua thao tác UC27, audit mở khóa và quyền theo đối tượng khi ghi qua UC15/17 vẫn chờ endpoint tương ứng. Phần kiểm chứng đó cần bổ sung phạm vi hoặc loại trừ riêng trước khi có thể kết thúc run.

**Thiết kế dữ liệu đề xuất.** Thêm migration SQL theo thứ tự, tương thích dữ liệu UC01 hiện có. Tài khoản hiện có và đăng ký mới mặc định member. Trạng thái khóa quản trị có hiệu lực độc lập với khóa tạm và biểu diễn được khóa có hạn hoặc vĩnh viễn. Role chạy API đọc vai trò và khóa quản trị. Grant ghi hai trạng thái này thuộc đường vận hành được phép. Bảng phiên có digest duy nhất, khóa ngoại tài khoản, mốc cấp/hết hạn/thu hồi. Lưu digest của token, còn Bearer được gửi về Mobile ở phản hồi cấp phiên. Lưu bộ đếm theo email chuẩn hóa kể cả email không tồn tại, giới hạn lịch sử trong cửa sổ và thời điểm khóa. Giao dịch và khóa theo email bảo đảm song song chỉ tạo một mốc khóa và không mất lượt. Dọn bản ghi đã hết thời hạn sử dụng theo lô, giữ dấu thu hồi còn trong hạn gốc và khóa tạm còn hiệu lực. Kiểm migration trên dữ liệu UC01 có sẵn và giới hạn grant theo vai trò Identity. Chứng minh nhánh khóa quản trị bằng dữ liệu tổng hợp thuộc phạm vi đã duyệt. Nghiệm thu thao tác quản trị thật thuộc UC27.

## C · Phạm vi bảo mật được chọn

Nguồn UC02 và ghi chú không có catalog ID SEC riêng. Các ID `SEC-UC02-*` sau là nhãn truy vết đề xuất của gói này, không giả làm ID catalog. Mỗi ID ánh xạ đúng một SR đóng băng tại E.

| ID | Nghĩa vụ và lý do | Phạm vi |
| --- | --- | --- |
| SEC-UC02-01 | Bảo vệ credential và token khi truyền, lưu, ghi log. Credential là đầu vào nhạy cảm. | 01–08, Gateway/Core/Mobile |
| SEC-UC02-02 | Phản hồi chung và chuẩn hóa để không phân biệt tài khoản/trạng thái qua nhánh công khai. | 02, 06 |
| SEC-UC02-03 | Cửa sổ sai và khóa nhất quán kể cả đồng thời để thực thi giới hạn UC02. | 03, 04, 07, 08 |
| SEC-UC02-04 | Điều kiện tài khoản và vòng đời Bearer, kiểm lại trạng thái trên request được bảo vệ. | 01, 04, 06 |
| SEC-UC02-05 | Quyền chức năng và theo đối tượng tại operation đích, không dựa vào UI. | 01, 05, UC27/15/17 |
| SEC-UC02-06 | Mở đúng loại khóa theo thẩm quyền, ghi audit. Giữ khóa quản trị độc lập. | 04, UC27 |
| SEC-UC02-07 | Ràng buộc kết quả không đồng bộ vào đúng ngữ cảnh để không áp dụng phiên hay lỗi sai luồng. | 05, 08, Mobile |

## D · Prompt sinh mã sau duyệt

Triển khai trong checkout hiện tại, `apps/core/src/api.ts`, module Identity, migration và grant/provisioning liên quan, `apps/mobile` và điểm vào thật của UC01/UC13 khi có. Tuân theo stack Node 22, TypeScript/Fastify/pg, PostgreSQL migrations có thứ tự, Expo/React Native và gateway giữ `/api/v1`. Dùng types theo OpenAPI và kiểm schema/status/header theo contract đã cố định. Giữ bí mật bên ngoài nguồn, log, URL và artifact. Giữ hành vi UC01, feed, media và Worker hiện có. Đường truyền credential qua HTTPS theo cấu hình gateway, chỉ giữ Bearer trong bộ nhớ Mobile, xóa khi đăng xuất hoặc đóng ứng dụng, không vô hiệu kiểm TLS. Thiết kế xử lý lỗi không cấp phiên khi trạng thái hoặc DB không xác định. Dùng giao dịch chống race tại cùng email. Tài khoản và quyền được lấy từ server. Không đưa thông báo UC20, thao tác quản trị hoặc tương tác giả vào phạm vi.

Sau khi duyệt, tạo migration và mã, kiểm build/lint, chạy bộ kiểm thử UC01 hiện có và kiểm tra runtime được phép trong F. Nếu cần đổi payload, mã lỗi, quyền hay phạm vi vật chất so với gói, dừng phần bị ảnh hưởng và đưa thay đổi cụ thể duyệt lại. Ghi source revision ban đầu, cấu hình và bằng chứng. Không công bố mock OpenAPI là bằng chứng nghiệp vụ.

## E · Prompt audit: SR đóng băng khi duyệt

Kiểm từng SR trên đúng revision và nguồn A. Đánh dấu `met` khi có đủ bằng chứng, `unmet` khi bằng chứng chỉ ra sai lệch, `not_evaluable` khi thiếu bằng chứng. Ghi điều kiện áp dụng, đường dẫn và kết quả. Không coi unit/helper hoặc mock là chứng minh enforcement tại endpoint. Mọi SR dưới đây được đánh giá độc lập, không loại khỏi điểm chỉ vì phụ thuộc chưa triển khai.

| SR / SEC | Hành vi phải có | Bằng chứng tối thiểu |
| --- | --- | --- |
| SR-UC02-01 / SEC-UC02-01 | HTTPS gateway, mật khẩu trong body. Dùng scrypt/NFC tương thích UC01. Dùng token ngẫu nhiên, digest lưu server, Bearer chỉ trong bộ nhớ Mobile, `no-store`. Log loại credential và token. | Cấu hình, source, schema/grant. Runtime qua gateway và kiểm response/log tổng hợp. |
| SR-UC02-02 / SEC-UC02-02 | Email chuẩn hóa thống nhất. Email không tồn tại và mật khẩu sai dùng 401 chung và đường tính toán tương đương. Trả 403 chung cho chưa xác thực/khóa quản trị sau mật khẩu đúng. | Source và gọi API tổng hợp đối chiếu status/body. Kiểm luồng tính toán, không khẳng định timing bằng một phép đo. |
| SR-UC02-03 / SEC-UC02-03 | Cửa sổ trượt, ranh giới 15 phút, 429 lần thứ năm, `Retry-After`, không kéo dài, reset và tuần tự hóa khi đồng thời. 400 không tính sai. | Source giao dịch/schema và kiểm API thực với đồng hồ có thể điều khiển, case song song, đúng mốc, thử thành công và trong khóa. |
| SR-UC02-04 / SEC-UC02-04 | Chỉ tài khoản đủ điều kiện nhận phiên. Phiên có hạn 8 giờ, có thể thu hồi và được kiểm trạng thái, hạn và Bearer theo từng yêu cầu được bảo vệ. | Source/schema. Runtime cấp/đọc/thu hồi/hết hạn, thiếu/sai Bearer, chưa xác thực và khóa quản trị bằng dữ liệu tổng hợp. |
| SR-UC02-05 / SEC-UC02-05 | Quyền chức năng riêng và quyền đối tượng được kiểm server tại operation thật, kể cả Admin thiếu quyền. Từ chối trước khi ghi. | Source và runtime endpoint thật cho chủ thể hợp/thiếu quyền, bài và trạng thái. Ghi `not_evaluable` cho operation chưa tồn tại. |
| SR-UC02-06 / SEC-UC02-06 | UC27 chỉ mở đúng loại khóa với đúng quyền và ghi audit. Khóa quản trị còn hiệu lực khi mở khóa tạm. | Source và runtime `moderateAccount` thật với Admin đủ/thiếu quyền, audit và hai loại khóa. Nếu route chưa có, `not_evaluable`. |
| SR-UC02-07 / SEC-UC02-07 | Chặn gửi lặp, bỏ kết quả quá hạn hoặc sai email/màn/đích. Tải lại bài lỗi không làm đăng nhập lại và không ghi tương tác tự động. | Source và kiểm Mobile với phản hồi trễ, rời màn, đổi email, lỗi mạng/tải lại. Ghi thiếu bằng chứng nếu điểm vào thật chưa có. |

## F · Prompt sửa lỗi và nghiệm thu

Trước sửa, lưu `first_pass_security` đủ từng SR với trạng thái, bằng chứng, gap và số lượng trên revision đầu. Đăng ký từng lượt sửa tối thiểu theo lỗi có bằng chứng và kiểm toán lại các SR bị ảnh hưởng. Tối đa 10 lượt sửa đã bắt đầu, sau đó cần người yêu cầu duyệt số lượt bổ sung. Thiếu bằng chứng không tự tính là lỗi cần sửa. Sau ba lần liên tiếp không giải quyết được cùng lỗi, tạm dừng lỗi đó và tiếp tục việc độc lập. Bảo toàn snapshot đầu và lịch sử sửa.

Sau khi duyệt, dùng stack local thật và dữ liệu tổng hợp tạo qua ứng dụng hoặc dịch vụ quản trị thông thường đã được phép. Chọn endpoint thật. Chạy lint và bundle OpenAPI, build Core, kiểm tra kiểu Mobile với `npm run check:clients`, kiểm tra UC01 bằng `node tests/core-identity.mjs` và hồi quy bảng tin bằng `sh tests/core-feed.sh`. Kiểm ứng viên qua Gateway HTTPS và Mobile. Chạy kiểm media hiện có nếu migration hoặc grant chạm ranh giới media. Bao phủ thành viên/Admin, từ chối chung, chưa xác thực/khóa quản trị, đồng thời và biên thời gian, thu hồi/hết hạn, lỗi UI và tải lại bài. Ghi revision, lệnh, môi trường, kết quả, ngưỡng PERF chưa có và phần không thể kiểm. Thiết bị, đồng hồ điều khiển, quyền cấp fixture Admin và điểm vào UC13 là tiền đề phải xác minh, không được coi là đã có.

Nghiệm thu chỉ hoàn tất khi runtime bắt buộc đạt, audit cuối bao phủ mọi SR trên cùng revision và các quyết định phạm vi được ghi. SR chưa có bằng chứng giữ `not_evaluable` và phần SCN tương ứng còn chờ, trừ khi người yêu cầu quyết định loại trừ theo quy tắc run. Nếu lỗi nguồn còn khả năng sửa trong quyền hạn, quay lại vòng sửa. Nếu thiếu UC27/15/17 hoặc quyền vận hành, ghi blocker và xin quyết định phạm vi/bằng chứng, không tuyên bố toàn bộ tám SCN đã đạt.

**Tiền kiểm môi trường.** Docker Compose 5.7.1 có mặt, nhưng lệnh đọc phiên bản Docker server bị từ chối truy cập Windows Docker Desktop Linux named pipe. Chưa chạy build hoặc smoke của ứng viên. Nghiệm thu qua Compose cần truy cập Docker daemon. Lint và bundle hợp đồng nền bằng thư viện Redocly đã qua, có cảnh báo `info-license` từ hợp đồng hiện có.
