import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload as UploadIcon, CloudUpload, FolderOpen, RotateCcw, Image, Video, Check, Clock, Download, Info } from "lucide-react";
import type { ImageUpload } from "@shared/schema";
import { Trash } from "lucide-react";

export default function Upload() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [location, setLocation] = useState("");
  const [datetime, setDatetime] = useState("");
  const [description, setDescription] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  const uploadQueryKey = ["/api/uploads"];
  const { data: uploads = [], isLoading } = useQuery<ImageUpload[]>({
  queryKey: uploadQueryKey,
  queryFn: async () => {
    const res = await fetch("/api/uploads", { credentials: "include" });
    if (!res.ok) throw new Error("取得上傳紀錄失敗");
    return res.json();
  },
  enabled: isAuthenticated,
  staleTime: 1000,
  refetchOnWindowFocus: false,
});

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/uploads"] });
      toast({
        title: "上傳成功",
        description: "檔案已成功上傳，正在處理中...",
      });
      resetForm();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "上傳失敗",
        description: "檔案上傳失敗，請檢查檔案格式和大小",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const files = Array.from(event.dataTransfer.files);
    setSelectedFiles(files);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    
    if (selectedFiles.length === 0) {
      toast({
        title: "請選擇檔案",
        description: "請先選擇要上傳的檔案",
        variant: "destructive",
      });
      return;
    }

    // 一次只上傳一個檔案
    const file = selectedFiles[0];
    const formData = new FormData();
    formData.append("file", file);
    formData.append("location", location);
    formData.append("description", description);

    uploadMutation.mutate(formData);
  };

  const resetForm = () => {
    setSelectedFiles([]);
    setLocation("");
    setDatetime("");
    setDescription("");
    // Reset file input
    const fileInput = document.getElementById("file-input") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const deleteMutation = useMutation({
  mutationFn: async (uploadId: number) => {
    const res = await fetch(`/api/uploads/${uploadId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) throw new Error("刪除失敗");
    return true;
  },
  onSuccess: () => {
    toast({ title: "已刪除", description: "上傳紀錄已刪除。" });
    queryClient.invalidateQueries({ queryKey: uploadQueryKey });
  },
  onError: () => {
    toast({ title: "刪除失敗", description: "請稍後再試", variant: "destructive" });
  },
});

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
            <div className="bg-white rounded-lg p-8">
              <div className="h-32 bg-gray-200 rounded mb-6"></div>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              <UploadIcon className="h-8 w-8 text-primary mr-3 inline" />
              影像上傳區
            </h2>
            <p className="text-lg text-gray-600">上傳行車記錄器畫面，協助改善AI模型準確度</p>
          </div>
          
          {/* 查看他人共享影片按鈕 */}
          <div className="flex flex-col items-end">
            <Button
              variant={uploads.length > 0 ? "default" : "secondary"}
              disabled={uploads.length === 0}
              onClick={() => window.location.href = '/shared-videos'}
              className={uploads.length === 0 ? "cursor-not-allowed opacity-50" : ""}
            >
              <Video className="h-4 w-4 mr-2" />
              查看他人共享影片
            </Button>
            {uploads.length === 0 && (
              <p className="text-sm text-gray-500 mt-2 max-w-48 text-right">
                上傳影片方可與他人共享資源
              </p>
            )}
          </div>
        </div>
        

        {/* Upload Instructions */}
        <Card className="mb-8 bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">
              <Info className="h-5 w-5 mr-2 inline" />
              上傳說明
            </h3>
            <ul className="space-y-2 text-blue-800">
              <li className="flex items-start">
                <Check className="h-4 w-4 text-blue-600 mr-2 mt-1 flex-shrink-0" />
                支援格式：JPEG、PNG、AVI、MOV、MP4 (單檔最大500MB)
              </li>
              <li className="flex items-start">
                <Check className="h-4 w-4 text-blue-600 mr-2 mt-1 flex-shrink-0" />
                建議上傳清晰、光線充足的停車場景
              </li>
              <li className="flex items-start">
                <Check className="h-4 w-4 text-blue-600 mr-2 mt-1 flex-shrink-0" />
                您的貢獻將協助提升系統辨識準確度
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Upload Form */}
        <Card>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* File Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${
                  isDragOver ? "border-primary bg-blue-50" : "border-gray-300 hover:border-primary"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                    <CloudUpload className="h-8 w-8 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">拖拽檔案到此處或點擊選擇</h3>
                    <p className="text-gray-600">支援 JPEG、PNG、AVI、MOV、MP4 格式</p>
                  </div>
                  <input
                    type="file"
                    id="file-input"
                    multiple
                    accept=".jpg,.jpeg,.png,.mp4,.avi,.mov"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <Button
                    type="button"
                    onClick={() => document.getElementById("file-input")?.click()}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    選擇檔案
                  </Button>
                </div>
              </div>

              {/* File List */}
              {selectedFiles.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">已選擇的檔案</h4>
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {file.type.startsWith('image/') ? (
                            <Image className="h-5 w-5 text-blue-500" />
                          ) : (
                            <Video className="h-5 w-5 text-green-500" />
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{file.name}</p>
                            <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newFiles = selectedFiles.filter((_, i) => i !== index);
                            setSelectedFiles(newFiles);
                          }}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Location Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="location">拍攝地點</Label>
                  <Input
                    id="location"
                    type="text"
                    placeholder="例：台科大正門停車場"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="datetime">拍攝時間</Label>
                  <Input
                    id="datetime"
                    type="datetime-local"
                    value={datetime}
                    onChange={(e) => setDatetime(e.target.value)}
                  />
                </div>
              </div>

              {/* Additional Info */}
              <div>
                <Label htmlFor="description">描述（選填）</Label>
                <Textarea
                  id="description"
                  rows={3}
                  placeholder="請描述停車場狀況，例如：尖峰時段、天氣狀況等"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-4">
                <Button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary/90"
                  disabled={uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      上傳中...
                    </>
                  ) : (
                    <>
                      <UploadIcon className="h-4 w-4 mr-2" />
                      開始上傳
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  重設
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Upload History */}
        <div className="mt-12">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">上傳記錄</h3>
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6">
                  <div className="animate-pulse space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : Array.isArray(uploads) && uploads.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {uploads.map((upload: ImageUpload) => (
                    <div key={upload.id} className="p-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div
                            className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                              upload.processed ? "bg-success" : "bg-warning"
                            }`}
                          >
                            {upload.mimeType.startsWith("image/") ? (
                              <Image className="h-6 w-6 text-white" />
                            ) : (
                              <Video className="h-6 w-6 text-white" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {upload.originalName}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {upload.location || "未指定地點"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(upload.createdAt || "").toLocaleString("zh-TW")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              upload.processed
                                ? "bg-success text-white"
                                : "bg-warning text-white"
                            }`}
                          >
                            {upload.processed ? (
                              <>
                                <Check className="h-3 w-3 mr-1" />
                                已處理
                              </>
                            ) : (
                              <>
                                <Clock className="h-3 w-3 mr-1" />
                                處理中
                              </>
                            )}
                          </span>

                          {/* 刪除按鈕 */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(upload.id)}
                          >
                            <Trash className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  <UploadIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>尚未上傳任何檔案</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        </div>
    </div>
  );
}
