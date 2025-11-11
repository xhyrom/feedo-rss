import type { Item } from "rss-parser";
import { createFeed } from "./src/util.ts";
import { wasSent, markAsSent } from "./src/storage.ts";

export const feeds = [
  createFeed({
    feed: "https://dennikn.sk/feed",
    cron: "* * * * *",
    webhooks: [
      {
        url: process.env.DENNIKN_WEBHOOK,
        payload: (data) => {
          const categories: Record<string, string> = {
            komentare: "1437883640921985035",
            "ficova vlada": "1437883657263124572",
            "robert fico": "1437883671548792873",
            "sudna rada": "1437883697834627102",
            "ustavny sud": "1437883714918154360",
            skolstvo: "1437883729472131174",
            "vojna na ukrajine": "1437883744273961142",
            rusko: "1437883756018012171",
            "vladimir putin": "1437883768638669000",
            mladi: "1437883782257578185",
          };
          const tags: string[] = data.categories
            .map(
              (c) =>
                categories?.[
                  c
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                ]!,
            )
            .filter((c) => c);

          return {
            thread_name:
              data.title.length > 100
                ? `${data.title.slice(0, 97)}...`
                : data.title,
            content: `## ${data.title}\n\n${data.description}\n\n${data.link} <@&1437881478506610828>`,
            applied_tags: tags,
            allowed_mentions: {
              roles: ["1437881478506610828"],
            },
          };
        },
      },
    ],
    fetch: (item: Item) => {
      return {
        title: item.title!,
        description: item.contentSnippet!,
        link: item.link!,
        categories: item.categories!,
      };
    },
    latest: async (item: Item, mark: boolean) => {
      if (await wasSent("dennikn", item.guid!)) {
        return false;
      }

      if (mark) await markAsSent("dennikn", item.guid!);

      return true;
    },
  }),
  createFeed({
    feed: "https://mastodon.social/@zssk_mimoriadne.rss",
    cron: "* * * * *",
    webhooks: [
      {
        url: process.env.ZSSK_MIMORIADNE_WEBHOOK,
        payload: (data) => ({
          content: `${data.description}\n\n${data.link} <@&1437202276392501369>`,
        }),
      },
    ],
    fetch: (item: Item) => ({
      description: item.contentSnippet,
      link: item.link,
      allowed_mentions: {
        roles: ["1437202276392501369"],
      },
    }),
    latest: async (item: Item, mark: boolean) => {
      if (await wasSent("zssk", item.guid!)) {
        return false;
      }

      if (mark) await markAsSent("zssk", item.guid!);

      return true;
    },
  }),
];
