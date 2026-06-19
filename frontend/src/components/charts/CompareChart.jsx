import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function CompareChart({ data, title, dataKey }) {
  const getFillColor = (key) => {
    if (key === "followers") return "#6366f1"; // Indigo
    if (key === "avgViews") return "#8b5cf6"; // Purple
    return "#ec4899"; // Pink
  };

  return (
    <div className="space-y-4 bg-[#121318]/30 border border-white/[0.04] p-5 rounded-2xl">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
        {title}
      </h3>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255, 255, 255, 0.04)" vertical={false} />
          <XAxis
            dataKey="name"
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
              fontFamily: "sans-serif",
            }}
          />
          <Bar dataKey={dataKey} fill={getFillColor(dataKey)} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}