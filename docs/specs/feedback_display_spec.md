# Feature Specification: In-Column Feedback Display

## 1. Executive Summary
The goal is to enhance the "Check Feedback" feature by displaying the analysis results directly alongside each specific content item in the results table, rather than in a generic dialog. This requires the system to parse the AI's response and map specific feedback to specific content variants.

## 2. User Stories
- As a user, when I check feedback for multiple generated options, I want to see the specific critique for "Option 1" next to "Option 1" in the table.
- As a user, I want the feedback to be saved so I can review it later without re-checking.

## 3. Database Design

We will create a new table to store feedback for individual content pieces (sub-contents) within a main Item.

### Table: `content_ai_item_feedbacks`
| Column | Type | Description |
|os|---|---|
| `id` | BigInt (PK) | Auto-increment |
| `item_id` | BigInt (FK) | Links to `content_ai_items` |
| `content_id` | String (Index) | The UUID of the specific content variation (from the JSON array) |
| `feedback` | Text | The analysis content returned by NotebookLM |
| `created_at` | Timestamp | |
| `updated_at` | Timestamp | |

## 4. Backend Logic Flow

### 4.1. Prompt Engineering (Crucial)
To map feedback to specific items, we must instruct NotebookLM to return a structured response.
- **Input Format**: We will tag each content with its ID.
  ```
  [ID: 123-abc]
  Nội dung: ...
  ```
- **System Prompt Addition**:
  "You must output the result in a Structured Format. For each item analyzed, start with 'TARGET_ID: <id>' followed by the analysis."

### 4.2. Response Parsing
The `checkFeedback` controller method will:
1. Construct the prompt with IDs.
2. Call NotebookLM.
3. Parse the result string using Regex to extract blocks associated with `TARGET_ID`.
4. Save extracted blocks to `content_ai_item_feedbacks` table.
5. Return the mapped data to the frontend.

## 5. API Contract

### Updated `POST /projects/{project}/check-feedback`
**Response**:
```json
{
    "success": true,
    "analysis": "Full Text...", // Keep original full text for backup
    "feedbacks": [
        {
            "content_id": "uuid-1",
            "feedback": "Analysis for item 1..."
        },
        {
            "content_id": "uuid-2",
            "feedback": "Analysis for item 2..."
        }
    ]
}
```

### New `GET /items/{item}/feedbacks` (Or include in Item Show)
- To load saved feedback when opening the screen.

## 6. Frontend Components

### `ArticleGenerationDetail.tsx` & `CommentGenerationDetail.tsx`
- **Table Column**: Add "Check Feedback" column.
- **State**: Maintain a map of `content_id` -> `feedback`.
- **Display**: Render Markdown feedback in the cell (scrollable if long).

## 7. Build Checklist
- [ ] Create migration `create_content_ai_item_feedbacks_table`.
- [ ] Create Model `ContentAiItemFeedback`.
- [ ] Update `ContentAiController.php` to handle parsing and saving.
- [ ] Update Prompt construction logic.
- [ ] Update Frontend Table Column.
- [ ] Verify Parsing robustness.
