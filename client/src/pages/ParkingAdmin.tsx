import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Save, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { ParkingSpot } from '@shared/schema';

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

export default function ParkingAdmin() {
  const { toast } = useToast();
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [newSpot, setNewSpot] = useState<CustomParkingSpot>({
    name: '',
    address: '',
    latitude: 0,
    longitude: 0,
    totalSpaces: 10,
    availableSpaces: 5,
    pricePerHour: 30,
    description: ''
  });

  const { data: parkingSpots = [], isLoading } = useQuery<ParkingSpot[]>({
    queryKey: ['/api/parking-spots'],
  });

  const addSpotMutation = useMutation({
    mutationFn: async (spot: CustomParkingSpot) => {
      const response = await apiRequest('POST', '/api/parking-spots', spot);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/parking-spots'] });
      toast({
        title: '成功',
        description: '新增停車格成功！',
      });
      setNewSpot({
        name: '',
        address: '',
        latitude: 0,
        longitude: 0,
        totalSpaces: 10,
        availableSpaces: 5,
        pricePerHour: 30,
        description: ''
      });
      setSelectedLocation(null);
      setIsAddingMode(false);
    },
    onError: (error) => {
      toast({
        title: '錯誤',
        description: `新增失敗: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const deleteSpotMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/parking-spots/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/parking-spots'] });
      toast({
        title: '成功',
        description: '刪除停車格成功！',
      });
    },
    onError: (error) => {
      toast({
        title: '錯誤',
        description: `刪除失敗: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  useEffect(() => {
    if (isAddingMode) {
      initializeMap();
    }
  }, [isAddingMode]);

  const initializeMap = () => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.onload = () => {
      const map = new (window as any).google.maps.Map(document.getElementById('admin-map'), {
        center: { lat: 25.0136, lng: 121.5408 }, // 台科大
        zoom: 16,
        restriction: {
          latLngBounds: {
            north: 25.0336,
            south: 24.9936,
            east: 121.5608,
            west: 121.5208,
          },
        },
      });

      // 點擊地圖選擇位置
      map.addListener('click', (e: any) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        setSelectedLocation({ lat, lng });
        setNewSpot(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng,
        }));

        // 清除之前的標記
        if (mapInstance?.marker) {
          mapInstance.marker.setMap(null);
        }

        // 添加新標記
        const marker = new (window as any).google.maps.Marker({
          position: { lat, lng },
          map: map,
          title: '新停車格位置',
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#FF0000"/>
              </svg>
            `),
            scaledSize: new (window as any).google.maps.Size(24, 24),
          },
        });

        setMapInstance({ map, marker });

        // 逆地理編碼獲取地址
        const geocoder = new (window as any).google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
          if (status === 'OK' && results[0]) {
            setNewSpot(prev => ({
              ...prev,
              address: results[0].formatted_address,
            }));
          }
        });
      });

      setMapInstance({ map, marker: null });
    };
    document.head.appendChild(script);
  };

  const handleSaveSpot = () => {
    if (!selectedLocation || !newSpot.name.trim()) {
      toast({
        title: '錯誤',
        description: '請選擇位置並輸入停車格名稱',
        variant: 'destructive',
      });
      return;
    }

    addSpotMutation.mutate(newSpot);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">停車格管理</h1>
        <Button
          onClick={() => setIsAddingMode(!isAddingMode)}
          className="flex items-center gap-2"
        >
          {isAddingMode ? '取消' : <><Plus size={16} /> 新增停車格</>}
        </Button>
      </div>

      {isAddingMode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin size={20} />
              新增停車格
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div id="admin-map" style={{ height: '400px', width: '100%' }} className="rounded-lg" />
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">停車格名稱</label>
                <Input
                  value={newSpot.name}
                  onChange={(e) => setNewSpot(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="例：台科大側門路邊停車"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">地址</label>
                <Input
                  value={newSpot.address}
                  onChange={(e) => setNewSpot(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="自動填入或手動輸入"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">總停車位數</label>
                <Input
                  type="number"
                  value={newSpot.totalSpaces}
                  onChange={(e) => setNewSpot(prev => ({ ...prev, totalSpaces: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">可用停車位數</label>
                <Input
                  type="number"
                  value={newSpot.availableSpaces}
                  onChange={(e) => setNewSpot(prev => ({ ...prev, availableSpaces: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">每小時費用 (元)</label>
                <Input
                  type="number"
                  value={newSpot.pricePerHour}
                  onChange={(e) => setNewSpot(prev => ({ ...prev, pricePerHour: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">描述</label>
                <Input
                  value={newSpot.description}
                  onChange={(e) => setNewSpot(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="例：路邊停車格，平日較容易找到位置"
                />
              </div>
            </div>

            {selectedLocation && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  已選擇位置: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                </p>
              </div>
            )}

            <Button 
              onClick={handleSaveSpot} 
              disabled={addSpotMutation.isPending}
              className="w-full"
            >
              {addSpotMutation.isPending ? '儲存中...' : <><Save size={16} /> 儲存停車格</>}
            </Button>
          </CardContent>
        </Card>
      )}

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
                    <Badge variant="outline">
                      ${spot.pricePerHour || 30}/小時
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">
                    位置: {parseFloat(spot.latitude).toFixed(6)}, {parseFloat(spot.longitude).toFixed(6)}
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