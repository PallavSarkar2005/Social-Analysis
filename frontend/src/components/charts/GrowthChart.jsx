import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function GrowthChart({ data }) {
  return (
    <div className="space-y-4 bg-[#121318]/30 border border-white/[0.04] p-5 rounded-2xl">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
        Node Growth progression
      </h3>

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
          />

          <Tooltip
            contentStyle={{
              background: "rgba(17, 19, 25, 0.9)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              color: "#fff",
              fontSize: "12px",
            }}
          />

          <Line
            type="monotone"
            dataKey="followers"
            stroke="#8b5cf6" // Purple
            strokeWidth={2}
            dot={{ fill: "#8b5cf6", strokeWidth: 1 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}