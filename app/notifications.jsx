import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
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
};

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "donor", label: "Donors" },
  { key: "hospital", label: "Hospitals" },
  { key: "request", label: "Requests" },
];

const INITIAL_NOTIFICATIONS = [
  {
    id: 1,
    title: "3 nearby donors found",
    message: "We found 3 A+ donors within 5 km of your location.",
    time: "2 min ago",
    timestamp: Date.now() - 2 * 60 * 1000,
    icon: "location-on",
    unread: true,
    category: "donor",
  },
  {
    id: 2,
    title: "Blood request accepted",
    message: "A donor has responded to your urgent blood request.",
    time: "12 min ago",
    timestamp: Date.now() - 12 * 60 * 1000,
    icon: "favorite",
    unread: true,
    category: "request",
  },
  {
    id: 3,
    title: "Hospital updated request",
    message: "City Hospital updated the request priority to urgent.",
    time: "30 min ago",
    timestamp: Date.now() - 30 * 60 * 1000,
    icon: "local-hospital",
    unread: false,
    category: "hospital",
  },
  {
    id: 4,
    title: "New donor registered nearby",
    message: "A B- donor just registered 3 km from your location.",
    time: "1 hr ago",
    timestamp: Date.now() - 60 * 60 * 1000,
    icon: "person-add",
    unread: false,
    category: "donor",
  },
  {
    id: 5,
    title: "Urgent request from hospital",
    message: "General Hospital needs O- blood urgently. Tap to respond.",
    time: "2 hrs ago",
    timestamp: Date.now() - 2 * 60 * 60 * 1000,
    icon: "notification-important",
    unread: true,
    category: "hospital",
  },
  {
    id: 6,
    title: "Your donation saved a life",
    message: "The patient at City Hospital has recovered. Thank you!",
    time: "Yesterday",
    timestamp: Date.now() - 24 * 60 * 60 * 1000,
    icon: "volunteer-activism",
    unread: false,
    category: "request",
  },
];

const NotificationsScreen = () => {
  const { isDarkMode } = useTheme();

  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const bgStyle = isDarkMode ? styles.darkContainer : styles.lightContainer;
  const textPrimary = isDarkMode ? styles.textPrimaryDark : styles.textPrimaryLight;
  const textSecondary = isDarkMode ? styles.textSecondaryDark : styles.textSecondaryLight;
  const surface = isDarkMode ? COLORS.surfaceDark : COLORS.surfaceLight;
  const headerBg = isDarkMode ? COLORS.backgroundDark : COLORS.backgroundLight;
  const filterBg = isDarkMode ? COLORS.backgroundDark : COLORS.backgroundLight;
  const filterBorderColor = isDarkMode ? "#2C2C2E" : "#E5E5EA";

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.unread).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    if (activeFilter === "all") return notifications;
    if (activeFilter === "unread") return notifications.filter((n) => n.unread);
    return notifications.filter((n) => n.category === activeFilter);
  }, [notifications, activeFilter]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  }, []);

  const markAsRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
  }, []);

  const deleteNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleLongPress = useCallback(
    (id) => {
      if (!selectionMode) {
        setSelectionMode(true);
        setSelectedIds(new Set([id]));
      }
    },
    [selectionMode]
  );

  const cancelSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const deleteSelected = useCallback(() => {
    Alert.alert(
      "Delete Notifications",
      `Delete ${selectedIds.size} notification${selectedIds.size > 1 ? "s" : ""}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setNotifications((prev) =>
              prev.filter((n) => !selectedIds.has(n.id))
            );
            cancelSelection();
          },
        },
      ]
    );
  }, [selectedIds, cancelSelection]);

  const markSelectedRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) =>
        selectedIds.has(n.id) ? { ...n, unread: false } : n
      )
    );
    cancelSelection();
  }, [selectedIds, cancelSelection]);

  const handleCardPress = useCallback(
    (item) => {
      if (selectionMode) {
        toggleSelect(item.id);
      } else {
        markAsRead(item.id);
      }
    },
    [selectionMode, toggleSelect, markAsRead]
  );

  const clearAll = useCallback(() => {
    Alert.alert(
      "Clear All Notifications",
      "This will remove all notifications. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: () => setNotifications([]),
        },
      ]
    );
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, bgStyle]}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: headerBg }]}>
        {selectionMode ? (
          <>
            <TouchableOpacity onPress={cancelSelection}>
              <MaterialIcons
                name="close"
                size={24}
                color={isDarkMode ? COLORS.textDarkPrimary : COLORS.textLightPrimary}
              />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, textPrimary]}>
              {selectedIds.size} selected
            </Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={markSelectedRead}
                style={styles.headerIconBtn}
              >
                <MaterialIcons name="done-all" size={22} color={COLORS.accentBlue} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={deleteSelected}
                style={styles.headerIconBtn}
              >
                <MaterialIcons name="delete-outline" size={22} color={COLORS.accentBlue} />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <TouchableOpacity onPress={() => router.back()}>
              <MaterialIcons
                name="arrow-back"
                size={24}
                color={isDarkMode ? COLORS.textDarkPrimary : COLORS.textLightPrimary}
              />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, textPrimary]}>Notifications</Text>
            <View style={styles.headerActions}>
              {unreadCount > 0 && (
                <TouchableOpacity
                  onPress={markAllRead}
                  style={styles.headerIconBtn}
                >
                  <MaterialIcons name="done-all" size={22} color={COLORS.accentBlue} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={clearAll}
                style={styles.headerIconBtn}
              >
                <MaterialIcons name="delete-sweep" size={22} color={COLORS.accentBlue} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* FILTER BAR */}
      <View
        style={[
          styles.filterBarWrapper,
          {
            backgroundColor: filterBg,
            borderBottomColor: filterBorderColor,
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBar}
        >
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveFilter(tab.key)}
                style={[
                  styles.filterTab,
                  isActive
                    ? styles.filterTabActive
                    : {
                        backgroundColor: isDarkMode
                          ? COLORS.surfaceDark
                          : COLORS.surfaceLight,
                        borderColor: filterBorderColor,
                      },
                ]}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    isActive
                      ? styles.filterTabTextActive
                      : textSecondary,
                  ]}
                >
                  {tab.label}
                  {tab.key === "unread" && unreadCount > 0
                    ? ` (${unreadCount})`
                    : ""}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* BODY */}
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.section}>
          <Text style={[styles.bigTitle, textPrimary]}>
            Recent Notifications
          </Text>
          <Text style={[styles.subTitle, textSecondary]}>
            Stay updated with donor matches and alerts
          </Text>
        </View>

        <View style={styles.section}>
          {filteredNotifications.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons
                name="notifications-none"
                size={48}
                color={isDarkMode ? COLORS.textDarkSecondary : COLORS.textLightSecondary}
              />
              <Text style={[styles.emptyTitle, textPrimary]}>
                No notifications
              </Text>
              <Text style={[styles.emptySubtitle, textSecondary]}>
                {activeFilter === "all"
                  ? "You're all caught up!"
                  : `No ${activeFilter} notifications right now.`}
              </Text>
            </View>
          ) : (
            filteredNotifications.map((item) => {
              const isSelected = selectedIds.has(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handleCardPress(item)}
                  onLongPress={() => handleLongPress(item.id)}
                  activeOpacity={0.75}
                  style={[
                    styles.notificationCard,
                    {
                      backgroundColor: isSelected
                        ? "rgba(217,45,32,0.08)"
                        : surface,
                      borderColor: isSelected
                        ? COLORS.accentBlue
                        : item.unread
                        ? "rgba(217,45,32,0.22)"
                        : "transparent",
                    },
                  ]}
                >
                  {/* Selection checkbox */}
                  {selectionMode && (
                    <View style={styles.checkboxWrap}>
                      <MaterialIcons
                        name={isSelected ? "check-circle" : "radio-button-unchecked"}
                        size={20}
                        color={
                          isSelected
                            ? COLORS.accentBlue
                            : isDarkMode
                            ? COLORS.textDarkSecondary
                            : COLORS.textLightSecondary
                        }
                      />
                    </View>
                  )}

                  <View
                    style={[
                      styles.iconWrap,
                      {
                        backgroundColor: item.unread
                          ? "rgba(217,45,32,0.10)"
                          : "rgba(148,163,184,0.12)",
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={item.icon}
                      size={22}
                      color={item.unread ? COLORS.accentBlue : "#64748B"}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.rowBetween}>
                      <Text
                        style={[styles.notificationTitle, textPrimary]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <View style={styles.rowEnd}>
                        {item.unread && <View style={styles.unreadDot} />}
                        {!selectionMode && (
                          <TouchableOpacity
                            onPress={() => deleteNotification(item.id)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={{ marginLeft: 8 }}
                          >
                            <MaterialIcons
                              name="close"
                              size={16}
                              color={
                                isDarkMode
                                  ? COLORS.textDarkSecondary
                                  : COLORS.textLightSecondary
                              }
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    <Text
                      style={[styles.notificationMessage, textSecondary]}
                      numberOfLines={2}
                    >
                      {item.message}
                    </Text>

                    <View style={styles.rowBetween}>
                      <Text
                        style={[
                          styles.notificationTime,
                          {
                            color: item.unread
                              ? COLORS.accentBlue
                              : isDarkMode
                              ? COLORS.textDarkSecondary
                              : COLORS.textLightSecondary,
                          },
                        ]}
                      >
                        {item.time}
                      </Text>
                      {item.unread && !selectionMode && (
                        <TouchableOpacity onPress={() => markAsRead(item.id)}>
                          <Text
                            style={[styles.markReadBtn, { color: COLORS.accentBlue }]}
                          >
                            Mark read
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, paddingTop: 30 },

  lightContainer: { backgroundColor: COLORS.backgroundLight },
  darkContainer: { backgroundColor: COLORS.backgroundDark },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  headerIconBtn: {
    padding: 2,
  },

  /* FILTER BAR */
  filterBarWrapper: {
    borderBottomWidth: 1,
    paddingBottom: 10,
  },

  filterBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
  },

  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },

  filterTabActive: {
    backgroundColor: COLORS.accentBlue,
    borderColor: COLORS.accentBlue,
  },

  filterTabText: {
    fontSize: 13,
    fontWeight: "600",
  },

  filterTabTextActive: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },

  section: {
    padding: 16,
  },

  bigTitle: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },

  subTitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
  },

  notificationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    gap: 10,
  },

  checkboxWrap: {
    justifyContent: "center",
    paddingTop: 2,
  },

  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  rowEnd: {
    flexDirection: "row",
    alignItems: "center",
  },

  notificationTitle: {
    fontWeight: "700",
    fontSize: 15,
    flex: 1,
    marginRight: 4,
  },

  notificationMessage: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },

  notificationTime: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: "600",
  },

  markReadBtn: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },

  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: COLORS.accentBlue,
  },

  /* EMPTY STATE */
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 8,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: 8,
  },

  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
  },

  textPrimaryLight: { color: COLORS.textLightPrimary },
  textSecondaryLight: { color: COLORS.textLightSecondary },
  textPrimaryDark: { color: COLORS.textDarkPrimary },
  textSecondaryDark: { color: COLORS.textDarkSecondary },
});

export default NotificationsScreen;