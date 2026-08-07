"use client";

import * as React from "react";
import { generateQrMatrix } from "@/lib/qrcode";
import { cn } from "@/lib/utils";

interface QrCodeProps {
  value: string;
  size?: number;
  margin?: number;
  dark?: string;
  light?: string;
  className?: string;
  logoText?: string;
}

export function QrCode({
  value,
  size = 240,
  margin = 4,
  dark = "#0f172a",
  light = "#ffffff",
  className,
  logoText,
}: QrCodeProps) {
  const matrix = React.useMemo(() => {
    try {
      return generateQrMatrix(value);
    } catch {
      return null;
    }
  }, [value]);

  if (!matrix) {
    return (
      <div
        className={cn("flex items-center justify-center rounded-lg border bg-muted", className)}
        style={{ width: size, height: size }}
      >
        <span className="text-xs text-muted-foreground">QR unavailable</span>
      </div>
    );
  }

  const count = matrix.length;
  const total = count + margin * 2;
  const cell = size / total;

  let path = "";
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (matrix[r][c]) {
        const x = ((c + margin) * cell).toFixed(2);
        const y = ((r + margin) * cell).toFixed(2);
        path += `M${x} ${y}h${cell.toFixed(2)}v${cell.toFixed(2)}h-${cell.toFixed(2)}z`;
      }
    }
  }

  const badge = size * 0.2;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className={cn("rounded-lg", className)}
      role="img"
      aria-label="UPI payment QR code"
    >
      <rect width={size} height={size} fill={light} rx={8} />
      <path d={path} fill={dark} />
      {logoText && (
        <>
          <rect
            x={(size - badge) / 2}
            y={(size - badge) / 2}
            width={badge}
            height={badge}
            rx={badge * 0.22}
            fill={light}
            stroke={dark}
            strokeWidth={size * 0.006}
          />
          <text
            x={size / 2}
            y={size / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="Georgia, serif"
            fontWeight="700"
            fontSize={badge * 0.44}
            fill={dark}
          >
            {logoText}
          </text>
        </>
      )}
    </svg>
  );
}
