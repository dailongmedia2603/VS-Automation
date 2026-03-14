import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { settingsService, AiApiPriority } from '@/api/settings';
import { showSuccess, showError } from "@/utils/toast";
import { Loader2, Save, ChevronUp, ChevronDown, RefreshCw, Layers, Globe } from "lucide-react";

const AiApiPrioritySettings = () => {
    const [priorities, setPriorities] = useState<AiApiPriority[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const fetchPriorities = async () => {
        setIsLoading(true);
        try {
            const data = await settingsService.getAiApiPriorities();
            setPriorities([...data].sort((a, b) => a.priority - b.priority));
        } catch (error: any) {
            showError("Không thể tải cấu hình ưu tiên: " + (error.response?.data?.message || error.message));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPriorities();
    }, []);

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const data = await settingsService.syncAiApiPriorities();
            setPriorities([...data].sort((a, b) => a.priority - b.priority));
            if (data.length > 0) {
                showSuccess(`Đã đồng bộ ${data.length} nhà cung cấp API thành công!`);
            } else {
                showError("Không tìm thấy nhà cung cấp nào. Hãy cấu hình API Cliproxy hoặc Troll LLM trước.");
            }
        } catch (error: any) {
            showError("Đồng bộ thất bại: " + (error.response?.data?.message || error.message));
        } finally {
            setIsSyncing(false);
        }
    };

    const rebuildPriorities = (list: AiApiPriority[]): AiApiPriority[] =>
        list.map((item, idx) => ({ ...item, priority: idx + 1 }));

    const moveUp = (index: number) => {
        if (index === 0) return;
        const next = [...priorities];
        [next[index - 1], next[index]] = [next[index], next[index - 1]];
        setPriorities(rebuildPriorities(next));
        setHasChanges(true);
    };

    const moveDown = (index: number) => {
        if (index === priorities.length - 1) return;
        const next = [...priorities];
        [next[index + 1], next[index]] = [next[index], next[index + 1]];
        setPriorities(rebuildPriorities(next));
        setHasChanges(true);
    };

    const toggleEnabled = (id: number) => {
        setPriorities(prev =>
            prev.map(p => p.id === id ? { ...p, is_enabled: !p.is_enabled } : p)
        );
        setHasChanges(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await settingsService.updateAiApiPriorities(
                priorities.map(p => ({
                    provider_type: p.provider_type,
                    provider_id: p.provider_id,
                    priority: p.priority,
                    is_enabled: p.is_enabled,
                }))
            );
            showSuccess("Đã lưu cấu hình ưu tiên API!");
            setHasChanges(false);
        } catch (error: any) {
            showError("Lưu thất bại: " + (error.response?.data?.message || error.message));
        } finally {
            setIsSaving(false);
        }
    };

    const providerTypeLabel = (type: string) =>
        type === 'cliproxy' ? 'Cliproxy' : 'Troll LLM';

    const priorityBadgeColor = (p: number) => {
        if (p === 1) return 'bg-green-100 text-green-700';
        if (p === 2) return 'bg-amber-100 text-amber-700';
        return 'bg-gray-100 text-gray-600';
    };

    return (
        <Card className="shadow-sm rounded-2xl bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Thứ tự ưu tiên API cho Content AI</CardTitle>
                    <CardDescription>
                        Khi API ưu tiên cao gặp lỗi, hệ thống tự động chuyển sang API tiếp theo.
                    </CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="rounded-lg"
                    >
                        {isSyncing ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        Đồng bộ nhà cung cấp
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!hasChanges || isSaving}
                        className="bg-blue-600 hover:bg-blue-700 rounded-lg"
                    >
                        {isSaving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        Lưu thứ tự
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : priorities.length === 0 ? (
                    <div className="flex flex-col items-center py-10 text-muted-foreground gap-3 border rounded-xl border-dashed">
                        <RefreshCw className="h-10 w-10 text-blue-400" />
                        <p className="font-medium text-center text-sm px-4">
                            Chưa có cấu hình ưu tiên nào. Nhấn <strong>"Đồng bộ nhà cung cấp"</strong> để tự động tạo danh sách từ
                            các API đã cấu hình (Cliproxy, Troll LLM).
                        </p>
                        <Button
                            variant="default"
                            className="rounded-lg bg-blue-600 hover:bg-blue-700 mt-1"
                            onClick={handleSync}
                            disabled={isSyncing}
                        >
                            {isSyncing ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="mr-2 h-4 w-4" />
                            )}
                            Đồng bộ ngay
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Info banner */}
                        <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-700 flex items-start gap-2">
                            <Layers className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>
                                Hệ thống gọi API theo thứ tự ưu tiên từ trên xuống. Nếu API lỗi, tự động chuyển sang API tiếp theo.
                                Tắt switch để bỏ qua API đó. Nhấn <strong>Đồng bộ</strong> để thêm provider mới vào danh sách.
                            </span>
                        </div>

                        {priorities.map((item, index) => (
                            <div
                                key={item.id}
                                className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                                    item.is_enabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'
                                }`}
                            >
                                {/* Priority badge */}
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${priorityBadgeColor(item.priority)}`}>
                                    {item.priority}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-sm">{item.provider_name ?? providerTypeLabel(item.provider_type)}</span>
                                        <Badge variant="outline" className="text-xs h-5 px-1.5">
                                            {providerTypeLabel(item.provider_type)}
                                        </Badge>
                                        {item.priority === 1 && item.is_enabled && (
                                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 text-xs h-5 px-1.5">
                                                Ưu tiên 1
                                            </Badge>
                                        )}
                                        {item.priority === 2 && item.is_enabled && (
                                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-xs h-5 px-1.5">
                                                Ưu tiên 2
                                            </Badge>
                                        )}
                                        {item.priority === 3 && item.is_enabled && (
                                            <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100 border-0 text-xs h-5 px-1.5">
                                                Ưu tiên 3
                                            </Badge>
                                        )}
                                        {item.priority > 3 && item.is_enabled && (
                                            <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100 border-0 text-xs h-5 px-1.5">
                                                Ưu tiên {item.priority}
                                            </Badge>
                                        )}
                                        {!item.is_enabled && (
                                            <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100 border-0 text-xs h-5 px-1.5">
                                                Đã tắt
                                            </Badge>
                                        )}
                                    </div>
                                    {item.provider_url && (
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                                            <p className="text-xs text-muted-foreground font-mono truncate">
                                                {item.provider_url}
                                                {item.provider_model && ` • ${item.provider_model}`}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Controls */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <Switch
                                        checked={item.is_enabled}
                                        onCheckedChange={() => toggleEnabled(item.id)}
                                    />
                                    <div className="flex flex-col gap-0.5">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0 rounded hover:bg-gray-100"
                                            onClick={() => moveUp(index)}
                                            disabled={index === 0}
                                        >
                                            <ChevronUp className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0 rounded hover:bg-gray-100"
                                            onClick={() => moveDown(index)}
                                            disabled={index === priorities.length - 1}
                                        >
                                            <ChevronDown className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default AiApiPrioritySettings;
