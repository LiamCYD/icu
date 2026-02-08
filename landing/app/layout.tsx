import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ICU — AI Supply Chain Threat Intelligence",
  description:
    "Real-time scanning of AI marketplaces for malicious packages. Prompt injection, data exfiltration, and obfuscation detection.",
  openGraph: {
    title: "ICU — AI Supply Chain Threat Intelligence",
    description:
      "Real-time scanning of AI marketplaces for malicious packages.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} page-bg min-h-screen`}>
        <Header />
        <main className="pt-14">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
