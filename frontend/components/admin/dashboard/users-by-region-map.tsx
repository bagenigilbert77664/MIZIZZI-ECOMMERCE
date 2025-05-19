"use client"

import { motion } from "framer-motion"
import { Globe, MapPin } from "lucide-react"

interface RegionData {
  region: string
  count: number
  percentage: number
}

interface UsersByRegionMapProps {
  data: RegionData[]
}

export function UsersByRegionMap({ data = [] }: UsersByRegionMapProps) {
  // Colors for the map regions
  const regionColors = [
    "bg-cherry-500",
    "bg-blue-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-purple-500",
    "bg-cyan-500",
  ]

  return (
    <div>
      <h3 className="text-lg font-semibold p-6 border-b border-gray-100 dark:border-gray-700">Users by Region</h3>

      {data.length === 0 ? (
        <div className="p-6 text-center">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4">
              <Globe className="h-10 w-10 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No regional data available</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
              Start tracking user locations to see regional distribution data here.
            </p>
            <button className="mt-4 px-4 py-2 bg-cherry-600 hover:bg-cherry-700 text-white rounded-lg text-sm font-medium transition-colors">
              Set Up Location Tracking
            </button>
          </div>
        </div>
      ) : (
        <div className="p-6 space-y-6">
          {/* Interactive map visualization */}
          <div className="relative h-[180px] bg-gray-50 dark:bg-gray-800/50 rounded-lg overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <svg viewBox="0 0 800 450" className="w-full h-full">
                <path
                  d="M244,109L233,183L311,169L320,92M417,74L425,162L354,170M513,82L493,165L425,162M682,98L539,174L493,165M244,109L156,121L233,183M156,121L139,221L233,183M139,221L311,169L233,183M320,92L311,169L354,170L417,74M513,82L417,74L425,162M682,98L513,82L493,165M682,98L539,174M425,162L493,165L539,174L354,170M311,169L354,170"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-gray-400 dark:text-gray-600"
                />
                {data.map((region, index) => (
                  <motion.circle
                    key={index}
                    cx={150 + index * 100}
                    cy={150 + (index % 2) * 50}
                    r={Math.max(15, region.percentage / 3)}
                    className={regionColors[index % regionColors.length]}
                    initial={{ r: 0, opacity: 0 }}
                    animate={{ r: Math.max(15, region.percentage / 3), opacity: 0.7 }}
                    transition={{ duration: 1, delay: index * 0.1 }}
                  />
                ))}
              </svg>
            </div>

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white/80 dark:bg-gray-800/80 px-4 py-2 rounded-lg shadow-sm backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-cherry-500" />
                  <span className="text-sm font-medium">
                    {data.reduce((sum, item) => sum + item.count, 0).toLocaleString()} users across {data.length}{" "}
                    regions
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Region list */}
          <div className="space-y-3">
            {data.map((item, index) => (
              <motion.div
                key={index}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${regionColors[index % regionColors.length]}`} />
                  <span className="font-medium">{item.region}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${regionColors[index % regionColors.length]}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${item.percentage}%` }}
                      transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                    />
                  </div>
                  <span className="text-sm font-medium">{item.count.toLocaleString()}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right">{item.percentage}%</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
