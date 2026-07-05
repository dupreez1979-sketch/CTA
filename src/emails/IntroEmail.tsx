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

/**
 * One-off outreach email introducing the Alliance and the newsletter to
 * funders, presenters and friends (including international recipients, so
 * Australia is stated up front). Recipients are pasted into admin and are
 * never stored. Copy contains no em-dashes by request.
 */

export interface IntroEmailProps {
  /** Absolute origin for assets and the sign-up link. */
  baseUrl: string;
}

const WEBSITE = "https://www.childrenstheatrealliance.com.au/";

const FONT_DISPLAY =
  "'Impact','Haettenschweiler','Arial Narrow Bold',sans-serif";
const FONT_BODY = "'Poppins',Helvetica,Arial,sans-serif";
const INK = COLORS.ink;

const MOBILE_STYLES = `
@media only screen and (max-width: 480px) {
  .px { padding-left: 20px !important; padding-right: 20px !important; }
  .logo { height: 110px !important; }
  .intro-h { font-size: 34px !important; }
  .body-p { font-size: 16px !important; line-height: 1.6 !important; }
  .card-h { font-size: 26px !important; }
  .chip { font-size: 12px !important; }
  .cta-btn { font-size: 15px !important; padding: 13px 22px !important; }
  .footer-p { font-size: 14px !important; }
  .footer-link { font-size: 14px !important; }
  .footer-logo { height: 90px !important; }
  .ncti-logo { height: 54px !important; }
}
`;

const display = (size: number, lineHeight = 0.95): React.CSSProperties => ({
  fontFamily: FONT_DISPLAY,
  textTransform: "uppercase" as const,
  fontSize: size,
  lineHeight: String(lineHeight),
  letterSpacing: "0.01em",
  color: INK,
  margin: 0,
});

const body = (size = 15): React.CSSProperties => ({
  fontFamily: FONT_BODY,
  fontSize: size,
  lineHeight: 1.6,
  color: COLORS.textBody,
  margin: "0 0 16px",
});

export default function IntroEmail({ baseUrl }: IntroEmailProps) {
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
        Introducing the Children&#39;s Theatre Alliance, Australia&#39;s
        national platform for professional children&#39;s theatre.
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
                  height={80}
                  style={{ display: "block", height: 80, width: "auto" }}
                />
              </Column>
              <Column align="right" style={{ verticalAlign: "top" }}>
                <Img
                  src={`${baseUrl}/shapes/circle-teal.png`}
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
                    backgroundColor: COLORS.yellow,
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
                  From Australia
                </span>
              </Column>
            </Row>
          </Section>
          <Cloud baseUrl={baseUrl} pair="creamwarm-cream" />

          {/* Greeting */}
          <Section className="px" style={{ padding: "26px 40px 0" }}>
            <Text className="body-p" style={{ ...body(16), margin: "0 0 10px" }}>
              Hello,
            </Text>
            <Text className="body-p" style={{ ...body(16), margin: "0 0 6px" }}>
              We thought you might like to learn more about the
              Children&#39;s Theatre Alliance, the new national platform of
              Australia&#39;s professional theatre companies making work for
              children.
            </Text>
          </Section>

          {/* Headline + intro copy */}
          <Section className="px" style={{ padding: "18px 40px 4px" }}>
            <Text className="intro-h" style={{ ...display(32, 0.94), margin: "0 0 16px" }}>
              Australia&#39;s professional children&#39;s theatre makers,
              working together
            </Text>
            <Text className="body-p" style={body()}>
              Together we collaborate to ensure every Australian child grows
              up with theatre as part of their life.
            </Text>
          </Section>

          {/* Logo grid of the companies working together in the Alliance */}
          <Section className="px" style={{ padding: "8px 40px 4px" }}>
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
              }}
            >
              <tbody>
                <tr>
                  <td style={{ padding: "20px 18px" }}>
                    <Img
                      src={`${baseUrl}/intro-members.png`}
                      alt="The companies working together in the Children's Theatre Alliance"
                      width={494}
                      style={{
                        display: "block",
                        width: "100%",
                        maxWidth: 494,
                        height: "auto",
                        margin: "0 auto",
                      }}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Age-range copy sits below the logo grid */}
          <Section className="px" style={{ padding: "16px 40px 4px" }}>
            <Text className="body-p" style={body()}>
              We cover theatre for children aged 0 to 14, with a focused lens
              on children aged 0 to 8. These are the early and primary years
              where the case for theatre is strongest, and where the gap
              between what children need and what they can access is
              greatest.
            </Text>
          </Section>

          {/* Newsletter card */}
          <Section className="px" style={{ padding: "22px 40px 6px" }}>
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
              }}
            >
              <tbody>
                <tr>
                  <td style={{ padding: "24px 24px 26px" }}>
                    <Text
                      className="card-h"
                      style={{ ...display(24, 0.95), margin: "0 0 10px" }}
                    >
                      The Alliance newsletter
                    </Text>
                    <Text className="body-p" style={{ ...body(14.5), margin: "0 0 16px" }}>
                      The latest from the companies working together in the
                      Alliance, grouped by company. Choose daily, weekly or
                      fortnightly.
                    </Text>
                    <Link
                      href={baseUrl}
                      className="cta-btn"
                      style={{
                        display: "inline-block",
                        fontFamily: FONT_BODY,
                        fontWeight: 700,
                        fontSize: 14,
                        color: INK,
                        backgroundColor: COLORS.purple,
                        border: `2px solid ${INK}`,
                        borderRadius: 12,
                        padding: "11px 18px",
                        textDecoration: "none",
                        boxShadow: `3px 3px 0 ${INK}`,
                      }}
                    >
                      Sign up to the newsletter →
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Website CTA — the loudest block on the page */}
          <Section
            className="px"
            style={{ padding: "26px 40px 8px", textAlign: "center" }}
          >
            <Text
              className="card-h"
              style={{ ...display(26, 0.95), margin: "0 0 14px" }}
            >
              Explore the Alliance
            </Text>
            <Link
              href={WEBSITE}
              className="cta-btn"
              style={{
                display: "inline-block",
                fontFamily: FONT_BODY,
                fontWeight: 700,
                fontSize: 17,
                color: INK,
                backgroundColor: COLORS.yellow,
                border: `3px solid ${INK}`,
                borderRadius: 14,
                padding: "16px 28px",
                textDecoration: "none",
                boxShadow: `6px 6px 0 ${INK}`,
              }}
            >
              childrenstheatrealliance.com.au ↗
            </Link>
          </Section>

          {/* Get involved — deliberately quiet */}
          <Section className="px" style={{ padding: "22px 40px 36px" }}>
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
                  <td style={{ padding: "16px 20px" }}>
                    <Text
                      style={{ ...display(18, 1), margin: "0 0 6px" }}
                    >
                      Get involved?
                    </Text>
                    <Text
                      style={{
                        fontFamily: FONT_BODY,
                        fontSize: 13,
                        lineHeight: 1.55,
                        color: COLORS.textBody,
                        margin: 0,
                      }}
                    >
                      Do you create or present theatre for children?{" "}
                      <Link
                        href="mailto:kevin@childrenstheatre.com.au"
                        style={{
                          fontFamily: FONT_BODY,
                          fontWeight: 700,
                          fontSize: 13,
                          color: INK,
                          textDecoration: "underline",
                        }}
                      >
                        Get in touch
                      </Link>{" "}
                      to learn more.
                    </Text>
                  </td>
                </tr>
              </tbody>
            </table>
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
            <Row style={{ marginBottom: 14 }}>
              <Column style={{ verticalAlign: "middle" }}>
                <Img
                  src={logo}
                  alt="The Children's Theatre Alliance"
                  className="footer-logo"
                  height={84}
                  style={{ display: "block", height: 84, width: "auto" }}
                />
              </Column>
              <Column align="right" style={{ verticalAlign: "middle" }}>
                <Img
                  src={`${baseUrl}/ncti-logo.png`}
                  alt="National Children's Theatre Initiative"
                  className="ncti-logo"
                  height={54}
                  style={{
                    display: "block",
                    height: 54,
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
                margin: "0 0 10px",
                maxWidth: 460,
              }}
            >
              We acknowledge the Traditional Custodians of the lands on which
              we make and share stories.
            </Text>
            <Text style={{ margin: "0 0 10px", fontSize: 12 }}>
              <Link
                href={WEBSITE}
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
                Privacy policy
              </Link>
            </Text>
            <Text
              style={{
                fontFamily: FONT_BODY,
                fontWeight: 400,
                fontSize: 11,
                lineHeight: 1.6,
                color: INK,
                margin: 0,
              }}
            >
              You received this one-off introduction because we think the
              Alliance is relevant to you. We will not email you again unless
              you subscribe.
              <br />
              Managed by National Children&#39;s Theatre Initiative
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
