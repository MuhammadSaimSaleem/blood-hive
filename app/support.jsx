import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from "../context";

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

const SupportScreen = () => {
  const { isDarkMode } = useTheme();
  const [openItem, setOpenItem] = useState(null);

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
  const borderColor = isDarkMode ? "#2A2A2A" : "#E5E7EB";
  const dropdownBg = isDarkMode ? "#18181B" : "#FFFFFF";

  const supportOptions = [
    {
      id: 1,
      title: "Call Support",
      desc: "Talk to our help team for urgent blood request issues.",
      icon: "call",
      contentTitle: "Emergency Helpline",
      contentText:
        "If you need urgent help for blood requests, donor matching, or emergency coordination, call our support team directly.",
      actionText: "Call Now",
      actionIcon: "call",
      onAction: () => Linking.openURL("tel:+923001234567"),
    },
    {
      id: 2,
      title: "Email Assistance",
      desc: "Send your issue details and receive a guided response.",
      icon: "email",
      contentTitle: "Support Email",
      contentText:
        "For detailed issues, screenshots, or non-urgent questions, send us an email and our team will respond with proper guidance.",
      actionText: "Send Email",
      actionIcon: "email",
      onAction: () =>
        Linking.openURL(
          "mailto:support@bloodhive.com?subject=Support Request&body=Hello Support Team,"
        ),
    },
    {
      id: 3,
      title: "FAQs & Resources",
      desc: "Read donation, request, and medical support guides.",
      icon: "menu-book",
      contentTitle: "Helpful Resources",
      contentText:
        "• Who can donate blood?\n• How often can someone donate?\n• How to request blood?\n• What to do in emergencies?\n• How to keep profile and contact details updated?",
      actionText: "View Guides",
      actionIcon: "article",
      onAction: () => router.push("/faq_details"),
    },
  ];

  const toggleDropdown = (id) => {
    setOpenItem(openItem === id ? null : id);
  };

  return (
    <SafeAreaView style={[styles.safeArea, bgStyle]}>
      <View style={[styles.header, { backgroundColor: headerBg }]}>
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

        <Text style={[styles.headerTitle, textPrimary]}>Support</Text>

        <View style={styles.headerIconButton} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={[styles.card, { backgroundColor: surface }]}>
            <Text style={[styles.cardTitle, textPrimary]}>Need Help?</Text>
            <Text style={[styles.bodyText, textSecondary]}>
              We are here to help you with donor search, request tracking,
              eligibility questions, and emergency coordination.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          {supportOptions.map((item) => {
            const isOpen = openItem === item.id;

            return (
              <View
                key={item.id}
                style={[
                  styles.dropdownWrapper,
                  {
                    backgroundColor: surface,
                    borderColor: isOpen
                      ? "rgba(217,45,32,0.25)"
                      : borderColor,
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.supportCard}
                  activeOpacity={0.8}
                  onPress={() => toggleDropdown(item.id)}
                >
                  <View style={styles.supportIconWrap}>
                    <MaterialIcons
                      name={item.icon}
                      size={22}
                      color={COLORS.accentBlue}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.supportTitle, textPrimary]}>
                      {item.title}
                    </Text>
                    <Text style={[styles.bodyText, textSecondary]}>
                      {item.desc}
                    </Text>
                  </View>

                  <MaterialIcons
                    name={isOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                    size={26}
                    color={isOpen ? COLORS.accentBlue : textSecondary.color}
                  />
                </TouchableOpacity>

                {isOpen && (
                  <View
                    style={[
                      styles.dropdownContent,
                      {
                        backgroundColor: dropdownBg,
                        borderTopColor: borderColor,
                      },
                    ]}
                  >
                    <Text style={[styles.dropdownTitle, textPrimary]}>
                      {item.contentTitle}
                    </Text>

                    <Text style={[styles.dropdownText, textSecondary]}>
                      {item.contentText}
                    </Text>

                    <TouchableOpacity
                      style={styles.actionButton}
                      activeOpacity={0.8}
                      onPress={item.onAction}
                    >
                      <MaterialIcons
                        name={item.actionIcon}
                        size={18}
                        color="#fff"
                      />
                      <Text style={styles.actionButtonText}>
                        {item.actionText}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomNav,
          {
            backgroundColor: isDarkMode
              ? COLORS.backgroundDark
              : COLORS.backgroundLight,
            borderTopColor: borderColor,
          },
        ]}
      >
        {[
          { icon: "dashboard", label: "Dashboard", route: "/dashboard" },
          { icon: "message", label: "Messages", route: "/messages" },
          { icon: "history", label: "History", route: "/history" },
          { icon: "support-agent", label: "Support", active: true, route: "/support" },
        ].map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.navItem}
            activeOpacity={0.8}
            onPress={() => router.push(item.route)}
          >
            <MaterialIcons
              name={item.icon}
              size={24}
              color={item.active ? COLORS.accentBlue : textSecondary.color}
            />
            <Text
              style={[
                styles.navLabel,
                {
                  color: item.active ? COLORS.accentBlue : textSecondary.color,
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
    fontSize: 22,
    fontWeight: "800",
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
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 20,
  },
  dropdownWrapper: {
    borderRadius: 14,
    marginBottom: 14,
    overflow: "hidden",
    borderWidth: 1,
  },
  supportCard: {
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  supportIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 9999,
    backgroundColor: "rgba(217,45,32,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  dropdownContent: {
    padding: 14,
    borderTopWidth: 1,
  },
  dropdownTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
  dropdownText: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 14,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.accentBlue,
    paddingVertical: 11,
    borderRadius: 10,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
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

export default SupportScreen;