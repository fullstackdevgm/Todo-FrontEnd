import { Component }  from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { TCAccountService } from '../../services/tc-account.service'
import { TCErrorService, TCError } from '../../services/tc-error.service'


/*
 * This component is shown when a user hits the /password-reset/:resetid route.
 * A resetid is generated and a link is sent to a user by calling TCAccountService.requestPasswordReset
 * from the login component.
 */
@Component({
    selector: 'reset-password',
    templateUrl: 'reset-password.component.html',
    styleUrls: ['reset-password.component.css']
})
export class ResetPasswordComponent {
    model:any = {}
    loading = false
    confirmError = ''
    error:boolean = false 
    resetPasswordErrorMessage : string = null
    resetPasswordResultMessage : string = null

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private account : TCAccountService,
        private errService : TCErrorService
        ) {
            this.errService.errors.subscribe((errorMessage) => {
                this.showError(errorMessage)
            })        
        }

    resetPassword() {
        this.error = false
        this.resetPasswordErrorMessage = null
        let password = this.model.password
        let confirmPassword = this.model.confirmPassword
        if (password === confirmPassword) {
            this.confirmError = ''
            this.route.params.subscribe(params => {
                let resetId = params['resetid']
                this.loading = true
                this.account.resetPassword(resetId, password)
                    .subscribe(result => {
                        if (result.success) {
                            this.resetPasswordResultMessage = `Your password is now reset.`
                        }
                        this.error = true
                        this.loading = false
                    }, err => {
                        // this.resetPasswordResultMessage = `Something went wrong. Please try resetting your password again later.`
                        // if (err.message) {
                        //     this.resetPasswordResultMessage += err.message
                        // }
                        this.error = true
                        this.loading = false
                    })
            })
        } else {
            this.confirmError = 'Password mismatch'
        }
    }

    showError(error : TCError) {
        this.error = true
        this.resetPasswordResultMessage = null
        this.resetPasswordErrorMessage = `${error.message}`
    }
}