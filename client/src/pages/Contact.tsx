import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Users, University, MapPin, Send, Bot, Calendar, Globe } from "lucide-react";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  const contactMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; subject: string; message: string }) => {
      await apiRequest("POST", "/api/contact", data);
    },
    onSuccess: () => {
      toast({
        title: "訊息已送出",
        description: "感謝您的意見回饋，我們會盡快回覆您。",
      });
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    },
    onError: () => {
      toast({
        title: "送出失敗",
        description: "訊息送出失敗，請稍後再試。",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!name || !email || !subject || !message) {
      toast({
        title: "請填寫完整資訊",
        description: "請確認所有必填欄位都已填寫。",
        variant: "destructive",
      });
      return;
    }

    contactMutation.mutate({ name, email, subject, message });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            <Mail className="h-8 w-8 text-primary mr-3 inline" />
            聯絡我們
          </h2>
          <p className="text-lg text-gray-600">歡迎提供意見回饋或聯繫製作團隊</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-6">意見回饋表單</h3>
            <Card>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="contact-name">姓名</Label>
                    <Input
                      id="contact-name"
                      type="text"
                      required
                      placeholder="請輸入您的姓名"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact-email">電子郵件</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      required
                      placeholder="請輸入您的電子郵件"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact-subject">主題</Label>
                    <Select value={subject} onValueChange={setSubject} required>
                      <SelectTrigger>
                        <SelectValue placeholder="請選擇主題" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bug-report">錯誤回報</SelectItem>
                        <SelectItem value="feature-request">功能建議</SelectItem>
                        <SelectItem value="general-feedback">一般意見</SelectItem>
                        <SelectItem value="technical-support">技術支援</SelectItem>
                        <SelectItem value="collaboration">合作洽詢</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="contact-message">訊息內容</Label>
                    <Textarea
                      id="contact-message"
                      rows={6}
                      required
                      placeholder="請詳細描述您的意見或問題..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90"
                    disabled={contactMutation.isPending}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {contactMutation.isPending ? "送出中..." : "送出訊息"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Team Info */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-6">製作團隊</h3>
            <Card className="mb-8">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="h-10 w-10 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900">位無一失開發團隊</h4>
                  <p className="text-gray-600">國立台灣科技大學專題團隊</p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <University className="h-5 w-5 text-primary" />
                    <span className="text-gray-700">國立台灣科技大學</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Bot className="h-5 w-5 text-primary" />
                    <span className="text-gray-700">YOLOv8 深度學習專題</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-primary" />
                    <span className="text-gray-700">2024年度專題計畫</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-5 w-5 text-primary" />
                    <span className="text-gray-700">台北市大安區基隆路四段43號</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tech Stack */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">技術架構</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <Bot className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900">YOLOv8</p>
                    <p className="text-xs text-gray-600">AI模型</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <Globe className="h-8 w-8 text-secondary mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900">Google Maps</p>
                    <p className="text-xs text-gray-600">地圖服務</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-warning rounded mx-auto mb-2 flex items-center justify-center">
                      <span className="text-xs font-bold text-white">Py</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">Python</p>
                    <p className="text-xs text-gray-600">後端開發</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-success rounded mx-auto mb-2 flex items-center justify-center">
                      <span className="text-xs font-bold text-white">JS</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">JavaScript</p>
                    <p className="text-xs text-gray-600">前端開發</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* FAQ */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">常見問題</h4>
              <div className="space-y-3">
                <Card>
                  <CardContent className="p-4">
                    <details>
                      <summary className="cursor-pointer font-medium text-gray-900 hover:text-primary">
                        系統如何辨識停車位狀態？
                      </summary>
                      <div className="mt-2 text-gray-600">
                        我們使用YOLOv8深度學習模型分析行車記錄器影像，自動識別停車格的佔用狀況。
                      </div>
                    </details>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <details>
                      <summary className="cursor-pointer font-medium text-gray-900 hover:text-primary">
                        資料更新頻率如何？
                      </summary>
                      <div className="mt-2 text-gray-600">
                        系統會根據使用者上傳的影像即時更新停車位資訊，提供最準確的停車狀況。
                      </div>
                    </details>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <details>
                      <summary className="cursor-pointer font-medium text-gray-900 hover:text-primary">
                        如何提高辨識準確度？
                      </summary>
                      <div className="mt-2 text-gray-600">
                        持續上傳清晰的停車場影像可以幫助我們訓練更準確的AI模型。
                      </div>
                    </details>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
