# Nâng cấp thiết kế test và vận hành test-security

## Quyết định nghiệm thu

Một người nhận build phải trả lời được bốn câu từ hai artifact hiện có. Rủi ro nào của UC đã được kiểm? Ai đã tạo hành vi và ở tầng nào? Phép so sánh nào có thể phát hiện hành vi sai? Phần nào còn mở dù gate xanh? Sol triển khai theo bốn bước dưới đây, dùng UC-01/02 để nghiệm thu rồi kiểm khả năng áp dụng cho sprint sau.

Phần thực thi đợt này gồm ca hồi quy nghiệp vụ trên fixture, hành trình Firefox và ZAP Automation Framework phân tích thụ động. Authenticated active DAST là một mục đánh giá riêng trong báo cáo, với trạng thái ban đầu “chưa thực hiện”. Tiêu chuẩn để người đọc công nhận một đánh giá chủ động đã có bằng chứng gồm revision và môi trường xác định, phạm vi operation đã duyệt, bằng chứng scanner thực sự tạo trao đổi trong phiên còn hiệu lực, mức hoàn tất, kết quả đã phân loại và giới hạn. HAR từ Firefox chỉ chứng minh nguồn Firefox. Việc xây dựng hay chạy quy trình dò tìm lỗ hổng chủ động tự động nằm ngoài phần triển khai giao cho Sol. Kết luận cuối phải nêu rõ giới hạn này, kể cả khi mọi ca bắt buộc đạt.

## Điểm xuất phát và nguồn quyết định

| Nội dung | Giá trị dùng để đối chiếu |
| --- | --- |
| Baseline tích hợp | `experiment/tool-evaluation`, SHA `03f892dc73448288d0ed55544d5d4f4029ba1a56`, [CI](https://github.com/tma-706/HK1_2627_INT3505E_1_Group_7/actions/runs/45024181824), [artifact](https://github.com/tma-706/HK1_2627_INT3505E_1_Group_7/actions/runs/45024181824/artifacts/14755136221) |
| Runtime | 13 ca, 48 trao đổi runner và 5 từ UI, 53 được ZAP tiếp nhận. Runner 23/31 ô, UI 4/4. Readiness tính riêng khỏi năm operation nghiệp vụ. |
| Catalog | 50 chunk, 56 nghĩa vụ. Kết quả theo chunk lần lượt 4 PASS, 0 FAIL, 1 REVIEW, 32 MISSING, 13 N/A. Một chunk có thể có nhiều nghĩa vụ. |
| Điểm mở đã biết | Tám ô đúng hạn 30/90 ngày của bốn operation bảo vệ. SEC-A06-03 còn REVIEW liên quan rule 10015. Mobile native và gateway triển khai cần bằng chứng riêng. |
| Nguồn sở hữu | README dẫn tới UC/SCN, contract, kiến trúc. `tests/security/manifest.json` khóa revision/digest và ca. `coverage.json` sở hữu ánh xạ nghĩa vụ, `review.json` sở hữu nhận định rule. [Kế hoạch trước](security-zap-expansion-plan.md) ghi quyết định về Docker và đối chứng UI. |

Dùng baseline làm mốc so sánh. Số request được phép đổi theo thiết kế. Nếu HEAD đã tiến, ghi SHA mới, so diff các nguồn trên và giải thích delta trước khi diễn giải kết quả. Báo cáo trong dist chỉ được dùng khi buildSha và nguồn chạy khớp lượt cần đánh giá.

## Bước 1 · Chốt thiết kế trước khi sửa runner

1. Đọc skill và references/coverage.md, hai UC spec, OpenAPI, coverage và manifest theo thứ tự. Lập danh sách nghĩa vụ mà thay đổi sprint tác động, kể cả qua luồng dùng chung. Ưu tiên nghĩa vụ có hậu quả lộ dữ liệu, cấp nhầm phiên, giữ quyền sau thu hồi hoặc phát kết luận PASS sai. Ghi một câu mô tả hậu quả và điều khoản sở hữu cho mỗi nhóm. Dùng SCN làm nguồn kỳ vọng trước khi mở mã xử lý.
2. Mở rộng từng định nghĩa ca cần thiết trong manifest. Tái sử dụng id, sourceRefs, layer, source, preconditions, expected và http hiện có. Thêm đúng dữ liệu còn thiếu để máy nối được **câu hỏi kiểm thử → điều kiện đối chứng → assertion quyết định → giới hạn của kết luận**. Có thể dùng mảng mã assertion và mã case/step đối chứng. Ghi giá trị kỳ vọng trong nguồn hiện có, tham chiếu lại khi trình bày. Với ca kiểm cấu hình hoặc mobile-unit, ghi bằng chứng ở đúng tầng.
3. Trong model.mjs, validate tham chiếu case, step, assertion, operation và SCN. Bắt ID trùng, đối chứng trỏ vào chính kết quả đang cần chứng minh, ca HTTP thiếu kỳ vọng, fixture UI được gắn thành native. Với manifest cũ, giữ khả năng đọc artifact baseline để so sánh. Tăng version cho định dạng mới và có test cho baseline cũ thiếu trường. Cùng input chạy validate hai lần phải giữ manifest byte-for-byte.
4. Sửa SKILL.md thành thứ tự người vận hành dùng được: chọn rủi ro từ thay đổi → chọn tầng và oracle → chạy → xác minh công cụ → điều tra → ký kết luận có phạm vi. Đặt ví dụ chi tiết ở references/coverage.md. Thử quy tắc chọn ca bằng bản sao OpenAPI trong test có thêm một operation bảo vệ. Validate phải chỉ ra operation thiếu quyết định phạm vi cho đến khi có mapping hoặc lý do loại trừ. Không sửa contract sản phẩm để thử validator.

## Bước 2 · Triển khai lát cắt chứng minh thiết kế

| Ca và nguồn | Chuẩn bị, thao tác và đối chứng | Oracle và bằng chứng được phép kết luận |
| --- | --- | --- |
| Tái sử dụng lượt đăng nhập hợp lệ, SCN-AUTH-09 | Dùng danh tính fixture và một bộ attemptId, token gốc còn hạn, loại thiết bị cố định. Gửi lần đầu và gửi lại cùng bộ. Dùng một lượt độc lập làm đối chứng rằng phép so sánh thực sự phân biệt hai phiên. | Cả hai phản hồi đúng schema và status theo SCN, mã phiên cùng lượt bằng nhau, phiên dùng được ở validate và trả đúng tài khoản. Chỉ lưu boolean và nhãn bước. Tách riêng nghĩa vụ về số bản ghi, thời điểm hoạt động và xử lý đồng thời nếu chưa đo được. |
| Phạm vi dữ liệu và cursor, SCN-PRF-07/09 | Mở rộng ca UC02-CURSOR nếu còn thiếu liên kết. Giữ A và B tổng hợp, tab nguồn và trang tiếp được seed trước. So đúng tài khoản/đúng tab rồi đổi một điều kiện mỗi lần theo ca hiện có. | So ID, thứ tự và trường với expectedPages kể cả trang sau. Status, schema và mã lỗi theo contract. Chỉ dùng 200 để khẳng định phân quyền sẽ làm hỏng phép kiểm. Đối chứng tự kiểm reporter dùng dữ liệu tổng hợp có đúng status và sai một ID. |
| Hành trình web, SCN-AUTH-04/16 và SCN-PRF-01/03/07 | Dùng lại UC01-02-WEB-E2E. Firefox đi qua gateway tới Core, đọc hồ sơ, mở và cuộn danh sách, xác nhận đăng xuất. Preview làm đối chứng. | Từng bước có assertion UI và dấu hiệu fixture cùng lượt. Giữ 5 phản hồi baseline làm mốc. Hai lần GET cùng method/path/status có thể chỉ đối soát ZAP ở mức nhóm. Preview thiếu Core hoặc bỏ bước phân trang phải làm ca UI MISSING. |
| Hạn phiên, SCN-AUTH-14 | Với mỗi operation bảo vệ, tách 30 ngày idle và 90 ngày tuyệt đối. Lập cặp ngay trước mốc và đúng mốc. Mỗi quan sát dùng phiên độc lập. Mốc kia còn hiệu lực, tránh việc đọc thành công cập nhật hoạt động của lượt sau. | Trước mốc, dùng kỳ vọng thành công riêng của operation. Tại mốc, kiểm 401, SESSION_INVALID và Bearer challenge. Một phép đo đúng biên cần chứng minh được cùng thời điểm mà Core/DB dùng ra quyết định. |

Ca tái sử dụng lượt là phần runtime mới bắt buộc nếu baseline chưa có đủ oracle. Đăng ký qua handlers của cases.mjs, dùng request adapter hiện có và cơ chế giữ bí mật trong thư mục tạm. Với ca cũ đã đáp ứng, bổ sung truy vết và đối chứng còn thiếu. Không nhân bản ca chỉ để đếm thêm coverage.

**Quyết định riêng về đồng hồ.** Kiểm ageSession trong fixture.mjs và nguồn clock_timestamp() ở sessions.ts. Dịch timestamp trước request rồi đo thời gian từ Node chỉ đủ cho trường hợp “đã quá hạn”. Nếu checkout có phương tiện cố định đúng thời điểm quyết định trong fixture, dùng nó, ghi độ phân giải, kiểm cả hai phía của mốc và giữ hành vi production. Nếu thiếu, hoàn tất phần còn lại, giữ nguyên tám ô MISSING và chỉ rõ phụ thuộc kỹ thuật. Một unit test với đồng hồ giả có thể có giá trị riêng ở tầng unit. Không tính nó vào ô HTTP. Nghiệm thu bước này dựa vào tính đúng của nhãn bằng chứng, không thưởng cho việc giảm số MISSING.

## Bước 3 · Vận hành ZAP, phân loại và báo cáo

1. Giữ plan zap.yaml, image theo digest, Docker cô lập, HAR import không replay và mạng scanner tắt. Mỗi nguồn runner/UI có kết quả import, trạng thái chờ passive, self-check và đối soát riêng. Dùng lại inspectExport, runZap và phần lọc của report.mjs. Không lặp scan khi dữ liệu đầu vào và nguyên nhân lỗi chưa đổi.
2. Trong results.json và đầu summary.md, công bố build, phạm vi fixture, **nguồn phát request**, **phương pháp ZAP thực chạy**, **oracle nghiệp vụ** và **phương pháp còn mở**. Điền từ dữ liệu runtime. Nếu ZAP không khởi động, ghi “chưa chạy”; tách mode cấu hình khỏi kết quả quan sát. Một nguồn mất self-check vẫn phải hiện rõ kể cả khi nguồn kia thành công. Rule 10010 của mẫu tự kiểm không được tính vào finding sản phẩm.
3. Giữ bảng mẫu số hiện có theo operation/trạng thái/nguồn. Cho một dòng minh họa trong summary về quyền đọc hồ sơ: ai tạo request, assertion nào so danh tính, ZAP nhìn thấy gì, bằng chứng ở đâu. Với bản ghi trùng chỉ dẫn tới nhóm, giữ số nhận/số cần, tránh quy alert cho một người dùng riêng. Mở JSON pointer từ summary phải tới dữ liệu đúng build. Liệt kê cả nghĩa vụ MISSING khi chunk tổng hợp đang REVIEW.
4. Triage theo chuỗi rule + phiên bản add-on → operation/nguồn/nhóm → điều khoản áp dụng → assertion cùng build → quyết định và lý do. Mẫu bắt buộc là 10015: so Cache-Control thực tế của phản hồi thuộc contract với yêu cầu no-store. Ghi nhận thiếu bằng chứng về cache native riêng. Thử bản sao review có version hoặc digest nguồn bị đổi, xác nhận nhận định cũ không tự đóng cảnh báo mới. Nếu phát hiện vi phạm contract, giữ FAIL của assertion ngay cả khi đã có nhận định REVIEW về cùng rule.
5. Giữ hai artifact đã lọc. Cho phép ID định nghĩa trước, boolean, số đếm, revision và tham chiếu. HAR thô, token, cookie, query và nội dung hồ sơ ở vùng tạm. Dùng chuỗi đánh dấu giả lập trong test reporter để kiểm cả JSON, Markdown và đường lỗi. Tận dụng fixture ownership và finally hiện có. Không khởi tạo instance mới trước khi biết instance cũ đã dọn hoặc thuộc lượt nào.

## Bước 4 · Các phép nghiệm thu Sol phải chứng minh

Dùng report.test.mjs cho các biến thể bằng chứng giả lập. Chạy một lượt fixture đầy đủ cho hành vi ứng dụng. Biến thể báo cáo chứng minh gate, không đóng vai trò bằng chứng sản phẩm.

| Tình huống | Kết quả cần thấy |
| --- | --- |
| Đủ oracle, đối chứng, self-check hai nguồn và cleanup | Gate đạt cho các ca bắt buộc. Summary nêu đúng phạm vi. |
| Phản hồi 200 đúng schema nhưng ID người dùng sai, hoặc cùng lượt trả hai mã phiên khác nhau | FAIL tại assertion có tên. Ghi case, step, nghĩa vụ, evidenceRef. |
| Bỏ một assertion quyết định trong khi các assertion phụ còn đạt | MISSING cho ca bắt buộc và gate thất bại. Đây là hồi quy cụ thể vì caseOutcome của baseline chỉ đòi có ít nhất một assertion. |
| Mất một bản ghi trong nhóm hai lần phân trang, hoặc thay UI bằng runner | Thiếu bằng chứng đúng nguồn/nhóm. UI MISSING, số nhận/số cần phản ánh mất bản ghi. |
| Có export nhưng mất sentinel ở một nguồn, hoặc ZAP lỗi trước khi import | Gate lỗi công cụ, giữ báo cáo phần đã thu, chỉ rõ nguồn và bước lỗi. |
| Có REVIEW 10015, đồng thời một ca bắt buộc vi phạm oracle | Giữ cả review và failure chi tiết, gate thất bại. Không để thứ tự tổng hợp che nguyên nhân. |
| Fixture chưa dọn, hoặc luồng lỗi chứa chuỗi đánh dấu giả | Gate thất bại khi cleanup lỗi. Hai báo cáo lọc không chứa chuỗi đánh dấu. |
| Chỉ có HAR xác thực và ZAP passive thành công | Phương pháp active ghi “chưa thực hiện”; độ phủ nghiệp vụ chỉ đến từ ca có oracle. |
| Cùng đầu vào chạy lần hai | Manifest không đổi; cùng kết luận và mẫu số sau khi loại trường động có giải thích. Lưu delta thực giữa hai lượt. |

**Thứ tự chạy.** Từ root, ghi git status, git rev-parse HEAD và phiên bản Node/Docker. Dùng Node 22, Docker Compose, OpenSSL và NSS certutil. Chạy npm ci, npm run mobile:setup, npm run security:web:setup, npm run security:validate, rồi npm run security:test. Với Linux CI dùng bước --with-deps trong .github/workflows/check.yml. Kiểm dist/security/summary.md và results.json sau cả lỗi. Sửa một lỗi ở bước hẹp nhất, chạy lại phép kiểm đó rồi chạy toàn suite. Chạy lại cùng đầu vào sau khi sửa xong. Đo thời lượng validate, fixture, browser, ZAP và cleanup bằng log/timing hiện có khi khả dụng; báo bottleneck và số lần retry. Không tăng timeout hay retry để che lỗi mất bằng chứng.

**Nếu runtime không sẵn sàng.** Chạy hết validate, test reporter và các kiểm tra độc lập. Ghi lệnh lỗi, nguyên nhân đã xác minh, build, phần đã chạy và trạng thái cleanup. Nếu có CI được phép sử dụng, nghiệm thu đúng SHA/run/attempt. Nếu chưa có, bàn giao trạng thái chưa nghiệm thu runtime. Phân biệt SHA nguồn và thay đổi chưa commit khi báo cáo local; một SHA của cây bẩn không định danh chính xác build.

**Bàn giao.** Ghi SHA và tình trạng cây, môi trường, case và assertion mới, kết quả từng phép đối chứng, số ô và chunk trước/sau kèm nguyên nhân, thời lượng, review/missing, trạng thái active và cleanup. Dẫn hai artifact đúng lượt cùng lệnh tái lập. Nếu có lỗi sản phẩm, ghi điều khoản, assertion và file/dòng tại SHA, phân biệt nguyên nhân đã kiểm được với giả thuyết. Chỉ công nhận hoàn tất khi skill hướng dẫn được lượt sau, runtime của ca mới có bằng chứng và mọi phép nghiệm thu bắt buộc cho kết quả dự kiến.
