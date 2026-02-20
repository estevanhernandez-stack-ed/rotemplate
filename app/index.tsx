import React from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  Platform,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import type { TemplateType } from "@/constants/templates";

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const handleSelect = (type: TemplateType) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push({ pathname: "/editor", params: { type } });
  };

  return (
    <LinearGradient
      colors={["#0D1B2A", "#1B2838", "#1A1A2E"]}
      style={styles.gradient}
    >
      <View
        style={[
          styles.container,
          { paddingTop: topInset + 40, paddingBottom: bottomInset + 20 },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <MaterialCommunityIcons
              name="tshirt-crew"
              size={32}
              color={Colors.light.tint}
            />
            <Text style={styles.title}>RoTemplate</Text>
          </View>
          <Text style={styles.subtitle}>
            Create classic clothing templates for your Roblox avatar
          </Text>
        </View>

        <View style={styles.cards}>
          <Pressable
            style={({ pressed }) => [
              styles.card,
              pressed && styles.cardPressed,
            ]}
            onPress={() => handleSelect("shirt")}
          >
            <LinearGradient
              colors={["#00BCD4", "#0097A7"]}
              style={styles.cardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.cardIconContainer}>
                <MaterialCommunityIcons
                  name="tshirt-crew"
                  size={56}
                  color="rgba(255,255,255,0.9)"
                />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>Shirt Template</Text>
                <Text style={styles.cardDesc}>
                  Torso + Arms {"\u00B7"} 585x559px
                </Text>
              </View>
              <Ionicons
                name="arrow-forward"
                size={22}
                color="rgba(255,255,255,0.7)"
              />
            </LinearGradient>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.card,
              pressed && styles.cardPressed,
            ]}
            onPress={() => handleSelect("pants")}
          >
            <LinearGradient
              colors={["#FF6B6B", "#E94560"]}
              style={styles.cardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.cardIconContainer}>
                <MaterialCommunityIcons
                  name="shoe-formal"
                  size={56}
                  color="rgba(255,255,255,0.9)"
                />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>Pants Template</Text>
                <Text style={styles.cardDesc}>
                  Torso + Legs {"\u00B7"} 585x559px
                </Text>
              </View>
              <Ionicons
                name="arrow-forward"
                size={22}
                color="rgba(255,255,255,0.7)"
              />
            </LinearGradient>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Ionicons name="information-circle-outline" size={16} color="#5A6B80" />
          <Text style={styles.footerText}>
            Templates follow official Roblox R15 dimensions
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  header: {
    marginBottom: 48,
    gap: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#8899AA",
    lineHeight: 24,
  },
  cards: {
    gap: 16,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  cardPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  cardGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 24,
    gap: 16,
  },
  cardIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  cardDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 40,
    justifyContent: "center",
  },
  footerText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#5A6B80",
  },
});
