export const logUnexpectedError = (error: unknown): void => {
  if (error instanceof Error) {
    console.error(error);
    return;
  }

  console.error("Unexpected non-error thrown", error);
};
