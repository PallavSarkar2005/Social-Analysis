import { useRef, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Download, Maximize2, Minimize2 } from "lucide-react";
import InsufficientData from "./InsufficientData";
import { getMetricColor } from "../../config/metricColors";

const MIN_POINTS = 2;

function ChartTooltip({ active, payload, label, valueFormatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111319] border border-white/10 rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="text-slate-400 mb-1 font-medium">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="font-semibold" style={{ color: entry.color }}>
          {entry.name || entry.dataKey}:{" "}
          {valueFormatter
            ? valueFormatter(entry.value, entry.dataKey)
            : Number(entry.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
}

/**
 * Shared analytics chart — only renders when verified points >= minPoints.
 * Never fabricates series data.
 */
export default function AnalyticsChart({
  data = [],
  series = [],
  type = "area",
  xKey = "date",
  height = 280,
  minPoints = MIN_POINTS,
  availability = null,
  emptyReason = "No verified historical data available yet.",
  emptyTitle = "Insufficient verified data",
  valueFormatter = null,
  showLegend = true,
  showDownload = true,
  showFullscreen = true,
  className = "",
}) {
  const containerRef = useRef(null);
  const [fullscreen, setFullscreen] = useState(false);

  const primaryKey = series[0]?.dataKey;
  const avail =
    availability && primaryKey
      ? availability[primaryKey] || availability[series[0]?.metric] || null
      : null;

  const verifiedData = Array.isArray(data)
    ? data.filter((row) =>
        series.some(
          (s) => row[s.dataKey] !== undefined && row[s.dataKey] !== null
        )
      )
    : [];

  const hasEnough =
    avail?.available !== false && verifiedData.length >= minPoints;

  if (!hasEnough) {
    return (
      <InsufficientData
        title={emptyTitle}
        reason={avail?.reason || emptyReason}
        metric={primaryKey}
        minHeight={height}
        className={className}
      />
    );
  }

  const handleDownload = () => {
    const svg = containerRef.current?.querySelector("svg");
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${primaryKey || "chart"}-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ChartComponent =
    type === "line" ? LineChart : type === "bar" ? BarChart : AreaChart;

  return (
    <div
      ref={containerRef}
      className={`relative ${fullscreen ? "fixed inset-4 z-50 bg-[#090a0f] p-4 rounded-2xl border border-white/10 shadow-2xl" : ""} ${className}`}
      style={{ height: fullscreen ? "calc(100vh - 2rem)" : height }}
    >
      {(showDownload || showFullscreen) && (
        <div className="absolute top-0 right-0 z-10 flex gap-1">
          {showDownload && (
            <button
              type="button"
              onClick={handleDownload}
              className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition"
              title="Download chart"
            >
              <Download size={14} />
            </button>
          )}
          {showFullscreen && (
            <button
              type="button"
              onClick={() => setFullscreen((v) => !v)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition"
              title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          )}
        </div>
      )}

      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent data={verifiedData} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
          <defs>
            {series.map((s) => {
              const color = s.color || getMetricColor(s.metric || s.dataKey);
              return (
                <linearGradient key={`grad-${s.dataKey}`} id={`grad-${s.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey={xKey}
            tick={{ fill: "#64748b", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#64748b", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            content={<ChartTooltip valueFormatter={valueFormatter} />}
            cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }}
          />
          {showLegend && <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />}
          {series.map((s) => {
            const color = s.color || getMetricColor(s.metric || s.dataKey);
            if (type === "bar") {
              return (
                <Bar
                  key={s.dataKey}
                  dataKey={s.dataKey}
                  name={s.name || s.dataKey}
                  fill={color}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive
                />
              );
            }
            if (type === "line") {
              return (
                <Line
                  key={s.dataKey}
                  type="monotone"
                  dataKey={s.dataKey}
                  name={s.name || s.dataKey}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  isAnimationActive
                  connectNulls={false}
                />
              );
            }
            return (
              <Area
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                name={s.name || s.dataKey}
                stroke={color}
                fill={`url(#grad-${s.dataKey})`}
                strokeWidth={2}
                isAnimationActive
                connectNulls={false}
              />
            );
          })}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}
