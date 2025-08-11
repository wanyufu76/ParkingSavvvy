// E:\ParkSavvy\server\availability.ts
export type AreaAvailability = {
  area_id: string;
  capacity_est: number;
  current_count: number | null;
  free_slots: number;
  state: "has_space" | "no_space" | "unknown";
  updated_at: string | null;
};

const ICONS: Record<string, string> = {
  has_space: "https://polqjhuklxclnvgpjckf.supabase.co/storage/v1/object/public/icons/parking.png",   // ✅ 有空位
  no_space:  "https://polqjhuklxclnvgpjckf.supabase.co/storage/v1/object/public/icons/parking-2.png",   // ❌ 滿
  unknown:   "https://polqjhuklxclnvgpjckf.supabase.co/storage/v1/object/public/icons/parking-3.png", // ？ 未知
};

/** 從後端拿 area_availability，回 Map<area_id, row> */
export async function getAvailabilityMap(): Promise<Map<string, AreaAvailability>> {
  const res = await fetch("/api/parking-hints");
  if (!res.ok) throw new Error("fetch /api/parking-hints failed");
  const rows: AreaAvailability[] = await res.json();
  const map = new Map<string, AreaAvailability>();
  for (const r of rows) map.set(r.area_id, r);
  return map;
}

/** 依區域狀態挑 Marker 的 title 與 icon URL（保留你原先 mapping.iconUrl 當備援） */
export function pickMarkerMeta(
  areaId: string,
  availabilityById: Map<string, AreaAvailability>,
  fallbackIconUrl?: string
): { title: string; iconUrl: string } {
  const a = availabilityById.get(areaId);
  if (!a) {
    return {
      title: `${areaId} | 狀態: 未知`,
      iconUrl: fallbackIconUrl ?? ICONS.unknown,
    };
  }
  const iconUrl = ICONS[a.state] ?? ICONS.unknown;
  const title = `${areaId} | 空位: ${a.free_slots}/${a.capacity_est}`;
  return { title, iconUrl };
}
export type GroupAgg = {
  capacity_est: number;
  current_count: number | null;
  free_slots: number;
  state: "has_space" | "no_space" | "unknown";
  updated_at: string | null;
};

export function buildGroupAvailability(avById: Map<string, any>) {
  const byGroup = new Map<string, GroupAgg>();

  for (const row of avById.values()) {
    const group = String(row.area_id).charAt(0); // 取 A/B/C...
    const cur = byGroup.get(group) ?? {
      capacity_est: 0, current_count: 0, free_slots: 0, state: "unknown", updated_at: null
    };

    cur.capacity_est += row.capacity_est ?? 0;

    if (row.current_count == null) {
      cur.current_count = null;
    } else if (cur.current_count != null) {
      cur.current_count += row.current_count;
    }

    if (!cur.updated_at || (row.updated_at && row.updated_at > cur.updated_at)) {
      cur.updated_at = row.updated_at;
    }

    byGroup.set(group, cur);
  }

  for (const [g, cur] of byGroup) {
    if (cur.current_count == null) {
      cur.free_slots = 0;
      cur.state = "unknown";
    } else {
      cur.free_slots = Math.max(cur.capacity_est - cur.current_count, 0);
      cur.state = cur.free_slots >= 1 ? "has_space" : "no_space";
    }
  }

  return byGroup;
}