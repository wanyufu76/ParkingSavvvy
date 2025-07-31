import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

// 定義使用者型別
export type UserRole = "user" | "admin";

export interface User {
  id: number;
  email: string;
  username: string;
  role: UserRole;   // ✅ 關鍵：有 role
}

export function useAuth() {
  const { data, isLoading } = useQuery<User | null>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
  });

  return {
    user: data,                // User | null
    isLoading,
    isAuthenticated: !!data,   // boolean
  };
}
