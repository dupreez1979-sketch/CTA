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
 * One-off outreach email introducing the NEWSLETTER: what the editions
 * are, how often they arrive, and how to sign up. The Alliance itself and
 * the website appear as the secondary section (the companion IntroEmail
 * does it the other way around). Recipients are pasted into admin and are
 * never stored. Copy contains no em-dashes by request.
 */

export interface IntroNewsletterEmailProps {
  /** Absolute origin for assets and the sign-up link. */
  baseUrl: string;
}

const WEBSITE = "https://www.childrenstheatrealliance.com.au/";
const PRIVACY = "https://www.childrenstheatrealliance.com.au/privacy-policy";

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

const card: React.CSSProperties = {
  borderCollapse: "separate",
  backgroundColor: COLORS.white,
  border: `3px solid ${INK}`,
  borderRadius: 22,
  boxShadow: `10px 10px 0 ${INK}`,
};

function Chip({ label, hex }: { label: string; hex: string }) {
  return (
    <span
      className="chip"
      style={{
        display: "inline-block",
        backgroundColor: hex,
        color: INK,
        fontFamily: FONT_BODY,
        fontWeight: 700,
        fontSize: 12,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        padding: "5px 12px",
        border: `2px solid ${INK}`,
        borderRadius: 999,
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      {label}
    </span>
  );
}

export default function IntroNewsletterEmail({
  baseUrl,
}: IntroNewsletterEmailProps) {
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
        The newsletter of Australia&#39;s professional children&#39;s theatre
        makers: choose how you hear from us.
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
                  src={`${baseUrl}/shapes/plus-yellow.png`}
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
                  The newsletter
                </span>
              </Column>
            </Row>
          </Section>
          <Cloud baseUrl={baseUrl} pair="creamwarm-cream" />

          {/* Greeting + headline */}
          <Section className="px" style={{ padding: "26px 40px 0" }}>
            <Text className="body-p" style={{ ...body(16), margin: "0 0 10px" }}>
              Hello,
            </Text>
            <Text className="body-p" style={{ ...body(16), margin: "0 0 6px" }}>
              Australia&#39;s professional children&#39;s theatre makers now
              share their news in one place. Here is how to get it delivered
              to your inbox, as often as you like.
            </Text>
          </Section>

          <Section className="px" style={{ padding: "18px 40px 4px" }}>
            <Text
              className="intro-h"
              style={{ ...display(32, 0.94), margin: "0 0 16px" }}
            >
              One newsletter, every company, your pace
            </Text>
            <Text className="body-p" style={body()}>
              Every edition gathers the latest from the companies of the
              Children&#39;s Theatre Alliance: new shows, tours, seasons and
              stories, grouped by company with a short, readable summary for
              each.
            </Text>
          </Section>

          {/* The regular dispatch */}
          <Section className="px" style={{ padding: "12px 40px 6px" }}>
            <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={card}>
              <tbody>
                <tr>
                  <td style={{ padding: "24px 24px 22px" }}>
                    <Text
                      className="card-h"
                      style={{ ...display(24, 0.95), margin: "0 0 10px" }}
                    >
                      The Alliance dispatch
                    </Text>
                    <Text
                      className="body-p"
                      style={{ ...body(14.5), margin: "0 0 14px" }}
                    >
                      The news roundup, on the schedule you choose:
                    </Text>
                    <div>
                      <Chip label="Daily" hex={COLORS.yellow} />
                      <Chip label="Weekly" hex={COLORS.purple} />
                      <Chip label="Fortnightly" hex={COLORS.mint} />
                    </div>
                    <Text
                      className="body-p"
                      style={{ ...body(13.5), margin: "10px 0 0" }}
                    >
                      Weekly and fortnightly editions open with a featured
                      story picked from across the Alliance.
                    </Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* The Showcase Edition */}
          <Section className="px" style={{ padding: "22px 40px 6px" }}>
            <table
              role="presentation"
              width="100%"
              cellPadding={0}
              cellSpacing={0}
              style={{ ...card, backgroundColor: COLORS.mint }}
            >
              <tbody>
                <tr>
                  <td style={{ padding: "24px 24px 22px" }}>
                    <Text
                      className="card-h"
                      style={{ ...display(24, 0.95), margin: "0 0 10px" }}
                    >
                      The Showcase Edition
                    </Text>
                    <Text
                      className="body-p"
                      style={{ ...body(14.5), margin: 0 }}
                    >
                      Show news for presenters, programmers and partners:
                      productions that can tour, profiled with their official
                      show pages and age ranges. It has no fixed schedule; it
                      arrives when there is show news worth sharing. Every
                      subscriber can receive it, or you can choose it on its
                      own.
                    </Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Sign-up CTA — the loudest block on the page */}
          <Section
            className="px"
            style={{ padding: "26px 40px 8px", textAlign: "center" }}
          >
            <Text
              className="card-h"
              style={{ ...display(26, 0.95), margin: "0 0 6px" }}
            >
              Signing up takes 30 seconds
            </Text>
            <Text
              className="body-p"
              style={{ ...body(14), margin: "0 0 14px" }}
            >
              Pick your frequency, tick The Showcase Edition if you want it,
              and you are done. Unsubscribe any time with one click.
            </Text>
            <Link
              href={baseUrl}
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
              Sign up to the newsletter →
            </Link>
          </Section>

          {/* About the Alliance — deliberately secondary */}
          <Section className="px" style={{ padding: "24px 40px 36px" }}>
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
                    <Text style={{ ...display(18, 1), margin: "0 0 6px" }}>
                      About the Alliance
                    </Text>
                    <Text
                      style={{
                        fontFamily: FONT_BODY,
                        fontSize: 13,
                        lineHeight: 1.55,
                        color: COLORS.textBody,
                        margin: "0 0 8px",
                      }}
                    >
                      The Children&#39;s Theatre Alliance is the national
                      platform of Australia&#39;s professional theatre
                      companies making work for children aged 0 to 14.
                      Together we collaborate to ensure every Australian child
                      grows up with theatre as part of their life.
                    </Text>
                    <Link
                      href={WEBSITE}
                      style={{
                        fontFamily: FONT_BODY,
                        fontWeight: 700,
                        fontSize: 13,
                        color: INK,
                        textDecoration: "underline",
                      }}
                    >
                      childrenstheatrealliance.com.au ↗
                    </Link>
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
              <span style={{ fontFamily: FONT_BODY, color: INK, padding: "0 8px" }}>
                ·
              </span>
              <Link
                href={PRIVACY}
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
              newsletter is relevant to you. We will not email you again
              unless you subscribe.
              <br />
              Managed by National Children&#39;s Theatre Initiative
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
