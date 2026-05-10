import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductStateService } from '../../service/product-state.service';

interface ProductRanking {
    rank: number;
    product_name: string;
    review_count: number;
    positive_rate: number;
    sentiment: 'positive' | 'negative';
}

@Component({
    selector: 'app-best-worst-products',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './best-worst-products.component.html',
    styleUrl: './best-worst-products.component.scss'
})
export class BestWorstProductsComponent implements OnInit {
    @Input() summary: any[] = [];

    @Output() productSelected = new EventEmitter<any>();

    bestSellers: any[] = [];
    worstSellers: any[] = [];
    podiumAnimating = false;

    constructor(private productState: ProductStateService) {}

    ngOnInit(): void {
        this.calculateRankings();
    }

    calculateRankings(): void {
        if (!this.summary || this.summary.length === 0) return;

        // Keep the full product objects instead of mapping to a new interface
        const sorted = [...this.summary].sort((a, b) => b.review_count - a.review_count);
        this.bestSellers = sorted.slice(0, 3);
        this.worstSellers = sorted.slice(-3).reverse();

        this.animatePodium();
    }

    animatePodium(): void {
        this.podiumAnimating = false;
        setTimeout(() => {
            this.podiumAnimating = true;
        }, 50);
    }

    getMedalEmoji(rank: number): string {
        const medals = ['🥇', '🥈', '🥉'];
        return medals[rank - 1] || '&#9733;';
    }

    formatNumber(num: number): string {
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    onProductClick(product: any): void {
        this.productState.setSelectedProduct(product);
    }
}
