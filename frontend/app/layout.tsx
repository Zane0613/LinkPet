import type { Metadata } from "next";
import { Inter, ZCOOL_KuaiLe } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
const zcool = ZCOOL_KuaiLe({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-zcool',
  preload: false,
});

export const metadata: Metadata = {
  title: "LinkPet - 你的AI电子宠物",
  description: "AI 陪伴式养成游戏",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh">
      <body className={`${inter.className} ${zcool.variable}`}>{children}</body>
    </html>
  );
}
