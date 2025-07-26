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

  return (
    <div className="fixed top-100 right-10 w-90 max-h-[80vh] overflow-y-auto bg-white shadow-lg border rounded-lg z-50 p-5 space-y-4">
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-semibold">{spot.name}</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">{spot.address}</p>
      <p>
        可用 <span className="font-bold">{spot.availableSpaces}</span> / {spot.totalSpaces}
      </p>
      <p>NT$ {spot.pricePerHour || 30} / 小時</p>

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
        <Button
          variant="outline"
          className="w-full"
          onClick={() =>
            window.open(
              `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`,
              "_blank"
            )
          }
        >
          街景
        </Button>
      </div>
    </div>
  );
}
