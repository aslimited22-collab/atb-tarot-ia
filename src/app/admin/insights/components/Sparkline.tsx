"use client";

type Props = {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
};

export default function Sparkline({ data, color = "#0071e3", width = 100, height = 30 }: Props) {
  if (!data || data.length === 0) {
    return <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} />;
  }
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = Math.max(max - min, 1);
  const points = data.map((v, i) => {
    const x = data.length === 1 ? width / 2 : (i / (data.length - 1)) * width;
    const y = height - 2 - ((v - min) / range) * (height - 4);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const path = `M ${points.join(" L ")}`;
  const fillPath = `${path} L ${width},${height} L 0,${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <path d={fillPath} fill={color} opacity={0.1} />
      <path d={path} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
