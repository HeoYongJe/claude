import type { Metadata } from "next";
import "./globals.css";
import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import ScrollProgress from "@/components/ScrollProgress";
import Nav from "@/components/Nav";
import RevealController from "@/components/RevealController";

export const metadata: Metadata = {
  title: "YUJIN LEE — Web Publisher Portfolio",
  description:
    "웹의 구조와 인터랙션을 설계하는 웹 퍼블리셔 이유진의 포트폴리오.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <head>
        <link
          rel="stylesheet"
          as="style"
          href="https://cdn.jsdelivr.net/gh/wanteddev/wanted-sans@v1.0.1/packages/wanted-sans/fonts/webfonts/variable/split/WantedSansVariable.min.css"
        />
        <link
          rel="stylesheet"
          as="style"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-jp.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col bg-light text-heading-light antialiased">
        <SmoothScrollProvider>
          <ScrollProgress />
          <Nav />
          <RevealController />
          {children}
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
