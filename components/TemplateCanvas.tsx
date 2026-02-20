import React, { useRef, useMemo } from "react";
import { View, StyleSheet, Pressable, Dimensions, PanResponder } from "react-native";
import Svg, { Rect, Path, G, ClipPath, Defs } from "react-native-svg";
import {
  BodyRegion,
  TEMPLATE_WIDTH,
  TEMPLATE_HEIGHT,
} from "@/constants/templates";
import Colors from "@/constants/colors";

export interface Stroke {
  path: string;
  color: string;
  width: number;
}

interface TemplateCanvasProps {
  regions: BodyRegion[];
  colorMap: Record<string, string>;
  selectedRegion: string | null;
  onRegionPress: (regionId: string) => void;
  mode: "fill" | "draw";
  strokes: Stroke[];
  drawColor: string;
  brushSize: number;
  onStrokeStart: () => void;
  onStrokeMove: (x: number, y: number) => void;
  onStrokeEnd: () => void;
}

export default function TemplateCanvas({
  regions,
  colorMap,
  selectedRegion,
  onRegionPress,
  mode,
  strokes,
  drawColor,
  brushSize,
  onStrokeStart,
  onStrokeMove,
  onStrokeEnd,
}: TemplateCanvasProps) {
  const screenWidth = Dimensions.get("window").width;
  const canvasWidth = screenWidth - 32;
  const scale = canvasWidth / TEMPLATE_WIDTH;
  const canvasHeight = TEMPLATE_HEIGHT * scale;

  const modeRef = useRef(mode);
  modeRef.current = mode;
  const callbacksRef = useRef({ onStrokeStart, onStrokeMove, onStrokeEnd });
  callbacksRef.current = { onStrokeStart, onStrokeMove, onStrokeEnd };
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => modeRef.current === "draw",
        onMoveShouldSetPanResponder: () => modeRef.current === "draw",
        onPanResponderGrant: (evt) => {
          const touch = evt.nativeEvent;
          const s = scaleRef.current;
          callbacksRef.current.onStrokeStart();
          callbacksRef.current.onStrokeMove(touch.locationX / s, touch.locationY / s);
        },
        onPanResponderMove: (evt) => {
          const touch = evt.nativeEvent;
          const s = scaleRef.current;
          callbacksRef.current.onStrokeMove(touch.locationX / s, touch.locationY / s);
        },
        onPanResponderRelease: () => {
          callbacksRef.current.onStrokeEnd();
        },
        onPanResponderTerminate: () => {
          callbacksRef.current.onStrokeEnd();
        },
      }),
    []
  );

  const clipId = "template-clip";

  return (
    <View
      style={[styles.container, { width: canvasWidth, height: canvasHeight }]}
      {...(mode === "draw" ? panResponder.panHandlers : {})}
    >
      <Svg
        width={canvasWidth}
        height={canvasHeight}
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
          const isSelected = selectedRegion === region.id && mode === "fill";
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

      {mode === "fill" &&
        regions.map((region) => {
          const left = region.x * scale;
          const top = region.y * scale;
          const width = region.width * scale;
          const height = region.height * scale;
          return (
            <Pressable
              key={`touch-${region.id}`}
              style={[styles.touchTarget, { left, top, width, height }]}
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
