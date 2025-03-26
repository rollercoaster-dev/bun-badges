#!/usr/bin/env bun

/**
 * Script to automate creating GitHub issues from task files using GitHub CLI
 *
 * Usage:
 *   bun run scripts/create-github-issues.ts [task-file] [options]
 *
 * Example:
 *   bun run scripts/create-github-issues.ts .cursor/working/tasks/todo/open-source-setup.md
 *
 * Prerequisites:
 *   - GitHub CLI (gh) installed and authenticated
 *
 * Options:
 *   --dry-run     Only prints the issues that would be created, doesn't create them
 *   --no-parent   Don't create parent issues (default: create parent issues)
 *   --review      Interactive mode to review and approve each issue before creation
 */

import fs from "fs";
import { spawn } from "child_process";
import { createInterface } from "readline";

// Create readline interface for user input
function createPrompt() {
  return createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

// Ask user for confirmation
async function confirm(question: string): Promise<boolean> {
  const rl = createPrompt();

  return new Promise<boolean>((resolve) => {
    rl.question(`${question} (y/n) `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

// Ask user for text input
async function promptForInput(
  question: string,
  defaultValue: string,
): Promise<string> {
  const rl = createPrompt();

  return new Promise<string>((resolve) => {
    rl.question(`${question} [${defaultValue}]: `, (answer) => {
      rl.close();
      resolve(answer || defaultValue);
    });
  });
}

// Check if GitHub CLI is installed
async function checkGhInstalled(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const proc = spawn("gh", ["--version"]);

    proc.on("close", (code) => {
      resolve(code === 0);
    });

    proc.on("error", () => {
      resolve(false);
    });
  });
}

// Main function
async function main() {
  // Simple argument parsing
  const args = process.argv.slice(2);
  const flags = args.filter((arg) => arg.startsWith("-"));
  const nonFlags = args.filter((arg) => !arg.startsWith("-"));

  const dryRun = flags.includes("--dry-run") || flags.includes("-d");
  const createParent = !flags.includes("--no-parent");
  const reviewMode = flags.includes("--review") || flags.includes("-r");
  const taskFilePath = nonFlags[0];

  if (!taskFilePath) {
    console.error("Error: Please provide a task file path");
    console.error(
      "Usage: bun run scripts/create-github-issues.ts [task-file] [--dry-run] [--no-parent] [--review]",
    );
    process.exit(1);
  }

  // Check if gh is installed
  const isGhInstalled = await checkGhInstalled();
  if (!isGhInstalled) {
    console.error("Error: GitHub CLI (gh) is not installed or not in PATH");
    console.error("Please install it from https://cli.github.com/");
    process.exit(1);
  }

  // Create GitHub issue using gh CLI
  async function createGitHubIssue(
    title: string,
    body: string,
    labels: string[] = [],
  ): Promise<{ number: number; url: string }> {
    return new Promise<{ number: number; url: string }>((resolve, reject) => {
      // Prepare command arguments
      const cmdArgs = ["issue", "create", "--title", title, "--body", body];

      // Add labels if provided
      if (labels.length > 0) {
        cmdArgs.push("--label", labels.join(","));
      }

      // If dry run, just log the command
      if (dryRun) {
        console.log(`Would run: gh ${cmdArgs.join(" ")}`);
        resolve({ number: 0, url: "https://github.com/example/repo/issues/0" });
        return;
      }

      // Execute gh command
      const proc = spawn("gh", cmdArgs, { stdio: ["ignore", "pipe", "pipe"] });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      proc.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`Failed to create issue: ${stderr}`));
          return;
        }

        // Parse the URL from stdout
        const urlMatch = stdout.match(
          /https:\/\/github\.com\/[^\/]+\/[^\/]+\/issues\/(\d+)/,
        );

        if (urlMatch) {
          resolve({
            number: parseInt(urlMatch[1], 10),
            url: urlMatch[0],
          });
        } else {
          reject(new Error(`Failed to parse issue URL from output: ${stdout}`));
        }
      });
    });
  }

  // Read and parse the task file
  interface Task {
    title: string;
    details: string;
    subtasks: string[];
    timeEstimate: string;
  }

  interface Section {
    title: string;
    tasks: Task[];
  }

  interface TaskData {
    title: string;
    sections: Section[];
  }

  function parseTaskFile(filePath: string): TaskData {
    try {
      const content = fs.readFileSync(filePath, "utf8");

      // Extract the main title (# Title)
      const mainTitle = content.match(/^# (.+)$/m)?.[1] || "Tasks";
      console.log(`Found main title: ${mainTitle}`);

      // Split the file by level 2 headers (## Section)
      const sections: Section[] = [];
      const sectionRegex = /^## ([^\n]+)([\s\S]+?)(?=^## |$)/gm;

      let sectionMatch;
      while ((sectionMatch = sectionRegex.exec(content)) !== null) {
        const sectionTitle = sectionMatch[1].trim();
        const sectionContent = sectionMatch[2].trim();

        console.log(`\nParsing section: ${sectionTitle}`);

        // Skip sections that don't look like task lists
        if (!sectionContent.includes("- [ ]")) {
          console.log(`  Skipping section ${sectionTitle} - no tasks found`);
          continue;
        }

        // Find all top-level tasks with '- [ ] **Task Name**'
        const tasks: Task[] = [];
        // This regex finds tasks that start with '- [ ] **' and captures everything until the next task
        const taskRegex =
          /^- \[ \] \*\*([^*]+)\*\*([^]*?)(?=^- \[ \] \*\*|$)/gm;

        let taskMatch;
        let taskCount = 0;
        while ((taskMatch = taskRegex.exec(sectionContent)) !== null) {
          taskCount++;
          const taskTitle = taskMatch[1].trim();
          const taskDetails = taskMatch[2].trim();

          console.log(`  Found task: ${taskTitle}`);

          // Extract subtasks (lines with '- [ ]' that are indented)
          const subtasks: string[] = [];
          const subtaskRegex = /^\s+- \[ \] (.+)$/gm;

          let subtaskMatch;
          while ((subtaskMatch = subtaskRegex.exec(taskDetails)) !== null) {
            subtasks.push(subtaskMatch[1].trim());
          }

          console.log(`    Found ${subtasks.length} subtasks`);

          // Extract time estimate (line with 'Estimated time:')
          const timeEstimateMatch = taskDetails.match(
            /Estimated time: ([^\n]+)/,
          );
          const timeEstimate = timeEstimateMatch
            ? timeEstimateMatch[1].trim()
            : "Unknown";

          console.log(`    Time estimate: ${timeEstimate}`);

          tasks.push({
            title: taskTitle,
            details: taskDetails,
            subtasks,
            timeEstimate,
          });
        }

        console.log(`  Total tasks in section: ${taskCount}`);

        if (tasks.length > 0) {
          sections.push({
            title: sectionTitle,
            tasks,
          });
        } else {
          console.log(
            `  WARNING: No tasks were successfully parsed in section ${sectionTitle}`,
          );

          // Fallback attempt - try a simpler regex
          console.log(
            `  Attempting fallback parsing for section ${sectionTitle}`,
          );
          const simpleTaskRegex = /^- \[ \] (.+)$/gm;
          let simpleMatch;
          while (
            (simpleMatch = simpleTaskRegex.exec(sectionContent)) !== null
          ) {
            const title = simpleMatch[1].replace(/^\*\*|\*\*$/g, "").trim();
            tasks.push({
              title,
              details: "",
              subtasks: [],
              timeEstimate: "Unknown",
            });
            console.log(`    Found simple task: ${title}`);
          }

          if (tasks.length > 0) {
            sections.push({
              title: sectionTitle,
              tasks,
            });
            console.log(`  Added ${tasks.length} tasks using fallback parser`);
          }
        }
      }

      console.log(`\nParsed ${sections.length} sections with tasks`);

      return {
        title: mainTitle,
        sections,
      };
    } catch (error) {
      console.error(`Error reading or parsing task file: ${error}`);
      process.exit(1);
    }
  }

  // Format task for GitHub issue
  function formatParentIssue(section: Section): {
    title: string;
    body: string;
    labels: string[];
  } {
    const title = `${section.title} Setup`;

    let body = `# ${section.title} Setup\n\n`;
    body += `This issue tracks the implementation of ${section.title.toLowerCase()} aspects for the project.\n\n`;

    body += "## Tasks\n\n";
    for (const task of section.tasks) {
      body += `- [ ] ${task.title} (Est: ${task.timeEstimate})\n`;
    }

    body += "\n\n---\n";
    body += "*Created automatically from task file*";

    // Determine appropriate labels
    const labels = ["documentation"];

    if (section.title.toLowerCase().includes("community")) {
      labels.push("community");
    }

    return {
      title,
      body,
      labels,
    };
  }

  function formatChildIssue(
    task: Task,
    sectionTitle: string,
    parentIssueNumber: number,
  ): { title: string; body: string; labels: string[] } {
    // Clean up title - remove ** if they exist
    const title = task.title.replace(/^\*\*|\*\*$/g, "");

    let body = `## ${title}\n\n`;
    body += `Part of ${sectionTitle} setup (see #${parentIssueNumber})\n\n`;

    if (task.subtasks && task.subtasks.length > 0) {
      body += "### Tasks:\n";
      for (const subtask of task.subtasks) {
        body += `- [ ] ${subtask}\n`;
      }
      body += "\n";
    }

    body += `Estimated time: ${task.timeEstimate}\n\n`;
    body += "---\n";
    body += "*Created automatically from task file*";

    // Determine appropriate labels
    const labels = ["documentation"];

    if (sectionTitle.toLowerCase().includes("community")) {
      labels.push("community");
    }

    if (task.timeEstimate.includes("30 min")) {
      labels.push("good first issue");
    }

    return {
      title,
      body,
      labels,
    };
  }

  // Review and potentially edit an issue before creation
  async function reviewIssue(issue: {
    title: string;
    body: string;
    labels: string[];
  }): Promise<{ title: string; body: string; labels: string[] } | null> {
    console.log("\n=== ISSUE PREVIEW ===");
    console.log(`Title: ${issue.title}`);
    console.log(`Labels: ${issue.labels.join(", ")}`);
    console.log("\nBody:");
    console.log("---");
    console.log(issue.body);
    console.log("---");

    const proceed = await confirm("Create this issue?");

    if (!proceed) {
      const skipIssue = await confirm("Skip this issue entirely?");
      if (skipIssue) {
        return null;
      }

      // Edit the issue
      const newTitle = await promptForInput("Enter a new title", issue.title);
      let newBody = issue.body;

      const editBody = await confirm("Edit the body?");
      if (editBody) {
        // Write to a temp file and open editor
        const tempFile = `.issue-body-temp-${Date.now()}.md`;
        fs.writeFileSync(tempFile, issue.body);

        // Try to determine user's preferred editor
        const editor = process.env.EDITOR || process.env.VISUAL || "nano";

        console.log(`Opening ${editor} to edit the issue body...`);

        // Spawn editor
        const editorProc = spawn(editor, [tempFile], {
          stdio: "inherit",
          shell: true,
        });

        await new Promise<void>((resolve) => {
          editorProc.on("close", () => {
            resolve();
          });
        });

        // Read the edited content
        if (fs.existsSync(tempFile)) {
          newBody = fs.readFileSync(tempFile, "utf8");
          fs.unlinkSync(tempFile);
        }
      }

      // Edit labels
      const labelsStr = await promptForInput(
        "Enter labels (comma-separated)",
        issue.labels.join(","),
      );
      const newLabels = labelsStr
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean);

      return {
        title: newTitle,
        body: newBody,
        labels: newLabels,
      };
    }

    return issue;
  }

  // Parse taskData (taskFilePath is guaranteed to be defined here)
  const taskData = parseTaskFile(taskFilePath);
  console.log(`Parsed task file: ${taskData.title}`);

  // Create a milestone first using gh CLI
  let milestoneTitle = "Open Source Project Setup";
  if (reviewMode) {
    const createMilestone = await confirm(
      `Create milestone "${milestoneTitle}"?`,
    );
    if (!createMilestone) {
      milestoneTitle = await promptForInput(
        "Enter a new milestone title",
        milestoneTitle,
      );
    }
  }

  if (!dryRun) {
    console.log(`Creating milestone: ${milestoneTitle}`);
    // We're using spawn instead of execSync to handle errors better
    const createMilestone = spawn("gh", [
      "api",
      "--method",
      "POST",
      "/repos/:owner/:repo/milestones",
      "-f",
      `title=${milestoneTitle}`,
      "-f",
      "state=open",
      "-f",
      "description=Tasks to set up standard open source project infrastructure and documentation",
    ]);

    createMilestone.on("close", (code) => {
      if (code !== 0) {
        console.warn("Warning: Could not create milestone");
      } else {
        console.log(`Created milestone: ${milestoneTitle}`);
      }
    });
  } else {
    console.log(`DRY RUN: Would create milestone: ${milestoneTitle}`);
  }

  // Process each section
  for (const section of taskData.sections) {
    console.log(`\nProcessing section: ${section.title}`);
    console.log(`Section has ${section.tasks.length} tasks`);

    let parentIssue: { number: number; url: string } | null = null;

    // Create parent issue if option is enabled
    if (createParent && section.tasks.length > 1) {
      let parentIssueData = formatParentIssue(section);

      if (reviewMode) {
        console.log(`\nReviewing parent issue: ${parentIssueData.title}`);
        const reviewed = await reviewIssue(parentIssueData);

        if (!reviewed) {
          console.log("Skipping parent issue");
          continue;
        }

        parentIssueData = reviewed;
      } else {
        console.log(`Creating parent issue: ${parentIssueData.title}`);
        if (dryRun) {
          console.log("---");
          console.log(parentIssueData.body);
          console.log("---");
        }
      }

      if (!dryRun) {
        try {
          parentIssue = await createGitHubIssue(
            parentIssueData.title,
            parentIssueData.body,
            parentIssueData.labels,
          );
          console.log(
            `Created parent issue #${parentIssue.number}: ${parentIssue.url}`,
          );
        } catch (error) {
          console.error(`Error creating parent issue: ${error}`);
        }
      } else {
        console.log("DRY RUN: Would create parent issue");
        parentIssue = {
          number: 0,
          url: "https://github.com/example/repo/issues/0",
        };
      }
    }

    // Create child issues
    for (const task of section.tasks) {
      let issueData = formatChildIssue(
        task,
        section.title,
        parentIssue ? parentIssue.number : 0,
      );

      if (reviewMode) {
        console.log(`\nReviewing issue: ${issueData.title}`);
        const reviewed = await reviewIssue(issueData);

        if (!reviewed) {
          console.log("Skipping issue");
          continue;
        }

        issueData = reviewed;
      } else {
        console.log(`Creating issue: ${issueData.title}`);
        if (dryRun) {
          console.log("---");
          console.log(issueData.body);
          console.log("---");
        }
      }

      if (!dryRun) {
        try {
          const issue = await createGitHubIssue(
            issueData.title,
            issueData.body,
            issueData.labels,
          );
          console.log(`Created issue #${issue.number}: ${issue.url}`);

          // Link to parent if it exists
          if (parentIssue && parentIssue.number > 0) {
            // Add a comment to link it to the parent
            spawn("gh", [
              "issue",
              "comment",
              issue.number.toString(),
              "--body",
              `This is part of #${parentIssue.number}`,
            ]);
          }
        } catch (error) {
          console.error(`Error creating issue: ${error}`);
        }
      } else {
        console.log("DRY RUN: Would create issue");
        if (!reviewMode) {
          console.log("---");
          console.log(issueData.body);
          console.log("---");
        }
      }
    }
  }

  if (dryRun) {
    console.log("\nDRY RUN: No issues were created");
    console.log("To create the issues, run without --dry-run");
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
