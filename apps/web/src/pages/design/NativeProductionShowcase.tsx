import { useEffect, type ReactNode } from 'react';
import {
  CHAT_PARITY,
  COLLECTION_PARITY,
  HOME_PARITY,
  PARITY_NAV_META,
  SCANNER_PARITY,
  TOOLS_PARITY,
  type ParityNavId,
} from '@baristaclaw/shared';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowUpRight,
  BookOpenText,
  Bot,
  BrainCircuit,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  FolderOpen,
  FolderPlus,
  Gauge,
  Home,
  Image as ImageIcon,
  ImagePlus,
  ListTodo,
  LoaderCircle,
  Lock,
  MessageSquare,
  NotebookPen,
  ScanLine,
  Search,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Wrench,
} from 'lucide-react';
import './nativeProductionShowcase.css';

type NavId = ParityNavId;

type Board = {
  screen: string;
  state: string;
  description: string;
  activeNav: NavId;
  content: ReactNode;
};

type BoardGroup = {
  title: string;
  description: string;
  boards: Board[];
};

const NAV_ITEMS: Array<{ id: NavId; label: string; icon: LucideIcon }> = [
  { id: 'home', label: PARITY_NAV_META.Home.label, icon: Home },
  { id: 'scanner', label: PARITY_NAV_META.Scanner.label, icon: ScanLine },
  { id: 'tools', label: PARITY_NAV_META.Tools.label, icon: Wrench },
  { id: 'collection', label: PARITY_NAV_META.Collection.label, icon: ImageIcon },
  { id: 'chat', label: PARITY_NAV_META.Chat.label, icon: MessageSquare },
];

function cx(...tokens: Array<string | false | null | undefined>) {
  return tokens.filter(Boolean).join(' ');
}

function Tag({
  label,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string;
  icon?: LucideIcon;
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
}) {
  return (
    <span className={cx('nps-tag', tone !== 'neutral' && `nps-tag--${tone}`)}>
      {Icon ? <Icon size={13} strokeWidth={2.15} /> : null}
      <span>{label}</span>
    </span>
  );
}

function Button({
  label,
  icon: Icon,
  tone = 'secondary',
}: {
  label: string;
  icon?: LucideIcon;
  tone?: 'primary' | 'secondary';
}) {
  return (
    <button type="button" className={cx('nps-button', tone === 'primary' ? 'nps-button--primary' : 'nps-button--secondary')}>
      <span>{label}</span>
      {Icon ? <Icon size={14} strokeWidth={2.2} /> : null}
    </button>
  );
}

function IconChip({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="nps-icon-chip">
      <span className="nps-icon-chip__icon">
        <Icon size={15} strokeWidth={2.1} />
      </span>
      <span>{label}</span>
    </div>
  );
}

function SectionCard({
  eyebrow,
  title,
  subtitle,
  children,
  tone = 'default',
  compact = false,
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  tone?: 'default' | 'accent' | 'soft' | 'warning';
  compact?: boolean;
}) {
  return (
    <section className={cx('nps-card', tone !== 'default' && `nps-card--${tone}`, compact && 'nps-card--compact')}>
      {eyebrow ? <p className="nps-card__eyebrow">{eyebrow}</p> : null}
      {title ? <h4 className="nps-card__title">{title}</h4> : null}
      {subtitle ? <p className="nps-card__subtitle">{subtitle}</p> : null}
      <div className="nps-card__body">{children}</div>
    </section>
  );
}

function ScreenIntro({
  eyebrow,
  title,
  subtitle,
  trailing,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  trailing?: ReactNode;
}) {
  return (
    <header className="nps-screen-intro">
      <div>
        <p className="nps-screen-intro__eyebrow">{eyebrow}</p>
        <h2 className="nps-screen-intro__title">{title}</h2>
        <p className="nps-screen-intro__subtitle">{subtitle}</p>
      </div>
      {trailing ? <div className="nps-screen-intro__trailing">{trailing}</div> : null}
    </header>
  );
}

function Metric({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'accent' | 'success';
}) {
  return (
    <div className={cx('nps-metric', tone !== 'default' && `nps-metric--${tone}`)}>
      <span className="nps-metric__value">{value}</span>
      <span className="nps-metric__label">{label}</span>
    </div>
  );
}

function SourceRow({ title, domain }: { title: string; domain: string }) {
  return (
    <div className="nps-source-row">
      <div className="nps-source-row__dot" />
      <div className="nps-source-row__body">
        <span className="nps-source-row__title">{title}</span>
        <span className="nps-source-row__domain">{domain}</span>
      </div>
      <ArrowUpRight size={14} strokeWidth={2.2} />
    </div>
  );
}

function MessageBubble({
  role,
  author,
  children,
  meta,
}: {
  role: 'user' | 'assistant';
  author: string;
  children: ReactNode;
  meta?: string;
}) {
  return (
    <div className={cx('nps-message', role === 'user' ? 'nps-message--user' : 'nps-message--assistant')}>
      <div className="nps-message__header">
        <span>{author}</span>
        {meta ? <span>{meta}</span> : null}
      </div>
      <div className="nps-message__body">{children}</div>
    </div>
  );
}

function StepRow({
  label,
  state = 'idle',
}: {
  label: string;
  state?: 'done' | 'active' | 'idle';
}) {
  return (
    <div className={cx('nps-step-row', state !== 'idle' && `nps-step-row--${state}`)}>
      <span className="nps-step-row__icon">
        {state === 'done' ? <CheckCircle2 size={14} strokeWidth={2.4} /> : state === 'active' ? <LoaderCircle className="nps-spin" size={14} strokeWidth={2.4} /> : null}
      </span>
      <span>{label}</span>
    </div>
  );
}

function StatusBar() {
  return (
    <div className="nps-status-bar">
      <span className="nps-status-bar__time">9:41</span>
      <div className="nps-status-bar__icons" aria-hidden="true">
        <span className="nps-status-bar__signal">
          <i />
          <i />
          <i />
          <i />
        </span>
        <span className="nps-status-bar__wifi" />
        <span className="nps-status-bar__battery">
          <span />
        </span>
      </div>
    </div>
  );
}

function PhoneNav({ active }: { active: NavId }) {
  return (
    <nav className="nps-phone-nav" aria-label="Bottom navigation">
      {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
        <div key={id} className={cx('nps-phone-nav__item', active === id && 'nps-phone-nav__item--active')} aria-label={label}>
          <Icon size={18} strokeWidth={active === id ? 2.5 : 2.2} />
        </div>
      ))}
    </nav>
  );
}

function PhoneFrame({ screen, state, description, activeNav, content }: Board) {
  return (
    <article className="nps-board">
      <div className="nps-phone">
        <div className="nps-phone__surface">
          <StatusBar />
          <div className="nps-phone__island" />
          <div className="nps-phone__content">{content}</div>
          <PhoneNav active={activeNav} />
        </div>
      </div>
      <div className="nps-board__meta">
        <p className="nps-board__screen">{screen}</p>
        <h3 className="nps-board__title">{state}</h3>
        <p className="nps-board__description">{description}</p>
      </div>
    </article>
  );
}

function HomeGuestState() {
  return (
    <>
      <ScreenIntro
        eyebrow={HOME_PARITY.brand}
        title="Good morning."
        subtitle={HOME_PARITY.subtitle}
        trailing={<Tag icon={ShieldCheck} label="Guest tools ready" tone="success" />}
      />

      <SectionCard eyebrow="Search" title="Live search starts here" tone="accent" compact>
        <div className="nps-search-panel">
          <div className="nps-search-shell nps-search-shell--muted">
            <Search size={15} strokeWidth={2.3} />
            <span>{HOME_PARITY.signedOutPlaceholder}</span>
          </div>
          <div className="nps-inline-copy">
            <Tag icon={ShieldCheck} label="Sign in to search" tone="accent" />
            <Tag icon={BookOpenText} label="Guest tools stay open" />
          </div>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Quick access" title="Continue with" compact>
        <div className="nps-icon-chip-grid">
          <IconChip icon={MessageSquare} label="Chat" />
          <IconChip icon={ScanLine} label="Scan" />
          <IconChip icon={Wrench} label="Tools" />
          <IconChip icon={ImageIcon} label="Collection" />
        </div>
      </SectionCard>

      <SectionCard eyebrow="Access" title="Unlock live search" tone="soft" compact>
        <div className="nps-inline-copy">
          <Tag icon={Sparkles} label="Trusted sources" tone="accent" />
          <Tag icon={NotebookPen} label="Cloud save" />
        </div>
        <div className="nps-button-row">
          <Button label="Google" tone="primary" />
          <Button label="Guest" />
        </div>
      </SectionCard>
    </>
  );
}

function HomeResultState() {
  return (
    <>
      <ScreenIntro
        eyebrow={HOME_PARITY.brand}
        title="Good morning."
        subtitle={HOME_PARITY.subtitle}
        trailing={<Tag icon={Sparkles} label="4 sources checked" tone="accent" />}
      />

      <SectionCard eyebrow="Search" title="Run live search" tone="accent" compact>
        <div className="nps-search-panel">
          <div className="nps-search-shell nps-search-shell--filled">
            <Search size={15} strokeWidth={2.3} />
            <span>Current arabica coffee price trend</span>
          </div>
          <div className="nps-inline-copy">
            <Tag icon={Clock3} label="Retrieved 09:41" />
            <Tag icon={ShieldCheck} label="Live web grounding" tone="success" />
          </div>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Quick access" title="Continue with" compact>
        <div className="nps-icon-chip-grid">
          <IconChip icon={MessageSquare} label="Chat" />
          <IconChip icon={ScanLine} label="Scan" />
          <IconChip icon={Wrench} label="Tools" />
          <IconChip icon={ImageIcon} label="Collection" />
        </div>
      </SectionCard>

      <div className="nps-spacer" />

      <div className="nps-sheet">
        <div className="nps-sheet__handle" />
        <div className="nps-sheet__header">
          <div>
            <p className="nps-card__eyebrow">{HOME_PARITY.searchResultTitle}</p>
            <h4 className="nps-sheet__title">Arabica stayed firm this week</h4>
          </div>
          <Tag icon={Sparkles} label="4 sources" tone="success" />
        </div>
        <div className="nps-highlight-copy">
          Pricing still looks supported. Buyers should avoid assuming a fast reset.
        </div>
        <div className="nps-source-list">
          <SourceRow title="Arabica futures market update" domain="ico.org" />
          <SourceRow title="Roaster inventory signal summary" domain="perfectdailygrind.com" />
        </div>
        <div className="nps-button-row">
          <Button label={HOME_PARITY.saveAction} tone="primary" />
          <Button label="Share" />
        </div>
      </div>
    </>
  );
}

function HomeLoadingState() {
  return (
    <>
      <ScreenIntro
        eyebrow={HOME_PARITY.brand}
        title="Good morning."
        subtitle={HOME_PARITY.subtitle}
        trailing={<Tag icon={LoaderCircle} label="Searching" tone="warning" />}
      />

      <SectionCard eyebrow="Search" title="Run live search" tone="accent" compact>
        <div className="nps-search-panel">
          <div className="nps-search-shell nps-search-shell--filled">
            <Search size={15} strokeWidth={2.3} />
            <span>Best workflow to dial in espresso faster</span>
          </div>
          <div className="nps-inline-copy">
            <Tag icon={LoaderCircle} label="Checking sources" tone="warning" />
          </div>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Search status" title="Grounding the answer">
        <div className="nps-step-list">
          <StepRow label="Sending the live search request" state="done" />
          <StepRow label="Checking source quality and freshness" state="active" />
          <StepRow label="Preparing structured summary and actions" />
        </div>
      </SectionCard>

      <SectionCard eyebrow="Source rule" title="Wait for quality" tone="warning" compact>
        <div className="nps-bullet-list">
          <div className="nps-bullet-list__item">Need at least two grounded sources.</div>
          <div className="nps-bullet-list__item">Failure stays actionable.</div>
        </div>
      </SectionCard>

      <div className="nps-spacer" />

      <div className="nps-sheet">
        <div className="nps-sheet__handle" />
        <div className="nps-sheet__header">
          <div>
            <p className="nps-card__eyebrow">Search Result</p>
            <h4 className="nps-sheet__title">Searching live sources</h4>
          </div>
          <Tag icon={LoaderCircle} label="Working" tone="warning" />
        </div>
        <div className="nps-skeleton-stack">
          <div className="nps-skeleton-card nps-skeleton-card--short" />
          <div className="nps-skeleton-card nps-skeleton-card--medium" />
        </div>
        <div className="nps-inline-copy">
          <Tag icon={Bot} label="Live web grounding" tone="accent" />
          <Tag icon={ShieldCheck} label="No silent fallback" />
        </div>
      </div>
    </>
  );
}

function ChatConversationState() {
  return (
    <>
      <ScreenIntro
        eyebrow={CHAT_PARITY.title}
        title="Roast plan review"
        subtitle="Ask for recipes, troubleshooting, or workflow review."
        trailing={<Tag icon={BookOpenText} label="14 msgs" tone="accent" />}
      />

      <div className="nps-inline-copy">
        <Tag icon={Bot} label={CHAT_PARITY.modes.normal} tone="accent" />
        <Tag icon={ShieldCheck} label="Signed in" tone="success" />
      </div>

      <div className="nps-segmented">
        <span className="nps-segmented__item">{CHAT_PARITY.modes.fast}</span>
        <span className="nps-segmented__item nps-segmented__item--active">{CHAT_PARITY.modes.normal}</span>
        <span className="nps-segmented__item">{CHAT_PARITY.modes.deep}</span>
      </div>

      <div className="nps-thread">
        <MessageBubble role="user" author="You" meta="09:39">
          Need a cleaner espresso dial-in plan for a washed Ethiopia.
        </MessageBubble>
        <MessageBubble role="assistant" author="BaristaClaw" meta="09:40">
          Start at <strong>18g in / 38g out / 28 to 31 sec</strong>. If acidity is thin, grind finer. If bitterness rises first, reduce yield by 2g.
        </MessageBubble>
        <div className="nps-message-toolbar">
          <Tag icon={ShieldCheck} label="2 sources" tone="success" />
          <Tag icon={Sparkles} label="Ready" />
          <Button label="Play Audio" />
          <Button label="More" />
        </div>
      </div>

      <div className="nps-spacer" />

      <div className="nps-composer-card">
        <div className="nps-composer-card__modes">
          <Tag icon={BookOpenText} label={CHAT_PARITY.historyTitle} />
          <Tag icon={Sparkles} label="Tools" />
          <Tag icon={NotebookPen} label="Voice" />
        </div>
        <div className="nps-inline-copy">
          <Tag icon={ImagePlus} label="shift-photo.jpg" tone="accent" />
        </div>
        <div className="nps-composer">
          <button type="button" className="nps-icon-button" aria-label="Open tools">
            <Sparkles size={16} strokeWidth={2.2} />
          </button>
          <div className="nps-composer__input">{CHAT_PARITY.inputPlaceholder}</div>
          <button type="button" className="nps-icon-button nps-icon-button--primary" aria-label="Send">
            <ArrowUpRight size={16} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </>
  );
}

function ChatDeepState() {
  return (
    <>
      <ScreenIntro
        eyebrow={CHAT_PARITY.title}
        title="V60 training plan"
        subtitle="Deep mode stays explicit without crowding the thread."
        trailing={<Tag icon={BrainCircuit} label="9 msgs" tone="accent" />}
      />

      <div className="nps-inline-copy">
        <Tag icon={BrainCircuit} label={CHAT_PARITY.modes.deep} tone="accent" />
        <Tag icon={ShieldCheck} label="Signed in" tone="success" />
      </div>

      <div className="nps-segmented">
        <span className="nps-segmented__item">{CHAT_PARITY.modes.fast}</span>
        <span className="nps-segmented__item">{CHAT_PARITY.modes.normal}</span>
        <span className="nps-segmented__item nps-segmented__item--active">{CHAT_PARITY.modes.deep}</span>
      </div>

      <MessageBubble role="user" author="You" meta="09:41">
        Build a two-week V60 training plan for a new barista.
      </MessageBubble>

      <SectionCard eyebrow="Deep Thinking" title="Preparing the reply" tone="accent">
        <div className="nps-step-list">
          <StepRow label="Understanding the context" state="done" />
          <StepRow label="Building the analysis" state="done" />
          <StepRow label="Comparing options and tradeoffs" state="active" />
          <StepRow label="Formatting the final answer" />
        </div>
      </SectionCard>

      <MessageBubble role="assistant" author="BaristaClaw" meta="Thinking">
        Deep mode is preparing a structured training plan with drills, taste checkpoints, and end-of-week review.
      </MessageBubble>

      <div className="nps-spacer" />

      <div className="nps-composer-card">
        <div className="nps-composer-card__modes">
          <Tag icon={BookOpenText} label={CHAT_PARITY.historyTitle} />
          <Tag icon={Sparkles} label="Tools" />
        </div>
        <div className="nps-composer">
          <button type="button" className="nps-icon-button" aria-label="Record voice">
            <NotebookPen size={16} strokeWidth={2.2} />
          </button>
          <div className="nps-composer__input">Deep mode is preparing the plan...</div>
          <button type="button" className="nps-icon-button nps-icon-button--primary" aria-label="Thinking">
            <LoaderCircle className="nps-spin" size={16} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </>
  );
}

function ChatHistoryState() {
  return (
    <>
      <ScreenIntro
        eyebrow={CHAT_PARITY.title}
        title="Roast plan review"
        subtitle="Sessions and folders stay close without taking over the thread."
        trailing={<Tag icon={BookOpenText} label="8 sessions" tone="accent" />}
      />

      <div className="nps-inline-copy">
        <Tag icon={Bot} label={CHAT_PARITY.modes.normal} tone="accent" />
        <Tag icon={ShieldCheck} label="Signed in" tone="success" />
      </div>

      <div className="nps-segmented">
        <span className="nps-segmented__item">{CHAT_PARITY.modes.fast}</span>
        <span className="nps-segmented__item nps-segmented__item--active">{CHAT_PARITY.modes.normal}</span>
        <span className="nps-segmented__item">{CHAT_PARITY.modes.deep}</span>
      </div>

      <div className="nps-thread">
        <MessageBubble role="assistant" author="BaristaClaw" meta="09:40">
          Last saved answer compared grinder retention tradeoffs and workflow fit for a low-volume espresso bar.
        </MessageBubble>
      </div>

      <div className="nps-spacer" />

      <div className="nps-sheet">
        <div className="nps-sheet__handle" />
        <div className="nps-sheet__header">
          <div>
            <p className="nps-card__eyebrow">{CHAT_PARITY.historyTitle}</p>
            <h4 className="nps-sheet__title">Sessions and folders</h4>
          </div>
          <Tag icon={FolderPlus} label="3 folders" tone="accent" />
        </div>
        <div className="nps-sheet-stack">
          <SectionCard title={CHAT_PARITY.newChat} subtitle="Create and switch threads." compact>
            <div className="nps-field-row">
              <div className="nps-field nps-sheet-field-grow">New Chat title</div>
              <Button label="Create" tone="primary" />
            </div>
          </SectionCard>

          <SectionCard title="Sessions" subtitle="Move, rename, or open a thread." compact>
            <div className="nps-history-list">
              <div className="nps-history-list__item nps-history-list__item--active">
                <div>
                  <strong>Roast plan review</strong>
                  <span>Open · 14 msgs</span>
                </div>
                <ChevronRight size={14} strokeWidth={2.3} />
              </div>
              <div className="nps-history-list__item">
                <div>
                  <strong>V60 training drills</strong>
                  <span>Barista Onboarding</span>
                </div>
                <ChevronRight size={14} strokeWidth={2.3} />
              </div>
            </div>
            <div className="nps-folder-chip-row">
              <div className="nps-folder-chip nps-folder-chip--active">No Folder</div>
              <div className="nps-folder-chip">Barista Onboarding</div>
              <div className="nps-folder-chip">Ops + Pricing</div>
            </div>
          </SectionCard>

          <SectionCard title="Folders" subtitle="Group sessions without leaving chat." compact>
            <div className="nps-field-row">
              <div className="nps-field nps-sheet-field-grow">Folder name</div>
              <Button label="Add" tone="primary" />
            </div>
            <div className="nps-history-list">
              <div className="nps-history-list__item">
                <div>
                  <strong>Barista Onboarding</strong>
                  <span>3 sessions</span>
                </div>
                <div className="nps-button-row">
                  <Button label="Rename" />
                  <Button label="Delete" />
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}

function ScannerChooseState() {
  return (
    <>
      <ScreenIntro
        eyebrow={SCANNER_PARITY.title}
        title={SCANNER_PARITY.modes.auto}
        subtitle="Analyze coffee images with barista-focused observations and improvement notes."
        trailing={<Tag icon={Camera} label="Choose input" tone="accent" />}
      />

      <div className="nps-inline-copy">
        <Tag icon={Camera} label="Camera / Gallery / Files" tone="accent" />
        <Tag icon={ShieldCheck} label="Signed in" tone="success" />
      </div>

      <div className="nps-segmented">
        <span className="nps-segmented__item nps-segmented__item--active">{SCANNER_PARITY.modes.auto}</span>
        <span className="nps-segmented__item">{SCANNER_PARITY.modes.ocr}</span>
        <span className="nps-segmented__item">{SCANNER_PARITY.modes.video}</span>
      </div>

      <SectionCard eyebrow={SCANNER_PARITY.mediaInputTitle} title="Choose media" tone="accent">
        <div className="nps-media-stage">
          <div className="nps-media-stage__icon">
            <Camera size={30} strokeWidth={1.9} />
          </div>
          <p>Choose a photo, live camera frame, or compatible file to begin.</p>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Next step" title="Keep the current phase clear and lightweight." compact>
        <div className="nps-bullet-list">
          <div className="nps-bullet-list__item">Review media before running analysis.</div>
          <div className="nps-bullet-list__item">Video stays file and gallery based in this build.</div>
        </div>
      </SectionCard>

      <div className="nps-spacer" />

      <div className="nps-dock">
        <Button label="Open Camera" tone="primary" />
        <div className="nps-dock__secondary">
          <Button label="Gallery" />
          <Button label="Files" />
        </div>
      </div>
    </>
  );
}

function ScannerPreviewState() {
  return (
    <>
      <ScreenIntro
        eyebrow={SCANNER_PARITY.title}
        title={SCANNER_PARITY.modes.ocr}
        subtitle="Extract label, menu, or packaging text with cleaner structure."
        trailing={<Tag icon={Clock3} label="Preview ready" tone="accent" />}
      />

      <div className="nps-inline-copy">
        <Tag icon={ImagePlus} label="Gallery" tone="accent" />
        <Tag icon={FileText} label="Read Label" />
      </div>

      <div className="nps-segmented">
        <span className="nps-segmented__item">{SCANNER_PARITY.modes.auto}</span>
        <span className="nps-segmented__item nps-segmented__item--active">{SCANNER_PARITY.modes.ocr}</span>
        <span className="nps-segmented__item">{SCANNER_PARITY.modes.video}</span>
      </div>

      <SectionCard eyebrow="Preview" title="Ethiopia Yirgacheffe label" tone="accent">
        <div className="nps-media-preview">
          <div className="nps-media-preview__image">
            <div className="nps-media-preview__stamp">Preview ready</div>
          </div>
          <div className="nps-inline-copy">
            <Tag icon={FileText} label="image/jpeg" />
            <Tag icon={Clock3} label="Ready to analyze" tone="success" />
          </div>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Next step" title="Run analysis when ready" compact>
        <div className="nps-bullet-list">
          <div className="nps-bullet-list__item">Origin, process, roast date, notes.</div>
          <div className="nps-bullet-list__item">Ready for save after scan.</div>
        </div>
      </SectionCard>

      <div className="nps-spacer" />

      <div className="nps-dock">
        <Button label="Analyze" tone="primary" />
        <div className="nps-dock__secondary">
          <Button label="Change" />
          <Button label="Clear" />
        </div>
      </div>
    </>
  );
}

function ScannerResultState() {
  return (
    <>
      <ScreenIntro
        eyebrow={SCANNER_PARITY.title}
        title={SCANNER_PARITY.modes.auto}
        subtitle="Analyze coffee images with barista-focused observations and improvement notes."
        trailing={<Tag icon={CheckCircle2} label="Result ready" tone="success" />}
      />

      <div className="nps-inline-copy">
        <Tag icon={ImagePlus} label="Gallery" tone="accent" />
        <Tag icon={Sparkles} label={SCANNER_PARITY.resultTitle} />
      </div>

      <SectionCard eyebrow="Preview" title="Captured coffee image" tone="accent" compact>
        <div className="nps-media-preview__image">
          <div className="nps-media-preview__stamp">Attached</div>
        </div>
      </SectionCard>

      <div className="nps-spacer" />

      <div className="nps-sheet">
        <div className="nps-sheet__handle" />
        <div className="nps-sheet__header">
          <div>
            <p className="nps-card__eyebrow">{SCANNER_PARITY.resultTitle}</p>
            <h4 className="nps-sheet__title">Ethiopia Chelbesa · Washed</h4>
          </div>
          <Tag icon={CheckCircle2} label="Ready" tone="success" />
        </div>
        <div className="nps-inline-copy">
          <Tag icon={Sparkles} label="Floral" />
          <Tag icon={Sparkles} label="Citrus" />
          <Tag icon={Clock3} label="Roast date 12 Feb" />
        </div>
        <div className="nps-highlight-copy">
          Bright washed profile with floral clarity. Better for a clean brew target than heavy body. Start around 1:16.5 and raise temperature before grinding finer.
        </div>
        <div className="nps-button-row">
          <Button label={SCANNER_PARITY.saveAction} tone="primary" />
          <Button label="Share" />
        </div>
      </div>
    </>
  );
}

function CollectionEditableState() {
  return (
    <>
      <ScreenIntro
        eyebrow={COLLECTION_PARITY.title}
        title={COLLECTION_PARITY.title}
        subtitle={COLLECTION_PARITY.subtitle}
        trailing={<Tag icon={FolderOpen} label="32 items" tone="accent" />}
      />

      <SectionCard title="Filter" compact>
        <div className="nps-search-shell nps-search-shell--filled">
          <Search size={15} strokeWidth={2.3} />
          <span>{COLLECTION_PARITY.searchPlaceholder}</span>
        </div>
        <div className="nps-segmented">
          <span className="nps-segmented__item nps-segmented__item--active">{COLLECTION_PARITY.filters.all}</span>
          <span className="nps-segmented__item">{COLLECTION_PARITY.filters.recipe}</span>
          <span className="nps-segmented__item">{COLLECTION_PARITY.filters.ai_canvas}</span>
          <span className="nps-segmented__item">{COLLECTION_PARITY.filters.note}</span>
        </div>
      </SectionCard>

      <SectionCard title="Folders" compact>
        <div className="nps-folder-row">
          <div className="nps-folder-chip nps-folder-chip--active">All <span className="nps-folder-chip__count">32</span></div>
          <div className="nps-folder-chip">Bar Menu <span className="nps-folder-chip__count">12</span></div>
          <div className="nps-folder-chip">Dial-in <span className="nps-folder-chip__count">9</span></div>
          <div className="nps-folder-chip">Training <span className="nps-folder-chip__count">8</span></div>
        </div>
      </SectionCard>

      <div className="nps-stack">
        <SectionCard eyebrow="Canvas" title="Arabica stayed firm this week" compact>
          <div className="nps-list-meta">
            <span>Updated 7 min ago</span>
            <span>Tap for actions</span>
          </div>
          <p className="nps-list-copy">Buyers should avoid assuming a fast correction. Shorter replenishment cycles are safer.</p>
          <div className="nps-inline-copy">
            <Tag icon={Sparkles} label="Canvas" tone="accent" />
            <Tag icon={FolderOpen} label="Bar Menu" />
          </div>
        </SectionCard>
        <SectionCard eyebrow="Note" title="Chelbesa brew note" compact>
          <div className="nps-list-meta">
            <span>Updated today</span>
            <span>Tap for actions</span>
          </div>
          <p className="nps-list-copy">Best cup at 94C, 18 clicks, 3 pours. Sweetness opened after reducing final agitation.</p>
          <div className="nps-inline-copy">
            <Tag icon={NotebookPen} label="Note" tone="accent" />
            <Tag icon={FolderOpen} label="Training" />
          </div>
        </SectionCard>
      </div>

      <div className="nps-spacer" />

      <div className="nps-dock">
        <div className="nps-dock__secondary">
          <Button label={COLLECTION_PARITY.createFolder} />
        </div>
        <Button label={COLLECTION_PARITY.newNote} tone="primary" />
      </div>
    </>
  );
}

function CollectionGuestState() {
  return (
    <>
      <ScreenIntro
        eyebrow={COLLECTION_PARITY.title}
        title={COLLECTION_PARITY.title}
        subtitle="Saved items stay visible. Editing stays gated."
        trailing={<Tag icon={Lock} label="Read-only" tone="warning" />}
      />

      <SectionCard title="Filter" compact>
        <div className="nps-search-shell nps-search-shell--muted">
          <Search size={15} strokeWidth={2.3} />
          <span>{COLLECTION_PARITY.searchPlaceholder}</span>
        </div>
        <div className="nps-segmented">
          <span className="nps-segmented__item nps-segmented__item--active">{COLLECTION_PARITY.filters.all}</span>
          <span className="nps-segmented__item">{COLLECTION_PARITY.filters.recipe}</span>
          <span className="nps-segmented__item">{COLLECTION_PARITY.filters.note}</span>
        </div>
      </SectionCard>

      <div className="nps-stack">
        <SectionCard eyebrow="Saved note" title="Chelbesa brew note" compact>
          <div className="nps-list-meta">
            <span>Training folder</span>
            <span>Visible</span>
          </div>
          <p className="nps-list-copy">Best cup at 94C, 18 clicks, 3 pours. Sweetness opened after reducing final agitation.</p>
        </SectionCard>
        <SectionCard eyebrow="Recipe" title="House espresso baseline" compact>
          <div className="nps-list-meta">
            <span>Dial-in folder</span>
            <span>Visible</span>
          </div>
          <p className="nps-list-copy">18g in, 38g out, 29 seconds. Lower yield first if bitterness rises ahead of body.</p>
        </SectionCard>
      </div>

      <div className="nps-spacer" />

      <SectionCard eyebrow="Read-only access" title="Sign in to edit or move" tone="warning" compact>
        <div className="nps-button-row">
          <Button label="Sign in to edit" tone="primary" />
          <Button label="Keep browsing" />
        </div>
      </SectionCard>
    </>
  );
}

function CollectionEditorState() {
  return (
    <>
      <ScreenIntro
        eyebrow={COLLECTION_PARITY.title}
        title={COLLECTION_PARITY.title}
        subtitle={COLLECTION_PARITY.subtitle}
        trailing={<Tag icon={NotebookPen} label="Editing note" tone="accent" />}
      />

      <SectionCard title="Filter" compact>
        <div className="nps-search-shell nps-search-shell--filled">
          <Search size={15} strokeWidth={2.3} />
          <span>{COLLECTION_PARITY.searchPlaceholder}</span>
        </div>
        <div className="nps-segmented">
          <span className="nps-segmented__item">{COLLECTION_PARITY.filters.all}</span>
          <span className="nps-segmented__item">{COLLECTION_PARITY.filters.ai_canvas}</span>
          <span className="nps-segmented__item nps-segmented__item--active">{COLLECTION_PARITY.filters.note}</span>
        </div>
      </SectionCard>

      <SectionCard title="Folders" compact>
        <div className="nps-folder-row">
          <div className="nps-folder-chip">All</div>
          <div className="nps-folder-chip">Bar Menu</div>
          <div className="nps-folder-chip">Dial-in</div>
          <div className="nps-folder-chip nps-folder-chip--active">Training</div>
        </div>
      </SectionCard>

      <div className="nps-spacer" />

      <div className="nps-sheet">
        <div className="nps-sheet__handle" />
        <div className="nps-sheet__header">
          <div>
            <p className="nps-card__eyebrow">Quick Note</p>
            <h4 className="nps-sheet__title">Chelbesa pour-over adjustments</h4>
          </div>
          <Tag icon={NotebookPen} label="Draft" tone="accent" />
        </div>
        <div className="nps-field">Chelbesa pour-over adjustments</div>
        <div className="nps-editor">
          <p>- Grind one notch finer if the cup cools into dryness.</p>
          <p>- Keep the third pour gentler to avoid flattening florals.</p>
          <p>- Re-test at 93C before pushing contact time.</p>
        </div>
        <div className="nps-folder-chip-row">
          <div className="nps-folder-chip nps-folder-chip--active">Training</div>
          <div className="nps-folder-chip">Dial-in</div>
          <div className="nps-folder-chip">Bar Menu</div>
        </div>
        <div className="nps-button-row">
          <Button label={COLLECTION_PARITY.saveNote} tone="primary" />
          <Button label="Discard" />
        </div>
      </div>
    </>
  );
}

function ToolsTimerState() {
  return (
    <>
      <ScreenIntro
        eyebrow={TOOLS_PARITY.title}
        title={TOOLS_PARITY.title}
        subtitle={TOOLS_PARITY.subtitle}
        trailing={<Tag icon={Clock3} label="Timer" tone="accent" />}
      />

      <div className="nps-inline-copy">
        <Tag icon={Clock3} label="Running" tone="success" />
        <Tag icon={Sparkles} label="Target 03:00" />
      </div>

      <div className="nps-segmented">
        <span className="nps-segmented__item nps-segmented__item--active">{TOOLS_PARITY.tabs.timer}</span>
        <span className="nps-segmented__item">{TOOLS_PARITY.tabs.ratio}</span>
        <span className="nps-segmented__item">{TOOLS_PARITY.tabs.todo}</span>
      </div>

      <SectionCard eyebrow={TOOLS_PARITY.timerTitle} title="One focus surface for timing and progress." tone="accent">
        <div className="nps-clock-hero">02:14</div>
        <div className="nps-timer-copy">
          <span>Target 03:00</span>
          <span>75%</span>
        </div>
        <div className="nps-progress">
          <span className="nps-progress__fill" style={{ width: '75%' }} />
        </div>
      </SectionCard>

      <SectionCard eyebrow="Presets" title="Common brew windows" compact>
        <div className="nps-folder-chip-row">
          <div className="nps-folder-chip">02:00</div>
          <div className="nps-folder-chip nps-folder-chip--active">03:00</div>
          <div className="nps-folder-chip">03:30</div>
          <div className="nps-folder-chip">04:00</div>
        </div>
      </SectionCard>

      <div className="nps-spacer" />

      <div className="nps-dock">
        <Button label="Pause" tone="primary" />
        <div className="nps-dock__secondary">
          <Button label="Reset" />
        </div>
      </div>
    </>
  );
}

function ToolsRatioState() {
  return (
    <>
      <ScreenIntro
        eyebrow={TOOLS_PARITY.title}
        title={TOOLS_PARITY.title}
        subtitle="SCA-first quick ratio analysis with cleaner warning output."
        trailing={<Tag icon={Gauge} label="Ratio" tone="accent" />}
      />

      <div className="nps-inline-copy">
        <Tag icon={Gauge} label="Yield ready" tone="success" />
        <Tag icon={Sparkles} label="Recipe mismatch" tone="warning" />
      </div>

      <div className="nps-segmented">
        <span className="nps-segmented__item">{TOOLS_PARITY.tabs.timer}</span>
        <span className="nps-segmented__item nps-segmented__item--active">{TOOLS_PARITY.tabs.ratio}</span>
        <span className="nps-segmented__item">{TOOLS_PARITY.tabs.todo}</span>
      </div>

      <SectionCard eyebrow={TOOLS_PARITY.ratioTitle} title="Group inputs first, then warnings below." tone="accent">
        <div className="nps-inline-copy">
          <Tag icon={Sparkles} label="Expected 16.7:1" tone="accent" />
          <Tag icon={CheckCircle2} label="EY 20.9%" tone="success" />
          <Tag icon={TriangleAlert} label="Recipe mismatch" tone="warning" />
        </div>
        <div className="nps-input-grid">
          <div className="nps-input-tile">
            <span>Dose</span>
            <strong>18g</strong>
          </div>
          <div className="nps-input-tile">
            <span>Water</span>
            <strong>300ml</strong>
          </div>
          <div className="nps-input-tile">
            <span>Ratio</span>
            <strong>1:16.7</strong>
          </div>
          <div className="nps-input-tile">
            <span>TDS</span>
            <strong>1.35%</strong>
          </div>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Result" title="Extraction Yield 20.9%" tone="warning" compact>
        <p className="nps-list-copy">Lower ratio slightly or go one notch coarser first. Expected ratio sits around 16.7:1.</p>
      </SectionCard>
    </>
  );
}

function ToolsTasksState() {
  return (
    <>
      <ScreenIntro
        eyebrow={TOOLS_PARITY.title}
        title={TOOLS_PARITY.title}
        subtitle="Shift tasks stay visible and compact between pours."
        trailing={<Tag icon={ListTodo} label="4 tasks" tone="accent" />}
      />

      <div className="nps-inline-copy">
        <Tag icon={ListTodo} label="2 open" tone="accent" />
        <Tag icon={CheckCircle2} label="2 done" tone="success" />
      </div>

      <div className="nps-segmented">
        <span className="nps-segmented__item">{TOOLS_PARITY.tabs.timer}</span>
        <span className="nps-segmented__item">{TOOLS_PARITY.tabs.ratio}</span>
        <span className="nps-segmented__item nps-segmented__item--active">{TOOLS_PARITY.tabs.todo}</span>
      </div>

      <SectionCard eyebrow="Focus" title="Morning prep on track" tone="accent">
        <div className="nps-metric-grid">
          <Metric value="3/4" label="completed" tone="success" />
          <Metric value="09:55" label="target ready" />
        </div>
      </SectionCard>

      <SectionCard eyebrow={TOOLS_PARITY.taskTitle} title="Checklist" compact>
        <div className="nps-task-list">
          <div className="nps-task-list__item nps-task-list__item--done">
            <span className="nps-checkbox" />
            <span>Calibrate espresso baseline</span>
          </div>
          <div className="nps-task-list__item nps-task-list__item--done">
            <span className="nps-checkbox" />
            <span>Prep milk pitchers and towels</span>
          </div>
          <div className="nps-task-list__item">
            <span className="nps-checkbox" />
            <span>Flush group heads before service</span>
          </div>
          <div className="nps-task-list__item">
            <span className="nps-checkbox" />
            <span>Restock takeaway lids and filter papers</span>
          </div>
        </div>
      </SectionCard>

      <div className="nps-spacer" />

      <div className="nps-dock">
        <Button label="Add Task" tone="primary" />
      </div>
    </>
  );
}

export function NativeProductionShowcase() {
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-design-route', 'true');
    return () => {
      root.removeAttribute('data-design-route');
    };
  }, []);

  const groups: BoardGroup[] = [
    {
      title: 'Home',
      description: 'Web/PWA home flow translated into a cleaner native layout.',
      boards: [
        {
          screen: 'Home',
          state: 'Signed-out gate',
          description: 'Guest mode stays useful and calm.',
          activeNav: 'home',
          content: <HomeGuestState />,
        },
        {
          screen: 'Home',
          state: 'Signed-in result',
          description: 'Search result stays grounded and easier to scan.',
          activeNav: 'home',
          content: <HomeResultState />,
        },
        {
          screen: 'Home',
          state: 'Live-search loading',
          description: 'Loading keeps context visible.',
          activeNav: 'home',
          content: <HomeLoadingState />,
        },
      ],
    },
    {
      title: 'Scanner',
      description: 'Clearer scan choices, preview, and result actions.',
      boards: [
        {
          screen: 'Scanner',
          state: 'Choose input',
          description: 'Modes are clear before action.',
          activeNav: 'scanner',
          content: <ScannerChooseState />,
        },
        {
          screen: 'Scanner',
          state: 'Media preview',
          description: 'Preview builds confidence before analyze.',
          activeNav: 'scanner',
          content: <ScannerPreviewState />,
        },
        {
          screen: 'Scanner',
          state: 'Result ready',
          description: 'Result, save, and share feel unified.',
          activeNav: 'scanner',
          content: <ScannerResultState />,
        },
      ],
    },
    {
      title: 'Tools',
      description: 'Barista tools stay compact, cleaner, and more native.',
      boards: [
        {
          screen: 'Tools',
          state: 'Timer active',
          description: 'Timer reads fast during service.',
          activeNav: 'tools',
          content: <ToolsTimerState />,
        },
        {
          screen: 'Tools',
          state: 'Ratio analysis',
          description: 'Inputs and warnings are tighter.',
          activeNav: 'tools',
          content: <ToolsRatioState />,
        },
        {
          screen: 'Tools',
          state: 'Task list',
          description: 'Tasks feel lighter but still useful.',
          activeNav: 'tools',
          content: <ToolsTasksState />,
        },
      ],
    },
    {
      title: 'Collection',
      description: 'Same library structure, cleaner search and edit flow.',
      boards: [
        {
          screen: 'Collection',
          state: 'Editable library',
          description: 'Fast scan of folders, filters, and items.',
          activeNav: 'collection',
          content: <CollectionEditableState />,
        },
        {
          screen: 'Collection',
          state: 'Guest read-only',
          description: 'Read-only stays soft and useful.',
          activeNav: 'collection',
          content: <CollectionGuestState />,
        },
        {
          screen: 'Collection',
          state: 'Note editor',
          description: 'Editor stays simple and focused.',
          activeNav: 'collection',
          content: <CollectionEditorState />,
        },
      ],
    },
    {
      title: 'Chat',
      description: 'Cleaner thread, lighter deep mode, calmer history.',
      boards: [
        {
          screen: 'Chat',
          state: 'Active conversation',
          description: 'Clearer response chips and composer.',
          activeNav: 'chat',
          content: <ChatConversationState />,
        },
        {
          screen: 'Chat',
          state: 'Deep thinking',
          description: 'Deep mode stays explicit, not confusing.',
          activeNav: 'chat',
          content: <ChatDeepState />,
        },
        {
          screen: 'Chat',
          state: 'History sheet',
          description: 'History feels like a real native sheet.',
          activeNav: 'chat',
          content: <ChatHistoryState />,
        },
      ],
    },
  ];

  return (
    <main className="nps-showcase">
      <header className="nps-showcase__hero">
        <div className="nps-showcase__hero-copy">
          <p className="nps-showcase__eyebrow">Native Parity Route</p>
          <h1 className="nps-showcase__title">BaristaClaw native UI aligned to web and PWA</h1>
          <p className="nps-showcase__subtitle">
            Static 390x844 artboards for Figma capture with the same feature names, screen order, and core flows as the current web/PWA product.
          </p>
        </div>
        <div className="nps-showcase__hero-meta">
          <Tag icon={Sparkles} label="15 boards" tone="accent" />
          <Tag icon={ShieldCheck} label="Static data" tone="success" />
          <Tag icon={CheckCircle2} label="Capture ready" />
        </div>
      </header>

      {groups.map((group) => (
        <section key={group.title} className="nps-group">
          <div className="nps-group__header">
            <div>
              <p className="nps-group__eyebrow">Native Screen Group</p>
              <h2 className="nps-group__title">{group.title}</h2>
            </div>
            <p className="nps-group__description">{group.description}</p>
          </div>
          <div className="nps-group__grid">
            {group.boards.map((board) => (
              <PhoneFrame key={`${board.screen}-${board.state}`} {...board} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
