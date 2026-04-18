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
import { SafeAreaView } from "react-native-safe-area-context";
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

const DashboardScreen = () => {
  const { isDarkMode } = useTheme();
  const { role, setRole } = useRole();

  // ── Auth / profile state ───────────────────────────────────────────────────
  const [loading,   setLoading]   = useState(true);
  const [userId,    setUserId]    = useState(null);
  const [userName,  setUserName]  = useState("");

  // ── Request state (lifted here so FAB can read it) ────────────────────────
  const [currentRequestActive, setCurrentRequestActive] = useState(false);

  // ── Derived helpers ────────────────────────────────────────────────────────
  // Normalise to lowercase so comparisons are always safe regardless of what
  // value is stored in the DB ("Donor" / "donor" / "DONOR" all work)
  const normalisedRole = (role ?? "").toLowerCase();
  const isDonor     = normalisedRole === "donor";
  const isRecipient = normalisedRole === "recipient";

  // ── Theme helpers ──────────────────────────────────────────────────────────
  const bgStyle       = isDarkMode ? styles.darkContainer      : styles.lightContainer;
  const textPrimary   = isDarkMode ? styles.textPrimaryDark    : styles.textPrimaryLight;
  const textSecondary = isDarkMode ? styles.textSecondaryDark  : styles.textSecondaryLight;
  const surface       = isDarkMode ? COLORS.surfaceDark        : COLORS.surfaceLight;

  // ── Fetch authenticated user + profile from Supabase ──────────────────────
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // 1. Get the currently signed-in user from Supabase Auth
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) {
          // Not signed in — redirect to login
          router.replace("/login");
          return;
        }

        // 2. Store the auth UID so child components (RecipientDashboard) can
        //    use it to query user-specific rows in the database
        setUserId(user.id);

        // 3. Fetch the profile row that holds the role & display name
        const { data: profile, error: profileError } = await supabase
          .from("users")            // adjust table name if different
          .select("role, full_name") // adjust column names if different
          .eq("id", user.id)
          .single();

        if (profileError) throw profileError;

        if (profile?.role) {
          setRole(profile.role.toLowerCase()); // normalise on the way in
        }

        if (profile?.full_name) {
          // Show only the first name in the greeting
          setUserName(profile.full_name.split(" ")[0]);
        }
      } catch (err) {
        console.error("Error fetching user profile:", err?.message ?? err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  // setRole is stable (from context) but listing it satisfies the linter
  }, [setRole]);

  // ── Android hardware back-button: double-press to exit ────────────────────
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
      return true; // prevent default (going back in stack)
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => subscription.remove();
  }, []);

  // ── FAB handler ────────────────────────────────────────────────────────────
  const handleFabPress = () => {
    if (isDonor) {
      // Donors volunteer to donate — take them to the find-requests screen
      router.push("/find_requests");
      return;
    }

    // Recipients create a new blood request
    if (currentRequestActive) {
      Alert.alert(
        "Active Request",
        "You already have an active blood request. Please manage or close it before creating a new one."
      );
      return;
    }

    router.push("/create_request");
  };

  // ── Loading screen ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, bgStyle, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[{ marginTop: 10 }, textSecondary]}>
          Loading Dashboard…
        </Text>
      </SafeAreaView>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.safeArea, bgStyle]}>
      <View style={{ flex: 1 }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={{ marginRight: "auto" }}>
            <Text style={[styles.welcomeText, textSecondary]}>
              {/* Fallback to a generic greeting while the name loads */}
              Hello, {userName || "there"} 👋
            </Text>
            <Text style={[styles.title, textPrimary]}>
              {/* Capitalise first letter; role comes in as lowercase */}
              {normalisedRole
                ? normalisedRole.charAt(0).toUpperCase() + normalisedRole.slice(1)
                : "My"}{" "}
              Dashboard
            </Text>
          </View>

          {/* Notification Button */}
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

          {/* Profile Button */}
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

        {/* ── Scrollable content ───────────────────────────────────────────── */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Show a message if the role has not been resolved yet */}
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
              userId={userId}           // ✅ now properly defined
            />
          )}

          {isDonor && (
            <DonorDashboard
              isDarkMode={isDarkMode}
              surface={surface}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              userId={userId}           // pass through in case DonorDashboard needs it
            />
          )}
        </ScrollView>
      </View>

      {/* ── Floating Action Button ───────────────────────────────────────────── */}
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

      {/* ── Bottom Navigation ────────────────────────────────────────────────── */}
      <View
        style={[
          styles.bottomNav,
          {
            backgroundColor: isDarkMode
              ? COLORS.backgroundDark
              : COLORS.backgroundLight,
            borderTopColor: isDarkMode ? "#2A2A2A" : "#E5E7EB",
          },
        ]}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = item.route === "/dashboard";
          const iconColor = isActive
            ? COLORS.primary
            : isDarkMode
            ? COLORS.textDarkSecondary
            : COLORS.textLightSecondary;

          return (
            <TouchableOpacity
              key={item.route}
              style={styles.navItem}
              onPress={() => router.navigate(item.route)}
              accessibilityLabel={item.label}
            >
              <MaterialIcons name={item.icon} size={24} color={iconColor} />
              <Text style={[styles.navLabel, { color: iconColor }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
};

// ── Static nav items (defined outside component to avoid re-creation) ─────────
const NAV_ITEMS = [
  { icon: "dashboard",     label: "Dashboard", route: "/dashboard"     },
  { icon: "chat",          label: "Messages",  route: "/messages"      },
  { icon: "history",       label: "History",   route: "/history"       },
  { icon: "support-agent", label: "Support",   route: "/support"       },
];

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
    position: "absolute",
    bottom: 96,
    right: 16,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 1,
    paddingBottom: 10,
  },

  navItem:  { alignItems: "center", justifyContent: "center" },
  navLabel: { fontSize: 12, fontWeight: "500", marginTop: 2  },

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