interface QuoteBlockProps {
  content: string;
  author?: string;
}

export const QuoteBlock: React.FC<QuoteBlockProps> = ({ content, author }) => {
  return (
    <blockquote className="mt-6 border-l-2 pl-6 italic text-slate-700">
      "{content}"
      {author && <cite className="block text-right mt-2 not-italic text-sm text-slate-500">— {author}</cite>}
    </blockquote>
  );
};