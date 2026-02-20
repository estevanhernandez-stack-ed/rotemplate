import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  Platform,
  Dimensions,
  ScrollView,
  Modal,
  Linking,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import type { TemplateType } from "@/constants/templates";

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const [showUploadGuide, setShowUploadGuide] = useState(false);

  const handleSelect = (type: TemplateType) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push({ pathname: "/editor", params: { type } });
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#0E1117", "#131820", "#0E1117"]}
        style={styles.gradient}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.container,
            { paddingTop: topInset + 32, paddingBottom: bottomInset + 20 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={["#00BCD4", "#0097A7"]}
                style={styles.logoBg}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons
                  name="tshirt-crew"
                  size={28}
                  color="#fff"
                />
              </LinearGradient>
            </View>
            <Text style={styles.title}>RoTemplate</Text>
            <Text style={styles.subtitle}>
              Design R15 classic clothing templates for Roblox
            </Text>
          </View>

          <View style={styles.cards}>
            <Pressable
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
              onPress={() => handleSelect("shirt")}
              testID="shirt-card"
            >
              <LinearGradient
                colors={["#1C2330", "#1A2535"]}
                style={styles.cardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.cardLeft}>
                  <View style={[styles.cardIconContainer, { backgroundColor: "rgba(0, 188, 212, 0.12)" }]}>
                    <MaterialCommunityIcons
                      name="tshirt-crew"
                      size={32}
                      color="#00BCD4"
                    />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>Shirt Template</Text>
                    <Text style={styles.cardDesc}>Torso + Arms</Text>
                  </View>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.cardDim}>585x559px</Text>
                  <View style={styles.cardArrow}>
                    <Ionicons name="arrow-forward" size={18} color="#00BCD4" />
                  </View>
                </View>
              </LinearGradient>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
              onPress={() => handleSelect("pants")}
              testID="pants-card"
            >
              <LinearGradient
                colors={["#1C2330", "#231A28"]}
                style={styles.cardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.cardLeft}>
                  <View style={[styles.cardIconContainer, { backgroundColor: "rgba(124, 58, 237, 0.12)" }]}>
                    <MaterialCommunityIcons
                      name="shoe-formal"
                      size={32}
                      color="#7C3AED"
                    />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>Pants Template</Text>
                    <Text style={styles.cardDesc}>Torso + Legs</Text>
                  </View>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.cardDim}>585x559px</Text>
                  <View style={[styles.cardArrow, { backgroundColor: "rgba(124, 58, 237, 0.1)" }]}>
                    <Ionicons name="arrow-forward" size={18} color="#7C3AED" />
                  </View>
                </View>
              </LinearGradient>
            </Pressable>
          </View>

          <View style={styles.featureGrid}>
            <View style={styles.featureItem}>
              <Ionicons name="color-fill" size={20} color="#00BCD4" />
              <Text style={styles.featureText}>Fill regions</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="draw" size={20} color="#7C3AED" />
              <Text style={styles.featureText}>Freehand draw</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="sparkles" size={20} color="#FF9800" />
              <Text style={styles.featureText}>AI generation</Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.uploadGuideBtn,
              pressed && styles.cardPressed,
            ]}
            onPress={() => setShowUploadGuide(true)}
            testID="upload-guide-btn"
          >
            <Ionicons name="cloud-upload-outline" size={20} color="#00BCD4" />
            <Text style={styles.uploadGuideBtnText}>How to Upload to Roblox</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.light.textSecondary} />
          </Pressable>

          <View style={styles.footer}>
            <View style={styles.footerBadge}>
              <Text style={styles.footerBadgeText}>R15</Text>
            </View>
            <Text style={styles.footerText}>
              Official Roblox template dimensions
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>

      <Modal
        visible={showUploadGuide}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowUploadGuide(false)}
      >
        <UploadGuideContent onClose={() => setShowUploadGuide(false)} />
      </Modal>
    </View>
  );
}

function UploadGuideContent({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const steps = [
    {
      number: "1",
      title: "Export Your Template",
      desc: "Use the download button in the editor to save your 585x559px PNG file.",
      icon: "download-outline" as const,
      color: "#00BCD4",
    },
    {
      number: "2",
      title: "Go to Roblox Creator Hub",
      desc: "Visit create.roblox.com and sign in to your Roblox account.",
      icon: "globe-outline" as const,
      color: "#7C3AED",
      link: "https://create.roblox.com",
    },
    {
      number: "3",
      title: "Navigate to Creations",
      desc: "Click \"Creations\" in the left sidebar, then go to Avatar Items > Classics.",
      icon: "navigate-outline" as const,
      color: "#FF9800",
    },
    {
      number: "4",
      title: "Select Classic Type",
      desc: "Use the \"Classic Type\" dropdown to choose either Classic Shirts or Classic Pants.",
      icon: "list-outline" as const,
      color: "#4CAF50",
    },
    {
      number: "5",
      title: "Upload Your Asset",
      desc: "Click \"Upload Asset\", then choose your exported PNG file. Accepted formats: .jpg, .png, .tga, .bmp (max 20MB).",
      icon: "cloud-upload-outline" as const,
      color: "#00BCD4",
    },
    {
      number: "6",
      title: "Name & Describe",
      desc: "Enter a name (up to 50 characters) and description (up to 1000 characters) for your clothing item.",
      icon: "create-outline" as const,
      color: "#7C3AED",
    },
    {
      number: "7",
      title: "Pay & Upload",
      desc: "Uploading costs 10 Robux. Click \"Upload\" to submit. Your item will be visible after Roblox moderation review.",
      icon: "checkmark-circle-outline" as const,
      color: "#4CAF50",
    },
  ];

  return (
    <View style={[guideStyles.container, { backgroundColor: Colors.light.background }]}>
      <View style={[guideStyles.header, { paddingTop: topInset + 8 }]}>
        <Text style={guideStyles.headerTitle}>Upload to Roblox</Text>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            guideStyles.closeBtn,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons name="close" size={24} color={Colors.light.text} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[guideStyles.scrollContent, { paddingBottom: bottomInset + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={guideStyles.introBanner}>
          <LinearGradient
            colors={["rgba(0,188,212,0.08)", "rgba(124,58,237,0.06)"]}
            style={guideStyles.introBannerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="shirt-outline" size={24} color="#00BCD4" />
            <Text style={guideStyles.introText}>
              After designing your template, follow these steps to get it on your Roblox avatar.
            </Text>
          </LinearGradient>
        </View>

        {steps.map((step, i) => (
          <Pressable
            key={i}
            style={guideStyles.stepCard}
            onPress={step.link ? () => Linking.openURL(step.link!) : undefined}
          >
            <View style={[guideStyles.stepNumber, { backgroundColor: step.color + "18" }]}>
              <Ionicons name={step.icon} size={20} color={step.color} />
            </View>
            <View style={guideStyles.stepContent}>
              <Text style={guideStyles.stepTitle}>{step.title}</Text>
              <Text style={guideStyles.stepDesc}>{step.desc}</Text>
              {step.link && (
                <View style={guideStyles.linkRow}>
                  <Ionicons name="open-outline" size={14} color="#00BCD4" />
                  <Text style={guideStyles.linkText}>Open Creator Hub</Text>
                </View>
              )}
            </View>
          </Pressable>
        ))}

        <View style={guideStyles.tipsCard}>
          <Text style={guideStyles.tipsTitle}>Tips</Text>
          <View style={guideStyles.tipRow}>
            <Ionicons name="checkmark" size={16} color="#4CAF50" />
            <Text style={guideStyles.tipText}>Templates must be exactly 585x559 pixels (already handled by RoTemplate)</Text>
          </View>
          <View style={guideStyles.tipRow}>
            <Ionicons name="checkmark" size={16} color="#4CAF50" />
            <Text style={guideStyles.tipText}>PNG format with transparency works best</Text>
          </View>
          <View style={guideStyles.tipRow}>
            <Ionicons name="checkmark" size={16} color="#4CAF50" />
            <Text style={guideStyles.tipText}>Moderation usually takes a few minutes</Text>
          </View>
          <View style={guideStyles.tipRow}>
            <Ionicons name="warning" size={16} color="#FF9800" />
            <Text style={guideStyles.tipText}>Avoid copyrighted logos or inappropriate content</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const guideStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: Colors.light.surface,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: 20,
    gap: 12,
  },
  introBanner: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 4,
  },
  introBannerGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  introText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  stepCard: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  stepNumber: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stepContent: {
    flex: 1,
    gap: 4,
  },
  stepTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  stepDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    lineHeight: 19,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  linkText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#00BCD4",
  },
  tipsCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginTop: 4,
  },
  tipsTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
    marginBottom: 2,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  gradient: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
    gap: 12,
  },
  logoContainer: {
    marginBottom: 4,
  },
  logoBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00BCD4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  title: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  cards: {
    gap: 12,
    marginBottom: 24,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  cardPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.85,
  },
  cardGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  cardIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    gap: 3,
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  cardDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  cardRight: {
    alignItems: "flex-end",
    gap: 8,
  },
  cardDim: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textSecondary,
    letterSpacing: 0.3,
  },
  cardArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(0, 188, 212, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureGrid: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  featureItem: {
    alignItems: "center",
    gap: 6,
  },
  featureText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textSecondary,
  },
  uploadGuideBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 24,
  },
  uploadGuideBtnText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  },
  footerBadge: {
    backgroundColor: "rgba(0, 188, 212, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  footerBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#00BCD4",
    letterSpacing: 0.5,
  },
  footerText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
});
