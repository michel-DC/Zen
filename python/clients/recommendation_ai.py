from __future__ import annotations

import json
from typing import Any

import httpx

from core.config import settings


class RecommendationAIError(RuntimeError):
    """Raised when the configured recommendation AI provider is unavailable."""


class RecommendationAIClient:
    def __init__(self) -> None:
        self.provider = settings.RECOMMENDATION_AI_PROVIDER.strip().casefold()

    @property
    def embedding_model(self) -> str:
        if self.provider == "cloudflare":
            return settings.CLOUDFLARE_AI_EMBEDDING_MODEL
        return settings.OLLAMA_EMBEDDING_MODEL

    @property
    def generation_model(self) -> str:
        if self.provider == "cloudflare":
            return settings.CLOUDFLARE_AI_GENERATION_MODEL
        return settings.OLLAMA_RERANKING_MODEL

    @property
    def embedding_signature(self) -> str:
        return f"{self.provider}:{self.embedding_model}"

    @property
    def generation_signature(self) -> str:
        return f"{self.provider}:{self.generation_model}"

    def embedding_cache_key(self, text: str) -> str:
        return f"{self.embedding_signature}:{text}"

    async def embed(self, inputs: list[str]) -> list[list[float]]:
        if self.provider == "ollama":
            return await self._embed_with_ollama(inputs)
        if self.provider == "cloudflare":
            return await self._embed_with_cloudflare(inputs)
        raise RecommendationAIError(
            f"Fournisseur IA inconnu : {settings.RECOMMENDATION_AI_PROVIDER}"
        )

    async def generate_json(
        self,
        prompt: str,
        json_schema: dict[str, Any],
    ) -> dict[str, Any]:
        if self.provider == "ollama":
            return await self._generate_with_ollama(prompt)
        if self.provider == "cloudflare":
            return await self._generate_with_cloudflare(prompt, json_schema)
        raise RecommendationAIError(
            f"Fournisseur IA inconnu : {settings.RECOMMENDATION_AI_PROVIDER}"
        )

    async def _embed_with_ollama(self, inputs: list[str]) -> list[list[float]]:
        try:
            async with httpx.AsyncClient(timeout=settings.OLLAMA_TIMEOUT) as client:
                response = await client.post(
                    f"{settings.OLLAMA_BASE_URL}/api/embed",
                    json={"model": settings.OLLAMA_EMBEDDING_MODEL, "input": inputs},
                )
                response.raise_for_status()
                embeddings = response.json()["embeddings"]
                return self._validate_embeddings(embeddings, len(inputs))
        except (httpx.HTTPError, KeyError, TypeError, ValueError) as error:
            raise RecommendationAIError(
                "Le moteur de recommandation Ollama est indisponible"
            ) from error

    async def _embed_with_cloudflare(self, inputs: list[str]) -> list[list[float]]:
        try:
            result = await self._run_cloudflare_model(
                settings.CLOUDFLARE_AI_EMBEDDING_MODEL,
                {"text": inputs},
                timeout=settings.CLOUDFLARE_AI_TIMEOUT,
            )
            return self._validate_embeddings(result["data"], len(inputs))
        except (httpx.HTTPError, KeyError, TypeError, ValueError) as error:
            raise RecommendationAIError(
                "Le service Cloudflare Workers AI est indisponible"
            ) from error

    async def _generate_with_ollama(self, prompt: str) -> dict[str, Any]:
        try:
            async with httpx.AsyncClient(
                timeout=settings.OLLAMA_RERANKING_TIMEOUT
            ) as client:
                response = await client.post(
                    f"{settings.OLLAMA_BASE_URL}/api/generate",
                    json={
                        "model": settings.OLLAMA_RERANKING_MODEL,
                        "prompt": prompt,
                        "stream": False,
                        "format": "json",
                        "options": {"temperature": 0, "num_predict": 1200},
                        "think": False,
                    },
                )
                response.raise_for_status()
                return self._json_object(response.json().get("response", ""))
        except (httpx.HTTPError, KeyError, TypeError, ValueError) as error:
            raise RecommendationAIError(
                "Le modèle de génération Ollama est indisponible"
            ) from error

    async def _generate_with_cloudflare(
        self,
        prompt: str,
        json_schema: dict[str, Any],
    ) -> dict[str, Any]:
        try:
            result = await self._run_cloudflare_model(
                settings.CLOUDFLARE_AI_GENERATION_MODEL,
                {
                    "messages": [
                        {
                            "role": "system",
                            "content": "Retourne uniquement le JSON demandé, sans commentaire.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    "response_format": {
                        "type": "json_schema",
                        "json_schema": json_schema,
                    },
                    "temperature": 0,
                    "max_tokens": 1200,
                },
                timeout=settings.CLOUDFLARE_AI_TIMEOUT,
            )
            return self._json_object(result.get("response", result))
        except (httpx.HTTPError, KeyError, TypeError, ValueError) as error:
            raise RecommendationAIError(
                "Le modèle Cloudflare Workers AI est indisponible"
            ) from error

    async def _run_cloudflare_model(
        self,
        model: str,
        payload: dict[str, Any],
        timeout: int,
    ) -> dict[str, Any]:
        if not settings.CLOUDFLARE_AI_ACCOUNT_ID:
            raise RecommendationAIError("CLOUDFLARE_AI_ACCOUNT_ID est manquant")
        if not settings.CLOUDFLARE_AI_API_TOKEN:
            raise RecommendationAIError("CLOUDFLARE_AI_API_TOKEN est manquant")

        base_url = settings.CLOUDFLARE_AI_BASE_URL.rstrip("/")
        url = (
            f"{base_url}/accounts/{settings.CLOUDFLARE_AI_ACCOUNT_ID}"
            f"/ai/run/{model}"
        )
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                url,
                headers={
                    "Authorization": f"Bearer {settings.CLOUDFLARE_AI_API_TOKEN}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
            body = response.json()

        if body.get("success") is not True or not isinstance(body.get("result"), dict):
            raise RecommendationAIError("Réponse Cloudflare Workers AI invalide")
        return body["result"]

    @staticmethod
    def _validate_embeddings(
        embeddings: Any,
        expected_count: int,
    ) -> list[list[float]]:
        if not isinstance(embeddings, list) or len(embeddings) != expected_count:
            raise ValueError("Nombre de vecteurs inattendu")
        if not all(
            isinstance(vector, list)
            and vector
            and all(isinstance(value, (int, float)) for value in vector)
            for vector in embeddings
        ):
            raise ValueError("Format de vecteur invalide")
        return [[float(value) for value in vector] for vector in embeddings]

    @staticmethod
    def _json_object(raw: Any) -> dict[str, Any]:
        if isinstance(raw, dict):
            return raw
        if not isinstance(raw, str):
            return {}
        start, end = raw.find("{"), raw.rfind("}")
        if start == -1 or end == -1:
            return {}
        value = json.loads(raw[start : end + 1])
        return value if isinstance(value, dict) else {}


recommendation_ai = RecommendationAIClient()
