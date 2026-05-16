import { MaterialIcons } from "@expo/vector-icons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from "../context";
import { supabase } from "../lib/supabase";

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
  accentGreen: "#7ED321",
  gray200: "#E5E7EB",
  gray800: "#1F2937",
  dangerBgLight: "#FEE2E2",
  dangerBgDark: "#2A1618",
  dangerBorderLight: "#FECACA",
  dangerBorderDark: "#7F1D1D",
};

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const EditProfileScreen = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState(null);

  const [fullName, setFullName] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");

  const bgStyle = isDarkMode ? styles.darkContainer : styles.lightContainer;
  const textPrimary = isDarkMode
    ? styles.textPrimaryDark
    : styles.textPrimaryLight;
  const textSecondary = isDarkMode
    ? styles.textSecondaryDark
    : styles.textSecondaryLight;
  const surface = isDarkMode ? COLORS.surfaceDark : COLORS.surfaceLight;
  const headerBg = isDarkMode
    ? COLORS.backgroundDark
    : COLORS.backgroundLight;
  const inputBg = isDarkMode ? "#18181B" : "#FFFFFF";
  const borderColor = isDarkMode ? "#2A2A2A" : COLORS.gray200;
  const iconColor = isDarkMode
    ? COLORS.textDarkPrimary
    : COLORS.textLightPrimary;

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Auth session missing!");

      setUserId(user.id);

      const { data: dbUser, error: dbError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (dbError) throw dbError;

      setFullName(dbUser?.full_name || "");
      setBloodType(dbUser?.blood_type || "");
      setPhone(dbUser?.phone || "");
      setCity(dbUser?.city || "");
      setEmail(dbUser?.email || user.email || "");
    } catch (error) {
      console.error("Error fetching edit profile data:", error.message);
      Alert.alert("Error", error.message || "Could not load profile.");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!fullName.trim()) {
      Alert.alert("Validation Error", "Please enter full name.");
      return false;
    }

    if (!bloodType.trim()) {
      Alert.alert("Validation Error", "Please select blood type.");
      return false;
    }

    if (!phone.trim()) {
      Alert.alert("Validation Error", "Please enter phone number.");
      return false;
    }

    if (!city.trim()) {
      Alert.alert("Validation Error", "Please enter city.");
      return false;
    }

    return true;
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      if (!userId) {
        throw new Error("User not found.");
      }

      const updates = {
        id: userId,
        full_name: fullName.trim(),
        blood_type: bloodType.trim(),
        phone: phone.trim(),
        city: city.trim(),
        email: email.trim(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("users").upsert(updates);

      if (error) throw error;

      Alert.alert("Success", "Profile updated successfully.", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error("Error updating profile:", error.message);
      Alert.alert("Update Failed", error.message || "Could not update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, bgStyle, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.accentBlue} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, bgStyle]}>
      <View style={[styles.header, { backgroundColor: headerBg }]}>
        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color={iconColor} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, textPrimary]}>Edit Profile</Text>

        <TouchableOpacity
          onPress={toggleTheme}
          style={[styles.headerIconButton, {opacity: 0}]}
        >
          <MaterialCommunityIcons
            name="theme-light-dark"
            size={26}
            color={iconColor}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={[styles.card, { backgroundColor: surface }]}>
            <Text style={[styles.sectionTitle, textPrimary]}>
              Personal Information
            </Text>
            <Text style={[styles.sectionSubtitle, textSecondary]}>
              Update your details below.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, textSecondary]}>FULL NAME</Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter full name"
                placeholderTextColor={textSecondary.color}
                style={[
                  styles.input,
                  {
                    backgroundColor: inputBg,
                    color: textPrimary.color,
                    borderColor,
                  },
                ]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, textSecondary]}>BLOOD TYPE</Text>

              <View style={styles.bloodTypeWrap}>
                {BLOOD_TYPES.map((type) => {
                  const selected = bloodType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      activeOpacity={0.8}
                      onPress={() => setBloodType(type)}
                      style={[
                        styles.bloodTypeChip,
                        {
                          backgroundColor: selected
                            ? COLORS.accentBlue
                            : inputBg,
                          borderColor: selected
                            ? COLORS.accentBlue
                            : borderColor,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.bloodTypeText,
                          {
                            color: selected ? "#fff" : textPrimary.color,
                          },
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, textSecondary]}>PHONE</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                placeholderTextColor={textSecondary.color}
                keyboardType="phone-pad"
                style={[
                  styles.input,
                  {
                    backgroundColor: inputBg,
                    color: textPrimary.color,
                    borderColor,
                  },
                ]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, textSecondary]}>Address</Text>
              <TextInput
                value={city}
                onChangeText={setCity}
                placeholder="Enter Address"
                placeholderTextColor={textSecondary.color}
                style={[
                  styles.input,
                  {
                    backgroundColor: inputBg,
                    color: textPrimary.color,
                    borderColor,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.primaryButton, saving && styles.disabledButton]}
            activeOpacity={0.8}
            onPress={handleSaveProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>Save Changes</Text>
                <MaterialIcons name="save" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.cancelButton,
              {
                backgroundColor: isDarkMode
                  ? COLORS.dangerBgDark
                  : COLORS.dangerBgLight,
                borderColor: isDarkMode
                  ? COLORS.dangerBorderDark
                  : COLORS.dangerBorderLight,
              },
            ]}
            activeOpacity={0.8}
            onPress={() => router.back()}
          >
            <MaterialIcons name="close" size={20} color={COLORS.accentBlue} />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  lightContainer: {
    backgroundColor: COLORS.backgroundLight,
  },
  darkContainer: {
    backgroundColor: COLORS.backgroundDark,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    flex: 1,
  },
  section: {
    padding: 16,
    paddingBottom: 8,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "600",
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: "500",
  },
  disabledInput: {
    opacity: 0.8,
  },
  helperText: {
    fontSize: 12,
    marginTop: 6,
  },
  bloodTypeWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  bloodTypeChip: {
    minWidth: 56,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  bloodTypeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  primaryButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.accentBlue,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    shadowColor: COLORS.accentBlue,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
  },
  cancelButtonText: {
    color: COLORS.accentBlue,
    fontSize: 16,
    fontWeight: "700",
  },
  textPrimaryLight: {
    color: COLORS.textLightPrimary,
  },
  textSecondaryLight: {
    color: COLORS.textLightSecondary,
  },
  textPrimaryDark: {
    color: COLORS.textDarkPrimary,
  },
  textSecondaryDark: {
    color: COLORS.textDarkSecondary,
  },
});

export default EditProfileScreen;