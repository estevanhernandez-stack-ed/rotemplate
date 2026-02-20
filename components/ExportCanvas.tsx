import React, { forwardRef } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Rect } from "react-native-svg";
import {
  BodyRegion,
  TEMPLATE_WIDTH,
  TEMPLATE_HEIGHT,
} from "@/constants/templates";

interface ExportCanvasProps {
  regions: BodyRegion[];
  colorMap: Record<string, string>;
}

const ExportCanvas = forwardRef<View, ExportCanvasProps>(
  ({ regions, colorMap }, ref) => {
    return (
      <View
        ref={ref}
        style={styles.container}
        collapsable={false}
      >
        <Svg
          width={TEMPLATE_WIDTH}
          height={TEMPLATE_HEIGHT}
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
