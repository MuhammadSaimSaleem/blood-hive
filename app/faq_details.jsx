import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from "../context";

const COLORS = {
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

export default function FAQDetailsScreen() {
  const { isDarkMode } = useTheme();

  const bgColor = isDarkMode ? COLORS.backgroundDark : COLORS.backgroundLight;
  const surface = isDarkMode ? COLORS.surfaceDark : COLORS.surfaceLight;
  const textPrimary = isDarkMode
    ? COLORS.textDarkPrimary
    : COLORS.textLightPrimary;
  const textSecondary = isDarkMode
    ? COLORS.textDarkSecondary
    : COLORS.textLightSecondary;

  const faqs = [
    {
      q: "Who can donate blood?",
      a: "Healthy individuals aged 18–60 with normal hemoglobin levels can donate blood safely.",
    },
    {
      q: "How often can I donate?",
      a: "You can donate whole blood every 3 months, depending on your health condition.",
    },
    {
      q: "How to request blood?",
      a: "Go to request section → choose blood group → add urgency → submit.",
    },
    {
      q: "Is blood donation safe?",
      a: "Yes, it is completely safe when done under medical supervision.",
    },
    {
      q: "What should I do before donation?",
      a: "Eat healthy food, drink water, and avoid smoking/alcohol before donation.",
    },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }]}>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={textPrimary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: textPrimary }]}>
          FAQs & Details
        </Text>

        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {faqs.map((item, index) => (
          <View
            key={index}
            style={[styles.card, { backgroundColor: surface }]}
          >
            <Text style={[styles.question, { color: textPrimary }]}>
              {item.q}
            </Text>

            <Text style={[styles.answer, { color: textSecondary }]}>
              {item.a}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },

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

  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },

  question: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },

  answer: {
    fontSize: 14,
    lineHeight: 20,
  },
});