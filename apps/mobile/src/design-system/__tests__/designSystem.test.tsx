import { resolveSegmentActiveState } from '../SegmentedControl';
import { resolveSheetBottomPadding, shouldRenderResultSheet } from '../ResultSheet';
import { resolveDockBottomPadding } from '../BottomActionDock';
import { resolveMobileThemeContract } from '../../theme/tokens';

describe('mobile design system', () => {
  test('resolves light and dark theme contracts', () => {
    expect(resolveMobileThemeContract('light').colors.backgroundBase).toBe('#EEF2F7');
    expect(resolveMobileThemeContract('dark').colors.textPrimary).toBe('#F8FAFC');
  });

  test('keeps dock and sheet safe-area spacing', () => {
    expect(resolveDockBottomPadding(34)).toBe(40);
    expect(resolveSheetBottomPadding(34)).toBe(46);
  });

  test('resolves segmented control active and inactive state', () => {
    expect(resolveSegmentActiveState('all', 'all').active).toBe(true);
    expect(resolveSegmentActiveState('notes', 'all').active).toBe(false);
  });

  test('resolves result sheet open and closed state', () => {
    expect(shouldRenderResultSheet(true)).toBe(true);
    expect(shouldRenderResultSheet(false)).toBe(false);
  });
});
