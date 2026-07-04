import * as React from "react";
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Img,
  Text,
  Link,
  Preview,
} from "@react-email/components";
import { COLORS } from "../lib/tokens";
import { FONT_BODY, display } from "./shared";

/**
 * "Draft ready" notification for The Showcase: sent to the test list when
 * the pipeline classifies new show or tour announcements into the draft
 * pool. Compact and on-brand, like NotifyEmail.
 */

export interface ShowcaseDraftItem {
  company: string;
  heading: string;
  reason: string;
}

export interface ShowcaseDraftEmailProps {
  baseUrl: string;
  newItems: ShowcaseDraftItem[];
  draftCount: number;
}

const INK = COLORS.ink;

export default function ShowcaseDraftEmail({
  baseUrl,
  newItems,
  draftCount,
}: ShowcaseDraftEmailProps) {
  const row: React.CSSProperties = {
    fontFamily: FONT_BODY,
    fontSize: 14,
    lineHeight: 1.6,
    color: COLORS.textBody,
    padding: "9px 0",
    borderBottom: "2px dashed rgba(30,30,29,0.18)",
  };
  return (
    <Html lang="en">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Preview>{`${newItems.length} new show announcement${newItems.length === 1 ? "" : "s"} for The Showcase`}</Preview>
      <Body
        style={{
          margin: 0,
          backgroundColor: COLORS.cream,
          fontFamily: FONT_BODY,
          color: INK,
        }}
      >
        <Container
          width={680}
          style={{ width: "100%", maxWidth: 680, backgroundColor: COLORS.cream }}
        >
          <Section
            style={{
              backgroundColor: COLORS.creamWarm,
              borderBottom: `3px solid ${INK}`,
              padding: "20px 40px",
            }}
          >
            <Img
              src={`${baseUrl}/logo-full.png`}
              alt="The Children's Theatre Alliance"
              height={44}
              style={{ display: "block", height: 44, width: "auto", marginBottom: 12 }}
            />
            <span
              style={{
                display: "inline-block",
                backgroundColor: COLORS.teal,
                color: INK,
                fontFamily: FONT_BODY,
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                padding: "5px 12px",
                border: `2px solid ${INK}`,
                borderRadius: 999,
                boxShadow: `3px 3px 0 ${INK}`,
              }}
            >
              The Showcase
            </span>
          </Section>

          <Section style={{ padding: "24px 40px 8px" }}>
            <Text style={{ ...display(28, 0.94), margin: "0 0 8px" }}>
              New show news to review
            </Text>
            <Text
              style={{
                fontFamily: FONT_BODY,
                fontSize: 14,
                lineHeight: 1.6,
                color: COLORS.textBody,
                margin: "0 0 16px",
              }}
            >
              {`The pipeline rated ${newItems.length} new stor${newItems.length === 1 ? "y" : "ies"} highly relevant to The Showcase. ${draftCount} stor${draftCount === 1 ? "y is" : "ies are"} ready for the next edition.`}
            </Text>
            <table
              role="presentation"
              width="100%"
              cellPadding={0}
              cellSpacing={0}
              style={{
                borderCollapse: "separate",
                backgroundColor: COLORS.white,
                border: `2px solid ${INK}`,
                borderRadius: 14,
                boxShadow: `4px 4px 0 ${INK}`,
              }}
            >
              <tbody>
                <tr>
                  <td style={{ padding: "14px 20px" }}>
                    {newItems.map((it, i) => (
                      <Text
                        key={it.company + it.heading}
                        style={{
                          ...row,
                          margin: 0,
                          borderBottom:
                            i === newItems.length - 1 ? "none" : row.borderBottom,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: FONT_BODY,
                            fontWeight: 700,
                            color: INK,
                          }}
                        >
                          {it.company}:
                        </span>{" "}
                        {it.heading}
                        <br />
                        <span
                          style={{ fontSize: 12, color: COLORS.textMuted }}
                        >
                          {it.reason}
                        </span>
                      </Text>
                    ))}
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section
            style={{
              backgroundColor: COLORS.purple,
              borderTop: `3px solid ${INK}`,
              padding: "16px 40px",
              marginTop: 24,
            }}
          >
            <Text style={{ margin: 0, fontSize: 12 }}>
              <Link
                href={`${baseUrl}/admin?tab=presenters`}
                style={{
                  fontFamily: FONT_BODY,
                  fontWeight: 700,
                  fontSize: 12,
                  color: INK,
                  textDecoration: "underline",
                }}
              >
                Open The Showcase builder
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
