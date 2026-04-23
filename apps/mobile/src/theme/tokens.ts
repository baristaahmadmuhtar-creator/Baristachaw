import { mobileSemanticColorTokens, layoutTokens, typographyScaleTokens } from '@baristaclaw/design-tokens';
import { DynamicColorIOS, Platform, type TextStyle, type ViewStyle } from 'react-native';

export type MobileColorScheme = 'light' | 'dark';

export interface MobileSemanticColors {
  backgroundBase: string;
  backgroundOrbPrimary: string;
  backgroundOrbSecondary: string;
  accentPrimary: string;
  accentSecondary: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  surfaceBase: string;
  surfaceStrong: string;
  surfaceSoft: string;
  surfaceAccent: string;
  surfaceSuccess: string;
  surfaceWarning: string;
  surfaceOverlay: string;
  borderSoft: string;
  borderStrong: string;
  fieldBase: string;
  fieldBorder: string;
  fieldFocus: string;
  fieldDisabled: string;
  navSurface: string;
  navBorder: string;
  navInactive: string;
  navActive: string;
  navActivePill: string;
  danger: string;
  success: string;
  warning: string;
  info: string;
}

export interface MobileTypographyToken extends TextStyle {
  fontSize: number;
  lineHeight: number;
  fontWeight: TextStyle['fontWeight'];
  letterSpacing?: number;
  fontFamily?: string;
}

export interface MobileTypographyScale {
  hero: MobileTypographyToken;
  title: MobileTypographyToken;
  section: MobileTypographyToken;
  body: MobileTypographyToken;
  caption: MobileTypographyToken;
  chip: MobileTypographyToken;
}

export interface MobileElevationScale {
  card: ViewStyle;
  panel: ViewStyle;
  dock: ViewStyle;
  sheet: ViewStyle;
}

export interface MobileSpacingScale {
  page: number;
  hero: number;
  card: number;
  block: number;
  compact: number;
}

export interface MobileMotionScale {
  instant: number;
  subtle: number;
  standard: number;
}

export interface MobileThemeContract {
  colors: MobileSemanticColors;
  spacing: MobileSpacingScale;
  radius: {
    card: number;
    button: number;
    pill: number;
    input: number;
    nav: number;
    sheet: number;
    dock: number;
  };
  icon: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
  };
  typography: MobileTypographyScale;
  elevation: MobileElevationScale;
  motion: MobileMotionScale;
}

const mobileFontFamily = {
  regular: 'Inter',
  medium: 'Inter',
  semibold: 'Inter',
  bold: 'Inter',
} as const;

const lightColors: MobileSemanticColors = mobileSemanticColorTokens.light;

const darkColors: MobileSemanticColors = mobileSemanticColorTokens.dark;

const sharedSpacing: MobileSpacingScale = layoutTokens.spacing;

const sharedRadius = layoutTokens.radius;

const sharedIcon = layoutTokens.icon;

const sharedMotion: MobileMotionScale = layoutTokens.motion;

const lightElevation: MobileElevationScale = {
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  panel: {
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  dock: {
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  sheet: {
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    elevation: 10,
  },
};

const darkElevation: MobileElevationScale = {
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  panel: {
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  dock: {
    shadowColor: '#000000',
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  sheet: {
    shadowColor: '#000000',
    shadowOpacity: 0.32,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
};

const lightTypography: MobileTypographyScale = {
  hero: {
    fontFamily: mobileFontFamily.bold,
    ...typographyScaleTokens.hero,
  },
  title: {
    fontFamily: mobileFontFamily.semibold,
    ...typographyScaleTokens.title,
  },
  section: {
    fontFamily: mobileFontFamily.semibold,
    ...typographyScaleTokens.section,
  },
  body: {
    fontFamily: mobileFontFamily.regular,
    ...typographyScaleTokens.body,
  },
  caption: {
    fontFamily: mobileFontFamily.medium,
    ...typographyScaleTokens.caption,
  },
  chip: {
    fontFamily: mobileFontFamily.semibold,
    ...typographyScaleTokens.chip,
  },
};

const darkTypography: MobileTypographyScale = {
  ...lightTypography,
};

export const mobileThemeContracts: Record<MobileColorScheme, MobileThemeContract> = {
  light: {
    colors: lightColors,
    spacing: sharedSpacing,
    radius: sharedRadius,
    icon: sharedIcon,
    typography: lightTypography,
    elevation: lightElevation,
    motion: sharedMotion,
  },
  dark: {
    colors: darkColors,
    spacing: sharedSpacing,
    radius: sharedRadius,
    icon: sharedIcon,
    typography: darkTypography,
    elevation: darkElevation,
    motion: sharedMotion,
  },
};

export function resolveMobileThemeContract(scheme: MobileColorScheme = 'light'): MobileThemeContract {
  return mobileThemeContracts[scheme];
}

function dynamicColor(light: string, dark: string) {
  if (Platform.OS === 'ios') {
    return DynamicColorIOS({ light, dark });
  }
  return light;
}

export const uiTokenPalettes = {
  light: {
    bgBase: lightColors.backgroundBase,
    accent: lightColors.accentPrimary,
    textPrimary: lightColors.textPrimary,
    panelStroke: lightColors.borderStrong,
  },
  dark: {
    bgBase: darkColors.backgroundBase,
    accent: darkColors.accentPrimary,
    textPrimary: darkColors.textPrimary,
    panelStroke: darkColors.borderStrong,
  },
} as const;

export const uiTokens = {
  colors: {
    bgBase: dynamicColor(lightColors.backgroundBase, darkColors.backgroundBase),
    bgOrbPrimary: dynamicColor(lightColors.backgroundOrbPrimary, darkColors.backgroundOrbPrimary),
    bgOrbSecondary: dynamicColor(lightColors.backgroundOrbSecondary, darkColors.backgroundOrbSecondary),
    textPrimary: dynamicColor(lightColors.textPrimary, darkColors.textPrimary),
    textSecondary: dynamicColor(lightColors.textSecondary, darkColors.textSecondary),
    textMuted: dynamicColor(lightColors.textMuted, darkColors.textMuted),
    accent: dynamicColor(lightColors.accentPrimary, darkColors.accentPrimary),
    accentStrong: dynamicColor(lightColors.accentSecondary, darkColors.accentSecondary),
    panel: dynamicColor(lightColors.surfaceBase, darkColors.surfaceBase),
    panelSoft: dynamicColor(lightColors.surfaceSoft, darkColors.surfaceSoft),
    panelStrong: dynamicColor(lightColors.surfaceStrong, darkColors.surfaceStrong),
    panelBorder: dynamicColor(lightColors.borderSoft, darkColors.borderSoft),
    panelStroke: dynamicColor(lightColors.borderStrong, darkColors.borderStrong),
    field: dynamicColor(lightColors.fieldBase, darkColors.fieldBase),
    fieldBorder: dynamicColor(lightColors.fieldBorder, darkColors.fieldBorder),
    fieldFocus: dynamicColor(lightColors.fieldFocus, darkColors.fieldFocus),
    fieldDisabled: dynamicColor(lightColors.fieldDisabled, darkColors.fieldDisabled),
    danger: dynamicColor(lightColors.danger, darkColors.danger),
    success: dynamicColor(lightColors.success, darkColors.success),
    warning: dynamicColor(lightColors.warning, darkColors.warning),
    warningSurface: dynamicColor(lightColors.surfaceWarning, darkColors.surfaceWarning),
    successSurface: dynamicColor(lightColors.surfaceSuccess, darkColors.surfaceSuccess),
    infoSurface: dynamicColor(lightColors.surfaceAccent, darkColors.surfaceAccent),
    navSurface: dynamicColor(lightColors.navSurface, darkColors.navSurface),
    navBorder: dynamicColor(lightColors.navBorder, darkColors.navBorder),
    navInactive: dynamicColor(lightColors.navInactive, darkColors.navInactive),
    navActive: dynamicColor(lightColors.navActive, darkColors.navActive),
    navActivePill: dynamicColor(lightColors.navActivePill, darkColors.navActivePill),
    overlay: dynamicColor(lightColors.surfaceOverlay, darkColors.surfaceOverlay),
  },
  text: {
    primary: dynamicColor(lightColors.textPrimary, darkColors.textPrimary),
    secondary: dynamicColor(lightColors.textSecondary, darkColors.textSecondary),
    muted: dynamicColor(lightColors.textMuted, darkColors.textMuted),
    inverse: dynamicColor(lightColors.textInverse, darkColors.textInverse),
  },
  surface: {
    base: dynamicColor(lightColors.surfaceBase, darkColors.surfaceBase),
    strong: dynamicColor(lightColors.surfaceStrong, darkColors.surfaceStrong),
    soft: dynamicColor(lightColors.surfaceSoft, darkColors.surfaceSoft),
    accent: dynamicColor(lightColors.surfaceAccent, darkColors.surfaceAccent),
    success: dynamicColor(lightColors.surfaceSuccess, darkColors.surfaceSuccess),
    warning: dynamicColor(lightColors.surfaceWarning, darkColors.surfaceWarning),
    overlay: dynamicColor(lightColors.surfaceOverlay, darkColors.surfaceOverlay),
  },
  border: {
    soft: dynamicColor(lightColors.borderSoft, darkColors.borderSoft),
    strong: dynamicColor(lightColors.borderStrong, darkColors.borderStrong),
  },
  radius: sharedRadius,
  icon: sharedIcon,
  elevation: {
    card: lightElevation.card,
    panel: lightElevation.panel,
    dock: lightElevation.dock,
    sheet: lightElevation.sheet,
  },
  shadow: {
    card: lightElevation.card,
    nav: lightElevation.dock,
  },
  spacing: sharedSpacing,
  motion: sharedMotion,
  typography: lightTypography,
  size: {
    touchTarget: 44,
    compactWidth: 375,
    regularWidth: 390,
    wideWidth: 430,
  },
  fontFamily: mobileFontFamily,
} as const;
