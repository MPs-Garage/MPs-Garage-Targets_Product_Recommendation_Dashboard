import { Component } from "@angular/core";
import { ProductListComponent } from "./components/product-list/product-list.component";
import { HttpClient } from "@angular/common/http";
import { OnInit } from "@angular/core";
import { ProductDetailsComponent } from "./components/product-details/product-details.component";

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [ProductListComponent, ProductDetailsComponent],
    templateUrl: "./dashboard.component.html",
    styleUrl: "./dashboard.component.scss",
})
export class DashboardComponent implements OnInit{
    constructor(private http: HttpClient){}
    rawData: any[] = [];
    recommendedProducts: any[] = [];
    notRecommendedProducts: any[] = [];
    ngOnInit(): void {
        this.loadData();
    }
    loadData(){
        this.http.get<any[]>('./assets/data/sentiment_results.json')
        .subscribe(data=>{
            this.rawData = data;
            this.transformData();
        })
    }
    transformData(){
        const grouped:any = {};
        this.rawData.forEach(item=>{
            const key = item.product_clean;
            if(!grouped[key]){
                grouped[key] = {
                    name: item.Product_title,
                    specs: item.Specs,
                    reviews: [], 
                    totalRating: 0,
                    count: 0,
                    sentimentSum: 0
                }
            }
            grouped[key].totalRating += item.rating
            grouped[key].count += 1;
            grouped[key].sentimentSum += item.final_sentiment;
            grouped[key].reviews.push(item)
        });
        const products = Object.values(grouped).map((p: any) => ({
            name: p.name,
            specs: p.specs,
            avgRating: p.totalRating/p.count,
            reviews: p.reviews,
            sentiment: p.sentimentSum/p.count,
            reviewCount: p.count
        }));
        this.recommendedProducts = products.filter(p=>p.sentiment>=0.75);
        this.notRecommendedProducts = products.filter(p=>p.sentiment<0.75);
    }
}