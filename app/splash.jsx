import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Dimensions, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context';

const COLORS = {
  primary: "#D0021B",
  backgroundLight: "#FFFFFF",
  backgroundDark: "#121212",
  surfaceLight: "#F0F5FA",
  surfaceDark: "#1E1E1E",
  textLightPrimary: "#1C1C1E",
  textDarkPrimary: "#F2F2F7",
  textLightSecondary: "#636366",
  textDarkSecondary: "#8E8E93",
  accentBlue: "#D92D20",
  gray200: "#E5E7EB",
  gray800: "#1F2937",
};

const SPLASH_DATA = [
  {
    id: '1',
    title: 'Blood Hive',
    description: 'Real-time alerts connecting you with nearby blood donation needs.',
    image: require("../assets/images/splash_screen1.png"),
  },
  {
    id: '2',
    title: 'Find Donors',
    description: 'Search for compatible donors in your area instantly.',
    image: require("../assets/images/splash_screen2.png"), 
  },
  {
    id: '3',
    title: 'Save Lives',
    description: 'Be the hero someone needs today. Your drop counts.',
    image: require("../assets/images/splash_screen3.png"),
  },
];

const SplashScreen = () => {
  const {isDarkMode, toggleTheme} = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  
  const containerStyle = isDarkMode ? styles.darkContainer : styles.lightContainer;
  const toggleThemeIconColor = isDarkMode ? COLORS.textDarkPrimary : COLORS.textLightPrimary;
  const headlineStyle = isDarkMode ? styles.textPrimaryDark : styles.textPrimaryLight;
  const bodyTextStyle = isDarkMode ? styles.textSecondaryDark : styles.textSecondaryLight;
  const loginLinkStyle = isDarkMode ? styles.textSecondaryDark : styles.textSecondaryLight;
  const pageIndicatorBg = isDarkMode ? COLORS.gray800 : COLORS.gray200;
  const buttonTextStyle = isDarkMode ? styles.textPrimaryDark : styles.buttonTextPrimaryLight;

  const handleNext = () => {
    if (currentIndex < SPLASH_DATA.length - 1) {
      flatListRef.current.scrollToIndex({ index: currentIndex + 1 });
    } else {
      router.push("/user_role_selection");
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
  if (viewableItems.length > 0) {
    setCurrentIndex(viewableItems[0].index);
  }
}).current;

const viewabilityConfig = useRef({
  itemVisiblePercentThreshold: 50,
}).current;

  return (
    <SafeAreaView style={[styles.safeArea, containerStyle]}>
      <View style={[styles.mainContent, containerStyle]}>

        <View style={styles.toggleThemeContainer}>
          <TouchableOpacity onPress={toggleTheme}>
            <MaterialCommunityIcons name="theme-light-dark" size={30} style={[styles.toggleThemeIcon, { color: toggleThemeIconColor}]} />
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={SPLASH_DATA}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          renderItem={({ item }) => (
            <View style={{ width: windowWidth, flex: 1 }}>
              <View style={styles.heroImageContainer}>
                <Image style={styles.heroImage} source={item.image} />
              </View>
              
              <View style={styles.textBlock}>
                <Text style={[styles.headline, headlineStyle]}>{item.title}</Text>
                <Text style={[styles.bodyText, bodyTextStyle]}>{item.description}</Text>
              </View>
            </View>
          )}
        />

        <View style={styles.pageIndicatorContainer}>
          {SPLASH_DATA.map((_, index) => (
            <View
              key={index}
              style={[
                styles.pageIndicatorDot,
                { 
                  backgroundColor: index === currentIndex ? COLORS.primary : pageIndicatorBg 
                }
              ]}
            />
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <View style={styles.buttonNavigation}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push("/user_role_selection")}
              activeOpacity={0.8}
            >
              <Text style={[styles.primaryButtonText, buttonTextStyle]}>Skip</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, {backgroundColor: COLORS.primary}]}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={[styles.primaryButtonText, {color: "#FFFFFF"}]}>Next</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            onPress={() => router.replace("/login")}
            activeOpacity={0.7}
          >
            <Text style={[styles.loginLink, loginLinkStyle]}>
              Already have an account? Log In
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const windowWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
  lightContainer: {
    backgroundColor: COLORS.backgroundLight,
  },
  darkContainer: {
    backgroundColor: COLORS.backgroundDark,
  },

  toggleThemeContainer: {
    marginTop: 40,
    marginBottom: 40,
    alignItems: "flex-end",
  },

  toggleThemeIcon: {
    marginEnd: 40,
  },

  heroImageContainer: {
    width: '100%',
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
  },

  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },

  textBlock: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  headline: {
    fontFamily: "Poppins-Regular",
    fontSize: 32, 
    fontWeight: '800', 
    lineHeight: 36, 
    textAlign: 'center',
    paddingHorizontal: 16, 
    paddingBottom: 12, 
  },
  bodyText: {
    fontSize: 16, 
    fontWeight: '400', 
    lineHeight: 24, 
    textAlign: 'center',
    paddingTop: 4, 
    paddingBottom: 12, 
    paddingHorizontal: 16, 
  },

  pageIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12, 
    paddingVertical: 20, 
  },
  pageIndicatorDot: {
    height: 8, 
    width: 8, 
    borderRadius: 4, 
  },

  buttonContainer: {
    paddingHorizontal: 16, 
    paddingBottom: 32,
    gap: 16, 
    alignItems: "center",
    justifyContent: "center",
  },

  buttonNavigation: {
    flexDirection: "row",
    gap: 60,  
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButton: {
    width: "35%",
    paddingHorizontal: 30, 
    paddingVertical: 11,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    fontSize: 18, 
    fontWeight: '600', 
  },
  loginLink: {
    textAlign: 'center',
    fontSize: 14, 
    fontWeight: '500', 
    marginBottom: 30,
  },
  
  textPrimaryLight: { color: COLORS.textLightPrimary },
  textSecondaryLight: { color: COLORS.textLightSecondary },
  textPrimaryDark: { color: COLORS.textDarkPrimary },
  textSecondaryDark: { color: COLORS.textDarkSecondary },
  buttonTextPrimaryLight: { color: COLORS.primary },
});

export default SplashScreen;