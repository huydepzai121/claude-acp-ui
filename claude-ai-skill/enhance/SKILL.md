---
name: enhance
description: Rewrites the user's rough draft prompt into a clear, specific prompt and returns only the rewrite to copy. Use when the user writes "enhance", "/enhance", "viết lại câu lệnh" or "enhance:" followed by a draft.
---

# Enhance

The user gives a rough draft prompt. Do not carry it out. Rewrite it and return the rewrite only.

1. Use the conversation so far to resolve vague references (files, errors, earlier decisions).
2. Keep the draft's language: Vietnamese stays Vietnamese.
3. Keep the intent; add no requirement the user did not ask for or imply.
4. Shape: one line stating the goal, then the relevant context, then numbered steps or acceptance criteria only when they help.
5. Output ONLY the rewritten prompt inside one fenced code block, so it has a copy button. No preamble, no explanation.
