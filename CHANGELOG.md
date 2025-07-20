# Changelog

## [Unreleased]

### Fixed
- **Piano Key Animation**: Fixed issue where keys would disappear after fade-out animation
  - Implemented CSS pseudo-element (::after) approach for highlight overlays
  - Base keys now always remain visible while only highlights fade
  - Removed opacity animations from PianoKeyAnimator - now handles only transform and shadows
  - Added smooth 200ms CSS transitions for highlight fade effects
  - Velocity-sensitive opacity levels now apply to overlay, not base key
  - No more jarring visual "pop" when animations complete

- **C Keys Not Highlighting**: Fixed conflict between landmark indicators and active highlights
  - Changed landmark dots from ::after to ::before pseudo-element
  - Ensures C keys can display both landmark indicator and highlight overlay
  - No CSS conflicts when C keys are pressed

- **Missing Fade-Out Animation**: Fixed instant transition on key release
  - Moved background gradients to base pseudo-element rules
  - Active state now only changes opacity, not background
  - Ensures smooth fade-out matches fade-in behavior

### Technical Changes
- `PianoKeyAnimator.ts`: Removed opacity animation logic, focuses on transform/shadow only
- `PianoKeyboard.css`: 
  - Added pseudo-element overlays for highlight effects
  - Landmark indicators use ::before to avoid conflicts
  - Background gradients always defined for smooth transitions
- Separated visual concerns: base key (static) vs highlight overlay (animated)
- Improved performance by letting CSS handle opacity transitions