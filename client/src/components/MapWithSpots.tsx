import { useEffect, useRef } from "react";
import type { ParkingSpot } from "@shared/schema";

interface Props {
  onSpotClick?: (spot: ParkingSpot) => void;
}

export default function MapWithSpots({ onSpotClick }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scriptId = "gmaps-api";
    if (!document.getElementById(scriptId)) {
      const s = document.createElement("script");
      s.id = scriptId;
      s.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`;
      s.async = true;
      s.defer = true;
      document.body.appendChild(s);
      s.onload = initMap;
    } else {
      initMap();
    }
  }, []);

  const initMap = async () => {
    if (!(window as any).google || !mapRef.current) return;

    const g = (window as any).google;
    const center = { lat: 25.0136, lng: 121.5408 };
    const map = new g.maps.Map(mapRef.current, {
      center,
      zoom: 16,
      streetViewControl: true,
      mapTypeControl: false,
    });

    const res = await fetch("/api/parking-spots");
    const spots: ParkingSpot[] = await res.json();

    let isZoomed = false;
    let drawnRects: google.maps.Polygon[] = [];
    let labels: google.maps.Marker[] = [];

    // ✅ 假設這些是框框資料，手動對應到 spot.id 或其他欄位
    const boxMappings = [
      {
        spotName: "全家外停車格",
        point: { lat: 25.011824, lng: 121.540574 },
        iconUrl: "https://cdn-icons-png.flaticon.com/512/608/608690.png",
        rects: [
          [
            { lat: 25.011927, lng: 121.540503 },
            { lat: 25.011957, lng: 121.540543 },
            { lat: 25.011899, lng: 121.540588 },
            { lat: 25.011869, lng: 121.540548 },
          ],
          [
            { lat: 25.011832, lng: 121.540578 },
            { lat: 25.011862, lng: 121.540618 },
            { lat: 25.011803, lng: 121.540663 },
            { lat: 25.011773, lng: 121.540622 },
          ],
          [
            { lat: 25.011743, lng: 121.540651 },
            { lat: 25.011773, lng: 121.540690 },
            { lat: 25.011713, lng: 121.540736 },
            { lat: 25.011683, lng: 121.540695 },
          ],
        ],
        labelCenters: [
          { lat: 25.01196, lng: 121.54057 },
          { lat: 25.011865, lng: 121.540655 },
          { lat: 25.011775, lng: 121.54074 },
        ],
      },
    ];

    for (const mapping of boxMappings) {
      const matchedSpot = spots.find((s) => s.name === mapping.spotName);

      const marker = new g.maps.Marker({
        position: mapping.point,
        map,
        title: mapping.spotName,
        icon: {
          url: mapping.iconUrl,
          scaledSize: new g.maps.Size(36, 36),
        },
      });

      marker.addListener("click", () => {
        if (!isZoomed) {
          map.setZoom(21);
          map.setCenter(mapping.point);

          mapping.rects.forEach((path, i) => {
            const rect = new g.maps.Polygon({
              paths: path,
              strokeColor: "#1E90FF",
              strokeOpacity: 0.9,
              strokeWeight: 3,
              fillColor: "#87CEFA",
              fillOpacity: 0.6,
              map,
            });
            drawnRects.push(rect);

            const label = new g.maps.Marker({
              position: mapping.labelCenters[i],
              map,
              label: {
                text: `${i + 1}`,
                color: "white",
                fontSize: "14px",
                fontWeight: "bold",
              },
              icon: {
                path: g.maps.SymbolPath.CIRCLE,
                scale: 14,
                fillColor: "#1E90FF",
                fillOpacity: 1,
                strokeWeight: 0,
              },
            });
            labels.push(label);
          });

          isZoomed = true;

          if (matchedSpot) {
            onSpotClick?.(matchedSpot);
          }
        } else {
          map.setZoom(16);
          map.setCenter(center);
          drawnRects.forEach((r) => r.setMap(null));
          labels.forEach((l) => l.setMap(null));
          drawnRects = [];
          labels = [];
          isZoomed = false;
        }
      });
    }
  };

  return <div ref={mapRef} className="w-full h-full" />;
}
