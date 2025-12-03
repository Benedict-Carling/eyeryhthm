# EyeRhythm Camera Setup - Lightweight Testing Strategy

## Minimal Testing Approach for Rapid Iteration

### Core Philosophy

- **Test only what breaks often** - Focus on critical user flows
- **Manual testing first** - Playwright for automation only after features stabilize
- **Quick feedback loops** - Tests should run in <30 seconds
- **Fail fast** - Catch blocking issues, not edge cases

## Essential Test Files Only

### Test Structure (Minimal)

```
tests/
├── camera-smoke.spec.ts          # 5 critical tests
├── camera-manual-checklist.md    # Manual testing guide
└── fixtures/
    └── camera-setup.ts           # Reusable camera context
```

### `tests/camera-smoke.spec.ts`

**Purpose**: Catch breaking changes only
**5 Critical Tests**:

1. **Permission button appears** - `expect(page.getByRole('button', { name: /camera/i })).toBeVisible()`
2. **Permission can be granted** - `await context.grantPermissions(['camera'])`
3. **Video element renders** - `expect(page.locator('video')).toBeVisible()`
4. **Error shows when denied** - Block permissions, check error message
5. **Page doesn't crash** - No console errors during flow

### `tests/camera-manual-checklist.md`

**Purpose**: Quick manual verification during development
**2-minute checklist**:

- [ ] Click camera button → permission dialog appears
- [ ] Allow permission → video feed shows
- [ ] Block permission → error message shows
- [ ] Refresh page → state resets correctly
- [ ] Open dev tools → no console errors

## Lightweight Test Utilities

### `tests/fixtures/camera-setup.ts`

**Purpose**: One reusable context for all tests

```typescript
// Single fixture that handles camera permissions
export const cameraTest = base.extend<{ cameraPage: Page }>({
  cameraPage: async ({ page, context }, use) => {
    await context.grantPermissions(["camera"]);
    await page.goto("/");
    await use(page);
  },
});
```

## Development Testing Workflow

### During Active Development

1. **Browser dev tools** - Check console for errors
2. **Manual clicking** - Test permission flow by hand
3. **Network tab** - Ensure no unexpected requests
4. **Quick device test** - Test on phone occasionally

### Before Git Push

1. **Run smoke tests** - `npm test` (30 seconds max)
2. **Manual checklist** - 2-minute verification
3. **Visual check** - Does it look right?

### Weekly Regression

1. **Cross-browser manual** - Test in Chrome, Firefox, Safari
2. **Mobile device test** - Real phone testing
3. **Performance check** - Does video start quickly?

## Minimal Assertions Strategy

### What TO Test

- **Core user flow works** - Permission → Video display
- **Error states show** - Permission denied shows error
- **No JavaScript errors** - Console stays clean
- **Basic responsiveness** - Works on mobile screen sizes

### What NOT to Test (Yet)

- ~~Video quality/resolution~~ - Test manually for now
- ~~Frame rate analysis~~ - Not critical for MVP
- ~~Memory usage~~ - Optimize later
- ~~Accessibility compliance~~ - Add after core features work
- ~~Cross-browser edge cases~~ - Focus on Chrome first
- ~~Visual regression~~ - Screenshots too brittle during iteration

## Quick Debugging Tools

### Console Logging Strategy

```typescript
// Add temporary logging for debugging
console.log("Camera state:", { hasPermission, isLoading, error });
```

### Browser DevTools Shortcuts

- **F12 → Console** - Check for errors
- **F12 → Network** - Verify no unexpected requests
- **F12 → Application → Permissions** - Reset camera permissions
- **F12 → Performance** - Check if video is smooth

## Iteration-Friendly Test Commands

### Package.json Scripts

```json
{
  "test:quick": "playwright test camera-smoke.spec.ts",
  "test:manual": "open tests/camera-manual-checklist.md",
  "test:dev": "playwright test --ui --headed"
}
```

### Test Execution Strategy

- **During development** - Manual testing only
- **Before commits** - `npm run test:quick`
- **Weekly** - Full manual checklist
- **Before releases** - Comprehensive testing

## When to Add More Tests

### Expand Testing When:

- **Core flow is stable** - No daily breaking changes
- **Adding complex features** - Blink detection, analytics
- **User reports bugs** - Add specific test for that issue
- **Performance becomes important** - Add performance benchmarks

### Signs You Need More Tests:

- **Same bug appears twice** - Add regression test
- **Breaking changes go unnoticed** - Add smoke test
- **Manual testing takes >5 minutes** - Automate common flows

## Lightweight CI/CD Integration

### GitHub Actions (Minimal)

```yaml
# Only run on main branch pushes
- name: Quick Tests
  run: npm run test:quick
  if: github.ref == 'refs/heads/main'
```

### Local Pre-commit Hook

```bash
# Simple pre-commit check
npm run test:quick && echo "✅ Tests passed"
```

This lightweight approach prioritizes speed and iteration over comprehensive coverage, allowing rapid development while catching the most critical issues that would block users.
