import {Component, OnInit, ViewChild} from '@angular/core'
import {Router, ActivatedRoute} from '@angular/router'

import { environment } from '../../../environments/environment'
import { TCAuthenticationService } from '../../services/tc-authentication.service'
import { TCUserSettingsService }   from '../../services/tc-user-settings.service'
import {Utils} from '../../tc-utils'

@Component({
    selector: 'register-form',
    templateUrl: 'register.component.html',
    styles: [`
        a {
            color : #0275d8 !important;
            text-decoration : none !important;
            cursor : pointer;
        }
    `]
})

export class RegisterComponent implements OnInit {
    model: any = {}
    loading = false
    error = ''

    Utils = Utils

    private invitationId : string

    @ViewChild('focusRegister') viewChildRegister
    
    constructor(
        private router: Router,
        private route : ActivatedRoute,
        private authService: TCAuthenticationService,
        private userSettingsService : TCUserSettingsService
    ) {}

    ngOnInit() {
        this.route.params.first().subscribe(params => {
            this.invitationId = params.invitation
        })
        // Reset the login status. If this page is accessed with
        // a logged-in account, it won't be for long ...

        this.inputFocus()
    }
    inputFocus() {
        setTimeout(()=>{
            this.viewChildRegister.nativeElement.focus()
        }, 0)
    }

    register() {
        this.loading = true
        this.authService.createUser(this.model.username, this.model.password, this.model.firstname, this.model.lastname, true)
            .first()
            .subscribe(result => {
                if (!result) {
                    // TO-DO: Determine how to provide localized strings
                    this.error = result.error || Utils.parseErrorMessage(result.error)
                    this.loading = false
                    return
                } 

                const navigationPath = this.invitationId ? `accept-invitation/${this.invitationId}` : `/`
                this.router.navigate([navigationPath])
                this.userSettingsService.updateTimeZone()
            },
            err => {
                this.error = Utils.parseErrorMessage(err)
                this.loading = false
            })
    }

    cancel() {		
        this.router.navigate(['/'])		
    }

}
