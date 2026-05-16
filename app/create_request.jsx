import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context';
import { supabase } from '../lib/supabase';

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
};

const HOSPITALS = [
  // CHINIOT
  { label: "Harral Medical Complex", value: "Harral Medical Complex", city: "Chiniot" },
  { label: "Islamia Hospital", value: "Islamia Hospital", city: "Chiniot" },
  { label: "Majeeda Memorial Hospital", value: "Majeeda Memorial Hospital", city: "Chiniot" },
  { label: "Yaseen Hospital & Urology Centre", value: "Yaseen Hospital & Urology Centre", city: "Chiniot" },
  // FAISALABAD
  { label: "Abubakar Eye Center, Sumandri", value: "Abubakar Eye Center, Sumandri", city: "Faisalabad" },
  { label: "Abwa Hospital", value: "Abwa Hospital", city: "Faisalabad" },
  { label: "Aslam Memorial Zakaria Hospital", value: "Aslam Memorial Zakaria Hospital", city: "Faisalabad" },
  { label: "Faisalabad International Hospital", value: "Faisalabad International Hospital", city: "Faisalabad" },
  { label: "Fazal Elahi Chatha", value: "Fazal Elahi Chatha", city: "Faisalabad" },
  { label: "Fazal Elahi Chatha Hospital-2", value: "Fazal Elahi Chatha Hospital-2", city: "Faisalabad" },
  { label: "FIC Faisalabad Institute of Cardiology", value: "FIC Faisalabad Institute of Cardiology", city: "Faisalabad" },
  { label: "Independent University Hospital", value: "Independent University Hospital", city: "Faisalabad" },
  { label: "Khair un Nisa Hospital", value: "Khair un Nisa Hospital", city: "Faisalabad" },
  { label: "Madina Teaching Hospital", value: "Madina Teaching Hospital", city: "Faisalabad" },
  { label: "Maqsooda Zia Hospital", value: "Maqsooda Zia Hospital", city: "Faisalabad" },
  { label: "Mian Muhammad Trust", value: "Mian Muhammad Trust", city: "Faisalabad" },
  { label: "Mujahid Hospital", value: "Mujahid Hospital", city: "Faisalabad" },
  { label: "PINUM Cancer Hospital", value: "PINUM Cancer Hospital", city: "Faisalabad" },
  { label: "Rathore Hospital", value: "Rathore Hospital", city: "Faisalabad" },
  { label: "Sughran Siddique Hospital", value: "Sughran Siddique Hospital", city: "Faisalabad" },
  // JHANG
  { label: "Haleema Surgical Hospital", value: "Haleema Surgical Hospital", city: "Jhang" },
  { label: "Haq Bahuu General Hospital", value: "Haq Bahuu General Hospital", city: "Jhang" },
  { label: "Nighat Medical Complex", value: "Nighat Medical Complex", city: "Jhang" },
  { label: "Rana Jameel Memorial Hospital", value: "Rana Jameel Memorial Hospital", city: "Jhang" },
  { label: "Saeed Medical Complex & Anzalina Care", value: "Saeed Medical Complex & Anzalina Care", city: "Jhang" },
  { label: "Shahbal Poly Clinic", value: "Shahbal Poly Clinic", city: "Jhang" },
  { label: "Shaheen Infertility & General Hospital", value: "Shaheen Infertility & General Hospital", city: "Jhang" },
  { label: "Shifa Hospital", value: "Shifa Hospital", city: "Jhang" },
  // TOBA TEK SINGH
  { label: "Al Barkat Hospital", value: "Al Barkat Hospital", city: "Toba Tek Singh" },
  { label: "Al Kareem Orthopedic & Trauma Center", value: "Al Kareem Orthopedic & Trauma Center", city: "Toba Tek Singh" },
  { label: "Al Noor Eye Clinic Toba Tek Singh", value: "Al Noor Eye Clinic Toba Tek Singh", city: "Toba Tek Singh" },
  { label: "Al-Sadiq Hospital Kamalia", value: "Al-Sadiq Hospital Kamalia", city: "Toba Tek Singh" },
  { label: "Athwal Hospital", value: "Athwal Hospital", city: "Toba Tek Singh" },
  { label: "Munawar Hospital", value: "Munawar Hospital", city: "Toba Tek Singh" },
  { label: "Sarwar Foundation Hospital, Rajhana", value: "Sarwar Foundation Hospital, Rajhana", city: "Toba Tek Singh" },
];

// Small inline error text shown beneath a field
const FieldError = ({ message }) => {
  if (!message) return null;
  return <Text style={styles.fieldError}>{message}</Text>;
};

const RequestDetailsScreen = () => {
  const { isDarkMode } = useTheme();

  const [bloodType, setBloodType] = useState("");
  const [units_required, setUnitsRequired] = useState("0");
  const [hospital, setHospital] = useState(null);
  const [notes, setNotes] = useState("");
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [serverError, setServerError] = useState("");

  // Per-field validation errors
  const [fieldErrors, setFieldErrors] = useState({
    bloodType: "",
    units_required: "",
    hospital: "",
  });

  const bgStyle = isDarkMode ? styles.darkContainer : styles.lightContainer;
  const textPrimary = isDarkMode ? styles.textPrimaryDark : styles.textPrimaryLight;
  const textSecondary = isDarkMode ? styles.textSecondaryDark : styles.textSecondaryLight;
  const surface = isDarkMode ? COLORS.surfaceDark : COLORS.surfaceLight;

  const bloodTypes = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

  const filteredHospitals = HOSPITALS.filter((h) =>
    h.label.toLowerCase().includes(search.toLowerCase()) ||
    h.city.toLowerCase().includes(search.toLowerCase())
  );

  // Clears a single field's error when the user starts interacting
  const clearFieldError = (field) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validate = () => {
    const errors = { bloodType: "", units_required: "", hospital: "" };
    let valid = true;

    if (!bloodType) {
      errors.bloodType = "Please select a blood type.";
      valid = false;
    }

    const parsedUnits = parseInt(units_required, 10);
    if (!units_required || isNaN(parsedUnits) || parsedUnits <= 0) {
      errors.units_required = "Please enter a valid number of units.";
      valid = false;
    }

    if (!hospital) {
      errors.hospital = "Please select a hospital.";
      valid = false;
    }

    setFieldErrors(errors);
    return valid;
  };

  const handleContinue = async () => {
    setServerError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("blood_requests").insert([
        {
          blood_type: bloodType,
          units_required: parseInt(units_required, 10),
          hospital_name: hospital,
          notes: notes.trim() || null,
        },
      ]);

      if (error) throw error;

      setSuccessMsg("Request submitted successfully!");
      setTimeout(() => {
        setSuccessMsg("");
        router.push({
          pathname: "/donor-live-map",
          params: { bloodType, units_required, hospital },
        });
      }, 1500);
    } catch (err) {
      setServerError(err.message || "Failed to submit request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, bgStyle]}>
      {/* Hospital Picker Modal */}
      <Modal
        visible={dropdownVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: isDarkMode ? COLORS.surfaceDark : "#FFF" }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, textPrimary]}>Select Hospital</Text>
              <TouchableOpacity onPress={() => { setDropdownVisible(false); setSearch(""); }}>
                <MaterialIcons name="close" size={24} color={isDarkMode ? COLORS.textDarkPrimary : COLORS.textLightPrimary} />
              </TouchableOpacity>
            </View>

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search hospital or city..."
              placeholderTextColor={isDarkMode ? COLORS.textDarkSecondary : COLORS.textLightSecondary}
              style={[
                styles.searchInput,
                {
                  backgroundColor: isDarkMode ? COLORS.backgroundDark : COLORS.surfaceLight,
                  color: isDarkMode ? COLORS.textDarkPrimary : COLORS.textLightPrimary,
                  borderColor: isDarkMode ? "#333" : COLORS.gray200,
                },
              ]}
            />

            <FlatList
              data={filteredHospitals}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.hospitalItem,
                    hospital === item.value && { backgroundColor: isDarkMode ? "#2A1A1A" : "#FFF0F0" },
                  ]}
                  onPress={() => {
                    setHospital(item.value);
                    clearFieldError("hospital");
                    setDropdownVisible(false);
                    setSearch("");
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.hospitalName, textPrimary, hospital === item.value && { color: COLORS.primary }]}>
                      {item.label}
                    </Text>
                    <Text style={[styles.hospitalCity, textSecondary]}>{item.city}</Text>
                  </View>
                  {hospital === item.value && (
                    <MaterialIcons name="check-circle" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => (
                <View style={{ height: 1, backgroundColor: isDarkMode ? "#2A2A2A" : COLORS.gray200 }} />
              )}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.headerButton, { backgroundColor: surface }]}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={isDarkMode ? COLORS.textDarkPrimary : COLORS.textLightPrimary}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, textPrimary]}>New Blood Request</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={[styles.bigTitle, textPrimary]}>Request Details</Text>
          <Text style={[styles.subTitle, textSecondary]}>
            Select blood type and search preferences before opening the live map.
          </Text>
        </View>

        <View style={styles.section}>
          <View style={[styles.card, { backgroundColor: surface }]}>

            {/* Blood Type */}
            <Text style={[styles.label, textSecondary]}>Blood Type</Text>
            <View style={styles.chipWrap}>
              {bloodTypes.map((item) => (
                <TouchableOpacity
                  key={item}
                  activeOpacity={0.8}
                  onPress={() => {
                    setBloodType(item);
                    clearFieldError("bloodType");
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: bloodType === item ? COLORS.accentBlue : (isDarkMode ? COLORS.backgroundDark : "#FFFFFF"),
                      borderColor: bloodType === item
                        ? COLORS.accentBlue
                        : fieldErrors.bloodType
                          ? COLORS.primary
                          : COLORS.gray200,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: bloodType === item ? "#fff" : (isDarkMode ? COLORS.textDarkPrimary : COLORS.textLightPrimary),
                      fontWeight: "700",
                    }}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <FieldError message={fieldErrors.bloodType} />

            {/* Units */}
            <Text style={[styles.label, textSecondary]}>Units Required</Text>
            <TextInput
              value={units_required}
              onChangeText={(val) => {
                setUnitsRequired(val);
                clearFieldError("units_required");
              }}
              keyboardType="numeric"
              style={[
                styles.input,
                {
                  backgroundColor: isDarkMode ? COLORS.backgroundDark : "#FFFFFF",
                  color: isDarkMode ? COLORS.textDarkPrimary : COLORS.textLightPrimary,
                  borderColor: fieldErrors.units_required ? COLORS.primary : (isDarkMode ? "#333" : COLORS.gray200),
                },
              ]}
            />
            <FieldError message={fieldErrors.units_required} />

            {/* Hospital Selector */}
            <Text style={[styles.label, textSecondary]}>Hospital Name</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setDropdownVisible(true)}
              style={[
                styles.selectorButton,
                {
                  backgroundColor: isDarkMode ? COLORS.backgroundDark : "#FFFFFF",
                  borderColor: fieldErrors.hospital ? COLORS.primary : (isDarkMode ? "#333" : COLORS.gray200),
                },
              ]}
            >
              <Text
                style={{
                  flex: 1,
                  fontSize: 15,
                  color: hospital
                    ? (isDarkMode ? COLORS.textDarkPrimary : COLORS.textLightPrimary)
                    : (isDarkMode ? COLORS.textDarkSecondary : COLORS.textLightSecondary),
                }}
                numberOfLines={1}
              >
                {hospital || "Select a hospital..."}
              </Text>
              <MaterialIcons
                name="keyboard-arrow-down"
                size={22}
                color={isDarkMode ? COLORS.textDarkSecondary : COLORS.textLightSecondary}
              />
            </TouchableOpacity>
            <FieldError message={fieldErrors.hospital} />

            {/* Notes — no validation */}
            <Text style={[styles.label, textSecondary]}>Additional Notes</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: isDarkMode ? COLORS.backgroundDark : "#FFFFFF",
                  color: isDarkMode ? COLORS.textDarkPrimary : COLORS.textLightPrimary,
                  borderColor: isDarkMode ? "#333" : COLORS.gray200,
                },
              ]}
              placeholder="Ex: Urgent need for surgery..."
              placeholderTextColor={isDarkMode ? COLORS.textDarkSecondary : COLORS.textLightSecondary}
            />

            {/* Server error / success banners */}
            {!!serverError && (
              <View style={styles.messageBox}>
                <MaterialIcons name="error-outline" size={16} color={COLORS.primary} />
                <Text style={[styles.messageText, { color: COLORS.primary }]}>{serverError}</Text>
              </View>
            )}
            {!!successMsg && (
              <View style={[styles.messageBox, { backgroundColor: "#F0FFF4" }]}>
                <MaterialIcons name="check-circle" size={16} color="#22C55E" />
                <Text style={[styles.messageText, { color: "#22C55E" }]}>{successMsg}</Text>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: COLORS.primary, opacity: loading ? 0.7 : 1 }]}
              onPress={handleContinue}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.buttonText}>Find Donors</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  lightContainer: { backgroundColor: COLORS.backgroundLight },
  darkContainer: { backgroundColor: COLORS.backgroundDark },
  textPrimaryLight: { color: COLORS.textLightPrimary },
  textPrimaryDark: { color: COLORS.textDarkPrimary },
  textSecondaryLight: { color: COLORS.textLightSecondary },
  textSecondaryDark: { color: COLORS.textDarkSecondary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  section: { paddingHorizontal: 20, marginTop: 20 },
  bigTitle: { fontSize: 28, fontWeight: "800", textAlign: "center" },
  subTitle: { marginTop: 10, fontSize: 14, textAlign: "center", lineHeight: 20 },
  card: {
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  label: { fontSize: 13, fontWeight: "700", marginTop: 10, marginBottom: 8 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip: {
    minWidth: 54,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 2,
  },
  textArea: { height: 96, textAlignVertical: "top", paddingTop: 12, marginBottom: 8 },
  selectorButton: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  fieldError: {
    fontSize: 11,
    color: COLORS.primary,
    marginTop: 3,
    marginBottom: 6,
    marginLeft: 4,
  },
  primaryButton: {
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  buttonText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  searchInput: {
    height: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    marginBottom: 12,
  },
  hospitalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  hospitalName: { fontSize: 14, fontWeight: "600" },
  hospitalCity: { fontSize: 12, marginTop: 2 },
  messageBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#FFF5F5",
    marginTop: 8,
  },
  messageText: { fontSize: 13, fontWeight: "500", flex: 1 },
});

export default RequestDetailsScreen;