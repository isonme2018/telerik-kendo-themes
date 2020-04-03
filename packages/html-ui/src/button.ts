import { IKendoComponent, KendoComponent } from './component';
// import { KendoIcon } from './icon';

interface IKendoButton extends IKendoComponent {

}

// function iconElement(name?: string) {
//     if (name !== '') {
//         return `<span class='k-icon k-i-${name}'></span>`;
//     }
//     return null;
// }

class KendoButton extends KendoComponent implements IKendoButton, IKendoComponent {
    private _icon: string = '';
    // private _text: string;
    private iconElement?: HTMLElement | null = null;

    static get observedAttributes() {
        return ['text', 'icon', ...KendoComponent.observedAttributes];
    }

    init(): void {
        this.render();
    }
    destroy(): void {}

    render(): void {

        this.querySelector('.k-button-icon')?.remove();

        this.classList.add('k-button');

        if (this.iconElement !== null) {
            console.log(this.iconElement);
        }
    }

    get icon(): string {
        return this._icon;
    }
    set icon(name: string) {
        this._icon = name;
    }

    attributeChangedCallback(attr, oldVal, newVal) {
        super.attributeChangedCallback(attr, oldVal, newVal);
    }

}

window.customElements.define('k-button', KendoButton);

export {
    KendoButton
};
