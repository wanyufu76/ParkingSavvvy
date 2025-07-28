import { Button } from "@/components/ui/button";
import { Navigation as NavigationIcon, X } from "lucide-react";
import type { ParkingSpot } from "@shared/schema";

interface Props {
  spot: ParkingSpot | null;
  onClose: () => void;
}

export default function SpotDetailDrawer({ spot, onClose }: Props) {
  if (!spot) return null;

  const lat = parseFloat(spot.latitude);
  const lng = parseFloat(spot.longitude);

  // ✅ 模擬子車格 subSpots（之後可改成從資料庫帶入）
  const subSpots = [
    {
      id: "A01",
      name: "A01",
      streetViewPosition: { lat: 25.01196, lng: 121.54057 },
    },
    {
      id: "A02",
      name: "A02",
      streetViewPosition: { lat: 25.011865, lng: 121.540655 },
    },
    {
      id: "A03",
      name: "A03",
      streetViewPosition: { lat: 25.011775, lng: 121.54074 },
    },
  ];

  return (
    <div className="fixed top-100 right-10 w-90 max-h-[80vh] overflow-y-auto bg-white shadow-lg border rounded-lg z-50 p-5 space-y-4">
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-semibold">{spot.name}</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">{spot.address}</p>
      <p>NT$ {spot.pricePerHour || 20} / 小時</p>

      {/* 導航按鈕（主停車場） */}
      <div className="grid gap-2">
        <Button
          className="w-full"
          onClick={() =>
            window.open(
              `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
              "_blank"
            )
          }
        >
          <NavigationIcon className="h-4 w-4 mr-1" />
          導航
        </Button>
      </div>

      {/* 多個街景按鈕 */}
      <div className="mt-4 space-y-2">
        {subSpots.map((ps) => (
          <Button
            key={ps.id}
            variant="outline"
            className="w-full"
            onClick={() =>
              window.open(
                `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${ps.streetViewPosition.lat},${ps.streetViewPosition.lng}`,
                )
              }
            >
              街景：{ps.name}
            </Button>
          ))}
        </div>
    </div>
  );
}