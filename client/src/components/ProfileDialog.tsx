import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Settings, Bell, Lock, User } from "lucide-react";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "請輸入當前密碼"),
  newPassword: z.string().min(6, "新密碼至少6位數"),
  confirmPassword: z.string().min(1, "請確認新密碼"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "新密碼確認不符",
  path: ["confirmPassword"],
});

type ChangePasswordData = z.infer<typeof changePasswordSchema>;

// 🔹 定義通知型別，包含 username & role
type NotificationWithUser = {
  id: number;
  title?: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  username?: string;
  role?: string;
};

interface ProfileDialogProps {
  children: React.ReactNode;
}

export default function ProfileDialog({ children }: ProfileDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [open, setOpen] = useState(false);

  const form = useForm<ChangePasswordData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // 獲取通知
  const { data: notifications = [] } = useQuery<NotificationWithUser[]>({
    queryKey: ["/api/notifications"],
  });

  // 密碼修改mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: ChangePasswordData) => {
      const response = await apiRequest("POST", "/api/change-password", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "密碼修改成功",
        description: "您的密碼已成功更新",
      });
      form.reset();
      setShowPasswordForm(false);
    },
    onError: (error: Error) => {
      toast({
        title: "密碼修改失敗",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 標記通知為已讀
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await apiRequest("PATCH", `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

// 標記所有通知為已讀
const markAllAsReadMutation = useMutation({
  mutationFn: async () => {
    await apiRequest("PATCH", "/api/notifications/mark-all-read");
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    toast({
      title: "已讀取所有通知",
      description: "所有通知已標記為已讀",
    });
  },
  onError: (error: any) => {
    toast({
      title: "錯誤",
      description: error.message || "標記失敗",
      variant: "destructive",
    });
  },
});

  const onSubmit = (data: ChangePasswordData) => {
    changePasswordMutation.mutate(data);
  };

  const unreadCount = Array.isArray(notifications) ? notifications.filter((n: any) => !n.isRead).length : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            個人設定
          </DialogTitle>
          <DialogDescription>
            管理您的帳戶設定和通知
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* 通知區域 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  通知中心
                  {unreadCount > 0 && (
                    <Badge variant="destructive">{unreadCount}</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  查看系統通知和管理員回覆
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Array.isArray(notifications) && notifications.length > 0 && (
                  <Button
                  variant="outline"
                  onClick={() => markAllAsReadMutation.mutate()}
                >
                  全部標記已讀
                </Button>
                )}
                
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {!Array.isArray(notifications) || notifications.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      暫無通知
                    </p>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 rounded-lg border ${
                          notification.isRead 
                            ? "bg-muted/50" 
                            : "bg-blue-50 border-blue-200"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1">
                            <h4 className="font-medium">{notification.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => markAsReadMutation.mutate(notification.id)}
                              disabled={markAsReadMutation.isPending}
                            >
                              標記已讀
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 密碼修改區域 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  安全設定
                </CardTitle>
                <CardDescription>
                  修改您的登入密碼
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!showPasswordForm ? (
                  <Button 
                    onClick={() => setShowPasswordForm(true)}
                    variant="outline"
                  >
                    修改密碼
                  </Button>
                ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>當前密碼</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>新密碼</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>確認新密碼</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          disabled={changePasswordMutation.isPending}
                        >
                          {changePasswordMutation.isPending ? "更新中..." : "更新密碼"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowPasswordForm(false);
                            form.reset();
                          }}
                        >
                          取消
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
