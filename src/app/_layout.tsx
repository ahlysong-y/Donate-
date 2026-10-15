import { Stack } from "expo-router";
import Head from "expo-router/head";
import { Platform } from "react-native";

export default function RootLayout() {
  return (
    <>
      {Platform.OS === "web" && (
        <Head>
          <title>Donate- | Ahlysong Live Tip</title>
          <meta name="referrer" content="no-referrer" />
        </Head>
      )}
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

