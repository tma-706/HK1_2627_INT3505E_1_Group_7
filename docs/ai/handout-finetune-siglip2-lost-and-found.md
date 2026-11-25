# Handout fine-tune SigLIP2 cho Lost & Found

> **Phạm vi:** Phase 1 chỉ xây dựng và đánh giá image/text embedding bằng SigLIP2 trên Kaggle. OCR, redact, gợi ý câu hỏi, vector database và deployment được để sang phase sau.

## 1. Kết quả cần đạt

Sau phase này, nhóm cần có một checkpoint SigLIP2 có thể:

1. Biến mô tả tiếng Việt thành text embedding.
2. Biến ảnh món đồ thành image embedding.
3. Đưa ảnh và text vào cùng embedding space để tính cosine similarity.
4. Hiểu tốt hơn câu Lost & Found có viết tắt, thiếu chủ ngữ, không dấu hoặc sai chính tả nhẹ.
5. Xếp đúng món đồ vào Top 5–10 trên tập test chưa từng thấy khi train.

Artifact cuối phase:

```text
best checkpoint hoặc LoRA adapter
processor/tokenizer
normalizer rules
train/validation/test manifest
evaluation report và error analysis
training configuration
model version
```

Metric nghiệp vụ chính là **Recall@10 của Lost text → Found item**, vì hệ thống cuối cùng trả Top 5–10 để người dùng tự xác nhận.

---

## 2. SigLIP2 hoạt động như thế nào?

SigLIP2 là dual encoder:

```text
Text Encoder  ──> text embedding  ─┐
                                   ├── cosine similarity
Vision Encoder ─> image embedding ─┘
```

Hai embedding nằm trong cùng không gian, vì vậy có thể thực hiện:

```text
text  → image
image → text
text  → text
image → image
```

Model khởi đầu đề xuất:

```text
google/siglip2-base-patch16-224
```

Lý do:

- Nhẹ hơn Large/So400m, phù hợp GPU Kaggle.
- Có sẵn hai encoder chung embedding space.
- Đủ để lập baseline và chứng minh fine-tuning.
- Ảnh 224×224 giúp giảm VRAM ở phase đầu.

SigLIP2 vốn là multilingual vision-language encoder, nhưng text–text cho tiếng Việt informal không mặc định tốt như sentence embedding model chuyên dụng. Ta sẽ bổ sung clean/noisy text alignment khi fine-tune.

Theo tài liệu Transformers, text nên được xử lý nhất quán với pretraining: lowercase, `padding="max_length"`, `max_length=64`. Tham khảo [Hugging Face SigLIP2](https://huggingface.co/docs/transformers/model_doc/siglip2) và [bài báo SigLIP2](https://arxiv.org/abs/2502.14786).

---

## 3. Phase này fine-tune phần nào?

### Cấu hình khuyến nghị

```text
Vision Encoder
└── freeze toàn bộ

Text Encoder
├── freeze embedding và các block đầu
├── train 1–2 block cuối
└── train text projection

Shared alignment parameters
└── train logit scale/bias nếu checkpoint cho phép
```

Mục đích là điều chỉnh cách model hiểu tiếng Việt Lost & Found mà vẫn giữ image space ổn định.

### Vì sao chưa fine-tune vision ngay?

- Vision model gốc đã nhận biết khá tốt loại đồ vật, màu sắc và hình dạng phổ biến.
- Dataset đồ án thường nhỏ, mở vision tower sớm dễ overfit.
- Freeze vision giúp xác định cải thiện có đến từ text adaptation hay không.
- Giảm VRAM và thời gian train trên Kaggle.

Chỉ fine-tune vision ở thí nghiệm sau khi số liệu chứng minh nhánh ảnh là bottleneck.

---

## 4. Các hướng fine-tune

Không chạy tất cả cùng lúc. Đi từ đơn giản đến phức tạp và giữ cùng một test set.

### Hướng A — Projection only

```text
Vision Encoder: freeze
Text Encoder:   freeze
Projection:     train
```

Ưu điểm: nhẹ, nhanh, ít overfit, phù hợp smoke test.

Nhược điểm: khó học nghĩa từ viết tắt theo context vì không thay đổi cách các token tương tác trong câu.

### Hướng B — Mở 1–2 block cuối text encoder

```text
Vision Encoder:       freeze
Text blocks đầu:      freeze
Text blocks cuối:     train
Text projection:      train
```

Đây là hướng **khuyến nghị cho Phase 1**.

### Hướng C — LoRA trên text encoder

Gắn LoRA vào attention/MLP của các block cuối text tower.

Ưu điểm:

- Ít tham số train và optimizer state.
- Adapter nhỏ, dễ lưu version.

Nhược điểm:

- Phải xác định đúng target module theo phiên bản Transformers.
- Pipeline phức tạp hơn mở trực tiếp block cuối.

Chỉ nên thử sau khi baseline và training loop chạy đúng.

### Ma trận experiment

| ID | Cấu hình | Mục đích |
|---|---|---|
| E0 | Model gốc | Zero-shot baseline |
| E1 | Projection only | Kiểm tra pipeline |
| E2 | 2 text blocks cuối + projection | Experiment chính |
| E3 | LoRA text tower | So sánh nếu còn thời gian |
| E4 | 1 vision block cuối + text | Chỉ khi vision là bottleneck |

---

## 5. Chuẩn bị Kaggle Notebook

### Tài nguyên

- Kaggle Notebook bật GPU.
- Internet bật lúc tải base model và thư viện.
- Dataset upload thành Kaggle Dataset riêng.
- Dataset để private nếu chưa được phép công khai.
- Không đưa ảnh giấy tờ thật hoặc PII thật vào dữ liệu train.

### Thư viện

```text
torch
transformers
datasets
accelerate
pandas
numpy
pillow
scikit-learn
tqdm
```

Nếu dùng LoRA, thêm `peft`.

Sau lần chạy thành công đầu tiên, ghi lại và pin phiên bản thư viện để các thành viên tái lập được kết quả.

### Cấu trúc notebook

```text
00. Configuration và random seed
01. Cài thư viện, kiểm tra GPU
02. Load và validate metadata
03. Chia train/validation/test theo item_id
04. Load processor và base model
05. Chạy zero-shot baseline
06. Freeze/unfreeze parameters
07. Dataset, sampler và DataLoader
08. Loss function
09. Training loop
10. Validation mỗi epoch
11. Test text-only
12. Test image–text và image-only
13. Error analysis
14. Save checkpoint, processor và metrics
```

### Configuration tập trung

```python
CONFIG = {
    "model_id": "google/siglip2-base-patch16-224",
    "seed": 42,
    "max_text_length": 64,
    "image_size": 224,
    "batch_size": 16,
    "gradient_accumulation_steps": 2,
    "epochs": 4,
    "learning_rate": 2e-5,
    "weight_decay": 0.01,
    "warmup_ratio": 0.05,
    "train_last_text_blocks": 2,
    "clean_noisy_loss_weight": 0.2,
    "primary_metric": "text_to_image_recall_at_10",
}
```

Đây là giá trị bắt đầu, không phải cấu hình tối ưu đảm bảo cho mọi dataset.

---

## 6. Dữ liệu cần có dạng nào?

### Một item có nhiều ảnh và nhiều cách mô tả

```json
{
  "item_id": "watch_001",
  "category": "WATCH",
  "images": [
    "images/watch_001_01.jpg",
    "images/watch_001_02.jpg"
  ],
  "found_texts": [
    "nhặt được đồng hồ casio dây màu đen ở sân trường"
  ],
  "lost_texts": [
    "mất đh casio dây đen, mặt kính bị xước"
  ],
  "clean_texts": [
    "đồng hồ casio dây màu đen, mặt kính bị xước"
  ],
  "noisy_texts": [
    "đh casio dây đen xước mặt",
    "mất dh casio day den"
  ]
}
```

Có thể lưu JSONL như trên hoặc flatten thành CSV.

### Schema CSV đơn giản

```csv
item_id,image_path,found_text,lost_text,clean_text,noisy_text,category
watch_001,images/watch_001_01.jpg,"nhặt được đồng hồ casio dây đen","mất đh casio dây đen xước mặt","đồng hồ casio dây màu đen, mặt kính bị xước","đh casio dây đen xước mặt",WATCH
student_card_001,images/student_card_001.jpg,"nhặt được thẻ sinh viên trước cổng trường","mất thẻ sv gần đh bách khoa","thẻ sinh viên đại học bách khoa","thẻ sv đh bách khoa",STUDENT_CARD
phone_001,images/phone_001.jpg,"nhặt được điện thoại samsung màu đen","mất đt ss đen ốp mèo","điện thoại samsung màu đen, ốp hình con mèo","đt ss đen ốp mèo",PHONE
wallet_014,images/wallet_014.jpg,"nhặt được ví trên đường tỉnh 743","mất ví nâu gần đt 743","ví màu nâu bị mất trên đường tỉnh 743","ví nâu gần đt 743",WALLET
```

Một dòng là một image–text sample. Nhiều dòng được phép có cùng `item_id` nếu là ảnh/caption khác của cùng món đồ.

### Data viết tắt theo context

Không train dữ liệu kiểu:

```text
"đh" → "đồng hồ"
```

Phải dùng cả câu vì một viết tắt có thể có nhiều nghĩa.

#### `đh` nghĩa là đồng hồ

```json
{
  "item_id": "watch_001",
  "image_path": "images/watch_001.jpg",
  "noisy_text": "mất đh casio dây đen, xước mặt",
  "clean_text": "mất đồng hồ casio dây màu đen, mặt kính bị xước",
  "category": "WATCH"
}
```

#### `đh` nghĩa là đại học

```json
{
  "item_id": "student_card_001",
  "image_path": "images/student_card_001.jpg",
  "noisy_text": "nhặt dc thẻ sv trước cổng đh bách khoa",
  "clean_text": "nhặt được thẻ sinh viên trước cổng đại học bách khoa",
  "category": "STUDENT_CARD"
}
```

#### `đt` nghĩa là điện thoại

```json
{
  "item_id": "phone_001",
  "image_path": "images/phone_001.jpg",
  "noisy_text": "mất đt ss đen, ốp hình mèo",
  "clean_text": "mất điện thoại samsung màu đen, ốp hình con mèo",
  "category": "PHONE"
}
```

#### `ĐT` nghĩa là đường tỉnh

```json
{
  "item_id": "wallet_014",
  "image_path": "images/wallet_014.jpg",
  "noisy_text": "nhặt ví trên đt 743 gần ngã tư",
  "clean_text": "nhặt được ví trên đường tỉnh 743 gần ngã tư",
  "category": "WALLET"
}
```

#### Một câu chứa hai cách hiểu của `bh`

```json
{
  "item_id": "helmet_012",
  "image_path": "images/helmet_012.jpg",
  "noisy_text": "để quên mũ bh gần bh xanh",
  "clean_text": "để quên mũ bảo hiểm gần cửa hàng bách hóa xanh",
  "category": "HELMET"
}
```

Mục tiêu:

```text
embedding(noisy_text)
≈ embedding(clean_text)
≈ embedding(image cùng item)
```

Model không cần sinh lại câu clean.

### Normalizer và context learning

```text
Từ gần như chỉ có một nghĩa → normalizer rule
Từ phụ thuộc context         → model học từ toàn câu
```

Ví dụ normalizer:

```json
{
  "ko": "không",
  "dc": "được",
  "mk": "mình"
}
```

Không normalize cứng `đh`, `đt`, `tr`, `k` nếu có nhiều nghĩa trong dữ liệu.

### Hard negatives

Negative không nên chỉ là:

```text
balo ↔ chai nước
```

Cần thêm:

```text
balo Nike đen ↔ balo Adidas đen
ví nâu có khóa ↔ ví nâu không khóa
iPhone đen ↔ Samsung đen
đồng hồ Casio dây đen ↔ đồng hồ Casio dây xanh
```

Ưu tiên negative cùng category/màu/brand nhưng khác `item_id`.

### Số lượng thực dụng

```text
Prototype pipeline:   500–1.000 item khác nhau
Fine-tune có ý nghĩa: 1.000–3.000 item khác nhau
Mỗi item:             1–3 ảnh, 3–6 text variants
```

Số item khác nhau quan trọng hơn số câu augmentation từ cùng một item. Mỗi nghĩa của abbreviation cần có nhiều item; tránh mất cân bằng quá lớn.

---

## 7. Chia train, validation và test

Phải chia theo `item_id`, không chia ngẫu nhiên từng dòng:

```text
Train:      70–80%
Validation: 10–15%
Test:       10–15%
```

Sai:

```text
watch_001 ảnh 1 → train
watch_001 ảnh 2 → test
```

Đúng:

```text
Toàn bộ watch_001 → chỉ nằm trong một split
```

Trong test split, một item vẫn có thể có nhiều ảnh/caption; chúng là các positive của nhau khi đánh giá retrieval.

Gắn tag cho test subset:

```text
clean_text
noisy_text
ambiguous_abbreviation
hard_negative
text_only_lost
lost_with_image
```

---

## 8. Preprocessing

### Text

- Unicode normalize thống nhất.
- Lowercase và chuẩn hóa khoảng trắng.
- Giữ dấu tiếng Việt nếu câu gốc có dấu.
- Không xóa màu, brand, model, vết xước hoặc đặc điểm nhận dạng.
- Không tự động mở rộng từ đa nghĩa.
- Dùng `max_length=64` theo processor/model.

Nếu mô tả dài, tạo `retrieval_text` ngắn:

```text
[category] balo; [color] đen; [brand] nike;
[feature] xước khóa trước; [location] thư viện
```

### Ảnh

- Convert RGB và kiểm tra ảnh hỏng.
- Dùng processor chính thức của checkpoint.
- Augmentation nhẹ: brightness/contrast nhỏ, crop nhẹ, rotation nhỏ.
- Không crop mất logo, khóa, vết xước hoặc phần lớn vật thể.
- Giữ ảnh gốc; augmentation chỉ chạy lúc load batch.

---

## 9. Xây batch đúng cách

Mỗi training sample lấy:

```text
1 item_id
1 ảnh ngẫu nhiên
1 found/clean text
1 lost/noisy text
```

Trong một batch, tránh hai slot có cùng `item_id` nếu loss mặc định xem các cặp ngoài đường chéo là negative. Nếu không, ảnh/caption cùng món đồ có thể bị coi là false negative.

Cách đơn giản:

1. Mỗi batch chỉ có một sample trên mỗi `item_id`.
2. Mỗi epoch random ảnh và text variant khác.
3. Các item còn lại trong batch làm in-batch negatives.

---

## 10. Loss function

Ba mục tiêu:

```text
L_image_clean
L_image_noisy
L_clean_noisy
```

Loss tổng:

```text
L_total =
    L_image_clean
  + L_image_noisy
  + λ × L_clean_noisy
```

Bắt đầu với:

```text
λ = 0.1–0.3
```

- `L_image_clean`: ảnh gần text chuẩn.
- `L_image_noisy`: ảnh gần text viết tắt/đời thường.
- `L_clean_noisy`: hai text cùng item gần nhau.

SigLIP dùng pairwise sigmoid loss cho image–text alignment. Text–text có thể dùng cosine embedding loss hoặc supervised contrastive loss.

Không chỉ train clean/noisy text: làm vậy có thể khiến text space trôi khỏi image space. Luôn giữ image–text loss.

Trước cosine, L2-normalize embedding nhất quán:

```python
embedding = embedding / embedding.norm(dim=-1, keepdim=True)
```

---

## 11. Training configuration ban đầu

```yaml
precision: fp16
epochs: 3-5
batch_size: 16
gradient_accumulation_steps: 2-4
learning_rate: 1e-5 đến 3e-5
weight_decay: 0.01
warmup_ratio: 0.05
train_last_text_blocks: 2
clean_noisy_loss_weight: 0.2
early_stopping: true
```

Nên dùng:

- Mixed precision `fp16`.
- Gradient accumulation nếu thiếu VRAM.
- Gradient clipping.
- Early stopping.
- Save best checkpoint theo validation Recall@10, không mặc định lấy epoch cuối.

Log tối thiểu:

```text
train loss theo từng thành phần
validation loss
Recall@1/5/10
MRR
learning rate
gradient norm
GPU memory
epoch time
```

---

## 12. Zero-shot baseline bắt buộc

Trước fine-tune, chạy model gốc theo đúng protocol validation/test.

| Model | Text→Text R@10 | Text→Image R@10 | Image→Image R@10 |
|---|---:|---:|---:|
| Base SigLIP2 | ... | ... | ... |
| E1 Projection | ... | ... | ... |
| E2 Text last-2 | ... | ... | ... |

Không có baseline thì không thể chứng minh fine-tune tạo cải thiện.

---

## 13. Test riêng nhánh text

### Text-to-text retrieval

```text
Query: Lost/noisy texts
Gallery: Found/clean texts
Positive: cùng item_id
Negative: khác item_id
```

Quy trình:

1. Encode toàn bộ query Lost/noisy.
2. Encode toàn bộ candidate Found/clean.
3. L2-normalize.
4. Tính cosine similarity matrix.
5. Sort candidate cho từng query.
6. Ghi rank đầu tiên có cùng `item_id`.

Metric:

```text
Recall@1
Recall@5
Recall@10
MRR
Median Rank
```

### Test viết tắt theo context

Tạo subset có:

```text
đh = đồng hồ / đại học
đt = điện thoại / đường tỉnh
tr = trường / triệu
k  = không / nghìn
bh = bảo hiểm / Bách Hóa
```

Ngoài metric tổng, in Top 5 để kiểm tra model dùng toàn câu hay chỉ ghi nhớ token.

```text
Query: "mất đh casio dây đen"

Mong muốn:
1. đồng hồ Casio dây đen ...

Không mong muốn:
1. thẻ sinh viên đại học ...
```

### Clean/noisy margin

```text
positive = cos(clean, noisy cùng item)
negative = cos(noisy, hard negative cùng category)
margin   = positive - negative
```

Không chỉ cần positive cao; margin với item dễ nhầm cũng phải đủ lớn.

Báo cáo riêng:

```text
Clean Vietnamese
Noisy có dấu
Noisy không dấu
Viết tắt một nghĩa
Viết tắt đa nghĩa
Hard negative cùng category
```

---

## 14. Test cả text và ảnh

### Text-to-image — bài test chính

```text
Query: Lost/noisy text
Gallery: Found images trong test split
Positive: cùng item_id
```

Nếu item có nhiều ảnh, chỉ cần một ảnh cùng `item_id` trong Top K là hit. Đồng thời nên đánh giá ở cấp item bằng cách group ảnh theo `item_id` và lấy similarity tốt nhất.

Metric:

```text
Text→Image Recall@1/5/10
MRR
Median Rank
```

### Image-to-text

```text
Query: Found image
Gallery: Lost/noisy texts
Positive: cùng item_id
```

Phép test này kiểm tra alignment hai chiều và phát hiện text tower bị lệch khỏi image space.

### Image-to-image — test nhánh ảnh riêng

Test item cần ít nhất hai ảnh khác góc:

```text
Query: ảnh góc A
Gallery: ảnh góc B của các item
Positive: cùng item_id
```

Nếu vision encoder freeze, metric image→image trước và sau fine-tune phải gần như không đổi. Nếu thay đổi lớn, kiểm tra preprocessing, checkpoint loading và normalization.

### Image-level và item-level

```text
Image-level: rank từng ảnh riêng
Item-level:  group theo item_id, lấy max similarity của item
```

Nghiệp vụ quan tâm item-level Top 5–10 hơn.

---

## 15. Có nên fine-tune nhánh ảnh không?

**Chưa nên ở experiment đầu.** Freeze vision, đo image-only baseline và fine-tune text trước.

Chỉ cân nhắc khi:

1. Image→Image Recall@10 thấp dù ảnh đa góc rõ ràng.
2. Model nhầm vật cùng category do đặc điểm domain đặc thù.
3. Text-only tăng nhưng Text→Image hầu như không tăng.
4. Dataset có đủ item và ảnh đa góc để không overfit.

Trước khi mở vision, kiểm tra:

- Crop có mất vật thể không?
- Vật thể có quá nhỏ không?
- 224×224 có làm mất đặc điểm quan trọng không?
- Background có chiếm phần lớn ảnh không?
- Nhãn “cùng item” có chính xác không?
- Preprocessing train/test có giống nhau không?

Nếu vẫn cần fine-tune, chỉ mở block cuối và dùng learning rate vision nhỏ hơn text khoảng 5–10 lần. Chạy thành experiment E4 riêng; không mở toàn bộ vision tower ngay.

---

## 16. Chẩn đoán khi kết quả chưa tốt

### Train tốt, validation/test kém

Nguyên nhân: overfit, leakage, quá nhiều caption từ ít item, mở quá nhiều layer.

Điều chỉnh:

- Giảm epoch/LR hoặc số block mở.
- Early stopping.
- Tăng số item thật.
- Thêm hard negatives.
- Kiểm tra split theo `item_id`.

### Text→Text tăng nhưng Text→Image giảm

Text space có thể đã trôi khỏi image space.

Điều chỉnh:

- Tăng image–text loss.
- Giảm `clean_noisy_loss_weight`.
- Giảm LR text tower.
- Freeze thêm block.
- Chọn checkpoint bằng Text→Image Recall@10, không bằng text-only metric.

### Clean tốt nhưng noisy kém

- Bổ sung câu người thật viết.
- Cân bằng các nghĩa của abbreviation.
- Thêm câu không dấu/lỗi nhẹ.
- Tăng noisy sample trong batch.
- Nếu projection-only không đủ, mở text block hoặc dùng LoRA.

### Nhầm các món cùng loại

- Dùng hard-negative sampler cùng category/màu/brand.
- Bổ sung caption có đặc điểm phân biệt.
- Thu thập ảnh đa góc.
- Không kỳ vọng model phân biệt hai món giống hệt nếu input không có thông tin phân biệt.

### Image→Image thấp

Điều chỉnh theo thứ tự:

1. Kiểm tra label.
2. Kiểm tra crop/resize.
3. Loại ảnh quá mờ/vật thể quá nhỏ.
4. Tăng ảnh đa góc.
5. Thử độ phân giải cao hoặc NaFlex ở experiment riêng.
6. Cuối cùng mới mở vision block cuối.

### Loss không giảm hoặc NaN

Kiểm tra:

- Normalize embedding.
- Mapping positive trong batch.
- Duplicate `item_id` gây false negative.
- FP16 overflow.
- Learning rate.
- NaN/Inf trong tensor.
- Gradient norm.

Thử giảm LR, gradient clipping hoặc debug một batch ở FP32.

### Metric đẹp bất thường

Khả năng leakage:

- Cùng item ở train và test.
- Cùng ảnh copy với tên khác.
- Caption chứa ID giúp model “đoán”.
- Gallery test quá nhỏ/dễ.

Kiểm tra duplicate bằng checksum/perceptual hash và audit split.

---

## 17. Error analysis bắt buộc

Xuất file:

```csv
query_id,query_text,true_item_id,rank,top1_item_id,top1_score,error_group
```

Nhóm lỗi:

```text
WRONG_ABBREVIATION_SENSE
SAME_CATEGORY_CONFUSION
COLOR_CONFUSION
BRAND_CONFUSION
MISSING_DISTINCTIVE_DETAIL
BAD_IMAGE_CROP
TEXT_TRUNCATION
LABEL_ERROR
```

Mỗi lần chỉnh model/data phải dựa trên lỗi quan sát được và chỉ thay một yếu tố chính.

Nên lưu Top 5 cho:

- 20 query tốt nhất.
- 20 query thất bại nặng nhất.
- 20 query viết tắt đa nghĩa.
- 20 hard-negative query.

---

## 18. Chọn checkpoint

Không chọn chỉ theo train loss.

Ưu tiên:

1. Text→Image Recall@10 validation.
2. Text→Image Recall@5.
3. Text→Text Recall@10 trên noisy subset.
4. Không làm Image→Text giảm mạnh.
5. Không làm clean subset suy giảm đáng kể.

Test set chỉ dùng sau khi đã chốt cấu hình bằng validation. Không nhìn test liên tục rồi chỉnh model.

---

## 19. Artifact phải lưu

```text
experiments/
└── e2_text_last2_v1/
    ├── checkpoint/
    ├── processor/
    ├── config.json
    ├── normalizer.json
    ├── split_manifest.json
    ├── metrics.json
    ├── error_analysis.csv
    ├── training_log.csv
    └── README.md
```

Config phải ghi:

```text
base model ID và revision
dataset version
random seed
trainable parameter names
learning rate và batch size
loss weights
best epoch/checkpoint
preprocessing version
```

Ví dụ `model_version`:

```text
siglip2-lostfound-text-v1
```

Sau này không trộn embedding từ model version khác nhau trong cùng index nếu chưa chứng minh hai space tương thích.

---

## 20. Kế hoạch thực hiện

### Bước 1 — Data audit

- Xác nhận `item_id` duy nhất.
- Loại ảnh hỏng, duplicate, label sai.
- Chuẩn hóa schema.
- Viết normalizer cho từ một nghĩa.
- Tạo variants theo context cho từ đa nghĩa.

### Bước 2 — Split cố định

- Split theo `item_id`.
- Lưu manifest.
- Không thay test set giữa experiment.

### Bước 3 — E0 zero-shot

- Text→Text.
- Text→Image.
- Image→Text.
- Image→Image.
- Lưu metrics và Top-K errors.

### Bước 4 — E1 smoke test

- Projection only.
- Dùng subset nhỏ.
- Kiểm tra loss, checkpoint, evaluation code.

### Bước 5 — E2 experiment chính

- Freeze vision.
- Train 2 text block cuối + projection.
- Chọn checkpoint theo validation Text→Image R@10.

### Bước 6 — Điều chỉnh có kiểm soát

Mỗi lần chỉ thay một yếu tố:

```text
learning rate
số text block
loss weight
hard-negative sampler
data balance
```

### Bước 7 — Test cuối

- Chạy test với cấu hình đã chốt.
- So E0/E1/E2.
- Báo cáo clean/noisy/context/hard-negative.
- Kết luận có cần Phase 2 fine-tune vision không.

---

## 21. Definition of Done

- [ ] Dataset có schema và `item_id` rõ ràng.
- [ ] Split theo item, không leakage.
- [ ] Có zero-shot baseline E0.
- [ ] Notebook Kaggle chạy từ đầu đến cuối ở session mới.
- [ ] Fine-tune text tower và lưu best checkpoint.
- [ ] Có test text-only cho abbreviation/context.
- [ ] Có test Text→Image, Image→Text, Image→Image.
- [ ] Có Recall@1/5/10 và MRR.
- [ ] Có error analysis, không chỉ metric tổng.
- [ ] Có so sánh base và fine-tuned.
- [ ] Có quyết định bằng số liệu về fine-tune vision.
- [ ] Có processor, config, normalizer, split và model version.

---

## 22. Tóm tắt cho thành viên nhóm

Phase 1 không train lại toàn bộ SigLIP2. Vision encoder được giữ cố định; 1–2 block cuối text encoder và projection được điều chỉnh để hiểu tiếng Việt Lost & Found, đặc biệt là viết tắt theo context.

Dữ liệu đúng không phải `đh → đồng hồ`, mà là:

```text
(ảnh, clean text, noisy text, item_id)
```

Fine-tune thành công phải đồng thời đạt:

```text
noisy text gần clean text
text đúng gần ảnh đúng
text/ảnh khác item bị xếp thấp hơn
```

Đánh giá bằng retrieval Recall@K, trọng tâm Lost text → Found item Recall@10. Chỉ khi image-only baseline cho thấy vision encoder không phù hợp domain thì mới chuyển sang Phase 2 mở block cuối vision tower.

