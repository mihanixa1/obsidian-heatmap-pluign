import { App, TFile, setIcon } from 'obsidian';
import { FileMetrics, FolderMetrics, TagMetrics, MetricType, SortOrder, ViewMode } from '../types';

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
 * Helper to create span element with class and optional text
 */
function createSpan(parent: HTMLElement, cls?: string, text?: string): HTMLSpanElement {
    const span = document.createElement('span');
    if (cls) span.className = cls;
    if (text) span.textContent = text;
    parent.appendChild(span);
    return span;
}

type ListItem = FileMetrics | FolderMetrics | TagMetrics;

/**
 * FileList renders a sortable list of files, folders, or tags with their metrics.
 */
export class FileList {
    private app: App;
    private containerEl: HTMLElement;
    private items: ListItem[] = [];
    private viewMode: ViewMode;
    private metricType: MetricType;
    private sortOrder: SortOrder;
    private onItemClickCallback: ((item: ListItem) => void) | null = null;

    constructor(
        app: App,
        containerEl: HTMLElement,
        viewMode: ViewMode = 'files',
        metricType: MetricType = 'opens',
        sortOrder: SortOrder = 'desc'
    ) {
        this.app = app;
        this.containerEl = containerEl;
        this.viewMode = viewMode;
        this.metricType = metricType;
        this.sortOrder = sortOrder;
    }

    /**
     * Set items and render
     */
    setItems(items: ListItem[]): void {
        this.items = this.sortItems(items);
        this.render();
    }

    /**
     * Sort items by current metric and order
     */
    private sortItems(items: ListItem[]): ListItem[] {
        return [...items].sort((a, b) => {
            const aValue = this.getMetricValue(a);
            const bValue = this.getMetricValue(b);

            if (this.sortOrder === 'desc') {
                return bValue - aValue;
            }
            return aValue - bValue;
        });
    }

    /**
     * Get metric value from item based on current metric type
     */
    private getMetricValue(item: ListItem): number {
        if (this.viewMode === 'files') {
            const fileItem = item as FileMetrics;
            return this.metricType === 'opens' ? fileItem.openCount : fileItem.editCount;
        } else if (this.viewMode === 'folders') {
            const folderItem = item as FolderMetrics;
            return this.metricType === 'opens' ? folderItem.totalOpenCount : folderItem.totalEditCount;
        } else {
            const tagItem = item as TagMetrics;
            return this.metricType === 'opens' ? tagItem.openCount : tagItem.editCount;
        }
    }

    /**
     * Render the list
     */
    render(): void {
        this.containerEl.innerHTML = '';
        this.containerEl.className = 'activity-list';

        if (this.items.length === 0) {
            this.renderEmptyState();
            return;
        }

        for (const item of this.items) {
            this.renderItem(item);
        }
    }

    /**
     * Render empty state
     */
    private renderEmptyState(): void {
        const empty = createDiv(this.containerEl, 'activity-list-empty');
        const icon = createDiv(empty, 'activity-list-empty-icon');
        icon.textContent = '📊';
        const text = createDiv(empty, 'activity-list-empty-text');
        text.textContent = 'No activity recorded for this period';
    }

    /**
     * Render a single item
     */
    private renderItem(item: ListItem): void {
        const itemEl = createDiv(this.containerEl, 'activity-list-item');

        // Add deleted class for non-existent files
        if (this.viewMode === 'files' && !(item as FileMetrics).exists) {
            itemEl.classList.add('deleted');
        }

        // Icon
        const iconEl = createDiv(itemEl, 'activity-list-item-icon');
        this.setItemIcon(iconEl, item);

        // Name and path
        const infoEl = createDiv(itemEl, 'activity-list-item-info');
        const nameEl = createDiv(infoEl, 'activity-list-item-name');
        nameEl.textContent = this.getItemName(item);

        if (this.viewMode === 'files') {
            const pathEl = createDiv(infoEl, 'activity-list-item-path');
            pathEl.textContent = (item as FileMetrics).folderPath || '/';
        }

        // Count
        const countEl = createDiv(itemEl, 'activity-list-item-count');
        const value = this.getMetricValue(item);
        const label = this.metricType === 'opens' ? 'opens' : 'edits';
        countEl.innerHTML = `<strong>${value}</strong> ${label}`;

        // Click handler
        itemEl.addEventListener('click', () => {
            if (this.onItemClickCallback) {
                this.onItemClickCallback(item);
            } else if (this.viewMode === 'files') {
                this.openFile(item as FileMetrics);
            }
        });
    }

    /**
     * Set icon for item
     */
    private setItemIcon(iconEl: HTMLElement, item: ListItem): void {
        let iconName: string;

        if (this.viewMode === 'files') {
            iconName = 'file-text';
        } else if (this.viewMode === 'folders') {
            iconName = 'folder';
        } else {
            iconName = 'tag';
        }

        try {
            setIcon(iconEl, iconName);
        } catch {
            // Fallback if setIcon fails
            iconEl.textContent = this.viewMode === 'files' ? '📄' :
                                 this.viewMode === 'folders' ? '📁' : '🏷️';
        }
    }

    /**
     * Get display name for item
     */
    private getItemName(item: ListItem): string {
        if (this.viewMode === 'files') {
            return (item as FileMetrics).fileName;
        } else if (this.viewMode === 'folders') {
            return (item as FolderMetrics).folderName;
        } else {
            return '#' + (item as TagMetrics).tag;
        }
    }

    /**
     * Open file in Obsidian
     */
    private openFile(fileMetrics: FileMetrics): void {
        const file = this.app.vault.getAbstractFileByPath(fileMetrics.filePath);
        if (file instanceof TFile) {
            this.app.workspace.getLeaf().openFile(file);
        }
    }

    /**
     * Update view mode
     */
    setViewMode(viewMode: ViewMode): void {
        this.viewMode = viewMode;
    }

    /**
     * Update metric type and re-sort
     */
    setMetricType(metricType: MetricType): void {
        this.metricType = metricType;
        this.items = this.sortItems(this.items);
        this.render();
    }

    /**
     * Update sort order and re-sort
     */
    setSortOrder(sortOrder: SortOrder): void {
        this.sortOrder = sortOrder;
        this.items = this.sortItems(this.items);
        this.render();
    }

    /**
     * Toggle sort order
     */
    toggleSortOrder(): void {
        this.setSortOrder(this.sortOrder === 'desc' ? 'asc' : 'desc');
    }

    /**
     * Set callback for item click
     */
    onItemClick(callback: (item: ListItem) => void): void {
        this.onItemClickCallback = callback;
    }
}
