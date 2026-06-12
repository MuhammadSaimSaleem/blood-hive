import { MaterialIcons } from "@expo/vector-icons";
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
          .from("blood_requests")
          .select("id, request_id, blood_type, units_required, hospital_id, created_at, status, hospitals ( name )")
          .eq("user_id", session.user.id)
          .in("status", ["completed", "deleted"])
          .order("created_at", { ascending: false })
          .limit(50);

        if (!isMounted) return;

        if (error) {
          console.error("Failed to fetch history:", error.message);
          setHasError(true);
          return;
        }

        // Map blood_requests rows into the same shape the render expects
        setLogs(
          (data ?? []).map((row) => ({
            id: row.id,
            action:
              row.status === "completed"
                ? "completed_blood_request" : "cancelled_blood_request",
            // 2. Updated to safely extract the nested hospital name
            description: `${row.blood_type} Blood Request at ${row.hospitals?.name || "unknown hospital"}`,
            metadata: {
              blood_type: row.blood_type,
              units: row.units_required,
              request_id: row.request_id ?? row.id,
            },
            created_at: row.created_at,
          }))
        );
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
            // Replace the logs.map(...) block in the ScrollView with this:
            logs.map((log, index) => {
              const meta = ACTION_META[log.action] ?? DEFAULT_META;
              const statusLabel = log.action === "completed_blood_request" ? "Completed" : "Cancelled";

              return (
                <View
                  key={log.id}
                  style={[
                    styles.card,
                    { backgroundColor: surface, borderLeftColor: meta.color },
                  ]}
                >
                  {/* Top row: icon + status badge + date */}
                  <View style={styles.cardTopRow}>
                    <View style={[styles.iconCircle, { backgroundColor: `${meta.color}18` }]}>
                      <MaterialIcons name={meta.icon} size={20} color={meta.color} />
                    </View>

                    <View style={[styles.statusBadge, { backgroundColor: `${meta.color}18` }]}>
                      <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
                      <Text style={[styles.statusBadgeText, { color: meta.color }]}>
                        {statusLabel}
                      </Text>
                    </View>

                    <Text style={[styles.dateText, textSecondary]}>{formatDate(log.created_at)}</Text>
                  </View>

                  {/* Description */}
                  <Text style={[styles.cardTitle, textPrimary]} numberOfLines={2}>
                    {log.description}
                  </Text>

                  {/* Divider */}
                  <View style={[styles.divider, { backgroundColor: isDarkMode ? "#ffffff10" : "#00000008" }]} />

                  {/* Meta chips */}
                  <View style={styles.chipsRow}>
                    {log.metadata?.blood_type && (
                      <View style={[styles.chip, { backgroundColor: `${meta.color}12` }]}>
                        <MaterialIcons name="opacity" size={12} color={meta.color} />
                        <Text style={[styles.chipText, { color: meta.color }]}>
                          {log.metadata.blood_type}
                        </Text>
                      </View>
                    )}
                    {log.metadata?.units && (
                      <View style={[styles.chip, { backgroundColor: `${meta.color}12` }]}>
                        <MaterialIcons name="water-drop" size={12} color={meta.color} />
                        <Text style={[styles.chipText, { color: meta.color }]}>
                          {log.metadata.units} {log.metadata.units === 1 ? "unit" : "units"}
                        </Text>
                      </View>
                    )}
                    {log.metadata?.request_id && (
                      <View style={[styles.chip, { backgroundColor: isDarkMode ? "#ffffff0a" : "#0000000a" }]}>
                        <MaterialIcons
                          name="tag"
                          size={12}
                          color={isDarkMode ? COLORS.textDarkSecondary : COLORS.textLightSecondary}
                        />
                        <Text style={[styles.chipText, textSecondary]} numberOfLines={1}>
                          {String(log.metadata.request_id)}
                        </Text>
                      </View>
                    )}
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
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    gap: 10,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  dateText: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: "auto",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  divider: {
    height: 1,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
  },

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