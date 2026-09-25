import { NextResponse } from "next/server";
import { isSqliteProofRuntime } from "../../../../../experiments/issue-37/proof-gate";

export const runtime = "nodejs";

export async function POST() {
  if (!isSqliteProofRuntime()) return new NextResponse(null, { status: 404 });
  const { getProofOwnerId, holdProofWriteForCrash } = await import("../../../../../experiments/issue-37/sqlite-proof-runtime");
  const ownerId = await getProofOwnerId();
  if (!ownerId) return new NextResponse(null, { status: 401 });
  return NextResponse.json({ taskId: holdProofWriteForCrash(ownerId) });
}
