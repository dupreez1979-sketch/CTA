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

/**
 * Internal notification to the Alliance team when someone subscribes.
 * Compact but on-brand: cream masthead, Impact headline, detail rows,
 * purple footer strip with a link to the admin subscriber list.
 */

export interface NotifyEmailProps {
  baseUrl: string;
  firstName: string;
  lastName: string;
  email: string;
  cadence: string;
  /** e.g. { daily: 3, weekly: 12, fortnightly: 5 } — active subscribers */
  counts: Record<string, number>;
}

const FONT_DISPLAY =
  "'Impact','Haettenschweiler','Arial Narrow Bold',sans-serif";
const FONT_BODY = "'Poppins',Helvetica,Arial,sans-serif";
const INK = COLORS.ink;

export default function NotifyEmail({
  baseUrl,
  firstName,
  lastName,
  email,
  cadence,
  counts,
}: NotifyEmailProps) {
  const row: React.CSSProperties = {
    fontFamily: FONT_BODY,
    fontSize: 14,
    lineHeight: 1.6,
    color: COLORS.textBody,
    padding: "7px 0",
    borderBottom: "2px dashed rgba(30,30,29,0.18)",
  };
  const label: React.CSSProperties = {
    fontFamily: FONT_BODY,
    fontWeight: 600,
    fontSize: 11,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: COLORS.textMuted,
  };
  return (
    <Html lang="en">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Preview>{`${firstName} ${lastName} subscribed (${cadence})`}</Preview>
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
                backgroundColor: COLORS.emerald,
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
              New subscriber
            </span>
          </Section>

          <Section style={{ padding: "24px 40px 8px" }}>
            <Text
              style={{
                fontFamily: FONT_DISPLAY,
                textTransform: "uppercase",
                fontSize: 28,
                lineHeight: 0.94,
                letterSpacing: "0.01em",
                color: INK,
                margin: "0 0 16px",
              }}
            >
              {firstName} {lastName} just joined
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
                  <td style={{ padding: "16px 20px" }}>
                    <Text style={{ ...row, margin: 0 }}>
                      <span style={label}>Email&nbsp;&nbsp;</span>
                      {email}
                    </Text>
                    <Text style={{ ...row, margin: 0 }}>
                      <span style={label}>Frequency&nbsp;&nbsp;</span>
                      {cadence}
                    </Text>
                    <Text style={{ ...row, margin: 0, borderBottom: "none" }}>
                      <span style={label}>Active list&nbsp;&nbsp;</span>
                      {`daily ${counts.daily ?? 0} · weekly ${counts.weekly ?? 0} · fortnightly ${counts.fortnightly ?? 0}${counts.none ? ` · Showcase only ${counts.none}` : ""}`}
                    </Text>
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
                href={`${baseUrl}/admin?tab=subscribers`}
                style={{
                  fontFamily: FONT_BODY,
                  fontWeight: 700,
                  fontSize: 12,
                  color: INK,
                  textDecoration: "underline",
                }}
              >
                Open the subscriber list
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
