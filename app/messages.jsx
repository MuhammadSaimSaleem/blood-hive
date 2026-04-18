import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
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
  accentBlue: "#D92D20", // Kept exactly as in your files
  accentGreen: "#7ED321",
  gray200: "#E5E7EB",
  gray800: "#1F2937",
};

// --- MOCK DATA ---
const INITIAL_CHATS = [
  {
    id: "1",
    name: "Ali Khan",
    bloodGroup: "O+",
    role: "Donor",
    phone: "+92 300 1112233",
    city: "Faisalabad",
    distance: "2.5 km away",
    lastDonated: "Oct 12, 2023",
    unread: 2,
    messages: [
      { id: "m1", text: "Hi, I saw your urgent request for O+ blood.", sender: "other", time: "10:00 AM" },
      { id: "m2", text: "Yes! We are currently at City Hospital. Are you available?", sender: "me", time: "10:05 AM" },
      { id: "m3", text: "I am. I'm leaving my house now and should be there in about 15 minutes.", sender: "other", time: "10:06 AM" },
    ],
  },
  {
    id: "2",
    name: "Ayesha Tariq",
    bloodGroup: "A-",
    role: "Recipient",
    phone: "+92 300 4445566",
    city: "Lahore",
    distance: "120 km away",
    lastDonated: "Never",
    unread: 0,
    messages: [
      { id: "m1", text: "Thank you so much for donating yesterday.", sender: "other", time: "Yesterday" },
      { id: "m2", text: "You're very welcome! I hope the patient recovers soon.", sender: "me", time: "Yesterday" },
    ],
  },
  {
    id: "3",
    name: "Usman Ahmed",
    bloodGroup: "B+",
    role: "Donor",
    phone: "+92 321 9998877",
    city: "Faisalabad",
    distance: "5.0 km away",
    lastDonated: "Jan 05, 2024",
    unread: 0,
    messages: [
      { id: "m1", text: "Are you still looking for B+?", sender: "other", time: "Mon" },
      { id: "m2", text: "No, we found a match. Thank you though!", sender: "me", time: "Mon" },
    ],
  },
];

const ChatScreen = () => {
  const { isDarkMode } = useTheme();

  // State to manage views: 'LIST' | 'CHAT' | 'PROFILE'
  const [currentView, setCurrentView] = useState("LIST");
  const [activeChatId, setActiveChatId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [chats, setChats] = useState(INITIAL_CHATS);
  const [inputText, setInputText] = useState("");

  const bgStyle = isDarkMode ? styles.darkContainer : styles.lightContainer;
  const textPrimary = isDarkMode ? styles.textPrimaryDark : styles.textPrimaryLight;
  const textSecondary = isDarkMode ? styles.textSecondaryDark : styles.textSecondaryLight;
  const surface = isDarkMode ? COLORS.surfaceDark : COLORS.surfaceLight;
  const inputBg = isDarkMode ? "#2A2A2A" : "#FFFFFF";

  const activeChat = chats.find((c) => c.id === activeChatId);
  const filteredChats = chats.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleSendMessage = () => {
    if (!inputText.trim() || !activeChatId) return;

    const newMessage = {
      id: Date.now().toString(),
      text: inputText,
      sender: "me",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChats((prevChats) =>
      prevChats.map((chat) =>
        chat.id === activeChatId
          ? { ...chat, messages: [...chat.messages, newMessage], unread: 0 }
          : chat
      )
    );
    setInputText("");
  };

  const openChat = (id) => {
    setActiveChatId(id);
    setCurrentView("CHAT");
    // Clear unread count when opening
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
  };

  // ==========================================
  // RENDER: CHAT LIST
  // ==========================================
  const renderChatList = () => (
    <View style={{ flex: 1 }}>
      <View style={[styles.header, { backgroundColor: bgStyle.backgroundColor }]}>
        <TouchableOpacity style={styles.headerIconButton} onPress={() => router.push("/dashboard")}>
          <MaterialIcons name="arrow-back" size={24} color={textPrimary.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, textPrimary]}>Messages</Text>
        <View style={styles.headerIconButton} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: surface }]}>
            <MaterialIcons name="search" size={20} color={textSecondary.color} />
            <TextInput
              style={[styles.searchInput, { color: textPrimary.color }]}
              placeholder="Search messages..."
              placeholderTextColor={textSecondary.color}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Contact List */}
          {filteredChats.map((chat) => {
            const lastMsg = chat.messages[chat.messages.length - 1];
            return (
              <TouchableOpacity
                key={chat.id}
                style={[styles.card, { backgroundColor: surface, flexDirection: "row", alignItems: "center" }]}
                activeOpacity={0.7}
                onPress={() => openChat(chat.id)}
              >
                <View style={[styles.avatarWrap, { backgroundColor: `${COLORS.accentBlue}15` }]}>
                  <Text style={{ color: COLORS.accentBlue, fontWeight: "700" }}>{chat.bloodGroup}</Text>
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={[styles.cardTitle, textPrimary]}>{chat.name}</Text>
                    <Text style={[styles.dateText, textSecondary, { marginTop: 0 }]}>{lastMsg?.time}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                    <Text style={[styles.bodyText, textSecondary, { marginTop: 0 }]} numberOfLines={1}>
                      {lastMsg?.sender === "me" ? "You: " : ""}{lastMsg?.text}
                    </Text>
                    {chat.unread > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{chat.unread}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Navigation (Visible only on List view) */}
      <View style={[styles.bottomNav, { backgroundColor: bgStyle.backgroundColor, borderTopColor: isDarkMode ? "#2A2A2A" : "#E5E7EB" }]}>
        {[
          { icon: "dashboard", label: "Dashboard", route: "/dashboard" },
          { icon: "chat", label: "Messages", active: true, route: "/messages" },
          { icon: "history", label: "History", route: "/history" },
          { icon: "support-agent", label: "Support", route: "/support" },
        ].map((item, index) => (
          <TouchableOpacity key={index} style={styles.navItem} activeOpacity={0.8} onPress={() => router.navigate(item.route)}>
            <MaterialIcons name={item.icon} size={24} color={item.active ? COLORS.accentBlue : textSecondary.color} />
            <Text style={[styles.navLabel, { color: item.active ? COLORS.accentBlue : textSecondary.color }]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // ==========================================
  // RENDER: ACTIVE CHAT ROOM
  // ==========================================
  const renderActiveChat = () => (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={[styles.header, { backgroundColor: bgStyle.backgroundColor, borderBottomWidth: 1, borderBottomColor: isDarkMode ? "#2A2A2A" : "#E5E7EB" }]}>
        <TouchableOpacity style={styles.headerIconButton} onPress={() => setCurrentView("LIST")}>
          <MaterialIcons name="arrow-back" size={24} color={textPrimary.color} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerProfile} onPress={() => setCurrentView("PROFILE")} activeOpacity={0.7}>
          <View style={[styles.chatHeaderAvatar, { backgroundColor: `${COLORS.accentBlue}15` }]}>
            <MaterialIcons name="person" size={20} color={COLORS.accentBlue} />
          </View>
          <View>
            <Text style={[styles.headerTitle, textPrimary, { textAlign: "left" }]}>{activeChat.name}</Text>
            <Text style={[styles.statusText, textSecondary]}>{activeChat.bloodGroup} • {activeChat.role}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerIconButton} onPress={() => setCurrentView("PROFILE")}>
          <MaterialIcons name="info-outline" size={24} color={COLORS.accentBlue} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        <Text style={[styles.dateDivider, textSecondary]}>Conversation Started</Text>
        {activeChat.messages.map((msg) => {
          const isMe = msg.sender === "me";
          return (
            <View key={msg.id} style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperOther]}>
              <View style={[styles.bubble, isMe ? [styles.bubbleMe, { backgroundColor: COLORS.primary }] : [styles.bubbleOther, { backgroundColor: surface }]]}>
                <Text style={[styles.messageText, isMe ? styles.textLightPrimary : textPrimary]}>{msg.text}</Text>
                <Text style={[styles.timeText, isMe ? styles.timeTextMe : textSecondary]}>{msg.time}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={[styles.inputContainer, { backgroundColor: surface, borderTopColor: isDarkMode ? "#2A2A2A" : "#E5E7EB" }]}>
        <TouchableOpacity style={styles.attachButton}>
          <MaterialIcons name="add-location-alt" size={24} color={textSecondary.color} />
        </TouchableOpacity>
        <TextInput
          style={[styles.textInput, { backgroundColor: inputBg, color: textPrimary.color }]}
          placeholder="Type a message..."
          placeholderTextColor={textSecondary.color}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: inputText.trim() ? COLORS.primary : COLORS.gray200 }]}
          activeOpacity={0.8}
          onPress={handleSendMessage}
          disabled={!inputText.trim()}
        >
          <MaterialIcons name="send" size={18} color={inputText.trim() ? "#FFF" : textSecondary.color} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  // ==========================================
  // RENDER: CONTACT PROFILE DETAILS
  // ==========================================
  const renderContactProfile = () => {
    const profileRows = [
      { label: "Blood Type", value: activeChat.bloodGroup },
      { label: "Phone", value: activeChat.phone },
      { label: "City", value: activeChat.city },
      { label: "Distance", value: activeChat.distance },
      { label: "Last Donated", value: activeChat.lastDonated },
    ];

    return (
      <View style={{ flex: 1 }}>
        <View style={[styles.header, { backgroundColor: bgStyle.backgroundColor }]}>
          <TouchableOpacity style={styles.headerIconButton} onPress={() => setCurrentView("CHAT")}>
            <MaterialIcons name="arrow-back" size={24} color={textPrimary.color} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, textPrimary]}>Contact Info</Text>
          <View style={styles.headerIconButton} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <View style={[styles.profileTopCard, { backgroundColor: surface }]}>
              <ImageBackground
                source={{ uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuDD2BIK8-bI5jsYCuJA-ANyEqWlTru_YksHwmF6zRIwfJj6rEJgflj3mYoQ0lGHkq4xVhyFu_Yiq6p1PChdgwCBC21j67j3rSnJthtGwYjdHc8xuhAJUqTrGpW4OyiJxU_5HpVit4pfMz4PE0lzK9mwFbXEJmyGllUOEB-MQoUWvri3qTtndXuYYIDU1mKqADCkQe_uH6NGLRPHojeJpCE-9axwrjSFk56qaJFQK0r6R3mFH7MgeBXmlFK-TGbnGbWDaSraEzNiRw" }} // Placeholder
                style={styles.profileHeroImage}
                imageStyle={{ borderRadius: 9999, backgroundColor: COLORS.gray200 }}
              />
              <Text style={[styles.profileName, textPrimary]}>{activeChat.name}</Text>
              <Text style={[styles.profileRole, textSecondary]}>Role: {activeChat.role}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={[styles.card, { backgroundColor: surface, paddingVertical: 6 }]}>
              {profileRows.map((item, index) => (
                <View key={index} style={[styles.infoRow, index !== profileRows.length - 1 && styles.infoRowBorder, { borderBottomColor: isDarkMode ? "#2A2A2A" : COLORS.gray200 }]}>
                  <Text style={[styles.infoLabel, textSecondary]}>{item.label}</Text>
                  <Text style={[styles.infoValue, textPrimary]}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <TouchableOpacity style={styles.primaryButton} activeOpacity={0.8}>
              <MaterialIcons name="call" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Call {activeChat.name}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.logoutButton, { backgroundColor: isDarkMode ? "#2A1618" : "#FEE2E2", borderColor: isDarkMode ? "#7F1D1D" : "#FECACA" }]} activeOpacity={0.8}>
              <MaterialIcons name="report-problem" size={20} color={COLORS.accentBlue} />
              <Text style={styles.logoutButtonText}>Report User</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  // MAIN RENDERER
  return (
    <SafeAreaView style={[styles.safeArea, bgStyle]}>
      {currentView === "LIST" && renderChatList()}
      {currentView === "CHAT" && renderActiveChat()}
      {currentView === "PROFILE" && renderContactProfile()}
    </SafeAreaView>
  );
};

// ==========================================
// STYLES (Blended from History & Profile)
// ==========================================
const styles = StyleSheet.create({
  safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? 30 : 0 },
  lightContainer: { backgroundColor: COLORS.backgroundLight },
  darkContainer: { backgroundColor: COLORS.backgroundDark },
  
  // Shared Layout
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  headerIconButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", textAlign: "center", flex: 1 },
  section: { padding: 16 },
  card: { borderRadius: 12, padding: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, gap: 8, marginBottom: 14 },
  
  // List View Specific
  searchContainer: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, borderRadius: 10, height: 44, marginBottom: 16 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15 },
  avatarWrap: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 17, fontWeight: "700" },
  bodyText: { fontSize: 14, lineHeight: 20, flex: 1, paddingRight: 10 },
  dateText: { fontSize: 12, fontWeight: "500" },
  unreadBadge: { backgroundColor: COLORS.primary, width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  unreadText: { color: "#FFF", fontSize: 10, fontWeight: "700" },
  
  // Active Chat Specific
  headerProfile: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, marginLeft: 8 },
  chatHeaderAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  statusText: { fontSize: 12, fontWeight: "500", marginTop: 2 },
  dateDivider: { textAlign: "center", fontSize: 12, fontWeight: "600", marginVertical: 16 },
  messageWrapper: { flexDirection: "row", marginBottom: 16 },
  messageWrapperMe: { justifyContent: "flex-end" },
  messageWrapperOther: { justifyContent: "flex-start" },
  bubble: { maxWidth: "80%", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16 },
  bubbleMe: { borderBottomRightRadius: 4 },
  bubbleOther: { borderBottomLeftRadius: 4 },
  messageText: { fontSize: 15, lineHeight: 22 },
  timeText: { fontSize: 10, marginTop: 4, alignSelf: "flex-end" },
  timeTextMe: { color: "rgba(255, 255, 255, 0.7)" },
  inputContainer: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, gap: 12 },
  attachButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  textInput: { flex: 1, minHeight: 40, maxHeight: 100, borderRadius: 20, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, fontSize: 15 },
  sendButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  
  // Profile View Specific
  profileTopCard: { borderRadius: 16, padding: 20, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4 },
  profileHeroImage: { width: 96, height: 96, marginBottom: 12 },
  profileName: { fontSize: 22, fontWeight: "700" },
  profileRole: { fontSize: 14, marginTop: 4 },
  infoRow: { paddingVertical: 14 },
  infoRowBorder: { borderBottomWidth: 1 },
  infoLabel: { fontSize: 13, marginBottom: 4 },
  infoValue: { fontSize: 16, fontWeight: "600" },
  primaryButton: { height: 48, borderRadius: 10, backgroundColor: COLORS.accentBlue, justifyContent: "center", alignItems: "center", flexDirection: "row", gap: 6, marginBottom: 12 },
  primaryButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  logoutButton: { height: 48, borderRadius: 10, justifyContent: "center", alignItems: "center", flexDirection: "row", gap: 8, borderWidth: 1 },
  logoutButtonText: { color: COLORS.accentBlue, fontSize: 15, fontWeight: "700" },

  // Bottom Navigation
  bottomNav: { paddingBottom: 10, position: "absolute", bottom: 0, left: 0, right: 0, height: 80, flexDirection: "row", justifyContent: "space-around", alignItems: "center", borderTopWidth: 1 },
  navItem: { alignItems: "center", justifyContent: "center" },
  navLabel: { fontSize: 12, fontWeight: "500", marginTop: 2 },

  // Theme Text Colors
  textPrimaryLight: { color: COLORS.textLightPrimary },
  textSecondaryLight: { color: COLORS.textLightSecondary },
  textPrimaryDark: { color: COLORS.textDarkPrimary },
  textSecondaryDark: { color: COLORS.textDarkSecondary },
});

export default ChatScreen;