import type { Metadata, Viewport } from "next";
import { Geist, Poppins } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Fiados por Predir",
    template: "%s | Fiados",
  },
  description: "Lleva el control de lo que te deben tus clientes.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-EC" className={`${geist.variable} ${poppins.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{ style: { fontFamily: "var(--font-geist)", borderRadius: 16 } }}
        />
      </body>
    </html>
  );
}
