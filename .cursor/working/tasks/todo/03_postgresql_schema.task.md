# Task 3: PostgreSQL Database Schema Design

## 1. Goal
- **Objective**: Design and implement the PostgreSQL schema for users, credentials, issuers, badges, and assertions
- **Energy Level**: High 🔋
- **Status**: 🟡 In Progress

## 2. Resources
- **Existing Tools/Files**: 
  - PostgreSQL instance
  - Migration tools
- **Additional Needs**: 
  - Database design tools
  - PostgreSQL documentation
- **Related Files**: Migration scripts, schema definition files

## 3. Ideas & Challenges
### Approaches
- Use PostgreSQL Documentation as a reference
- Leverage JSONB columns for flexible OB JSON storage (JSONB in PostgreSQL)

### Potential Issues
- Balancing relational fields with flexible JSON structures

### Decision Log
- **Decision**: Create dedicated tables for each entity (Users, WebAuthnCredentials, LoginTokens, IssuerProfiles, BadgeClasses, BadgeAssertions)
- **Reasoning**: Clear separation simplifies queries and future migration
- **Alternatives**: Use an ORM like Drizzle ORM for schema definitions

## 4. Plan
### Quick Wins
- Sketch out table relationships on paper (10 mins)

### Major Steps
1. Step One: Define Users and WebAuthnCredentials tables (20 mins) 🎯
2. Step Two: Define IssuerProfiles and BadgeClasses tables (20 mins) 🎯
3. Step Three: Define BadgeAssertions and OTP tables (20 mins) 🎯

## 5. Execution
### Progress Updates
- Initial schema drafted

### Context Resume Point
- Last working on: Drafting Users and WebAuthnCredentials schema
- Next planned action: Create migration scripts for initial schema
- Current blockers: None

## 6. Next Actions & Blockers
### Immediate Next Actions
- Write migration scripts (30 mins)

### Current Blockers
- None

## 7. User Experience & Reflection
### Friction Points
- Determining optimal JSONB usage

### Flow Moments
- Easy reference to PostgreSQL docs

### Observations
- Schema design is critical for long-term flexibility

### Celebration Notes
🎉 Schema draft completed 