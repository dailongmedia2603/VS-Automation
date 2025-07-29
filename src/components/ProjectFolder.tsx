import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Folder, MoreVertical, FileText, Edit, Trash2, Share2 } from "lucide-react";
import { Link } from "react-router-dom";

interface ProjectFolderProps {
  id: number;
  name: string;
  files: number;
  modified: string;
  color: string;
  basePath: string;
  onEdit: () => void;
  onShare: () => void;
  onDelete: () => void;
}

export const ProjectFolder = ({ id, name, files, modified, color, basePath, onEdit, onShare, onDelete }: ProjectFolderProps) => {
  return (
    <Link to={`${basePath}/${id}`} className="group block h-full">
      <Card className="group transition-all duration-300 hover:shadow-lg hover:-translate-y-1 rounded-2xl flex flex-col cursor-pointer h-full">
        <CardHeader className="flex-row items-start justify-between pb-2">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
            <Folder className="h-6 w-6" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button onClick={(e) => e.preventDefault()} className="p-1 rounded-full hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-5 w-5 text-slate-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.preventDefault()}>
              <DropdownMenuItem onSelect={onEdit}><Edit className="mr-2 h-4 w-4" />Sửa</DropdownMenuItem>
              <DropdownMenuItem onSelect={onShare}><Share2 className="mr-2 h-4 w-4" />Chia sẻ</DropdownMenuItem>
              <DropdownMenuItem onSelect={onDelete} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Xóa</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="flex-grow">
          <CardTitle className="text-base font-bold text-slate-800">{name}</CardTitle>
          <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
            <div className="flex items-center gap-1.5">
              <FileText className="h-3 w-3" />
              <span>{files} bài viết</span>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-slate-400">Tạo: {modified}</p>
        </CardFooter>
      </Card>
    </Link>
  );
};