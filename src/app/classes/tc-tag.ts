
export class TCTag {
    public readonly tagid : string
    public name : string

    public get identifier() : string {
        return this.tagid
    }

    constructor(tagid? : string, name? : string) {
        this.tagid = tagid ? tagid : null
        this.name  = name  ? name  : null
    }

    requestBody() {
        return this.toJSON()
    }

    toJSON() {
        return {
            tagid : this.tagid,
            name : this.name
        }
    }
}

export class TCTagAssignment {
    public readonly tagid : string
    public readonly taskid: string

    constructor(tagid : string, taskid : string) {
        this.tagid = tagid
        this.taskid = taskid
    }

    requestBody() {
        return this.toJSON()
    }

    toJSON() {
        return {
            tagid : this.tagid,
            taskid: this.taskid
        }
    }
}
