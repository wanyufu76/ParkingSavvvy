import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Heart, Search, Navigation as NavigationIcon, Eye } from "lucide-react";
import type { UserFavorite, ParkingSpot } from "@shared/schema";

export default function Favorites() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

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

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ["/api/favorites"],
    enabled: isAuthenticated,
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async (parkingSpotId: number) => {
      await apiRequest("DELETE", `/api/favorites/${parkingSpotId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: "移除成功",
        description: "已從我的最愛中移除停車位",
      });
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
        title: "移除失敗",
        description: "無法移除停車位，請稍後再試",
        variant: "destructive",
      });
    },
  });

  const handleRemoveFavorite = (parkingSpotId: number) => {
    removeFavoriteMutation.mutate(parkingSpotId);
  };

  const getStatusColor = (spot: ParkingSpot) => {
    const ratio = spot.availableSpaces / spot.totalSpaces;
    if (ratio > 0.5) return "text-success";
    if (ratio > 0.2) return "text-warning";
    return "text-error";
  };

  // Filter favorites based on search term
  const filteredFavorites = useMemo(() => {
    if (!searchTerm.trim()) return favorites;
    
    return favorites.filter((favorite: UserFavorite & { parkingSpot: ParkingSpot }) => {
      const parkingSpot = favorite.parkingSpot;
      const searchLower = searchTerm.toLowerCase();
      return (
        parkingSpot.name.toLowerCase().includes(searchLower) ||
        parkingSpot.address.toLowerCase().includes(searchLower)
      );
    });
  }, [favorites, searchTerm]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
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
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            <Heart className="h-8 w-8 text-primary mr-3 inline" />
            我的最愛
          </h2>
          <p className="text-lg text-gray-600">管理您收藏的停車位和常用路段</p>
        </div>

        {/* Search and Filter */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1 max-w-lg">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="搜尋停車位或路段..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Favorites Grid */}
        {filteredFavorites.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFavorites.map((favorite: UserFavorite & { parkingSpot: ParkingSpot }) => (
              <Card key={favorite.id} className="hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{favorite.parkingSpot.name}</h3>
                      <p className="text-sm text-gray-500">{favorite.parkingSpot.address}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFavorite(favorite.parkingSpotId)}
                      className="text-error hover:text-red-700"
                    >
                      <Heart className="h-4 w-4 fill-current" />
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">總車位</span>
                      <span className="font-semibold">{favorite.parkingSpot.totalSpaces}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">可用車位</span>
                      <span className={`font-semibold ${getStatusColor(favorite.parkingSpot)}`}>
                        {favorite.parkingSpot.availableSpaces}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">最後更新</span>
                      <span className="text-gray-500">
                        {new Date(favorite.parkingSpot.lastUpdated || '').toLocaleString('zh-TW')}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-primary hover:bg-primary/90"
                        size="sm"
                        onClick={() => {
                          const lat = parseFloat(favorite.parkingSpot.latitude);
                          const lng = parseFloat(favorite.parkingSpot.longitude);
                          window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
                        }}
                      >
                        <NavigationIcon className="h-4 w-4 mr-1" />
                        導航
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        size="sm"
                        onClick={() => window.location.href = "/"}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        查看
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              {searchTerm ? (
                <Search className="h-12 w-12 text-gray-400" />
              ) : (
                <Heart className="h-12 w-12 text-gray-400" />
              )}
            </div>
            {searchTerm ? (
              <>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">找不到符合的停車位</h3>
                <p className="text-gray-600 mb-8">嘗試使用不同的搜尋關鍵字</p>
                <Button 
                  onClick={() => setSearchTerm("")} 
                  variant="outline"
                  className="mr-4"
                >
                  清除搜尋
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">尚未收藏任何停車位</h3>
                <p className="text-gray-600 mb-8">開始將常用的停車位加入最愛吧！</p>
                <Button onClick={() => window.location.href = "/"} className="bg-primary hover:bg-primary/90">
                  <Search className="h-4 w-4 mr-2" />
                  尋找停車位
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
