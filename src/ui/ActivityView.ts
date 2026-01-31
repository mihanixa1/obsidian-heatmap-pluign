import { ItemView, WorkspaceLeaf, setIcon } from 'obsidian';
import { MetricsEngine } from '../MetricsEngine';
import { HeatmapCalendar } from './HeatmapCalendar';
import { FileList } from './FileList';
import {
    ACTIVITY_VIEW_TYPE,
    TimePeriod,
    MetricType,
    ViewMode,
    SortOrder,
    PluginSettings,
    FileMetrics,
    FolderMetrics,
    TagMetrics,
} from '../types';

/**
 * Helper to create div element with class
 */
function createDiv(parent: HTMLElement, cls?: string): HTMLDivElement {
    const div = document.createElement('div');
    if (cls) div.className = cls;
    parent.appendChild(div);
    return div;
}

/**
 * Helper to create select element
 */
function createSelect(
    parent: HTMLElement,
    options: { value: string; label: string }[],
    onChange: (value: string) => void
): HTMLSelectElement {
    const select = document.createElement('select');
    for (const opt of options) {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        select.appendChild(option);
    }
    select.addEventListener('change', () => onChange(select.value));
    parent.appendChild(select);
    return select;
}

/**
 * ActivityView is the main view for displaying activity metrics.
 */
export class ActivityView extends ItemView {
    private metricsEngine: MetricsEngine;
    private settings: PluginSettings;

    // UI State
    private currentPeriod: TimePeriod = '7d';
    private currentMetric: MetricType = 'opens';
    private currentView: ViewMode = 'files';
    private sortOrder: SortOrder = 'desc';

    // UI Components
    private heatmap: HeatmapCalendar | null = null;
    private fileList: FileList | null = null;

    // DOM Elements
    private mainContainerEl: HTMLElement | null = null;
    private periodSelect: HTMLSelectElement | null = null;
    private metricSelect: HTMLSelectElement | null = null;
    private viewSelect: HTMLSelectElement | null = null;

    constructor(
        leaf: WorkspaceLeaf,
        metricsEngine: MetricsEngine,
        settings: PluginSettings
    ) {
        super(leaf);
        this.metricsEngine = metricsEngine;
        this.settings = settings;
    }

    getViewType(): string {
        return ACTIVITY_VIEW_TYPE;
    }

    getDisplayText(): string {
        return 'Activity Heatmap';
    }

    getIcon(): string {
        return 'bar-chart-2';
    }

    async onOpen(): Promise<void> {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('activity-heatmap-container');

        this.mainContainerEl = contentEl;

        // Render header with controls
        this.renderHeader();

        // Render stats summary
        this.renderStats();

        // Render heatmap section
        this.renderHeatmapSection();

        // Render file list section
        this.renderListSection();

        // Initial data load
        this.refresh();
    }

    async onClose(): Promise<void> {
        // Cleanup
        this.heatmap = null;
        this.fileList = null;
    }

    /**
     * Render header with control dropdowns
     */
    private renderHeader(): void {
        if (!this.mainContainerEl) return;

        const header = createDiv(this.mainContainerEl, 'activity-heatmap-header');

        // Period selector
        const periodControl = createDiv(header, 'activity-heatmap-control');
        const periodLabel = document.createElement('label');
        periodLabel.textContent = 'Period:';
        periodControl.appendChild(periodLabel);

        this.periodSelect = createSelect(
            periodControl,
            [
                { value: '7d', label: 'Last 7 days' },
                { value: '30d', label: 'Last 30 days' },
                { value: '90d', label: 'Last 90 days' },
                { value: 'all', label: 'All time' },
            ],
            (value) => {
                this.currentPeriod = value as TimePeriod;
                this.refresh();
            }
        );

        // Metric selector
        const metricControl = createDiv(header, 'activity-heatmap-control');
        const metricLabel = document.createElement('label');
        metricLabel.textContent = 'Metric:';
        metricControl.appendChild(metricLabel);

        this.metricSelect = createSelect(
            metricControl,
            [
                { value: 'opens', label: 'Opens' },
                { value: 'edits', label: 'Edits' },
            ],
            (value) => {
                this.currentMetric = value as MetricType;
                this.refresh();
            }
        );

        // View selector
        const viewControl = createDiv(header, 'activity-heatmap-control');
        const viewLabel = document.createElement('label');
        viewLabel.textContent = 'View:';
        viewControl.appendChild(viewLabel);

        this.viewSelect = createSelect(
            viewControl,
            [
                { value: 'files', label: 'Files' },
                { value: 'folders', label: 'Folders' },
                { value: 'tags', label: 'Tags' },
            ],
            (value) => {
                this.currentView = value as ViewMode;
                this.refresh();
            }
        );

        // Sort toggle button
        const sortControl = createDiv(header, 'activity-heatmap-control');
        const sortButton = document.createElement('button');
        sortButton.className = 'clickable-icon';
        sortButton.setAttribute('aria-label', 'Toggle sort order');
        setIcon(sortButton, 'arrow-down-wide-narrow');
        sortButton.addEventListener('click', () => {
            this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
            setIcon(sortButton, this.sortOrder === 'desc' ? 'arrow-down-wide-narrow' : 'arrow-up-narrow-wide');
            if (this.fileList) {
                this.fileList.setSortOrder(this.sortOrder);
            }
        });
        sortControl.appendChild(sortButton);
    }

    /**
     * Render stats summary
     */
    private renderStats(): void {
        if (!this.mainContainerEl) return;

        const statsSection = createDiv(this.mainContainerEl, 'activity-stats');
        statsSection.id = 'activity-stats';
    }

    /**
     * Update stats display
     */
    private updateStats(): void {
        const statsEl = document.getElementById('activity-stats');
        if (!statsEl) return;

        statsEl.innerHTML = '';

        const stats = this.metricsEngine.getSummaryStats(this.currentPeriod);

        // Total opens
        const opensStat = createDiv(statsEl, 'activity-stat');
        const opensValue = createDiv(opensStat, 'activity-stat-value');
        opensValue.textContent = String(stats.totalOpens);
        const opensLabel = createDiv(opensStat, 'activity-stat-label');
        opensLabel.textContent = 'Total Opens';

        // Total edits
        const editsStat = createDiv(statsEl, 'activity-stat');
        const editsValue = createDiv(editsStat, 'activity-stat-value');
        editsValue.textContent = String(stats.totalEdits);
        const editsLabel = createDiv(editsStat, 'activity-stat-label');
        editsLabel.textContent = 'Total Edits';

        // Unique files
        const filesStat = createDiv(statsEl, 'activity-stat');
        const filesValue = createDiv(filesStat, 'activity-stat-value');
        filesValue.textContent = String(stats.uniqueFiles);
        const filesLabel = createDiv(filesStat, 'activity-stat-label');
        filesLabel.textContent = 'Unique Files';

        // Active days
        const daysStat = createDiv(statsEl, 'activity-stat');
        const daysValue = createDiv(daysStat, 'activity-stat-value');
        daysValue.textContent = String(stats.activeDays);
        const daysLabel = createDiv(daysStat, 'activity-stat-label');
        daysLabel.textContent = 'Active Days';
    }

    /**
     * Render heatmap section
     */
    private renderHeatmapSection(): void {
        if (!this.mainContainerEl) return;

        const section = createDiv(this.mainContainerEl, 'activity-heatmap-section');

        const title = createDiv(section, 'activity-heatmap-section-title');
        title.textContent = 'Activity Heatmap';

        const heatmapContainer = createDiv(section, '');
        heatmapContainer.id = 'heatmap-container';

        this.heatmap = new HeatmapCalendar(
            heatmapContainer,
            [],
            this.settings.colorScheme,
            this.currentMetric
        );
    }

    /**
     * Render file list section
     */
    private renderListSection(): void {
        if (!this.mainContainerEl) return;

        const section = createDiv(this.mainContainerEl, 'activity-heatmap-section');

        const header = createDiv(section, 'activity-list-header');
        const title = createDiv(header, 'activity-heatmap-section-title');
        title.textContent = 'Activity by ' + this.getViewLabel();

        const listContainer = createDiv(section, '');
        listContainer.id = 'file-list-container';

        this.fileList = new FileList(
            this.app,
            listContainer,
            this.currentView,
            this.currentMetric,
            this.sortOrder
        );
    }

    /**
     * Get label for current view mode
     */
    private getViewLabel(): string {
        switch (this.currentView) {
            case 'files': return 'Files';
            case 'folders': return 'Folders';
            case 'tags': return 'Tags';
        }
    }

    /**
     * Refresh all data and UI
     */
    refresh(): void {
        // Update stats
        this.updateStats();

        // Update heatmap
        if (this.heatmap) {
            const dailyActivity = this.metricsEngine.getDailyActivity(this.currentPeriod);
            this.heatmap.update(dailyActivity, this.currentMetric);
            this.heatmap.setColorScheme(this.settings.colorScheme);
        }

        // Update file list
        if (this.fileList) {
            this.fileList.setViewMode(this.currentView);
            this.fileList.setMetricType(this.currentMetric);

            let items: (FileMetrics | FolderMetrics | TagMetrics)[];
            switch (this.currentView) {
                case 'files':
                    items = this.metricsEngine.getFileMetrics(this.currentPeriod);
                    break;
                case 'folders':
                    items = this.metricsEngine.getFolderMetrics(this.currentPeriod);
                    break;
                case 'tags':
                    items = this.metricsEngine.getTagMetrics(this.currentPeriod);
                    break;
            }
            this.fileList.setItems(items);

            // Update section title
            const titleEl = this.mainContainerEl?.querySelector('.activity-list-header .activity-heatmap-section-title');
            if (titleEl) {
                titleEl.textContent = 'Activity by ' + this.getViewLabel();
            }
        }
    }

    /**
     * Update settings reference
     */
    updateSettings(settings: PluginSettings): void {
        this.settings = settings;
        if (this.heatmap) {
            this.heatmap.setColorScheme(settings.colorScheme);
        }
    }
}
