import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AegisLoop",
  description: "Controlled human and AI workflow collaboration"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
