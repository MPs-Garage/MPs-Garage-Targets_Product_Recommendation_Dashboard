import { Component, Input, OnChanges, ElementRef, AfterViewInit, SimpleChanges, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ProductStateService } from "../../service/product-state.service";

interface TreeBlock {
    product: any;
    x: number; y: number; w: number; h: number;
    color: string; tooltip: string;
    labelVisible: boolean; isRecommended: boolean;
}

@Component({
    selector: 'app-treemap',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './treemap.component.html',
    styleUrl: './treemap.component.scss'
})
export class TreemapComponent implements OnChanges, AfterViewInit {
    @Input() summary: any[] = [];
    @Input() recommendedProducts: any[] = [];

    blocks: TreeBlock[] = [];
    containerWidth = 0;
    containerHeight = 0;

    private built = false;        // ← prevent double-build
    private resizeTimer: any;     // ← debounce resize

    constructor(
        private productState: ProductStateService,
        private el: ElementRef
    ) {}

    ngAfterViewInit(): void {
        // Defer so container has rendered and has real dimensions
        setTimeout(() => this.measureAndBuild(), 50);
    }

    ngOnChanges(changes: SimpleChanges): void {
        // Only rebuild after view is ready
        if (this.built) {
            this.buildBlocks();
        }
    }

    @HostListener('window:resize')
    onResize(): void {
        // Debounce — only rebuild 200ms after resize stops
        clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(() => this.measureAndBuild(), 200);
    }

    measureAndBuild(): void {
        const el = this.el.nativeElement.querySelector('.treemap-container');
        if (!el) return;

        const w = el.offsetWidth;
        const h = el.offsetHeight;

        // Skip if dimensions unchanged or zero
        if (w === 0 || h === 0) return;
        if (w === this.containerWidth && h === this.containerHeight && this.built) return;

        this.containerWidth  = w;
        this.containerHeight = h;
        this.built = true;

        if (this.summary.length) {
            this.buildBlocks();
        }
    }

    buildBlocks(): void {
    if (!this.containerWidth || !this.containerHeight) return;

    const recommendedSet = new Set(
        this.recommendedProducts.map(p => `${p.product_name}__${p.company}`)
    );

    const sorted = [...this.summary].sort((a, b) => b.review_count - a.review_count);

    const totalArea = this.containerWidth * this.containerHeight;

    const sqrtValues = sorted.map(p => Math.sqrt(p.review_count));
const sqrtTotal  = sqrtValues.reduce((s, v) => s + v, 0);

const items = sorted.map((p, i) => ({
    product: p,
    value: (sqrtValues[i] / sqrtTotal) * totalArea,
}));

    const rects = this.squarify(
        items,
        { x: 0, y: 0, w: this.containerWidth, h: this.containerHeight }
    );

    this.blocks = rects.map((r, i) => {
        const isRecommended = recommendedSet.has(
            `${r.product.product_name}__${r.product.company}`
        );
        return {
            product: r.product,
            x: r.x + 2,
            y: r.y + 2,
            w: r.w - 4,
            h: r.h - 4,
            isRecommended,
            color: this.getColor(r.product.positive_rate, isRecommended),
            tooltip: `${r.product.product_name}\n${r.product.company}\n😊 ${(r.product.positive_rate * 100).toFixed(0)}% positive\n💬 ${r.product.review_count.toLocaleString()} reviews`,
            labelVisible: r.w > 55 && r.h > 35,
        };
    });
}

    squarify(
    items: { product: any, value: number }[],
    rect: { x: number, y: number, w: number, h: number }
): { product: any, x: number, y: number, w: number, h: number }[] {
    if (items.length === 0) return [];
    if (items.length === 1) {
        return [{ product: items[0].product, x: rect.x, y: rect.y, w: rect.w, h: rect.h }];
    }

    const results: { product: any, x: number, y: number, w: number, h: number }[] = [];
    let remaining = [...items];
    let currentRect = { ...rect };

    while (remaining.length > 0) {
        if (remaining.length === 1) {
            results.push({
                product: remaining[0].product,
                x: currentRect.x, y: currentRect.y,
                w: currentRect.w, h: currentRect.h
            });
            break;
        }

        // Always split along the shorter side
        const isWide = currentRect.w >= currentRect.h;
        const shortSide = isWide ? currentRect.h : currentRect.w;
        const totalRemaining = remaining.reduce((s, i) => s + i.value, 0);

        // Find optimal row using squarify — add items until aspect ratio worsens
        let row: typeof items = [remaining[0]];
        let prevWorst = this.worstAspect(row, shortSide, totalRemaining, currentRect.w, currentRect.h);

        for (let i = 1; i < remaining.length; i++) {
            const candidate = [...row, remaining[i]];
            const newWorst = this.worstAspect(candidate, shortSide, totalRemaining, currentRect.w, currentRect.h);
            if (newWorst > prevWorst) break;  // adding more items makes it worse — stop
            row = candidate;
            prevWorst = newWorst;
        }

        // Layout the row
        const rowValue = row.reduce((s, i) => s + i.value, 0);
        const rowFraction = rowValue / totalRemaining;

        if (isWide) {
            // Place row as a vertical strip on the left
            const stripW = currentRect.w * rowFraction;
            let offsetY = currentRect.y;
            for (const item of row) {
                const h = currentRect.h * (item.value / rowValue);
                results.push({ product: item.product, x: currentRect.x, y: offsetY, w: stripW, h });
                offsetY += h;
            }
            currentRect = {
                x: currentRect.x + stripW,
                y: currentRect.y,
                w: currentRect.w - stripW,
                h: currentRect.h
            };
        } else {
            // Place row as a horizontal strip on top
            const stripH = currentRect.h * rowFraction;
            let offsetX = currentRect.x;
            for (const item of row) {
                const w = currentRect.w * (item.value / rowValue);
                results.push({ product: item.product, x: offsetX, y: currentRect.y, w, h: stripH });
                offsetX += w;
            }
            currentRect = {
                x: currentRect.x,
                y: currentRect.y + stripH,
                w: currentRect.w,
                h: currentRect.h - stripH
            };
        }

        remaining = remaining.slice(row.length);
        if (currentRect.w < 1 || currentRect.h < 1) break;
    }

    return results;
}

worstAspect(
    row: { value: number }[],
    shortSide: number,
    totalValue: number,
    w: number,
    h: number
): number {
    const rowValue  = row.reduce((s, i) => s + i.value, 0);
    const isWide    = w >= h;

    // Length of the strip this row would occupy
    const stripLength = isWide
        ? w * (rowValue / totalValue)
        : h * (rowValue / totalValue);

    let worst = 0;
    for (const item of row) {
        // Each item's length within the strip
        const itemLength = shortSide * (item.value / rowValue);
        // Aspect ratio of this item's rectangle
        const aspect = Math.max(stripLength / itemLength, itemLength / stripLength);
        worst = Math.max(worst, aspect);
    }
    return worst;
}

    getColor(positiveRate: number, isRecommended: boolean): string {
        const intensity = Math.round(positiveRate * 100);
        if (isRecommended) {
            const lightness = 25 + (100 - intensity) * 3;
            return `hsl(142, 60%, ${lightness}%)`;
        } else {
            const lightness = 30 + (95 - intensity) * 3;
            return `hsl(4, 70%, ${lightness}%)`;
        }
    }

    onBlockClick(block: TreeBlock): void {
        this.productState.setSelectedProduct(block.product);
    }
}