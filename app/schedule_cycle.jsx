import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context';

// Robust Dimension Logic
const screenWidth = Dimensions.get('window').width || 375;
const GRID_SPACING = 10;
const CONTAINER_PADDING = 40;
const ITEM_SIZE = Math.max((screenWidth - CONTAINER_PADDING - (GRID_SPACING * 2)) / 3, 80);

const COLORS = {
    primary: "#d42b1f",
    blue: "#3F72AF", 
    backgroundLight: "#FFFFFF",
    backgroundDark: "#121212",
    surfaceLight: "#F0F5FA",
    surfaceDark: "#2e2828", 
    itemDark: "#503f3f",    
    textLightPrimary: "#1C1C1E",
    textDarkPrimary: "#F2F2F7",
    textLightSecondary: "#636366",
    textDarkSecondary: "#8E8E93",
    error: "#FF3B30",
};

const MAX_FILES = 3;

const ScheduleCycle = () => {
    const { isDarkMode } = useTheme();

    // Form State
    const [isRegularPatient, setIsRegularPatient] = useState(false);
    const [hospitalName, setHospitalName] = useState('');
    const [medicalRecord, setMedicalRecord] = useState('');
    const [interval, setInterval] = useState('');
    const [proofImages, setProofImages] = useState([]);
    const [errors, setErrors] = useState({});

    // Date Picker State
    const [date, setDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);
    const [dateText, setDateText] = useState('');

    const themeColors = {
        background: isDarkMode ? COLORS.backgroundDark : COLORS.backgroundLight,
        surface: isDarkMode ? COLORS.surfaceDark : COLORS.surfaceLight,
        item: isDarkMode ? COLORS.itemDark : "#FFFFFF",
        text: isDarkMode ? COLORS.textDarkPrimary : COLORS.textLightPrimary,
        subtext: isDarkMode ? COLORS.textDarkSecondary : COLORS.textLightSecondary,
        border: isDarkMode ? "#503f3f83" : "#E5E7EB",
    };

    const onChangeDate = (event, selectedDate) => {
        setShowPicker(Platform.OS === 'ios'); 
        if (selectedDate) {
            setDate(selectedDate);
            const formatted = selectedDate.toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric'
            });
            setDateText(formatted);
            setErrors({ ...errors, date: null });
        }
    };

    const clearDate = () => {
        setDateText('');
        setDate(new Date());
    };

    const handleImagePick = async () => {
        if (proofImages.length >= MAX_FILES) {
            Alert.alert("Limit Reached", `You can only upload up to ${MAX_FILES} images.`);
            return;
        }

        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera roll permissions are required.');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
        });

        if (!result.canceled) {
            setProofImages([...proofImages, result.assets[0].uri]);
            setErrors({ ...errors, images: null });
        }
    };

    const validate = () => {
        let newErrors = {};
        if (!hospitalName.trim()) newErrors.hospital = "Hospital Name Required";
        if (!dateText) newErrors.date = "Date Required";
        if (!interval.trim()) newErrors.interval = " Interval Required";
        if (!medicalRecord.trim()) newErrors.mrn = "Medical Record Number Required";
        if (proofImages.length === 0) newErrors.images = "Proof Required";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (validate()) {
            Alert.alert("Success", "Care schedule submitted for verification.");
            router.back();
        }
    };

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: themeColors.background }]}>
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                
                {/* Header */}
                <View style={styles.headerRow}>
                    <TouchableOpacity
                        style={[styles.iconBtn, { backgroundColor: themeColors.surface }]}
                        onPress={() => router.back()}
                    >
                        <MaterialIcons name="arrow-back" size={24} color={themeColors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: themeColors.text }]}>Schedule Support</Text>
                    <View style={{ width: 44 }} />
                </View>

                {/* Hero Card */}
                <View style={[styles.heroCard, { backgroundColor: isDarkMode ? COLORS.surfaceDark : COLORS.blue }]}>
                  <View style={styles.heroHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.heroTitle}>Care Management</Text>
                      <Text style={styles.heroText}>
                        Register for recurring support and verify your medical status.
                      </Text>
                    </View>
                    <View style={[styles.heroIconContainer, { backgroundColor: isDarkMode ? COLORS.itemDark : 'rgba(255,255,255,0.2)' }]}>
                      <MaterialIcons name="medical-services" size={32} color="#FFF" />
                    </View>
                  </View>
                </View>

                {/* Form Section */}
                <View style={[styles.sectionCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                    
                    <View style={[styles.toggleRow, { backgroundColor: themeColors.item }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.toggleTitle, { color: themeColors.text }]}>Regular Care Patient?</Text>
                            <Text style={[styles.toggleSubtitle, { color: themeColors.subtext }]}>Priority for recurring needs</Text>
                        </View>
                        <Switch
                            value={isRegularPatient}
                            onValueChange={setIsRegularPatient}
                            thumbColor="#fff"
                            trackColor={{ false: '#767577', true: COLORS.primary }}
                        />
                    </View>

                    <InputField
                        label="Facility Name"
                        placeholder="Hospital or clinic"
                        value={hospitalName}
                        onChangeText={(t) => {setHospitalName(t); setErrors({...errors, hospital: null})}}
                        theme={themeColors}
                        error={errors.hospital}
                    />

                    <View style={styles.row}>
                        {/* Added marginTop: 16 to match the internal InputField margin */}
                        <View style={{ flex: 1.2, marginTop: 16 }}>
                            <Text style={[styles.inputLabel, { color: themeColors.text }]}>Next Session</Text>
                            <View 
                                style={[styles.input, { 
                                    backgroundColor: themeColors.item, 
                                    borderColor: errors.date ? COLORS.error : themeColors.border,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    paddingHorizontal: 0, 
                                }]}
                            >
                                <TouchableOpacity 
                                    style={{ flex: 1, paddingHorizontal: 16, height: '100%', justifyContent: 'center' }}
                                    onPress={() => setShowPicker(true)}
                                >
                                    <Text style={{ color: dateText ? themeColors.text : themeColors.subtext }}>
                                        {dateText || "Select Date"}
                                    </Text>
                                </TouchableOpacity>
                                
                                {dateText ? (
                                    <TouchableOpacity 
                                        onPress={clearDate} 
                                        style={{ height: '100%', justifyContent: 'center', paddingHorizontal: 16 }}
                                    >
                                        <MaterialIcons name="close" size={18} color={themeColors.subtext} />
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                            {errors.date && <Text style={styles.errorText}>{errors.date}</Text>}
                        </View>

                        <View style={{ flex: 1 }}>
                            <InputField
                                label="Interval"
                                placeholder="e.g. 15 Days"
                                value={interval}
                                onChangeText={(t) => {setInterval(t); setErrors({...errors, interval: null})}}
                                theme={themeColors}
                                error={errors.interval}
                            />
                        </View>
                    </View>

                    {showPicker && (
                        <DateTimePicker
                            value={date}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={onChangeDate}
                            minimumDate={new Date()}
                        />
                    )}

                    <InputField
                        label="Medical Record Number (MRN)"
                        placeholder="Enter ID for verification"
                        value={medicalRecord}
                        onChangeText={(t) => {setMedicalRecord(t); setErrors({...errors, mrn: null})}}
                        theme={themeColors}
                        error={errors.mrn}
                    />

                    {/* Multi-Image Upload Section */}
                    <View style={{ marginTop: 20 }}>
                        <View style={styles.uploadHeader}>
                            <Text style={[styles.inputLabel, { color: themeColors.text }]}>Medical Proof ({proofImages.length}/{MAX_FILES})</Text>
                            {errors.images && <Text style={styles.errorTextSmall}>{errors.images}</Text>}
                        </View>

                        <View style={styles.imageGrid}>
                            {proofImages.map((uri, index) => (
                                <View key={index} style={styles.imageWrapper}>
                                    <Image source={{ uri }} style={styles.gridImage} />
                                    <TouchableOpacity 
                                        style={styles.removeBadge} 
                                        onPress={() => setProofImages(proofImages.filter((_, i) => i !== index))}
                                    >
                                        <MaterialIcons name="close" size={14} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                            
                            {proofImages.length < MAX_FILES && (
                                <TouchableOpacity 
                                    style={[styles.addBtn, { backgroundColor: themeColors.item, borderColor: errors.images ? COLORS.error : themeColors.border }]} 
                                    onPress={handleImagePick}
                                >
                                    <MaterialIcons name="add-a-photo" size={24} color={COLORS.blue} />
                                    <Text style={[styles.addBtnText, { color: themeColors.subtext }]}>Add Photo</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>

                <TouchableOpacity 
                    style={[styles.primaryBtn, { backgroundColor: COLORS.blue }]}
                    onPress={handleSave}
                >
                    <Text style={styles.primaryBtnText}>Save Schedule</Text>
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}

function InputField({ label, placeholder, value, onChangeText, theme, error }) {
    return (
        <View style={{ marginTop: 16 }}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>{label}</Text>
            <TextInput
                style={[
                    styles.input, 
                    { color: theme.text, borderColor: error ? COLORS.error : theme.border, backgroundColor: theme.item }
                ]}
                placeholder={placeholder}
                placeholderTextColor={theme.subtext}
                value={value}
                onChangeText={onChangeText}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    container: { padding: 20, paddingBottom: 40 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    iconBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 22, fontWeight: '800' },
    heroCard: { marginTop: 20, borderRadius: 24, padding: 22 },
    heroHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    heroIconContainer: { width: 54, height: 54, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    heroTitle: { fontSize: 26, fontWeight: '800', color: '#fff' },
    heroText: { fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
    sectionCard: { marginTop: 20, borderWidth: 1, borderRadius: 24, padding: 18 },
    toggleRow: { borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
    toggleTitle: { fontSize: 15, fontWeight: '800' },
    toggleSubtitle: { fontSize: 12, marginTop: 2 },
    row: { flexDirection: 'row', gap: 12 },
    inputLabel: { fontSize: 13, fontWeight: '700', marginBottom: 8, marginLeft: 4 },
    input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, height: 50, fontSize: 14 },
    errorText: { color: COLORS.error, fontSize: 11, marginTop: 4, marginLeft: 4, fontWeight: '600' },
    errorTextSmall: { color: COLORS.error, fontSize: 11, fontWeight: '600' },
    uploadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_SPACING, marginTop: 10, justifyContent: 'flex-start' },
    imageWrapper: { width: ITEM_SIZE, height: ITEM_SIZE, borderRadius: 12, overflow: 'hidden' },
    gridImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    removeBadge: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: 4 },
    addBtn: { width: ITEM_SIZE, height: ITEM_SIZE, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
    addBtnText: { fontSize: 10, fontWeight: '700', marginTop: 4 },
    primaryBtn: { marginTop: 30, borderRadius: 16, paddingVertical: 18, alignItems: 'center', elevation: 2 },
    primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

export default ScheduleCycle;