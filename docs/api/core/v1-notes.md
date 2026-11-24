# Campus Lost & Found · Bàn giao API v1

Hợp đồng thiết kế cho 30 UC ngày 24/11/2026. URL nghiệp vụ có dạng `https://{gateway-host}/api/v1/...`. File [openapi.yaml](v1/openapi.yaml) khai báo `servers.url: /api/v1`, các path khai báo từ tài nguyên trở xuống. Trạng thái triển khai và cấu hình gateway v1 thuộc nhóm thực hiện.

## Nguồn

| Nguồn | Bản dùng và phạm vi |
| --- | --- |
| [LOST&FOUND.pdf](https://chatgpt.com/library?file_id=libfile_56962664f4a08191ace50f537d76ca7e&account_id=personal) | Bản 5 trang ngày 24/11/2026, `file_00000000950c823087b3f3307ecbb24b`. Nguồn UC01–UC30. |
| [Execution Prompt đã duyệt](https://chatgpt.com/library?file_id=libfile_eeba4d982e0481919968098146c29ae8&account_id=personal) | Bản 1 ngày 24/11/2026. |
| [Core 0.3.0](openapi.json) | `sha256:2bc3ced154893f3e813abb7909737af1be9c5f326212a3d5528307c61648656e`, repo `commit:638eda701aa5be0ad2d264ade9ca6ce69286d148`. |
| [SRS thực nghiệm](../../requirements/lost-and-found-srs.pdf) | §3.1–3.3, 3.6, `sha256:2f67606fba01394440f4ece54716541ce4188ce8a4564748fffdf048d8a5196b`. UC-01 thực nghiệm là Google và quản lý phiên, UC-02 thực nghiệm là Hồ sơ và Mục của tôi. |
| [Analysis thực nghiệm](../../requirements/analysis/uc-01-02.md) | `sha256:f297d9c06061148f88b1eaae287c532954acc37ab9cd5c19f3f1f2953ba547bb`. Các SEC/PERF của thực nghiệm dùng để so sánh và bàn giao theo phạm vi được duyệt. |
| [Thiết kế tổng thể](../../architecture/target-design.md), [media](../../architecture/media-upload.md) | Đầu vào kiến trúc đề xuất. Tổng thể `sha256:b5e13f7b4e21e31eb5a8b6944055c41047d702913d7953b4b1ef01d680eee58f`, media `sha256:2cb698b5bfe6258d64c1fb6ce8b2208f9fd06f9ee3cfbdc5b250bbcee5caa837`. |

## Truy vết use case

Các tên ở cột cuối là `operationId` trong OpenAPI. Một số operation được dùng ở nhiều UC. Trường `x-use-cases` lưu liên kết ngược. Việc đưa cả 30 UC vào hợp đồng thiết kế giữ nguyên mức ưu tiên nghiệp vụ của PDF.

| UC và tên nguồn | Trang | Operation |
| --- | --- | --- |
| UC01 · Register Account | 1 | `registerAccount`, `verifyAccountEmail`, `requestVerificationEmail`, `getEmailRequestStatus` |
| UC02 · Login | 1 | `createPasswordSession`, `getCurrentSession`, `revokeCurrentSession`, `moderateAccount` |
| UC03 · Reset Password | 1 | `requestPasswordReset`, `getEmailRequestStatus`, `resetPassword` |
| UC04 · Manage Personal Profile | 1–2 | `getMyProfile`, `updateMyProfile`, `changeMyPassword`, `createAuxiliaryUpload`, `confirmUpload`, `getUploadStatus` |
| UC05 · Create Lost Post | 2 | `createPostDraft`, `getMyPostDraft`, `updatePostDraft`, `publishPostDraft`, `createDraftTextRedactionReview`, `getDraftTextRedactionReview`, `setDraftManualRedaction`, `getDraftOriginalText`, `createDraftPhotoUpload`, `confirmUpload`, `getUploadStatus`, `listCategories` |
| UC06 · Create Found Post | 2 | `createPostDraft`, `getMyPostDraft`, `updatePostDraft`, `publishPostDraft`, `setDraftVerificationQuestions`, `createDraftTextRedactionReview`, `getDraftTextRedactionReview`, `setDraftManualRedaction`, `getDraftOriginalText`, `createDraftPhotoUpload`, `confirmUpload`, `getUploadStatus`, `listCategories` |
| UC07 · Set Verification Questions | 2 | `getMyPostDraft`, `publishPostDraft`, `setDraftVerificationQuestions`, `replacePostVerificationQuestions`, `getPostVerificationQuestions`, `updatePost`, `getClaimQuestions`, `suggestVerificationQuestions` |
| UC08 · View My Posts | 2 | `listMyPosts`, `getMyPost`, `listMyPostInteractionHistory` |
| UC09 · Edit Post | 2 | `replacePostVerificationQuestions`, `getPostVerificationQuestions`, `updatePost`, `createPostTextRedactionReview`, `getPostTextRedactionReview`, `setPostManualRedaction`, `getPostOriginalText`, `createPostPhotoUpload`, `confirmUpload`, `getUploadStatus` |
| UC10 · Close Post | 2 | `closePost`, `reopenPost`, `getReturnRequest`, `confirmPostReturn`, `setMyReturnCancellation`, `listMyNotifications`, `listPendingReturnReviews` |
| UC11 · View News Feed | 2 | `listPublicPosts` |
| UC12 · Search and Filter Posts | 3 | `listPublicPosts`, `listCategories` |
| UC13 · View Post Detail | 3 | `getPublicPost` |
| UC14 · Share Post | 3 | `getPublicPost` |
| UC15 · Submit Claim | 3 | `getClaimQuestions`, `submitClaim`, `listMyClaims`, `getClaim`, `withdrawClaim`, `resubmitClaimAnswers` |
| UC16 · Review Claim | 3 | `listPostClaims`, `listMyClaims`, `getClaim`, `decideClaim` |
| UC17 · Respond to Lost Post | 3 | `submitFinderResponse`, `listMyFinderResponses`, `getFinderResponse`, `updateFinderResponse`, `withdrawFinderResponse`, `createAuxiliaryUpload`, `confirmUpload`, `getUploadStatus` |
| UC18 · Review Finder Response | 3 | `listFinderResponses`, `getFinderResponse`, `decideFinderResponse` |
| UC19 · Chat with Counterpart | 3 | `decideClaim`, `decideFinderResponse`, `listConversations`, `getConversation`, `listMessages`, `sendMessage`, `getMessage`, `reportMessage`, `getMyReportReceipt` |
| UC20 · View Notifications | 4 | `decideClaim`, `decideFinderResponse`, `sendMessage`, `listMyNotifications`, `setNotificationReadState`, `getNotificationPreferences`, `updateNotificationPreferences`, `decideModerationAppeal` |
| UC21 · Generate and View AI Match Suggestions | 4 | `publishPostDraft`, `updatePost`, `listMyNotifications`, `listMatchSuggestions`, `setMatchFeedback` |
| UC22 · Report Post | 4 | `listMyNotifications`, `reportPost`, `getMyReportReceipt`, `decideReportedPost` |
| UC23 · Mask Sensitive Text | 4 | `publishPostDraft`, `updatePost`, `createDraftTextRedactionReview`, `getDraftTextRedactionReview`, `setDraftManualRedaction`, `getDraftOriginalText`, `createPostTextRedactionReview`, `getPostTextRedactionReview`, `setPostManualRedaction`, `getPostOriginalText` |
| UC24 · Mask Sensitive Image Regions | 4 | `publishPostDraft`, `updatePost`, `createDraftPhotoUpload`, `createPostPhotoUpload`, `confirmUpload`, `getUploadStatus`, `setPhotoRedactionRegions` |
| UC25 · Suggest Verification Questions | 4 | `suggestVerificationQuestions` |
| UC26 · Review Reported Post | 4–5 | `listMyNotifications`, `reportPost`, `listReportedPosts`, `getReportedPostCase`, `decideReportedPost`, `getReportedPostDecision`, `moderateAccount` |
| UC27 · Manage User Accounts | 5 | `listAdminAccounts`, `listAccountViolations`, `moderateAccount`, `getAccountModerationAction` |
| UC28 · Manage Item Categories | 5 | `listCategories`, `createCategory`, `getAdminCategory`, `updateCategory`, `confirmCategoryMapping` |
| UC29 · Submit Moderation Appeal | 5 | `createAuxiliaryUpload`, `createAppealEvidenceUpload`, `confirmUpload`, `getUploadStatus`, `exchangeAppealCredential`, `submitModerationAppeal`, `getMyModerationAppeal` |
| UC30 · Review Moderation Appeal | 5 | `listMyNotifications`, `getReportedPostDecision`, `listAccountViolations`, `getAccountModerationAction`, `submitModerationAppeal`, `getMyModerationAppeal`, `listModerationAppeals`, `getModerationAppeal`, `decideModerationAppeal`, `getModerationAppealDecision` |

## Phân quyền và dữ liệu trả về

| Người gọi | Phạm vi |
| --- | --- |
| Guest hoặc client đang thực hiện xác thực | Bảng tin, tìm kiếm, chi tiết, liên kết chia sẻ và danh mục. Bài công khai chỉ gồm Open + Visible, đọc cùng một bản đã che. Đăng ký, đổi token email, đặt lại mật khẩu và cấp phiên dùng dữ liệu xác thực gửi trong body. Biên nhận email trả cùng trạng thái `received` bất kể có tài khoản hoặc phát thư. |
| Tài khoản đã xác thực email | Core lấy chủ thể từ Bearer. Các operation `/me` trả đúng chủ thể. Tiếp tục kiểm trạng thái khóa và điều kiện của đối tượng. Trong mỗi lần phân trang, Core ràng buộc cursor rồi kiểm lại quyền dữ liệu. |
| Tác giả bài, người gửi claim và người gửi phản hồi | Tác giả xem bài và lịch sử của mình, Finder xem claim trên bài Found của mình, Owner xem phản hồi trên bài Lost của mình. Người gửi xem tương tác của mình. Chỉ tác giả tương ứng có quyền thường lệ đọc văn bản gốc. Ghi chú riêng Found chỉ dành cho Finder tạo bài. Ảnh và URL tải phải thừa hưởng quyền của đích; URL riêng có thời hạn. |
| Hai bên của tương tác đã chấp nhận | Chỉ hai bên được mở hội thoại, đọc tin nhắn hoặc tham gia xác nhận trao trả, theo trạng thái bài và quyền tài khoản. Khi bài Closed/Returned, chat chỉ đọc. |
| Admin | Có Bearer và quyền cho từng nhóm thao tác gồm đọc/ghi vụ việc, tài khoản, danh mục, xem xét trao trả hoặc khiếu nại. Audit truy cập đặc biệt và quyết định. Bản quản trị thường lệ trả dữ liệu đã xử lý. Ngoại lệ đọc dữ liệu gốc cần thẩm quyền đã định và audit. |
| Chủ thể bị khóa có Bearer giới hạn | Thiết kế đề xuất cho UC29. Thông tin xác thực trao đổi tại `exchangeAppealCredential` chỉ dùng cho quyết định của chủ thể. Phiên giới hạn chỉ được gửi/đọc khiếu nại tương ứng và tạo, xác nhận, đọc trạng thái upload bằng chứng đúng quyết định. Hình thức cấp và hạn của thông tin xác thực này còn mở. |

- Trả `401` kèm Bearer challenge cho phiên thiếu hoặc mất hiệu lực ở operation Bearer. Trả `403` khi Core xác định chủ thể có phiên nhưng thiếu quyền cấp tài khoản hoặc quyền chức năng. Dùng `404` chung với tài nguyên ngoài phạm vi hoặc không tồn tại. `createPasswordSession` tự xác thực đầu vào, trả `401 INVALID_CREDENTIALS` cho thông tin đăng nhập bị từ chối.
- Lỗi nghiệp vụ v1 dùng `application/problem+json` và cùng schema `Problem`. Mã HTTP, `status` và `code` phải khớp. UI dựa vào `code` cho lỗi đã biết và có thông báo mặc định cho lỗi khác. Phản hồi và log loại dữ liệu gốc, token, thông tin xác thực, claim answers và URL/form đã ký. Audit có kiểm soát truy cập theo chính sách.
- Cursor tiếp tục từ cặp khóa sắp xếp, ràng buộc với route, filter, sort và chủ thể khi có. Mặc định `limit=20`, tối đa 50 là thiết kế v1. `nextCursor: null` là hết. Làm mới bằng cách bỏ cursor. Các trang không hứa snapshot trọn bộ, trả mục còn truy cập được sau mốc cursor. Cursor sai phạm vi hoặc không còn dùng được trả `400` theo schema lỗi chung.
- Feed và tìm kiếm dùng chung `GET /api/v1/posts`. Thứ tự mới nhất theo `publishedAt DESC, postId DESC`. Range tìm kiếm hiện đề xuất `occurredAt >= from`, `occurredAt < to`. Dùng định dạng RFC 3339 cho mốc nhập. Trang chia sẻ giữ cùng điều kiện Open + Visible, kể cả khi một URL cũ được truy cập lại.

## Vòng đời và tính nhất quán

| Tài nguyên | Chuyển trạng thái và điều kiện |
| --- | --- |
| Tài khoản | Chưa xác thực → hoạt động khi xác thực email trong 24 giờ. Gửi lại email xác thực hoặc reset tối đa 3 lượt/15 phút. Token reset dùng một lần trong 30 phút, tiêu thụ cùng giao dịch đổi mật khẩu. Mỗi 5 lần đăng nhập sai liên tiếp trong 15 phút khởi động khóa đăng nhập 15 phút. Khóa quản trị theo UC27 có thời lượng 7 ngày, 30 ngày hoặc vĩnh viễn. Core kiểm loại khóa và loại quyền mở khóa. |
| Bài đăng và trao trả | Sau chuẩn bị ảnh/văn bản, xuất bản thành Open. Lý do đóng thông thường chuyển Closed. Có tương tác được chấp nhận, một bên khởi tạo yêu cầu trả đồ, bài sang Pending Return Confirmation. Nhắc ở 24/48 giờ, bên kia xác nhận trong 72 giờ để chuyển Returned. Sau 7 ngày chưa xác nhận vẫn Pending Return Confirmation và vào hàng đợi. Hủy yêu cầu để về Open cần cả hai đồng ý. Tác giả được mở lại bài Closed trong 7 ngày khi chưa có tương tác được chấp nhận và bài không Hidden/Removed. |
| Trạng thái hiển thị | Visible, Hidden và Removed độc lập với trạng thái xử lý. 5 báo cáo hợp lệ từ 5 tài khoản trong 24 giờ chuyển Visible → Hidden và mở việc kiểm duyệt. Admin mới được khôi phục, có lý do và audit. Dismiss hoặc rút báo cáo giữ trạng thái đã ẩn. Việc khôi phục chỉ sửa trục hiển thị. |
| Claim | Pending → Approved, Rejected, Withdrawn, Expired hoặc Superseded theo thao tác. Thêm/gửi lại dùng chung cửa sổ trượt 30 ngày với 3 lượt mỗi tài khoản trên mỗi bài Found. Lượt đúng ranh giới 30 ngày rời cửa sổ trước khi tính yêu cầu mới. Approve, khóa nhận claim mới, Superseded các claim chờ và mở quyền chat được ghi nhất quán. |
| Phản hồi | Pending → Accepted, Declined, Withdrawn hoặc Superseded. Một phản hồi hoạt động trên mỗi bài cho mỗi Finder. Giới hạn 5 tạo mới mỗi ngày theo đồng hồ máy chủ và múi giờ đề xuất `Asia/Ho_Chi_Minh`; sửa/rút trước khi có quyết định. Accept, Superseded các mục chờ còn lại và mở quyền chat được ghi nhất quán. |
| Ảnh | Pending Upload → Processing → Awaiting Redaction khi cần chỉnh → Ready. Rejected do nội dung, Expired do hết cửa sổ xác nhận, Failed do xử lý hạ tầng. Chốt phiên bản nguồn khi xác nhận. `202` mới nhận việc có Location; gửi lại sau khi chốt trả `200` với trạng thái hiện hành. Điều chỉnh che tạo bản xử lý mới. Ảnh công khai dùng bản đã che, loại EXIF/GPS, làm phẳng vùng che và gắn đúng tài nguyên. |
| Khiếu nại | Submitted → In Review → Decided. Chỉ quyết định Hide/Remove/Lock của chính chủ thể trong 7 ngày từ thông báo. Quyết định mới và thay đổi biện pháp ghi cùng nhau, bảo toàn quyết định trước. Kết quả chuyển cho người khiếu nại. Mục tiêu phản hồi 5 ngày làm việc. |

- Trường nhận dạng gồm danh mục, mô tả nhận dạng, thời gian, khu vực và ảnh liên quan bị khóa khi có claim/phản hồi Pending hoặc đã chấp nhận. Tác giả không thể đổi Lost/Found hay công khai lại bài đã ẩn/gỡ. Câu hỏi Found khóa ngay tại claim đầu tiên dù claim sau đó kết thúc. Update xác minh cùng phiên bản văn bản mà tác giả đã xem trước.
- Upload grant dùng khóa idempotency theo chủ thể, đích, mục đích và nội dung. Cùng khóa và cùng dữ liệu trong cửa sổ hiệu lực trả lượt cũ và hạn ban đầu; payload khác trả `409 UPLOAD_GRANT_CONFLICT`. Hết quyền ghi hoặc xác nhận, client đọc trạng thái trước khi xin lượt mới với khóa mới. Core chỉ chốt một phiên bản nguồn và một job. Worker đọc đúng phiên bản và kiểm dữ liệu thực tế trước khi tạo bản dẫn xuất. Tạm dùng `10 MB = 10.000.000 byte` cho ảnh bài, khác mức 10 MiB của bản đề xuất thực nghiệm. Quyền ghi và cửa sổ xác nhận được trả qua timestamp, độ dài chưa cam kết.
- Quyết định trưởng thành trên cùng bài hoặc cùng hồ sơ phải có một kết quả ghi thắng. Nếu phản hồi mất, client đọc lại tài nguyên trước khi thử quyết định lần nữa. Với cửa sổ quota được chứng minh, `Retry-After` trả số giây còn lại đến khi có thể thử lại. Core ghi thay đổi và sự kiện cần phát một cách bền vững trước khi gửi thông báo hoặc chạy tác vụ phụ.

## Mock API cho người triển khai

Yêu cầu Node.js 22 và Redocly CLI 2.82.0. Chạy từ thư mục gốc repo. Lệnh đầu dựng JSON từ hợp đồng đa tệp. Lệnh sau mở mock ở `http://127.0.0.1:4010/api/v1` và giữ terminal chạy. Dùng `Ctrl+C` để dừng. Chạy lại lệnh bundle và khởi động lại mock sau khi sửa OpenAPI.

```powershell
$mockSpec = Join-Path $env:TEMP 'lost-found-openapi-v1.mock.json'
npx.cmd --yes @redocly/cli@2.82.0 bundle docs/api/core/v1/openapi.yaml --output $mockSpec
node docs/api/core/v1/mock.mjs $mockSpec
```

Trên macOS/Linux, chạy `npx --yes @redocly/cli@2.82.0 bundle docs/api/core/v1/openapi.yaml --output /tmp/lost-found-openapi-v1.mock.json` rồi `node docs/api/core/v1/mock.mjs /tmp/lost-found-openapi-v1.mock.json`. Có thể truyền số cổng ở cuối lệnh Node nếu 4010 đang được dùng.

```powershell
$base = 'http://127.0.0.1:4010/api/v1'
curl.exe -i "$base/posts?limit=20"
curl.exe -i "$base/me/profile" -H 'Authorization: Bearer demo-core-session'
curl.exe -i "$base/me/profile"
curl.exe -i "$base/posts/item-123" -H 'Prefer: code=404'
```

Bốn lệnh lần lượt trả bảng tin `200`, hồ sơ mẫu `200`, lỗi thiếu Bearer `401` và lỗi bài không tồn tại `404`. Với một operation có lỗi khác trong hợp đồng, chọn bằng `Prefer: code=<mã HTTP>`. Dùng Bearer bất kỳ cho route cần xác thực, kể cả khi chọn một lỗi bằng `Prefer`.

Mock lấy path, phương thức, mã HTTP, kiểu nội dung và ví dụ từ hợp đồng v1. Phản hồi mặc định là ví dụ thành công. Mock hỗ trợ browser CORS trên loopback. Dữ liệu cố định nên kết quả ghi, lọc, phân trang và phân quyền thực tế phải được kiểm thử trên backend triển khai. Các URL ảnh, Valet Key và liên kết chia sẻ trong ví dụ là dữ liệu mẫu.

Khi mock đang chạy, mở [Swagger UI](http://127.0.0.1:4010/docs). Giao diện đọc bản OpenAPI tại `/openapi.json` và gửi **Try it out** tới mock cùng cổng. Để thử route có Bearer, chọn **Authorize** rồi nhập `demo-core-session`. Trình duyệt cần truy cập `unpkg.com` để tải Swagger UI 5.17.14. Cũng có thể nhập bản JSON đã bundle vào [Swagger Editor](https://editor-next.swagger.io/) để xem hoặc sửa đặc tả.

## Ví dụ tích hợp trên backend

1. **Bảng tin.** Gọi `GET /api/v1/posts?type=found&areaId=library&sort=newest&limit=20`. Mở `GET /api/v1/posts/{postId}` từ dòng trả về. Dùng `shareUrl` cho chia sẻ, hoặc lặp cùng truy vấn với `cursor=...` nếu có trang sau.
2. **Đăng bài Found có ảnh.** Lấy danh mục đang dùng với `GET /api/v1/categories?usage=creation`. Tạo bản nháp Found có danh mục, khu vực, thời gian, mô tả và hình thức bảo quản. Cấp upload tại `POST /api/v1/post-drafts/{draftId}/uploads` với Bearer và Idempotency-Key, POST form tới kho, gửi xác nhận rồi đọc trạng thái. Khi cần, cập nhật vùng che. Gắn ID ảnh Ready vào bản nháp, lưu 1–3 câu hỏi, lấy bản xem trước văn bản và xuất bản với `textReviewId` hợp lệ. Mở URL ở Location trong tư cách tác giả.
3. **Claim và chat.** Sau đăng nhập, người nhận gọi `getClaimQuestions` rồi `submitClaim`. Finder dùng `getClaim` và `decideClaim` với `{"decision":"approve"}`. Hai bên lấy ID hội thoại từ tương tác đã chấp nhận hoặc danh sách chat. Sau đó dùng `POST /api/v1/conversations/{conversationId}/messages` với `{"text":"Mình sẽ đến thư viện."}`.

## SEC/PERF và nghiệm thu

| Nguồn và trạng thái | Operation, tiêu chí kiểm | Đích kiểm chứng |
| --- | --- | --- |
| SEC-AUTH-001/002, SEC-PRF-001 đã xác nhận trong analysis thực nghiệm | Giữ phép kiểm 0.3.0 cho cấp phiên Google, hợp lệ/thu hồi phiên, hồ sơ và Mục của tôi. Với v1 dùng ràng buộc tương ứng về chủ thể và scope, kiểm hai tài khoản, một bên thứ ba, trang sau và tài nguyên media. | QA/Core/Mobile. Hạn phiên và cơ chế liên kết v1 thuộc quyết định riêng. |
| UC01–04/27/29 và catalog SEC-A04-04/05/06, SEC-A06-01/03, SEC-A07-01/02/03 · tham chiếu | Tạo tài khoản, cấp phiên, reset, đổi mật khẩu, khóa, khiếu nại. Dùng đồng hồ điều khiển kiểm 24 giờ, 30 phút, 3 lượt/15 phút, 5 lần sai liên tiếp/15 phút, 15 phút khóa. Kiểm dùng token một lần, header, no-store và Bearer giới hạn. | Identity/Core/QA, cấu hình TLS ở Gateway. |
| UC04/08/09/13/15–20/22–30 và SEC-A01-01/02, SEC-A08-05, SEC-A09-02/03 · tham chiếu | Schema riêng/công khai, đường ghi điều kiện, object-level authorization. Kiểm chủ thể khác qua ID/cursor/URL ảnh, Admin thiếu quyền, payload có trường ghi ngoài danh sách và audit quyết định. | Core/QA, lưu audit ở tầng dữ liệu. |
| UC05/06/09/23/24/25 và SEC-A01-02, SEC-A06-05, SEC-A08-01, SEC-A09-02, SEC-A10-06 · tham chiếu | Upload/confirm/status, che văn bản/ảnh, gợi ý câu hỏi. Kiểm sai quyền, sai phiên bản và checksum, lặp xác nhận, file quá giới hạn, AI lỗi và che thủ công, quyền đọc dữ liệu gốc. So dữ liệu đi qua biên AI và metadata ảnh công khai. | Media/Worker/Core/QA. |
| UC10/15–18/22/26/29/30 · bất biến PDF | Hai lượt quyết định đồng thời chỉ một lượt có hiệu lực. Kiểm đếm cửa sổ trượt, ràng buộc phạm vi báo cáo, nguồn gốc sự kiện, chat và audit. | Core/DB/QA, kiểm trên hệ thống triển khai. |
| PERF-AUTH-001, PERF-PRF-001 · đề xuất thực nghiệm | Đo luồng đã định trong analysis. Các mốc 3.000 ms/95% của hai hành trình phiên và 2.000 ms/95% của hồ sơ/trang danh sách là mục tiêu thực nghiệm, theo đúng điều kiện và mốc UI của analysis. Ngân sách API v1 chưa chốt. | Mobile/QA và Core đo đóng góp API riêng. |
| UC05–06/11–12/15–22/24/26/30 · phép đo v1 đề xuất | Đo latency p95, tỷ lệ lỗi, lưu lượng, truy vấn DB, thời gian upload và độ trễ xử lý sau nhận việc, tuổi job chờ và hoàn tất khiếu nại. Tách hành trình UI, phản hồi API và kết quả worker. Mục tiêu 5 ngày làm việc của UC30 tính từ lúc nhận khiếu nại. | QA/Vận hành xác định tải đại diện, tập mẫu, lịch làm việc và ngưỡng phép đo. |

## Chuyển từ hợp đồng 0.3.0

| Client hiện tại, path trong [0.3.0](openapi.json) | Hợp đồng v1, URL qua gateway | Khi tích hợp |
| --- | --- | --- |
| `POST /auth/sessions` · `createGoogleSession` | `POST /api/v1/auth/sessions` · `createPasswordSession` | Client email/mật khẩu dùng schema mới. Quyết định hỗ trợ Google, liên kết/chuyển định danh và cách chuyển phiên còn mở. |
| `POST /auth/sessions/current/validate` · `validateCurrentSession` | `GET /api/v1/auth/sessions/current` · `getCurrentSession` | Đổi phương thức và dùng credential của v1. |
| `DELETE /auth/sessions/current` · `revokeCurrentSession` | `DELETE /api/v1/auth/sessions/current` · `revokeCurrentSession` | Body rỗng khi thành công; đối chiếu thời điểm phiên bị thu hồi. |
| `GET /me/profile` · `getMyProfile` | `GET /api/v1/me/profile` · `getMyProfile` | So schema hồ sơ, profile chỉnh sửa và avatar theo quyền v1. |
| `GET /me/items?tab=lost/found/claims` · `listMyItems` | `GET /api/v1/me/posts?type=lost` hoặc `type=found`, `GET /api/v1/me/claims` | Client tách query và kiểu hàng, dùng cursor mới. Thêm `/api/v1/me/finder-responses` khi dùng luồng phản hồi. |
| `GET /health/ready` · `getCoreReadiness` | Probe theo hợp đồng vận hành 0.3.0 | CI và cấu hình probe tiếp tục theo baseline. |

Triển khai có thể phục vụ song song trong giai đoạn chuyển đổi. Chốt tương thích và mốc chuyển client bằng client fixture, kiểm đường dẫn gateway, theo dõi lưu lượng phiên bản cũ và giữ khả năng quay lại 0.3.0 cho nhóm thực nghiệm đến khi có lịch được duyệt.

## Quyết định còn mở

| Chủ trì | UC / operation chịu ảnh hưởng | Nội dung cần chốt |
| --- | --- | --- |
| Sản phẩm và Identity | UC01–04, UC27/29 · đăng ký, cấp phiên, đổi/reset mật khẩu, khiếu nại | Quy tắc chuẩn hóa/policy mật khẩu, TTL/thu hồi phiên khi đổi mật khẩu hoặc khóa. Chính sách gửi lại với tài khoản không tồn tại cần giữ phản hồi và hạn mức nhất quán để tránh dò tài khoản. Xác nhận cách cấp và thu hồi credential khiếu nại giới hạn, TTL, bằng chứng sở hữu và xử lý không có email truy cập được. |
| Posts, Media và Sản phẩm | UC04–06/09/17/23/24/29 · upload, xuất bản, sửa bài, bằng chứng | Xác nhận 10 MB theo hệ thập phân; quota, định dạng ảnh phụ/định dạng bằng chứng; thời hạn grant, xác nhận, preview, lưu dữ liệu gốc và quyền đọc ngoại lệ. Bàn giao đường xem ảnh gốc cho tác giả trong ranh giới riêng. Chốt làm sao tạo bản thủ công khi AI lỗi và kiểm bắt buộc trước công khai, đồng thời giữ nguyên quyền của đối tượng. |
| Sản phẩm và Posts/Claims | UC08–18 · danh sách riêng, tìm kiếm, quay vòng claim và xác nhận | Đặt lại bộ đếm “mới”, Q-11 và mốc lọc, múi giờ ngày quota, phần vòng đời claim chưa rõ, xử lý sau 72 giờ, hủy song phương và nguồn mở hồ sơ tranh chấp. |
| Sản phẩm, quản trị, vận hành | UC19/20/22/26/30 · report, hàng đợi, thông báo, khiếu nại | Định nghĩa báo cáo hợp lệ và luồng xử lý report tin nhắn, quyền audit, lưu bằng chứng, quy tắc email tổng hợp, lịch ngày làm việc và chính sách yêu cầu trùng khiếu nại. |
| Matching và Sản phẩm | UC21/25 · gợi ý và feedback | Tính điểm nếu thiếu ảnh, mapping danh mục tương ứng, làm mới/loại gợi ý khi bài đổi trạng thái và điều kiện dùng mẫu gợi ý. |

## Kết quả kiểm tra

- Sau khi tách v1 thành 116 tệp, bộ kiểm tra cục bộ đã đọc lại từng YAML, giải 933 liên kết `$ref` và xác nhận cấu trúc dựng lại bằng cấu trúc bản gốc sau khi chuẩn hóa đích tham chiếu. SHA-256 của bản gốc `openapi-v1.yaml` là `c0fae5d23c9f70f326cc89f2b1156cca43a66dab47a09b86bc0fb2f697c26a0d`.
- Sau rà soát Redocly, bổ sung mô tả cho 8 tag và khai báo thuộc tính trong các nhánh điều kiện của `MyPost` và `PublicPost`. So đối chiếu 160 tổ hợp dữ liệu với hai schema gốc cho cùng kết quả. Redocly CLI 2.82.0 bundle thành công, lint với cấu hình recommended trả 0 lỗi và 1 cảnh báo `info-license`. Repo chưa có giấy phép được xác nhận để khai báo tại `info.license`.
- YAML đọc và chuyển đổi lại đúng cấu trúc. AJV kiểm cấu trúc tài liệu theo [schema OpenAPI 3.1 ngày 2022-10-07](https://spec.openapis.org/oas/3.1/schema/2022-10-07). Trong phép kiểm độc lập, tham chiếu động `#meta` được trỏ trực tiếp tới cùng định nghĩa schema để tránh xung đột phạm vi khi AJV đánh giá tài liệu.
- Đối chiếu 96 operation trên 83 path, 30 UC theo cả hai chiều, 733 tham chiếu nội bộ và 642 lượt kiểm ví dụ request/response bằng JSON Schema 2020-12. Kiểm thêm 25 trường hợp biên, gồm công khai bài Hidden/Closed, thiếu dữ liệu Found, số câu hỏi, kích thước ảnh 10 MB, chat chỉ văn bản và quyết định khiếu nại.
- Kiểm URL có đúng một `/v1`, quyền Guest/Bearer/Admin, năm operation nhận Bearer giới hạn, tham số path, `401` có Bearer challenge ở operation cần phiên, `201/202` có Location hợp lệ, `204` rỗng và 504 response lỗi dùng chung schema `Problem`. SHA-256 xác nhận `openapi.json` 0.3.0 giữ đúng nội dung baseline.
- Repo hiện chưa có cấu hình Spectral áp dụng cho tệp v1. Các phép kiểm trên thực hiện ở mức đặc tả. Kiểm quyền trên dữ liệu thật, hành vi cạnh tranh, mốc theo đồng hồ, gateway, kho ảnh và worker chờ bản triển khai tích hợp với fixture tổng hợp.

Chạy từ gốc repo để tạo YAML một tệp dùng khi bàn giao và lint toàn bộ hợp đồng nguồn.

```powershell
npx.cmd --yes @redocly/cli bundle docs/api/core/v1/openapi.yaml --output (Join-Path $env:TEMP 'lost-found-openapi-v1.bundle.yaml')
npx.cmd --yes @redocly/cli lint docs/api/core/v1/openapi.yaml
```
