import {TCObject}   from './tc-object'

export class TCTaskito extends TCObject {
    name : string = ''
    parentId : string = null
    completionDate : Date = null
    sortOrder : number = 0

    get isCompleted() : boolean {
        return this.completionDate != null
    }

    constructor(taskData? : any) {
        super(taskData != null ? taskData.taskitoid : null, taskData != null ? taskData.timestamp : null)

        if (taskData) {
            this.assignIfExists(taskData.name, 'name')
            this.assignIfExists(taskData.parentid, 'parentId')
            this.assignIfExists(taskData.completiondate, 'completionDate', (timestamp : number) => this.timestampToDate(timestamp))
            this.assignIfExists(taskData.sort_order, 'sortOrder')
        }
    }

    requestBody() {
        return {
            name : this.name,
            taskid : this.identifier,
            parentid : this.parentId,
            completion_date : this.completionDate,
            sort_order : this.sortOrder
        }
    }

}
