import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

type Project = { id: number; name: string; };
type Post = { id: number; name: string; };

interface KeywordPostDetailProps {
  project: Project;
  post: Post;
}

export const KeywordPostDetail = ({ project, post }: KeywordPostDetailProps) => {
  return (
    <Card className="w-full h-full shadow-none border-none">
      <CardHeader>
        <CardTitle>{post.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center text-slate-500 py-16">
          <p className="font-semibold">Tính năng "Check Keyword Post"</p>
          <p className="text-sm mt-2">Tính năng này đang được phát triển và sẽ sớm ra mắt.</p>
        </div>
      </CardContent>
    </Card>
  );
};