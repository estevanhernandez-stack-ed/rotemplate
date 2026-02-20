export type BodyRegion = {
  id: string;
  label: string;
  group: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export const TEMPLATE_WIDTH = 585;
export const TEMPLATE_HEIGHT = 559;

export const SHIRT_REGIONS: BodyRegion[] = [
  { id: "torso_up", label: "Top", group: "torso", x: 168, y: 0, width: 128, height: 8 },
  { id: "torso_right", label: "Right", group: "torso", x: 160, y: 8, width: 8, height: 128 },
  { id: "torso_front", label: "Front", group: "torso", x: 168, y: 8, width: 128, height: 128 },
  { id: "torso_left", label: "Left", group: "torso", x: 296, y: 8, width: 8, height: 128 },
  { id: "torso_back", label: "Back", group: "torso", x: 304, y: 8, width: 128, height: 128 },
  { id: "torso_down", label: "Bottom", group: "torso", x: 168, y: 136, width: 128, height: 8 },

  { id: "rarm_up", label: "Top", group: "right_arm", x: 48, y: 264, width: 64, height: 8 },
  { id: "rarm_left", label: "Left", group: "right_arm", x: 0, y: 272, width: 48, height: 128 },
  { id: "rarm_back", label: "Back", group: "right_arm", x: 48, y: 272, width: 64, height: 128 },
  { id: "rarm_right", label: "Right", group: "right_arm", x: 112, y: 272, width: 48, height: 128 },
  { id: "rarm_front", label: "Front", group: "right_arm", x: 160, y: 272, width: 64, height: 128 },
  { id: "rarm_down", label: "Bottom", group: "right_arm", x: 48, y: 400, width: 64, height: 8 },

  { id: "larm_up", label: "Top", group: "left_arm", x: 296, y: 264, width: 64, height: 8 },
  { id: "larm_front", label: "Front", group: "left_arm", x: 296, y: 272, width: 64, height: 128 },
  { id: "larm_left", label: "Left", group: "left_arm", x: 360, y: 272, width: 48, height: 128 },
  { id: "larm_back", label: "Back", group: "left_arm", x: 408, y: 272, width: 64, height: 128 },
  { id: "larm_right", label: "Right", group: "left_arm", x: 472, y: 272, width: 48, height: 128 },
  { id: "larm_down", label: "Bottom", group: "left_arm", x: 296, y: 400, width: 64, height: 8 },
];

export const PANTS_REGIONS: BodyRegion[] = [
  { id: "torso_up", label: "Top", group: "torso", x: 168, y: 0, width: 128, height: 8 },
  { id: "torso_right", label: "Right", group: "torso", x: 160, y: 8, width: 8, height: 128 },
  { id: "torso_front", label: "Front", group: "torso", x: 168, y: 8, width: 128, height: 128 },
  { id: "torso_left", label: "Left", group: "torso", x: 296, y: 8, width: 8, height: 128 },
  { id: "torso_back", label: "Back", group: "torso", x: 304, y: 8, width: 128, height: 128 },
  { id: "torso_down", label: "Bottom", group: "torso", x: 168, y: 136, width: 128, height: 8 },

  { id: "rleg_up", label: "Top", group: "right_leg", x: 48, y: 264, width: 64, height: 8 },
  { id: "rleg_left", label: "Left", group: "right_leg", x: 0, y: 272, width: 48, height: 128 },
  { id: "rleg_back", label: "Back", group: "right_leg", x: 48, y: 272, width: 64, height: 128 },
  { id: "rleg_right", label: "Right", group: "right_leg", x: 112, y: 272, width: 48, height: 128 },
  { id: "rleg_front", label: "Front", group: "right_leg", x: 160, y: 272, width: 64, height: 128 },
  { id: "rleg_down", label: "Bottom", group: "right_leg", x: 48, y: 400, width: 64, height: 8 },

  { id: "lleg_up", label: "Top", group: "left_leg", x: 296, y: 264, width: 64, height: 8 },
  { id: "lleg_front", label: "Front", group: "left_leg", x: 296, y: 272, width: 64, height: 128 },
  { id: "lleg_left", label: "Left", group: "left_leg", x: 360, y: 272, width: 48, height: 128 },
  { id: "lleg_back", label: "Back", group: "left_leg", x: 408, y: 272, width: 64, height: 128 },
  { id: "lleg_right", label: "Right", group: "left_leg", x: 472, y: 272, width: 48, height: 128 },
  { id: "lleg_down", label: "Bottom", group: "left_leg", x: 296, y: 400, width: 64, height: 8 },
];

export const COLOR_PRESETS = [
  "#1A1A2E", "#16213E", "#0F3460", "#533483",
  "#E94560", "#FF6B6B", "#FF8E53", "#FFC93C",
  "#00BCD4", "#00E676", "#4CAF50", "#2196F3",
  "#9C27B0", "#E91E63", "#FF5722", "#795548",
  "#FFFFFF", "#F5F5F5", "#BDBDBD", "#9E9E9E",
  "#616161", "#424242", "#212121", "#000000",
  "#F44336", "#FFEB3B", "#8BC34A", "#03A9F4",
  "#3F51B5", "#673AB7", "#FF9800", "#607D8B",
];

export const GROUP_LABELS: Record<string, string> = {
  torso: "Torso",
  right_arm: "Right Arm",
  left_arm: "Left Arm",
  right_leg: "Right Leg",
  left_leg: "Left Leg",
};

export type TemplateType = "shirt" | "pants";
