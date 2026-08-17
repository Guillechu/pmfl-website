import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "PMFL · Panama Major Football League",
  description:
    "Official home of the Panama Major Football League (PMFL). Teams, stats, schedule, highlights and more — sanctioned by the AFFP.",
  metadataBase: new URL("https://pmflpanama.com"),
  openGraph: {
    title: "PMFL · Panama Major Football League",
    description: "Panama's premier American football league.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // El HTML se sirve en oscuro, que es la apariencia de siempre. Si el
    // visitante eligió la clara, el script de abajo se lo aplica antes de
    // pintar.
    <html lang="es" className="dark">
      <head>
        {/*
          Va aquí y no en un useEffect a propósito: en <head> se ejecuta
          antes del primer pintado, así que no hay parpadeo oscuro para
          quien tiene elegida la apariencia clara. Es un script mínimo y
          sin dependencias por eso mismo.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('pmfl-tema')==='claro'){document.documentElement.classList.remove('dark')}}catch(e){}`,
          }}
        />
      </head>
      <body>
        <Navbar />
        <main className="min-h-[calc(100vh-200px)]">{children}</main>
        <Footer />
        <ThemeToggle />
      </body>
    </html>
  );
}
