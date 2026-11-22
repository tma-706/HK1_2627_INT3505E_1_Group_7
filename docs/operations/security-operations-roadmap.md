# Kế hoạch vận hành test-security từ UC-01/02 đến các sprint tiếp theo

## Đích đến và điểm xuất phát

Mỗi bản phát hành cần một kết luận đọc được ở cấp điều khoản: rủi ro nào đã đo, trên build và môi trường nào, bằng phương pháp nào, điều gì xảy ra nếu kết quả sai và ai xử lý phần còn mở. Authenticated active DAST là một mốc vận hành có người thực hiện, có lịch đánh giá và có lần kiểm lại sau sửa. Công việc của Sol là xây và nghiệm thu skill, suite phòng thủ, tích hợp bằng chứng và báo cáo. Người phụ trách AppSec vận hành cuộc đánh giá chủ động trong phạm vi được giao. Người quyết định phát hành dùng cả hai nhóm kết quả.

Mốc xuất phát là hai lượt local của Sol ở manifest v4, HEAD 03f892d và cây có thay đổi. Fingerprint của lần nghiệm thu là fe4e40a9bef2d52abf3d3e9558eae47ab00d650ada77a6e3e22e96cd062fa534. Hai lượt đạt 14 ca, 52 trao đổi runner và 5 Firefox, đủ 57/57 trong ZAP passive. Có 23/31 ô runner và 4/4 ô Firefox đủ bằng chứng. Toàn catalog có 50 chunk với 4 PASS, 0 FAIL, 1 REVIEW, 32 MISSING, 13 N/A. Authenticated active DAST chưa chạy. Gate hiện hành là gate của pilot fixture.

33 nghĩa vụ MISSING trong 56 nghĩa vụ phân bố ở config 7/7, Core 9/26, DB 3/4, gateway/TLS 5/8, Google 2/3 và mobile 7/8. Mẫu số là số nghĩa vụ của từng bề mặt. Một chunk có thể xuất hiện ở nhiều bề mặt. Đây là cơ sở chọn phương pháp và người phụ trách. Chủ sở hữu đánh giá ưu tiên dựa trên hậu quả, mức phơi lộ và thay đổi của bản phát hành. Số hàng MISSING chỉ là một đầu vào.

## Lịch đề xuất và phụ thuộc

Sáu chặng dưới đây dự kiến trải trên 4–6 sprint. Đây là ước lượng để xếp việc. Thời gian thực tế phụ thuộc vào revision tích hợp, đầu mối AppSec, staging và thiết bị. Điểm quyết định chuyển chặng là bằng chứng nghiệm thu.

| Chặng | Thời điểm đề xuất | Người chịu trách nhiệm chính | Điều kiện bắt đầu | Đầu ra nghiệm thu |
| --- | --- | --- | --- | --- |
| A. Khóa baseline | Đầu sprint 1 | Sol và maintainer | Checkout có đủ v4 | Báo cáo theo revision tái lập, phân biệt local/CI |
| B. Thiết kế test qua sprint | Sprint 1–2 | Sol và QA nghiệp vụ | A có baseline để so | UC thứ ba qua validator, oracle đúng tầng, kết quả theo từng điều khoản |
| C. Authenticated active DAST đầu tiên | Chuẩn bị từ sprint 1, đặt cửa sổ ở sprint 2 | Người vận hành AppSec và chủ staging | Xác định build, phạm vi, người trực và cách khôi phục | Cuộc đánh giá thực, biên bản phạm vi thực chạy, triage và lịch retest |
| D. Core, DB, chuỗi cung ứng và gateway | Sprint 2–3, song song C | Core/DB và platform | Có test integration và inventory bản build | Kết quả DB cùng build, rà mã/config, quyết định biên thời gian và quyền DB |
| E. Native, OAuth và vòng đời dữ liệu | Sprint 3–4 | Mobile QA, chủ OAuth và platform | Có bản app, môi trường và tài khoản thử thích hợp | Bằng chứng theo OS, gateway và phụ thuộc danh tính; backlog phần chưa đo |
| F. Sửa, kiểm lại, diễn tập bàn giao | Sprint 4–6, lặp từ đó | Chủ sửa, AppSec, release owner | Có kết quả từ từng chặng liên quan | Retest bản sửa, quyết định phát hành, skill dùng được ở sprint kế tiếp |

Thiếu staging có thể chặn C và phần triển khai của E. B, D và các test reporter vẫn chạy. Nếu C chưa diễn ra, báo cáo phát hành phải hiện trạng thái đó và người quyết định xử lý. Mốc C chỉ hoàn tất sau một lượt thực có bằng chứng hợp lệ.

## Chặng A và B · Từ checkout đến bộ test dùng lại được

**A1.** Kiểm manifest v4, cây local, HEAD, digest nguồn và hai báo cáo đã lọc. Lưu cặp artifact mỗi lượt trước khi chạy tiếp. Khi có commit chứa v4, chạy trên cây sạch; ghi commit thực được test và run/attempt nếu chạy CI. Kiểm riêng gate, cleanup, nguồn, self-check và tỷ lệ nhận theo từng nguồn. Báo cáo thiếu fixture hoặc lỗi công cụ vẫn phải mở được.

**B1.** Áp dụng thiết kế chi tiết đã có cho việc thêm UC thứ ba, nhập kết quả integration và tách điều khoản SCN. Ca thử chỉ thêm spec, registration và oracle bằng dữ liệu test. Reviewer phải thấy lỗi rõ khi bỏ mapping, gắn nhầm chủ sở hữu SCN hoặc bỏ assertion quyết định. Bằng chứng cũ vẫn đọc được để so giữa hai build. [Kế hoạch triển khai manifest v4 trở đi](security-skill-completion-plan.md)

**B2.** Duy trì một bảng làm việc cho thay đổi của sprint: điều khoản, tài sản hoặc dữ liệu bị ảnh hưởng, người dùng chịu hậu quả, trạng thái fixture, đối chứng hợp lệ, assertion quyết định, tầng đo, điều kiện chạy lại. Ví dụ, quyền đọc hồ sơ cần so danh tính fixture; retry cấp phiên cần so kết quả và trạng thái DB; hành vi sau logout cần quan sát đúng client. Mỗi mục ghi rõ bước nào có thể bác bỏ kết luận PASS. Rà các luồng cũ dùng chung session, cursor và gateway khi thêm UC.

**B3.** Thực hành trên SCN-PRF-03. Tách kết luận quyền đọc, phân trang, yêu cầu mở hai vùng bằng một lần chạm và yêu cầu danh sách tải trong lúc hồ sơ còn chờ. Ghi FAIL khi có quan sát trái spec và MISSING khi thiếu phép đo. Giao sai lệch giao diện cho chủ mobile và cập nhật riêng kết luận bảo mật, kết luận sản phẩm.

## Chặng C · Vận hành authenticated active DAST

**Quyết định cần đưa ra.** Trên revision và môi trường dự kiến phát hành, phần ứng dụng cần phiên hợp lệ đã được đánh giá chủ động tới đâu, các tín hiệu nào cần sửa, và phần nào phải hẹn lại? Lượt pilot ưu tiên phạm vi đọc hồ sơ và danh sách trên staging được giao, vì hai operation này có danh tính cùng dữ liệu fixture để kiểm chứng. Chủ hệ thống quyết định phạm vi còn lại và tác động chấp nhận được. Login, thay đổi trạng thái phiên và bên cung cấp danh tính bên ngoài phải có quyết định phạm vi riêng. ZAP mô tả giới hạn của active scanning đối với lỗi logic; suite A/B, cursor và vòng đời phiên tiếp tục có oracle nghiệp vụ riêng. [ZAP Active Scan](https://www.zaproxy.org/docs/desktop/start/features/ascan/)

| Mốc vận hành | Đầu việc và trách nhiệm | Tiêu chí để ký |
| --- | --- | --- |
| C1. Nhận phạm vi | Release owner chỉ định build; chủ staging xác nhận môi trường, operation được đánh giá, phần loại trừ, cửa sổ, dữ liệu thử, đầu mối trực, tiêu chí dừng và cách phục hồi. AppSec ghi mục tiêu đánh giá có xác thực. | Một bản ghi scope có ngày, chủ sở hữu và mẫu số operation. Thay scope phải lưu phiên bản. |
| C2. Xác nhận môi trường | Chủ staging xác nhận bản triển khai khớp revision, fixture tổng hợp còn nhất quán, theo dõi được sức khỏe dịch vụ, có thể thu hồi tài khoản thử và khôi phục trạng thái. AppSec cùng QA xác nhận danh tính thử và hành vi đọc chuẩn trước cửa sổ. | Định danh build/môi trường, trạng thái đầu kỳ và bằng chứng danh tính dạng đã lọc. |
| C3. Thực hiện lượt đầu | Người vận hành AppSec trực tiếp phụ trách phiên đánh giá bằng quy trình chuyên môn của đơn vị. Ghi giờ bắt đầu/kết thúc, phạm vi thực tế, phiên bản công cụ/chính sách, dấu hiệu phiên hợp lệ trong thời gian đánh giá và các gián đoạn. Chủ staging theo dõi sức khỏe và quyền dừng. | Có bằng chứng trao đổi do scanner phát sinh tới phần cần xác thực; đối chiếu được với quan sát phía dịch vụ và danh tính fixture ở phạm vi được ký. |
| C4. Kết thúc cửa sổ | Ghi operation đã đánh giá đủ, dang dở, bị loại trừ hoặc thiếu bằng chứng. Nếu phiên mất hiệu lực giữa chừng, ghi mốc cuối đủ bằng chứng và phần cần hẹn lại. Chủ staging xác nhận thu hồi tài khoản thử khi thích hợp, kiểm dữ liệu, sức khỏe và cleanup. | Bảng coverage có mẫu số, mức hoàn tất và kết quả phục hồi; báo cáo có thể ghi “một phần”. |
| C5. Triage và retest | AppSec đối chiếu quan sát với yêu cầu, mức ảnh hưởng, môi trường và bằng chứng. Chủ sửa nhận finding đã xác nhận; release owner xử lý phần còn mở. Sau sửa, AppSec xác nhận lại đúng phạm vi và build sửa. | Finding có disposition, người phụ trách và build retest hoặc ngày xem lại; ghi riêng trạng thái lượt chạy và trạng thái finding. |

**Cách skill nhận bằng chứng.** Sol mở rộng model/reporter để đọc biên bản đã lọc. Trường tối thiểu gồm assessment ID, revision, môi trường, thời gian, người chịu trách nhiệm theo vai trò, phương pháp, phiên bản công cụ/chính sách, scope và coverage thực tế, tham chiếu chứng minh nguồn phát request và phiên hợp lệ, tình trạng dừng/cleanup, finding ID và trạng thái retest. Dùng mã tài khoản thử; loại token, cookie, query và nội dung hồ sơ khỏi artifact. Tách phiên bản ứng dụng khỏi revision runner khi hai bên khác nhau. Tách số request active khỏi mẫu số 57 của bộ passive.

**Nghiệm thu bộ đọc.** Dùng các biên bản tổng hợp để kiểm đủ năm tình huống: đúng build và đủ bằng chứng; có HAR Firefox nhưng thiếu hoạt động active; hết phiên giữa lượt; đúng môi trường nhưng sai build; lượt hoàn tất có finding chưa xử lý. Kết quả tương ứng là đủ bằng chứng phạm vi, MISSING cho phương pháp active, một phần kèm danh sách thiếu, từ chối dùng cho build này và hoàn tất đánh giá nhưng finding còn mở. Đánh dấu nguồn thử trong test. Chỉ biên bản do chủ cuộc đánh giá thực tế bàn giao mới được dùng cho C3–C5.

**Nhịp về sau.** Khi thay cơ chế xác thực, gateway, ranh giới dữ liệu hoặc thêm operation bảo vệ, AppSec xem lại scope ở đầu sprint. Trước release có thay đổi liên quan, thực hiện lượt đánh giá trên revision ứng viên hoặc ghi quyết định chấp nhận phần thiếu của release owner. Khi sửa finding đã xác nhận, đặt retest ngay khi build sửa sẵn sàng. Việc thử mô hình dữ liệu, kiểm artifact và tạo báo cáo có thể lặp tự động trong CI. Cửa sổ đánh giá chủ động do người vận hành phụ trách.

## Chặng D · Core, DB, phụ thuộc và gateway

| Phạm vi | Phép đo, đầu ra và điều kiện đóng |
| --- | --- |
| Retry và đồng thời (SCN-AUTH-09) | Dùng bài core-identity integration có hai lần cùng attempt và một thiết bị khác. Gắn kết quả thực thi, số bản ghi và so timestamp vào đúng điều khoản cùng build. Thử record skip, sai SHA và assertion thất bại. Bằng chứng hiện có thể đóng một phần SEC-A07-01/db. |
| Đúng hạn 30/90 ngày (SCN-AUTH-14) | Chủ Core/DB chốt cách kiểm soát instant tại nơi DB quyết định, độ phân giải và cách tách hai mốc. Với bốn operation, dùng phiên độc lập ngay trước/tại mốc, đối chiếu HTTP và hậu điều kiện DB thích hợp. Nếu chưa kiểm soát được instant, giữ tám ô MISSING và hẹn quyết định kỹ thuật. |
| Quyền DB, bí mật, bản build | Đối chiếu role/grant thực tế theo chức năng với quyền cần dùng; rà nguồn cấp secret, cờ debug, cấu hình demo, lockfile và image digest của bản phát hành. Bàn giao bản chênh cấu hình đã lọc, chủ sửa và artifact xác định bản build. Khởi đầu với SEC-A01-07/db, A02-04/config, A10-05/config. |
| Rà mã theo rủi ro | Lấy mapping input → xử lý → nơi sử dụng trong mã Core/DB/mobile để kiểm parameter binding, trường hồ sơ được phép ghi và xử lý lỗi phụ thuộc. Dẫn file/dòng đúng revision, thêm test hồi quy ở tầng sở hữu khi có sai lệch đã xác nhận. Chọn trước SEC-A05-01/db, A08-05/core, A10-06/core. |
| Observability và dữ liệu ghi log | Chốt danh sách sự kiện với chủ vận hành. Dùng danh tính tổng hợp làm thao tác chuẩn, so sự kiện có mặt với đặc tả và kiểm credential/dữ liệu riêng tư có bị ghi vào log. Báo kết quả đã lọc cho Core và gateway riêng. Khi chưa có chính sách sự kiện, ghi câu hỏi nghiệp vụ. |
| Gateway và cache | Chủ platform lập inventory route, chứng chỉ, mount, header và cấu hình triển khai có hiệu lực. So phản hồi ở gateway đích với chính sách đã duyệt. Với rule 10015, giữ chứng cứ no-store của Core, so phiên bản rule và phạm vi phản hồi. Quyết định cho cache thiết bị thuộc E. |

Ưu tiên những thay đổi có thể đưa kết quả trực tiếp đến quyết định release. Ví dụ, grant rộng ở môi trường đích cần chủ DB; sai lệch dữ liệu người dùng cần chủ Core. Với mỗi vi phạm được sửa, kiểm cùng oracle trên build sửa rồi chạy lại hồi quy các UC dùng chung.

## Chặng E · Android/iOS, Google và vòng đời dữ liệu

1. **Kho phiên và cache.** Mobile QA lập ma trận Android/iOS × mở ứng dụng lại/đăng xuất/đổi tài khoản. Ghi phiên bản OS, bản app, môi trường, fixture và thao tác. Kiểm trang cá nhân của A sau khi chuyển sang B, hiển thị sau cold start và bằng chứng lưu trữ/cache thích hợp. Tách điều khoản khóa phiên, nội dung hồ sơ và thumbnail. Một nền tảng đạt thì ký riêng nền tảng đó. [OWASP MASVS](https://mas.owasp.org/MASVS/)
2. **OAuth và đường truyền.** Chủ OAuth cung cấp cấu hình tích hợp và tài khoản thử phù hợp. Kiểm hành trình đăng nhập hợp lệ, quay lại app, chứng chỉ/hostname ở môi trường tích hợp và cách app xử lý hủy hoặc lỗi theo UC. Ghi phần dùng Google thật, phần do fixture mô phỏng và phiên Core được cấp. Giữ mọi bên thứ ba ngoài phạm vi đánh giá active mặc định.
3. **Lỗi và quyền riêng tư.** Theo dõi GAP-AUTH-005, GAP-AUTH-006, lỗi kho phiên và GAP-PRF-004 theo locator trong manifest. Chủ nghiệp vụ chốt kỳ vọng trước khi tạo assertion về hạn mức, retry hoặc thời hạn thumbnail. Khi đã có quy tắc, thêm ca độc lập vào suite của tầng sở hữu. Dùng build release để kiểm cờ debug và nội dung log.
4. **Điều kiện bàn giao.** Có bằng chứng theo từng OS/build hoặc MISSING nêu đúng thiết bị, cấu hình hay quyết định còn thiếu. Đối chứng âm của reporter phải phát hiện trường hợp dùng kết quả Firefox để ký native, hoặc dùng kết quả nền tảng A để ký nền tảng B.

## Chặng F · Quyết định phát hành và vận hành thường xuyên

| Sự kiện | Việc phải làm | Người nhận đầu ra |
| --- | --- | --- |
| PR đổi UC, contract hoặc ranh giới bảo mật | So phạm vi thay đổi, validate manifest, chạy bộ test phù hợp, xuất JSON và summary kể cả khi lỗi; so trên cùng revision. | Tác giả thay đổi và reviewer |
| Đầu sprint | Rà nghĩa vụ chịu ảnh hưởng và finding mở, chọn oracle và owner; xem lại nhu cầu active, native và gateway. | QA lead, AppSec, chủ thành phần |
| Trước release | Lập bảng trạng thái theo phương pháp và môi trường. Kiểm độ mới của bằng chứng sau mọi thay đổi ảnh hưởng; ghi residual risk, chủ quyết định và thời điểm xem lại. | Release owner |
| Sau sửa hoặc sau thay đổi môi trường | Chạy lại phép kiểm đã phát hiện vấn đề, ghi kết quả build sửa, sau đó chạy hồi quy các UC liên quan. Thay config môi trường có thể làm mất giá trị của bằng chứng cùng SHA ứng dụng. | Chủ sửa và người xác nhận |
| Cuối sprint | Chọn một ca lặp chậm hoặc hay lỗi, đo từng giai đoạn, phân biệt lỗi sản phẩm, công cụ và hạ tầng trước khi chỉnh. Cập nhật skill khi quy trình được thực nghiệm. | Maintainer skill |

**Quy tắc kết luận.** Báo cáo hiển thị ba quyết định riêng: gate hồi quy fixture, độ hoàn tất từng cuộc đánh giá và quyết định phát hành. FAIL đã xác nhận hoặc thiếu oracle bắt buộc làm đỏ gate tương ứng. REVIEW cần người triage. MISSING cần nguồn, lý do, người cung cấp và mốc xem lại. N/A cần căn cứ theo phạm vi. Quyết định chấp nhận rủi ro cần người ký, lý do và hạn xem lại, vẫn giữ nguyên trạng thái kỹ thuật. Mỗi finding có ID ổn định, phạm vi/build phát hiện, chủ xử lý, build sửa, người retest và kết quả. Gắn lại cùng ID nếu tái phát.

**Chỉ số để điều hành.** Theo dõi tỷ lệ điều khoản có oracle theo tầng; operation đã đánh giá đủ/tổng trong scope active; finding đã retest/tổng đã sửa; số MISSING theo nguyên nhân; tuổi của REVIEW; thời lượng từng giai đoạn; tỷ lệ lượt phải chạy lại vì hạ tầng. Tách phát sinh mới, đóng và mở lại. Số alert hoặc tỷ lệ PASS tổng hợp chỉ có nghĩa khi đi kèm phạm vi và mẫu số. Dùng hai lượt local 71,58–73,96 giây làm mốc tham khảo cho suite fixture, đo riêng thời lượng của đánh giá active và native.

## Handoff cho Sol ở context sạch

> Mở checkout có manifest v4. Đọc AGENTS.md, README.md, .agents/skills/test-security/SKILL.md, docs/operations/security-operations-roadmap.md và kế hoạch triển khai liên kết ở B1. Dùng roadmap làm backlog qua nhiều sprint. Bắt đầu A/B, chuẩn bị schema và các đối chứng nhận bằng chứng cho C, rồi làm các hạng mục D/E có đủ đầu vào. Mỗi phần phải có điều khoản, tầng, nguồn, oracle quyết định, đối chứng âm, kết quả runtime hoặc lý do MISSING. Giữ interface npm, SHA/fingerprint và hai báo cáo lọc. Phần active có owner AppSec và cửa sổ thực tế; trạng thái mặc định là chưa thực hiện. Khi có biên bản, kiểm nguồn, revision, danh tính, scope, coverage, cleanup và retest trước khi cập nhật kết luận. Chạy phép kiểm hẹp, full suite và kiểm artifact của đúng lượt. Bàn giao việc đã chạy, phần chờ người hoặc môi trường, mốc tiếp theo, ảnh hưởng tới gate và quyết định release. Giữ file và thay đổi hiện có của người dùng; thao tác GitHub theo yêu cầu riêng.
