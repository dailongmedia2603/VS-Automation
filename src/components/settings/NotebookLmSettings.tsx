import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { settingsService, NotebookLmAccount } from '@/api/settings';
import { useState, useEffect } from "react";
import { showSuccess, showError } from "@/utils/toast";
import { Loader2, Plus, Trash2, CheckCircle, User, RefreshCw, AlertCircle } from "lucide-react";
import { useApiSettings } from "@/contexts/ApiSettingsContext";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

const NotebookLmSettings = () => {
    const { settings } = useApiSettings();
    const [accounts, setAccounts] = useState<NotebookLmAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newAccountName, setNewAccountName] = useState('');
    const [newAccountCookies, setNewAccountCookies] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [checkingAccountId, setCheckingAccountId] = useState<number | null>(null);

    const fetchAccounts = async () => {
        setIsLoading(true);
        try {
            const data = await settingsService.getNotebookLmAccounts();
            setAccounts(data);
        } catch (error: any) {
            showError("Không thể tải danh sách tài khoản: " + (error.response?.data?.message || error.message));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    const handleAddAccount = async () => {
        if (!newAccountName || !newAccountCookies) {
            showError("Vui lòng nhập tên và cookies.");
            return;
        }

        setIsAdding(true);
        try {
            await settingsService.storeNotebookLmAccount({
                name: newAccountName,
                cookies: newAccountCookies
            });
            showSuccess("Thêm tài khoản thành công!");
            setIsDialogOpen(false);
            setNewAccountName('');
            setNewAccountCookies('');
            fetchAccounts();
        } catch (error: any) {
            showError("Thêm tài khoản thất bại: " + (error.response?.data?.message || error.message));
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteAccount = async (id: number) => {
        if (!confirm("Bạn có chắc chắn muốn xóa tài khoản này?")) return;
        try {
            await settingsService.deleteNotebookLmAccount(id);
            showSuccess("Xóa tài khoản thành công!");
            fetchAccounts();
        } catch (error: any) {
            showError("Xóa tài khoản thất bại: " + (error.response?.data?.message || error.message));
        }
    };

    const handleSetActive = async (id: number) => {
        try {
            await settingsService.setActiveNotebookLmAccount(id);
            showSuccess("Đã chuyển đổi tài khoản hoạt động!");
            fetchAccounts();
        } catch (error: any) {
            showError("Chuyển đổi tài khoản thất bại: " + (error.response?.data?.message || error.message));
        }
    };

    const handleCheckConnection = async (id: number) => {
        setCheckingAccountId(id);
        try {
            const result = await settingsService.checkNotebookLmAccount(id);
            if (result.success) {
                showSuccess(result.message);
            } else {
                showError(result.message);
            }
            fetchAccounts(); // Refresh to show/hide badges based on updated backend state
        } catch (error: any) {
            showError("Kiểm tra kết nối thất bại: " + (error.response?.data?.message || error.message));
        } finally {
            setCheckingAccountId(null);
        }
    };

    return (
        <Card className="shadow-sm rounded-2xl bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Tài khoản NotebookLM</CardTitle>
                    <CardDescription>
                        Quản lý các tài khoản NotebookLM để sử dụng cho Content AI.
                    </CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700 rounded-lg">
                            <Plus className="mr-2 h-4 w-4" />
                            Thêm tài khoản
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Thêm tài khoản mới</DialogTitle>
                            <DialogDescription>
                                Nhập tên hiển thị và chuỗi Cookies để kết nối.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">
                                    Tên
                                </Label>
                                <Input
                                    id="name"
                                    value={newAccountName}
                                    onChange={(e) => setNewAccountName(e.target.value)}
                                    placeholder="Ví dụ: Tài khoản cá nhân"
                                    className="col-span-3 rounded-lg"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-start gap-4">
                                <Label htmlFor="cookies" className="text-right mt-2">
                                    Cookies
                                </Label>
                                <div className="col-span-3 space-y-2">
                                    <Textarea
                                        id="cookies"
                                        value={newAccountCookies}
                                        onChange={(e) => setNewAccountCookies(e.target.value)}
                                        placeholder="Dán chuỗi cookies..."
                                        className="rounded-lg font-mono text-xs min-h-[100px]"
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        Lấy từ notebooklm.google.com (F12 → Application → Cookies)
                                    </p>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-lg">Hủy</Button>
                            <Button onClick={handleAddAccount} disabled={isAdding} className="bg-blue-600 hover:bg-blue-700 rounded-lg">
                                {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Lưu tài khoản
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
                ) : accounts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border rounded-xl border-dashed">
                        Chưa có tài khoản nào được kết nối. Hãy thêm tài khoản mới.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {accounts.map((account) => (
                            <div
                                key={account.id}
                                className={`flex items-center justify-between p-4 rounded-xl border ${account.is_active ? 'border-blue-200 bg-blue-50/50' : 'border-gray-100'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-full ${account.is_active ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                        <User className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-sm">{account.name}</h4>
                                            {account.is_active && (
                                                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0 h-5 px-2">Đang sử dụng</Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground font-mono mt-1">
                                            ID: {account.account_id || 'Chưa đồng bộ'} • Tạo lúc: {new Date(account.created_at).toLocaleDateString('vi-VN')}
                                        </p>

                                        {/* Status Display */}
                                        {account.last_check_status && (
                                            <div className={`mt-2 flex items-center gap-1.5 text-xs ${account.last_check_status === 'success' ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                {account.last_check_status === 'success' ? (
                                                    <CheckCircle className="h-3.5 w-3.5" />
                                                ) : (
                                                    <AlertCircle className="h-3.5 w-3.5" />
                                                )}
                                                <span>
                                                    {account.last_check_message || (account.last_check_status === 'success' ? 'Kết nối ổn định' : 'Mất kết nối')}
                                                </span>
                                                {account.last_checked_at && (
                                                    <span className="text-muted-foreground opacity-70 ml-1">
                                                        ({new Date(account.last_checked_at).toLocaleTimeString('vi-VN')} {new Date(account.last_checked_at).toLocaleDateString('vi-VN')})
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-xs rounded-lg"
                                        onClick={() => handleCheckConnection(account.id)}
                                        disabled={checkingAccountId === account.id}
                                    >
                                        {checkingAccountId === account.id ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <RefreshCw className="h-3.5 w-3.5" />
                                        )}
                                        <span className="ml-2 hidden sm:inline">Kiểm tra</span>
                                    </Button>
                                    {!account.is_active && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 text-xs rounded-lg"
                                            onClick={() => handleSetActive(account.id)}
                                        >
                                            Sử dụng
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                        onClick={() => handleDeleteAccount(account.id)}
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

export default NotebookLmSettings;
