import unittest
from unittest.mock import AsyncMock, patch

from clients.recommendation_ai import RecommendationAIClient


class RecommendationAIClientTests(unittest.IsolatedAsyncioTestCase):
    def test_validates_embedding_shape(self) -> None:
        vectors = RecommendationAIClient._validate_embeddings(
            [[1, 2.5], [3.0, 4]],
            expected_count=2,
        )

        self.assertEqual(vectors, [[1.0, 2.5], [3.0, 4.0]])

    def test_extracts_json_from_text(self) -> None:
        result = RecommendationAIClient._json_object(
            'Réponse : {"themes":["silence"]}'
        )

        self.assertEqual(result, {"themes": ["silence"]})

    async def test_cloudflare_embedding_response(self) -> None:
        client = RecommendationAIClient()
        client.provider = "cloudflare"

        with patch.object(
            client,
            "_run_cloudflare_model",
            AsyncMock(return_value={"data": [[0.1, 0.2]]}),
        ):
            vectors = await client.embed(["film contemplatif"])

        self.assertEqual(vectors, [[0.1, 0.2]])

    async def test_cloudflare_structured_response(self) -> None:
        client = RecommendationAIClient()
        client.provider = "cloudflare"
        schema = {
            "type": "object",
            "properties": {"themes": {"type": "array"}},
            "required": ["themes"],
        }

        with patch.object(
            client,
            "_run_cloudflare_model",
            AsyncMock(return_value={"response": {"themes": ["silence"]}}),
        ):
            result = await client.generate_json("Analyse ce film", schema)

        self.assertEqual(result, {"themes": ["silence"]})


if __name__ == "__main__":
    unittest.main()
