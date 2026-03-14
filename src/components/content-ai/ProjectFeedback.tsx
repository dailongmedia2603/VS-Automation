import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { contentAiService } from '@/api/contentAi';
import { showSuccess, showError } from '@/utils/toast';
import { Loader2, UploadCloud, FileText, RefreshCw, ExternalLink, Trash2, AlertCircle, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface ProjectFeedbackProps {
    projectId: string;
}

interface NotebookSource {
    id: string; // or source_id
    title: string;
    type?: string;
    // Add other fields if returned by details API
}

export const ProjectFeedback = ({ projectId }: ProjectFeedbackProps) => {
    const [sources, setSources] = useState<NotebookSource[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [sourceToDelete, setSourceToDelete] = useState<NotebookSource | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [isPromptDialogOpen, setIsPromptDialogOpen] = useState(false);
    const [promptValue, setPromptValue] = useState("");
    const [isPromptLoading, setIsPromptLoading] = useState(false);

    const fetchSources = async () => {
        setIsLoading(true);
        try {
            const data = await contentAiService.getNotebookSources(parseInt(projectId));
            setSources(data || []);
        } catch (error: any) {
            console.error("Fetch notebooks error", error);
            // Don't spam error toast if it's just empty or momentary network issue, 
            // but maybe good to show if it fails.
            // showError("Không thể tải danh sách tài liệu từ NotebookLM.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (projectId) {
            fetchSources();
        }
    }, [projectId]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Reset input value to allow re-uploading same file if needed (though unlikely)
        event.target.value = '';

        setIsUploading(true);
        try {
            await contentAiService.uploadNotebookSource(parseInt(projectId), file);
            showSuccess(`Đã upload file "${file.name}" thành công!`);
            fetchSources(); // Refresh list
        } catch (error: any) {
            showError("Upload thất bại: " + (error.response?.data?.message || error.message));
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteSource = async () => {
        if (!sourceToDelete) return;

        setIsDeleting(true);
        try {
            await contentAiService.deleteNotebookSource(parseInt(projectId), sourceToDelete.id);
            showSuccess("Đã xóa tài liệu thành công.");
            fetchSources();
        } catch (error: any) {
            showError("Xóa tài liệu thất bại: " + (error.response?.data?.message || error.message));
        } finally {
            setIsDeleting(false);
            setSourceToDelete(null);
        }
    };

    const handleOpenPromptDialog = async () => {
        setIsPromptDialogOpen(true);
        setIsPromptLoading(true);
        // Default prompt if empty
        const defaultPrompt = "Dựa vào các tài liệu đã được cung cấp trong sổ tay này (đặc biệt là các file Feedback, Guideline...), hãy đóng vai trò là một chuyên gia kiểm soát chất lượng (QA) và kiểm tra các nội dung sau đây.\n\nMục tiêu: Phát hiện các lỗi vi phạm feedback cũ hoặc sai lệch so với hướng dẫn.\n\n{{CONTENT}}\n\nYêu cầu đầu ra:\nTrả về báo cáo kiểm tra chi tiết cho từng nội dung. Chỉ ra rõ ràng đoạn nào vi phạm và vi phạm quy tắc nào. Nếu nội dung tốt, hãy xác nhận là Đạt.";

        try {
            const project = await contentAiService.getProject(parseInt(projectId));
            setPromptValue(project.check_feedback_prompt || defaultPrompt);
        } catch (error) {
            console.error(error);
            showError("Không thể tải cấu hình prompt.");
        } finally {
            setIsPromptLoading(false);
        }
    };

    const handleSavePrompt = async () => {
        setIsPromptLoading(true);
        try {
            await contentAiService.updateProject(parseInt(projectId), { check_feedback_prompt: promptValue });
            showSuccess("Lưu System Prompt thành công.");
            setIsPromptDialogOpen(false);
        } catch (error: any) {
            showError("Lưu thất bại: " + error.message);
        } finally {
            setIsPromptLoading(false);
        }
    };

    return (
        <Card className="shadow-sm rounded-2xl bg-white border-none h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <CardTitle className="text-xl">Feedback & Tài liệu NotebookLM</CardTitle>
                    <CardDescription>
                        Upload tài liệu (PDF, Word, TXT...) để NotebookLM học và cải thiện chất lượng nội dung.
                    </CardDescription>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOpenPromptDialog}
                        className="gap-2 bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100 hover:text-indigo-800"
                    >
                        <Settings className="h-4 w-4" />
                        System Prompt
                    </Button>
                    <Button variant="ghost" size="icon" onClick={fetchSources} disabled={isLoading}>
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden flex flex-col gap-6">

                {/* Upload Area */}
                <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center gap-2 hover:bg-slate-100 transition-colors relative">
                    <div className="p-3 bg-blue-100 rounded-full text-blue-600 mb-2">
                        <UploadCloud className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold text-slate-900">Upload tài liệu mới</h3>
                    <p className="text-sm text-slate-500 max-w-md">
                        Chọn file từ máy tính của bạn. Hỗ trợ PDF, DOCX, TXT.
                    </p>
                    <input
                        type="file"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                        accept=".pdf,.docx,.doc,.txt,.md"
                    />
                    {isUploading && (
                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 backdrop-blur-sm">
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                                <span className="text-sm font-medium text-blue-700">Đang upload & xử lý...</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sources List */}
                <div className="flex-1 overflow-y-auto">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-sm text-slate-700">Tài liệu đã có trên NotebookLM ({sources.length})</h4>
                    </div>

                    {isLoading && sources.length === 0 ? (
                        <div className="flex flex-col gap-2">
                            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />)}
                        </div>
                    ) : sources.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-sm">
                            Chưa có tài liệu nào trên NotebookLM.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {sources.map((source, index) => (
                                <div key={source.id || index} className="flex items-center justify-between p-3 border rounded-lg bg-white hover:shadow-sm transition-shadow">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="flex-shrink-0 bg-indigo-50 p-2 rounded text-indigo-600">
                                            <FileText className="h-4 w-4" />
                                        </div>
                                        <div className="truncate">
                                            <p className="font-medium text-sm truncate" title={source.title}>{source.title || 'Không có tên'}</p>
                                            {source.type && <Badge variant="secondary" className="text-[10px] h-4 px-1">{source.type}</Badge>}
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => setSourceToDelete(source)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 h-8 w-8">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="pt-2 border-t mt-auto">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />
                        Dữ liệu được đồng bộ trực tiếp với NotebookLM của Google.
                    </p>
                </div>
            </CardContent>
            <AlertDialog open={!!sourceToDelete} onOpenChange={(open) => !open && setSourceToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xóa tài liệu này?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc chắn muốn xóa "{sourceToDelete?.title}" khỏi NotebookLM không? Hành động này không thể hoàn tác.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDeleteSource(); }} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Xóa
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={isPromptDialogOpen} onOpenChange={setIsPromptDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>System Prompt (Check Feedback)</DialogTitle>
                        <DialogDescription>
                            Tùy chỉnh prompt được sử dụng khi kiểm tra feedback. Sử dụng <code>{'{{CONTENT}}'}</code> để xác định vị trí nội dung cần kiểm tra.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 py-2 overflow-y-auto">
                        {isPromptLoading && !promptValue ? (
                            <div className="flex justify-center p-4"><Loader2 className="animate-spin text-blue-600" /></div>
                        ) : (
                            <Textarea
                                value={promptValue}
                                onChange={(e) => setPromptValue(e.target.value)}
                                rows={15}
                                placeholder="Nhập system prompt..."
                                className="font-mono text-sm leading-relaxed"
                            />
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPromptDialogOpen(false)}>Hủy</Button>
                        <Button onClick={handleSavePrompt} disabled={isPromptLoading}>Lưu cấu hình</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card >
    );
};
