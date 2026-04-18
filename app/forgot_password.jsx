import { router } from "expo-router";
import { useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
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
};

const ForgotPasswordScreen = () => {
  const { isDarkMode } = useTheme();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const theme = {
    background: isDarkMode ? COLORS.backgroundDark : COLORS.backgroundLight,
    surface: isDarkMode ? COLORS.surfaceDark : COLORS.surfaceLight,
    text: isDarkMode ? COLORS.textDarkPrimary : COLORS.textLightPrimary,
    subtext: isDarkMode ? COLORS.textDarkSecondary : COLORS.textLightSecondary,
    border: isDarkMode ? "#333" : COLORS.gray200,
  };

  const handleResetPassword = () => {
    // Regex matching registration.jsx and login.jsx logic
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (emailRegex.test(email)) {
      setEmailError("");
      setSuccessMessage("A reset link has been sent to your email address.");
    } else {
      setSuccessMessage("");
      setEmailError("Invalid email");
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <View style={styles.imageContainer}>
          <Image 
            source={require('../assets/images/forgot_password.png')} 
            style={styles.vectorImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: theme.text }]}>Forgot Password?</Text>
          <Text style={[styles.subtitle, { color: theme.subtext }]}>
            Don&apos;t worry! Enter your email and we&apos;ll help you get back on track.
          </Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Email Address</Text>
            <TextInput
              placeholder="Enter your email"
              placeholderTextColor={theme.subtext}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) setEmailError("");
                if (successMessage) setSuccessMessage("");
              }}
              style={[
                styles.input,
                { 
                  backgroundColor: theme.surface, 
                  color: theme.text, 
                  borderColor: emailError ? COLORS.primary : theme.border 
                }
              ]}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}
          </View>

          <TouchableOpacity 
            style={styles.resetButton} 
            onPress={handleResetPassword}
            activeOpacity={0.8}
          >
            <Text style={styles.resetButtonText}>Send Reset Link</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.backContainer} 
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  vectorImage: {
    width: 220,
    height: 220,
  },
  textBlock: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  formContainer: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  errorText: {
    color: COLORS.primary,
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
  },
  successText: {
    color: "#28a745",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
  },
  resetButton: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    marginBottom: 24,
  },
  resetButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  backContainer: {
    alignItems: "center",
  },
  backText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "700",
  },
});

export default ForgotPasswordScreen;