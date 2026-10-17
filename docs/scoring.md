# Deterministic scoring

An insert appends one printable ASCII character at the current position; Backspace removes the last retained character. All printable inserts increment attempts, even mistakes later deleted. A matching insert increments correct attempts. Backspaces have a separate count and do not change attempt accuracy. Inserts after the bundled passage is exhausted are ignored; the official clock continues.

- Validated WPM = correctly retained characters / 5 / official minutes.
- Raw WPM = all printable attempts / 5 / official minutes.
- Accuracy = correct printable attempts / all printable attempts × 100; zero attempts has 0% accuracy.
- Uncorrected errors = retained characters minus correctly retained characters.
- Progress = retained length / passage length; wrong characters do not increase validated WPM.

The fixed duration is always the score denominator, including when a player stops typing early. Solo live metrics use elapsed time; completed solo and race results use the configured duration.

Ranks compare eligibility (at least 95% accuracy), then descending WPM, descending accuracy, ascending incorrect attempts. Comparisons use full precision. Exact ties share the same competition rank (1, 1, 3). If nobody qualifies, there is no qualifying winner.

The server accepts operations only when receipt time is at least startsAt and strictly before startsAt + duration. Client timestamps and client scores are never accepted. Sequence starts at 1 each round; the next accepted sequence must be exactly previous + 1. Rejected operations do not advance sequence. Reconnect returns the authoritative state and sequence; disconnected backlog is discarded. Round IDs reject previous-race input. This policy is deterministic but high-latency connections are disadvantaged; no claim of perfect cheat prevention or network fairness is made.
