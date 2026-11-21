"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { LulcYearData } from "@/data/types";
import { getClassColor } from "@/data/constants";

interface LulcBarChartProps {
  data: LulcYearData | undefined;
  height?: number;
}

export default function LulcBarChart({ data, height = 250 }: LulcBarChartProps) {
  if (!data) return <div className="flex items-center justify-center h-full text-muted-foreground">No data available</div>;

  const chartData = data.classes.map((c) => ({
    name: c.className.replace(/_/g, " "),
    percentage: c.percentage,
    areaHa: c.areaHa,
    fill: getClassColor(c.classId),
  }));

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={1}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
          <XAxis type="number" hide />
          <YAxis 
            dataKey="name" 
            type="category" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12 }}
            width={80}
          />
          <Tooltip 
            formatter={(value: any, name: any, props: any) => [
              `${Number(value).toFixed(1)}% (${props.payload.areaHa.toLocaleString()} ha)`, 
              ""
            ]}
            labelFormatter={() => ""}
          />
          <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
            {
              /* Color is handled by the fill property in data */
            }
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
