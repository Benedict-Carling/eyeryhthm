import type { Metadata } from "next";
import { Theme } from "@radix-ui/themes";
import { CalibrationProvider } from "../contexts/CalibrationContext";
import "@radix-ui/themes/styles.css";

export const metadata: Metadata = {
  title: "BlinkTrack",
  description: "Eye movement tracking with camera",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Theme appearance="dark" accentColor="indigo" grayColor="mauve">
          <CalibrationProvider>
            {children}
          </CalibrationProvider>
        </Theme>
      </body>
    </html>
  );
}
