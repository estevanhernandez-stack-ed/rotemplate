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
  TextInput,
  Modal,
  Linking,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as MediaLibrary from "expo-media-library";
import { captureRef } from "react-native-view-shot";
import * as LegacyFileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import Colors from "@/constants/colors";
import {
  SHIRT_REGIONS,
  PANTS_REGIONS,
  GROUP_LABELS,
  TEMPLATE_WIDTH,
  TEMPLATE_HEIGHT,
  type TemplateType,
} from "@/constants/templates";
import TemplateCanvas, { type Stroke } from "@/components/TemplateCanvas";
import ColorPicker from "@/components/ColorPicker";
import GroupActions from "@/components/GroupActions";
import ExportCanvas from "@/components/ExportCanvas";
import { apiRequest } from "@/lib/query-client";

type EditorMode = "fill" | "draw" | "ai";

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

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiImageBase64, setAiImageBase64] = useState<string | null>(null);
  const [showUploadGuide, setShowUploadGuide] = useState(false);

  type InterviewQuestion = { id: string; question: string; options: string[] };
  const [interviewQuestions, setInterviewQuestions] = useState<InterviewQuestion[]>([]);
  const [interviewAnswers, setInterviewAnswers] = useState<Record<string, string>>({});
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [showInterview, setShowInterview] = useState(false);

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
    setAiImageBase64(null);
  }, []);

  const handleStrokeStart = useCallback(() => {
    currentPathRef.current = [];
  }, []);

  const handleStrokeMove = useCallback(
    (x: number, y: number) => {
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
    },
    [selectedColor, brushSize]
  );

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

  const handleModeToggle = useCallback((newMode: EditorMode) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setMode(newMode);
    if (newMode === "draw") {
      setSelectedRegion(null);
    }
  }, []);

  const handleStartInterview = useCallback(async () => {
    if (!aiPrompt.trim()) return;

    try {
      setInterviewLoading(true);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const res = await apiRequest("POST", "/api/design-interview", {
        prompt: aiPrompt.trim(),
        templateType,
      });
      const data = await res.json();

      if (data.questions && data.questions.length > 0) {
        setInterviewQuestions(data.questions);
        setInterviewAnswers({});
        setShowInterview(true);
      } else {
        handleAiGenerate();
      }
    } catch (err: any) {
      console.error("Interview error:", err);
      handleAiGenerate();
    } finally {
      setInterviewLoading(false);
    }
  }, [aiPrompt, templateType]);

  const handleSelectAnswer = useCallback((questionId: string, option: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setInterviewAnswers((prev) => {
      if (prev[questionId] === option) {
        const next = { ...prev };
        delete next[questionId];
        return next;
      }
      return { ...prev, [questionId]: option };
    });
  }, []);

  const handleGenerateFromInterview = useCallback(async () => {
    const contextParts = interviewQuestions
      .filter((q) => interviewAnswers[q.id])
      .map((q) => `${q.question}: ${interviewAnswers[q.id]}`);
    const designContext = contextParts.join(". ");

    try {
      setAiLoading(true);
      setShowInterview(false);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const res = await apiRequest("POST", "/api/generate-template", {
        prompt: aiPrompt.trim(),
        templateType,
        designContext,
      });
      const data = await res.json();

      if (data.image) {
        setAiImageBase64(data.image);
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        Alert.alert("Error", data.error || "Failed to generate image");
      }
    } catch (err: any) {
      console.error("AI generation error:", err);
      Alert.alert("Error", "Failed to generate design. Please try again.");
    } finally {
      setAiLoading(false);
    }
  }, [aiPrompt, templateType, interviewQuestions, interviewAnswers]);

  const handleAiGenerate = useCallback(async () => {
    if (!aiPrompt.trim()) return;

    try {
      setAiLoading(true);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const res = await apiRequest("POST", "/api/generate-template", {
        prompt: aiPrompt.trim(),
        templateType,
      });
      const data = await res.json();

      if (data.image) {
        setAiImageBase64(data.image);
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        Alert.alert("Error", data.error || "Failed to generate image");
      }
    } catch (err: any) {
      console.error("AI generation error:", err);
      Alert.alert("Error", "Failed to generate design. Please try again.");
    } finally {
      setAiLoading(false);
    }
  }, [aiPrompt, templateType]);

  const downloadBase64 = useCallback(
    async (base64: string) => {
      if (Platform.OS === "web") {
        const link = document.createElement("a");
        link.href = `data:image/png;base64,${base64}`;
        link.download = `roblox_${templateType}_template.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        Alert.alert(
          "Downloaded!",
          `Your ${templateType} template (${TEMPLATE_WIDTH}x${TEMPLATE_HEIGHT}px) has been downloaded.`
        );
      } else {
        const fileUri = `${LegacyFileSystem.cacheDirectory}roblox_${templateType}_template.png`;
        await LegacyFileSystem.writeAsStringAsync(fileUri, base64, {
          encoding: LegacyFileSystem.EncodingType.Base64,
        });

        const sharingAvailable = await Sharing.isAvailableAsync();
        if (sharingAvailable) {
          await Sharing.shareAsync(fileUri, {
            mimeType: "image/png",
            dialogTitle: "Save your Roblox template",
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          try {
            if (!mediaPermission?.granted) {
              const perm = await requestMediaPermission();
              if (!perm.granted) {
                Alert.alert("Permission Required", "Please grant photo library access to save templates.");
                return;
              }
            }
            await MediaLibrary.saveToLibraryAsync(fileUri);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
              "Saved!",
              `Your ${templateType} template (${TEMPLATE_WIDTH}x${TEMPLATE_HEIGHT}px) has been saved to your photo library.`
            );
          } catch (saveErr) {
            Alert.alert("Could Not Save", "Unable to save to photo library. Please try using the share option.");
          }
        }
      }
    },
    [mediaPermission, templateType]
  );

  const handleExport = useCallback(async () => {
    try {
      setIsSaving(true);

      if (aiImageBase64) {
        await downloadBase64(aiImageBase64);
      } else {
        const res = await apiRequest("POST", "/api/composite-fill", {
          colorMap,
          strokes,
          templateType,
        });
        const data = await res.json();
        if (data.image) {
          await downloadBase64(data.image);
        } else {
          Alert.alert("Error", "Failed to generate template image.");
        }
      }
    } catch (err: any) {
      console.error("Export error:", err);
      const msg = err?.message || String(err);
      Alert.alert("Export Error", msg);
    } finally {
      setIsSaving(false);
    }
  }, [mediaPermission, templateType, aiImageBase64, colorMap, strokes, downloadBase64]);

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
            {TEMPLATE_WIDTH}x{TEMPLATE_HEIGHT}px
          </Text>
        </View>
        <Pressable
          onPress={() => setShowUploadGuide(true)}
          style={({ pressed }) => [
            styles.headerIconBtn,
            styles.infoBtn,
            pressed && styles.btnPressed,
          ]}
        >
          <Ionicons name="help-circle-outline" size={22} color={Colors.light.tint} />
        </Pressable>
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
          {(["fill", "draw", "ai"] as EditorMode[]).map((m) => {
            const icons = { fill: "color-fill", draw: "brush", ai: "sparkles" } as const;
            const labels = { fill: "Fill", draw: "Draw", ai: "AI" };
            const isActive = mode === m;
            return (
              <Pressable
                key={m}
                onPress={() => handleModeToggle(m)}
                style={[styles.modeBtn, isActive && styles.modeBtnActive]}
              >
                <Ionicons
                  name={icons[m] as any}
                  size={16}
                  color={isActive ? "#fff" : Colors.light.textSecondary}
                />
                <Text style={[styles.modeBtnText, isActive && styles.modeBtnTextActive]}>
                  {labels[m]}
                </Text>
              </Pressable>
            );
          })}
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
                          brushSize === size ? "#fff" : Colors.light.textSecondary,
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
                color={strokes.length === 0 ? Colors.light.border : Colors.light.tint}
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

        {mode !== "ai" && (
          <TemplateCanvas
            regions={regions}
            colorMap={colorMap}
            selectedRegion={selectedRegion}
            onRegionPress={handleRegionPress}
            mode={mode === "fill" ? "fill" : "draw"}
            strokes={strokes}
            drawColor={selectedColor}
            brushSize={brushSize}
            onStrokeStart={handleStrokeStart}
            onStrokeMove={handleStrokeMove}
            onStrokeEnd={handleStrokeEnd}
          />
        )}

        {mode === "ai" && (
          <View style={styles.aiSection}>
            <View style={styles.aiInputRow}>
              <TextInput
                style={styles.aiInput}
                placeholder={`Describe your ${templateType} design...`}
                placeholderTextColor="#555"
                value={aiPrompt}
                onChangeText={setAiPrompt}
                multiline
                maxLength={500}
                editable={!aiLoading}
              />
            </View>
            <Pressable
              onPress={handleStartInterview}
              disabled={aiLoading || interviewLoading || !aiPrompt.trim()}
              style={({ pressed }) => [
                styles.aiGenerateBtn,
                pressed && styles.btnPressed,
                (aiLoading || interviewLoading || !aiPrompt.trim()) && styles.disabledBtn,
              ]}
            >
              {aiLoading ? (
                <View style={styles.aiLoadingRow}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.aiGenerateBtnText}>Generating...</Text>
                </View>
              ) : interviewLoading ? (
                <View style={styles.aiLoadingRow}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.aiGenerateBtnText}>Setting up design...</Text>
                </View>
              ) : (
                <View style={styles.aiLoadingRow}>
                  <Ionicons name="sparkles" size={18} color="#fff" />
                  <Text style={styles.aiGenerateBtnText}>Design with AI</Text>
                </View>
              )}
            </Pressable>

            {showInterview && interviewQuestions.length > 0 && (
              <View style={styles.interviewContainer}>
                <View style={styles.interviewHeader}>
                  <Ionicons name="chatbubbles" size={20} color={Colors.light.tint} />
                  <Text style={styles.interviewTitle}>Quick Design Check</Text>
                </View>
                <Text style={styles.interviewSubtitle}>
                  Help us nail the vibe — pick what fits your vision
                </Text>

                {interviewQuestions.map((q) => (
                  <View key={q.id} style={styles.interviewQuestion}>
                    <Text style={styles.interviewQuestionText}>{q.question}</Text>
                    <View style={styles.interviewOptions}>
                      {(Array.isArray(q.options) ? q.options : []).map((option) => (
                        <Pressable
                          key={option}
                          onPress={() => handleSelectAnswer(q.id, option)}
                          style={({ pressed }) => [
                            styles.interviewOption,
                            interviewAnswers[q.id] === option && styles.interviewOptionSelected,
                            pressed && styles.btnPressed,
                          ]}
                        >
                          <Text
                            style={[
                              styles.interviewOptionText,
                              interviewAnswers[q.id] === option && styles.interviewOptionTextSelected,
                            ]}
                          >
                            {option}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ))}

                <View style={styles.interviewActions}>
                  <Pressable
                    disabled={aiLoading}
                    onPress={() => {
                      setShowInterview(false);
                      setInterviewQuestions([]);
                      handleAiGenerate();
                    }}
                    style={({ pressed }) => [
                      styles.interviewSkipBtn,
                      pressed && styles.btnPressed,
                      aiLoading && styles.disabledBtn,
                    ]}
                  >
                    <Text style={styles.interviewSkipText}>Skip & Generate</Text>
                  </Pressable>
                  <Pressable
                    disabled={aiLoading}
                    onPress={handleGenerateFromInterview}
                    style={({ pressed }) => [
                      styles.interviewGenerateBtn,
                      pressed && styles.btnPressed,
                      aiLoading && styles.disabledBtn,
                    ]}
                  >
                    <Ionicons name="sparkles" size={16} color="#fff" />
                    <Text style={styles.interviewGenerateBtnText}>Generate</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {aiImageBase64 && (
              <View style={styles.aiPreviewContainer}>
                <Text style={styles.aiPreviewLabel}>
                  Template Preview ({TEMPLATE_WIDTH}x{TEMPLATE_HEIGHT}px)
                </Text>
                <View style={styles.aiPreviewWrapper}>
                  {Platform.OS === "web" ? (
                    <View style={styles.checkerboardBg}>
                      <img
                        src={`data:image/png;base64,${aiImageBase64}`}
                        style={{
                          width: "100%",
                          height: "auto",
                          aspectRatio: `${TEMPLATE_WIDTH}/${TEMPLATE_HEIGHT}`,
                          borderRadius: 8,
                          imageRendering: "pixelated" as any,
                        }}
                        alt="Generated template"
                      />
                    </View>
                  ) : (
                    <View style={styles.aiPreviewImage}>
                      <Text style={styles.aiPreviewNote}>
                        Template ready! Tap the download button above to save the {TEMPLATE_WIDTH}x{TEMPLATE_HEIGHT}px PNG for Roblox upload.
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.aiInfoRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                  <Text style={styles.aiInfoText}>
                    Ready for Roblox! This is a properly formatted {TEMPLATE_WIDTH}x{TEMPLATE_HEIGHT}px template with transparent background.
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.toolsCard}>
              <Text style={styles.aiSuggestionsLabel}>Prompt Ideas</Text>
              <View style={styles.aiSuggestions}>
                {getPromptSuggestions(templateType).map((suggestion, i) => (
                  <Pressable
                    key={i}
                    onPress={() => setAiPrompt(suggestion)}
                    style={({ pressed }) => [
                      styles.suggestionChip,
                      pressed && styles.btnPressed,
                    ]}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        )}

        {(mode === "fill" || mode === "draw") && (
          <View style={styles.toolsCard}>
            <ColorPicker
              selectedColor={selectedColor}
              onColorSelect={handleColorSelect}
            />
          </View>
        )}

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
              <Ionicons name="finger-print" size={20} color={Colors.light.tint} />
              <Text style={styles.drawHintText}>
                Draw directly on the template above. Strokes are clipped to the
                clothing regions. Use undo to remove the last stroke.
              </Text>
            </View>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.uploadGuideBtnInline,
            pressed && styles.btnPressed,
          ]}
          onPress={() => setShowUploadGuide(true)}
        >
          <Ionicons name="cloud-upload-outline" size={18} color={Colors.light.tint} />
          <Text style={styles.uploadGuideBtnInlineText}>How to upload to Roblox</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.light.textSecondary} />
        </Pressable>
      </ScrollView>

      <ExportCanvas
        ref={exportRef}
        regions={regions}
        colorMap={colorMap}
        strokes={strokes}
      />

      <Modal
        visible={showUploadGuide}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowUploadGuide(false)}
      >
        <UploadGuideModal onClose={() => setShowUploadGuide(false)} templateType={templateType} />
      </Modal>
    </View>
  );
}

function UploadGuideModal({ onClose, templateType }: { onClose: () => void; templateType: TemplateType }) {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const steps = [
    {
      title: "Export Your Template",
      desc: "Tap the download button to save your 585x559px PNG file.",
      icon: "download-outline" as const,
      color: "#00BCD4",
    },
    {
      title: "Open Roblox Creator Hub",
      desc: "Go to create.roblox.com and sign in.",
      icon: "globe-outline" as const,
      color: "#7C3AED",
      link: "https://create.roblox.com",
    },
    {
      title: "Go to Creations > Avatar Items > Classics",
      desc: `Select "Classic ${templateType === "shirt" ? "Shirts" : "Pants"}" from the Classic Type dropdown.`,
      icon: "navigate-outline" as const,
      color: "#FF9800",
    },
    {
      title: "Upload Asset",
      desc: "Click \"Upload Asset\" and select your exported PNG file.",
      icon: "cloud-upload-outline" as const,
      color: "#4CAF50",
    },
    {
      title: "Name, Describe & Submit",
      desc: "Add a name and description, then click \"Upload (10 Robux)\" to submit. Your item will appear after moderation.",
      icon: "checkmark-circle-outline" as const,
      color: "#00BCD4",
    },
  ];

  return (
    <View style={[uploadStyles.container, { backgroundColor: Colors.light.background }]}>
      <View style={[uploadStyles.header, { paddingTop: topInset + 8 }]}>
        <Text style={uploadStyles.headerTitle}>Upload Guide</Text>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            uploadStyles.closeBtn,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons name="close" size={24} color={Colors.light.text} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[uploadStyles.content, { paddingBottom: bottomInset + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {steps.map((step, i) => (
          <Pressable
            key={i}
            style={uploadStyles.stepCard}
            onPress={step.link ? () => Linking.openURL(step.link!) : undefined}
          >
            <View style={[uploadStyles.stepIcon, { backgroundColor: step.color + "18" }]}>
              <Text style={[uploadStyles.stepNum, { color: step.color }]}>{i + 1}</Text>
            </View>
            <View style={uploadStyles.stepContent}>
              <Text style={uploadStyles.stepTitle}>{step.title}</Text>
              <Text style={uploadStyles.stepDesc}>{step.desc}</Text>
              {step.link && (
                <View style={uploadStyles.linkRow}>
                  <Ionicons name="open-outline" size={14} color="#00BCD4" />
                  <Text style={uploadStyles.linkText}>Open Creator Hub</Text>
                </View>
              )}
            </View>
          </Pressable>
        ))}

        <View style={uploadStyles.tipsCard}>
          <Text style={uploadStyles.tipsTitle}>Quick Tips</Text>
          <View style={uploadStyles.tipRow}>
            <Ionicons name="checkmark" size={16} color="#4CAF50" />
            <Text style={uploadStyles.tipText}>Template is automatically sized to 585x559px</Text>
          </View>
          <View style={uploadStyles.tipRow}>
            <Ionicons name="checkmark" size={16} color="#4CAF50" />
            <Text style={uploadStyles.tipText}>PNG with transparency - ready for Roblox</Text>
          </View>
          <View style={uploadStyles.tipRow}>
            <Ionicons name="checkmark" size={16} color="#4CAF50" />
            <Text style={uploadStyles.tipText}>Uploading costs 10 Robux per item</Text>
          </View>
          <View style={uploadStyles.tipRow}>
            <Ionicons name="warning" size={16} color="#FF9800" />
            <Text style={uploadStyles.tipText}>Avoid copyrighted content or it may be rejected</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const uploadStyles = StyleSheet.create({
  container: { flex: 1 },
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
  content: { padding: 20, gap: 12 },
  stepCard: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNum: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  stepContent: { flex: 1, gap: 4 },
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
  linkRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  linkText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#00BCD4" },
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
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  tipText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
});

function getPromptSuggestions(type: TemplateType): string[] {
  if (type === "shirt") {
    return [
      "Oversized Y2K streetwear hoodie",
      "Anime graphic tee with manga panels",
      "Basketball jersey number 23",
      "Dark academia plaid blazer layered look",
      "Cyberpunk techwear with neon accents",
      "Preppy old money polo with crest",
      "Skater band tee vintage washed",
      "Clean minimalist with small embroidered logo",
    ];
  }
  return [
    "Baggy Y2K cargo pants with chains",
    "Ripped black jeans with stitching",
    "Track pants with side stripes",
    "Dark academia pleated trousers",
    "Cyberpunk utility pants neon trim",
    "Classic blue denim with faded wash",
    "Preppy chinos cream colored",
    "Skater jeans with paint splatter",
  ];
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
    gap: 8,
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
  infoBtn: {
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
    gap: 5,
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
    fontSize: 13,
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
  aiSection: {
    gap: 16,
  },
  aiInputRow: {
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
    overflow: "hidden",
  },
  aiInput: {
    padding: 16,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.light.text,
    minHeight: 80,
    textAlignVertical: "top",
  },
  aiGenerateBtn: {
    backgroundColor: "#7C3AED",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  aiLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  aiGenerateBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  aiPreviewContainer: {
    gap: 10,
  },
  aiPreviewLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  aiPreviewWrapper: {
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  checkerboardBg: {
    backgroundColor: "#1A2030",
    padding: 8,
  },
  aiPreviewImage: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
  },
  aiPreviewNote: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.light.tint,
    textAlign: "center",
    lineHeight: 20,
  },
  aiInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 4,
  },
  aiInfoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  aiSuggestionsLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  aiSuggestions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: Colors.light.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  suggestionText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.text,
  },
  uploadGuideBtnInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  uploadGuideBtnInlineText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.light.text,
  },
  interviewContainer: {
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.light.tint + "40",
  },
  interviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  interviewTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  interviewSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    marginTop: -8,
  },
  interviewQuestion: {
    gap: 8,
  },
  interviewQuestionText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.light.text,
  },
  interviewOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  interviewOption: {
    backgroundColor: Colors.light.surfaceSecondary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  interviewOptionSelected: {
    backgroundColor: Colors.light.tint + "20",
    borderColor: Colors.light.tint,
  },
  interviewOptionText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.text,
  },
  interviewOptionTextSelected: {
    color: Colors.light.tint,
    fontFamily: "Inter_600SemiBold",
  },
  interviewActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  interviewSkipBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  interviewSkipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textSecondary,
  },
  interviewGenerateBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.light.tint,
    paddingVertical: 12,
    borderRadius: 10,
  },
  interviewGenerateBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
