import { Plugin } from 'obsidian';
import { ActivityEvent, PluginData, DEFAULT_DATA, PluginSettings } from './types';

/**
 * DataStore handles persistence of activity events.
 * Events are stored in the plugin's data.json file.
 */
export class DataStore {
    private plugin: Plugin;
    private data: PluginData;
    private settings: PluginSettings;
    private saveTimeout: NodeJS.Timeout | null = null;
    private readonly SAVE_DEBOUNCE_MS = 5000;
    private readonly MS_PER_DAY = 24 * 60 * 60 * 1000;

    constructor(plugin: Plugin, settings: PluginSettings) {
        this.plugin = plugin;
        this.settings = settings;
        this.data = { ...DEFAULT_DATA };
    }

    /**
     * Load data from disk
     */
    async load(): Promise<void> {
        const loaded = await this.plugin.loadData();
        if (loaded) {
            this.data = {
                version: loaded.version ?? 1,
                events: loaded.events ?? [],
                lastCleanup: loaded.lastCleanup ?? 0,
            };
        } else {
            this.data = { ...DEFAULT_DATA };
        }

        // Run cleanup if needed (once per day)
        const now = Date.now();
        if (now - this.data.lastCleanup > this.MS_PER_DAY) {
            this.cleanup();
        }
    }

    /**
     * Save data to disk (debounced)
     */
    async save(): Promise<void> {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        this.saveTimeout = setTimeout(async () => {
            await this.plugin.saveData(this.data);
            this.saveTimeout = null;
        }, this.SAVE_DEBOUNCE_MS);
    }

    /**
     * Force immediate save (for plugin unload)
     */
    async saveImmediate(): Promise<void> {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        await this.plugin.saveData(this.data);
    }

    /**
     * Add a new activity event
     */
    addEvent(event: ActivityEvent): void {
        this.data.events.push(event);
        this.save();
    }

    /**
     * Get events within a time range
     * @param startTime Start timestamp (inclusive)
     * @param endTime End timestamp (inclusive)
     */
    getEvents(startTime: number, endTime: number): ActivityEvent[] {
        return this.data.events.filter(
            (event) => event.timestamp >= startTime && event.timestamp <= endTime
        );
    }

    /**
     * Get all events
     */
    getAllEvents(): ActivityEvent[] {
        return [...this.data.events];
    }

    /**
     * Get total event count
     */
    getEventCount(): number {
        return this.data.events.length;
    }

    /**
     * Remove events older than retention period
     */
    cleanup(): void {
        const cutoffTime = Date.now() - this.settings.retentionDays * this.MS_PER_DAY;
        const originalCount = this.data.events.length;

        this.data.events = this.data.events.filter(
            (event) => event.timestamp >= cutoffTime
        );

        this.data.lastCleanup = Date.now();

        const removedCount = originalCount - this.data.events.length;
        if (removedCount > 0) {
            console.log(`Activity Heatmap: Cleaned up ${removedCount} old events`);
        }

        this.save();
    }

    /**
     * Clear all data (for settings reset)
     */
    clearAllData(): void {
        this.data = { ...DEFAULT_DATA };
        this.save();
    }

    /**
     * Update settings reference
     */
    updateSettings(settings: PluginSettings): void {
        this.settings = settings;
    }

    /**
     * Get events grouped by file path
     */
    getEventsByFile(startTime: number, endTime: number): Map<string, ActivityEvent[]> {
        const events = this.getEvents(startTime, endTime);
        const byFile = new Map<string, ActivityEvent[]>();

        for (const event of events) {
            const existing = byFile.get(event.filePath) || [];
            existing.push(event);
            byFile.set(event.filePath, existing);
        }

        return byFile;
    }

    /**
     * Get events grouped by date (YYYY-MM-DD)
     */
    getEventsByDate(startTime: number, endTime: number): Map<string, ActivityEvent[]> {
        const events = this.getEvents(startTime, endTime);
        const byDate = new Map<string, ActivityEvent[]>();

        for (const event of events) {
            const date = new Date(event.timestamp).toISOString().split('T')[0];
            const existing = byDate.get(date) || [];
            existing.push(event);
            byDate.set(date, existing);
        }

        return byDate;
    }
}
