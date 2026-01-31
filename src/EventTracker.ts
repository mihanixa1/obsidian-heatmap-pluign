import { App, TFile, TAbstractFile, EventRef } from 'obsidian';
import { DataStore } from './DataStore';
import { ActivityEvent, PluginSettings } from './types';

/**
 * EventTracker captures file open and edit events from Obsidian.
 */
export class EventTracker {
    private app: App;
    private dataStore: DataStore;
    private settings: PluginSettings;
    private lastEditTime: Map<string, number> = new Map();
    private eventRefs: EventRef[] = [];

    constructor(app: App, dataStore: DataStore, settings: PluginSettings) {
        this.app = app;
        this.dataStore = dataStore;
        this.settings = settings;
    }

    /**
     * Start tracking events
     */
    start(): void {
        // Track file opens
        const fileOpenRef = this.app.workspace.on('file-open', (file: TFile | null) => {
            if (file) {
                this.onFileOpen(file);
            }
        });
        this.eventRefs.push(fileOpenRef);

        // Track file modifications using the vault's 'modify' event
        // The type definition is incomplete, but this event exists
        const modifyRef = (this.app.vault as any).on('modify', (file: TAbstractFile) => {
            if (file instanceof TFile) {
                this.onFileModify(file);
            }
        });
        this.eventRefs.push(modifyRef);
    }

    /**
     * Stop tracking events and cleanup
     */
    stop(): void {
        for (const ref of this.eventRefs) {
            this.app.workspace.offref(ref);
        }
        this.eventRefs = [];
        this.lastEditTime.clear();
    }

    /**
     * Handle file open event
     */
    private onFileOpen(file: TFile): void {
        if (!this.shouldTrackFile(file)) {
            return;
        }

        const event: ActivityEvent = {
            timestamp: Date.now(),
            filePath: file.path,
            eventType: 'open',
        };

        this.dataStore.addEvent(event);
    }

    /**
     * Handle file modify event
     */
    private onFileModify(file: TFile): void {
        if (!this.shouldTrackFile(file)) {
            return;
        }

        if (!this.shouldRecordEdit(file.path)) {
            return;
        }

        const event: ActivityEvent = {
            timestamp: Date.now(),
            filePath: file.path,
            eventType: 'edit',
        };

        this.dataStore.addEvent(event);
        this.lastEditTime.set(file.path, Date.now());
    }

    /**
     * Check if file should be tracked based on settings
     */
    private shouldTrackFile(file: TFile): boolean {
        // Check file extension
        const extension = '.' + file.extension;
        if (!this.settings.trackedExtensions.includes(extension)) {
            return false;
        }

        // Check excluded folders
        for (const excludedFolder of this.settings.excludedFolders) {
            if (file.path.startsWith(excludedFolder + '/') || file.path === excludedFolder) {
                return false;
            }
        }

        return true;
    }

    /**
     * Check if edit should be recorded (debounce)
     */
    private shouldRecordEdit(filePath: string): boolean {
        const lastEdit = this.lastEditTime.get(filePath);
        if (!lastEdit) {
            return true;
        }

        const timeSinceLastEdit = Date.now() - lastEdit;
        return timeSinceLastEdit >= this.settings.editDebounceMs;
    }

    /**
     * Update settings reference
     */
    updateSettings(settings: PluginSettings): void {
        this.settings = settings;
    }
}
