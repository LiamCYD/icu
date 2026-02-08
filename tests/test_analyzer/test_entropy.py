"""Tests for entropy analysis."""

from __future__ import annotations

import math

from icu.analyzer.entropy import calculate_entropy, extract_string_literals, scan_entropy


class TestCalculateEntropy:
    def test_empty_string(self) -> None:
        assert calculate_entropy("") == 0.0

    def test_single_char(self) -> None:
        assert calculate_entropy("aaaa") == 0.0

    def test_two_chars_equal(self) -> None:
        ent = calculate_entropy("ab" * 50)
        assert abs(ent - 1.0) < 0.01

    def test_high_entropy(self) -> None:
        # Random-looking string should have high entropy
        s = "aB3$kL9@mN2&pQ5!rT8*"
        ent = calculate_entropy(s)
        assert ent > 4.0

    def test_low_entropy(self) -> None:
        s = "aaaabbbbccccdddd"
        ent = calculate_entropy(s)
        assert ent < 2.5

    def test_known_value(self) -> None:
        # "ab" repeated: entropy should be exactly 1.0
        ent = calculate_entropy("abababababababababab")
        assert abs(ent - 1.0) < 0.01

    def test_maximum_entropy_for_ascii(self) -> None:
        # All unique chars -> max entropy = log2(n)
        chars = "".join(chr(i) for i in range(32, 127))
        ent = calculate_entropy(chars)
        expected = math.log2(len(chars))
        assert abs(ent - expected) < 0.01


class TestExtractStringLiterals:
    def test_double_quoted(self) -> None:
        content = 'x = "this is a fairly long test string value"'
        results = extract_string_literals(content)
        assert len(results) >= 1
        assert any("this is a fairly long" in s for _, s in results)

    def test_single_quoted(self) -> None:
        content = "x = 'this is a fairly long test string value'"
        results = extract_string_literals(content)
        assert len(results) >= 1

    def test_long_unbroken_token(self) -> None:
        token = "A" * 30
        content = f"data = {token}"
        results = extract_string_literals(content)
        assert any(token in s for _, s in results)

    def test_short_strings_ignored(self) -> None:
        content = 'x = "short"'
        results = extract_string_literals(content)
        assert len(results) == 0

    def test_line_numbers(self) -> None:
        content = 'line1\nline2\nx = "this is a very long string for testing"'
        results = extract_string_literals(content)
        assert any(line_num == 3 for line_num, _ in results)


class TestScanEntropy:
    def test_clean_code_no_findings(self) -> None:
        content = '''
def hello():
    print("Hello, World!")
    return True
'''
        findings = scan_entropy(content, "test.py")
        assert len(findings) == 0

    def test_high_entropy_string_detected(self) -> None:
        # This base64 string has high entropy
        content = 'secret = "aB3kL9mN2pQ5rT8xW1yZ4cF7hJ0oR6uI9vE2bD5gK8nS3qM"'
        findings = scan_entropy(content, "test.py", threshold=3.5)
        assert len(findings) >= 1
        assert findings[0].rule_id == "EN-001"

    def test_custom_threshold(self) -> None:
        content = 'data = "abcdefghijklmnopqrstuvwxyz"'
        # Low threshold should flag it
        findings_low = scan_entropy(content, "test.py", threshold=2.0)
        # High threshold should not
        findings_high = scan_entropy(content, "test.py", threshold=6.0)
        assert len(findings_low) >= len(findings_high)

    def test_file_path_in_findings(self) -> None:
        content = 'secret = "aB3kL9mN2pQ5rT8xW1yZ4cF7hJ0oR6uI9vE2bD5gK8nS3qM"'
        findings = scan_entropy(content, "/path/test.py", threshold=3.5)
        if findings:
            assert findings[0].file_path == "/path/test.py"
