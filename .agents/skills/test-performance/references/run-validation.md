# Quy tắc đo và xác thực kết quả

## Kiểm tra cấu hình tải đã sinh

- Với từng profile, kiểm tra đơn vị của nhu cầu, tải theo pha, phạm vi SLO, dữ liệu test và ngân sách môi trường. Đối chiếu số mẫu dự kiến của endpoint với RPS của chính endpoint đó nhân thời lượng đo. Với đợt dồn tải, đo theo các cửa sổ bám theo sự kiện và ghi thời gian hồi phục. Với bài chạy dài, bao phủ chu kỳ nghiệp vụ hoặc tài nguyên cần quan sát.
- Ghi tổng thời gian chạy riêng với thời gian đo. Locust `--run-time` tính cả ramp. Với mục tiêu ở trạng thái ổn định, mở cửa sổ đo khi đạt tải yêu cầu và kiểm tra đủ thời gian giữ. Với sự kiện hoặc lô, mở cửa sổ tại mốc nghiệp vụ đã định, theo dõi cả phần việc còn chờ sau khi ngừng phát tải và đối chiếu kết quả cuối theo hạn hoàn tất.
- Kiểm tra giá trị dương và đơn vị, thứ tự của dải user và wait-time, khả năng hoàn thành ramp trong ngân sách, cùng giới hạn tải và thời gian của staging. Khi phải hạ tải, ghi cả tải nghiệp vụ và tải hiệu lực. Nếu trần staging thấp hơn tải cần để trả lời mục tiêu, ghi rõ phần không kiểm chứng được.

## Dữ liệu dùng để đánh giá

- Ghi route mẫu, phase, user thực tế, cấu hình áp dụng, thời gian, phiên bản và cách tính từng chỉ số. Đặt phạm vi rõ cho tải nghiệp vụ, login/setup, phản hồi nghiệp vụ kỳ vọng và request dọn dẹp. Kiểm tra riêng lỗi setup. Chọn và ghi quy tắc tính mẫu cho p95, tỷ lệ lỗi và Apdex.
- Đo p95 từ mẫu hoặc histogram đủ chi tiết của đúng cửa sổ và phạm vi. Ưu tiên thời gian request gốc ở biên SLO vì histogram mặc định của Locust có làm tròn. Ghép histogram theo số lượng mẫu trước khi tính percentile. Ấn định cách gán request vào cửa sổ, ví dụ theo lúc gửi rồi chờ các request đó hoàn tất theo timeout. Báo thiếu bằng chứng nếu còn mẫu chưa quyết toán có thể làm sai kết luận.
- Tính tỷ lệ lỗi theo `100 × failures / attempts` cho phạm vi đã định. So sánh với giá trị phần trăm như `1.0` cho 1%. Khi có Apdex, lấy T từ dự án và dùng cùng đơn vị cho T và thời gian phản hồi. Nếu dự án dùng công thức chuẩn, một mẫu thành công ở mức ≤ T là thỏa mãn, mẫu thành công ở mức > T và ≤ 4T là chấp nhận được, mẫu còn lại gồm lỗi là không thỏa mãn. Điểm là `(số thỏa mãn + 0,5 × số chấp nhận được) / tổng mẫu`.
- Ghi tập chỉ số bắt buộc của gate. Khi dự án hoặc người dùng yêu cầu Apdex, thiếu T hoặc thiếu mẫu dẫn đến kết quả không đủ bằng chứng cho gate. Dùng cùng phạm vi và cách tính khi chạy phân tán. Với soak, tổng hợp theo cửa sổ bằng bộ đếm hoặc histogram để giới hạn RAM máy phát tải.

## Điều kiện dừng

- Đặt cửa sổ quan sát, phạm vi và số mẫu tối thiểu cho ngưỡng dừng. Tính trong lúc test và kiểm tra độc lập việc mất worker, thiếu tín hiệu hoặc lỗi setup. Khi worker gửi số liệu, lấy quyết định từ số liệu đã tổng hợp của toàn phạm vi. Ghi lý do và giữ số liệu khi dừng.
- Với profile có ngưỡng dừng, đọc chỉ số, đơn vị, toán tử, ngưỡng, cửa sổ và hành động từ kế hoạch dự án. So với SLO đúng phạm vi nếu điều kiện phụ thuộc SLO. Kiểm tra nhánh dưới ngưỡng, đúng biên và vượt ngưỡng. Ghi bậc tải cuối còn đạt và tín hiệu kích hoạt nếu khảo sát công suất.

## Kiểm tra CI gate

- Xác thực phiên bản ở môi trường đo, tải thực, cửa sổ đo, số mẫu và báo cáo hoàn tất trước khi kết luận. Giữ mã thoát và log Locust. Khi dùng mã riêng cho lỗi request qua `--exit-code-on-error`, chỉ tiếp tục đánh giá theo SLO nếu có bằng chứng quá trình hoàn tất, request lỗi đã được ghi vào số liệu và trạng thái script, setup, worker đều hợp lệ. Kiểm tra riêng lỗi task, ví dụ qua `user_error` hoặc báo cáo exceptions, vì Locust có thể dùng cùng mã thoát cho cả lỗi request và lỗi task.
- Trả mã 0 khi tất cả chỉ số bắt buộc đạt. Phân biệt vi phạm, thiếu bằng chứng và lỗi thực thi bằng trạng thái trong log hoặc báo cáo. Khi một chỉ số hợp lệ vi phạm và chỉ số khác thiếu mẫu, giữ cả hai kết quả. Tìm cách kiểm chứng bước lưu artifact trong cả ca gate thất bại.
- Kiểm thử tối thiểu các ca đạt, lỗi request trong ngân sách, chạm đúng ngưỡng và vượt ngưỡng, thiếu mẫu hoặc thiếu tải, thiếu T khi Apdex bắt buộc, lỗi task hoặc mất dữ liệu và việc đính kèm artifact khi gate thất bại.
