import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/feedback/toast-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Life OS",
  description: "Personal command center for daily control.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="de">
      <body><ToastProvider>{children}</ToastProvider></body>
    </html>
  );
}
