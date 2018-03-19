import { Component, OnInit, ViewEncapsulation }  from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { TCAccountService } from '../../services/tc-account.service'
import { TCInvitation } from '../../classes/tc-invitation'
import { TCInvitationService } from '../../services/tc-invitation.service'
import { InvitationInfo } from '../../tc-types'



@Component({
    selector: 'accept-invitation',
    templateUrl: 'accept-invitation.component.html',
    styleUrls: ['../landing/landing.component.css', 'accept-invitation.component.css'],
    encapsulation: ViewEncapsulation.None
})
export class AcceptInvitationComponent implements OnInit {

    signedIn : boolean = false
    invitationId : string = ''
    invitationInfo : InvitationInfo  = null
    message : string = 'Need to replace invitation message'
    invalidInvitation : boolean = false

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private accountService: TCAccountService,
        private invitationService: TCInvitationService
    ) {}

    ngOnInit() {
        this.route.params.subscribe(params => {
            this.invitationId = params['invitationid']
        })

        this.accountService.account.subscribe(() => {
            this.signedIn = true
        })

        this.invitationService.getInvitationInfoForID(this.invitationId).subscribe((info : InvitationInfo) => {
            this.invitationInfo = info
        }, (e : any) => {
            console.log(e)
            this.invitationInfo = null
            this.invalidInvitation = true
        })

    }
    navigateTo(to : string) {
        if (to === 'register') {
            this.router.navigate(['/register', { invitation: this.invitationId }])
        }
        if (to === 'signin') {
            this.router.navigate(['/signin', { invitation: this.invitationId }])
        }
        if (to === 'home') {
            this.router.navigate(['/'])
        }
    }
    acceptInvitation() {
        const invitation = new TCInvitation({invitationid : this.invitationId})
        this.invitationService.acceptInvitation(invitation).subscribe(() => {
            this.router.navigate(['/'])
        })
    }
}