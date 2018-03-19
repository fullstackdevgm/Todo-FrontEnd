import { Component, OnInit, ChangeDetectorRef, ViewChild, Output, EventEmitter }  from '@angular/core'

import { environment } from '../../../../environments/environment'
import { TCAccountService } from '../../../services/tc-account.service'
import { TCAccount } from '../../../classes/tc-account'
import { TCSubscriptionService } from '../../../services/tc-subscription.service'
import { TCSubscription, SubscriptionType, SubscriptionPurchaseHistoryItem } from '../../../classes/tc-subscription'
import { PaywallService } from '../../../services/paywall.service'
import { ContextMenuService, ContextMenuComponent } from 'ngx-contextmenu'


interface paymentHistory {
    saving  : boolean,
    sent    : boolean,
    history : SubscriptionPurchaseHistoryItem
}

@Component({
    selector: 'section-premium',
    templateUrl: 'section-premium.component.html',
    styleUrls: ['section-premium.component.css']

})
export class SettingsPremiumComponent implements OnInit {
    private account      : TCAccount
    subscription : TCSubscription

    loading : boolean = true
    showConfirmation : boolean = false
    readonly currentDate : any = new Date()

    readonly PaymentType = SubscriptionType
    @ViewChild('paymentMoreOptionsMenu') private paymentOptionsMenu : ContextMenuComponent

    get paymentSystemMessageSuffix() : string {
        return this.subscription.paymentSystem == 'apple_iap' ? ' via the App Store.' :
               this.subscription.paymentSystem == 'googleplay' ? ' via GooglePlay' :
               '.'
    }

    showPaymentHistory : boolean = false
    loadingPaymentHistory : boolean = false
    payments : paymentHistory[] = []

    accountStatusString : string = ''
    accountDetailsString : string = ''
    showUpgradeButton : boolean = false
    resendVerificationEmailButton : boolean = false
    showTeamSettingsButton : boolean = false
    @Output() showTeamingSelected : EventEmitter<void> = new EventEmitter<void>()

    constructor(
        private readonly accountService : TCAccountService,
        private readonly subscriptionService : TCSubscriptionService,
        private readonly paywallService : PaywallService,
        private readonly contextMenuService : ContextMenuService
    ) {}

    ngOnInit() {
        this.accountService.account.subscribe(account => {
            this.account = account
            this.update()
        })
        this.subscriptionService.subscription.subscribe(subscription => {
            this.subscription = subscription
            this.accountStatusString = ''
            this.accountDetailsString = ''
            this.showUpgradeButton = false
            this.resendVerificationEmailButton = false
            this.showTeamSettingsButton = false

            switch (subscription.paymentSystem) {
                case "apple_iap":
                    this.accountStatusString = this.subscription.isExpired ? "Your account expired on:" : "Your account will automatically renew on:"
                    this.accountDetailsString = this.subscription.isExpired ? "Your account appears to be expired, but that may be in error. Please contact us at support@appigo.com and we will look into the problem." : "Manage your subscription by using the App Store App > Tap on your Apple ID > Account Settings > Manage App Subscriptions."
                    break
                case "stripe":
                    this.accountStatusString = this.subscription.isExpired ? "Your account expired on:" : "Your account will automatically renew on:"
                    this.accountDetailsString = this.subscription.isExpired ? "" : "Manage your subscription by viewing your account settings on www.todo-cloud.com on a desktop computer."
                    this.showUpgradeButton = this.subscription.isExpired ? true : false
                    break
                case "googleplay":
                    this.accountStatusString = this.subscription.isExpired ? "Your account expired on:" : "Your account will automatically renew on:"
                    this.accountDetailsString = this.subscription.isExpired ? "" : "Manage your subscription on your subscriptions page on Google Wallet."
                    this.showUpgradeButton = this.subscription.isExpired ? true : false
                    break
                case "team":
                    this.accountStatusString = this.subscription.isExpired ? "Your account expired on:" : "Your account will automatically renew on:"
                    this.accountDetailsString = this.subscription.isExpired ? "" : "Your account is part of a team. Please visit your team settings for more information"
                    this.showUpgradeButton = this.subscription.isExpired ? true : false
                    this.showTeamSettingsButton = this.subscription.isExpired ? false : true
                    break
                case "vip":
                    this.accountStatusString = this.subscription.isExpired ? "Your complimentary account expired on:" : "Your complimentary account will automatically renew on:"
                    this.accountDetailsString = this.subscription.isExpired ? "You are qualified for a free account through our friends and family program. You can renew your account by requesting a new verification email. Just tap on the button below, labelled \"Resend Verfication Email.\"" : "You are qualified for a free account through our friends and family program. When it's time to renew your account, we'll send you an email to verify your email address. Please click the verify link in the email and you'll get another year of Todo Cloud premium features on us!"
                    this.resendVerificationEmailButton = this.subscription.isExpired ? true : false
                    break
                default:
                    this.accountStatusString = this.subscription.isExpired ? "Your account expired on:" : "Your account will expire on:"
                    this.showUpgradeButton = true
                    break
            }
            
            this.update()
        })
    }

    private update() {
        this.loading = this.account == null || this.subscription == null
    }

    private processingPayment : boolean = false
    private selectPayment(type : SubscriptionType) {
        if (this.processingPayment) return

        this.processingPayment = true
        this.paywallService.selectPayment(type).subscribe({
            complete : () => {
                this.processingPayment = false
                this.subscriptionService.getSubscription()
            }
        })
        // Maybe gets some observables, does some things.
        // Depends on what the API requires.
    }

    onContextMenu(event : any) {
        this.contextMenuService.show.next({
            contextMenu: this.paymentOptionsMenu,
            event: event,
            item: this.subscription
        });
        event.preventDefault()
        event.stopPropagation()
    }

    showPurchaseHistory() {
        this.showPaymentHistory = true
        this.loadingPaymentHistory = true
        this.subscriptionService.getPurchaseHistory().subscribe((history : SubscriptionPurchaseHistoryItem[]) => {
            this.loadingPaymentHistory = false
            this.payments = history.map((historyItem : SubscriptionPurchaseHistoryItem) => {
                    return {
                        saving : false,
                        sent   : false,
                        history : historyItem
                    }
                })

        })
    }

    hidePurchaseHistory() {
        this.showPaymentHistory = false
        this.loadingPaymentHistory = false
    }

    sendPaymentReceipt(payment : paymentHistory) {
        payment.saving = true
        payment.sent = false
        this.subscriptionService.sendPaymentReceipt(payment.history).subscribe(result => {
            payment.saving = false
            payment.sent = true
            setTimeout(() => {
                payment.sent = false
            }, 3000)
        })
    }

    showSubscriptionManagementHelp() {
        if (this.subscription.paymentSystem != 'apple_iap' && this.subscription.paymentSystem != 'googleplay') return
        
        const appleLink = 'https://support.apple.com/en-us/HT202039'
        const googleLink = 'https://support.google.com/payments/answer/6220303?hl=en'
        const link = this.subscription.paymentSystem == 'apple_iap' ? appleLink : googleLink
        
        window.open(link)
    }

    downgradeShowConfirmation() {
        this.showConfirmation = true
    }
    downgradeToFree() {
        this.subscriptionService.downgrade().subscribe(downgraded => {
            if (!downgraded) return
            this.subscriptionService.getSubscription()
            this.showConfirmation = false
        })
    }
}
