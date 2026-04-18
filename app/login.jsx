import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context';
import { supabase } from '../lib/supabase';

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

const LoginScreen = () => {
  const { isDarkMode, COLORS } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); // 2. Add loading state
  const [passwordVisible, setPasswordVisible] = useState(false);

  const theme = {
    background: isDarkMode ? COLORS.backgroundDark : COLORS.backgroundLight,
    surface: isDarkMode ? COLORS.surfaceDark : COLORS.surfaceLight,
    text: isDarkMode ? COLORS.textDarkPrimary : COLORS.textLightPrimary,
    subtext: isDarkMode ? COLORS.textDarkSecondary : COLORS.textLightSecondary,
    border: isDarkMode ? "#333" : COLORS.gray200,
  };

  // 3. Updated Login Logic with Supabase
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (error) {
      Alert.alert("Login Failed", error.message);
      setLoading(false);
    } else {
      // Session is automatically saved to AsyncStorage by the Supabase Client
      setLoading(false);
      router.replace('/dashboard');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: theme.text }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: theme.subtext }]}>
            Log in to continue your life-saving journey.
          </Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Email Address</Text>
            <TextInput
              placeholder="example@mail.com"
              placeholderTextColor={theme.subtext}
              value={email}
              onChangeText={setEmail}
              style={[
                styles.input,
                { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }
              ]}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Password</Text>
            <View style={[
              styles.input,
              styles.passwordContainer,
              { backgroundColor: theme.surface, borderColor: theme.border }
            ]}>
              <MaterialIcons name="lock" size={20} color={theme.subtext} style={styles.inputIconLeft} />
              <TextInput
                placeholder="••••••••"
                placeholderTextColor={theme.subtext}
                secureTextEntry={!passwordVisible}
                style={[styles.textInput, { color: theme.text }]}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)} style={styles.inputIconRight}>
                <MaterialIcons
                  name={passwordVisible ? "visibility" : "visibility-off"}
                  size={20}
                  color={theme.subtext}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.forgotPasswordContainer}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginButton, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.loginButtonText}>Log In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.signupContainer}>
            <Text style={[styles.signupText, { color: theme.subtext }]}>
              Don&apos;t have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.push("/user_role_selection")}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: "center" },
  textBlock: { marginBottom: 40 },
  title: { fontSize: 32, fontWeight: "800", marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 16, textAlign: "center", lineHeight: 24 },
  formContainer: { width: '100%' },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: "700", marginBottom: 8 },
  input: {
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordContainer: { paddingHorizontal: 12 },
  textInput: { flex: 1, height: '100%', fontSize: 16 },
  inputIconLeft: { marginRight: 10 },
  inputIconRight: { padding: 4 },
  errorText: { color: COLORS.primary, fontSize: 12, marginTop: 4, fontWeight: "600" },
  forgotPasswordContainer: { alignSelf: 'flex-end', marginBottom: 24 },
  forgotText: { color: COLORS.primary, fontSize: 14, fontWeight: "700" },
  loginButton: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  loginButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  signupContainer: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  signupText: { fontSize: 14 },
  signupLink: { color: COLORS.primary, fontSize: 14, fontWeight: "700" },
});

export default LoginScreen;