export abstract class TCObject {
    public readonly identifier: string
    public readonly creationDate: Date

    constructor(identifier?: string, creationDate?: Date) {
        this.assignIfExists(identifier, 'identifier')
        this.assignIfExists(creationDate, 'creationDate', (timestamp : number) => this.timestampToDate(timestamp))
    }

    public idEqual(other : TCObject) : boolean {
        return other && other.identifier == this.identifier
    }

    protected cleanBoolean(value : any) : boolean {
        if (value == undefined || Number(value) == NaN) return false
        return Number(value) != 0
    }

    protected cleanValue(value : any) : any {
        if (!value) return null
        return value
    }

    protected assignIfExists(value : any, fieldName : string, operation = (val : any) => value) {
        if (typeof value == undefined || value == undefined) return

        this[fieldName] = operation(value)
    }

    protected timestampToDate(timestamp : number) : Date {
        return timestamp == 0 ? null : new Date(timestamp * 1000) // Unix epoch seconds to milliseconds
    }

    abstract requestBody() : any
}