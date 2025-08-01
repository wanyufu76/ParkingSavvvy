/* client/src/components/ui/AddParkingSpotDialog.tsx */
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

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface FormState {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  pricePerHour: number;
  description: string;
}

export default function AddParkingSpotDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mapRef = useRef<google.maps.Map>();
  const markerRef = useRef<google.maps.Marker>();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  const [form, setForm] = useState<FormState>({
    name: "",
    address: "",
    latitude: 0,
    longitude: 0,
    pricePerHour: 20,
    description: "",
  });

  const createSpot = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/admin/api/parking-spots", {
        ...form,
        latitude: String(form.latitude),
        longitude: String(form.longitude),
      });
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
        description: e?.message ?? JSON.stringify(e),
        variant: "destructive",
      }),
  });

  /* ---------------- 載入 Maps 並初始化 ---------------- */
useEffect(() => {
  if (!open) return; // Dialog 關閉時不動作

  (async () => {
    await loadGoogleMaps(import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string);

    if (!mapContainerRef.current) return;

    if (mapRef.current) {
      // ✅ 如果已經有 map，直接把它掛到新的容器
      mapRef.current.setOptions({ mapTypeId: google.maps.MapTypeId.ROADMAP });
      (mapRef.current as any).setDiv(mapContainerRef.current);
      return;
    }

    // ✅ 第一次建立
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

      if (markerRef.current) {
        markerRef.current.setPosition({ lat, lng });
      } else {
        markerRef.current = new google.maps.Marker({
          position: { lat, lng },
          map,
          title: "新停車格",
        });
      }

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
        }
      );
    });
  })();
}, [open]);

  /* 更新 marker 與表單 */
  const updateLocation = (lat: number, lng: number, reverseGeocode = false) => {
    setForm((f) => ({ ...f, latitude: lat, longitude: lng }));

    if (markerRef.current) {
      markerRef.current.setPosition({ lat, lng });
    } else if (mapRef.current) {
      markerRef.current = new google.maps.Marker({
        position: { lat, lng },
        map: mapRef.current,
        title: "新停車格",
      });
    }

    if (mapRef.current) {
      mapRef.current.setCenter({ lat, lng });
    }

    if (reverseGeocode) {
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
    }
  };

  const disabled =
    !form.name.trim() || form.latitude === 0 || form.longitude === 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setForm({
            name: "",
            address: "",
            latitude: 0,
            longitude: 0,
            pricePerHour: 20,
            description: "",
          });
          if (markerRef.current) {
            markerRef.current.setMap(null);
            markerRef.current = undefined;
          }
        }
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            新增停車格
          </DialogTitle>
        </DialogHeader>

        {/* 永久存在的地圖容器 */}
        <div ref={mapContainerRef} className="h-64 w-full rounded mb-4" />

        {/* 表單欄位 */}
        <div className="grid grid-cols-2 gap-4 mb-4">
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

          {/* 新增經緯度手動輸入 */}
          <div>
            <label className="block text-sm mb-1">緯度</label>
            <Input
              type="number"
              value={form.latitude || ""}
              onChange={(e) => updateLocation(Number(e.target.value), form.longitude)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">經度</label>
            <Input
              type="number"
              value={form.longitude || ""}
              onChange={(e) => updateLocation(form.latitude, Number(e.target.value))}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">費率 (NT$/h)</label>
            <Input
              type="number"
              value={form.pricePerHour}
              onChange={(e) =>
                setForm((s) => ({ ...s, pricePerHour: Number(e.target.value) }))
              }
            />
          </div>

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

        {form.latitude !== 0 && (
          <p className="text-xs text-blue-600 mb-4">
            已選：{form.latitude.toFixed(6)} , {form.longitude.toFixed(6)}
          </p>
        )}

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
