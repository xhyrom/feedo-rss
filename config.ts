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
        payload: (data) => {
          const lines = data.description
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l.length > 0);

          const trainRegex =
            /^((?:Os|R|Ex|EC|REX|RR|IC|EN|SC)\s+\d+\s*\([^)]+\))/;
          const delayRegex = /(\d+\s*min(?:\.|út)?)/i;

          const trainLines = [];
          const commonInfoLines = [];
          const embeds = [];

          for (const line of lines) {
            if (trainRegex.test(line)) {
              trainLines.push(line);
            } else {
              commonInfoLines.push(line);
            }
          }

          if (trainLines.length === 0 && commonInfoLines.length > 0) {
            const description = commonInfoLines.join("\n");
            const allText = description.toLowerCase();
            let color = 0x1da1f2; // Blue
            let title = "🔔 Informácia";

            if (allText.includes("odrieknutý")) {
              color = 0xff0000;
              title = "🔴 Odrieknutý vlak";
            } else if (allText.includes("mešká")) {
              color = 0xffa500;
              title = "🟠 Meškanie vlaku";
            }

            embeds.push({
              title,
              color,
              description,
              url: data.link,
              footer: { text: "ZSSK Mimoriadne • Mastodon" },
              timestamp: data.timestamp.toISOString(),
            });
          } else {
            const commonInfoText =
              commonInfoLines.length > 0
                ? `> ${commonInfoLines.join("\n> ")}`
                : "";

            for (const trainLine of trainLines) {
              const match = trainLine.match(trainRegex)!;
              const trainName = match[1]!.trim();
              let status = trainLine.substring(match[0].length).trim();
              if (!status) status = "Očakávajte ďalšie informácie.";

              const fullText = trainLine.toLowerCase();
              let color = 0x1da1f2;
              let title = "🔔 Informácia o vlaku";

              if (fullText.includes("odrieknutý")) {
                color = 0xff0000;
                title = "🔴 Odrienknutý vlak";
              } else if (fullText.includes("mešká")) {
                color = 0xffa500;
                title = "🟠 Meškanie vlaku";
              }

              const fields = [];
              const delayMatch = status.match(delayRegex);

              if (delayMatch) {
                fields.push({
                  name: `🚂 Vlak`,
                  value: `**${trainName}**`,
                  inline: true,
                });
                fields.push({
                  name: `⏰ Meškanie`,
                  value: `**${delayMatch[0]}**`,
                  inline: true,
                });

                const remainingStatus = status.replace(delayRegex, "").trim();
                if (remainingStatus) {
                  fields.push({
                    name: `📝 Stav`,
                    value: remainingStatus,
                    inline: false,
                  });
                }
              } else {
                fields.push({
                  name: `🚂 Vlak`,
                  value: `**${trainName}**`,
                  inline: false,
                });
                fields.push({
                  name: `📝 Stav`,
                  value: status,
                  inline: false,
                });
              }

              if (commonInfoText) {
                fields.push({
                  name: "ℹ️ Spoločné informácie",
                  value: commonInfoText,
                  inline: false,
                });
              }

              embeds.push({
                title,
                color,
                url: data.link,
                fields,
                footer: { text: "ZSSK Mimoriadne • Mastodon" },
                timestamp: data.timestamp.toISOString(),
              });
            }
          }

          if (embeds.length === 0) {
            return {
              content: `${data.description}\n\n<@&1437202276392501369>`,
              allowed_mentions: { roles: ["1437202276392501369"] },
            };
          }

          return {
            embeds: embeds.slice(0, 10),
            content: "<@&1437202276392501369>",
            allowed_mentions: { roles: ["1437202276392501369"] },
          };
        },
      },
    ],
    fetch: (item: Item) => {
      return {
        timestamp: new Date(item.pubDate!),
        description: item.contentSnippet!,
        link: item.link!,
      };
    },
    latest: async (item: Item, mark: boolean) => {
      if (await wasSent("zssk", item.guid!)) return false;
      if (mark) await markAsSent("zssk", item.guid!);
      return true;
    },
  }),
];
