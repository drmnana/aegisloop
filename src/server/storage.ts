import { promises as fs } from "fs";
import path from "path";

export interface BlobMetadata {
  path: string;
  size: number;
  updatedAt: Date;
}

export interface BlobStore {
  readBlob(blobPath: string): Promise<string>;
  writeBlob(blobPath: string, content: string): Promise<BlobMetadata>;
  deleteBlob(blobPath: string): Promise<void>;
  listBlobs(prefix?: string): Promise<BlobMetadata[]>;
  getBlobMetadata(blobPath: string): Promise<BlobMetadata>;
}

export class LocalDiskProvider implements BlobStore {
  constructor(private readonly root: string = process.env.LOCAL_DISK_ROOT ?? "./storage") {}

  private resolve(blobPath: string): string {
    const cleanPath = blobPath.replace(/^[/\\]+/, "");
    const resolved = path.resolve(this.root, cleanPath);
    const root = path.resolve(this.root);
    if (!resolved.startsWith(root)) {
      throw new Error("Blob path escapes the configured storage root.");
    }
    return resolved;
  }

  async readBlob(blobPath: string): Promise<string> {
    return fs.readFile(this.resolve(blobPath), "utf8");
  }

  async writeBlob(blobPath: string, content: string): Promise<BlobMetadata> {
    const fullPath = this.resolve(blobPath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, "utf8");
    return this.getBlobMetadata(blobPath);
  }

  async deleteBlob(blobPath: string): Promise<void> {
    await fs.rm(this.resolve(blobPath), { force: true });
  }

  async listBlobs(prefix = ""): Promise<BlobMetadata[]> {
    const base = this.resolve(prefix);
    try {
      const stat = await fs.stat(base);
      if (stat.isFile()) {
        return [await this.getBlobMetadata(prefix)];
      }
    } catch {
      return [];
    }

    const results: BlobMetadata[] = [];
    const walk = async (dir: string) => {
      for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
        } else {
          const relative = path.relative(path.resolve(this.root), full).replace(/\\/g, "/");
          results.push(await this.getBlobMetadata(relative));
        }
      }
    };
    await walk(base);
    return results;
  }

  async getBlobMetadata(blobPath: string): Promise<BlobMetadata> {
    const stat = await fs.stat(this.resolve(blobPath));
    return { path: blobPath.replace(/\\/g, "/"), size: stat.size, updatedAt: stat.mtime };
  }
}
