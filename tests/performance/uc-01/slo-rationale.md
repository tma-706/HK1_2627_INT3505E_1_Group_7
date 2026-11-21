# Căn cứ mục tiêu UC-01

PR-02 đo từ lúc chọn xong Google đến màn chính, PR-03 từ lúc mở nguội với phiên hợp lệ đến màn chính. Mỗi hành trình đề xuất ít nhất 95% lượt trong 3.000 ms. PR-06 đề xuất SCR-01 hiển thị trong 1.000 ms mỗi lần xác nhận đăng xuất, kể cả khi Core chưa trả lời. PR-07 giới hạn từng request mạng trong 15.000 ms. Các ngưỡng ở [SRS mục 3.3](../../../docs/requirements/lost-and-found-srs.pdf) áp dụng ở biên đo của mobile theo SCN-AUTH-21.

SRS chưa quy định ngân sách Core riêng cho cấp, xác minh và thu hồi phiên. [Bảng SLO](slo.yml) ghi các ngưỡng p95 và tỷ lệ lỗi API là chưa xác định. Dùng thăm dò để kiểm khả năng đo. Chốt ngân sách dựa trên số liệu Core, mạng, OAuth và mobile ở tải đại diện. Trên PR, job kiểm trạng thái HTTP, hợp đồng phản hồi, các nhóm request bắt buộc và lưu số liệu thăm dò.
