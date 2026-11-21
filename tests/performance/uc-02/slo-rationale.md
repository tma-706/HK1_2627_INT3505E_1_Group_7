# Căn cứ ngưỡng hiệu năng UC-02

| Tín hiệu | Ngưỡng hoặc trạng thái | Căn cứ |
| --- | --- | --- |
| Hồ sơ hiển thị đầy đủ sau khi chạm Hồ sơ | Ít nhất 95% lượt đủ điều kiện trong 2.000 ms | SRS PR-04, giá trị đề xuất theo TBD-02. Đồng hồ bắt đầu tại thao tác mobile. |
| Trang danh sách hiển thị đầy đủ sau khi gửi yêu cầu trang | Ít nhất 95% lượt đủ điều kiện trong 2.000 ms | SRS PR-05 và SCN-PRF-17. Báo riêng trang đầu, trang sau và làm mới theo tab. |
| Thời gian chờ mỗi yêu cầu mạng | Tối đa 15.000 ms | SRS PR-07. Cần đo trên app, kể cả đường tải ảnh khi thuộc ca chạy. |
| Dung lượng cục bộ | Tối đa 20 MB cho cả UC-01 và UC-02 | SRS PR-08 và SCN-PRF-19. Phạm vi cache OS và quy đổi MB còn cần chốt. |
| Độ đúng của danh sách lớn | Ít nhất 1.000 mục mỗi tab cho cùng tài khoản | SRS PR-09 và SCN-PRF-18. Đối chiếu ID và thứ tự sau khi tải hết. |
| p95 và tỷ lệ lỗi của hai endpoint Core | Chưa chốt | Đo pilot để có đường cơ sở. Dùng số đo riêng của Core, mạng, tải ảnh và render để thống nhất ngân sách API rồi kiểm chứng trên tải đại diện. |

Đối chiếu các ngưỡng đề xuất theo [SRS mục 3.3](../../../docs/requirements/lost-and-found-srs.pdf) và [SCN-PRF-17–19](../../../docs/use-cases/uc-02-profile-and-my-items.md#phép-đo-và-bàn-giao). [Bảng SLO](slo.yml) giữ giá trị API trống trong lúc chờ căn cứ. Pilot báo p95 và tỷ lệ lỗi theo [kế hoạch đo](test-plan.md).
