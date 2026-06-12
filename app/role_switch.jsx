import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRole } from '../context';
import { supabase } from '../lib';

// ─── Colour tokens ────────────────────────────────────────────────────────────
const RED     = '#C0392B';
const NAVY    = '#3B4FBF';
const BG      = '#F5F6FA';
const WHITE   = '#FFFFFF';
const TEXT    = '#1A1A2E';
const MUTED   = '#6B7280';
const BORDER  = '#E5E7F0';
const CHIP_BG = '#EEF0FA';

// ─── Feature card ─────────────────────────────────────────────────────────────
const FeatureCard = ({ iconName, title, description }) => (
  <View style={styles.featureCard}>
    <MaterialIcons name={iconName} size={26} color={RED} />
    <View style={styles.featureText}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDesc}>{description}</Text>
    </View>
  </View>
);


// ─── Main screen ──────────────────────────────────────────────────────────────
export default function SwitchRoleScreen() {
  const [loading, setLoading] = useState(false);
  const { role } = useRole();

  // Determine target role: donor → recipient, recipient → donor, default to recipient
  const isCurrentlyDonor = role === 'donor';
  const targetRole = isCurrentlyDonor ? 'recipient' : 'donor';

  const roleConfig = {
    recipient: {
      heading: 'Switch to Recipient Mode',
      subheading:
        'Transitioning to Recipient mode allows you to prioritize urgent medical needs, manage requests for yourself, or coordinate blood supplies for others.',
      chipIcon: 'favorite',
      confirmLabel: 'Switch to Recipient',
      keepLabel: 'Keep Donor Status',
    },
    donor: {
      heading: 'Switch to Donor Mode',
      subheading:
        'Transitioning to Donor mode lets you offer blood, respond to urgent requests, and become part of a life-saving network for those in need.',
      chipIcon: 'person',
      confirmLabel: 'Switch to Donor',
      keepLabel: 'Keep Recipient Status',
    },
  };

  const config = roleConfig[targetRole];

  const handleConfirmSwitch = async () => {
    setLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('users')
        .update({ role: targetRole })
        .eq('id', user.id);

      if (error) throw error;

      Alert.alert('Success', 'Your role has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <MaterialIcons name="arrow-back" size={22} color={RED} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Switch Your Role</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Mode switch illustration */}
        <View style={styles.modeIllustration}>
          <View style={styles.appIconWrap}>
            <View style={styles.appIcon}>
              <MaterialIcons name="medical-services" size={42} color={WHITE} />
            </View>
          </View>

          <View style={styles.modeArrowRow}>
            <View style={styles.modeChip}>
              <MaterialIcons name={isCurrentlyDonor ? 'person' : 'favorite'} size={22} color="#5B6BCC" />
            </View>
            <MaterialIcons name="arrow-forward" size={20} color={MUTED} />
            <View style={[styles.modeChip, styles.modeChipActive]}>
              <MaterialIcons name={config.chipIcon} size={22} color={WHITE} />
            </View>
          </View>
        </View>

        {/* Heading */}
        <Text style={styles.heading}>{config.heading}</Text>
        <Text style={styles.subheading}>{config.subheading}</Text>

        {/* Feature cards */}
        <View style={styles.cardsWrap}>
          <FeatureCard
            iconName="assignment"
            title="Request Dashboard"
            description="Create and track live requests for specific blood types and quantities in real-time."
          />
          <FeatureCard
            iconName="hub"
            title="Donor Matching"
            description="Connect instantly with a curated list of compatible donors in your immediate vicinity."
          />
          <FeatureCard
            iconName="local-hospital"
            title="Clinical Support"
            description="Access recipient-specific resources and emergency protocols for safe transfusions."
          />
          <FeatureCard
            iconName="notification-important"
            title="Urgent Alerts"
            description="Broadcast high-priority needs across the network to secure life-saving donations faster."
          />
        </View>

        {/* CTA buttons */}
        <TouchableOpacity
          style={[styles.confirmBtn, loading && styles.confirmBtnDisabled]}
          activeOpacity={0.85}
          onPress={handleConfirmSwitch}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={WHITE} />
            : <Text style={styles.confirmBtnText}>{config.confirmLabel}</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.keepBtn}
          activeOpacity={0.7}
          onPress={() => router.back()}
        >
          <Text style={styles.keepBtnText}>{config.keepLabel}</Text>
        </TouchableOpacity>

        {/* Clinical note */}
        <Text style={styles.clinicalNote}>
          CLINICAL NOTE: YOUR DONOR HISTORY WILL REMAIN VISIBLE AND ACCESSIBLE
          AT ANY TIME.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
    paddingTop: 30,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: BG,
    gap: 8,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: RED,
    letterSpacing: 0.2,
  },

  // Scroll
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },

  // Mode illustration
  modeIllustration: {
    alignItems: 'center',
    backgroundColor: WHITE,
    borderRadius: 20,
    paddingVertical: 28,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  appIconWrap: {
    marginBottom: 18,
  },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: RED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeArrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modeChip: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: CHIP_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeChipActive: {
    backgroundColor: NAVY,
  },

  // Heading
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT,
    textAlign: 'center',
    marginBottom: 10,
  },
  subheading: {
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },

  // Feature cards
  cardsWrap: {
    gap: 12,
    marginBottom: 28,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: WHITE,
    borderRadius: 14,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 13,
    color: MUTED,
    lineHeight: 19,
  },

  // CTA
  confirmBtn: {
    backgroundColor: RED,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: RED,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  confirmBtnText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  keepBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  keepBtnText: {
    color: RED,
    fontSize: 15,
    fontWeight: '600',
  },
  confirmBtnDisabled: {
    opacity: 0.7,
  },

  // Clinical note
  clinicalNote: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
    letterSpacing: 0.4,
    lineHeight: 16,
    textTransform: 'uppercase',
    paddingHorizontal: 8,
  },
});