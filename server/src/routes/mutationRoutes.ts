import { Prisma } from "@prisma/client";
import { Router, type NextFunction, type Response } from "express";
import { type z } from "zod";
import {
  actionItemPatchSchema,
  type ActionItemPatchInput,
} from "../schemas/actionItemPatchSchema";
import {
  decisionPatchSchema,
  type DecisionPatchInput,
} from "../schemas/decisionPatchSchema";
import {
  discussionPointPatchSchema,
  type DiscussionPointPatchInput,
} from "../schemas/discussionPointPatchSchema";
import { sendError } from "../errors/apiError";
import { meetingPatchSchema } from "../schemas/meetingPatchSchema";
import { prisma } from "../prisma";

type PatchParseResult<T extends object> =
  | {
      readonly ok: true;
      readonly data: T;
    }
  | {
      readonly ok: false;
      readonly message: string;
    };

type NotFoundResource =
  | "회의록"
  | "액션아이템"
  | "결정사항"
  | "논의사항";

type MutationErrorContext = {
  readonly resource: NotFoundResource;
  readonly response: Response;
  readonly next: NextFunction;
};

export const mutationRouter = Router();

const parsePatchBody = <T extends object>(
  schema: z.ZodType<T>,
  body: unknown,
): PatchParseResult<T> => {
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];

    return {
      ok: false,
      message: firstIssue?.message ?? "요청 본문이 올바르지 않습니다",
    };
  }

  if (Object.keys(parsed.data).length === 0) {
    return {
      ok: false,
      message: "수정할 필드가 없습니다",
    };
  }

  return {
    ok: true,
    data: parsed.data,
  };
};

const sendValidationError = (
  response: Response,
  message: string,
): void => {
  sendError(response, 400, {
    code: "VALIDATION_ERROR",
    message,
    retryable: false,
  });
};

const sendNotFoundError = (
  response: Response,
  resource: NotFoundResource,
): void => {
  sendError(response, 404, {
    code: "NOT_FOUND",
    message: `${resource}을 찾을 수 없습니다`,
    retryable: false,
  });
};

const handleMutationError = (
  error: unknown,
  context: MutationErrorContext,
): void => {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    sendNotFoundError(context.response, context.resource);
    return;
  }

  context.next(error);
};

const toActionItemUpdateData = (
  input: ActionItemPatchInput,
): Prisma.ActionItemUpdateInput => {
  const { dueDate, ...fields } = input;
  const data: Prisma.ActionItemUpdateInput = { ...fields };

  if ("dueDate" in input) {
    data.dueDate =
      dueDate === null ? null : dueDate === undefined ? undefined : new Date(dueDate);
  }

  return data;
};

mutationRouter.patch("/meetings/:id", async (request, response, next) => {
  const parsed = parsePatchBody(meetingPatchSchema, request.body);

  if (!parsed.ok) {
    sendValidationError(response, parsed.message);
    return;
  }

  try {
    const meeting = await prisma.meeting.update({
      where: {
        id: request.params.id.trim(),
      },
      data: parsed.data,
      include: {
        decisions: {
          orderBy: {
            createdAt: "asc",
          },
        },
        actionItems: {
          orderBy: {
            createdAt: "asc",
          },
        },
        discussions: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    response.json(meeting);
  } catch (error) {
    handleMutationError(error, { resource: "회의록", response, next });
  }
});

mutationRouter.delete("/meetings/:id", async (request, response, next) => {
  try {
    await prisma.meeting.delete({
      where: {
        id: request.params.id.trim(),
      },
    });

    response.status(204).send();
  } catch (error) {
    handleMutationError(error, { resource: "회의록", response, next });
  }
});

mutationRouter.patch("/action-items/:id", async (request, response, next) => {
  const parsed = parsePatchBody(actionItemPatchSchema, request.body);

  if (!parsed.ok) {
    sendValidationError(response, parsed.message);
    return;
  }

  try {
    const actionItem = await prisma.actionItem.update({
      where: {
        id: request.params.id.trim(),
      },
      data: toActionItemUpdateData(parsed.data),
    });

    response.json(actionItem);
  } catch (error) {
    handleMutationError(error, { resource: "액션아이템", response, next });
  }
});

mutationRouter.delete("/action-items/:id", async (request, response, next) => {
  try {
    await prisma.actionItem.delete({
      where: {
        id: request.params.id.trim(),
      },
    });

    response.status(204).send();
  } catch (error) {
    handleMutationError(error, { resource: "액션아이템", response, next });
  }
});

mutationRouter.patch("/decisions/:id", async (request, response, next) => {
  const parsed = parsePatchBody<DecisionPatchInput>(decisionPatchSchema, request.body);

  if (!parsed.ok) {
    sendValidationError(response, parsed.message);
    return;
  }

  try {
    const decision = await prisma.decision.update({
      where: {
        id: request.params.id.trim(),
      },
      data: parsed.data,
    });

    response.json(decision);
  } catch (error) {
    handleMutationError(error, { resource: "결정사항", response, next });
  }
});

mutationRouter.delete("/decisions/:id", async (request, response, next) => {
  try {
    await prisma.decision.delete({
      where: {
        id: request.params.id.trim(),
      },
    });

    response.status(204).send();
  } catch (error) {
    handleMutationError(error, { resource: "결정사항", response, next });
  }
});

mutationRouter.patch("/discussion-points/:id", async (request, response, next) => {
  const parsed = parsePatchBody<DiscussionPointPatchInput>(
    discussionPointPatchSchema,
    request.body,
  );

  if (!parsed.ok) {
    sendValidationError(response, parsed.message);
    return;
  }

  try {
    const discussion = await prisma.discussion.update({
      where: {
        id: request.params.id.trim(),
      },
      data: parsed.data,
    });

    response.json(discussion);
  } catch (error) {
    handleMutationError(error, { resource: "논의사항", response, next });
  }
});

mutationRouter.delete("/discussion-points/:id", async (request, response, next) => {
  try {
    await prisma.discussion.delete({
      where: {
        id: request.params.id.trim(),
      },
    });

    response.status(204).send();
  } catch (error) {
    handleMutationError(error, { resource: "논의사항", response, next });
  }
});
