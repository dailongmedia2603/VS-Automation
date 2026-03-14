# Feature Specification: Feedback Check with NotebookLM

## 1. Executive Summary
Tính năng "Check Feedback" cho phép người dùng tự động kiểm tra các nội dung đã tạo (bài viết, comment) xem có tuân thủ các tài liệu Feedback/Guideline đã upload lên NotebookLM hay không. Hệ thống sẽ gửi nội dung cần kiểm tra kèm theo System Prompt tới NotebookLM để AI phân tích và chỉ ra các vi phạm (nếu có) dựa trên kiến thức trong sổ tay dự án.

## 2. User Stories
- **User** muốn chọn một hoặc nhiều bài viết/comment trong danh sách kết quả.
- **User** muốn bấm nút "Check Feedback" để bắt đầu quá trình kiểm tra.
- **User** muốn xem kết quả phân tích từ AI:
    - Những điểm đạt yêu cầu.
    - Những lỗi vi phạm Feedback cũ (nếu có).
    - Gợi ý sửa đổi.

## 3. Database Design
Không yêu cầu thay đổi cấu trúc Database hiện tại.
- Sử dụng `notebooklm_id` trong bảng `content_ai_projects`.
- Cookie xác thực lấy từ `notebooklm_accounts`.

## 4. Logic Flowchart
1.  **Frontend**:
    - User tích chọn `selectedIds` (các items trong bảng kết quả).
    - Bấm nút "Check Feedback".
    - Gọi API `POST /content-ai/projects/{id}/check-feedback` với body `{ item_ids: [...] }`.
2.  **Backend**:
    - Lấy danh sách nội dung `content` từ DB dựa trên `item_ids`.
    - Xây dựng **Prompt** gửi tới NotebookLM:
        - *Context*: "Bạn là chuyên gia kiểm duyệt nội dung (QA)..."
        - *Task*: "Hãy kiểm tra các nội dung dưới đây dựa trên các tài liệu đã có trong Notebook này (đặc biệt là các file Feedback)..."
        - *Input*: Danh sách nội dung [ID: Content].
        - *Output Format*: Yêu cầu định dạng rõ ràng (Markdown, liệt kê lỗi theo từng ID).
    - Gọi `NotebookLmService->chat(notebookId, query)`.
    - Nhận phản hồi từ NotebookLM.
    - Trả về JSON `{ success: true, analysis: "..." }`.
3.  **Frontend**:
    - Hiển thị Dialog kết quả chứa nội dung phân tích (Markdown rendered).

## 5. API Contract

### POST /api/content-ai/projects/{project}/check-feedback
**Request**:
```json
{
  "item_id": 123, // ID của ContentAiItem (cha) chứa danh sách kết quả
  "content_ids": ["uuid-1", "uuid-2"] // Danh sách ID của các bài viết con (generated results) cần check
}
```
*Note: Hệ thống hiện tại lưu kết quả generated dưới dạng JSON trong cột `content` của `ContentAiItem`. Cần parse và lấy đúng nội dung theo `content_ids`.*

**Response**:
```json
{
  "success": true,
  "analysis": "### Kết quả kiểm tra:\n\n**Bài viết 1:**\n- Trạng thái: ⚠️ Có vấn đề\n- Chi tiết: Vi phạm feedback về việc không được nhắc đến giá...\n\n**Bài viết 2:**\n- Trạng thái: ✅ Đạt yêu cầu"
}
```

## 6. UI Components
- **Location**: `ArticleGenerationDetail.tsx` (Widget "Kết quả").
- **Component**:
    - Thêm nút `Button` "Check Feedback" cạnh nút "Feedback & Tạo lại".
    - `Dialog` hiển thị kết quả (Markdown Viewer).
    - Loading state khi đang gọi API.

## 7. System Prompt Strategy
Prompt gửi tới NotebookLM:
```text
Dựa vào các tài liệu đã được cung cấp trong sổ tay này (đặc biệt là các file Feedback, Guideline, Do & Don't), hãy đóng vai trò là một chuyên gia kiểm soát chất lượng (QA) và kiểm tra các nội dung sau đây.

Mục tiêu: Phát hiện các lỗi vi phạm feedback cũ hoặc sai lệch so với hướng dẫn.

Danh sách nội dung cần kiểm tra:
---
[Bài viết 1]
{Nội dung bài viết 1}
---
[Bài viết 2]
{Nội dung bài viết 2}
---

Yêu cầu đầu ra:
Trả về báo cáo kiểm tra chi tiết cho từng bài viết. Chỉ ra rõ ràng đoạn nào vi phạm và vi phạm quy tắc nào trong tài liệu. Nếu bài viết tốt, hãy xác nhận là Đạt.
```

## 8. Tech Stack
- Frontend: React, Tailwind CSS, Lucide Icons.
- Backend: Laravel, NotebookLM API (Reverse Engineered).

## 9. Build Checklist
- [ ] Backend: Implement `checkFeedback` method in `ContentAiController`.
- [ ] Backend: Update `NotebookLmService` to handle `chat` endpoint logic (ensure cookies).
- [ ] Route: Add `POST /projects/{project}/check-feedback`.
- [ ] Frontend: Add "Check Feedback" button logic.
- [ ] Frontend: Create "Check Result" Dialog.
