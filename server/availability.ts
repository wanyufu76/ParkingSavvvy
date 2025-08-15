// E:\ParkSavvy\server\availability.ts

// ====== 型別 ======
export type AreaAvailability = {
  area_id: string;
  capacity_est: number;
  current_count: number | null;
  free_slots: number;
  state: "has_space" | "no_space" | "unknown";
  updated_at: string | null;
};

export type GroupAgg = {
  capacity_est: number;
  current_count: number | null;
  free_slots: number;
  state: "has_space" | "no_space" | "unknown";
  updated_at: string | null;
};

// ====== 圖示（用你放在 Supabase Storage 的 https 圖）======
const ICONS: Record<string, string> = {
  has_space:
    "https://polqjhuklxclnvgpjckf.supabase.co/storage/v1/object/public/icons/parking.png", // 綠
  no_space:
    "https://polqjhuklxclnvgpjckf.supabase.co/storage/v1/object/public/icons/parking-2.png", // 紅
  unknown:
    "https://polqjhuklxclnvgpjckf.supabase.co/storage/v1/object/public/icons/parking-3.png", // 灰
  some_space:
    "https://polqjhuklxclnvgpjckf.supabase.co/storage/v1/object/public/icons/parking-4.png", //黃
};

// ====== 小格(A01/A02...)：抓可用性並做成 Map ======
/** 從後端拿 area_availability，回 Map<area_id, row> */
export async function getAvailabilityMap(): Promise<Map<string, AreaAvailability>> {
  const res = await fetch("/api/parking-hints");
  if (!res.ok) throw new Error("fetch /api/parking-hints failed");
  const rows: AreaAvailability[] = await res.json();
  const map = new Map<string, AreaAvailability>();
  for (const r of rows) map.set(r.area_id, r);
  return map;
}

/** 依小格狀態挑 Marker 的 title 與 icon（備援用 mapping.iconUrl） */
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

// ====== 聚合：把小格(A01/A02...) 聚成大區(A/B/C...) ======
/** 將 Map<area_id,row> 依首字母聚合成 Map<groupKey,row>（groupKey= 'A'|'B'...） */
export function buildGroupAvailability(avById: Map<string, AreaAvailability>) {
  const byGroup = new Map<string, GroupAgg>();

  for (const row of avById.values()) {
    const group = String(row.area_id).charAt(0); // A/B/C...
    const cur =
      byGroup.get(group) ?? {
        capacity_est: 0,
        current_count: 0,
        free_slots: 0,
        state: "unknown",
        updated_at: null as string | null,
      };

    // 容量加總
    cur.capacity_est += row.capacity_est ?? 0;

    // current_count：任一小格為 null → 整組視為 unknown
    if (row.current_count == null) {
      cur.current_count = null;
    } else if (cur.current_count != null) {
      cur.current_count += row.current_count;
    }

    // updated_at 取最新
    if (!cur.updated_at || (row.updated_at && row.updated_at > cur.updated_at)) {
      cur.updated_at = row.updated_at;
    }

    byGroup.set(group, cur);
  }

  // 回填 free_slots 與群組 state
  for (const [, cur] of byGroup) {
    if (cur.current_count == null) {
      cur.free_slots = 0;
      cur.state = "unknown";
    } else {
      cur.free_slots = Math.max(cur.capacity_est - cur.current_count, 0);
      cur.state = cur.free_slots >= 1 ? "has_space" : "no_space";
    }
  }

  return byGroup; // Map<"A", GroupAgg>
}

// ====== 群組(A/B/C...)：半數門檻選 icon/title ======
/**
 * 規則：
 * - current_count 為 null → unknown(灰)
 * - free_slots === 0 → no_space(紅)
 * - 1 ≤ free_slots ≤ floor(capacity/2) → unknown(灰)
 * - free_slots > floor(capacity/2) → has_space(綠)
 */
export function pickGroupMarkerMetaWithHalfRule(
  groupKey: string,
  group?: GroupAgg
): { title: string; iconUrl: string } {
  if (!group || group.current_count == null) {
    return { title: `${groupKey} 區 | 狀態: 未知`, iconUrl: ICONS.unknown };
  }

  const cap = Math.max(group.capacity_est ?? 0, 0);
  const half = Math.floor(cap / 2);

  let iconUrl = ICONS.has_space; // 預設：空位多
  if (group.free_slots === 0) {
    iconUrl = ICONS.no_space; // 滿
  } else if (group.free_slots <= half) {
    iconUrl = ICONS.some_space; // 半數內：灰
  }

  const title = `${groupKey} 區 | 空位: ${group.free_slots}/${cap}`;
  return { title, iconUrl };
}