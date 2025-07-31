import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Navigation as NavigationIcon, X } from "lucide-react";
import type { ParkingSpot } from "@shared/schema";

interface Props {
  spot: ParkingSpot | null;
  onClose: () => void;
}

export default function SpotDetailDrawer({ spot, onClose }: Props) {
  const [uploadedSpots, setUploadedSpots] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/uploads")
      .then((res) => res.json())
      .then((data) => {
        const uploaded = data.map((item: any) => item.location); // e.g., "left", "mid", "right"
        setUploadedSpots(uploaded);
      })
      .catch(() => {
        setUploadedSpots([]);
      });
  }, []);

  if (!spot) return null;

  const lat = parseFloat(spot.latitude);
  const lng = parseFloat(spot.longitude);

  const subSpots = [
    { id: "A01", name: "A01", location: "left" },
    { id: "A02", name: "A02", location: "mid" },
    { id: "A03", name: "A03", location: "right" },
  ];

  const handleOpenImage = (id: string, location: string) => {
    const processedUrl = `/processed_images/${id}_output.jpg`;
    const baseUrl = `/base_images/base_${id}.jpg`;

    const useProcessed = uploadedSpots.includes(location);
    const imageUrl = useProcessed ? processedUrl : baseUrl;
    window.open(imageUrl, "_blank");
  };

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
            onClick={() => handleOpenImage(ps.id, ps.location)}
          >
              街景：{ps.name}
            </Button>
          ))}
        </div>
    </div>
  );
}