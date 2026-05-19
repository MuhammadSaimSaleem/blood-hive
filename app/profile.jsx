import { MaterialIcons } from "@expo/vector-icons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionRow, DangerZoneSection, StatsSection } from "../components/UIComponents";
import { useRole, useTheme } from "../context";
import { initDB, supabase } from "../lib";
import { cacheProfileImage } from "../lib/fileSystem";
import { getLocalProfile, saveLocalProfile } from "../lib/localDb";

const COLORS = {
  primary:            "#D0021B",
  backgroundLight:    "#FFFFFF",
  backgroundDark:     "#121212",
  surfaceLight:       "#F0F5FA",
  surfaceDark:        "#1E1E1E",
  textLightPrimary:   "#1C1C1E",
  textDarkPrimary:    "#F2F2F7",
  textLightSecondary: "#636366",
  textDarkSecondary:  "#8E8E93",
  accentBlue:         "#D92D20",
  accentRed:          "#D92D20",
  accentGreen:        "#7ED321",
  gray200:            "#E5E7EB",
  gray800:            "#1F2937",
};

const DEFAULT_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDD2BIK8-bI5jsYCuJA-ANyEqWlTru_YksHwmF6zRIwfJj6rEJgflj3mYoQ0lGHkq4xVhyFu_Yiq6p1PChdgwCBC21j67j3rSnJthtGwYjdHc8xuhAJUqTrGpW4OyiJxU_5HpVit4pfMz4PE0lzK9mwFbXEJmyGllUOEB-MQoUWvri3qTtndXuYYIDU1mKqADCkQe_uH6NGLRPHojeJpCE-9axwrjSFk56qaJFQK0r6R3mFH7MgeBXmlFK-TGbnGbWDaSraEzNiRw";

const ProfileScreen = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { role, toggleRole } = useRole();
  const isDonor = role === "donor";

  const [userData, setUserData]       = useState(null);
  const [profileImage, setProfileImage] = useState(DEFAULT_AVATAR);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);

  const bgStyle             = isDarkMode ? styles.darkContainer : styles.lightContainer;
  const textPrimary         = isDarkMode ? styles.textPrimaryDark   : styles.textPrimaryLight;
  const textSecondary       = isDarkMode ? styles.textSecondaryDark : styles.textSecondaryLight;
  const surface             = isDarkMode ? COLORS.surfaceDark : COLORS.surfaceLight;
  const toggleThemeIconColor = isDarkMode ? COLORS.textDarkPrimary : COLORS.textLightPrimary;

  // ─── Data Fetching ───────────────────────────────────────────────────────────
  const fetchProfileData = async () => {
    let dataLoaded = false;
    try {
      setLoading(true);
      await initDB();

      const cachedData = await getLocalProfile();
      if (cachedData) {
        dataLoaded = true;
        setUserData(cachedData);
        setProfileImage(cachedData.local_image_uri || DEFAULT_AVATAR);
        setLoading(false);
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const user = session.user;

      const { data: dbUser, error: dbError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (dbError) throw dbError;

      let finalProfileImage = DEFAULT_AVATAR;

      if (dbUser?.profile_image_url) {
        try {
          const localUri = await cacheProfileImage(dbUser.profile_image_url, user.id);
          finalProfileImage = localUri || dbUser.profile_image_url;
        } catch {
          finalProfileImage = dbUser.profile_image_url;
        }
      } else if (dbUser?.full_name) {
          const fileName = `${user.id}_${dbUser.full_name}.png`;
          const { data: urlData } = supabase.storage
            .from("profiles")
            .getPublicUrl(`${user.id}/${fileName}`);

          // getPublicUrl returns { data: { publicUrl } } — guard before using
          const publicUrl = urlData?.publicUrl;
          if (publicUrl) {
            finalProfileImage =
              (await cacheProfileImage(publicUrl, user.id)) || publicUrl;
          }
        }

      const updatedProfile = { ...dbUser, local_image_uri: finalProfileImage };
      await saveLocalProfile(updatedProfile);
      setUserData(updatedProfile);
      setProfileImage(finalProfileImage);
    } catch (error) {
      console.error("Profile Sync Error:", error.message);
      if (!dataLoaded) setProfileImage(DEFAULT_AVATAR);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProfileData();
  }, []);

  // ─── Logout ──────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    const logoutAction = async () => {
      const { error } = await supabase.auth.signOut();
      if (error) {
        Alert.alert("Logout Failed", error.message);
      } else {
        router.replace("/login");
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to log out?")) logoutAction();
    } else {
      Alert.alert("Log Out", "Are you sure you want to log out?", [
        { text: "Cancel",  style: "cancel"      },
        { text: "Log Out", style: "destructive", onPress: logoutAction },
      ]);
    }
  };

  // ─── Loading State ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, bgStyle, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.accentBlue} />
      </SafeAreaView>
    );
  }

  const profileRows = [
    { label: "Full Name", value: userData?.full_name || "N/A" },
    { label: "Blood Type", value: userData?.blood_type || "N/A" },
    { label: "Phone", value: userData?.phone_number ? `+92 ${userData.phone_number}` : "N/A" },
    { label: "Address", value: userData?.address || "N/A" },
    { label: "city", value: userData?.city || "N/A" },
    { label: "Email", value: userData?.email || "N/A" },
  ];

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.safeArea, bgStyle]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: bgStyle.backgroundColor }]}>
        <TouchableOpacity style={styles.headerIconButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={toggleThemeIconColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, textPrimary]}>Profile</Text>
        <TouchableOpacity onPress={toggleTheme} style={styles.headerIconButton}>
          <MaterialCommunityIcons name="theme-light-dark" size={26} color={toggleThemeIconColor} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accentBlue}
          />
        }
      >
        {/* ── Hero Card ─────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={[styles.profileTopCard, { backgroundColor: surface }]}>
            <Image source={{ uri: profileImage }} style={styles.profileHeroImage} />
            <Text style={[styles.profileName, textPrimary]}>
              {userData?.full_name || "User Name"}
            </Text>
            <Text style={[styles.profileRole, textSecondary]}>
              Current Role: {role}
            </Text>
            {userData?.is_verified && (
              <View style={styles.verifiedBadge}>
                <MaterialIcons name="verified" size={14} color="#fff" />
                <Text style={styles.verifiedText}>Verified Donor</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Impact Stats ──────────────────────────────────────────────────── */}
        {isDonor && <StatsSection isDarkMode={isDarkMode} userData={userData} />}

        {/* ── Personal Information ──────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, textSecondary]}>Personal Information</Text>
          <View style={[styles.card, { backgroundColor: surface }]}>
            {profileRows.map((item, index) => (
              <View
                key={index}
                style={[
                  styles.infoRow,
                  index !== profileRows.length - 1 && styles.infoRowBorder,
                  { borderBottomColor: isDarkMode ? "#2A2A2A" : COLORS.gray200 },
                ]}
              >
                <Text style={[styles.infoLabel, textSecondary]}>{item.label}</Text>
                <Text style={[styles.infoValue, textPrimary]}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Role Toggle ───────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, textSecondary]}>Role</Text>
          <View style={[styles.card, { backgroundColor: surface }]}>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.toggleTitle, textPrimary]}>Switch Role</Text>
                <Text style={[styles.toggleSubtitle, textSecondary]}>
                  Change between Recipient and Donor
                </Text>
              </View>
              <View style={styles.switchBlock}>
                <Text style={[styles.switchText, textSecondary]}>
                  {isDonor ? "Donor" : "Recipient"}
                </Text>
                <Switch
                  value={isDonor}
                  onValueChange={toggleRole}
                  trackColor={{
                    false: isDarkMode ? "#3A3A3C" : "#D1D5DB",
                    true:  "#FCA5A5",
                  }}
                  thumbColor={
                    isDonor
                      ? COLORS.accentBlue
                      : isDarkMode
                      ? "#8E8E93"
                      : "#FFFFFF"
                  }
                />
              </View>
            </View>
          </View>
        </View>

        {/* ── Account Settings ────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, textSecondary]}>Account Settings</Text>
          <View style={[styles.card, { backgroundColor: surface }]}>
            {[
              {
                icon: "lock",
                iconColor: "#6366F1",
                label: "Change Password",
                subtitle: "Update your account password",
                onPress: () => router.push("/change_password"),
              },
              {
                icon: "notifications",
                iconColor: "#FFD700", // Gold
                label: "Notifications",
                subtitle: "Manage alerts & reminders",
                onPress: () => router.push("/notifications_settings"),
              },
              {
                icon: "location-on",
                iconColor: COLORS.accentRed,
                label: "Location Settings",
                subtitle: "Control your location sharing",
                onPress: () => router.push("/location_settings"),
              },
              {
                icon: "privacy-tip",
                iconColor: "#10B981",
                label: "Privacy",
                subtitle: "Manage your data & visibility",
                onPress: () => router.push("/privacy_settings"),
              },
            ].map((item, index, array) => (
              <ActionRow
                key={index}
                {...item}
                isDarkMode={isDarkMode}
                isLast={index === array.length - 1}
              />
            ))}
          </View>
        </View>

        {/* ── Support & Legal ──────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, textSecondary]}>Support & Legal</Text>
          <View style={[styles.card, { backgroundColor: surface }]}>
            {[
              {
                icon: "help-outline",
                iconColor: "#3B82F6",
                label: "Help & Support",
                subtitle: "FAQs, contact us",
                onPress: () => router.push({ pathname: "/main", params: { tab: "support" } }),
              },
              {
                icon: "description",
                iconColor: "#8B5CF6",
                label: "Terms of Service",
                onPress: () => Linking.openURL("https://bloodhive.com/terms"),
              },
              {
                icon: "shield",
                iconColor: "#10B981",
                label: "Privacy Policy",
                onPress: () => Linking.openURL("https://bloodhive.com/privacy"),
              },
              {
                icon: "info-outline",
                iconColor: "#6B7280",
                label: "About",
                subtitle: "Version 1.0.0",
                onPress: () =>
                  Alert.alert("Blood Hive", "Version 1.0.0\nBuilt with ❤️ for donors & recipients."),
              },
            ].map((item, index, array) => (
              <ActionRow
                key={index}
                {...item}
                isDarkMode={isDarkMode}
                isLast={index === array.length - 1}
              />
            ))}
          </View>
        </View>

        {/* ── Actions ───────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, textSecondary]}>Actions</Text>
          <View style={[styles.card, { backgroundColor: surface }]}>
            <ActionRow
              icon="edit"
              iconColor="#6366F1"
              label="Edit Profile"
              subtitle="Update your info & photo"
              onPress={() => router.push("/edit_profile")}
              isDarkMode={isDarkMode}
            />
            <ActionRow
              icon="logout"
              iconColor={COLORS.accentRed}
              label="Log Out"
              subtitle="Sign out of your account"
              onPress={handleLogout}
              isDarkMode={isDarkMode}
              isLast
              danger
            />
          </View>
        </View>

        {/* ── Danger Zone ───────────────────────────────────────────────────── */}
        <DangerZoneSection isDarkMode={isDarkMode} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea:       { flex: 1 },
  centerContent:  { justifyContent: "center", alignItems: "center" },
  lightContainer: { backgroundColor: COLORS.backgroundLight },
  darkContainer:  { backgroundColor: COLORS.backgroundDark  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerIconButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle:      { fontSize: 20, fontWeight: "700", textAlign: "center", flex: 1 },

  section:      { paddingHorizontal: 16, paddingBottom: 8, marginTop: 10 },
  sectionLabel: {
    fontSize: 12, fontWeight: "600", textTransform: "uppercase",
    letterSpacing: 0.8, marginBottom: 8, marginLeft: 4,
  },

  profileTopCard: {
    borderRadius: 20, padding: 24, alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
  },
  profileHeroImage: {
    width: 100, height: 100, borderRadius: 50, marginBottom: 16,
    borderWidth: 2, borderColor: COLORS.accentBlue,
    backgroundColor: COLORS.gray200, resizeMode: "cover",
  },
  profileName: { fontSize: 24, fontWeight: "700" },
  profileRole: { fontSize: 14, marginTop: 4, textTransform: "capitalize" },
  verifiedBadge: {
    flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8,
    backgroundColor: COLORS.accentBlue, paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 20,
  },
  verifiedText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  card: {
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 8,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  }, 
  infoRow:       { paddingVertical: 14 },
  infoRowBorder: { borderBottomWidth: 1 },
  infoLabel:     { fontSize: 12, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue:     { fontSize: 16, fontWeight: "600" },

  toggleRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingVertical: 12,
  },
  toggleTitle:    { fontSize: 16, fontWeight: "700" },
  toggleSubtitle: { fontSize: 13, marginTop: 4, paddingRight: 10 },
  switchBlock:    { alignItems: "center", gap: 4 },
  switchText:     { fontSize: 12, fontWeight: "600" },

  textPrimaryLight:   { color: COLORS.textLightPrimary   },
  textSecondaryLight: { color: COLORS.textLightSecondary },
  textPrimaryDark:    { color: COLORS.textDarkPrimary    },
  textSecondaryDark:  { color: COLORS.textDarkSecondary  },
});

export default ProfileScreen;