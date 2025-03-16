# Task 7: (Optional) Implement Badge Baking

## 1. Goal
- **Objective**: Enable embedding badge metadata into PNG images ("baking") for enhanced verification
- **Energy Level**: Medium 🔋
- **Status**: 🟢 Implemented (Optional Feature)

## 2. Resources
- **Existing Tools/Files**: 
  - Badge JSON stored in database
  - Badge controller for JSON-LD formatting
- **Additional Needs**:
  - PNG processing library (png-itxt)
  - SVG string manipulation
- **Related Files**: 
  - src/controllers/badge.controller.ts
  - src/routes/badges.routes.ts
  - src/utils/badge-baker.ts (new)
  - src/types/png-itxt.d.ts (new)

## 3. Ideas & Challenges
### Approaches
1. Use `png-itxt` library for PNG badge baking:
   - Embeds metadata into PNG tEXt chunks
   - Stream-based processing for efficient handling

2. For SVG badges, use direct XML manipulation:
   - Add the Open Badges namespace to the SVG tag 
   - Insert the assertion as a CDATA block inside an `openbadges:assertion` element
   - Simpler implementation with better browser support

### Potential Issues
- PNG extraction has compatibility challenges in some environments
- Need to support both PNG and SVG formats
- Ensuring cross-platform compatibility

### Decision Log
- **Decision**: Implement badge baking for both PNG and SVG files
- **Reasoning**: SVG offers easier implementation and better extraction, while PNG is more widely used
- **Alternatives**: 
  - Considered `@larswander/png-text` but had browser compatibility issues
  - Considered `png-metadata` but had module import issues

## 4. Plan
### Quick Wins
- ✅ Create utility function to bake PNG badges

### Major Steps
1. ✅ Install necessary dependencies (`png-itxt`)
2. ✅ Create badge baking utility functions for both PNG and SVG
3. ✅ Implement baking endpoint for downloaded badges
4. ✅ Add badge extraction utility, with robust SVG support and basic PNG verification

## 5. Execution
### Progress Updates
- Research completed on badge baking methods and libraries
- Implementation complete for both PNG and SVG badge baking
- Added endpoints for baking and verification
- Created tests to validate implementation

### Context Resume Point
- Last action: Completed badge baking functionality
- Next action: Consider future enhancements for PNG extraction
- Current status: Complete and ready for use

## 6. Next Actions & Blockers
### Immediate Next Actions
- Document the API endpoints
- Consider future enhancements for PNG extraction

### Current Blockers
- None

## 7. User Experience & Reflection
### Friction Points
- PNG extraction is limited due to library constraints, but baking works well
- SVG provides complete baking and extraction support

### Flow Moments
- Badge baking provides users with self-contained badges with embedded verification data
- SVG badges offer the best experience for both baking and extraction

### Observations
- This feature enables offline badge verification, enhancing badge portability and security
- SVG format provides better extraction capabilities than PNG

### Celebration Notes
🎉 Badge baking implementation completed! Open Badges 2.0 compliance achieved for portable credential format. The implementation supports both PNG and SVG formats, with SVG offering the most reliable extraction process. 