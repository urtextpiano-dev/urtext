#!/bin/bash
# Script to consolidate fingering tests by removing redundant files
# Run this after confirming the merged tests are working

echo "Fingering Test Consolidation Script"
echo "==================================="

# Create backup first
echo "Creating backup of test files..."
cp -r . ../fingering.backup
echo "Backup created at __tests__/features/fingering.backup"

# Use the revised Phase 4 file
echo ""
echo "Using revised Phase 4 test file..."
if [ -f "phase-4-production-integration-revised.test.tsx" ]; then
    mv phase-4-production-integration-revised.test.tsx phase-4-production-integration.test.tsx
    echo "✓ Renamed phase-4-production-integration-revised.test.tsx to phase-4-production-integration.test.tsx"
fi

# Remove redundant files
echo ""
echo "Removing redundant test files..."

# Remove redundant store test
if [ -f "stores/fingeringStore.test.ts" ]; then
    rm stores/fingeringStore.test.ts
    echo "✓ Removed stores/fingeringStore.test.ts (covered by Phase 1)"
fi

# Remove component tests that were merged
if [ -f "components/FingeringLayer.test.tsx" ]; then
    rm components/FingeringLayer.test.tsx
    echo "✓ Removed components/FingeringLayer.test.tsx (merged into Phase 2)"
fi

if [ -f "components/FingeringInlineInput.test.tsx" ]; then
    rm components/FingeringInlineInput.test.tsx
    echo "✓ Removed components/FingeringInlineInput.test.tsx (merged into Phase 3)"
fi

# Remove hook tests that were merged
if [ -f "hooks/useFingeringInteraction.test.ts" ]; then
    rm hooks/useFingeringInteraction.test.ts
    echo "✓ Removed hooks/useFingeringInteraction.test.ts (covered by Phase 3)"
fi

if [ -f "hooks/useFingeringPositioning.test.ts" ]; then
    rm hooks/useFingeringPositioning.test.ts
    echo "✓ Removed hooks/useFingeringPositioning.test.ts (merged into Phase 2)"
fi

# Clean up empty directories
echo ""
echo "Cleaning up empty directories..."
rmdir stores 2>/dev/null && echo "✓ Removed empty stores directory"
rmdir components 2>/dev/null && echo "✓ Removed empty components directory"
rmdir hooks 2>/dev/null && echo "✓ Removed empty hooks directory"

echo ""
echo "Consolidation complete!"
echo ""
echo "Final test structure:"
echo "- phase-1-data-foundation.test.ts"
echo "- phase-2-basic-display.test.tsx (includes positioning & performance tests)"
echo "- phase-3-user-interaction.test.tsx (includes input edge cases & touch tests)"
echo "- phase-4-production-integration.test.tsx (revised version with AI feedback)"
echo ""
echo "Total test files: 4 (down from 10)"