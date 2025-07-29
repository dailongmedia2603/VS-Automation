import { TableRow, TableCell } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Folder, MoreVertical, Edit, Trash2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ProjectListItemProps {
  id: number;
  name: string;
  files: number;
  size: string;
  modified: string;
  color: string;
  basePath: string;
  onEdit: () => void;
  onShare: () => void;
  onDelete: () => void;
}

export const ProjectListItem = ({ id, name, files, size, modified, color, basePath, onEdit, onShare, onDelete }: ProjectListItemProps) => {
  const navigate = useNavigate();

  const handleNavigate = () => {
    navigate(`${basePath}/${id}`);
  };

  return (
    <TableRow onClick={handleNavigate} className="group transition-colors hover:bg-slate-50 cursor-pointer">
      <TableCell className="font-medium">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
            <Folder className="h-4 w-4" />
          </div>
          <span className="text-slate-800">{name}</span>
        </div>
      </TableCell>
      <TableCell className="text-slate-500">{files} files</TableCell>
      <TableCell className="text-slate-500">{size}</TableCell>
      <TableCell className="text-slate-500">{modified}</TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
              <MoreVertical className="h-5 w-5 text-slate-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEdit}><Edit className="mr-2 h-4 w-4" />Sửa</DropdownMenuItem>
            <DropdownMenuItem onSelect={onShare}><Share2 className="mr-2 h-4 w-4" />Chia sẻ</DropdownMenuItem>
            <DropdownMenuItem onSelect={onDelete} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Xóa</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};