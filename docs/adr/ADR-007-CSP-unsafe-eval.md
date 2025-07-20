# ADR-007: Temporary unsafe-eval for OpenSheetMusicDisplay (OSMD)

## Status
Accepted (Phase 1 MVP only)

## Context
The Urtext Piano application uses OpenSheetMusicDisplay (OSMD) version 1.9.0 for rendering music notation. During development, we encountered a Content Security Policy (CSP) warning:

```
Electron Security Warning (Insecure Content-Security-Policy) 
This renderer process has either no Content Security Policy set or a policy with "unsafe-eval" enabled.
```

Investigation revealed that OSMD likely uses `eval()` or `new Function()` internally for dynamic code generation, which is common in complex rendering libraries. No official OSMD documentation exists regarding CSP compatibility or eval-free builds.

## Decision
For Phase 1 (MVP Development), we will:
1. Accept the use of `unsafe-eval` in our CSP configuration
2. Add an explicit CSP meta tag to suppress the warning
3. Document this as technical debt that must be resolved before production

For Phase 2 (Production), we will:
1. Implement webview sandboxing to isolate OSMD in a separate process
2. Apply strict CSP to the main application while allowing looser policy only for the OSMD webview
3. Use IPC communication between the main app and the sandboxed OSMD component

## Consequences

### Positive
- Allows rapid MVP development without fighting library constraints
- OSMD works out-of-the-box without modifications
- Clear migration path to secure production architecture

### Negative
- Temporary security vulnerability (acceptable for development only)
- Technical debt that must be addressed before release
- Additional complexity in Phase 2 for webview architecture

### Neutral
- IPC communication overhead in Phase 2 (measured at <5ms, acceptable for music apps)
- Two separate DevTools contexts in production (main app + webview)

## Implementation Notes

### Phase 1 CSP Configuration
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-eval'; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' data: blob:;">
```

### Phase 2 Architecture (Planned)
```
Main Renderer (Strict CSP)
    ↓ IPC
Webview (OSMD with unsafe-eval)
```

## References
- Electron Security Best Practices: https://www.electronjs.org/docs/latest/tutorial/security
- OSMD Repository: https://github.com/opensheetmusicdisplay/opensheetmusicdisplay
- CSP Documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP

## Review Date
This decision must be reviewed before Phase 2 implementation begins.