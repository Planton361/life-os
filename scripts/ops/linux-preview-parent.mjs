// The serving child uses normal Node conditions, not the operator's native
// react-server loader. Parent loss requests Next's own graceful drain/close.
const parent = Number(process.env.LIFE_OS_LINUX_OPERATOR_PID);
if (!Number.isSafeInteger(parent) || parent <= 1 || parent !== process.ppid)
  throw new Error("LINUX_OPERATOR_PARENT_REQUIRED");
delete process.env.LIFE_OS_LINUX_OPERATOR_PID;
const watcher = setInterval(() => {
  if (process.ppid !== parent) {
    clearInterval(watcher);
    process.kill(process.pid, "SIGTERM");
  }
}, 250);
watcher.unref();
