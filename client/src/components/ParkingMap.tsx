import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ParkingSpot } from "@shared/schema";

interface ParkingMapProps {
  onParkingSpotClick?: (spot: ParkingSpot) => void;
}

export default function ParkingMap({ onParkingSpotClick }: ParkingMapProps) {
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
        scale: 10,
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
          <div style="padding: 12px; min-width: 220px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
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
            
            <div style="text-align: center; margin-top: 12px;">
              <button onclick="window.openNavigation('${spot.latitude}', '${spot.longitude}')" 
                style="background: #3b82f6; color: white; border: none; padding: 6px 16px; border-radius: 6px; font-size: 12px; cursor: pointer;">
                導航
              </button>
            </div>
          </div>
        `
      });

      // 點擊標記時的事件
      marker.addListener('click', () => {
        // 關閉其他開啟的資訊視窗
        if ((window as any).currentInfoWindow) {
          (window as any).currentInfoWindow.close();
        }
        
        infoWindow.open(mapInstance, marker);
        (window as any).currentInfoWindow = infoWindow;
        
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

    // 添加導航功能到全域
    (window as any).openNavigation = (lat: string, lng: string) => {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      window.open(url, '_blank');
    };

    const initMap = () => {
      try {
        if (!mapRef.current) {
          console.error("Map container not found");
          return;
        }
        
        if (!(window as any).google?.maps) {
          console.error("Google Maps API not loaded");
          return;
        }

        console.log("Initializing map...");
        const taiwanTechCoords = { lat: 25.01331132918195, lng: 121.54056634959909 };

        const mapInstance = new (window as any).google.maps.Map(mapRef.current, {
          zoom: 16,
          center: taiwanTechCoords,
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

        console.log("Map instance created successfully");
        setMap(mapInstance);

        // 搜尋框功能 - 使用Places API
        const searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "搜尋地點...";
        searchInput.style.cssText = `
          box-sizing: border-box;
          border: 1px solid #d1d5db;
          width: 280px;
          height: 40px;
          padding: 0 16px;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          font-size: 14px;
          outline: none;
          background-color: white;
          margin: 10px;
        `;

        const searchContainer = document.createElement("div");
        searchContainer.style.cssText = `
          position: absolute;
          top: 60px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
        `;
        searchContainer.appendChild(searchInput);
        mapRef.current.appendChild(searchContainer);

        // 初始化Places SearchBox
        if ((window as any).google.maps.places) {
          const searchBox = new (window as any).google.maps.places.SearchBox(searchInput);
          
          // 設定搜尋範圍偏向台科大附近
          mapInstance.addListener("bounds_changed", () => {
            searchBox.setBounds(mapInstance.getBounds());
          });
          
          searchBox.addListener("places_changed", () => {
            const places = searchBox.getPlaces();
            if (!places || places.length === 0) return;

            const bounds = new (window as any).google.maps.LatLngBounds();
            places.forEach((place: any) => {
              if (!place.geometry || !place.geometry.location) return;

              // 創建搜尋結果標記
              new (window as any).google.maps.Marker({
                position: place.geometry.location,
                map: mapInstance,
                title: place.name,
                icon: {
                  url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#3b82f6">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                  `),
                  scaledSize: new (window as any).google.maps.Size(32, 32),
                },
              });

              if (place.geometry.viewport) {
                bounds.union(place.geometry.viewport);
              } else {
                bounds.extend(place.geometry.location);
              }
            });
            mapInstance.fitBounds(bounds);
          });
        }

        if (mounted) {
          setIsLoaded(true);
          console.log("Parking map initialized successfully");
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

      // 檢查是否已存在script
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
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
      script.onload = () => {
        console.log("Google Maps API loaded with Places library");
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
      <div className="h-[600px] flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center">
          <p className="text-red-600 mb-2">{error}</p>
          <p className="text-sm text-gray-500">請檢查網路連線或聯繫系統管理員</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={mapRef}
        className="h-[600px] w-full rounded-lg shadow-md"
        style={{ minHeight: "600px" }}
      />
      
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-gray-600">載入地圖中...</p>
          </div>
        </div>
      )}

      {/* 圖例 */}
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
    </div>
  );
}