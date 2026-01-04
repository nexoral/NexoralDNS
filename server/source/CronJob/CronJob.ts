// Import Functions
import { IpConnectionCronJob } from "./Jobs/Connected_IP_fetcher.cron";
import BatchProcessAnalytics from "./Jobs/BatchAnalytics.cron";
import { Console } from "outers";
import { DashboardAnaliticalStatCronJob } from "./Jobs/DashboardAnalytics.cron";
import { LoadAccessControlPoliciesCronJob } from "./Jobs/LoadPolicies.cron";

export default async function startCronJob() {
  Console.bright("Starting all Cron Jobs....")
  IpConnectionCronJob();
  BatchProcessAnalytics();
  DashboardAnaliticalStatCronJob();
  LoadAccessControlPoliciesCronJob();
}