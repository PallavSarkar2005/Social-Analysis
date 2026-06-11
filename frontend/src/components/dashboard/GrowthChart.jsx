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
    <div className="bg-white p-8 rounded-3xl shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Subscriber Growth Trend</h2>

        <span className="text-sm text-gray-500">Real Historical Data</span>
      </div>

      {data.length === 0 ? (
        <div className="h-[350px] flex items-center justify-center text-gray-500">
          No historical data available yet.
          <br />
          Analyze this channel multiple times to build growth history.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={data}>
            <defs>
              <linearGradient
                id="followersGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />

            <XAxis dataKey="date" tick={{ fontSize: 12 }} />

            <YAxis
              tickFormatter={(value) =>
                Intl.NumberFormat("en", {
                  notation: "compact",
                }).format(value)
              }
            />

            <Tooltip formatter={(value) => Number(value).toLocaleString()} />

            <Area
              type="monotone"
              dataKey="followers"
              stroke="#7C3AED"
              fill="url(#followersGradient)"
              strokeWidth={3}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
