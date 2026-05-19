import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../context";
import {
  deleteCachedRoom,
  getCachedMessages,
  getCachedRooms,
  supabase,
  upsertCachedMessage,
  upsertCachedMessages,
  upsertCachedRoom
} from "../lib";

// ─── Constants ────────────────────────────────────────────────────────────────

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
  accentGreen:        "#34C759",
  gray200:            "#E5E7EB",
};

// How many ms of silence before we broadcast "stopped typing"
const TYPING_DEBOUNCE_MS = 1500;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatMsgTime = (isoString) => {
  if (!isoString) return "";
  const d    = new Date(isoString);
  const now  = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1)       return "Just now";
  if (mins < 60)      return `${mins}m ago`;
  if (diff < 86400000)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff < 172800000) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "2-digit" });
};

// ─── Component ────────────────────────────────────────────────────────────────

const ChatScreen = ({ setActiveTab }) => {
  const { isDarkMode } = useTheme();

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [currentUserId, setCurrentUserId] = useState(null);

  // ── Views ─────────────────────────────────────────────────────────────────
  const [currentView, setCurrentView] = useState("LIST"); // LIST | CHAT | PROFILE

  // ── Chat list ─────────────────────────────────────────────────────────────
  const [rooms, setRooms]             = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // ── Active chat ───────────────────────────────────────────────────────────
  const [activeRoom, setActiveRoom]   = useState(null);
  const [messages, setMessages]       = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [inputText, setInputText]     = useState("");
  const [sending, setSending]         = useState(false);
  const scrollRef                     = useRef(null);

  // ── Realtime refs ─────────────────────────────────────────────────────────
  // One channel per open room  (postgres_changes + presence + broadcast)
  const channelRef = useRef(null);

  // ── Presence / typing ─────────────────────────────────────────────────────
  // Map of userId -> { online: bool, typing: bool, name: string }
  const [presenceMap, setPresenceMap]       = useState({});
  const typingDebounceRef                   = useRef(null);
  const [otherIsTyping, setOtherIsTyping]   = useState(false);

  // ── Add-user modal ─────────────────────────────────────────────────────────
  const [showAddModal, setShowAddModal]     = useState(false);
  const [userSearchQ, setUserSearchQ]       = useState("");
  const [userResults, setUserResults]       = useState([]);
  const [userSearching, setUserSearching]   = useState(false);
  const [addingUserId, setAddingUserId]     = useState(null); // userId being added

  // ── Delete chat ───────────────────────────────────────────────────────────
  const [roomToDelete, setRoomToDelete]     = useState(null); // room pending delete confirmation
  const [deleting, setDeleting]             = useState(false);

  // ── Theme ─────────────────────────────────────────────────────────────────
  const bgStyle       = isDarkMode ? styles.darkContainer     : styles.lightContainer;
  const textPrimary   = isDarkMode ? styles.textPrimaryDark   : styles.textPrimaryLight;
  const textSecondary = isDarkMode ? styles.textSecondaryDark : styles.textSecondaryLight;
  const surface       = isDarkMode ? COLORS.surfaceDark       : COLORS.surfaceLight;
  const inputBg       = isDarkMode ? "#2A2A2A"                : "#FFFFFF";

  // ── Load session ──────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setCurrentUserId(session.user.id);
    });
  }, []);

  // ── Fetch room list on focus ───────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      if (!currentUserId) return;
      fetchRooms();
    }, [currentUserId])
  );

  const fetchRooms = async () => {
    setListLoading(true);

    // ── 1. Load cache instantly so UI is never blank ──────────────────────────
    const cached = await getCachedRooms(currentUserId);
    if (cached.length > 0) {
      setRooms(cached);
      setListLoading(false); // show cached immediately; keep syncing in background
    }

    // ── 2. Sync from Supabase ─────────────────────────────────────────────────
    try {
      const { data: memberships, error: memErr } = await supabase
        .from("room_members")
        .select("room_id")
        .eq("user_id", currentUserId);

      if (memErr || !memberships?.length) {
        if (!cached.length) setRooms([]);
        return;
      }

      const roomIds = memberships.map((m) => m.room_id);

      // Get the other member's user_id per room.
      // NOTE: room_members.user_id FK points to auth.users, not public.users,
      // so PostgREST implicit joins (users(...)) always return null. We fetch
      // the user_ids first, then look up public.users directly.
      const { data: otherMembers } = await supabase
        .from("room_members")
        .select("room_id, user_id")
        .in("room_id", roomIds)
        .neq("user_id", currentUserId);

      const otherUserIds = [...new Set((otherMembers ?? []).map((r) => r.user_id))];

      const { data: userProfiles } = otherUserIds.length
        ? await supabase
            .from("users")
            .select("id, full_name, blood_type, phone_number")
            .in("id", otherUserIds)
        : { data: [] };

      const userProfileMap = {};
      (userProfiles ?? []).forEach((u) => { userProfileMap[u.id] = u; });

      const profileMap = {};
      (otherMembers ?? []).forEach((row) => {
        profileMap[row.room_id] = userProfileMap[row.user_id] ?? null;
      });

      const roomsData = await Promise.all(
        roomIds.map(async (roomId) => {
          // Prefer the freshly-fetched profile; fall back to whatever is already
          // in local state so a null join result never wipes a known name.
          const existingProfile =
            rooms.find((r) => r.roomId === roomId)?.otherProfile ?? null;
          const otherProfile = profileMap[roomId] ?? existingProfile;

          const { data: lastMsgArr } = await supabase
            .from("messages")
            .select("id, content, sender_id, created_at")
            .eq("room_id", roomId)
            .order("created_at", { ascending: false })
            .limit(1);

          const lastMsg = lastMsgArr?.[0] ?? null;

          const { count: unread } = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("room_id", roomId)
            .neq("sender_id", currentUserId);

          const room = { roomId, otherProfile, lastMsg, unread: unread ?? 0 };

          // Persist to local cache
          await upsertCachedRoom(currentUserId, room);

          return room;
        })
      );

      roomsData.sort((a, b) => {
        const ta = a.lastMsg?.created_at ?? "";
        const tb = b.lastMsg?.created_at ?? "";
        return tb.localeCompare(ta);
      });

      setRooms(roomsData);

      // If a chat is currently open, keep activeRoom in sync so the header
      // name doesn't revert when the list re-fetches.
      setActiveRoom((prev) => {
        if (!prev) return prev;
        const updated = roomsData.find((r) => r.roomId === prev.roomId);
        return updated ?? prev;
      });
    } finally {
      setListLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // REALTIME — open a room with Postgres Changes + Presence + Broadcast
  // ═══════════════════════════════════════════════════════════════════════════

  const openChat = async (room) => {
    setActiveRoom(room);
    setCurrentView("CHAT");
    setChatLoading(true);
    setMessages([]);
    setOtherIsTyping(false);
    setPresenceMap({});

    // Show cached messages immediately while fetching fresh ones
    const localMsgs = await getCachedMessages(room.roomId);
    if (localMsgs.length > 0) setMessages(localMsgs);

    try {
      // 1. Fetch history
      const { data, error } = await supabase
        .from("messages")
        .select("id, content, sender_id, created_at")
        .eq("room_id", room.roomId)
        .order("created_at", { ascending: true });

      if (error) {
        // Fall back to local cache on network error
        const localMsgs = await getCachedMessages(room.roomId);
        setMessages(localMsgs);
        console.error("fetchMessages:", error.message);
        return;
      }
      // Persist to local cache
      if (data?.length) await upsertCachedMessages(data);
      setMessages(data ?? []);

      // 2. Remove any previous channel
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      // 3. Create a single channel that combines all three features
      const ch = supabase.channel(`room:${room.roomId}`, {
        config: {
          presence: { key: currentUserId },   // use userId as presence key
          broadcast: { self: false },          // don't echo our own broadcasts
        },
      });

      // ── 3a. Postgres Changes — stream new messages ────────────────────────
      ch.on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  "messages",
          filter: `room_id=eq.${room.roomId}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.find((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          // Persist incoming message to local cache
          upsertCachedMessage(payload.new);
          // Also refresh the list-level last message
          setRooms((prev) =>
            prev.map((r) =>
              r.roomId === room.roomId
                ? { ...r, lastMsg: payload.new, unread: 0 }
                : r
            )
          );
        }
      );

      // ── 3b. Presence — online dots ────────────────────────────────────────
      ch.on("presence", { event: "sync" }, () => {
        const state = ch.presenceState();
        const map   = {};
        Object.entries(state).forEach(([key, presences]) => {
          // Each presence entry is an array; take the latest
          const latest = presences[presences.length - 1];
          map[key] = latest;
        });
        setPresenceMap(map);
      });

      ch.on("presence", { event: "leave" }, ({ leftPresences }) => {
        leftPresences.forEach((p) => {
          if (p.userId !== currentUserId) setOtherIsTyping(false);
        });
      });

      // ── 3c. Broadcast — typing indicator ─────────────────────────────────
      ch.on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.userId !== currentUserId) {
          setOtherIsTyping(payload.isTyping);
        }
      });

      // 4. Subscribe & track own presence
      ch.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await ch.track({
            userId:   currentUserId,
            name:     "me",
            online_at: new Date().toISOString(),
          });
        }
      });

      channelRef.current = ch;

      // Mark room unread as 0 locally
      setRooms((prev) =>
        prev.map((r) => (r.roomId === room.roomId ? { ...r, unread: 0 } : r))
      );
    } finally {
      setChatLoading(false);
    }
  };

  // Cleanup subscription when leaving chat
  const closeChat = async () => {
    // Broadcast "stopped typing" before leaving
    if (channelRef.current) {
      await channelRef.current.send({
        type:    "broadcast",
        event:   "typing",
        payload: { userId: currentUserId, isTyping: false },
      });
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    setOtherIsTyping(false);
    setPresenceMap({});
    setCurrentView("LIST");
    fetchRooms();
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  // Scroll when typing indicator appears
  useEffect(() => {
    if (otherIsTyping) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [otherIsTyping]);

  // ── Typing indicator broadcast ────────────────────────────────────────────
  const broadcastTyping = async (text) => {
    if (!channelRef.current) return;

    // Send "is typing" immediately
    await channelRef.current.send({
      type:    "broadcast",
      event:   "typing",
      payload: { userId: currentUserId, isTyping: true },
    });

    // Debounce "stopped typing"
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    typingDebounceRef.current = setTimeout(async () => {
      if (channelRef.current) {
        await channelRef.current.send({
          type:    "broadcast",
          event:   "typing",
          payload: { userId: currentUserId, isTyping: false },
        });
      }
    }, TYPING_DEBOUNCE_MS);
  };

  const handleInputChange = (text) => {
    setInputText(text);
    if (text.length > 0) broadcastTyping(text);
  };

  // ── Send a message ────────────────────────────────────────────────────────
  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeRoom || sending) return;

    const text = inputText.trim();
    setInputText("");
    setSending(true);

    // Stop typing broadcast immediately
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    if (channelRef.current) {
      channelRef.current.send({
        type:    "broadcast",
        event:   "typing",
        payload: { userId: currentUserId, isTyping: false },
      });
    }

    // Optimistic insert
    const optimisticId  = `optimistic-${Date.now()}`;
    const optimisticMsg = {
      id:         optimisticId,
      content:    text,
      sender_id:  currentUserId,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          room_id:   activeRoom.roomId,
          sender_id: currentUserId,
          content:   text,
        })
        .select("id, content, sender_id, created_at")
        .single();

      if (error) {
        console.error("sendMessage:", error.message);
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        return;
      }

      // Replace optimistic with real row
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? data : m))
      );
      // Persist sent message + update room cache
      await upsertCachedMessage(data);
      await upsertCachedRoom(currentUserId, {
        ...activeRoom,
        lastMsg: data,
      });
    } finally {
      setSending(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ADD USER — search + create room
  // ═══════════════════════════════════════════════════════════════════════════

  const searchUsers = async (q) => {
    setUserSearchQ(q);
    if (!q.trim()) { setUserResults([]); return; }
    setUserSearching(true);
    try {
      // Build OR filter — always search name + phone_number; add id only for UUID-shaped input
      const isUUID = /^[0-9a-f-]{36}$/i.test(q.trim());
      const orFilter = [
        `full_name.ilike.%${q}%`,
        `phone_number.ilike.%${q}%`,
        ...(isUUID ? [`id.eq.${q.trim()}`] : []),
      ].join(",");

      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, blood_type, phone_number")
        .neq("id", currentUserId)
        .or(orFilter)
        .limit(15);

      if (error) console.error("searchUsers:", error.message);
      setUserResults(data ?? []);
    } finally {
      setUserSearching(false);
    }
  };

  // Find or create a 1-1 room between currentUserId and targetUserId
  const startChatWith = async (targetUser) => {
    setAddingUserId(targetUser.id);
    try {
      // Look for an existing room shared by both users.
      // We query from the target's memberships so we find the room even if
      // the current user previously deleted (left) it.
      const { data: myRooms } = await supabase
        .from("room_members")
        .select("room_id")
        .eq("user_id", currentUserId);

      const myRoomIds = (myRooms ?? []).map((r) => r.room_id);

      // Also check rooms the target is in — covers the case where current user
      // removed themselves (so myRoomIds won't contain the shared room).
      const { data: targetRooms } = await supabase
        .from("room_members")
        .select("room_id")
        .eq("user_id", targetUser.id);

      const targetRoomIds = (targetRooms ?? []).map((r) => r.room_id);

      // A shared room is one the target is in; current user may or may not still be a member.
      const sharedRoomId = targetRoomIds.find((id) => myRoomIds.includes(id))
        ?? targetRoomIds[0] // fallback: any room of the target (e.g. current user left)
        ?? null;

      // Narrow down: if we found a candidate via fallback, verify it's truly a
      // direct room between just these two users (not a group room with others).
      let existingRoomId = null;
      if (sharedRoomId) {
        // Check if current user is already a member of this room
        const alreadyMember = myRoomIds.includes(sharedRoomId);
        if (!alreadyMember) {
          // Re-add the current user to the existing room
          const { error: rejoinErr } = await supabase
            .from("room_members")
            .insert({ room_id: sharedRoomId, user_id: currentUserId });
          if (rejoinErr) console.error("rejoin room_members error:", JSON.stringify(rejoinErr));
        }
        existingRoomId = sharedRoomId;
      }

      let roomId = existingRoomId;

      if (!roomId) {
        // Create new room
        const { data: newRoom, error: roomErr } = await supabase
          .from("chat_rooms")
          .insert({ type: "direct" })
          .select("id")
          .single();

        if (roomErr) {
          console.error("createRoom error:", JSON.stringify(roomErr));
          return;
        }
        roomId = newRoom.id;

        // Add both members — requires INSERT policy on room_members
        const { error: membersErr } = await supabase.from("room_members").insert([
          { room_id: roomId, user_id: currentUserId },
          { room_id: roomId, user_id: targetUser.id },
        ]);
        if (membersErr) {
          console.error("room_members insert error:", JSON.stringify(membersErr));
          return;
        }
      }

      // Close modal and open the chat
      setShowAddModal(false);
      setUserSearchQ("");
      setUserResults([]);

      const room = {
        roomId:       roomId,
        otherProfile: targetUser,
        lastMsg:      null,
        unread:       0,
      };

      // Add to local rooms list if not already there
      setRooms((prev) => {
        if (prev.find((r) => r.roomId === roomId)) return prev;
        return [room, ...prev];
      });

      openChat(room);
    } finally {
      setAddingUserId(null);
    }
  };

  // ── Delete a room (removes only current user's membership from the list) ────
  const deleteRoom = async () => {
    if (!roomToDelete || deleting) return;
    setDeleting(true);
    try {
      // Only remove the current user's membership — preserves messages and the
      // other user's chat history entirely.
      await supabase
        .from("room_members")
        .delete()
        .eq("room_id", roomToDelete.roomId)
        .eq("user_id", currentUserId);

      // Remove from local cache
      await deleteCachedRoom(currentUserId, roomToDelete.roomId);

      // Remove from local state immediately
      setRooms((prev) => prev.filter((r) => r.roomId !== roomToDelete.roomId));
    } finally {
      setDeleting(false);
      setRoomToDelete(null);
    }
  };

  // ─── Filtered rooms for search ────────────────────────────────────────────
  const filteredRooms = rooms.filter((r) => {
    const name = r.otherProfile?.full_name ?? "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Helper: is the other user online?
  const otherIsOnline = (room) => {
    const otherId = room?.otherProfile?.id;
    return otherId ? !!presenceMap[otherId] : false;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: ADD USER MODAL
  // ═══════════════════════════════════════════════════════════════════════════
  const renderAddUserModal = () => (
    <Modal
      visible={showAddModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowAddModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: isDarkMode ? COLORS.surfaceDark : COLORS.backgroundLight }]}>
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, textPrimary]}>New Message</Text>
            <TouchableOpacity onPress={() => { setShowAddModal(false); setUserSearchQ(""); setUserResults([]); }}>
              <MaterialIcons name="close" size={24} color={textPrimary.color} />
            </TouchableOpacity>
          </View>

          {/* Search input */}
          <View style={[styles.searchContainer, { backgroundColor: surface, marginHorizontal: 16, marginBottom: 8 }]}>
            <MaterialIcons name="search" size={20} color={textSecondary.color} />
            <TextInput
              style={[styles.searchInput, { color: textPrimary.color }]}
              placeholder="Search by name, phone, or user ID…"
              placeholderTextColor={textSecondary.color}
              value={userSearchQ}
              onChangeText={searchUsers}
              autoFocus
            />
            {userSearching && <ActivityIndicator size="small" color={COLORS.accentBlue} />}
          </View>

          {/* Results */}
          <ScrollView style={styles.modalResults} keyboardShouldPersistTaps="handled">
            {userResults.length === 0 && userSearchQ.length > 0 && !userSearching && (
              <View style={styles.centeredState}>
                <MaterialIcons name="person-search" size={40} color={textSecondary.color} />
                <Text style={[styles.emptyTitle, textSecondary]}>No users found</Text>
              </View>
            )}
            {userResults.map((user) => (
              <TouchableOpacity
                key={user.id}
                style={[styles.userResultRow, { backgroundColor: surface }]}
                activeOpacity={0.7}
                onPress={() => startChatWith(user)}
                disabled={addingUserId === user.id}
              >
                <View style={[styles.avatarWrap, { backgroundColor: `${COLORS.accentBlue}18` }]}>
                  <Text style={{ color: COLORS.accentBlue, fontWeight: "700", fontSize: 15 }}>
                    {user.blood_type ?? "?"}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.cardTitle, textPrimary, { fontSize: 15 }]}>
                    {user.full_name ?? "Unknown"}
                  </Text>
                  <Text style={[textSecondary, { fontSize: 12, marginTop: 2 }]}>
                    {`+92 ${user.phone_number}` || "No details"}
                  </Text>
                </View>
                {addingUserId === user.id ? (
                  <ActivityIndicator size="small" color={COLORS.accentBlue} />
                ) : (
                  <MaterialIcons name="chat-bubble-outline" size={20} color={COLORS.accentBlue} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: CHAT LIST
  // ═══════════════════════════════════════════════════════════════════════════
  const renderChatList = () => (
    <View style={{ flex: 1 }}>
      <View style={[styles.header, { backgroundColor: bgStyle.backgroundColor }]}>
        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={() => setActiveTab?.("dashboard")}
        >
          <MaterialIcons name="arrow-back" size={24} color={textPrimary.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, textPrimary]}>Messages</Text>
        <View style={styles.headerIconButton} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          {/* Search */}
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

          {/* Loading */}
          {listLoading ? (
            <View style={styles.centeredState}>
              <ActivityIndicator size="large" color={COLORS.accentBlue} />
            </View>

          /* Empty */
          ) : filteredRooms.length === 0 ? (
            <View style={styles.centeredState}>
              <MaterialIcons
                name="chat-bubble-outline"
                size={44}
                color={isDarkMode ? COLORS.textDarkSecondary : COLORS.textLightSecondary}
              />
              <Text style={[styles.emptyTitle, textSecondary]}>No conversations yet</Text>
              <Text style={[textSecondary, { fontSize: 13, marginTop: 4 }]}>
                Tap the + button to start one
              </Text>
            </View>

          /* List */
          ) : (
            filteredRooms.map((room) => {
              const name    = room.otherProfile?.full_name ?? "Unknown User";
              const blood   = room.otherProfile?.blood_type ?? "?";
              const lastMsg = room.lastMsg;
              const isMe    = lastMsg?.sender_id === currentUserId;
              const online  = otherIsOnline(room);

              return (
                <TouchableOpacity
                  key={room.roomId}
                  style={[
                    styles.card,
                    { backgroundColor: surface, flexDirection: "row", alignItems: "center" },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => openChat(room)}
                  onLongPress={() => setRoomToDelete(room)}
                >
                  {/* Avatar + online dot */}
                  <View>
                    <View style={[styles.avatarWrap, { backgroundColor: `${COLORS.accentBlue}15` }]}>
                      <Text style={{ color: COLORS.accentBlue, fontWeight: "700" }}>{blood}</Text>
                    </View>
                    {online && <View style={styles.onlineDot} />}
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={[styles.cardTitle, textPrimary]}>{name}</Text>
                      <Text style={[styles.dateText, textSecondary, { marginTop: 0 }]}>
                        {lastMsg ? formatMsgTime(lastMsg.created_at) : ""}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                      <Text
                        style={[styles.bodyText, textSecondary, { marginTop: 0 }]}
                        numberOfLines={1}
                      >
                        {lastMsg
                          ? `${isMe ? "You: " : ""}${lastMsg.content}`
                          : "No messages yet"}
                      </Text>
                      {room.unread > 0 && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadText}>{room.unread}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Delete button — shown on long press */}
                  {roomToDelete?.roomId === room.roomId && (
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => setRoomToDelete(room)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="delete-outline" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => setShowAddModal(true)}
      >
        <MaterialIcons name="edit" size={24} color="#FFF" />
      </TouchableOpacity>

      {renderAddUserModal()}

      {/* ── Delete confirmation modal ── */}
      <Modal
        visible={!!roomToDelete}
        transparent
        animationType="fade"
        onRequestClose={() => setRoomToDelete(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.deleteModal, { backgroundColor: isDarkMode ? COLORS.surfaceDark : COLORS.backgroundLight }]}>
            <MaterialIcons name="delete-forever" size={36} color={COLORS.primary} style={{ marginBottom: 12 }} />
            <Text style={[{ fontSize: 17, fontWeight: "700", marginBottom: 6 }, textPrimary]}>
              Delete conversation?
            </Text>
            <Text style={[{ fontSize: 14, textAlign: "center", marginBottom: 24, lineHeight: 20 }, textSecondary]}>
              This will remove the conversation with{" "}
              <Text style={{ fontWeight: "700" }}>
                {roomToDelete?.otherProfile?.full_name ?? "this user"}
              </Text>
              {" "}from your list. Messages are not deleted and the chat can be restored by searching for this person again.
            </Text>
            <View style={{ flexDirection: "row", gap: 12, width: "100%" }}>
              <TouchableOpacity
                style={[styles.deleteModalBtn, { backgroundColor: isDarkMode ? "#2A2A2A" : COLORS.gray200, flex: 1 }]}
                onPress={() => setRoomToDelete(null)}
                disabled={deleting}
              >
                <Text style={[{ fontWeight: "600", fontSize: 15 }, textPrimary]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalBtn, { backgroundColor: COLORS.primary, flex: 1 }]}
                onPress={deleteRoom}
                disabled={deleting}
              >
                {deleting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={{ fontWeight: "700", fontSize: 15, color: "#fff" }}>Delete</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: ACTIVE CHAT
  // ═══════════════════════════════════════════════════════════════════════════
  const renderActiveChat = () => {
    const name   = activeRoom?.otherProfile?.full_name ?? "Unknown";
    const blood  = activeRoom?.otherProfile?.blood_type ?? "?";
    const online = otherIsOnline(activeRoom);

    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 34}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: bgStyle.backgroundColor,
              borderBottomWidth: 1,
              borderBottomColor: isDarkMode ? "#2A2A2A" : "#E5E7EB",
            },
          ]}
        >
          <TouchableOpacity style={styles.headerIconButton} onPress={closeChat}>
            <MaterialIcons name="arrow-back" size={24} color={textPrimary.color} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerProfile}
            onPress={() => setCurrentView("PROFILE")}
            activeOpacity={0.7}
          >
            {/* Avatar + online dot */}
            <View>
              <View style={[styles.chatHeaderAvatar, { backgroundColor: `${COLORS.accentBlue}15` }]}>
                <MaterialIcons name="person" size={20} color={COLORS.accentBlue} />
              </View>
              {online && <View style={[styles.onlineDot, { width: 10, height: 10, borderRadius: 5, bottom: 0, right: 0 }]} />}
            </View>
            <View>
              <Text style={[styles.headerTitle, textPrimary, { textAlign: "left" }]}>{name}</Text>
              <Text style={[styles.statusText, online ? styles.onlineText : textSecondary]}>
                {otherIsTyping ? "typing…" : online ? "Online" : blood}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => setCurrentView("PROFILE")}
          >
            <MaterialIcons name="info-outline" size={24} color={COLORS.accentBlue} />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        {chatLoading ? (
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color={COLORS.accentBlue} />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 ? (
              <Text style={[styles.dateDivider, textSecondary]}>
                Say hello to start the conversation!
              </Text>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender_id === currentUserId;
                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.messageWrapper,
                      isMe ? styles.messageWrapperMe : styles.messageWrapperOther,
                    ]}
                  >
                    <View
                      style={[
                        styles.bubble,
                        isMe
                          ? [styles.bubbleMe,    { backgroundColor: COLORS.primary }]
                          : [styles.bubbleOther, { backgroundColor: surface }],
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          isMe ? styles.textLightPrimary : textPrimary,
                        ]}
                      >
                        {msg.content}
                      </Text>
                      <Text
                        style={[
                          styles.timeText,
                          isMe ? styles.timeTextMe : textSecondary,
                        ]}
                      >
                        {formatMsgTime(msg.created_at)}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}

            {/* Typing indicator bubble */}
            {otherIsTyping && (
              <View style={[styles.messageWrapper, styles.messageWrapperOther]}>
                <View style={[styles.bubble, styles.bubbleOther, { backgroundColor: surface, paddingVertical: 12 }]}>
                  <View style={styles.typingDots}>
                    <View style={[styles.dot, { backgroundColor: textSecondary.color }]} />
                    <View style={[styles.dot, { backgroundColor: textSecondary.color, marginHorizontal: 3 }]} />
                    <View style={[styles.dot, { backgroundColor: textSecondary.color }]} />
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        )}

        {/* Input */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: surface,
              borderTopColor: isDarkMode ? "#2A2A2A" : "#E5E7EB",
            },
          ]}
        >
          <TextInput
            style={[styles.textInput, { backgroundColor: inputBg, color: textPrimary.color }]}
            placeholder="Type a message..."
            placeholderTextColor={textSecondary.color}
            value={inputText}
            onChangeText={handleInputChange}
            multiline
            onSubmitEditing={handleSendMessage}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: inputText.trim() && !sending ? COLORS.primary : COLORS.gray200 },
            ]}
            activeOpacity={0.8}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialIcons
                name="send"
                size={18}
                color={inputText.trim() ? "#FFF" : "#9CA3AF"}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: CONTACT PROFILE
  // ═══════════════════════════════════════════════════════════════════════════
  const renderContactProfile = () => {
    const p = activeRoom?.otherProfile;
    const profileRows = [
      { label: "Blood Type", value: p?.blood_type ?? "N/A" },
      { label: "Phone",      value: p?.phone_number ?? "N/A" },
      { label: "Address",    value: p?.address     ?? "N/A" },
    ];

    return (
      <View style={{ flex: 1 }}>
        <View style={[styles.header, { backgroundColor: bgStyle.backgroundColor }]}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => setCurrentView("CHAT")}
          >
            <MaterialIcons name="arrow-back" size={24} color={textPrimary.color} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, textPrimary]}>Contact Info</Text>
          <View style={styles.headerIconButton} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <View style={[styles.profileTopCard, { backgroundColor: surface }]}>
              <ImageBackground
                source={{ uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuDD2BIK8-bI5jsYCuJA-ANyEqWlTru_YksHwmF6zRIwfJj6rEJgflj3mYoQ0lGHkq4xVhyFu_Yiq6p1PChdgwCBC21j67j3rSnJthtGwYjdHc8xuhAJUqTrGpW4OyiJxU_5HpVit4pfMz4PE0lzK9mwFbXEJmyGllUOEB-MQoUWvri3qTtndXuYYIDU1mKqADCkQe_uH6NGLRPHojeJpCE-9axwrjSFk56qaJFQK0r6R3mFH7MgeBXmlFK-TGbnGbWDaSraEzNiRw" }}
                style={styles.profileHeroImage}
                imageStyle={{ borderRadius: 9999, backgroundColor: COLORS.gray200 }}
              />
              <Text style={[styles.profileName, textPrimary]}>
                {p?.full_name ?? "Unknown User"}
              </Text>
              <Text style={[styles.profileRole, textSecondary]}>
                {p?.blood_type ?? ""} • Blood Hive Member
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={[styles.card, { backgroundColor: surface, paddingVertical: 6 }]}>
              {profileRows.map((item, index) => (
                <View
                  key={index}
                  style={[
                    styles.infoRow,
                    index !== profileRows.length - 1 && styles.infoRowBorder,
                    { borderBottomColor: isDarkMode ? "#2A2A2A" : COLORS.gray200 },
                  ]}
                >
                  <Text style={[styles.infoLabel, textSecondary]}>{item.label}</Text>
                  <Text style={[styles.infoValue, textPrimary]}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <TouchableOpacity
              style={[
                styles.logoutButton,
                {
                  backgroundColor: isDarkMode ? "#2A1618" : "#FEE2E2",
                  borderColor:     isDarkMode ? "#7F1D1D" : "#FECACA",
                },
              ]}
              activeOpacity={0.8}
            >
              <MaterialIcons name="report-problem" size={20} color={COLORS.accentBlue} />
              <Text style={styles.logoutButtonText}>Report User</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ROOT
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <View style={[styles.safeArea, bgStyle]}>
      {currentView === "LIST"    && renderChatList()}
      {currentView === "CHAT"    && renderActiveChat()}
      {currentView === "PROFILE" && renderContactProfile()}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea:       { flex: 1 },
  lightContainer: { backgroundColor: COLORS.backgroundLight },
  darkContainer:  { backgroundColor: COLORS.backgroundDark  },

  header: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical:   12,
  },
  headerIconButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle:      { fontSize: 18, fontWeight: "700", textAlign: "center", flex: 1 },
  headerProfile:    { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, marginLeft: 8 },
  chatHeaderAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  statusText:       { fontSize: 12, fontWeight: "500", marginTop: 2 },
  onlineText:       { color: COLORS.accentGreen, fontSize: 12, fontWeight: "600", marginTop: 2 },

  // Online dot (sits in a `position: relative` parent)
  onlineDot: {
    position:    "absolute",
    bottom:      1,
    right:       1,
    width:       11,
    height:      11,
    borderRadius: 6,
    backgroundColor: COLORS.accentGreen,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  section: { padding: 16 },
  card: {
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    gap: 8,
    marginBottom: 14,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems:    "center",
    paddingHorizontal: 12,
    borderRadius:  10,
    height:        44,
    marginBottom:  16,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15 },

  avatarWrap:   { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  cardTitle:    { fontSize: 17, fontWeight: "700" },
  bodyText:     { fontSize: 14, lineHeight: 20, flex: 1, paddingRight: 10 },
  dateText:     { fontSize: 12, fontWeight: "500" },
  unreadBadge:  { backgroundColor: COLORS.primary, width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  unreadText:   { color: "#FFF", fontSize: 10, fontWeight: "700" },

  // FAB
  fab: {
    position:       "absolute",
    bottom:         28,
    right:          24,
    width:          56,
    height:         56,
    borderRadius:   28,
    backgroundColor: COLORS.primary,
    alignItems:     "center",
    justifyContent: "center",
    shadowColor:    "#000",
    shadowOpacity:  0.25,
    shadowRadius:   8,
    elevation:      6,
  },

  // Modal
  modalOverlay: {
    flex:            1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent:  "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
    paddingTop:     8,
    paddingBottom:  40,
    maxHeight:      "85%",
  },
  modalHeader: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical:   16,
  },
  modalTitle:   { fontSize: 18, fontWeight: "700" },
  modalResults: { paddingHorizontal: 16, paddingTop: 8 },

  userResultRow: {
    flexDirection:  "row",
    alignItems:     "center",
    borderRadius:   12,
    padding:        12,
    marginBottom:   10,
  },

  dateDivider:         { textAlign: "center", fontSize: 12, fontWeight: "600", marginVertical: 16 },
  messageWrapper:      { flexDirection: "row", marginBottom: 16 },
  messageWrapperMe:    { justifyContent: "flex-end" },
  messageWrapperOther: { justifyContent: "flex-start" },
  bubble:              { maxWidth: "80%", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16 },
  bubbleMe:            { borderBottomRightRadius: 4 },
  bubbleOther:         { borderBottomLeftRadius: 4 },
  messageText:         { fontSize: 15, lineHeight: 22 },
  timeText:            { fontSize: 10, marginTop: 4, alignSelf: "flex-end" },
  timeTextMe:          { color: "rgba(255,255,255,0.7)" },

  // Typing dots
  typingDots: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4 },
  dot:        { width: 7, height: 7, borderRadius: 4, opacity: 0.6 },

  inputContainer: {
    flexDirection:  "row",
    alignItems:     "flex-end",
    paddingHorizontal: 16,
    paddingVertical:   12,
    borderTopWidth: 1,
    gap: 12,
  },
  textInput: {
    flex:          1,
    minHeight:     40,
    maxHeight:     100,
    borderRadius:  20,
    paddingHorizontal: 16,
    paddingTop:    10,
    paddingBottom: 10,
    fontSize:      15,
  },
  sendButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },

  profileTopCard:   { borderRadius: 16, padding: 20, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4 },
  profileHeroImage: { width: 96, height: 96, marginBottom: 12 },
  profileName:      { fontSize: 22, fontWeight: "700" },
  profileRole:      { fontSize: 14, marginTop: 4 },
  infoRow:          { paddingVertical: 14 },
  infoRowBorder:    { borderBottomWidth: 1 },
  infoLabel:        { fontSize: 13, marginBottom: 4 },
  infoValue:        { fontSize: 16, fontWeight: "600" },

  primaryButton:     { height: 48, borderRadius: 10, backgroundColor: COLORS.accentBlue, justifyContent: "center", alignItems: "center", flexDirection: "row", gap: 6, marginBottom: 12 },
  primaryButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  logoutButton:      { height: 48, borderRadius: 10, justifyContent: "center", alignItems: "center", flexDirection: "row", gap: 8, borderWidth: 1 },
  logoutButtonText:  { color: COLORS.accentBlue, fontSize: 15, fontWeight: "700" },

  centeredState: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 8 },

  deleteBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    marginLeft: 8,
  },
  deleteModal: {
    margin: 32,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  deleteModalBtn: {
    height: 46, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  emptyTitle:    { fontSize: 15, fontWeight: "600", marginTop: 8 },

  textLightPrimary:   { color: "#FFFFFF" },
  textPrimaryLight:   { color: COLORS.textLightPrimary   },
  textSecondaryLight: { color: COLORS.textLightSecondary },
  textPrimaryDark:    { color: COLORS.textDarkPrimary    },
  textSecondaryDark:  { color: COLORS.textDarkSecondary  },
});

export default ChatScreen;