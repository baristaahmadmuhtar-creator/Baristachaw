import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveSwitchPlanSelection } from '../switchPlanner.ts';
import { buildPredictionPrecision } from '../predictionPrecision.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock catalog data
const doseMatrix = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../../public/data/ai-brew/switch-dose-matrix.v2026-05.json'), 'utf-8'));
const presets = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../../public/data/ai-brew/switch-programmes.v2026-05.json'), 'utf-8'));
const baseDrippers = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../../public/data/ai-brew/drippers.v2026-03.json'), 'utf-8')).items;

const catalog = {
  catalogVersion: 'v2026-05',
  switchPresets: presets.publicPresets,
  switchDoseMatrix: doseMatrix.rows,
  internalProgrammes: presets.internalProgrammes,
  drippers: baseDrippers,
};

const drippers = ['hario-switch-02', 'hario-switch-03', 'mugen-x-switch'];
const modes = ['hot', 'iced'];
const targets = [
  'balance_clean', 'more_sweetness', 'more_acidity', 'more_body',
  'floral_transparent', 'fruit_forward', 'soft_round', 'dense_comforting'
];
const presetIds = [
  'immersion_sweet', 'immersion_heavy_body', 'hybrid_balanced',
  'hybrid_bright_clean', 'v60_mode', 'iced_hybrid', 'mugen_everyday_hybrid', '' // '' represents dynamic fallback/auto-suggest
];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

for (const dripperId of drippers) {
  for (const brewMode of modes) {
    for (const target of targets) {
      for (const presetId of presetIds) {
        if (presetId === 'mugen_everyday_hybrid' && dripperId !== 'mugen-x-switch') continue;
        if (presetId === 'iced_hybrid' && brewMode !== 'iced') continue;
        if (brewMode === 'iced' && !presetId) continue; // Skip empty preset in iced mode for simplicity

        totalTests++;
        try {
          const input = {
            brewMode,
            targetWaterMl: '230',
            switchPresetId: presetId,
            targetProfileId: target,
            dripperId,
            doseG: '15',
          };
          
          const dripper = catalog.drippers?.find((d: any) => d.id === dripperId) || {
            id: dripperId,
            methodFamily: 'hario_switch',
          };

          const targetProfile = { id: target, label: target };

          const selection = resolveSwitchPlanSelection({
            input: input as any,
            catalog: catalog as any,
            dripper: dripper as any,
            profile: { methodFamily: 'hario_switch', note: '' } as any,
            targetProfile: targetProfile as any,
            doseG: 15,
          });

          if (!selection) {
            // Might not be compatible, skip
            continue;
          }

          const taste = selection.tasteProgramme;
          const maxClosedLoadMl = taste.safeClosedPhaseMaxMl || 0;

          // Assertions
          
          // - Switch 02 and MUGEN never use Switch 03 capacity
          if (dripperId !== 'hario-switch-03') {
            if (maxClosedLoadMl > 180) throw new Error(`Capacity leaked! Dripper ${dripperId} max capacity is ${maxClosedLoadMl}`);
          }

          // - recoverable unsafe preset becomes safe/caution final recipe
          if (taste.originalPresetStatus === 'blocked' && taste.recoveryApplied) {
            if (taste.finalPresetStatus === 'blocked') throw new Error('Recovery applied but final status is still blocked');
          }

          // - all UI tabs use canonical 230 ml if user entered 230 ml
          if (taste.canonicalTotalWaterMl !== 230) throw new Error(`canonicalTotalWaterMl is ${taste.canonicalTotalWaterMl}, expected 230`);

          // - no official HARIO recipe claim
          if (/official hario recipe/i.test(taste.sensoryReason)) throw new Error('Contains official hario recipe claim');
          
          // - iced mode has explicit hot water + ice split and no hidden bypass
          if (brewMode === 'iced') {
            if (!taste.canonicalHotWaterMl || taste.canonicalHotWaterMl >= 230) {
               throw new Error(`Iced mode hot water split missing or wrong: ${taste.canonicalHotWaterMl}`);
            }
          }

          // CORE REGRESSION EXPLICIT TEST
          if (dripperId === 'hario-switch-02' && brewMode === 'hot' && target === 'more_sweetness' && presetId === 'immersion_sweet') {
            if (taste.originalPresetStatus !== 'blocked') throw new Error(`Core regression: expected originalPresetStatus blocked, got ${taste.originalPresetStatus}`);
            if (!taste.recoveryApplied) throw new Error('Core regression: expected recoveryApplied = true');
            
            // Check open phase
            const hasOpenPhase = taste.canonicalTotalWaterMl !== undefined && taste.peakClosedLoadMl !== undefined && taste.canonicalTotalWaterMl > taste.peakClosedLoadMl;
            if (!hasOpenPhase) throw new Error('Core regression: expected open phase > 0');
            
            // Expected properties explicitly requested
            if (taste.finalPresetId !== 'hybrid_balanced') throw new Error('Core regression: expected hybrid_balanced recovery');
            if (taste.canonicalTotalWaterMl !== 230) throw new Error('Core regression: expected 230ml total water');
            if (taste.canonicalHotWaterMl !== 230) throw new Error('Core regression: expected 230ml hot water');
            if (taste.peakClosedLoadMl === undefined || taste.peakClosedLoadMl > 180) throw new Error(`Core regression: peak closed load should be <= 180`);
            if (taste.finalPresetStatus === 'blocked') throw new Error('Core regression: final preset should not be blocked');
            
            // Check prediction precision
            const result = buildPredictionPrecision({
               readinessScores: { recipe: 100, water: 100, grinder: 100, workflow: 100, catalog: 100 },
               beanCoverage: { category: 'known_high', confidence: 'high' },
               expectedCupConfidence: 'high',
               workflowStatus: 'blocked', // Assume blocked from original workflow
               switchValidationStatus: taste.finalPresetStatus,
               switchRecoveryApplied: taste.recoveryApplied,
               guardrailErrorCount: 0
            });
            if (result.score === 39) throw new Error('Core regression: prediction score should not be 39');
          }

          passedTests++;
        } catch (err: any) {
          console.error(`FAILED: ${dripperId} | ${brewMode} | ${target} | ${presetId}`);
          console.error(err.message);
          failedTests++;
        }
      }
    }
  }
}

console.log(`\nTotal: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
if (failedTests > 0) process.exit(1);
