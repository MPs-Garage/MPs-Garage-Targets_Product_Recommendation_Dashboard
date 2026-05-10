import { Component, Input, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";

interface Slide {
    id: number;
    icon: string;
    title: string;
    body: string;
    type: 'intro' | 'treemap' | 'bubble' | 'mini' | 'contact';
}

@Component({
    selector: 'app-slides',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './slides.component.html',
    styleUrl: './slides.component.scss'
})
export class SlidesComponent implements OnInit, OnDestroy {
    @Input() summary: any[] = [];

    current  = 0;
    prev     = -1;
    direction: 'left' | 'right' = 'left';
    animating = false;

    private timer: any;

    slides: Slide[] = [
        {
            id: 0,
            type: 'intro',
            icon: '🎯',
            title: 'Welcome to the Product Recommendation Dashboard',
            body: 'This dashboard was created as part of Build for Target challenge. Cleaned and Analyzed 34 thousand reviews using sentiment analysis (to detect positive or negative reviews) and turn them into simple visual insights so you can quickly see which products are liked or disliked. The Dataset is highly biased towards Positive reviews and recommendations, So it\' a tiny bit skewed towards postives',
        },
        {
            id: 1,
            type: 'treemap',
            icon: '📊',
            title: 'Understanding the Treemap View',
            body: 'Each box represents a product. Bigger boxes mean more customer reviews. Green boxes indicate products that are mostly positively reviewed, while red boxes indicate mixed or negative feedback. The darker the color, the stronger the sentiment. Click on any box to explore detailed customer opinions.',
        },

        {
            id: 2,
            type: 'bubble',
            icon: '🫧',
            title: 'Understanding the Bubble Chart',
            body: 'This chart compares products based on customer feedback. Left to right shows how many people reviewed the product. Bottom to top shows how positive the reviews are. Bigger bubbles mean higher average ratings. Products in the top-right are generally the most reliable and well-liked.',
        },

        {
            id: 3,
            type: 'mini',
            icon: '📋',
            title: 'Detailed Product View',
            body: 'Clicking any product opens a detailed breakdown. You can see how customers feel about it, how ratings are distributed, and read actual reviews. This helps you understand not just numbers, but real user experiences behind each product.',
        },
        {
            id: 4,
            type: 'contact',
            icon: '👨‍💻',
            title: 'Built by',
            body: 'R. Mrithun Prabhakar • Software Engineer\nmrithunprabhakar@gmail.com\nPortfolio Page? I don\'t have one bro',
        },
    ];

    get totalSlides(): number { return this.slides.length; }

    ngOnInit(): void {
        this.startTimer();
    }

    ngOnDestroy(): void {
        this.stopTimer();
    }

    startTimer(): void {
        this.timer = setInterval(() => this.goTo(this.next(), 'left'), 10000);
    }

    stopTimer(): void {
        clearInterval(this.timer);
    }

    next(): number {
        return (this.current + 1) % this.totalSlides;
    }

    previous(): number {
        return (this.current - 1 + this.totalSlides) % this.totalSlides;
    }

    goTo(index: number, dir: 'left' | 'right'): void {
        if (this.animating || index === this.current) return;
        this.direction = dir;
        this.prev      = this.current;
        this.animating = true;
        this.current   = index;
        setTimeout(() => {
            this.prev      = -1;
            this.animating = false;
        }, 400);
    }

    onNext(): void {
        this.stopTimer();
        this.goTo(this.next(), 'left');
        this.startTimer();
    }

    onPrev(): void {
        this.stopTimer();
        this.goTo(this.previous(), 'right');
        this.startTimer();
    }

    onDot(index: number): void {
        if (index === this.current) return;
        const dir = index > this.current ? 'left' : 'right';
        this.stopTimer();
        this.goTo(index, dir);
        this.startTimer();
    }
}