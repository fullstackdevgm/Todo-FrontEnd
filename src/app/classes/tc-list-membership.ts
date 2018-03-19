import { TCObject } from './tc-object'
import { ListMembershipType } from '../tc-utils'

export class TCListMembership extends TCObject {
    public readonly userId : string
    public readonly listId : string
    public readonly membershipType : ListMembershipType

    constructor(json? : any) {
        super()

        if (!json) return

        this.assignIfExists(json.userid, 'userId')
        this.assignIfExists(json.listid, 'listId')
        this.assignIfExists(json.membership_type, 'membershipType')
    }

    toJSON() {
        return this.requestBody()
    }

    requestBody() {
        return {
            userid : this.userId,
            listid : this.listId,
            membership_type : this.membershipType
        }
    }

}