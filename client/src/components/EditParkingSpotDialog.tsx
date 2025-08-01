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

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  spot: any | null; // 停車格資料（來自父層）
}

export default function EditParkingSpotDialog({ open, onOpenChange, spot }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  /* 地圖相關 */
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map>();
  const markerRef = useRef<google.maps.Marker>();

  /* 表單狀態 */
  const [form, setForm] = useState({
    name: "",
    address: "",
    latitude: 0,
    longitude: 0,
    pricePerHour: 20,
    description: "",
  });

  /* 載入傳入的 spot 資料 */
  useEffect(() => {
    if (spot) {
      setForm({
        name: spot.name || "",
        address: spot.address || "",
        latitude: Number(spot.latitude) || 0,
        longitude: Number(spot.longitude) || 0,
        pricePerHour: Number(spot.pricePerHour) || 20,
        description: spot.description || "",
      });
    }
  }, [spot]);

  /* ---------------- 編輯 API ---------------- */
  const updateSpot = useMutation({
    mutationFn: async () => {
      if (!spot) throw new Error("No spot to edit");
      const res = await apiRequest("PUT", `/admin/api/parking-spots/${spot.id}`, {
        ...form,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/admin/api/parking-spots"] });
      toast({ title: "停車格已更新！" });
      onOpenChange(false);
    },
    onError: (e: any) =>
      toast({
        title: "更新失敗",
        description: e?.message ?? JSON.stringify(e),
        variant: "destructive",
      }),
  });

  /* ---------------- 初始化地圖 ---------------- */
  useEffect(() => {
    if (!open) return;
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = new google.maps.Map(mapContainerRef.current, {
        center: { lat: form.latitude || 25.0136, lng: form.longitude || 121.5408 },
        zoom: 16,
      });
    }

    if (spot) {
      const pos = { lat: Number(form.latitude), lng: Number(form.longitude) };
      mapRef.current.setCenter(pos);
      if (markerRef.current) {
        markerRef.current.setPosition(pos);
      } else {
        markerRef.current = new google.maps.Marker({
          position: pos,
          map: mapRef.current,
          title: spot.name,
        });
      }
    }
  }, [open, spot, form.latitude, form.longitude]);

  /* ---------------- Render ---------------- */
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            編輯停車格
          </DialogTitle>
        </DialogHeader>

        {/* 地圖 */}
        <div ref={mapContainerRef} className="h-64 w-full rounded mb-4" />

        {/* 已選座標顯示 */}
        <p className="text-xs text-blue-600 mb-2">
          已選座標：{Number(form.latitude).toFixed(6)} , {Number(form.longitude).toFixed(6)}
        </p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* 名稱 / 地址 */}
          {["name", "address"].map((key) => (
            <div key={key}>
              <label className="block text-sm mb-1">
                {key === "name" ? "名稱" : "地址"}
              </label>
              <Input
                value={form[key as keyof typeof form] as string}
                onChange={(e) =>
                  setForm((s) => ({ ...s, [key]: e.target.value }))
                }
              />
            </div>
          ))}

          {/* 費率 */}
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

          {/* 經緯度（手動可改） */}
          <div>
            <label className="block text-sm mb-1">緯度</label>
            <Input
              type="number"
              value={form.latitude}
              onChange={(e) =>
                setForm((s) => ({ ...s, latitude: Number(e.target.value) }))
              }
            />
          </div>
          <div>
            <label className="block text-sm mb-1">經度</label>
            <Input
              type="number"
              value={form.longitude}
              onChange={(e) =>
                setForm((s) => ({ ...s, longitude: Number(e.target.value) }))
              }
            />
          </div>
        </div>

        {/* 儲存按鈕 */}
        <Button
          className="w-full"
          disabled={updateSpot.isPending}
          onClick={() => updateSpot.mutate()}
        >
          {updateSpot.isPending ? "儲存中…" : <Save className="w-4 h-4 mr-1" />}
          儲存
        </Button>
      </DialogContent>
    </Dialog>
  );
}
