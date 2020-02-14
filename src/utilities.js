export const defineCustomElement = (tagName, element) => {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, element)
  }
}
