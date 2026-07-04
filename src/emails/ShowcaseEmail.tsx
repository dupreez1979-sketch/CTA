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
import {
  CompanyBanner,
  FONT_BODY,
  ImageSlot,
  display,
  shapeUrl,
} from "./shared";

/**
 * The Showcase — the presenter and international partner edition. Same
 * brand system as the Alliance newsletter, different structure: one or two
 * show Profiles up top, a compact "The latest news" list of further show
 * news, and a "Shows in the Spotlight" list from the curated show registry.
 * Currently a test edition sent to a small settings-managed list, so the
 * footer has no unsubscribe machinery.
 */

export interface ShowcaseProfile {
  company: string;
  hex: string;
  /** The announcement: what the post actually said. Always present. */
  heading: string;
  summary: string;
  /** The original announcement post. */
  postUrl: string;
  /** The show: evergreen official info, rendered as a distinct block. */
  showTitle: string | null;
  showBlurb: string | null;
  ageRange: string | null;
  /** Official show page on the company's website, when known. */
  showUrl: string | null;
  imageUrl: string | null;
}

export interface ShowcaseSectionItem {
  /** The announcement: what the post actually said. */
  heading: string;
  summary: string;
  postUrl: string;
  /** About the show: evergreen official info, rendered as its own block. */
  showTitle: string | null;
  showBlurb: string | null;
  showUrl: string | null;
  imageUrl: string | null;
  ageRange: string | null;
}

export interface ShowcaseSection {
  name: string;
  hex: string;
  colorName: string;
  shape: ShapeName;
  items: ShowcaseSectionItem[];
}

export interface ShowcaseListing {
  title: string;
  company: string;
  blurb: string | null;
  url: string | null;
  ageRange: string | null;
  imageUrl: string | null;
}

export interface ShowcaseSocialItem {
  company: string;
  heading: string;
  summary: string;
  postUrl: string;
  imageUrl: string | null;
}

export interface ShowcaseEmailProps {
  dateLabel: string;
  profiles: ShowcaseProfile[];
  companies: ShowcaseSection[];
  /** Social Theatre stories; the section is hidden when empty. */
  social: ShowcaseSocialItem[];
  shows: ShowcaseListing[];
  baseUrl: string;
  /** Per-recipient unsubscribe URL (or a merge placeholder). Present on
   * live sends to subscribers; absent on test sends, which show the
   * test-list footer copy instead. */
  unsubscribeUrl?: string;
  /** Per-recipient preferences URL (or a merge placeholder). */
  preferencesUrl?: string;
}

const INK = COLORS.ink;

const MOBILE_STYLES = `
@media only screen and (max-width: 480px) {
  .px { padding-left: 20px !important; padding-right: 20px !important; }
  .logo { height: 88px !important; }
  .footer-logo { height: 72px !important; }
  .ncti-logo { height: 44px !important; }
  .date-meta { font-size: 13px !important; display: block !important; padding-left: 0 !important; margin-top: 8px !important; white-space: nowrap !important; }
  .intro-h { font-size: 30px !important; }
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
  .show-h { font-size: 22px !important; }
  .sub-h { font-size: 15px !important; }
  .grid-cell { display: block !important; width: 100% !important; padding: 0 0 16px 0 !important; }
  .grid-img { height: 200px !important; }
  /* Stacked cards don't need matching heights, so let titles flow free. */
  .grid-title { font-size: 23px !important; line-height: 1.1 !important; height: auto !important; }
  /* Stacked cards don't need fixed slots; auto heights stop clipped text. */
  .grid-slot { height: auto !important; overflow: visible !important; }
  .grid-co { font-size: 14px !important; }
  .grid-body { padding-bottom: 18px !important; }
  .footer-p { font-size: 14px !important; }
  .footer-link { font-size: 14px !important; }
}
`;

// Card accents for the Spotlight grid, cycled by position.
const GRID_HEXES = [
  COLORS.teal,
  COLORS.pink,
  COLORS.yellow,
  COLORS.sky,
  COLORS.emerald,
  COLORS.purple,
];

/**
 * One Spotlight card. Every content slot has a FIXED height (empty slots
 * keep their space) so all cards in the grid end up exactly the same
 * height regardless of title length, missing age range or missing link.
 */
function SpotlightCard({ s, hex }: { s: ShowcaseListing; hex: string }) {
  return (
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
        overflow: "hidden",
      }}
    >
      <tbody>
        <tr>
          <td style={{ borderBottom: `2px solid ${INK}` }}>
            <ImageSlot
              imageUrl={s.imageUrl}
              hex={hex}
              width="100%"
              height={150}
              radius={0}
              alt={s.title}
              cls="grid-img"
            />
          </td>
        </tr>
        <tr>
          <td className="grid-body" style={{ padding: "12px 14px 14px" }}>
            <Text
              className="grid-title"
              style={{
                ...display(19, 1.1),
                height: 42,
                overflow: "hidden",
                margin: "0 0 4px",
              }}
            >
              {s.title}
            </Text>
            <Text
              className="grid-slot grid-co"
              style={{
                fontFamily: FONT_BODY,
                fontWeight: 600,
                fontSize: 12,
                color: COLORS.textMuted,
                height: 18,
                overflow: "hidden",
                margin: "0 0 8px",
              }}
            >
              {s.company}
            </Text>
            <Text className="grid-slot" style={{ height: 30, margin: "0 0 8px" }}>
              {s.ageRange ? <AgeChip ageRange={s.ageRange} /> : " "}
            </Text>
            <Text className="grid-slot" style={{ height: 20, margin: 0 }}>
              {s.url ? (
                <Link
                  href={s.url}
                  className="item-link"
                  style={{
                    fontFamily: FONT_BODY,
                    fontWeight: 700,
                    fontSize: 12.5,
                    color: INK,
                    textDecoration: "none",
                    borderBottom: `2px solid ${hex}`,
                    paddingBottom: 1,
                  }}
                >
                  Show Page →
                </Link>
              ) : (
                " "
              )}
            </Text>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function AgeChip({ ageRange }: { ageRange: string | null }) {
  if (!ageRange) return null;
  return (
    <span
      style={{
        display: "inline-block",
        backgroundColor: COLORS.mint,
        color: INK,
        fontFamily: FONT_BODY,
        fontWeight: 700,
        fontSize: 10,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        padding: "3px 9px",
        border: `2px solid ${INK}`,
        borderRadius: 999,
      }}
    >
      {ageRange}
    </span>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <Text className="intro-h" style={{ ...display(26, 0.94), margin: "0 0 4px" }}>
      {children}
    </Text>
  );
}

export default function ShowcaseEmail({
  dateLabel,
  profiles,
  companies,
  social,
  shows,
  baseUrl,
  unsubscribeUrl,
  preferencesUrl,
}: ShowcaseEmailProps) {
  const logo = `${baseUrl}/logo-full.png`;
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
      <Preview>
        {`Discover Australia's best children's theatre. News. Shows. Tours. Announcements.`}
      </Preview>
      <Body
        style={{
          // Mint backdrop: the cream email floats on it like a card.
          margin: 0,
          backgroundColor: COLORS.mint,
          padding: "28px 12px",
          fontFamily: FONT_BODY,
          color: INK,
        }}
      >
        <Container
          width={680}
          style={{ width: "100%", maxWidth: 680, backgroundColor: COLORS.cream }}
        >
          {/* Masthead */}
          <Section
            className="px"
            style={{
              backgroundColor: COLORS.creamWarm,
              borderBottom: `3px solid ${INK}`,
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
                  src={shapeUrl(baseUrl, "plus", "yellow")}
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
                  The Showcase Edition
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
                  {dateLabel}
                </span>
              </Column>
            </Row>
          </Section>

          {/* Intro line */}
          <Section className="px" style={{ padding: "22px 40px 4px" }}>
            <Text className="intro-h" style={display(26, 0.94)}>
              Discover Australia&#39;s best children&#39;s theatre
            </Text>
            <Text
              className="sub-h"
              style={{
                fontFamily: FONT_BODY,
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: COLORS.textMuted,
                margin: "10px 0 0",
              }}
            >
              News. Shows. Tours. Announcements.
            </Text>
          </Section>

          {/* Profile cards */}
          {profiles.map((p) => (
            <Section
              key={p.postUrl + p.heading}
              className="px"
              style={{ padding: "18px 40px 6px" }}
            >
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
                        imageUrl={p.imageUrl}
                        hex={p.hex}
                        width="100%"
                        height={330}
                        radius={0}
                        alt={p.showTitle ?? p.heading}
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
                            marginRight: 10,
                            marginBottom: 8,
                            verticalAlign: "middle",
                          }}
                        >
                          Profile
                        </span>
                        <span
                          style={{
                            ...display(19, 1),
                            display: "inline-block",
                            backgroundColor: p.hex,
                            padding: "4px 11px 3px",
                            border: `2px solid ${INK}`,
                            borderRadius: 9,
                            boxShadow: `3px 3px 0 ${INK}`,
                            marginBottom: 8,
                            verticalAlign: "middle",
                          }}
                        >
                          {p.company}
                        </span>
                      </Text>
                      {/* The announcement: what the post said */}
                      <Text
                        className="feat-h"
                        style={{ ...display(30, 0.95), margin: "0 0 10px" }}
                      >
                        {p.heading}
                      </Text>
                      <Text
                        className="feat-p"
                        style={{
                          fontFamily: FONT_BODY,
                          fontSize: 15,
                          lineHeight: 1.55,
                          color: COLORS.textBody,
                          margin: "0 0 10px",
                        }}
                      >
                        {p.summary}
                      </Text>
                      {p.postUrl && (
                      <Text style={{ margin: p.showTitle || p.showUrl ? "0 0 18px" : 0 }}>
                        <Link
                          href={p.postUrl}
                          className="item-link"
                          style={{
                            display: "inline-block",
                            fontFamily: FONT_BODY,
                            fontWeight: 700,
                            fontSize: 12.5,
                            color: INK,
                            textDecoration: "none",
                            borderBottom: `2px solid ${p.hex}`,
                            paddingBottom: 1,
                          }}
                        >
                          Read More →
                        </Link>
                      </Text>
                      )}

                      {/* The show: evergreen official info, distinct block */}
                      {p.showTitle && (
                        <table
                          role="presentation"
                          width="100%"
                          cellPadding={0}
                          cellSpacing={0}
                          style={{
                            borderCollapse: "separate",
                            backgroundColor: COLORS.creamWarm,
                            border: `2px solid ${INK}`,
                            borderRadius: 14,
                          }}
                        >
                          <tbody>
                            <tr>
                              <td style={{ padding: "14px 18px 16px" }}>
                                <Text
                                  style={{
                                    fontFamily: FONT_BODY,
                                    fontWeight: 700,
                                    fontSize: 10,
                                    letterSpacing: "0.14em",
                                    textTransform: "uppercase",
                                    color: COLORS.textMuted,
                                    margin: "0 0 7px",
                                  }}
                                >
                                  About the show
                                </Text>
                                <Text
                                  className="item-h"
                                  style={{ ...display(24, 0.96), margin: "0 0 8px" }}
                                >
                                  {p.showTitle}
                                </Text>
                                {p.ageRange && (
                                  <Text style={{ margin: "0 0 8px" }}>
                                    <AgeChip ageRange={p.ageRange} />
                                  </Text>
                                )}
                                {p.showBlurb && (
                                  <Text
                                    className="item-p"
                                    style={{
                                      fontFamily: FONT_BODY,
                                      fontSize: 14,
                                      lineHeight: 1.55,
                                      color: COLORS.textBody,
                                      margin: "0 0 12px",
                                    }}
                                  >
                                    {p.showBlurb}
                                  </Text>
                                )}
                                {p.showUrl && (
                                  <Link
                                    href={p.showUrl}
                                    className="feat-btn"
                                    style={{
                                      display: "inline-block",
                                      fontFamily: FONT_BODY,
                                      fontWeight: 700,
                                      fontSize: 13,
                                      color: INK,
                                      backgroundColor: COLORS.yellow,
                                      border: `2px solid ${INK}`,
                                      borderRadius: 12,
                                      padding: "9px 16px",
                                      textDecoration: "none",
                                      boxShadow: `3px 3px 0 ${INK}`,
                                    }}
                                  >
                                    Show Page →
                                  </Link>
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      )}
                      {!p.showTitle && p.showUrl && (
                        <Text style={{ margin: 0 }}>
                          <Link
                            href={p.showUrl}
                            className="feat-btn"
                            style={{
                              display: "inline-block",
                              fontFamily: FONT_BODY,
                              fontWeight: 700,
                              fontSize: 13,
                              color: INK,
                              backgroundColor: COLORS.yellow,
                              border: `2px solid ${INK}`,
                              borderRadius: 12,
                              padding: "9px 16px",
                              textDecoration: "none",
                              boxShadow: `3px 3px 0 ${INK}`,
                            }}
                          >
                            Show Page →
                          </Link>
                        </Text>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>
          ))}

          {/* More news (heading only shown when profiles sit above it) */}
          {companies.length > 0 && (
            <Section className="px" style={{ padding: "26px 40px 6px" }}>
              {profiles.length > 0 && <SectionHeading>More news</SectionHeading>}
              {companies.map((co) => (
                <table
                  key={co.name}
                  role="presentation"
                  width="100%"
                  cellPadding={0}
                  cellSpacing={0}
                  style={{ borderCollapse: "separate", marginTop: 24 }}
                >
                  <tbody>
                    <tr>
                      <td style={{ paddingBottom: 16 }}>
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
                      <tr key={it.postUrl + it.heading}>
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
                                  {/* The announcement */}
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
                                      margin: "0 0 8px",
                                    }}
                                  >
                                    {it.summary}
                                  </Text>
                                  {it.postUrl && (
                                  <Text style={{ margin: 0 }}>
                                    <Link
                                      href={it.postUrl}
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
                                      Read More →
                                    </Link>
                                  </Text>
                                  )}
                                </td>
                              </tr>

                              {/* About the show: full width below the row */}
                              {(it.showTitle || it.showBlurb || it.showUrl) && (
                                <tr>
                                  <td colSpan={2} style={{ paddingTop: 14 }}>
                                    <table
                                      role="presentation"
                                      width="100%"
                                      cellPadding={0}
                                      cellSpacing={0}
                                      style={{
                                        borderCollapse: "separate",
                                        backgroundColor: COLORS.white,
                                        border: `2px solid ${INK}`,
                                        borderRadius: 12,
                                      }}
                                    >
                                      <tbody>
                                        <tr>
                                          <td style={{ padding: "10px 14px 12px" }}>
                                            <Text
                                              style={{
                                                fontFamily: FONT_BODY,
                                                fontWeight: 700,
                                                fontSize: 9,
                                                letterSpacing: "0.14em",
                                                textTransform: "uppercase",
                                                color: COLORS.textMuted,
                                                margin: "0 0 5px",
                                              }}
                                            >
                                              About the show
                                            </Text>
                                            {it.showTitle && (
                                              <Text
                                                style={{
                                                  ...display(18, 0.98),
                                                  margin: "0 0 6px",
                                                }}
                                              >
                                                {it.showTitle}
                                              </Text>
                                            )}
                                            {it.ageRange && (
                                              <Text style={{ margin: "0 0 6px" }}>
                                                <AgeChip ageRange={it.ageRange} />
                                              </Text>
                                            )}
                                            {it.showBlurb && (
                                              <Text
                                                className="item-p"
                                                style={{
                                                  fontFamily: FONT_BODY,
                                                  fontSize: 13,
                                                  lineHeight: 1.5,
                                                  color: COLORS.textBody,
                                                  margin: it.showUrl
                                                    ? "0 0 9px"
                                                    : 0,
                                                }}
                                              >
                                                {it.showBlurb}
                                              </Text>
                                            )}
                                            {it.showUrl && (
                                              <Text style={{ margin: 0 }}>
                                                <Link
                                                  href={it.showUrl}
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
                                                  Show Page →
                                                </Link>
                                              </Text>
                                            )}
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))}
            </Section>
          )}

          {/* Shows in the Spotlight */}
          {shows.length > 0 && (
            <Section className="px" style={{ padding: "30px 40px 6px" }}>
              <SectionHeading>In the Spotlight</SectionHeading>
              <Text
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: 13.5,
                  lineHeight: 1.5,
                  color: COLORS.textMuted,
                  margin: "6px 0 4px",
                }}
              >
                Productions from the companies working together in the
                Alliance.
              </Text>
              {/* Two-card grid (an even count is enforced before sending;
                  cells stack to one column on phones) */}
              <table
                role="presentation"
                width="100%"
                cellPadding={0}
                cellSpacing={0}
                style={{ borderCollapse: "separate", marginTop: 12 }}
              >
                <tbody>
                  {Array.from(
                    { length: Math.ceil(shows.length / 2) },
                    (_, r) => shows.slice(r * 2, r * 2 + 2),
                  ).map((pair, r) => (
                    <tr key={pair[0].company + pair[0].title}>
                      <td
                        className="grid-cell"
                        width="50%"
                        style={{
                          width: "50%",
                          verticalAlign: "top",
                          padding: "0 8px 16px 0",
                        }}
                      >
                        <SpotlightCard
                          s={pair[0]}
                          hex={GRID_HEXES[(r * 2) % GRID_HEXES.length]}
                        />
                      </td>
                      <td
                        className="grid-cell"
                        width="50%"
                        style={{
                          width: "50%",
                          verticalAlign: "top",
                          padding: "0 0 16px 8px",
                        }}
                      >
                        {pair[1] && (
                          <SpotlightCard
                            s={pair[1]}
                            hex={GRID_HEXES[(r * 2 + 1) % GRID_HEXES.length]}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* Social Theatre — its own world: mint band, no show cards.
              Hidden when no stories are tagged. */}
          {social.length > 0 && (
            <Section
              className="px"
              style={{
                // Sky, not mint: the email backdrop is mint now, and the
                // Social Theatre band must read as its own section.
                backgroundColor: COLORS.sky,
                borderTop: `3px solid ${INK}`,
                borderBottom: `3px solid ${INK}`,
                padding: "30px 40px 24px",
                marginTop: 30,
              }}
            >
              <Text className="intro-h" style={display(26, 0.94)}>
                Social Theatre
              </Text>
              <Text
                className="sub-h"
                style={{
                  fontFamily: FONT_BODY,
                  fontWeight: 700,
                  fontSize: 13,
                  letterSpacing: "0.04em",
                  color: COLORS.textBody,
                  margin: "8px 0 2px",
                }}
              >
                Theatre embedded as Social Infrastructure
              </Text>
              {social.map((it) => (
                <table
                  key={it.postUrl + it.heading}
                  role="presentation"
                  width="100%"
                  cellPadding={0}
                  cellSpacing={0}
                  style={{ borderCollapse: "separate", marginTop: 22 }}
                >
                  <tbody>
                    <tr>
                      <td colSpan={2} style={{ paddingBottom: 12 }}>
                        <CompanyBanner name={it.company} hex={COLORS.white} size={20} />
                      </td>
                    </tr>
                    <tr>
                      <td
                        width={100}
                        className="thumb-td"
                        style={{
                          width: 100,
                          verticalAlign: "top",
                          paddingRight: 16,
                        }}
                      >
                        <div
                          className="thumb-box"
                          style={{
                            width: 100,
                            height: 100,
                            border: `2px solid ${INK}`,
                            borderRadius: 14,
                            boxShadow: `3px 3px 0 ${INK}`,
                            overflow: "hidden",
                          }}
                        >
                          <ImageSlot
                            imageUrl={it.imageUrl}
                            hex={COLORS.teal}
                            width={100}
                            height={100}
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
                            lineHeight: 1.55,
                            color: COLORS.textBody,
                            margin: "0 0 9px",
                          }}
                        >
                          {it.summary}
                        </Text>
                        {it.postUrl && (
                        <Text style={{ margin: 0 }}>
                          <Link
                            href={it.postUrl}
                            className="item-link"
                            style={{
                              fontFamily: FONT_BODY,
                              fontWeight: 700,
                              fontSize: 12.5,
                              color: INK,
                              textDecoration: "none",
                              borderBottom: `2px solid ${COLORS.white}`,
                              paddingBottom: 1,
                            }}
                          >
                            Read More →
                          </Link>
                        </Text>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              ))}
            </Section>
          )}

          {/* Alliance website (deliberately no card, so it doesn't compete
              with the Spotlight boxes above) */}
          <Section
            className="px"
            style={{ padding: "38px 40px 12px", textAlign: "center" as const }}
          >
            <Img
              src={logo}
              alt="The Children's Theatre Alliance"
              className="logo"
              height={84}
              style={{
                display: "block",
                height: 84,
                width: "auto",
                margin: "0 auto 18px",
              }}
            />
            <Text
              style={{
                fontFamily: FONT_BODY,
                fontSize: 14,
                lineHeight: 1.55,
                color: COLORS.textBody,
                textAlign: "center" as const,
                margin: "0 0 18px",
              }}
            >
              The national platform of Australia&#39;s professional theatre
              companies making work for children.
            </Text>
            <Link
              href="https://www.childrenstheatrealliance.com.au/"
              className="feat-btn"
              style={{
                display: "inline-block",
                whiteSpace: "nowrap",
                fontFamily: FONT_BODY,
                fontWeight: 700,
                fontSize: 14,
                color: INK,
                backgroundColor: COLORS.yellow,
                border: `2px solid ${INK}`,
                borderRadius: 12,
                padding: "11px 16px",
                textDecoration: "none",
                boxShadow: `4px 4px 0 ${INK}`,
              }}
            >
              childrenstheatrealliance.com.au →
            </Link>
          </Section>

          {/* Footer */}
          <Section
            className="px"
            style={{
              backgroundColor: COLORS.purple,
              borderTop: `3px solid ${INK}`,
              padding: "26px 40px",
              marginTop: 28,
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
                maxWidth: 440,
              }}
            >
              {unsubscribeUrl
                ? "You are receiving The Showcase Edition from the Children's Theatre Alliance: news about shows and tours, sent as it happens. We acknowledge the Traditional Custodians of the lands on which we make and share stories."
                : "You are receiving this test edition of The Showcase because you are helping the Alliance shape it. Reply to this email with feedback. We acknowledge the Traditional Custodians of the lands on which we make and share stories."}
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
            {unsubscribeUrl && (
              <Text style={{ margin: "0 0 10px", fontSize: 12 }}>
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
                      Change what you receive
                    </Link>
                    <span
                      style={{
                        fontFamily: FONT_BODY,
                        color: INK,
                        padding: "0 8px",
                      }}
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
                  style={{
                    fontFamily: FONT_BODY,
                    color: INK,
                    padding: "0 8px",
                  }}
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
            )}
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
              AI was used to help select and summarise content.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
