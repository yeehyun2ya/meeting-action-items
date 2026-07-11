import dotenv from "dotenv";
import express from "express";

dotenv.config();

const port = process.env.PORT ?? "4000";

const app = express();

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
