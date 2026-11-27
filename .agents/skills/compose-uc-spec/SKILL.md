---
name: compose-uc-spec
description: Soạn hoặc rà UC spec từ SRS, SEC/PERF và hợp đồng API. Viết luồng, truy vết SCN và bàn giao tài liệu UI có hình theo từng màn và trạng thái.
---

# Tổng hợp UC spec Lost & Found

## Xác định nguồn và phạm vi

Đọc SRS, analysis, API contract và ghi chú, quyết định đã duyệt, kiến trúc và tài nguyên giao diện liên quan. Ghim phiên bản theo [quy ước bàn giao](../../../docs/skill-workflow.md#mã-định-danh-và-phiên-bản). Xác định biến thể và phụ thuộc theo phạm vi đã chốt. Khi nguồn mâu thuẫn, chỉ rõ quyết định áp dụng hoặc người sở hữu cần giải quyết, kèm phần hành vi và SCN chịu ảnh hưởng. Mã đã có và run record là căn cứ đối chiếu triển khai hoặc trích quyết định được duyệt. Kết quả kiểm thử thuộc run record.

## Viết đặc tả

Cập nhật `docs/use-cases/<slug>.md` theo thứ tự sau:

1. **Mục tiêu, phạm vi và nguồn.** Nêu tác nhân, quyền, phần trong phạm vi, phần hoãn và phụ thuộc UC khác.
2. **Luồng chính (Main Flow), luồng thay thế (Alternative Flows) và luồng ngoại lệ (Exception Flows).** Tách ba mục riêng. Với mỗi hành trình chính, ghi trigger, tiền điều kiện, bước đánh số theo tác nhân/tầng và hậu điều kiện quan sát được. Mỗi nhánh chỉ rõ hành trình và bước rẽ, điều kiện, dữ liệu hoặc trạng thái sau xử lý, bước tiếp tục hay điểm kết thúc và SCN liên quan. Với yêu cầu đồng thời, chỉ rõ phản hồi còn được áp dụng theo ngữ cảnh nào. Khi một loại nhánh không áp dụng, ghi lý do.
3. **UI đi kèm.** Với UC có giao diện, bàn giao cả UC spec và tài liệu UI theo mục dưới. Đặt link trực tiếp đến neo hình tại từng bước hoặc nhánh mà người dùng nhìn thấy hoặc thao tác. Gắn từng trạng thái liên quan khi một bước có nhiều kết quả. Ghi điểm chuyển giao và quay lại đối với UI do bên thứ ba sở hữu.
4. **Bàn giao triển khai.** Nêu ranh giới Mobile/Core và tầng liên quan, quy tắc quyền, dữ liệu và trạng thái cần chung giữa các bên. Dẫn đến operation, schema và ví dụ trong phiên bản OpenAPI đã ghim. Ghi hành vi thuộc UI hoặc xử lý nội bộ và lý do. Giữ payload đầy đủ, chính sách và quyết định tại nguồn sở hữu.
5. **Kịch bản nghiệm thu và phần còn mở.** Giữ ID SCN đã có. Mỗi SCN ghi tác nhân, tiền điều kiện, hành động, kết quả quan sát được, operation hoặc tầng, REQ và quyết định, SEC/PERF liên quan và tiêu chí đạt. Luồng diễn giải hành vi, SCN mô tả cách kiểm, còn hợp đồng mang schema và ví dụ. Ghi phần nào đã đủ căn cứ triển khai hoặc thiết kế phép đo và phần còn cần quyết định hay điều kiện nghiệm thu.

## Tài liệu UI đi kèm

1. **Kiểm kê theo luồng và SCN.** Liệt kê mọi màn do ứng dụng sở hữu trong phạm vi và các trạng thái đổi nội dung, thao tác hoặc điều hướng. Dùng mã SCR đã có. Với trạng thái thuộc màn cha, dùng SCR của màn cha. Với màn hoặc đích thử nghiệm chưa có SCR, ghi rõ tình trạng và dùng neo theo vai trò. Dùng mockup SRS làm đầu vào thị giác và app hiện tại để đối chiếu triển khai. Khi có sai khác, dựng hình theo quyết định áp dụng và dẫn căn cứ. Khi thiếu quyết định, ghi phương án đang minh họa, người cần duyệt và bước hoặc SCN bị ảnh hưởng.
2. **Dựng và xuất hình.** Dùng dữ liệu mẫu và tái sử dụng hình đã khớp phạm vi. Ưu tiên frame chỉnh sửa được bằng skill Figma phù hợp. Xuất ảnh từ frame, nhúng vào Markdown và dẫn tới đúng node Figma. Dựng và xuất hình cục bộ khi người dùng chọn phương án này hoặc khi Figma không khả dụng. Ghi nguồn, cách tạo hình và giới hạn so với app chạy thật. Có thể nhúng cùng tệp ảnh cho trạng thái dùng chung giữa các UC.
3. **Đặt tên và phiên bản.** Đặt tài liệu tại `docs/use-cases/<slug>-ui.md`. Giữ tên tài liệu khi sửa và tăng số phiên bản UI khi thay đổi nội dung hoặc ảnh. Ghi số phiên bản và trạng thái duyệt trên tài liệu UI, rồi ghi đúng phiên bản kèm link trong UC spec. Ghim nguồn theo quy ước dự án. Lưu ảnh trong `docs/use-cases/ui/<uc-id>/`, đặt tên theo neo.
4. **Neo và chú thích.** Đặt neo ASCII ổn định ngay trước tiêu đề hình, ví dụ `<a name="scr-03-found-empty"></a>`. Link từ luồng dùng `<slug>-ui.md#scr-03-found-empty`. Giữ neo qua các bản sửa khi ý nghĩa trạng thái giữ nguyên. Mỗi mục ghi mã SCR, tên trạng thái, ảnh nhúng, nội dung hoặc hành động chính và điểm cần duyệt nếu có. Dẫn ngược về UC spec và ghi bước hoặc SCN liên quan để rà hai chiều.
5. **Trình duyệt.** Ghi **Chờ duyệt** trên UC spec và tài liệu UI mới hoặc vừa sửa. Chỉ ghi **Đã duyệt** khi người dùng xác nhận phiên bản, rồi ghi ngày và phạm vi xác nhận. Ghi riêng giới hạn kiểm chứng và những quyết định còn mở.

## Kiểm trước khi bàn giao

- Rà hai chiều từ luồng và REQ/SEC/PERF tới SCN, operation hoặc tầng thực thi, rồi từ từng SCN trở về căn cứ. Mở contract thực tế để kiểm ID, quyền, schema và kết quả. Kiểm điểm rẽ và hậu điều kiện có nhất quán với bảng SCN.
- Với UC có UI, mở tài liệu để kiểm ảnh thực sự hiển thị và đọc được. Kiểm đường dẫn tương đối, neo duy nhất, đích từng link từ bước hoặc nhánh, link ngược và node Figma nếu có. Đối chiếu nội dung, thao tác và trạng thái trong từng hình với luồng, SCN, hợp đồng cùng quyết định áp dụng.
- Bàn giao link hai tài liệu, phiên bản spec hoàn thiện, SCN sẵn sàng hoặc còn vướng, suite hoặc mã cần đối chiếu, điểm cần duyệt và giới hạn kiểm chứng. Cập nhật tham chiếu đầu vào đang dùng sau khi xác nhận tương thích. Giữ phiên bản nguồn đã khóa trong run record và bằng chứng cũ.
