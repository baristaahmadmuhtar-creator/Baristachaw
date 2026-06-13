import { resolveWorkflowTutorialDetail } from '../apps/web/src/features/ai-brew/workflowTutorials.ts';

const context = {
  methodFamily: 'april' as any,
  recipeStyle: 'competition_two_pour',
  actionType: 'pour' as any,
  brewMode: 'hot' as any,
  hasWarning: false,
  targetProfileId: 'more_acidity',
  roastLevel: 'dark' as any,
  language: 'id',
};

const result = resolveWorkflowTutorialDetail(context);
console.log('Result:', result);
console.log('Length:', result.length);
