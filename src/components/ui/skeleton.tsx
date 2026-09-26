import type { HTMLAttributes } from "react";

type SkeletonProps = Readonly<HTMLAttributes<HTMLSpanElement>>;

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={`skeleton block ${className}`}
      {...props}
    />
  );
}
