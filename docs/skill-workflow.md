# Từ SRS đến mã

1. Dùng [SRS](requirements/lost-and-found-srs.pdf) để xác định FR, EI, UI và PR của UC. Khi đổi nghiệp vụ, ghi quyết định cùng nguồn yêu cầu theo phạm vi áp dụng.
2. `$analyze-srs` dùng [tiêu chí tham chiếu](requirements/quality/README.md) để rà rủi ro và chọn phép đo. Ghi các SEC/PERF áp dụng và căn cứ tại [analysis](requirements/analysis/).
3. `$design-api-spec` dùng SRS, SEC/PERF trong analysis và contract hiện có. Chọn tiêu chí theo bề mặt và hành vi quan sát được của từng operation, ghi căn cứ và nơi kiểm chứng. Duyệt Execution Prompt rồi cập nhật [OpenAPI của Core](api/core/openapi.json) và các ghi chú không biểu diễn được trong schema.
4. `$compose-uc-spec` viết luồng chính, luồng thay thế và luồng ngoại lệ từ SRS, analysis và contract. Với UC có giao diện, bàn giao thêm `<slug>-ui.md` có phiên bản, ảnh nhúng và neo ổn định theo màn và trạng thái. Từng bước hoặc nhánh có UI dẫn thẳng tới hình tương ứng. Hai tài liệu ở trạng thái **Chờ duyệt** đến khi người dùng xác nhận phiên bản. Phần bàn giao nêu trách nhiệm từng tầng. Bảng SCN nối luồng với yêu cầu, operation hoặc tầng thực thi và tiêu chí đạt.
5. `$test-security` dùng catalog đầy đủ, UC spec cùng contract và checkout để lập ma trận theo bề mặt, chọn các ô operation và trạng thái phiên từ SCN, khai báo fixture và hành trình trình duyệt. Xem [kế hoạch kiểm bảo mật](operations/security-test-plan.md).
6. `$run-secure-aidlc` dùng UC spec, phiên bản contract và SCN đã chọn để triển khai. Đích mã sản phẩm là `apps/`. Dùng fixture tổng hợp cho kiểm thử quyền và `$test-performance` khi cần đo theo PR. Đích nghiên cứu và bằng chứng theo quy định của skill, tách khỏi mã sản phẩm.
7. Kiểm lại theo [hướng dẫn chạy](operations/environments.md) và các SCN của build đã triển khai. Chạy `$test-security` trên build đã định danh và đọc tiêu chí, độ phủ operation của runner và UI, cùng đối soát ZAP trong `dist/security/`. Ghi môi trường, lệnh, phiên bản fixture và kết quả quan sát được.

## Mã định danh và phiên bản

Giữ FR/EI/PR từ SRS. Dùng SEC/PERF cho tiêu chí suy ra, SCN cho kịch bản. Nguồn trong hợp đồng, UC, test và bằng chứng ghi đường dẫn cùng `commit:<sha>` hoặc `sha256:<digest>` nếu chưa có commit. Khi nguồn đổi, đối chiếu qua ID và operation trước khi cập nhật đầu ra phụ thuộc.
