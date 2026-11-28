# UC‑03 · Giao diện đặt lại mật khẩu

**UI 0.1 · Chờ duyệt**

Áp dụng [hướng dẫn UI Lost & Found 0.2 · Chờ duyệt](../design/ui-guidelines.md) và [đặc tả UC03 0.1](uc-03.md). Chưa tìm thấy SCR ID trong phạm vi này. Các trạng thái dùng chung màn cha và có neo ASCII riêng.

Bộ hình dùng SVG chỉnh sửa được tại repo, tỉ lệ 390 × 760, phông Inter và dự phòng theo hướng dẫn. Bố cục xác thực dùng mẫu đầu trang xanh, biểu mẫu một cột và kích thước điều khiển của UC01. Hộp thư ngoài ứng dụng là khung minh họa với dữ liệu giả định. Cần kiểm trên thiết bị về điều hướng từ email, bàn phím, cỡ chữ động, trình đọc màn hình và thời gian chờ.

## Kịch bản UX

- **Gửi lần đầu.** [Đăng nhập](#diem-vao-dang-nhap) → [yêu cầu đặt lại](#yeu-cau) → [đang gửi](#yeu-cau-dang-gui) → [kiểm tra email](#kiem-tra-email) khi nhận 202. Nếu dữ liệu sai, dùng [email cần kiểm tra](#email-can-sua). Khi gián đoạn hoặc chưa nhận phản hồi, dùng [thử lại yêu cầu](#thu-lai-yeu-cau). Nếu nhận 429, dùng [chờ gửi lại](#cho-gui-lai).
- **Gửi lại.** Từ kiểm tra email, chọn Gửi lại email → [đang gửi lại](#dang-gui-lai) → quay về kiểm tra email khi nhận 202. Dùng cùng trạng thái sửa hoặc thử lại khi gặp lỗi tương ứng. Khi có 429, hiện thời gian chờ cho địa chỉ đang dùng. Sau khi hết chờ, thao tác gửi khả dụng trở lại theo ngữ cảnh gửi hiện hành.
- **Mở thư và hoàn tất.** [Ứng dụng email](#mo-thu) → [mật khẩu mới](#mat-khau-moi) → [đang đặt lại](#mat-khau-moi-dang-gui) → [thành công](#dat-lai-thanh-cong) sau 204 → [đăng nhập UC02](uc-02-ui.md#dang-nhap). Nếu nhận 410, dùng [liên kết không còn hiệu lực](#lien-ket-khong-hieu-luc) và cho tạo yêu cầu mới. Với dữ liệu sai hoặc link thiếu token đọc được, dùng [dữ liệu đặt lại cần kiểm tra](#du-lieu-dat-lai-khong-hop-le). Dùng [chưa xác nhận được kết quả](#chua-ro-ket-qua) khi có 503 hoặc mất kết nối.
- **Cần duyệt Q1 và Q2.** Điểm vào từ UC02 và đích mở link về Mobile là phương án đề xuất. Hộp thư mẫu chỉ mô tả điểm chuyển giao. Nhóm sản phẩm, Mobile và hạ tầng xác nhận điểm vào, link và thiết bị. Câu chữ chỉ dẫn mật khẩu sẽ được hoàn thiện theo chính sách được duyệt. [Quyết định còn mở](uc-03.md#diem-can-duyet)

## Minh họa

<a name="diem-vao-dang-nhap"></a>
### Điểm vào từ đăng nhập

![Điểm vào từ đăng nhập](ui/uc-03/diem-vao-dang-nhap.svg)

**SCR ID chưa được cấp.** Liên quan M1, Q1. Đề xuất thêm “Đặt lại mật khẩu” trên màn UC02. Khi mở biểu mẫu, không mang theo mật khẩu từ màn đăng nhập. [SCN‑UC03‑01](uc-03.md#scn-uc03-01).

<a name="yeu-cau"></a>
### Yêu cầu đặt lại mật khẩu

![Yêu cầu đặt lại mật khẩu](ui/uc-03/yeu-cau.svg)

**SCR ID chưa được cấp.** Màn cha Yêu cầu đặt lại. Liên quan M1, E1. Nhập email đã đăng ký và chọn “Gửi yêu cầu”. Có thể quay lại UC02. [SCN‑UC03‑01](uc-03.md#scn-uc03-01).

<a name="yeu-cau-dang-gui"></a>
### Đang gửi yêu cầu

![Đang gửi yêu cầu](ui/uc-03/yeu-cau-dang-gui.svg)

**SCR ID chưa được cấp.** Màn cha Yêu cầu đặt lại. Liên quan M1. Giữ giá trị email và chặn gửi lặp cho đến khi nhận kết quả còn hiện hành. [SCN‑UC03‑01](uc-03.md#scn-uc03-01) · [SCN‑UC03‑06](uc-03.md#scn-uc03-06).

<a name="email-can-sua"></a>
### Email cần kiểm tra

![Email cần kiểm tra](ui/uc-03/email-can-sua.svg)

**SCR ID chưa được cấp.** Màn cha Yêu cầu đặt lại. Liên quan E4. Ví dụ lỗi cú pháp có thể xác định tại trường. Với 400 chung, hiện thông báo gần nút gửi và cho kiểm tra email. [SCN‑UC03‑06](uc-03.md#scn-uc03-06).

<a name="thu-lai-yeu-cau"></a>
### Chưa nhận được kết quả gửi

![Chưa nhận được kết quả gửi](ui/uc-03/thu-lai-yeu-cau.svg)

**SCR ID chưa được cấp.** Màn cha Yêu cầu đặt lại. Liên quan E5. Dùng khi gửi lần đầu hoặc gửi lại không nhận được kết quả, hay khi API tạm gián đoạn. Cho thử lại hoặc sửa email. [SCN‑UC03‑06](uc-03.md#scn-uc03-06).

<a name="kiem-tra-email"></a>
### Kiểm tra email

![Kiểm tra email](ui/uc-03/kiem-tra-email.svg)

**SCR ID chưa được cấp.** Màn cha Kiểm tra email. Liên quan M2, A2, E3. Dùng cùng nội dung cho mọi biên nhận 202. Khách có thể kiểm hộp thư ngoài ứng dụng, gửi lại hoặc quay về đăng nhập. [SCN‑UC03‑01](uc-03.md#scn-uc03-01) · [SCN‑UC03‑05](uc-03.md#scn-uc03-05).

<a name="dang-gui-lai"></a>
### Đang gửi lại email

![Đang gửi lại email](ui/uc-03/dang-gui-lai.svg)

**SCR ID chưa được cấp.** Màn cha Kiểm tra email. Liên quan A1. Giữ hướng dẫn kiểm tra hộp thư và vô hiệu nút gửi lại trong khi chờ. [SCN‑UC03‑04](uc-03.md#scn-uc03-04) · [SCN‑UC03‑06](uc-03.md#scn-uc03-06).

<a name="cho-gui-lai"></a>
### Chờ trước khi gửi lại

![Chờ trước khi gửi lại](ui/uc-03/cho-gui-lai.svg)

**SCR ID chưa được cấp.** Màn cha Kiểm tra email. Liên quan E2. Áp dụng khi gửi từ biểu mẫu hoặc màn kiểm tra thư. Hiện thời gian còn lại theo Retry-After cho email hiện hành. Khi hết chờ, mở lại thao tác gửi. Khách cũng có thể sửa email. [SCN‑UC03‑04](uc-03.md#scn-uc03-04).

<a name="mo-thu"></a>
### Mở thư đặt lại mật khẩu

![Mở thư đặt lại mật khẩu](ui/uc-03/mo-thu.svg)

**SCR ID chưa được cấp.** Liên quan M3, Q1. Minh họa hộp thư bên ngoài bằng dữ liệu mẫu. Nút trong thư mở đích nhận liên kết được cấu hình. Không hiển thị token trong khung. [SCN‑UC03‑01](uc-03.md#scn-uc03-01) · [SCN‑UC03‑02](uc-03.md#scn-uc03-02).

<a name="mat-khau-moi"></a>
### Nhập mật khẩu mới

![Nhập mật khẩu mới](ui/uc-03/mat-khau-moi.svg)

**SCR ID chưa được cấp.** Màn cha Mật khẩu mới. Liên quan M3–M4. Một trường mật khẩu mới có nhãn và che nội dung nhập. Thao tác đặt lại gửi token và mật khẩu mới cho Core. [SCN‑UC03‑02](uc-03.md#scn-uc03-02) · [SCN‑UC03‑07](uc-03.md#scn-uc03-07).

<a name="mat-khau-moi-dang-gui"></a>
### Đang đặt lại mật khẩu

![Đang đặt lại mật khẩu](ui/uc-03/mat-khau-moi-dang-gui.svg)

**SCR ID chưa được cấp.** Màn cha Mật khẩu mới. Liên quan M4. Giữ mật khẩu dưới dạng che. Vô hiệu thao tác gửi lặp trong lúc chờ. [SCN‑UC03‑02](uc-03.md#scn-uc03-02) · [SCN‑UC03‑06](uc-03.md#scn-uc03-06).

<a name="du-lieu-dat-lai-khong-hop-le"></a>
### Dữ liệu đặt lại cần kiểm tra

![Dữ liệu đặt lại cần kiểm tra](ui/uc-03/du-lieu-dat-lai-khong-hop-le.svg)

**SCR ID chưa được cấp.** Màn cha Mật khẩu mới. Liên quan E4, Q2. Với 400 từ biểu mẫu, cho kiểm tra mật khẩu hoặc tạo yêu cầu mới. [SCN‑UC03‑06](uc-03.md#scn-uc03-06) · [SCN‑UC03‑07](uc-03.md#scn-uc03-07).

<a name="lien-ket-thieu-token"></a>
### Liên kết thiếu thông tin

![Liên kết thiếu thông tin](ui/uc-03/lien-ket-thieu-token.svg)

**SCR ID chưa được cấp.** Màn cha Mật khẩu mới. Liên quan M3 và E4. Khi Mobile nhận link thiếu token đọc được, biểu mẫu chưa mở và Khách có thể tạo yêu cầu mới. [SCN‑UC03‑06](uc-03.md#scn-uc03-06).

<a name="lien-ket-khong-hieu-luc"></a>
### Liên kết không còn hiệu lực

![Liên kết không còn hiệu lực](ui/uc-03/lien-ket-khong-hieu-luc.svg)

**SCR ID chưa được cấp.** Màn cha Mật khẩu mới. Liên quan E1. Cùng trạng thái cho token đã dùng và token hết hạn theo 410. Xóa dữ liệu bí mật của luồng và về màn yêu cầu khi Khách chọn tạo yêu cầu mới. [SCN‑UC03‑03](uc-03.md#scn-uc03-03).

<a name="chua-ro-ket-qua"></a>
### Chưa xác nhận được kết quả

![Chưa xác nhận được kết quả](ui/uc-03/chua-ro-ket-qua.svg)

**SCR ID chưa được cấp.** Màn cha Mật khẩu mới. Liên quan E5. Cho thử lại khi còn token hoặc quay lại UC02 để thử mật khẩu mới. Nếu lần thử lại nhận 410, dùng trạng thái liên kết không còn hiệu lực. [SCN‑UC03‑06](uc-03.md#scn-uc03-06).

<a name="dat-lai-thanh-cong"></a>
### Đã đặt lại mật khẩu

![Đã đặt lại mật khẩu](ui/uc-03/dat-lai-thanh-cong.svg)

**SCR ID chưa được cấp.** Màn cha Kết quả đặt lại. Liên quan M5. Chỉ hiện sau 204 của lần gửi hiện hành. Xóa dữ liệu bí mật và tách thao tác đăng nhập tiếp theo sang UC02. [SCN‑UC03‑02](uc-03.md#scn-uc03-02) · [SCN‑UC03‑07](uc-03.md#scn-uc03-07).

