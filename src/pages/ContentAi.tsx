import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Folder, FileText, Bot, PlusCircle, Search, List, LayoutGrid, ChevronDown } from 'lucide-react';
import { StatWidget } from '@/components/content-ai/StatWidget';
import { ProjectFolder } from '@/components/content-ai/ProjectFolder';
import { ProjectListItem } from '@/components/content-ai/ProjectListItem';
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Dummy data for now
const stats = [
  { title: 'Tổng số dự án', value: '12', icon: Folder, color: 'bg-blue-500' },
  { title: 'Tổng số tài liệu', value: '256', icon: FileText, color: 'bg-green-500' },
  { title: 'AI đã tạo', value: '1.2M từ', icon: Bot, color: 'bg-purple-500' },
];

const projects = [
  { id: 1, name: 'Chiến dịch Marketing T9', files: 42, size: '2.1 GB', modified: '2 giờ trước', color: 'bg-blue-100 text-blue-600' },
  { id: 2, name: 'Bài viết Blog SEO', files: 78, size: '4.5 GB', modified: 'Hôm qua', color: 'bg-green-100 text-green-600' },
  { id: 3, name: 'Kịch bản Video YouTube', files: 15, size: '870 MB', modified: '23/07/2024', color: 'bg-yellow-100 text-yellow-600' },
  { id: 4, name: 'Nội dung Social Media', files: 120, size: '1.2 GB', modified: '19/07/2024', color: 'bg-purple-100 text-purple-600' },
  { id: 5, name: 'Email Newsletters', files: 33, size: '450 MB', modified: '15/07/2024', color: 'bg-red-100 text-red-600' },
  { id: 6, name: 'Website Copywriting', files: 8, size: '120 MB', modified: '12/07/2024', color: 'bg-indigo-100 text-indigo-600' },
];

const ContentAi = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  return (
    <main className="flex-1 space-y-8 p-6 sm:p-8 bg-slate-50">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Content AI</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Quản lý, sáng tạo và tối ưu hóa tất cả nội dung của bạn ở một nơi duy nhất.
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <PlusCircle className="mr-2 h-4 w-4" />
          Tạo dự án mới
        </Button>
      </div>

      {/* Stat Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map(stat => (
          <StatWidget key={stat.title} title={stat.title} value={stat.value} icon={stat.icon} color={stat.color} />
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-grow max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm kiếm dự án..." className="pl-9 bg-white rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-white rounded-lg">Sắp xếp theo <ChevronDown className="ml-2 h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Tên</DropdownMenuItem>
              <DropdownMenuItem>Ngày sửa đổi</DropdownMenuItem>
              <DropdownMenuItem>Kích thước</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex items-center gap-1 p-1 bg-slate-200/75 rounded-lg">
            <Button size="icon" variant={viewMode === 'grid' ? 'default' : 'ghost'} onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm rounded-md' : 'text-slate-600'}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button size="icon" variant={viewMode === 'list' ? 'default' : 'ghost'} onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm rounded-md' : 'text-slate-600'}>
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Project View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {projects.map(project => (
            <ProjectFolder key={project.id} {...project} />
          ))}
        </div>
      ) : (
        <div className="border rounded-2xl bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên dự án</TableHead>
                <TableHead>Số lượng file</TableHead>
                <TableHead>Kích thước</TableHead>
                <TableHead>Sửa đổi lần cuối</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map(project => (
                <ProjectListItem key={project.id} {...project} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  );
};

export default ContentAi;