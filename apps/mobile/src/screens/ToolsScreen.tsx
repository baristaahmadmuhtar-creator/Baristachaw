import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { TOOLS_PARITY, analyzeQuickRatio, genId, type ParityTodoItem } from '@baristachaw/shared';
import {
  ActionButton,
  AppShell,
  BottomActionDock,
  HeroHeader,
  InfoPill,
  ResultSheet,
  SectionCard,
  SegmentedControl,
} from '../design-system';
import { usePreferredMobileLanguage } from '../hooks/usePreferredMobileLanguage';
import { hapticImpactLight, hapticSuccess } from '../services/haptics';
import { listTodos, saveTodos } from '../services/mobileStore';
import { trackEvent } from '../services/telemetry';
import { uiTokens } from '../theme/tokens';
import { getMobileLocalization } from '../utils/localization';

type ToolsTab = 'timer' | 'ratio' | 'todo';
type ToolsCopy = {
  running: string;
  complete: string;
  paused: string;
  ready: string;
  recipeMismatch: string;
  yieldReady: string;
  yieldPending: string;
  ratioSubtitle: string;
  todoSubtitle: string;
  timerSurface: string;
  target: string;
  presets: string;
  presetsSubtitle: string;
  ratioSurface: string;
  expected: string;
  dose: string;
  water: string;
  output: string;
  result: string;
  addInputs: string;
  coherentRecipe: string;
  enterInputs: string;
  taskSyncIssue: string;
  deleteTask: string;
  noTasks: string;
  addTaskHint: string;
  addTask: string;
  taskSubtitle: string;
  taskCardTitle: string;
  taskCardSubtitle: string;
  restart: string;
  tasksCount: (count: number) => string;
  ratioLabel: string;
  eyPending: string;
  extractionYield: string;
  loadTasksFailed: string;
  saveTasksFailed: string;
};

const DEFAULT_TOOLS_COPY: ToolsCopy = {
  running: 'Running',
  complete: 'Complete',
  paused: 'Paused',
  ready: 'Ready',
  recipeMismatch: 'Recipe mismatch',
  yieldReady: 'Yield ready',
  yieldPending: 'Yield pending',
  ratioSubtitle: 'SCA-first quick ratio analysis with cleaner warning output.',
  todoSubtitle: 'Shift tasks stay visible and compact between pours.',
  timerSurface: 'One focus surface for timing and progress.',
  target: 'Target',
  presets: 'Presets',
  presetsSubtitle: 'Keep common brew windows one tap away.',
  ratioSurface: 'Group inputs first, then warnings below.',
  expected: 'Expected',
  dose: 'Dose (g)',
  water: 'Water (ml)',
  output: 'Output (ml)',
  result: 'Result',
  addInputs: 'Add complete inputs to unlock yield.',
  coherentRecipe: 'Recipe looks coherent. Expected ratio sits around',
  enterInputs: 'Enter dose, water, ratio, TDS, and output to compute extraction yield.',
  taskSyncIssue: 'Task sync issue',
  deleteTask: 'Delete',
  noTasks: 'No tasks yet',
  addTaskHint: 'Add a shift task from the dock.',
  addTask: 'Add Task',
  taskSubtitle: 'Add one task at a time.',
  taskCardTitle: 'Task',
  taskCardSubtitle: 'Keep it short and action-oriented.',
  restart: 'Restart',
  tasksCount: (count: number) => `${count} tasks`,
  ratioLabel: 'Ratio',
  eyPending: 'EY pending',
  extractionYield: 'Extraction Yield',
  loadTasksFailed: 'Unable to load saved tasks right now.',
  saveTasksFailed: 'Unable to save tasks right now.',
};

const TIMER_PRESETS = [120, 150, 180, 240];

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function toSafeNumber(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function ToolsScreen() {
  const preferredLanguage = usePreferredMobileLanguage();
  const { direction, language, web: webT } = useMemo(() => getMobileLocalization(preferredLanguage), [preferredLanguage]);
  const isFocused = useIsFocused();

  const [activeTab, setActiveTab] = useState<ToolsTab>('timer');
  const [duration, setDuration] = useState(180);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [dose, setDose] = useState('18');
  const [water, setWater] = useState('300');
  const [ratio, setRatio] = useState('16.67');
  const [tds, setTds] = useState('1.35');
  const [output, setOutput] = useState('250');

  const [todos, setTodos] = useState<ParityTodoItem[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [todoError, setTodoError] = useState('');
  const [todoSheetOpen, setTodoSheetOpen] = useState(false);
  const copyDraft = useMemo<Partial<ToolsCopy>>(() => {
    if (language === 'id') {
      return {
        running: 'Berjalan',
        complete: 'Selesai',
        paused: 'Dijeda',
        ready: 'Siap',
        recipeMismatch: 'Resep tidak cocok',
        yieldReady: 'Hasil ekstraksi siap',
        yieldPending: 'Hasil ekstraksi menunggu',
        ratioSubtitle: 'Analisis rasio cepat berbasis SCA dengan peringatan yang lebih rapi.',
        todoSubtitle: 'Tugas shift tetap terlihat dan ringkas di sela-sela seduhan.',
        timerSurface: 'Satu permukaan fokus untuk waktu dan progres.',
        target: 'Target',
        presets: 'Preset',
        presetsSubtitle: 'Jaga durasi seduh umum tetap satu ketukan.',
        ratioSurface: 'Kelompokkan input lebih dulu, lalu peringatan di bawah.',
        expected: 'Perkiraan',
        dose: 'Dosis (g)',
        water: 'Air (ml)',
        output: 'Hasil (ml)',
        result: 'Hasil',
        addInputs: 'Masukkan data lengkap untuk menghitung hasil ekstraksi.',
        coherentRecipe: 'Resep terlihat konsisten. Rasio perkiraan ada di sekitar',
        enterInputs: 'Masukkan dosis, air, rasio, TDS, dan hasil untuk menghitung hasil ekstraksi.',
        taskSyncIssue: 'Masalah sinkronisasi tugas',
        deleteTask: 'Hapus',
        noTasks: 'Belum ada tugas',
        addTaskHint: 'Tambahkan tugas giliran dari panel bawah.',
        addTask: 'Tambah Tugas',
        taskSubtitle: 'Tambah satu tugas setiap kali.',
        taskCardTitle: 'Tugas',
        taskCardSubtitle: 'Buat singkat dan berorientasi aksi.',
        restart: 'Mulai ulang',
        tasksCount: (count: number) => `${count} tugas`,
        ratioLabel: 'Rasio',
        eyPending: 'Hasil ekstraksi menunggu',
        extractionYield: 'Hasil Ekstraksi',
        loadTasksFailed: 'Tugas tersimpan belum bisa dimuat sekarang.',
        saveTasksFailed: 'Tugas belum bisa disimpan sekarang.',
      };
    }

    return {
      running: 'Running',
      complete: 'Complete',
      paused: 'Paused',
      ready: 'Ready',
      recipeMismatch: 'Recipe mismatch',
      yieldReady: 'Yield ready',
      yieldPending: 'Yield pending',
      ratioSubtitle: 'SCA-first quick ratio analysis with cleaner warning output.',
      todoSubtitle: 'Shift tasks stay visible and compact between pours.',
      timerSurface: 'One focus surface for timing and progress.',
      target: 'Target',
      presets: 'Presets',
      presetsSubtitle: 'Keep common brew windows one tap away.',
      ratioSurface: 'Group inputs first, then warnings below.',
      expected: 'Expected',
      dose: 'Dose (g)',
      water: 'Water (ml)',
      output: 'Output (ml)',
      result: 'Result',
      addInputs: 'Add complete inputs to unlock yield.',
      coherentRecipe: 'Recipe looks coherent. Expected ratio sits around',
      enterInputs: 'Enter dose, water, ratio, TDS, and output to compute extraction yield.',
      taskSyncIssue: 'Task sync issue',
      deleteTask: 'Delete',
      noTasks: 'No tasks yet',
      addTaskHint: 'Add a shift task from the dock.',
      addTask: 'Add Task',
      taskSubtitle: 'Add one task at a time.',
      taskCardTitle: 'Task',
      taskCardSubtitle: 'Keep it short and action-oriented.',
      restart: 'Restart',
      tasksCount: (count: number) => `${count} tasks`,
      ratioLabel: 'Ratio',
      eyPending: 'EY pending',
      extractionYield: 'Extraction Yield',
      loadTasksFailed: 'Unable to load saved tasks right now.',
      saveTasksFailed: 'Unable to save tasks right now.',
    };
  }, [language]);
  const copy: ToolsCopy = { ...DEFAULT_TOOLS_COPY, ...copyDraft };
  const toolsLabels = useMemo(() => {
    if (language === 'id') {
      return {
        title: 'Alat Barista',
        subtitle: 'Seduh AI, pewaktu, rasio, dan tugas shift.',
        tabs: {
          timer: 'Pewaktu',
          ratio: 'Rasio',
          todo: 'Tugas',
        },
        timerTitle: 'Pewaktu Seduh',
        ratioTitle: 'Kalkulator Rasio',
        taskTitle: 'Tugas',
        taskPlaceholder: 'Tambahkan tugas...',
      };
    }
    return {
      title: TOOLS_PARITY.title,
      subtitle: TOOLS_PARITY.subtitle,
      tabs: {
        timer: TOOLS_PARITY.tabs.timer,
        ratio: TOOLS_PARITY.tabs.ratio,
        todo: TOOLS_PARITY.tabs.todo,
      },
      timerTitle: TOOLS_PARITY.timerTitle,
      ratioTitle: TOOLS_PARITY.ratioTitle,
      taskTitle: TOOLS_PARITY.taskTitle,
      taskPlaceholder: TOOLS_PARITY.taskPlaceholder,
    };
  }, [language]);
  const tabItems = useMemo<Array<{ value: ToolsTab; label: string }>>(() => [
    { value: 'timer', label: toolsLabels.tabs.timer },
    { value: 'ratio', label: toolsLabels.tabs.ratio },
    { value: 'todo', label: toolsLabels.tabs.todo },
  ], [toolsLabels]);

  useEffect(() => {
    if (!running) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setElapsed((current) => {
        if (current >= duration) {
          setRunning(false);
          return duration;
        }
        const next = current + 1;
        if (next >= duration) {
          setRunning(false);
          void hapticSuccess();
          return duration;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [running, duration]);

  useEffect(() => {
    if (!isFocused) return;
    trackEvent('screen_ready', { screen: 'tools' });
    void listTodos()
      .then((items) => {
        setTodos(items);
        setTodoError('');
      })
      .catch((error) => {
        setTodoError(copy.loadTasksFailed);
        trackEvent('screen_error', {
          screen: 'tools',
          reason: 'load_todos_failed',
          message: error instanceof Error ? error.message : 'unknown',
        });
      });
  }, [copy.loadTasksFailed, isFocused]);

  const persistTodos = async (next: ParityTodoItem[]) => {
    try {
      setTodos(next);
      await saveTodos(next);
      setTodoError('');
      return true;
    } catch (error) {
      setTodoError(copy.saveTasksFailed);
      trackEvent('action_failed', {
        action: 'tools_save_todos',
        message: error instanceof Error ? error.message : 'unknown',
      });
      return false;
    }
  };

  const ratioAnalysis = useMemo(() => analyzeQuickRatio({
    doseG: toSafeNumber(dose),
    waterMl: toSafeNumber(water),
    ratio: toSafeNumber(ratio),
    tdsPercent: toSafeNumber(tds),
    outputMl: toSafeNumber(output),
  }), [dose, water, ratio, tds, output]);

  const progress = useMemo(() => {
    if (duration <= 0) return 0;
    return Math.round((elapsed / duration) * 100);
  }, [elapsed, duration]);

  const timerStateLabel = running ? copy.running : elapsed >= duration ? copy.complete : elapsed > 0 ? copy.paused : copy.ready;
  const ratioTone = ratioAnalysis.warnings.length > 0 ? 'warning' : ratioAnalysis.extractionYield > 0 ? 'success' : 'neutral';
  const ratioSummary = ratioAnalysis.warnings.length > 0
    ? copy.recipeMismatch
    : ratioAnalysis.extractionYield > 0
      ? copy.yieldReady
      : copy.yieldPending;

  const addTodo = async () => {
    const text = newTodo.trim();
    if (!text) return;

    const entry: ParityTodoItem = {
      id: genId('todo'),
      text,
      done: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const persisted = await persistTodos([entry, ...todos]);
    if (persisted) {
      setNewTodo('');
      setTodoSheetOpen(false);
      trackEvent('action_succeeded', { action: 'tools_add_todo' });
      await hapticSuccess();
    }
  };

  const headerSubtitle = useMemo(() => {
    switch (activeTab) {
      case 'ratio':
        return copy.ratioSubtitle;
      case 'todo':
        return copy.todoSubtitle;
      default:
        return toolsLabels.subtitle;
    }
  }, [activeTab, copy.ratioSubtitle, copy.todoSubtitle, toolsLabels.subtitle]);

  const bottomDock = useMemo(() => {
    if (activeTab === 'timer') {
      return (
        <BottomActionDock
          primaryAction={{
            label: running ? webT.pause : elapsed >= duration && elapsed > 0 ? copy.restart : webT.start,
            onPress: () => {
              void hapticImpactLight();
              if (elapsed >= duration && !running) {
                setElapsed(0);
              }
              setRunning((value) => !value);
            },
          }}
          secondaryActions={[
            {
              label: webT.reset,
              onPress: () => {
                void hapticImpactLight();
                setElapsed(0);
                setRunning(false);
              },
            },
          ]}
        />
      );
    }

    if (activeTab === 'todo') {
      return (
        <BottomActionDock
          primaryAction={{ label: copy.addTask, onPress: () => setTodoSheetOpen(true) }}
        />
      );
    }

    return undefined;
  }, [activeTab, duration, elapsed, running]);

  return (
    <>
      <AppShell
        header={(
          <HeroHeader
            eyebrow={toolsLabels.title}
            title={toolsLabels.title}
            subtitle={headerSubtitle}
            direction={direction}
            status={(
              <InfoPill
                label={
                  activeTab === 'timer'
                    ? timerStateLabel
                    : activeTab === 'ratio'
                      ? ratioSummary
                      : copy.tasksCount(todos.length)
                }
                tone={activeTab === 'ratio' ? ratioTone : activeTab === 'todo' ? 'success' : running ? 'success' : 'accent'}
              />
            )}
          />
        )}
        bottomDock={bottomDock}
      >
        <SegmentedControl items={tabItems} value={activeTab} onChange={setActiveTab} direction={direction} />

        {activeTab === 'timer' ? (
          <>
            <SectionCard title={toolsLabels.timerTitle} subtitle={copy.timerSurface} tone="accent">
              <View style={styles.badgeRow}>
                <InfoPill label={timerStateLabel} tone={running ? 'success' : elapsed >= duration ? 'warning' : 'accent'} />
                <InfoPill label={`${copy.target} ${formatClock(duration)}`} />
              </View>
              <Text style={styles.clock}>{formatClock(elapsed)}</Text>
              <Text style={styles.centerCopy}>{copy.target} {formatClock(duration)} · {progress}%</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, progress))}%` }]} />
              </View>
            </SectionCard>

            <SectionCard title={copy.presets} subtitle={copy.presetsSubtitle} compact>
              <View style={styles.inlineButtonRow}>
                {TIMER_PRESETS.map((seconds) => (
                  <ActionButton
                    key={seconds}
                    label={formatClock(seconds)}
                    tone={duration === seconds ? 'primary' : 'ghost'}
                    compact
                    direction={direction}
                    onPress={() => {
                      void hapticImpactLight();
                      setDuration(seconds);
                      setElapsed(0);
                      setRunning(false);
                    }}
                  />
                ))}
              </View>
            </SectionCard>
          </>
        ) : null}

        {activeTab === 'ratio' ? (
          <>
            <SectionCard title={toolsLabels.ratioTitle} subtitle={copy.ratioSurface} tone="accent">
              <View style={styles.badgeRow}>
                <InfoPill label={`${copy.expected} ${ratioAnalysis.expectedRatio || '—'}:1`} tone="accent" />
                <InfoPill label={ratioAnalysis.extractionYield ? `EY ${ratioAnalysis.extractionYield.toFixed(2)}%` : copy.eyPending} tone={ratioAnalysis.extractionYield ? 'success' : 'neutral'} />
                <InfoPill label={ratioSummary} tone={ratioTone} />
              </View>

              <View style={styles.inputGrid}>
                <View style={styles.inputTile}>
                  <Text style={styles.inputLabel}>{copy.dose}</Text>
                  <TextInput value={dose} onChangeText={setDose} style={styles.input} keyboardType="decimal-pad" />
                </View>
                <View style={styles.inputTile}>
                  <Text style={styles.inputLabel}>{copy.water}</Text>
                  <TextInput value={water} onChangeText={setWater} style={styles.input} keyboardType="decimal-pad" />
                </View>
                <View style={styles.inputTile}>
                  <Text style={styles.inputLabel}>{copy.ratioLabel}</Text>
                  <TextInput value={ratio} onChangeText={setRatio} style={styles.input} keyboardType="decimal-pad" />
                </View>
                <View style={styles.inputTile}>
                  <Text style={styles.inputLabel}>TDS %</Text>
                  <TextInput value={tds} onChangeText={setTds} style={styles.input} keyboardType="decimal-pad" />
                </View>
                <View style={styles.inputTile}>
                  <Text style={styles.inputLabel}>{copy.output}</Text>
                  <TextInput value={output} onChangeText={setOutput} style={styles.input} keyboardType="decimal-pad" />
                </View>
              </View>
            </SectionCard>

            <SectionCard
              title={copy.result}
              subtitle={ratioAnalysis.extractionYield ? `${copy.extractionYield} ${ratioAnalysis.extractionYield.toFixed(2)}%` : copy.addInputs}
              tone={ratioAnalysis.warnings.length > 0 ? 'warning' : 'subtle'}
              compact
            >
              {ratioAnalysis.warnings.length > 0 ? (
                <View style={styles.warningList}>
                  {ratioAnalysis.warnings.map((warning) => (
                    <Text key={warning} style={styles.warningText}>{warning}</Text>
                  ))}
                </View>
              ) : (
                <Text style={styles.bodyCopy}>
                  {ratioAnalysis.extractionYield > 0
                    ? `${copy.coherentRecipe} ${ratioAnalysis.expectedRatio || '—'}:1.`
                    : copy.enterInputs}
                </Text>
              )}
            </SectionCard>
          </>
        ) : null}

        {activeTab === 'todo' ? (
          <>
            {todoError ? (
              <SectionCard tone="warning" title={copy.taskSyncIssue} subtitle={todoError} compact />
            ) : null}

            <View style={styles.todoStage}>
              <FlatList<ParityTodoItem>
                data={todos}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.todoList}
                renderItem={({ item }) => (
                  <SectionCard compact>
                    <View style={styles.todoRow}>
                      <Pressable
                        style={styles.todoToggle}
                        onPress={() => {
                          const next = todos.map((todo) =>
                            todo.id === item.id
                              ? { ...todo, done: !todo.done, updatedAt: Date.now() }
                              : todo,
                          );
                          void persistTodos(next).then((persisted) => {
                            if (persisted) {
                              trackEvent('action_succeeded', { action: 'tools_toggle_todo', done: !item.done });
                            }
                          });
                        }}
                      >
                        <View style={[styles.checkbox, item.done ? styles.checkboxDone : null]} />
                        <Text style={[styles.todoText, item.done ? styles.todoTextDone : null]}>{item.text}</Text>
                      </Pressable>
                      <ActionButton
                        label={copy.deleteTask}
                        tone="ghost"
                        compact
                        direction={direction}
                        onPress={() => {
                          const next = todos.filter((todo) => todo.id !== item.id);
                          void persistTodos(next).then((persisted) => {
                            if (persisted) {
                              trackEvent('action_succeeded', { action: 'tools_delete_todo' });
                            }
                          });
                        }}
                      />
                    </View>
                  </SectionCard>
                )}
                ListEmptyComponent={(
                  <SectionCard tone="subtle" title={copy.noTasks} subtitle={copy.addTaskHint} compact />
                )}
              />
            </View>
          </>
        ) : null}
      </AppShell>

      <ResultSheet
        visible={todoSheetOpen}
        direction={direction}
        title={toolsLabels.taskTitle}
        subtitle={copy.taskSubtitle}
        onClose={() => setTodoSheetOpen(false)}
        actions={[
          {
            label: copy.addTask,
            tone: 'primary',
            disabled: !newTodo.trim(),
            onPress: () => { void addTodo(); },
          },
        ]}
        content={(
          <SectionCard title={copy.taskCardTitle} subtitle={copy.taskCardSubtitle} compact>
            <TextInput
              value={newTodo}
              onChangeText={setNewTodo}
              style={styles.input}
              placeholder={toolsLabels.taskPlaceholder}
              placeholderTextColor={uiTokens.text.muted}
            />
          </SectionCard>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  inlineButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bodyCopy: {
    color: uiTokens.text.primary,
    fontFamily: uiTokens.fontFamily.regular,
    fontSize: uiTokens.typography.body.fontSize,
    lineHeight: uiTokens.typography.body.lineHeight + 1,
  },
  centerCopy: {
    textAlign: 'center',
    color: uiTokens.text.secondary,
    fontFamily: uiTokens.fontFamily.medium,
    fontSize: uiTokens.typography.body.fontSize,
    lineHeight: uiTokens.typography.body.lineHeight,
  },
  clock: {
    fontSize: 56,
    lineHeight: 60,
    color: uiTokens.colors.accent,
    fontFamily: uiTokens.fontFamily.bold,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -1.2,
  },
  progressTrack: {
    height: 10,
    borderRadius: uiTokens.radius.pill,
    backgroundColor: uiTokens.surface.soft,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: uiTokens.radius.pill,
    backgroundColor: uiTokens.colors.accent,
  },
  inputGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  inputTile: {
    width: '48%',
    minWidth: 150,
    gap: 6,
  },
  inputLabel: {
    color: uiTokens.text.secondary,
    fontFamily: uiTokens.fontFamily.medium,
    fontSize: uiTokens.typography.caption.fontSize,
    lineHeight: uiTokens.typography.caption.lineHeight,
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: uiTokens.border.soft,
    borderRadius: uiTokens.radius.input,
    backgroundColor: uiTokens.surface.strong,
    paddingHorizontal: 14,
    color: uiTokens.text.primary,
    fontFamily: uiTokens.fontFamily.regular,
    fontSize: uiTokens.typography.body.fontSize,
    lineHeight: uiTokens.typography.body.lineHeight,
  },
  warningList: {
    gap: 8,
  },
  warningText: {
    color: uiTokens.colors.warning,
    fontFamily: uiTokens.fontFamily.medium,
    fontSize: uiTokens.typography.body.fontSize,
    lineHeight: uiTokens.typography.body.lineHeight,
  },
  todoStage: {
    flex: 1,
  },
  todoList: {
    gap: 10,
    paddingBottom: 140,
  },
  todoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  todoToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: uiTokens.radius.pill,
    borderWidth: 2,
    borderColor: uiTokens.border.strong,
  },
  checkboxDone: {
    backgroundColor: uiTokens.colors.success,
    borderColor: uiTokens.colors.success,
  },
  todoText: {
    flex: 1,
    color: uiTokens.text.primary,
    fontFamily: uiTokens.fontFamily.medium,
    fontSize: uiTokens.typography.body.fontSize,
    lineHeight: uiTokens.typography.body.lineHeight,
  },
  todoTextDone: {
    textDecorationLine: 'line-through',
    color: uiTokens.text.muted,
  },
});
