import type { AgUiMessage } from "@/src/ee/features/in-app-agent/schema";
import { extractAletheiaDocsSources, getDrawerMessages } from "./utils";

describe("extractAletheiaDocsSources", () => {
  it("extracts and deduplicates document sources from docs tool results", () => {
    const result = JSON.stringify({
      _meta: {
        choices: [
          {
            message: {
              content: JSON.stringify({
                content: [
                  { type: "text", text: "Search result" },
                  {
                    type: "document",
                    title: "Core Concepts",
                    url: "https://aletheia.com/docs/evaluation/core-concepts",
                  },
                  {
                    type: "document",
                    title: "Scores",
                    url: "https://aletheia.com/docs/evaluation/scores/overview",
                  },
                ],
              }),
            },
          },
          {
            message: {
              content: JSON.stringify({
                content: [
                  {
                    type: "document",
                    title: "Datasets",
                    url: "https://aletheia.com/docs/datasets/overview",
                  },
                ],
              }),
            },
          },
          {
            message: {
              content: JSON.stringify({
                content: [
                  {
                    type: "document",
                    title: "Scores duplicate",
                    url: "https://aletheia.com/docs/evaluation/scores/overview",
                  },
                ],
              }),
            },
          },
        ],
      },
    });

    expect(
      extractAletheiaDocsSources([
        {
          type: "tool",
          name: "aletheiaDocs_search",
          args: "{}",
          result,
        },
        {
          type: "tool",
          name: "aletheia_queryMetrics",
          args: "{}",
          result,
        },
      ]),
    ).toEqual([
      {
        title: "Core Concepts",
        url: "https://aletheia.com/docs/evaluation/core-concepts",
        faviconUrl: "https://aletheia.com/favicon.ico",
      },
      {
        title: "Scores",
        url: "https://aletheia.com/docs/evaluation/scores/overview",
        faviconUrl: "https://aletheia.com/favicon.ico",
      },
      {
        title: "Datasets",
        url: "https://aletheia.com/docs/datasets/overview",
        faviconUrl: "https://aletheia.com/favicon.ico",
      },
    ]);
  });

  it("ignores malformed structured sources", () => {
    const result = JSON.stringify({
      _meta: {
        choices: [
          { message: { content: "not json" } },
          { message: { content: JSON.stringify({ content: "not array" }) } },
          {
            message: {
              content: JSON.stringify({
                content: [
                  { type: "document", title: "Missing URL" },
                  { type: "document", title: "Blank URL", url: "   " },
                  {
                    type: "document",
                    title: "Unsafe protocol",
                    url: "javascript:alert(1)",
                  },
                ],
              }),
            },
          },
        ],
      },
    });

    expect(
      extractAletheiaDocsSources([
        {
          type: "tool",
          name: "aletheiaDocs_search",
          args: "{}",
          result,
        },
      ]),
    ).toEqual([]);
  });
});

describe("getDrawerMessages", () => {
  it("attaches docs sources to the answer after a search preamble", () => {
    const docsResult = JSON.stringify({
      _meta: {
        choices: [
          {
            message: {
              content: JSON.stringify({
                content: [
                  {
                    type: "document",
                    url: "https://aletheia.com/docs/audit-logs",
                    title: "Audit Logs",
                  },
                ],
              }),
            },
          },
        ],
      },
    });

    const mappedMessages = getDrawerMessages({
      error: null,
      isRunning: false,
      messages: [
        {
          id: "user-1",
          role: "user",
          content: "Does Aletheia have access logging?",
        },
        {
          id: "assistant-1",
          role: "assistant",
          content:
            "I'll search the Aletheia documentation for information about access logging.",
          toolCalls: [
            {
              id: "tool-call-1",
              type: "function",
              function: {
                name: "aletheiaDocs_search",
                arguments: "{}",
              },
            },
          ],
        },
        {
          id: "tool-result-1",
          role: "tool",
          toolCallId: "tool-call-1",
          content: docsResult,
        },
        {
          id: "assistant-2",
          role: "assistant",
          content: "Yes, Aletheia has audit logging available.",
        },
      ] satisfies AgUiMessage[],
    });

    expect(mappedMessages).toMatchObject([
      {
        id: "user-1",
        content: { type: "text" },
      },
      {
        id: "assistant-1",
        content: {
          type: "text",
          text: "I'll search the Aletheia documentation for information about access logging.",
        },
      },
      {
        id: "assistant-1-tools",
        content: { type: "toolGroup" },
      },
      {
        id: "assistant-2",
        content: {
          type: "text",
          text: "Yes, Aletheia has audit logging available.",
          sources: [
            {
              title: "Audit Logs",
              url: "https://aletheia.com/docs/audit-logs",
              faviconUrl: "https://aletheia.com/favicon.ico",
            },
          ],
        },
      },
    ]);

    expect(mappedMessages[1]?.content).not.toHaveProperty("sources");
  });
});
