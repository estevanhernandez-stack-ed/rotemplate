import React, { forwardRef } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Rect, Path, G, ClipPath, Defs } from "react-native-svg";
import {
  BodyRegion,
  TEMPLATE_WIDTH,
  TEMPLATE_HEIGHT,
} from "@/constants/templates";
import type { Stroke } from "@/components/TemplateCanvas";

interface ExportCanvasProps {
  regions: BodyRegion[];
  colorMap: Record<string, string>;
  strokes: Stroke[];
}

const ExportCanvas = forwardRef<View, ExportCanvasProps>(
  ({ regions, colorMap, strokes }, ref) => {
    const clipId = "export-clip";

    return (
      <View ref={ref} style={styles.container} collapsable={false}>
        <Svg
          width={TEMPLATE_WIDTH}
          height={TEMPLATE_HEIGHT}
          viewBox={`0 0 ${TEMPLATE_WIDTH} ${TEMPLATE_HEIGHT}`}
        >
          <Defs>
            <ClipPath id={clipId}>
              {regions.map((region) => (
                <Rect
                  key={`clip-${region.id}`}
                  x={region.x}
                  y={region.y}
                  width={region.width}
                  height={region.height}
                />
              ))}
            </ClipPath>
          </Defs>

          <Rect
            x={0}
            y={0}
            width={TEMPLATE_WIDTH}
            height={TEMPLATE_HEIGHT}
            fill="transparent"
          />
          {regions.map((region) => {
            const fillColor = colorMap[region.id] || "transparent";
            if (fillColor === "transparent") return null;
            return (
              <Rect
                key={region.id}
                x={region.x}
                y={region.y}
                width={region.width}
                height={region.height}
                fill={fillColor}
              />
            );
          })}

          <G clipPath={`url(#${clipId})`}>
            {strokes.map((stroke, i) => (
              <Path
                key={i}
                d={stroke.path}
                stroke={stroke.color}
                strokeWidth={stroke.width}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))}
          </G>
        </Svg>
      </View>
    );
  }
);

ExportCanvas.displayName = "ExportCanvas";

export default ExportCanvas;

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: -9999,
    top: -9999,
    width: TEMPLATE_WIDTH,
    height: TEMPLATE_HEIGHT,
    backgroundColor: "transparent",
  },
});
