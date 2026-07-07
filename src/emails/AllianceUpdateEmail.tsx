import * as React from "react";
import {
  Html,
  Head,
  Font,
  Body,
  Container,
  Section,
  Row,
  Column,
  Img,
  Text,
  Link,
  Preview,
} from "@react-email/components";
import { COLORS } from "../lib/tokens";
import Cloud from "./Cloud";
import { FONT_BODY, display, shapeUrl } from "./shared";
import type { Block } from "../lib/alliance-content";

/**
 * The internal "Alliance Update" email: a hand-composed note sent to the
 * Alliance group address, not to public subscribers. Same branded
 * shell as the newsletter (masthead, cloud edges, footer) but with a
 * distinct blue accent and no subscriber/unsubscribe footer language.
 * Content is a flexible list of parsed blocks (headings, paragraphs, lists).
 */

export interface AllianceUpdateEmailProps {
  subject: string;
  blocks: Block[];
  /** Absolute origin for assets, e.g. https://newsletter.example.org */
  baseUrl: string;
  /** The Alliance group address, shown in the always-on Links section. */
  groupEmail: string;
}

const WEBSITE_URL = "https://www.childrenstheatrealliance.com.au/";

const INK = COLORS.ink;
const ACCENT = COLORS.blue;

const MOBILE_STYLES = `
@media only screen and (max-width: 480px) {
  .email-bg, .bg-pad, body { padding: 0 !important; }
  .px { padding-left: 20px !important; padding-right: 20px !important; }
  .logo { height: 88px !important; }
  .footer-logo { height: 72px !important; }
  .ncti-logo { height: 44px !important; }
  .intro-h { font-size: 40px !important; }
  .au-h { font-size: 22px !important; }
  .au-h2 { font-size: 17px !important; }
  .au-p { font-size: 16px !important; line-height: 1.55 !important; }
  .links-h { font-size: 28px !important; }
  .footer-p { font-size: 14px !important; }
  .footer-link { font-size: 14px !important; }
}
`;

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (b.type === "heading") {
          // Heading 1 (## ): big section title with an accent underline.
          if (b.level === 1) {
            return (
              <Text
                key={i}
                className="au-h"
                style={{
                  ...display(23, 1),
                  margin: i === 0 ? "0 0 12px" : "26px 0 12px",
                  paddingBottom: 6,
                  borderBottom: `3px solid ${ACCENT}`,
                }}
              >
                {b.text}
              </Text>
            );
          }
          // Heading 2 (### ): smaller sub heading in the accent colour, no rule.
          return (
            <Text
              key={i}
              className="au-h2"
              style={{
                ...display(16, 1),
                color: ACCENT,
                margin: i === 0 ? "0 0 8px" : "18px 0 8px",
              }}
            >
              {b.text}
            </Text>
          );
        }
        if (b.type === "list") {
          return (
            <table
              key={i}
              role="presentation"
              width="100%"
              cellPadding={0}
              cellSpacing={0}
              style={{ borderCollapse: "collapse", margin: "0 0 14px" }}
            >
              <tbody>
                {b.items.map((item, j) => (
                  <tr key={j}>
                    <td
                      style={{
                        width: 22,
                        verticalAlign: "top",
                        paddingTop: 2,
                        color: ACCENT,
                        fontFamily: FONT_BODY,
                        fontWeight: 700,
                        fontSize: 16,
                        lineHeight: 1.55,
                      }}
                    >
                      •
                    </td>
                    <td
                      className="au-p"
                      style={{
                        fontFamily: FONT_BODY,
                        fontSize: 15,
                        lineHeight: 1.55,
                        color: COLORS.textBody,
                        paddingBottom: 6,
                      }}
                    >
                      {item}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          );
        }
        return (
          <Text
            key={i}
            className="au-p"
            style={{
              fontFamily: FONT_BODY,
              fontSize: 15,
              lineHeight: 1.6,
              color: COLORS.textBody,
              margin: "0 0 14px",
            }}
          >
            {b.text}
          </Text>
        );
      })}
    </>
  );
}

export default function AllianceUpdateEmail({
  subject,
  blocks,
  baseUrl,
  groupEmail,
}: AllianceUpdateEmailProps) {
  const logo = `${baseUrl}/logo-full.png`;
  const heading = subject.trim() || "Alliance Update";
  const newsletterUrl = baseUrl || WEBSITE_URL;
  return (
    <Html lang="en">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Font
          fontFamily="Poppins"
          fallbackFontFamily={["Helvetica", "Arial", "sans-serif"]}
          webFont={{
            url: "https://fonts.gstatic.com/s/poppins/v23/pxiEyp8kv8JHgFVrJJfecg.woff2",
            format: "woff2",
          }}
          fontWeight={400}
          fontStyle="normal"
        />
        <style>{MOBILE_STYLES}</style>
      </Head>
      <Preview>{`Alliance Update — ${heading}`}</Preview>
      <Body
        className="email-bg"
        style={{
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
            {/* Masthead */}
            <Section
              className="px"
              style={{
                backgroundColor: COLORS.creamWarm,
                padding: "28px 40px 26px",
              }}
            >
              <Row>
                <Column>
                  <Img
                    src={logo}
                    alt="The Children's Theatre Alliance"
                    className="logo"
                    height={60}
                    style={{ display: "block", height: 60, width: "auto" }}
                  />
                </Column>
                <Column align="right" style={{ verticalAlign: "top" }}>
                  <Img
                    src={shapeUrl(baseUrl, "circle", "blue")}
                    alt=""
                    width={56}
                    height={56}
                    style={{ display: "block" }}
                  />
                </Column>
              </Row>
              <Row>
                <Column style={{ paddingTop: 16 }}>
                  <span
                    style={{
                      display: "inline-block",
                      backgroundColor: ACCENT,
                      color: COLORS.white,
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
                    Alliance Update
                  </span>
                  <span
                    style={{
                      fontFamily: FONT_BODY,
                      fontWeight: 600,
                      fontSize: 12,
                      color: COLORS.textMuted,
                      letterSpacing: "0.02em",
                      paddingLeft: 11,
                    }}
                  >
                    For the Alliance
                  </span>
                </Column>
              </Row>
            </Section>
            <Cloud baseUrl={baseUrl} pair="creamwarm-cream" />

            {/* Subject + content */}
            <Section className="px" style={{ padding: "22px 40px 30px" }}>
              <Text className="intro-h" style={{ ...display(50, 0.9), margin: "0 0 20px" }}>
                {heading}
              </Text>
              <Blocks blocks={blocks} />
            </Section>

            {/* Links + reminder: always shown, its own yellow band (same
                idea as the Showcase Social Theatre band, different colour). */}
            <Cloud baseUrl={baseUrl} pair="cream-yellow" />
            <Section
              className="px"
              style={{ backgroundColor: COLORS.yellow, padding: "28px 40px 26px" }}
            >
              <Text className="links-h" style={{ ...display(26, 0.94), margin: "0 0 14px" }}>
                Links
              </Text>
              {[
                { label: "Website", href: WEBSITE_URL, text: "childrenstheatrealliance.com.au" },
                { label: "Newsletter", href: newsletterUrl, text: "Sign up or read online" },
                { label: "Group email", href: `mailto:${groupEmail}`, text: groupEmail },
              ].map((l) => (
                <Text
                  key={l.label}
                  className="au-p"
                  style={{
                    fontFamily: FONT_BODY,
                    fontSize: 14,
                    lineHeight: 1.5,
                    color: INK,
                    margin: "0 0 8px",
                  }}
                >
                  <span style={{ fontWeight: 700 }}>{l.label}: </span>
                  <Link
                    href={l.href}
                    style={{
                      fontFamily: FONT_BODY,
                      fontWeight: 600,
                      color: INK,
                      textDecoration: "none",
                      borderBottom: `2px solid ${INK}`,
                      paddingBottom: 1,
                    }}
                  >
                    {l.text}
                  </Link>
                </Text>
              ))}
              {/* Standing reminder note. */}
              <table
                role="presentation"
                width="100%"
                cellPadding={0}
                cellSpacing={0}
                style={{ borderCollapse: "separate", marginTop: 14 }}
              >
                <tbody>
                  <tr>
                    <td
                      style={{
                        backgroundColor: COLORS.white,
                        border: `2px solid ${INK}`,
                        borderRadius: 12,
                        boxShadow: `3px 3px 0 ${INK}`,
                        padding: "12px 16px",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: FONT_BODY,
                          fontWeight: 700,
                          fontSize: 11,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: COLORS.textMuted,
                          margin: "0 0 4px",
                        }}
                      >
                        Reminder
                      </Text>
                      <Text
                        className="au-p"
                        style={{
                          fontFamily: FONT_BODY,
                          fontSize: 14,
                          lineHeight: 1.55,
                          color: COLORS.textBody,
                          margin: 0,
                        }}
                      >
                        Please share anything you&#39;d like included in the next
                        update, and post your news to the group email so it reaches
                        everyone.
                      </Text>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            <Cloud baseUrl={baseUrl} pair="yellow-blue" />
            {/* Footer: blue band, white text (internal, no unsubscribe). */}
            <Section
              className="px"
              style={{ backgroundColor: ACCENT, padding: "26px 40px" }}
            >
              <Row style={{ marginBottom: 12 }}>
                <Column style={{ verticalAlign: "middle" }}>
                  <Img
                    src={logo}
                    alt="The Children's Theatre Alliance"
                    className="footer-logo"
                    height={52}
                    style={{ display: "block", height: 52, width: "auto" }}
                  />
                </Column>
                <Column align="right" style={{ verticalAlign: "middle" }}>
                  <Img
                    src={`${baseUrl}/ncti-logo.png`}
                    alt="National Children's Theatre Initiative"
                    className="ncti-logo"
                    height={36}
                    style={{
                      display: "block",
                      height: 36,
                      width: "auto",
                      marginLeft: "auto",
                    }}
                  />
                </Column>
              </Row>
              <Text
                className="footer-p"
                style={{
                  fontFamily: FONT_BODY,
                  fontWeight: 500,
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: COLORS.white,
                  margin: "0 0 6px",
                  maxWidth: 440,
                }}
              >
                An internal update for the Children&#39;s Theatre Alliance.
                Please don&#39;t forward beyond your organisation.
              </Text>
              <Text style={{ margin: "0 0 4px", fontSize: 12 }}>
                <Link
                  href="https://www.childrenstheatrealliance.com.au/"
                  className="footer-link"
                  style={{
                    fontFamily: FONT_BODY,
                    fontWeight: 700,
                    fontSize: 12,
                    color: COLORS.white,
                    textDecoration: "underline",
                  }}
                >
                  childrenstheatrealliance.com.au
                </Link>
              </Text>
              <Text
                style={{
                  fontFamily: FONT_BODY,
                  fontWeight: 400,
                  fontSize: 11,
                  lineHeight: 1.6,
                  color: COLORS.white,
                  margin: "12px 0 0",
                }}
              >
                Managed by National Children&#39;s Theatre Initiative
              </Text>
            </Section>
          </Container>
        </Section>
      </Body>
    </Html>
  );
}
