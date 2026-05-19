import { MaterialIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib";
import {
  AchievementBadge,
  COLORS,
  DonationHistoryRow,
  EligibilityTimer,
  HealthTipCard,
  ImpactStatCard,
  UrgentRequestCard,
} from "./UIComponents";

// ─── helpers ────────────────────────────────────────────────────────────────

const NOTIF_TYPE_META = {
  blood_request:    { icon: "favorite",               color: "#D42B1F" },
  donation_match:   { icon: "person-add",             color: "#7ED321" },
  donor_registered: { icon: "person-add",             color: "#7ED321" },
  hospital_update:  { icon: "local-hospital",         color: "#1976D2" },
  urgent_request:   { icon: "notification-important", color: "#F57C00" },
  reminder:         { icon: "alarm",                  color: "#7B1FA2" },
  donors_found:     { icon: "location-on",            color: "#7ED321" },
  donation_saved:   { icon: "volunteer-activism",     color: "#7ED321" },
};

const formatNotifTime = (isoString) => {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

const formatDate = (isoDate) => {
  if (!isoDate) return "N/A";
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short", day: "2-digit", year: "numeric",
  });
};

/** Days until a donor is eligible again (90-day rule from last donation). */
const daysUntilEligible = (lastDonationDate) => {
  if (!lastDonationDate) return 0;
  const next = new Date(lastDonationDate);
  next.setDate(next.getDate() + 90);
  const diff = Math.ceil((next - Date.now()) / 86400000);
  return Math.max(diff, 0);
};

/** Compute unlocked achievements based on real donation count. */
const buildAchievements = (totalDonations) => [
  {
    icon: "favorite",
    title: "First Drop",
    subtitle: "1st donation",
    color: COLORS.primary,
    unlocked: totalDonations >= 1,
  },
  {
    icon: "military-tech",
    title: "Life Saver",
    subtitle: "3 lives saved",
    color: COLORS.accentGold,
    unlocked: totalDonations >= 3,
  },
  {
    icon: "workspace-premium",
    title: "Hero",
    subtitle: "5 donations",
    color: COLORS.accentPurple,
    unlocked: totalDonations >= 5,
  },
  {
    icon: "local-fire-department",
    title: "Champion",
    subtitle: "10 donations",
    color: COLORS.accentOrange,
    unlocked: totalDonations >= 10,
  },
];

const HEALTH_TIPS = [
  { icon: "water-drop", tip: "Drink 500ml of water at least 2 hours before donating.", color: COLORS.accentBlue },
  { icon: "restaurant", tip: "Eat a light iron-rich meal before your appointment.", color: COLORS.accentGreen },
  { icon: "bedtime",    tip: "Get a full 8 hours of sleep the night before donating.", color: COLORS.accentPurple },
];

// ─── component ───────────────────────────────────────────────────────────────

const DonorDashboard = ({ isDarkMode, surface, textPrimary, textSecondary, userId }) => {
  // ── UI state ──────────────────────────────────────────────────────────────
  const [isAvailable,            setIsAvailable]            = useState(false);
  const [availabilityLoading,    setAvailabilityLoading]    = useState(false);
  const [isScheduleModalVisible, setScheduleModalVisible]   = useState(false);
  const [isHistoryModalVisible,  setHistoryModalVisible]    = useState(false);
  const [isRespondModalVisible,  setRespondModalVisible]    = useState(false);
  const [isNotifModalVisible,    setNotifModalVisible]      = useState(false);
  const [selectedRequest,        setSelectedRequest]        = useState(null);
  const [selectedSlot,           setSelectedSlot]           = useState(null);
  const [respondStep,            setRespondStep]            = useState(1);
  const [isLoading,              setIsLoading]              = useState(true);
  const [respondLoading,         setRespondLoading]         = useState(false);
  const [scheduleLoading,        setScheduleLoading]        = useState(false);

  // ── data state ────────────────────────────────────────────────────────────
  const [donorProfile, setDonorProfile] = useState({
    bloodType:        "N/A",
    lastDonation:     null,
    totalDonations:   0,
    livesSaved:       0,
    points:           0,
    daysUntilEligible: 0,
  });

  const [urgentRequests,    setUrgentRequests]    = useState([]);
  const [donationHistory,   setDonationHistory]   = useState([]);
  const [scheduleSlots,     setScheduleSlots]     = useState([]);
  const [notifications,     setNotifications]     = useState([]);
  const [unreadNotifs,      setUnreadNotifs]       = useState(0);

  // refs for realtime channels
  const userChannelRef    = useRef(null);
  const requestsChannelRef = useRef(null);
  const schedulesChannelRef = useRef(null);
  const notifsChannelRef  = useRef(null);

  // ── location helper ────────────────────────────────────────────────────────
  const getAndSaveLocation = useCallback(async () => {
    try {
      const { status: existing } = await Location.getForegroundPermissionsAsync();
      let granted = existing === "granted";

      if (!granted) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        granted = status === "granted";
      }

      if (!granted) {
        Alert.alert(
          "Location Required",
          "We need your location so nearby recipients can find you. Please enable location access in Settings.",
          [{ text: "OK" }]
        );
        return false;
      }

      const coords = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = coords.coords;
      // Save as PostGIS geography point — Supabase accepts WKT strings
      const { error } = await supabase
        .from("users")
        .update({ location: `POINT(${longitude} ${latitude})` })
        .eq("id", userId);

      if (error) {
        console.error("Failed to save location:", error.message);
      }
      return true;
    } catch (err) {
      console.error("Location error:", err);
      return false;
    }
  }, [userId]);

  // ── toggle availability ───────────────────────────────────────────────────
  const handleAvailabilityToggle = useCallback(async (val) => {
    if (!userId) return;
    setAvailabilityLoading(true);

    try {
      if (val) {
        // Ask for location when becoming available
        const ok = await getAndSaveLocation();
        if (!ok) {
          setAvailabilityLoading(false);
          return; // don't enable if location denied
        }
      } else {
        // Clear location when going unavailable (optional — keeps privacy)
        await supabase
          .from("users")
          .update({ location: null })
          .eq("id", userId);
      }

      const { error } = await supabase
        .from("users")
        .update({ notifications_enabled: val })
        .eq("id", userId);

      if (error) {
        console.error("Failed to update availability:", error.message);
        Alert.alert("Error", "Could not update your availability. Please try again.");
        return;
      }

      setIsAvailable(val);
      Alert.alert(
        val ? "You're Now Available 🩸" : "Marked Unavailable",
        val
          ? "Nearby recipients can now find you. Thank you!"
          : "You won't receive donation requests until you're available again."
      );
    } finally {
      setAvailabilityLoading(false);
    }
  }, [userId, getAndSaveLocation]);

  // ── respond to urgent request ─────────────────────────────────────────────
  const handleRespond = useCallback((request) => {
    setSelectedRequest(request);
    setRespondStep(1);
    setRespondModalVisible(true);
  }, []);

  const handleConfirmResponse = useCallback(async () => {
    if (respondStep === 1) {
      setRespondStep(2);
      return;
    }

    if (!userId || !selectedRequest) return;
    setRespondLoading(true);

    try {
      // Insert an activity log row so the recipient sees a donor responded
      const { error } = await supabase.from("activity_logs").insert({
        user_id:    userId,
        action:     "donor_responded",
        entity_type: "blood_request",
        entity_id:  selectedRequest.id,
        metadata:   {
          blood_type:    selectedRequest.type,
          hospital_name: selectedRequest.hospital,
        },
      });

      if (error) {
        console.error("activity_logs insert error:", error.message);
      }

      // Notify the recipient
      await supabase.from("notifications").insert({
        user_id: selectedRequest.requestUserId,
        type:    "donation_match",
        title:   "A Donor Responded!",
        body:    `A ${selectedRequest.type} donor has confirmed they will donate at ${selectedRequest.hospital}.`,
        data:    { request_id: selectedRequest.id },
      });

      setRespondModalVisible(false);
      setRespondStep(1);
      Alert.alert(
        "✅ Response Sent",
        `You have confirmed your donation for ${selectedRequest?.hospital}. Thank you for saving a life!`
      );
    } catch (err) {
      console.error("handleConfirmResponse error:", err);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setRespondLoading(false);
    }
  }, [respondStep, userId, selectedRequest]);

  // ── schedule donation ─────────────────────────────────────────────────────
  const handleScheduleConfirm = useCallback(async () => {
    if (!selectedSlot) {
      Alert.alert("Select a slot", "Please select an available time slot.");
      return;
    }
    if (!userId) return;
    setScheduleLoading(true);

    try {
      const { error } = await supabase.from("donation_schedules").insert({
        donor_id:         userId,
        scheduled_date:   selectedSlot.date_iso,
        scheduled_time:   selectedSlot.time,
        hospital_name:    selectedSlot.hospital,
        status:           "confirmed",
        available_slots:  selectedSlot.slots - 1,
      });

      if (error) {
        console.error("donation_schedules insert error:", error.message);
        Alert.alert("Error", "Could not book your appointment. Please try again.");
        return;
      }

      // Decrement slots in DB
      await supabase
        .from("donation_schedules")
        .update({ available_slots: selectedSlot.slots - 1 })
        .eq("id", selectedSlot.id);

      setScheduleModalVisible(false);
      Alert.alert(
        "Appointment Confirmed 🎉",
        `Your donation is scheduled for ${selectedSlot.dateLabel} at ${selectedSlot.time} — ${selectedSlot.hospital}.`
      );
      setSelectedSlot(null);
    } finally {
      setScheduleLoading(false);
    }
  }, [selectedSlot, userId]);

  // ── mark notifications read ───────────────────────────────────────────────
  const handleOpenNotifs = useCallback(async () => {
    setUnreadNotifs(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setNotifModalVisible(true);
    if (userId) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);
    }
  }, [userId]);

  // ── main data fetch + realtime subscriptions ──────────────────────────────
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;

      let cancelled = false;

      const run = async () => {
        setIsLoading(true);
        try {
          // 1. Donor profile
          const { data: user, error: userError } = await supabase
            .from("users")
            .select("blood_type, last_donation_date, notifications_enabled")
            .eq("id", userId)
            .maybeSingle();

          if (cancelled) return;
          if (userError) console.error("users fetch error:", userError.message);

          // 2. Donation history from donation_schedules (completed ones)
          const { data: schedulesData, error: schedulesError } = await supabase
            .from("donation_schedules")
            .select("id, scheduled_date, scheduled_time, hospital_name, status, created_at")
            .eq("donor_id", userId)
            .eq("status", "completed")
            .order("scheduled_date", { ascending: false })
            .limit(20);

          if (cancelled) return;
          if (schedulesError) console.error("donation_schedules history error:", schedulesError.message);

          const history = (schedulesData ?? []).map((row) => ({
            date:     formatDate(row.scheduled_date),
            location: row.hospital_name ?? "Unknown",
            units:    1,
            certificate: true,
          }));

          const totalDonations = history.length;
          const livesSaved     = totalDonations * 3; // 1 donation can save up to 3 lives
          const points         = totalDonations * 100 + (user?.notifications_enabled ? 20 : 0);

          if (!cancelled) {
            setDonorProfile({
              bloodType:         user?.blood_type       ?? "N/A",
              lastDonation:      user?.last_donation_date ?? null,
              totalDonations,
              livesSaved,
              points,
              daysUntilEligible: daysUntilEligible(user?.last_donation_date),
            });
            setIsAvailable(user?.notifications_enabled ?? false);
            setDonationHistory(history);
          }

          // 3. Urgent nearby blood requests (active, not by current user)
          const { data: requestsData, error: requestsError } = await supabase
            .from("blood_requests")
            .select("id, blood_type, hospital_name, units_required, units_found, status, user_id, created_at, notes")
            .eq("status", "active")
            .neq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(10);

          if (cancelled) return;
          if (requestsError) console.error("blood_requests fetch error:", requestsError.message);

          const requests = (requestsData ?? []).map((row) => ({
            id:            row.id,
            type:          row.blood_type    ?? "?",
            hospital:      row.hospital_name ?? "Unknown Hospital",
            distance:      "Nearby",                          // real distance requires PostGIS query
            unitsNeeded:   (row.units_required ?? 1) - (row.units_found ?? 0),
            urgency:       row.notes?.includes("critical") ? "Critical"
                         : row.notes?.includes("high")     ? "High"
                         : "Medium",
            requestUserId: row.user_id,
          }));

          if (!cancelled) setUrgentRequests(requests);

          // 4. Available schedule slots (future, with slots remaining)
          const today = new Date().toISOString().split("T")[0];
          const { data: slotsData, error: slotsError } = await supabase
            .from("donation_schedules")
            .select("id, scheduled_date, scheduled_time, hospital_name, available_slots")
            .is("donor_id", null)               // open slots have no donor assigned
            .gt("available_slots", 0)
            .gte("scheduled_date", today)
            .order("scheduled_date", { ascending: true })
            .limit(10);

          if (cancelled) return;
          if (slotsError) console.error("donation_schedules slots error:", slotsError.message);

          const slots = (slotsData ?? []).map((row) => ({
            id:        row.id,
            date_iso:  row.scheduled_date,
            dateLabel: formatDate(row.scheduled_date),
            time:      row.scheduled_time   ?? "09:00 AM",
            hospital:  row.hospital_name    ?? "City Hospital",
            slots:     row.available_slots  ?? 1,
          }));

          if (!cancelled) setScheduleSlots(slots);

          // 5. Notifications
          const { data: notifsData, error: notifsError } = await supabase
            .from("notifications")
            .select("id, type, title, body, is_read, created_at, data")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(20);

          if (cancelled) return;
          if (!notifsError && notifsData) {
            const mapped = notifsData.map((row) => ({
              id:       row.id,
              icon:     NOTIF_TYPE_META[row.type]?.icon  ?? "notifications",
              color:    NOTIF_TYPE_META[row.type]?.color ?? COLORS.accentBlue,
              title:    row.title,
              subtitle: row.body,
              time:     formatNotifTime(row.created_at),
              is_read:  row.is_read,
            }));
            if (!cancelled) {
              setNotifications(mapped);
              setUnreadNotifs(mapped.filter((n) => !n.is_read).length);
            }
          }

          // ── Realtime subscriptions ─────────────────────────────────────
          if (!cancelled) {
            // a. Watch user profile changes (availability, location)
            userChannelRef.current = supabase
              .channel(`donor_user:${userId}`)
              .on("postgres_changes", {
                event:  "UPDATE",
                schema: "public",
                table:  "users",
                filter: `id=eq.${userId}`,
              }, (payload) => {
                const u = payload.new;
                setIsAvailable(u.notifications_enabled ?? false);
                setDonorProfile((prev) => ({
                  ...prev,
                  bloodType:         u.blood_type         ?? prev.bloodType,
                  lastDonation:      u.last_donation_date ?? prev.lastDonation,
                  daysUntilEligible: daysUntilEligible(u.last_donation_date),
                }));
              });
            await userChannelRef.current.subscribe();

            // b. Watch new blood requests (any INSERT to blood_requests that is active)
            requestsChannelRef.current = supabase
              .channel(`donor_requests:${userId}`)
              .on("postgres_changes", {
                event:  "INSERT",
                schema: "public",
                table:  "blood_requests",
              }, (payload) => {
                const r = payload.new;
                if (r.status !== "active" || r.user_id === userId) return;
                const newReq = {
                  id:            r.id,
                  type:          r.blood_type    ?? "?",
                  hospital:      r.hospital_name ?? "Unknown Hospital",
                  distance:      "Nearby",
                  unitsNeeded:   (r.units_required ?? 1) - (r.units_found ?? 0),
                  urgency:       r.notes?.includes("critical") ? "Critical"
                               : r.notes?.includes("high")     ? "High"
                               : "Medium",
                  requestUserId: r.user_id,
                };
                setUrgentRequests((prev) => [newReq, ...prev].slice(0, 10));
              })
              .on("postgres_changes", {
                event:  "UPDATE",
                schema: "public",
                table:  "blood_requests",
              }, (payload) => {
                const r = payload.new;
                // Remove completed/deleted requests from the list
                if (r.status !== "active" || r.is_deleted) {
                  setUrgentRequests((prev) => prev.filter((req) => req.id !== r.id));
                }
              });
            await requestsChannelRef.current.subscribe();

            // c. Watch schedule slots
            schedulesChannelRef.current = supabase
              .channel(`donor_schedules`)
              .on("postgres_changes", {
                event:  "UPDATE",
                schema: "public",
                table:  "donation_schedules",
              }, (payload) => {
                const s = payload.new;
                setScheduleSlots((prev) => {
                  if (s.available_slots <= 0 || s.donor_id) {
                    return prev.filter((slot) => slot.id !== s.id);
                  }
                  return prev.map((slot) =>
                    slot.id === s.id ? { ...slot, slots: s.available_slots } : slot
                  );
                });
              })
              .on("postgres_changes", {
                event:  "INSERT",
                schema: "public",
                table:  "donation_schedules",
              }, (payload) => {
                const s = payload.new;
                if (!s.donor_id && s.available_slots > 0) {
                  const today2 = new Date().toISOString().split("T")[0];
                  if (s.scheduled_date >= today2) {
                    setScheduleSlots((prev) =>
                      [...prev, {
                        id:        s.id,
                        date_iso:  s.scheduled_date,
                        dateLabel: formatDate(s.scheduled_date),
                        time:      s.scheduled_time  ?? "09:00 AM",
                        hospital:  s.hospital_name   ?? "City Hospital",
                        slots:     s.available_slots ?? 1,
                      }].sort((a, b) => a.date_iso.localeCompare(b.date_iso))
                    );
                  }
                }
              });
            await schedulesChannelRef.current.subscribe();

            // d. Watch notifications
            notifsChannelRef.current = supabase
              .channel(`donor_notifs:${userId}`)
              .on("postgres_changes", {
                event:  "INSERT",
                schema: "public",
                table:  "notifications",
                filter: `user_id=eq.${userId}`,
              }, (payload) => {
                const r = payload.new;
                const item = {
                  id:       r.id,
                  icon:     NOTIF_TYPE_META[r.type]?.icon  ?? "notifications",
                  color:    NOTIF_TYPE_META[r.type]?.color ?? COLORS.accentBlue,
                  title:    r.title,
                  subtitle: r.body,
                  time:     formatNotifTime(r.created_at),
                  is_read:  r.is_read,
                };
                setNotifications((prev) => [item, ...prev].slice(0, 20));
                setUnreadNotifs((prev) => prev + (r.is_read ? 0 : 1));
              });
            await notifsChannelRef.current.subscribe();
          }
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      };

      run();

      return () => {
        cancelled = true;
        [userChannelRef, requestsChannelRef, schedulesChannelRef, notifsChannelRef].forEach((ref) => {
          if (ref.current) {
            supabase.removeChannel(ref.current);
            ref.current = null;
          }
        });
      };
    }, [userId])
  );

  // ── derived values ────────────────────────────────────────────────────────
  const achievements = buildAchievements(donorProfile.totalDonations);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── DONATION STATUS CARD ─────────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={[styles.card, { backgroundColor: surface }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardLabel, { color: COLORS.primary }]}>Donation Status</Text>
            <View style={styles.rowBetween}>
              {/* Notification bell */}
              <TouchableOpacity style={styles.notifBell} onPress={handleOpenNotifs}>
                <MaterialIcons
                  name="notifications"
                  size={22}
                  color={isDarkMode ? COLORS.textDarkPrimary : COLORS.textLightPrimary}
                />
                {unreadNotifs > 0 && (
                  <View style={styles.notifDot}>
                    <Text style={styles.notifDotText}>{unreadNotifs}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.availabilityRow}>
                <Text style={[styles.availabilityLabel, { color: isAvailable ? COLORS.accentGreen : "#888" }]}>
                  {isAvailable ? "Available" : "Unavailable"}
                </Text>
                {availabilityLoading ? (
                  <ActivityIndicator size="small" color={COLORS.accentGreen} />
                ) : (
                  <Switch
                    value={isAvailable}
                    onValueChange={handleAvailabilityToggle}
                    trackColor={{ false: "#ccc", true: COLORS.accentGreen + "60" }}
                    thumbColor={isAvailable ? COLORS.accentGreen : "#aaa"}
                  />
                )}
              </View>
            </View>
          </View>

          {/* Blood Type & Points Row */}
          <View style={styles.bloodPointsRow}>
            <View>
              <Text style={[styles.cardTitle, textPrimary]}>Type: {donorProfile.bloodType}</Text>
              <Text style={[styles.bodyText, textSecondary]}>
                Last Donated: {donorProfile.lastDonation ? formatDate(donorProfile.lastDonation) : "Never"}
              </Text>
            </View>
            <View style={[styles.pointsBadge, { backgroundColor: COLORS.accentGold + "20" }]}>
              <MaterialIcons name="stars" size={16} color={COLORS.accentGold} />
              <Text style={[styles.pointsText, { color: COLORS.accentGold }]}>{donorProfile.points} pts</Text>
            </View>
          </View>

          {/* Eligibility Timer */}
          <EligibilityTimer daysLeft={donorProfile.daysUntilEligible} isDarkMode={isDarkMode} />

          {/* Schedule Button */}
          <TouchableOpacity style={styles.detailsButton} onPress={() => setScheduleModalVisible(true)}>
            <Text style={styles.detailsButtonText}>Schedule a Donation</Text>
            <MaterialIcons name="event" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── IMPACT STATS ─────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, textPrimary]}>Your Impact</Text>
        <View style={[styles.statsRow, { marginTop: 12 }]}>
          <ImpactStatCard
            value={donorProfile.livesSaved}
            label="LIVES HELPED"
            icon="favorite"
            color={COLORS.primary}
            surface={surface}
          />
          <ImpactStatCard
            value={donorProfile.totalDonations}
            label="DONATIONS"
            icon="bloodtype"
            color={COLORS.accentBlue}
            surface={surface}
          />
          <ImpactStatCard
            value={`${donorProfile.points}`}
            label="REWARD PTS"
            icon="stars"
            color={COLORS.accentGold}
            surface={surface}
          />
        </View>
      </View>

      {/* ── ACHIEVEMENTS ─────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, textPrimary]}>Achievements</Text>
          <Text style={{ color: COLORS.primary, fontWeight: "700", fontSize: 13 }}>
            {achievements.filter((a) => a.unlocked).length}/{achievements.length} Unlocked
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 12 }}
          contentContainerStyle={{ paddingRight: 8 }}
        >
          {achievements.map((a, i) => (
            <AchievementBadge key={i} {...a} isDarkMode={isDarkMode} />
          ))}
        </ScrollView>
      </View>

      {/* ── URGENT NEARBY REQUESTS ───────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, textPrimary]}>Urgent Nearby Requests</Text>
          <TouchableOpacity onPress={() => router.push("/nearby_requests")}>
            <Text style={{ color: COLORS.primary, fontWeight: "700", fontSize: 13 }}>View All</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 20 }} color={COLORS.primary} />
        ) : urgentRequests.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: surface }]}>
            <MaterialIcons name="search-off" size={36} color="#ccc" />
            <Text style={[styles.bodyText, textSecondary, { marginTop: 8 }]}>
              No urgent requests near you right now.
            </Text>
          </View>
        ) : (
          urgentRequests.slice(0, 3).map((request) => (
            <UrgentRequestCard
              key={request.id}
              request={request}
              donorBloodType={donorProfile.bloodType}
              isDarkMode={isDarkMode}
              onRespond={handleRespond}
            />
          ))
        )}
      </View>

      {/* ── DONATION HISTORY ─────────────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, textPrimary]}>Donation History</Text>
          <TouchableOpacity onPress={() => setHistoryModalVisible(true)}>
            <Text style={{ color: COLORS.primary, fontWeight: "700", fontSize: 13 }}>View All</Text>
          </TouchableOpacity>
        </View>
        <View style={{ marginTop: 12 }}>
          {donationHistory.slice(0, 2).map((h, i) => (
            <DonationHistoryRow key={i} {...h} isDarkMode={isDarkMode} />
          ))}
          {!isLoading && donationHistory.length === 0 && (
            <View style={[styles.emptyBox, { backgroundColor: surface }]}>
              <MaterialIcons name="history" size={36} color="#ccc" />
              <Text style={[styles.bodyText, textSecondary, { marginTop: 8 }]}>
                No donations yet. Schedule your first!
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* ── HEALTH TIPS ──────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, textPrimary]}>Pre-Donation Tips</Text>
        <View style={{ marginTop: 12 }}>
          {HEALTH_TIPS.map((tip, i) => (
            <HealthTipCard key={i} {...tip} isDarkMode={isDarkMode} />
          ))}
        </View>
      </View>

      <View style={{ height: 40 }} />

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/*  MODALS                                                             */}
      {/* ════════════════════════════════════════════════════════════════════ */}

      {/* ── Schedule Donation Modal ───────────────────────────────────────── */}
      <Modal
        animationType="slide"
        transparent
        visible={isScheduleModalVisible}
        onRequestClose={() => setScheduleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? COLORS.surfaceDark : COLORS.backgroundLight }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.sectionTitle, textPrimary]}>Schedule Donation</Text>
              <TouchableOpacity onPress={() => setScheduleModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={textSecondary.color} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.bodyText, textSecondary, { marginBottom: 16 }]}>
              Select an available time slot:
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {scheduleSlots.length === 0 ? (
                <View style={styles.emptyBox}>
                  <MaterialIcons name="event-busy" size={40} color="#ccc" />
                  <Text style={[styles.bodyText, textSecondary, { marginTop: 8, textAlign: "center" }]}>
                    No available slots at the moment. Check back soon!
                  </Text>
                </View>
              ) : (
                scheduleSlots.map((slot) => {
                  const isSelected = selectedSlot?.id === slot.id;
                  return (
                    <TouchableOpacity
                      key={slot.id}
                      style={[
                        styles.slotCard,
                        {
                          backgroundColor: isSelected ? COLORS.primary : (isDarkMode ? COLORS.grayblue : "#F0F5FA"),
                          borderWidth: isSelected ? 0 : 1,
                          borderColor: isDarkMode ? "#444" : "#E0E0E0",
                        },
                      ]}
                      onPress={() => setSelectedSlot(slot)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.slotDate, { color: isSelected ? "#fff" : (isDarkMode ? COLORS.textDarkPrimary : COLORS.textLightPrimary) }]}>
                          {slot.dateLabel}
                        </Text>
                        <Text style={[styles.slotTime, { color: isSelected ? "rgba(255,255,255,0.85)" : (isDarkMode ? COLORS.textDarkSecondary : COLORS.textLightSecondary) }]}>
                          {slot.time}
                        </Text>
                        <Text style={[styles.slotTime, { color: isSelected ? "rgba(255,255,255,0.7)" : (isDarkMode ? COLORS.textDarkSecondary : COLORS.textLightSecondary), marginTop: 2 }]}>
                          📍 {slot.hospital}
                        </Text>
                      </View>
                      <View style={[styles.slotAvail, { backgroundColor: isSelected ? "rgba(255,255,255,0.2)" : COLORS.accentGreen + "20" }]}>
                        <Text style={[styles.slotAvailText, { color: isSelected ? "#fff" : COLORS.accentGreen }]}>
                          {slot.slots} slot{slot.slots > 1 ? "s" : ""} left
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.detailsButton, { marginTop: 20, backgroundColor: selectedSlot ? COLORS.primary : "#aaa" }]}
              onPress={handleScheduleConfirm}
              disabled={scheduleLoading}
            >
              {scheduleLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="event-available" size={18} color="#fff" />
                  <Text style={styles.detailsButtonText}>Confirm Appointment</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.detailsButton, { backgroundColor: isDarkMode ? "#333" : "#CCC", marginTop: 10 }]}
              onPress={() => setScheduleModalVisible(false)}
            >
              <Text style={[styles.detailsButtonText, { color: isDarkMode ? "#fff" : "#000" }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Donation History Modal ────────────────────────────────────────── */}
      <Modal
        animationType="slide"
        transparent
        visible={isHistoryModalVisible}
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? COLORS.surfaceDark : COLORS.backgroundLight }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.sectionTitle, textPrimary]}>Full Donation History</Text>
              <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={textSecondary.color} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {donationHistory.map((h, i) => (
                <DonationHistoryRow key={i} {...h} isDarkMode={isDarkMode} />
              ))}
              {donationHistory.length === 0 && (
                <View style={{ alignItems: "center", paddingVertical: 40 }}>
                  <MaterialIcons name="history" size={48} color="#ccc" />
                  <Text style={[styles.bodyText, textSecondary, { marginTop: 12 }]}>No donation history yet.</Text>
                </View>
              )}
            </ScrollView>
          </View>
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
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? COLORS.surfaceDark : COLORS.backgroundLight }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.sectionTitle, textPrimary]}>Notifications</Text>
              <TouchableOpacity onPress={() => setNotifModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={textSecondary.color} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {notifications.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 40 }}>
                  <MaterialIcons name="notifications-none" size={48} color="#ccc" />
                  <Text style={[styles.bodyText, textSecondary, { marginTop: 12 }]}>No notifications yet.</Text>
                </View>
              ) : (
                notifications.map((n) => (
                  <View
                    key={n.id}
                    style={[
                      styles.notifRow,
                      {
                        backgroundColor: n.is_read
                          ? (isDarkMode ? COLORS.grayblue : "#F8F9FA")
                          : (n.color + "15"),
                      },
                    ]}
                  >
                    <View style={[styles.notifIconBox, { backgroundColor: n.color + "20" }]}>
                      <MaterialIcons name={n.icon} size={20} color={n.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.notifTitle, { color: isDarkMode ? COLORS.textDarkPrimary : COLORS.textLightPrimary }]}>
                        {n.title}
                      </Text>
                      <Text style={[styles.notifSubtitle, { color: isDarkMode ? COLORS.textDarkSecondary : COLORS.textLightSecondary }]}>
                        {n.subtitle}
                      </Text>
                    </View>
                    <Text style={[styles.notifTime, { color: isDarkMode ? COLORS.textDarkSecondary : COLORS.textLightSecondary }]}>
                      {n.time}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Respond to Request Modal ──────────────────────────────────────── */}
      <Modal
        animationType="slide"
        transparent
        visible={isRespondModalVisible}
        onRequestClose={() => { setRespondModalVisible(false); setRespondStep(1); }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? COLORS.surfaceDark : COLORS.backgroundLight }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.sectionTitle, textPrimary]}>
                {respondStep === 1 ? "Request Details" : "Confirm Response"}
              </Text>
              <TouchableOpacity onPress={() => { setRespondModalVisible(false); setRespondStep(1); }}>
                <MaterialIcons name="close" size={24} color={textSecondary.color} />
              </TouchableOpacity>
            </View>

            {selectedRequest && respondStep === 1 && (
              <>
                <View style={styles.respondBloodRow}>
                  <View style={[styles.respondBloodBadge, { backgroundColor: COLORS.primary }]}>
                    <Text style={styles.respondBloodText}>{selectedRequest.type}</Text>
                  </View>
                  <View style={[styles.respondUrgencyBadge, {
                    backgroundColor:
                      selectedRequest.urgency === "Critical" ? COLORS.primary :
                      selectedRequest.urgency === "High"     ? COLORS.accentOrange + "20" :
                      COLORS.accentGreen + "20",
                  }]}>
                    <MaterialIcons
                      name="local-fire-department"
                      size={14}
                      color={
                        selectedRequest.urgency === "Critical" ? "#fff" :
                        selectedRequest.urgency === "High"     ? COLORS.accentOrange :
                        COLORS.accentGreen
                      }
                    />
                    <Text style={[styles.respondUrgencyText, {
                      color:
                        selectedRequest.urgency === "Critical" ? "#fff" :
                        selectedRequest.urgency === "High"     ? COLORS.accentOrange :
                        COLORS.accentGreen,
                    }]}>
                      {selectedRequest.urgency}
                    </Text>
                  </View>
                </View>

                {[
                  { icon: "local-hospital", label: "Hospital",     value: selectedRequest.hospital },
                  { icon: "location-on",    label: "Distance",     value: selectedRequest.distance },
                  { icon: "opacity",        label: "Units Needed", value: `${selectedRequest.unitsNeeded} unit${selectedRequest.unitsNeeded > 1 ? "s" : ""}` },
                ].map((row, i) => (
                  <View key={i} style={[styles.respondDetailRow, { backgroundColor: isDarkMode ? COLORS.grayblue : "#F0F5FA" }]}>
                    <MaterialIcons name={row.icon} size={18} color={COLORS.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.respondDetailLabel, { color: isDarkMode ? COLORS.textDarkSecondary : COLORS.textLightSecondary }]}>
                        {row.label}
                      </Text>
                      <Text style={[styles.respondDetailValue, { color: isDarkMode ? COLORS.textDarkPrimary : COLORS.textLightPrimary }]}>
                        {row.value}
                      </Text>
                    </View>
                  </View>
                ))}

                <View style={[styles.respondInfoBox, { backgroundColor: COLORS.accentBlue + "15" }]}>
                  <MaterialIcons name="info" size={16} color={COLORS.accentBlue} />
                  <Text style={[styles.respondInfoText, { color: COLORS.accentBlue }]}>
                    By responding, the hospital staff will contact you to confirm your visit.
                  </Text>
                </View>
              </>
            )}

            {respondStep === 2 && selectedRequest && (
              <View style={{ alignItems: "center", paddingVertical: 20, gap: 12 }}>
                <View style={[styles.confirmIconCircle, { backgroundColor: COLORS.accentGreen + "20" }]}>
                  <MaterialIcons name="volunteer-activism" size={48} color={COLORS.accentGreen} />
                </View>
                <Text style={[styles.confirmTitle, textPrimary]}>You&apos;re a Hero!</Text>
                <Text style={[styles.confirmSubtitle, textSecondary]}>
                  Confirming your response to donate {selectedRequest.type} blood at {selectedRequest.hospital}.
                </Text>
                <View style={[styles.respondInfoBox, { backgroundColor: COLORS.accentGold + "15", width: "100%" }]}>
                  <MaterialIcons name="stars" size={16} color={COLORS.accentGold} />
                  <Text style={[styles.respondInfoText, { color: COLORS.accentGold }]}>
                    You&apos;ll earn +50 reward points for this donation.
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.detailsButton, { marginTop: 8 }]}
              onPress={handleConfirmResponse}
              disabled={respondLoading}
            >
              {respondLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialIcons name={respondStep === 1 ? "arrow-forward" : "check-circle"} size={18} color="#fff" />
                  <Text style={styles.detailsButtonText}>
                    {respondStep === 1 ? "Proceed to Confirm" : "Yes, I'll Donate"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.detailsButton, { backgroundColor: isDarkMode ? "#333" : "#CCC", marginTop: 10 }]}
              onPress={() => { setRespondModalVisible(false); setRespondStep(1); }}
            >
              <Text style={[styles.detailsButtonText, { color: isDarkMode ? "#fff" : "#000" }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  section:          { paddingHorizontal: 16, marginTop: 20 },
  card:             { borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardHeader:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  cardLabel:        { fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  cardTitle:        { fontSize: 20, fontWeight: "700" },
  bodyText:         { fontSize: 14, lineHeight: 20, marginTop: 4 },
  sectionTitle:     { fontSize: 18, fontWeight: "700" },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  detailsButton:    { paddingHorizontal: 20, marginTop: 20, backgroundColor: COLORS.primary, height: 54, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  detailsButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  statsRow:         { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  rowBetween:       { flexDirection: "row", alignItems: "center", gap: 10 },

  // Availability toggle
  availabilityRow:  { flexDirection: "row", alignItems: "center", gap: 8 },
  availabilityLabel: { fontSize: 12, fontWeight: "700" },

  // Blood + Points Row
  bloodPointsRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  pointsBadge:      { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  pointsText:       { fontSize: 14, fontWeight: "800" },

  // Empty state
  emptyBox:         { borderRadius: 12, padding: 24, alignItems: "center", marginTop: 12 },

  // Notification bell
  notifBell:        { position: "relative", padding: 4 },
  notifDot:         { position: "absolute", top: 0, right: 0, width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  notifDotText:     { color: "#fff", fontSize: 9, fontWeight: "800" },

  // Notification rows in modal
  notifRow:         { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 12, marginBottom: 10 },
  notifIconBox:     { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  notifTitle:       { fontSize: 13, fontWeight: "700" },
  notifSubtitle:    { fontSize: 12, lineHeight: 18, marginTop: 2 },
  notifTime:        { fontSize: 11, fontWeight: "600", marginTop: 2 },

  // Modal
  modalOverlay:     { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent:     { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: 300, maxHeight: "92%", position: "absolute", bottom: 0, left: 0, right: 0 },
  modalHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },

  // Schedule Slots
  slotCard:         { borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  slotDate:         { fontSize: 14, fontWeight: "700" },
  slotTime:         { fontSize: 12, marginTop: 2 },
  slotAvail:        { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  slotAvailText:    { fontSize: 11, fontWeight: "700" },

  // Respond Modal
  respondBloodRow:      { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  respondBloodBadge:    { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  respondBloodText:     { color: "#fff", fontWeight: "800", fontSize: 16 },
  respondUrgencyBadge:  { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  respondUrgencyText:   { fontSize: 12, fontWeight: "700" },
  respondDetailRow:     { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, marginBottom: 10 },
  respondDetailLabel:   { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  respondDetailValue:   { fontSize: 14, fontWeight: "600", marginTop: 2 },
  respondInfoBox:       { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 10, marginTop: 8 },
  respondInfoText:      { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: "600" },

  // Confirm Step
  confirmIconCircle: { width: 90, height: 90, borderRadius: 45, alignItems: "center", justifyContent: "center" },
  confirmTitle:      { fontSize: 24, fontWeight: "800" },
  confirmSubtitle:   { fontSize: 14, lineHeight: 20, textAlign: "center" },
});

export default DonorDashboard;