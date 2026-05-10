import { Injectable, Renderer2, RendererFactory2 } from "@angular/core";

@Injectable({ providedIn: 'root' })
export class ThemeService {
    private renderer: Renderer2;
    isDark = false;

    constructor(factory: RendererFactory2) {
        this.renderer = factory.createRenderer(null, null);
        this.initTheme();
    }

    initTheme(): void {
        const saved = localStorage.getItem('theme');
        if (saved) {
            this.isDark = saved === 'dark';
        } else {
            this.isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        this.applyTheme();
    }

    toggle(): void {
        this.isDark = !this.isDark;
        localStorage.setItem('theme', this.isDark ? 'dark' : 'light');
        this.applyTheme();
    }

    private applyTheme(): void {
        const root = document.documentElement;
        if (this.isDark) {
            this.renderer.setAttribute(root, 'data-theme', 'dark');
        } else {
            this.renderer.setAttribute(root, 'data-theme', 'light');
        }
    }
}