"use client";

export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        background: "linear-gradient(90deg, var(--border-subtle) 25%, var(--border-default) 50%, var(--border-subtle) 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
        borderRadius: "var(--radius-sm, 6px)",
        ...style,
      }}
    />
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`glass-card ${className}`} style={{ minHeight: "120px" }}>
      <Skeleton style={{ height: "24px", width: "60%", marginBottom: "1rem" }} />
      <Skeleton style={{ height: "32px", width: "40%" }} />
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="glass-card">
      <Skeleton style={{ height: "24px", width: "30%", marginBottom: "1.5rem" }} />
      <div className="tableWrapper">
        <div className="tableHead">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} style={{ height: "16px", width: "80%" }} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="tableRow">
            {Array.from({ length: columns }).map((_, col) => (
              <Skeleton key={col} style={{ height: "20px", width: "70%" }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonStatsGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="statsGrid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonList({ items = 5 }: { items?: number }) {
  return (
    <div className="glass-card">
      <Skeleton style={{ height: "24px", width: "40%", marginBottom: "1.5rem" }} />
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} style={{ padding: "1rem 0", borderBottom: "1px solid var(--light-border)" }}>
          <Skeleton style={{ height: "18px", width: "50%", marginBottom: "0.5rem" }} />
          <Skeleton style={{ height: "14px", width: "70%" }} />
        </div>
      ))}
    </div>
  );
}