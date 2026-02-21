"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  RISK_COLORS,
  type Category,
  type RiskLevel,
} from "@/lib/constants";

interface TrendsChartsProps {
  dailyTrend: Array<{ date: string; count: number }>;
  categoryData: Record<string, number>;
  riskData: Record<string, number>;
  marketplaceData: Array<{ name: string; total: number; malicious: number }>;
}

const TOOLTIP_STYLE = {
  background: "#0d1b20",
  border: "1px solid #264f5e",
  borderRadius: "12px",
  color: "#ffffff",
  fontSize: 13,
};

const AXIS_TICK = { fill: "rgba(255,255,255,0.4)", fontSize: 11 };
const GRID_STROKE = "rgba(38,79,94,0.3)";

export function TrendsCharts({
  dailyTrend,
  categoryData,
  riskData,
  marketplaceData,
}: TrendsChartsProps) {
  const pieData = Object.entries(riskData)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value,
      color: RISK_COLORS[key as RiskLevel] || "#264f5e",
    }));

  const categoryChartData = Object.entries(categoryData).map(
    ([key, value]) => ({
      name: CATEGORY_LABELS[key as Category] || key,
      value,
      color: CATEGORY_COLORS[key as Category] || "#264f5e",
    })
  );

  return (
    <div className="space-y-6">
      {/* Detection timeline */}
      <div className="rounded-[22px] border border-border px-8 py-4">
        <p className="light-text mb-6 text-lg">
          Detection Timeline (30 days)
        </p>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyTrend}>
              <defs>
                <linearGradient
                  id="trendGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#3a8a8c" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3a8a8c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis
                dataKey="date"
                tick={AXIS_TICK}
                tickFormatter={(v: string) => v.slice(5)}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#3a8a8c"
                fill="url(#trendGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Risk distribution pie */}
        <div className="rounded-[22px] border border-border px-8 py-4">
          <p className="light-text mb-6 text-lg">
            Risk Distribution
          </p>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="rounded-[22px] border border-border px-8 py-4">
          <p className="light-text mb-6 text-lg">
            Findings by Category
          </p>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={GRID_STROKE}
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                  width={130}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {categoryChartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Marketplace comparison */}
      <div className="rounded-[22px] border border-border px-8 py-4">
        <p className="light-text mb-6 text-lg">
          Packages by Marketplace
        </p>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={marketplaceData}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis
                dataKey="name"
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar
                dataKey="total"
                name="Total"
                fill="#3a8a8c"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="malicious"
                name="Malicious"
                fill="#e05252"
                radius={[4, 4, 0, 0]}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
