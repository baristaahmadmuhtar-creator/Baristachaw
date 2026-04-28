import type { LucideProps } from 'lucide-react';
import { ICON_REGISTRY } from './IconRegistry';
import { GlassIconTile, type IconIntensity, type IconTone, type IconVariant } from './GlassIconTile';
export { AppIconBrand } from './AppIconBrand';
export { GoogleMark } from './GoogleMark';

export interface AppIconProps extends Omit<LucideProps, 'color'> {
  tone?: IconTone;
  intensity?: IconIntensity;
  variant?: IconVariant;
}

function buildIcon(name: keyof typeof ICON_REGISTRY) {
  const def = ICON_REGISTRY[name];
  const defaultIntensity =
    def.intensity ?? (def.presentation === 'hero' ? 'hero' : def.presentation === 'primary' ? 'standard' : 'micro');
  const defaultVariant = (def.useTile ?? (def.presentation !== 'action')) ? 'tile' : 'glyph';
  const Comp = ({ tone = def.tone, intensity = defaultIntensity, variant = defaultVariant, ...props }: AppIconProps) => (
    <GlassIconTile icon={def.icon} tone={tone} intensity={intensity} variant={variant} {...props} />
  );
  Comp.displayName = `AppIcon(${String(name)})`;
  return Comp;
}

export const Home = buildIcon('Home');
export const ScanLine = buildIcon('ScanLine');
export const Gauge = buildIcon('Gauge');
export const Wrench = buildIcon('Wrench');
export const Image = buildIcon('Image');
export const MessageSquare = buildIcon('MessageSquare');
export const Coffee = buildIcon('Coffee');
export const ShieldCheck = buildIcon('ShieldCheck');
export const PanelLeftClose = buildIcon('PanelLeftClose');
export const PanelLeftOpen = buildIcon('PanelLeftOpen');
export const Sparkles = buildIcon('Sparkles');
export const Camera = buildIcon('Camera');
export const Search = buildIcon('Search');
export const Loader2 = buildIcon('Loader2');
export const Moon = buildIcon('Moon');
export const Sun = buildIcon('Sun');
export const LogIn = buildIcon('LogIn');
export const LogOut = buildIcon('LogOut');
export const X = buildIcon('X');
export const Bookmark = buildIcon('Bookmark');
export const BookmarkCheck = buildIcon('BookmarkCheck');
export const Check = buildIcon('Check');
export const Copy = buildIcon('Copy');
export const ExternalLink = buildIcon('ExternalLink');
export const BookOpen = buildIcon('BookOpen');
export const BookOpenCheck = buildIcon('BookOpenCheck');
export const Send = buildIcon('Send');
export const BrainCircuit = buildIcon('BrainCircuit');
export const Volume2 = buildIcon('Volume2');
export const Zap = buildIcon('Zap');
export const Brain = buildIcon('Brain');
export const Mic = buildIcon('Mic');
export const Plus = buildIcon('Plus');
export const Paperclip = buildIcon('Paperclip');
export const ArrowUp = buildIcon('ArrowUp');
export const History = buildIcon('History');
export const Trash2 = buildIcon('Trash2');
export const FolderPlus = buildIcon('FolderPlus');
export const Folder = buildIcon('Folder');
export const Edit3 = buildIcon('Edit3');
export const FolderInput = buildIcon('FolderInput');
export const MoreHorizontal = buildIcon('MoreHorizontal');
export const Wand2 = buildIcon('Wand2');
export const ChevronDown = buildIcon('ChevronDown');
export const ChevronLeft = buildIcon('ChevronLeft');
export const ChevronRight = buildIcon('ChevronRight');
export const AlertCircle = buildIcon('AlertCircle');
export const ArrowLeft = buildIcon('ArrowLeft');
export const ImagePlus = buildIcon('ImagePlus');
export const FileText = buildIcon('FileText');
export const RefreshCw = buildIcon('RefreshCw');
export const Database = buildIcon('Database');
export const ListChecks = buildIcon('ListChecks');
export const WalletCards = buildIcon('WalletCards');
export const Video = buildIcon('Video');
export const CheckCircle = buildIcon('CheckCircle');
export const AlertTriangle = buildIcon('AlertTriangle');
export const Calculator = buildIcon('Calculator');
export const CheckSquare = buildIcon('CheckSquare');
export const Clock3 = buildIcon('Clock3');
export const Info = buildIcon('Info');
export const Pause = buildIcon('Pause');
export const Play = buildIcon('Play');
export const RotateCcw = buildIcon('RotateCcw');
export const Thermometer = buildIcon('Thermometer');
export const Timer = buildIcon('Timer');
