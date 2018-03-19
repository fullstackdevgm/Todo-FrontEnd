import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core'
import { TagDeleteConfirmationComponent } from './tag-delete-confirmation.component'
import { TCTag, TCTagAssignment } from '../../classes/tc-tag'
import { TCTagService } from '../../services/tc-tag.service'
import { TCTaskService } from '../../services/tc-task.service'
import { TCTask } from '../../classes/tc-task'

import { NgbModal, NgbModalRef }  from '@ng-bootstrap/ng-bootstrap'

enum TagStatus {
    Deselected,
    Pending,
    Selected
}

@Component({
    selector : 'tag-editor',
    templateUrl : 'tag-editor.component.html',
    styleUrls: ['tag-editor.component.css']
})
export class TagEditorComponent {
    selectedTags : TCTag[] = []
    allTags : { tag : TCTag, count : number, isShowEdit : boolean, tagStatus : TagStatus}[] =[]
    shouldSortAlphabetically : boolean = true
    inputText : string = ''

    private _task : TCTask

    @Input() set task(task : TCTask) {
        if (task) { this._task = task }
        else { return }

        let allTagSub = this.tagService.tagsForUser().first().subscribe(tags => {
            this.allTags = tags.map(t => { return { tag : t.tag, count : t.count, isShowEdit : false, tagStatus: this.isTagSelected(t.tag) ? TagStatus.Selected : TagStatus.Deselected } })
            this.sortAlphabetically()

            this.tagService.tagsForTask(task).first().subscribe(tags => {
                this.selectedTags = tags
            })
        })
    }
    @Output() createdTag : EventEmitter<TCTag> = new EventEmitter<TCTag>()
    @Output() selectedTag : EventEmitter<TCTag> = new EventEmitter<TCTag>()
    @Output() deselectedTag : EventEmitter<TCTag> = new EventEmitter<TCTag>()
    @Output() deletedTag : EventEmitter<TCTag> = new EventEmitter<TCTag>()

    constructor(
        private readonly tagService   : TCTagService,
        private readonly taskService  : TCTaskService ,
        private readonly modalService : NgbModal
    ) {}

    isTagSelected(tag : TCTag) : boolean {
        return this.selectedTags.filter(e => tag.tagid == e.tagid).length > 0
    }

    deselectTag(tag : TCTag) {
        if (!this.isTagSelected(tag)) return

        const allTag = this.allTags.find(t => t.tag.identifier == tag.identifier)
        allTag.tagStatus = TagStatus.Pending
        this.tagService.removeTagAssignment(new TCTagAssignment(tag.tagid, this._task.identifier)).first().subscribe(result => {
            this.selectedTags = this.selectedTags.filter(e => tag.tagid != e.tagid )
            allTag.count -= 1
            this.taskService.getTaskCounts()
            this.deselectedTag.emit(tag)
            allTag.tagStatus = TagStatus.Selected
        })
    }

    selectTag(tag : TCTag) {
        if (this.isTagSelected(tag)) return

        const allTag = this.allTags.find(t => t.tag.identifier == tag.identifier)
        allTag.tagStatus = TagStatus.Pending
        this.selectedTags.push(tag)
        allTag.count += 1

        const sub = this.tagService.addTagAssignment(new TCTagAssignment(tag.tagid, this._task.identifier)).first().subscribe(result => {
            this.taskService.getTaskCounts()
            this.selectedTag.emit(tag)
            allTag.tagStatus = TagStatus.Selected
        })    
    }

    createTag() {
        const tag = new TCTag(undefined, this.inputText)
        
        this.tagService.create(tag).first().subscribe(result => {
            const existingTag = this.allTags
                .map(e => e.tag)
                .find(tag => tag.name == result.name)

            if (existingTag) return

            this.allTags.push( { tag : result, count : 0, isShowEdit : false, tagStatus: TagStatus.Selected })
            this.sortTypeSelected(this.shouldSortAlphabetically)
            this.selectTag(result)
            this.taskService.getTaskCounts()
            this.createdTag.emit(tag)
        })   
    }

    tagCheckmarkClicked(tag : TCTag) {
        const allTag = this.allTags.find(t => t.tag.identifier == tag.identifier)
        if (allTag.tagStatus == TagStatus.Pending) {
            return
        }
        this.isTagSelected(tag) ? this.deselectTag(tag) : this.selectTag(tag)
    }

    inputTag() {
        if (!this.inputText || this.inputText.length == 0) {
            return
        }

        const existingTag = this.allTags.map(e => e.tag).find(tag => tag.name == this.inputText)
        existingTag ? this.selectTag(existingTag) : this.createTag()
        this.inputText = ''
    }

    sortTypeSelected(event : boolean) {
        event ? this.sortAlphabetically() : this.sortByCount()
        this.shouldSortAlphabetically = event
    }

    sortByCount() {
        this.allTags.sort((a, b) => b.count - a.count )
    }

    sortAlphabetically() {
        this.allTags.sort((a, b) => a.tag.name.toUpperCase().localeCompare(b.tag.name.toUpperCase()) )
    }

    showDeleteConfirmation(tag : TCTag) {
        const modalRef = this.modalService.open(TagDeleteConfirmationComponent)
        const deleteComponent : TagDeleteConfirmationComponent = modalRef.componentInstance

        deleteComponent.tag = tag
        deleteComponent.deleteSucceeded.subscribe(tag => {
            this.allTags = this.allTags.filter(t => t.tag.identifier != tag.identifier)
            this.deletedTag.emit(tag)
        })

        return false
    }

    editTag(info) {
        info.tag.name = info.tag.name.trim()
        info.isShowEdit = false
        if (!info.tag.name) {
            this.tagService.tagsForUser().first().subscribe(tags => {
                this.allTags = tags.map(t => { return { tag : t.tag, count : t.count, isShowEdit : false, tagStatus : TagStatus.Selected } })
                this.sortTypeSelected(this.shouldSortAlphabetically) //sort by selected

                info.tag = tags.map(e => e.tag).find(t => t.identifier == info.tag.identifier)
                this.deselectedTag.emit(info.tag)
                this.selectedTag.emit(info.tag)

                this.tagService.tagsForTask(this._task).first().subscribe(tags => {
                    this.selectedTags = tags
                })
            })
            return
        }
        const existingTag = this.allTags.map(e => e.tag).find(t => (t.name == info.tag.name) && (t.identifier != info.tag.identifier))
        if(existingTag) {
            this.tagService.delete(info.tag).first().subscribe(result => {
                this.allTags = this.allTags.filter(t => t.tag.identifier != info.tag.identifier)
                this.deletedTag.emit(info.tag)
            })
            return
        }
        this.tagService.update(info.tag).first().subscribe(result => {
            this.deselectedTag.emit(info.tag)
            this.selectedTag.emit(info.tag)
            this.selectedTags.push(info.tag)
            this.sortTypeSelected(this.shouldSortAlphabetically)
        })
    }
}