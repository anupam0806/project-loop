import "./globals.css";
import { Providers } from "../components/Providers";

export const metadata = {
  title: "Project LOOP - AI Customer Feedback Intelligence",
  description: "Calm, grounded customer feedback intelligence platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}