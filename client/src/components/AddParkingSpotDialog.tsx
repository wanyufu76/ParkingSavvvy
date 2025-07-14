/* client/src/components/ui/AddParkingSpotDialog.tsx */
/* -------------------------------------------------- */
/* <reference …> 讓 TS 知道 google namespace --------- */
/// <reference types="google.maps" />

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, MapPin } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";



/* -------------------------------------------------- */
/* Google Maps SDK 載入 Promise（只載一次）            */
/* -------------------------------------------------- */
let gmapPromise: Promise<void> | null = null;
function loadGoogleMaps(key: string) {
  if (gmapPromise) return gmapPromise;
  gmapPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return gmapPromise;
}

/* -------------------------------------------------- */
/* 型別與 Props                                        */
/* -------------------------------------------------- */
interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface FormState {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  totalSpaces: number;
  availableSpaces: number;
  pricePerHour: number;
  description: string;
}

/* -------------------------------------------------- */
/* 元件                                               */
/* -------------------------------------------------- */
export default function AddParkingSpotDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const queryClient = useQueryClient();


  /* 地圖相關狀態 */
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map>();
  const markerRef = useRef<google.maps.Marker>();

  /* 表單狀態 */
  const [form, setForm] = useState<FormState>({
    name: "",
    address: "",
    latitude: 0,
    longitude: 0,
    totalSpaces: 10,
    availableSpaces: 5,
    pricePerHour: 30,
    description: "",
  });

  /* ---------------- 新增 API ---------------- */
  const createSpot = useMutation({
  /*----------------------------------------------
   * 1) 換 URL      → /admin/api/parking-spots
   * 2) 維持 number → 不轉字串
   *---------------------------------------------*/
  mutationFn: async () => {
    const res = await apiRequest("POST", "/admin/api/parking-spots", {
      ...form,
      latitude: String(form.latitude),
      longitude: String(form.longitude),
    });
    // 4xx / 5xx 會 throw，fetch OK 才走下面
    return res.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/admin/api/parking-spots"] });
    toast({ title: "停車格已新增！" });
    onOpenChange(false);
  },
  onError: (e: any) =>
    toast({
      title: "新增失敗",
      description:
        // 後端大多回 { message: "..."}，不然就顯示整個 response
        e?.message ?? JSON.stringify(e),
      variant: "destructive",
    }),
});

  /* ---------------- 載入 Maps 並初始化 ---------------- */
  useEffect(() => {
    if (!open) return; // Dialog 關閉時不動作

    (async () => {
      await loadGoogleMaps(import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string);

      /* 等待 Dialog 內容 mount */
      if (!mapContainerRef.current) return;
      /* 若已經初始化過，直接 return（避免重複 new） */
      if (mapRef.current) return;

      const map = new google.maps.Map(mapContainerRef.current, {
        center: { lat: 25.0136, lng: 121.5408 },
        zoom: 16,
      });
      mapRef.current = map;

      map.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        setForm((f) => ({ ...f, latitude: lat, longitude: lng }));

        /* 更新 / 新增 Marker */
        if (markerRef.current) {
          markerRef.current.setPosition({ lat, lng });
        } else {
          markerRef.current = new google.maps.Marker({
            position: { lat, lng },
            map,
            title: "新停車格",
          });
        }

        /* 逆地理編碼抓地址 */
        new google.maps.Geocoder().geocode(
          { location: { lat, lng } },
          (results, status) => {
            if (
              status === google.maps.GeocoderStatus.OK &&
              results &&
              results[0]
            ) {
              setForm((f) => ({
                ...f,
                address: results[0].formatted_address,
              }));
            }
          },
        );
      });
    })();
  }, [open]);

  /* ---------------- 關閉時清理 ---------------- */
  const resetForm = () => {
    setForm({
      name: "",
      address: "",
      latitude: 0,
      longitude: 0,
      totalSpaces: 10,
      availableSpaces: 5,
      pricePerHour: 30,
      description: "",
    });
    /* 不移除 map，保留快取；但可以清掉 marker 標記 */
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = undefined;
    }
  };

  /* ---------------- 表單可否送出 ---------------- */
  const disabled =
    !form.name.trim() || form.latitude === 0 || form.longitude === 0;

  /* ---------------- Render ---------------- */
  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            新增停車格
          </DialogTitle>
        </DialogHeader>

        {/* 地圖容器（用 ref）*/}
        <div ref={mapContainerRef} className="h-64 w-full rounded mb-4" />

        {/* 表單欄位 */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* 名稱 / 地址 */}
          {["name", "address"].map((key) => (
            <div key={key}>
              <label className="block text-sm mb-1">
                {key === "name" ? "名稱" : "地址"}
              </label>
              <Input
                value={form[key as keyof FormState] as string}
                onChange={(e) =>
                  setForm((s) => ({ ...s, [key]: e.target.value }))
                }
              />
            </div>
          ))}

          {/* 數值欄位 */}
          {(
            [
              ["totalSpaces", "總車位"],
              ["availableSpaces", "可用車位"],
              ["pricePerHour", "費率 (NT$/h)"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="block text-sm mb-1">{label}</label>
              <Input
                type="number"
                value={form[key]}
                onChange={(e) =>
                  setForm((s) => ({ ...s, [key]: Number(e.target.value) }))
                }
              />
            </div>
          ))}

          {/* 描述 */}
          <div className="col-span-2">
            <label className="block text-sm mb-1">描述</label>
            <Input
              value={form.description}
              onChange={(e) =>
                setForm((s) => ({ ...s, description: e.target.value }))
              }
            />
          </div>
        </div>

        {/* 經緯度提示 */}
        {form.latitude !== 0 && (
          <p className="text-xs text-blue-600 mb-4">
            已選：{form.latitude.toFixed(6)} , {form.longitude.toFixed(6)}
          </p>
        )}

        {/* 儲存按鈕 */}
        <Button
          className="w-full"
          disabled={disabled || createSpot.isPending}
          onClick={() => createSpot.mutate()}
        >
          {createSpot.isPending ? "儲存中…" : <Save className="w-4 h-4 mr-1" />}
          儲存
        </Button>
      </DialogContent>
    </Dialog>
  );
}
