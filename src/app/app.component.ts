import { Component, OnInit, OnDestroy, PLATFORM_ID, inject, viewChild } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { CookiesConsentComponent } from './components/cookies-consent/cookies-consent.component';
import { LogoTransitionComponent } from './components/logo-transition/logo-transition.component';
import { PageTransitionComponent } from './components/page-transition/page-transition.component';
import { PageTransitionService } from './components/page-transition/page-transition.service';
import { gsap } from 'gsap';
// import 'zone.js';  Use this import if you need to run the spec.ts tests in isolation

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    imports: [RouterOutlet, CookiesConsentComponent, LogoTransitionComponent, PageTransitionComponent]
})
export class AppComponent implements OnInit, OnDestroy {
    private router = inject(Router);
    private platformId = inject<Object>(PLATFORM_ID);
    private pageTransitionService = inject(PageTransitionService);

    readonly logoTransition = viewChild.required(LogoTransitionComponent);
    readonly pageTransition = viewChild.required(PageTransitionComponent);

    title = 'CODERS Website';
    private routerEventsSubscription: Subscription | null = null;
    private isBrowserNavigating = false;
    showLogoTransition: boolean = false;
    private initialTransitionComplete: boolean = false;

    // Track the current transition timeout and listener for cleanup
    private transitionTimeout: any = null;
    private transitionEndListener: (() => void) | null = null;

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.showLogoTransition = this.router.url === '/';

            this.routerEventsSubscription = this.router.events.pipe(
                filter((event): event is NavigationEnd => event instanceof NavigationEnd)
            ).subscribe((event: NavigationEnd) => {
                if (!this.isBrowserNavigating) {
                    this.handleNormalNavigation(event);
                } else {
                    this.isBrowserNavigating = false;
                }
            });

            window.addEventListener('popstate', () => {
                this.isBrowserNavigating = true;
                document.body.style.pointerEvents = 'auto';
            });

            // WORKAROUND: Force repaint for SCSS
            setTimeout(() => {
                document.body.offsetHeight;
            }, 0);
        }
    }

    private handleNormalNavigation(event: NavigationEnd) {
        // Clean up any previous listeners/timeouts
        this.cleanupTransitionListeners();

        if (event.url === '/') {
            this.showLogoTransition = true;
        } else {
            this.showLogoTransition = false;
        }

        document.body.style.pointerEvents = 'none';
        document.querySelector('.app')?.classList.add('is-transitioning');

        if (this.showLogoTransition && !this.initialTransitionComplete) {
            this.logoTransition().startAnimation();

            // Fallback: If transitionend doesn't fire, proceed after 2s
            this.transitionTimeout = setTimeout(() => {
                this.initialTransitionComplete = true;
                this.startPageTransition();
                this.cleanupTransitionListeners();
            }, 0);

            // Attach transitionend listener if the element exists
            const logoContainer = this.logoTransition().logoCubeContainer().nativeElement;
            if (logoContainer) {
                const transitionEndHandler = () => {
                    this.initialTransitionComplete = true;
                    this.startPageTransition();
                    this.cleanupTransitionListeners();
                };
                logoContainer.addEventListener('transitionend', transitionEndHandler, { once: true });
                // Save handler for cleanup
                this.transitionEndListener = () => logoContainer.removeEventListener('transitionend', transitionEndHandler);
            } else {
                // If element is missing, just fallback
                this.initialTransitionComplete = true;
                this.startPageTransition();
            }
        } else {
            this.startPageTransition();
        }
    }

    private startPageTransition() {
        // Delay only on very first transition
        const delay = !this.initialTransitionComplete && this.router.url === '/' ? 1250 : 0;

        setTimeout(() => {
            this.pageTransition().transitionIn().then(() => {
                document.body.style.pointerEvents = 'auto';
                document.querySelector('.app')?.classList.remove('is-transitioning');
                gsap.set(".page-transition .block", { visibility: "hidden" });
            });
        }, delay);
    }

    private cleanupTransitionListeners() {
        // Remove previous transitionend listener if any
        if (this.transitionEndListener) {
            this.transitionEndListener();
            this.transitionEndListener = null;
        }
        // Clear previous timeout if any
        if (this.transitionTimeout) {
            clearTimeout(this.transitionTimeout);
            this.transitionTimeout = null;
        }
    }

    ngOnDestroy() {
        this.cleanupTransitionListeners();
        if (this.routerEventsSubscription) {
            this.routerEventsSubscription.unsubscribe();
        }
    }
}
