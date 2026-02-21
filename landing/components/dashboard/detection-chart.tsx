"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DetectionChartProps {
  data: Array<{ date: string; count: number }>;
}

export function DetectionChart({ data }: DetectionChartProps) {
  return (
    <div className="rounded-[22px] border border-border px-8 py-4">
      <p className="light-text mb-6 text-lg">
        Detection over time (30 days)
      </p>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3a8a8c" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3a8a8c" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(38,79,94,0.3)"
            />
            <XAxis
              dataKey="date"
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
              tickFormatter={(v: string) => v.slice(5)}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: "#0d1b20",
                border: "1px solid #264f5e",
                borderRadius: "12px",
                color: "#ffffff",
                fontSize: 13,
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#3a8a8c"
              fill="url(#colorCount)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
