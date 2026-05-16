import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
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
  accentGreen: "#7ED321",
  gray200: "#E5E7EB",
  gray800: "#1F2937",
};

const HistoryScreen = () => {
  const { isDarkMode } = useTheme();

  const bgStyle = isDarkMode ? styles.darkContainer : styles.lightContainer;
  const textPrimary = isDarkMode
    ? styles.textPrimaryDark
    : styles.textPrimaryLight;
  const textSecondary = isDarkMode
    ? styles.textSecondaryDark
    : styles.textSecondaryLight;
  const surface = isDarkMode ? COLORS.surfaceDark : COLORS.surfaceLight;

  const historyItems = [
    {
      title: "Blood Request Completed",
      desc: "Emergency O+ request for City Hospital was successfully fulfilled.",
      date: "Oct 12, 2023",
      icon: "check-circle",
      color: COLORS.accentGreen,
    },
    {
      title: "Donation Appointment",
      desc: "Scheduled appointment at Central Blood Bank.",
      date: "Sep 28, 2023",
      icon: "event",
      color: COLORS.accentBlue,
    },
    {
      title: "Request Cancelled",
      desc: "The request for B- blood was cancelled by the requester.",
      date: "Aug 15, 2023",
      icon: "cancel",
      color: "#636366",
    },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, bgStyle]}>
      <View style={[styles.header, { backgroundColor: bgStyle.backgroundColor }]}>
        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={() => router.push("/dashboard")}
          activeOpacity={0.8}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={isDarkMode ? COLORS.textDarkPrimary : COLORS.textLightPrimary}
          />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, textPrimary]}>History</Text>

        <View style={styles.headerIconButton} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          {historyItems.map((item, index) => (
            <View key={index} style={[styles.card, { backgroundColor: surface }]}>
              <View style={styles.historyRow}>
                <View style={[styles.historyIconWrap, { backgroundColor: `${item.color}15` }]}>
                  <MaterialIcons
                    name={item.icon}
                    size={22}
                    color={item.color}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, textPrimary]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.bodyText, textSecondary]}>
                    {item.desc}
                  </Text>
                  <Text style={[styles.dateText, { color: item.color }]}>
                    {item.date}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

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
        {[
          { icon: "dashboard", label: "Dashboard", route: "/dashboard" },
          { icon: "chat", label: "Messages", route: "/messages" },
          { icon: "history", label: "History", active: true, route: "/history" },
          { icon: "support-agent", label: "Support", route: "/support" },
        ].map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.navItem}
            activeOpacity={0.8}
            onPress={() => router.navigate(item.route)}
          >
            <MaterialIcons
              name={item.icon}
              size={24}
              color={item.active ? COLORS.accentBlue : (isDarkMode ? COLORS.textDarkSecondary : COLORS.textLightSecondary)}
            />
            <Text
              style={[
                styles.navLabel,
                {
                  color: item.active ? COLORS.accentBlue : (isDarkMode ? COLORS.textDarkSecondary : COLORS.textLightSecondary),
                },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
    justifyContent: "space-between",
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
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    flex: 1,
  },
  section: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    gap: 8,
    marginBottom: 14,
  },
  historyRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  historyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  dateText: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 8,
  },
  bottomNav: {
    paddingBottom: 10,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 1,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  textPrimaryLight: { color: COLORS.textLightPrimary },
  textSecondaryLight: { color: COLORS.textLightSecondary },
  textPrimaryDark: { color: COLORS.textDarkPrimary },
  textSecondaryDark: { color: COLORS.textDarkSecondary },
});

export default HistoryScreen;