# Camera Manual Testing Checklist

**Purpose**: Quick manual verification during development  
**Time**: 2-minute checklist

## Manual Testing Steps

- [ ] Click camera button → permission dialog appears
- [ ] Allow permission → video feed shows
- [ ] Block permission → error message shows
- [ ] Refresh page → state resets correctly
- [ ] Open dev tools → no console errors

## Quick Debugging Tools

### Browser DevTools Shortcuts

- **F12 → Console** - Check for errors
- **F12 → Network** - Verify no unexpected requests
- **F12 → Application → Permissions** - Reset camera permissions
- **F12 → Performance** - Check if video is smooth

### Console Logging for Debugging

```typescript
// Add temporary logging for debugging
console.log("Camera state:", { hasPermission, isLoading, error });
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