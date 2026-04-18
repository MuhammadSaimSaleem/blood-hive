import { useFonts } from 'expo-font';
import { Stack, router } from "expo-router";
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { RoleProvider, ThemeProvider, UserProvider, useTheme } from '../context';
import { initDB, supabase } from '../lib';

SplashScreen.preventAutoHideAsync();

function RootLayoutContent() {
  const { isDarkMode } = useTheme();

  useEffect(() => {
    initDB();
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard');
    });
  }, []);

  const [fontsLoaded] = useFonts({
    'Poppins-Black': require('../assets/fonts/Poppins/Poppins-Black.ttf'),
    'Poppins-BlackItalic': require('../assets/fonts/Poppins/Poppins-BlackItalic.ttf'),
    'Poppins-Bold': require('../assets/fonts/Poppins/Poppins-Bold.ttf'),
    'Poppins-BoldItalic': require('../assets/fonts/Poppins/Poppins-BoldItalic.ttf'),
    'Poppins-ExtraBold': require('../assets/fonts/Poppins/Poppins-ExtraBold.ttf'),
    'Poppins-ExtraBoldItalic': require('../assets/fonts/Poppins/Poppins-ExtraBoldItalic.ttf'),
    'Poppins-ExtraLight': require('../assets/fonts/Poppins/Poppins-ExtraLight.ttf'),
    'Poppins-ExtraLightItalic': require('../assets/fonts/Poppins/Poppins-ExtraLightItalic.ttf'),
    'Poppins-Italic': require('../assets/fonts/Poppins/Poppins-Italic.ttf'),
    'Poppins-Light': require('../assets/fonts/Poppins/Poppins-Light.ttf'),
    'Poppins-LightItalic': require('../assets/fonts/Poppins/Poppins-LightItalic.ttf'),
    'Poppins-Medium': require('../assets/fonts/Poppins/Poppins-Medium.ttf'),
    'Poppins-MediumItalic': require('../assets/fonts/Poppins/Poppins-MediumItalic.ttf'),
    'Poppins-Regular': require('../assets/fonts/Poppins/Poppins-Regular.ttf'),
    'Poppins-SemiBold': require('../assets/fonts/Poppins/Poppins-SemiBold.ttf'),
    'Poppins-SemiBoldItalic': require('../assets/fonts/Poppins/Poppins-SemiBoldItalic.ttf'),
    'Poppins-Thin': require('../assets/fonts/Poppins/Poppins-Thin.ttf'),
    'Poppins-ThinItalic': require('../assets/fonts/Poppins/Poppins-ThinItalic.ttf'),
});


  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <Stack screenOptions={{
        animation: "default",
        contentStyle: { backgroundColor: isDarkMode ? "#121212" : "#FFFFFF" },
        headerShown: false,
        }}>
        <Stack.Screen name="index" options={{ title: "Home" }} />
        <Stack.Screen name="splash" options={{ title: "Splash" }} />
        <Stack.Screen name="user_role_selection" options={{ title: "Role Selection" }} />
        <Stack.Screen name="registration" options={{ title: "Registration" }} />
        <Stack.Screen name="dashboard" options={{ title: "Dashboard" }} />
        <Stack.Screen name="profile" options={{ title: "Profile" }} />
        <Stack.Screen name="history" options={{ title: "History" }} />
        <Stack.Screen name="support" options={{ title: "Support" }} />
        <Stack.Screen name="debug" options={{ title: "Debug" }} />
        <Stack.Screen name="schedule_cycle" options={{ title: "Debug" }} />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <UserProvider>
      <RoleProvider>
        <ThemeProvider>
          <RootLayoutContent />
        </ThemeProvider>
      </RoleProvider>
    </UserProvider>
  );
}