import { Component, OnInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'

@Component({
    selector: 'redirect',
    template: `
        <div class="loading-spinner"></div>
    `
})
export class RedirectComponent implements OnInit {
    private queryParams : {[key : string] : string} = {}

    constructor(private readonly route : ActivatedRoute, private readonly router : Router) { }

    // Urls that map this top group of functions need to be forwarded to the new
    // app's routes that can handle them.
    private readonly isLegacyResetPasswordUrl = () : boolean => {
        // https://www.todo-cloud.com/?resetpassword=true&resetid=xyz&uid=abc
        return this.queryParams.resetpassword != null && 
            this.queryParams.resetid != null && 
            this.queryParams.uid != null
    }
    private readonly isLegacyVerifyEmailUrl = () : boolean => {
        // https://www.todo-cloud.com/?verifyEmail=true&verificationid=12345
        return this.queryParams.verifyemail != null &&
            this.queryParams.verificationid != null
    }
    private readonly isLegacyAcceptSharedListUrl = () : boolean => {
        // ?acceptinvitation=true&invitationid=xyz
        // ?acceptinvitation=true&invitationid=xyz&appNotInstalled=true
        return this.queryParams.acceptinvitation != null &&
            this.queryParams.invitationid != null
    }

    // Urls that match the functions below need to be directed to the legacy app.
    private readonly isLegacyGiftCodeUrl = () : boolean => {
        // ?applygiftcode=true&giftcode=xyz
        return this.queryParams.applygiftcode != null &&
            this.queryParams.giftcode != null
    }
    private readonly isLegacyEmailTeamsUrl = () : boolean => {
        // ?appSettings=show&option=teaming
        return this.queryParams.appsettings != null &&
            this.queryParams.option != null
    }
    private readonly isLegacyReferralUrl = () : boolean => {
        // ?appSettings=show&option=referrals
        return this.queryParams.appsettings != null &&
            this.queryParams.option != null
    }
    private readonly isLegacyUnsubscribeFromReferralsUrl = () : boolean => {
        // ?referralunsubscribe=yes&email=urlEscapedEmail
        return this.queryParams.referralunsubscribe != null &&
            this.queryParams.email != null
    }
    private readonly isLegacyPromoCodeUrl = () : boolean => {
        // ?applypromocode=true&promocode=xyz
        return this.queryParams.applypromocode != null && 
            this.queryParams.promocode != null
    }
    private readonly isLegacyTeamInvitationUrl = () : boolean => {
        // ?acceptTeamInvitation=true&invitationid=xyz
        return this.queryParams.acceptteaminvitation != null &&
            this.queryParams.invitationid != null
    }
    private readonly isLegacyEmailOptOutUrl = () : boolean => {
        // ?optOutEmails=true&email=some@email-address.com&optOutKey=3420396890135b0215b8e6bd6e874f80
        return this.queryParams.optoutemails != null &&
            this.queryParams.email != null &&
            this.queryParams.optoutkey != null
    }
    
    // To check if a url is a legacy url, write a URL checker function above 
    // (using arrow function syntax), and then include it in this array. 
    // Then it will automatically be processed by the shouldForwardToLegacy method.
    private readonly shouldForwardToLegacyFunctions : (() => boolean)[] = [
        this.isLegacyGiftCodeUrl,
        this.isLegacyEmailTeamsUrl,
        this.isLegacyReferralUrl,
        this.isLegacyUnsubscribeFromReferralsUrl,
        this.isLegacyPromoCodeUrl,
        this.isLegacyTeamInvitationUrl,
        this.isLegacyEmailOptOutUrl
    ]

    private shouldForwardToLegacy () : boolean {
        return this.shouldForwardToLegacyFunctions.reduce((accum, check) => accum || check(), false)
    }

    ngOnInit() {
        const url = window.location.href
        const noHashUrl = url.split('#')[0]
        const splitOnQuery = noHashUrl.split('?') 
        const queryString = splitOnQuery.length > 1 ? splitOnQuery[1] : ''
        this.queryParams = queryString.split('&').reduce((accum : {[key : string] : string}, current : string) : {[key : string] : string} => {
            const [key, value] = current.split('=')
            if (!value || !key) return accum

            accum[key.toLowerCase()] = value
            return accum
        }, {})

        if (this.shouldForwardToLegacy()) {
            const redirectUrl = `https://legacy.todo-cloud.com/?${queryString}`
            window.location.replace(redirectUrl)
            return
        }

        if (this.isLegacyResetPasswordUrl()) {
            this.router.navigate(['/password-reset', this.queryParams.resetid])
            return
        }

        if (this.isLegacyVerifyEmailUrl()) {
            this.router.navigate(['/verify-email', this.queryParams.verificationid])
            return
        }

        if (this.isLegacyAcceptSharedListUrl()) {
            this.router.navigate(['/accept-invitation', this.queryParams.invitationid])
            return
        }

        this.router.navigateByUrl('/home')
    }
}