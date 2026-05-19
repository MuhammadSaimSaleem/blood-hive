import { MaterialIcons } from "@expo/vector-icons";
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  BackHandler,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRole, useTheme, useUser } from '../context';
import { supabase } from '../lib/supabase';

const COLORS = {
  primary: '#D0021B',
  primarySoft: '#FCE5E8',
  backgroundLight: '#FFFFFF',
  backgroundDark: '#121212',
  surfaceLight: '#F0F5FA',
  surfaceDark: '#1E1E1E',
  textPrimaryLight: '#1C1C1E',
  textSecondaryLight: '#636366',
  textPrimaryDark: '#F2F2F7',
  textSecondaryDark: '#8E8E93',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray700: '#1F2937',
  success: '#7ED321',
};

const MultiStepRegistrationScreen = () => {
  const { isDarkMode } = useTheme();
  const { role } = useRole();
  const { userId } = useUser();
  const isDonor = role === 'donor';

  // --- Multi-Step State ---
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState({});

  // --- Dynamic Styles ---
  const containerStyle = isDarkMode ? styles.darkContainer : styles.lightContainer;
  const surfaceStyle = isDarkMode ? styles.surfaceDark : styles.surfaceLight;
  const textPrimary = isDarkMode ? styles.textPrimaryDark : styles.textPrimaryLight;
  const textSecondary = isDarkMode ? styles.textSecondaryDark : styles.textSecondaryLight;
  const borderStyle = isDarkMode ? styles.borderDark : styles.borderLight;
  const inputBgStyle = isDarkMode ? styles.inputBgDark : styles.inputBgLight;
  const backIconColor = isDarkMode ? COLORS.textPrimaryDark : COLORS.textPrimaryLight;
  const uploadBg = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#F9FAFB';

  // --- Identity State ---
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [dob, setDob] = useState(new Date());
  const [isOver18, setIsOver18] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [dobText, setDobText] = useState("");
  const [gender, setGender] = useState('');
  const [idFront, setIdFront] = useState(null); 
  const [idBack, setIdBack] = useState(null);

  // --- Health State ---
  const [weight, setWeight] = useState(0);
  const [hemoglobin, setHemoglobin] = useState(0);
  const [bloodType, setBloodType] = useState('');
  const [showBloodPicker, setShowBloodPicker] = useState(false);
  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const [isEligibleByDate, setIsEligibleByDate] = useState(true);
  const [lastDonationDate, setLastDonationDate] = useState(new Date());
  const [showDonationPicker, setShowDonationPicker] = useState(false);
  const [donationDateText, setDonationDateText] = useState("");
  const [medication, setMedication] = useState('N'); 
  const [chronic, setChronic] = useState('N');
  const [surgery, setSurgery] = useState('N');

  // --- Security State ---
  const [phoneNumber, setPhoneNumber] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const otpRefs = useRef([]);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [privacyPolicyConsent, setPrivacyPolicyConsent] = useState(true);
  const [notificationConsent, setNotificationConsent] = useState(false);

  useEffect(() => {
      const backAction = () => {
        setCurrentStep((prevStep) => {
          if (prevStep !== 1) {
            return prevStep - 1;
          } else {
            router.back();
            return prevStep;
          }
        });
        return true;
      };
      const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
      return () => backHandler.remove();
    }, []);

  // --- Validation Functions ---
  const validateStep1 = () => {
    let newErrors = {};
    if (!fullName.trim()) newErrors.fullName = "Full name is required";
    if (!isOver18) newErrors.dob = "Must be 18 or older"
    if (!dobText && !isOver18) newErrors.dob = "Date of birth is required";
    if (!gender) newErrors.gender = "Gender is required";
    if (isNaN(phoneNumber) || phoneNumber.length < 10) newErrors.phoneNumber = "Valid 10-digit phone number required";
    if (!address.trim()) newErrors.address = "Address is required";
    if (!city.trim()) newErrors.city = "City is required";
    if (!idFront || !idBack) newErrors.id = "Both front and back ID photos are required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    let newErrors = {};
    if (!bloodType) newErrors.bloodType = "Blood type is required";
    if (!weight || isNaN(weight) || Number(weight) <= 0) newErrors.weight = "Valid weight is required";
    else if (isDonor && Number(weight) < 50) newErrors.weight = "Minimum weight required 50kgs";
    if (isDonor && (!hemoglobin || isNaN(hemoglobin) || Number(hemoglobin) < 13)) newErrors.hemoglobin = "Hemoglobin must be 13 or higher";
    if (isDonor && !isEligibleByDate) newErrors.donationDate = "You must wait 56 days between donations.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    let newErrors = {};
    if (otp.join('').length < 4) newErrors.otp = "Complete the 4-digit OTP";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) newErrors.email = "Valid email address is required";
    if (password.length < 8) newErrors.password = "Password must be at least 8 characters long.";
    else if (strength < 3) newErrors.password = "Password must include an uppercase letter and a number or special character.";
    if (!privacyPolicyConsent) newErrors.consent1 = "You must agree to the Privacy Policy";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onChangeDob = (event, selectedDate) => {
    setShowPicker(Platform.OS === 'ios'); 
    if (selectedDate) {
      setDob(selectedDate);
      const today = new Date();
      let age = today.getFullYear() - selectedDate.getFullYear();
      const monthDiff = today.getMonth() - selectedDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < selectedDate.getDate())) {
        age--;
      }
      setIsOver18(age >= 18);
      const day = selectedDate.getDate().toString().padStart(2, '0');
      const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
      const year = selectedDate.getFullYear();
      setDobText(`${day}/${month}/${year}`);
    }
  };

  // Helper: reads a local URI and returns a Uint8Array
  const uriToBytes = async (uri) => {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  // Helper: uploads a single image and returns its public URL
  const uploadImage = async (uri, bucket, folder, name) => {
    const bytes = await uriToBytes(uri);
    const filePath = `${folder}/${userId}_${name.trim().replace(/\s+/g, '_')}_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}_${new Date().toTimeString().slice(0,8).replace(/:/g, '-')}.png`;
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, bytes, { contentType: 'image/png', upsert: true });
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return urlData.publicUrl;
  };

  // Picks profile image locally — no upload yet
  const handleProfileImagePick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access camera roll is required!');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  // Picks ID front/back locally — no upload yet
  const handleIDImagePick = async (side) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera roll permissions to make this work!');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7, 
    });
    if (!result.canceled) {
      if (side === 'front') {
        setIdFront(result.assets[0].uri);
      } else {
        setIdBack(result.assets[0].uri);
      }
    }
  };

  // Uploads all images then updates the existing row (created in role selection) with all form data
  const handleSubmit = async () => {
    let newErrors = {};

    try {
      // 1. Create the Auth Account first
      // This adds the user to the "Authentication" tab you saw in your screenshot
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: { data: { full_name: fullName } }
      });

      if (authError && (authError.message.includes("already registered") || authError.status === 422)) {
        newErrors.email = "This email is already registered. Try logging in.";
        setErrors(newErrors);
        return; 
      } else if (authError) {
        alert(authError);
        return;
      } else {
          const authUser = authData.user;

          // 2. Upload images using the new Auth User ID
          const [profileImageUrl, idFrontUrl, idBackUrl] = await Promise.all([
            profileImage ? uploadImage(profileImage, 'profiles', 'profileImage', fullName) : Promise.resolve(null),
            uploadImage(idFront, 'profiles', 'frontID', fullName),
            uploadImage(idBack, 'profiles', 'backID', fullName),
          ]);


          if (dbError) throw dbError;

          const { error: dbError } = await supabase
          .from('users')
          .upsert({
            id: authUser.id, // The link between Auth and Database
            full_name: fullName,
            address: address,
            city: city,
            dob: dob.toISOString().split('T')[0],
            gender: gender,
            role: role,
            phone_number: phoneNumber,
            profile_image: profileImageUrl,
            id_front: idFrontUrl,
            id_back: idBackUrl,
            blood_type: bloodType,
            weight: Number(weight),
            hemoglobin: hemoglobin ? Number(hemoglobin) : null,
            last_donation_date: donationDateText ? lastDonationDate.toISOString().split('T')[0] : null,
            medication: medication,
            chronic: chronic,
            surgery: surgery,
            email: email,
            notifications_enabled: notificationConsent,
          });

          alert('Registration Successful! Please verify your email.');
          router.dismissAll();
          router.replace('/login');

        }
    } catch (error) {
      console.error(error);
    }
  };

  const clearDonationDate = () => {
    setLastDonationDate(new Date());
    setDonationDateText("");
    setIsEligibleByDate(true);
    if (errors.donationDate) {
      setErrors(prev => {
        const { donationDate, ...rest } = prev;
        return rest;
      });
    }
  };

  const onChangeDonationDate = (event, selectedDate) => {
    setShowDonationPicker(Platform.OS === 'ios'); 
    if (event.type === 'set' && selectedDate) {
      setLastDonationDate(selectedDate);
      const today = new Date();
      const diffDays = Math.ceil(Math.abs(today - selectedDate) / (1000 * 60 * 60 * 24));
      setIsEligibleByDate(diffDays >= 56);
      const day = selectedDate.getDate().toString().padStart(2, '0');
      const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
      const year = selectedDate.getFullYear();
      setDonationDateText(`${day}/${month}/${year}`);
    }
  };

  const getPasswordStrength = (pass) => {
    let strength = 0;
    if (pass.length > 8) strength += 1; 
    if (/[A-Z]/.test(pass)) strength += 1; 
    if (/[0-9]/.test(pass)) strength += 1;
    if (/[^A-Za-z0-9]/.test(pass)) strength += 1;
    return strength; 
  };

  const strength = getPasswordStrength(password);
  const strengthLabels = ['None', 'Weak', 'Fair', 'Good', 'Strong'];
  
  const getStrengthColor = () => {
    if (strength < 2) return COLORS.primary; 
    if (strength === 2) return '#F79009'; 
    if (strength === 3) return '#c1ea08'; 
    return COLORS.success; 
  };

  const handleOtpChange = (text, index) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < 3) {
      otpRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1].focus();
    }
  };

  const handleNext = () => {
    let isValid = false;
    if (currentStep === 1) isValid = validateStep1();
    else if (currentStep === 2) isValid = validateStep2();
    else if (currentStep === 3) {
      isValid = validateStep3();
      if (isValid) {
        handleSubmit();
      }
      return;
    }
    if (isValid && currentStep < 3) {
      setCurrentStep(currentStep + 1);
      setErrors({});
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    } else {
      router.back();
    }
  };

  const progressMap = {
    1: '11%',
    2: '49%',
    3: '88%',
  };
  const headerProgressWidth = progressMap[currentStep] || '0%';
  const footerProgressWidth = `${(currentStep / 3) * 100}%`;

  return (
    <SafeAreaView style={[styles.safeArea, containerStyle]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      
      {/* --- Header --- */}
      <View style={styles.headerContainer}>
        <View style={styles.navRow}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={backIconColor} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, textPrimary]}>Registration</Text>
          <View style={{ width: 40 }} /> 
        </View>

        <View style={styles.progressContainer}>
          <View style={[styles.progressBarBackground, { width: headerProgressWidth }]}>
            <View style={styles.progressBarFill}>
               <View style={styles.progressGlow} />
            </View>
          </View>
        </View>

        <View style={styles.stepLabels}>
          <Text style={[styles.stepText, { color: currentStep >= 1 ? COLORS.primary : COLORS.textSecondaryLight }]}>Identity</Text>
          <Text style={[styles.stepText, { color: currentStep >= 2 ? COLORS.primary : COLORS.textSecondaryLight }]}>Health</Text>
          <Text style={[styles.stepText, { color: currentStep >= 3 ? COLORS.primary : COLORS.textSecondaryLight }]}>Security</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ================= STEP 1: IDENTITY SECTION ================= */}
        {currentStep === 1 && (
          <View>
            <View style={styles.centerHeaderTextContainer}>
                 <Text style={[styles.sectionTitle, textPrimary]}>Let&apos;s get to know you</Text>
                 <Text style={[styles.sectionSubtitle, textSecondary, {textAlign: 'center', paddingHorizontal: 20}]}>
                    Enter your details as they appear on your official ID.
                 </Text>
            </View>

            <View style={styles.photoSection}>
              <TouchableOpacity 
                style={[styles.photoContainer, borderStyle, {backgroundColor: uploadBg}]}
                onPress={handleProfileImagePick}
              >
                {profileImage ? (
                  <Image 
                    source={{ uri: profileImage }} 
                    style={{ width: '100%', height: '100%', borderRadius: 50 }} 
                  />
                ) : (
                  <MaterialIcons 
                    name="person" 
                    size={48} 
                    color={isDarkMode ? COLORS.gray700 : COLORS.gray300} 
                  />
                )}
                <View style={styles.cameraBadge}>
                  <MaterialIcons name="camera-alt" size={14} color="white" />
                </View>
              </TouchableOpacity>
              <Text style={[styles.photoLabel, textSecondary]}>
                {profileImage ? "Change Profile Photo" : "Upload Profile Photo"}
              </Text>
            </View>

            <View style={styles.section}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, textSecondary]}>FULL NAME</Text>
                <View style={[styles.inputContainer, borderStyle, inputBgStyle, errors.fullName && styles.inputError]}>
                  <MaterialIcons name="person-outline" size={20} color={COLORS.textSecondaryLight} style={styles.inputIconLeft} />
                  <TextInput 
                    placeholder="Ex. John Doe" 
                    placeholderTextColor={isDarkMode ? COLORS.textSecondaryDark : COLORS.textSecondaryLight}
                    style={[styles.textInput, textPrimary]}
                    value={fullName}
                    onChangeText={setFullName}
                  />
                </View>
                {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
              </View>

              <View style={styles.row}>
                 <View style={[styles.inputGroup, { flex: 1.2, marginRight: 12 }]}>
                    <Text style={[styles.label, textSecondary]}>DATE OF BIRTH</Text>
                    
                    {Platform.OS === 'web' ? (
                      /* Web implementation using standard HTML5 date input */
                      <input
                        type="date"
                        value={dob.toISOString().split('T')[0]} // Format: YYYY-MM-DD
                        onChange={(e) => {
                          const d = new Date(e.target.value);
                          if (!isNaN(d.getTime())) onChangeDob(null, d);
                        }}
                        style={{
                          ...styles.inputContainer,
                          ...borderStyle,
                          ...inputBgStyle,
                          color: isDarkMode ? '#FFF' : '#000',
                          padding: 10,
                          borderWidth: 1,
                          borderRadius: 8,
                          outline: 'none'
                        }}
                        max={new Date().toISOString().split('T')[0]}
                      />
                    ) : (
                      /* Mobile implementation */
                      <>
                        <TouchableOpacity 
                          style={[styles.inputContainer, borderStyle, inputBgStyle, errors.dob && styles.inputError]}
                          onPress={() => setShowPicker(true)} 
                        >
                          <TextInput 
                            placeholder="DD/MM/YYYY" 
                            placeholderTextColor={isDarkMode ? COLORS.textSecondaryDark : COLORS.textSecondaryLight}
                            editable={false} 
                            value={dobText} 
                            style={[styles.textInput, textPrimary]}
                            pointerEvents="none" // Ensures touch goes to TouchableOpacity
                          />
                          <MaterialIcons name="calendar-today" size={18} color={COLORS.textSecondaryLight} />
                        </TouchableOpacity>

                        {showPicker && (
                          <DateTimePicker
                            value={dob}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            maximumDate={new Date()}
                            onChange={onChangeDob}
                          />
                        )}
                      </>
                    )}
                    
                    {errors.dob && <Text style={styles.errorText}>{errors.dob}</Text>}
                  </View>

                 <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={[styles.label, textSecondary]}>GENDER</Text>
                    <View style={[styles.genderContainer, borderStyle, inputBgStyle, errors.gender && styles.inputError]}>
                        <TouchableOpacity 
                            onPress={() => setGender('M')} 
                            style={[styles.genderBtn, gender === 'M' && styles.genderBtnActive]}
                        >
                            <Text style={[styles.genderText, gender === 'M' ? styles.genderTextActive : textSecondary]}>M</Text>
                        </TouchableOpacity>
                        <View style={styles.verticalDivider} />
                        <TouchableOpacity 
                            onPress={() => setGender('F')} 
                            style={[styles.genderBtn, gender === 'F' && styles.genderBtnActive]}
                        >
                            <Text style={[styles.genderText, gender === 'F' ? styles.genderTextActive : textSecondary]}>F</Text>
                        </TouchableOpacity>
                    </View>
                    {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
                 </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, textSecondary]}>PHONE NUMBER</Text>
                <View style={[styles.inputContainer, borderStyle, inputBgStyle, errors.phoneNumber && styles.inputError]}>
                  <View style={styles.countryCode}>
                      <Text style={[styles.countryCodeText, textPrimary]}>+92</Text>
                  </View>
                  <View style={[styles.verticalDivider, {height: 20, backgroundColor: isDarkMode ? COLORS.gray700 : COLORS.gray300}]} />
                  <TextInput 
                    placeholder="301-234-5678"
                    keyboardType="phone-pad"
                    placeholderTextColor={isDarkMode ? COLORS.textSecondaryDark : COLORS.textSecondaryLight}
                    style={[styles.textInput, textPrimary, { paddingLeft: 12 }]}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    maxLength={10}
                  />
                </View>
                {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, textSecondary]}>RESIDENTIAL ADDRESS</Text>
                <View style={[styles.inputContainer, borderStyle, inputBgStyle, errors.address && styles.inputError]}>
                  <MaterialIcons name="location-on" size={20} color={COLORS.textSecondaryLight} style={styles.inputIconLeft} />
                  <TextInput 
                    placeholder="Street address, Apt" 
                    placeholderTextColor={isDarkMode ? COLORS.textSecondaryDark : COLORS.textSecondaryLight}
                    style={[styles.textInput, textPrimary]}
                    value={address}
                    onChangeText={setAddress}
                  />
                </View>
                {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, textSecondary]}>CITY</Text>
                <View style={[styles.inputContainer, borderStyle, inputBgStyle, errors.city && styles.inputError]}>
                  <MaterialIcons name="location-city" size={20} color={COLORS.textSecondaryLight} style={styles.inputIconLeft} />
                  <TextInput 
                    placeholder="Ex. Lahore" 
                    placeholderTextColor={isDarkMode ? COLORS.textSecondaryDark : COLORS.textSecondaryLight}
                    style={[styles.textInput, textPrimary]}
                    value={city}
                    onChangeText={setCity}
                  />
                </View>
                {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
              </View>
            </View>

            <View style={styles.section}>
                <View style={styles.idSectionHeader}>
                    <Text style={[styles.cardTitle, textPrimary]}>Government ID</Text>
                    <View style={styles.badge}>
                        <MaterialIcons name="verified-user" size={12} color={COLORS.primary} />
                        <Text style={styles.badgeText}>Required</Text>
                    </View>
                </View>
                <Text style={[styles.helperText, textSecondary]}>
                    Please upload a clear photo of your ID (Driving License or Passport).
                </Text>
                {errors.id && <Text style={[styles.errorText, {marginBottom: 8}]}>{errors.id}</Text>}

                <View style={styles.idUploadRow}>
                  <TouchableOpacity 
                      style={[styles.uploadBox, { borderColor: errors.id ? COLORS.primary : (isDarkMode ? COLORS.gray700 : COLORS.gray300), backgroundColor: uploadBg }]}
                      onPress={() => handleIDImagePick('front')}
                  >
                      {idFront ? (
                          <View style={styles.previewContainer}>
                              <Image source={{ uri: idFront }} style={styles.imagePreview} />
                              <View style={styles.editBadge}>
                                  <MaterialIcons name="edit" size={12} color="white" />
                              </View>
                          </View>
                      ) : (
                          <>
                              <View style={styles.uploadIconCircle}>
                                  <MaterialIcons name="add-a-photo" size={20} color={COLORS.primary} />
                              </View>
                              <Text style={[styles.uploadText, textPrimary]}>Front Side</Text>
                          </>
                      )}
                  </TouchableOpacity>

                  <TouchableOpacity 
                      style={[styles.uploadBox, { borderColor: errors.id ? COLORS.primary : (isDarkMode ? COLORS.gray700 : COLORS.gray300), backgroundColor: uploadBg }]}
                      onPress={() => handleIDImagePick('back')}
                  >
                      {idBack ? (
                          <View style={styles.previewContainer}>
                              <Image source={{ uri: idBack }} style={styles.imagePreview} />
                              <View style={styles.editBadge}>
                                  <MaterialIcons name="edit" size={12} color="white" />
                              </View>
                          </View>
                      ) : (
                          <>
                              <View style={styles.uploadIconCircle}>
                                  <MaterialIcons name="add-a-photo" size={20} color={COLORS.primary} />
                              </View>
                              <Text style={[styles.uploadText, textPrimary]}>Back Side</Text>
                          </>
                      )}
                  </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ================= STEP 2: HEALTH SECTION ================= */}
        {currentStep === 2 && (
          <View>
            <View style={styles.leftHeaderTextContainer}>
                 <Text style={[styles.sectionTitle, textPrimary]}>Medical Profile</Text>
                 <Text style={[styles.sectionSubtitle, textSecondary]}>
                    This information helps us determine your eligibility to donate or receive blood.
                 </Text>
            </View>

            <View style={[styles.card, surfaceStyle, borderStyle]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? 'rgba(208, 2, 27, 0.2)' : COLORS.primarySoft }]}>
                    <MaterialIcons name="monitor-heart" size={20} color={COLORS.primary} />
                  </View>
                  <Text style={[styles.cardTitle, textPrimary]}>Basic Vitals</Text>
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={[styles.label, textSecondary]}>BLOOD TYPE</Text>
                    <TouchableOpacity 
                      style={[styles.inputContainer, borderStyle, inputBgStyle, errors.bloodType && { borderColor: COLORS.primary, borderWidth: 1.5 }]}
                      onPress={() => setShowBloodPicker(true)} 
                    >
                      <Text style={[styles.inputText, bloodType ? textPrimary : textSecondary]}>
                        {bloodType || "Select"} 
                      </Text>
                      <MaterialIcons name="expand-more" size={20} color={errors.bloodType ? COLORS.primary : COLORS.textSecondaryLight} />
                    </TouchableOpacity>

                    {errors.bloodType && (
                      <View style={styles.infoRow}>
                        <Text style={[styles.infoText, { color: COLORS.primary }]}>{errors.bloodType}</Text>
                      </View>
                    )}

                    <Modal
                      visible={showBloodPicker}
                      transparent={true}
                      animationType="fade"
                      onRequestClose={() => setShowBloodPicker(false)}
                    >
                      <TouchableOpacity 
                        style={styles.modalOverlay} 
                        activeOpacity={1} 
                        onPress={() => setShowBloodPicker(false)}
                      >
                        <View style={[styles.modalContent, surfaceStyle]}>
                          <Text style={[styles.modalTitle, textPrimary]}>Select Blood Type</Text>
                          <FlatList
                            showsVerticalScrollIndicator={false}
                            data={bloodTypes}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                              <TouchableOpacity 
                                style={styles.bloodOption} 
                                onPress={() => {
                                  setBloodType(item);
                                  if (errors.bloodType) {
                                    setErrors(prev => ({ ...prev, bloodType: null }));
                                  }
                                  setShowBloodPicker(false);
                                }}
                              >
                                <Text style={[styles.bloodOptionText, textPrimary, bloodType === item && { color: COLORS.primary, fontWeight: '700' }]}>
                                  {item}
                                </Text>
                                {bloodType === item && <MaterialIcons name="check" size={20} color={COLORS.primary} />}
                              </TouchableOpacity>
                            )}
                          />
                        </View>
                      </TouchableOpacity>
                    </Modal>
                  </View>

                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={[styles.label, textSecondary]}>WEIGHT</Text>
                    <View style={[styles.inputContainer, borderStyle, inputBgStyle, errors.weight && styles.inputError]}>
                      <TextInput 
                        placeholder="00" 
                        placeholderTextColor={isDarkMode ? COLORS.textSecondaryDark : COLORS.textSecondaryLight}
                        keyboardType="numeric"
                        style={[styles.textInput, textPrimary]}
                        value={weight}
                        onChangeText={setWeight}
                        maxLength={3}
                      />
                      <Text style={[styles.suffix, textSecondary]}>kg</Text>
                    </View>
                    {errors.weight && <Text style={styles.errorText}>{errors.weight}</Text>}
                  </View>
                </View>

                {isDonor && (
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, textSecondary]}>HEMOGLOBIN</Text>
                    <View style={[styles.inputContainer, borderStyle, inputBgStyle, errors.hemoglobin && styles.inputError]}>
                        <TextInput 
                          placeholder="00" 
                          placeholderTextColor={isDarkMode ? COLORS.textSecondaryDark : COLORS.textSecondaryLight}
                          keyboardType="numeric"
                          style={[styles.textInput, textPrimary]}
                          value={hemoglobin}
                          onChangeText={setHemoglobin}
                        />
                        <Text style={[styles.suffix, textSecondary]}>Hb</Text>
                      </View>
                    <View style={styles.infoRow}>
                      <MaterialIcons name="info" size={14} color={COLORS.primary} />
                      <Text style={styles.infoText}>Minimum required must be 13Hb.</Text>
                    </View>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[styles.label, textSecondary]}>LAST DONATION DATE</Text>
                    {donationDateText !== "" && (
                      <TouchableOpacity onPress={clearDonationDate}>
                        <Text style={{ color: COLORS.textSecondaryLight, fontSize: 12, fontWeight: '600' }}>CLEAR</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <TouchableOpacity 
                    style={[styles.inputContainer, borderStyle, inputBgStyle, errors.donationDate && styles.inputError]}
                    onPress={() => setShowDonationPicker(true)}
                  >
                    <Text style={[styles.inputText, donationDateText ? textPrimary : textSecondary]}>
                      {donationDateText || "Select Date (if any)"}
                    </Text>
                    <MaterialIcons 
                      name="calendar-today" 
                      size={18} 
                      color={donationDateText ? (isEligibleByDate ? COLORS.success : COLORS.primary) : COLORS.textSecondaryLight} 
                    />
                  </TouchableOpacity>
                  
                  {donationDateText && (
                    <View style={styles.infoRow}>
                      <MaterialIcons 
                        name={isEligibleByDate ? "check-circle" : "error-outline"} 
                        size={14} 
                        color={isEligibleByDate ? COLORS.success : COLORS.primary} 
                      />
                      <Text style={[styles.infoText, { color: isEligibleByDate ? COLORS.success : COLORS.primary }]}>
                        {isEligibleByDate 
                          ? "You are eligible to donate!" 
                          : `Wait ${56 - Math.ceil(Math.abs(new Date() - lastDonationDate) / (1000*60*60*24))} more days to donate.`
                        }
                      </Text>
                    </View>
                  )}

                  {!donationDateText && (
                    <View style={styles.infoRow}>
                      <MaterialIcons name="info" size={14} color={COLORS.textSecondaryLight} />
                      <Text style={[styles.infoText, {color: COLORS.textSecondaryLight}]}>
                        Standard interval is 56 days between donations.
                      </Text>
                    </View>
                  )}

                  {showDonationPicker && (
                    <DateTimePicker
                      value={lastDonationDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      maximumDate={new Date()} 
                      onChange={onChangeDonationDate}
                    />
                  )}
                </View>
            </View>

            <View style={styles.section}>
                <Text style={[styles.subSectionTitle, textPrimary]}>Health Questionnaire</Text>
                
                <View style={[styles.card, surfaceStyle, borderStyle, {paddingVertical: 10}]}>
                    <View style={[styles.questionRow, borderStyle]}>
                        <Text style={[styles.questionText, textPrimary]}>Are you currently taking any medication?</Text>
                        <View style={[styles.toggleGroup, borderStyle, inputBgStyle]}>
                            <TouchableOpacity onPress={() => setMedication('Y')} style={medication === 'Y' ? styles.toggleBtnActive : styles.toggleBtn}>
                                <Text style={medication === 'Y' ? styles.toggleTextActive : [styles.toggleText, textSecondary]}>Y</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setMedication('N')} style={medication === 'N' ? styles.toggleBtnActive : styles.toggleBtn}>
                                <Text style={medication === 'N' ? styles.toggleTextActive : [styles.toggleText, textSecondary]}>N</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={[styles.questionRow, borderStyle]}>
                        <Text style={[styles.questionText, textPrimary]}>Do you have any chronic medical conditions?</Text>
                        <View style={[styles.toggleGroup, borderStyle, inputBgStyle]}>
                            <TouchableOpacity onPress={() => setChronic('Y')} style={chronic === 'Y' ? styles.toggleBtnActive : styles.toggleBtn}>
                                <Text style={chronic === 'Y' ? styles.toggleTextActive : [styles.toggleText, textSecondary]}>Y</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setChronic('N')} style={chronic === 'N' ? styles.toggleBtnActive : styles.toggleBtn}>
                                <Text style={chronic === 'N' ? styles.toggleTextActive : [styles.toggleText, textSecondary]}>N</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={[styles.questionRow, { borderBottomWidth: 0 }]}>
                        <Text style={[styles.questionText, textPrimary]}>Have you had surgery in the last 6 months?</Text>
                        <View style={[styles.toggleGroup, borderStyle, inputBgStyle]}>
                            <TouchableOpacity onPress={() => setSurgery('Y')} style={surgery === 'Y' ? styles.toggleBtnActive : styles.toggleBtn}>
                                <Text style={surgery === 'Y' ? styles.toggleTextActive : [styles.toggleText, textSecondary]}>Y</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setSurgery('N')} style={surgery === 'N' ? styles.toggleBtnActive : styles.toggleBtn}>
                                <Text style={surgery === 'N' ? styles.toggleTextActive : [styles.toggleText, textSecondary]}>N</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View style={styles.warningBox}>
                    <MaterialIcons name="warning" size={20} color="#B54708" />
                    <Text style={styles.warningText}>
                        False information may lead to permanent ban from the platform.
                    </Text>
                </View>
            </View>
          </View>
        )}

        {/* ================= STEP 3: SECURITY SECTION ================= */}
        {currentStep === 3 && (
          <View>
            <View style={styles.mainSectionHeader}>
              <Text style={[styles.sectionTitle, textPrimary]}>Security & Verification</Text>
              <Text style={[styles.sectionSubtitle, textSecondary]}>Secure your account and verify identity.</Text>
            </View>

            {/* OTP Block */}
            <View style={[styles.card, surfaceStyle, borderStyle]}>
              <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 12 }]}>
                <Text style={[styles.label, textSecondary]}>MOBILE NUMBER</Text>
                {phoneNumber.length >= 10 && (
                    <View style={[styles.verifiedBadge, { backgroundColor: isDarkMode ? 'rgba(126, 211, 33, 0.1)' : 'rgba(126, 211, 33, 0.1)' }]}>
                      <MaterialIcons name="check-circle" size={14} color={COLORS.success} />
                      <Text style={styles.verifiedText}>Sent</Text>
                    </View>
                )}
              </View>

              <View style={[styles.inputContainer, borderStyle, { backgroundColor: isDarkMode ? '#1F2937' : '#F2F4F7' }]}>
                <TextInput 
                  value={phoneNumber ? `+92 ${phoneNumber}` : "No number provided"} 
                  editable={false} 
                  style={[styles.textInput, {color: COLORS.textSecondaryLight}]} 
                />
              </View>

              <View style={{ marginTop: 16 }}>
                <Text style={[styles.label, textSecondary, { marginBottom: 8, textTransform: 'none' }]}>Security Code (OTP)</Text>
                <View style={styles.otpContainer}>
                  {[0, 1, 2, 3].map((index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => (otpRefs.current[index] = ref)}
                      style={[
                        styles.otpBox, 
                        styles.otpText,
                        textPrimary,
                        { 
                          backgroundColor: isDarkMode ? 'rgba(208, 2, 27, 0.05)' : COLORS.primarySoft,
                          borderColor: errors.otp ? COLORS.primary : (otp[index] ? COLORS.primary : (isDarkMode ? COLORS.gray700 : COLORS.gray300))
                        }
                      ]}
                      keyboardType="number-pad"
                      maxLength={1}
                      value={otp[index]}
                      onChangeText={(text) => handleOtpChange(text, index)}
                      onKeyPress={(e) => handleOtpKeyPress(e, index)}
                      selectTextOnFocus
                    />
                  ))}
                </View>
                {errors.otp && <Text style={styles.errorText}>{errors.otp}</Text>}
              </View>
            </View>

            {/* Login Details */}
            <View style={[styles.card, surfaceStyle, borderStyle]}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, textSecondary]}>EMAIL ADDRESS</Text>
                <View style={[styles.inputContainer, borderStyle, inputBgStyle, errors.email && styles.inputError]}>
                  <MaterialIcons name="mail" size={20} color={COLORS.textSecondaryLight} style={styles.inputIconLeft} />
                  <TextInput 
                    placeholder="john@example.com" 
                    placeholderTextColor={isDarkMode ? COLORS.textSecondaryDark : COLORS.textSecondaryLight}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={[styles.textInput, textPrimary]}
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, textSecondary]}>CREATE PASSWORD</Text>
                <View style={[styles.inputContainer, borderStyle, inputBgStyle, errors.password && styles.inputError]}>
                  <MaterialIcons name="lock" size={20} color={COLORS.textSecondaryLight} style={styles.inputIconLeft} />
                  <TextInput 
                    placeholder="••••••••" 
                    placeholderTextColor={isDarkMode ? COLORS.textSecondaryDark : COLORS.textSecondaryLight}
                    secureTextEntry={!passwordVisible}
                    style={[styles.textInput, textPrimary]}
                    value={password}
                    onChangeText={setPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)} style={styles.inputIconRight}>
                    <MaterialIcons name={passwordVisible ? "visibility" : "visibility-off"} size={20} color={COLORS.textSecondaryLight} />
                  </TouchableOpacity>
                </View>

                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

                <View style={styles.strengthContainer}>
                  {[1, 2, 3, 4].map((level) => (
                    <View 
                      key={level} 
                      style={[
                        styles.strengthBar, 
                        { backgroundColor: strength >= level ? getStrengthColor() : (isDarkMode ? COLORS.gray700 : COLORS.gray200) }
                      ]} 
                    />
                  ))}
                </View>
                <Text style={[styles.strengthLabel, { color: strength > 0 ? getStrengthColor() : COLORS.textSecondaryLight }]}>
                  {strengthLabels[strength]}
                </Text>

                <View style={styles.infoRow}>
                  <MaterialIcons name="info" size={14} color={COLORS.textSecondaryLight} />
                  <Text style={[styles.infoText, styles.infoTextPassword]}>Password must be at least 8 characters long and include at least one uppercase letter, one number, and one special character.</Text>
                </View>
              </View>
            </View>

            {/* Consents */}
            <View style={styles.consentContainer}>
              <TouchableOpacity style={styles.checkboxRow} onPress={() => setPrivacyPolicyConsent(!privacyPolicyConsent)}>
                <View style={[styles.checkbox, privacyPolicyConsent ? styles.checkboxChecked : {borderColor: errors.consent1 ? COLORS.primary : COLORS.gray300}]}>
                  {privacyPolicyConsent && <MaterialIcons name="check" size={14} color="white" />}
                </View>
                <Text style={[styles.consentText, textSecondary]}>
                  I consent to the collection and testing of my blood and agree to the <Text style={{color: COLORS.primary}}>Privacy Policy</Text>.
                </Text>
              </TouchableOpacity>
              {errors.consent1 && <Text style={styles.errorText}>{errors.consent1}</Text>}

              <TouchableOpacity style={styles.checkboxRow} onPress={() => setNotificationConsent(!notificationConsent)}>
                <View style={[styles.checkbox, notificationConsent ? styles.checkboxChecked : {borderColor: COLORS.gray300}]}>
                  {notificationConsent && <MaterialIcons name="check" size={14} color="white" />}
                </View>
                <Text style={[styles.consentText, textSecondary]}>
                  Notify me about urgent blood needs in my area via <Text style={{fontWeight:'700', color: isDarkMode ? '#fff' : '#000'}}>Push Notification</Text>.
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* --- Footer --- */}
      <View style={[styles.footer, surfaceStyle, { borderTopColor: isDarkMode ? COLORS.gray700 : COLORS.gray200 }]}>
        <View style={styles.footerInner}>
            <View style={{flex: 1}}> 
               <Text style={[styles.footerStepText, textSecondary]}>Step {currentStep} of 3</Text>
               <View style={styles.footerProgressBg}>
                  <View style={[styles.footerProgressFill, { width: footerProgressWidth }]} />
               </View>
            </View>
            
            <TouchableOpacity 
              style={styles.primaryButton}
              activeOpacity={0.8}
              onPress={handleNext} 
            >
              <Text style={styles.primaryButtonText}>
                 {currentStep < 3 ? "Next Step" : "Complete"}
              </Text>
              <MaterialIcons name={currentStep < 3 ? "arrow-forward" : "check-circle"} size={20} color="white" />
            </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  lightContainer: { backgroundColor: COLORS.backgroundLight },
  darkContainer: { backgroundColor: COLORS.backgroundDark },
  surfaceLight: { backgroundColor: COLORS.surfaceLight },
  surfaceDark: { backgroundColor: COLORS.surfaceDark },
  textPrimaryLight: { color: COLORS.textPrimaryLight },
  textPrimaryDark: { color: COLORS.textPrimaryDark },
  textSecondaryLight: { color: COLORS.textSecondaryLight },
  textSecondaryDark: { color: COLORS.textSecondaryDark },
  borderLight: { borderColor: COLORS.gray300 },
  borderDark: { borderColor: COLORS.gray700 },
  inputBgLight: { backgroundColor: COLORS.surfaceLight },
  inputBgDark: { backgroundColor: COLORS.backgroundDark },
  errorText: { color: COLORS.primary, fontSize: 12, marginTop: 4, marginLeft: 4, fontWeight: '500' },
  inputError: { borderColor: COLORS.primary },
  headerContainer: { width: "100%", paddingBottom: 16, backgroundColor: 'transparent' },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 56 },
  navTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Poppins-Bold' },
  backButton: { padding: 8, marginLeft: -8 },
  progressContainer: { width: '100%', height: 4, backgroundColor: COLORS.gray200 },
  progressBarBackground: { height: '100%', backgroundColor: COLORS.primary, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  progressBarFill: { flex: 1, position: 'relative' },
  progressGlow: { position: 'absolute', right: -4, top: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 8, elevation: 4 },
  stepLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 12 },
  stepText: { fontSize: 12, fontWeight: '600' },
  scrollContent: { padding: 16 },
  section: { marginBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center' },
  centerHeaderTextContainer: { marginBottom: 24, alignItems: 'center' },
  leftHeaderTextContainer: { marginBottom: 24 },
  mainSectionHeader: { marginBottom: 20 },
  sectionTitle: { fontSize: 24, fontWeight: '700', marginBottom: 6, fontFamily: 'Poppins-Bold' },
  sectionSubtitle: { fontSize: 14, lineHeight: 20 },
  subSectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, marginTop: 8 },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  inputGroup: { marginBottom: 16 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 52 },
  textInput: { flex: 1, fontSize: 16, paddingVertical: 0, height: '100%' },
  inputText: { fontSize: 16 },
  inputIconLeft: { marginRight: 10 },
  inputIconRight: { marginLeft: 8 },
  suffix: { fontSize: 14, fontWeight: '500', marginLeft: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6, paddingRight: 22 },
  infoText: { fontSize: 12, color: COLORS.primary, fontWeight: '500', flexWrap: 'wrap' },
  infoTextPassword: { color: COLORS.textSecondaryLight, textAlign: 'justify'},
  photoSection: { alignItems: 'center', marginBottom: 32 },
  photoContainer: { width: 100, height: 100, borderRadius: 50, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.primary, padding: 6, borderRadius: 20, borderWidth: 2, borderColor: COLORS.backgroundLight },
  photoLabel: { fontSize: 12, fontWeight: '500' },
  genderContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, height: 52, padding: 4, gap: 2 },
  genderBtn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', borderRadius: 6},
  genderBtnActive: { backgroundColor: COLORS.primary },
  genderText: { fontSize: 16, fontWeight: '600' },
  genderTextActive: { color: '#FFFFFF' },
  verticalDivider: { width: 1, height: 24, backgroundColor: COLORS.gray300 },
  countryCode: { flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  countryCodeText: { fontSize: 16, fontWeight: '600' },
  idSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardTitle: { fontSize: 18, fontWeight: '600' },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primarySoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, gap: 2 },
  badgeText: { fontSize: 10, color: COLORS.primary, fontWeight: '700', textTransform: 'uppercase' },
  helperText: { fontSize: 12, marginBottom: 16 },
  idUploadRow: { flexDirection: 'row', gap: 12 },
  previewContainer: { width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden' },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  editBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', padding: 4, borderRadius: 10 },
  uploadBox: { flex: 1, height: 120, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 8 },
  uploadIconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' },
  uploadText: { fontSize: 12, fontWeight: '500' },
  card: { borderRadius: 12, borderWidth: 1, padding: 20, marginBottom: 20, shadowColor: '#101828', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  questionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
  questionText: { flex: 1, fontSize: 14, fontWeight: '500', paddingRight: 12, lineHeight: 20 },
  toggleGroup: { flexDirection: 'row', padding: 4, borderRadius: 8, borderWidth: 1 },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  toggleBtnActive: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: COLORS.primary },
  toggleText: { fontSize: 14, fontWeight: '600' },
  toggleTextActive: { fontSize: 14, fontWeight: '700', color: '#fff' },
  warningBox: { flexDirection: 'row', backgroundColor: '#FFFAEB', padding: 16, borderRadius: 12, gap: 12, borderWidth: 1, borderColor: '#FEDF89' },
  warningText: { flex: 1, fontSize: 13, color: '#B54708', lineHeight: 18, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '80%', maxHeight: '50%', borderRadius: 16, padding: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  bloodOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 0.5, borderBottomColor: COLORS.gray200 },
  bloodOptionText: { fontSize: 16 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, gap: 4 },
  verifiedText: { fontSize: 12, fontWeight: '600', color: COLORS.success },
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  otpBox: { width: 50, height: 50, borderRadius: 10, borderWidth: 1, borderColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  otpText: { fontSize: 22, fontWeight: '700', color: COLORS.primary, textAlign: 'center' },
  strengthContainer: { flexDirection: 'row', gap: 4, marginTop: 8 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 11, textAlign: 'right', marginTop: 6 },
  faceIdRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  faceIdLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  faceIdTitle: { fontSize: 15, fontWeight: '600' },
  faceIdSubtitle: { fontSize: 13 },
  consentContainer: { gap: 16, paddingHorizontal: 4, marginTop: 8 },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, marginTop: 2, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  consentText: { flex: 1, fontSize: 13, lineHeight: 20 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, padding: 16, paddingBottom: Platform.OS === 'ios' ? 30 : 20, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 10 },
  footerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', maxWidth: 420, alignSelf: 'center', width: '100%', gap: 20 },
  footerStepText: { fontSize: 12, marginBottom: 6, fontWeight: '500' },
  footerProgressBg: { height: 6, backgroundColor: COLORS.gray200, borderRadius: 3, width: '100%' },
  footerProgressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  primaryButton: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 9999, height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8 },
  primaryButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});

export default MultiStepRegistrationScreen;