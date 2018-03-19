import { TCObject } from './tc-object'

export enum SubscriptionType {
    None = 0,
    Monthly = 1,
    Yearly = 2
}

export class TCSubscription extends TCObject {
    public expirationDate : Date
    public level : number
    public type : SubscriptionType
    public readonly teamId : string
    public readonly userId : string

    public readonly billing : SubscriptionBilling
    public readonly pricing : SubscriptionPricing
    public readonly isTeamBillingAdmin : boolean
    public readonly paymentSystem : "stripe" | "apple_iap" | "googleplay" | "team" | "vip" | "unknown"

    public get isActive() : boolean {
        if (!this.expirationDate) return false
        const now = new Date()
        return this.expirationDate > now
    }

    public get isExpired() : boolean {
        if (!this.expirationDate) return false
        const now = new Date()
        return this.expirationDate <= now
    }

    constructor(json : any) {
        super(json.subscription.subscriptionid, json.timestamp)

        this.assignIfExists(json.subscription.expiration_date, 'expirationDate', timestamp => this.timestampToDate(timestamp))
        this.assignIfExists(json.subscription.userid, 'userId')
        this.assignIfExists(json.subscription.teamid, 'teamId')
        this.assignIfExists(json.subscription.level, 'level')
        this.assignIfExists(json.subscription.type, 'type')
        this.assignIfExists(json.teaming.is_team_billing_admin, 'isTeamBillingAdmin')
        this.assignIfExists(json.payment_system, 'paymentSystem')

        this.billing = new SubscriptionBilling(json.billing)
        this.pricing = new SubscriptionPricing(json.pricing)
    }

    requestBody() {
        return JSON.parse(JSON.stringify(this))
    }
}

export class SubscriptionPurchaseHistoryItem {
    public readonly service :  "stripe" | "apple_iap" | "googleplay"
    public readonly date : Date
    public readonly subscriptionType : SubscriptionType
    public readonly description : string

    public get typeDescription() : string {
        return this.subscriptionType == SubscriptionType.Monthly ? 'Month' : 'Year'
    }

    constructor(obj : any) {
        this.service = obj.service
        this.date = new Date(obj.timestamp * 1000)
        this.subscriptionType = obj.subscription_type == 'month' ? SubscriptionType.Monthly : SubscriptionType.Yearly
        this.description = obj.description
    }
}

export class SubscriptionPurchase extends TCObject {
    
    public subscriptionType : SubscriptionType
    public subscriptionId : string
    public totalCharge : number
    public priceInCents : number
    public stripeToken? : string
    public last4? : string
    public teamid? : string
    public chargeDescription : string
    public unitPriceInCents : number
    public get unitCombinedPriceInCents() : number {
        return this.unitPriceInCents * this.numOfSubscriptions // number of subs
    }
    public subtotalInCents : number
    public discountPercentage : number
    public get discountInCents() : number {
        return Number((this.unitCombinedPriceInCents * (this.discountPercentage / 100)).toFixed())
    }
    public teamCredits? : [any] // TO-DO: define the team credits type when we do teaming
    public get teamCreditsPriceDiscountInCents() : number {
        return 0 // TO-DO: add functionality later when we do the teaming
    }
    public numOfSubscriptions : number = 1 // Default to buying just one

    toJSON() {
        return this.requestBody()
    }

    requestBody() {
        return {
            subscription_type : this.subscriptionType == SubscriptionType.Monthly ? 'month' : 'year',
            subscription_id : this.subscriptionId,
            total_charge : this.totalCharge,
            authoritative_price_in_cents : this.priceInCents,
            stripe_token : this.stripeToken,
            last4 : this.last4,
            teamid : this.teamid,
            charge_description : this.chargeDescription,
            unit_price_in_cents : this.unitPriceInCents,
            unit_combined_price_in_cents : this.unitCombinedPriceInCents,
            subtotal_in_cents : this.subtotalInCents,
            discount_percentage : this.discountPercentage,
            discount_in_cents : this.discountInCents,
            team_credits : this.teamCredits,
            num_of_subscriptions : this.numOfSubscriptions
        }
    }
}

export class SubscriptionBilling extends TCObject {

    public readonly canSwitchToMonthly : boolean
    public readonly iapRenewalType : string
    public readonly newMonthExpirationDate : Date
    public readonly newYearExpirationDate : Date

    constructor(json? : any) {
        super()

        if (!json) return

        this.assignIfExists(json.can_switch_to_monthly, 'canSwitchToMonthly')
        this.assignIfExists(json.iap_autorenewing_account_type, 'iapRenewalType')
        this.assignIfExists(json.new_month_expiration_date, 'newMonthExpirationDate', (timestamp) => this.timestampToDate(timestamp))
        this.assignIfExists(json.new_year_expiration_date, 'newYearExpirationDate', (timestamp) => this.timestampToDate(timestamp))
    }

    toJSON() {
        return this.requestBody()
    }

    requestBody() {
        return {
            can_switch_to_monthly : this.canSwitchToMonthly,
            iap_autorenewing_account_type : this.iapRenewalType,
            new_month_expiration_date : this.newMonthExpirationDate.getTime() / 1000,
            new_year_expiration_date :  this.newYearExpirationDate.getTime() / 1000
        }
    }
}

export class SubscriptionPricing extends TCObject {
    public readonly monthly : number
    public readonly yearly : number

    constructor(json? : any) {
        super()

        if (!json) return

        this.assignIfExists(json.month, 'monthly')
        this.assignIfExists(json.year, 'yearly')
    }

    toJSON() {
        return this.requestBody()
    }

    requestBody() {
        return {
            monthly : this.monthly,
            yearly : this.yearly
        }
    }
}
