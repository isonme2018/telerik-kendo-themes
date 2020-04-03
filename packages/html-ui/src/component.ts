interface IKendoComponent {
    init(): void;
    destroy(): void;
}

class KendoComponent extends HTMLElement implements IKendoComponent {

    static get observedAttributes() {
        return ['disabled'];
    }

    get disabled(): boolean {
        return this.hasAttribute('disabled');
    }

    set disabled(val) {
        if (val) {
            this.setAttribute('disabled', '');
        } else {
            this.removeAttribute('disabled');
        }
    }

    init(): void {
        this.render();
    }

    destroy(): void {}

    connectedCallback() {
        if (this.isConnected) {
            this.init();
        }
    }

    render() {
        throw new Error("Implement render in derived component!");
    }

    disconnectedCallback() {
        this.destroy();
    }

    attributeChangedCallback(attr, oldVal, newVal) {
        if (false) {
            console.log(attr, oldVal, newVal);
        }

        this[attr] = newVal;
        this.render();
    }

}

export {
    IKendoComponent,
    KendoComponent
};
