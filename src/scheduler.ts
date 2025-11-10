import cron from "node-cron";
import type Parser from "rss-parser";
import type { Feed } from "./util";
import { processFeed } from "./processor";

export function scheduleFeeds(
  feedsByCron: Map<string, Feed<any>[]>,
  parser: Parser,
) {
  for (const [cronExpression, feedGroup] of feedsByCron) {
    cron.schedule(cronExpression, async () => {
      console.log(
        `Running ${feedGroup.length} feeds for cron: ${cronExpression}`,
      );

      await Promise.allSettled(
        feedGroup.map((feed) => processFeed(feed, parser)),
      );
    });
  }
}
