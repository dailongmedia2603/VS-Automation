import React from 'react';
import { TrainingConfig } from './TrainingForm';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface TrainingPreviewProps {
  config: TrainingConfig;
}

const TrainingPreview: React.FC<TrainingPreviewProps> = ({ config }) => {
  const generatePreviewPrompt = () => {
    const formatNumberedList = (items: any[]) => items && items.length > 0 ? items.map((s, i) => `${i + 1}. ${s.value}`).join('\n') : '(Chưa có quy trình)';

    const formatDocumentContext = () => {
      return `(Đây là nơi tài liệu nội bộ liên quan sẽ được chèn vào nếu tìm thấy. Ví dụ:)\n\n- **Tiêu đề:** Báo giá dịch vụ Xây kênh TikTok\n- **Nội dung:** Gói cơ bản là 5.000.000 VNĐ/tháng...`;
    };

    const dataMap = {
      '{{industry}}': config.industry || '(Chưa cung cấp)',
      '{{role}}': config.role || '(Chưa cung cấp)',
      '{{style}}': config.style || '(Chưa cung cấp)',
      '{{tone}}': config.tone || '(Chưa cung cấp)',
      '{{language}}': config.language || '(Chưa cung cấp)',
      '{{goal}}': config.goal || '(Chưa cung cấp)',
      '{{processSteps}}': formatNumberedList(config.processSteps),
      '{{conversation_history}}': `(Đây là nơi lịch sử trò chuyện với khách hàng sẽ được chèn vào. Ví dụ:)\n\n[10:30:00] User: giá bên em như thế nào?`,
      '{{document_context}}': formatDocumentContext(),
    };

    if (!config.promptTemplate || config.promptTemplate.length === 0) {
      return "### Chưa có cấu hình prompt\n\nVui lòng cấu hình ở tab 'Cấu hình Prompt'.";
    }

    const finalPrompt = config.promptTemplate.map(block => {
      let content = block.content;
      for (const [key, value] of Object.entries(dataMap)) {
        content = content.replace(new RegExp(key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), String(value));
      }
      return `### ${block.title.toUpperCase()}\n\n${content}`;
    }).join('\n\n---\n\n');

    return finalPrompt;
  };

  const previewContent = generatePreviewPrompt();

  return (
    <div className="prose prose-sm max-w-none prose-slate rounded-lg border bg-slate-50 p-4 h-[60vh] overflow-y-auto">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {previewContent}
      </ReactMarkdown>
    </div>
  );
};

export default TrainingPreview;