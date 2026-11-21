# Từ SRS đến mã

1. Dùng [SRS](requirements/lost-and-found-srs.pdf) để xác định FR, EI, UI và PR của UC. Khi đổi nghiệp vụ, ghi quyết định cùng nguồn yêu cầu theo phạm vi áp dụng.
2. `$analyze-srs` đối chiếu quyền, lỗi, cạnh tranh và phép đo. Bàn giao tại [analysis](requirements/analysis/).
3. `$design-api-spec` dùng SRS, analysis và contract hiện có. Duyệt Execution Prompt rồi cập nhật [OpenAPI của Core](api/core/openapi.json) và các ghi chú không biểu diễn được trong schema.
4. `$compose-uc-spec` lập SCN từ SRS, analysis và contract. Mỗi SCN ghi tác nhân, tiền điều kiện, hành động, kết quả, operation hoặc tầng thực thi và tiêu chí đạt.
5. `$run-secure-aidlc` dùng UC spec, phiên bản contract và SCN đã chọn để triển khai. Đích mã sản phẩm là `apps/`. Dùng fixture tổng hợp cho kiểm thử quyền và `$test-performance` khi cần đo theo PR. Đích nghiên cứu và bằng chứng theo quy định của skill, tách khỏi mã sản phẩm.
6. Kiểm lại theo [hướng dẫn chạy](operations/environments.md) và các SCN của build đã triển khai. Ghi môi trường, lệnh, phiên bản fixture và kết quả quan sát được.

## Mã định danh và phiên bản

Giữ FR/EI/PR từ SRS. Dùng SEC/PERF cho tiêu chí suy ra, SCN cho kịch bản. Nguồn trong hợp đồng, UC, test và bằng chứng ghi đường dẫn cùng `commit:<sha>` hoặc `sha256:<digest>` nếu chưa có commit. Khi nguồn đổi, đối chiếu qua ID và operation trước khi cập nhật đầu ra phụ thuộc.
