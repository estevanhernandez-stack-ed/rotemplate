import React, { useState, useRef, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  Pressable,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as MediaLibrary from "expo-media-library";
import { captureRef } from "react-native-view-shot";
import * as FileSystem from "expo-file-system";
import Colors from "@/constants/colors";
import {
  SHIRT_REGIONS,
  PANTS_REGIONS,
  GROUP_LABELS,
  type TemplateType,
  type BodyRegion,
} from "@/constants/templates";
import TemplateCanvas from "@/components/TemplateCanvas";
import ColorPicker from "@/components/ColorPicker";
import GroupActions from "@/components/GroupActions";
import ExportCanvas from "@/components/ExportCanvas";

export default function EditorScreen() {
  const { type } = useLocalSearchParams<{ type: TemplateType }>();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const templateType: TemplateType = type === "pants" ? "pants" : "shirt";
  const regions = templateType === "pants" ? PANTS_REGIONS : SHIRT_REGIONS;

  const [colorMap, setColorMap] = useState<Record<string, string>>({});
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>("#E94560");
  const [isSaving, setIsSaving] = useState(false);
  const exportRef = useRef<View>(null);

  const [mediaPermission, requestMediaPermission] =
    MediaLibrary.usePermissions();

  const selectedRegionInfo = useMemo(() => {
    if (!selectedRegion) return null;
    return regions.find((r) => r.id === selectedRegion) || null;
  }, [selectedRegion, regions]);

  const handleRegionPress = useCallback(
    (regionId: string) => {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      if (selectedRegion === regionId) {
        setColorMap((prev) => ({ ...prev, [regionId]: selectedColor }));
      } else {
        setSelectedRegion(regionId);
      }
    },
    [selectedRegion, selectedColor]
  );

  const handleColorSelect = useCallback(
    (color: string) => {
      setSelectedColor(color);
      if (selectedRegion) {
        setColorMap((prev) => ({ ...prev, [selectedRegion]: color }));
      }
    },
    [selectedRegion]
  );

  const handleFillGroup = useCallback(
    (groupId: string, color: string) => {
      setColorMap((prev) => {
        const next = { ...prev };
        regions
          .filter((r) => r.group === groupId)
          .forEach((r) => {
            next[r.id] = color;
          });
        return next;
      });
    },
    [regions]
  );

  const handleFillAll = useCallback(
    (color: string) => {
      setColorMap((prev) => {
        const next = { ...prev };
        regions.forEach((r) => {
          next[r.id] = color;
        });
        return next;
      });
    },
    [regions]
  );

  const handleClearAll = useCallback(() => {
    setColorMap({});
    setSelectedRegion(null);
  }, []);

  const handleExport = useCallback(async () => {
    if (Platform.OS === "web") {
      Alert.alert("Export", "Export is only available on mobile devices.");
      return;
    }

    try {
      setIsSaving(true);

      if (!mediaPermission?.granted) {
        const perm = await requestMediaPermission();
        if (!perm.granted) {
          Alert.alert(
            "Permission Required",
            "Please grant photo library access to save templates."
          );
          setIsSaving(false);
          return;
        }
      }

      const uri = await captureRef(exportRef, {
        format: "png",
        quality: 1,
        width: 585,
        height: 559,
      });

      await MediaLibrary.saveToLibraryAsync(uri);

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      Alert.alert(
        "Saved!",
        `Your ${templateType} template has been saved to your photo library at 585x559px.`
      );
    } catch (err) {
      console.error("Export error:", err);
      Alert.alert("Error", "Failed to save the template. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [mediaPermission, templateType]);

  const filledCount = Object.values(colorMap).filter(
    (c) => c && c !== "transparent"
  ).length;

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backBtn,
            pressed && styles.btnPressed,
          ]}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.light.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {templateType === "shirt" ? "Shirt" : "Pants"} Editor
          </Text>
          <Text style={styles.headerSubtitle}>
            {filledCount}/{regions.length} regions filled
          </Text>
        </View>
        <Pressable
          onPress={handleExport}
          disabled={isSaving}
          style={({ pressed }) => [
            styles.exportBtn,
            pressed && styles.btnPressed,
            isSaving && styles.disabledBtn,
          ]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="download-outline" size={22} color="#fff" />
          )}
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomInset + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {selectedRegionInfo && (
          <View style={styles.selectionBanner}>
            <View style={styles.selectionInfo}>
              <Ionicons
                name="locate"
                size={16}
                color={Colors.light.tint}
              />
              <Text style={styles.selectionText}>
                {GROUP_LABELS[selectedRegionInfo.group] || selectedRegionInfo.group}
                {" \u00B7 "}
                {selectedRegionInfo.label}
              </Text>
            </View>
            <Text style={styles.selectionHint}>Tap again to fill</Text>
          </View>
        )}

        <TemplateCanvas
          regions={regions}
          colorMap={colorMap}
          selectedRegion={selectedRegion}
          onRegionPress={handleRegionPress}
        />

        <View style={styles.toolsCard}>
          <ColorPicker
            selectedColor={selectedColor}
            onColorSelect={handleColorSelect}
          />
        </View>

        <View style={styles.toolsCard}>
          <GroupActions
            regions={regions}
            selectedColor={selectedColor}
            templateType={templateType}
            onFillGroup={handleFillGroup}
            onFillAll={handleFillAll}
            onClearAll={handleClearAll}
          />
        </View>
      </ScrollView>

      <ExportCanvas
        ref={exportRef}
        regions={regions}
        colorMap={colorMap}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.surfaceSecondary,
  },
  btnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  headerCenter: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  exportBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.tint,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  selectionBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0, 188, 212, 0.08)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0, 188, 212, 0.2)",
  },
  selectionInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  selectionText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.tint,
  },
  selectionHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  toolsCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
});
