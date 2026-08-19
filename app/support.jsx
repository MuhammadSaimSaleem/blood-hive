import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import Markdown from 'react-native-markdown-display';
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
  accentGreen: "#7ED321",
  gray200: "#E5E7EB",
  gray800: "#1F2937",
};

const markdownStyles = (textColor) => ({
  body: { color: textColor, fontSize: 14, lineHeight: 20 },
  strong: { fontWeight: "700", color: textColor },
  em: { fontStyle: "italic", color: textColor },
  bullet_list: { color: textColor },
  ordered_list: { color: textColor },
  code_inline: {
    backgroundColor: "rgba(0,0,0,0.08)",
    borderRadius: 4,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 13,
    color: textColor,
  },
});

const PROXY_URL = "http://192.168.1.7:3000/chat";
const CHAT_HISTORY_KEY = "bloodhive_ai_chat_history";

// ─────────────────────────────────────────────
// AI Chat Modal
// ─────────────────────────────────────────────
const WELCOME_MESSAGE = {
  id: "welcome",
  role: "assistant",
  text: "Hi! I'm Blood Hive AI. Ask me anything about blood donation eligibility, rules, or how to use the platform.",
};

const AIChatModal = ({ visible, onClose, isDarkMode }) => {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef(null);

  const bg = isDarkMode ? COLORS.backgroundDark : COLORS.backgroundLight;
  const surface = isDarkMode ? COLORS.surfaceDark : COLORS.surfaceLight;
  const inputBg = isDarkMode ? "#2A2A2A" : "#E5E7EB";
  const headerBg = isDarkMode ? "#1A1A1A" : "#FFFFFF";
  const borderColor = isDarkMode ? "#2A2A2A" : "#E5E7EB";
  const textPrimaryColor = isDarkMode ? COLORS.textDarkPrimary : COLORS.textLightPrimary;
  const textSecondaryColor = isDarkMode ? COLORS.textDarkSecondary : COLORS.textLightSecondary;

  // ── Load history from AsyncStorage on mount ──
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const stored = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
          }
        }
      } catch (e) {
        console.warn("Failed to load chat history:", e);
      }
    };
    loadHistory();
  }, []);

  // ── Persist messages to AsyncStorage whenever they change ──
  useEffect(() => {
    const saveHistory = async () => {
      try {
        await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
      } catch (e) {
        console.warn("Failed to save chat history:", e);
      }
    };
    // Don't save if it's just the default welcome message
    if (messages.length > 1 || messages[0]?.id !== "welcome") {
      saveHistory();
    }
  }, [messages]);

  // ── New Chat with confirmation ──
  const handleNewChat = () => {
    Alert.alert(
      "Start New Chat",
      "This will clear your entire conversation history. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(CHAT_HISTORY_KEY);
            } catch (e) {
              console.warn("Failed to clear chat history:", e);
            }
            setMessages([WELCOME_MESSAGE]);
          },
        },
      ]
    );
  };

  const sendMessage = async () => {
    const trimmed = userInput.trim();
    if (!trimmed || isLoading) return;

    const userMsg = { id: Date.now().toString(), role: "user", text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setUserInput("");
    setIsLoading(true);

    // Scroll to bottom after adding user message
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      // Build conversation history for context (last 10 msgs)
      const rawHistory = [...messages, userMsg]
        .slice(-10)
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text }));

      // Trim any leading assistant turns
      const firstUserIdx = rawHistory.findIndex(m => m.role === "user");
      const history = firstUserIdx >= 0 ? rawHistory.slice(firstUserIdx) : rawHistory;

      const response = await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      const data = await response.json();
      const aiText = data.text ?? "Sorry, I couldn't process that right now.";

      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString() + "_ai", role: "assistant", text: aiText },
      ]);
    } catch (err) {
      console.error("Blood Hive AI error:", err?.message ?? err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + "_err",
          role: "assistant",
          text: `Connection failed: ${err?.message ?? "Unknown error"}. Make sure server.js is running on your PC and both devices are on the same Wi-Fi.`,
        },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
    }
  };

  const hasUserMessages = messages.some((m) => m.role === "user");

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: bg }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* Modal Header */}
        <View style={[modalStyles.header, { backgroundColor: headerBg, borderBottomColor: borderColor }]}>
          <View style={modalStyles.headerLeft}>
            <View style={modalStyles.aiAvatarSmall}>
              <MaterialIcons name="psychology" size={18} color="#fff" />
            </View>
            <View>
              <Text style={[modalStyles.headerTitle, { color: textPrimaryColor }]}>Blood Hive AI</Text>
              <Text style={[modalStyles.headerSubtitle, { color: COLORS.accentGreen }]}>
                {isLoading ? "Thinking…" : "Online"}
              </Text>
            </View>
          </View>
          <View style={modalStyles.headerRight}>
            {/* New Chat button — only show when there's conversation history */}
            {hasUserMessages && (
              <TouchableOpacity
                onPress={handleNewChat}
                style={[modalStyles.newChatBtn, { borderColor }]}
                activeOpacity={0.7}
              >
                <MaterialIcons name="add" size={15} color={textSecondaryColor} />
                <Text style={[modalStyles.newChatText, { color: textSecondaryColor }]}>New</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn} activeOpacity={0.7}>
              <MaterialIcons name="close" size={22} color={textSecondaryColor} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={[modalStyles.messageList, { paddingBottom: 16 }]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg) => {
            const isAi = msg.role === "assistant";
            return (
              <View
                key={msg.id}
                style={[
                  modalStyles.messageBubbleRow,
                  isAi ? modalStyles.rowLeft : modalStyles.rowRight,
                ]}
              >
                {isAi && (
                  <View style={modalStyles.aiAvatarTiny}>
                    <MaterialIcons name="psychology" size={12} color="#fff" />
                  </View>
                )}
                <View
                  style={[
                    modalStyles.bubble,
                    isAi
                      ? [modalStyles.bubbleAi, { backgroundColor: surface }]
                      : [modalStyles.bubbleUser, { backgroundColor: COLORS.accentBlue }],
                  ]}
                >
                  {isAi ? (
                    <Markdown style={markdownStyles(textPrimaryColor)}>
                      {msg.text}
                    </Markdown>
                  ) : (
                    <Text style={[modalStyles.bubbleText, { color: "#fff" }]}>
                      {msg.text}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}

          {isLoading && (
            <View style={[modalStyles.messageBubbleRow, modalStyles.rowLeft]}>
              <View style={modalStyles.aiAvatarTiny}>
                <MaterialIcons name="psychology" size={12} color="#fff" />
              </View>
              <View style={[modalStyles.bubble, modalStyles.bubbleAi, { backgroundColor: surface }]}>
                <View style={modalStyles.typingDots}>
                  <TypingDot delay={0} isDarkMode={isDarkMode} />
                  <TypingDot delay={200} isDarkMode={isDarkMode} />
                  <TypingDot delay={400} isDarkMode={isDarkMode} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Suggested prompts — fixed height wrapper fixes the layout issue */}
        {!hasUserMessages && (
          <View style={modalStyles.suggestionsWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={modalStyles.suggestionsRow}
            >
              {[
                "Can I donate after a tattoo?",
                "What's the age limit?",
                "How often can I donate?",
                "Iron level requirements?",
              ].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[modalStyles.suggestionChip, { backgroundColor: surface, borderColor }]}
                  activeOpacity={0.75}
                  onPress={() => setUserInput(s)}
                >
                  <Text style={[modalStyles.suggestionText, { color: textPrimaryColor }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Input Bar */}
        <View style={[modalStyles.inputBar, { backgroundColor: headerBg, borderTopColor: borderColor }]}>
          <TextInput
            style={[modalStyles.textInput, { backgroundColor: inputBg, color: textPrimaryColor }]}
            placeholder="Ask about blood donation…"
            placeholderTextColor={textSecondaryColor}
            value={userInput}
            onChangeText={setUserInput}
            multiline
            maxLength={500}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[modalStyles.sendBtn, { opacity: isLoading || !userInput.trim() ? 0.45 : 1 }]}
            onPress={sendMessage}
            disabled={isLoading || !userInput.trim()}
            activeOpacity={0.8}
          >
            <MaterialIcons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// Animated typing indicator dot
const TypingDot = ({ delay, isDarkMode }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useState(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: -5, duration: 300, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.delay(600 - delay),
      ])
    );
    loop.start();
    return () => loop.stop();
  });

  return (
    <Animated.View
      style={[
        modalStyles.dot,
        {
          backgroundColor: isDarkMode ? COLORS.textDarkSecondary : COLORS.textLightSecondary,
          transform: [{ translateY: anim }],
        },
      ]}
    />
  );
};

// ─────────────────────────────────────────────
// Main Support Screen
// ─────────────────────────────────────────────
const SupportScreen = ({ setActiveTab }) => {
  const { isDarkMode } = useTheme();
  const [openItem, setOpenItem] = useState(null);
  const [aiModalVisible, setAiModalVisible] = useState(false);

  // FAB pulse animation
  const fabScale = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(
    Animated.loop(
      Animated.sequence([
        Animated.timing(fabScale, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(fabScale, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    )
  ).current;

  useState(() => {
    pulseAnim.start();
    return () => pulseAnim.stop();
  });

  const bgStyle = isDarkMode ? styles.darkContainer : styles.lightContainer;
  const textPrimary = isDarkMode ? styles.textPrimaryDark : styles.textPrimaryLight;
  const textSecondary = isDarkMode ? styles.textSecondaryDark : styles.textSecondaryLight;
  const surface = isDarkMode ? COLORS.surfaceDark : COLORS.surfaceLight;
  const headerBg = isDarkMode ? COLORS.backgroundDark : COLORS.backgroundLight;
  const borderColor = isDarkMode ? "#2A2A2A" : "#E5E7EB";
  const dropdownBg = isDarkMode ? "#18181B" : "#FFFFFF";

  const supportOptions = [
    {
      id: 1,
      title: "Call Support",
      desc: "Talk to our help team for urgent blood request issues.",
      icon: "call",
      contentTitle: "Emergency Helpline",
      contentText:
        "If you need urgent help for blood requests, donor matching, or emergency coordination, call our support team directly.",
      actionText: "Call Now",
      actionIcon: "call",
      onAction: () => Linking.openURL("tel:+923001234567"),
    },
    {
      id: 2,
      title: "Email Assistance",
      desc: "Send your issue details and receive a guided response.",
      icon: "email",
      contentTitle: "Support Email",
      contentText:
        "For detailed issues, screenshots, or non-urgent questions, send us an email and our team will respond with proper guidance.",
      actionText: "Send Email",
      actionIcon: "email",
      onAction: () =>
        Linking.openURL("mailto:support@bloodhive.com?subject=Support Request&body=Hello Support Team,"),
    },
  ];

  const toggleDropdown = (id) => setOpenItem(openItem === id ? null : id);

  return (
    <View style={[styles.safeArea, bgStyle]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: headerBg }]}>
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
        <Text style={[styles.headerTitle, textPrimary]}>Support</Text>
        <View style={styles.headerIconButton} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={[styles.card, { backgroundColor: surface }]}>
            <Text style={[styles.cardTitle, textPrimary]}>Need Help?</Text>
            <Text style={[styles.bodyText, textSecondary]}>
              We are here to help you with donor search, request tracking, eligibility questions, and
              emergency coordination.
            </Text>
          </View>
        </View>

        {/* AI Chat Banner */}
        <View style={[styles.section, { paddingTop: 0 }]}>
          <TouchableOpacity
            style={[styles.aiBanner, { backgroundColor: COLORS.accentBlue }]}
            activeOpacity={0.85}
            onPress={() => setAiModalVisible(true)}
          >
            <View style={styles.aiBannerIconWrap}>
              <MaterialIcons name="psychology" size={26} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.aiBannerTitle}>Blood Hive AI</Text>
              <Text style={styles.aiBannerSub}>
                Ask about eligibility, rules, or how to use the platform
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>

        {/* Support Options */}
        <View style={styles.section}>
          {supportOptions.map((item) => {
            const isOpen = openItem === item.id;
            return (
              <View
                key={item.id}
                style={[
                  styles.dropdownWrapper,
                  {
                    backgroundColor: surface,
                    borderColor: isOpen ? "rgba(217,45,32,0.25)" : borderColor,
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.supportCard}
                  activeOpacity={0.8}
                  onPress={() => toggleDropdown(item.id)}
                >
                  <View style={styles.supportIconWrap}>
                    <MaterialIcons name={item.icon} size={22} color={COLORS.accentBlue} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.supportTitle, textPrimary]}>{item.title}</Text>
                    <Text style={[styles.bodyText, textSecondary]}>{item.desc}</Text>
                  </View>
                  <MaterialIcons
                    name={isOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                    size={26}
                    color={isOpen ? COLORS.accentBlue : textSecondary.color}
                  />
                </TouchableOpacity>

                {isOpen && (
                  <View
                    style={[
                      styles.dropdownContent,
                      { backgroundColor: dropdownBg, borderTopColor: borderColor },
                    ]}
                  >
                    <Text style={[styles.dropdownTitle, textPrimary]}>{item.contentTitle}</Text>
                    <Text style={[styles.dropdownText, textSecondary]}>{item.contentText}</Text>
                    <TouchableOpacity
                      style={styles.actionButton}
                      activeOpacity={0.8}
                      onPress={item.onAction}
                    >
                      <MaterialIcons name={item.actionIcon} size={18} color="#fff" />
                      <Text style={styles.actionButtonText}>{item.actionText}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* ── Floating Action Button ── */}
      <View style={fabStyles.fabContainer} pointerEvents="box-none">
        {/* Pulsing ring behind FAB */}
        <Animated.View
          style={[
            fabStyles.fabRing,
            { transform: [{ scale: fabScale }] },
          ]}
        />
        <TouchableOpacity
          style={fabStyles.fab}
          activeOpacity={0.88}
          onPress={() => setAiModalVisible(true)}
        >
          <MaterialIcons name="psychology" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={fabStyles.fabLabel}>AI Chat</Text>
      </View>

      {/* ── AI Chat Modal ── */}
      <AIChatModal
        visible={aiModalVisible}
        onClose={() => setAiModalVisible(false)}
        isDarkMode={isDarkMode}
      />
    </View>
  );
};

// ─────────────────────────────────────────────
// StyleSheets
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  lightContainer: { backgroundColor: COLORS.backgroundLight },
  darkContainer: { backgroundColor: COLORS.backgroundDark },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerIconButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 22, fontWeight: "800", textAlign: "center", flex: 1 },
  section: { padding: 16 },
  card: { borderRadius: 12, padding: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, gap: 8 },
  cardTitle: { fontSize: 18, fontWeight: "700" },
  bodyText: { fontSize: 15, lineHeight: 20 },
  dropdownWrapper: { borderRadius: 14, marginBottom: 14, overflow: "hidden", borderWidth: 1 },
  supportCard: { padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  supportIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 9999,
    backgroundColor: "rgba(217,45,32,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  supportTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  dropdownContent: { padding: 14, borderTopWidth: 1 },
  dropdownTitle: { fontSize: 15, fontWeight: "700", marginBottom: 8 },
  dropdownText: { fontSize: 14, lineHeight: 21, marginBottom: 14 },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.accentBlue,
    paddingVertical: 11,
    borderRadius: 10,
  },
  actionButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  textPrimaryLight: { color: COLORS.textLightPrimary },
  textSecondaryLight: { color: COLORS.textLightSecondary },
  textPrimaryDark: { color: COLORS.textDarkPrimary },
  textSecondaryDark: { color: COLORS.textDarkSecondary },

  // AI Banner
  aiBanner: {
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: COLORS.accentBlue,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  aiBannerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  aiBannerTitle: { color: "#fff", fontSize: 16, fontWeight: "800", marginBottom: 2 },
  aiBannerSub: { color: "rgba(255,255,255,0.75)", fontSize: 13, lineHeight: 18 },
});

const fabStyles = StyleSheet.create({
  fabContainer: {
    position: "absolute",
    bottom: 28,
    right: 22,
    alignItems: "center",
  },
  fabRing: {
    position: "absolute",
    bottom: 18,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(217,45,32,0.22)",
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.accentBlue,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.accentBlue,
    shadowOpacity: 0.55,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  fabLabel: {
    marginTop: 5,
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.accentBlue,
    letterSpacing: 0.3,
  },
});

const modalStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  newChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  newChatText: { fontSize: 12, fontWeight: "600" },
  aiAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.accentBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "800" },
  headerSubtitle: { fontSize: 12, fontWeight: "600", marginTop: 1 },
  closeBtn: { padding: 6 },

  messageList: { padding: 16, gap: 10 },
  messageBubbleRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 6 },
  rowLeft: { justifyContent: "flex-start" },
  rowRight: { justifyContent: "flex-end" },

  aiAvatarTiny: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: COLORS.accentBlue,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleAi: {
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
    shadowColor: COLORS.accentBlue,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },

  typingDots: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },

  // Fixed-height wrapper prevents the horizontal ScrollView from collapsing
  suggestionsWrapper: {
    height: 52,
    justifyContent: "center",
  },
  suggestionsRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, alignItems: "center" },
  suggestionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  suggestionText: { fontSize: 13, fontWeight: "500" },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 44,
    maxHeight: 110,
    textAlignVertical: "top",
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.accentBlue,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default SupportScreen;