import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video, Users, Search, Calendar, User, MapPin, Download, ArrowLeft, Eye } from "lucide-react";
import { ImageUpload } from "@shared/schema";

export default function SharedVideos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterUser, setFilterUser] = useState("all");
  
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // 檢查用戶是否有上傳記錄的權限
  const { data: userUploads = [], isLoading: uploadsLoading } = useQuery<ImageUpload[]>({
    queryKey: ["/api/uploads"],
    enabled: isAuthenticated,
  });

  // 獲取所有用戶的共享影片
  const { data: allVideos = [], isLoading: videosLoading } = useQuery<any[]>({
    queryKey: ["/api/shared-videos"],
    enabled: isAuthenticated && userUploads.length > 0,
  });

  // 重定向未認證用戶
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "請先登入",
        description: "需要登入才能查看共享影片",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/auth";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  // 重定向沒有上傳記錄的用戶
  useEffect(() => {
    if (!uploadsLoading && isAuthenticated && userUploads.length === 0) {
      toast({
        title: "權限不足",
        description: "需要有上傳記錄才能查看他人共享影片",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/upload";
      }, 1000);
      return;
    }
  }, [uploadsLoading, isAuthenticated, userUploads.length, toast]);

  // 獲取唯一的用戶列表
  const uniqueUsers = Array.from(new Set(allVideos.map((video: any) => video.username).filter(Boolean)));

  // 過濾和排序影片
  const filteredVideos = allVideos
    .filter((video: any) => {
      const matchesSearch = video.originalName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           video.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           video.location?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesUser = filterUser === "all" || video.username === filterUser;
      return matchesSearch && matchesUser;
    })
    .sort((a: any, b: any) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "username":
          return (a.username || "").localeCompare(b.username || "");
        case "filesize":
          return (b.size || 0) - (a.size || 0);
        default:
          return 0;
      }
    });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (authLoading || uploadsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-lg p-6">
                  <div className="h-32 bg-gray-200 rounded mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 頁面標題 */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Button
              variant="ghost"
              onClick={() => window.history.back()}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">
              <Users className="h-8 w-8 text-primary mr-3 inline" />
              社群共享影片
            </h1>
          </div>
          <p className="text-lg text-gray-600">
            查看社群用戶分享的停車場景影片，共同改善AI模型
          </p>
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <Video className="h-4 w-4 mr-2" />
            共 {allVideos.length} 部影片
            <Users className="h-4 w-4 ml-4 mr-2" />
            來自 {uniqueUsers.length} 位用戶
          </div>
        </div>

        {/* 搜尋和篩選 */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="搜尋影片名稱、描述或地點..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={filterUser} onValueChange={setFilterUser}>
                <SelectTrigger>
                  <SelectValue placeholder="篩選用戶" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有用戶</SelectItem>
                  {uniqueUsers.map((username) => (
                    <SelectItem key={username} value={username}>
                      {username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="排序方式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">最新上傳</SelectItem>
                  <SelectItem value="oldest">最舊上傳</SelectItem>
                  <SelectItem value="username">用戶名稱</SelectItem>
                  <SelectItem value="filesize">檔案大小</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 影片列表 */}
        {videosLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">載入共享影片中...</p>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="text-center py-12">
            <Video className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">沒有找到影片</h3>
            <p className="text-gray-600">
              {allVideos.length === 0 ? "目前還沒有用戶分享影片" : "請嘗試調整搜尋條件"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((video: any) => (
              <Card key={video.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">
                        {video.username || '匿名用戶'}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {formatFileSize(video.size || 0)}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* 影片預覽 */}
                  <div className="relative bg-gray-100 rounded-lg aspect-video flex items-center justify-center">
                    <Video className="h-12 w-12 text-gray-400" />
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="text-xs">
                        影片
                      </Badge>
                    </div>
                  </div>

                  {/* 影片資訊 */}
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-900 line-clamp-1">
                      {video.originalName || video.filename}
                    </h3>
                    
                    {video.location && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-3 w-3 mr-1" />
                        {video.location}
                      </div>
                    )}
                    
                    {video.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {video.description}
                      </p>
                    )}
                    
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(video.createdAt).toLocaleDateString('zh-TW')}
                    </div>
                  </div>

                  {/* 操作按鈕 */}
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      asChild
                    >
                      <a
                        href={`/api/uploads/${video.filename}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        觀看
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a
                        href={`/uploads/${video.filename}`}
                        download={video.originalName || video.filename}
                      >
                        <Download className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}