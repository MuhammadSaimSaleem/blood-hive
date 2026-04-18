import { MaterialIcons } from "@expo/vector-icons";
import * as Crypto from 'expo-crypto';
import { router } from "expo-router";
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRole, useTheme, useUser } from '../context';


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

const RoleSelectionScreen = () => {
  const { isDarkMode } = useTheme();
  const { role, setRole } = useRole();
  const { setUserId } = useUser(); // ← destructure userId too

  const userId = Crypto.randomUUID().trim().toLowerCase();

  const containerStyle = isDarkMode ? styles.darkContainer : styles.lightContainer;
  const textPrimary = isDarkMode ? styles.textPrimaryDark : styles.textPrimaryLight;
  const textSecondary = isDarkMode ? styles.textSecondaryDark : styles.textSecondaryLight;
  const loginLinkStyle = isDarkMode ? styles.textSecondaryDark : styles.textSecondaryLight;
  const cardStyle = isDarkMode ? styles.cardDark : styles.cardLight;

  const handleContinue = async () => {
    setUserId(userId);
    router.push('/registration')
  };

  return (
    <SafeAreaView style={[styles.safeArea, containerStyle]}>
      <View style={[styles.mainContent]}>

        <View style={styles.headerContainer}>
          <Text style={[styles.headerTitle, textPrimary]}>
            Join Our Lifesaving Community
          </Text>
          <Text style={[styles.headerSubtitle, textSecondary]}>
            Please select your primary role to get started.
          </Text>
        </View>

        <View style={styles.cardsContainer}>
          <TouchableOpacity
            style={[
              styles.card, cardStyle,
              role === 'donor' && styles.cardActive
            ]}
            activeOpacity={0.8}
            onPress={() => setRole('donor')}
          >
            <MaterialIcons name="bloodtype" size={40} color={COLORS.primary} />
            <View style={styles.cardTextContainer}>
              <Text style={[styles.cardTitle, textPrimary]}>I&apos;m a Donor</Text>
              <Text style={[styles.cardText, textSecondary]}>
                Join to help save lives by donating blood.
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.card, cardStyle,
              role === 'recipient' && styles.cardActive
            ]}
            activeOpacity={0.8}
            onPress={() => setRole('recipient')}
          >
            <MaterialIcons
              name="volunteer-activism"
              size={40}
              color={COLORS.primary}
            />
            <View style={styles.cardTextContainer}>
              <Text style={[styles.cardTitle, textPrimary]}>
                I&apos;m a Recipient
              </Text>
              <Text style={[styles.cardText, textSecondary]}>
                Find nearby donors in times of need.
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              !role && { opacity: 0.6 }
            ]}
            onPress={handleContinue}
            activeOpacity={0.8}
            disabled={!role}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              router.dismissAll();
              router.replace("/login");
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.loginLink, loginLinkStyle]}>
              Already have an account? Log In
            </Text>
          </TouchableOpacity>

          {/* Added For Now */}
          <TouchableOpacity onPress={() => router.push('/dashboard')}>
            <Text style={[styles.loginLink, loginLinkStyle]}>Admin Button</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const windowWidth = Dimensions.get("window").width;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    width: "100%",
    maxWidth: 420,
  },

  lightContainer: {
    backgroundColor: COLORS.backgroundLight,
  },
  darkContainer: {
    backgroundColor: COLORS.backgroundDark,
  },

  backButtonContainer: {
    width: "100%",
    marginTop: 25,
    marginBottom: 40,
    alignItems: "flex-start",
  },

  backScreenIcon: {
    marginStart: 20,
  },

  headerContainer: {
    width: "100%",
    alignItems: "center",
    paddingTop: 100,
  },
  headerTitle: {
    fontFamily: "Poppins-Bold",
    fontSize: 30,
    textAlign: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: "400",
    textAlign: "center",
    paddingHorizontal: 16,
  },

  cardsContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginVertical: 20,
  },
  card: {
    flex: 1,
    minWidth: windowWidth / 2 - 32,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardLight: {
    backgroundColor: COLORS.surfaceLight,
    borderColor: COLORS.gray200,
  },
  cardDark: {
    backgroundColor: COLORS.surfaceDark,
    borderColor: COLORS.gray800,
  },
  cardActive: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: "rgba(208, 2, 27, 0.05)",
  },
  cardTextContainer: {
    alignItems: "center",
    marginTop: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  cardText: {
    fontSize: 14,
    textAlign: "center",
    paddingTop: 4,
  },

  footerContainer: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 16,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 9999,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
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
});

export default RoleSelectionScreen;