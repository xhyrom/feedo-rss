import Parser from "rss-parser";
import { feeds } from "../config.js";
import { scheduleFeeds } from "./scheduler.js";

const rssParser = new Parser();

const feedsByCron = feeds.reduce((acc, feed) => {
  if (!acc.has(feed.cron)) {
    acc.set(feed.cron, []);
  }

  acc.get(feed.cron)!.push(feed);
  return acc;
}, new Map());

scheduleFeeds(feedsByCron, rssParser);

console.log(
  `Scheduled ${feedsByCron.size} cron groups with ${feeds.length} total feeds`,
);
