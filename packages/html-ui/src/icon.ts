import { KendoComponent } from './component';

class KendoIcon extends KendoComponent {
    private _icon: string = 'none';
    private _iconClass: string = `k-icon k-i-${this._icon}`;

    static get observedAttributes() {
        return ['icon'];
    }

    get icon(): string {
        return this._icon;
    }
    set icon(icon: string) {
        this._icon = icon;
        this._iconClass = `k-icon k-i-${this._icon}`;
    }

    render() {
        this.className = this._iconClass;
    }
}

window.customElements.define('k-icon', KendoIcon );

export {
    KendoIcon
};
