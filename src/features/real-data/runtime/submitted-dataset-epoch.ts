import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
type Submission = { epoch: string | undefined; stale: boolean };
const server = globalThis as typeof globalThis & {
  __lifeOsDatasetSubmission?: AsyncLocalStorage<Submission>;
};
const storage = (server.__lifeOsDatasetSubmission ??=
  new AsyncLocalStorage<Submission>());
export const submittedDatasetEpoch = () => storage.getStore()?.epoch;
export function markDatasetStaleSubmission() {
  const request = storage.getStore();
  if (request) request.stale = true;
}
export function withDatasetSubmission<T>(
  epoch: string | undefined,
  body: (request: Submission) => T,
): T {
  const request = { epoch: epoch ?? storage.getStore()?.epoch, stale: false };
  return storage.run(request, () => body(request));
}
