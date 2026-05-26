// @ts-check

const search = new URLSearchParams(location.search)

if (search.size > 0) {
  for (const link of document.querySelectorAll("a[data-preserve-search]")) {
    if (!(link instanceof HTMLAnchorElement)) continue
    const href = link.getAttribute("href")
    if (!href) continue
    const url = new URL(href, location.href)
    for (const [key, value] of search) {
      if (!url.searchParams.has(key)) url.searchParams.set(key, value)
    }
    link.href = url.href
  }
}
