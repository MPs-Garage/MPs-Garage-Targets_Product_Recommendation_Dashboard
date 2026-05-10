import { Component, Input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ProductStateService } from "../../service/product-state.service";

@Component({
    selector: 'app-product-list',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './product-list.component.html',
    styleUrl: './product-list.component.scss'
})
export class ProductListComponent{
    @Input() title = '';
    @Input() products: any[] = [];
    @Input() status: 'recommended' | 'not-recommended' = 'recommended'

    constructor(private productState: ProductStateService){}
    getFullStars(rating:number): number{
        return Math.floor(rating);
    }
    getEmptyStars(rating:number): number{
        return 5 - Math.floor(rating);
    }

    getSpecsList(specs: string): string[]{
        if(!specs) return [];
         return specs.split(/,|- /).map(s=>s.trim()).filter(s=>s.length)
    }

    onProductClick(product: any){
        this.productState.setSelectedProduct(product);
    }
}