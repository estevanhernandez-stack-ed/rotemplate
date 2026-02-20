import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Text,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLOR_PRESETS } from "@/constants/templates";
import Colors from "@/constants/colors";

interface ColorPickerProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
}

export default function ColorPicker({
  selectedColor,
  onColorSelect,
}: ColorPickerProps) {
  const [customHex, setCustomHex] = useState("");

  const handlePresetPress = (color: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onColorSelect(color);
  };

  const handleCustomSubmit = () => {
    const hex = customHex.startsWith("#") ? customHex : `#${customHex}`;
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      onColorSelect(hex);
      setCustomHex("");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.currentColorRow}>
        <View style={styles.currentColorLabel}>
          <Text style={styles.label}>Active Color</Text>
          <Text style={styles.hexText}>
            {selectedColor === "transparent" ? "None" : selectedColor}
          </Text>
        </View>
        <View
          style={[
            styles.currentSwatch,
            {
              backgroundColor:
                selectedColor === "transparent" ? Colors.light.surfaceSecondary : selectedColor,
            },
          ]}
        >
          {selectedColor === "transparent" && (
            <Ionicons name="close" size={16} color={Colors.light.textSecondary} />
          )}
        </View>
      </View>

      <View style={styles.customRow}>
        <TextInput
          style={styles.hexInput}
          placeholder="#FF0000"
          placeholderTextColor="#555"
          value={customHex}
          onChangeText={setCustomHex}
          maxLength={7}
          autoCapitalize="characters"
          returnKeyType="done"
          onSubmitEditing={handleCustomSubmit}
        />
        <Pressable
          style={({ pressed }) => [
            styles.applyBtn,
            pressed && styles.applyBtnPressed,
          ]}
          onPress={handleCustomSubmit}
        >
          <Ionicons name="checkmark" size={20} color="#fff" />
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.clearBtn,
            pressed && styles.clearBtnPressed,
          ]}
          onPress={() => handlePresetPress("transparent")}
        >
          <Ionicons name="close-circle" size={20} color={Colors.light.accent} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.presetRow}
      >
        {COLOR_PRESETS.map((color) => {
          const isActive = selectedColor === color;
          return (
            <Pressable
              key={color}
              style={[
                styles.presetSwatch,
                { backgroundColor: color },
                isActive && styles.presetSwatchActive,
              ]}
              onPress={() => handlePresetPress(color)}
            >
              {isActive && (
                <Ionicons
                  name="checkmark"
                  size={14}
                  color={isLightColor(color) ? "#000" : "#fff"}
                />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  currentColorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  currentColorLabel: {
    gap: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.light.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  hexText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.light.text,
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
  },
  currentSwatch: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.light.border,
    alignItems: "center",
    justifyContent: "center",
  },
  customRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  hexInput: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.light.surfaceSecondary,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  applyBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.light.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  applyBtnPressed: {
    opacity: 0.8,
  },
  clearBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.light.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  clearBtnPressed: {
    opacity: 0.8,
  },
  presetRow: {
    gap: 6,
    paddingVertical: 4,
  },
  presetSwatch: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  presetSwatchActive: {
    borderWidth: 2,
    borderColor: "#00BCD4",
    transform: [{ scale: 1.1 }],
  },
});
