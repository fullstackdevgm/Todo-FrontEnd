import {Component, ViewChild}  from '@angular/core'
import {ActivatedRoute, Router} from '@angular/router'
import {ViewEncapsulation}  from '@angular/core'
import {Utils} from '../../tc-utils'

@Component({
    selector: 'landing',
    templateUrl: './landing.component.html',
    styleUrls: ['./landing.component.css'],
    encapsulation: ViewEncapsulation.None
})

export class LandingComponent {
    active_state:string

    Utils = Utils

    @ViewChild('loginEl') viewChildLogin
    @ViewChild('registerEl') viewChildRegister
    constructor(
        private router: Router,
        private route: ActivatedRoute
    ) {
        this.active_state = 'register-active'
    }
    ngOnInit() {
        this.route.params.subscribe(params => {
            const screenId = params['screenid']
            if (screenId) {
                if (screenId === 'signin') {
                    this.login()
                }
                if (screenId === 'register') {
                    this.register()
                }
            }
        })
    }

    login() {
        this.viewChildLogin.inputFocus()
        this.active_state = 'login-active'
    }

    register() {
        this.viewChildRegister.inputFocus()
        this.active_state = 'register-active'
    }
    intro() {
        this.active_state = 'intro-active'
    }
}