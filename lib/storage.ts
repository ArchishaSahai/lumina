import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const storageRoot = path.join(process.cwd(), ".data", "uploads");

export type StoredFile = {
  path: string;
};

export async function saveFile(file: File, directory: string): Promise<StoredFile> {
  const safeDirectory = directory.replace(/[^a-zA-Z0-9_-]/g, "");
  const extension = path.extname(file.name).toLowerCase();
  const filename = `${randomUUID()}${extension}`;
  const destinationDirectory = path.join(storageRoot, safeDirectory);

  await mkdir(destinationDirectory, { recursive: true });
  await writeFile(path.join(destinationDirectory, filename), Buffer.from(await file.arrayBuffer()));

  return { path: path.posix.join(safeDirectory, filename) };
}

export async function deleteFile(filePath: string): Promise<void> {
  const destination = path.resolve(storageRoot, filePath);
  const relative = path.relative(storageRoot, destination);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Invalid storage path.");

  await rm(destination, { force: true });
}
