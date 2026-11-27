# Phạm vi triển khai Core API

Hợp đồng REST hiện hành để đối chiếu là [OpenAPI v1.0.0](../api/core/v1/openapi.yaml), với đường dẫn gốc `/api/v1`. Các use case dưới đây là phạm vi thiết kế. Với mỗi đợt, ghi các UC đã được xác nhận, phiên bản đặc tả, quyết định nghiệp vụ và kịch bản nghiệm thu tương ứng trước khi triển khai.

## Thứ tự bàn giao dự kiến

- Sprint 1. Đầu sprint chốt UC01–04 và email xác thực/bảo mật liên quan UC20. Giữa sprint chốt UC08 và UC11–14. Cuối sprint chuẩn bị UC05–07, UC09 và UC23–24 cho đợt đăng bài.
- Sprint 2. Đầu sprint chốt UC15–19 và phần lịch sử tương tác UC08. Giữa sprint chốt UC10 và thông báo hoạt động UC20. Cuối sprint chuẩn bị UC22 và UC26–30 cho đợt quản trị.
- Sprint 3. Chốt UC21 và UC25 trước tích hợp, rồi rà các luồng cần nghiệm thu.

## Đối chiếu trước khi triển khai

- UC01–04, UC27 và UC29. Chốt phương thức đăng nhập v1, chuẩn hóa email, chính sách mật khẩu, thời hạn và thu hồi phiên, credential giới hạn cho khiếu nại.
- UC05–06, UC09, UC12 và UC21. Chốt mức chi tiết vị trí, cách lọc và dữ liệu vị trí công khai. Baseline mô tả `areaId`.
- UC05–09, UC17, UC23–24 và UC29. Chốt hạn upload/xác nhận, định dạng/tối đa cho từng mục đích, điều kiện công bố revision và quyền truy cập bản gốc.
- UC10 và UC15–19. Chốt cửa sổ quota, thời điểm xử lý tương tác chờ, điều kiện hủy/xác nhận muộn và lỗi khi trạng thái thay đổi giữa hai thao tác. Baseline chat là REST. Đặc tả kênh realtime cần nghiệm thu riêng khi vào phạm vi.
- UC20, UC22 và UC26–30. Chốt điều kiện gửi thông báo, quy tắc báo cáo hợp lệ, quyền audit, lưu bằng chứng và lịch ngày làm việc.
- UC21 và UC25. Chốt điều kiện tạo, làm mới và loại đề xuất, cách chấm điểm khi thiếu ảnh và trường hợp dùng câu hỏi mẫu.

Xem [quy tắc nghiệp vụ](domain-rules.md) và [tiêu chí nghiệm thu](acceptance-tests.md) cho từng cụm. Khi chốt một thay đổi, cập nhật operation, schema, ví dụ và ánh xạ `x-use-cases` liên quan cùng nhau.

## Ánh xạ UC sang operationId

Tra ngược mỗi operation qua `x-use-cases` trong đặc tả. Một operation có thể phục vụ nhiều UC.

| Use case | Operation |
| --- | --- |
| UC01 · Register Account | `registerAccount`, `verifyAccountEmail`, `requestVerificationEmail`, `getEmailRequestStatus` |
| UC02 · Login | `createPasswordSession`, `getCurrentSession`, `revokeCurrentSession`, `moderateAccount` |
| UC03 · Reset Password | `requestPasswordReset`, `getEmailRequestStatus`, `resetPassword` |
| UC04 · Manage Personal Profile | `getMyProfile`, `updateMyProfile`, `changeMyPassword`, `createAuxiliaryUpload`, `confirmUpload`, `getUploadStatus` |
| UC05 · Create Lost Post | `createPostDraft`, `getMyPostDraft`, `updatePostDraft`, `publishPostDraft`, `createDraftTextRedactionReview`, `getDraftTextRedactionReview`, `setDraftManualRedaction`, `getDraftOriginalText`, `createDraftPhotoUpload`, `confirmUpload`, `getUploadStatus`, `listCategories` |
| UC06 · Create Found Post | `createPostDraft`, `getMyPostDraft`, `updatePostDraft`, `publishPostDraft`, `setDraftVerificationQuestions`, `createDraftTextRedactionReview`, `getDraftTextRedactionReview`, `setDraftManualRedaction`, `getDraftOriginalText`, `createDraftPhotoUpload`, `confirmUpload`, `getUploadStatus`, `listCategories` |
| UC07 · Set Verification Questions | `getMyPostDraft`, `publishPostDraft`, `setDraftVerificationQuestions`, `replacePostVerificationQuestions`, `getPostVerificationQuestions`, `updatePost`, `getClaimQuestions`, `suggestVerificationQuestions` |
| UC08 · View My Posts | `listMyPosts`, `getMyPost`, `listMyPostInteractionHistory` |
| UC09 · Edit Post | `replacePostVerificationQuestions`, `getPostVerificationQuestions`, `updatePost`, `createPostTextRedactionReview`, `getPostTextRedactionReview`, `setPostManualRedaction`, `getPostOriginalText`, `createPostPhotoUpload`, `confirmUpload`, `getUploadStatus` |
| UC10 · Close Post | `closePost`, `reopenPost`, `getReturnRequest`, `confirmPostReturn`, `setMyReturnCancellation`, `listMyNotifications`, `listPendingReturnReviews` |
| UC11 · View News Feed | `listPublicPosts` |
| UC12 · Search and Filter Posts | `listPublicPosts`, `listCategories` |
| UC13 · View Post Detail | `getPublicPost` |
| UC14 · Share Post | `getPublicPost` |
| UC15 · Submit Claim | `getClaimQuestions`, `submitClaim`, `listMyClaims`, `getClaim`, `withdrawClaim`, `resubmitClaimAnswers` |
| UC16 · Review Claim | `listPostClaims`, `listMyClaims`, `getClaim`, `decideClaim` |
| UC17 · Respond to Lost Post | `submitFinderResponse`, `listMyFinderResponses`, `getFinderResponse`, `updateFinderResponse`, `withdrawFinderResponse`, `createAuxiliaryUpload`, `confirmUpload`, `getUploadStatus` |
| UC18 · Review Finder Response | `listFinderResponses`, `getFinderResponse`, `decideFinderResponse` |
| UC19 · Chat with Counterpart | `decideClaim`, `decideFinderResponse`, `listConversations`, `getConversation`, `listMessages`, `sendMessage`, `getMessage`, `reportMessage`, `getMyReportReceipt` |
| UC20 · View Notifications | `decideClaim`, `decideFinderResponse`, `sendMessage`, `listMyNotifications`, `setNotificationReadState`, `getNotificationPreferences`, `updateNotificationPreferences`, `decideModerationAppeal` |
| UC21 · Generate and View AI Match Suggestions | `publishPostDraft`, `updatePost`, `listMyNotifications`, `listMatchSuggestions`, `setMatchFeedback` |
| UC22 · Report Post | `listMyNotifications`, `reportPost`, `getMyReportReceipt`, `decideReportedPost` |
| UC23 · Mask Sensitive Text | `publishPostDraft`, `updatePost`, `createDraftTextRedactionReview`, `getDraftTextRedactionReview`, `setDraftManualRedaction`, `getDraftOriginalText`, `createPostTextRedactionReview`, `getPostTextRedactionReview`, `setPostManualRedaction`, `getPostOriginalText` |
| UC24 · Mask Sensitive Image Regions | `publishPostDraft`, `updatePost`, `createDraftPhotoUpload`, `createPostPhotoUpload`, `confirmUpload`, `getUploadStatus`, `setPhotoRedactionRegions` |
| UC25 · Suggest Verification Questions | `suggestVerificationQuestions` |
| UC26 · Review Reported Post | `listMyNotifications`, `reportPost`, `listReportedPosts`, `getReportedPostCase`, `decideReportedPost`, `getReportedPostDecision`, `moderateAccount` |
| UC27 · Manage User Accounts | `listAdminAccounts`, `listAccountViolations`, `moderateAccount`, `getAccountModerationAction` |
| UC28 · Manage Item Categories | `listCategories`, `createCategory`, `getAdminCategory`, `updateCategory`, `confirmCategoryMapping` |
| UC29 · Submit Moderation Appeal | `createAuxiliaryUpload`, `createAppealEvidenceUpload`, `confirmUpload`, `getUploadStatus`, `exchangeAppealCredential`, `submitModerationAppeal`, `getMyModerationAppeal` |
| UC30 · Review Moderation Appeal | `listMyNotifications`, `getReportedPostDecision`, `listAccountViolations`, `getAccountModerationAction`, `submitModerationAppeal`, `getMyModerationAppeal`, `listModerationAppeals`, `getModerationAppeal`, `decideModerationAppeal`, `getModerationAppealDecision` |
