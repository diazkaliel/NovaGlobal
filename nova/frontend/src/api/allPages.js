export async function loadAllPages(fetchPage, params, limit) {
  const byId = new Map()
  for (let skip = 0; ; skip += limit) {
    const { data } = await fetchPage({ ...params, skip, limit })
    for (const item of data) byId.set(item.id, item)
    if (data.length < limit) return [...byId.values()]
  }
}
