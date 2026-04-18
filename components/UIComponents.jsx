import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Alert,
  Animated,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Reanimated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../context";
import { supabase } from "../lib";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const COLORS = {
  primary:            "#D42B1F",
  backgroundLight:    "#FFFFFF",
  backgroundDark:     "#121212",
  surfaceLight:       "#F0F5FA",
  surfaceDark:        "#1E1E1E",
  textLightPrimary:   "#1C1C1E",
  textDarkPrimary:    "#F2F2F7",
  textLightSecondary: "#636366",
  textDarkSecondary:  "#8E8E93",
  accentGreen:        "#7ED321",
  accentBlue:         "#1976D2",
  accentOrange:       "#F57C00",
  accentPurple:       "#7B1FA2",
  accentGold:         "#F59E0B",
  accentRed:          "#D92D20",
  grayblue:           "#26262B",
  gray200:            "#E5E7EB",
};

export const URGENCY_LEVELS = ["Low", "Medium", "High", "Critical"];
export const BLOOD_TYPES    = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// ─────────────────────────────────────────────────────────────────────────────
// URGENCY BADGE
// ─────────────────────────────────────────────────────────────────────────────

export const UrgencyBadge = ({ level }) => {
  const colorMap = {
    Low:      { bg: "rgba(126,211,33,0.15)",  text: COLORS.accentGreen  },
    Medium:   { bg: "rgba(245,124,0,0.15)",   text: COLORS.accentOrange },
    High:     { bg: "rgba(212,43,31,0.15)",   text: COLORS.primary      },
    Critical: { bg: COLORS.primary,           text: "#fff"              },
  };
  const c = colorMap[level] ?? colorMap.Low;

  return (
    <View style={[sharedStyles.urgencyBadge, { backgroundColor: c.bg }]}>
      <MaterialIcons name="local-fire-department" size={12} color={c.text} />
      <Text style={[sharedStyles.urgencyText, { color: c.text }]}>{level}</Text>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PULSE DOT
// ─────────────────────────────────────────────────────────────────────────────

export const PulseDot = ({ color = COLORS.accentGreen }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1.8,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();
    return () => pulse.stop();
  }, [scale, opacity]);

  return (
    <View style={sharedStyles.pulseDotWrapper}>
      <Animated.View
        style={[
          sharedStyles.pulseDotOuter,
          {
            backgroundColor: color,
            transform: [{ scale }],
            opacity,
          },
        ]}
      />
      <View style={[sharedStyles.pulseDotInner, { backgroundColor: color }]} />
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// BLOOD UNIT PROGRESS CHART
// ─────────────────────────────────────────────────────────────────────────────

const AnimatedCircle = Reanimated.createAnimatedComponent(Circle);

export const BloodUnitProgressChart = ({ percentage, textPrimary, onComplete }) => {
  const { isDarkMode } = useTheme();
  const trackColor = isDarkMode ? "#26262B" : "#F0F0F0";

  const SIZE         = 160;
  const STROKE_WIDTH = 12;
  const radius       = (SIZE - STROKE_WIDTH) / 2;
  const circumference = radius * 2 * Math.PI;

  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withTiming(percentage, { duration: 1000 });
    if (percentage >= 100 && onComplete) onComplete();
  }, [percentage, onComplete, animatedValue]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference - (circumference * animatedValue.value) / 100,
  }));

  const displayPercent = percentage >= 100 ? 100 : parseInt(percentage, 10);

  return (
    <View style={sharedStyles.chartContainer}>
      <View style={sharedStyles.circleWrapper}>
        <Svg width={SIZE} height={SIZE} style={sharedStyles.svg}>
          <Circle
            cx={SIZE / 2} cy={SIZE / 2} r={radius}
            stroke={trackColor} strokeWidth={STROKE_WIDTH} fill="none"
          />
          <AnimatedCircle
            cx={SIZE / 2} cy={SIZE / 2} r={radius}
            stroke="#D32F2F" strokeWidth={STROKE_WIDTH} fill="none"
            strokeDasharray={circumference}
            animatedProps={animatedProps}
            strokeLinecap="round"
            rotation="-90"
            origin={`${SIZE / 2}, ${SIZE / 2}`}
          />
        </Svg>
        <View style={sharedStyles.labelContainer}>
          <Text style={sharedStyles.statusLabelTop}>STATUS</Text>
          <Text style={[sharedStyles.progressPercent, textPrimary]}>
            {displayPercent}%
          </Text>
          <Text style={sharedStyles.statusLabelBottom}>
            {percentage >= 100 ? "FULFILLED" : "COMPLETE"}
          </Text>
        </View>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DONOR ACTIVITY ITEM
// ─────────────────────────────────────────────────────────────────────────────

export const DonorActivityItem = ({ name, time, status, isDarkMode }) => {
  const statusConfig = {
    Confirmed: { color: COLORS.accentGreen,  icon: "check-circle" },
    Pending:   { color: COLORS.accentOrange, icon: "schedule"     },
    Declined:  { color: COLORS.primary,      icon: "cancel"       },
  };
  const cfg     = statusConfig[status] ?? statusConfig.Pending;
  const nameTxt = isDarkMode ? COLORS.textDarkPrimary   : COLORS.textLightPrimary;
  const timeTxt = isDarkMode ? COLORS.textDarkSecondary : COLORS.textLightSecondary;
  const avatarBg = isDarkMode ? COLORS.grayblue : "#F0F5FA";

  return (
    <View style={sharedStyles.activityItem}>
      <View style={[sharedStyles.activityAvatar, { backgroundColor: avatarBg }]}>
        <MaterialIcons name="person" size={20} color={cfg.color} />
      </View>
      <View style={sharedStyles.activityInfo}>
        <Text style={[sharedStyles.activityName, { color: nameTxt }]}>{name}</Text>
        <Text style={[sharedStyles.activityTime, { color: timeTxt }]}>{time}</Text>
      </View>
      <View style={[sharedStyles.activityStatus, { backgroundColor: cfg.color + "20" }]}>
        <MaterialIcons name={cfg.icon} size={14} color={cfg.color} />
        <Text style={[sharedStyles.activityStatusText, { color: cfg.color }]}>
          {status}
        </Text>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// QUICK ACTION CARD
// ─────────────────────────────────────────────────────────────────────────────

export const QuickActionCard = ({ icon, label, color, onPress, isDarkMode }) => {
  const bg       = isDarkMode ? COLORS.grayblue : "#F0F5FA";
  const labelTxt = isDarkMode ? COLORS.textDarkPrimary : COLORS.textLightPrimary;

  return (
    <TouchableOpacity
      style={[sharedStyles.quickAction, { backgroundColor: bg }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[sharedStyles.quickActionIcon, { backgroundColor: color + "20" }]}>
        <MaterialIcons name={icon} size={24} color={color} />
      </View>
      <Text style={[sharedStyles.quickActionLabel, { color: labelTxt }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// BLOOD BANK CARD
// ─────────────────────────────────────────────────────────────────────────────

export const BloodBankCard = ({ name, distance, available, isDarkMode }) => {
  const bg       = isDarkMode ? COLORS.grayblue : "#F0F5FA";
  const nameTxt  = isDarkMode ? COLORS.textDarkPrimary   : COLORS.textLightPrimary;
  const distTxt  = isDarkMode ? COLORS.textDarkSecondary : COLORS.textLightSecondary;
  const availBg  = available ? COLORS.accentGreen + "20" : "#aaa3";
  const availTxt = available ? COLORS.accentGreen : "#888";

  return (
    <View style={[sharedStyles.bankCard, { backgroundColor: bg }]}>
      <View style={[sharedStyles.bankIconBox, { backgroundColor: COLORS.primary + "20" }]}>
        <MaterialIcons name="local-hospital" size={22} color={COLORS.primary} />
      </View>
      <View style={sharedStyles.bankInfo}>
        <Text style={[sharedStyles.bankName,     { color: nameTxt }]}>{name}</Text>
        <Text style={[sharedStyles.bankDistance, { color: distTxt }]}>{distance} away</Text>
      </View>
      <View style={[sharedStyles.bankAvailBadge, { backgroundColor: availBg }]}>
        <Text style={[sharedStyles.bankAvailText, { color: availTxt }]}>
          {available ? "Available" : "Unavailable"}
        </Text>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION ITEM
// ─────────────────────────────────────────────────────────────────────────────

export const NotificationItem = ({ icon, title, subtitle, time, color, isDarkMode }) => {
  const titleTxt    = isDarkMode ? COLORS.textDarkPrimary   : COLORS.textLightPrimary;
  const subtitleTxt = isDarkMode ? COLORS.textDarkSecondary : COLORS.textLightSecondary;
  const timeTxt     = isDarkMode ? COLORS.textDarkSecondary : COLORS.textLightSecondary;

  return (
    <View style={sharedStyles.notifItem}>
      <View style={[sharedStyles.notifIconBox, { backgroundColor: color + "20" }]}>
        <MaterialIcons name={icon} size={20} color={color} />
      </View>
      <View style={sharedStyles.notifContent}>
        <Text style={[sharedStyles.notifTitle,    { color: titleTxt    }]}>{title}</Text>
        <Text style={[sharedStyles.notifSubtitle, { color: subtitleTxt }]}>{subtitle}</Text>
      </View>
      <Text style={[sharedStyles.notifTime, { color: timeTxt }]}>{time}</Text>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ELIGIBILITY TIMER
// ─────────────────────────────────────────────────────────────────────────────

export const EligibilityTimer = ({ daysLeft, isDarkMode }) => {
  const TOTAL_DAYS = 56;
  const progress   = Math.max(0, Math.min(1, (TOTAL_DAYS - daysLeft) / TOTAL_DAYS));
  const isEligible = daysLeft <= 0;

  const bg       = isDarkMode ? COLORS.grayblue : "#F8F9FA";
  const barBg    = isDarkMode ? "#444" : "#E0E0E0";
  const barColor = isEligible ? COLORS.accentGreen : COLORS.accentOrange;
  const iconName = isEligible ? "check-circle" : "hourglass-empty";
  const iconBg   = isEligible ? COLORS.accentGreen + "20" : COLORS.accentOrange + "20";
  const daysTxt  = isEligible
    ? { color: COLORS.accentGreen }
    : { color: isDarkMode ? COLORS.textDarkPrimary : COLORS.textLightPrimary };
  const secTxt   = { color: isDarkMode ? COLORS.textDarkSecondary : COLORS.textLightSecondary };

  return (
    <View style={[donorStyles.eligibilityTimer, { backgroundColor: bg }]}>
      <View style={donorStyles.eligibilityTimerLeft}>
        <View style={[donorStyles.eligibilityIconBox, { backgroundColor: iconBg }]}>
          <MaterialIcons name={iconName} size={22} color={barColor} />
        </View>
        <View>
          <Text style={[donorStyles.eligibilityLabel, secTxt]}>
            {isEligible ? "ELIGIBLE NOW" : "ELIGIBLE IN"}
          </Text>
          <Text style={[donorStyles.eligibilityDays, daysTxt]}>
            {isEligible ? "Ready to Donate" : `${daysLeft} days`}
          </Text>
        </View>
      </View>
      <View style={donorStyles.eligibilityBarWrapper}>
        <View style={[donorStyles.eligibilityBarBg, { backgroundColor: barBg }]}>
          <View
            style={[
              donorStyles.eligibilityBarFill,
              { width: `${progress * 100}%`, backgroundColor: barColor },
            ]}
          />
        </View>
        <Text style={[donorStyles.eligibilityBarLabel, secTxt]}>
          {Math.round(progress * 100)}% recovery
        </Text>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ACHIEVEMENT BADGE
// ─────────────────────────────────────────────────────────────────────────────

export const AchievementBadge = ({ icon, title, subtitle, color, unlocked, isDarkMode }) => {
  const bg      = isDarkMode ? COLORS.grayblue : "#F8F9FA";
  const nameTxt = isDarkMode ? COLORS.textDarkPrimary   : COLORS.textLightPrimary;
  const subTxt  = isDarkMode ? COLORS.textDarkSecondary : COLORS.textLightSecondary;

  return (
    <View style={[donorStyles.achievementBadge, { backgroundColor: bg, opacity: unlocked ? 1 : 0.45 }]}>
      <View style={[donorStyles.achievementIcon, { backgroundColor: color + "20" }]}>
        <MaterialIcons name={icon} size={26} color={unlocked ? color : "#999"} />
      </View>
      <Text style={[donorStyles.achievementTitle,    { color: nameTxt }]}>{title}</Text>
      <Text style={[donorStyles.achievementSubtitle, { color: subTxt  }]}>{subtitle}</Text>
      {unlocked && (
        <View style={[donorStyles.achievementUnlocked, { backgroundColor: color + "20" }]}>
          <Text style={[donorStyles.achievementUnlockedText, { color }]}>Unlocked</Text>
        </View>
      )}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DONATION HISTORY ROW
// ─────────────────────────────────────────────────────────────────────────────

export const DonationHistoryRow = ({ date, location, units, certificate, isDarkMode }) => {
  const bg      = isDarkMode ? COLORS.grayblue : "#F8F9FA";
  const dateTxt = isDarkMode ? COLORS.textDarkPrimary   : COLORS.textLightPrimary;
  const locTxt  = isDarkMode ? COLORS.textDarkSecondary : COLORS.textLightSecondary;

  return (
    <View style={[donorStyles.historyRow, { backgroundColor: bg }]}>
      <View style={[donorStyles.historyIconBox, { backgroundColor: COLORS.primary + "20" }]}>
        <MaterialIcons name="bloodtype" size={20} color={COLORS.primary} />
      </View>
      <View style={donorStyles.historyInfo}>
        <Text style={[donorStyles.historyDate,     { color: dateTxt }]}>{date}</Text>
        <Text style={[donorStyles.historyLocation, { color: locTxt  }]}>
          {location} • {units} unit{units > 1 ? "s" : ""}
        </Text>
      </View>
      {certificate && (
        <TouchableOpacity style={donorStyles.certButton}>
          <MaterialIcons name="workspace-premium" size={16} color={COLORS.accentGold} />
          <Text style={donorStyles.certButtonText}>Cert</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// URGENT REQUEST CARD
// ─────────────────────────────────────────────────────────────────────────────

export const UrgentRequestCard = ({ request, donorBloodType, isDarkMode, onRespond }) => {
  const isMatch  = request.type === donorBloodType.split(" ")[0];
  const bg       = isDarkMode ? COLORS.grayblue : "#F8F9FA";
  const hospTxt  = isDarkMode ? COLORS.textDarkPrimary   : COLORS.textLightPrimary;
  const metaTxt  = isDarkMode ? COLORS.textDarkSecondary : COLORS.textLightSecondary;
  const unitsBg  = isDarkMode ? "#444" : "#E8E8E8";
  const unitsTxt = isDarkMode ? COLORS.textDarkPrimary   : COLORS.textLightPrimary;

  return (
    <TouchableOpacity
      style={[
        donorStyles.urgentCard,
        {
          backgroundColor: bg,
          borderLeftColor: isMatch ? COLORS.primary : "transparent",
          borderLeftWidth: isMatch ? 4 : 0,
        },
      ]}
      onPress={() => onRespond(request)}
      activeOpacity={0.8}
    >
      <View style={donorStyles.urgentCardLeft}>
        <View style={[donorStyles.urgentBloodBadge, { backgroundColor: COLORS.primary }]}>
          <Text style={donorStyles.urgentBloodText}>{request.type}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={[donorStyles.urgentHospital, { color: hospTxt }]}>
              {request.hospital}
            </Text>
            {isMatch && (
              <MaterialIcons name="stars" size={14} color={COLORS.accentGold} />
            )}
          </View>
          <View style={donorStyles.urgentMeta}>
            <MaterialIcons name="location-on" size={12} color={metaTxt} />
            <Text style={[donorStyles.urgentMetaText, { color: metaTxt }]}>
              {request.distance}
            </Text>
            <View style={[donorStyles.urgentUnitsBadge, { backgroundColor: unitsBg }]}>
              <Text style={[donorStyles.urgentUnitsText, { color: unitsTxt }]}>
                {request.unitsNeeded} units needed
              </Text>
            </View>
          </View>
        </View>
      </View>
      <View style={donorStyles.urgentRespondBtn}>
        <Text style={donorStyles.urgentRespondText}>Respond</Text>
        <MaterialIcons name="chevron-right" size={16} color="#fff" />
      </View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH TIP CARD
// ─────────────────────────────────────────────────────────────────────────────

export const HealthTipCard = ({ icon, tip, color, isDarkMode }) => {
  const bg  = isDarkMode ? COLORS.grayblue : "#F8F9FA";
  const txt = isDarkMode ? COLORS.textDarkPrimary : COLORS.textLightPrimary;

  return (
    <View style={[donorStyles.healthTipCard, { backgroundColor: bg }]}>
      <View style={[donorStyles.healthTipIcon, { backgroundColor: color + "20" }]}>
        <MaterialIcons name={icon} size={20} color={color} />
      </View>
      <Text style={[donorStyles.healthTipText, { color: txt }]}>{tip}</Text>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// IMPACT STAT CARD
// ─────────────────────────────────────────────────────────────────────────────

export const ImpactStatCard = ({ value, label, icon, color, surface }) => (
  <View style={[donorStyles.impactCard, { backgroundColor: surface }]}>
    <View style={[donorStyles.impactIconBox, { backgroundColor: color + "20" }]}>
      <MaterialIcons name={icon} size={20} color={color} />
    </View>
    <Text style={[donorStyles.impactValue, { color }]}>{value}</Text>
    <Text style={donorStyles.impactLabel}>{label}</Text>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// STATS SECTION
// ─────────────────────────────────────────────────────────────────────────────

export const StatsSection = ({ isDarkMode, userData }) => {
  const surface       = isDarkMode ? COLORS.surfaceDark : COLORS.surfaceLight;
  const textPrimary   = { color: isDarkMode ? COLORS.textDarkPrimary   : COLORS.textLightPrimary   };
  const textSecondary = { color: isDarkMode ? COLORS.textDarkSecondary : COLORS.textLightSecondary };

  const stats = [
    { icon: "favorite",     label: "Donations",  value: userData?.total_donations ?? "0", color: COLORS.accentRed   },
    { icon: "people",       label: "Lives Saved", value: userData?.lives_saved     ?? "0", color: COLORS.accentGreen },
    { icon: "emoji-events", label: "Badges",      value: userData?.badges          ?? "0", color: COLORS.accentGold  },
  ];

  return (
    <View style={profileStyles.section}>
      <Text style={[profileStyles.sectionTitle, textSecondary]}>Your Impact</Text>
      <View style={[profileStyles.card, { backgroundColor: surface }]}>
        <View style={profileStyles.statsRow}>
          {stats.map((stat, index) => (
            <View
              key={index}
              style={[
                profileStyles.statItem,
                index !== stats.length - 1 && {
                  borderRightWidth: 1,
                  borderRightColor: isDarkMode ? "#2A2A2A" : COLORS.gray200,
                },
              ]}
            >
              <View style={[profileStyles.statIconWrapper, { backgroundColor: stat.color + "20" }]}>
                <MaterialIcons name={stat.icon} size={20} color={stat.color} />
              </View>
              <Text style={[profileStyles.statValue, textPrimary]}>{stat.value}</Text>
              <Text style={[profileStyles.statLabel, textSecondary]}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTION ROW  — single unified row button for all profile sections
//
// Props:
//   icon        MaterialIcons name
//   iconColor   color for icon (overridden to accentRed when danger=true)
//   label       primary text
//   subtitle    optional secondary text
//   onPress     handler
//   isDarkMode  boolean
//   isLast      omits bottom divider when true
//   danger      styles label & chevron in accentRed
// ─────────────────────────────────────────────────────────────────────────────

export const ActionRow = ({
  icon,
  iconColor,
  label,
  subtitle,
  onPress,
  isDarkMode,
  isLast  = false,
  danger  = false,
}) => {
  const resolvedIconColor = danger ? COLORS.accentRed : iconColor;
  const labelColor        = danger
    ? COLORS.accentRed
    : isDarkMode ? COLORS.textDarkPrimary   : COLORS.textLightPrimary;
  const subtitleColor     = isDarkMode ? COLORS.textDarkSecondary : COLORS.textLightSecondary;
  const chevronColor      = danger
    ? COLORS.accentRed
    : isDarkMode ? COLORS.textDarkSecondary : COLORS.textLightSecondary;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        profileStyles.actionRow,
        !isLast && {
          borderBottomWidth: 1,
          borderBottomColor: isDarkMode ? "#2A2A2A" : COLORS.gray200,
        },
      ]}
    >
      <View style={[profileStyles.actionIconWrapper, { backgroundColor: resolvedIconColor + "18" }]}>
        <MaterialIcons name={icon} size={20} color={resolvedIconColor} />
      </View>
      <View style={profileStyles.actionTextBlock}>
        <Text style={[profileStyles.actionLabel, { color: labelColor }]}>{label}</Text>
        {subtitle && (
          <Text style={[profileStyles.actionSubtitle, { color: subtitleColor }]}>{subtitle}</Text>
        )}
      </View>
      <MaterialIcons name="chevron-right" size={22} color={chevronColor} />
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS SECTION
// ─────────────────────────────────────────────────────────────────────────────

export const SettingsSection = ({ isDarkMode }) => {
  const surface       = isDarkMode ? COLORS.surfaceDark : COLORS.surfaceLight;
  const textSecondary = { color: isDarkMode ? COLORS.textDarkSecondary : COLORS.textLightSecondary };

  const accountSettings = [
    {
      icon: "lock",          iconColor: "#6366F1",
      label: "Change Password",    subtitle: "Update your account password",
      onPress: () => router.push("/change_password"),
    },
    {
      icon: "notifications", iconColor: COLORS.accentGold,
      label: "Notifications",      subtitle: "Manage alerts & reminders",
      onPress: () => router.push("/notifications_settings"),
    },
    {
      icon: "location-on",   iconColor: COLORS.accentRed,
      label: "Location Settings",  subtitle: "Control your location sharing",
      onPress: () => router.push("/location_settings"),
    },
    {
      icon: "privacy-tip",   iconColor: "#10B981",
      label: "Privacy",            subtitle: "Manage your data & visibility",
      onPress: () => router.push("/privacy_settings"),
    },
  ];

  const supportSettings = [
    {
      icon: "help-outline",  iconColor: "#3B82F6",
      label: "Help & Support",     subtitle: "FAQs, contact us",
      onPress: () => router.push("/support"),
    },
    {
      icon: "description",   iconColor: "#8B5CF6",
      label: "Terms of Service",
      onPress: () => Linking.openURL("https://yourapp.com/terms"),
    },
    {
      icon: "shield",        iconColor: "#10B981",
      label: "Privacy Policy",
      onPress: () => Linking.openURL("https://yourapp.com/privacy"),
    },
    {
      icon: "info-outline",  iconColor: "#6B7280",
      label: "About",              subtitle: "Version 1.0.0",
      onPress: () =>
        Alert.alert("Blood Hive", "Version 1.0.0\nBuilt with ❤️ for donors & recipients."),
    },
  ];

  const renderGroup = (items) => (
    <View style={[profileStyles.card, { backgroundColor: surface }]}>
      {items.map((item, index) => (
        <ActionRow
          key={index}
          {...item}
          isDarkMode={isDarkMode}
          isLast={index === items.length - 1}
        />
      ))}
    </View>
  );

  return (
    <>
      <View style={profileStyles.section}>
        <Text style={[profileStyles.sectionTitle, textSecondary]}>Account Settings</Text>
        {renderGroup(accountSettings)}
      </View>
      <View style={profileStyles.section}>
        <Text style={[profileStyles.sectionTitle, textSecondary]}>Support & Legal</Text>
        {renderGroup(supportSettings)}
      </View>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DANGER ZONE SECTION
// ─────────────────────────────────────────────────────────────────────────────

export const DangerZoneSection = ({ isDarkMode }) => {
  const textSecondary = { color: isDarkMode ? COLORS.textDarkSecondary : COLORS.textLightSecondary };

  const confirmDelete = async () => {
    const { error } = await supabase.rpc("delete_user_account");
    if (error) {
      Alert.alert("Error", "Could not delete account. Please contact support.");
    } else {
      await supabase.auth.signOut();
      router.replace("/login");
    }
  };

  const handleDeleteAccount = () => {
    if (Platform.OS === "web") {
      if (window.confirm("Are you sure? This will permanently delete your account and all data.")) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        "Delete Account",
        "This action is permanent and cannot be undone. All your data will be erased.",
        [
          { text: "Cancel", style: "cancel"      },
          { text: "Delete", style: "destructive", onPress: confirmDelete },
        ]
      );
    }
  };

  return (
    <View style={profileStyles.section}>
      <Text style={[profileStyles.sectionTitle, textSecondary]}>Danger Zone</Text>
      <View
        style={[
          profileStyles.card,
          {
            backgroundColor: isDarkMode ? "#2A1618" : "#FEF2F2",
            borderWidth: 1,
            borderColor:     isDarkMode ? "#7F1D1D" : "#FECACA",
          },
        ]}
      >
        <ActionRow
          icon="delete-forever"
          iconColor={COLORS.accentRed}
          label="Delete Account"
          subtitle="Permanently erase your data"
          onPress={handleDeleteAccount}
          isDarkMode={isDarkMode}
          isLast
          danger
        />
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const sharedStyles = StyleSheet.create({
  // Urgency Badge
  urgencyBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  urgencyText: { fontSize: 11, fontWeight: "700" },

  // Pulse Dot
  pulseDotWrapper: { width: 16, height: 16, alignItems: "center", justifyContent: "center" },
  pulseDotOuter:   { position: "absolute", width: 14, height: 14, borderRadius: 7 },
  pulseDotInner:   { width: 8, height: 8, borderRadius: 4 },

  // Chart
  chartContainer:    { alignItems: "center" },
  circleWrapper:     { position: "relative", alignItems: "center", justifyContent: "center" },
  svg:               {},
  labelContainer:    { position: "absolute", alignItems: "center" },
  statusLabelTop:    { fontSize: 10, fontWeight: "700", color: "#888", letterSpacing: 1 },
  progressPercent:   { fontSize: 32, fontWeight: "800" },
  statusLabelBottom: { fontSize: 10, fontWeight: "700", color: COLORS.primary, letterSpacing: 1 },

  // Donor Activity
  activityItem:       { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 8, gap: 12 },
  activityAvatar:     { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  activityInfo:       { flex: 1 },
  activityName:       { fontSize: 14, fontWeight: "700" },
  activityTime:       { fontSize: 12, marginTop: 2 },
  activityStatus:     { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  activityStatusText: { fontSize: 11, fontWeight: "700" },

  // Quick Action
  quickAction:      { width: "46%", borderRadius: 14, padding: 16, alignItems: "center", gap: 10 },
  quickActionIcon:  { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  quickActionLabel: { fontSize: 13, fontWeight: "700", textAlign: "center" },

  // Blood Bank
  bankCard:       { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, marginBottom: 10, gap: 12 },
  bankIconBox:    { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  bankInfo:       { flex: 1 },
  bankName:       { fontSize: 14, fontWeight: "700" },
  bankDistance:   { fontSize: 12, marginTop: 2 },
  bankAvailBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  bankAvailText:  { fontSize: 11, fontWeight: "700" },

  // Notifications
  notifItem:     { flexDirection: "row", alignItems: "flex-start", paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: "#88888822", gap: 12 },
  notifIconBox:  { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  notifContent:  { flex: 1 },
  notifTitle:    { fontSize: 14, fontWeight: "700" },
  notifSubtitle: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  notifTime:     { fontSize: 11, fontWeight: "600", marginTop: 2 },
});

const donorStyles = StyleSheet.create({
  // Eligibility Timer
  eligibilityTimer:      { borderRadius: 12, padding: 14, marginTop: 16, gap: 10 },
  eligibilityTimerLeft:  { flexDirection: "row", alignItems: "center", gap: 12 },
  eligibilityIconBox:    { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  eligibilityLabel:      { fontSize: 10, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  eligibilityDays:       { fontSize: 16, fontWeight: "700", marginTop: 2 },
  eligibilityBarWrapper: { gap: 4 },
  eligibilityBarBg:      { height: 6, borderRadius: 3, overflow: "hidden" },
  eligibilityBarFill:    { height: "100%", borderRadius: 3 },
  eligibilityBarLabel:   { fontSize: 10, fontWeight: "600" },

  // Achievement Badge
  achievementBadge:        { width: 110, borderRadius: 14, padding: 14, alignItems: "center", gap: 6, marginRight: 10 },
  achievementIcon:         { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  achievementTitle:        { fontSize: 12, fontWeight: "700", textAlign: "center" },
  achievementSubtitle:     { fontSize: 10, textAlign: "center", lineHeight: 14 },
  achievementUnlocked:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 2 },
  achievementUnlockedText: { fontSize: 9, fontWeight: "800" },

  // Donation History
  historyRow:      { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, marginBottom: 10, gap: 12 },
  historyIconBox:  { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  historyInfo:     { flex: 1 },
  historyDate:     { fontSize: 14, fontWeight: "700" },
  historyLocation: { fontSize: 12, marginTop: 2 },
  certButton:      { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.accentGold + "20", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  certButtonText:  { fontSize: 11, fontWeight: "700", color: COLORS.accentGold },

  // Urgent Request Card
  urgentCard:        { borderRadius: 14, padding: 14, marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  urgentCardLeft:    { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  urgentBloodBadge:  { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  urgentBloodText:   { color: "#fff", fontWeight: "800", fontSize: 13 },
  urgentHospital:    { fontSize: 14, fontWeight: "700" },
  urgentMeta:        { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4, flexWrap: "wrap" },
  urgentMetaText:    { fontSize: 12 },
  urgentUnitsBadge:  { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginLeft: 4 },
  urgentUnitsText:   { fontSize: 10, fontWeight: "600" },
  urgentRespondBtn:  { backgroundColor: COLORS.primary, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, gap: 2 },
  urgentRespondText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  // Health Tip
  healthTipCard: { borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 12 },
  healthTipIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  healthTipText: { flex: 1, fontSize: 13, lineHeight: 20 },

  // Impact Stat
  impactCard:    { flex: 1, borderRadius: 14, padding: 14, alignItems: "center", gap: 6, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  impactIconBox: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  impactValue:   { fontSize: 22, fontWeight: "800" },
  impactLabel:   { fontSize: 10, color: "#888", fontWeight: "600", textAlign: "center" },
});

const profileStyles = StyleSheet.create({
  section:      { paddingHorizontal: 16, paddingBottom: 8, marginTop: 10 },
  sectionTitle: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  card:         { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 4, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },

  // Stats
  statsRow:        { flexDirection: "row", justifyContent: "space-around", paddingVertical: 12 },
  statItem:        { flex: 1, alignItems: "center", gap: 6, paddingVertical: 8 },
  statIconWrapper: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statValue:       { fontSize: 20, fontWeight: "700" },
  statLabel:       { fontSize: 11, fontWeight: "500" },

  // Action Row — used by ActionRow component (replaces settingsRow, dangerRow, actionRow)
  actionRow:         { flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 12 },
  actionIconWrapper: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  actionTextBlock:   { flex: 1 },
  actionLabel:       { fontSize: 15, fontWeight: "600" },
  actionSubtitle:    { fontSize: 12, marginTop: 2 },
});