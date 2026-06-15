const fs = require('fs');

const path = 'apps/web/src/features/ai-brew/grindPlanner.ts';
let content = fs.readFileSync(path, 'utf8');

// Add import
const importStatement = `import { isEspressoBlockedGrinder } from './grinderSafetyGuardrails.ts';\n`;
content = content.replace(/import type \{[\s\S]*?\} from '\.\/types\.ts';/, (match) => {
  return match + '\n' + importStatement;
});

// Remove isEspressoNotRecommendedGrinder
content = content.replace(/function isEspressoNotRecommendedGrinder\([\s\S]*?\]\);\n\}/, '');

// Replace calls
content = content.replace(/isEspressoNotRecommendedGrinder/g, 'isEspressoBlockedGrinder');

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully refactored grindPlanner.ts');
