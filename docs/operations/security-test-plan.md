# Kế hoạch phát triển skill test-security

Trạng thái đề xuất. Phạm vi dài hạn là sản phẩm tích lũy qua các sprint. UC-01/02 là lát cắt đầu tiên để nghiệm thu chính skill.

## Đầu vào người dùng cung cấp

- Danh sách chunk bảo mật có ID, nội dung, CWE, nhóm OWASP và phiên bản. [Catalog hiện tại](../requirements/quality/README.md) có 50 tiêu chí rà tĩnh. Một chunk có thể áp dụng cho nhiều thành phần và cần nhiều loại bằng chứng.
- Đặc tả UC mới hoặc thay đổi của sprint, gồm SCN, vai trò, điều kiện, kết quả mong đợi và contract liên quan. Skill giải quyết tham chiếu từ UC đến SRS, SEC và OpenAPI.
- Dự án ở revision xác định, gồm các UC đã bàn giao, kiến trúc, cấu hình build và CI, cùng suite tích lũy nếu có. Lần đầu lập danh mục bề mặt toàn dự án. Các lần sau đối chiếu phần thay đổi với danh mục, kể cả ảnh hưởng lên UC cũ.

## Đầu ra người dùng nhận được

1. Suite có version trong tests/security/, gồm ca có ID ổn định, fixture tổng hợp, kỳ vọng dẫn về điều khoản đặc tả, plan ZAP và lệnh chạy local/CI. Mỗi ca ghi tầng thực thi và cách quan sát kết quả. Thiếu căn cứ để viết kỳ vọng thì ghi câu hỏi về đặc tả.
2. Ma trận chunk × bề mặt liên kết tới UC/SCN, ca kiểm, loại bằng chứng và kết quả. Liệt kê cả tiêu chí chưa kiểm và tiêu chí không áp dụng cùng căn cứ. Phân biệt đạt trong phạm vi đã kiểm, vi phạm đã xác nhận, cần xác minh và chưa đủ bằng chứng. Khi tổng hợp, giữ mọi vi phạm và nêu riêng các bề mặt còn thiếu.
3. Báo cáo theo build có bản tóm tắt cho PR và bản máy đọc được. Mỗi vi phạm ghi chunk/CWE, kịch bản, tiền điều kiện, kỳ vọng, quan sát, bằng chứng đã lọc, lý do vi phạm. Phần điều tra dẫn file và dòng tại đúng commit, nêu nguyên nhân đã xác nhận hoặc giả thuyết cùng chứng cứ còn thiếu.
4. Workflow GitHub Actions chạy lại suite đã lưu trên push và pull request. Báo cáo ghi revision của đặc tả, suite, fixture, build và ZAP. Một lần chạy lại dùng cùng đầu vào để QA kiểm chứng kết quả.

## Các bước phát triển và nghiệm thu

1. **Chốt mẫu ca và ma trận bằng UC-01/02.** Lập danh mục API, mobile, cấu hình triển khai và phụ thuộc theo kiến trúc. Gắn từng chunk với bề mặt có liên quan. Ví dụ, với SEC-PRF-001 và SCN-PRF-09, lấy cursor của tab bài mất qua API. Trong cùng phiên, cursor còn hạn phải dùng được ở đúng tab; đổi sang tab bài nhặt phải nhận HTTP 400 và INVALID_CURSOR. Kỳ vọng xuất phát từ UC spec. Agent dùng mã để xác định thành phần và điều tra sai lệch; thay đổi kỳ vọng cần dẫn về thay đổi đặc tả.
2. **Xây suite tích lũy.** Khởi đầu bằng hành trình phiên và quyền đọc Mục của tôi, gồm đối chứng hợp lệ, các vai trò, trạng thái phiên và ranh giới dữ liệu. Fixture mô tả trước tập kết quả được phép. Bổ sung phép rà cấu hình, mã nguồn hoặc kiểm trên thiết bị cho các nghĩa vụ chỉ quan sát được ở tầng đó. Mọi ô trong ma trận có ca tương ứng hoặc lý do còn trống.
3. **Tích hợp ZAP Automation Framework.** Dùng context giới hạn vào môi trường CI, đối chiếu phạm vi API với OpenAPI, nhập bản ghi HTTP của các hành trình thực tế vào ZAP, xác nhận operation và trạng thái xác thực đã quan sát, đợi xử lý passive hoàn tất rồi xuất report và exit status. Kiểm khả năng nhận plan của action nhóm đã thiết lập; khi action chỉ hỗ trợ packaged scan, dùng image ZAP chính thức để thực thi cùng plan như local. Dùng assertion nghiệp vụ để đối chiếu quyền sở hữu và tập dữ liệu trả về.
4. **Tách chạy suite và điều tra.** Runner xuất kết quả ổn định ngay khi có sai lệch. Agent nhận ca lỗi, đặc tả, bằng chứng đã lọc và source của đúng build để lần theo luồng xử lý, ghi căn cứ và mức chắc chắn. Một cảnh báo ZAP mở mục cần xác minh. Kết luận vi phạm phải chỉ rõ điều khoản và bằng chứng tương ứng. Báo lỗi môi trường hoặc thiếu lưu lượng vào mục thiếu bằng chứng.
5. **Đưa vào CI và mở rộng qua sprint.** Thêm job security sau core, song song với performance, dùng fixture cô lập. Mỗi update chạy suite hồi quy đã lưu. Khi chunk, UC, contract hoặc bề mặt dự án đổi, skill cập nhật ca và ma trận bằng diff để review. CI kiểm tham chiếu phiên bản và ca bị bỏ sót, xuất báo cáo đã lọc rồi dọn fixture kể cả khi lỗi. Chặn vi phạm đã xác nhận, lỗi runner và thiếu bằng chứng bắt buộc. Các điều tra chưa hoàn tất hiển thị rõ trên PR.
6. **Kiểm chính skill.** Dùng dữ liệu kết quả tổng hợp để thử các tình huống đạt, sai kỳ vọng, chỉ có cảnh báo, mất lưu lượng và thiếu đặc tả. Thử thêm UC kế tiếp và xác nhận ca cũ còn chạy. Nghiệm thu khi truy được mỗi chunk tới kết luận hoặc khoảng trống, mỗi vi phạm tới ca và bằng chứng, mỗi kết luận nguyên nhân tới đúng revision.

Tham khảo [ZAP Automation Framework](https://www.zaproxy.org/docs/desktop/addons/automation-framework/) và [ZAP Docker và GitHub Actions](https://www.zaproxy.org/docs/docker/about/).

## Bản giao việc cho 6.2 Sol

### 1. Cố định phạm vi và điểm bắt đầu

Repo quan sát khi lập plan là `tma-706/HK1_2627_INT3505E_1_Group_7`, remote `origin`, base `experiment/tool-evaluation`. Đọc README, AGENTS.md, docs/skill-workflow.md và docs/operations/environments.md. Kiểm tra lại base, remote fetch/push, trạng thái worktree và cập nhật thông tin nhánh từ origin. Giữ thay đổi đang làm của người dùng. Bản plan này đang là file mới trong checkout tại thời điểm bàn giao; đưa vào commit tài liệu của PR. Tạo nhánh `codex/test-security-skill` từ base cập nhật; nếu tên đã có, chọn hậu tố mới. Nếu checkout đang bận, dùng worktree riêng và mang đúng bản plan vào đó.

### 2. Bàn giao các tệp và giao diện vận hành

- `.agents/skills/test-security/SKILL.md` mô tả trigger, ba đầu vào, cách tìm mặc định theo README khi gọi trong repo hiện tại, thứ tự thao tác, điều kiện dừng và đường dẫn kết quả. Theo mẫu metadata của skill dự án. Đưa bảng quyết định dùng lại qua sprint vào references/ khi cần. Cập nhật docs/skill-workflow.md tại bước sau đặc tả và bước nghiệm thu bản build.
- `tests/security/` sở hữu manifest ca, ánh xạ tiêu chí, fixture kỳ vọng, runner và plan AF. Dùng Node 22 và node:test cho assertion nếu phù hợp môi trường repo. Thêm entry point `npm run security:validate` để so khớp dữ liệu đầu vào, `npm run security:test` để chạy trọn vòng fixture → suite → ZAP → báo cáo → dọn dẹp. Cùng entry point cho CI và local; pipeline xác định có thể chạy khi agent vắng mặt.
- `dist/security/` chứa đúng summary.md và results.json đã lọc để upload. Nguyên liệu tạm chứa credential phải ở thư mục riêng, quyền riêng tư, dọn trong finally/trap. Phần hướng dẫn điều tra chỉ cho agent đọc report và source tại revision được ghi khi cần.
- Một hàng nghĩa vụ có chunkId, CWE, surface, UC/SCN nếu có, applicability, reason, evidenceMethod, caseIds. Mỗi ca có id, sourceRef và version, operation/tầng kiểm, preconditions, fixture, action, expected, requiredForPilot. Mỗi kết quả có caseId, outcome, expected/observed đã lọc, evidenceRef và buildSha. Với finding thêm rule hoặc assertion, nguyên nhân và file/dòng tại commit nếu đã xác nhận. Kiểm ID duy nhất, liên kết hai chiều, operation tồn tại trong contract, số chunk phân loại bằng số ID đầu vào và mọi ca bắt buộc có kết quả đúng build.
- Phân công rõ trong skill: agent thiết kế hoặc cập nhật manifest khi đầu vào đổi và điều tra bằng source; runner kiểm manifest, chạy và tổng hợp mỗi update. Khi chạy lại skill với cùng bộ đầu vào, giữ ID, tránh nhân đôi ca và bảo toàn các ca hồi quy cũ. Mỗi chênh lệch hành vi giữa source và đặc tả được ghi thành finding hoặc câu hỏi về đặc tả.

### 3. Bộ đầu vào và happy path bắt buộc của repo hiện tại

Nạp toàn bộ requirements trong docs/requirements/quality/security-owasp-2025.json. Dùng analysis UC-01/02, hai UC spec, docs/api/core/openapi.json và docs/architecture/overview.md. Lập danh mục Core, mobile, gateway/TLS, DB, cấu hình và ranh giới Google. Ghi số chunk thực đọc, danh sách chưa đủ bằng chứng, tiêu chí không áp dụng kèm căn cứ. Có thể kiểm tĩnh với source/config và chạy ca mobile phù hợp ở tầng hiện có; ghi riêng yêu cầu cần thiết bị. Dùng kết quả tĩnh như một loại bằng chứng có phạm vi cụ thể.

| Ca tối thiểu | Đầu vào và thao tác | Oracle cần chứng minh |
| --- | --- | --- |
| Phiên hợp lệ | Thiết lập danh tính tổng hợp A, tạo và xác minh phiên theo SCN-AUTH-04/11 | Phản hồi đúng contract và danh tính đối chiếu được qua getMyProfile |
| Ranh giới phiên | Hai phiên của A, thu hồi phiên hiện tại theo SCN-AUTH-16, quan sát lại cả hai | Phiên đã thu hồi mất hiệu lực, phiên còn lại dùng được theo đặc tả |
| Quyền đọc dữ liệu | Fixture A/B và bên thứ ba, Lost/Found/claims, có cả yêu cầu gửi đi và nhận về; tạo đủ mục để chuyển trang | So tập ID, thứ tự và trường được phép theo fixture khai báo trước trên từng trang; phạm vi theo SCN-PRF-04/06/07 |
| Phạm vi cursor | SCN-PRF-09, cursor còn hạn, cùng phiên đúng tab và cùng phiên khác tab | Đúng tab lấy được trang tiếp; sai tab trả 400 INVALID_CURSOR |
| Cấu hình và client | Chọn ít nhất một chunk thực sự áp dụng cho cấu hình triển khai và một nghĩa vụ áp dụng cho mobile; dẫn nguồn và chạy phép kiểm tương ứng | Có bằng chứng gắn với revision và tầng quan sát; yêu cầu cần thiết bị được theo dõi riêng |

Dùng `bash infra/uc01-local/run.sh up`, CA tại dist/uc01-local/tls/ca.crt và môi trường fixture của repo. Xem hàm prepareFixture trong tests/performance/uc-02/fixture.mjs để tái sử dụng phần dựng dữ liệu phù hợp. Kỳ vọng độc lập do suite sở hữu; chỉ adapter chuẩn bị dữ liệu được chạm DB. Theo dõi getCoreReadiness riêng. Năm operation nghiệp vụ phải có phản hồi quan sát thật từ build, trong đó có luồng xác thực thành công. Ghi revision và digest input để phát hiện kết quả cũ. Fixture Compose hiện dùng tên project cố định; dùng runner CI riêng và tránh chạy chồng hai suite local dùng chung fixture. Chỉ dọn instance do lượt chạy sở hữu.

### 4. ZAP và chính sách kết quả

Mặc định chạy runner qua HTTPS đã tin CA fixture. Adapter HTTP ghi HAR tạm trực tiếp từ trao đổi thật, giữ request/response cần cho phân tích trong phạm vi fixture. Dùng AF theo thứ tự context fixture → cấu hình passive → import HAR với sendRequests=false → passiveScan-wait có timeout → report → exitStatus. Đối chiếu method, path chuẩn hóa và status đã được ZAP tiếp nhận với danh sách ca bắt buộc, dùng thống kê/job test hoặc export tạm từ ZAP. Kiểm trên image đã chọn rằng message import thực sự được passive scanner xử lý bằng một mẫu HTTP tổng hợp có tín hiệu cảnh báo thụ động đã biết, tách mẫu kiểm công cụ khỏi finding sản phẩm. Nếu image/add-on không xử lý HAR như yêu cầu, chuyển sang proxy thụ động cho cùng các hành trình và lặp lại kiểm chứng. Chỉ dùng dữ liệu tổng hợp và endpoint fixture trong workflow. Không cần tài khoản Google thật.

Kiểm action/workflow dùng chung mà repo thực tế tham chiếu. Nếu action có input nhận AF plan, dùng chính action đó và kiểm log đúng plan. Nếu chỉ có packaged action, chạy image ZAP chính thức bằng digest với -cmd -autorun, giữ action upload artifact sẵn có. Ghi phiên bản ZAP/add-on và lựa chọn tích hợp vào báo cáo. [AF import](https://www.zaproxy.org/docs/desktop/addons/import-export/automation/) · [AF exitStatus](https://www.zaproxy.org/docs/desktop/addons/automation-framework/job-exitstatus/)

Tổng hợp riêng PASS, FAIL, REVIEW, MISSING, N/A. Điều kiện chặn gồm vi phạm đã xác nhận, lỗi công cụ, assertion bất thành hoặc thiếu bằng chứng bắt buộc. Cảnh báo thụ động mới vào REVIEW tới khi có đối chiếu. Ghi kết quả chi tiết trước khi trả exit code khác 0. Một chunk được ghi đạt trong phạm vi đã nêu chỉ khi đủ các phép kiểm cần thiết cho phạm vi đó. Báo cáo chưa đủ bằng chứng và N/A hiển thị đầy đủ cạnh kết quả đạt.

### 5. Kiểm nghiệm trước khi mở PR

1. Validate manifest. Dựng và chạy đủ hai UC. Kiểm kết quả bằng máy và mở summary như người nhận bàn giao. Kiểm artifact chỉ chứa các trường cho phép; thử token giả làm dấu kiểm để xác nhận reporter đã loại dữ liệu nhạy cảm.
2. Thử sai lệch bằng bản sao kết quả tổng hợp có ID quan sát sai và bản thiếu bằng chứng một operation. Cả hai phải sinh báo cáo, phân biệt FAIL với MISSING và trả exit khác 0. Chạy kiểm chứng passive ở bước 4. Để các mẫu tự kiểm ngoài báo cáo sản phẩm.
3. Thực sự gọi skill theo đúng ba đầu vào trong một lượt nghiệm thu. Nếu client chưa index skill mới, đọc entrypoint từ đường dẫn repo và vận hành đúng từng bước, ghi rõ cách gọi. Kiểm lần hai cùng đầu vào giữ nguyên manifest. Nếu máy local thiếu runtime, chạy phần runtime trên GitHub-hosted runner và ghi rõ môi trường kiểm tra.
4. Với failure, đọc assertion/log đã lọc, đối chiếu contract và phân loại. Sửa runner, fixture, plan, workflow hoặc sản phẩm khi nguyên nhân và hành vi đúng đã rõ, thêm hồi quy cho lỗi thực tế rồi chạy lại bước lỗi và toàn suite. Khi phải đổi quy tắc nghiệp vụ, ghi câu hỏi và dừng phần phụ thuộc. Giữ nguyên kỳ vọng khi sửa sản phẩm. Không hạ gate, bỏ ca bắt buộc hoặc bỏ qua check để tạo lượt xanh.

### 6. Nghiệm thu GitHub và điều kiện kết thúc

- Bổ sung job security sau core trong .github/workflows/check.yml, runner riêng song song performance, contents: read, timeout hữu hạn, checkout và cài Node 22, npm ci, validate và chạy entry point. Upload hai file đã lọc với if: always(), tên gồm run ID và attempt; nếu artifact thiếu, job phải phản ánh lỗi. Luôn chạy cleanup có kiểm tra ownership.
- Trước mỗi push, xác minh push URL và danh tính **credential thực tế của Git cho URL đó**. Với HTTPS, dùng credential helper trong tiến trình riêng và đối chiếu danh tính chủ token qua GitHub /user, chỉ in login; tuyệt đối không in credential, header hoặc nguyên stdout của git credential fill. Kiểm gh api user cho tác vụ PR/merge. Cả hai phải là hehuanglu; nếu không xác minh được thì dừng thao tác remote và báo blocker. Kiểm diff, stage đúng file của nhiệm vụ, push nhánh mới, mở PR về experiment/tool-evaluation. Không push thẳng lên base.
- Theo dõi tới khi mọi check bắt buộc và cả core/performance/security trên head cuối đạt. Tải artifact đúng run/attempt và đọc kết quả, xác minh commit thực sự được test (PR có thể checkout merge SHA), coverage, ca bắt buộc, tín hiệu passive và trạng thái fixture. Khi sửa tiếp, đẩy commit mới và theo dõi run mới. Nếu base tiến lên, tích hợp thay đổi và kiểm lại khi cần.
- Merge bằng hehuanglu theo phương thức repo cho phép sau khi kiểm tra head SHA vẫn đúng. Tôn trọng review bắt buộc hoặc merge queue; nếu thiếu quyền/review thực, ghi PR và blocker. Kiểm PR thực sự merged vào base, lấy SHA trên base và đợi workflow push trên revision tích hợp thành công. Nếu lỗi sau merge, dùng nhánh/PR sửa tiếp cùng quy trình.
- Bàn giao PR URL, SHA cuối, link CI và artifact, số chunk theo trạng thái, ca thực sự chạy, finding/điểm còn mở và lệnh local. Hoàn thiện khi một lượt **vận hành skill thực tế** sinh đủ ma trận, suite và báo cáo cho dự án hiện tại, các ca bắt buộc đạt, CI của revision tích hợp đạt và bằng chứng đã kiểm được. Đếm các mục REVIEW/MISSING ngoài pilot một cách minh bạch.
