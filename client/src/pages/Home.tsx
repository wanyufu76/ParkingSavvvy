import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import SimpleGoogleMap from "@/components/SimpleGoogleMap";
import ParkingFilters from "@/components/ParkingFilters";
import ParkingSpotList from "@/components/ParkingSpotList";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Map, List } from "lucide-react";
import type { ParkingSpot } from "@shared/schema";

export default function Home() {
  const { toast } = useToast();
  const { data: parkingSpots = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/parking-spots"],
  });

  // 處理OAuth登入結果
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const loginStatus = urlParams.get('login');
    const error = urlParams.get('error');

    if (loginStatus === 'success') {
      toast({
        title: "登入成功",
        description: "歡迎使用智能停車系統！",
        variant: "default",
      });
      // 清除URL參數
      window.history.replaceState({}, '', '/');
    } else if (error) {
      let errorMessage = "登入時發生錯誤";
      switch (error) {
        case 'login_failed':
          errorMessage = "登入失敗，請重試";
          break;
        case 'token_failed':
          errorMessage = "驗證失敗，請重新登入";
          break;
        case 'missing_code':
          errorMessage = "授權碼遺失，請重新登入";
          break;
        default:
          errorMessage = `登入錯誤：${error}`;
      }
      toast({
        title: "登入失敗",
        description: errorMessage,
        variant: "destructive",
      });
      // 清除URL參數
      window.history.replaceState({}, '', '/');
    }
  }, [toast]);

  const [activeTab, setActiveTab] = useState("map");
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

  const handleClearFilters = () => {
    setFilters({
      searchTerm: "",
      availabilityStatus: "all",
      distanceRange: [0, 5000],
      priceRange: [10, 200],
      amenities: [] as string[],
      sortBy: "distance",
      showAvailableOnly: false,
    });
  };

  const handleSpotClick = (spot: ParkingSpot) => {
    setSelectedSpot(spot);
    setActiveTab("map");
  };

  const totalSpaces = (parkingSpots as ParkingSpot[]).reduce((sum: number, spot: ParkingSpot) => sum + spot.totalSpaces, 0);
  const availableSpaces = (parkingSpots as ParkingSpot[]).reduce((sum: number, spot: ParkingSpot) => sum + spot.availableSpaces, 0);
  const occupiedSpaces = totalSpaces - availableSpaces;
  const limitedSpaces = (parkingSpots as ParkingSpot[]).filter((spot: ParkingSpot) => {
    const ratio = spot.availableSpaces / spot.totalSpaces;
    return ratio > 0.2 && ratio <= 0.5;
  }).reduce((sum: number, spot: ParkingSpot) => sum + spot.availableSpaces, 0);

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary to-secondary text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-4">智慧停車位檢測系統</h2>
          <p className="text-xl text-cyan-100 mb-8">透過AI技術，即時掌握台科大周邊停車位狀況</p>
          <div className="flex justify-center items-center space-x-6">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-success rounded-full mr-2"></div>
              <span>空位</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-warning rounded-full mr-2"></div>
              <span>有限</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-error rounded-full mr-2"></div>
              <span>已滿</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <ParkingFilters 
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={handleClearFilters}
        />

        {/* View Toggle Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-between items-center mb-4">
            <TabsList className="grid w-[300px] grid-cols-2">
              <TabsTrigger value="map" className="flex items-center gap-2">
                <Map className="h-4 w-4" />
                地圖檢視
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                列表檢視
              </TabsTrigger>
            </TabsList>

            {/* Summary Stats */}
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span>總車位:</span>
                <span className="font-semibold text-primary">{totalSpaces}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>可用:</span>
                <span className="font-semibold text-success">{availableSpaces}</span>
              </div>
              <Button 
                onClick={handleRefresh} 
                variant="outline"
                size="sm"
                disabled={isLoading}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                更新
              </Button>
            </div>
          </div>

          <TabsContent value="map" className="space-y-0">
            <div className="relative">
              {/* Map Stats Card - positioned over map */}
              {selectedSpot && (
                <div className="absolute top-4 right-4 z-10">
                  <Card className="max-w-sm">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-gray-800 mb-2">{selectedSpot.name}</h3>
                      <p className="text-sm text-gray-600 mb-3">{selectedSpot.address}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>總車位: <span className="font-semibold">{selectedSpot.totalSpaces}</span></div>
                        <div>可用: <span className="font-semibold text-success">{selectedSpot.availableSpaces}</span></div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              <SimpleGoogleMap onParkingSpotClick={handleSpotClick} />
            </div>
          </TabsContent>

          <TabsContent value="list" className="space-y-0">
            <ParkingSpotList 
              parkingSpots={parkingSpots as ParkingSpot[]}
              filters={filters}
              onSpotClick={handleSpotClick}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
