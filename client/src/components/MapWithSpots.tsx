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
  };

  return <div ref={mapRef} className="w-full h-full" />;
}
