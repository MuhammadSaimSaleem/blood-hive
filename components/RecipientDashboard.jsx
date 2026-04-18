import { MaterialIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  ImageBackground,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib";
import {
  BLOOD_TYPES,
  BloodBankCard,
  BloodUnitProgressChart,
  DonorActivityItem,
  NotificationItem,
  PulseDot,
  QuickActionCard
} from "./UIComponents";

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
  accentGreen: "#7ED321",
  accentBlue: "#1976D2",
  accentOrange: "#F57C00",
  accentPurple: "#7B1FA2",
  grayblue: "#26262b",
  lightGreen: "#7dd32138",
};

const COMPATIBILITY_MAP = {
  "O+": ["O+", "O-"],
  "O-": ["O-"],
  "A+": ["A+", "A-", "O+", "O-"],
  "A-": ["A-", "O-"],
  "B+": ["B+", "B-", "O+", "O-"],
  "B-": ["B-", "O-"],
  "AB+": ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"],
  "AB-": ["O-", "A-", "B-", "AB-"],
};

const mapDbRowToState = (row) => ({
  bloodType: row.blood_type ?? "O+",
  hospital: row.hospital_name ?? "",
  unitsRequired: row.units_required ?? 1,
  unitsFound: row.units_found ?? 0,
  status: row.status ?? "active",
  isCompleted: row.is_completed ?? false,
  isDeleted: row.is_deleted ?? false,
  matches: row.matches ?? 0,
  nearbyBanks: row.nearby_banks ?? 0,
  requestId: row.id,
  requestLabel: row.request_id ?? row.id,
});

const RecipientDashboard = ({
  isDarkMode,
  surface,
  textPrimary,
  textSecondary,
  currentRequestActive,
  setCurrentRequestActive,
  userId,
}) => {
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [isBloodTypeModalVisible, setBloodTypeModalVisible] = useState(false);
  const [isNotifModalVisible, setNotifModalVisible] = useState(false);
  const [isHistoryModalVisible, setHistoryModalVisible] = useState(false);
  const [isBanksModalVisible, setBanksModalVisible] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(3);
  const [selectedBloodType, setSelectedBloodType] = useState("O+");
  const [isLoading, setIsLoading] = useState(false);

  const [recipientData, setRecipientData] = useState({
    bloodType: "N/A",
    hospital: "",
    unitsRequired: 1,
    unitsFound: 0,
    status: "active",
    isCompleted: false,
    isDeleted: false,
    matches: 0,
    nearbyBanks: 0,
    requestId: null,
    requestLabel: null,
  });

  const [editUnits, setEditUnits] = useState("1");
  const [editUnitsFound, setEditUnitsFound] = useState("0");
  const [requestHistory, setRequestHistory] = useState([]);

  const progressPercentage =
    recipientData.unitsRequired > 0
      ? Math.min(
          (recipientData.unitsFound / recipientData.unitsRequired) * 100,
          100
        )
      : 0;

  const compatibleDonors =
    COMPATIBILITY_MAP[recipientData.bloodType] ?? [];

  const compatibilityRows = BLOOD_TYPES.map((bt) => {
    const isUniversal = bt === "O-";
    const isCompatible = compatibleDonors.includes(bt);
    return {
      type: bt,
      compatible: isCompatible,
      label: isUniversal
        ? "Universal Donor"
        : isCompatible
        ? "Compatible"
        : "Not Compatible",
    };
  });

  const donorActivity = [
    { name: "Ahmed Raza", time: "2 min ago", status: "Confirmed" },
    { name: "Sara Malik", time: "15 min ago", status: "Pending" },
    { name: "Usman Khan", time: "32 min ago", status: "Confirmed" },
    { name: "Fatima Shah", time: "1 hr ago", status: "Declined" },
  ];

  const bloodBanks = [
    { name: "City Blood Centre", distance: "0.8 km", available: true },
    { name: "LifeStream Bank", distance: "2.1 km", available: true },
    { name: "RedCross Unit", distance: "3.4 km", available: false },
    { name: "Hope Blood Bank", distance: "5.0 km", available: true },
  ];

  const notifications = [
    { icon: "person-add", title: "New Donor Matched", subtitle: "Ahmed Raza (O+) is 1.2 km away", time: "2m", color: COLORS.accentGreen },
    { icon: "local-hospital", title: "Blood Bank Update", subtitle: "City Blood Centre has O+ in stock", time: "18m", color: COLORS.accentBlue },
    { icon: "warning", title: "Urgency Alert", subtitle: "Your request is marked High urgency", time: "1h", color: COLORS.accentOrange },
    { icon: "check-circle", title: "Unit Confirmed", subtitle: "1 unit of O+ confirmed from donor", time: "2h", color: COLORS.accentGreen },
    { icon: "info", title: "Request Broadcast", subtitle: "42 donors have been notified", time: "3h", color: COLORS.accentBlue },
  ];

  const handleCompleteRequest = useCallback(async () => {
    const unitsRequired = recipientData.unitsRequired ?? 1;

    setRecipientData((prev) => ({
      ...prev,
      status: "completed",
      isCompleted: true,
      unitsFound: unitsRequired,
    }));
    setEditModalVisible(false);

    if (userId && recipientData.requestId) {
      const { error } = await supabase
        .from("blood_requests")
        .update({
          status: "completed",
          is_completed: true,
          units_found: unitsRequired,
        })
        .eq("id", recipientData.requestId)
        .eq("user_id", userId);

      if (error) {
        console.error("Failed to complete request:", error.message);
      }
    }

    setTimeout(() => setCurrentRequestActive(false), 2000);
  }, [userId, recipientData.requestId, recipientData.unitsRequired, setCurrentRequestActive]);

  const handleDeleteRequest = useCallback(async () => {
    setRecipientData((prev) => ({ ...prev, isDeleted: true }));
    setEditModalVisible(false);

    if (!userId || !recipientData.requestId) return;

    const { error } = await supabase
      .from("blood_requests")
      .update({ status: "deleted", is_deleted: true })
      .eq("id", recipientData.requestId)
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to delete request:", error.message);
      setRecipientData((prev) => ({ ...prev, isDeleted: false }));
      Alert.alert("Error", "Could not delete the request. Please try again.");
    }
  }, [userId, recipientData.requestId]);

  const handleSaveRequest = useCallback(async () => {
    const newUnitsRequired = parseInt(editUnits) || recipientData.unitsRequired;
    const newUnitsFound =
      parseInt(editUnitsFound) >= 0
        ? Math.min(parseInt(editUnitsFound), newUnitsRequired)
        : recipientData.unitsFound;

    setRecipientData((prev) => ({
      ...prev,
      unitsRequired: newUnitsRequired,
      unitsFound: newUnitsFound,
      bloodType: selectedBloodType,
    }));
    setEditModalVisible(false);

    if (!userId || !recipientData.requestId) return;

    const { error } = await supabase
      .from("blood_requests")
      .update({
        units_required: newUnitsRequired,
        units_found: newUnitsFound,
        blood_type: selectedBloodType,
      })
      .eq("id", recipientData.requestId)
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to save request:", error.message);
      Alert.alert("Error", "Could not save your changes. Please try again.");
    }
  }, [
    editUnits,
    editUnitsFound,
    selectedBloodType,
    userId,
    recipientData.requestId,
    recipientData.unitsRequired,
    recipientData.unitsFound,
  ]);

  useEffect(() => {
    if (
      currentRequestActive &&
      !recipientData.isCompleted &&
      recipientData.unitsRequired > 0 &&
      recipientData.unitsFound >= recipientData.unitsRequired
    ) {
      handleCompleteRequest();
    }
  }, [
    currentRequestActive,
    recipientData.unitsFound,
    recipientData.unitsRequired,
    recipientData.isCompleted,
    handleCompleteRequest,
  ]);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;

      const fetchActiveRequest = async () => {
        setIsLoading(true);
        try {
          const { data, error } = await supabase
            .from("blood_requests")
            .select("*")
            .eq("user_id", userId)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (error) {
            console.error("Error fetching active request:", error.message);
            setCurrentRequestActive(false);
            return;
          }

          if (data) {
            setCurrentRequestActive(true);
            const mapped = mapDbRowToState(data);
            setRecipientData(mapped);
            setEditUnits(String(data.units_required ?? 1));
            setEditUnitsFound(String(data.units_found ?? 0));
            setSelectedBloodType(data.blood_type ?? "O+");
          } else {
            setCurrentRequestActive(false);
          }

          const { data: historyData, error: historyError } = await supabase
            .from("blood_requests")
            .select("id, request_id, blood_type, units_required, created_at, status")
            .eq("user_id", userId)
            .in("status", ["completed", "cancelled"])
            .order("created_at", { ascending: false })
            .limit(10);

          if (historyError) {
            console.error("Error fetching history:", historyError.message);
          } else if (historyData) {
            setRequestHistory(
              historyData.map((row) => ({
                id: row.id,
                label: row.request_id ?? row.id,
                bloodType: row.blood_type,
                units: row.units_required,
                date: new Date(row.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "2-digit",
                  year: "numeric",
                }),
                status: row.status === "completed" ? "Completed" : "Cancelled",
              }))
            );
          }
        } finally {
          setIsLoading(false);
        }
      };

      fetchActiveRequest();
    }, [userId, setCurrentRequestActive])
  );

  useEffect(() => {
    if (!userId || !recipientData.requestId) return;

    const channel = supabase
      .channel(`blood_request:${recipientData.requestId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "blood_requests",
          filter: `id=eq.${recipientData.requestId}`,
        },
        (payload) => {
          const u = payload.new;
          setRecipientData((prev) => ({
            ...prev,
            unitsFound: u.units_found ?? prev.unitsFound,
            unitsRequired: u.units_required ?? prev.unitsRequired,
            status: u.status ?? prev.status,
            isCompleted: u.is_completed ?? prev.isCompleted,
            isDeleted: u.is_deleted ?? prev.isDeleted,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, recipientData.requestId]);

  return (
    <>
      {recipientData.isDeleted || !currentRequestActive ? (
        <View style={styles.section}>
          <View
            style={[
              styles.card,
              { backgroundColor: surface, alignItems: "center", paddingVertical: 30 },
            ]}
          >
            <MaterialIcons name="error-outline" size={40} color={textSecondary.color} />
            <Text
              style={[styles.bodyText, textSecondary, { marginTop: 10, fontWeight: "600" }]}
            >
              {isLoading ? "Loading your request…" : "No active blood requests."}
            </Text>
            {!isLoading && (
              <TouchableOpacity
                style={styles.detailsButton}
                onPress={() => router.push("/create_request")}
              >
                <MaterialIcons name="add" size={18} color="#fff" />
                <Text style={styles.detailsButtonText}>Request Blood</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <>
          {/* ── ACTIVE REQUEST CARD ─────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={[styles.card, { backgroundColor: surface, padding: 20 }]}>
              {/* Header */}
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.cardLabel, { color: COLORS.primary }]}>
                    Current Active Request
                  </Text>
                  <Text
                    style={[
                      styles.requestId,
                      {
                        color: isDarkMode
                          ? COLORS.textDarkSecondary
                          : COLORS.textLightSecondary,
                      },
                    ]}
                  >
                    {recipientData.requestLabel ?? recipientData.requestId}
                  </Text>
                </View>
                <View style={styles.headerRight}>
                  <View style={styles.liveRow}>
                    <PulseDot />
                    <Text
                      style={[
                        styles.findingDonorsText,
                      ]}
                    >
                      {recipientData.isCompleted ? "Completed" : "Finding Donors"}
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.notifBell}
                    onPress={() => {
                      setUnreadNotifs(0);
                      setNotifModalVisible(true);
                    }}
                  >
                    <MaterialIcons
                      name="notifications"
                      size={22}
                      color={
                        isDarkMode
                          ? COLORS.textDarkPrimary
                          : COLORS.textLightPrimary
                      }
                    />
                    {unreadNotifs > 0 && (
                      <View style={styles.notifDot}>
                        <Text style={styles.notifDotText}>{unreadNotifs}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Live row — PulseDot + "Finding Donors" */}
              

              <Text style={[styles.mainTitle, textPrimary]}>
                {recipientData.bloodType} Blood Needed
              </Text>
              <Text style={[styles.hospitalText, textSecondary]}>
                {recipientData.hospital} •{" "}
                {recipientData.unitsRequired - recipientData.unitsFound} units remaining
              </Text>

              {/* Stats */}
              <View style={styles.statsRow}>
                <View
                  style={[
                    styles.statBoxSmall,
                    isDarkMode ? { backgroundColor: COLORS.grayblue } : {},
                  ]}
                >
                  <Text style={styles.statNumberRed}>42</Text>
                  <Text style={styles.statLabelSmall}>DONORS NOTIFIED</Text>
                </View>
                <View
                  style={[
                    styles.statBoxSmall,
                    isDarkMode ? { backgroundColor: COLORS.grayblue } : {},
                  ]}
                >
                  <Text style={styles.statNumberBlue}>{recipientData.matches}</Text>
                  <Text style={styles.statLabelSmall}>POTENTIAL MATCHES</Text>
                </View>
                <View
                  style={[
                    styles.statBoxSmall,
                    isDarkMode ? { backgroundColor: COLORS.grayblue } : {},
                  ]}
                >
                  <Text style={[styles.statNumberRed, { color: COLORS.accentOrange }]}>
                    {recipientData.nearbyBanks}
                  </Text>
                  <Text style={styles.statLabelSmall}>NEARBY BANKS</Text>
                </View>
              </View>

              <BloodUnitProgressChart
                percentage={progressPercentage}
                textPrimary={textPrimary}
                handleCompleteRequest={handleCompleteRequest}
              />

              <TouchableOpacity
                style={[styles.detailsButton, { marginTop: 25 }]}
                onPress={() => {
                  setEditUnits(String(recipientData.unitsRequired ?? 1));
                  setEditUnitsFound(String(recipientData.unitsFound ?? 0));
                  setSelectedBloodType(recipientData.bloodType ?? "O+");
                  setEditModalVisible(true);
                }}
              >
                <Text style={styles.detailsButtonText}>Manage Request</Text>
                <MaterialIcons name="edit" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── QUICK ACTIONS ───────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, textPrimary]}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              <QuickActionCard
                icon="share"
                label="Share Request"
                color={COLORS.accentBlue}
                isDarkMode={isDarkMode}
                onPress={() =>
                  Alert.alert("Share", "Sharing your blood request with your contacts.")
                }
              />
              <QuickActionCard
                icon="local-hospital"
                label="Nearby Banks"
                color={COLORS.primary}
                isDarkMode={isDarkMode}
                onPress={() => setBanksModalVisible(true)}
              />
              <QuickActionCard
                icon="history"
                label="History"
                color={COLORS.accentPurple}
                isDarkMode={isDarkMode}
                onPress={() => setHistoryModalVisible(true)}
              />
              <QuickActionCard
                icon="call"
                label="Call Hospital"
                color={COLORS.accentGreen}
                isDarkMode={isDarkMode}
                onPress={() =>
                  Alert.alert("Call", "Connecting to City General Hospital…")
                }
              />
            </View>
          </View>

          {/* ── DONOR ACTIVITY ──────────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, textPrimary]}>Donor Activity</Text>
              <TouchableOpacity>
                <Text style={{ color: COLORS.primary, fontWeight: "700" }}>View All</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.card, { backgroundColor: surface, marginTop: 12, padding: 8 }]}>
              {donorActivity.map((d, i) => (
                <DonorActivityItem key={i} {...d} isDarkMode={isDarkMode} />
              ))}
            </View>
          </View>

          {/* ── BLOOD TYPE COMPATIBILITY ────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, textPrimary]}>Blood Compatibility</Text>
            <TouchableOpacity
              style={[styles.card, { backgroundColor: surface, marginTop: 12 }]}
              onPress={() => setBloodTypeModalVisible(true)}
              activeOpacity={0.85}
            >
              <View style={styles.compatRow}>
                <View style={styles.compatBloodBadge}>
                  <Text style={styles.compatBloodText}>{recipientData.bloodType}</Text>
                </View>
                <View style={styles.compatArrow}>
                  <MaterialIcons name="compare-arrows" size={28} color={COLORS.primary} />
                </View>
                <View style={styles.compatList}>
                  {compatibleDonors.slice(0, 4).map((bt) => (
                    <View key={bt} style={styles.compatChip}>
                      <Text style={styles.compatChipText}>{bt}</Text>
                    </View>
                  ))}
                  {compatibleDonors.length > 4 && (
                    <View style={styles.compatChip}>
                      <Text style={styles.compatChipText}>
                        +{compatibleDonors.length - 4}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <Text style={[styles.bodyText, textSecondary, { marginTop: 8 }]}>
                Tap to see full compatibility chart
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── TIPS CARD ───────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, textPrimary]}>While You Wait</Text>
            <View
              style={[
                styles.tipsCard,
                { backgroundColor: isDarkMode ? "#1a2535" : "#EAF4FB" },
              ]}
            >
              {[
                { icon: "water-drop", tip: "Stay hydrated — drink at least 2L of water.", color: COLORS.accentBlue },
                { icon: "hotel", tip: "Rest and avoid strenuous activity.", color: COLORS.accentPurple },
                { icon: "restaurant", tip: "Eat iron-rich foods like spinach and lentils.", color: COLORS.accentGreen },
              ].map((item, i) => (
                <View key={i} style={styles.tipRow}>
                  <MaterialIcons name={item.icon} size={20} color={item.color} />
                  <Text
                    style={[
                      styles.tipText,
                      {
                        color: isDarkMode
                          ? COLORS.textDarkPrimary
                          : COLORS.textLightPrimary,
                      },
                    ]}
                  >
                    {item.tip}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </>
      )}

      {/* ── CHRONIC CARE ──────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={isDarkMode ? styles.chronicCardDark : styles.chronicCard}>
          <Text style={isDarkMode ? styles.chronicTitleDark : styles.chronicTitle}>
            Chronic Care
          </Text>
          <Text style={isDarkMode ? styles.chronicSubtitleDark : styles.chronicSubtitle}>
            Scheduled support for Thalassemia & Dialysis patients.
          </Text>

          <TouchableOpacity
            style={isDarkMode ? styles.chronicActionRowRed : styles.chronicActionRow}
            onPress={() => router.push("/schedule_cycle")}
          >
            <MaterialIcons name="calendar-month" size={24} color="#FFF" />
            <Text style={isDarkMode ? styles.chronicActionTextDark : styles.chronicActionText}>
              Schedule Cycle
            </Text>
            <MaterialIcons name="arrow-forward" size={18} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>

          <TouchableOpacity
            style={isDarkMode ? styles.chronicActionRowRed : styles.chronicActionRow}
            onPress={() => router.push("/support")}
          >
            <MaterialIcons name="add-moderator" size={24} color="#FFF" />
            <Text style={isDarkMode ? styles.chronicActionTextDark : styles.chronicActionText}>
              Support Resources
            </Text>
            <MaterialIcons name="arrow-forward" size={18} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>

          <View style={isDarkMode ? styles.chronicDividerDark : styles.chronicDivider} />

          <View style={styles.nextSessionRow}>
            <View style={isDarkMode ? styles.sessionIconBoxDark : styles.sessionIconBox}>
              <MaterialIcons name="medical-services" size={24} color="#FFF" />
            </View>
            <View style={styles.sessionInfo}>
              <Text style={isDarkMode ? styles.sessionLabelDark : styles.sessionLabel}>
                NEXT SESSION
              </Text>
              <Text style={isDarkMode ? styles.textPrimaryDark : styles.sessionTime}>
                Oct 24, 09:00 AM
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── RESOURCES ─────────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, textPrimary]}>Resources</Text>

        <TouchableOpacity style={[styles.card, { backgroundColor: surface, marginTop: 12 }]}>
          <ImageBackground
            source={{ uri: "https://images.unsplash.com/photo-1615461066841-6116ecaabb04?q=80&w=500&auto=format&fit=crop" }}
            style={styles.resourceImage}
            imageStyle={{ borderRadius: 8 }}
          />
          <Text style={[styles.cardTitle, textPrimary, { marginTop: 12 }]}>
            Emergency Protocols
          </Text>
          <Text style={[styles.bodyText, textSecondary]}>
            What to do while waiting for a donor to arrive at the facility.
          </Text>
          <TouchableOpacity style={styles.resourceButton}>
            <Text style={styles.resourceButtonText}>Read Guide</Text>
            <MaterialIcons name="open-in-new" size={16} color="#fff" />
          </TouchableOpacity>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.card, { backgroundColor: surface, marginTop: 12 }]}>
          <ImageBackground
            source={{ uri: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=500&auto=format&fit=crop" }}
            style={styles.resourceImage}
            imageStyle={{ borderRadius: 8 }}
          />
          <Text style={[styles.cardTitle, textPrimary, { marginTop: 12 }]}>
            Blood Safety & Screening
          </Text>
          <Text style={[styles.bodyText, textSecondary]}>
            Understand how donated blood is tested and screened for safety.
          </Text>
          <TouchableOpacity style={styles.resourceButton}>
            <Text style={styles.resourceButtonText}>Read Guide</Text>
            <MaterialIcons name="open-in-new" size={16} color="#fff" />
          </TouchableOpacity>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/*  MODALS                                                             */}
      {/* ════════════════════════════════════════════════════════════════════ */}

      {/* ── Manage Request Modal ──────────────────────────────────────────── */}
      <Modal
        animationType="slide"
        transparent
        visible={isEditModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: isDarkMode
                    ? COLORS.surfaceDark
                    : COLORS.backgroundLight,
                },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.sectionTitle, textPrimary]}>Update Request</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color={textSecondary.color} />
                </TouchableOpacity>
              </View>

              {/* Blood Type */}
              <Text style={[styles.cardLabel, textSecondary, { marginBottom: 8, marginTop: 4 }]}>
                Blood Type
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {BLOOD_TYPES.map((bt) => (
                    <TouchableOpacity
                      key={bt}
                      style={[
                        styles.bloodTypeChip,
                        selectedBloodType === bt && styles.bloodTypeChipActive,
                        isDarkMode && selectedBloodType !== bt ? { borderColor: "#555" } : {},
                      ]}
                      onPress={() => setSelectedBloodType(bt)}
                    >
                      <Text
                        style={[
                          styles.bloodTypeChipText,
                          selectedBloodType === bt && styles.bloodTypeChipTextActive,
                          isDarkMode && selectedBloodType !== bt
                            ? { color: COLORS.textDarkPrimary }
                            : {},
                        ]}
                      >
                        {bt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Units Required */}
              <Text style={[styles.cardLabel, textSecondary, { marginBottom: 8, marginTop: 0 }]}>
                Units Required
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <TouchableOpacity
                  style={[
                    styles.detailsButton,
                    { flex: 0.2, backgroundColor: isDarkMode ? "#444" : "#EEE", marginTop: 0 },
                  ]}
                  onPress={() => {
                    const c = parseInt(editUnits) || 0;
                    if (c > 1) setEditUnits((c - 1).toString());
                  }}
                >
                  <MaterialIcons name="remove" size={24} color={isDarkMode ? "#FFF" : "#000"} />
                </TouchableOpacity>
                <TextInput
                  style={[
                    styles.input,
                    {
                      flex: 1,
                      backgroundColor: surface,
                      color: textPrimary.color,
                      textAlign: "center",
                      marginBottom: 0,
                    },
                  ]}
                  value={editUnits}
                  onChangeText={(t) => setEditUnits(t.replace(/[^0-9]/g, ""))}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={[
                    styles.detailsButton,
                    { flex: 0.2, backgroundColor: isDarkMode ? "#444" : "#EEE", marginTop: 0 },
                  ]}
                  onPress={() =>
                    setEditUnits(((parseInt(editUnits) || 0) + 1).toString())
                  }
                >
                  <MaterialIcons name="add" size={24} color={isDarkMode ? "#FFF" : "#000"} />
                </TouchableOpacity>
              </View>

              {/* Units Fulfilled */}
              <Text style={[styles.cardLabel, textSecondary, { marginBottom: 8, marginTop: 16 }]}>
                Units Fulfilled
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <TouchableOpacity
                  style={[
                    styles.detailsButton,
                    { flex: 0.2, backgroundColor: isDarkMode ? "#444" : "#EEE", marginTop: 0 },
                  ]}
                  onPress={() => {
                    const c = parseInt(editUnitsFound) || 0;
                    if (c > 0) setEditUnitsFound((c - 1).toString());
                  }}
                >
                  <MaterialIcons name="remove" size={24} color={isDarkMode ? "#FFF" : "#000"} />
                </TouchableOpacity>
                <TextInput
                  style={[
                    styles.input,
                    {
                      flex: 1,
                      backgroundColor: surface,
                      color: textPrimary.color,
                      textAlign: "center",
                      marginBottom: 0,
                    },
                  ]}
                  value={editUnitsFound}
                  onChangeText={(text) => {
                    const val = parseInt(text.replace(/[^0-9]/g, "")) || 0;
                    const max = parseInt(editUnits) || 0;
                    setEditUnitsFound(String(val > max ? max : val));
                  }}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={[
                    styles.detailsButton,
                    { flex: 0.2, backgroundColor: isDarkMode ? "#444" : "#EEE", marginTop: 0 },
                  ]}
                  onPress={() => {
                    const c = parseInt(editUnitsFound) || 0;
                    const max = parseInt(editUnits) || 0;
                    if (c < max) setEditUnitsFound((c + 1).toString());
                  }}
                >
                  <MaterialIcons name="add" size={24} color={isDarkMode ? "#FFF" : "#000"} />
                </TouchableOpacity>
              </View>

              {/* Actions */}
              <TouchableOpacity
                style={[styles.detailsButton, { backgroundColor: COLORS.accentGreen, marginTop: 20 }]}
                onPress={() =>
                  Alert.alert(
                    "Complete Request",
                    "Mark this request as completed?",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Confirm", onPress: handleCompleteRequest },
                    ]
                  )
                }
              >
                <MaterialIcons name="check-circle" size={18} color="#fff" />
                <Text style={styles.detailsButtonText}>Mark as Completed</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.detailsButton, { backgroundColor: COLORS.primary, marginTop: 10 }]}
                onPress={() =>
                  Alert.alert(
                    "Delete Request",
                    "This action cannot be undone. Are you sure?",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: handleDeleteRequest },
                    ]
                  )
                }
              >
                <MaterialIcons name="delete" size={18} color="#fff" />
                <Text style={styles.detailsButtonText}>Delete Request</Text>
              </TouchableOpacity>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                <TouchableOpacity
                  style={[
                    styles.detailsButton,
                    { flex: 1, backgroundColor: isDarkMode ? "#333" : "#CCC" },
                  ]}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text
                    style={[
                      styles.detailsButtonText,
                      { color: isDarkMode ? "#FFF" : "#000" },
                    ]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.detailsButton, { flex: 1 }]}
                  onPress={handleSaveRequest}
                >
                  <Text style={styles.detailsButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Notifications Modal ───────────────────────────────────────────── */}
      <Modal
        animationType="slide"
        transparent
        visible={isNotifModalVisible}
        onRequestClose={() => setNotifModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: isDarkMode ? COLORS.surfaceDark : COLORS.backgroundLight },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.sectionTitle, textPrimary]}>Notifications</Text>
              <TouchableOpacity onPress={() => setNotifModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={textSecondary.color} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {notifications.map((n, i) => (
                <NotificationItem key={i} {...n} isDarkMode={isDarkMode} />
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Request History Modal ─────────────────────────────────────────── */}
      <Modal
        animationType="slide"
        transparent
        visible={isHistoryModalVisible}
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: isDarkMode ? COLORS.surfaceDark : COLORS.backgroundLight },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.sectionTitle, textPrimary]}>Request History</Text>
              <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={textSecondary.color} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {requestHistory.length === 0 ? (
                <Text
                  style={[
                    styles.bodyText,
                    textSecondary,
                    { textAlign: "center", marginTop: 20 },
                  ]}
                >
                  No past requests found.
                </Text>
              ) : (
                requestHistory.map((r, i) => (
                  <View
                    key={i}
                    style={[
                      styles.historyItem,
                      { backgroundColor: isDarkMode ? COLORS.grayblue : "#F0F5FA" },
                    ]}
                  >
                    <View style={styles.historyLeft}>
                      <View style={styles.historyBloodBadge}>
                        <Text style={styles.historyBloodText}>{r.bloodType}</Text>
                      </View>
                      <View>
                        <Text
                          style={[
                            styles.historyId,
                            {
                              color: isDarkMode
                                ? COLORS.textDarkPrimary
                                : COLORS.textLightPrimary,
                            },
                          ]}
                        >
                          {r.label}
                        </Text>
                        <Text
                          style={[
                            styles.historyMeta,
                            {
                              color: isDarkMode
                                ? COLORS.textDarkSecondary
                                : COLORS.textLightSecondary,
                            },
                          ]}
                        >
                          {r.date} • {r.units} units
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.historyStatusBadge,
                        {
                          backgroundColor:
                            r.status === "Completed"
                              ? COLORS.accentGreen + "20"
                              : "#aaa3",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.historyStatusText,
                          {
                            color:
                              r.status === "Completed" ? COLORS.accentGreen : "#888",
                          },
                        ]}
                      >
                        {r.status}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Nearby Blood Banks Modal ──────────────────────────────────────── */}
      <Modal
        animationType="slide"
        transparent
        visible={isBanksModalVisible}
        onRequestClose={() => setBanksModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: isDarkMode ? COLORS.surfaceDark : COLORS.backgroundLight },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.sectionTitle, textPrimary]}>Nearby Blood Banks</Text>
              <TouchableOpacity onPress={() => setBanksModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={textSecondary.color} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {bloodBanks.map((b, i) => (
                <BloodBankCard key={i} {...b} isDarkMode={isDarkMode} />
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Blood Compatibility Modal ─────────────────────────────────────── */}
      <Modal
        animationType="fade"
        transparent
        visible={isBloodTypeModalVisible}
        onRequestClose={() => setBloodTypeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: isDarkMode ? COLORS.surfaceDark : COLORS.backgroundLight },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.sectionTitle, textPrimary]}>Compatibility Chart</Text>
              <TouchableOpacity onPress={() => setBloodTypeModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={textSecondary.color} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.bodyText, textSecondary, { marginBottom: 16 }]}>
              Compatible donors for {recipientData.bloodType} recipients:
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {compatibilityRows.map((row, i) => (
                <View
                  key={i}
                  style={[
                    styles.compatTableRow,
                    { backgroundColor: isDarkMode ? COLORS.grayblue : "#F0F5FA" },
                  ]}
                >
                  <View style={styles.compatTableBloodBadge}>
                    <Text style={styles.compatTableBloodText}>{row.type}</Text>
                  </View>
                  <Text
                    style={[
                      styles.compatTableLabel,
                      {
                        color: isDarkMode
                          ? COLORS.textDarkPrimary
                          : COLORS.textLightPrimary,
                      },
                    ]}
                  >
                    {row.label}
                  </Text>
                  <MaterialIcons
                    name={row.compatible ? "check-circle" : "cancel"}
                    size={22}
                    color={row.compatible ? COLORS.accentGreen : "#ccc"}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  section: { paddingHorizontal: 16, marginTop: 20 },
  card: {
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  cardTitle: { fontSize: 20, fontWeight: "700" },
  mainTitle: { fontSize: 28, fontWeight: "700", marginBottom: 4 },
  hospitalText: { fontSize: 16, marginBottom: 20, opacity: 0.8 },
  bodyText: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
    gap: 8,
  },
  statBoxSmall: { flex: 1, backgroundColor: "#F8F9FA", padding: 12, borderRadius: 12 },
  statNumberRed: { color: "#D32F2F", fontSize: 22, fontWeight: "700" },
  statNumberBlue: { color: "#1976D2", fontSize: 22, fontWeight: "700" },
  statLabelSmall: { fontSize: 9, color: "#666", fontWeight: "600", marginTop: 4 },
  detailsButton: {
    paddingHorizontal: 20,
    marginTop: 20,
    backgroundColor: COLORS.primary,
    height: 60,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  detailsButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  requestId: { fontSize: 10, fontWeight: "600", marginTop: 2, opacity: 0.7 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 2 },
  notifBell: { position: "relative", padding: 4 },
  notifDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  notifDotText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 10},
  findingDonorsText: {
    fontSize: 12,
    fontWeight: "700", backgroundColor: COLORS.lightGreen, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 4, color: COLORS.accentGreen
  },
  quickActionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 12 },
  compatRow: { flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 8 },
  compatBloodBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  compatBloodText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  compatArrow: { alignItems: "center", justifyContent: "center" },
  compatList: { flexDirection: "row", flexWrap: "wrap", gap: 6, flex: 1 },
  compatChip: {
    backgroundColor: COLORS.accentGreen + "20",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  compatChipText: { color: COLORS.accentGreen, fontWeight: "700", fontSize: 13 },
  compatTableRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    gap: 12,
  },
  compatTableBloodBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  compatTableBloodText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  compatTableLabel: { flex: 1, fontSize: 14, fontWeight: "600" },
  tipsCard: { borderRadius: 16, padding: 16, marginTop: 12, gap: 14 },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  tipText: { flex: 1, fontSize: 14, lineHeight: 20 },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  historyLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  historyBloodBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  historyBloodText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  historyId: { fontSize: 13, fontWeight: "700" },
  historyMeta: { fontSize: 11, marginTop: 2 },
  historyStatusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  historyStatusText: { fontSize: 11, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 300,
    maxHeight: "90%",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "600",
  },
  bloodTypeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#ddd",
    backgroundColor: "transparent",
  },
  bloodTypeChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  bloodTypeChipText: { fontSize: 14, fontWeight: "700", color: COLORS.textLightPrimary },
  bloodTypeChipTextActive: { color: "#fff" },
  chronicCard: { backgroundColor: "#3F72AF", borderRadius: 20, padding: 24, marginTop: 20 },
  chronicTitle: { color: "#FFF", fontSize: 26, fontWeight: "800", marginBottom: 8 },
  chronicSubtitle: { color: "rgba(255,255,255,0.8)", fontSize: 14, lineHeight: 20, marginBottom: 24 },
  chronicActionRow: {
    backgroundColor: "rgba(255,255,255,0.15)",
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  chronicActionText: { color: "#FFF", fontSize: 16, fontWeight: "600", flex: 1, marginLeft: 12 },
  chronicDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.1)", marginVertical: 12 },
  nextSessionRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  sessionIconBox: {
    width: 44,
    height: 44,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionInfo: { marginLeft: 16 },
  sessionLabel: { color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  sessionTime: { color: "#FFF", fontSize: 18, fontWeight: "700", marginTop: 2 },
  chronicCardDark: {
    backgroundColor: "#2e2828",
    borderRadius: 20,
    padding: 24,
    marginTop: 20,
    borderWidth: 1,
  },
  chronicTitleDark: { color: COLORS.textDarkPrimary, fontSize: 26, fontWeight: "800", marginBottom: 8 },
  chronicSubtitleDark: { color: COLORS.textDarkSecondary, fontSize: 14, lineHeight: 20, marginBottom: 24 },
  chronicActionRowRed: {
    backgroundColor: "#503f3f",
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 3,
  },
  chronicActionTextDark: { color: "#FFF", fontSize: 16, fontWeight: "700", flex: 1, marginLeft: 12 },
  chronicDividerDark: { height: 1, backgroundColor: "#503f3f83", marginVertical: 12 },
  sessionIconBoxDark: {
    width: 44,
    height: 44,
    backgroundColor: "#503f3f",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionLabelDark: { color: COLORS.textDarkSecondary, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  textPrimaryDark: { color: COLORS.textDarkPrimary },
  resourceImage: { width: "100%", aspectRatio: 16 / 9, marginTop: 8 },
  resourceButton: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    gap: 6,
  },
  resourceButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});

export default RecipientDashboard;