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
import Cloud from "./Cloud";
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
  /** Pairs of recent pool stories with near-identical headings. */
  possibleDuplicates?: { a: string; b: string; company: string }[];
}

const INK = COLORS.ink;

const MOBILE_STYLES = `
@media only screen and (max-width: 480px) {
  /* Full-bleed on phones: hide the mint backdrop so the email fills the screen. */
  .email-bg, .bg-pad, body { padding: 0 !important; }
}
`;

export default function ShowcaseDraftEmail({
  baseUrl,
  newItems,
  draftCount,
  possibleDuplicates = [],
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
        <style>{MOBILE_STYLES}</style>
      </Head>
      <Preview>{`${newItems.length} new show announcement${newItems.length === 1 ? "" : "s"} for The Showcase`}</Preview>
      <Body
        className="email-bg"
        style={{
          // Mint backdrop: the cream email floats on it like a card.
          // The padding lives on the .bg-pad Section below, NOT here: React
          // Email moves Body styles onto a wrapper the mobile styles can't
          // target, and phones need to strip the padding to go full-bleed.
          margin: 0,
          backgroundColor: COLORS.mint,
          fontFamily: FONT_BODY,
          color: INK,
        }}
      >
        <Section className="bg-pad" style={{ padding: "28px 12px" }}>
        <Container
          width={680}
          style={{ width: "100%", maxWidth: 680, backgroundColor: COLORS.cream }}
        >
          {/* Masthead: straight top edge, cloud edge below, no hard line. */}
          <Section
            style={{
              backgroundColor: COLORS.creamWarm,
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
          <Cloud baseUrl={baseUrl} pair="creamwarm-cream" />

          <Section style={{ padding: "24px 40px 36px" }}>
            <Text style={{ ...display(28, 0.94), margin: "0 0 8px" }}>
              New stories in the Showcase pool
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
              {`The pipeline rated ${newItems.length} new stor${newItems.length === 1 ? "y" : "ies"} highly relevant to The Showcase and added ${newItems.length === 1 ? "it" : "them"} to your story pool — ${draftCount} stor${draftCount === 1 ? "y is" : "ies are"} ready for the next edition. (These are ready to use; they don't go through the media Review queue.)`}
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

            {possibleDuplicates.length > 0 && (
              <>
                <Text style={{ ...display(20, 0.94), margin: "26px 0 6px" }}>
                  Possible duplicates
                </Text>
                <Text
                  style={{
                    fontFamily: FONT_BODY,
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: COLORS.textBody,
                    margin: "0 0 12px",
                  }}
                >
                  These stories from the last 7 days have near-identical
                  headings. A feed sometimes carries the same story twice, so
                  check the pool and delete whichever one you don&#39;t want
                  before the next edition.
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
                        {possibleDuplicates.map((d, i) => (
                          <Text
                            key={`${d.a}|${d.b}`}
                            style={{
                              ...row,
                              margin: 0,
                              borderBottom:
                                i === possibleDuplicates.length - 1
                                  ? "none"
                                  : row.borderBottom,
                            }}
                          >
                            <span
                              style={{
                                fontFamily: FONT_BODY,
                                fontWeight: 700,
                                color: INK,
                              }}
                            >
                              {d.company}:
                            </span>{" "}
                            &ldquo;{d.a}&rdquo;
                            <br />
                            <span style={{ fontSize: 12, color: COLORS.textMuted }}>
                              looks like &ldquo;{d.b}&rdquo;
                            </span>
                          </Text>
                        ))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </>
            )}
          </Section>

          <Cloud baseUrl={baseUrl} pair="cream-purple" />
          {/* Footer: rises out of the cream in cloud bumps, no hard line. */}
          <Section
            style={{
              backgroundColor: COLORS.purple,
              padding: "16px 40px",
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
        </Section>
      </Body>
    </Html>
  );
}
