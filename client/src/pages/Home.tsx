import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

/* ---------- 新增元件 ---------- */
import MapWithSpots from "@/components/MapWithSpots";
import SpotDetailDrawer from "@/components/SpotDetailDrawer";

import ParkingFilters from "@/components/ParkingFilters";
import ParkingSpotList from "@/components/ParkingSpotList";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { RefreshCw, Map, List } from "lucide-react";
import type { ParkingSpot } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function Home() {
  /* ---------- Toast & 取得停車格 ---------- */
  const { toast } = useToast();
  const {
    data: parkingSpots = [],
    isLoading,
    refetch,
  } = useQuery<ParkingSpot[]>({
    queryKey: ["/api/parking-spots"],
  });

  /* ---------- OAuth 登入結果處理 ---------- */
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const loginOK = p.get("login") === "success";
    const err = p.get("error");

    if (loginOK) {
      toast({ title: "登入成功", description: "歡迎使用智慧停車！" });
    } else if (err) {
      const dict: Record<string, string> = {
        login_failed: "登入失敗，請重試",
        token_failed: "驗證失敗，請重新登入",
        missing_code: "授權碼遺失，請重新登入",
      };
      toast({
        title: "登入失敗",
        description: dict[err] ?? `登入錯誤：${err}`,
        variant: "destructive",
      });
    }
    if (loginOK || err) history.replaceState({}, "", "/");
  }, [toast]);

  /* ---------- 狀態 ---------- */
  const [activeTab, setActiveTab] = useState<"map" | "list">("map");
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);
  const [filters, setFilters] = useState({
    searchTerm: "",
    availabilityStatus: "all",
    distanceRange: [0, 5000],
    priceRange: [10, 200],
    amenities: [] as string[],
    sortBy: "distance",
    showAvailableOnly: false,
  });

  const handleClearFilters = () =>
    setFilters((f) => ({
      ...f,
      searchTerm: "",
      availabilityStatus: "all",
      distanceRange: [0, 5000],
      priceRange: [10, 200],
      amenities: [],
      sortBy: "distance",
      showAvailableOnly: false,
    }));

  const handleSpotClick = (s: ParkingSpot) => {
    setSelectedSpot(s);      // 打開 Drawer
    setActiveTab("map");     // 切回地圖
  };

  const totalSpaces = parkingSpots.reduce((t, s) => t + s.totalSpaces, 0);
  const availableSpaces = parkingSpots.reduce(
    (t, s) => t + s.availableSpaces,
    0,
  );

  /* ---------- 版面 ---------- */
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      {/* Hero */}
      <section className="bg-gradient-to-r from-primary to-secondary text-white py-12 text-center">
        <h2 className="text-4xl font-bold mb-3">智慧停車位檢測系統</h2>
        <p className="text-lg text-cyan-100 mb-6">
          透過 AI 即時掌握台科大周邊停車位狀況
        </p>
      </section>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <ParkingFilters
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={handleClearFilters}
        />

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          {/* 切換 Map / List */}
          <div className="flex justify-between items-center mb-4">
            <TabsList className="grid w-[240px] grid-cols-2">
              <TabsTrigger value="map" className="flex items-center gap-1">
                <Map className="h-4 w-4" /> 地圖
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-1">
                <List className="h-4 w-4" /> 列表
              </TabsTrigger>
            </TabsList>

            {/* 總覽 + 手動刷新 */}
            <div className="flex items-center gap-4 text-sm text-gray-700">
              <span>
                總車位 <b>{totalSpaces}</b>
              </span>
              <span>
                可用 <b className="text-success">{availableSpaces}</b>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw
                  className={`h-3 w-3 mr-1 ${isLoading ? "animate-spin" : ""}`}
                />
                更新
              </Button>
            </div>
          </div>

          {/* 地圖視圖 */}
          <TabsContent value="map">
            <div className="h-[70vh] rounded-lg overflow-hidden">
              <MapWithSpots onSpotClick={handleSpotClick} />
            </div>
          </TabsContent>

          {/* 列表視圖 */}
          <TabsContent value="list">
            <ParkingSpotList
              parkingSpots={parkingSpots}
              filters={filters}
              onSpotClick={handleSpotClick}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* 👉 側邊詳情 Drawer */}
      <SpotDetailDrawer
        spot={selectedSpot}
        onClose={() => setSelectedSpot(null)}
      />
    </div>
  );
}
