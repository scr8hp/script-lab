import { Component, Input } from '@angular/core';

@Component({
    selector: 'command',
    template: `
        <div class="command__icon ms-u-slideLeftIn10">
            <i [hidden]="async || !icon" class="ms-Icon" [ngClass]="icon"></i>
            <img class="command__image" *ngIf="image" [src]="image" />
            <svg *ngIf="async === true" class="command__async" version="1.1" id="L9" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 100 100" enable-background="new 0 0 0 0" xml:space="preserve">
                <path fill="#fff" d="M73,50c0-12.7-10.3-23-23-23S27,37.3,27,50 M30.9,50c0-10.5,8.5-19.1,19.1-19.1S69.1,39.5,69.1,50">
                    <animateTransform attributeName="transform" attributeType="XML" type="rotate" dur="1s" from="0 50 50" to="360 50 50" repeatCount="indefinite" />
                </path>
            </svg>
            <span class="ms-font-m ms-u-slideLeftIn10" *ngIf="!(title == null)">{{title}}</span>
        </div>
        <div class="command__dropdown">
            <ng-content></ng-content>
        </div>
    `
})
export class Command {
    private _icon: string;

    @Input()
    get icon() {
        if (this._icon) {
            return `ms-Icon--${this._icon}`;
        }
    }

    set icon(value) {
        this._icon = value;
    }

    @Input() title: string;
    @Input() image: string;
    @Input() async: boolean;
};