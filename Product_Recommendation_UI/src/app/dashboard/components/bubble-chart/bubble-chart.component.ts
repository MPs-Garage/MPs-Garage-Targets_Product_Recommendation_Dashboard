import { Component, Input, OnChanges, ElementRef, AfterViewInit, SimpleChanges, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ProductStateService } from "../../service/product-state.service";

interface Bubble {
    product: any;
    cx: number;
    cy: number;
    r: number;
    color: string;
    tooltip: string;
    labelVisible: boolean;
    isRecommended: boolean;
}

@Component({
    selector: 'app-bubble-chart',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './bubble-chart.component.html',
    styleUrl: './bubble-chart.component.scss'
})
export class BubbleChartComponent implements OnChanges, AfterViewInit {
    @Input() summary: any[] = [];
    @Input() recommendedProducts: any[] = [];

    bubbles: Bubble[] = [];
    xLabels: { value: number, x: number }[] = [];
    yLabels: { value: number, y: number }[] = [];
    gridLines: { x1: number, y1: number, x2: number, y2: number, axis: 'x' | 'y' }[] = [];

    readonly MARGIN = { top: 10, right: 20, bottom: 40, left: 55 };
    chartW = 0;
    chartH = 0;
    svgW   = 0;
    svgH   = 0;

    private built      = false;
    private resizeTimer: any;

    constructor(
        private productState: ProductStateService,
        private el: ElementRef
    ) {}

    ngAfterViewInit(): void {
        setTimeout(() => this.measureAndBuild(), 50);
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (this.built && this.summary.length) {
            this.buildChart();
        }
    }

    @HostListener('window:resize')
    onResize(): void {
        clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(() => this.measureAndBuild(), 200);
    }

    measureAndBuild(): void {
        const el = this.el.nativeElement.querySelector('.bubble-container');
        if (!el) return;
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        if (w === 0 || h === 0) return;
        if (w === this.svgW && h === this.svgH && this.built) return;

        this.svgW   = w;
        this.svgH   = h;
        this.chartW = w - this.MARGIN.left - this.MARGIN.right;
        this.chartH = h - this.MARGIN.top  - this.MARGIN.bottom;
        this.built  = true;

        if (this.summary.length) this.buildChart();
    }

    buildChart(): void {
        if (!this.chartW || !this.chartH) return;

        const recommendedSet = new Set(
            this.recommendedProducts.map(p => `${p.product_name}__${p.company}`)
        );

        // Data ranges
        const maxReviews  = Math.max(...this.summary.map(p => p.review_count));
        const minPositive = Math.min(...this.summary.map(p => p.positive_rate));
        const maxPositive = Math.max(...this.summary.map(p => p.positive_rate));
        const minRating   = Math.min(...this.summary.map(p => p.avg_rating));
        const maxRating   = Math.max(...this.summary.map(p => p.avg_rating));

        // Scales
        const xScale = (v: number) =>
            this.MARGIN.left + Math.sqrt(v / maxReviews) * this.chartW;

        const yScale = (v: number) =>
            this.MARGIN.top + this.chartH -
            ((v - minPositive) / (maxPositive - minPositive || 1)) * this.chartH;

        const rScale = (v: number) => {
            const norm = (v - minRating) / (maxRating - minRating || 1);
            return 8 + norm * 18;
        };

        // Build raw bubble positions from data
        const rawBubbles = this.summary.map(p => ({
            product: p,
            cx: xScale(p.review_count),
            cy: yScale(p.positive_rate),
            r:  rScale(p.avg_rating),
            isRecommended: recommendedSet.has(`${p.product_name}__${p.company}`),
        }));

        // Force collision resolution — push overlapping bubbles apart
        for (let pass = 0; pass < 50; pass++) {
            for (let i = 0; i < rawBubbles.length; i++) {
                for (let j = i + 1; j < rawBubbles.length; j++) {
                    const a = rawBubbles[i];
                    const b = rawBubbles[j];
                    const dx   = b.cx - a.cx;
                    const dy   = b.cy - a.cy;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
                    const minDist = a.r + b.r + 3;

                    if (dist < minDist) {
                        const overlap = (minDist - dist) / 2;
                        const nx = (dx / dist) * overlap;
                        const ny = (dy / dist) * overlap;

                        a.cx -= nx;
                        a.cy -= ny;
                        b.cx += nx;
                        b.cy += ny;

                        // Clamp within chart bounds
                        const clampX = (cx: number, r: number) =>
                            Math.max(this.MARGIN.left + r, Math.min(this.MARGIN.left + this.chartW - r, cx));
                        const clampY = (cy: number, r: number) =>
                            Math.max(this.MARGIN.top + r,  Math.min(this.MARGIN.top  + this.chartH - r, cy));

                        a.cx = clampX(a.cx, a.r);
                        a.cy = clampY(a.cy, a.r);
                        b.cx = clampX(b.cx, b.r);
                        b.cy = clampY(b.cy, b.r);
                    }
                }
            }
        }

        // Build final bubbles from resolved positions
        this.bubbles = rawBubbles.map(b => ({
            ...b,
            color: b.isRecommended
                ? `hsla(142, 60%, 35%, 0.75)`
                : `hsla(4, 70%, 40%, 0.75)`,
            tooltip: `${b.product.product_name}\n${b.product.company}\n&#9733; ${b.product.avg_rating.toFixed(1)}\n😊 ${(b.product.positive_rate * 100).toFixed(0)}% positive\n💬 ${b.product.review_count.toLocaleString()} reviews`,
            labelVisible: b.r > 14,
        }));

        // X axis labels
        const xTicks = [0, 500, 1000, 2000, 5000, 10000]
            .filter(v => v <= maxReviews * 1.1);
        this.xLabels = xTicks.map(v => ({ value: v, x: xScale(v) }));

        // Y axis labels
        const yStep  = 0.02;
        const yStart = Math.floor(minPositive / yStep) * yStep;
        this.yLabels = [];
        for (let v = yStart; v <= maxPositive + yStep; v += yStep) {
            this.yLabels.push({ value: Math.round(v * 100), y: yScale(v) });
        }

        // Grid lines
        this.gridLines = [
            ...this.xLabels.map(l => ({
                x1: l.x, y1: this.MARGIN.top,
                x2: l.x, y2: this.MARGIN.top + this.chartH,
                axis: 'x' as const
            })),
            ...this.yLabels.map(l => ({
                x1: this.MARGIN.left,              y1: l.y,
                x2: this.MARGIN.left + this.chartW, y2: l.y,
                axis: 'y' as const
            })),
        ];
    }

    onBubbleClick(bubble: Bubble): void {
        this.productState.setSelectedProduct(bubble.product);
    }
}