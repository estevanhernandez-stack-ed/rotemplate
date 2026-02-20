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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as MediaLibrary from "expo-media-library";
import { captureRef } from "react-native-view-shot";
import Colors from "@/constants/colors";
import {
  SHIRT_REGIONS,
  PANTS_REGIONS,
  GROUP_LABELS,
  type TemplateType,
} from "@/constants/templates";
import TemplateCanvas, { type Stroke } from "@/components/TemplateCanvas";
import ColorPicker from "@/components/ColorPicker";
import GroupActions from "@/components/GroupActions";
import ExportCanvas from "@/components/ExportCanvas";

type EditorMode = "fill" | "draw";

const BRUSH_SIZES = [2, 5, 10, 18, 30];

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
  const [mode, setMode] = useState<EditorMode>("fill");
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [brushSize, setBrushSize] = useState(5);
  const currentPathRef = useRef<string[]>([]);
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
      if (selectedRegion && mode === "fill") {
        setColorMap((prev) => ({ ...prev, [selectedRegion]: color }));
      }
    },
    [selectedRegion, mode]
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
    setStrokes([]);
    setSelectedRegion(null);
  }, []);

  const handleStrokeStart = useCallback(() => {
    currentPathRef.current = [];
  }, []);

  const handleStrokeMove = useCallback((x: number, y: number) => {
    const pts = currentPathRef.current;
    if (pts.length === 0) {
      pts.push(`M ${x.toFixed(1)} ${y.toFixed(1)}`);
    } else {
      pts.push(`L ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    const pathStr = pts.join(" ");
    setStrokes((prev) => {
      const existing = [...prev];
      if (
        existing.length > 0 &&
        existing[existing.length - 1].path.startsWith(pts[0])
      ) {
        existing[existing.length - 1] = {
          ...existing[existing.length - 1],
          path: pathStr,
        };
      } else {
        existing.push({
          path: pathStr,
          color: selectedColor === "transparent" ? "#000000" : selectedColor,
          width: brushSize,
        });
      }
      return existing;
    });
  }, [selectedColor, brushSize]);

  const handleStrokeEnd = useCallback(() => {
    currentPathRef.current = [];
  }, []);

  const handleUndo = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (mode === "draw") {
      setStrokes((prev) => prev.slice(0, -1));
    }
  }, [mode]);

  const handleModeToggle = useCallback(
    (newMode: EditorMode) => {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      setMode(newMode);
      if (newMode === "draw") {
        setSelectedRegion(null);
      }
    },
    []
  );

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
            styles.headerIconBtn,
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
            {filledCount} filled {"\u00B7"} {strokes.length} strokes
          </Text>
        </View>
        <Pressable
          onPress={handleExport}
          disabled={isSaving}
          style={({ pressed }) => [
            styles.headerIconBtn,
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

      <View style={styles.modeBar}>
        <View style={styles.modeToggle}>
          <Pressable
            onPress={() => handleModeToggle("fill")}
            style={[
              styles.modeBtn,
              mode === "fill" && styles.modeBtnActive,
            ]}
          >
            <Ionicons
              name="color-fill"
              size={18}
              color={mode === "fill" ? "#fff" : Colors.light.textSecondary}
            />
            <Text
              style={[
                styles.modeBtnText,
                mode === "fill" && styles.modeBtnTextActive,
              ]}
            >
              Fill
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleModeToggle("draw")}
            style={[
              styles.modeBtn,
              mode === "draw" && styles.modeBtnActive,
            ]}
          >
            <MaterialCommunityIcons
              name="draw"
              size={18}
              color={mode === "draw" ? "#fff" : Colors.light.textSecondary}
            />
            <Text
              style={[
                styles.modeBtnText,
                mode === "draw" && styles.modeBtnTextActive,
              ]}
            >
              Draw
            </Text>
          </Pressable>
        </View>

        {mode === "draw" && (
          <View style={styles.drawTools}>
            <View style={styles.brushRow}>
              {BRUSH_SIZES.map((size) => (
                <Pressable
                  key={size}
                  onPress={() => {
                    setBrushSize(size);
                    if (Platform.OS !== "web") {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                  style={[
                    styles.brushBtn,
                    brushSize === size && styles.brushBtnActive,
                  ]}
                >
                  <View
                    style={[
                      styles.brushDot,
                      {
                        width: Math.min(size + 4, 24),
                        height: Math.min(size + 4, 24),
                        borderRadius: Math.min(size + 4, 24) / 2,
                        backgroundColor:
                          brushSize === size
                            ? "#fff"
                            : Colors.light.textSecondary,
                      },
                    ]}
                  />
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={handleUndo}
              disabled={strokes.length === 0}
              style={({ pressed }) => [
                styles.undoBtn,
                pressed && styles.btnPressed,
                strokes.length === 0 && styles.disabledBtn,
              ]}
            >
              <Ionicons
                name="arrow-undo"
                size={20}
                color={
                  strokes.length === 0
                    ? Colors.light.border
                    : Colors.light.tint
                }
              />
            </Pressable>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomInset + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={mode !== "draw"}
      >
        {mode === "fill" && selectedRegionInfo && (
          <View style={styles.selectionBanner}>
            <View style={styles.selectionInfo}>
              <Ionicons name="locate" size={16} color={Colors.light.tint} />
              <Text style={styles.selectionText}>
                {GROUP_LABELS[selectedRegionInfo.group] ||
                  selectedRegionInfo.group}
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
          mode={mode}
          strokes={strokes}
          drawColor={selectedColor}
          brushSize={brushSize}
          onStrokeStart={handleStrokeStart}
          onStrokeMove={handleStrokeMove}
          onStrokeEnd={handleStrokeEnd}
        />

        <View style={styles.toolsCard}>
          <ColorPicker
            selectedColor={selectedColor}
            onColorSelect={handleColorSelect}
          />
        </View>

        {mode === "fill" && (
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
        )}

        {mode === "draw" && (
          <View style={styles.toolsCard}>
            <View style={styles.drawHintRow}>
              <Ionicons
                name="finger-print"
                size={20}
                color={Colors.light.tint}
              />
              <Text style={styles.drawHintText}>
                Draw directly on the template above. Strokes are clipped to the
                clothing regions. Use undo to remove the last stroke.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <ExportCanvas
        ref={exportRef}
        regions={regions}
        colorMap={colorMap}
        strokes={strokes}
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
    paddingVertical: 10,
    gap: 12,
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtn: {
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
    backgroundColor: Colors.light.tint,
  },
  disabledBtn: {
    opacity: 0.4,
  },
  modeBar: {
    backgroundColor: Colors.light.surface,
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: Colors.light.surfaceSecondary,
    borderRadius: 10,
    padding: 3,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  modeBtnActive: {
    backgroundColor: Colors.light.tint,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  modeBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.textSecondary,
  },
  modeBtnTextActive: {
    color: "#fff",
  },
  drawTools: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brushRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  brushBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.surfaceSecondary,
  },
  brushBtnActive: {
    backgroundColor: Colors.light.tint,
  },
  brushDot: {
    backgroundColor: Colors.light.textSecondary,
  },
  undoBtn: {
    width: 40,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.light.border,
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
  drawHintRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  drawHintText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
});
