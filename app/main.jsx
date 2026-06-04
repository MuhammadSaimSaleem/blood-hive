import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context";

import { useLocalSearchParams } from "expo-router";
import DashboardScreen from "./dashboard";
import HistoryScreen from "./history";
import ChatScreen from "./messages";
import SupportScreen from "./support";

const COLORS = {
  primary: "#D0021B", 
  backgroundLight: "#FFFFFF",
  backgroundDark: "#121212",
  textLightSecondary: "#636366",
  textDarkSecondary: "#8E8E93",
};

export default function MainScreen() {
  const { isDarkMode } = useTheme();
  const { tab } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    if (tab) {
      setActiveTab(tab);
    }
  }, [tab]);

  const renderFragment = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardScreen setActiveTab={setActiveTab} />;
      case "messages":
        return <ChatScreen setActiveTab={setActiveTab} />;
      case "history":
        return <HistoryScreen setActiveTab={setActiveTab} />;
      case "support":
        return <SupportScreen setActiveTab={setActiveTab} />;
      default:
        return <DashboardScreen setActiveTab={setActiveTab} />;
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDarkMode ? COLORS.backgroundDark : COLORS.backgroundLight }]}>
      
      {/* Sub-View Container */}
      {renderFragment()}

      {/* Unified Bottom Navigation */}
      <View style={[styles.bottomNav, {
        backgroundColor: isDarkMode ? COLORS.backgroundDark : COLORS.backgroundLight,
        borderTopColor: isDarkMode ? "#2A2A2A" : "#E5E7EB",
      }]}>
        {[
          { id: "dashboard", icon: "dashboard", label: "Dashboard" },
          { id: "messages", icon: "chat", label: "Messages" },
          { id: "history", icon: "history", label: "History" },
          { id: "support", icon: "support-agent", label: "Support" },
        ].map((item) => {
          const isActive = activeTab === item.id;
          const iconColor = isActive
            ? COLORS.primary
            : isDarkMode
            ? COLORS.textDarkSecondary
            : COLORS.textLightSecondary;

          return (
            <TouchableOpacity
              key={item.id}
              style={styles.navItem}
              onPress={() => setActiveTab(item.id)}
              activeOpacity={0.8}
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
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  bottomNav: {
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
  navItem: { alignItems: "center", justifyContent: "center" },
  navLabel: { fontSize: 12, fontWeight: "500", marginTop: 2 },
});