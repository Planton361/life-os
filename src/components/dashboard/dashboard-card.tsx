import type { ReactNode } from "react";
import Link from "next/link";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  description?: string;
  count?: string | number;
  summary?: string;
  emphasis?: "default" | "today";
  children: ReactNode;
  footerHref?: string;
  footerLabel?: string;
  className?: string;
  contentClassName?: string;
}

export function DashboardCard({
  title,
  description,
  count,
  summary,
  emphasis = "default",
  children,
  footerHref,
  footerLabel,
  className,
  contentClassName,
}: DashboardCardProps) {
  return (
    <Card
      role="region"
      aria-label={title}
      className={cn(
        "h-fit border border-border/80 bg-card shadow-[var(--shadow-card)] ring-0 [--card-spacing:--spacing(3)]",
        emphasis === "today" &&
          "border-education/35 shadow-[var(--shadow-emphasis)]",
        className
      )}
    >
      <CardHeader>
        <div>
          <CardTitle>
            <h2
              className={cn(
                "text-base font-semibold leading-6",
                emphasis === "today" && "text-[1.05rem]"
              )}
            >
              {title}
            </h2>
          </CardTitle>
          {description ? (
            <CardDescription className="text-sm leading-5">
              {description}
            </CardDescription>
          ) : null}
        </div>
        {summary || count !== undefined ? (
          <CardAction>
            <span
              className={cn(
                "rounded-full border border-border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground",
                emphasis === "today" &&
                  "border-education/25 bg-education/10 text-education"
              )}
            >
              {summary ?? count}
            </span>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
      {footerHref && footerLabel ? (
        <CardFooter className="border-border/70 bg-transparent py-2">
          <Link
            href={footerHref}
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {footerLabel}
          </Link>
        </CardFooter>
      ) : null}
    </Card>
  );
}
