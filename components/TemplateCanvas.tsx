import React, { useMemo } from "react";
import { View, StyleSheet, Pressable, Dimensions } from "react-native";
import Svg, { Rect } from "react-native-svg";
import {
  BodyRegion,
  TEMPLATE_WIDTH,
  TEMPLATE_HEIGHT,
} from "@/constants/templates";
import Colors from "@/constants/colors";

interface TemplateCanvasProps {
  regions: BodyRegion[];
  colorMap: Record<string, string>;
  selectedRegion: string | null;
  onRegionPress: (regionId: string) => void;
}

export default function TemplateCanvas({
  regions,
  colorMap,
  selectedRegion,
  onRegionPress,
}: TemplateCanvasProps) {
  const screenWidth = Dimensions.get("window").width;
  const canvasWidth = screenWidth - 32;
  const scale = canvasWidth / TEMPLATE_WIDTH;
  const canvasHeight = TEMPLATE_HEIGHT * scale;

  const groupedRegions = useMemo(() => {
    const groups: Record<string, BodyRegion[]> = {};
    for (const r of regions) {
      if (!groups[r.group]) groups[r.group] = [];
      groups[r.group].push(r);
    }
    return groups;
  }, [regions]);

  return (
    <View style={[styles.container, { width: canvasWidth, height: canvasHeight }]}>
      <Svg
        width={canvasWidth}
        height={canvasHeight}
        viewBox={`0 0 ${TEMPLATE_WIDTH} ${TEMPLATE_HEIGHT}`}
      >
        <Rect
          x={0}
          y={0}
          width={TEMPLATE_WIDTH}
          height={TEMPLATE_HEIGHT}
          fill="transparent"
        />
        {regions.map((region) => {
          const isSelected = selectedRegion === region.id;
          const fillColor = colorMap[region.id] || "transparent";
          return (
            <Rect
              key={region.id}
              x={region.x}
              y={region.y}
              width={region.width}
              height={region.height}
              fill={fillColor}
              stroke={isSelected ? Colors.light.accent : "#555"}
              strokeWidth={isSelected ? 3 : 1}
              strokeDasharray={fillColor === "transparent" ? "4,2" : "0"}
              opacity={fillColor === "transparent" ? 0.6 : 1}
            />
          );
        })}
      </Svg>
      {regions.map((region) => {
        const left = region.x * scale;
        const top = region.y * scale;
        const width = region.width * scale;
        const height = region.height * scale;
        return (
          <Pressable
            key={`touch-${region.id}`}
            style={[
              styles.touchTarget,
              { left, top, width, height },
            ]}
            onPress={() => onRegionPress(region.id)}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    alignSelf: "center",
    backgroundColor: "#2A2A3E",
    borderRadius: 12,
    overflow: "hidden",
  },
  touchTarget: {
    position: "absolute",
  },
});
