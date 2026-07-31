import { createEvent, type EventBus } from "@agent/event-bus";

export interface WorkflowContext {
  [key: string]: unknown;
}

export interface WorkflowStep {
  name: string;
  run(ctx: WorkflowContext): Promise<void> | void;
}

export interface Workflow {
  id: string;
  steps: WorkflowStep[];
}

export async function runWorkflow(
  workflow: Workflow,
  ctx: WorkflowContext = {},
  bus?: EventBus,
): Promise<WorkflowContext> {
  await bus?.emit(
    createEvent("workflow.started", "workflow-engine", { id: workflow.id }),
  );
  try {
    for (const step of workflow.steps) {
      await step.run(ctx);
    }
  } catch (err) {
    await bus?.emit(
      createEvent("workflow.failed", "workflow-engine", {
        id: workflow.id,
        error: String(err),
      }),
    );
    throw err;
  }
  await bus?.emit(
    createEvent("workflow.completed", "workflow-engine", { id: workflow.id }),
  );
  return ctx;
}
