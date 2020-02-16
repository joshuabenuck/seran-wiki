function siteIndex() {
    return {
        "index":
            { "_tree": {}, "_prefix": "" },
        "documentCount": 0,
        "nextId": 0,
        "documentIds": {},
        "fieldIds":
            { "title": 0, "content": 1 },
        "fieldLength": {},
        "averageFieldLength": {},
        "storedFields": {}
    }
}

window["metaPages"]["/system/site-index.json"] = siteIndex
