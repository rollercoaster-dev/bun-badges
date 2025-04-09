# Task Management Framework

## Purpose
This framework outlines the collaborative process for initiating, planning, executing, monitoring, and completing tasks within the `.cursor/working/tasks/` directory. It integrates principles from focus, time, energy, user perspective, and intervention frameworks, using the `task_template.md` structure. The goal is maximum effectiveness and clarity for both the user and the AI agent.

## Task Lifecycle

### 1. Task Initiation
- **Trigger:** User request or identified need (e.g., from codebase analysis, debugging).
- **Action (AI):**
    - Clarify the goal (ask 1-2 questions if ambiguous).
    - Create a new task file in `.cursor/working/tasks/todo/` using `task_template.md`.
    - Populate initial sections: Goal, Objective, Status (🟡 In Progress).
    - Assess initial Energy Level requirement (High/Medium/Low).
    - Identify relevant existing Resources/Files.

### 2. Task Planning
- **Goal:** Break down the task into manageable steps.
- **Action (AI & User Collab):**
    - Discuss potential Approaches & Challenges (populate Section 3).
    - Define **Quick Wins** (Section 4) for dopamine boosts (`focus_management.md`).
    - Break down **Major Steps** (Section 4) into units ideally under 25-50 mins (`time_management.md`).
    - Assign **Time Estimates** with buffer (Section 4) (`time_management.md`).
    - **Perspective Check:** Confirm the plan aligns with the user's thinking (`user_perspective.md`).

### 3. Task Execution
- **Goal:** Work through the planned steps systematically.
- **Action (AI & User Collab):**
    - Focus on one step at a time.
    - Use Pomodoro cycles if helpful (suggest 25/5 or 50/10) (`time_management.md`).
    - Update **Progress Updates** in Section 5 as steps are completed.
    - Track **Related Files** modified in Section 2.
    - AI provides code changes, runs commands, searches codebase as needed.

### 4. Task Monitoring & Adaptation (Ongoing during Execution)
- **Goal:** Maintain focus, manage energy, and adapt the plan as needed.
- **Action (AI):**
    - **Focus Management:** Monitor for drift (3+ tangential messages, unrelated files, scope creep). If detected, use the **Parking Lot Process** (`focus_management.md`).
    - **Time Management:** Track actual vs. estimated time. Alert if a step exceeds 150% of estimate (`intervention_thresholds.md`). Provide "time remaining" estimates.
    - **Energy Management:** Monitor for energy level indicators (response time/length changes, uncertain language). Suggest breaks or adjustments (`energy_management.md`, `intervention_thresholds.md`).
    - **User Perspective:** Periodically check in on approach feel and friction points (`user_perspective.md`).
    - **Status Updates:** Update the file `Status:` field and use visual emojis (🔴🟡🟢🎯🎉) in conversation (`focus_management.md`).
    - **Blockers:** Identify and document **Current Blockers** (Section 6), suggesting solutions. Update task Status to 🔴 Blocked if necessary.
    - **Context Resume:** Maintain the **Context Resume Point** (Section 5) for smooth transitions.

### 5. Task Completion
- **Goal:** Finalize the task and reflect on the process.
- **Action (AI & User Collab):**
    - Verify all steps are complete and the objective is met.
    - Update Status to 🟢 Complete.
    - **Perspective Check:** Conduct **Task Closure Experience Check** (Section 7) (`user_perspective.md`). Document Friction Points, Flow Moments, Observations, Celebration Notes.
    - **File Management:**
        - AI reminds the user: "This task is complete. Please move the file `[task_filename]` from `todo/` to `completed/`." (Or from `working/` if not using todo).
    - **Learning Log:** AI documents key learnings in `.cursor/working/agent/memory/learning_log.md`.

## Integration with Other Frameworks:
- **`focus_management.md`:** Used for drift detection, parking lot, progress tracking.
- **`time_management.md`:** Used for estimation, Pomodoro suggestions, tracking.
- **`energy_management.md`:** Used for monitoring user energy, suggesting breaks.
- **`user_perspective.md`:** Integrated throughout for alignment and reflection.
- **`intervention_thresholds.md`:** Defines triggers for AI intervention (drift, time overruns, energy dips).
- **`task_template.md`:** Provides the structure for documenting the entire lifecycle. 