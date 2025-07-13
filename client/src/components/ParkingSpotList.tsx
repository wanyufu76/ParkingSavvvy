import { useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, MapPin, Clock, Car, Star, Navigation as NavigationIcon } from "lucide-react";
import type { ParkingSpot } from "@shared/schema";

interface FilterOptions {
  searchTerm: string;
  availabilityStatus: string;
  distanceRange: number[];
  priceRange: number[];
  amenities: string[];
  sortBy: string;
  showAvailableOnly: boolean;
}

interface ParkingSpotListProps {
  parkingSpots: ParkingSpot[];
  filters: FilterOptions;
  onSpotClick?: (spot: ParkingSpot) => void;
}

export default function ParkingSpotList({ parkingSpots, filters, onSpotClick }: ParkingSpotListProps) {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  // Add to favorites mutation
  const addFavoriteMutation = useMutation({
    mutationFn: async (parkingSpotId: number) => {
      await apiRequest("POST", "/api/favorites", { parkingSpotId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: "已加入最愛",
        description: "停車位已成功加入我的最愛",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "需要登入",
          description: "請先登入以使用此功能",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 1000);
        return;
      }
      toast({
        title: "加入失敗",
        description: "無法加入最愛，請稍後再試",
        variant: "destructive",
      });
    },
  });

  // Calculate distance (mock function - in real app would use actual coordinates)
  const calculateDistance = (spot: ParkingSpot) => {
    // Mock distance calculation based on coordinates
    const lat1 = 25.01331132918195; // Taiwan Tech
    const lng1 = 121.54056634959909;
    const lat2 = parseFloat(spot.latitude);
    const lng2 = parseFloat(spot.longitude);
    
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c);
  };

  // Mock price generation (in real app would come from database)
  const getMockPrice = (spot: ParkingSpot) => {
    const basePrice = 30;
    const hash = spot.id * 7;
    return basePrice + (hash % 50);
  };

  // Mock rating generation
  const getMockRating = (spot: ParkingSpot) => {
    const hash = spot.id * 13;
    return 3.5 + ((hash % 15) / 10);
  };

  // Filter and sort parking spots
  const filteredAndSortedSpots = useMemo(() => {
    let filtered = parkingSpots.filter(spot => {
      // Search term filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        if (!spot.name.toLowerCase().includes(searchLower) && 
            !spot.address.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Availability status filter
      const ratio = spot.availableSpaces / spot.totalSpaces;
      if (filters.availabilityStatus === 'available' && ratio <= 0.5) return false;
      if (filters.availabilityStatus === 'limited' && (ratio <= 0.2 || ratio > 0.5)) return false;
      if (filters.availabilityStatus === 'full' && ratio > 0.2) return false;

      // Show available only filter
      if (filters.showAvailableOnly && spot.availableSpaces === 0) return false;

      // Distance filter
      const distance = calculateDistance(spot);
      if (distance > filters.distanceRange[1] && filters.distanceRange[1] < 5000) return false;

      // Price filter
      const price = getMockPrice(spot);
      if (price < filters.priceRange[0] || (price > filters.priceRange[1] && filters.priceRange[1] < 200)) return false;

      return true;
    });

    // Sort filtered results
    switch (filters.sortBy) {
      case 'distance':
        filtered.sort((a, b) => calculateDistance(a) - calculateDistance(b));
        break;
      case 'availability':
        filtered.sort((a, b) => b.availableSpaces - a.availableSpaces);
        break;
      case 'price':
        filtered.sort((a, b) => getMockPrice(a) - getMockPrice(b));
        break;
      case 'rating':
        filtered.sort((a, b) => getMockRating(b) - getMockRating(a));
        break;
      case 'recent':
        filtered.sort((a, b) => b.id - a.id);
        break;
      default:
        break;
    }

    return filtered;
  }, [parkingSpots, filters]);

  const getStatusColor = (spot: ParkingSpot) => {
    const ratio = spot.availableSpaces / spot.totalSpaces;
    if (ratio > 0.5) return "success";
    if (ratio > 0.2) return "secondary";
    return "destructive";
  };

  const getStatusText = (spot: ParkingSpot) => {
    const ratio = spot.availableSpaces / spot.totalSpaces;
    if (ratio > 0.5) return "充足";
    if (ratio > 0.2) return "有限";
    return "已滿";
  };

  const handleAddToFavorites = (spot: ParkingSpot) => {
    if (!isAuthenticated) {
      toast({
        title: "需要登入",
        description: "請先登入以使用此功能",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 1000);
      return;
    }
    addFavoriteMutation.mutate(spot.id);
  };

  const handleNavigation = (spot: ParkingSpot) => {
    const lat = parseFloat(spot.latitude);
    const lng = parseFloat(spot.longitude);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  if (filteredAndSortedSpots.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Car className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">找不到符合條件的停車位</h3>
        <p className="text-gray-600">請調整篩選條件或搜尋範圍</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">
          找到 {filteredAndSortedSpots.length} 個停車位
        </h3>
        <Badge variant="secondary">
          {filters.sortBy === 'distance' && '按距離排序'}
          {filters.sortBy === 'availability' && '按空位數排序'}
          {filters.sortBy === 'price' && '按價格排序'}
          {filters.sortBy === 'rating' && '按評分排序'}
          {filters.sortBy === 'recent' && '按更新時間排序'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAndSortedSpots.map((spot) => {
          const distance = calculateDistance(spot);
          const price = getMockPrice(spot);
          const rating = getMockRating(spot);

          return (
            <Card 
              key={spot.id} 
              className="hover:shadow-md transition-shadow duration-200 cursor-pointer"
              onClick={() => onSpotClick?.(spot)}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg text-gray-900 mb-1">{spot.name}</h4>
                    <div className="flex items-center text-gray-600 text-sm mb-2">
                      <MapPin className="h-3 w-3 mr-1" />
                      {spot.address}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant={getStatusColor(spot) as any}>
                        {getStatusText(spot)}
                      </Badge>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-600">{distance}m</span>
                      <span className="text-gray-500">•</span>
                      <div className="flex items-center">
                        <Star className="h-3 w-3 text-yellow-400 mr-1" />
                        <span className="text-gray-600">{rating.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToFavorites(spot);
                    }}
                    disabled={addFavoriteMutation.isPending}
                  >
                    <Heart className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                  <div className="text-center">
                    <div className="text-gray-500">總車位</div>
                    <div className="font-semibold text-gray-900">{spot.totalSpaces}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-500">可用</div>
                    <div className="font-semibold text-green-600">{spot.availableSpaces}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-500">費率</div>
                    <div className="font-semibold text-gray-900">NT${price}/時</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNavigation(spot);
                    }}
                  >
                    <NavigationIcon className="h-3 w-3 mr-1" />
                    導航
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSpotClick?.(spot);
                    }}
                  >
                    查看詳情
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}