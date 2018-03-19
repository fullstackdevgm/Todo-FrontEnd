import { Component }  from '@angular/core'
import { Router } from '@angular/router'
import { ViewEncapsulation }  from '@angular/core'

@Component({
    selector: 'static-page',
    templateUrl: './static-page.component.html',
    styleUrls: ['./static-page.component.css'],
    encapsulation: ViewEncapsulation.None
})

export class StaticPageComponent {
    activeState : string = ''

    constructor(private router: Router) {
        this.router.events.subscribe((route: any) => {
                const screenId = route.url
                if (screenId) {
                    if (screenId === '/terms') {
                        this.activeState = 'terms'
                    } else if (screenId === '/privacy') {
                        this.activeState = 'privacy'
                    } else {
                        this.router.navigate(['/']);
                    }
                }
            }
        )
    }
}