import { TCObject } from './tc-object'

export class TCComment extends TCObject{
    userId : string
    itemId : string
    itemType : number
    itemName : string
    text     : string

    constructor(commentData? : any) {
        if (!commentData) {
            super()
            return
        }

        super(commentData.commentid, commentData.timestamp)
        this.assignIfExists(commentData.userid, 'userId')
        this.assignIfExists(commentData.itemid, 'itemId')
        this.assignIfExists(commentData.item_type, 'itemType')
        this.assignIfExists(commentData.item_name, 'itemName')
        this.assignIfExists(commentData.text, 'text')
    }

    requestBody() {
        return {
            commentid : this.identifier,
            userid : this.userId,
            itemid : this.itemId,
            item_type : this.itemType,
            item_name : this.itemName,
            text : this.text
        }
    }
}

