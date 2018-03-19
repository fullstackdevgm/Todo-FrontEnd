import { Component }  from '@angular/core'

@Component({
    selector: 'page-privacy',
    templateUrl: 'privacy.component.html',
})

export class PagePrivacyComponent {
    copyrightYear : number

    constructor(){
        this.copyrightYear = new Date().getFullYear()
    }
}