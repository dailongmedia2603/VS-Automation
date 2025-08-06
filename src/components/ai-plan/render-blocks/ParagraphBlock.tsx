import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ParagraphBlockProps {
  content: string;
}

export const ParagraphBlock: React.FC<ParagraphBlockProps> = ({ content }) => {
  return (
    <div className="prose prose-sm max-w-none prose-slate text-slate-600 leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
};