import React from "react";
import { View, StyleSheet, Pressable, Text, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  BodyRegion,
  GROUP_LABELS,
  TemplateType,
} from "@/constants/templates";
import Colors from "@/constants/colors";

interface GroupActionsProps {
  regions: BodyRegion[];
  selectedColor: string;
  templateType: TemplateType;
  onFillGroup: (groupId: string, color: string) => void;
  onFillAll: (color: string) => void;
  onClearAll: () => void;
}

export default function GroupActions({
  regions,
  selectedColor,
  templateType,
  onFillGroup,
  onFillAll,
  onClearAll,
}: GroupActionsProps) {
  const groups = [...new Set(regions.map((r) => r.group))];

  const handleFillGroup = (groupId: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onFillGroup(groupId, selectedColor);
  };

  const handleFillAll = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onFillAll(selectedColor);
  };

  const handleClearAll = () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    onClearAll();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Quick Fill</Text>
      <View style={styles.row}>
        <Pressable
          style={({ pressed }) => [
            styles.actionBtn,
            styles.fillAllBtn,
            pressed && styles.pressed,
          ]}
          onPress={handleFillAll}
        >
          <Ionicons name="color-fill" size={16} color="#fff" />
          <Text style={styles.actionBtnTextLight}>Fill All</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.actionBtn,
            styles.clearBtn,
            pressed && styles.pressed,
          ]}
          onPress={handleClearAll}
        >
          <Ionicons name="trash-outline" size={16} color={Colors.light.accent} />
          <Text style={styles.actionBtnTextDanger}>Clear</Text>
        </Pressable>
      </View>
      <View style={styles.groupRow}>
        {groups.map((groupId) => (
          <Pressable
            key={groupId}
            style={({ pressed }) => [
              styles.groupBtn,
              pressed && styles.pressed,
            ]}
            onPress={() => handleFillGroup(groupId)}
          >
            <View
              style={[
                styles.groupColorDot,
                {
                  backgroundColor:
                    selectedColor === "transparent" ? Colors.light.textSecondary : selectedColor,
                },
              ]}
            />
            <Text style={styles.groupBtnText} numberOfLines={1}>
              {GROUP_LABELS[groupId] || groupId}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.light.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  groupRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  fillAllBtn: {
    backgroundColor: Colors.light.tint,
  },
  clearBtn: {
    backgroundColor: Colors.light.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  actionBtnTextLight: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#fff",
  },
  actionBtnTextDanger: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.light.accent,
  },
  groupBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.light.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  groupColorDot: {
    width: 12,
    height: 12,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  groupBtnText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: Colors.light.text,
  },
});
