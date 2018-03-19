import { Injectable, Inject, forwardRef } from '@angular/core'
import { Observable, Subject } from 'rxjs'
import { TCAccountService } from './tc-account.service'
import { TCSubscriptionService } from './tc-subscription.service'
import { TCSubscription, SubscriptionPurchase, SubscriptionType } from '../classes/tc-subscription'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { SettingsComponent, SettingsSection } from '../components/settings/settings.component'
import { Utils, Platform } from '../tc-utils'
import { TCAccount } from '../classes/tc-account'
import { environment } from '../../environments/environment'

@Injectable()
export class PaywallService {

    private readonly _paywallEvent : Subject<string> 
    public get showPaywallEvent()  : Observable<string> {
        return this._paywallEvent
    }

    private account : TCAccount
    private subscription : TCSubscription

    constructor(
        private readonly subscriptionService : TCSubscriptionService,
        @Inject(forwardRef(() => TCAccountService)) private readonly accountService : TCAccountService,
        private readonly modal : NgbModal
    ) {
        this._paywallEvent = new Subject<string>()
        this.subscriptionService.subscription.subscribe(sub => {
            this.subscription = sub
        })

        this.accountService.account.subscribe(account => {
            this.account = account
        })
    }

    private createPaywallEventWithMessage(message : string) {
        this._paywallEvent.next(message)
        this.openSettingsToPaywall()
    }

    private openSettingsToPaywall() {
        const modalRef = this.modal.open(SettingsComponent)
        const settingsComponent : SettingsComponent = modalRef.componentInstance as SettingsComponent

        settingsComponent.activeSection = SettingsSection.Premium
    }

    paywallCheck(paywallMessage : string, onActiveSubscription : () => void, onNoActiveSubscription : () => void = () => {}) {
        if(!this.subscription) this.createPaywallEventWithMessage(`We're sorry, we are unable to retrieve your subscription information.`)

        if (this.subscription.isActive) { 
            onActiveSubscription() 
        }
        else {
            onNoActiveSubscription()
            this.createPaywallEventWithMessage(paywallMessage)
        }
    }

    selectPayment(paymentType : SubscriptionType) : Observable<void> {
        const completionSubject = new Subject<any>()
        // Differentiate based off from platform here.
        const platform = Utils.currentPlatform
        const platformSpecificFunctions : (() => void)[] = []

        platformSpecificFunctions[Platform.Web] = () => {
            const basePrice = paymentType == SubscriptionType.Monthly ? this.subscription.pricing.monthly : this.subscription.pricing.yearly
            const inCents = (basePrice * 100).toFixed() // Use to fixed to get rid of floating point errors in the math.

            var handler = (<any>window).StripeCheckout.configure({
                key: environment.stripePublicKey,
                locale: 'auto',
                token: (token: any) => {
                    // You can access the token ID with `token.id`.
                    // Get the token ID to your server-side code for use.
                    
                    const purchase = new SubscriptionPurchase()
                    purchase.subscriptionType = paymentType
                    purchase.subscriptionId = this.subscription.identifier
                    purchase.totalCharge = basePrice
                    purchase.priceInCents = Number(inCents)
                    purchase.subtotalInCents = Number(inCents)
                    purchase.unitPriceInCents = Number(inCents)
                    purchase.chargeDescription = 'To-Do Cloud subscription'
                    purchase.discountPercentage = 0
                    purchase.stripeToken = token.id

                    // Do the things and inform the caller when all the stuff is done.
                    this.subscriptionService.purchaseSubscription(purchase).first().subscribe(result => {
                        completionSubject.next()
                        completionSubject.complete()
                    })
                },
                closed: () => {
                    completionSubject.next()
                    completionSubject.complete()
                },
                email: this.account.userName,
                currency: "usd",
                zipCode: true
            });

            handler.open({
                name: 'Todo Cloud',
                description: `${ paymentType == SubscriptionType.Monthly ? 'Monthly' : 'Yearly' } Subscription`,
                image: './assets/img/favicon-152.png',
                amount: Number(inCents)
            });
        }
        
        platformSpecificFunctions[Platform.Apple] = () => { /* call APIs and such. */ }
        platformSpecificFunctions[Platform.Windows] = () => { /* call APIs and such. */ }
        
        platformSpecificFunctions[Platform.Other] = () => { /* call APIs and such. */ }

        const platformFunction = platformSpecificFunctions[platform]
        if (platformFunction) platformFunction()
        else platformSpecificFunctions[Platform.Other]()

        return completionSubject
    }
}
