import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ProductStateService } from "../product-state.service";
import { flush } from "@angular/core/testing";

@Component({
    selector: 'app-product-details',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './product-details.component.html',
    styleUrl: './product-details.component.scss'
})

export class ProductDetailsComponent implements OnInit{
    selectedProduct: any;
    positiveCount = 0;
    negativeCount = 0;
    ratingDistribution: any = {};
    displayPercent = 0;
    animate = false;
    displayTotal = 0;
    displayPositive = 0;
    displayNegative = 0;
    
    constructor(private productState:ProductStateService){}
    
    computeMetrics(product: any) {
        if (!product) return;
        
        this.positiveCount = 0;
        this.negativeCount = 0;
        this.ratingDistribution = {
            1: 0, 2: 0, 3: 0, 4: 0, 5: 0
        };
        product.reviews.forEach((r: any) => {
            if (r.final_sentiment >= 0.75) {
                this.positiveCount++;
            } else {
                this.negativeCount++;
            }
            const rating = Math.round(r.rating);
            if (this.ratingDistribution[rating] !== undefined) {
                this.ratingDistribution[rating]++;
            }
        });
    }
    get positivePercent(): number {
        const total = this.positiveCount + this.negativeCount;
        return total ? (this.positiveCount / total) * 100 : 0;
    }
    getRatingPercent(star: number): number {
        const total = this.selectedProduct?.reviewCount || 1;
        const value = this.ratingDistribution[star] || 0;
        return (value / total) * 100;
    }
    close(){
        this.selectedProduct = null;
    }
    animateDonut(){
        const start = performance.now();
        const duration = 2000;
        const target = this.positivePercent;

        const animate = (time: number) => {
            const progress = Math.min((time - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            this.displayPercent = Math.min(target * eased, target);
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }
    animateKPIs(){
        const duration = 2000;
        const start = performance.now();
        const totalTarget = this.selectedProduct?.reviewCount || 0;
        const positiveTarget = this.positiveCount;
        const negativeTarget = this.negativeCount;
        const animate = (time: number) => {
            const progress = Math.min((time - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            this.displayTotal = Math.floor(totalTarget * eased);
            this.displayPositive = Math.floor(positiveTarget * eased);
            this.displayNegative = Math.floor(negativeTarget * eased);
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }
    ngOnInit(): void {
        this.productState.selectedProduct$.subscribe(product =>{
            this.selectedProduct = product;
            this.computeMetrics(product);
            this.animate = false;
            this.animateDonut();
            this.animateKPIs();
            setTimeout(()=>{
                this.animate = true;
            },200)
        });
    }    
}