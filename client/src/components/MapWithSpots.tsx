import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import type { ParkingSpot } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

const socket = io();

interface Props {
  onSpotClick?: (spot: ParkingSpot & { subSpots: SubSpot[] }) => void;
}

interface SubSpot {
  id: string;
  name: string;
  labelPosition: google.maps.LatLngLiteral;
  streetViewPosition: google.maps.LatLngLiteral;
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
  const center = { lat: 25.0135, lng: 121.542041 };
  const map = new g.maps.Map(mapRef.current, {
    center,
    zoom: 17,
    streetViewControl: true,
    mapTypeControl: false,
    scaleControl: true,
    zoomControl: true,
  });
  (window as any).dbgMap = map;   // ← 只在開發環境加

  console.log("✅ 地圖初始化完成");

  const res = await fetch("/api/parking-spots");
  const spots: ParkingSpot[] = await res.json();
  console.log("✅ 停車場資料載入:", spots);

  let isZoomed = false;
  let drawnRects: google.maps.Polygon[] = [];
  let labels: google.maps.Marker[] = [];
  let redPointMarkers: google.maps.Marker[] = [];

  const boxMappings = [
  {
    spotName: "基隆路四段73巷路邊停車格A",
    point: { lat: 25.011824, lng: 121.540574 },
    iconUrl: "https://cdn-icons-png.flaticon.com/512/608/608690.png",
    rects: [
      {
        name: "A01",
        coords: [
          { lat: 25.011927, lng: 121.540503 },
          { lat: 25.011957, lng: 121.540543 },
          { lat: 25.011899, lng: 121.540588 },
          { lat: 25.011869, lng: 121.540548 },
        ],
        label: { lat: 25.01196, lng: 121.54057 },
        pano: { lat: 25.01193, lng: 121.54055 },
      },
      {
        name: "A02",
        coords: [
          { lat: 25.011832, lng: 121.540578 },
          { lat: 25.011862, lng: 121.540618 },
          { lat: 25.011803, lng: 121.540663 },
          { lat: 25.011773, lng: 121.540622 },
        ],
        label: { lat: 25.011865, lng: 121.540655 },
        pano: { lat: 25.01183, lng: 121.54063 },
      },
      {
        name: "A03",
        coords: [
          { lat: 25.011743, lng: 121.540651 },
          { lat: 25.011773, lng: 121.540690 },
          { lat: 25.011713, lng: 121.540736 },
          { lat: 25.011683, lng: 121.540695 },
        ],
        label: { lat: 25.011775, lng: 121.54074 },
        pano: { lat: 25.01174, lng: 121.54071 },
      },
    ],
  },
  {
    spotName: "基隆路四段73巷路邊停車格B",
    point: { lat: 25.012143, lng: 121.540345 },
    iconUrl: "https://cdn-icons-png.flaticon.com/512/608/608690.png",
    rects: [
      {
        name: "B01",
        coords: [
          { lat: 25.012332, lng: 121.540246 },
          { lat: 25.012273, lng: 121.540296 },
          { lat: 25.012243, lng: 121.540254 },
          { lat: 25.012303, lng: 121.540204 },
        ],
        label: { lat: 25.012310, lng: 121.540291 },
        pano: { lat: 25.012287, lng: 121.540247 },
      },
      {
        name: "B02",
        coords: [
          { lat: 25.012252, lng: 121.540317 },
          { lat: 25.012190, lng: 121.540368 },
          { lat: 25.012159, lng: 121.540322 },
          { lat: 25.012222, lng: 121.540272 },
        ],
        label: { lat: 25.012229, lng: 121.540358 },
        pano: { lat: 25.012204, lng: 121.540321 },
      },
      {
        name: "B03",
        coords: [
          { lat: 25.012165, lng: 121.540382 },
          { lat: 25.012102, lng: 121.540438 },
          { lat: 25.012072, lng: 121.540392 },
          { lat: 25.012136, lng: 121.540340 },
        ],
        label: { lat: 25.012126, lng: 121.540439 },
        pano: { lat: 25.012100, lng: 121.540394 },
      },
      {
        name: "B04",
        coords: [
          { lat: 25.012079, lng: 121.540458 },
          { lat: 25.012016, lng: 121.540511 },
          { lat: 25.011983, lng: 121.540461 },
          { lat: 25.012046, lng: 121.540411 },
        ],
        label: { lat: 25.012048, lng: 121.540507 },
        pano: { lat: 25.012019, lng: 121.540407 },
      },
    ],
  },
  {
    spotName: "基隆路四段73巷路邊停車格C",
    point: { lat: 25.012775, lng: 121.539811 },
    iconUrl: "https://cdn-icons-png.flaticon.com/512/608/608690.png",
    rects: [
      {
        name: "C01",
        coords: [
          { lat: 25.012921, lng: 121.539757 },
          { lat: 25.012858, lng: 121.539813 },
          { lat: 25.012829, lng: 121.539772 },
          { lat: 25.012893, lng: 121.539718 },
        ],
        label: { lat: 25.012900, lng: 121.539800 },
        pano: { lat: 25.012874, lng: 121.539762 },
      },
      {
        name: "C02",
        coords: [
          { lat: 25.012836, lng: 121.539832 },
          { lat: 25.012773, lng: 121.539887 },
          { lat: 25.012743, lng: 121.539843 },
          { lat: 25.012807, lng: 121.539788 },
        ],
        label: { lat: 25.012816, lng: 121.539872 },
        pano: { lat: 25.012788, lng: 121.539835 },
      },
      {
        name: "C03",
        coords: [
          { lat: 25.012750, lng: 121.539905 },
          { lat: 25.012686, lng: 121.539959 },
          { lat: 25.012655, lng: 121.539913 },
          { lat: 25.012720, lng: 121.539859 },
        ],
        label: { lat: 25.012729, lng: 121.539947 },
        pano: { lat: 25.012704, lng: 121.539905 },
      },
    ],
  },
  {
    spotName: "基隆路四段73巷路邊停車格D",
    point: { lat: 25.012847, lng: 121.539682 },
    iconUrl: "https://cdn-icons-png.flaticon.com/512/608/608690.png",
    rects: [
      {
        name: "D01",
        coords: [
          { lat: 25.012823, lng: 121.539662 },
          { lat: 25.012714, lng: 121.539748 },
          { lat: 25.012745, lng: 121.539795 },
          { lat: 25.012853, lng: 121.539707 },
        ],
        label: { lat: 25.012751, lng: 121.539694 },
        pano: { lat: 25.012777, lng: 121.539733 },
      },
    ],
  },
  {
    spotName: "基隆路四段73巷路邊停車格E",
    point: { lat: 25.012450, lng: 121.540043 },
    iconUrl: "https://cdn-icons-png.flaticon.com/512/608/608690.png",
    rects: [
      {
        name: "E01",
        coords: [
          { lat: 25.012568, lng: 121.539871 },
          { lat: 25.012599, lng: 121.539917 },
          { lat: 25.012505, lng: 121.539993 },
          { lat: 25.012475, lng: 121.539947 },
        ],
        label: { lat: 25.012513, lng: 121.539892 },
        pano: { lat: 25.012534, lng: 121.539931 },
      },
      {
        name: "E02",
        coords: [
          { lat: 25.012453, lng: 121.539968 },
          { lat: 25.012483, lng: 121.540010 },
          { lat: 25.012418, lng: 121.540062 },
          { lat: 25.012388, lng: 121.540018 },
        ],
        label: { lat: 25.012411, lng: 121.539981 },
        pano: { lat: 25.012438, lng: 121.540014 },
      },
      {
        name: "E03",
        coords: [
          { lat: 25.012369, lng: 121.540036 },
          { lat: 25.012398, lng: 121.540080 },
          { lat: 25.012333, lng: 121.540136 },
          { lat: 25.012302, lng: 121.540092 },
        ],
        label: { lat: 25.012324, lng: 121.540049 },
        pano: { lat: 25.012348, lng: 121.540087 },
      },
    ],
  },
  {
    spotName: "基隆路四段73巷路邊停車格F",
    point: { lat: 25.011992, lng: 121.540419 },
    iconUrl: "https://cdn-icons-png.flaticon.com/512/608/608690.png",
    rects: [
      {
        name: "F01",
        coords: [
          { lat: 25.012104, lng: 121.540322 },
          { lat: 25.012075, lng: 121.540277 },
          { lat: 25.012012, lng: 121.540327 },
          { lat: 25.012042, lng: 121.540371 },
        ],
        label: { lat: 25.012041, lng: 121.540270 },
        pano: { lat: 25.012063, lng: 121.540320 },
      },
      {
        name: "F02",
        coords: [
          { lat: 25.011986, lng: 121.540347 },
          { lat: 25.012016, lng: 121.540393 },
          { lat: 25.011953, lng: 121.540445 },
          { lat: 25.011922, lng: 121.540400 },
        ],
        label: { lat: 25.011942, lng: 121.540360 },
        pano: { lat: 25.011971, lng: 121.540393},
      },
      {
        name: "F03",
        coords: [
          { lat: 25.011892, lng: 121.540425 },
          { lat: 25.011921, lng: 121.540472 },
          { lat: 25.011859, lng: 121.540520 },
          { lat: 25.011829, lng: 121.540474 },
        ],
        label: { lat: 25.011852, lng: 121.540434 },
        pano: { lat: 25.011878, lng: 121.540470 },
      },
    ],
  },
  {
    spotName: "基隆路四段73巷路邊停車格G",     
    point: { lat: 25.011594, lng: 121.540730 }, 
    iconUrl: "https://cdn-icons-png.flaticon.com/512/608/608690.png",
    rects: [
      {
        name: "G01",
        coords: [
          { lat: 25.011622, lng: 121.540705 },
          { lat: 25.011561, lng: 121.540752 },
          { lat: 25.011531, lng: 121.540711 },
          { lat: 25.011592, lng: 121.540658 },
        ],
        label: { lat: 25.011547, lng: 121.540664 },
        pano: { lat: 25.011581, lng: 121.540704 },
      },
    ],
  },
  {
    spotName: "基隆路四段73巷路邊停車格H",     
    point: { lat: 25.011488, lng: 121.540855 }, 
    iconUrl: "https://cdn-icons-png.flaticon.com/512/608/608690.png",
    rects: [
      {
        name: "H01",
        coords: [
          { lat: 25.011594, lng: 121.540828 },
          { lat: 25.011536, lng: 121.540875 },
          { lat: 25.011507, lng: 121.540835 },
          { lat: 25.011568, lng: 121.540786 },
        ],
        label: { lat: 25.011580, lng: 121.540874 },
        pano: { lat: 25.011533, lng: 121.540837 },
      },
      {
        name: "H02",
        coords: [
          { lat: 25.011498, lng: 121.540900 },
          { lat: 25.011458, lng: 121.540933 },
          { lat: 25.011429, lng: 121.540893 },
          { lat: 25.011473, lng: 121.540860 },
        ],
        label: { lat: 25.011494, lng: 121.540938 },
        pano: { lat: 25.011468, lng: 121.540889 },
      },
    ],
  },
];

  for (const mapping of boxMappings) {
    const matchedSpot = spots.find((s) => s.name === mapping.spotName);

    // ✅ 一開始就畫 P 點 marker
    const marker = new g.maps.Marker({
      position: mapping.point,
      map,
      title: mapping.spotName,
      icon: {
        url: mapping.iconUrl,
        scaledSize: new g.maps.Size(36, 36),
      },
    });
    console.log(`🅿️ P 點 marker 建立: ${mapping.spotName}`);

    marker.addListener("click", async () => {
      if (!isZoomed) {
        console.log("🔍 Zoom in 中...");
        map.setZoom(21);
        map.setCenter(mapping.point);

        try {
          const res = await fetch("/api/points/use", {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ action: "map" }), // ✅ 改這行：地圖圖示扣分
          });

          const data = await res.json();

          if (res.ok) {
            console.log(`✅ 已扣 100 積分，剩餘 ${data.updatedPoints}`);
            queryClient.invalidateQueries({ queryKey: ["/api/points"] });
          } else {
            alert(data.message || "❌ 扣分失敗，請稍後再試");
          }
        } catch (err) {
          console.error("❌ 扣分失敗:", err);
          alert("系統錯誤，請稍後再試");
        }

        const subSpots: SubSpot[] = [];

        // 畫格子框與 label
        mapping.rects.forEach((box) => {
          const rect = new g.maps.Polygon({
            paths: box.coords,
            strokeColor: "#1E90FF",
            strokeOpacity: 0.9,
            strokeWeight: 3,
            fillColor: "#87CEFA",
            fillOpacity: 0.6,
            map,
          });
          drawnRects.push(rect);

          const label = new g.maps.Marker({
            position: box.label,
            map,
            label: {
              text: box.name,
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

          subSpots.push({
            id: box.name,
            name: box.name,
            labelPosition: box.label,
            streetViewPosition: box.pano,
          });
        });

        // 呼叫右側明細面板
        if (matchedSpot) {
          onSpotClick?.({
            ...matchedSpot,
            subSpots,
          });
        }

        // ✅ 此時才畫紅點
        try {
          const redRes   = await fetch("/api/red-points");
          const redPoints = await redRes.json();
          console.log("🔴 紅點資料筆數:", redPoints.length);

          for (const pt of redPoints) {
            const redMarker = new g.maps.Marker({
              // ⭐ 直接用經緯度欄位
              position: {
                lat: pt.lat,
                lng: pt.lng,
              },
              map,
              icon: {
                path: g.maps.SymbolPath.CIRCLE,
                scale: 7.5,               // 半徑 (px) ─ 依需求微調
                fillColor: "red",
                fillOpacity: 1,

                strokeColor: "white",   // 白色外框
                strokeOpacity: 0.8,
                strokeWeight: 2,        // 外框線寬 (px)；1~2 最適合
              },
              // label: {
              //   text: pt.plate_text || pt.motor_index?.toString() || "?",
              //   color: "black",
              //   fontSize: "12px",
              //   fontWeight: "bold",
              // },
              label: {
                text: pt.motor_index?.toString() ?? "",
                color: "white",
                fontSize: "12px",
                fontWeight: "bold",
              },
            });
            redPointMarkers.push(redMarker);
          }
        } catch (e) {
          console.warn("⚠️ 紅點載入失敗:", e);
        }

        isZoomed = true;
      } else {
        // zoom out 清除格子與紅點
        console.log("↩️ Zoom out 回原始地圖");
        map.setZoom(16);
        map.setCenter(center);

        drawnRects.forEach((r) => r.setMap(null));
        labels.forEach((l) => l.setMap(null));
        redPointMarkers.forEach((m) => m.setMap(null));

        drawnRects = [];
        labels = [];
        redPointMarkers = [];

        isZoomed = false;
      }
    });
  }
};

  return <div ref={mapRef} className="w-full h-full" />;
}