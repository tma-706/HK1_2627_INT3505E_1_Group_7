# Kiến trúc thực nghiệm UC-01 và UC-02

**Phạm vi được chốt** · Hai UC Essential trong [SRS](../requirements/lost-and-found-srs.pdf). Dùng Core Node.js/TypeScript và PostgreSQL hiện có cho thực nghiệm. Các phiên bản triển khai được xác định ở [Compose](../../compose.yaml), [Dockerfile Core](../../apps/core/Dockerfile) và [lockfile](../../package-lock.json).

## Ranh giới

- **Ứng dụng mobile** mở luồng Google trên Android/iOS, gọi Core để đổi ID token lấy phiên, lưu phiên trong kho bảo mật của hệ điều hành và xóa dữ liệu cá nhân cục bộ khi đăng xuất. UI kiểm thứ tự màn hình, lỗi, timeout và hành vi làm mới theo SRS.
- **Core API** xác minh ID token, quản lý tài khoản/phiên và suy ra chủ thể của mọi yêu cầu đọc cá nhân từ phiên. Google xác thực người dùng. Core quyết định quyền trong Lost & Found. API nghiệp vụ đi qua cổng HTTPS khi dùng Google thật.
- **PostgreSQL** lưu danh tính, hồ sơ và trạng thái phiên. Core API chịu trách nhiệm truy vấn Mục của tôi. Phạm vi thực nghiệm cung cấp dữ liệu Lost, Found và yêu cầu nhận đồ bằng fixture tổng hợp; các UC ghi sẽ sở hữu dữ liệu và trạng thái thật.
- **Local** dùng Nginx và trang kiểm tra kết nối. Worker và Matching vẫn có kiểm tra khởi động riêng, nằm ngoài đường gọi hai UC. Mốc đánh giá thêm tiến trình hạ tầng là khi một UC hoặc số đo thực tế yêu cầu.

## Dữ liệu và bất biến

- **Tài khoản và hồ sơ.** Duy nhất theo định danh Google đã xác minh. Email có thể đổi. Lần đăng nhập thành công cập nhật dữ liệu Google mới nhất. Tạo hoặc lấy tài khoản và đồng bộ hồ sơ bằng giao dịch an toàn khi đăng nhập đồng thời.
- **Phiên.** Tách theo lần đăng nhập trên thiết bị, có thời điểm tạo, hoạt động thành công gần nhất và thu hồi. Core giữ bản băm của bí mật phiên. Thu hồi phiên hiện tại giữ các phiên trên thiết bị khác. Phiên đã hết hạn hoặc đã thu hồi không thể được gia hạn khi có yêu cầu đến muộn.
- **Mục của tôi.** Core lọc Lost và Found theo tác giả, yêu cầu nhận đồ theo người gửi hoặc chủ bài nhận yêu cầu. Phân trang theo thời điểm tạo và ID ổn định để xử lý các mục trùng thời gian. Thumbnail Found chỉ tham chiếu bản đã xử lý. Trạng thái và link ảnh lấy từ nguồn sở hữu khi UC ghi được tích hợp.
- **Migration.** Đặt migration theo thứ tự ở [db/migrations](../../db/migrations/README.md) trong cùng thay đổi triển khai dữ liệu. Kiểm trên DB rỗng và từ bản schema trước khi có bản phát hành cần nâng cấp.
