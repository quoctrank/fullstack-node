"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const fs_1 = __importDefault(require("fs"));
const config_1 = require("../../config");
const storage = multer_1.default.diskStorage({
    destination(_req, _file, cb) {
        const dest = config_1.config.uploads.dir;
        if (!fs_1.default.existsSync(dest))
            fs_1.default.mkdirSync(dest, { recursive: true });
        cb(null, dest);
    },
    filename(_req, file, cb) {
        const ext = path_1.default.extname(file.originalname);
        cb(null, `${(0, uuid_1.v4)()}${ext}`);
    },
});
const ALLOWED_MIMETYPES = new Set([
    "text/csv",
    "application/json",
    "text/plain",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
exports.upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
    fileFilter(_req, file, cb) {
        if (ALLOWED_MIMETYPES.has(file.mimetype) ||
            file.mimetype.startsWith("text/")) {
            cb(null, true);
        }
        else {
            cb(new Error(`File type not allowed: ${file.mimetype}`));
        }
    },
});
//# sourceMappingURL=upload.middleware.js.map