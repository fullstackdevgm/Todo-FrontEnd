import {Component, OnInit, ViewChild} from '@angular/core'
import {Router, ActivatedRoute} from '@angular/router'
import {NgbModal, NgbModalRef} from '@ng-bootstrap/ng-bootstrap'

import { environment } from '../../../environments/environment'
import {TCAuthenticationService} from '../../services/tc-authentication.service'
import {TCAccountService} from '../../services/tc-account.service'
import {Utils} from '../../tc-utils'

// declare var electron : any

@Component({
    selector: 'login-form',
    templateUrl: 'login.component.html',
    styleUrls: ['login.component.css']

})

export class LoginComponent implements OnInit {
    model: any = {}
    loading = false
    error = ''
    resetPasswordError:boolean = false
    resetPasswordModal : NgbModalRef = null
    resetPasswordResultMessage : string = null
    
    private invitationId : string

    @ViewChild('focusLogin') viewChildLogin

    constructor(
        private router: Router,
        private route : ActivatedRoute,
        private authService: TCAuthenticationService,
        private accountService: TCAccountService,
        private modalService: NgbModal,
    ) {
    }

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
            this.viewChildLogin.nativeElement.focus()
        }, 0)
    }
    login() {
        this.loading = true
        this.authService.login(this.model.username, this.model.password).first()
            .subscribe(result => {
                if (!result === true) {
                    // TO-DO: Determine how to provide localized strings
                    this.error = result.error || Utils.parseErrorMessage(result.error)
                    this.loading = false
                    return
                }

                const navigationPath = this.invitationId ? `accept-invitation/${this.invitationId}` : `/`
                this.router.navigate([navigationPath])
            },
            err => {
                this.error = Utils.parseErrorMessage(err)
                this.loading = false
            })
    }
    openForgotPasswordModal(resetPasswordModalContent:any) {
        this.resetPasswordModal = this.modalService.open(resetPasswordModalContent)
    }
    requestResetPasswordForUser(){
        this.loading = true
        this.accountService.requestPasswordReset(this.model.resetEmail)
            .subscribe(result => {
                if (result.success) {
                    this.resetPasswordResultMessage = `Follow the instructions we've sent to "${this.model.resetEmail}" to reset your password.`
                } else {
                    this.resetPasswordError = true
                    this.resetPasswordResultMessage = `Something went wrong. Please try resetting your password again later.`
                }
                this.loading = false
            }, err => {
                this.resetPasswordResultMessage = `Something went wrong. Please try resetting your password again later.`
                if (err.message) {
                    this.resetPasswordResultMessage += err.message
                }
                this.resetPasswordError = true
                this.loading = false
            })
    }
    modalClose(){
        this.resetPasswordModal.close()
        this.resetPasswordError = false
        this.loading = false
        this.resetPasswordResultMessage = ''
        this.model.resetEmail = ''
    }
    cancel() {
        this.router.navigate(['/']);
    }
}
