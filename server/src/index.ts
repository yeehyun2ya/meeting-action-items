import dotenv from "dotenv";
import express from "express";
import { parseCreateMeetingBody } from "./meetingInput";
import { prisma } from "./prisma";

dotenv.config();

const port = process.env.PORT ?? "4000";

const app = express();

app.use(express.json());

const logUnexpectedError = (error: unknown): void => {
  if (error instanceof Error) {
    console.error(error);
    return;
  }

  console.error("Unexpected non-error thrown", error);
};

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.post("/meetings", async (request, response) => {
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
        actionItems: {
          create: parseResult.value.actionItems.map((actionItem) => ({
            content: actionItem.content,
            assignee: actionItem.assignee,
            dueDate: actionItem.dueDate,
          })),
        },
      },
      include: {
        actionItems: {
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

app.get("/meetings", async (_request, response) => {
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
            actionItems: true,
          },
        },
        actionItems: {
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            content: true,
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
      actionItemCount: meeting._count.actionItems,
      actionItemPreview: meeting.actionItems,
    }));

    response.json(meetingSummaries);
  } catch (error) {
    logUnexpectedError(error);
    response.status(500).json({ error: "Failed to list meetings" });
  }
});

app.get("/meetings/:id", async (request, response) => {
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
        actionItems: {
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

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
