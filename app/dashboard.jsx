import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Platform,
  RefreshControl,
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

// ─── Module-level cache — lives outside the component, survives tab unmounts ───
export const _profileCache = { userId: null, userName: "", role: "", fetched: false, activeView: "recipient" };

const DashboardScreen = ({ setActiveTab }) => {
  const { isDarkMode } = useTheme();
  const { role, setRole } = useRole();

  // Seed from cache so re-mounts are instant (no loading flash)
  const [loading, setLoading]   = useState(!_profileCache.fetched);
  const [userId, setUserId]     = useState(_profileCache.userId);
  const [userName, setUserName] = useState(_profileCache.userName);

  const [currentRequestActive, setCurrentRequestActive] = useState(false);
  const [activeView, setActiveView] = useState(_profileCache.activeView);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (_profileCache.fetched && _profileCache.role) {
      setRole(_profileCache.role);
    }
  }, [setRole]);

  // Survives tab switches / remounts of RecipientDashboard
  const recipientCache = useRef({
    recipientData:     null,
    requestHistory:    null,
    dashNotifications: null,
    donorActivity:     null,
    allDonorActivity:  null,
  });

  const normalisedRole = (role ?? "").toLowerCase();
  const isDonor     = normalisedRole === "donor";
  const isRecipient = normalisedRole === "recipient";
  const isBoth      = normalisedRole === "both";

  const showDonor     = isDonor     || (isBoth && activeView === "donor");
  const showRecipient = isRecipient || (isBoth && activeView === "recipient");

  const bgStyle      = isDarkMode ? styles.darkContainer    : styles.lightContainer;
  const textPrimary  = isDarkMode ? styles.textPrimaryDark  : styles.textPrimaryLight;
  const textSecondary = isDarkMode ? styles.textSecondaryDark : styles.textSecondaryLight;
  const surface      = isDarkMode ? COLORS.surfaceDark      : COLORS.surfaceLight;

  useEffect(() => {
    // Already fetched in a previous mount — skip entirely
    if (_profileCache.fetched) return;

    const fetchUserProfile = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) { router.replace("/login"); return; }

        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("role, full_name")
          .eq("id", user.id)
          .single();
        if (profileError) throw profileError;

        const resolvedRole = profile?.role?.toLowerCase() ?? "";
        const resolvedName = profile?.full_name?.split(" ")[0] ?? "";

        // Write to module cache before setting state
        _profileCache.userId   = user.id;
        _profileCache.userName = resolvedName;
        _profileCache.role     = resolvedRole;
        _profileCache.fetched  = true;

        setUserId(user.id);
        setUserName(resolvedName);
        if (resolvedRole) setRole(resolvedRole);
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
      if (now - lastPressTime < 2000) { BackHandler.exitApp(); return true; }
      lastPressTime = now;
      ToastAndroid.show("Press back again to exit", ToastAndroid.SHORT);
      return true;
    };
    const subscription = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => subscription.remove();
  }, []);

  const handleFabPress = () => {
    if (showDonor) { router.push("/find_requests"); return; }
    if (currentRequestActive) {
      Alert.alert(
        "Active Request",
        "You already have an active blood request. Please manage or close it before creating a new one."
      );
      return;
    }
    router.push("/create_request");
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) { router.replace("/login"); return; }

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("role, full_name")
        .eq("id", user.id)
        .single();
      if (profileError) throw profileError;

      const resolvedRole = profile?.role?.toLowerCase() ?? "";
      const resolvedName = profile?.full_name?.split(" ")[0] ?? "";

      _profileCache.userId   = user.id;
      _profileCache.userName = resolvedName;
      _profileCache.role     = resolvedRole;
      _profileCache.fetched  = true;

      // Clear recipient sub-cache so child components re-fetch fresh data
      recipientCache.current = {
        recipientData:     null,
        requestHistory:    null,
        dashNotifications: null,
        donorActivity:     null,
        allDonorActivity:  null,
      };

      setUserId(user.id);
      setUserName(resolvedName);
      if (resolvedRole) setRole(resolvedRole);
    } catch (err) {
      console.error("Error refreshing dashboard:", err?.message ?? err);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={[styles.safeArea, bgStyle]}>
      <View style={{ flex: 1 }}>
        <View style={styles.header}>
          <View style={{ marginRight: "auto" }}>
            <Text style={[styles.welcomeText, textSecondary]}>
              Hello, {userName || "there"} 👋
            </Text>
            <Text style={[styles.title, textPrimary]}>
              {isBoth
                ? activeView.charAt(0).toUpperCase() + activeView.slice(1)
                : normalisedRole
                  ? normalisedRole.charAt(0).toUpperCase() + normalisedRole.slice(1)
                  : "My"
              }{" "}
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
              size={18}
              color={isDarkMode ? COLORS.textDarkPrimary : COLORS.textLightPrimary}
            />
          </TouchableOpacity>

          {isBoth && (
            <TouchableOpacity
              style={[styles.toggleBtn, { backgroundColor: surface }]}
              onPress={() => setActiveView(v => {
                const next = v === "recipient" ? "donor" : "recipient";
                _profileCache.activeView = next;
                return next;
              })}
              accessibilityLabel={`Switch to ${activeView === "recipient" ? "donor" : "recipient"} dashboard`}
            >
              <MaterialIcons
                name="swap-horiz"
                size={18}
                color={isDarkMode ? COLORS.textDarkPrimary : COLORS.textLightPrimary}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: surface, marginLeft: 10 }]}
            onPress={() => router.push("/profile")}
            accessibilityLabel="Profile"
          >
            <MaterialIcons
              name="person"
              size={18}
              color={isDarkMode ? COLORS.textDarkPrimary : COLORS.textLightPrimary}
            />
          </TouchableOpacity>
        </View>

        {/* Inline spinner — only on very first load, header stays visible */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={[{ marginTop: 10 }, textSecondary]}>Loading Dashboard…</Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[COLORS.primary]}
                tintColor={COLORS.primary}
              />
            }
          >
            {!isDonor && !isRecipient && !isBoth && (
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

            {showRecipient && (
              <RecipientDashboard
                isDarkMode={isDarkMode}
                surface={surface}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
                currentRequestActive={currentRequestActive}
                setCurrentRequestActive={setCurrentRequestActive}
                userId={userId}
                cache={recipientCache}
              />
            )}

            {showDonor && (
              <DonorDashboard
                isDarkMode={isDarkMode}
                surface={surface}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
                userId={userId}
              />
            )}
          </ScrollView>
        )}
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
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

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
  title: { fontSize: 22, fontWeight: "800" },

  textPrimaryLight:   { color: COLORS.textLightPrimary   },
  textSecondaryLight: { color: COLORS.textLightSecondary },
  textPrimaryDark:    { color: COLORS.textDarkPrimary    },
  textSecondaryDark:  { color: COLORS.textDarkSecondary  },

  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  fab: {
    position:        "absolute",
    bottom:          28,
    right:           24,
    width:           56,
    height:          56,
    borderRadius:    28,
    backgroundColor: COLORS.primary,
    alignItems:      "center",
    justifyContent:  "center",
    shadowColor:     "#000",
    shadowOpacity:   0.25,
    shadowRadius:    8,
    elevation:       6,
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
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 10,
    gap: 4,
    marginLeft: 10,
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
});

export default DashboardScreen;