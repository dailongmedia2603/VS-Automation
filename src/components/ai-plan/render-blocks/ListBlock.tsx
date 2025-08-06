import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ListBlockProps {
  items: string[];
  type?: 'ordered' | 'unordered';
}

export const ListBlock: React.FC<ListBlockProps> = ({ items, type = 'unordered' }) => {
  const listMarkdown = items.map(item => `${type === 'ordered' ? '1.' : '-'} ${item}`).join('\n');

  return (
    <div className="prose prose-sm max-w-none prose-slate text-slate-600 leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{listMarkdown}</ReactMarkdown>
    </div>
  );
};