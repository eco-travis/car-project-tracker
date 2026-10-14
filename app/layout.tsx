import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { Geist, Geist_Mono } from "next/font/google";
import { HydrationMarker } from "@/components/hydration-marker";
import "./globals.css";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Cayenne Project Tracker",
    template: "%s · Cayenne Tracker",
  },
  description: "Plan, track, and document the Cayenne build.",
  applicationName: "Cayenne Project Tracker",
  appleWebApp: { capable: true, title: "Cayenne", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#111111",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Render every route per request: pages read the signed-in user's data, and the
  // CSP nonce set in proxy.ts only reaches Next's scripts on dynamic renders.
  await connection();
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <HydrationMarker />
      </body>
    </html>
  );
}
