import { App, TFile, CachedMetadata, getAllTags } from 'obsidian';

/**
 * TagResolver extracts tags from files using Obsidian's metadata cache.
 */
export class TagResolver {
    private app: App;
    private tagCache: Map<string, string[]> = new Map();

    constructor(app: App) {
        this.app = app;
    }

    /**
     * Get all tags for a file
     * @param filePath Path to the file
     * @returns Array of tag names (without #)
     */
    getFileTags(filePath: string): string[] {
        // Check cache first
        const cached = this.tagCache.get(filePath);
        if (cached !== undefined) {
            return cached;
        }

        const file = this.app.vault.getAbstractFileByPath(filePath);
        if (!(file instanceof TFile)) {
            return [];
        }

        const cache = this.app.metadataCache.getFileCache(file);
        if (!cache) {
            return [];
        }

        const tags = this.extractTags(cache);
        this.tagCache.set(filePath, tags);
        return tags;
    }

    /**
     * Extract tags from file cache
     */
    private extractTags(cache: CachedMetadata): string[] {
        const tags: Set<string> = new Set();

        // Get tags from getAllTags helper (includes both frontmatter and inline)
        const allTags = getAllTags(cache);
        if (allTags) {
            for (const tag of allTags) {
                // Remove # prefix and normalize
                const normalizedTag = tag.startsWith('#') ? tag.slice(1) : tag;
                tags.add(normalizedTag.toLowerCase());
            }
        }

        return Array.from(tags);
    }

    /**
     * Get all files that have a specific tag
     * @param tag Tag name (without #)
     * @returns Array of file paths
     */
    getFilesByTag(tag: string): string[] {
        const normalizedTag = tag.toLowerCase();
        const files: string[] = [];

        const allFiles = this.app.vault.getMarkdownFiles();
        for (const file of allFiles) {
            const fileTags = this.getFileTags(file.path);
            if (fileTags.includes(normalizedTag)) {
                files.push(file.path);
            }
        }

        return files;
    }

    /**
     * Get all unique tags in the vault
     * @returns Array of tag names (without #)
     */
    getAllTags(): string[] {
        const allTags: Set<string> = new Set();

        const allFiles = this.app.vault.getMarkdownFiles();
        for (const file of allFiles) {
            const fileTags = this.getFileTags(file.path);
            for (const tag of fileTags) {
                allTags.add(tag);
            }
        }

        return Array.from(allTags).sort();
    }

    /**
     * Clear the tag cache (call when files change)
     */
    clearCache(): void {
        this.tagCache.clear();
    }

    /**
     * Invalidate cache for a specific file
     */
    invalidateFile(filePath: string): void {
        this.tagCache.delete(filePath);
    }
}
