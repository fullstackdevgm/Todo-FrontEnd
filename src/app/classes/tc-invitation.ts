import { TCObject } from './tc-object'
import { ListMembershipType } from '../tc-utils'

export class TCInvitation extends TCObject {
    public userId : string
    public listId : string
    public email  : string
    public invitedUserId : string
    public membershipType : ListMembershipType 

    constructor(json? : any) {
        super(json.invitationid, json.timestamp)

        if (!json) return

        this.assignIfExists(json.userid, 'userId')
        this.assignIfExists(json.listid, 'listId')
        this.assignIfExists(json.membership_type, 'membershipType')
        this.assignIfExists(json.email, 'email')
        this.assignIfExists(json.invited_userid, 'invitedUserId')
    }

    toJSON() {
        return this.requestBody()
    }

    requestBody() {
        return {
            invitationid : this.identifier,
            timestamp : this.creationDate,
            userid : this.userId,
            listid : this.listId,
            membership_type : this.membershipType,
            email : this.email,
            invited_userid : this.invitedUserId
        }
    }
}
