import { SessionProvider } from "next-auth/react";
import type { AppProps } from "next/app";
import "../styles/globals.css"; // ou o caminho do seu CSS global

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider session={pageProps.session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
}
