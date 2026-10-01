import type React from "react";

export interface SkeletonLoaderProps {
  readonly rows?: number;
  readonly height?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  rows = 3,
  height = "2rem",
}) => {
  const items = Array.from({ length: rows }, (_, index) => index);

  return (
    <div
      role="status"
      aria-label="Carregando dados..."
      style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%" }}
    >
      {items.map((key) => (
        <div
          key={key}
          className="skeleton-box"
          style={{ height, width: "100%" }}
        />
      ))}
    </div>
  );
};
