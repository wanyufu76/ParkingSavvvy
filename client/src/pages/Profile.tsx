import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "請輸入當前密碼"),
  newPassword: z.string().min(6, "新密碼至少6位數"),
  confirmPassword: z.string().min(1, "請確認新密碼"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "新密碼確認不符",
  path: ["confirmPassword"],
});

type ChangePasswordData = z.infer<typeof changePasswordSchema>;

export default function Profile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const form = useForm<ChangePasswordData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // 獲取通知
  const { data: notifications = [] } = useQuery({
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
        title: "成功",
        description: "密碼修改成功",
      });
      form.reset();
      setShowPasswordForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "錯誤",
        description: error.message || "密碼修改失敗",
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

  const onSubmit = (data: ChangePasswordData) => {
    changePasswordMutation.mutate(data);
  };

  const unreadCount = (notifications as any[])?.filter((n: any) => !n.isRead)?.length || 0;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <h1 className="text-3xl font-bold">個人資料</h1>

      {/* 密碼修改區塊 */}
      <Card>
        <CardHeader>
          <CardTitle>帳號安全</CardTitle>
          <CardDescription>修改您的登入密碼</CardDescription>
        </CardHeader>
        <CardContent>
          {!showPasswordForm ? (
            <Button onClick={() => setShowPasswordForm(true)}>
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
                  <Button type="submit" disabled={changePasswordMutation.isPending}>
                    {changePasswordMutation.isPending ? "修改中..." : "確認修改"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowPasswordForm(false)}>
                    取消
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>

      {/* 系統通知區塊 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            系統通知
            {unreadCount > 0 && (
              <Badge variant="destructive">{unreadCount} 未讀</Badge>
            )}
          </CardTitle>
          <CardDescription>查看系統回覆和重要通知</CardDescription>
        </CardHeader>
        <CardContent>
          {(notifications as any[])?.length === 0 ? (
            <p className="text-gray-500">暫無通知</p>
          ) : (
            <div className="space-y-3">
              {(notifications as any[])?.map((notification: any) => (
                <div
                  key={notification.id}
                  className={`p-4 border rounded-lg ${
                    notification.isRead ? "bg-gray-50" : "bg-blue-50 border-blue-200"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{notification.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markAsReadMutation.mutate(notification.id)}
                      >
                        標記已讀
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}