import type { ReactNode } from "react";

import { CompactList } from "@/components/dashboard/compact-list";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import type { SnapshotData } from "@/features/dashboard/types";

interface SnapshotCardProps {
  snapshot: SnapshotData;
  children?: ReactNode;
}

export function SnapshotCard({ snapshot, children }: SnapshotCardProps) {
  return (
    <DashboardCard
      title={snapshot.title}
      description={snapshot.description}
      count={snapshot.items.length}
    >
      <div className="space-y-3">
        {children}
        <CompactList items={snapshot.items} />
      </div>
    </DashboardCard>
  );
}
