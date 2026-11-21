"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AreaLulcProfile } from "@/data/types";
import { getClassColor } from "@/data/constants";

interface LulcTimeSeriesChartProps {
  profile: AreaLulcProfile | null;
  height?: number;
}

export default function LulcTimeSeriesChart({ profile, height = 350 }: LulcTimeSeriesChartProps) {
  const data = useMemo(() => {
    if (!profile) return [];
    
    return profile.yearlyData.map((yd) => {
      const dataPoint: any = { year: yd.year, isPredicted: yd.isPredicted };
      yd.classes.forEach((c) => {
        dataPoint[c.className] = c.percentage;
      });
      return dataPoint;
    });
  }, [profile]);

  if (!profile || data.length === 0) {
    return <div className="flex justify-center items-center h-full text-muted-foreground">No data available</div>;
  }

  // Define keys based on the colors object. Ensure we use the exact class names.
  const classNames = profile.yearlyData[0].classes.map(c => c.className).reverse();
  const classIds = profile.yearlyData[0].classes.map(c => c.classId).reverse();
  // We reverse so Built-up is at the top/bottom depending on stacking behavior
  
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={1}>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="year" />
          <YAxis 
            tickFormatter={(val) => `${val}%`}
            domain={[0, 100]}
          />
          <Tooltip 
            formatter={(value: any, name: any) => [`${Number(value).toFixed(1)}%`, String(name).replace(/_/g, " ")]} 
            labelFormatter={(label) => `Year: ${label}`}
          />
          
          {classNames.map((name, i) => {
            const classId = classIds[i];
            const color = getClassColor(classId);
            return (
               <Area 
                 key={name}
                 type="monotone" 
                 dataKey={name} 
                 stackId="1" 
                 stroke={color} 
                 fill={color} 
               />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
