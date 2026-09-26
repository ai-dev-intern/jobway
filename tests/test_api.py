import os
import unittest

os.environ["JOBWAY_ENABLE_UNSAFE_LOCAL_EXECUTION"] = "1"

import backend.main as main
from fastapi.testclient import TestClient


class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        main.SESSION_STATES.clear()
        cls.client = TestClient(main.app)

    def test_recommendation_and_company_routes(self):
        quiz = self.client.get("/api/career/quiz").json()
        answers = {item["id"]: item["options"][0]["id"] for item in quiz}
        recommendations = self.client.post("/api/career/assess", json={"answers": answers})
        self.assertEqual(recommendations.status_code, 200)
        self.assertEqual(len(recommendations.json()["recommendations"]), 3)
        chances = self.client.get("/api/companies/chances")
        self.assertEqual(chances.status_code, 200)
        self.assertEqual(set(chances.json()), {"high_chance", "within_reach", "stretch_targets"})

    def test_run_and_submit_endpoints(self):
        question = next(item for item in self.client.get("/api/questions").json() if item["id"] == "lc-two-sum")
        body = {"question_id": question["id"], "language": "python", "source_code": "n=int(input()); nums=list(map(int,input().split())); target=int(input()); seen={}\nfor i,value in enumerate(nums):\n    if target-value in seen: print(seen[target-value],i); break\n    seen[value]=i"}
        run = self.client.post("/api/code/run", json=body).json()
        self.assertEqual(run["total_count"], 3)
        self.assertTrue(run["all_passed"])
        submit = self.client.post("/api/code/submit", json=body).json()
        self.assertEqual(submit["total_count"], 10)
        self.assertTrue(submit["all_passed"])
        self.assertTrue(submit["marked_solved"])
        self.assertTrue(all("input" not in item and "expected" not in item for item in submit["results"]))

    def test_public_questions_do_not_disclose_answers_or_hidden_tests(self):
        questions = self.client.get("/api/questions").json()
        self.assertTrue(questions)
        self.assertTrue(all("reference_solution" not in item for item in questions))
        self.assertTrue(all(len(item.get("test_cases", [])) <= 1 for item in questions))

    def test_admin_endpoints_are_closed_without_configuration(self):
        self.assertEqual(self.client.get("/api/admin/overrides").status_code, 503)
        self.assertEqual(self.client.post("/api/pipeline/run").status_code, 503)
        self.assertEqual(self.client.post("/api/admin/login", json={"password": "admin123"}).status_code, 404)

    def test_validation_and_security_headers(self):
        response = self.client.get("/api/questions")
        self.assertEqual(response.headers["x-content-type-options"], "nosniff")
        self.assertEqual(response.headers["x-frame-options"], "DENY")
        self.assertIn("HttpOnly", response.headers["set-cookie"])
        self.assertIn("SameSite=lax", response.headers["set-cookie"])
        invalid = self.client.post("/api/code/run", json={"question_id": "../secret", "language": "python", "source_code": "print(1)"})
        self.assertEqual(invalid.status_code, 422)
        oversized = self.client.post("/api/code/run", json={"question_id": "lc-two-sum", "language": "python", "source_code": "x" * 50001})
        self.assertEqual(oversized.status_code, 422)

    def test_anonymous_progress_is_isolated_by_session(self):
        first = TestClient(main.app)
        second = TestClient(main.app)
        selected = first.post("/api/workflow/select", json={"mode": "role", "target_id": "backend_swe"})
        self.assertEqual(selected.status_code, 200)
        self.assertEqual(first.get("/api/workflow/active").json()["target_id"], "backend_swe")
        self.assertEqual(second.get("/api/workflow/active").json(), {"active_workflow": None})


if __name__ == "__main__":
    unittest.main()
