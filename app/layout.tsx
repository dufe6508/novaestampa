import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nova Estampa",
  description: "Uniformes personalizados, pedidos, pagamento e produção em um lugar só.",
};

export const viewport: Viewport = {
  themeColor: "#f5f6f6",
  width: "device-width",
  initialScale: 1,
  // A área do aluno é mobile-first; deixar o usuário ampliar é acessibilidade básica.
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
