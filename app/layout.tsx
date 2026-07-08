import type { Metadata, Viewport } from "next";
import "./globals.css";
import TabBar from "@/components/TabBar";
import AuthGate from "@/components/AuthGate";
import RegisterSW from "@/components/RegisterSW";

export const metadata: Metadata = {
  title: "Logbook",
  description: "Travel, books, TV & movies, and concerts — one personal tracker.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Logbook",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#1f2a44",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthGate>
          <main>{children}</main>
          <TabBar />
        </AuthGate>
        <RegisterSW />
      </body>
    </html>
  );
}
