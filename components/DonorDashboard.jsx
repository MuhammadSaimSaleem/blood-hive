import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  AchievementBadge,
  COLORS,
  DonationHistoryRow,
  EligibilityTimer,
  HealthTipCard,
  ImpactStatCard,
  UrgentRequestCard,
} from "./UIComponents";

const DonorDashboard = ({ isDarkMode, surface, textPrimary, textSecondary }) => {
  const [isAvailable, setIsAvailable] = useState(true);
  const [isScheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [isHistoryModalVisible, setHistoryModalVisible] = useState(false);
  const [isRespondModalVisible, setRespondModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [respondStep, setRespondStep] = useState(1);

  const [donorData] = useState({
    bloodType: "O+ Positive",
    eligibilityStatus: "Ready to Donate",
    livesSaved: 3,
    totalDonations: 1,
    lastDonation: "15 Oct 2023",
    daysUntilEligible: 0,
    points: 320,
    urgentRequests: [
      { id: 1, type: "O+", hospital: "City General Hospital", distance: "2.5 km away", unitsNeeded: 3, urgency: "Critical" },
      { id: 2, type: "A-", hospital: "Metro Care Hospital", distance: "4.0 km away", unitsNeeded: 2, urgency: "High" },
      { id: 3, type: "B+", hospital: "LifeStream Medical", distance: "6.2 km away", unitsNeeded: 1, urgency: "Medium" },
    ],
    donationHistory: [
      { date: "Oct 15, 2023", location: "City General Hospital", units: 1, certificate: true },
      { date: "Apr 02, 2023", location: "RedCross Drive", units: 1, certificate: true },
      { date: "Nov 20, 2022", location: "Metro Care Hospital", units: 1, certificate: false },
    ],
  });

  const achievements = [
    { icon: "favorite", title: "First Drop", subtitle: "1st donation", color: COLORS.primary, unlocked: true },
    { icon: "military-tech", title: "Life Saver", subtitle: "3 lives saved", color: COLORS.accentGold, unlocked: true },
    { icon: "workspace-premium", title: "Hero", subtitle: "5 donations", color: COLORS.accentPurple, unlocked: false },
    { icon: "local-fire-department", title: "Champion", subtitle: "10 donations", color: COLORS.accentOrange, unlocked: false },
  ];

  const healthTips = [
    { icon: "water-drop", tip: "Drink 500ml of water at least 2 hours before donating.", color: COLORS.accentBlue },
    { icon: "restaurant", tip: "Eat a light iron-rich meal before your appointment.", color: COLORS.accentGreen },
    { icon: "bedtime", tip: "Get a full 8 hours of sleep the night before donating.", color: COLORS.accentPurple },
  ];

  const scheduleSlots = [
    { id: 1, date: "Mon, Oct 28", time: "09:00 AM", slots: 3 },
    { id: 2, date: "Mon, Oct 28", time: "11:00 AM", slots: 1 },
    { id: 3, date: "Tue, Oct 29", time: "02:00 PM", slots: 5 },
    { id: 4, date: "Wed, Oct 30", time: "10:00 AM", slots: 2 },
  ];

  const handleRespond = (request) => {
    setSelectedRequest(request);
    setRespondStep(1);
    setRespondModalVisible(true);
  };

  const handleConfirmResponse = () => {
    if (respondStep === 1) {
      setRespondStep(2);
    } else {
      setRespondModalVisible(false);
      setRespondStep(1);
      Alert.alert("✅ Response Sent", `You have confirmed your donation for ${selectedRequest?.hospital}. Thank you for saving a life!`);
    }
  };

  const handleScheduleConfirm = () => {
    if (!selectedSlot) {
      Alert.alert("Select a slot", "Please select an available time slot.");
      return;
    }
    setScheduleModalVisible(false);
    Alert.alert("Appointment Confirmed", `Your donation appointment is scheduled for ${selectedSlot.date} at ${selectedSlot.time}.`);
    setSelectedSlot(null);
  };

  return (
    <>
      {/* ── DONATION STATUS CARD ─────────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={[styles.card, { backgroundColor: surface }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardLabel, { color: COLORS.primary }]}>Donation Status</Text>
            <View style={styles.availabilityRow}>
              <Text style={[styles.availabilityLabel, { color: isAvailable ? COLORS.accentGreen : "#888" }]}>
                {isAvailable ? "Available" : "Unavailable"}
              </Text>
              <Switch
                value={isAvailable}
                onValueChange={(val) => {
                  setIsAvailable(val);
                  Alert.alert(
                    val ? "You're Now Available" : "Marked Unavailable",
                    val
                      ? "Donors in your area can now reach out to you."
                      : "You won't receive donation requests until you're available again."
                  );
                }}
                trackColor={{ false: "#ccc", true: COLORS.accentGreen + "60" }}
                thumbColor={isAvailable ? COLORS.accentGreen : "#aaa"}
              />
            </View>
          </View>

          {/* Blood Type & Points Row */}
          <View style={styles.bloodPointsRow}>
            <View>
              <Text style={[styles.cardTitle, textPrimary]}>Type: {donorData.bloodType}</Text>
              <Text style={[styles.bodyText, textSecondary]}>Last Donated: {donorData.lastDonation}</Text>
            </View>
            <View style={[styles.pointsBadge, { backgroundColor: COLORS.accentGold + "20" }]}>
              <MaterialIcons name="stars" size={16} color={COLORS.accentGold} />
              <Text style={[styles.pointsText, { color: COLORS.accentGold }]}>{donorData.points} pts</Text>
            </View>
          </View>

          {/* Eligibility Timer */}
          <EligibilityTimer daysLeft={donorData.daysUntilEligible} isDarkMode={isDarkMode} />

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
            value={donorData.livesSaved}
            label="LIVES SAVED"
            icon="favorite"
            color={COLORS.primary}
            surface={surface}
          />
          <ImpactStatCard
            value={donorData.totalDonations}
            label="DONATIONS"
            icon="bloodtype"
            color={COLORS.accentBlue}
            surface={surface}
          />
          <ImpactStatCard
            value={`${donorData.points}`}
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
          <TouchableOpacity onPress={() => router.push('/nearby_requests')}>
            <Text style={{ color: COLORS.primary, fontWeight: "700", fontSize: 13 }}>View All</Text>
          </TouchableOpacity>
        </View>
        {donorData.urgentRequests.map((request) => (
          <UrgentRequestCard
            key={request.id}
            request={request}
            donorBloodType={donorData.bloodType}
            isDarkMode={isDarkMode}
            onRespond={handleRespond}
          />
        ))}
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
          {donorData.donationHistory.slice(0, 2).map((h, i) => (
            <DonationHistoryRow key={i} {...h} isDarkMode={isDarkMode} />
          ))}
        </View>
      </View>

      {/* ── HEALTH TIPS ──────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, textPrimary]}>Pre-Donation Tips</Text>
        <View style={{ marginTop: 12 }}>
          {healthTips.map((tip, i) => (
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
          <View
            style={[
              styles.modalContent,
              { backgroundColor: isDarkMode ? COLORS.surfaceDark : COLORS.backgroundLight },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.sectionTitle, textPrimary]}>Schedule Donation</Text>
              <TouchableOpacity onPress={() => setScheduleModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={textSecondary.color} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.bodyText, textSecondary, { marginBottom: 16 }]}>
              Select an available time slot at City General Hospital:
            </Text>

            {scheduleSlots.map((slot) => {
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
                  <View>
                    <Text style={[styles.slotDate, { color: isSelected ? "#fff" : (isDarkMode ? COLORS.textDarkPrimary : COLORS.textLightPrimary) }]}>
                      {slot.date}
                    </Text>
                    <Text style={[styles.slotTime, { color: isSelected ? "rgba(255,255,255,0.85)" : (isDarkMode ? COLORS.textDarkSecondary : COLORS.textLightSecondary) }]}>
                      {slot.time}
                    </Text>
                  </View>
                  <View style={[styles.slotAvail, { backgroundColor: isSelected ? "rgba(255,255,255,0.2)" : COLORS.accentGreen + "20" }]}>
                    <Text style={[styles.slotAvailText, { color: isSelected ? "#fff" : COLORS.accentGreen }]}>
                      {slot.slots} slot{slot.slots > 1 ? "s" : ""} left
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[styles.detailsButton, { marginTop: 20, backgroundColor: selectedSlot ? COLORS.primary : "#aaa" }]}
              onPress={handleScheduleConfirm}
            >
              <MaterialIcons name="event-available" size={18} color="#fff" />
              <Text style={styles.detailsButtonText}>Confirm Appointment</Text>
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
          <View
            style={[
              styles.modalContent,
              { backgroundColor: isDarkMode ? COLORS.surfaceDark : COLORS.backgroundLight },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.sectionTitle, textPrimary]}>Full Donation History</Text>
              <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={textSecondary.color} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {donorData.donationHistory.map((h, i) => (
                <DonationHistoryRow key={i} {...h} isDarkMode={isDarkMode} />
              ))}
              {donorData.donationHistory.length === 0 && (
                <View style={{ alignItems: "center", paddingVertical: 40 }}>
                  <MaterialIcons name="history" size={48} color="#ccc" />
                  <Text style={[styles.bodyText, textSecondary, { marginTop: 12 }]}>No donation history yet.</Text>
                </View>
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
          <View
            style={[
              styles.modalContent,
              { backgroundColor: isDarkMode ? COLORS.surfaceDark : COLORS.backgroundLight },
            ]}
          >
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
                {/* Blood Type Badge */}
                <View style={styles.respondBloodRow}>
                  <View style={[styles.respondBloodBadge, { backgroundColor: COLORS.primary }]}>
                    <Text style={styles.respondBloodText}>{selectedRequest.type}</Text>
                  </View>
                  <View style={[styles.respondUrgencyBadge, {
                    backgroundColor:
                      selectedRequest.urgency === "Critical" ? COLORS.primary :
                      selectedRequest.urgency === "High" ? COLORS.accentOrange + "20" :
                      COLORS.accentGreen + "20"
                  }]}>
                    <MaterialIcons
                      name="local-fire-department"
                      size={14}
                      color={
                        selectedRequest.urgency === "Critical" ? "#fff" :
                        selectedRequest.urgency === "High" ? COLORS.accentOrange :
                        COLORS.accentGreen
                      }
                    />
                    <Text style={[styles.respondUrgencyText, {
                      color:
                        selectedRequest.urgency === "Critical" ? "#fff" :
                        selectedRequest.urgency === "High" ? COLORS.accentOrange :
                        COLORS.accentGreen
                    }]}>
                      {selectedRequest.urgency}
                    </Text>
                  </View>
                </View>

                {/* Details */}
                {[
                  { icon: "local-hospital", label: "Hospital", value: selectedRequest.hospital },
                  { icon: "location-on", label: "Distance", value: selectedRequest.distance },
                  { icon: "opacity", label: "Units Needed", value: `${selectedRequest.unitsNeeded} unit${selectedRequest.unitsNeeded > 1 ? "s" : ""}` },
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

            <TouchableOpacity style={[styles.detailsButton, { marginTop: 8 }]} onPress={handleConfirmResponse}>
              <MaterialIcons name={respondStep === 1 ? "arrow-forward" : "check-circle"} size={18} color="#fff" />
              <Text style={styles.detailsButtonText}>
                {respondStep === 1 ? "Proceed to Confirm" : "Yes, I'll Donate"}
              </Text>
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
  section: { paddingHorizontal: 16, marginTop: 20 },
  card: { borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  cardLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  cardTitle: { fontSize: 20, fontWeight: "700" },
  bodyText: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  detailsButton: { paddingHorizontal: 20, marginTop: 20, backgroundColor: COLORS.primary, height: 54, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  detailsButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  statsRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },

  // Availability toggle
  availabilityRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  availabilityLabel: { fontSize: 12, fontWeight: "700" },

  // Blood + Points Row
  bloodPointsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  pointsBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  pointsText: { fontSize: 14, fontWeight: "800" },

  // Urgent count badge
  urgentCountBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  urgentCountText: { fontSize: 11, fontWeight: "700" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: 300, maxHeight: "92%", position: "absolute", bottom: 0, left: 0, right: 0 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },

  // Schedule Slots
  slotCard: { borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  slotDate: { fontSize: 14, fontWeight: "700" },
  slotTime: { fontSize: 12, marginTop: 2 },
  slotAvail: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  slotAvailText: { fontSize: 11, fontWeight: "700" },

  // Respond Modal
  respondBloodRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  respondBloodBadge: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  respondBloodText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  respondUrgencyBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  respondUrgencyText: { fontSize: 12, fontWeight: "700" },
  respondDetailRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, marginBottom: 10 },
  respondDetailLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  respondDetailValue: { fontSize: 14, fontWeight: "600", marginTop: 2 },
  respondInfoBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 10, marginTop: 8 },
  respondInfoText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: "600" },

  // Confirm Step
  confirmIconCircle: { width: 90, height: 90, borderRadius: 45, alignItems: "center", justifyContent: "center" },
  confirmTitle: { fontSize: 24, fontWeight: "800" },
  confirmSubtitle: { fontSize: 14, lineHeight: 20, textAlign: "center" },
});

export default DonorDashboard;