import { mkdir, readFile as readLocalFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

const storageRoot = process.env.UPLOAD_STORAGE_DIR ?? (process.env.VERCEL ? path.join(os.tmpdir(), "lumina", "uploads") : path.join(process.cwd(), ".data", "uploads"));

export type StoredFile = {
  path: string;
};

export async function saveFile(file: File, directory: string): Promise<StoredFile> {
  const safeDirectory = directory.replace(/[^a-zA-Z0-9_-]/g, "");
  const extension = path.extname(file.name).toLowerCase();
  const filename = `${randomUUID()}${extension}`;
  const destinationDirectory = path.join(storageRoot, safeDirectory);

  try {
    await mkdir(destinationDirectory, { recursive: true });
    await writeFile(path.join(destinationDirectory, filename), Buffer.from(await file.arrayBuffer()));
  } catch (cause) {
    console.error("Source upload storage write failed", { storageRoot, directory: safeDirectory, filename, cause });
    throw new Error("We could not store this upload. Please try again in a moment.");
  }

  return { path: path.posix.join(safeDirectory, filename) };
}

export async function saveBuffer(buffer: Buffer | Uint8Array, directory: string, extension: string): Promise<StoredFile> {
  const safeDirectory = directory.replace(/[^a-zA-Z0-9_-]/g, "");
  const safeExtension = extension.startsWith(".") ? extension : `.${extension}`;
  const filename = `${randomUUID()}${safeExtension.toLowerCase()}`;
  const destinationDirectory = path.join(storageRoot, safeDirectory);

  try {
    await mkdir(destinationDirectory, { recursive: true });
    await writeFile(path.join(destinationDirectory, filename), buffer);
  } catch (cause) {
    console.error("Storage write failed", { storageRoot, directory: safeDirectory, filename, cause });
    throw new Error("We could not store this file. Please try again in a moment.");
  }

  return { path: path.posix.join(safeDirectory, filename) };
}

export async function deleteFile(filePath: string): Promise<void> {
  await rm(resolveStoragePath(filePath), { force: true });
}

export async function readFile(filePath: string): Promise<Buffer> {
  return readLocalFile(resolveStoragePath(filePath));
}

function resolveStoragePath(filePath: string) {
  const destination = path.resolve(storageRoot, filePath);
  const relative = path.relative(storageRoot, destination);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Invalid storage path.");
  return destination;
}
