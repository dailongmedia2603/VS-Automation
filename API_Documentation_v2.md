# NotebookLM API Documentation

Tài liệu tích hợp API cho hệ thống NotebookLM Multi-Account. API cho phép quản lý tài khoản, upload tài liệu, chat với notebook, và tạo các artifact (Audio, Report, Quiz).

**Base URL:** `http://notebook.pcdl.io.vn`
**Postman Collection:** [Download/Export URL if applicable]

---

## 🔐 1. Authentication (Xác thực)

Hầu hết các API endpoints (ngoại trừ `/api/health` và `/api/user/login`) đều yêu cầu xác thực bằng một trong hai cách:

### Cách 1: JWT Token (Dành cho Frontend/App)
Truyền token trong header `Authorization`:
```http
Authorization: Bearer <your_jwt_token_here>
```

### Cách 2: API Key (Dành cho Server-to-Server / Tích hợp bên thứ 3)
Truyền API Key trong header `X-API-Key`:
```http
X-API-Key: nlm_xxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 👤 2. User & System Management

### 2.1 Đăng nhập lấy Token
Dùng để lấy JWT Token cho các request tiếp theo.

*   **URL:** `/api/user/login`
*   **Method:** `POST`
*   **Auth Required:** No
*   **Body:** (JSON)
    ```json
    {
      "email": "huulong111@gmail.com",
      "password": "your_password"
    }
    ```
*   **Response:**
    ```json
    {
      "success": true,
      "token": "eyJhbG... (JWT Token)",
      "user": {
        "id": "uuid",
        "email": "huulong111@gmail.com",
        "display_name": "Admin",
        "role": "admin"
      }
    }
    ```

### 2.2 Kiểm tra trạng thái Server
*   **URL:** `/api/health`
*   **Method:** `GET`
*   **Auth Required:** No
*   **Response:**
    ```json
    {
      "status": "healthy",
      "message": "API is running",
      "version": "2.0.0"
    }
    ```

---

## 🍪 3. Quản lý Tài khoản Google (NotebookLM Accounts)

Hệ thống hỗ trợ quản lý nhiều tài khoản Google (thông qua cookie) cùng lúc.

### 3.1 Lấy danh sách tài khoản
*   **URL:** `/api/accounts/list`
*   **Method:** `GET`
*   **Response:**
    ```json
    {
      "success": true,
      "active_account_id": "account_id_1",
      "accounts": [
        {
          "id": "account_id_1",
          "name": "Tài khoản 1",
          "email": "user1@gmail.com",
          "created_at": "2024-01-01T10:00:00"
        }
      ]
    }
    ```

### 3.2 Thêm/Cập nhật Tài khoản mới
*   **URL:** `/api/accounts/add`
*   **Method:** `POST`
*   **Body:** (JSON)
    ```json
    {
      "account_id": "tuy_chon_id_hoac_de_trong",
      "name": "Tên Hiển Thị",
      "email": "user@gmail.com",
      "cookies": "HSID=xxx; SSID=yyy; APISID=zzz; __Secure-1PSID=... (Cookie lấy từ F12 trình duyệt)"
    }
    ```

### 3.3 Chuyển đổi Tài khoản Active
Mỗi thời điểm chỉ có 1 tài khoản được set làm "Active" cho các request thao tác với hệ thống NotebookLM (như lấy danh sách sổ tay, chat, v.v.).

*   **URL:** `/api/accounts/switch`
*   **Method:** `POST`
*   **Body:** (JSON)
    ```json
    {
      "account_id": "id_cua_tai_khoan_muon_dung"
    }
    ```

### 3.4 Lấy thông tin Tài khoản Active
*   **URL:** `/api/accounts/active/info`
*   **Method:** `GET`
*   **Response:**
    ```json
    {
      "success": true,
      "account": {
        "id": "current_id",
        "name": "Tên Tài khoản",
        "email": "user@gmail.com"
      }
    }
    ```

---

## 📓 4. Cốt lõi NotebookLM (Sổ tay & Chat)

**LƯU Ý:** Các API này sử dụng *Tài khoản đang Active* (từ mục 3.3).

### 4.1 Lấy danh sách Sổ tay (Notebooks)
*   **URL:** `/api/notebooks`
*   **Method:** `GET`
*   **Response:**
    ```json
    {
      "success": true,
      "notebooks": [
        {
          "id": "notebook_id_xxx",
          "title": "Tên Sổ Tay",
          "created_at": "2024-03-01T..."
        }
      ]
    }
    ```

### 4.2 Lấy Chi tiết Sổ tay (gồm các nguồn tài liệu - Sources)
*   **URL:** `/api/nblm/notebooks/{notebook_id}/details`
*   **Method:** `GET`
*   **Response:**
    ```json
    {
      "success": true,
      "notebook": {
        "id": "notebook_id",
        "title": "Tên Sổ Tay",
        "sources": [
          {
             "id": "source_id_1",
             "title": "File PDF 1",
             "type": "file"
          }
        ]
      }
    }
    ```

### 4.3 Tạo Sổ tay mới
*   **URL:** `/api/nblm/notebooks`
*   **Method:** `POST`
*   **Body:** (JSON)
    ```json
    {
      "title": "Tên sổ tay mới"
    }
    ```

### 4.4 Chat với Sổ tay (Hỏi đáp)
*   **URL:** `/api/nblm/notebooks/{notebook_id}/chat`
*   **Method:** `POST`
*   **Body:** (JSON)
    ```json
    {
      "query": "Câu hỏi của bạn ở đây?",
      "conversation_id": null 
    }
    ```
    *Ghi chú: Để tiếp tục ngữ cảnh chat, truyền `conversation_id` nhận được từ lần chat trước vào request tiếp theo. Nếu chat câu mới độc lập thì truyền null.*

---

## 📄 5. Upload & Thêm Tài Liệu (Sources)

### 5.1 Thêm URL web
*   **URL:** `/api/nblm/notebooks/{notebook_id}/sources`
*   **Method:** `POST`
*   **Body:** (JSON)
    ```json
    {
      "url": "https://example.com/bai-viet-hay"
    }
    ```

### 5.2 Thêm nội dung Text
*   **URL:** `/api/nblm/notebooks/{notebook_id}/sources/text`
*   **Method:** `POST`
*   **Body:** (JSON)
    ```json
    {
      "title": "Tên cho đoạn text này",
      "content": "Nội dung văn bản dài cần đưa vào NotebookLM..."
    }
    ```

### 5.3 Upload File (PDF, TXT, MD, DOCX)
*   **URL:** `/api/nblm/notebooks/{notebook_id}/sources/file`
*   **Method:** `POST`
*   **Content-Type:** `multipart/form-data`
*   **Body:**
    *   `file`: (File object)

---

## 🎙️ 6. Studio & Artifacts (Tạo Audio, Report, Quiz)

Các API này ra lệnh cho hệ thống tạo ra các sản phẩm (artifacts) từ những tài liệu đã up vào sổ tay.

### 6.1 Lấy danh sách Artifacts đã tạo
*   **URL:** `/api/nblm/notebooks/{notebook_id}/artifacts`
*   **Method:** `GET`
*   **Response:** Trả về danh sách các link Audio podcast, Report PDF/Text, Flashcards...

### 6.2 Tạo Audio Overview (Podcast 2 người nói)
*   **URL:** `/api/nblm/notebooks/{notebook_id}/artifacts/audio`
*   **Method:** `POST`
*   **Body:** (JSON)
    ```json
    {
      "instructions": "Nói tập trung vào phần kết luận (có thể để trống hoặc null)"
    }
    ```

### 6.3 Tạo Report (Báo cáo, Tóm tắt, Hướng dẫn)
*   **URL:** `/api/nblm/notebooks/{notebook_id}/artifacts/report`
*   **Method:** `POST`
*   **Body:** (JSON)
    ```json
    {
      "format_type": "briefing_doc", 
      "prompt": "Tùy chọn: Nhấn mạnh vào phần A"
    }
    ```
    *Các loại `format_type` hỗ trợ: `briefing_doc`, `study_guide`, `blog_post`, `custom`*

### 6.4 Tạo Quiz / Câu hỏi ôn tập
*   **URL:** `/api/nblm/notebooks/{notebook_id}/artifacts/quiz`
*   **Method:** `POST`
*   **Body:** (JSON)
    ```json
    {
      "quantity": "standard",  
      "difficulty": "medium"   
    }
    ```
    * `quantity`: `fewer` (ít), `standard` (vừa), `more` (nhiều)
    * `difficulty`: `easy`, `medium`, `hard`

---

## ⚙️ 7. Developer API Keys

Hệ thống hỗ trợ tạo API key vĩnh viễn (không hết hạn như JWT) để các hệ thống backend khác gọi sang (server-to-server). Dùng các endpoint này thông qua Giao diện hoặc Postman (yêu cầu JWT bằng request `2.1 Đăng nhập lấy Token`).

### 7.1 Lấy API Key hiện tại
*   **URL:** `/api/apikey`
*   **Method:** `GET`

### 7.2 Tạo/Reset lại API Key
*   **URL:** `/api/apikey/regenerate`
*   **Method:** `POST`
