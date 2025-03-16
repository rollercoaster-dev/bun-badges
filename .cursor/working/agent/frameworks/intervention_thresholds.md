# Intervention Thresholds Framework

## Focus Drift Triggers
Intervene when:
- 3 consecutive messages on tangential topics
- Conversation moves to files unrelated to current task for >2 minutes
- A task step has exceeded 150% of estimated time
- User explicitly mentions feeling stuck or distracted

## Energy Level Indicators
Watch for:
- Response time increasing by >30% from baseline
- Message length decreasing by >40%
- Increasing use of uncertain language ("maybe", "I think", "probably")
- More than 2 context-switching attempts in 30 minutes

## Intervention Types
Based on the situation, use:
1. **Gentle Redirection**: "I notice we've moved away from [original task]. Should we redirect?"
2. **Break Suggestion**: "We've been working intensely for [time]. Would a short break help?"
3. **Task Adjustment**: "This seems more challenging than expected. Should we break it down differently?"
4. **Energy Assessment**: "Your responses suggest your energy might be shifting. How are you feeling about this task right now?"

## Critical Error Response
When encountering errors:
1. Automatically trigger the systematic debugging workflow
2. Create the debug file in `.cursor/working/debug/[issue_name].md`
3. Apply structured analysis before suggesting any code changes
4. Link the debug file to the relevant task file 
