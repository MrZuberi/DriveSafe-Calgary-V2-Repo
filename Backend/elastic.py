import json
import threading

import requests

from settings import ES_URL, ES_INDEX


# flips to True once the index exists, read it as elastic.es_ready from other modules
es_ready = False


# plain rest call to elasticsearch with a 5s timeout
def es_request(method, path, **kwargs):
    return requests.request(method, f"{ES_URL.rstrip('/')}/{path}", timeout=5, **kwargs)


# creates the incidents index with a geo_point mapping, treats "already exists" as success
def es_ensure_index():
    global es_ready
    if es_ready:
        return True
    mapping = {
        "mappings": {
            "properties": {
                "id": {"type": "keyword"},
                "roadway_name": {"type": "text", "fields": {"raw": {"type": "keyword"}}},
                "description": {"type": "text"},
                "details": {"type": "text"},
                "start_dt": {"type": "date"},
                "modified_dt": {"type": "date"},
                "lanes_affected": {"type": "keyword"},
                "severity": {"type": "keyword"},
                "quadrant": {"type": "keyword"},
                "location": {"type": "geo_point"}
            }
        }
    }
    r = es_request("PUT", ES_INDEX, json=mapping)
    if r.status_code in (200, 201) or (r.status_code == 400 and "already_exists" in r.text):
        es_ready = True
    return es_ready


# bulk upserts incidents by id, then deletes any doc not in the current list
def index_incidents_to_es(incidents):
    global es_ready
    if not ES_URL:
        return
    try:
        if not es_ensure_index():
            return
        lines = []
        ids = []
        for inc in incidents:
            if inc.get("id") is None:
                continue
            doc = dict(inc)
            doc["location"] = {"lat": inc["coordinates"]["lat"], "lon": inc["coordinates"]["lon"]}
            lines.append(json.dumps({"index": {"_id": str(inc["id"])}}))
            lines.append(json.dumps(doc))
            ids.append(str(inc["id"]))
        if not lines:
            return
        es_request("POST", f"{ES_INDEX}/_bulk?refresh=true", data="\n".join(lines) + "\n",
                   headers={"Content-Type": "application/x-ndjson"})
        es_request("POST", f"{ES_INDEX}/_delete_by_query?refresh=true",
                   json={"query": {"bool": {"must_not": {"ids": {"values": ids}}}}})
    except Exception as e:
        print("elasticsearch indexing failed:", e)


# runs the indexing on a daemon thread so responses aren't held up
def index_incidents_async(incidents):
    if ES_URL:
        threading.Thread(target=index_incidents_to_es, args=(incidents,), daemon=True).start()


# fuzzy multi_match plus prefix match on roadway_name, strips location from hits
def es_search(query, limit):
    body = {
        "size": limit,
        "query": {
            "bool": {
                "should": [
                    {"multi_match": {
                        "query": query,
                        "fields": ["roadway_name^3", "description", "details"],
                        "fuzziness": "AUTO",
                        "prefix_length": 1
                    }},
                    {"match_phrase_prefix": {"roadway_name": {"query": query, "boost": 2}}}
                ],
                "minimum_should_match": 1
            }
        }
    }
    r = es_request("POST", f"{ES_INDEX}/_search", json=body)
    r.raise_for_status()
    items = []
    for hit in r.json()["hits"]["hits"]:
        doc = hit["_source"]
        doc.pop("location", None)
        items.append(doc)
    return items
