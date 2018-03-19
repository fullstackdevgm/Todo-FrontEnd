import { Component }  from '@angular/core'

@Component({
    selector: 'page-terms',
    templateUrl: 'terms.component.html',
})

export class PageTermsComponent {
    copyrightYear : number

    constructor(){
        this.copyrightYear = new Date().getFullYear()
    }
}