import { Stack } from 'expo-router';
import { DarkTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, Fredoka_500Medium, Fredoka_600SemiBold } from '@expo-google-fonts/fredoka';
import { useEffect } from 'react';

import { initStorage } from '@/game/storage';
import { loadFullDictionary } from '@/game/dictionary';

SplashScreen.preventAutoHideAsync();
// storage backing FIRST — everything downstream reads through the engine store
// (MMKV on native via setBacking; localStorage on web needs no injection)
initStorage();
// full 135k dictionary swaps in behind the starter — fire-and-forget, off the
// boot path; validation generosity upgrades within seconds of launch
setTimeout(() => {
  loadFullDictionary();
}, 50);

export default function RootLayout() {
  // sworbl is dark, always (the game's visual identity — not a scheme choice)
  const [fontsLoaded] = useFonts({ Fredoka_500Medium, Fredoka_600SemiBold });
  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);
  if (!fontsLoaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={DarkTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#101014' },
            animation: 'fade',
          }}>
          {/* the board is a SHEET: swipe-up pulls it over home, back slides it down */}
          <Stack.Screen name="play" options={{ animation: 'slide_from_bottom' }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
