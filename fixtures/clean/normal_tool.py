"""A simple string utility module."""


def capitalize_words(text: str) -> str:
    """Capitalize the first letter of each word."""
    return " ".join(word.capitalize() for word in text.split())


def reverse_string(text: str) -> str:
    """Reverse a string."""
    return text[::-1]


def count_vowels(text: str) -> int:
    """Count the number of vowels in a string."""
    return sum(1 for char in text.lower() if char in "aeiou")


def truncate(text: str, max_length: int = 100, suffix: str = "...") -> str:
    """Truncate a string to a maximum length."""
    if len(text) <= max_length:
        return text
    return text[: max_length - len(suffix)] + suffix
