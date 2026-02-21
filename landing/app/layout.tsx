import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "ICU — AI Supply Chain Threat Intelligence",
  description:
    "Real-time scanning of AI marketplaces for malicious packages. Prompt injection, data exfiltration, and obfuscation detection.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/favicon-180.png",
  },
  metadataBase: new URL("https://icu-cli.com"),
  openGraph: {
    title: "ICU — AI Supply Chain Threat Intelligence",
    description:
      "Real-time scanning of AI marketplaces for malicious packages. Prompt injection, data exfiltration, and obfuscation — detected and exposed.",
    type: "website",
    siteName: "ICU",
    url: "https://icu-cli.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "ICU — AI Supply Chain Threat Intelligence",
    description:
      "Scanning AI marketplaces for malicious packages. Prompt injection, data exfiltration, and obfuscation — detected and exposed.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="page-bg min-h-screen">
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
