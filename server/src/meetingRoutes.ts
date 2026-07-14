import { Router } from "express";
import { parseCreateMeetingBody } from "./meetingInput";
import { prisma } from "./prisma";
import { logUnexpectedError } from "./requestLogging";

export const meetingRouter = Router();

meetingRouter.post("/", async (request, response) => {
  const parseResult = parseCreateMeetingBody(request.body);

  if (!parseResult.ok) {
    response.status(400).json({ error: parseResult.message });
    return;
  }

  try {
    const meeting = await prisma.meeting.create({
      data: {
        title: parseResult.value.title,
        minutes: parseResult.value.minutes,
        decisions: {
          create: parseResult.value.decisions.map((decision) => ({
            content: decision.content,
            sourceQuote: decision.sourceQuote,
          })),
        },
        actionItems: {
          create: parseResult.value.actionItems.map((actionItem) => ({
            content: actionItem.content,
            sourceQuote: actionItem.sourceQuote,
            assignee: actionItem.assignee,
            dueDate: actionItem.dueDate,
            dueDateRaw: actionItem.dueDateRaw,
          })),
        },
        discussions: {
          create: parseResult.value.discussions.map((discussion) => ({
            content: discussion.content,
            sourceQuote: discussion.sourceQuote,
          })),
        },
      },
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

    response.status(201).json(meeting);
  } catch (error) {
    logUnexpectedError(error);
    response.status(500).json({ error: "Failed to create meeting" });
  }
});

meetingRouter.get("/", async (_request, response) => {
  try {
    const meetings = await prisma.meeting.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            decisions: true,
            actionItems: true,
            discussions: true,
          },
        },
        decisions: {
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            content: true,
            sourceQuote: true,
          },
          take: 2,
        },
        actionItems: {
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            content: true,
            sourceQuote: true,
            dueDateRaw: true,
          },
          take: 2,
        },
        discussions: {
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            content: true,
            sourceQuote: true,
          },
          take: 2,
        },
      },
    });

    const meetingSummaries = meetings.map((meeting) => ({
      id: meeting.id,
      title: meeting.title,
      createdAt: meeting.createdAt,
      updatedAt: meeting.updatedAt,
      decisionCount: meeting._count.decisions,
      decisionPreview: meeting.decisions,
      actionItemCount: meeting._count.actionItems,
      actionItemPreview: meeting.actionItems,
      discussionCount: meeting._count.discussions,
      discussionPreview: meeting.discussions,
    }));

    response.json(meetingSummaries);
  } catch (error) {
    logUnexpectedError(error);
    response.status(500).json({ error: "Failed to list meetings" });
  }
});

meetingRouter.get("/:id", async (request, response) => {
  const meetingId = request.params.id.trim();

  if (meetingId.length === 0) {
    response.status(400).json({ error: "Meeting id is required" });
    return;
  }

  try {
    const meeting = await prisma.meeting.findUnique({
      where: {
        id: meetingId,
      },
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

    if (meeting === null) {
      response.status(404).json({ error: "Meeting not found" });
      return;
    }

    response.json(meeting);
  } catch (error) {
    logUnexpectedError(error);
    response.status(500).json({ error: "Failed to get meeting" });
  }
});
