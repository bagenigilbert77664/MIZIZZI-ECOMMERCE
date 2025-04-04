"use client"

interface RegionData {
  region: string
  count: number
  percentage: number
}

interface UsersByRegionMapProps {
  data: RegionData[]
}

export function UsersByRegionMap({ data = [] }: UsersByRegionMapProps) {
  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4">Users by Region</h3>

      {data.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No regional data available</div>
      ) : (
        <div className="space-y-4">
          {/* Placeholder for actual map visualization */}
          <div className="h-[200px] bg-muted/20 rounded-lg flex items-center justify-center">
            <span className="text-muted-foreground">Interactive map visualization</span>
          </div>

          <div className="grid gap-2">
            {data.slice(0, 5).map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" style={{ opacity: 0.5 + item.percentage / 200 }} />
                  <span>{item.region}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{item.count}</span>
                  <span className="text-xs text-muted-foreground">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

