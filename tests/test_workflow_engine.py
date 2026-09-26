import json
import unittest
from pathlib import Path

from backend.workflow_engine import get_company_workflow, get_role_workflow, toggle_opt_out

ROOT = Path(__file__).resolve().parents[1]


class WorkflowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.questions = json.loads((ROOT / "frontend/public/questions.json").read_text(encoding="utf-8"))

    def test_role_workflow_has_four_strict_tiers(self):
        result = get_role_workflow("backend_swe", self.questions, {})
        self.assertEqual(len(result["phases"]), 4)
        for phase in result["phases"]:
            self.assertEqual(set(phase["questions_by_difficulty"]), {"Easy", "Medium", "Hard"})

    def test_company_workflow_has_four_phases(self):
        result = get_company_workflow("Amazon", self.questions, {}, {"top_topics": ["Array", "Graph"]})
        self.assertEqual([phase["number"] for phase in result["phases"]], [1, 2, 3, 4])

    def test_opt_out_changes_denominator(self):
        before = get_role_workflow("backend_swe", self.questions, {})["phases"][0]
        question = next(iter(before["questions_by_difficulty"]["Easy"]))
        state = toggle_opt_out({}, question["id"], "Already know this")
        after = get_role_workflow("backend_swe", self.questions, state)["phases"][0]
        self.assertEqual(after["opted_out"], 1)
        self.assertEqual(after["total"] - after["opted_out"], before["total"] - 1)


if __name__ == "__main__":
    unittest.main()

