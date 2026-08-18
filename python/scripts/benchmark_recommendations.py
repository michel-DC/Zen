"""Benchmark CLI reproductible du moteur de recommandations Zen.

Ce script ne touche ni au navigateur ni aux données du catalogue. Il appelle
l'API locale avec les mêmes entrées que l'application et mesure le rang des
associations validées par l'utilisateur.
"""

from __future__ import annotations

import asyncio
import json
import os
from dataclasses import dataclass
from pathlib import Path

import httpx


API_URL = os.getenv("ZEN_API_URL", "http://localhost:8000/api/v1")


@dataclass(frozen=True)
class BenchmarkCase:
    name: str
    source_tmdb_id: int
    target_tmdb_id: int
    source_is_animation: bool = False


CASES = (
    BenchmarkCase("chihiro_to_mononoke", 129, 128, True),
    BenchmarkCase("mononoke_to_chihiro", 128, 129, True),
    BenchmarkCase("tortured_to_boy_mole_fox_horse", 802699, 995133, True),
    BenchmarkCase("aftersun_to_after_yang", 965150, 585378),
    BenchmarkCase("hear_me_to_josee", 1160981, 602301),
    BenchmarkCase("your_eyes_tell_to_always", 730154, 86000),
    BenchmarkCase("youth_18x2_to_last_10_years", 1188258, 876797),
    BenchmarkCase("paterson_to_columbus", 370755, 414453),
    BenchmarkCase("lost_in_translation_to_drive_my_car", 153, 758866),
    BenchmarkCase("eternal_sunshine_to_her", 38, 152601),
    BenchmarkCase("marriage_story_to_500_days", 492188, 19913),
    BenchmarkCase("500_days_to_eternal_sunshine", 19913, 38),
    BenchmarkCase("we_live_in_time_to_words_on_bathroom_walls", 1100099, 523781),
    BenchmarkCase("waves_to_bones_and_all", 533444, 791177),
    BenchmarkCase("bones_and_all_to_call_me_by_your_name", 791177, 398818),
)


async def main() -> None:
    timeout = httpx.Timeout(900.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        catalog_response = await client.get(f"{API_URL}/catalog")
        catalog_response.raise_for_status()
        catalog_by_tmdb_id = {
            int(movie["tmdb_id"]): movie
            for movie in catalog_response.json()["movies"]
            if movie.get("tmdb_id")
        }

        outcomes = []
        output_path = Path(os.environ["ZEN_BENCHMARK_OUTPUT"]) if os.getenv("ZEN_BENCHMARK_OUTPUT") else None

        def save_progress() -> None:
            if output_path:
                output_path.write_text(json.dumps(outcomes, ensure_ascii=False, indent=2), encoding="utf-8")

        requested_case = os.getenv("ZEN_BENCHMARK_CASE")
        cases = tuple(case for case in CASES if not requested_case or case.name == requested_case)
        for case in cases:
            source = catalog_by_tmdb_id.get(case.source_tmdb_id)
            if source is None:
                outcomes.append({"case": case.name, "error": "source missing from catalog"})
                save_progress()
                continue
            try:
                response = await client.post(
                    f"{API_URL}/catalog/recommendations",
                    json={
                        "movie_ids": [source["id"]],
                        "include_animation": case.source_is_animation,
                        "include_documentary": False,
                        "offset": 0,
                    },
                )
                response.raise_for_status()
                payload = response.json()
                result_ids = [movie["id"] for movie in payload["data"]]
                rank = result_ids.index(case.target_tmdb_id) + 1 if case.target_tmdb_id in result_ids else None
                ranked_candidate_ids = payload["debug"].get("ranked_candidate_tmdb_ids", [])
                candidate_rank = ranked_candidate_ids.index(case.target_tmdb_id) + 1 if case.target_tmdb_id in ranked_candidate_ids else None
                outcomes.append(
                    {
                        "case": case.name,
                        "source_tmdb_id": case.source_tmdb_id,
                        "target_tmdb_id": case.target_tmdb_id,
                        "rank": rank,
                        "candidate_rank": candidate_rank,
                        "top_3": [
                            {"tmdb_id": movie["id"], "title": movie["title"]}
                            for movie in payload["data"]
                        ],
                        "candidate_count": payload["debug"]["candidate_count"],
                    }
                )
            except httpx.HTTPError as error:
                outcomes.append({"case": case.name, "error": str(error)})
            save_progress()
            print(json.dumps(outcomes[-1], ensure_ascii=False), flush=True)

    hits = sum(outcome.get("rank") is not None for outcome in outcomes)
    reciprocal_rank = sum(1 / outcome["rank"] for outcome in outcomes if outcome.get("rank")) / len(outcomes)
    print(
        json.dumps(
            {
                "summary": {
                    "cases": len(outcomes),
                    "top_3_hits": hits,
                    "top_3_success_rate": round(hits / len(outcomes) * 100, 1) if outcomes else 0,
                    "mrr_at_3": round(reciprocal_rank, 3),
                }
            },
            ensure_ascii=False,
        )
    )
    save_progress()


if __name__ == "__main__":
    asyncio.run(main())
