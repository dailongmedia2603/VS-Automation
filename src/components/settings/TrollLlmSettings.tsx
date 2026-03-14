import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { settingsService, TrollLlmProvider } from '@/api/settings';
import { useState, useEffect } from "react";
import { showSuccess, showError } from "@/utils/toast";
import { Loader2, Plus, Trash2, CheckCircle, AlertCircle, RefreshCw, Zap } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

const TrollLlmSettings = () => {
    const [providers, setProviders] = useState<TrollLlmProvider[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [newApiUrl, setNewApiUrl] = useState('https://chat.trollllm.xyz/v1');
    const [newApiKey, setNewApiKey] = useState('');
    const [newModelId, setNewModelId] = useState('gemini-3-pro-preview');
    const [isAdding, setIsAdding] = useState(false);
    const [checkingId, setCheckingId] = useState<number | null>(null);

    const fetchProviders = async () => {
        setIsLoading(true);
        try {
            const data = await settingsService.getTrollLlmProviders();
            setProviders(data);
        } catch (error: any) {
            showError("Không thể tải danh sách nhà cung cấp: " + (error.response?.data?.message || error.message));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProviders();
    }, []);

    const handleAddProvider = async () => {
        if (!newName || !newApiUrl || !newApiKey) {
            showError("Vui lòng nhập đầy đủ Tên, Base URL và API Key.");
            return;
        }
        setIsAdding(true);
        try {
            await settingsService.storeTrollLlmProvider({
                name: newName,
                api_url: newApiUrl,
                api_key: newApiKey,
                model_id: newModelId,
            });
            showSuccess("Thêm nhà cung cấp thành công!");
            setIsDialogOpen(false);
            setNewName('');
            setNewApiUrl('https://chat.trollllm.xyz/v1');
            setNewApiKey('');
            setNewModelId('gemini-3-pro-preview');
            fetchProviders();
        } catch (error: any) {
            showError("Thêm nhà cung cấp thất bại: " + (error.response?.data?.message || error.message));
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteProvider = async (id: number) => {
        if (!confirm("Bạn có chắc chắn muốn xóa nhà cung cấp này?")) return;
        try {
            await settingsService.deleteTrollLlmProvider(id);
            showSuccess("Xóa nhà cung cấp thành công!");
            fetchProviders();
        } catch (error: any) {
            showError("Xóa thất bại: " + (error.response?.data?.message || error.message));
        }
    };

    const handleSetActive = async (id: number) => {
        try {
            await settingsService.setActiveTrollLlmProvider(id);
            showSuccess("Đã chuyển đổi nhà cung cấp đang hoạt động!");
            fetchProviders();
        } catch (error: any) {
            showError("Thao tác thất bại: " + (error.response?.data?.message || error.message));
        }
    };

    const handleCheckConnection = async (id: number) => {
        setCheckingId(id);
        try {
            const result = await settingsService.checkTrollLlmProviderConnection(id);
            if (result.success) {
                showSuccess(result.message);
            } else {
                showError(result.message);
            }
            fetchProviders();
        } catch (error: any) {
            const msg = error.response?.data?.message || error.message;
            showError("Kiểm tra thất bại: " + msg);
            fetchProviders(); // refresh status even on error
        } finally {
            setCheckingId(null);
        }
    };

    return (
        <Card className="shadow-sm rounded-2xl bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Nhà cung cấp API Troll LLM</CardTitle>
                    <CardDescription>
                        Quản lý các nhà cung cấp API OpenAI-compatible để sử dụng cho Content AI.
                    </CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700 rounded-lg">
                            <Plus className="mr-2 h-4 w-4" />
                            Thêm đơn vị cung cấp API
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[520px]">
                        <DialogHeader>
                            <DialogTitle>Thêm nhà cung cấp API mới</DialogTitle>
                            <DialogDescription>
                                Nhập thông tin nhà cung cấp API tương thích OpenAI.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Tên hiển thị</Label>
                                <Input
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="Ví dụ: TrollLLM Pro, OpenRouter..."
                                    className="col-span-3 rounded-lg"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Base URL</Label>
                                <Input
                                    value={newApiUrl}
                                    onChange={(e) => setNewApiUrl(e.target.value)}
                                    placeholder="https://chat.trollllm.xyz/v1"
                                    className="col-span-3 rounded-lg font-mono text-sm"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">API Key</Label>
                                <Input
                                    type="password"
                                    value={newApiKey}
                                    onChange={(e) => setNewApiKey(e.target.value)}
                                    placeholder="sk-..."
                                    className="col-span-3 rounded-lg"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Model ID</Label>
                                <Input
                                    value={newModelId}
                                    onChange={(e) => setNewModelId(e.target.value)}
                                    placeholder="gemini-3-pro-preview"
                                    className="col-span-3 rounded-lg font-mono text-sm"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-lg">Hủy</Button>
                            <Button onClick={handleAddProvider} disabled={isAdding} className="bg-blue-600 hover:bg-blue-700 rounded-lg">
                                {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Lưu nhà cung cấp
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : providers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border rounded-xl border-dashed">
                        Chưa có nhà cung cấp nào được thêm. Hãy thêm đơn vị cung cấp API đầu tiên.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {providers.map((provider) => (
                            <div
                                key={provider.id}
                                className={`flex items-center justify-between p-4 rounded-xl border ${provider.is_active ? 'border-blue-200 bg-blue-50/50' : 'border-gray-100'}`}
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className={`p-2 rounded-full shrink-0 ${provider.is_active ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                        <Zap className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="font-semibold text-sm">{provider.name}</h4>
                                            {provider.is_active && (
                                                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0 h-5 px-2">Đang sử dụng</Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                                            {provider.api_url} • {provider.model_id}
                                        </p>

                                        {/* Status Display */}
                                        {provider.last_check_status && (
                                            <div className={`mt-1.5 flex items-center gap-1.5 text-xs ${provider.last_check_status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                                {provider.last_check_status === 'success' ? (
                                                    <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                                                ) : (
                                                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                                )}
                                                <span className="truncate">
                                                    {provider.last_check_message || (provider.last_check_status === 'success' ? 'Kết nối ổn định' : 'Lỗi kết nối')}
                                                </span>
                                                {provider.last_checked_at && (
                                                    <span className="text-muted-foreground opacity-70 ml-1 shrink-0">
                                                        ({new Date(provider.last_checked_at).toLocaleTimeString('vi-VN')})
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2 shrink-0 ml-3">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-xs rounded-lg"
                                        onClick={() => handleCheckConnection(provider.id)}
                                        disabled={checkingId === provider.id}
                                    >
                                        {checkingId === provider.id ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <RefreshCw className="h-3.5 w-3.5" />
                                        )}
                                        <span className="ml-2 hidden sm:inline">Kiểm tra</span>
                                    </Button>
                                    {!provider.is_active && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 text-xs rounded-lg"
                                            onClick={() => handleSetActive(provider.id)}
                                        >
                                            Sử dụng
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                        onClick={() => handleDeleteProvider(provider.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default TrollLlmSettings;