"use client";

import React from "react";

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

interface DateRangePickerProps {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  className?: string;
  showLabel?: boolean;
}

export function DateRangePicker({ dateRange, setDateRange, className = "", showLabel = false }: DateRangePickerProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let from = dateRange.from;
    let to = dateRange.to;
    if (name === "from") {
      from = value ? new Date(value) : null;
    } else {
      to = value ? new Date(value) : null;
    }
    setDateRange({ from, to });
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {showLabel && <span className="text-sm font-medium">Date Range</span>}
      <div className="flex items-center gap-2">
        <input
          type="date"
          name="from"
          value={dateRange.from ? dateRange.from.toISOString().split("T")[0] : ""}
          onChange={handleChange}
          className="border rounded px-2 py-1"
        />
        <span className="mx-1">to</span>
        <input
          type="date"
          name="to"
          value={dateRange.to ? dateRange.to.toISOString().split("T")[0] : ""}
          onChange={handleChange}
          className="border rounded px-2 py-1"
        />
      </div>
    </div>
  );
}
        // Yesterday
