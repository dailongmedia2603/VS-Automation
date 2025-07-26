import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, MessageSquare, FileCheck2, ChevronRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

type Project = {
  id: number;
  name: string;
};

type Post = {
  id: number;
  content: string | null;
  status: 'checking' | 'completed';
};

const SeedingProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;

    const fetchProjectDetails = async () => {
      setIsLoading(true);
      try {
        const { data: projectData, error: projectError } = await supabase
          .from('seeding_projects')
          .select('id, name')
          .eq('id', projectId)
          .single();

        if (projectError) throw projectError;
        setProject(projectData);

        const { data: postsData, error: postsError } = await supabase
          .from('seeding_posts')
          .select('id, content, status')
          .eq('project_id', projectId)
          .order('created_at', { ascending: true });

        if (postsError) throw postsError;
        setPosts(postsData || []);

      } catch (error: any) {
        showError("Không thể tải chi tiết dự án: " + error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectDetails();
  }, [projectId]);

  if (isLoading) {
    return (
      <main className="flex-1 p-6 sm:p-8 bg-slate-50">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-9 w-1/3" />
        </div>
        <div className="flex gap-6 h-[calc(100vh-12rem)]">
          <Skeleton className="w-1/3 h-full" />
          <Skeleton className="w-2/3 h-full" />
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="flex-1 p-6 sm:p-8 bg-slate-50">
        <h1 className="text-2xl font-bold">Không tìm thấy dự án</h1>
        <Link to="/check-seeding">
          <Button variant="outline" className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" />Quay lại danh sách</Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col p-6 sm:p-8 bg-slate-50 h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/check-seeding">
            <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{project.name}</h1>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <PlusCircle className="mr-2 h-4 w-4" />
          Thêm Post
        </Button>
      </div>

      <ResizablePanelGroup direction="horizontal" className="flex-1 rounded-2xl border bg-white shadow-sm overflow-hidden">
        <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
          <div className="flex flex-col h-full p-4">
            <Accordion type="multiple" defaultValue={['check-comment', 'approve-post']} className="w-full">
              <AccordionItem value="check-comment">
                <AccordionTrigger className="text-base font-semibold hover:no-underline">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                    Check Comment ({posts.length})
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-col gap-1 pl-2">
                    {posts.map((post, index) => (
                      <button
                        key={post.id}
                        onClick={() => setSelectedPost(post)}
                        className={cn(
                          "w-full text-left p-2 rounded-md text-sm flex items-center justify-between",
                          selectedPost?.id === post.id ? "bg-blue-100 text-blue-700 font-semibold" : "hover:bg-slate-100"
                        )}
                      >
                        Post {index + 1}
                        <ChevronRight className={cn("h-4 w-4 text-slate-400 transition-transform", selectedPost?.id === post.id && "translate-x-1 text-blue-700")} />
                      </button>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="approve-post">
                <AccordionTrigger className="text-base font-semibold hover:no-underline">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="h-5 w-5 text-green-600" />
                    Check duyệt post ({posts.length})
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                   <div className="pl-2 text-sm text-slate-500">Chức năng đang được phát triển.</div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={70}>
          <div className="flex h-full items-center justify-center p-6">
            {selectedPost ? (
              <Card className="w-full h-full shadow-none border-none">
                <CardHeader>
                  <CardTitle>Chi tiết Post {posts.findIndex(p => p.id === selectedPost.id) + 1}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                    {selectedPost.content || "Nội dung post đang được cập nhật..."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center text-slate-500">
                <p className="font-semibold text-lg">Chọn một mục để xem chi tiết</p>
                <p className="text-sm mt-1">Nội dung chi tiết của post sẽ được hiển thị ở đây.</p>
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </main>
  );
};

export default SeedingProjectDetail;