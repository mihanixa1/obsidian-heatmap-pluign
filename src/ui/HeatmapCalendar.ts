import { DailyActivity, ColorScheme, COLOR_SCHEMES, MetricType } from '../types';

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

/**
 * HeatmapCalendar renders a GitHub-style activity heatmap.
 */
export class HeatmapCalendar {
    private containerEl: HTMLElement;
    private data: DailyActivity[];
    private colorScheme: ColorScheme;
    private metricType: MetricType;
    private tooltip: HTMLElement | null = null;
    private onDayClickCallback: ((date: string) => void) | null = null;

    constructor(
        containerEl: HTMLElement,
        data: DailyActivity[],
        colorScheme: ColorScheme = 'green',
        metricType: MetricType = 'opens'
    ) {
        this.containerEl = containerEl;
        this.data = data;
        this.colorScheme = colorScheme;
        this.metricType = metricType;
    }

    /**
     * Render the heatmap
     */
    render(): void {
        this.containerEl.innerHTML = '';
        this.containerEl.className = `heatmap-container heatmap-${this.colorScheme}`;

        // Create wrapper for horizontal scrolling
        const wrapper = createDiv(this.containerEl, 'heatmap-wrapper');

        // Create month labels
        this.renderMonthLabels(wrapper);

        // Create main grid with day labels
        const gridWrapper = createDiv(wrapper, 'heatmap-grid-wrapper');

        // Day labels (Mon, Wed, Fri)
        this.renderDayLabels(gridWrapper);

        // Heatmap grid
        const grid = createDiv(gridWrapper, 'heatmap-grid');
        this.renderGrid(grid);

        // Legend
        this.renderLegend(wrapper);
    }

    /**
     * Render month labels above the grid
     */
    private renderMonthLabels(container: HTMLElement): void {
        const monthLabels = createDiv(container, 'heatmap-month-labels');

        if (this.data.length === 0) return;

        const months: { month: string; startWeek: number }[] = [];
        let currentMonth = '';
        let weekIndex = 0;

        // Group data by weeks
        const weeks = this.groupByWeeks();

        for (let i = 0; i < weeks.length; i++) {
            const firstDayOfWeek = weeks[i][0];
            if (firstDayOfWeek) {
                const date = new Date(firstDayOfWeek.date);
                const monthName = date.toLocaleDateString('en-US', { month: 'short' });

                if (monthName !== currentMonth) {
                    months.push({ month: monthName, startWeek: i });
                    currentMonth = monthName;
                }
            }
        }

        // Render month labels with proper spacing
        let lastEnd = 0;
        for (const { month, startWeek } of months) {
            const spacer = createSpan(monthLabels, 'heatmap-month-spacer');
            spacer.style.width = `${(startWeek - lastEnd) * 15}px`;

            createSpan(monthLabels, 'heatmap-month-label', month);

            lastEnd = startWeek;
        }
    }

    /**
     * Render day labels (Mon, Wed, Fri)
     */
    private renderDayLabels(container: HTMLElement): void {
        const dayLabels = createDiv(container, 'heatmap-day-labels');
        const days = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

        for (const day of days) {
            const label = createDiv(dayLabels, 'heatmap-day-label');
            label.textContent = day;
        }
    }

    /**
     * Render the heatmap grid
     */
    private renderGrid(grid: HTMLElement): void {
        const weeks = this.groupByWeeks();
        const maxValue = this.getMaxValue();

        for (const week of weeks) {
            const weekEl = createDiv(grid, 'heatmap-week');

            for (const day of week) {
                const cell = createDiv(weekEl, 'heatmap-cell');

                if (day) {
                    const value = this.metricType === 'opens' ? day.openCount : day.editCount;
                    const level = this.getLevel(value, maxValue);
                    cell.classList.add(`level-${level}`);
                    cell.dataset.date = day.date;
                    cell.dataset.count = String(value);

                    // Add event listeners
                    cell.addEventListener('mouseenter', (e: MouseEvent) => this.showTooltip(e, day));
                    cell.addEventListener('mouseleave', () => this.hideTooltip());
                    cell.addEventListener('click', () => {
                        if (this.onDayClickCallback) {
                            this.onDayClickCallback(day.date);
                        }
                    });
                } else {
                    cell.classList.add('level-0');
                    cell.classList.add('empty');
                }
            }
        }
    }

    /**
     * Group daily data by weeks (Sunday start)
     */
    private groupByWeeks(): (DailyActivity | null)[][] {
        if (this.data.length === 0) return [];

        const weeks: (DailyActivity | null)[][] = [];
        const dataMap = new Map(this.data.map((d) => [d.date, d]));

        // Find the date range
        const sortedDates = this.data.map((d) => d.date).sort();
        const startDate = new Date(sortedDates[0]);
        const endDate = new Date(sortedDates[sortedDates.length - 1]);

        // Adjust start to Sunday
        const adjustedStart = new Date(startDate);
        adjustedStart.setDate(adjustedStart.getDate() - adjustedStart.getDay());

        // Iterate through weeks
        let currentDate = new Date(adjustedStart);
        while (currentDate <= endDate) {
            const week: (DailyActivity | null)[] = [];

            for (let i = 0; i < 7; i++) {
                const dateStr = currentDate.toISOString().split('T')[0];

                if (currentDate >= startDate && currentDate <= endDate) {
                    week.push(dataMap.get(dateStr) || { date: dateStr, openCount: 0, editCount: 0 });
                } else {
                    week.push(null);
                }

                currentDate.setDate(currentDate.getDate() + 1);
            }

            weeks.push(week);
        }

        return weeks;
    }

    /**
     * Get maximum value for scaling
     */
    private getMaxValue(): number {
        let max = 0;
        for (const day of this.data) {
            const value = this.metricType === 'opens' ? day.openCount : day.editCount;
            if (value > max) max = value;
        }
        return max || 1;
    }

    /**
     * Get color level (0-4) based on value
     */
    private getLevel(value: number, maxValue: number): number {
        if (value === 0) return 0;

        const ratio = value / maxValue;
        if (ratio <= 0.25) return 1;
        if (ratio <= 0.5) return 2;
        if (ratio <= 0.75) return 3;
        return 4;
    }

    /**
     * Show tooltip on hover
     */
    private showTooltip(event: MouseEvent, day: DailyActivity): void {
        this.hideTooltip();

        const cell = event.target as HTMLElement;
        const rect = cell.getBoundingClientRect();
        const value = this.metricType === 'opens' ? day.openCount : day.editCount;
        const metricLabel = this.metricType === 'opens' ? 'opens' : 'edits';

        this.tooltip = document.createElement('div');
        this.tooltip.className = 'heatmap-tooltip';
        this.tooltip.innerHTML = `
            <div class="heatmap-tooltip-date">${this.formatDate(day.date)}</div>
            <div class="heatmap-tooltip-count">${value} ${metricLabel}</div>
        `;

        document.body.appendChild(this.tooltip);

        // Position tooltip
        const tooltipRect = this.tooltip.getBoundingClientRect();
        this.tooltip.style.left = `${rect.left + rect.width / 2 - tooltipRect.width / 2}px`;
        this.tooltip.style.top = `${rect.top - tooltipRect.height - 8}px`;
    }

    /**
     * Hide tooltip
     */
    private hideTooltip(): void {
        if (this.tooltip) {
            this.tooltip.remove();
            this.tooltip = null;
        }
    }

    /**
     * Format date for display
     */
    private formatDate(dateStr: string): string {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    }

    /**
     * Render legend
     */
    private renderLegend(container: HTMLElement): void {
        const legend = createDiv(container, 'heatmap-legend');

        createSpan(legend, 'heatmap-legend-label', 'Less');

        for (let i = 0; i <= 4; i++) {
            const cell = createDiv(legend, `heatmap-cell level-${i}`);
            cell.style.cursor = 'default';
        }

        createSpan(legend, 'heatmap-legend-label', 'More');
    }

    /**
     * Set callback for day click
     */
    onDayClick(callback: (date: string) => void): void {
        this.onDayClickCallback = callback;
    }

    /**
     * Update data and re-render
     */
    update(data: DailyActivity[], metricType?: MetricType): void {
        this.data = data;
        if (metricType) {
            this.metricType = metricType;
        }
        this.render();
    }

    /**
     * Set color scheme
     */
    setColorScheme(scheme: ColorScheme): void {
        this.containerEl.classList.remove(`heatmap-${this.colorScheme}`);
        this.colorScheme = scheme;
        this.containerEl.classList.add(`heatmap-${this.colorScheme}`);
    }
}
