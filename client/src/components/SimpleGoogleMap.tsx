import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ParkingSpot } from "@shared/schema";

interface GoogleMapProps {
  onParkingSpotClick?: (spot: ParkingSpot) => void;
}

export default function SimpleGoogleMap({ onParkingSpotClick }: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);

  // 獲取停車位資料
  const { data: parkingSpots = [] } = useQuery<ParkingSpot[]>({
    queryKey: ["/api/parking-spots"],
  });

  // 清除舊標記
  const clearMarkers = () => {
    markers.forEach(marker => marker.setMap(null));
    setMarkers([]);
  };

  // 創建停車位標記
  const createParkingMarkers = (mapInstance: google.maps.Map, spots: ParkingSpot[]) => {
    clearMarkers();
    
    const newMarkers: google.maps.Marker[] = [];

    spots.forEach((spot) => {
      if (!spot.latitude || !spot.longitude) return;

      const lat = parseFloat(spot.latitude);
      const lng = parseFloat(spot.longitude);
      
      if (isNaN(lat) || isNaN(lng)) return;

      // 根據可用車位設定標記顏色
      const availabilityRatio = spot.availableSpaces / spot.totalSpaces;
      let iconColor = '#dc2626'; // 紅色 (已滿)
      let status = '已滿';
      
      if (availabilityRatio > 0.5) {
        iconColor = '#16a34a'; // 綠色 (空位充足)
        status = '空位充足';
      } else if (availabilityRatio > 0.2) {
        iconColor = '#eab308'; // 黃色 (有限空位)
        status = '有限空位';
      }

      // 創建自定義標記圖標
      const markerIcon = {
        path: (window as any).google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: iconColor,
        fillOpacity: 0.9,
        strokeWeight: 3,
        strokeColor: '#ffffff',
      };

      const marker = new (window as any).google.maps.Marker({
        position: { lat, lng },
        map: mapInstance,
        icon: markerIcon,
        title: spot.name,
        animation: (window as any).google.maps.Animation.DROP,
      });

      // 創建資訊視窗
      const infoWindow = new (window as any).google.maps.InfoWindow({
        content: `
          <div style="padding: 12px; min-width: 250px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1f2937;">${spot.name}</h3>
            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px; line-height: 1.4;">${spot.address}</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 12px 0; padding: 8px; background: #f9fafb; border-radius: 6px;">
              <div style="text-align: center;">
                <div style="font-size: 12px; color: #6b7280; margin-bottom: 2px;">總車位</div>
                <div style="font-size: 18px; font-weight: 600; color: #1f2937;">${spot.totalSpaces}</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 12px; color: #6b7280; margin-bottom: 2px;">可用</div>
                <div style="font-size: 18px; font-weight: 600; color: ${iconColor};">${spot.availableSpaces}</div>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 12px;">
              <span style="background: ${iconColor}; color: white; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500;">${status}</span>
            </div>
            
            <div style="display: flex; gap: 8px; margin-top: 12px;">
              <button onclick="window.openGoogleEarth('${spot.latitude}', '${spot.longitude}', '${spot.name}')" 
                style="flex: 1; background: #059669; color: white; border: none; padding: 8px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 500;">
                🌍 Google Earth
              </button>
              <button onclick="window.openNavigation('${spot.latitude}', '${spot.longitude}')" 
                style="flex: 1; background: #3b82f6; color: white; border: none; padding: 8px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 500;">
                🗺️ 導航
              </button>
            </div>
          </div>
        `
      });

      // 點擊標記時的事件 - Google Earth俯衝視角
      marker.addListener("click", () => {
        const lat = spot.latitude;
        const lng = spot.longitude;

        // 使用KML參考的相機視角參數：altitude=500, tilt=75
        // Google Earth URL格式：經緯度,高度a,距離d,航向y,傾斜h,俯仰t,翻滾r
        const earthUrl = `https://earth.google.com/web/@${lat},${lng},500a,1000d,0y,0h,75t,0r`;
        window.open(earthUrl, "_blank");

        // 保留原本點擊事件
        if (onParkingSpotClick) {
          onParkingSpotClick(spot);
        }
      });

      newMarkers.push(marker);
    });

    setMarkers(newMarkers);
  };

  // 當停車位資料更新時，重新創建標記
  useEffect(() => {
    if (map && parkingSpots.length > 0) {
      createParkingMarkers(map, parkingSpots);
    }
  }, [map, parkingSpots]);

  useEffect(() => {
    let mounted = true;

    const initMap = () => {
      if (!mapRef.current || !mounted) return;

      try {
        const map = new (window as any).google.maps.Map(mapRef.current, {
          center: { lat: 25.01331132918195, lng: 121.54056634959909 },
          zoom: 16,
          mapTypeId: (window as any).google.maps.MapTypeId.ROADMAP,
          restriction: {
            latLngBounds: {
              north: 25.02,
              south: 25.005,
              east: 121.55,
              west: 121.53,
            },
            strictBounds: false,
          },
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "on" }],
            },
            {
              featureType: "transit",
              elementType: "labels",
              stylers: [{ visibility: "simplified" }],
            },
          ],
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
        });

        setMap(map);

        // 地圖已成功載入，專注於顯示停車位
        console.log("Map ready for parking spots display");
        
        // 全域函數：Google Earth街景跳轉（小黃人降落動畫）
        (window as any).openGoogleEarth = (lat: string, lng: string, name: string) => {
          console.log(`Opening Google Earth for ${name} at ${lat}, ${lng}`);
          
          // 使用您提供的Google Earth URL格式：高度100a，距離500d，傾斜60y，俯仰45t
          const makeEarthUrl = (lat: number, lng: number) => {
            return `https://earth.google.com/web/@${lat},${lng},100a,500d,60y,0h,45t,0r`;
          };
          
          try {
            // 第一步：打開Google Earth並定位到停車場上空
            const earthUrl = makeEarthUrl(parseFloat(lat), parseFloat(lng));
            const earthWindow = window.open(earthUrl, '_blank', 'width=1200,height=800');
            
            if (!earthWindow) {
              console.log("Popup blocked, trying alternative method");
              // 備用方案：使用當前視窗直接跳轉
              window.open(earthUrl, '_blank');
              return;
            }
            
            console.log("Google Earth window opened with optimized view parameters");
            
            // 等待3秒讓Earth載入並展示3D視角，然後自動切換到街景
            setTimeout(() => {
              if (earthWindow && !earthWindow.closed) {
                console.log("Switching to Street View mode with person drop animation");
                // 跳轉到Google Maps街景，會自動丟下小黃人
                const streetViewUrl = `https://www.google.com/maps/@${lat},${lng},3a,75y,0h,90t/data=!3m6!1e1!3m4!1s0x0:0x0!2e0!7i13312!8i6656`;
                earthWindow.location.href = streetViewUrl;
              }
            }, 3000);
            
            // 5秒後如果還在Earth頁面，強制切換到街景
            setTimeout(() => {
              if (earthWindow && !earthWindow.closed) {
                console.log("Force switching to Street View");
                const fallbackUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
                earthWindow.location.href = fallbackUrl;
              }
            }, 5000);
            
          } catch (error) {
            console.error("Error opening Google Earth:", error);
            // 最終備用方案：直接打開街景
            const streetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
            window.open(streetViewUrl, '_blank');
          }
        };

        // 全域函數：導航功能
        (window as any).openNavigation = (lat: string, lng: string) => {
          const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
          window.open(url, '_blank');
        };

        if (mounted) {
          setIsLoaded(true);
          console.log("Map initialized successfully");
        }
      } catch (err) {
        console.error("Map initialization error:", err);
        if (mounted) {
          setError("地圖初始化失敗");
        }
      }
    };

    const loadGoogleMaps = () => {
      if ((window as any).google && (window as any).google.maps) {
        initMap();
        return;
      }

      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        setError("Google Maps API 密鑰缺失");
        return;
      }

      // Check if script already exists
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        const checkGoogleMaps = () => {
          if ((window as any).google && (window as any).google.maps) {
            initMap();
          } else {
            setTimeout(checkGoogleMaps, 100);
          }
        };
        checkGoogleMaps();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.onload = () => {
        console.log("Google Maps API loaded");
        initMap();
      };
      script.onerror = () => {
        console.error("Failed to load Google Maps API");
        if (mounted) {
          setError("無法載入 Google Maps API");
        }
      };
      document.head.appendChild(script);
    };

    loadGoogleMaps();

    return () => {
      mounted = false;
      clearMarkers();
    };
  }, []);

  if (error) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center text-red-600">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] relative">
      {/* Search Box */}
      <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-20">
        <input
          id="map-search-input"
          type="text"
          placeholder="搜尋地點..."
          className="w-80 px-4 py-2 border rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
        />
      </div>
      
      <div 
        ref={mapRef} 
        className="w-full h-full rounded-lg"
      />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mx-auto mb-2"></div>
            <p className="text-gray-600">載入地圖中...</p>
          </div>
        </div>
      )}

      {/* 停車位狀態圖例 */}
      <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-md">
        <h4 className="text-sm font-semibold mb-2">停車位狀態</h4>
        <div className="space-y-1">
          <div className="flex items-center text-sm">
            <div className="w-3 h-3 bg-green-600 rounded-full mr-2"></div>
            <span>空位充足 (50%+)</span>
          </div>
          <div className="flex items-center text-sm">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
            <span>有限空位 (20-50%)</span>
          </div>
          <div className="flex items-center text-sm">
            <div className="w-3 h-3 bg-red-600 rounded-full mr-2"></div>
            <span>已滿 (0-20%)</span>
          </div>
        </div>
      </div>

      {/* 功能說明 */}
      <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-md max-w-xs">
        <div className="text-sm text-gray-600">
          <p className="font-semibold mb-1">🌍 Google Earth: 3D衛星視角</p>
          <p className="font-semibold">🗺️ 導航: 開啟Google地圖導航</p>
        </div>
      </div>
    </div>
  );
}