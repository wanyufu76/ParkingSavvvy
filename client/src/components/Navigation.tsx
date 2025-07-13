import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Menu, X, ParkingMeter, Home, Heart, Upload, Mail, LogOut, Settings } from "lucide-react";
import ProfileDialog from "@/components/ProfileDialog";

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const { isAuthenticated, user } = useAuth();

  const navItems = [
    { path: "/", label: "首頁", icon: Home },
    { path: "/favorites", label: "我的最愛", icon: Heart },
    { path: "/upload", label: "影像上傳", icon: Upload },
    { path: "/contact", label: "聯絡我們", icon: Mail },
  ];

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = "/";
    }
  };

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <ParkingMeter className="h-8 w-8 text-primary mr-2" />
              <h1 className="text-2xl font-bold text-primary">位無一失</h1>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {isAuthenticated ? (
                <>
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location === item.path;
                    return (
                      <Link
                        key={item.path}
                        href={item.path}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center ${
                          isActive
                            ? "text-primary font-semibold"
                            : "text-gray-700 hover:text-primary"
                        }`}
                      >
                        <Icon className="h-4 w-4 mr-1" />
                        {item.label}
                      </Link>
                    );
                  })}
                  <ProfileDialog>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center text-gray-700 hover:text-primary"
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      個人設定
                    </Button>
                  </ProfileDialog>
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    size="sm"
                    className="ml-4"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    登出
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => window.location.href = "/api/login"}
                  className="bg-primary hover:bg-primary/90"
                >
                  登入
                </Button>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {isAuthenticated ? (
              <>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.path;
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={`block px-3 py-2 text-base font-medium transition-colors duration-200 flex items-center ${
                        isActive
                          ? "text-primary font-semibold"
                          : "text-gray-700 hover:text-primary"
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {item.label}
                    </Link>
                  );
                })}
                <ProfileDialog>
                  <Button
                    variant="ghost"
                    className="w-full mt-2 justify-start px-3 py-2 text-base font-medium transition-colors duration-200 flex items-center text-gray-700 hover:text-primary"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    個人設定
                  </Button>
                </ProfileDialog>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="w-full mt-4"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  登出
                </Button>
              </>
            ) : (
              <Button
                onClick={() => window.location.href = "/api/login"}
                className="w-full bg-primary hover:bg-primary/90"
              >
                登入
              </Button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
