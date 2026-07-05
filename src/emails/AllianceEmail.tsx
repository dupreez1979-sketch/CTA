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
import type { ShapeName } from "../lib/shapes";
import type { Cadence } from "../lib/db/schema";
import Cloud from "./Cloud";
import {
  CompanyBanner,
  FONT_BODY,
  ImageSlot,
  display,
  shapeUrl,
} from "./shared";

/**
 * The Alliance newsletter email — all three cadences share this template.
 * Table-based, fully inline-styled, 680px content width (per modern email
 * practice; the handoff's original 600px felt narrow on desktop), per the
 * handoff (design/README.md). Impact won't load in most email clients:
 * the Haettenschweiler / Arial Narrow Bold fallback stack is intentional.
 * Puzzle shapes are pre-rendered PNGs served from {baseUrl}/shapes/.
 */

export interface EmailItem {
  heading: string;
  summary: string;
  url: string;
  imageUrl: string | null;
}

export interface EmailCompanySection {
  name: string;
  hex: string;
  colorName: string;
  shape: ShapeName;
  items: EmailItem[];
}

export interface EmailFeatured extends EmailItem {
  company: string;
  hex: string;
}

export interface AllianceEmailProps {
  cadence: Cadence;
  dateRange: string;
  intro: string;
  indexNames?: string[];
  featured?: EmailFeatured | null;
  companies: EmailCompanySection[];
  /** Absolute origin for assets, e.g. https://newsletter.example.org */
  baseUrl: string;
  /** Per-recipient unsubscribe URL (or a merge placeholder). */
  unsubscribeUrl: string;
  /** Per-recipient preferences URL (or a merge placeholder). */
  preferencesUrl?: string;
}

const INK = COLORS.ink;

/**
 * Mobile overrides (Apple Mail, Gmail app, and most modern clients honour
 * embedded media queries; others keep the desktop layout). Paired with the
 * fluid container below, phones get a full-width email with 16px body copy
 * and larger headlines instead of a scaled-down 600px layout.
 */
const MOBILE_STYLES = `
@media only screen and (max-width: 480px) {
  /* Full-bleed on phones: hide the mint backdrop so the email fills the screen. */
  .email-bg, .bg-pad, body { padding: 0 !important; }
  .px { padding-left: 20px !important; padding-right: 20px !important; }
  .logo { height: 88px !important; }
  .footer-logo { height: 72px !important; }
  .ncti-logo { height: 44px !important; }
  .date-meta { font-size: 13px !important; }
  .intro-h { font-size: 30px !important; }
  .chip { font-size: 12px !important; }
  .banner-h { font-size: 24px !important; }
  .item-h { font-size: 24px !important; }
  .item-p { font-size: 16px !important; line-height: 1.5 !important; }
  .item-link { font-size: 14px !important; }
  .feat-h { font-size: 34px !important; }
  .feat-p { font-size: 16px !important; line-height: 1.55 !important; }
  .feat-img { height: 240px !important; }
  .feat-btn { font-size: 15px !important; padding: 12px 20px !important; }
  .thumb-td { width: 100px !important; padding-right: 12px !important; }
  .thumb-box { width: 100px !important; height: 100px !important; }
  .thumb-img { width: 100px !important; height: 100px !important; }
  .footer-p { font-size: 14px !important; }
  .footer-link { font-size: 14px !important; }
}
`;

export default function AllianceEmail({
  cadence,
  dateRange,
  intro,
  indexNames,
  featured,
  companies,
  baseUrl,
  unsubscribeUrl,
  preferencesUrl,
}: AllianceEmailProps) {
  const logo = `${baseUrl}/logo-full.png`;
  return (
    <Html lang="en">
      <Head>
        {/* Lets phone browsers (admin previews) trigger the mobile styles;
            email clients that don't need it simply ignore it. */}
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
      <Preview>{`${intro} — ${dateRange}`}</Preview>
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
        {/* Hybrid width: the attribute keeps desktop Outlook at 680px; the
            CSS makes modern clients fluid (full-width on phones). */}
        <Section className="bg-pad" style={{ padding: "28px 12px" }}>
        <Container
          width={680}
          style={{ width: "100%", maxWidth: 680, backgroundColor: COLORS.cream }}
        >
          {/* Masthead: straight top edge, cloud edge below, no hard line. */}
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
                  src={shapeUrl(baseUrl, "circle", "teal")}
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
                    backgroundColor: COLORS.purple,
                    color: INK,
                    fontFamily: FONT_BODY,
                    fontWeight: 600,
                    fontSize: 11,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    padding: "5px 12px",
                    border: `2px solid ${INK}`,
                    borderRadius: 999,
                    boxShadow: `3px 3px 0 ${INK}`,
                  }}
                >
                  {cadence} dispatch
                </span>
                <span
                  className="date-meta"
                  style={{
                    fontFamily: FONT_BODY,
                    fontWeight: 600,
                    fontSize: 12,
                    color: COLORS.textMuted,
                    letterSpacing: "0.02em",
                    paddingLeft: 11,
                  }}
                >
                  {dateRange}
                </span>
              </Column>
            </Row>
          </Section>
          <Cloud baseUrl={baseUrl} pair="creamwarm-cream" />

          {/* Intro line */}
          <Section className="px" style={{ padding: "22px 40px 4px" }}>
            <Text className="intro-h" style={display(26, 0.94)}>
              {intro}
            </Text>
          </Section>

          {/* Index chips (fortnightly) */}
          {indexNames && indexNames.length > 0 && (
            <Section className="px" style={{ padding: "12px 40px 4px" }}>
              <Text
                style={{
                  fontFamily: FONT_BODY,
                  fontWeight: 600,
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: COLORS.textMuted,
                  margin: "0 0 9px",
                }}
              >
                In this issue
              </Text>
              <Text style={{ margin: 0, lineHeight: "2.2" }}>
                {indexNames.map((nm) => (
                  <span
                    key={nm}
                    className="chip"
                    style={{
                      display: "inline-block",
                      fontFamily: FONT_BODY,
                      fontWeight: 600,
                      fontSize: 11,
                      color: INK,
                      backgroundColor: COLORS.white,
                      border: `2px solid ${INK}`,
                      padding: "5px 11px",
                      borderRadius: 999,
                      marginRight: 7,
                      marginBottom: 7,
                    }}
                  >
                    {nm}
                  </span>
                ))}
              </Text>
            </Section>
          )}

          {/* Featured story (weekly + fortnightly) */}
          {featured && (
            <Section className="px" style={{ padding: "18px 40px 6px" }}>
              <table
                role="presentation"
                width="100%"
                cellPadding={0}
                cellSpacing={0}
                style={{
                  borderCollapse: "separate",
                  backgroundColor: COLORS.white,
                  border: `3px solid ${INK}`,
                  borderRadius: 22,
                  boxShadow: `10px 10px 0 ${INK}`,
                  overflow: "hidden",
                }}
              >
                <tbody>
                  <tr>
                    <td style={{ borderBottom: `3px solid ${INK}` }}>
                      <ImageSlot
                        imageUrl={featured.imageUrl}
                        hex={featured.hex}
                        width="100%"
                        height={330}
                        radius={0}
                        alt={featured.heading}
                        cls="feat-img"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "20px 22px 22px" }}>
                      <Text style={{ margin: "0 0 11px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            backgroundColor: COLORS.yellow,
                            color: INK,
                            fontFamily: FONT_BODY,
                            fontWeight: 700,
                            fontSize: 10,
                            letterSpacing: "0.14em",
                            textTransform: "uppercase",
                            padding: "4px 10px",
                            border: `2px solid ${INK}`,
                            borderRadius: 999,
                            marginRight: 8,
                          }}
                        >
                          Featured
                        </span>
                        <span
                          style={{
                            ...display(19, 1),
                            display: "inline-block",
                            backgroundColor: featured.hex,
                            padding: "4px 11px 3px",
                            border: `2px solid ${INK}`,
                            borderRadius: 9,
                            boxShadow: `3px 3px 0 ${INK}`,
                          }}
                        >
                          {featured.company}
                        </span>
                      </Text>
                      <Text
                        className="feat-h"
                        style={{ ...display(30, 0.95), margin: "0 0 10px" }}
                      >
                        {featured.heading}
                      </Text>
                      <Text
                        className="feat-p"
                        style={{
                          fontFamily: FONT_BODY,
                          fontSize: 15,
                          lineHeight: 1.55,
                          color: COLORS.textBody,
                          margin: "0 0 14px",
                        }}
                      >
                        {featured.summary}
                      </Text>
                      <Link
                        href={featured.url}
                        className="feat-btn"
                        style={{
                          display: "inline-block",
                          fontFamily: FONT_BODY,
                          fontWeight: 700,
                          fontSize: 13,
                          color: INK,
                          backgroundColor: COLORS.purple,
                          border: `2px solid ${INK}`,
                          borderRadius: 12,
                          padding: "9px 16px",
                          textDecoration: "none",
                          boxShadow: `3px 3px 0 ${INK}`,
                        }}
                      >
                        Read the post →
                      </Link>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>
          )}

          {/* Company sections */}
          <Section className="px" style={{ padding: "10px 40px 36px" }}>
            {companies.map((co) => (
              <table
                key={co.name}
                role="presentation"
                width="100%"
                cellPadding={0}
                cellSpacing={0}
                style={{ borderCollapse: "separate", marginTop: 30 }}
              >
                <tbody>
                  <tr>
                    <td style={{ paddingBottom: 18 }}>
                      <CompanyBanner name={co.name} hex={co.hex} />
                      <Img
                        src={shapeUrl(baseUrl, co.shape, co.colorName)}
                        alt=""
                        width={28}
                        height={28}
                        style={{
                          display: "inline-block",
                          verticalAlign: "middle",
                          marginLeft: 11,
                        }}
                      />
                    </td>
                  </tr>
                  {co.items.map((it) => (
                    <tr key={it.url + it.heading}>
                      <td
                        style={{
                          padding: "16px 0",
                          borderTop: "2px dashed rgba(30,30,29,0.35)",
                        }}
                      >
                        <table
                          role="presentation"
                          width="100%"
                          cellPadding={0}
                          cellSpacing={0}
                          style={{ borderCollapse: "separate" }}
                        >
                          <tbody>
                            <tr>
                              <td
                                width={126}
                                className="thumb-td"
                                style={{
                                  width: 126,
                                  verticalAlign: "top",
                                  paddingRight: 16,
                                }}
                              >
                                <div
                                  className="thumb-box"
                                  style={{
                                    width: 126,
                                    height: 126,
                                    border: `2px solid ${INK}`,
                                    borderRadius: 14,
                                    boxShadow: `3px 3px 0 ${INK}`,
                                    overflow: "hidden",
                                  }}
                                >
                                  <ImageSlot
                                    imageUrl={it.imageUrl}
                                    hex={co.hex}
                                    width={126}
                                    height={126}
                                    radius={12}
                                    alt=""
                                    cls="thumb-img"
                                  />
                                </div>
                              </td>
                              <td style={{ verticalAlign: "top" }}>
                                <Text
                                  className="item-h"
                                  style={{
                                    ...display(20, 0.98),
                                    margin: "0 0 7px",
                                  }}
                                >
                                  {it.heading}
                                </Text>
                                <Text
                                  className="item-p"
                                  style={{
                                    fontFamily: FONT_BODY,
                                    fontSize: 13.5,
                                    lineHeight: 1.5,
                                    color: COLORS.textBody,
                                    margin: "0 0 11px",
                                  }}
                                >
                                  {it.summary}
                                </Text>
                                <Link
                                  href={it.url}
                                  className="item-link"
                                  style={{
                                    fontFamily: FONT_BODY,
                                    fontWeight: 700,
                                    fontSize: 12.5,
                                    color: INK,
                                    textDecoration: "none",
                                    borderBottom: `2px solid ${co.hex}`,
                                    paddingBottom: 1,
                                  }}
                                >
                                  Read the post →
                                </Link>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}
          </Section>

          <Cloud baseUrl={baseUrl} pair="cream-purple" />
          {/* Footer: rises out of the cream in cloud bumps, no hard line. */}
          <Section
            className="px"
            style={{
              backgroundColor: COLORS.purple,
              padding: "26px 40px",
            }}
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
                color: INK,
                margin: "0 0 6px",
                maxWidth: 420,
              }}
            >
              You&#39;re receiving this as part of the Children&#39;s Theatre
              Alliance. We acknowledge the Traditional Custodians of the lands
              on which we make and share stories.
            </Text>
            <Text style={{ margin: "0 0 10px", fontSize: 12 }}>
              <Link
                href="https://www.childrenstheatrealliance.com.au/"
                className="footer-link"
                style={{
                  fontFamily: FONT_BODY,
                  fontWeight: 700,
                  fontSize: 12,
                  color: INK,
                  textDecoration: "underline",
                }}
              >
                childrenstheatrealliance.com.au
              </Link>
            </Text>
            <Text style={{ margin: 0, fontSize: 12 }}>
              {preferencesUrl && (
                <>
                  <Link
                    href={preferencesUrl}
                    className="footer-link"
                    style={{
                      fontFamily: FONT_BODY,
                      fontWeight: 700,
                      fontSize: 12,
                      color: INK,
                      textDecoration: "underline",
                    }}
                  >
                    Change how often you hear from us
                  </Link>
                  <span
                    style={{ fontFamily: FONT_BODY, color: INK, padding: "0 8px" }}
                  >
                    ·
                  </span>
                </>
              )}
              <Link
                href={unsubscribeUrl}
                className="footer-link"
                style={{
                  fontFamily: FONT_BODY,
                  fontWeight: 700,
                  fontSize: 12,
                  color: INK,
                  textDecoration: "underline",
                }}
              >
                Unsubscribe
              </Link>
              <span
                style={{ fontFamily: FONT_BODY, color: INK, padding: "0 8px" }}
              >
                ·
              </span>
              <Link
                href="https://www.childrenstheatrealliance.com.au/privacy-policy"
                className="footer-link"
                style={{
                  fontFamily: FONT_BODY,
                  fontWeight: 700,
                  fontSize: 12,
                  color: INK,
                  textDecoration: "underline",
                }}
              >
                Privacy
              </Link>
            </Text>
            <Text
              style={{
                fontFamily: FONT_BODY,
                fontWeight: 400,
                fontSize: 11,
                lineHeight: 1.6,
                color: INK,
                margin: "14px 0 0",
              }}
            >
              Managed by National Children&#39;s Theatre Initiative
              <br />
              AI was used to create headings and summarise content.
            </Text>
          </Section>
        </Container>
        </Section>
      </Body>
    </Html>
  );
}
