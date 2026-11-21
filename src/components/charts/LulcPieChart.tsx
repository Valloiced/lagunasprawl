"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { LulcYearData } from "@/data/types";
import { getClassColor } from "@/data/constants";

interface LulcPieChartProps {
  data: LulcYearData | undefined;
  height?: number;
}

export default function LulcPieChart({ data, height = 300 }: LulcPieChartProps) {
  if (!data) return <div className="flex items-center justify-center h-full text-muted-foreground">No data available</div>;

  const chartData = data.classes
    .filter((c) => c.areaHa > 0)
    .map((c) => ({
      name: c.className.replace(/_/g, " "),
      value: c.percentage,
      areaHa: c.areaHa,
      color: getClassColor(c.classId),
    }));

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={1}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: any, name: any, props: any) => [
              `${Number(value).toFixed(1)}% (${props.payload.areaHa.toLocaleString()} ha)`, 
              name
            ]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
