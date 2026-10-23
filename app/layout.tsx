import type { Metadata, Viewport } from "next";
import "./globals.css";
import Pwa from "./pwa";
export const metadata: Metadata = {
  title: "Studycoach · Küçük adımlar, büyük gelişim",
  description: "Öğrenci çalışma ve aile takip platformu",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Studycoach",
    statusBarStyle: "default",
  },
};
export const viewport: Viewport = {
  themeColor: "#244c42",
  width: "device-width",
  initialScale: 1,
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        {children}
        <Pwa />
      </body>
    </html>
  );
}
