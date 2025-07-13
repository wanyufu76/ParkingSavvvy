import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ParkingSpot } from "@shared/schema";

interface GoogleMapProps {
  onParkingSpotClick?: (spot: ParkingSpot) => void;
}

export default function GoogleMap({ onParkingSpotClick }: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const { data: parkingSpots = [], isLoading } = useQuery({
    queryKey: ["/api/parking-spots"],
  });

  // Load Google Maps API dynamically
  useEffect(() => {
    const loadGoogleMaps = () => {
      if (typeof google !== "undefined" && google.maps) {
        setIsLoaded(true);
        return;
      }

      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        const checkInterval = setInterval(() => {
          if (typeof google !== "undefined" && google.maps) {
            setIsLoaded(true);
            clearInterval(checkInterval);
          }
        }, 100);
        return;
      }

      const script = document.createElement('script');
      script.async = true;
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places&callback=initGoogleMaps`;
      
      (window as any).initGoogleMaps = () => {
        setIsLoaded(true);
      };

      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, []);

  // Initialize map
  useEffect(() => {
    if (isLoaded && mapRef.current && !mapInstanceRef.current) {
      // 台科大正中心 (參考您提供的座標)
      const center = { lat: 25.01331132918195, lng: 121.54056634959909 };
      
      // 設定台科大區域邊界 (參考您提供的範圍)
      const allowedBounds = {
        north: 25.0185,
        south: 25.0085,
        east: 121.5455,
        west: 121.5330
      };

      const map = new google.maps.Map(mapRef.current, {
        zoom: 18,
        center: center,
        mapTypeId: "roadmap",
        restriction: {
          latLngBounds: allowedBounds,
          strictBounds: true,
        },
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ],
      });

      mapInstanceRef.current = map;

      // 放一個標記在台科大正門附近
      new google.maps.Marker({
        position: center,
        map,
        title: "台灣科技大學",
        icon: {
          url: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="18" fill="#0891b2" stroke="#fff" stroke-width="2"/>
              <text x="20" y="26" text-anchor="middle" fill="white" font-size="14" font-weight="bold">台科大</text>
            </svg>
          `),
          scaledSize: new google.maps.Size(40, 40),
        },
      });
    }
  }, [isLoaded]);

  // Add parking spot markers
  useEffect(() => {
    if (isLoaded && mapInstanceRef.current && parkingSpots.length > 0) {
      // Clear existing parking spot markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      
      parkingSpots.forEach((spot: ParkingSpot) => {
        const lat = parseFloat(spot.latitude);
        const lng = parseFloat(spot.longitude);
        
        const availabilityRatio = spot.availableSpaces / spot.totalSpaces;
        let color = "#dc2626"; // red for full
        if (availabilityRatio > 0.5) color = "#059669"; // green for plenty
        else if (availabilityRatio > 0.2) color = "#d97706"; // orange for limited

        const marker = new google.maps.Marker({
          position: { lat, lng },
          map: mapInstanceRef.current,
          title: spot.name,
          icon: {
            url: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="14" fill="${color}" stroke="#fff" stroke-width="2"/>
                <text x="16" y="21" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${spot.availableSpaces}</text>
              </svg>
            `),
            scaledSize: new google.maps.Size(32, 32),
          },
        });

        markersRef.current.push(marker);

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 12px; min-width: 250px;">
              <h3 style="font-weight: 600; font-size: 16px; margin-bottom: 8px; color: #111827;">${spot.name}</h3>
              <p style="color: #6b7280; font-size: 14px; margin-bottom: 12px;">${spot.address}</p>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 14px; margin-bottom: 12px;">
                <div>總車位: <span style="font-weight: 600;">${spot.totalSpaces}</span></div>
                <div>可用: <span style="font-weight: 600; color: ${color};">${spot.availableSpaces}</span></div>
              </div>
              <button 
                onclick="window.addToFavorites && window.addToFavorites(${spot.id})"
                style="background-color: #0891b2; color: white; padding: 6px 12px; border-radius: 4px; font-size: 12px; border: none; cursor: pointer;"
                onmouseover="this.style.backgroundColor='#0e7490'"
                onmouseout="this.style.backgroundColor='#0891b2'"
              >
                加入最愛
              </button>
            </div>
          `,
        });

        marker.addListener("click", () => {
          infoWindow.open(mapInstanceRef.current, marker);
          onParkingSpotClick?.(spot);
        });
      });
    }
  }, [isLoaded, parkingSpots, onParkingSpotClick]);

  if (isLoading) {
    return (
      <div className="h-96 lg:h-[600px] bg-gray-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-gray-600">載入地圖中...</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-96 lg:h-[600px] bg-gray-200 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Google Maps 載入中...</p>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} className="h-96 lg:h-[600px] w-full" />;
}
