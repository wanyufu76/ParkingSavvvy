import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Save, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ParkingSpot } from "@shared/schema";


// --- 型別 -----------------------------------------------------------------
interface CustomParkingSpot {
  id?: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  totalSpaces: number;
  availableSpaces: number;
  pricePerHour: number;
  description?: string;
}

// --- 元件 -----------------------------------------------------------------
export default function ParkingAdmin() {
  const { toast } = useToast();

  /* ---------------- state ---------------- */
  const [isAddingMode, setIsAddingMode] = useState(false);

  // 用 any 避掉 `google.maps` 型別問題
  const [mapInstance, setMapInstance] = useState<{
    map: any;
    marker: any;
  } | null>(null);

  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [newSpot, setNewSpot] = useState<CustomParkingSpot>({
    name: "",
    address: "",
    latitude: 0,
    longitude: 0,
    totalSpaces: 10,
    availableSpaces: 5,
    pricePerHour: 30,
    description: "",
  });

  /* ---------------- React-Query ---------------- */
  const { data: parkingSpots = [], isLoading } = useQuery<ParkingSpot[]>({
    queryKey: ["/api/parking-spots"],
  });

  const addSpotMutation = useMutation({
    mutationFn: async (spot: CustomParkingSpot) => {
      const res = await apiRequest("POST", "/api/parking-spots", spot);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parking-spots"] });
      toast({ title: "成功", description: "新增停車格成功！" });
      resetForm();
    },
    onError: (err: Error) =>
      toast({
        title: "錯誤",
        description: `新增失敗：${err.message}`,
        variant: "destructive",
      }),
  });

  const deleteSpotMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/parking-spots/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parking-spots"] });
      toast({ title: "成功", description: "刪除停車格成功！" });
    },
    onError: (err: Error) =>
      toast({
        title: "錯誤",
        description: `刪除失敗：${err.message}`,
        variant: "destructive",
      }),
  });

  /* ---------------- Effect：載入 Google Maps ---------------- */
  useEffect(() => {
    if (isAddingMode) createMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAddingMode]);

  /* ---------------------------------------------------------------------- */
  // 建立地圖
  const createMap = () => {
    if ((window as any).google?.maps) {
      initGMap();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${
      import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    }&libraries=places`;
    script.async = true;
    script.onload = initGMap;
    document.head.appendChild(script);
  };

  // 真正初始化
  const initGMap = () => {
    const g: any = (window as any).google;
    const map = new g.maps.Map(document.getElementById("admin-map") as HTMLElement, {
      center: { lat: 25.0136, lng: 121.5408 },
      zoom: 16,
    });

    map.addListener("click", (e: any) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();

      setSelectedLocation({ lat, lng });
      setNewSpot((p) => ({ ...p, latitude: lat, longitude: lng }));

      // 移除先前標記
      mapInstance?.marker?.setMap(null);

      const marker = new g.maps.Marker({
        position: { lat, lng },
        map,
        title: "新停車格",
      });

      setMapInstance({ map, marker });

      // 逆地理編碼
      const geocoder = new g.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results: any, status: string) => {
        if (status === "OK" && results[0]) {
          setNewSpot((p) => ({ ...p, address: results[0].formatted_address }));
        }
      });
    });

    setMapInstance({ map, marker: null });
  };

  // 儲存停車格
  const handleSaveSpot = () => {
    if (!selectedLocation || !newSpot.name.trim()) {
      toast({
        title: "錯誤",
        description: "請選擇位置並輸入停車格名稱",
        variant: "destructive",
      });
      return;
    }
    addSpotMutation.mutate(newSpot);
  };

  // 重設表單
  const resetForm = () => {
    setNewSpot({
      name: "",
      address: "",
      latitude: 0,
      longitude: 0,
      totalSpaces: 10,
      availableSpaces: 5,
      pricePerHour: 30,
      description: "",
    });
    setSelectedLocation(null);
    setIsAddingMode(false);
  };

  /* ---------------- Render ---------------- */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">停車格管理</h1>
        <Button onClick={() => setIsAddingMode(!isAddingMode)} className="flex items-center gap-2">
          {isAddingMode ? "取消" : <><Plus size={16} /> 新增停車格</>}
        </Button>
      </div>

      {/* 新增模式 */}
      {isAddingMode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin size={20} /> 新增停車格
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div id="admin-map" className="rounded-lg" style={{ height: 400, width: "100%" }} />

            {/* 表單欄位 */}
            <div className="grid grid-cols-2 gap-4">
              {/* 名稱 */}
              <TextInput label="名稱" value={newSpot.name} onChange={(v) => setNewSpot((p) => ({ ...p, name: v }))} />
              {/* 地址 */}
              <TextInput label="地址" value={newSpot.address} onChange={(v) => setNewSpot((p) => ({ ...p, address: v }))} />
              {/* 總位數 */}
              <NumberInput label="總停車位數" value={newSpot.totalSpaces} onChange={(v) => setNewSpot((p) => ({ ...p, totalSpaces: v }))} />
              {/* 可用位數 */}
              <NumberInput label="可用停車位數" value={newSpot.availableSpaces} onChange={(v) => setNewSpot((p) => ({ ...p, availableSpaces: v }))} />
              {/* 價格 */}
              <NumberInput label="每小時費用 (元)" value={newSpot.pricePerHour} onChange={(v) => setNewSpot((p) => ({ ...p, pricePerHour: v }))} />
              {/* 描述 */}
              <TextInput label="描述" value={newSpot.description ?? ""} onChange={(v) => setNewSpot((p) => ({ ...p, description: v }))} />
            </div>

            {/* 選取位置提示 */}
            {selectedLocation && (
              <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
                已選擇位置：{selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
              </div>
            )}

            {/* 儲存按鈕 */}
            <Button onClick={handleSaveSpot} disabled={addSpotMutation.isPending} className="w-full">
              {addSpotMutation.isPending ? "儲存中..." : <><Save size={16} /> 儲存停車格</>}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 停車格列表 */}
      <div className="grid gap-4">
        <h2 className="text-xl font-semibold">現有停車格</h2>
        {parkingSpots.map((spot) => (
          <Card key={spot.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <h3 className="font-semibold">{spot.name}</h3>
                  <p className="text-sm text-gray-600">{spot.address}</p>
                  <div className="flex gap-2">
                    <Badge variant="secondary">
                      {spot.availableSpaces}/{spot.totalSpaces} 可用
                    </Badge>
                    <Badge variant="outline">NT${spot.pricePerHour || 30}/小時</Badge>
                  </div>
                  <p className="text-sm text-gray-500">
                    位置：{parseFloat(String(spot.latitude)).toFixed(6)}, {parseFloat(String(spot.longitude)).toFixed(6)}
                  </p>
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteSpotMutation.mutate(spot.id)}
                  disabled={deleteSpotMutation.isPending}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------------- 小型輸入元件 ---------------- */
function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      <Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}
