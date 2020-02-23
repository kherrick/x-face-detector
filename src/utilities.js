export const defineCustomElement = (tagName, element) => {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, element)
  }
}

export const logger = msg => {
  process.env.NODE_ENV !== 'production' && console.log(msg)
}
