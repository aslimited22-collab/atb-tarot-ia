"use client";
import Sparkline from "./Sparkline";

type Props = {
  label: string;
  value: string;
  sublabel?: string;
  sparkData?: number[];
  sparkColor?: string;
};

export default function KpiTile({ label, value, sublabel, sparkData, sparkColor }: Props) {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 18,
        padding: "20px 22px",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        border: "1px solid rgba(0,0,0,0.05)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: 124,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 13,
            color: "#86868b",
            fontWeight: 500,
            letterSpacing: "-0.01em",
            marginBottom: 8,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#1d1d1f",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1.1,
          }}
        >
          {value}
        </div>
        {sublabel && (
          <div
            style={{
              fontSize: 12,
              color: "#86868b",
              marginTop: 4,
              fontWeight: 500,
            }}
          >
            {sublabel}
          </div>
        )}
      </div>
      {sparkData && sparkData.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <Sparkline data={sparkData} color={sparkColor} width={120} height={32} />
        </div>
      )}
    </div>
  );
}
