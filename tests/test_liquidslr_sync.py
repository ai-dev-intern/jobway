import tempfile
import unittest
from pathlib import Path

from pipeline.liquidslr_sync import build_company_index, slug_from_link


class LiquidslrTests(unittest.TestCase):
    def test_slug(self):
        self.assertEqual(slug_from_link("https://leetcode.com/problems/two-sum/"), "two-sum")

    def test_parser_builds_ratios(self):
        with tempfile.TemporaryDirectory() as folder:
            company = Path(folder) / "ExampleCo"
            company.mkdir()
            (company / "1. Thirty Days.csv").write_text("Difficulty,Title,Frequency,Acceptance Rate,Link,Topics\nEASY,Two Sum,90,0.5,https://leetcode.com/problems/two-sum/,Array\n", encoding="utf-8")
            result = build_company_index(folder)
            self.assertEqual(result["companies"]["ExampleCo"]["easy_pct"], 100.0)
            self.assertIn("ExampleCo", result["problems"]["two-sum"]["companies"])


if __name__ == "__main__":
    unittest.main()

