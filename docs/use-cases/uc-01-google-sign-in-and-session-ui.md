# UI UC-01 · Đăng nhập Google và quản lý phiên

**UI v2 · Chờ duyệt** · 2026-11-22 · [UC spec](uc-01-google-sign-in-and-session.md)

Ảnh PNG minh họa được dựng bằng HTML/CSS và xuất cục bộ ở khung 390 × 760 bằng Chromium. Dữ liệu và thông tin hệ thống là mẫu. [Bản dựng cục bộ](ui/essential-preview.html) có từng trạng thái để đối chiếu. Bộ này phục vụ duyệt thiết kế và luồng. Nghiệm thu hiển thị native và hành vi trên thiết bị thuộc các SCN của UC.

- [Mockup và bảng SCR ở SRS trang 2](../requirements/lost-and-found-srs.pdf#page=2) làm căn cứ cho vùng thương hiệu, trạng thái chờ, điều khoản và đăng nhập lại. [SRS trang 3](../requirements/lost-and-found-srs.pdf#page=3) làm căn cứ cho hộp thoại đăng xuất. Câu chữ ERR-A1–A4 theo [SRS trang 10](../requirements/lost-and-found-srs.pdf#page=10).
- Thứ tự điều khoản sau Google và trước Core, cờ theo bản cài, xử lý khôi phục và thu hồi theo [GAP-AUTH-001–004](../requirements/analysis/uc-01-02.md#uc-01--đăng-nhập-và-quản-lý-phiên) và [bundle UC-01 đã duyệt](../operations/runs/uc-01-essential.json#L129). Phiên bản nguồn được ghim tại [UC spec](uc-01-google-sign-in-and-session.md#nguồn).
- Bố cục và thông báo được đối chiếu với [App.tsx](../../apps/mobile/App.tsx), [auth-flow.ts](../../apps/mobile/src/auth-flow.ts) và [auth-platform.tsx](../../apps/mobile/src/auth-platform.tsx). Hình điều khoản dùng hai liên kết như app hiện tại, còn mockup SRS có thêm khối tài khoản Google và phần nội dung hai chính sách. Nội dung, URL và cách trình bày chính sách thật nằm trong [điểm cần duyệt](#điểm-cần-duyệt).

Xem nhanh [Đăng nhập](#scr-01-ready), [Điều khoản](#scr-01-consent), [lỗi đăng nhập](#scr-01-err-a1), [khôi phục phiên](#scr-01-restoring), [Đăng nhập lại](#scr-01-session-expired), [Xác nhận đăng xuất](#scr-04-confirm) và [điểm cần duyệt](#điểm-cần-duyệt).

## Đăng nhập và cấp phiên

<a name="scr-01-ready"></a>

### SCR-01 · Đăng nhập

![SCR-01 · Đăng nhập](ui/uc-01/scr-01-ready.png)

Có nút **Đăng nhập bằng Google** và hai liên kết chính sách. Hình nút minh họa vị trí và trạng thái thao tác. Bản native dùng nút của SDK. Đối chiếu [luồng chính](uc-01-google-sign-in-and-session.md#giao-dien-main), [luồng thay thế](uc-01-google-sign-in-and-session.md#giao-dien-alt), [luồng ngoại lệ](uc-01-google-sign-in-and-session.md#giao-dien-error) và SCN-AUTH-01–03/17/19 và SCN-PRF-15.

<a name="scr-01-selecting"></a>

### SCR-01 · Đang mở trình chọn Google

![SCR-01 · Đang mở trình chọn Google](ui/uc-01/scr-01-selecting.png)

App khóa nút Google trong lúc chuyển giao. Google SDK sở hữu trình chọn từ thao tác bấm nút đến khi trả tài khoản hoặc kết quả hủy. Hủy trở lại Đăng nhập, còn có token thì sang điều khoản hoặc chờ Core. Đối chiếu [luồng chính](uc-01-google-sign-in-and-session.md#giao-dien-main), [luồng thay thế](uc-01-google-sign-in-and-session.md#giao-dien-alt) và SCN-AUTH-02/03/06/19.

<a name="scr-01-consent"></a>

### SCR-01 · Xác nhận điều khoản và quyền riêng tư

![SCR-01 · Xác nhận điều khoản và quyền riêng tư](ui/uc-01/scr-01-consent.png)

Trạng thái trong luồng SCR-01, chưa có mã SCR riêng. Hai liên kết để đọc chính sách. **Đồng ý và tiếp tục** chuyển sang cấp phiên. **Từ chối** trở về Đăng nhập. Cờ bản cài được ghi sau khi cấp và lưu phiên thành công. Đối chiếu [luồng chính](uc-01-google-sign-in-and-session.md#giao-dien-main), [luồng thay thế](uc-01-google-sign-in-and-session.md#giao-dien-alt) và SCN-AUTH-03/21.

<a name="scr-01-issuing"></a>

### SCR-01 · Đang xác thực với Core

![SCR-01 · Đang xác thực với Core](ui/uc-01/scr-01-issuing.png)

Nút Google tạm khóa và có chỉ báo chờ. **Chọn tài khoản khác** bỏ lượt đang chờ trước lúc ghi kho phiên, rồi mở lại luồng từ Đăng nhập. Kết quả lượt cũ bị bỏ. Đối chiếu [luồng chính](uc-01-google-sign-in-and-session.md#giao-dien-main), [luồng thay thế](uc-01-google-sign-in-and-session.md#giao-dien-alt), [luồng ngoại lệ](uc-01-google-sign-in-and-session.md#giao-dien-error) và SCN-AUTH-04/07/09/10/21.

<a name="app-home"></a>

### Trang chính · Chưa gán SCR · Vào ứng dụng

![Trang chính · Chưa gán SCR · Vào ứng dụng](ui/uc-01/app-home.png)

**Hồ sơ** mở SCR-02. Bố cục minh họa lối vào Essential. App hiện tại có thêm nút **Đăng xuất** ở Trang chính. Phương án trình duyệt dùng lối đăng xuất qua Hồ sơ, theo điểm kích hoạt SCR-04 của SCN-AUTH-15. Đối chiếu [luồng chính](uc-01-google-sign-in-and-session.md#giao-dien-main) và SCN-AUTH-04/11 và SCN-PRF-03/16.


## Lỗi đăng nhập và liên kết

<a name="scr-01-err-a1"></a>

### SCR-01 · ERR-A1 · Mất kết nối

![SCR-01 · ERR-A1 · Mất kết nối](ui/uc-01/scr-01-err-a1.png)

**Thử lại** mở lại Google khi lỗi xảy ra trước khi có token. Nếu đã có lượt cấp phiên, thử lại lượt đó khi còn hợp lệ. Đối chiếu [luồng ngoại lệ](uc-01-google-sign-in-and-session.md#giao-dien-error) và SCN-AUTH-06/07/09.

<a name="scr-01-err-a2"></a>

### SCR-01 · ERR-A2 · Google tạm lỗi

![SCR-01 · ERR-A2 · Google tạm lỗi](ui/uc-01/scr-01-err-a2.png)

**Thử lại** mở Google. Core chưa nhận yêu cầu cấp phiên. Đối chiếu [luồng ngoại lệ](uc-01-google-sign-in-and-session.md#giao-dien-error) và SCN-AUTH-06.

<a name="scr-01-err-a3"></a>

### SCR-01 · ERR-A3 · Core tạm lỗi hoặc timeout

![SCR-01 · ERR-A3 · Core tạm lỗi hoặc timeout](ui/uc-01/scr-01-err-a3.png)

**Thử lại** gửi lại lượt cấp còn hợp lệ. Mở Google từ nút đăng nhập để bắt đầu lượt mới. Đối chiếu [luồng ngoại lệ](uc-01-google-sign-in-and-session.md#giao-dien-error) và SCN-AUTH-07/09.

<a name="scr-01-err-a4"></a>

### SCR-01 · ERR-A4 · Cần chọn lại tài khoản

![SCR-01 · ERR-A4 · Cần chọn lại tài khoản](ui/uc-01/scr-01-err-a4.png)

**Thử lại** trở lại trình chọn và tạo lượt mới nếu người dùng chọn tài khoản. App hiện dùng cùng thông báo cho token bị từ chối và các lỗi cấp cần chọn lại. Đối chiếu [luồng ngoại lệ](uc-01-google-sign-in-and-session.md#giao-dien-error) và SCN-AUTH-08/10.

<a name="scr-01-policy-unconfigured"></a>

### SCR-01 · Cảnh báo liên kết chưa sẵn sàng

![SCR-01 · Cảnh báo liên kết chưa sẵn sàng](ui/uc-01/scr-01-policy-unconfigured.png)

Minh họa trên Đăng nhập. Cảnh báo tương tự áp dụng khi bấm một trong hai liên kết ở màn điều khoản nếu URL môi trường chưa sẵn sàng. **OK** đóng cảnh báo. Đối chiếu [luồng thay thế](uc-01-google-sign-in-and-session.md#giao-dien-alt), [luồng ngoại lệ](uc-01-google-sign-in-and-session.md#giao-dien-error) và SCN-AUTH-01/03/19.

<a name="scr-01-policy-error"></a>

### SCR-01 · Cảnh báo không mở được liên kết

![SCR-01 · Cảnh báo không mở được liên kết](ui/uc-01/scr-01-policy-error.png)

Minh họa trên màn điều khoản. Cảnh báo tương tự áp dụng ở Đăng nhập nếu hệ điều hành báo không mở được URL. **OK** trở lại màn nguồn. Đối chiếu [luồng thay thế](uc-01-google-sign-in-and-session.md#giao-dien-alt), [luồng ngoại lệ](uc-01-google-sign-in-and-session.md#giao-dien-error) và SCN-AUTH-01/03/19.


## Khôi phục và dọn phiên

<a name="scr-01-restoring"></a>

### SCR-01 · Đang xác minh phiên đã lưu

![SCR-01 · Đang xác minh phiên đã lưu](ui/uc-01/scr-01-restoring.png)

Trạng thái mở nguội trong lúc đọc kho và xác minh. Vùng cá nhân ẩn trước kết quả xác minh. Đối chiếu [luồng chính](uc-01-google-sign-in-and-session.md#giao-dien-main), [luồng ngoại lệ](uc-01-google-sign-in-and-session.md#giao-dien-error) và SCN-AUTH-11/12/21.

<a name="scr-01-restore-offline"></a>

### SCR-01 · Khôi phục phiên · Mất mạng

![SCR-01 · Khôi phục phiên · Mất mạng](ui/uc-01/scr-01-restore-offline.png)

Giữ mã phiên đã lưu và ẩn vùng cá nhân. **Thử lại** xác minh phiên đã lưu. Đối chiếu [luồng ngoại lệ](uc-01-google-sign-in-and-session.md#giao-dien-error) và SCN-AUTH-12.

<a name="scr-01-restore-error"></a>

### SCR-01 · Khôi phục phiên · Core tạm lỗi

![SCR-01 · Khôi phục phiên · Core tạm lỗi](ui/uc-01/scr-01-restore-error.png)

Giữ mã phiên đã lưu khi Core tạm lỗi hoặc timeout. **Thử lại** xác minh phiên đã lưu. Đối chiếu [luồng ngoại lệ](uc-01-google-sign-in-and-session.md#giao-dien-error) và SCN-AUTH-12.

<a name="scr-01-session-expired"></a>

### SCR-01 · Yêu cầu đăng nhập lại

![SCR-01 · Yêu cầu đăng nhập lại](ui/uc-01/scr-01-session-expired.png)

Màn đã dọn hiển thị thông báo hết phiên và lối đăng nhập Google. Mốc FR-AUTH-10 tính từ lúc phát hiện mất phiên. Đối chiếu [luồng ngoại lệ](uc-01-google-sign-in-and-session.md#giao-dien-error) và SCN-AUTH-13/21 và SCN-PRF-12/15.

<a name="scr-04-confirm"></a>

### SCR-04 · Xác nhận đăng xuất

![SCR-04 · Xác nhận đăng xuất](ui/uc-01/scr-04-confirm.png)

Hộp thoại phủ SCR-02 với phần Mục của tôi theo [bố cục UC-02 v2](uc-02-profile-and-my-items-ui.md#scr-02-ready). **Huỷ** đóng hộp thoại và giữ tab hiện hành. **Đăng xuất** dọn thiết bị này. Dòng mô tả về thiết bị khác lấy từ mockup và phù hợp GAP-AUTH-004. Đối chiếu [luồng chính](uc-01-google-sign-in-and-session.md#giao-dien-main), [luồng thay thế](uc-01-google-sign-in-and-session.md#giao-dien-alt) và SCN-AUTH-15–17 và SCN-PRF-15.

<a name="scr-01-clearing"></a>

### SCR-01 · Đang dọn phiên

![SCR-01 · Đang dọn phiên](ui/uc-01/scr-01-clearing.png)

Chỉ báo chờ trong lúc dọn. Vùng cá nhân đã ẩn và Quay lại bị chặn ở trạng thái chờ này. Đối chiếu [luồng chính](uc-01-google-sign-in-and-session.md#giao-dien-main), [luồng ngoại lệ](uc-01-google-sign-in-and-session.md#giao-dien-error) và SCN-AUTH-13/16/17/21 và SCN-PRF-15.

<a name="scr-01-local-logout"></a>

### SCR-01 · Đăng xuất cục bộ, chờ xác nhận thu hồi

![SCR-01 · Đăng xuất cục bộ, chờ xác nhận thu hồi](ui/uc-01/scr-01-local-logout.png)

Thông báo xác nhận việc đăng xuất trên thiết bị này. Nếu nhận được xác nhận thu hồi trước khi sang lượt mới, Mobile trở về hình Đăng nhập sạch. Đối chiếu [luồng ngoại lệ](uc-01-google-sign-in-and-session.md#giao-dien-error) và SCN-AUTH-17 và SCN-PRF-15.

<a name="scr-01-storage-error"></a>

### SCR-01 · Kho phiên chưa dọn được

![SCR-01 · Kho phiên chưa dọn được](ui/uc-01/scr-01-storage-error.png)

Phương án theo app hiện tại. Vùng cá nhân ẩn và **Thử lại** tiếp tục dọn kho phiên. Sau khi dọn được, kết quả phụ thuộc luồng đã kích hoạt. Đối chiếu [luồng ngoại lệ](uc-01-google-sign-in-and-session.md#giao-dien-error) và SCN-AUTH-04/13/16/17.

<a name="scr-01-save-error"></a>

### SCR-01 · Lưu phiên thất bại, đã dọn cục bộ

![SCR-01 · Lưu phiên thất bại, đã dọn cục bộ](ui/uc-01/scr-01-save-error.png)

Phương án theo app hiện tại. Khi dọn được sau lỗi lưu, khách về Đăng nhập với thông báo và có thể mở Google lại. Đối chiếu [luồng ngoại lệ](uc-01-google-sign-in-and-session.md#giao-dien-error) và SCN-AUTH-04.


## Điểm cần duyệt

- **Điều khoản.** Sản phẩm chốt URL HTTPS thật, hành vi khi nội dung đổi, nhu cầu lưu bằng chứng và có cần đưa khối tài khoản hoặc nội dung chính sách vào màn xác nhận như mockup. Ảnh hiện theo bố cục hai liên kết của app. Ảnh hưởng bước Đăng nhập 1/3, nhánh mở liên kết và SCN-AUTH-01/03/19/21. PR-02 còn chờ cách tính thời gian đọc và đồng ý.
- **Lối đăng xuất và lỗi kho phiên.** Xác nhận bố cục Essential chỉ dẫn đăng xuất qua Hồ sơ, hoặc giữ thêm lối đang có trên Trang chính. Xác nhận dùng cách xử lý lỗi ghi/dọn kho ở app hiện tại làm yêu cầu nghiệm thu. Ảnh hưởng bước Đăng nhập 5, bước Đăng xuất 1–3 và SCN-AUTH-04/13/15–17.
- Các quyết định về dữ liệu Google thật, thiết bị, thời hạn phiên sản phẩm, hạn mức và điều kiện đo nằm ở [phần còn mở của UC spec](uc-01-google-sign-in-and-session.md#khác-biệt-giữa-nguồn-và-tiêu-chí-còn-mở).
