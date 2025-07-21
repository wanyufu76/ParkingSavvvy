/* ---------- 以下為完整 AdminDashboard.tsx ---------- */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Database, Car, MessageSquare, Edit, Trash2, Reply, LogOut,
  Shield, BarChart3, MapPin, Key, Video, Settings, Plus
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { ContactMessage, ParkingSpot } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import AddParkingSpotDialog from "@/components/AddParkingSpotDialog";

export default function AdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [replyText, setReplyText] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  /* -------------------- Queries -------------------- */
  const { data: admin, isLoading: adminLoading, error: adminError } = useQuery({
    queryKey: ["/admin/me"],
    queryFn: async () => (await apiRequest("GET", "/admin/me")).json(),
    retry: 1
  });
  if (adminError && !adminLoading) {
    window.location.href = "/admin/login";
    return null;
  }

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["/admin/api/messages"],
    queryFn: async () => (await apiRequest("GET", "/admin/api/messages")).json()
  });
  const { data: parkingSpots = [], isLoading: spotsLoading } = useQuery({
    queryKey: ["/admin/api/parking-spots"],
    queryFn: async () => (await apiRequest("GET", "/admin/api/parking-spots")).json()
  });
  const { data: videos = [], isLoading: videosLoading } = useQuery({
    queryKey: ["/admin/api/videos"],
    queryFn: async () => (await apiRequest("GET", "/admin/api/videos")).json()
  });

  /* -------------------- Mutations -------------------- */
  const replyMutation = useMutation({
    mutationFn: async ({ id, reply }: { id: number; reply: string }) =>
      (await apiRequest("POST", `/admin/api/messages/${id}/reply-with-notification`, { reply })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/admin/api/messages"] });
      setSelectedMessage(null);
      setReplyText("");
      toast({ title: "回覆已送出", description: "訊息回覆成功" });
    },
    onError: () => toast({ title: "回覆失敗", description: "請稍後再試", variant: "destructive" })
  });

  const deleteParkingSpotMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/admin/api/parking-spots/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/admin/api/parking-spots"] });
      toast({ title: "刪除成功", description: "停車格已刪除" });
    },
    onError: () => toast({ title: "刪除失敗", description: "請稍後再試", variant: "destructive" })
  });

  const deleteVideoMutation = useMutation({
    mutationFn: async (videoId: number) =>
      (await apiRequest("DELETE", `/admin/api/videos/${videoId}`)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/admin/api/videos"] });
      toast({ title: "影片已刪除", description: "影片檔案已成功移除" });
    },
    onError: () => toast({ title: "刪除失敗", description: "無法刪除影片，請稍後再試", variant: "destructive" })
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ newPassword }: { newPassword: string }) =>
      (await apiRequest("POST", "/admin/change-password", { newPassword })).json(),
    onSuccess: () => {
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "密碼修改成功", description: "管理員密碼已更新" });
    },
    onError: () => toast({ title: "密碼修改失敗", description: "請稍後再試", variant: "destructive" })
  });

  const logoutMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/admin/logout")).json(),
    onSuccess: () => { window.location.href = "/admin/login"; }
  });

  /* -------------------- Handlers -------------------- */
  const handleReply = (m: ContactMessage) => { setSelectedMessage(m); setReplyText(""); };
  const submitReply = () => {
    if (selectedMessage && replyText.trim()) replyMutation.mutate({ id: selectedMessage.id, reply: replyText });
  };
  const handleChangePassword = () => {
    if (newPassword.length < 6) return toast({ title: "密碼太短", description: "至少 6 個字符", variant: "destructive" });
    if (newPassword !== confirmPassword) return toast({ title: "密碼不匹配", description: "兩次輸入不同", variant: "destructive" });
    changePasswordMutation.mutate({ newPassword });
  };

  /* -------------------- Loading -------------------- */
  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Shield className="w-12 h-12 text-blue-600 animate-pulse" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">載入管理員資訊中...</span>
      </div>
    );
  }

  /* -------------------- Derived Data -------------------- */
  const unreadMessages = messages.filter((m: ContactMessage) => !m.isReplied).length;
  const totalParkingSpots = parkingSpots.length;
  const availableSpots = parkingSpots.reduce((s: number, p: ParkingSpot) => s + p.availableSpaces, 0);

  /* ========================================================================
     ================================= JSX ==================================
     ======================================================================== */
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ---------------- Header ---------------- */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">停車格管理後台</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">歡迎，{admin.username}</span>
              <Button variant="outline" size="sm" onClick={() => logoutMutation.mutate()} disabled={logoutMutation.isPending}>
                <LogOut className="w-4 h-4 mr-2" />
                登出
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ---------------- Main ---------------- */}
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* ===== 統計卡片 ===== */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Card: 未讀訊息 */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <MessageSquare className="w-8 h-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">未讀訊息</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{unreadMessages}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Card: 停車格總數 */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Car className="w-8 h-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">停車格總數</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalParkingSpots}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Card: 可用車位 */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <MapPin className="w-8 h-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">可用車位</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{availableSpots}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Card: 使用率 */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="w-8 h-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">使用率</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {totalParkingSpots > 0
                      ? Math.round(
                          (availableSpots /
                            (parkingSpots.reduce(
                              (sum: number, s: ParkingSpot) => sum + s.totalSpaces,
                              0
                            ) || 1)) * 100
                        )
                      : 0}
                    %
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ===== Tabs ===== */}
        <Tabs defaultValue="messages" className="space-y-6">
          {/* TabsList */}
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> 使用者回饋
            </TabsTrigger>
            <TabsTrigger value="parking" className="flex items-center gap-2">
              <Car className="w-4 h-4" /> 停車格管理
            </TabsTrigger>
            <TabsTrigger value="videos" className="flex items-center gap-2">
              <Video className="w-4 h-4" /> 影片管理
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" /> 帳號設定
            </TabsTrigger>
            <TabsTrigger value="database" className="flex items-center gap-2">
              <Database className="w-4 h-4" /> 資料庫管理
            </TabsTrigger>
          </TabsList>

          {/* -------- 使用者回饋 -------- */}
          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle>使用者回饋管理</CardTitle>
                <CardDescription>查看和回覆使用者的聯絡訊息</CardDescription>
              </CardHeader>
              <CardContent>
                {messagesLoading ? (
                  <p>載入中...</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>姓名</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>主旨</TableHead>
                        <TableHead>狀態</TableHead>
                        <TableHead>建立時間</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {messages.map((m: ContactMessage) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.name}</TableCell>
                          <TableCell>{m.email}</TableCell>
                          <TableCell>{m.subject}</TableCell>
                          <TableCell>
                            <Badge variant={m.isReplied ? "default" : "secondary"}>
                              {m.isReplied ? "已回覆" : "待回覆"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {m.createdAt
                              ? new Date(m.createdAt).toLocaleDateString("zh-TW")
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReply(m)}
                              disabled={replyMutation.isPending}
                            >
                              <Reply className="w-4 h-4 mr-1" /> 回覆
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* -------- 停車格管理 -------- */}
          <TabsContent value="parking">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>停車格管理</CardTitle>
                  <CardDescription>管理系統中的所有停車格</CardDescription>
                </div>
                <Button onClick={() => setAddOpen(true)} className="ml-auto">
                  <Plus className="w-4 h-4 mr-1" /> 新增停車格
                </Button>
              </CardHeader>
              <CardContent>
                {spotsLoading ? (
                  <p>載入中...</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>名稱</TableHead>
                        <TableHead>地址</TableHead>
                        <TableHead>總車位</TableHead>
                        <TableHead>可用車位</TableHead>
                        <TableHead>每小時費用</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parkingSpots.map((spot: ParkingSpot) => (
                        <TableRow key={spot.id}>
                          <TableCell className="font-medium">{spot.name}</TableCell>
                          <TableCell>{spot.address}</TableCell>
                          <TableCell>{spot.totalSpaces}</TableCell>
                          <TableCell>{spot.availableSpaces}</TableCell>
                          <TableCell>NT$ {spot.pricePerHour}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteParkingSpotMutation.mutate(spot.id)}
                                disabled={deleteParkingSpotMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            <AddParkingSpotDialog open={addOpen} onOpenChange={setAddOpen} />
          </TabsContent>

          {/* -------- 影片管理 -------- */}
          <TabsContent value="videos">
            <Card>
              <CardHeader>
                <CardTitle>影片管理</CardTitle>
                <CardDescription>查看用戶上傳的影片檔案，為 AI 模型訓練準備資料</CardDescription>
              </CardHeader>
              <CardContent>
                {videosLoading ? (
                  <p>載入中...</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>檔案名稱</TableHead>
                        <TableHead>上傳者</TableHead>
                        <TableHead>檔案大小</TableHead>
                        <TableHead>處理狀態</TableHead>
                        <TableHead>上傳時間</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {videos.map((video: any) => (
                        <TableRow key={video.id}>
                          <TableCell className="font-medium">
                            {video.originalName || video.filename}
                          </TableCell>
                          <TableCell>{video.username || "未知用戶"}</TableCell>
                          <TableCell>{(video.size / 1024 / 1024).toFixed(2)} MB</TableCell>
                          <TableCell>
                            <Badge variant={video.status === "uploaded" ? "default" : "secondary"}>
                              {video.status === "uploaded" ? "已上傳" : "處理中"}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(video.createdAt).toLocaleDateString("zh-TW")}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" asChild>
                                {/* ★ 改為直接指向 /uploads/filename ★ */}
                                <a
                                  href={`/uploads/${video.filename}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  查看
                                </a>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteVideoMutation.mutate(video.id)}
                                disabled={deleteVideoMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* -------- 帳號設定 -------- */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>帳號設定</CardTitle>
                <CardDescription>管理管理員帳號設定</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* --- 修改密碼 --- */}
                <div>
                  <h3 className="text-lg font-medium mb-4">修改密碼</h3>
                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-sm font-medium mb-2">新密碼</label>
                      <Input
                        type="password"
                        placeholder="請輸入新密碼（至少6個字符）"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">確認密碼</label>
                      <Input
                        type="password"
                        placeholder="請再次輸入新密碼"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleChangePassword}
                      disabled={changePasswordMutation.isPending || !newPassword || !confirmPassword}
                    >
                      <Key className="w-4 h-4 mr-2" />
                      {changePasswordMutation.isPending ? "修改中..." : "修改密碼"}
                    </Button>
                  </div>
                </div>

                {/* --- 管理員資訊 --- */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">管理員資訊</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">用戶名：</span>{admin?.username}</p>
                    <p><span className="font-medium">角色：</span>{admin?.role}</p>
                    <p><span className="font-medium">最後登入：</span>{admin?.lastLogin ? new Date(admin.lastLogin).toLocaleString("zh-TW") : "從未登入"}</p>
                    <p><span className="font-medium">帳號狀態：</span>
                      <Badge variant={admin?.isActive ? "default" : "secondary"}>
                        {admin?.isActive ? "啟用" : "停用"}
                      </Badge>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* -------- 資料庫管理 -------- */}
          <TabsContent value="database">
            <Card>
              <CardHeader>
                <CardTitle>資料庫管理</CardTitle>
                <CardDescription>監控系統資料庫狀態和統計資料</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">停車格資料</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">總計 {totalParkingSpots} 個停車格</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">聯絡訊息</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">總計 {messages.length} 條訊息</p>
                    </div>
                  </div>
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">注意事項</h3>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      資料庫操作需要謹慎處理，建議定期備份重要資料。
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* -------- 回覆訊息 Dialog -------- */}
      <Dialog open={selectedMessage !== null} onOpenChange={() => setSelectedMessage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>回覆訊息</DialogTitle>
            <DialogDescription>回覆來自 {selectedMessage?.name} 的訊息</DialogDescription>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="font-semibold mb-2">原始訊息</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">主旨: {selectedMessage.subject}</p>
                <p className="text-sm">{selectedMessage.message}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">回覆內容</label>
                <Textarea placeholder="請輸入回覆內容..." value={replyText} onChange={e => setReplyText(e.target.value)} rows={4} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setSelectedMessage(null)}>取消</Button>
                <Button onClick={submitReply} disabled={!replyText.trim() || replyMutation.isPending}>
                  {replyMutation.isPending ? "送出中..." : "送出回覆"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
