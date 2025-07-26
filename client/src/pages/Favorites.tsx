import { useEffect, useState, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Heart,
  Search,
  Navigation as NavigationIcon,
  Eye,
  MapPin,
} from "lucide-react";
import type { UserFavorite, ParkingSpot } from "@shared/schema";

/* ---------- 型別 ---------- */
type FavoriteWithSpot = UserFavorite & { parkingSpot: ParkingSpot };

/* ---------- Haversine ---------- */
function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function Favorites() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  /* ========= 1. 取得最愛 ========= */
  const {
    data: favorites = [],
    isLoading,
  } = useQuery<FavoriteWithSpot[]>({
    queryKey: ["/api/favorites"],
    queryFn: async () => (await apiRequest("GET", "/api/favorites")).json(),
    enabled: isAuthenticated,
  });

  /* ========= 2. 定位 + 靠近提醒 ========= */
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const prevCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const alertedRef = useRef<Set<number>>(new Set());

  const ALERT_RADIUS = 1000; // m
  const MIN_MOVE = 20; // m

  /* 當前要顯示的 Dialog 車格 */
  const [nearbySpot, setNearbySpot] = useState<
    (ParkingSpot & { distance: number }) | null
  >(null);

  useEffect(() => {
    if (!navigator.geolocation) return;

    /* initial */
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const p = { lat: latitude, lng: longitude };
        prevCoordsRef.current = p;
        setCoords(p);
      },
      (err) => console.error(err.message),
      { enableHighAccuracy: true }
    );

    /* watch */
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const p = { lat: latitude, lng: longitude };

        if (prevCoordsRef.current) {
          const d = haversineMeters(
            prevCoordsRef.current.lat,
            prevCoordsRef.current.lng,
            p.lat,
            p.lng
          );
          if (d < MIN_MOVE) return;
        }
        prevCoordsRef.current = p;
        setCoords(p);
      },
      (err) => console.error(err.message),
      { enableHighAccuracy: true, maximumAge: 30_000 }
    );

    return () => {
      if (watchIdRef.current !== null)
        navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  /* 比對距離 */
  useEffect(() => {
    if (!coords || favorites.length === 0 || nearbySpot) return;

    favorites.forEach(({ parkingSpot }) => {
      if (alertedRef.current.has(parkingSpot.id)) return;

      const dist = haversineMeters(
        coords.lat,
        coords.lng,
        parseFloat(parkingSpot.latitude),
        parseFloat(parkingSpot.longitude)
      );

      if (dist <= ALERT_RADIUS) {
        alertedRef.current.add(parkingSpot.id);
        setNearbySpot({ ...parkingSpot, distance: dist });
      }
    });
  }, [coords, favorites, nearbySpot]);

  /* ========= 3. 移除收藏 ========= */
  const removeFavoriteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/favorites/${id}`),
    onSuccess: (_d, id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      alertedRef.current.delete(id);
      toast({ title: "移除成功", description: "已從我的最愛中移除停車位" });
    },
    onError: (e) => {
      if (isUnauthorizedError(e)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => (window.location.href = "/api/login"), 500);
      } else {
        toast({
          title: "移除失敗",
          description: "請稍後再試",
          variant: "destructive",
        });
      }
    },
  });
  const handleRemoveFavorite = (id: number) => removeFavoriteMutation.mutate(id);

  /* ========= 4. UI 工具 ========= */
  const getStatusColor = (s: ParkingSpot) => {
    const r = s.availableSpaces / s.totalSpaces;
    return r > 0.5 ? "text-success" : r > 0.2 ? "text-warning" : "text-error";
  };

  const filteredFavorites = useMemo(() => {
    if (!searchTerm.trim()) return favorites;
    const key = searchTerm.toLowerCase();
    return favorites.filter(
      ({ parkingSpot }) =>
        parkingSpot.name.toLowerCase().includes(key) ||
        parkingSpot.address.toLowerCase().includes(key)
    );
  }, [favorites, searchTerm]);

  /* ========= 5. 未登入 & Skeleton ========= */
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => (window.location.href = "/api/login"), 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto p-8 animate-pulse">
          <div className="h-8 bg-gray-200 w-1/4 mb-4 rounded" />
          <div className="h-4 bg-gray-200 w-1/2 mb-8 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded shadow-sm space-y-4">
                <div className="h-6 bg-gray-200 rounded" />
                <div className="h-4 bg-gray-200 w-3/4 rounded" />
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded" />
                  <div className="h-4 bg-gray-200 rounded" />
                  <div className="h-4 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ========= 6. 主畫面 ========= */
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 標題 */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            <Heart className="h-8 w-8 text-primary mr-3 inline" />
            我的最愛
          </h2>
          <p className="text-lg text-gray-600">管理您收藏的停車位和常用路段</p>
        </div>

        {/* 搜尋 */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="relative max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜尋停車位或路段..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* 清單 */}
        {filteredFavorites.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFavorites.map(({ id, parkingSpot }) => (
              <Card key={id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {parkingSpot.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {parkingSpot.address}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFavorite(parkingSpot.id)}
                      className="text-error"
                    >
                      <Heart className="h-4 w-4 fill-current" />
                    </Button>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">總車位</span>
                      <span className="font-semibold">
                        {parkingSpot.totalSpaces}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">可用車位</span>
                      <span
                        className={`font-semibold ${getStatusColor(
                          parkingSpot
                        )}`}
                      >
                        {parkingSpot.availableSpaces}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">最後更新</span>
                      <span className="text-gray-500">
                        {new Date(
                          parkingSpot.lastUpdated || ""
                        ).toLocaleString("zh-TW")}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t flex gap-2">
                    <Button
                      className="flex-1 bg-primary hover:bg-primary/90"
                      size="sm"
                      onClick={() =>
                        window.open(
                          `https://www.google.com/maps/dir/?api=1&destination=${parseFloat(
                            parkingSpot.latitude
                          )},${parseFloat(parkingSpot.longitude)}`,
                          "_blank"
                        )
                      }
                    >
                      <NavigationIcon className="h-4 w-4 mr-1" />
                      導航
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      size="sm"
                      onClick={() => (window.location.href = "/")}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      查看
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-6" />
            <h3 className="text-xl font-semibold mb-2">
              {searchTerm ? "找不到符合的停車位" : "尚未收藏任何停車位"}
            </h3>
            <p className="text-gray-600 mb-8">
              {searchTerm
                ? "嘗試使用不同的搜尋關鍵字"
                : "開始將常用的停車位加入最愛吧！"}
            </p>
            {searchTerm ? (
              <Button variant="outline" onClick={() => setSearchTerm("")}>
                清除搜尋
              </Button>
            ) : (
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={() => (window.location.href = "/")}
              >
                <Search className="h-4 w-4 mr-2" />
                尋找停車位
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ========= 7. 靠近提示 Dialog ========= */}
      <Dialog open={!!nearbySpot} onOpenChange={() => setNearbySpot(null)}>
        <DialogContent>
          {nearbySpot && (
            <>
              <DialogHeader>
                <DialogTitle>發現附近收藏的停車格！</DialogTitle>
                <DialogDescription>
                  {nearbySpot.name} 距離您約{" "}
                  {Math.round(nearbySpot.distance)} 公尺
                </DialogDescription>
              </DialogHeader>

              <div className="text-sm text-gray-600 mb-4">
                地址：{nearbySpot.address}
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setNearbySpot(null)}
                >
                  略過
                </Button>
                <Button
                  onClick={() => {
                    window.open(
                      `https://www.google.com/maps/dir/?api=1&destination=${parseFloat(
                        nearbySpot.latitude
                      )},${parseFloat(nearbySpot.longitude)}`,
                      "_blank"
                    );
                    setNearbySpot(null);
                  }}
                >
                  <NavigationIcon className="h-4 w-4 mr-1" />
                  導航
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
