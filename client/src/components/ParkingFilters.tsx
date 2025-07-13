import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search, Filter, X, MapPin, Clock, Car, DollarSign } from "lucide-react";

interface FilterOptions {
  searchTerm: string;
  availabilityStatus: string;
  distanceRange: number[];
  priceRange: number[];
  amenities: string[];
  sortBy: string;
  showAvailableOnly: boolean;
}

interface ParkingFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onClearFilters: () => void;
}

const amenityOptions = [
  { id: "covered", label: "有遮蔽", icon: "🏠" },
  { id: "electric", label: "電動車充電", icon: "⚡" },
  { id: "security", label: "監控設備", icon: "📹" },
  { id: "disabled", label: "無障礙車位", icon: "♿" },
  { id: "wash", label: "洗車服務", icon: "🚿" },
  { id: "valet", label: "代客泊車", icon: "🔑" },
];

const sortOptions = [
  { value: "distance", label: "距離優先" },
  { value: "availability", label: "空位數量" },
  { value: "price", label: "價格低到高" },
  { value: "rating", label: "評分高到低" },
  { value: "recent", label: "最近更新" },
];

export default function ParkingFilters({ filters, onFiltersChange, onClearFilters }: ParkingFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = (key: keyof FilterOptions, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const toggleAmenity = (amenityId: string) => {
    const newAmenities = filters.amenities.includes(amenityId)
      ? filters.amenities.filter(id => id !== amenityId)
      : [...filters.amenities, amenityId];
    updateFilter('amenities', newAmenities);
  };

  const hasActiveFilters = 
    filters.searchTerm ||
    filters.availabilityStatus !== 'all' ||
    filters.distanceRange[1] < 5000 ||
    filters.priceRange[1] < 200 ||
    filters.amenities.length > 0 ||
    filters.showAvailableOnly;

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        {/* Search Bar */}
        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="搜尋停車場名稱或地址..."
              className="pl-10"
              value={filters.searchTerm}
              onChange={(e) => updateFilter('searchTerm', e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={isExpanded ? "default" : "outline"}
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              進階篩選
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                  {[
                    filters.searchTerm && '搜尋',
                    filters.availabilityStatus !== 'all' && '狀態',
                    filters.distanceRange[1] < 5000 && '距離',
                    filters.priceRange[1] < 200 && '價格',
                    filters.amenities.length > 0 && '設施',
                    filters.showAvailableOnly && '僅空位'
                  ].filter(Boolean).length}
                </Badge>
              )}
            </Button>
            
            {hasActiveFilters && (
              <Button variant="ghost" onClick={onClearFilters} size="sm">
                <X className="h-4 w-4" />
                清除
              </Button>
            )}
          </div>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            variant={filters.showAvailableOnly ? "default" : "outline"}
            size="sm"
            onClick={() => updateFilter('showAvailableOnly', !filters.showAvailableOnly)}
          >
            <Car className="h-3 w-3 mr-1" />
            僅顯示有空位
          </Button>
          
          <Select value={filters.availabilityStatus} onValueChange={(value) => updateFilter('availabilityStatus', value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="空位狀況" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部狀況</SelectItem>
              <SelectItem value="available">充足空位</SelectItem>
              <SelectItem value="limited">空位有限</SelectItem>
              <SelectItem value="full">已滿</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.sortBy} onValueChange={(value) => updateFilter('sortBy', value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="排序方式" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Advanced Filters */}
        {isExpanded && (
          <div className="border-t pt-4 space-y-6">
            {/* Distance Filter */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <Label className="text-sm font-medium">距離範圍</Label>
                <span className="text-xs text-gray-500">
                  {filters.distanceRange[1] >= 5000 ? '不限' : `${filters.distanceRange[1]}m 以內`}
                </span>
              </div>
              <Slider
                value={filters.distanceRange}
                onValueChange={(value) => updateFilter('distanceRange', value)}
                max={5000}
                min={100}
                step={100}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>100m</span>
                <span>5km+</span>
              </div>
            </div>

            {/* Price Filter */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <Label className="text-sm font-medium">價格範圍 (每小時)</Label>
                <span className="text-xs text-gray-500">
                  {filters.priceRange[1] >= 200 ? '不限' : `NT$${filters.priceRange[0]} - NT$${filters.priceRange[1]}`}
                </span>
              </div>
              <Slider
                value={filters.priceRange}
                onValueChange={(value) => updateFilter('priceRange', value)}
                max={200}
                min={10}
                step={10}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>NT$10</span>
                <span>NT$200+</span>
              </div>
            </div>

            {/* Amenities Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">停車場設施</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {amenityOptions.map(amenity => (
                  <div
                    key={amenity.id}
                    className={`
                      flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors
                      ${filters.amenities.includes(amenity.id) 
                        ? 'border-primary bg-primary/5 text-primary' 
                        : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                    onClick={() => toggleAmenity(amenity.id)}
                  >
                    <span className="text-lg">{amenity.icon}</span>
                    <span className="text-sm">{amenity.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Time-based Filter */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <Label className="text-sm font-medium">營業時間篩選</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="24hours"
                  checked={filters.amenities.includes('24hours')}
                  onCheckedChange={() => toggleAmenity('24hours')}
                />
                <Label htmlFor="24hours" className="text-sm">24小時營業</Label>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}