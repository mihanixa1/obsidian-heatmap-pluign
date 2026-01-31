import { App, TFile } from 'obsidian';
import { DataStore } from './DataStore';
import { TagResolver } from './TagResolver';
import {
    TimePeriod,
    FileMetrics,
    FolderMetrics,
    TagMetrics,
    DailyActivity,
    PERIOD_DAYS,
    PluginSettings,
} from './types';

/**
 * MetricsEngine calculates activity metrics from raw events.
 */
export class MetricsEngine {
    private app: App;
    private dataStore: DataStore;
    private tagResolver: TagResolver;
    private settings: PluginSettings;

    constructor(
        app: App,
        dataStore: DataStore,
        tagResolver: TagResolver,
        settings: PluginSettings
    ) {
        this.app = app;
        this.dataStore = dataStore;
        this.tagResolver = tagResolver;
        this.settings = settings;
    }

    /**
     * Get time range for a period
     */
    private getTimeRange(period: TimePeriod): { startTime: number; endTime: number } {
        const endTime = Date.now();
        const days = period === 'all' ? this.settings.retentionDays : PERIOD_DAYS[period];
        const startTime = endTime - days * 24 * 60 * 60 * 1000;
        return { startTime, endTime };
    }

    /**
     * Calculate metrics for all files
     */
    getFileMetrics(period: TimePeriod): FileMetrics[] {
        const { startTime, endTime } = this.getTimeRange(period);
        const eventsByFile = this.dataStore.getEventsByFile(startTime, endTime);
        const metrics: FileMetrics[] = [];

        // Get all unique file paths from events
        const filePaths = new Set(eventsByFile.keys());

        for (const filePath of filePaths) {
            const events = eventsByFile.get(filePath) || [];
            const file = this.app.vault.getAbstractFileByPath(filePath);
            const exists = file instanceof TFile;

            // Count opens and edits
            let openCount = 0;
            let editCount = 0;
            let lastOpened: number | null = null;
            let lastEdited: number | null = null;

            for (const event of events) {
                if (event.eventType === 'open') {
                    openCount++;
                    if (!lastOpened || event.timestamp > lastOpened) {
                        lastOpened = event.timestamp;
                    }
                } else {
                    editCount++;
                    if (!lastEdited || event.timestamp > lastEdited) {
                        lastEdited = event.timestamp;
                    }
                }
            }

            // Extract file name and folder path
            const pathParts = filePath.split('/');
            const fileName = pathParts.pop() || filePath;
            const folderPath = pathParts.join('/') || '/';

            // Get tags
            const tags = exists ? this.tagResolver.getFileTags(filePath) : [];

            metrics.push({
                filePath,
                fileName,
                folderPath,
                tags,
                openCount,
                editCount,
                lastOpened,
                lastEdited,
                exists,
            });
        }

        return metrics;
    }

    /**
     * Calculate metrics for all folders (aggregated from files)
     */
    getFolderMetrics(period: TimePeriod): FolderMetrics[] {
        const fileMetrics = this.getFileMetrics(period);
        const folderMap = new Map<string, FolderMetrics>();

        for (const file of fileMetrics) {
            // Get all parent folders
            const folders = this.getParentFolders(file.folderPath);

            for (const folderPath of folders) {
                const existing = folderMap.get(folderPath);
                if (existing) {
                    existing.totalOpenCount += file.openCount;
                    existing.totalEditCount += file.editCount;
                    existing.fileCount++;
                } else {
                    const pathParts = folderPath.split('/');
                    const folderName = pathParts.pop() || folderPath || '/';
                    folderMap.set(folderPath, {
                        folderPath,
                        folderName: folderName || 'Root',
                        totalOpenCount: file.openCount,
                        totalEditCount: file.editCount,
                        fileCount: 1,
                    });
                }
            }
        }

        return Array.from(folderMap.values());
    }

    /**
     * Get all parent folders for a path
     */
    private getParentFolders(folderPath: string): string[] {
        if (!folderPath || folderPath === '/') {
            return ['/'];
        }

        const folders: string[] = [folderPath];
        const parts = folderPath.split('/');

        while (parts.length > 1) {
            parts.pop();
            const parentPath = parts.join('/') || '/';
            folders.push(parentPath);
        }

        return folders;
    }

    /**
     * Calculate metrics for all tags
     */
    getTagMetrics(period: TimePeriod): TagMetrics[] {
        const fileMetrics = this.getFileMetrics(period);
        const tagMap = new Map<string, TagMetrics>();

        for (const file of fileMetrics) {
            for (const tag of file.tags) {
                const existing = tagMap.get(tag);
                if (existing) {
                    existing.openCount += file.openCount;
                    existing.editCount += file.editCount;
                    existing.fileCount++;
                } else {
                    tagMap.set(tag, {
                        tag,
                        openCount: file.openCount,
                        editCount: file.editCount,
                        fileCount: 1,
                    });
                }
            }
        }

        return Array.from(tagMap.values());
    }

    /**
     * Get daily activity for heatmap
     */
    getDailyActivity(period: TimePeriod): DailyActivity[] {
        const { startTime, endTime } = this.getTimeRange(period);
        const eventsByDate = this.dataStore.getEventsByDate(startTime, endTime);
        const dailyMap = new Map<string, DailyActivity>();

        // Initialize all days in the period
        const days = period === 'all' ? this.settings.retentionDays : PERIOD_DAYS[period];
        for (let i = 0; i < days; i++) {
            const date = new Date(endTime - i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split('T')[0];
            dailyMap.set(dateStr, {
                date: dateStr,
                openCount: 0,
                editCount: 0,
            });
        }

        // Fill in actual counts
        for (const [date, events] of eventsByDate) {
            const daily = dailyMap.get(date);
            if (daily) {
                for (const event of events) {
                    if (event.eventType === 'open') {
                        daily.openCount++;
                    } else {
                        daily.editCount++;
                    }
                }
            }
        }

        // Convert to array and sort by date
        return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    }

    /**
     * Get summary statistics
     */
    getSummaryStats(period: TimePeriod): {
        totalOpens: number;
        totalEdits: number;
        uniqueFiles: number;
        activeDays: number;
    } {
        const fileMetrics = this.getFileMetrics(period);
        const dailyActivity = this.getDailyActivity(period);

        let totalOpens = 0;
        let totalEdits = 0;

        for (const file of fileMetrics) {
            totalOpens += file.openCount;
            totalEdits += file.editCount;
        }

        const activeDays = dailyActivity.filter(
            (d) => d.openCount > 0 || d.editCount > 0
        ).length;

        return {
            totalOpens,
            totalEdits,
            uniqueFiles: fileMetrics.length,
            activeDays,
        };
    }

    /**
     * Update settings reference
     */
    updateSettings(settings: PluginSettings): void {
        this.settings = settings;
    }
}
