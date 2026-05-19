import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import { DonorDashboard, RecipientDashboard } from "../components";
import { useRole, useTheme } from "../context";
import { supabase } from "../lib/supabase";

const COLORS = {
  primary: "#d42b1f",
  backgroundLight: "#FFFFFF",
  backgroundDark: "#121212",
  surfaceLight: "#F0F5FA",
  surfaceDark: "#1E1E1E",
  textLightPrimary: "#1C1C1E",
  textDarkPrimary: "#F2F2F7",
  textLightSecondary: "#636366",
  textDarkSecondary: "#8E8E93",
};

const DashboardScreen = ({ setActiveTab }) => {
  const { isDarkMode } = useTheme();
  const { role, setRole } = useRole();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState("");
  const [currentRequestActive, setCurrentRequestActive] = useState(false);

  const normalisedRole = (role ?? "").toLowerCase();
  const isDonor = normalisedRole === "donor";
  const isRecipient = normalisedRole === "recipient";

  const bgStyle = isDarkMode ? styles.darkContainer : styles.lightContainer;
  const textPrimary = isDarkMode ? styles.textPrimaryDark : styles.textPrimaryLight;
  const textSecondary = isDarkMode ? styles.textSecondaryDark : styles.textSecondaryLight;
  const surface = isDarkMode ? COLORS.surfaceDark : COLORS.surfaceLight;

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) {
          router.replace("/login");
          return;
        }

        setUserId(user.id);

        const { data: profile, error: profileError } = await supabase
          .from("users")            
          .select("role, full_name") 
          .eq("id", user.id)
          .single();

        if (profileError) throw profileError;

        if (profile?.role) setRole(profile.role.toLowerCase());
        if (profile?.full_name) setUserName(profile.full_name.split(" ")[0]);
        
      } catch (err) {
        console.error("Error fetching user profile:", err?.message ?? err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [setRole]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    let lastPressTime = 0;

    const backAction = () => {
      const now = Date.now();
      if (now - lastPressTime < 2000) {
        BackHandler.exitApp();
        return true;
      }
      lastPressTime = now;
      ToastAndroid.show("Press back again to exit", ToastAndroid.SHORT);
      return true;
    };

    const subscription = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => subscription.remove();
  }, []);

  const handleFabPress = () => {
    if (isDonor) {
      router.push("/find_requests");
      return;
    }
    if (currentRequestActive) {
      Alert.alert(
        "Active Request",
        "You already have an active blood request. Please manage or close it before creating a new one."
      );
      return;
    }
    router.push("/create_request");
  };

  if (loading) {
    return (
      <View style={[styles.safeArea, bgStyle, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[{ marginTop: 10 }, textSecondary]}>
          Loading Dashboard…
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.safeArea, bgStyle]}>
      <View style={{ flex: 1 }}>
        <View style={styles.header}>
          <View style={{ marginRight: "auto" }}>
            <Text style={[styles.welcomeText, textSecondary]}>
              Hello, {userName || "there"} 👋
            </Text>
            <Text style={[styles.title, textPrimary]}>
              {normalisedRole
                ? normalisedRole.charAt(0).toUpperCase() + normalisedRole.slice(1)
                : "My"}{" "}
              Dashboard
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: surface }]}
            onPress={() => router.push("/notifications")}
            accessibilityLabel="Notifications"
          >
            <MaterialIcons
              name="notifications-none"
              size={24}
              color={isDarkMode ? COLORS.textDarkPrimary : COLORS.textLightPrimary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: surface, marginLeft: 10 }]}
            onPress={() => router.push("/profile")}
            accessibilityLabel="Profile"
          >
            <MaterialIcons
              name="person"
              size={24}
              color={isDarkMode ? COLORS.textDarkPrimary : COLORS.textLightPrimary}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {!isDonor && !isRecipient && (
            <View style={styles.noRoleContainer}>
              <MaterialIcons
                name="error-outline"
                size={40}
                color={isDarkMode ? COLORS.textDarkSecondary : COLORS.textLightSecondary}
              />
              <Text style={[styles.noRoleText, textSecondary]}>
                Your account role could not be determined.{"\n"}
                Please contact support.
              </Text>
            </View>
          )}

          {isRecipient && (
            <RecipientDashboard
              isDarkMode={isDarkMode}
              surface={surface}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              currentRequestActive={currentRequestActive}
              setCurrentRequestActive={setCurrentRequestActive}
              userId={userId}           
            />
          )}

          {isDonor && (
            <DonorDashboard
              isDarkMode={isDarkMode}
              surface={surface}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              userId={userId}           
            />
          )}
        </ScrollView>
      </View>

      <TouchableOpacity
        style={styles.fab}
        onPress={handleFabPress}
        accessibilityLabel={isDonor ? "Find donation requests" : "Create blood request"}
      >
        <MaterialIcons
          name={isDonor ? "volunteer-activism" : "add"}
          size={28}
          color="#fff"
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  centered: { justifyContent: "center", alignItems: "center" },

  lightContainer: { backgroundColor: COLORS.backgroundLight },
  darkContainer:  { backgroundColor: COLORS.backgroundDark  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },

  welcomeText: { fontSize: 14, fontWeight: "500" },
  title: { fontSize: 24, fontWeight: "800" },

  textPrimaryLight:   { color: COLORS.textLightPrimary   },
  textSecondaryLight: { color: COLORS.textLightSecondary },
  textPrimaryDark:    { color: COLORS.textDarkPrimary    },
  textSecondaryDark:  { color: COLORS.textDarkSecondary  },

  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  fab: {
    position:       "absolute",
    bottom:         28,
    right:          24,
    width:          56,
    height:         56,
    borderRadius:   28,
    backgroundColor: COLORS.primary,
    alignItems:     "center",
    justifyContent: "center",
    shadowColor:    "#000",
    shadowOpacity:  0.25,
    shadowRadius:   8,
    elevation:      6,
  },

  noRoleContainer: {
    marginTop: 60,
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  noRoleText: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
});

export default DashboardScreen;