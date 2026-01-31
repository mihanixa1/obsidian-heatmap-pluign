import { Plugin, WorkspaceLeaf } from 'obsidian';
import { DataStore } from './DataStore';
import { EventTracker } from './EventTracker';
import { TagResolver } from './TagResolver';
import { MetricsEngine } from './MetricsEngine';
import { ActivityView } from './ui/ActivityView';
import { SettingsTab } from './ui/SettingsTab';
import {
    PluginSettings,
    DEFAULT_SETTINGS,
    ACTIVITY_VIEW_TYPE,
} from './types';

/**
 * Activity Heatmap Plugin for Obsidian
 *
 * Tracks document open/edit frequency and displays activity metrics
 * with a heatmap visualization.
 */
export default class ActivityHeatmapPlugin extends Plugin {
    settings: PluginSettings = DEFAULT_SETTINGS;

    private dataStore!: DataStore;
    private eventTracker!: EventTracker;
    private tagResolver!: TagResolver;
    private metricsEngine!: MetricsEngine;

    async onload(): Promise<void> {
        console.log('Loading Activity Heatmap plugin');

        // Load settings
        await this.loadSettings();

        // Initialize components
        this.dataStore = new DataStore(this, this.settings);
        await this.dataStore.load();

        this.tagResolver = new TagResolver(this.app);

        this.metricsEngine = new MetricsEngine(
            this.app,
            this.dataStore,
            this.tagResolver,
            this.settings
        );

        this.eventTracker = new EventTracker(
            this.app,
            this.dataStore,
            this.settings
        );

        // Register the activity view
        this.registerView(
            ACTIVITY_VIEW_TYPE,
            (leaf) => new ActivityView(leaf, this.metricsEngine, this.settings)
        );

        // Start tracking events
        this.eventTracker.start();

        // Add ribbon icon
        this.addRibbonIcon('bar-chart-2', 'Open Activity Heatmap', () => {
            this.activateView();
        });

        // Add command to open view
        this.addCommand({
            id: 'open-activity-heatmap',
            name: 'Open Activity Heatmap',
            callback: () => {
                this.activateView();
            },
        });

        // Add command to refresh view
        this.addCommand({
            id: 'refresh-activity-heatmap',
            name: 'Refresh Activity Heatmap',
            callback: () => {
                this.refreshView();
            },
        });

        // Add settings tab
        this.addSettingTab(new SettingsTab(this.app, this));

        // Listen for metadata changes to invalidate tag cache
        this.registerEvent(
            this.app.metadataCache.on('changed', (file) => {
                this.tagResolver.invalidateFile(file.path);
            })
        );

        // Listen for file renames to invalidate tag cache
        this.registerEvent(
            this.app.vault.on('rename', (file, oldPath) => {
                this.tagResolver.invalidateFile(oldPath);
                this.tagResolver.invalidateFile(file.path);
            })
        );

        // Listen for file deletions to invalidate tag cache
        this.registerEvent(
            this.app.vault.on('delete', (file) => {
                this.tagResolver.invalidateFile(file.path);
            })
        );
    }

    async onunload(): Promise<void> {
        console.log('Unloading Activity Heatmap plugin');

        // Stop tracking
        this.eventTracker.stop();

        // Save any pending data
        await this.dataStore.saveImmediate();
    }

    /**
     * Load plugin settings
     */
    async loadSettings(): Promise<void> {
        const loaded = await this.loadData();
        this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded?.settings);
    }

    /**
     * Save plugin settings
     */
    async saveSettings(): Promise<void> {
        // Update components with new settings
        this.dataStore.updateSettings(this.settings);
        this.eventTracker.updateSettings(this.settings);
        this.metricsEngine.updateSettings(this.settings);

        // Save to disk
        const data = await this.loadData() || {};
        data.settings = this.settings;
        await this.saveData(data);

        // Refresh view if open
        this.refreshView();
    }

    /**
     * Activate the activity view
     */
    async activateView(): Promise<void> {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(ACTIVITY_VIEW_TYPE);

        if (leaves.length > 0) {
            // View already exists, reveal it
            leaf = leaves[0];
        } else {
            // Create new leaf in right sidebar
            leaf = workspace.getRightLeaf(false);
            if (leaf) {
                await leaf.setViewState({
                    type: ACTIVITY_VIEW_TYPE,
                    active: true,
                });
            }
        }

        if (leaf) {
            workspace.revealLeaf(leaf);
        }
    }

    /**
     * Refresh the activity view if it's open
     */
    refreshView(): void {
        const leaves = this.app.workspace.getLeavesOfType(ACTIVITY_VIEW_TYPE);
        for (const leaf of leaves) {
            const view = leaf.view;
            if (view instanceof ActivityView) {
                view.updateSettings(this.settings);
                view.refresh();
            }
        }
    }

    /**
     * Get total event count (for settings display)
     */
    getEventCount(): number {
        return this.dataStore.getEventCount();
    }

    /**
     * Clear all activity data
     */
    clearAllData(): void {
        this.dataStore.clearAllData();
        this.refreshView();
    }
}
