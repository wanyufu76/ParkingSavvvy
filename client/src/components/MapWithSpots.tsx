import { useEffect, useRef } from "react";
import type { ParkingSpot } from "@shared/schema";

interface Props {
  onSpotClick?: (spot: ParkingSpot) => void;
}

/** Google Map + 標記 + 模擬俯衝 Pegman 效果 */
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

    const streetViewPanorama = new g.maps.StreetViewPanorama(mapRef.current, {
      position: center,
      pov: { heading: 0, pitch: 0 },
      visible: false,
    });

    map.setStreetView(streetViewPanorama);

    const res = await fetch("/api/parking-spots");
    const spots: ParkingSpot[] = await res.json();

    const svService = new g.maps.StreetViewService();

    spots.forEach((spot) => {
      const lat = parseFloat(spot.latitude);
      const lng = parseFloat(spot.longitude);

      const marker = new g.maps.Marker({
        map,
        position: { lat, lng },
        title: spot.name,
      });

      marker.addListener("click", () => {
        onSpotClick?.(spot);

        svService.getPanorama({ location: { lat, lng }, radius: 50 }, (data: any, status: any) => {
          if (status === g.maps.StreetViewStatus.OK) {
            streetViewPanorama.setPosition(data.location.latLng);
            streetViewPanorama.setPov({
              heading: 180,
              pitch: -10,
              zoom: 1,
            });
            streetViewPanorama.setVisible(true);
          } else {
            alert("這個地點沒有街景資料。");
          }
        });
      });
    });

  const myPoint = { lat: 25.011824, lng: 121.540574 };
  const myMarker = new g.maps.Marker({
    position: myPoint,
    map,
    title: "全家外室外停車格",
    icon: {
      url: "https://cdn-icons-png.flaticon.com/512/608/608690.png",
      scaledSize: new g.maps.Size(36, 36),
    },
  });
let isZoomed = false;
let drawnLines: google.maps.Polyline[] = [];

myMarker.addListener("click", () => {
  if (!isZoomed) {
    map.setZoom(21);
    map.setCenter(myPoint);

    const lines = [
      //右
      [
        { lat: 25.011743, lng: 121.540651 },
        { lat: 25.011773, lng: 121.540690 },
      ],
      [
        { lat: 25.011773, lng: 121.540690 },
        { lat: 25.011713, lng: 121.540736 },
      ],
      [
        { lat: 25.011713, lng: 121.540736 },
        { lat: 25.011683, lng: 121.540695 },
      ],
      //中
      [
        { lat: 25.011832, lng: 121.540578 },
        { lat: 25.011862, lng: 121.540618 },
      ],
      [
        { lat: 25.011862, lng: 121.540618 },
        { lat: 25.011803, lng: 121.540663 },
      ],
      [
        { lat: 25.011803, lng: 121.540663 },
        { lat: 25.011773, lng: 121.540622 },
      ],
      //左
      [
        { lat: 25.011927, lng: 121.540503 },
        { lat: 25.011957, lng: 121.540543 },
      ],
      [
        { lat: 25.011957, lng: 121.540543 },
        { lat: 25.011899, lng: 121.540588 },
      ],
      [
        { lat: 25.011899, lng: 121.540588 },
        { lat: 25.011869, lng: 121.540548 },
      ],

    ];

    lines.forEach((path) => {
      const line = new g.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: "#ff0000ff",
        strokeOpacity: 0.8,
        strokeWeight: 8,
        map: map,
      });
      drawnLines.push(line); // 記錄這條線
    });

    isZoomed = true;
  } else {
    // 還原地圖與清除紅線
    map.setZoom(16);
    map.setCenter({ lat: 25.0136, lng: 121.5408 });

    drawnLines.forEach((line) => line.setMap(null)); // 移除紅線
    drawnLines = []; // 清空紀錄
    isZoomed = false;
  }
});
  };

  return <div ref={mapRef} className="w-full h-full" />;
}
