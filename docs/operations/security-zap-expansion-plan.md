# Mở rộng bằng chứng ZAP cho test-security

Trạng thái đề xuất cho 6.2 Sol. Baseline là commit 647813adc6a07b5ecdde456c285d8fc66b0b5b48 trên experiment/tool-evaluation. [Lượt CI sau merge](https://github.com/tma-706/HK1_2627_INT3505E_1_Group_7/actions/runs/45011388901) ghi 9 ca, 33 trao đổi HTTPS, 50 chunk và 56 nghĩa vụ. Kết quả theo chunk gồm 4 PASS, 1 REVIEW, 32 MISSING, 13 N/A. Job ZAP đã phân tích thụ động lưu lượng xác thực do runner tạo. Tám test flow mobile dùng mock.

## Mục tiêu và phạm vi

Bổ sung bằng chứng HTTP từ các trạng thái phiên và từ thao tác trên UI thật trong môi trường fixture. Giữ ba đầu vào của skill, oracle theo đặc tả, hai artifact đã lọc và quy trình điều tra đúng build. Authenticated active scan được nêu trong chat là một nhu cầu riêng, còn mở sau đợt này. Các mục về kho phiên native, cache ảnh thiết bị và triển khai thật vẫn cần phép kiểm ở tầng tương ứng.

## PR 1 · Độ phủ theo operation và trạng thái phiên

1. Trong tests/security/model.mjs và manifest, đọc method, path, operationId và yêu cầu xác thực từ OpenAPI, kể cả ngoại lệ từng operation. Đối chiếu context của zap.yaml với tập route đã chọn. Tạo bảng từng operation với các cột contract, runner quan sát, UI quan sát, ZAP tiếp nhận và loại chứng cứ. Readiness có dòng riêng. Route ngoài phạm vi có lý do. Thêm tự kiểm contract có operation mới nhưng context cũ để phát hiện sai lệch.
2. Chọn các ô trạng thái áp dụng từ UC-01/02 cho validateCurrentSession, revokeCurrentSession, getMyProfile và listMyItems. Lấy oracle riêng theo từng operation, nhất là ngữ nghĩa thu hồi lặp. Kiểm phiên hợp lệ, thiếu phiên và đã thu hồi. Thêm biên hết hạn khi fixture điều khiển được thời gian mà không sửa đồng hồ runner. Ghi MISSING và nguyên nhân nếu chưa có điều kiện kiểm mốc. Giữ các đối chứng phiên thứ hai và cursor hiện có. Chọn thêm một lỗi tham số đã có mã lỗi trong contract để quan sát phản hồi lỗi, header và schema.
3. Trong http.mjs và zap.mjs, gắn nguồn runner/UI và liên kết từng trao đổi với ca, bước và trạng thái fixture. Hiện inspectExport ghép theo method/path/status và inspectAlerts nối mọi ca cùng method/path. Nếu nhiều bước trùng bộ ba, ghi rõ mức chứng cứ tổng hợp hoặc dùng định danh tổng hợp được bảo toàn qua vòng import/export và đã kiểm chứng. Tránh quy cảnh báo cho một người dùng cụ thể khi report không đủ dữ liệu.
4. Giữ passive self-check và đối soát HAR. Kiểm mất lưu lượng bằng cách bỏ một trao đổi bắt buộc trong bản kiểm công cụ; kết quả phải là MISSING và gate thất bại. Dùng kết quả giả lập để thử sai status/mã lỗi; phải ra FAIL. Báo số ô đủ bằng chứng trên tổng ô áp dụng, tách số do runner và UI tạo.

## PR 2 · Hành trình trình duyệt qua gateway fixture

1. auth-platform.web.tsx hiện tạo phiên và hồ sơ trong bộ nhớ. Thêm entrypoint hoặc adapter chỉ cho build E2E dùng UI hiện có, API client thực và danh tính tổng hợp của fixture. Giữ hành vi bản preview. Không đưa khóa ký fixture vào bundle trình duyệt. Ưu tiên cùng origin qua gateway thử nghiệm. Kiểm đường dẫn tới Core trước khi chạy trình duyệt.
2. Điều khiển một trình duyệt ở local/CI. Đi từ đăng nhập đến Hồ sơ, Mục của tôi, trang tiếp theo và đăng xuất. Mỗi bước có assertion UI theo SCN, bằng chứng method/path/status khi bước đó gọi API và dữ liệu đặc trưng do fixture cấp cho lượt chạy. Dùng thao tác qua UI để phát sinh lưu lượng. Chạy thêm đối chứng với preview mock để xác nhận gate UI→Core báo thiếu.
3. Thu HAR từ browser context, đóng context để hoàn tất file, giới hạn lưu lượng phân tích theo origin fixture. Đưa HAR này vào AF passive cùng nguồn runner nhưng giữ provenance đến báo cáo. Chỉ upload dữ liệu đã lọc, loại query, token và nội dung hồ sơ. Giữ xác minh TLS trực tiếp với fixture CA. Hành trình này có nhãn web E2E.
4. Nghiệm thu bằng tối thiểu một hành trình đã đăng nhập có UI assertion và phản hồi xác thực thực cho cả getMyProfile và listMyItems trong ZAP. Đối chiếu UI với fixture và báo route contract chưa quan sát. Ca thao tác bị bỏ hoặc UI quay về mock phải làm gate E2E thất bại.

## Tích hợp và nghiệm thu

- Cập nhật SKILL.md và references/coverage.md để sprint mới tự chọn operation, trạng thái và hành trình theo SCN. Cập nhật validate, reporter và test cho các trạng thái thiếu nêu trên. Khi có cảnh báo, giữ liên kết rule, operation, nguồn quan sát và bằng chứng để agent điều tra đúng SHA. Riêng REVIEW về cache cần đối chiếu yêu cầu đã duyệt.
- Đánh giá zaproxy/action-af bằng cùng một AF plan, image digest và input đã dùng ở local. Action có input plan và docker_name. So bản ghi nhận được, kết quả self-check, mã thoát, khả năng truy cập thư mục tạm và nội dung artifact. Dùng action nếu tương đương và bảo toàn vòng đời fixture cùng nguyên tắc lọc dữ liệu. Nếu không tương đương, giữ runner Docker và ghi nguyên nhân cụ thể. [Khai báo action](https://github.com/zaproxy/action-af/blob/v0.3.0/action.yml)
- Mỗi PR chạy suite hồi quy cũ và phần mới. Dùng quy trình xác minh tài khoản hehuanglu, PR và CI sau merge của [kế hoạch nghiệm thu](security-test-plan.md). Cho phép sửa lỗi rồi chạy lại. Bàn giao artifact đúng SHA với bảng trước/sau theo operation, nguồn, trạng thái phiên, chunk chuyển trạng thái và số còn thiếu. Số request quan sát thay đổi theo ca; giữ oracle của các ca baseline và đối soát mọi trao đổi bắt buộc của lần chạy.
- Hoàn tất khi cả hai phần vận hành trên CI, ca đối chứng phát hiện mất bằng chứng, và người đọc có thể chỉ ra bước UI nào đi qua gateway, phản hồi nào được ZAP phân tích, tiêu chí nào còn mở cùng lý do. Việc bổ sung bằng chứng chỉ thay đổi kết luận của nghĩa vụ có oracle tương ứng.

## Quyết định về action-af

Giữ Docker runner cô lập cho suite. Phép đối chiếu trên GitHub-hosted runner dùng cùng AF plan, image digest và từng byte HAR đầu vào với một phản hồi readiness tổng hợp cùng mẫu tự kiểm. Docker runner nhận phản hồi readiness, báo tín hiệu passive đạt và trả mã 0. `zaproxy/action-af@v0.3.0` trả mã 1, thiếu export HAR, report passive và tín hiệu tự kiểm. Phép chạy cũng ghi nhận mode của thư mục riêng bị thay đổi. Action cấp quyền ghi workspace cho mọi user, mount workspace cả cây và dùng host networking. Runner hiện hành chỉ mount thư mục của nguồn đã chọn, chạy theo UID/GID chủ thư mục, tắt networking và upload đúng hai báo cáo đã lọc. [Lượt đối chiếu](https://github.com/tma-706/HK1_2627_INT3505E_1_Group_7/actions/runs/45023437759) · [Mã action được kiểm](https://github.com/zaproxy/action-af/blob/v0.3.0/index.js)

## Nghiệm thu trước merge PR 2

| Operation | Runner trước → sau | UI trước → sau | Trạng thái và bước được bổ sung |
| --- | ---: | ---: | --- |
| `getCoreReadiness` | 1 → 1 | 0 → 0 | Readiness HTTPS theo CA fixture ở dòng riêng |
| `createGoogleSession` | 5 → 7 | 0 → 1 | Cấp hai phiên tổng hợp cho ca hết hạn và đăng nhập từ UI (SCN-AUTH-04) |
| `validateCurrentSession` | 3 → 6 | 0 → 0 | Thiếu phiên, quá hạn không hoạt động và quá trần tuyệt đối |
| `revokeCurrentSession` | 2 → 5 | 0 → 1 | Ba trạng thái mới trả 401. Thu hồi lặp vẫn trả 204. Xác nhận đăng xuất từ UI (SCN-AUTH-16) |
| `getMyProfile` | 5 → 8 | 0 → 1 | Ba trạng thái phiên mới và phản hồi 200 khớp danh tính fixture khi mở Hồ sơ (SCN-PRF-01) |
| `listMyItems` | 17 → 21 | 0 → 2 | Ba trạng thái phiên mới, lỗi thiếu tab và hai phản hồi 200 qua thao tác mở danh sách và cuộn (SCN-PRF-03/07). ZAP đối soát hai phản hồi theo nhóm |

Cột trước lấy từ baseline, cột sau lấy từ build `66ecb66b9a80e0126c9244f153bbec3b72715e05`. Cả 53 trao đổi đã được ZAP nhận, gồm 48 runner và 5 UI. Runner đủ bằng chứng 23/31 ô, UI đủ 4/4 ô. Tám ô MISSING ở runner là các biên chính xác 30 và 90 ngày cho bốn operation bảo vệ. Hai fixture đã quá hạn kiểm các nhánh từ chối tương ứng. [Baseline](https://github.com/tma-706/HK1_2627_INT3505E_1_Group_7/actions/runs/45011388901) · [Lượt mở rộng](https://github.com/tma-706/HK1_2627_INT3505E_1_Group_7/actions/runs/45023437701)

Không có chunk đổi trạng thái. Catalog có 4 PASS, 0 FAIL, 1 REVIEW, 32 MISSING và 13 N/A. `SEC-A06-03` giữ REVIEW cho cảnh báo cache 10015. Header `no-store` của các phản hồi đọc đã được đối chiếu với hợp đồng. Kiểm lưu ảnh và kho phiên native cần bằng chứng thiết bị. `results.json` liệt kê các nghĩa vụ còn mở cùng lý do và tham chiếu nhóm theo nguồn.

Lượt CI web đầu tiên dừng ở assertion `preview-items-end`. Một lần cuộn tới rìa phần đã render của FlatList chưa đủ để kích hoạt trang sau. Sau khi cuộn theo nhiều bước, preview hoàn tất và có 0 trao đổi Core. Tự kiểm gate xác nhận thiếu bước phân trang hoặc thiếu nguồn UI đều cho MISSING. [Lượt tái hiện](https://github.com/tma-706/HK1_2627_INT3505E_1_Group_7/actions/runs/45015584391)
