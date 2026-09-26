export interface StudySection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  code?: string;
}

export interface StudyGuide {
  id: string;
  title: string;
  readTime: string;
  summary: string;
  objectives: string[];
  sections: StudySection[];
  takeaways: string[];
  drill: { question: string; answer: string };
  video: { id: string; title: string; channel: string };
}

export const studyGuides: StudyGuide[] = [
  {
    id: "phase-1-0",
    title: "Big-O time and space complexity",
    readTime: "16 min",
    summary:
      "Learn to describe how an algorithm scales, compare alternatives, and include auxiliary memory in your reasoning.",
    objectives: [
      "Simplify operation counts into growth classes",
      "Analyze nested, sequential, and logarithmic work",
      "Explain time–space trade-offs clearly",
    ],
    sections: [
      {
        heading: "The scaling model",
        paragraphs: [
          "Big-O describes the upper-bound growth of work as input size n grows. Drop constants and lower-order terms because they matter less at scale: 3n² + 5n + 8 becomes O(n²).",
        ],
        bullets: [
          "Direct lookup is usually O(1)",
          "One full pass is O(n)",
          "Halving the search space is O(log n)",
          "A loop inside a loop is often O(n²)—unless their pointers only move forward overall",
        ],
      },
      {
        heading: "Analyze from the inside out",
        paragraphs: [
          "Count how often the dominant operation runs. Add sequential blocks, multiply genuinely nested blocks, and take the worst branch. For recursion, state the recurrence before claiming a bound.",
        ],
        code: `for (let i = 0; i < n; i++) {       // n\n  for (let j = 1; j < n; j *= 2) { // log n\n    visit(i, j);                     // O(1)\n  }\n}\n// Total: O(n log n) time, O(1) auxiliary space`,
      },
      {
        heading: "Space is part of the answer",
        paragraphs: [
          "Separate input space from auxiliary space. An output array may be required by the contract, while a hash map, recursion stack, or copied slice is extra memory. A useful interview answer gives both complexity and the assumptions behind it.",
        ],
      },
    ],
    takeaways: [
      "State n and the dominant operation",
      "Explain average versus worst case when they differ",
      "Call out recursion depth and auxiliary structures",
    ],
    drill: {
      question: "Two nested loops always mean O(n²). True or false?",
      answer:
        "False. If an inner pointer advances across the array only once in total, the combined work can still be O(n), as in many sliding-window algorithms.",
    },
    video: {
      id: "waPQP2TDOGE",
      title: "The Ultimate Big O Notation Tutorial",
      channel: "Back To Back SWE",
    },
  },
  {
    id: "phase-1-1",
    title: "Arrays, hashing, and two pointers",
    readTime: "18 min",
    summary:
      "Recognize three foundational patterns from constraints, input shape, and the relationship the problem asks you to find.",
    objectives: [
      "Choose a hash map for fast membership",
      "Use two pointers on ordered or paired data",
      "Recognize when an array scan is sufficient",
    ],
    sections: [
      {
        heading: "Pattern signals",
        bullets: [
          "“Have I seen this value before?” → set or map",
          "Pair in a sorted array → pointers from opposite ends",
          "Contiguous range → sliding window or prefix sum",
          "In-place compaction → read and write pointers",
        ],
      },
      {
        heading: "The complement technique",
        paragraphs: [
          "For Two Sum, store each value only after checking whether its complement already exists. This avoids using the same element twice and turns an O(n²) pair search into one O(n) pass.",
        ],
        code: `const seen = new Map<number, number>();\nfor (let i = 0; i < nums.length; i++) {\n  const need = target - nums[i];\n  if (seen.has(need)) return [seen.get(need)!, i];\n  seen.set(nums[i], i);\n}`,
      },
      {
        heading: "Trade-offs",
        paragraphs: [
          "Hashing usually buys speed with O(n) extra space. Sorting can enable two pointers with low extra space but costs O(n log n) and may destroy original indices. Choose from the output contract, not habit.",
        ],
      },
    ],
    takeaways: [
      "Translate the prompt into a relationship",
      "Preserve indices when the result needs them",
      "Write the invariant for each pointer",
    ],
    drill: {
      question: "When is sorting plus two pointers worse than hashing?",
      answer:
        "When original indices are required, mutation is forbidden, or expected O(n) time matters more than O(n) extra memory.",
    },
    video: {
      id: "KLlXCFG5TnA",
      title: "Two Sum – HashMap pattern",
      channel: "NeetCode",
    },
  },
  {
    id: "phase-1-2",
    title: "Brute force before optimization",
    readTime: "14 min",
    summary:
      "Turn the obvious correct idea into a baseline, then remove repeated work without losing the correctness argument.",
    objectives: [
      "Produce a correct baseline quickly",
      "Identify duplicated computation",
      "Optimize while preserving an invariant",
    ],
    sections: [
      {
        heading: "Why the baseline matters",
        paragraphs: [
          "A brute-force solution proves you understand the contract and gives you a reference implementation. State it, estimate its complexity, then name exactly what repeats. That transition is far stronger than jumping to a memorized trick.",
        ],
      },
      {
        heading: "A repeatable optimization ladder",
        bullets: [
          "Enumerate all valid candidates",
          "Locate repeated lookup, sorting, or recomputation",
          "Cache with a map/set or maintain a rolling state",
          "Exploit ordering with binary search or pointers",
          "Re-check edge cases and complexity",
        ],
      },
      {
        heading: "Interview narration",
        paragraphs: [
          "Say: “The direct solution checks every pair in O(n²). The repeated operation is searching for a complement. I can store prior values so that search becomes expected O(1), reducing total time to O(n) at the cost of O(n) space.”",
        ],
      },
    ],
    takeaways: [
      "Correctness comes before cleverness",
      "Name the repeated work you remove",
      "Re-test the optimized invariant",
    ],
    drill: {
      question:
        "What should you do if you see the optimal approach immediately?",
      answer:
        "Briefly state the baseline and why it is too slow, then implement the optimal approach. This makes the improvement and trade-off explicit.",
    },
    video: {
      id: "UrcwDOEBzZE",
      title: "Most Common Concepts for Coding Interviews",
      channel: "NeetCode",
    },
  },
  {
    id: "phase-1-3",
    title: "Solve Easy problems without hints",
    readTime: "12 min",
    summary:
      "Use a disciplined loop for interpreting, solving, testing, and reviewing foundation problems independently.",
    objectives: [
      "Convert prose into examples and constraints",
      "Time-box productive struggle",
      "Review without memorizing code",
    ],
    sections: [
      {
        heading: "The 30-minute loop",
        bullets: [
          "0–5: restate the problem and create examples",
          "5–12: describe the brute-force method",
          "12–22: implement the best justified approach",
          "22–27: dry-run edge cases",
          "27–30: record the pattern and one mistake",
        ],
      },
      {
        heading: "Use hints deliberately",
        paragraphs: [
          "A hint is useful after you can state exactly where you are stuck. Ask for the smallest missing idea, close it, and rebuild the solution yourself. Copying a full solution produces familiarity, not retrieval strength.",
        ],
      },
      {
        heading: "Foundation gate",
        paragraphs: [
          "You are ready to advance when you can explain the invariant, derive complexity, and reproduce the solution after a gap—not merely pass once.",
        ],
      },
    ],
    takeaways: [
      "Write examples before code",
      "Ask for the smallest useful hint",
      "Re-solve after 24 hours",
    ],
    drill: {
      question: "What counts as solving without hints?",
      answer:
        "You derived the approach and implementation yourself. Looking up syntax is fine; receiving the central algorithmic idea is a hint and should trigger a later re-solve.",
    },
    video: {
      id: "jgQjes7MgTM",
      title: "Coding Interview Roadmap",
      channel: "NeetCode",
    },
  },
  {
    id: "phase-2-0",
    title: "Stacks, queues, linked lists, and heaps",
    readTime: "22 min",
    summary:
      "Master the operations, invariants, and interview signals behind four core data structures.",
    objectives: [
      "Match access order to a structure",
      "Implement safe linked-list pointer changes",
      "Use a heap for repeated best-item access",
    ],
    sections: [
      {
        heading: "Choose by access pattern",
        bullets: [
          "Stack: last-in-first-out; parsing, undo, monotonic boundaries",
          "Queue/deque: first-in-first-out; BFS and scheduling",
          "Linked list: local insert/delete with pointer access",
          "Heap: repeated min/max in O(log n), peek in O(1)",
        ],
      },
      {
        heading: "Pointer safety",
        paragraphs: [
          "Before rewiring a linked list, save the next node. Draw the arrows and decide whether a dummy head simplifies deletion or merging. Most bugs are lost references, stale tails, or incorrect empty-list handling.",
        ],
        code: `let prev = null, curr = head;\nwhile (curr) {\n  const next = curr.next;\n  curr.next = prev;\n  prev = curr;\n  curr = next;\n}\nreturn prev;`,
      },
      {
        heading: "Heap reasoning",
        paragraphs: [
          "Use a heap when you need the next smallest/largest item repeatedly, not a fully sorted collection. Top-k often keeps a heap of size k, giving O(n log k) time.",
        ],
      },
    ],
    takeaways: [
      "State the access order first",
      "Use dummy nodes for boundary-heavy list operations",
      "A heap is partially ordered, not fully sorted",
    ],
    drill: {
      question: "Why use a size-k min-heap for the k largest values?",
      answer:
        "The root is the smallest among the current k winners, so each better candidate can replace it in O(log k); the root ends as the kth largest.",
    },
    video: {
      id: "N6dOwBde7-M",
      title: "Learn Linked Lists in 13 Minutes",
      channel: "Bro Code",
    },
  },
  {
    id: "phase-2-1",
    title: "Tree traversal: recursive and iterative",
    readTime: "18 min",
    summary:
      "Traverse trees confidently with DFS and BFS while understanding how call stacks map to explicit stacks.",
    objectives: [
      "Write preorder, inorder, and postorder",
      "Translate recursive DFS into iteration",
      "Use level-order BFS",
    ],
    sections: [
      {
        heading: "Traversal order carries meaning",
        bullets: [
          "Preorder: process before children; copying/serialization",
          "Inorder: sorted order for a BST",
          "Postorder: process children first; heights and deletion",
          "Level order: breadth/depth layers using a queue",
        ],
      },
      {
        heading: "The recursive template",
        code: `function dfs(node) {\n  if (!node) return;      // base case\n  process(node);          // move for in/post order\n  dfs(node.left);\n  dfs(node.right);\n}`,
        paragraphs: [
          "Recursive DFS uses O(h) call-stack space, where h is tree height. A skewed tree can make h = n; a balanced tree has h = log n.",
        ],
      },
      {
        heading: "Iterative equivalence",
        paragraphs: [
          "An explicit stack stores the work recursion would remember. Push children in reverse of the desired processing order. For BFS, capture the queue length before each level so newly added children belong to the next level.",
        ],
      },
    ],
    takeaways: [
      "Define the null-node base case",
      "State height-dependent space accurately",
      "Pick traversal order from when data is needed",
    ],
    drill: {
      question:
        "Why push the right child before the left in iterative preorder?",
      answer:
        "A stack is LIFO, so pushing right first leaves left on top to be processed next.",
    },
    video: {
      id: "fAAZixBzIAI",
      title: "Binary Tree Algorithms for Technical Interviews",
      channel: "freeCodeCamp.org",
    },
  },
  {
    id: "phase-2-2",
    title: "Sorting strategies and constraints",
    readTime: "17 min",
    summary:
      "Select a sorting approach by stability, memory, key range, nearly-sorted input, and required complexity.",
    objectives: [
      "Compare common sorting families",
      "Explain stability and in-place behavior",
      "Recognize when linear-time sorting applies",
    ],
    sections: [
      {
        heading: "Comparison sorting",
        bullets: [
          "Merge sort: O(n log n), stable, typically O(n) extra space",
          "Quick sort: O(n log n) average, O(n²) worst, often in-place",
          "Heap sort: O(n log n) worst-case, in-place, not stable",
          "Insertion sort: O(n²), but excellent for small or nearly sorted inputs",
        ],
      },
      {
        heading: "Beyond comparisons",
        paragraphs: [
          "Counting, radix, and bucket methods can beat O(n log n) because they use assumptions about keys. Counting sort is attractive when the integer range k is modest: O(n + k) time and O(k) space.",
        ],
      },
      {
        heading: "Interview decision",
        paragraphs: [
          "Ask whether mutation is allowed, stability matters, keys have a bounded range, and worst-case guarantees are required. In application code, a standard library sort is usually the right implementation; the interview value is explaining its implications.",
        ],
      },
    ],
    takeaways: [
      "No sorting algorithm wins every constraint",
      "Stable means equal keys retain relative order",
      "State average and worst case separately",
    ],
    drill: {
      question: "When does stability matter?",
      answer:
        "When records were already ordered by another key and equal values must preserve that order, such as sorting employees by department after name.",
    },
    video: {
      id: "l7-f9gS8VOs",
      title: "Understanding Sorting Algorithms",
      channel: "freeCodeCamp.org",
    },
  },
  {
    id: "phase-2-3",
    title: "Medium data-structure problems",
    readTime: "15 min",
    summary:
      "Develop a repeatable method for multi-step problems where the main challenge is choosing and maintaining state.",
    objectives: [
      "Extract an invariant from examples",
      "Separate data-structure choice from implementation",
      "Test adversarial cases",
    ],
    sections: [
      {
        heading: "A reliable worksheet",
        bullets: [
          "What must be answered quickly?",
          "What changes after every operation?",
          "Which structure supports both?",
          "What invariant must always remain true?",
          "Which edge case can break that invariant?",
        ],
      },
      {
        heading: "Example: top-k stream",
        paragraphs: [
          "The stream changes, but you only need the k largest seen so far. Maintain a min-heap of size k. Its root is the threshold; values not exceeding it cannot join the answer.",
        ],
      },
      {
        heading: "Debug the invariant",
        paragraphs: [
          "If code fails, do not patch the example. Restate the invariant and find the first operation that violates it. Trace empty, one-element, duplicate, monotonic, and maximum-size inputs.",
        ],
      },
    ],
    takeaways: [
      "Optimize required operations, not the whole state",
      "Keep invariants visible while coding",
      "Adversarial tests expose structural mistakes",
    ],
    drill: {
      question:
        "What is the best first step when a Medium problem feels complicated?",
      answer:
        "List the operations the solution must support and their target cost. This often identifies the structure before code is considered.",
    },
    video: {
      id: "HqPJF2L5h9U",
      title: "Heap, Heap Sort, Heapify & Priority Queues",
      channel: "Abdul Bari",
    },
  },
  {
    id: "phase-3-0",
    title: "BFS, DFS, greedy, and dynamic programming",
    readTime: "24 min",
    summary:
      "Distinguish four major strategies by state shape, optimal-substructure requirements, and proof obligations.",
    objectives: [
      "Choose traversal from graph goals",
      "Recognize greedy proof requirements",
      "Recognize overlapping subproblems",
    ],
    sections: [
      {
        heading: "Decision signals",
        bullets: [
          "BFS: shortest unweighted path or level order",
          "DFS: connectivity, exhaustive paths, cycles, topological work",
          "Greedy: a locally best irreversible choice with an exchange/cut proof",
          "DP: overlapping subproblems plus optimal substructure",
        ],
      },
      {
        heading: "Visited state is part of the model",
        paragraphs: [
          "In graphs, mark nodes when enqueuing—not when dequeuing—to avoid duplicates. Sometimes the state is more than a node: (cell, remaining eliminations), (index, previous choice), or (node, color).",
        ],
      },
      {
        heading: "Do not choose by vocabulary alone",
        paragraphs: [
          "“Minimum” does not automatically mean greedy; “all combinations” does not automatically mean DP. Define the state transition, then ask whether local choices are safe or whether results must be remembered.",
        ],
      },
    ],
    takeaways: [
      "Unweighted shortest path strongly suggests BFS",
      "Greedy needs a correctness argument",
      "DP state must contain everything the future needs",
    ],
    drill: {
      question: "Why can BFS return the shortest unweighted path?",
      answer:
        "It explores states in nondecreasing distance from the source, so the first discovery of a node uses the fewest edges.",
    },
    video: {
      id: "tWVWeAqZ0WU",
      title: "Graph Algorithms for Technical Interviews",
      channel: "freeCodeCamp.org",
    },
  },
  {
    id: "phase-3-1",
    title: "Build the recurrence before DP code",
    readTime: "19 min",
    summary:
      "Derive dynamic programming from a precise state, transition, base case, and evaluation order.",
    objectives: [
      "Define a minimal sufficient state",
      "Write a recurrence in words and symbols",
      "Convert memoization to tabulation",
    ],
    sections: [
      {
        heading: "The four-part DP specification",
        bullets: [
          "State: what does dp(i, …) mean?",
          "Transition: which choices lead to smaller states?",
          "Base case: what is immediately known?",
          "Order: when are dependencies available?",
        ],
      },
      {
        heading: "Example: climbing stairs",
        paragraphs: [
          "Let dp(i) be the number of ways to reach step i. The last move came from i−1 or i−2, so dp(i)=dp(i−1)+dp(i−2), with dp(0)=1 and dp(1)=1. Only two prior values are needed, so space compresses to O(1).",
        ],
      },
      {
        heading: "Memoization versus tabulation",
        paragraphs: [
          "Top-down memoization follows reachable states and mirrors recurrence. Bottom-up tabulation avoids recursion overhead and makes ordering explicit. Derive top-down first when state reasoning is difficult, then optimize.",
        ],
      },
    ],
    takeaways: [
      "A DP table without a state definition is a warning sign",
      "Base cases must match the state meaning",
      "Compress space only after the recurrence works",
    ],
    drill: {
      question: "How do you know a DP state is missing information?",
      answer:
        "Two situations with the same state key can have different valid futures or answers. Add the smallest variable that distinguishes them.",
    },
    video: {
      id: "oBt53YbR9Kk",
      title: "Dynamic Programming – Full Course",
      channel: "freeCodeCamp.org",
    },
  },
  {
    id: "phase-3-2",
    title: "Core CS: OS, DBMS, networks, and OOP",
    readTime: "25 min",
    summary:
      "Build interview-ready mental models for the systems concepts most often connected to software engineering decisions.",
    objectives: [
      "Explain processes, threads, and synchronization",
      "Connect indexes and transactions to database behavior",
      "Trace a web request end to end",
    ],
    sections: [
      {
        heading: "Operating systems",
        bullets: [
          "Process: isolated address space and resources",
          "Thread: execution unit sharing process memory",
          "Context switch: save/restore execution state",
          "Mutex/semaphore: coordinate concurrent access",
          "Deadlock conditions: mutual exclusion, hold-and-wait, no preemption, circular wait",
        ],
      },
      {
        heading: "Databases",
        bullets: [
          "An index trades write/storage cost for faster reads",
          "ACID protects transaction correctness",
          "Normalization reduces anomalies; denormalization can improve read paths",
          "Isolation levels control which concurrent effects are visible",
        ],
      },
      {
        heading: "Networks and OOP",
        paragraphs: [
          "A web request typically involves DNS, a transport connection, TLS, HTTP, routing, application work, and a response. In OOP, prefer composition for flexible “has-a” behavior; use inheritance when the subtype relationship is stable and substitutable.",
        ],
      },
    ],
    takeaways: [
      "Explain mechanisms, trade-offs, and one real example",
      "Connect concepts across layers",
      "Avoid definition-only answers",
    ],
    drill: {
      question: "Why can a database index slow an application down?",
      answer:
        "Every insert, delete, or indexed-column update must also maintain the index, and indexes consume memory/storage. Unused or low-selectivity indexes may cost more than they save.",
    },
    video: {
      id: "vBURTt97EkA",
      title: "Introduction to Operating Systems",
      channel: "Neso Academy",
    },
  },
  {
    id: "phase-3-3",
    title: "Solve unfamiliar advanced problems",
    readTime: "16 min",
    summary:
      "Manage a 45-minute interview when the pattern is not immediately obvious.",
    objectives: [
      "Decompose ambiguity into smaller claims",
      "Use constraints to eliminate approaches",
      "Recover productively when stuck",
    ],
    sections: [
      {
        heading: "The 45-minute structure",
        bullets: [
          "0–5: clarify and construct examples",
          "5–12: baseline plus bottleneck",
          "12–18: derive candidate optimization",
          "18–33: implement while narrating invariants",
          "33–40: test and repair",
          "40–45: complexity and follow-ups",
        ],
      },
      {
        heading: "When you are stuck",
        paragraphs: [
          "Shrink the input, solve a special case, work backward from the output, or list information you wish you had. Ask a targeted question such as “Is there a useful ordering property?” instead of requesting the solution.",
        ],
      },
      {
        heading: "Communication is observable progress",
        paragraphs: [
          "Interviewers can evaluate assumptions, decomposition, and testing even before the final algorithm. Silence hides good reasoning. Narrate decisions and invite correction at natural checkpoints.",
        ],
      },
    ],
    takeaways: [
      "Constraints are algorithmic clues",
      "A correct partial model beats random coding",
      "Reserve time to test",
    ],
    drill: {
      question: "What if the optimal solution does not arrive by minute 15?",
      answer:
        "Agree on the best correct approach you have, implement it cleanly, and continue discussing optimizations. A working baseline is better than an unfinished ideal.",
    },
    video: {
      id: "Zq4upTEaQyM",
      title: "The Backtracking Blueprint",
      channel: "Back To Back SWE",
    },
  },
  {
    id: "phase-4-0",
    title: "Company high-frequency preparation",
    readTime: "15 min",
    summary:
      "Turn company-tagged practice into a focused 30-day plan without overfitting to memorized questions.",
    objectives: [
      "Prioritize by frequency and weakness",
      "Balance company focus with pattern coverage",
      "Measure readiness honestly",
    ],
    sections: [
      {
        heading: "Build the set",
        bullets: [
          "50% high-frequency company questions",
          "30% weak patterns revealed by attempts",
          "20% mixed unseen questions to test transfer",
          "Include Easy, Medium, and selected Hard problems",
        ],
      },
      {
        heading: "Practice in rounds",
        paragraphs: [
          "Round 1 is learning with careful review. Round 2 is recall after a gap. Round 3 is timed and mixed. Track whether the approach was independently derived, not only whether the submission passed.",
        ],
      },
      {
        heading: "Avoid false confidence",
        paragraphs: [
          "Company tags are historical signals, not promises. Readiness comes from transferring patterns to unfamiliar variants and communicating under time pressure.",
        ],
      },
    ],
    takeaways: [
      "Frequency guides priority, not memorization",
      "Mix weak areas with realistic company questions",
      "Use spaced re-solving",
    ],
    drill: {
      question: "Should you practice only the most frequently tagged problems?",
      answer:
        "No. Keep some unseen and weak-pattern problems so you test transfer rather than recognition.",
    },
    video: {
      id: "jgQjes7MgTM",
      title: "Coding Interview Roadmap",
      channel: "NeetCode",
    },
  },
  {
    id: "phase-4-1",
    title: "Run effective mock interviews",
    readTime: "14 min",
    summary:
      "Reproduce interview constraints, collect behavioral evidence, and turn feedback into the next practice goal.",
    objectives: [
      "Create realistic mock conditions",
      "Evaluate communication and coding separately",
      "Convert feedback into one targeted change",
    ],
    sections: [
      {
        heading: "Mock protocol",
        bullets: [
          "45 minutes, no external hints or autocomplete",
          "Clarify aloud before proposing a solution",
          "State complexity before coding",
          "Use examples and tests without running after every line",
          "Spend five minutes on feedback immediately afterward",
        ],
      },
      {
        heading: "Score observable behaviors",
        paragraphs: [
          "Rate clarification, approach, correctness, code quality, testing, and communication independently. “Solved” can hide poor collaboration; “not solved” can still show a strong process.",
        ],
      },
      {
        heading: "One change per mock",
        paragraphs: [
          "Choose the highest-leverage correction—such as writing invariants before code—and make it the explicit focus of the next session. Too many simultaneous corrections are difficult to retain.",
        ],
      },
    ],
    takeaways: [
      "Simulate real constraints",
      "Score process as well as outcome",
      "Apply one focused correction next time",
    ],
    drill: {
      question: "Who should speak more during a mock?",
      answer:
        "The candidate should drive the reasoning while the interviewer asks clarifying and follow-up questions. Continuous monologue is not required, but decisions should be visible.",
    },
    video: {
      id: "1qw5ITr3k9E",
      title: "Mock Coding Interview",
      channel: "freeCodeCamp.org",
    },
  },
  {
    id: "phase-4-2",
    title: "Review failures with a pattern journal",
    readTime: "13 min",
    summary:
      "Transform every failed test, hint, or abandoned attempt into a durable correction instead of a repeated mistake.",
    objectives: [
      "Classify the true failure cause",
      "Write compact pattern notes",
      "Schedule a proof-of-learning re-solve",
    ],
    sections: [
      {
        heading: "Classify before recording",
        bullets: [
          "Recognition: did not identify the pattern",
          "Reasoning: chose a pattern but could not derive it",
          "Implementation: invariant was right, code was wrong",
          "Testing: missed an edge case",
          "Communication/time: process broke under pressure",
        ],
      },
      {
        heading: "The five-line journal entry",
        bullets: [
          "Problem and pattern",
          "Signal you missed",
          "Invariant or key idea",
          "Bug/edge case",
          "Re-solve dates: +1 day and +7 days",
        ],
      },
      {
        heading: "Keep it generative",
        paragraphs: [
          "Do not paste the final code. Write a prompt that helps future-you reconstruct it. The journal should improve recognition and reasoning, not become an answer archive.",
        ],
      },
    ],
    takeaways: [
      "Diagnose the failure layer",
      "Record signals and invariants, not code dumps",
      "A re-solve proves the review worked",
    ],
    drill: {
      question:
        "What is the most useful thing to write after reading a solution?",
      answer:
        "The signal you missed and the invariant that makes the solution correct, in your own words.",
    },
    video: {
      id: "UrcwDOEBzZE",
      title: "Most Common Concepts for Coding Interviews",
      channel: "NeetCode",
    },
  },
  {
    id: "phase-4-3",
    title: "Spaced repetition and re-solving",
    readTime: "13 min",
    summary:
      "Schedule retrieval so patterns remain available after the feeling of familiarity fades.",
    objectives: [
      "Distinguish recognition from recall",
      "Use expanding review intervals",
      "Retire mastered problems intelligently",
    ],
    sections: [
      {
        heading: "A practical cadence",
        bullets: [
          "Day 0: learn and explain",
          "Day 1: re-solve from a blank editor",
          "Day 7: timed re-solve",
          "Day 21: mixed review without topic labels",
          "After mastery: keep only occasional representative problems",
        ],
      },
      {
        heading: "What counts as recall",
        paragraphs: [
          "You can derive the approach, state the invariant, implement it, and test it without seeing the old code. Remembering that “this was a sliding-window problem” is recognition, not complete recall.",
        ],
      },
      {
        heading: "Adjust from evidence",
        paragraphs: [
          "If recall is easy twice, expand the interval. If you need a central hint, shorten it and revisit the underlying pattern. Favor representative problems over endlessly growing queues.",
        ],
      },
    ],
    takeaways: [
      "Retrieval strengthens memory more than rereading",
      "Remove topic labels during later reviews",
      "Use performance to set the next interval",
    ],
    drill: {
      question: "Why wait before re-solving?",
      answer:
        "A gap makes retrieval effortful. Successfully reconstructing the solution after forgetting begins creates stronger, more transferable memory than immediate repetition.",
    },
    video: {
      id: "Z-zNHHpXoMM",
      title: "How to Study for Exams – Spaced Repetition",
      channel: "Ali Abdaal",
    },
  },
];

export const studyGuideById = Object.fromEntries(
  studyGuides.map((guide) => [guide.id, guide]),
);
