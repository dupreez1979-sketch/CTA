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
 * show Profiles up top, a compact "Also on the move" list of further show
 * news, and a "What's happening" list from the curated show registry.
 * Currently a test edition sent to a small settings-managed list, so the
 * footer has no unsubscribe machinery.
 */

export interface ShowcaseProfile {
  company: string;
  hex: string;
  title: string;
  blurb: string;
  ageRange: string | null;
  /** Official show page on the company's website, when known. */
  showUrl: string | null;
  /** The original announcement post. */
  postUrl: string;
  imageUrl: string | null;
}

export interface ShowcaseSectionItem {
  heading: string;
  summary: string;
  showUrl: string | null;
  postUrl: string;
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
}

export interface ShowcaseEmailProps {
  dateLabel: string;
  profiles: ShowcaseProfile[];
  companies: ShowcaseSection[];
  shows: ShowcaseListing[];
  baseUrl: string;
}

const INK = COLORS.ink;

const MOBILE_STYLES = `
@media only screen and (max-width: 480px) {
  .px { padding-left: 20px !important; padding-right: 20px !important; }
  .logo { height: 88px !important; }
  .footer-logo { height: 48px !important; }
  .ncti-logo { height: 30px !important; }
  .date-meta { font-size: 13px !important; }
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
  .footer-p { font-size: 14px !important; }
  .footer-link { font-size: 14px !important; }
}
`;

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
  shows,
  baseUrl,
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
        {`Shows ready to travel from Australia's theatre makers for young audiences`}
      </Preview>
      <Body
        style={{
          margin: 0,
          backgroundColor: COLORS.cream,
          fontFamily: FONT_BODY,
          color: INK,
        }}
      >
        <Container
          width={600}
          style={{ width: "100%", maxWidth: 600, backgroundColor: COLORS.cream }}
        >
          {/* Masthead */}
          <Section
            className="px"
            style={{
              backgroundColor: COLORS.creamWarm,
              borderBottom: `3px solid ${INK}`,
              padding: "28px 34px 26px",
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
                  The Showcase
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
          <Section className="px" style={{ padding: "22px 34px 4px" }}>
            <Text className="intro-h" style={display(26, 0.94)}>
              Shows from Australia&#39;s leading theatre makers for young
              audiences, ready to travel.
            </Text>
          </Section>

          {/* Profile cards */}
          {profiles.map((p) => (
            <Section
              key={p.postUrl + p.title}
              className="px"
              style={{ padding: "18px 34px 6px" }}
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
                        alt={p.title}
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
                          }}
                        >
                          {p.company}
                        </span>
                      </Text>
                      <Text
                        className="feat-h"
                        style={{ ...display(30, 0.95), margin: "0 0 10px" }}
                      >
                        {p.title}
                      </Text>
                      {p.ageRange && (
                        <Text style={{ margin: "0 0 10px" }}>
                          <AgeChip ageRange={p.ageRange} />
                        </Text>
                      )}
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
                        {p.blurb}
                      </Text>
                      <Text style={{ margin: 0 }}>
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
                              marginRight: 14,
                            }}
                          >
                            Visit the show page →
                          </Link>
                        )}
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
                          Read the announcement →
                        </Link>
                      </Text>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>
          ))}

          {/* Also on the move */}
          {companies.length > 0 && (
            <Section className="px" style={{ padding: "26px 34px 6px" }}>
              <SectionHeading>Also on the move</SectionHeading>
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
                                  <Text
                                    className="item-h"
                                    style={{
                                      ...display(20, 0.98),
                                      margin: "0 0 7px",
                                    }}
                                  >
                                    {it.heading}
                                  </Text>
                                  {it.ageRange && (
                                    <Text style={{ margin: "0 0 7px" }}>
                                      <AgeChip ageRange={it.ageRange} />
                                    </Text>
                                  )}
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
                                  <Text style={{ margin: 0 }}>
                                    {it.showUrl && (
                                      <>
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
                                          Show page →
                                        </Link>
                                        <span
                                          style={{
                                            fontFamily: FONT_BODY,
                                            color: COLORS.textMuted,
                                            padding: "0 8px",
                                          }}
                                        >
                                          ·
                                        </span>
                                      </>
                                    )}
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
                                      Announcement →
                                    </Link>
                                  </Text>
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
          )}

          {/* What's happening */}
          {shows.length > 0 && (
            <Section className="px" style={{ padding: "30px 34px 6px" }}>
              <SectionHeading>What&#39;s happening</SectionHeading>
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
                Alliance that are available now.
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
                  borderRadius: 16,
                  boxShadow: `4px 4px 0 ${INK}`,
                  marginTop: 12,
                }}
              >
                <tbody>
                  {shows.map((s, i) => (
                    <tr key={s.company + s.title}>
                      <td
                        style={{
                          padding: "14px 18px",
                          borderTop:
                            i === 0
                              ? undefined
                              : "2px dashed rgba(30,30,29,0.25)",
                        }}
                      >
                        <Text
                          className="show-h"
                          style={{ ...display(19, 1), margin: "0 0 3px" }}
                        >
                          {s.title}
                        </Text>
                        <Text
                          style={{
                            fontFamily: FONT_BODY,
                            fontWeight: 600,
                            fontSize: 12,
                            color: COLORS.textMuted,
                            margin: s.blurb ? "0 0 6px" : 0,
                          }}
                        >
                          {s.company}
                          {s.ageRange ? ` · ${s.ageRange}` : ""}
                        </Text>
                        {s.blurb && (
                          <Text
                            className="item-p"
                            style={{
                              fontFamily: FONT_BODY,
                              fontSize: 13,
                              lineHeight: 1.5,
                              color: COLORS.textBody,
                              margin: s.url ? "0 0 8px" : 0,
                            }}
                          >
                            {s.blurb}
                          </Text>
                        )}
                        {s.url && (
                          <Link
                            href={s.url}
                            className="item-link"
                            style={{
                              fontFamily: FONT_BODY,
                              fontWeight: 700,
                              fontSize: 12.5,
                              color: INK,
                              textDecoration: "none",
                              borderBottom: `2px solid ${COLORS.teal}`,
                              paddingBottom: 1,
                            }}
                          >
                            Show page →
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* Footer */}
          <Section
            className="px"
            style={{
              backgroundColor: COLORS.purple,
              borderTop: `3px solid ${INK}`,
              padding: "26px 34px",
              marginTop: 28,
            }}
          >
            <Row style={{ marginBottom: 12 }}>
              <Column style={{ verticalAlign: "middle" }}>
                <Img
                  src={logo}
                  alt="The Children's Theatre Alliance"
                  className="footer-logo"
                  height={34}
                  style={{ display: "block", height: 34, width: "auto" }}
                />
              </Column>
              <Column align="right" style={{ verticalAlign: "middle" }}>
                <Img
                  src={`${baseUrl}/ncti-logo.png`}
                  alt="National Children's Theatre Initiative"
                  className="ncti-logo"
                  height={24}
                  style={{
                    display: "block",
                    height: 24,
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
              You are receiving this test edition of The Showcase because you
              are helping the Alliance shape it. Reply to this email with
              feedback. We acknowledge the Traditional Custodians of the lands
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
