import os
import unittest

os.environ["JOBWAY_ENABLE_UNSAFE_LOCAL_EXECUTION"] = "1"

from backend.code_runner import run_user_code


class RunnerTests(unittest.TestCase):
    QUESTION = {"id": "sum", "type": "Programming", "category": "Arrays", "test_cases": [{"input": f"{i} {i + 1}\n", "expected": str(i + i + 1)} for i in range(10)]}

    def test_run_uses_three_cases(self):
        result = run_user_code(self.QUESTION, "python", "print(sum(map(int,input().split())))", "run")
        self.assertEqual(result["total_count"], 3)
        self.assertTrue(result["all_passed"])

    def test_submit_uses_ten_cases(self):
        result = run_user_code(self.QUESTION, "python", "print(sum(map(int,input().split())))", "submit")
        self.assertEqual(result["total_count"], 10)
        self.assertTrue(result["all_passed"])


if __name__ == "__main__":
    unittest.main()
