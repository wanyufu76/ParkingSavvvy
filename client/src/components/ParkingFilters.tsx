import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Filter, X, MapPin, DollarSign } from "lucide-react";

interface FilterOptions {
  searchTerm: string;
  distanceRange: number[]; // [min, max]
  priceRange: number[]; // [min, max]
  sortBy: string;
}

interface ParkingFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onClearFilters: () => void;
}

const sortOptions = [
  { value: "distance", label: "距離優先" },
  { value: "recent", label: "最近更新" },
];

export default function ParkingFilters({ filters, onFiltersChange, onClearFilters }: ParkingFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // ✅ local state 只存「上限」
  const [maxDistance, setMaxDistance] = useState(filters.distanceRange[1]);
  const [maxPrice, setMaxPrice] = useState(filters.priceRange[1]);

  // ✅ 保持同步（外層清除或更新時）
  useEffect(() => {
    setMaxDistance(filters.distanceRange[1]);
  }, [filters.distanceRange]);

  useEffect(() => {
    setMaxPrice(filters.priceRange[1]);
  }, [filters.priceRange]);

  const updateFilter = (key: keyof FilterOptions, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const hasActiveFilters = maxDistance < 5000 || maxPrice < 200;

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        {/* 搜尋欄位 */}
        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="搜尋停車場名稱或地址..."
              className="pl-10"
              value={filters.searchTerm}
              onChange={(e) => updateFilter("searchTerm", e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant={isExpanded ? "default" : "outline"}
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              篩選條件
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                  {[
                    maxDistance < 5000 && "距離",
                    maxPrice < 200 && "價格",
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

        {/* 排序方式 */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Select
            value={filters.sortBy}
            onValueChange={(value) => updateFilter("sortBy", value)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="排序方式" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 進階篩選內容 */}
        {isExpanded && (
          <div className="border-t pt-4 space-y-6">
            {/* 距離範圍（單滑桿 + Tooltip） */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <Label className="text-sm font-medium">距離上限</Label>
                <span className="text-sm font-semibold text-primary">
                  {maxDistance >= 5000 ? "5km 以內" : `${maxDistance}m 以內`}
                </span>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Slider
                      value={[maxDistance]}
                      onValueChange={(value) => setMaxDistance(value[0])}
                      onValueCommit={(value) =>
                        updateFilter("distanceRange", [100, value[0]])
                      }
                      max={5000}
                      min={100}
                      step={100}
                      className="w-full"
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{maxDistance >= 5000 ? "5km+" : `${maxDistance}m`}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="flex justify-between text-xs text-gray-500">
                <span>100m</span>
                <span>500m</span>
                <span>1000m</span>
                <span>2000m</span>
                <span>3000m</span>
                <span>4000m</span>
                <span>5km+</span>
              </div>
            </div>

            {/* 價格範圍（單滑桿 + Tooltip） */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <Label className="text-sm font-medium">價格上限 (每小時)</Label>
                <span className="text-sm font-semibold text-primary">
                  {maxPrice >= 50 ? "NT$100+" : `NT$${maxPrice} 以下`}
                </span>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Slider
                      value={[maxPrice]}
                      onValueChange={(value) => setMaxPrice(value[0])}
                      onValueCommit={(value) =>
                        updateFilter("priceRange", [10, value[0]])
                      }
                      max={50}
                      min={10}
                      step={10}
                      className="w-full"
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{maxPrice >= 50 ? "NT$50+" : `NT$${maxPrice}`}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="flex justify-between text-xs text-gray-500">
                <span>NT$10</span>
                <span>NT$20</span>
                <span>NT$30</span>
                <span>NT$40</span>
                <span>NT$50+</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
