import type { Config } from "@netlify/functions";

/**
 * Netlify Scheduled Function: triggers the pipeline route every day at
 * 21:00 UTC (= 7am AEST / 8am AEDT). The route does the actual work —
 * ingest new feed items, then send whichever issues are due.
 */
const handler = async () => {
  const appUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");
  const res = await fetch(`${appUrl}/api/cron/daily`, {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  console.log(`daily-pipeline → ${res.status}: ${await res.text()}`);
};

export default handler;

export const config: Config = {
  schedule: "0 21 * * *",
};
