import multer from "multer";

export const uploadRecipients = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    const isTextOrCsv =
      file.mimetype.startsWith("text/") ||
      file.mimetype === "application/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.originalname.endsWith(".csv") ||
      file.originalname.endsWith(".txt");

    if (isTextOrCsv) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV and TXT files are allowed for recipient upload"));
    }
  },
});
