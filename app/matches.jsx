import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../context';
import { supabase } from '../lib/supabase';

// ─── Constants ────────────────────────────────────────────────────────────────
const RED  = '#C0392B';
const BLUE = '#3B82F6';

const COLORS = {
  backgroundLight:    '#F1F5F9',
  backgroundDark:     '#121212',
  surfaceLight:       '#FFFFFF',
  surfaceDark:        '#1E1E1E',
  cardLight:          '#FFFFFF',
  cardDark:           '#1E1E1E',
  textPrimaryLight:   '#1E293B',
  textPrimaryDark:    '#F2F2F7',
  textSecondaryLight: '#64748B',
  textSecondaryDark:  '#8E8E93',
  mutedLight:         '#94A3B8',
  mutedDark:          '#636366',
  callBtnLight:       '#F1F5F9',
  callBtnDark:        '#2C2C2E',
  emergencyBgLight:   '#EEF2FF',
  emergencyBgDark:    '#1C1C2E',
  dotLight:           '#CBD5E1',
  dotDark:            '#48484A',
  avatarBgLight:      '#E2E8F0',
  avatarBgDark:       '#2C2C2E',
  avatarTextLight:    '#64748B',
  avatarTextDark:     '#8E8E93',
  onlineDotBorderLight: '#FFFFFF',
  onlineDotBorderDark:  '#1E1E1E',
};

// ─── Avatar with Fallback ─────────────────────────────────────────────────────
function AvatarWithFallback({ uri, name = '', size = 56, isAvailable, isDarkMode }) {
  const [failed, setFailed] = useState(false);

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View style={{ width: size, height: size }}>
      {uri && !failed ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          onError={() => setFailed(true)}
          resizeMode="cover"
        />
      ) : (
        <View style={[
          styles.avatarFallback,
          {
            width: size, height: size, borderRadius: size / 2,
            backgroundColor: isDarkMode ? COLORS.avatarBgDark : COLORS.avatarBgLight,
          },
        ]}>
          <Text style={[styles.avatarInitials, {
            fontSize: size * 0.32,
            color: isDarkMode ? COLORS.avatarTextDark : COLORS.avatarTextLight,
          }]}>{initials}</Text>
        </View>
      )}
      {isAvailable !== undefined && (
        <View
          style={[
            styles.onlineDot,
            {
              backgroundColor: isAvailable ? '#22C55E' : (isDarkMode ? COLORS.dotDark : COLORS.dotLight),
              borderColor: isDarkMode ? COLORS.onlineDotBorderDark : COLORS.onlineDotBorderLight,
              width:  size * 0.22,
              height: size * 0.22,
              borderRadius: size * 0.11,
              bottom: 1,
              right:  1,
            },
          ]}
        />
      )}
    </View>
  );
}

// ─── Donor Card (shown to recipients) ────────────────────────────────────────
function DonorCard({ donor, requestBloodType, onMessage, isDarkMode }) {
  const isAvailable = donor.users?.is_available ?? false;

  const handleCall = () => {
    const phone = donor.users?.phone_number;
    if (phone) Linking.openURL(`tel:0${phone}`);
  };

  return (
    <View style={[
      styles.card,
      { backgroundColor: isDarkMode ? COLORS.cardDark : COLORS.cardLight },
      !isAvailable && styles.cardDimmed,
    ]}>
      <View style={styles.cardTop}>
        <AvatarWithFallback
          uri={donor.users?.profile_image_url}
          name={donor.users?.full_name ?? ''}
          isAvailable={isAvailable}
          isDarkMode={isDarkMode}
        />
        <View style={styles.cardInfo}>
          <Text style={[styles.personName, { color: isDarkMode ? COLORS.textPrimaryDark : COLORS.textPrimaryLight }]} numberOfLines={1}>
            {donor.users?.full_name ?? 'Unknown Donor'}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="shield-checkmark" size={13} color={BLUE} />
            <Text style={styles.verifiedText}>VERIFIED</Text>
            {donor.users?.city ? (
              <>
                <View style={[styles.dot, { backgroundColor: isDarkMode ? COLORS.dotDark : COLORS.dotLight }]} />
                <Ionicons name="location-outline" size={13} color={isDarkMode ? COLORS.textSecondaryDark : '#64748B'} />
                <Text style={[styles.distanceText, { color: isDarkMode ? COLORS.textSecondaryDark : '#64748B' }]} numberOfLines={1}>{donor.users.city}</Text>
              </>
            ) : null}
          </View>
          <View style={[styles.statusPill, styles[`status_${donor.status}`] ?? styles.status_pending]}>
            <Text style={styles.statusText}>{donor.status?.toUpperCase() ?? 'PENDING'}</Text>
          </View>
        </View>
        <View style={styles.bloodBadge}>
          <Text style={styles.bloodBadgeType}>{donor.users?.blood_type ?? requestBloodType}</Text>
          <Text style={[styles.bloodMatchLabel, { color: isDarkMode ? COLORS.mutedDark : '#94A3B8' }]}>MATCH</Text>
        </View>
      </View>

      {isAvailable ? (
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.messageBtn} activeOpacity={0.82} onPress={() => onMessage(donor)}>
            <Ionicons name="chatbubble-outline" size={18} color="#FFFFFF" />
            <Text style={styles.messageBtnText}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.callBtn, { backgroundColor: isDarkMode ? COLORS.callBtnDark : COLORS.callBtnLight }]} activeOpacity={0.82} onPress={handleCall}>
            <FontAwesome5 name="phone-alt" size={16} color={isDarkMode ? COLORS.textSecondaryDark : '#64748B'} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.unavailableRow}>
          <Ionicons name="time-outline" size={14} color="#94A3B8" />
          <Text style={styles.unavailableText}>Donor currently unavailable</Text>
        </View>
      )}
    </View>
  );
}

// ─── Recipient Card (shown to donors) ────────────────────────────────────────
function RecipientCard({ match, onMessage, isDarkMode }) {
  const recipient = match.blood_requests?.users;
  const request   = match.blood_requests;

  const handleCall = () => {
    const phone = recipient?.phone_number;
    if (phone) Linking.openURL(`tel:0${phone}`);
  };

  return (
    <View style={[styles.card, { backgroundColor: isDarkMode ? COLORS.cardDark : COLORS.cardLight }]}>
      <View style={styles.cardTop}>
        <AvatarWithFallback
          uri={recipient?.profile_image_url}
          name={recipient?.full_name ?? ''}
          isDarkMode={isDarkMode}
        />
        <View style={styles.cardInfo}>
          <Text style={[styles.personName, { color: isDarkMode ? COLORS.textPrimaryDark : COLORS.textPrimaryLight }]} numberOfLines={1}>
            {recipient?.full_name ?? 'Unknown Recipient'}
          </Text>
          <View style={styles.metaRow}>
            {recipient?.city ? (
              <>
                <Ionicons name="location-outline" size={13} color={isDarkMode ? COLORS.textSecondaryDark : '#64748B'} />
                <Text style={[styles.distanceText, { color: isDarkMode ? COLORS.textSecondaryDark : '#64748B' }]} numberOfLines={1}>{recipient.city}</Text>
                <View style={[styles.dot, { backgroundColor: isDarkMode ? COLORS.dotDark : COLORS.dotLight }]} />
              </>
            ) : null}
            {request?.units_required ? (
              <Text style={[styles.distanceText, { color: isDarkMode ? COLORS.textSecondaryDark : '#64748B' }]}>
                {request.units_found ?? 0}/{request.units_required} units
              </Text>
            ) : null}
          </View>
          <View style={[styles.statusPill, styles[`status_${match.status}`] ?? styles.status_pending]}>
            <Text style={styles.statusText}>{match.status?.toUpperCase() ?? 'PENDING'}</Text>
          </View>
        </View>
        <View style={styles.bloodBadge}>
          <Text style={styles.bloodBadgeType}>{request?.blood_type ?? '—'}</Text>
          <Text style={[styles.bloodMatchLabel, { color: isDarkMode ? COLORS.mutedDark : '#94A3B8' }]}>NEEDED</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.messageBtn} activeOpacity={0.82} onPress={() => onMessage(match)}>
          <Ionicons name="chatbubble-outline" size={18} color="#FFFFFF" />
          <Text style={styles.messageBtnText}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.callBtn, { backgroundColor: isDarkMode ? COLORS.callBtnDark : COLORS.callBtnLight }]} activeOpacity={0.82} onPress={handleCall}>
          <FontAwesome5 name="phone-alt" size={16} color={isDarkMode ? COLORS.textSecondaryDark : '#64748B'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ isDonor, isDarkMode }) {
  return (
    <View style={styles.emptyState}>
      <FontAwesome5 name="user-slash" size={36} color={isDarkMode ? COLORS.mutedDark : '#CBD5E1'} />
      <Text style={[styles.emptyTitle, { color: isDarkMode ? COLORS.mutedDark : '#94A3B8' }]}>No matches yet</Text>
      <Text style={[styles.emptyDesc, { color: isDarkMode ? COLORS.mutedDark : '#94A3B8' }]}>
        {isDonor
          ? "You haven't been matched with any requests yet. Check back shortly."
          : "We're searching for available donors. Check back shortly or contact the coordinator below."}
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MatchesScreen({ setActiveTab, setChatParams }) {
  const { isDarkMode } = useTheme();
  const [role,       setRole]       = useState(null);   // 'donor' | 'recipient' | null
  const [request,    setRequest]    = useState(null);   // recipient's active blood_request
  const [donors,     setDonors]     = useState([]);     // recipient view
  const [matches,    setMatches]    = useState([]);     // donor view
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setError(null);

      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) throw new Error('Not authenticated.');

      // ── Detect role from profile ──────────────────────────────────────────
      const { data: profile, error: profileErr } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileErr) throw profileErr;
      const userRole = profile?.role ?? 'recipient';
      setRole(userRole);
      const currentUserId = user.id;

      // ── Donor path ────────────────────────────────────────────────────────
      if (userRole === 'donor') {
        const { data: matchData, error: matchErr } = await supabase
          .from('donation_matches')
          .select(`
            id,
            status,
            scheduled_date,
            scheduled_time,
            note,
            request_id,
            blood_requests (
              id,
              blood_type,
              units_required,
              units_found,
              user_id,
              users!blood_requests_user_id_fkey (
                id,
                full_name,
                phone_number,
                profile_image_url,
                city
              )
            )
          `)
          .eq('donor_id', user.id);

        if (matchErr) throw matchErr;
        setMatches(matchData ?? []);
        return;
      }

      // ── Recipient path ────────────────────────────────────────────────────
      const { data: reqData, error: reqErr } = await supabase
        .from('blood_requests')
        .select('id, blood_type, status, units_required, units_found, matches')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (reqErr) {
        setDonors([]);
        return;
      }
      setRequest(reqData);

      const { data: matchData, error: matchErr } = await supabase
        .from('donation_matches')
        .select(`
          id,
          status,
          scheduled_date,
          scheduled_time,
          note,
          donor_id,
          users!donation_matches_donor_id_fkey (
            id,
            full_name,
            blood_type,
            phone_number,
            profile_image_url,
            city,
            is_available
          )
        `)
        .eq('request_id', reqData.id)
        .neq('donor_id', currentUserId)
        .eq('users.is_available', true);

      if (matchErr) throw matchErr;

      const available = (matchData ?? []).filter((m) => m.users !== null && m.donor_id !== currentUserId);
      setDonors(available);
    } catch (err) {
      console.error('MatchesScreen fetch error:', err);
      setError(err.message ?? 'Failed to load data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Real-time subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (role === 'recipient' && !request?.id) return;

    const filter = role === 'donor'
      ? undefined   // donor: subscribe to all their matches (no simple column filter)
      : `request_id=eq.${request?.id}`;

    const channelName = role === 'donor'
      ? 'donation_matches:donor'
      : `donation_matches:request_id=eq.${request?.id}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'donation_matches',
          ...(filter ? { filter } : {}),
        },
        () => { fetchData(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [role, request?.id, fetchData]);

  // ── Message handler ────────────────────────────────────────────────────────
  const handleMessage = async (match) => {
    const otherUserId = role === 'donor'
      ? match.blood_requests?.users?.id
      : match.donor_id;

    const otherName = role === 'donor'
      ? (match.blood_requests?.users?.full_name ?? 'Recipient')
      : (match.users?.full_name ?? 'Donor');

    const otherAvatar = role === 'donor'
      ? (match.blood_requests?.users?.profile_image_url ?? '')
      : (match.users?.profile_image_url ?? '');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      const { data: existingRooms } = await supabase
        .from('room_members')
        .select('room_id')
        .eq('user_id', currentUserId);

      const existingRoomIds = (existingRooms ?? []).map((r) => r.room_id);
      let roomId = null;

      if (existingRoomIds.length > 0) {
        const { data: sharedRooms } = await supabase
          .from('room_members')
          .select('room_id')
          .eq('user_id', otherUserId)
          .in('room_id', existingRoomIds);

        roomId = sharedRooms?.[0]?.room_id ?? null;
      }

      if (!roomId) {
        const { data: newRoom, error: roomErr } = await supabase
          .from('chat_rooms')
          .insert({ type: 'direct' })
          .select('id')
          .single();

        if (roomErr) throw roomErr;
        roomId = newRoom.id;

        await supabase.from('room_members').insert([
          { room_id: roomId, user_id: currentUserId },
          { room_id: roomId, user_id: otherUserId },
        ]);
      }

      setChatParams?.({ roomId, donorName: otherName, donorAvatar: otherAvatar });
      setActiveTab?.('messages');
    } catch (err) {
      console.error('handleMessage error:', err);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const bloodLabel = (type) => {
    if (!type) return '—';
    const map = {
      'A+': 'A+ Positive', 'A-': 'A- Negative',
      'B+': 'B+ Positive', 'B-': 'B- Negative',
      'AB+': 'AB+ Positive', 'AB-': 'AB- Negative',
      'O+': 'O+ Positive', 'O-': 'O- Negative',
    };
    return map[type] ?? type;
  };

  const isDonor = role === 'donor';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: isDarkMode ? COLORS.backgroundDark : COLORS.backgroundLight }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? COLORS.backgroundDark : COLORS.backgroundLight}
      />

      {/* ── Header */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? COLORS.backgroundDark : COLORS.backgroundLight }]}>
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7} onPress={() => setActiveTab?.('dashboard')}>
          <Ionicons name="arrow-back" size={22} color={isDarkMode ? COLORS.textPrimaryDark : COLORS.textPrimaryLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isDonor ? 'My Donations' : 'Potential Matches'}
        </Text>
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7} onPress={onRefresh}>
          <MaterialIcons name="tune" size={22} color={isDarkMode ? COLORS.textPrimaryDark : COLORS.textPrimaryLight} />
        </TouchableOpacity>
      </View>

      {/* ── Loading */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={RED} />
          <Text style={[styles.loadingText, { color: isDarkMode ? COLORS.textSecondaryDark : '#64748B' }]}>
            {isDonor ? 'Loading your matches…' : 'Finding donors…'}
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={RED} />}
        >
          {/* ── Recipient view: requirement card */}
          {!isDonor && (
            <View style={[styles.requirementCard, { backgroundColor: isDarkMode ? COLORS.cardDark : COLORS.cardLight }]}>
              <View>
                <Text style={[styles.requirementLabel, { color: isDarkMode ? COLORS.mutedDark : '#94A3B8' }]}>YOUR REQUIREMENT</Text>
                <Text style={[styles.requirementValue, { color: isDarkMode ? COLORS.textPrimaryDark : '#1E293B' }]}>{bloodLabel(request?.blood_type)}</Text>
                {request?.units_required ? (
                  <Text style={[styles.unitsText, { color: isDarkMode ? COLORS.textSecondaryDark : '#64748B' }]}>
                    {request.units_found ?? 0} / {request.units_required} units found
                  </Text>
                ) : null}
              </View>
              <View style={styles.requirementIcon}>
                <FontAwesome5 name="tint" size={22} color="#FFFFFF" />
              </View>
            </View>
          )}

          {/* ── Donor view: summary banner */}
          {isDonor && (
            <View style={[styles.requirementCard, { backgroundColor: isDarkMode ? COLORS.cardDark : COLORS.cardLight }]}>
              <View>
                <Text style={[styles.requirementLabel, { color: isDarkMode ? COLORS.mutedDark : '#94A3B8' }]}>MATCHED REQUESTS</Text>
                <Text style={[styles.requirementValue, { color: isDarkMode ? COLORS.textPrimaryDark : '#1E293B' }]}>{matches.length}</Text>
                <Text style={[styles.unitsText, { color: isDarkMode ? COLORS.textSecondaryDark : '#64748B' }]}>Active Donation Matches</Text>
              </View>
              <View style={styles.requirementIcon}>
                <FontAwesome5 name="hands-helping" size={20} color="#FFFFFF" />
              </View>
            </View>
          )}

          {/* ── Section header */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? COLORS.mutedDark : '#94A3B8' }]}>
              {isDonor
                ? `MATCHED RECIPIENTS (${matches.length})`
                : `AVAILABLE DONORS (${donors.length})`}
            </Text>
            <TouchableOpacity activeOpacity={0.7} onPress={onRefresh}>
              <Text style={styles.realTimeText}>Real-time updates</Text>
            </TouchableOpacity>
          </View>

          {/* ── List */}
          {isDonor ? (
            matches.length === 0 ? (
              <EmptyState isDonor isDarkMode={isDarkMode} />
            ) : (
              matches.map((match) => (
                <RecipientCard
                  key={match.id}
                  match={match}
                  onMessage={handleMessage}
                  isDarkMode={isDarkMode}
                />
              ))
            )
          ) : (
            donors.length === 0 ? (
              <EmptyState isDarkMode={isDarkMode} />
            ) : (
              donors.map((donor) => (
                <DonorCard
                  key={donor.id}
                  donor={donor}
                  requestBloodType={request?.blood_type}
                  onMessage={handleMessage}
                  isDarkMode={isDarkMode}
                />
              ))
            )
          )}

          {/* ── Emergency card (recipients only) */}
          {!isDonor && (
            <View style={[styles.emergencyCard, { backgroundColor: isDarkMode ? COLORS.emergencyBgDark : COLORS.emergencyBgLight }]}>
              <Text style={[styles.emergencyTitle, { color: isDarkMode ? COLORS.textPrimaryDark : '#1E293B' }]}>Can&apos;t find a donor?</Text>
              <Text style={[styles.emergencyDesc, { color: isDarkMode ? COLORS.textSecondaryDark : '#64748B' }]}>
                Our emergency support team is available 24/7 to help coordinate urgent matches.
              </Text>
              <TouchableOpacity style={styles.contactBtn} activeOpacity={0.8} onPress={() => setActiveTab("support")}>
                <Text style={styles.contactBtnText}>CONTACT COORDINATOR</Text>
                <Ionicons name="arrow-forward" size={16} color={RED} />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:     { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: RED, letterSpacing: 0.2 },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },

  requirementCard: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  requirementLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600', letterSpacing: 1, marginBottom: 4 },
  requirementValue: { fontSize: 26, fontWeight: '800', color: '#1E293B' },
  unitsText:        { fontSize: 12, color: '#64748B', marginTop: 4 },
  requirementIcon:  {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: RED,
    alignItems: 'center', justifyContent: 'center',
  },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 1 },
  realTimeText: { fontSize: 13, color: BLUE, fontWeight: '600' },

  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardDimmed: { opacity: 0.65 },
  cardTop:    { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  cardInfo:   { flex: 1, marginLeft: 12 },
  personName: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 3 },

  metaRow:      { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  verifiedText: { fontSize: 11, fontWeight: '700', color: BLUE, letterSpacing: 0.5 },
  dot:          { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#CBD5E1', marginHorizontal: 2 },
  distanceText: { fontSize: 12, color: '#64748B' },

  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 5,
  },
  statusText:        { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  status_pending:    { backgroundColor: '#FEF3C7' },
  status_confirmed:  { backgroundColor: '#DCFCE7' },
  status_declined:   { backgroundColor: '#FEE2E2' },
  status_on_the_way: { backgroundColor: '#DBEAFE' },

  bloodBadge:      { alignItems: 'center', marginLeft: 8 },
  bloodBadgeType:  { fontSize: 22, fontWeight: '800', color: RED, lineHeight: 26 },
  bloodMatchLabel: { fontSize: 9, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5 },

  actionRow: { flexDirection: 'row', gap: 10 },
  messageBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: RED, borderRadius: 12, paddingVertical: 13, gap: 8,
  },
  messageBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  callBtn: {
    width: 50, height: 50, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },

  unavailableRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 4 },
  unavailableText: { fontSize: 12, color: '#94A3B8' },

  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontWeight: '700' },
  onlineDot:      { position: 'absolute', borderWidth: 2, borderColor: '#FFFFFF' },

  emergencyCard: {
    backgroundColor: '#EEF2FF', borderRadius: 20,
    padding: 24, marginTop: 8, alignItems: 'center',
  },
  emergencyTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 8, textAlign: 'center' },
  emergencyDesc:  { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 18 },
  contactBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  contactBtnText: { fontSize: 13, fontWeight: '800', color: RED, letterSpacing: 0.5 },

  emptyState:  { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyTitle:  { fontSize: 16, fontWeight: '700', color: '#94A3B8' },
  emptyDesc:   { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 20 },
  loadingText: { fontSize: 14, color: '#64748B', marginTop: 8 },
  errorText:   { fontSize: 14, color: '#EF4444', textAlign: 'center' },
  retryBtn:    { backgroundColor: RED, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText:   { color: '#FFF', fontWeight: '700', fontSize: 14 },
});