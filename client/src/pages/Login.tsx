import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ParkingMeter } from "lucide-react";

export default function Login() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full">
        <CardContent className="p-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-primary rounded-full flex items-center justify-center mb-6">
              <ParkingMeter className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              登入您的帳戶
            </h2>
            <p className="text-sm text-gray-600 mb-8">
              立即使用位無一失智慧停車系統
            </p>
            <Button 
              onClick={handleLogin}
              className="w-full bg-primary hover:bg-primary/90"
              size="lg"
            >
              使用 Replit 登入
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
