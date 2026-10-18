# Learning, challenges and games

TypeSpeed provides local learning activities and private cooperative multiplayer without accounts or a database. All content and game artwork are bundled with the application. No external content API is required.

## Learning loop

Complete practice or a challenge, inspect missed words in the practice studio, select a targeted drill or a game using those words, then benchmark again. Mistake analysis records the expected key, including errors later corrected with Backspace. Slow transition reports require five clean samples and exclude pauses over three seconds. These are practice observations, not a diagnosis of typing technique.

## Daily trio and individual challenges

- The daily sprint lasts 30 seconds; daily accuracy and punctuation each last 60 seconds. A versioned UTC date seed gives everyone the same passage and settings for each daily activity. Saved first and best attempts are shown separately.
- Daily accuracy requires 98% accuracy and at least 25 correctly retained characters. The other daily activities require 95% and at least 25 correct characters.
- Clean 100 requires 100 words and 98% accuracy. Perfect 25 ends at the first incorrect attempt. Both allow up to ten minutes.
- Consistency Run checks cumulative WPM once per second after a ten-second warm-up. Each measured value must stay within ten WPM of the chosen target, with at least 95% final accuracy and 25 correct characters.
- Punctuation Pro and Number Sprint use specialized bundled passages. Code Sprint supports newlines and two-space indentation: Enter inserts a newline; Tab remains accessible keyboard navigation.
- Personal Best Ladder starts at 20 WPM, then targets two WPM above the best of the five most recent completed ladder sessions. Accuracy must remain at least 95%. Unrelated modes do not set its benchmark.
- The five-minute plan contains a 60-second warm-up, a 120-second targeted drill and a 120-second benchmark. Continue between stages at your own pace.

## Arcade

| Game              | Rules                                                                                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Wordfall          | Clear each word and its trailing space correctly before its deadline in survival mode. Backspace repairs a mistake; incorrect words cannot advance the target. Relaxed mode removes elimination.                               |
| Precision Tower   | Correct word prefixes build glass blocks. Each incorrect attempt costs 18 stability points; each completed correct word adds four. Stability is displayed between zero and 100. Survival ends at zero; relaxed mode continues. |
| Keyboard Defender | Approaching word targets use the same verified input rules as Wordfall. After the first ten easy words, passages introduce harder vocabulary, punctuation and numbers.                                                         |
| TypeSpeed Rally   | Correct typing earns distance points on a visual course. Its game presentation does not change measured typing accuracy.                                                                                                       |
| Rhythm Flow       | A live visual reports variation in recent typing intervals. Optional sound is off by default. The rhythm value is a game indicator, separate from WPM.                                                                         |
| Story Quest       | Complete an original opening chapter, then choose the river or stars branch. Each chapter has a ten-minute completion limit.                                                                                                   |
| Team Relay        | Approved room members take sequential 12-word legs. The server refuses input from anyone without the baton. Every character in a leg must be correct before the next runner starts.                                            |
| Co-op Boss Battle | Players jointly reach a server-set correct-character target. Easy/medium/hard require one/two/three correct characters per player per official second. The target locks at the start.                                          |

Solo games use local scoring. Relay and boss rounds retain the official room duration. Cooperative success is separate from individual WPM rankings; the competitive race remains available with its existing 95% eligibility rule. A relay runner who disconnects can resume their turn. Leaving a required relay leg unfinished prevents team completion; rooms do not silently credit an absent player.

## Learning and personalization

Six beginner lessons progress from home-row anchors to full sentences. A passed lesson requires 95% accuracy and is remembered in the progress summary. Users can also select a lesson manually. Keyboard diagrams support QWERTY, AZERTY, Dvorak and Colemak as guides; they do not remap the operating system's keyboard.

Custom text is normalized to supported Latin letters, accents, digits and punctuation. Spanish, French and German word exercises are bundled. This is Latin-script practice, not support for every writing system or input method.

The studio offers font size, caret style, optional sound, a keyboard guide and cosmetic accents. Violet unlocks after a completed session; amber unlocks with the Precision achievement. These settings apply to learning and arcade sessions; the global dark/light toggle applies throughout the application.

## Replays, ghosts and sharing

Standard practice and learning sessions record timestamped typing operations. Uninterrupted multiplayer rounds record acknowledged operations with approximate client-side playback timing. A reconnect prevents saving a misleading partial multiplayer replay. The room's live results remain server-authoritative.

The replay player supports play/pause, seeking and correction/pause markers. Ghost mode replays actual recorded positions on the same passage and duration. Friend links include the full passage, duration and a clearly unverified target in the URL fragment; recipients do not need an account. Share only text intended for recipients. Result cards download as SVG and include mode, duration, accuracy and the local/unverified label.

## Local storage and offline use

- Up to 20 detailed recordings are retained. If quota is low, older recordings are removed until the newest recording fits. A storage error is shown if it cannot be saved.
- A separate summary retains earned achievements, completed lesson titles, completed-session count and up to 370 practice-day timestamps. Weekly goals use the user's local calendar, starting Monday; daily passages use UTC. Missing a day does not reset earned achievements.
- Studio export/import includes recordings, summary, appearance settings and weekly goal. Imports validate size, shape and timeline order before replacing records. The original 200-result solo history remains separate.
- Production builds install a versioned service worker for the solo app after a successful online visit. Solo activities can then open offline. Multiplayer and external requests are never cached. A first-ever visit still needs a connection. Service workers require HTTPS or localhost and browser support.
- There is no global leaderboard, persistent cross-device team identity, account synchronization or verified asynchronous score registry. Those would require additional infrastructure beyond this account-free release.

## Accessibility

Games keep textual metrics and the standard typing input available. Sound is opt-in; motion and glass effects respect system preferences. Keyboard navigation remains available. Physical-device keyboard and assistive-technology testing are still recommended before a broad public launch.
