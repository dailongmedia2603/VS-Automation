import { cn } from "@/lib/utils";
import React from 'react';

interface HeadingBlockProps {
  level?: 1 | 2 | 3;
  content: string;
}

export const HeadingBlock: React.FC<HeadingBlockProps> = ({ level = 2, content }) => {
  const Tag = `h${level + 1}` as keyof JSX.IntrinsicElements;
  
  const classes = cn(
    "font-bold text-slate-800",
    {
      "text-3xl mt-8 mb-4 border-b pb-2": level === 1,
      "text-2xl mt-6 mb-3": level === 2,
      "text-xl mt-4 mb-2": level === 3,
    }
  );

  return <Tag className={classes}>{content}</Tag>;
};