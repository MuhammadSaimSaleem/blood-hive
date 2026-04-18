import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from "react-native-webview";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../lib/supabase";

// ─── Haversine distance (km) ────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Component ───────────────────────────────────────────────────────────────
const DonorLiveMapScreen = () => {
  const { isDarkMode } = useTheme();
  const { bloodType = "A+" } = useLocalSearchParams();

  const [region, setRegion] = useState(null);
  const [donors, setDonors] = useState([]);
  const [revealedCards, setRevealedCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanPhase, setScanPhase] = useState("idle"); // idle | scanning | done

  // One Animated.Value per donor slot (max 10)
  const MAX_DONORS = 10;
  const cardAnims = useRef(
    Array.from({ length: MAX_DONORS }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(40),
      scale: new Animated.Value(0.85),
    }))
  ).current;

  // ── Theme ──────────────────────────────────────────────────────────────────
  const colors = useMemo(
    () => ({
      bg: isDarkMode ? "#0A0A0F" : "#F7F7FA",
      surface: isDarkMode ? "#16161E" : "#FFFFFF",
      elevated: isDarkMode ? "#1E1E2A" : "#FFFFFF",
      text: isDarkMode ? "#F0F0F5" : "#0D0D14",
      subText: isDarkMode ? "#7070A0" : "#7B7B9E",
      border: isDarkMode ? "#2A2A3A" : "#E8E8F0",
      accent: "#E02020",
      accentDim: "rgba(224,32,32,0.15)",
      pulse: "rgba(224,32,32,0.18)",
      userDot: "#2D7EF8",
      mapBg: isDarkMode ? "#0A0A0F" : "#F7F7FA",
      mapFilter: isDarkMode
        ? "invert(93%) hue-rotate(180deg) brightness(88%) saturate(0.85)"
        : "none",
    }),
    [isDarkMode]
  );

  // ── Fetch user location ────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setRegion({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        } else {
          // Fallback: Faisalabad city centre
          setRegion({ latitude: 31.4504, longitude: 73.135 });
        }
      } catch {
        setRegion({ latitude: 31.4504, longitude: 73.135 });
      }
    })();
  }, []);

  // ── Fetch donors from Supabase once we have location ──────────────────────
  useEffect(() => {
    if (!region) return;

    const fetchDonors = async () => {
      try {
        const delta = 0.14; // ~15 km bounding box
        const { data, error } = await supabase
          .from("donors")
          .select("id, name, blood_type, latitude, longitude, phone")
          .eq("blood_type", bloodType)
          .eq("is_available", true)
          .gte("latitude", region.latitude - delta)
          .lte("latitude", region.latitude + delta)
          .gte("longitude", region.longitude - delta)
          .lte("longitude", region.longitude + delta)
          .limit(MAX_DONORS);

        if (error) throw error;

        const enriched = (data || [])
          .map((d) => ({
            ...d,
            distanceKm: haversine(
              region.latitude,
              region.longitude,
              d.latitude,
              d.longitude
            ),
          }))
          .sort((a, b) => a.distanceKm - b.distanceKm)
          .map((d) => ({
            ...d,
            distanceText:
              d.distanceKm < 1
                ? `${Math.round(d.distanceKm * 1000)} m`
                : `${d.distanceKm.toFixed(1)} km`,
          }));

        setDonors(enriched);
      } catch (err) {
        console.warn("Supabase fetch error:", err.message);
        setDonors([]);
      } finally {
        setLoading(false);
        setScanPhase("scanning");
      }
    };

    fetchDonors();

    // Real-time subscription: re-fetch if donor availability changes
    const subscription = supabase
      .channel("donors-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "donors" },
        () => fetchDonors()
      )
      .subscribe();

    // FIX: correct cleanup — use subscription.unsubscribe()
    return () => subscription.unsubscribe();
  }, [region, bloodType]);

  // ── Animate a card in when the radar hits it ───────────────────────────────
  const revealCard = useCallback(
    (donorId) => {
      const idx = donors.findIndex((d) => d.id === donorId);
      if (idx === -1 || idx >= MAX_DONORS) return;

      setRevealedCards((prev) => {
        if (prev.includes(donorId)) return prev;
        return [...prev, donorId];
      });

      const anim = cardAnims[idx];
      Animated.parallel([
        Animated.spring(anim.opacity, {
          toValue: 1,
          useNativeDriver: true,
          tension: 60,
          friction: 9,
        }),
        Animated.spring(anim.translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 55,
          friction: 8,
        }),
        Animated.spring(anim.scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
      ]).start();
    },
    [donors, cardAnims]
  );

  // ── WebView message handler ────────────────────────────────────────────────
  const handleWebViewMessage = useCallback(
    (e) => {
      try {
        const msg = JSON.parse(e.nativeEvent.data);
        if (msg.type === "donorFound") revealCard(msg.donorId);
        if (msg.type === "scanComplete") setScanPhase("done");
        // FIX: handle no-donors case from WebView
        if (msg.type === "noDonoars") setScanPhase("done");
      } catch {}
    },
    [revealCard]
  );

  // ── Build map HTML ─────────────────────────────────────────────────────────
  // FIX: map always renders as long as region is set — donors can be empty array
  const mapHtml = useMemo(() => {
    if (!region) return null;

    const donorsJson = JSON.stringify(
      donors.map((d) => ({ id: d.id, lat: d.latitude, lng: d.longitude }))
    );

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    html,body,#map{width:100%;height:100%;overflow:hidden;background:${colors.mapBg}}
    #map{
      filter:${colors.mapFilter};
      transition:filter .4s;
    }
    .radar-ring{
      position:absolute;border-radius:50%;
      border:1.5px solid rgba(224,32,32,0.6);
      background:radial-gradient(circle,rgba(224,32,32,0.06) 0%,transparent 70%);
      transform:translate(-50%,-50%);
      pointer-events:none;
      z-index:9999;
    }
    .user-dot{
      width:14px;height:14px;
      background:#2D7EF8;
      border:2.5px solid #fff;
      border-radius:50%;
      box-shadow:0 0 0 6px rgba(45,126,248,0.2);
    }
    .donor-pin{
      display:flex;align-items:center;justify-content:center;
      width:42px;height:42px;
      background:#E02020;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:3px solid #fff;
      box-shadow:0 4px 14px rgba(224,32,32,0.45);
      animation:pinDrop .45s cubic-bezier(0.175,0.885,0.32,1.275) forwards;
    }
    .donor-pin svg{transform:rotate(45deg)}
    @keyframes pinDrop{
      0%{transform:rotate(-45deg) scale(0) translateY(-20px);opacity:0}
      80%{transform:rotate(-45deg) scale(1.15) translateY(4px)}
      100%{transform:rotate(-45deg) scale(1) translateY(0);opacity:1}
    }
    .leaflet-popup-content-wrapper{
      border-radius:12px!important;
      font-family:system-ui,sans-serif;
      box-shadow:0 8px 24px rgba(0,0,0,0.18)!important;
    }
    .leaflet-popup-tip-container{display:none}
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var LAT = ${region.latitude};
  var LNG = ${region.longitude};
  var donors = ${donorsJson};

  // Init map
  var map = L.map('map',{
    zoomControl:false,
    attributionControl:false,
    zoomSnap:0
  }).setView([LAT,LNG],15.5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19
  }).addTo(map);

  // User location dot
  L.marker([LAT,LNG],{
    icon:L.divIcon({className:'',html:"<div class='user-dot'></div>",iconSize:[14,14],iconAnchor:[7,7]})
  }).addTo(map);

  // FIX: if no donors, send scanComplete immediately after tile load
  if(donors.length === 0){
    map.once('load', function(){
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'scanComplete'}));
    });
    // Also fire after a small delay as fallback (tiles may not fire 'load')
    setTimeout(function(){
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'scanComplete'}));
    }, 3000);
  }

  // Radar setup
  var RING_DURATION  = 2800;
  var MAX_RADIUS_PX  = 520;
  var RINGS_IN_FLIGHT = 3;

  var mapEl = document.getElementById('map');
  var rings = [];

  for(var i=0;i<RINGS_IN_FLIGHT;i++){
    var el=document.createElement('div');
    el.className='radar-ring';
    mapEl.appendChild(el);
    rings.push({el:el, offset:(RING_DURATION/RINGS_IN_FLIGHT)*i});
  }

  function updateRingPos(){
    var c=map.latLngToContainerPoint([LAT,LNG]);
    rings.forEach(function(r){
      r.el.style.left=c.x+'px';
      r.el.style.top=c.y+'px';
    });
  }

  var found=new Set();
  var startTime=performance.now();
  var scanDone=false;

  function animate(now){
    updateRingPos();
    var elapsed=now-startTime;

    rings.forEach(function(r){
      var t=((elapsed+r.offset)%RING_DURATION)/RING_DURATION;
      var px=t*MAX_RADIUS_PX;
      var alpha=0.55*(1-t);
      r.el.style.width =px*2+'px';
      r.el.style.height=px*2+'px';
      r.el.style.opacity=alpha;
    });

    if(donors.length > 0){
      var frontT=(elapsed%RING_DURATION)/RING_DURATION;
      var frontR=frontT*MAX_RADIUS_PX;
      var centre=map.latLngToContainerPoint([LAT,LNG]);

      donors.forEach(function(d){
        if(found.has(d.id))return;
        var pt=map.latLngToContainerPoint([d.lat,d.lng]);
        var dist=Math.hypot(pt.x-centre.x,pt.y-centre.y);
        if(dist<=frontR){
          found.add(d.id);

          var pinHtml="<div class='donor-pin'><svg width='18' height='18' viewBox='0 0 24 24' fill='none'><path d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z' fill='white'><\\/path><\\/svg><\\/div>";
          L.marker([d.lat,d.lng],{
            icon:L.divIcon({className:'',html:pinHtml,iconSize:[42,42],iconAnchor:[21,42]})
          }).addTo(map);

          window.ReactNativeWebView.postMessage(JSON.stringify({type:'donorFound',donorId:d.id}));
        }
      });

      if(found.size===donors.length && !scanDone && elapsed>RING_DURATION*2){
        scanDone=true;
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'scanComplete'}));
      }
    }

    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
<\/script>
</body>
</html>`;
  }, [region, donors, colors]);

  // ── Loading screen — only show while we don't have a region yet ────────────
  // FIX: don't gate on `loading` here — let map render as soon as region is known
  if (!region) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loaderText, { color: colors.subText }]}>
          Getting your location…
        </Text>
      </View>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* ── MAP ── */}
      {/* FIX: key prop forces WebView remount when region/donors change so map refreshes */}
      <WebView
        key={`map-${region.latitude}-${region.longitude}-${donors.length}`}
        source={{ html: mapHtml }}
        style={StyleSheet.absoluteFill}
        onMessage={handleWebViewMessage}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
        scrollEnabled={false}
        // FIX: allow mixed content and external tile servers
        mixedContentMode="always"
        allowsInlineMediaPlayback
        // FIX: allow the WebView to access external resources (OSM tiles, Leaflet CDN)
        allowUniversalAccessFromFileURLs
        allowFileAccessFromFileURLs
        geolocationEnabled={false}
        onError={(syntheticEvent) => {
          console.warn("WebView error:", syntheticEvent.nativeEvent);
        }}
        onHttpError={(syntheticEvent) => {
          console.warn("WebView HTTP error:", syntheticEvent.nativeEvent);
        }}
      />

      {/* ── Loading overlay while fetching donors (map is already visible) ── */}
      {loading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <View style={[styles.loadingPill, { backgroundColor: colors.elevated }]}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={[styles.loaderText, { color: colors.subText }]}>
              Locating donors…
            </Text>
          </View>
        </View>
      )}

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.elevated }]}
          onPress={() => router.back()}
          activeOpacity={0.75}
        >
          <MaterialIcons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={[styles.headerInfo, { backgroundColor: colors.elevated }]}>
          <View style={styles.headerRow}>
            <View
              style={[
                styles.bloodBadge,
                { backgroundColor: colors.accentDim },
              ]}
            >
              <MaterialCommunityIcons
                name="water"
                size={13}
                color={colors.accent}
              />
              <Text style={[styles.bloodType, { color: colors.accent }]}>
                {bloodType}
              </Text>
            </View>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    scanPhase === "done" ? "#22C55E" : colors.accent,
                },
              ]}
            />
          </View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Live Donor Scan
          </Text>
          <Text style={[styles.headerSub, { color: colors.subText }]}>
            {scanPhase === "done"
              ? `Found ${revealedCards.length} donor${
                  revealedCards.length !== 1 ? "s" : ""
                }`
              : `Scanning for ${bloodType} donors…`}
          </Text>
        </View>
      </View>

      {/* ── DONOR CARDS ── */}
      <View style={styles.cardStack} pointerEvents="box-none">
        {donors.map((donor, i) => {
          const anim = cardAnims[i];
          return (
            <Animated.View
              key={donor.id}
              style={[
                styles.card,
                {
                  backgroundColor: colors.elevated,
                  borderColor: colors.border,
                  opacity: anim.opacity,
                  transform: [
                    { translateY: anim.translateY },
                    { scale: anim.scale },
                  ],
                },
              ]}
            >
              {/* Blood type indicator */}
              <View
                style={[
                  styles.cardAccent,
                  { backgroundColor: colors.accentDim },
                ]}
              >
                <MaterialCommunityIcons
                  name="water"
                  size={18}
                  color={colors.accent}
                />
                <Text
                  style={[styles.cardBloodType, { color: colors.accent }]}
                >
                  {donor.blood_type}
                </Text>
              </View>

              {/* Name + distance */}
              <View style={styles.cardBody}>
                <Text style={[styles.donorName, { color: colors.text }]}>
                  {donor.name}
                </Text>
                <View style={styles.distRow}>
                  <MaterialIcons
                    name="near-me"
                    size={11}
                    color={colors.subText}
                  />
                  <Text style={[styles.distText, { color: colors.subText }]}>
                    {donor.distanceText} away
                  </Text>
                </View>
              </View>

              {/* Notify button */}
              <TouchableOpacity
                style={styles.notifyBtn}
                activeOpacity={0.8}
                onPress={() => {
                  /* TODO: send notification / open chat */
                }}
              >
                <MaterialIcons
                  name="notifications-none"
                  size={14}
                  color="#fff"
                />
                <Text style={styles.notifyTxt}>Notify</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}

        {/* Empty state — only show after scan completes AND no donors were found */}
        {donors.length === 0 && scanPhase === "done" && (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: colors.elevated,
                borderColor: colors.border,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="water-off"
              size={28}
              color={colors.subText}
            />
            <Text style={[styles.emptyText, { color: colors.subText }]}>
              No {bloodType} donors found nearby
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────
const CARD_RADIUS = 18;

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loaderText: { fontSize: 14, fontWeight: "500", marginTop: 4 },

  // FIX: overlay that sits above the map while donors load
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  loadingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },

  // Header
  header: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 28,
    left: 18,
    right: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    zIndex: 20,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  headerInfo: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    gap: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  bloodBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  bloodType: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerTitle: { fontSize: 15, fontWeight: "700", letterSpacing: -0.3 },
  headerSub: { fontSize: 12, fontWeight: "400" },

  // Donor card stack
  cardStack: {
    position: "absolute",
    bottom: 30,
    left: 16,
    right: 16,
    gap: 10,
    zIndex: 20,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 7,
    gap: 10,
  },
  cardAccent: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    gap: 1,
  },
  cardBloodType: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  cardBody: { flex: 1, gap: 3 },
  donorName: { fontSize: 14, fontWeight: "700", letterSpacing: -0.2 },
  distRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  distText: { fontSize: 11 },

  notifyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#E02020",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
  },
  notifyTxt: { color: "#fff", fontWeight: "700", fontSize: 12 },

  // Empty state
  emptyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
  },
  emptyText: { fontSize: 13, fontWeight: "500" },
});

export default DonorLiveMapScreen;