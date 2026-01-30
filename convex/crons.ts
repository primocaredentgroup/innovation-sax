import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Venerdì alle 14:00 CET (13:00 UTC in inverno, 12:00 UTC in estate)
// Uso 13:00 UTC per approssimare CET standard
crons.cron(
  "weekly core app reminder",
  "0 13 * * 5",
  internal.emails.sendWeeklyReminder,
  {}
);

export default crons;
