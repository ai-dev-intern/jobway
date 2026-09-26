import unittest

from pipeline.deterministic_tagger import normalize_difficulty, tag_question


class DifficultyTests(unittest.TestCase):
    def test_all_source_mappings_are_strict(self):
        self.assertEqual(normalize_difficulty("Basic"), "Easy")
        self.assertEqual(normalize_difficulty("Advanced"), "Hard")
        self.assertEqual(normalize_difficulty(rating=1100), "Easy")
        self.assertEqual(normalize_difficulty(rating=1400), "Medium")
        self.assertEqual(normalize_difficulty(rating=1600), "Hard")

    def test_phase_and_roles_are_added(self):
        item = tag_question({"title": "Traversal", "topics": ["Graph"], "difficulty": "Hard"})
        self.assertEqual(item["workflow_phase"], 3)
        self.assertIn("backend_swe", item["software_roles"])


if __name__ == "__main__":
    unittest.main()

