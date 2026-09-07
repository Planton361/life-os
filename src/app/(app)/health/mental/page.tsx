import type { Metadata } from "next";
import { getHealthTrackingData } from "@/features/health/health-tracking";
import { getMentalReflectionContext } from "@/features/health/mental-context-data";
import { MentalContextPage } from "@/features/health/mental-context-page";
export const metadata: Metadata = { title: "Mental Health | Life OS", description: "Stimmung, Schlaf und persönliche Reflexion im Verlauf." };
export default async function MentalHealthPage({searchParams}:{searchParams:Promise<{health?:string}>}) {
 const [data,reflection,params]=await Promise.all([getHealthTrackingData(),getMentalReflectionContext(),searchParams]);
 return <MentalContextPage data={data} reflection={reflection} status={params.health}/>;
}
