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
          const getEmbedStatus = (text, isTrainSpecific) => {
            const lowerText = text.toLowerCase();
            if (lowerText.includes("odrieknutý")) {
              return { color: 0xff0000, title: "🔴 Odrieknutý vlak" };
            }
            if (lowerText.includes("mešká") || lowerText.includes("meškanie")) {
              return { color: 0xffa500, title: "🟠 Meškanie vlaku" };
            }
            if (
              lowerText.includes("prerušenie") ||
              lowerText.includes("prerušená")
            ) {
              return { color: 0x8000ff, title: "🟣 Prerušená doprava" };
            }

            return {
              color: 0x1da1f2,
              title: isTrainSpecific
                ? "🔔 Informácia o vlaku"
                : "🔔 Informácia",
            };
          };

          const lines = data.description
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l.length > 0);

          const trainRegex =
            /^((?:Os|R|Ex|EC|REX|RR|IC|EN|SC)\s+\d+\s*\([^)]+\))/;
          const delayRegex = /(\d+\s*min(?:\.|út)?)/i;

          const trainLines = [];
          const commonInfoLines = [];
          for (const line of lines) {
            if (trainRegex.test(line)) {
              trainLines.push(line);
            } else {
              commonInfoLines.push(line);
            }
          }

          const embeds = [];
          const commonInfoText =
            commonInfoLines.length > 0
              ? `> ${commonInfoLines.join("\n> ")}`
              : "";

          const itemsToProcess =
            trainLines.length > 0
              ? trainLines
              : commonInfoLines.length > 0
                ? [commonInfoLines.join("\n")]
                : [];

          for (const item of itemsToProcess) {
            const isTrainLine = trainRegex.test(item);
            const status = getEmbedStatus(item, isTrainLine);

            const baseEmbed = {
              ...status,
              url: data.link,
              footer: { text: "ZSSK Mimoriadne • Mastodon" },
              timestamp: data.timestamp.toISOString(),
            };

            if (isTrainLine) {
              const match = item.match(trainRegex)!;
              const trainName = match[1]!.trim();
              let statusText =
                item.substring(match[0].length).trim() ||
                "Očakávajte ďalšie informácie.";

              const fields = [];
              const delayMatch = statusText.match(delayRegex);

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

                const remainingStatus = statusText
                  .replace(delayRegex, "")
                  .trim();

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
                  value: statusText,
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

              embeds.push({ ...baseEmbed, fields });
            } else {
              embeds.push({ ...baseEmbed, description: item });
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
