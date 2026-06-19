import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function GrowthChart({ data = [] }) {
  console.log("GrowthChart Data:", data);

  return (
    <div className="space-y-4 bg-transparent">
      {data.length === 0 ? (
        <div className="h-[260px] flex flex-col items-center justify-center text-slate-500 font-medium text-xs bg-white/[0.01] border border-white/[0.04] border-dashed rounded-xl">
          <span>No historical checkpoints tracked.</span>
          <span className="text-[10px] text-slate-600 mt-1">Daily snapshot runs automatically.</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="followersGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="rgba(255, 255, 255, 0.04)" vertical={false} />

            <XAxis
              dataKey="date"
              tick={{ fill: "rgba(255, 255, 255, 0.4)", fontSize: 10, fontFamily: "monospace" }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              tick={{ fill: "rgba(255, 255, 255, 0.4)", fontSize: 10, fontFamily: "monospace" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) =>
                Intl.NumberFormat("en", {
                  notation: "compact",
                }).format(value)
              }
            />

            <Tooltip
              contentStyle={{
                background: "rgba(17, 19, 25, 0.9)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "12px",
                color: "#fff",
                fontSize: "12px",
              }}
              formatter={(value) => Number(value).toLocaleString()}
            />

            <Area
              type="monotone"
              dataKey="followers"
              stroke="#6366f1"
              fill="url(#followersGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
