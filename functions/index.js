import { onRequest } from "firebase-functions/v2/https";
import logger from "firebase-functions/logger";

export const api = onRequest({ cors: true }, (req, res) => {
  logger.info("Krishna Kripa API ping", { structuredData: true });
  res.status(200).json({
    success: true,
    message: "Krishna Kripa Firebase Function is alive!",
    timestamp: new Date().toISOString()
  });
});
