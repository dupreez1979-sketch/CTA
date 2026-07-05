import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

const impact = localFont({
  src: "../../public/fonts/impact.ttf",
  variable: "--font-impact",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Alliance Newsletter — Children's Theatre Alliance",
  description:
    "Get the next Alliance dispatch delivered straight to your inbox.",
  // A pink puzzle piece from the brand's shape set, like the website's motif.
  icons: { icon: "/shapes/knobLeft-pink.png" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${poppins.variable} ${impact.variable}`}>
      <body>{children}</body>
    </html>
  );
}
