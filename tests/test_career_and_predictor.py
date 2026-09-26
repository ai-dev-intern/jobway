import json
import unittest
from pathlib import Path

from backend.career_compass import _roles, assess_career_interest, load_quiz
from backend.workflow_engine import get_role_workflow
from backend.company_predictor import calculate_company_chances

ROOT = Path(__file__).resolve().parents[1]


class RecommendationTests(unittest.TestCase):
    def test_quiz_returns_top_three(self):
        answers = {item["id"]: item["options"][0]["id"] for item in load_quiz()}
        result = assess_career_interest(answers)
        self.assertEqual(len(result), 3)
        self.assertTrue(all(0 <= item["match_percentage"] <= 100 for item in result))

    def test_expanded_catalogue_and_simple_quiz(self):
        quiz = load_quiz()
        self.assertEqual(len(_roles()), 12)
        self.assertEqual(len(quiz), 10)
        self.assertTrue(all(len(item["scenario"].split()) <= 12 for item in quiz))
        self.assertTrue(all(len(item["options"]) == 4 for item in quiz))

    def test_new_job_has_a_populated_roadmap(self):
        questions = json.loads((ROOT / "frontend/public/questions.json").read_text(encoding="utf-8"))
        workflow = get_role_workflow("mobile_swe", questions)
        self.assertEqual(len(workflow["phases"]), 4)
        self.assertGreater(sum(phase["total"] for phase in workflow["phases"]), 0)

    def test_predictor_groups_every_company(self):
        questions = json.loads((ROOT / "frontend/public/questions.json").read_text(encoding="utf-8"))
        profiles = json.loads((ROOT / "frontend/public/company_profiles.json").read_text(encoding="utf-8"))["companies"]
        result = calculate_company_chances(questions, profiles, {"solved_questions": ["two-sum"]})
        self.assertEqual(set(result), {"high_chance", "within_reach", "stretch_targets"})
        self.assertEqual(sum(map(len, result.values())), len(profiles))


if __name__ == "__main__":
    unittest.main()
