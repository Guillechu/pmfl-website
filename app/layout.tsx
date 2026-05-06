import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "PMFL · Panama Major Football League",
  description:
    "Official home of the Panama Major Football League (PMFL). Teams, stats, schedule, highlights and more — sanctioned by the AFFP.",
  metadataBase: new URL("https://pmfl.example.com"),
  openGraph: {
    title: "PMFL · Panama Major Football League",
    description: "Panama's premier American football league.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <Navbar />
        <main className="min-h-[calc(100vh-200px)]">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
