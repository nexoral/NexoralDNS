// Import Functions
import { IpConnectionCronJob } from "./Jobs/Connected_IP_fetcher.cron";
import BatchProcessAnalytics from "./Jobs/BatchAnalytics.cron";
import { Console } from "outers";
import { DashboardAnaliticalStatCronJob } from "./Jobs/DashboardAnalytics.cron";
import { LoadAccessControlPoliciesCronJob } from "./Jobs/LoadPolicies.cron";
import LogsExportWorker from "./Jobs/LogsExportWorker.cron";
import { CleanupExportsCronJob } from "./Jobs/CleanupExports.cron";

export default async function startCronJob() {
  Console.bright("Starting all Cron Jobs....")
  IpConnectionCronJob();
  BatchProcessAnalytics();
  DashboardAnaliticalStatCronJob();
  LoadAccessControlPoliciesCronJob();
  LogsExportWorker();
  CleanupExportsCronJob();
}