import { Component, OnInit } from "@angular/core";
import { ProductListComponent } from "./components/product-list/product-list.component";
import { HttpClient } from "@angular/common/http";
import { CommonModule } from "@angular/common";
import { ProductDetailsComponent } from "./components/product-details/product-details.component";
import { TreemapComponent } from "./components/treemap/treemap.component";
import { BubbleChartComponent } from "./components/bubble-chart/bubble-chart.component";
import { SlidesComponent } from "./components/slides/slides.component";
import { ProductStateService } from "./service/product-state.service";
import { ThemeService } from "./service/theme.service";
import { BestWorstProductsComponent } from './components/best-worst-products/best-worst-products.component';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [
        CommonModule, 
        ProductListComponent, 
        ProductDetailsComponent, 
        TreemapComponent, 
        BubbleChartComponent,
        SlidesComponent,
        BestWorstProductsComponent
    ],
    templateUrl: "./dashboard.component.html",
    styleUrl: "./dashboard.component.scss",
})
export class DashboardComponent implements OnInit{
    constructor(private http: HttpClient, private productState: ProductStateService,public theme: ThemeService){}
    activeChart: 'treemap' | 'bubble' | 'best/worst' = 'best/worst';
    allReviews: any[] = [];
    summary: any[] = [];

    recommendedProducts: any[] = [];
    notRecommendedProducts: any[] = [];
    loading = true;
    error: string | null= null;

    searchQuery = '';
    ngOnInit(): void {
        this.loadData();
    }
    loadData(){
        this.http.get<any[]>('./assets/data/product_recommendation_summary.json')
        .subscribe(
            {
                next: (summary) => {
                    this.summary = summary;
                    this.splitProducts();
                    this.http.get<any[]>('./assets/data/cleaned_product_reviews.json').subscribe(
                        {
                            next: (reviews) => {
                                this.allReviews = reviews;
                                this.recommendedProducts    = this.enrichWithSpecs(this.recommendedProducts);
    this.notRecommendedProducts = this.enrichWithSpecs(this.notRecommendedProducts);
                                this.loading = false
                            },
                            error: (err) => {
                                this.error = 'Failed to load Reviews' + err.message;
                                this.loading = false;
                            }
                        }
                    );
                },
                error: (err) => {
                    this.error = 'Failed to load summary' + err.message;
                    this.loading = false;
                }
            }
        );
    }
    splitProducts(){
        this.recommendedProducts = this.summary.filter(p => p.recommend_rate >= 0.94).sort((a, b) => b.review_count - a.review_count);
        this.notRecommendedProducts = this.summary.filter(p => p.recommend_rate < 0.94).sort((a, b) => b.review_count - a.review_count);
    }
    getReviewsForProduct(product:any) :any[]{
        return this.allReviews.filter(
            r => r.product_name === product.product_name && r.company === product.company
        );
    }
    enrichWithSpecs(products: any[]): any[] {
        return products.map(p => {
            const match = this.allReviews.find(
                r => r.product_name === p.product_name && r.company === p.company
            );
            return { ...p, specs: match?.specs ?? '' };
        });
    }
    filterProducts(products: any[]): any[] {
        if (!this.searchQuery.trim()) return products;
        const q = this.searchQuery.toLowerCase().trim();
        return products.filter(p =>
            p.product_name.toLowerCase().includes(q) ||
            p.company.toLowerCase().includes(q) ||
            p.specs?.toLowerCase().includes(q)
        );
    }
    get filteredRecommended(): any[]{
        return this.filterProducts(this.recommendedProducts);
    }
    get filteredNotRecommended(): any[] {
        return this.filterProducts(this.notRecommendedProducts);
    }
    onSearch(event: Event): void {
        this.searchQuery = (event.target as HTMLInputElement).value;
    }
    onResultClick(product: any): void {
        this.searchQuery = '';
        this.productState.setSelectedProduct(product);
    }
}