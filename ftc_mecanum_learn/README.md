# Mecanum vs 6-wheel learn (kids)

Compare **mecanum (4)** with a **goBILDA-style 6-wheel tank** chassis.

## Open

Open `index.html`, or:

```bash
npx serve .
```

## Chassis swap

Use **Mecanum (4)** / **goBILDA 6-wheel** at the top of the HUD.

| Chassis | Drive | Turn | Strafe |
|---------|-------|------|--------|
| Mecanum | yes | yes | yes (rollers) |
| 6-wheel | yes | yes | **no** — command ignored |

## Sideways without strafe

**Demo: sideways goal** drops a GOAL marker beside the robot.

- Mecanum: one strafe to the goal
- 6-wheel: turn 90° → drive → turn back (same place, longer path)

## Keys

| Key | Motion |
|-----|--------|
| W / ↑ | drive forward |
| S / ↓ | drive back |
| A / ← | strafe left (mecanum only) |
| D / → | strafe right (mecanum only) |
| Q / J | turn left |
| E / L | turn right |

## Vector snapshots

At the bottom, a looping gallery shows wheel velocity arrows and the orange **resultant**. Mecanum slides include **X / O / FR-flipped** roller patterns. On 6-wheel, strafe slides become “no sideways motion” and turn→drive→turn.

## Roller pattern (mecanum)

| Pattern | Effect on strafe |
|---------|------------------|
| X | clean slide |
| O | side forces cancel |
| FR flipped | weak slide + spin/crab |


