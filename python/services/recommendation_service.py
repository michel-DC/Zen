from __future__ import annotations

import asyncio
import json
import re
from datetime import date, timedelta
from math import exp, sqrt
from pathlib import Path
from typing import Any

from clients.tmdb import tmdb_client
from clients.recommendation_ai import RecommendationAIError, recommendation_ai
from core.exceptions import PaletteExtractionError
from models.catalog import CatalogMovieRecord

_CACHE_PATH = Path("/app/cache/recommendation_cache.json")
_DETAIL_CACHE: dict[int, dict[str, Any]] = {}
_KEYWORDS_CACHE: dict[int, list[str]] = {}
_KEYWORD_ENTRIES_CACHE: dict[int, list[dict[str, Any]]] = {}
_EMBEDDING_CACHE: dict[str, list[float]] = {}
_REVIEWS_CACHE: dict[int, list[str]] = {}
_SEMANTIC_PROFILE_CACHE: dict[int, dict[str, Any]] = {}
_RERANK_CACHE: dict[str, dict[int, float]] = {}

_EXPLICIT_KEYWORD_FRAGMENTS = (
    "adult film",
    "bdsm",
    "brothel",
    "erotic",
    "fetish",
    "full frontal",
    "incest",
    "nude",
    "nudity",
    "orgy",
    "porn",
    "prostitut",
    "rape",
    "sex",
    "strip club",
    "stripper",
    "voyeur",
)
_ADULT_CERTIFICATIONS = {
    "18",
    "18+",
    "III",
    "M18",
    "NC-17",
    "R18",
    "R18+",
    "R-18",
    "R21",
    "R-21",
    "X",
    "X18+",
    "XXX",
    "청소년관람불가",
}

_SEMANTIC_PROFILE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        key: {"type": "array", "items": {"type": "string"}}
        for key in (
            "themes",
            "emotions",
            "communication",
            "pacing",
            "visual_language",
            "cultural_context",
            "tmdb_keyword_queries",
        )
    },
    "required": [
        "themes",
        "emotions",
        "communication",
        "pacing",
        "visual_language",
        "cultural_context",
        "tmdb_keyword_queries",
    ],
}

_RANKING_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "ranking": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "score": {"type": "number", "minimum": 0, "maximum": 100},
                },
                "required": ["id", "score"],
            },
        }
    },
    "required": ["ranking"],
}


def _load_cache() -> None:
    if not _CACHE_PATH.exists():
        return
    try:
        payload = json.loads(_CACHE_PATH.read_text(encoding="utf-8"))
        _DETAIL_CACHE.update({int(key): value for key, value in payload.get("details", {}).items()})
        _KEYWORDS_CACHE.update({int(key): value for key, value in payload.get("keywords", {}).items()})
        _KEYWORD_ENTRIES_CACHE.update({int(key): value for key, value in payload.get("keyword_entries", {}).items()})
        _EMBEDDING_CACHE.update(payload.get("embeddings", {}))
        _REVIEWS_CACHE.update({int(key): value for key, value in payload.get("reviews", {}).items()})
        _SEMANTIC_PROFILE_CACHE.update({int(key): value for key, value in payload.get("semantic_profiles", {}).items()})
        _RERANK_CACHE.update(payload.get("reranks", {}))
    except (OSError, ValueError, TypeError):
        return


def _save_cache() -> None:
    try:
        _CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
        temporary_path = _CACHE_PATH.with_suffix(".tmp")
        temporary_path.write_text(json.dumps({"details": _DETAIL_CACHE, "keywords": _KEYWORDS_CACHE, "keyword_entries": _KEYWORD_ENTRIES_CACHE, "embeddings": _EMBEDDING_CACHE, "reviews": _REVIEWS_CACHE, "semantic_profiles": _SEMANTIC_PROFILE_CACHE, "reranks": _RERANK_CACHE}, ensure_ascii=False), encoding="utf-8")
        temporary_path.replace(_CACHE_PATH)
    except OSError:
        return


_load_cache()


def _profile(movie: dict[str, Any], keywords: list[str], director: str | None = None) -> str:
    countries = ", ".join(country.get("name", "") for country in movie.get("production_countries", []) if country.get("name"))
    genres = ", ".join(genre.get("name", "") for genre in movie.get("genres", []) if genre.get("name"))
    return "\n".join(part for part in [f"Titre : {movie.get('title', '')}", f"Synopsis : {(movie.get('overview') or '')[:1200]}", f"Genres : {genres}", f"Mots-clés : {', '.join(keywords[:20])}", f"Réalisateur : {director}" if director else "", f"Pays de production : {countries}", f"Langue originale : {movie.get('original_language', '')}"] if part)


def _cosine(left: list[float], right: list[float]) -> float:
    denominator = sqrt(sum(value * value for value in left)) * sqrt(sum(value * value for value in right))
    return sum(a * b for a, b in zip(left, right)) / denominator if denominator else 0.0


def _jaccard(left: set[Any], right: set[Any]) -> float:
    return len(left & right) / len(left | right) if left or right else 0.0


_REGIONS = ({"FR", "BE", "CH", "DE", "AT", "IT", "ES", "PT", "GB", "IE", "NL", "DK", "SE", "NO", "FI"}, {"JP", "KR", "CN", "TW", "HK", "MO", "TH", "VN", "SG", "ID", "MY", "PH"}, {"US", "CA", "MX"}, {"IN", "PK", "BD", "LK", "NP"}, {"BR", "AR", "CL", "CO", "PE", "UY"})


def _region_ids(movie: dict[str, Any]) -> set[int]:
    country_codes = {country.get("iso_3166_1") for country in movie.get("production_countries", [])}
    return {index for index, countries in enumerate(_REGIONS) if country_codes & countries}


def _feature_score(source: dict[str, Any], source_keywords: list[str], source_vector: list[float], candidate: dict[str, Any], candidate_keywords: list[str], candidate_vector: list[float], provenance: set[str]) -> tuple[float, dict[str, float]]:
    source_genres = {genre.get("id") for genre in source.get("genres", []) if genre.get("id")}
    candidate_genres = {genre.get("id") for genre in candidate.get("genres", []) if genre.get("id")}
    release_year = int((source.get("release_date") or "0000")[:4] or 0)
    candidate_year = int((candidate.get("release_date") or "0000")[:4] or 0)
    features = {"semantic": _cosine(source_vector, candidate_vector), "genre_overlap": _jaccard(source_genres, candidate_genres), "keyword_overlap": _jaccard({word.casefold() for word in source_keywords}, {word.casefold() for word in candidate_keywords}), "same_language": float(source.get("original_language") == candidate.get("original_language")), "same_region": float(bool(_region_ids(source) & _region_ids(candidate))), "year_proximity": exp(-abs(release_year - candidate_year) / 24) if release_year and candidate_year else 0.0, "tmdb_recommendation": float("recommendation" in provenance), "tmdb_similar": float("similar" in provenance), "discover": float(bool(provenance & {"language_genre", "country_genre", "keyword", "semantic_keyword", "semantic_keyword_pair"})), "catalog": float("catalog" in provenance)}
    # La provenance locale est informative dans le panneau debug, mais ne doit jamais
    # constituer un signal de pertinence : le produit sert d'abord à découvrir.
    weights = {"semantic": .45, "genre_overlap": .20, "keyword_overlap": .17, "same_language": .06, "same_region": .05, "year_proximity": .04, "tmdb_recommendation": .02, "tmdb_similar": .01, "discover": 0.0, "catalog": 0.0}
    return sum(features[name] * weights[name] for name in weights), features


async def _embeddings(inputs: list[str]) -> list[list[float]]:
    unique_inputs = list(dict.fromkeys(inputs))
    missing = [
        text
        for text in unique_inputs
        if recommendation_ai.embedding_cache_key(text) not in _EMBEDDING_CACHE
    ]
    try:
        for start in range(0, len(missing), 16):
            batch = missing[start : start + 16]
            vectors = await recommendation_ai.embed(batch)
            _EMBEDDING_CACHE.update(
                {
                    recommendation_ai.embedding_cache_key(text): vector
                    for text, vector in zip(batch, vectors)
                }
            )
        if missing:
            _save_cache()
        return [
            _EMBEDDING_CACHE[recommendation_ai.embedding_cache_key(text)]
            for text in inputs
        ]
    except (RecommendationAIError, KeyError) as error:
        raise PaletteExtractionError(
            "Le moteur de recommandation est indisponible"
        ) from error


async def _movie_details(movie_id: int) -> dict[str, Any]:
    if movie_id not in _DETAIL_CACHE or "release_dates" not in _DETAIL_CACHE[movie_id]:
        _DETAIL_CACHE[movie_id] = await tmdb_client.get_movie_details(movie_id)
    return _DETAIL_CACHE[movie_id]


async def _movie_keywords(movie_id: int) -> list[str]:
    if movie_id not in _KEYWORDS_CACHE:
        _KEYWORDS_CACHE[movie_id] = await tmdb_client.get_movie_keywords(movie_id)
    return _KEYWORDS_CACHE[movie_id]


async def _movie_keyword_entries(movie_id: int) -> list[dict[str, Any]]:
    if movie_id not in _KEYWORD_ENTRIES_CACHE:
        _KEYWORD_ENTRIES_CACHE[movie_id] = await tmdb_client.get_movie_keyword_entries(movie_id)
    return _KEYWORD_ENTRIES_CACHE[movie_id]


async def _movie_reviews(movie_id: int) -> list[str]:
    if movie_id not in _REVIEWS_CACHE:
        _REVIEWS_CACHE[movie_id] = await tmdb_client.get_movie_reviews(movie_id)
    return _REVIEWS_CACHE[movie_id]


async def _generate_json(
    prompt: str,
    json_schema: dict[str, Any],
) -> dict[str, Any]:
    try:
        return await recommendation_ai.generate_json(prompt, json_schema)
    except RecommendationAIError:
        return {}


async def _semantic_profile(movie_id: int, detail: dict[str, Any], keywords: list[str], reviews: list[str]) -> dict[str, Any]:
    cached_profile = _SEMANTIC_PROFILE_CACHE.get(movie_id, {})
    if (
        cached_profile.get("_version") == 3
        and cached_profile.get("_model") == recommendation_ai.generation_signature
    ):
        return _SEMANTIC_PROFILE_CACHE[movie_id]
    prompt = (
        "Tu es un analyste cinéma précis. N'invente aucun fait absent des données. Ne retourne jamais des genres génériques (romance, drame, cinéma japonais) : retourne seulement des détails discriminants et laisse un tableau vide si la preuve manque.\n"
        f"FICHE TMDB :\n{_profile(detail, keywords)}\n\n"
        f"EXTRAITS DE CRITIQUES :\n{'---'.join(review[:1800] for review in reviews[:2]) or 'Aucun extrait.'}\n\n"
        "Retourne uniquement un JSON : {\"themes\":[...],\"emotions\":[...],\"communication\":[...],\"pacing\":[...],\"visual_language\":[...],\"cultural_context\":[...],\"tmdb_keyword_queries\":[...]}. "
        "Les valeurs doivent être brèves. tmdb_keyword_queries contient 3 à 6 termes anglais réellement soutenus par la fiche, par exemple deafness, sign language, grief, memory loss ou environmentalism."
    )
    profile = await _generate_json(prompt, _SEMANTIC_PROFILE_SCHEMA)
    allowed = {"themes", "emotions", "communication", "pacing", "visual_language", "cultural_context", "tmdb_keyword_queries"}
    profile = {key: value for key, value in profile.items() if key in allowed and isinstance(value, list)}
    profile["_version"] = 3
    profile["_model"] = recommendation_ai.generation_signature
    _SEMANTIC_PROFILE_CACHE[movie_id] = profile
    _save_cache()
    return profile


async def _llm_rerank(source_profiles: list[dict[str, Any]], candidates: list[tuple[float, dict[str, Any], dict[str, Any], list[str]]]) -> dict[int, float]:
    if not candidates:
        return {}
    cache_key = json.dumps(
        {
            "model": recommendation_ai.generation_signature,
            "sources": source_profiles,
            "candidate_ids": [item[1]["id"] for item in candidates],
        },
        ensure_ascii=False,
        sort_keys=True,
    )
    if cache_key in _RERANK_CACHE:
        return _RERANK_CACHE[cache_key]
    payload = [{"id": item[1]["id"], "title": item[2].get("title"), "overview": (item[2].get("overview") or "")[:600], "genres": [genre.get("name") for genre in item[2].get("genres", [])], "keywords": item[3][:12], "language": item[2].get("original_language"), "countries": [country.get("iso_3166_1") for country in item[2].get("production_countries", [])]} for item in candidates]
    prompt = (
        "Tu es un reranker de recommandations cinéma. Cherche une similarité précise : histoire, thèmes, émotions, quantité de dialogue/silence, forme visuelle, rythme et contexte culturel. Ne privilégie pas la popularité.\n"
        f"PROFILS SOURCES :\n{json.dumps(source_profiles, ensure_ascii=False)}\n"
        f"CANDIDATS :\n{json.dumps(payload, ensure_ascii=False)}\n"
        "Retourne uniquement {\"ranking\":[{\"id\":123,\"score\":0}]}. Classe tous les IDs, score entier 0 à 100, sans texte."
    )
    output = await _generate_json(prompt, _RANKING_SCHEMA)
    scores = {int(item["id"]): float(item["score"]) for item in output.get("ranking", []) if isinstance(item, dict) and str(item.get("id", "")).isdigit() and isinstance(item.get("score"), (int, float))}
    valid_scores = {item[1]["id"]: max(0.0, min(100.0, scores[item[1]["id"]])) for item in candidates if item[1]["id"] in scores}
    _RERANK_CACHE[cache_key] = valid_scores
    _save_cache()
    return valid_scores


def _has_adult_certification(movie: dict[str, Any]) -> bool:
    countries = movie.get("release_dates", {}).get("results", [])
    certifications = {
        str(release.get("certification", "")).strip().upper().replace(" ", "")
        for country in countries
        for release in country.get("release_dates", [])
        if release.get("certification")
    }
    return any(
        certification in _ADULT_CERTIFICATIONS
        or re.search(r"(?:^|\D)18(?:\+|$)", certification)
        for certification in certifications
    )


def _contains_explicit_keywords(keywords: list[str]) -> bool:
    normalized = " | ".join(keyword.casefold() for keyword in keywords)
    return any(fragment in normalized for fragment in _EXPLICIT_KEYWORD_FRAGMENTS)


def _eligible(movie: dict[str, Any], keywords: list[str], include_animation: bool, include_documentary: bool, animation_only: bool) -> bool:
    release_date = movie.get("release_date") or ""
    if not release_date or release_date > (date.today() + timedelta(days=365)).isoformat():
        return False
    if movie.get("adult") is True or _has_adult_certification(movie) or _contains_explicit_keywords(keywords):
        return False
    genre_ids = {genre.get("id") for genre in movie.get("genres", [])} or set(movie.get("genre_ids", []))
    if animation_only and 16 not in genre_ids:
        return False
    return not ((16 in genre_ids and not include_animation) or (99 in genre_ids and not include_documentary))


async def recommend_movies(sources: list[CatalogMovieRecord], catalog_candidates: list[CatalogMovieRecord], watchlist_candidates: list[CatalogMovieRecord], include_animation: bool, include_documentary: bool, offset: int, rejected_ids: set[int]) -> dict[str, Any]:
    source_ids = [movie.tmdb_id for movie in sources if movie.tmdb_id]
    if len(source_ids) != len(sources):
        raise ValueError("Chaque film de référence doit avoir un identifiant TMDB")
    source_details = await asyncio.gather(*[_movie_details(movie_id) for movie_id in source_ids])
    source_keywords = await asyncio.gather(*[_movie_keywords(movie_id) for movie_id in source_ids])
    source_keyword_entries = await asyncio.gather(*[_movie_keyword_entries(movie_id) for movie_id in source_ids])
    source_reviews = await asyncio.gather(*[_movie_reviews(movie_id) for movie_id in source_ids])
    _save_cache()
    source_profiles = [_profile(movie, keywords, source.director) for movie, keywords, source in zip(source_details, source_keywords, sources)]
    semantic_profiles = await asyncio.gather(*[_semantic_profile(movie_id, detail, keywords, reviews) for movie_id, detail, keywords, reviews in zip(source_ids, source_details, source_keywords, source_reviews)])
    rerank_source_profiles = [
        {
            "title": detail.get("title"),
            "overview": (detail.get("overview") or "")[:900],
            "genres": [genre.get("name") for genre in detail.get("genres", [])],
            "keywords": keywords[:20],
            "language": detail.get("original_language"),
            "countries": [country.get("iso_3166_1") for country in detail.get("production_countries", [])],
            "analysis": analysis,
        }
        for detail, keywords, analysis in zip(source_details, source_keywords, semantic_profiles)
    ]
    source_is_animation = all(16 in {genre.get("id") for genre in movie.get("genres", [])} for movie in source_details)
    effective_include_animation = include_animation or source_is_animation
    candidates: dict[int, dict[str, Any]] = {}
    provenance: dict[int, set[str]] = {}

    def add_candidates(items: list[dict[str, Any]], channel: str) -> None:
        for candidate in items:
            candidate_id = candidate.get("id")
            if candidate_id and candidate.get("adult") is not True and candidate_id not in source_ids and candidate_id not in rejected_ids:
                candidates[candidate_id] = candidate
                provenance.setdefault(candidate_id, set()).add(channel)

    related_batches = await asyncio.gather(*[asyncio.gather(tmdb_client.get_movie_recommendations(movie_id), tmdb_client.get_similar_movies(movie_id)) for movie_id in source_ids])
    for recommendations, similar in related_batches:
        add_candidates(recommendations, "recommendation")
        add_candidates(similar, "similar")
    discovery_tasks: list[tuple[str, Any]] = []
    for detail, entries, semantic_profile in zip(source_details, source_keyword_entries, semantic_profiles):
        genre_ids = [str(genre["id"]) for genre in detail.get("genres", [])[:3] if genre.get("id")]
        language = detail.get("original_language")
        countries = [country.get("iso_3166_1") for country in detail.get("production_countries", []) if country.get("iso_3166_1")]
        if language and genre_ids:
            discovery_tasks.append(("language_genre", tmdb_client.discover_movies({"with_original_language": language, "with_genres": "|".join(genre_ids)})))
        if countries and genre_ids:
            discovery_tasks.append(("country_genre", tmdb_client.discover_movies({"with_origin_country": countries[0], "with_genres": "|".join(genre_ids)})))
        discovery_tasks.extend(("keyword", tmdb_client.discover_movies({"with_keywords": entry["id"]})) for entry in entries[:2])
        keyword_queries = [query for query in semantic_profile.get("tmdb_keyword_queries", []) if isinstance(query, str) and query.strip()][:6]
        keyword_results = await asyncio.gather(*[tmdb_client.search_keywords(query) for query in keyword_queries])
        semantic_keyword_ids = [result[0]["id"] for result in keyword_results if result and result[0].get("id")]
        for keyword_id in semantic_keyword_ids:
            params: dict[str, Any] = {"with_keywords": keyword_id}
            if language:
                params["with_original_language"] = language
            discovery_tasks.append(("semantic_keyword", tmdb_client.discover_movies(params)))
        for first, second in zip(semantic_keyword_ids, semantic_keyword_ids[1:3]):
            discovery_tasks.append(("semantic_keyword_pair", tmdb_client.discover_movies({"with_keywords": f"{first},{second}"})))
    if discovery_tasks:
        for (channel, _), batch in zip(discovery_tasks, await asyncio.gather(*(task for _, task in discovery_tasks))):
            add_candidates(batch, channel)
    # Les associations de calibration ne participent jamais au runtime. Les seules
    # sources de candidats sont TMDB et, à titre de rappel, la liste « à voir ».
    catalog_by_tmdb_id = {
        int(movie.tmdb_id): movie
        for movie in [*catalog_candidates, *watchlist_candidates]
        if movie.tmdb_id and int(movie.tmdb_id) not in source_ids and int(movie.tmdb_id) not in rejected_ids
    }
    watched_candidate_ids = {
        int(movie.tmdb_id)
        for movie in catalog_candidates
        if movie.tmdb_id and int(movie.tmdb_id) not in source_ids and int(movie.tmdb_id) not in rejected_ids
    }
    for movie_id, movie in catalog_by_tmdb_id.items():
        candidates.setdefault(movie_id, {"id": movie_id, "title": movie.title, "poster_path": None})
        provenance.setdefault(movie_id, set()).add("catalog" if movie_id in watched_candidate_ids else "watchlist")
    candidate_list = list(candidates.values())
    details = await asyncio.gather(*[_movie_details(candidate["id"]) for candidate in candidate_list])
    keywords = await asyncio.gather(*[_movie_keywords(candidate["id"]) for candidate in candidate_list])
    _save_cache()
    eligible = [(candidate, detail, words) for candidate, detail, words in zip(candidate_list, details, keywords) if _eligible(detail, words, effective_include_animation, include_documentary, source_is_animation)]
    profiles = [*source_profiles, *[_profile(detail, words, catalog_by_tmdb_id.get(candidate["id"]).director if candidate["id"] in catalog_by_tmdb_id else None) for candidate, detail, words in eligible]]
    vectors = await _embeddings(profiles)
    source_vectors, candidate_vectors = vectors[:len(source_profiles)], vectors[len(source_profiles):]
    ranked = []
    for (candidate, detail, words), vector in zip(eligible, candidate_vectors):
        per_source = [_feature_score(source, source_words, source_vector, detail, words, vector, provenance[candidate["id"]]) for source, source_words, source_vector in zip(source_details, source_keywords, source_vectors)]
        content_score = min(score for score, _ in per_source) if len(per_source) > 1 else per_source[0][0]
        ranked.append((content_score, candidate, detail, per_source))
    ranked.sort(key=lambda item: item[0], reverse=True)
    words_by_id = {candidate["id"]: words for candidate, _, words in eligible}
    semantic_candidates = [item for item in ranked if provenance[item[1]["id"]] & {"semantic_keyword", "semantic_keyword_pair"}]
    rerank_pool = []
    rerank_seen_ids: set[int] = set()
    for item in [*ranked[:20], *semantic_candidates[:12]]:
        candidate_id = item[1]["id"]
        if candidate_id not in rerank_seen_ids:
            rerank_pool.append(item)
            rerank_seen_ids.add(candidate_id)
        if len(rerank_pool) == 24:
            break
    rerank_scores = await _llm_rerank(
        rerank_source_profiles,
        [(score, candidate, detail, words_by_id[candidate["id"]]) for score, candidate, detail, _ in rerank_pool],
    )
    if rerank_scores:
        ranked = [
            ((0.2 * score) + (0.8 * rerank_scores[candidate["id"]] / 100), candidate, detail, per_source)
            if candidate["id"] in rerank_scores else (score, candidate, detail, per_source)
            for score, candidate, detail, per_source in ranked
        ]
        ranked.sort(key=lambda item: item[0], reverse=True)
    # Deux films déjà vus au maximum sur l'intégralité du flux paginé. Ils restent
    # visibles lorsque très pertinents, mais ne peuvent plus remplacer la découverte.
    discovery_first: list[tuple[float, dict[str, Any], dict[str, Any], list[tuple[float, dict[str, float]]]]] = []
    watched_count = 0
    for item in ranked:
        if item[1]["id"] in watched_candidate_ids:
            if watched_count >= 2:
                continue
            watched_count += 1
        discovery_first.append(item)
    ranked = discovery_first
    page = ranked[offset:offset + 3]
    credits = await asyncio.gather(*[tmdb_client.get_movie_credits(candidate["id"]) for _, candidate, _, _ in page])
    movies = []
    for (_, candidate, detail, _), credit in zip(page, credits):
        director = next((person.get("name") for person in credit.get("crew", []) if person.get("job") == "Director"), "Inconnu")
        movies.append({"id": candidate["id"], "title": detail.get("title") or candidate.get("title", ""), "poster_path": detail.get("poster_path") or candidate.get("poster_path"), "director": director, "release_year": int((detail.get("release_date") or "0000")[:4]) or None})
    return {"data": movies, "pagination": {"offset": offset, "limit": 3, "total": len(ranked), "has_more": offset + 3 < len(ranked)}, "debug": {"provider": recommendation_ai.provider, "model": recommendation_ai.embedding_model, "generation_model": recommendation_ai.generation_model, "source_tmdb_ids": source_ids, "candidate_count": len(ranked), "ranked_candidate_tmdb_ids": [candidate["id"] for _, candidate, _, _ in ranked], "results": [{"tmdb_id": candidate["id"], "score": round(score, 4), "sources": sorted(provenance[candidate["id"]]), "features": [{name: round(value, 4) for name, value in feature.items()} for _, feature in per_source]} for score, candidate, _, per_source in page]}}
