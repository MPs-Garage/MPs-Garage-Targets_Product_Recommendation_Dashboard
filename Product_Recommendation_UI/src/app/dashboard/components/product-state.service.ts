import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";

@Injectable({
    providedIn: 'root'
})

export class ProductStateService{
    private selectedProductSubject = new BehaviorSubject<any>(null);
    selectedProduct$ = this.selectedProductSubject.asObservable();
    setSelectedProduct(product: any){
        this.selectedProductSubject.next(product)
    }
}