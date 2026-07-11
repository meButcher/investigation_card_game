# Sound effects — drop-in override

The game ships with **synthesized** sound effects (no files needed). To replace any
cue with your own audio, drop a file here named exactly after the cue. If present,
it overrides the synth; if absent, the synth plays.

Supported extensions (checked in order): `.mp3`, `.ogg`, `.wav`

Cue names:

| file | when it plays |
|------|----------------|
| `click.*`  | any button press |
| `ready.*`  | a player marks ready |
| `marker.*` | placing a marker / picking a solution / witness |
| `deal.*`   | tile swap draw/choose |
| `accuse.*` | making an accusation |
| `phase.*`  | phase change (night → day, etc.) |
| `error.*`  | a toast / rejected action |
| `win.*`    | your side wins |
| `lose.*`   | your side loses |
| `toast.*`  | soft notification blip |
| `flip.*`   | (reserved) card flip / zoom |

Keep files short (< 300 ms for UI cues) and quiet — they play at 0.7 volume.
Players can mute everything with the 🔊 button (top-right).
