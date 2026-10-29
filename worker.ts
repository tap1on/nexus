// Background sync worker. Run with: npm run worker
// - Every SYNC_INTERVAL_MINUTES (default 30): re-pull last 7 days
// - Nightly at 03:30 Berlin: re-pull last 30 days (catches late conversions,
//   since revenue is attributed to conversion date)
import cron from "node-cron";
import { syncAll } from "./lib/sync";
import { REPORTING_TZ } from "./lib/dates";

const intervalMin = Math.max(
  5,
  parseInt(process.env.SYNC_INTERVAL_MINUTES || "30", 10)
);
const FAST_LOOKBACK_DAYS = parseInt(process.env.FAST_LOOKBACK_DAYS || "7", 10);
const DEEP_LOOKBACK_DAYS = parseInt(process.env.DEEP_LOOKBACK_DAYS || "30", 10);

let running = false;
async function runSync(lookback: number, label: string) {
  if (running) {
    console.log(`[worker] skip ${label}: previous sync still running`);
    return;
  }
  running = true;
  const t0 = Date.now();
  console.log(`[worker] ${label} sync started (${lookback}d lookback)`);
  try {
    await syncAll(lookback);
    console.log(
      `[worker] ${label} sync finished in ${Math.round((Date.now() - t0) / 1000)}s`
    );
  } catch (e) {
    console.error(`[worker] ${label} sync failed:`, e);
  } finally {
    running = false;
  }
}

console.log(
  `[worker] Nexus sync worker online. Interval: ${intervalMin}m, fast lookback: ${FAST_LOOKBACK_DAYS}d, deep lookback: ${DEEP_LOOKBACK_DAYS}d`
);

cron.schedule(`*/${intervalMin} * * * *`, () =>
  runSync(FAST_LOOKBACK_DAYS, "fast")
);
cron.schedule("30 3 * * *", () => runSync(DEEP_LOOKBACK_DAYS, "deep"), {
  timezone: REPORTING_TZ,
});

// Initial pass on boot
runSync(FAST_LOOKBACK_DAYS, "boot");
