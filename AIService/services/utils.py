import re, json

def _strip_code_fences(s: str) -> str:
    if not s:
        return ""
    s = s.strip()
    s = re.sub(r"^```(?:json)?\s*|\s*```$", "", s, flags=re.I | re.M)
    return s.strip()

def _extract_json_payload(s: str) -> str:
    s = _strip_code_fences(s or "")
    if not s:
        return ""
    start = None
    for i, ch in enumerate(s):
        if ch in "{[":
            start = i
            break
    if start is None:
        return ""
    stack, pairs = [], {"{": "}", "[": "]"}
    for j in range(start, len(s)):
        ch = s[j]
        if ch in pairs:
            stack.append(pairs[ch])
        elif ch in "}]":
            if stack and ch == stack[-1]:
                stack.pop()
                if not stack:
                    return s[start:j+1]
    return ""

def _safe_json(s: str):
    payload = _extract_json_payload(s)
    if not payload:
        return []
    return json.loads(payload)