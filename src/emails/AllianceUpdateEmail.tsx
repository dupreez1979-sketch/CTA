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
import { parseInline, type Block } from "../lib/alliance-content";

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

/**
 * Render paragraph/bullet text, turning `[text](url)` markdown links into
 * styled <Link>s. Relative `/…` hrefs are absolutised against baseUrl (like
 * images); a scheme-less host gets `https://` so clients don't treat it as
 * relative.
 */
function inline(text: string, baseUrl: string, keyPrefix: string) {
  return parseInline(text).map((seg, i) => {
    if (seg.type === "text") return <React.Fragment key={`${keyPrefix}-${i}`}>{seg.text}</React.Fragment>;
    const href = seg.url.startsWith("/")
      ? `${baseUrl}${seg.url}`
      : /^(https?:\/\/|mailto:)/i.test(seg.url)
        ? seg.url
        : `https://${seg.url}`;
    return (
      <Link
        key={`${keyPrefix}-${i}`}
        href={href}
        style={{
          color: ACCENT,
          fontWeight: 600,
          textDecoration: "none",
          borderBottom: `2px solid ${ACCENT}`,
        }}
      >
        {seg.text}
      </Link>
    );
  });
}

function Blocks({ blocks, baseUrl }: { blocks: Block[]; baseUrl: string }) {
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
                  clear: "both",
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
                clear: "both",
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
                      {inline(item, baseUrl, `li-${i}-${j}`)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          );
        }
        if (b.type === "image") {
          // Relative /api/img/... is absolutised against baseUrl; an external
          // https URL is used as-is (email clients need absolute URLs).
          const src = b.url.startsWith("/") ? `${baseUrl}${b.url}` : b.url;
          // Float: the image sits inline and following text wraps around it.
          // Default to half width so the wrapped text has room beside it. The
          // `align` attribute gives Outlook/legacy wrap; CSS float covers the
          // rest.
          if (b.float) {
            const w = b.width ? `${b.width}%` : "50%";
            return (
              <Img
                key={i}
                src={src}
                alt={b.alt}
                width={w}
                // Legacy `align` attribute gives Outlook the text wrap; not in
                // React-Email's Img prop types, so pass it through.
                {...({ align: b.float } as Record<string, string>)}
                style={{
                  float: b.float,
                  width: w,
                  maxWidth: "60%",
                  height: "auto",
                  borderRadius: 12,
                  margin:
                    b.float === "left"
                      ? "4px 16px 8px 0"
                      : "4px 0 8px 16px",
                }}
              />
            );
          }
          // Width as a percentage of the content column (default full width).
          const w = b.width ? `${b.width}%` : "100%";
          // Block image on its own line; text-align positions it reliably
          // across clients (left by default, or centre / right).
          return (
            <div
              key={i}
              style={{ textAlign: b.align ?? "left", margin: "6px 0 16px" }}
            >
              <Img
                src={src}
                alt={b.alt}
                width={w}
                style={{
                  display: "inline-block",
                  width: w,
                  maxWidth: b.width ? "100%" : 600,
                  height: "auto",
                  borderRadius: 12,
                }}
              />
            </div>
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
            {inline(b.text, baseUrl, `p-${i}`)}
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
          // Sky-blue backdrop (the newsletters float on mint) so this
          // internal update reads as its own thing at a glance.
          margin: 0,
          backgroundColor: COLORS.sky,
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
              <Blocks blocks={blocks} baseUrl={baseUrl} />
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
                This is an <strong>internal</strong> Alliance update. You&#39;re
                receiving it because you&#39;re on the Alliance group
                {groupEmail ? ` (${groupEmail})` : ""} — it is not the public
                newsletter. Please don&#39;t forward it beyond your organisation.
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
