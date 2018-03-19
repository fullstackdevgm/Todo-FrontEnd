import { TCObject } from './tc-object'

export class TCAccount extends TCObject {

    public userID: string

    // In the Todo Cloud system, userName also doubles as the user's email address
    public userName: string
    public firstName: string
    public lastName: string

    public emailVerified: boolean
    public emailOptIn: boolean
    public imageGUID: string
    public locale: string
    public bestMatchLocale: string
    public selectedLocale: string
    public creationTimestamp: number
    public adminLevel: number

    constructor(json?: any) {
        if (json) {
            super(json.userid, json.creation_timestamp)
            this.updateWithJSON(json)
        }
        else {
            super()
        }
    }

    updateWithJSON(json: any): void {
        if (!json) return

        this.assignIfExists(json.userid, 'userID')
        this.assignIfExists(json.username, 'userName')
        this.assignIfExists(json.first_name, 'firstName')
        this.assignIfExists(json.last_name, 'lastName')
        this.assignIfExists(json.email_verified, 'emailVerified')
        this.assignIfExists(json.image_guid, 'imageGUID')
        this.assignIfExists(json.locale, 'locale')
        this.assignIfExists(json.best_match_locale, 'bestMatchLocale')
        this.assignIfExists(json.creation_timestamp, 'creationTimestamp')
        this.assignIfExists(json.admin_level, 'adminLevel')

        this.emailOptIn = (typeof json.email_opt_in === "undefined") ? ((typeof json.email_opt_out !== "undefined") ? (!json.email_opt_out) : true) : json.email_opt_in
    }

    displayName(): string {
        let displayName = this.userName
        if (this.firstName && this.firstName.length > 0) {
            displayName = this.firstName
        }

        if (this.lastName && this.lastName.length > 0) {
            if (displayName.length > 0) {
                displayName += ' '
            }
            displayName += this.lastName
        }

        return displayName
    }

    get initials() : string {
        let initials = ''
        if (this.firstName) {
            initials += this.firstName.charAt(0)
        }

        if (this.lastName) {
            initials += this.lastName.charAt(0)
        }

        if (!initials) {
            initials = this.userName.charAt(0)
        }

        return initials.toUpperCase()
    }

    toJSON() {
        return this.requestBody()
    }

    requestBody() {
        return {
            userid : this.userID,
            username : this.userName,
            first_name : this.firstName,
            last_name : this.lastName,
            email_verified : this.emailVerified,
            email_opt_in : this.emailOptIn,
            image_guid : this.imageGUID,
            locale : this.locale,
            best_match_locale : this.bestMatchLocale,
            creation_timestamp : this.creationTimestamp,
            admin_level : this.adminLevel
        }
    }
}

export class TCAccountUpdate extends TCAccount {

    constructor(json? : any) {
        super() // No properties, only set properties that need to be updated.
    }

}
