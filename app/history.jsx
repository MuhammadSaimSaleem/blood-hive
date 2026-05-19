import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../context";
import { supabase } from "../lib";

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
  accentGreen:        "#7ED321",
};

const ACTION_META = {
  created_blood_request:  { icon: "add-circle",         color: "#D92D20" },
  updated_blood_request:  { icon: "edit",               color: "#1976D2" },
  completed_blood_request:{ icon: "check-circle",       color: "#7ED321" },
  cancelled_blood_request:{ icon: "cancel",             color: "#636366" },
  deleted_blood_request:  { icon: "delete",             color: "#636366" },
  accepted_donation:      { icon: "volunteer-activism", color: "#7ED321" },
  declined_donation:      { icon: "thumb-down",         color: "#636366" },
  scheduled_appointment:  { icon: "event",              color: "#1976D2" },
  updated_profile:        { icon: "person",             color: "#7B1FA2" },
  registered:             { icon: "how-to-reg",         color: "#7ED321" },
};

const DEFAULT_META = { icon: "history", color: "#636366" };

const formatDate = (isoString) => {
  if (!isoString) return "";
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const HistoryScreen = ({ setActiveTab }) => {
  const { isDarkMode } = useTheme();

  const [logs, setLogs]         = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError]   = useState(false);

  const bgStyle       = isDarkMode ? styles.darkContainer    : styles.lightContainer;
  const textPrimary   = isDarkMode ? styles.textPrimaryDark  : styles.textPrimaryLight;
  const textSecondary = isDarkMode ? styles.textSecondaryDark: styles.textSecondaryLight;
  const surface       = isDarkMode ? COLORS.surfaceDark      : COLORS.surfaceLight;

  useEffect(() => {
    let isMounted = true;

    const fetchLogs = async () => {
      setIsLoading(true);
      setHasError(false);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !isMounted) return;

        const { data, error } = await supabase
          .from("activity_logs")
          .select("id, action, description, metadata, created_at")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (!isMounted) return;

        if (error) {
          console.error("Failed to fetch activity logs:", error.message);
          setHasError(true);
          return;
        }

        setLogs(data ?? []);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchLogs();

    return () => { isMounted = false; };
  }, []);

  return (
    <View style={[styles.safeArea, bgStyle]}>
      <View style={[styles.header, { backgroundColor: bgStyle.backgroundColor }]}>
        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={() => setActiveTab("dashboard")}
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
          {isLoading ? (
            <View style={styles.centeredState}>
              <ActivityIndicator size="large" color={COLORS.accentBlue} />
            </View>
          ) : hasError ? (
            <View style={styles.centeredState}>
              <MaterialIcons name="error-outline" size={44} color={COLORS.accentBlue} />
              <Text style={[styles.stateTitle, textPrimary]}>Something went wrong</Text>
              <Text style={[styles.stateSubtitle, textSecondary]}>
                Could not load your history. Pull to retry.
              </Text>
            </View>
          ) : logs.length === 0 ? (
            <View style={styles.centeredState}>
              <MaterialIcons
                name="history"
                size={44}
                color={isDarkMode ? COLORS.textDarkSecondary : COLORS.textLightSecondary}
              />
              <Text style={[styles.stateTitle, textPrimary]}>No activity yet</Text>
              <Text style={[styles.stateSubtitle, textSecondary]}>
                Your actions will appear here.
              </Text>
            </View>
          ) : (
            logs.map((log) => {
              const meta = ACTION_META[log.action] ?? DEFAULT_META;
              return (
                <View key={log.id} style={[styles.card, { backgroundColor: surface }]}>
                  <View style={styles.historyRow}>
                    <View
                      style={[
                        styles.historyIconWrap,
                        { backgroundColor: `${meta.color}15` },
                      ]}
                    >
                      <MaterialIcons name={meta.icon} size={22} color={meta.color} />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, textPrimary]}>
                        {log.description}
                      </Text>
                      {log.metadata?.blood_type && (
                        <Text style={[styles.metaTag, { color: meta.color }]}>
                          Blood Type: {log.metadata.blood_type}
                        </Text>
                      )}
                      {log.metadata?.units && (
                        <Text style={[styles.metaTag, { color: meta.color }]}>
                          Units: {log.metadata.units}
                        </Text>
                      )}
                      <Text style={[styles.dateText, { color: meta.color }]}>
                        {formatDate(log.created_at)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea:       { flex: 1 },
  lightContainer: { backgroundColor: COLORS.backgroundLight },
  darkContainer:  { backgroundColor: COLORS.backgroundDark  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerIconButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle:      { fontSize: 18, fontWeight: "700", textAlign: "center", flex: 1 },

  section: { padding: 16 },

  card: {
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    gap: 8,
    marginBottom: 14,
  },
  historyRow:     { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  historyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 15, fontWeight: "700", lineHeight: 20 },
  metaTag:   { fontSize: 12, fontWeight: "600", marginTop: 4 },
  dateText:  { fontSize: 13, fontWeight: "600", marginTop: 8 },

  centeredState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 8,
  },
  stateTitle:    { fontSize: 17, fontWeight: "700", marginTop: 8 },
  stateSubtitle: { fontSize: 14, textAlign: "center" },

  textPrimaryLight:   { color: COLORS.textLightPrimary   },
  textSecondaryLight: { color: COLORS.textLightSecondary },
  textPrimaryDark:    { color: COLORS.textDarkPrimary    },
  textSecondaryDark:  { color: COLORS.textDarkSecondary  },
});

export default HistoryScreen;