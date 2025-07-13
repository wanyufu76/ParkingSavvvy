import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertUserSchema, loginSchema } from "@shared/schema";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff, Mail, User, Lock, MapPin, Bot, Clock, Smartphone, Shield, Zap, Users } from "lucide-react";
import { SiGoogle } from "react-icons/si";

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof insertUserSchema>;

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("login");

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      firstName: "",
      lastName: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const response = await apiRequest("POST", "/api/login", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], undefined);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "登入成功",
        description: "歡迎回來！",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "登入失敗",
        description: error.message || "請檢查您的使用者名稱和密碼",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const response = await apiRequest("POST", "/api/register", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], undefined);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "註冊成功",
        description: "歡迎加入位無一失！",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "註冊失敗",
        description: error.message || "註冊時發生錯誤，請稍後再試",
        variant: "destructive",
      });
    },
  });

  const onLoginSubmit = (data: LoginData) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterData) => {
    registerMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Auth forms */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary">位無一失</h1>
            <p className="text-gray-600 mt-2">智能停車格監測系統</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">登入</TabsTrigger>
              <TabsTrigger value="register">註冊</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>登入帳戶</CardTitle>
                  <CardDescription>輸入您的使用者名稱和密碼來登入</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>使用者名稱</FormLabel>
                            <FormControl>
                              <Input placeholder="請輸入使用者名稱" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>密碼</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="請輸入密碼" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? "登入中..." : "登入"}
                      </Button>
                    </form>
                  </Form>
                  
                  <div className="mt-6">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <Separator />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          或使用以下方式登入
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-6 space-y-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          window.location.href = '/api/auth/google';
                        }}
                      >
                        <SiGoogle className="mr-2 h-4 w-4" />
                        使用 Google 帳戶登入
                      </Button>
                      
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          window.location.href = '/api/auth/github';
                        }}
                      >
                        <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                        </svg>
                        使用 GitHub 帳戶登入
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>註冊新帳戶</CardTitle>
                  <CardDescription>建立您的帳戶以開始使用服務</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>使用者名稱</FormLabel>
                            <FormControl>
                              <Input placeholder="請輸入使用者名稱" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>電子信箱</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="請輸入電子信箱" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>密碼</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="至少6個字元" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>姓氏 (選填)</FormLabel>
                              <FormControl>
                                <Input placeholder="姓氏" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>名字 (選填)</FormLabel>
                              <FormControl>
                                <Input placeholder="名字" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? "註冊中..." : "註冊"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right side - Hero section */}
      <div className="flex-1 bg-gradient-to-br from-primary to-secondary hidden lg:flex items-center justify-center p-8">
        <div className="text-center text-white max-w-md">
          <h2 className="text-4xl font-bold mb-6">智能停車解決方案</h2>
          <div className="space-y-4 text-lg">
            <p>🚗 即時停車位追蹤</p>
            <p>🤖 AI影像辨識技術</p>
            <p>📍 精確位置導航</p>
            <p>⭐ 個人化收藏清單</p>
          </div>
          <div className="mt-8 p-4 bg-white/10 rounded-lg">
            <h3 className="font-semibold mb-2">密碼要求</h3>
            <p className="text-sm">• 至少6個字元</p>
            <p className="text-sm">• 支援中英文字元</p>
            <p className="text-sm">• 建議使用安全密碼</p>
          </div>
        </div>
      </div>
    </div>
  );
}