// Import Functions
import { IpConnectionCronJob } from "./Connected_IP_fetcher.cron";
import BatchProcessAnalytics from "./BatchAnalytics.cron";
import { Console } from "outers";

export default async function startCronJob () {
  Console.bright("Starting all Cron Jobs....")
  IpConnectionCronJob();
  BatchProcessAnalytics();

}